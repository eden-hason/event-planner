import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { addLidMapping, bareJid, buildGroups, buildPeople, createContactBook, jidPhone, mergeContact, resolvePhone, sortContacts, toWhatsAppImportTable, unresolvedLids, WHATSAPP_IMPORT_MAPPING } from './whatsapp-import.ts';

const PN = (digits: string) => `${digits}@s.whatsapp.net`;
const LID = (id: string) => `${id}@lid`;
const SELF = '972500000000';

test('device suffixes are stripped and only phone jids yield a phone', () => {
  assert.equal(bareJid('972548129777:17@s.whatsapp.net'), PN('972548129777'));
  assert.equal(jidPhone('972548129777:17@s.whatsapp.net'), '972548129777');
  assert.equal(jidPhone(LID('123')), null);
  assert.equal(jidPhone('120363@g.us'), null);
  assert.equal(jidPhone(undefined), null);
});

test('a later partial contact with an undefined name does not erase a saved name', () => {
  // The bug the spike hit: app-state sync delivers the saved name, then a
  // history chunk re-sends the same person as `name: undefined`.
  const book = createContactBook();
  mergeContact(book, { id: PN('972541111111'), name: 'Moshe Cohen' });
  mergeContact(book, { id: PN('972541111111'), name: undefined, notify: 'Moshe 🙂' });
  mergeContact(book, { id: PN('972541111111'), name: '' });

  const [person] = buildPeople(book, SELF).values();
  assert.deepEqual(person, {
    phone: '972541111111',
    savedName: 'Moshe Cohen',
    pushName: 'Moshe 🙂',
  });
});

test('a person seen under both their phone jid and hidden jid is one record', () => {
  const book = createContactBook();
  mergeContact(book, { id: LID('900'), notify: 'Dana' });
  mergeContact(book, { id: PN('972542222222'), lid: LID('900'), name: 'Dana Levi' });

  const people = [...buildPeople(book, SELF).values()];
  assert.equal(people.length, 1);
  assert.deepEqual(people[0], {
    phone: '972542222222',
    savedName: 'Dana Levi',
    pushName: 'Dana',
  });
});

test('hidden jids resolve through explicit mappings, and unmapped ones are reported', () => {
  const book = createContactBook();
  mergeContact(book, { id: LID('901'), notify: 'Known' });
  mergeContact(book, { id: LID('902'), notify: 'Unknown' });
  addLidMapping(book, LID('901'), PN('972543333333'));

  assert.equal(resolvePhone(book, LID('901')), '972543333333');
  assert.equal(resolvePhone(book, LID('902')), null);
  assert.deepEqual(unresolvedLids(book, [LID('903'), LID('901')]), [LID('902'), LID('903')]);
});

test('people without a phone, non-person jids and the Owner are dropped', () => {
  const book = createContactBook();
  mergeContact(book, { id: LID('902'), notify: 'No phone' });
  mergeContact(book, { id: '120363@g.us', name: 'A group' });
  mergeContact(book, { id: 'status@broadcast' });
  mergeContact(book, { id: PN(SELF), name: 'Me' });
  mergeContact(book, { id: PN('972544444444'), notify: 'Kept' });

  assert.deepEqual([...buildPeople(book, SELF).keys()], ['972544444444']);
});

test('group members take the server phone first, then the book, and carry known names', () => {
  const book = createContactBook();
  mergeContact(book, { id: PN('972545555555'), name: 'Saved' });
  addLidMapping(book, LID('904'), PN('972546666666'));
  const people = buildPeople(book, SELF);

  const [group] = buildGroups(
    book,
    people,
    [
      {
        id: 'g1@g.us',
        subject: 'Family',
        participants: [
          { id: LID('903'), phoneNumber: PN('972545555555') },
          { id: LID('904') },
          { id: LID('905') },
          { id: PN(SELF) },
          { id: PN('972545555555') },
        ],
      },
    ],
    SELF,
  );

  assert.deepEqual(group.members, [
    { phone: '972545555555', savedName: 'Saved', pushName: null },
    { phone: '972546666666', savedName: null, pushName: null },
  ]);
  assert.equal(group.unresolvedCount, 1);
});

test('groups are listed largest first', () => {
  const book = createContactBook();
  const groups = buildGroups(
    book,
    new Map(),
    [
      { id: 'small', subject: 'Small', participants: [{ id: PN('972540000001') }] },
      {
        id: 'big',
        subject: 'Big',
        participants: [{ id: PN('972540000002') }, { id: PN('972540000003') }],
      },
    ],
    SELF,
  );
  assert.deepEqual(
    groups.map((g: { id: string }) => g.id),
    ['big', 'small'],
  );
});

test('contacts sort named people first, then by name', () => {
  const sorted = sortContacts([
    { phone: '1', savedName: null, pushName: null },
    { phone: '2', savedName: null, pushName: 'Zohar' },
    { phone: '3', savedName: 'Avi', pushName: null },
  ]);
  assert.deepEqual(
    sorted.map((p: { phone: string }) => p.phone),
    ['3', '2', '1'],
  );
});

test('the selection becomes a name/phone/group table, one row per person', () => {
  const family = {
    id: 'g1',
    subject: 'Family',
    unresolvedCount: 0,
    members: [
      { phone: '972541111111', savedName: 'Moshe Cohen', pushName: 'Moshe' },
      { phone: '972542222222', savedName: null, pushName: 'Dana' },
    ],
  };
  const friends = {
    id: 'g2',
    subject: 'Friends',
    unresolvedCount: 0,
    members: [
      { phone: '972542222222', savedName: null, pushName: 'Dana' },
      { phone: '972543333333', savedName: null, pushName: null },
    ],
  };

  const { parsed, mapping } = toWhatsAppImportTable({
    groups: [
      { group: family, guestGroup: 'Family' },
      { group: friends, guestGroup: null },
    ],
    contacts: [
      { phone: '972541111111', savedName: 'Moshe Cohen', pushName: null },
      { phone: '14155550100', savedName: 'Abroad', pushName: null },
    ],
  });

  assert.deepEqual(mapping, WHATSAPP_IMPORT_MAPPING);
  assert.deepEqual(parsed.headers, ['name', 'phone', 'group']);
  assert.deepEqual(parsed.rows, [
    ['Moshe Cohen', '0541111111', 'Family'],
    // Already in Family, which was selected first - Friends does not re-add her.
    ['Dana', '0542222222', 'Family'],
    // No name anywhere: left blank for the validate step to flag.
    ['', '0543333333', ''],
    // Not an Israeli mobile: kept international so validation rejects it as it would from a file.
    ['Abroad', '+14155550100', ''],
  ]);
});
