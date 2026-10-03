import type { WhatsAppGroup, WhatsAppPerson } from '../types';
import type { ColumnMapping } from './import-guests';
import type { ParsedCSV } from './parse-csv';

/**
 * Pure pieces of the WhatsApp linked-device import (backlog 0017): folding
 * the contacts a sync sends into one record per person, shaping groups, and
 * turning the Owner's selection into the table the existing import wizard
 * validates. Nothing here talks to WhatsApp - see
 * `services/whatsapp-import.ts` for that.
 */

/** The subset of a Baileys `Contact` the import reads. */
export interface RawWhatsAppContact {
  id: string;
  lid?: string | null;
  phoneNumber?: string | null;
  name?: string | null;
  notify?: string | null;
}

/** The subset of Baileys `GroupMetadata` the import reads. */
export interface RawWhatsAppGroup {
  id: string;
  subject: string;
  participants: { id: string; phoneNumber?: string | null }[];
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
 */
export interface ContactBook {
  byJid: Map<string, RawWhatsAppContact>;
  lidToPhone: Map<string, string>;
}

export function createContactBook(): ContactBook {
  return { byJid: new Map(), lidToPhone: new Map() };
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

/** Hidden jids the book has no phone for yet - for a batch lookup before building. */
export function unresolvedLids(book: ContactBook, extra: string[] = []): string[] {
  const out = new Set<string>();
  for (const jid of [...book.byJid.keys(), ...extra.map(bareJid)]) {
    if (isLidJid(jid) && !resolvePhone(book, jid)) out.add(jid);
  }
  return [...out];
}

/**
 * One record per phone. Saved name wins over the self-chosen one, and the
 * first non-empty value of each wins across aliases. People with no
 * resolvable phone (hidden-id chats), non-person jids (groups, broadcast,
 * newsletters) and the Owner's own number are dropped - there is nothing to
 * import them as.
 */
export function buildPeople(
  book: ContactBook,
  selfPhone: string | null,
): Map<string, WhatsAppPerson> {
  const people = new Map<string, WhatsAppPerson>();
  for (const contact of book.byJid.values()) {
    if (!isPnJid(contact.id) && !isLidJid(contact.id)) continue;
    const phone = resolvePhone(book, contact.id);
    if (!phone || phone === selfPhone) continue;
    const prev = people.get(phone);
    people.set(phone, {
      phone,
      savedName: prev?.savedName ?? clean(contact.name),
      pushName: prev?.pushName ?? clean(contact.notify),
    });
  }
  return people;
}

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
        members.push(people.get(phone) ?? { phone, savedName: null, pushName: null });
      }
      return { id: group.id, subject: group.subject, members, unresolvedCount };
    })
    .sort((a, b) => b.members.length - a.members.length);
}

/** Contacts the picker lists: named people first, then by name. */
export function sortContacts(people: Iterable<WhatsAppPerson>): WhatsAppPerson[] {
  return [...people].sort((a, b) => {
    const an = whatsAppDisplayName(a);
    const bn = whatsAppDisplayName(b);
    if (!an !== !bn) return an ? -1 : 1;
    return an.localeCompare(bn);
  });
}

