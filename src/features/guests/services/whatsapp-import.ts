import makeWASocket, {
  Browsers,
  DisconnectReason,
  initAuthCreds,
  proto,
  type AuthenticationState,
  type SignalDataSet,
  type SignalDataTypeMap,
  type WASocket,
} from 'baileys';
import type { WhatsAppImportEvent } from '../types';
import {
  addLidMapping,
  buildGroups,
  buildPeople,
  createContactBook,
  jidPhone,
  mergeContact,
  sortContacts,
  unresolvedLids,
  type RawWhatsAppGroup,
} from '../utils/whatsapp-import';

/**
 * Reads the Owner's WhatsApp contacts and groups through a short-lived linked
 * device (backlog 0017, docs/whatsapp-import-plan.md).
 *
 * The whole session lives inside one call: keys are generated in memory,
 * never stored, and the device is unlinked on every way out - done, error,
 * deadline, or the caller aborting because the browser went away. That is
 * what lets it run inside a single streaming request instead of a long-lived
 * service.
 *
 * Talks to WhatsApp through Baileys, an unofficial client of the WhatsApp Web
 * protocol - see 0017 for the terms-of-service and breakage caveats.
 */

export interface RunWhatsAppImportOptions {
  /** The Owner's number as international digits (`972548129777`). */
  phone: string;
  /** Aborted when the client disconnects - unlinks and stops without emitting. */
  signal: AbortSignal;
  /** Hard ceiling for the whole session; keep it under the route's `maxDuration`. */
  deadlineMs: number;
  onEvent: (event: WhatsAppImportEvent) => void;
}

/** How long the Owner has to enter the code. */
const PAIRING_TIMEOUT_MS = 180_000;
/** The sync is treated as settled once this long passes without new data... */
const SETTLE_QUIET_MS = 6_000;
/** ...but never before this long after linking (the first chunks are bursty)... */
const SETTLE_MIN_MS = 4_000;
/** ...and never later than this, so a slow sync cannot hold the Owner up. */
const SETTLE_MAX_MS = 30_000;

