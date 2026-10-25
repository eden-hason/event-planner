import { daysUntil, israelToday } from '@/lib/date-time';
import { phoneSearchForms } from '@/lib/phone';
import type { WhatsAppGroup, WhatsAppPerson } from '../types';
import { headerState, type HeaderState } from './guest-selection';
import type { ColumnMapping } from './import-guests';
import type { ParsedCSV } from './parse-csv';

/**
 * Pure pieces of the WhatsApp linked-device import (backlog 0017, ADR 0044):
 * folding the contacts and chats a sync sends into one record per person,
 * shaping and ranking groups, the Owner's per-person pick, and turning that
 * pick into the table the existing import wizard validates. Nothing here
 * talks to WhatsApp - see `services/whatsapp-import.ts` for that.
 */

/** The subset of a Baileys `Contact` the import reads. */
export interface RawWhatsAppContact {
  id: string;
  lid?: string | null;
  phoneNumber?: string | null;
  name?: string | null;
  notify?: string | null;
}

/** The subset of a Baileys `GroupMetadata` the import reads. */
export interface RawWhatsAppGroup {
  id: string;
  subject: string;
  participants: { id: string; phoneNumber?: string | null }[];
}

/**
 * A protobuf timestamp as Baileys hands it over: a number, or a `Long`
 * (whose `toString` is its decimal value).
 */
type RawTimestamp = number | { toString(): string } | null | undefined;

/** The subset of a Baileys `Chat` the import reads - never its messages. */
interface RawWhatsAppChat {
  id?: string | null;
  conversationTimestamp?: RawTimestamp;
  lastMessageRecvTimestamp?: RawTimestamp;
}

const PN_SERVER = '@s.whatsapp.net';
const LID_SERVER = '@lid';

const isPnJid = (jid: string) => jid.endsWith(PN_SERVER);
const isLidJid = (jid: string) => jid.endsWith(LID_SERVER);

/** Drops the device suffix: `972548129777:17@s.whatsapp.net` -> `972548129777@s.whatsapp.net`. */
export function bareJid(jid: string): string {
  const at = jid.indexOf('@');
  if (at === -1) return jid;
  const user = jid.slice(0, at).split(':')[0];
  return user + jid.slice(at);
}

/** The digits of a phone-number jid, or null for anything else. */
export function jidPhone(jid: string | null | undefined): string | null {
  if (!jid) return null;
  const bare = bareJid(jid);
  return isPnJid(bare) ? bare.slice(0, -PN_SERVER.length) : null;
}

/**
 * Accumulates everything a sync says about people. One person can arrive
 * under their phone jid, their hidden (`@lid`) jid, or both, across several
 * events - the book keeps every alias and folds them by phone at the end.
 * `chatTimes` holds the last message time of every chat the sync listed,
 * one-on-one and group, keyed by bare jid.
 */
export interface ContactBook {
  byJid: Map<string, RawWhatsAppContact>;
  lidToPhone: Map<string, string>;
  chatTimes: Map<string, number>;
}

export function createContactBook(): ContactBook {
  return { byJid: new Map(), lidToPhone: new Map(), chatTimes: new Map() };
}

const CONTACT_FIELDS = ['lid', 'phoneNumber', 'name', 'notify'] as const;

/**
 * Baileys emits partial contacts with explicit `undefined` / empty fields
 * (a history-sync chat with no saved name carries `name: undefined`), so
 * empties are skipped when merging - spreading them as-is erased names that
 * had already arrived, which is what made the spike under-count saved names.
 * Only the fields the import reads are kept; a real Baileys contact carries
 * more, and the book holds thousands of them for the whole session.
 */
export function mergeContact(book: ContactBook, contact: RawWhatsAppContact): void {
  if (!contact?.id) return;
  const id = bareJid(contact.id);
  let record = book.byJid.get(id);
  if (!record) {
    record = { id };
    book.byJid.set(id, record);
  }
  for (const field of CONTACT_FIELDS) {
    const value = contact[field];
    if (value) record[field] = value;
  }

  const lid = isLidJid(id) ? id : contact.lid ? bareJid(contact.lid) : null;
  const phone = jidPhone(isPnJid(id) ? id : contact.phoneNumber);
  if (lid && phone) book.lidToPhone.set(lid, phone);
}