/** Saved name, then the person's own WhatsApp name, then empty. */
export function whatsAppDisplayName(person: WhatsAppPerson): string {
  return person.savedName ?? person.pushName ?? '';
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export interface WhatsAppImportSelection {
  /** Selected groups in the order the Owner picked them, each with the guest group it maps to. */
  groups: { group: WhatsAppGroup; guestGroup: string | null }[];
  contacts: WhatsAppPerson[];
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
 * Turns the selection into the same `ParsedCSV` + `ColumnMapping` a file
 * import produces, so the existing validate and summary steps (row edits,
 * duplicate checks, missing-name flags, `importGuests`) run unchanged.
 *
 * A person is imported once: groups are taken in selection order, so the
 * first selected group a person belongs to decides their guest group, and a
 * selected contact already pulled in by a group adds nothing.
 */
export function toWhatsAppImportTable(selection: WhatsAppImportSelection): {
  parsed: ParsedCSV;
  mapping: ColumnMapping;
} {
  const rows: string[][] = [];
  const seen = new Set<string>();
  const add = (person: WhatsAppPerson, guestGroup: string | null) => {
    if (seen.has(person.phone)) return;
    seen.add(person.phone);
    rows.push([
      whatsAppDisplayName(person),
      toImportPhone(person.phone),
      guestGroup ?? '',
    ]);
  };

  for (const { group, guestGroup } of selection.groups) {
    for (const member of group.members) add(member, guestGroup);
  }
  for (const contact of selection.contacts) add(contact, null);

  return {
    parsed: { headers: ['name', 'phone', 'group'], rows },
    mapping: WHATSAPP_IMPORT_MAPPING,
  };
}

/**
 * What the Owner has ticked on the pick step. Kept as plain ids and phones
 * (not objects) so it survives going back from the validate step.
 */
export interface WhatsAppPick {
  /** In the order they were ticked: a person's first selected group decides their guest group. */
  groupIds: string[];
  /** The guest group each selected WhatsApp group maps to; absent or null means none. */
  guestGroups: Record<string, string | null>;
  contactPhones: string[];
}

export const EMPTY_WHATSAPP_PICK: WhatsAppPick = {
  groupIds: [],
  guestGroups: {},
  contactPhones: [],
};

export function toggleGroupPick(pick: WhatsAppPick, groupId: string): WhatsAppPick {
  return pick.groupIds.includes(groupId)
    ? { ...pick, groupIds: pick.groupIds.filter((id) => id !== groupId) }
    : { ...pick, groupIds: [...pick.groupIds, groupId] };
}

export function setGuestGroupPick(
  pick: WhatsAppPick,
  groupId: string,
  guestGroup: string | null,
): WhatsAppPick {
  return { ...pick, guestGroups: { ...pick.guestGroups, [groupId]: guestGroup } };
}

export function toggleContactPick(pick: WhatsAppPick, phone: string): WhatsAppPick {
  return pick.contactPhones.includes(phone)
    ? { ...pick, contactPhones: pick.contactPhones.filter((p) => p !== phone) }
    : { ...pick, contactPhones: [...pick.contactPhones, phone] };
}

/** Resolves the pick against what was read; ids and phones no longer present are ignored. */
export function toImportSelection(
  groups: WhatsAppGroup[],
  contacts: WhatsAppPerson[],
  pick: WhatsAppPick,
): WhatsAppImportSelection {
  const groupsById = new Map(groups.map((g) => [g.id, g]));
  const contactsByPhone = new Map(contacts.map((c) => [c.phone, c]));
  return {
    groups: pick.groupIds.flatMap((id) => {
      const group = groupsById.get(id);
      return group ? [{ group, guestGroup: pick.guestGroups[id] ?? null }] : [];
    }),
    contacts: pick.contactPhones.flatMap((phone) => {
      const contact = contactsByPhone.get(phone);
      return contact ? [contact] : [];
    }),
  };
}

/** How many distinct people the pick adds up to, and how many of them have no name. */
export function summarizePick(selection: WhatsAppImportSelection): {
  people: number;
  unnamed: number;
} {
  const people = new Map<string, WhatsAppPerson>();
  for (const { group } of selection.groups) {
    for (const member of group.members) people.set(member.phone, member);
  }
  for (const contact of selection.contacts) people.set(contact.phone, contact);
  let unnamed = 0;
  for (const person of people.values()) if (!whatsAppDisplayName(person)) unnamed++;
  return { people: people.size, unnamed };
}

/** Case-insensitive match of a search term against any of the given texts. */
export function matchesSearch(term: string, ...texts: (string | null | undefined)[]): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return texts.some((text) => text?.toLowerCase().includes(needle));
}