export function runWhatsAppImport({
  phone,
  signal,
  deadlineMs,
  onEvent,
}: RunWhatsAppImportOptions): Promise<void> {
  const auth = memoryAuthState();
  const book = createContactBook();

  let sock: WASocket | undefined;
  let finished = false;
  let codeRequested = false;
  let paired = false;
  let linkedAt: number | null = null;
  let lastActivityAt = Date.now();
  let recentSyncComplete = false;
  let selfPhone: string | null = null;
  let groupsPromise: Promise<RawWhatsAppGroup[]> | null = null;

  const timers: ReturnType<typeof setTimeout>[] = [];
  let settleInterval: ReturnType<typeof setInterval> | undefined;

  return new Promise<void>((resolve) => {
    const emit = (event: WhatsAppImportEvent) => {
      if (finished) return;
      try {
        onEvent(event);
      } catch {
        // The stream is gone; the abort signal will finish us.
      }
    };

    const finish = async (last?: WhatsAppImportEvent) => {
      if (finished) return;
      if (last) emit(last);
      finished = true;
      timers.forEach(clearTimeout);
      clearInterval(settleInterval);
      signal.removeEventListener('abort', onAbort);

      const current = sock;
      if (current) {
        if (paired) {
          // Removes the device from the phone's Linked devices list.
          await current.logout().catch(() => current.end(undefined));
        } else {
          current.end(undefined);
        }
      }
      resolve();
    };

    const onAbort = () => void finish();
    if (signal.aborted) {
      resolve();
      return;
    }
    signal.addEventListener('abort', onAbort);

    timers.push(setTimeout(() => void finish({ type: 'error', reason: 'timeout' }), deadlineMs));
    timers.push(
      setTimeout(() => {
        if (linkedAt === null) void finish({ type: 'error', reason: 'pairing_timeout' });
      }, PAIRING_TIMEOUT_MS),
    );

    const fetchGroups = async (s: WASocket): Promise<RawWhatsAppGroup[]> =>
      Object.values(await s.groupFetchAllParticipating()).map((g) => ({
        id: g.id,
        subject: g.subject,
        participants: g.participants.map((p) => ({ id: p.id, phoneNumber: p.phoneNumber })),
      }));

    // Groups go out as soon as the link opens - the server sends member phones
    // with the group, so they are complete straight away even though names
    // are still arriving. The settled pass re-sends them with names.
    const sendEarlyGroups = async (s: WASocket) => {
      groupsPromise = fetchGroups(s);
      try {
        const groups = await groupsPromise;
        emit({
          type: 'groups',
          groups: buildGroups(book, buildPeople(book, selfPhone), groups, selfPhone),
        });
      } catch {
        // Retried by the settled pass.
        groupsPromise = null;
      }
    };

    const settle = async (s: WASocket) => {
      clearInterval(settleInterval);
      try {
        const groups = await (groupsPromise ?? fetchGroups(s));
        const lids = unresolvedLids(
          book,
          groups.flatMap((g) => g.participants.filter((p) => !p.phoneNumber).map((p) => p.id)),
        );
        if (lids.length) {
          const mappings = await s.signalRepository.lidMapping
            .getPNsForLIDs(lids)
            .catch(() => null);
          mappings?.forEach(({ lid, pn }) => addLidMapping(book, lid, pn));
        }

        const people = buildPeople(book, selfPhone);
        emit({ type: 'groups', groups: buildGroups(book, people, groups, selfPhone) });
        emit({ type: 'contacts', contacts: sortContacts(people.values()) });
        await finish({ type: 'done' });
      } catch (error) {
        console.error('[whatsapp-import] settle failed:', (error as Error)?.message);
        await finish({ type: 'error', reason: 'unknown' });
      }
    };

    const connect = () => {
      const s = makeWASocket({
        auth,
        logger: silentLogger,
        browser: Browsers.macOS('Chrome'),
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });
      sock = s;

      const touch = () => {
        lastActivityAt = Date.now();
      };

      s.ev.on('contacts.upsert', (contacts) => {
        contacts.forEach((c) => mergeContact(book, c));
        touch();
      });
      s.ev.on('contacts.update', (contacts) => {
        contacts.forEach((c) => c.id && mergeContact(book, { ...c, id: c.id }));
        touch();
      });
      s.ev.on('lid-mapping.update', ({ lid, pn }) => addLidMapping(book, lid, pn));
      s.ev.on('messaging-history.set', ({ contacts, lidPnMappings, syncType, progress }) => {
        contacts.forEach((c) => mergeContact(book, c));
        lidPnMappings?.forEach(({ lid, pn }) => addLidMapping(book, lid, pn));
        if (syncType === proto.HistorySync.HistorySyncType.RECENT && progress === 100) {
          recentSyncComplete = true;
        }
        touch();
      });

      s.ev.on('connection.update', async ({ connection, qr, lastDisconnect }) => {
        if (s !== sock || finished) return;

        // `qr` firing means the socket is ready to pair - ask for a code instead.
        if (qr && !codeRequested && !auth.creds.registered) {
          codeRequested = true;
          try {
            emit({ type: 'code', code: await s.requestPairingCode(phone) });
          } catch (error) {
            console.error('[whatsapp-import] pairing code failed:', (error as Error)?.message);
            await finish({ type: 'error', reason: 'unknown' });
          }
          return;
        }

        if (connection === 'open' && linkedAt === null) {
          paired = true;
          linkedAt = Date.now();
          touch();
          selfPhone = jidPhone(s.user?.id);
          emit({ type: 'linked' });
          void sendEarlyGroups(s);
          settleInterval = setInterval(() => {
            const now = Date.now();
            const sinceLink = now - (linkedAt ?? now);
            const quiet = now - lastActivityAt >= SETTLE_QUIET_MS;
            if (
              sinceLink >= SETTLE_MAX_MS ||
              (sinceLink >= SETTLE_MIN_MS && (quiet || recentSyncComplete))
            ) {
              void settle(s);
            }
          }, 1_000);
          return;
        }

        if (connection === 'close') {
          const status = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)
            ?.output?.statusCode;
          if (status === DisconnectReason.restartRequired) {
            // WhatsApp always drops the socket right after pairing; reconnecting
            // with the same in-memory keys completes the link.
            paired = true;
            connect();
            return;
          }
          await finish({ type: 'error', reason: 'connection_closed' });
        }
      });
    };

    connect();
  });
}

/** Signal keys and creds held only for the life of the session. */
function memoryAuthState(): AuthenticationState {
  const store: Partial<Record<keyof SignalDataTypeMap, Record<string, unknown>>> = {};
  return {
    creds: initAuthCreds(),
    keys: {
      get: <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
        const bucket: Record<string, unknown> = store[type] ?? {};
        const out: { [id: string]: SignalDataTypeMap[T] } = {};
        for (const id of ids) {
          if (bucket[id] != null) out[id] = bucket[id] as SignalDataTypeMap[T];
        }
        return out;
      },
      set: (data: SignalDataSet) => {
        for (const type of Object.keys(data) as (keyof SignalDataTypeMap)[]) {
          const bucket = (store[type] ??= {});
          for (const [id, value] of Object.entries(data[type] ?? {})) {
            if (value == null) delete bucket[id];
            else bucket[id] = value;
          }
        }
      },
    },
  };
}

/**
 * Baileys logs jids and message metadata, so nothing it says is kept - the
 * service reports its own failures by reason only.
 */
const silentLogger = {
  level: 'silent',
  child: () => silentLogger,
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};