export function addLidMapping(book: ContactBook, lid: string, pn: string): void {
  const phone = jidPhone(pn);
  if (phone) book.lidToPhone.set(bareJid(lid), phone);
}

function toSeconds(value: RawTimestamp): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value.toString());
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Notes when a chat last had a message. The same chat arrives in more than
 * one sync batch (`INITIAL_BOOTSTRAP`, then `RECENT`), so the latest time wins.
 */
export function recordChat(book: ContactBook, chat: RawWhatsAppChat): void {
  if (!chat?.id) return;
  const at = toSeconds(chat.conversationTimestamp) ?? toSeconds(chat.lastMessageRecvTimestamp);
  if (at === null) return;
  const id = bareJid(chat.id);
  const prev = book.chatTimes.get(id);
  if (prev === undefined || at > prev) book.chatTimes.set(id, at);
}

/** The phone digits behind any jid the book can resolve. */
export function resolvePhone(book: ContactBook, jid: string): string | null {
  const bare = bareJid(jid);
  if (isPnJid(bare)) return jidPhone(bare);
  if (isLidJid(bare)) {
    const known = book.byJid.get(bare)?.phoneNumber;
    return jidPhone(known) ?? book.lidToPhone.get(bare) ?? null;
  }
  return null;
}

/**
 * Hidden jids the book has no phone for yet - for a batch lookup before
 * building. One-on-one chats are included: the people the Owner talks to
 * most recently are often known only by a hidden jid (ADR 0044).
 */
export function unresolvedLids(book: ContactBook, extra: string[] = []): string[] {
  const out = new Set<string>();
  for (const jid of [...book.byJid.keys(), ...book.chatTimes.keys(), ...extra.map(bareJid)]) {
    if (isLidJid(jid) && !resolvePhone(book, jid)) out.add(jid);
  }
  return [...out];
}

/**
 * One record per phone. Saved name wins over the self-chosen one, and the
 * first non-empty value of each wins across aliases. A one-on-one chat under
 * any alias sets `lastChatAt`, the latest one if there are several. People
 * with no resolvable phone (hidden-id chats), non-person jids (groups,
 * broadcast, newsletters) and the Owner's own number are dropped - there is
 * nothing to import them as.
 */
export function buildPeople(
  book: ContactBook,
  selfPhone: string | null,
): Map<string, WhatsAppPerson> {
  const people = new Map<string, WhatsAppPerson>();
  const personPhone = (jid: string) => {
    if (!isPnJid(jid) && !isLidJid(jid)) return null;
    const phone = resolvePhone(book, jid);
    return !phone || phone === selfPhone ? null : phone;
  };

  for (const contact of book.byJid.values()) {
    const phone = personPhone(contact.id);
    if (!phone) continue;
    const prev = people.get(phone);
    people.set(phone, {
      phone,
      savedName: prev?.savedName ?? clean(contact.name),
      pushName: prev?.pushName ?? clean(contact.notify),
      lastChatAt: null,
    });
  }

  for (const [jid, at] of book.chatTimes) {
    const phone = personPhone(jid);
    if (!phone) continue;
    const prev = people.get(phone) ?? { phone, savedName: null, pushName: null, lastChatAt: null };
    people.set(phone, { ...prev, lastChatAt: Math.max(prev.lastChatAt ?? 0, at) });
  }
  return people;
}

/**
 * Groups with their members, in the order of the Owner's own WhatsApp chat
 * list: most recently active first. A group with no chat time goes after
 * the rest, smallest first (ADR 0044).
 */
export function buildGroups(
  book: ContactBook,
  people: Map<string, WhatsAppPerson>,
  groups: RawWhatsAppGroup[],
  selfPhone: string | null,
): WhatsAppGroup[] {
  return groups
    .map((group) => {
      const members: WhatsAppPerson[] = [];
      const seen = new Set<string>();
      let unresolvedCount = 0;
      for (const participant of group.participants) {
        const phone =
          jidPhone(participant.phoneNumber) ?? resolvePhone(book, participant.id);
        if (!phone) {
          unresolvedCount++;
          continue;
        }
        if (seen.has(phone) || phone === selfPhone) continue;
        seen.add(phone);
        members.push(
          people.get(phone) ?? { phone, savedName: null, pushName: null, lastChatAt: null },
        );
      }
      return {
        id: group.id,
        subject: group.subject,
        members,
        unresolvedCount,
        lastActivityAt: book.chatTimes.get(bareJid(group.id)) ?? null,
      };
    })
    .sort(
      (a, b) =>
        byRecentFirst(a.lastActivityAt, b.lastActivityAt) || a.members.length - b.members.length,
    );
}

/** Most recent first, with no time at all after every time. */
function byRecentFirst(a: number | null, b: number | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

/**
 * The people the Contacts tab lists: those the Owner saved a name for, or
 * has a one-on-one chat with. Everyone else is reached through their groups.
 */
export function knownContacts(people: Iterable<WhatsAppPerson>): WhatsAppPerson[] {
  return [...people].filter((p) => p.savedName !== null || p.lastChatAt !== null);
}

/**
 * The Contacts tab's two sections. A person sits in the first that fits, so
 * someone saved who also chats is under `saved` only. Both run by last
 * one-on-one chat, most recent first; saved people with no chat come last,
 * by name.
 */
export function contactSections(contacts: WhatsAppPerson[]): {
  saved: WhatsAppPerson[];
  recent: WhatsAppPerson[];
} {
  const byRecency = (a: WhatsAppPerson, b: WhatsAppPerson) =>
    byRecentFirst(a.lastChatAt, b.lastChatAt) ||
    whatsAppDisplayName(a).localeCompare(whatsAppDisplayName(b));
  return {
    saved: contacts.filter((c) => c.savedName !== null).sort(byRecency),
    recent: contacts.filter((c) => c.savedName === null && c.lastChatAt !== null).sort(byRecency),
  };
}

/** Every group each person is in, smallest group first - the most telling one leads. */
export function groupsByPhone(groups: WhatsAppGroup[]): Map<string, WhatsAppGroup[]> {
  const out = new Map<string, WhatsAppGroup[]>();
  const smallestFirst = [...groups].sort((a, b) => a.members.length - b.members.length);
  for (const group of smallestFirst) {
    for (const member of group.members) {
      const list = out.get(member.phone);
      if (list) list.push(group);
      else out.set(member.phone, [group]);
    }
  }
  return out;
}

/** Saved name, then the person's own WhatsApp name, then empty. What gets imported. */
export function whatsAppDisplayName(person: WhatsAppPerson): string {
  return person.savedName ?? person.pushName ?? '';
}

/**
 * The name as the picker shows it. A name the person chose for themselves
 * gets WhatsApp's own `~` marker, so the Owner can tell it from one they saved.
 */
export function whatsAppLabel(person: WhatsAppPerson): string {
  if (person.savedName) return person.savedName;
  return person.pushName ? `~ ${person.pushName}` : '';
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * When a chat's last message was, relative to `now`: today, yesterday, or
 * longer ago (the picker shows a date then). Calendar days in Israel, like
 * every other date in the app.
 */
export function chatDay(atSeconds: number, now: Date): 'today' | 'yesterday' | 'earlier' {
  const days = daysUntil(israelToday(new Date(atSeconds * 1000)), now);
  return days >= 0 ? 'today' : days === -1 ? 'yesterday' : 'earlier';
}

/**
 * Whether a person matches a search: either of their names or their number
 * as the Owner reads it contains the text, or their number contains the
 * digits typed (`054 123` finds `0541234567`).
 */
export function personMatches(term: string, person: WhatsAppPerson, localPhone?: string): boolean {
  if (matchesSearch(term, person.savedName, person.pushName, localPhone)) return true;
  const digits = term.replace(/\D/g, '');
  return digits !== '' && phoneSearchForms(person.phone).some((form) => form.includes(digits));
}

/**
 * A group's members as its members screen splits them, over those matching
 * `term`: everyone pickable (named people first, so the ones the Owner can
 * recognise lead), those WhatsApp has no name for, and those already on the
 * guest list.
 */
export function memberLists(
  members: WhatsAppPerson[],
  term: string,
  locked: ReadonlySet<string>,
  localPhones: Map<string, string>,
): {
  matches: WhatsAppPerson[];
  all: WhatsAppPerson[];
  unnamed: WhatsAppPerson[];
  listed: WhatsAppPerson[];
} {
  const matches = members.filter((m) => personMatches(term, m, localPhones.get(m.phone)));
  const named: WhatsAppPerson[] = [];
  const unnamed: WhatsAppPerson[] = [];
  const listed: WhatsAppPerson[] = [];
  for (const m of matches) {
    if (locked.has(m.phone)) listed.push(m);
    else if (whatsAppDisplayName(m)) named.push(m);
    else unnamed.push(m);
  }
  return { matches, all: [...named, ...unnamed], unnamed, listed };
}

/**
 * What the Owner has ticked on the pick step, one selection per person
 * however many places they are listed in (ADR 0044). Kept as plain phones and
 * ids so it survives going back from the validate step.
 */
export interface WhatsAppPick {
  /** Selected people by phone, in the order they were picked. */
  phones: string[];
  /**
   * Groups in the order the Owner first picked from them. A person's first
   * group here decides their guest group, whether they were picked in the
   * group or from Contacts.
   */
  groupOrder: string[];
  /** The guest group each WhatsApp group maps to; absent or null means none. */
  guestGroups: Record<string, string | null>;
  /** Names the Owner typed for people WhatsApp had none for, by phone. */
  names: Record<string, string>;
}

export const EMPTY_WHATSAPP_PICK: WhatsAppPick = {
  phones: [],
  groupOrder: [],
  guestGroups: {},
  names: {},
};

export type PickState = HeaderState;

/**
 * Picks or drops people. People already on the guest list are never picked -
 * every way of picking goes through here, so this is the one place that holds.
 */
export function setPeoplePick(
  pick: WhatsAppPick,
  phones: string[],
  on: boolean,
  locked: ReadonlySet<string>,
): WhatsAppPick {
  if (!on) {
    const drop = new Set(phones);
    return { ...pick, phones: pick.phones.filter((p) => !drop.has(p)) };
  }
  const have = new Set(pick.phones);
  const add = phones.filter((p) => !have.has(p) && !locked.has(p));
  return add.length ? { ...pick, phones: [...pick.phones, ...add] } : pick;
}

/**
 * Picks or drops people from inside a group - its checkbox, its members
 * screen's select all, or one member. The group joins `groupOrder` when the
 * first of its members is picked this way and leaves it when none are left,
 * whichever control did it.
 */
export function setGroupMembersPick(
  pick: WhatsAppPick,
  group: WhatsAppGroup,
  phones: string[],
  on: boolean,
  locked: ReadonlySet<string>,
): WhatsAppPick {
  const next = setPeoplePick(pick, phones, on, locked);
  const selected = new Set(next.phones);
  const anyPicked = group.members.some((m) => selected.has(m.phone));
  const listed = next.groupOrder.includes(group.id);
  if (anyPicked === listed) return next;
  return {
    ...next,
    groupOrder: anyPicked
      ? [...next.groupOrder, group.id]
      : next.groupOrder.filter((id) => id !== group.id),
  };
}

/** A group's checkbox: everyone pickable when it is not already full, else nobody. */
export function toggleGroupPick(
  pick: WhatsAppPick,
  group: WhatsAppGroup,
  locked: ReadonlySet<string>,
): WhatsAppPick {
  const { state } = groupPickState(group, new Set(pick.phones), locked);
  const phones = group.members.map((m) => m.phone);
  return setGroupMembersPick(pick, group, phones, state !== 'all', locked);
}

export function setGuestGroupPick(
  pick: WhatsAppPick,
  groupId: string,
  guestGroup: string | null,
): WhatsAppPick {
  return { ...pick, guestGroups: { ...pick.guestGroups, [groupId]: guestGroup } };
}

/** Sets or clears the name typed for one person. */
export function setNamePick(pick: WhatsAppPick, phone: string, name: string): WhatsAppPick {
  const names = { ...pick.names };
  if (name.trim()) names[phone] = name;
  else delete names[phone];
  return { ...pick, names };
}

/**
 * How much of a group is picked, counted over the members who can be picked
 * (people already on the guest list cannot).
 */
export function groupPickState(
  group: WhatsAppGroup,
  selected: ReadonlySet<string>,
  locked: ReadonlySet<string>,
): { state: PickState; picked: number; pickable: number } {
  const pickable = group.members.map((m) => m.phone).filter((p) => !locked.has(p));
  return {
    state: headerState(selected, pickable),
    picked: pickable.filter((p) => selected.has(p)).length,
    pickable: pickable.length,
  };
}

/** The name a picked person is imported under: typed, then from WhatsApp, then empty. */
function pickedName(pick: WhatsAppPick, person: WhatsAppPerson): string {
  return pick.names[person.phone]?.trim() || whatsAppDisplayName(person);
}

/** Everyone read, by phone - group members and contacts are the same people. */
export function peopleByPhone(
  groups: WhatsAppGroup[],
  contacts: WhatsAppPerson[],
): Map<string, WhatsAppPerson> {
  const out = new Map<string, WhatsAppPerson>();
  for (const group of groups) for (const m of group.members) out.set(m.phone, m);
  for (const contact of contacts) out.set(contact.phone, contact);
  return out;
}

/** The picked people still found in what was read, in pick order. */
export function pickedPeople(
  people: Map<string, WhatsAppPerson>,
  pick: WhatsAppPick,
): WhatsAppPerson[] {
  return pick.phones.flatMap((phone) => {
    const person = people.get(phone);
    return person ? [person] : [];
  });
}

/** How many distinct people the pick adds up to, and how many of them still have no name. */
export function summarizePick(
  people: Map<string, WhatsAppPerson>,
  pick: WhatsAppPick,
): { people: number; unnamed: number } {
  const picked = pickedPeople(people, pick);
  return {
    people: picked.length,
    unnamed: picked.filter((p) => !pickedName(pick, p)).length,
  };
}

/**
 * Israeli numbers become the local `0...` form a file would carry; anything
 * else keeps a `+` and fails the validate step the same way a foreign number
 * in a file does. A plain string transform on purpose - validity is the
 * validate step's job, not this one's (and `formatPhone`'s libphonenumber
 * does not load under the unit-test runner).
 */
function toImportPhone(digits: string): string {
  return digits.startsWith('972') ? `0${digits.slice(3)}` : `+${digits}`;
}

/** Column order of the table handed to the import wizard. */
export const WHATSAPP_IMPORT_MAPPING: ColumnMapping = { 0: 'name', 1: 'phone', 2: 'group' };

/**
 * Turns the pick into the same `ParsedCSV` + `ColumnMapping` a file import
 * produces, so the existing validate and summary steps (row edits, duplicate
 * checks, missing-name flags, `importGuests`) run unchanged.
 *
 * One row per picked person. Their guest group is the mapping of the first
 * group in `groupOrder` they belong to, wherever they were picked.
 */
export function toWhatsAppImportTable(
  groups: WhatsAppGroup[],
  people: Map<string, WhatsAppPerson>,
  pick: WhatsAppPick,
): { parsed: ParsedCSV; mapping: ColumnMapping } {
  const groupsById = new Map(groups.map((g) => [g.id, g]));
  const guestGroupByPhone = new Map<string, string>();
  for (const id of pick.groupOrder) {
    const guestGroup = pick.guestGroups[id] ?? '';
    for (const member of groupsById.get(id)?.members ?? []) {
      if (!guestGroupByPhone.has(member.phone)) guestGroupByPhone.set(member.phone, guestGroup);
    }
  }

  const rows = pickedPeople(people, pick).map((person) => [
    pickedName(pick, person),
    toImportPhone(person.phone),
    guestGroupByPhone.get(person.phone) ?? '',
  ]);

  return {
    parsed: { headers: ['name', 'phone', 'group'], rows },
    mapping: WHATSAPP_IMPORT_MAPPING,
  };
}

/** Case-insensitive match of a search term against any of the given texts. */
export function matchesSearch(term: string, ...texts: (string | null | undefined)[]): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return texts.some((text) => text?.toLowerCase().includes(needle));
}

/**
 * Splits `text` around the first case-insensitive match of `term`, for
 * highlighting it. `match` is empty when there is none.
 */
export function splitMatch(
  text: string,
  term: string,
): { before: string; match: string; after: string } {
  const needle = term.trim().toLowerCase();
  const at = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (at === -1) return { before: text, match: '', after: '' };
  return {
    before: text.slice(0, at),
    match: text.slice(at, at + needle.length),
    after: text.slice(at + needle.length),
  };
}
