import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { addLidMapping, bareJid, buildGroups, buildPeople, chatDay, contactSections, createContactBook, EMPTY_WHATSAPP_PICK, groupPickState, groupsByPhone, jidPhone, knownContacts, matchesSearch, memberLists, mergeContact, peopleByPhone, personMatches, recordChat, resolvePhone, setGroupMembersPick, setGuestGroupPick, setNamePick, setPeoplePick, splitMatch, summarizePick, toggleGroupPick, toWhatsAppImportTable, unresolvedLids, whatsAppLabel, WHATSAPP_IMPORT_MAPPING } from './whatsapp-import.ts';

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
    lastChatAt: null,
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
    lastChatAt: null,
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
    { phone: '972545555555', savedName: 'Saved', pushName: null, lastChatAt: null },
    { phone: '972546666666', savedName: null, pushName: null, lastChatAt: null },
  ]);
  assert.equal(group.unresolvedCount, 1);
});

test('groups run by last activity, then groups with none, smallest first', () => {
  const book = createContactBook();
  recordChat(book, { id: 'old@g.us', conversationTimestamp: 100 });
  // A Long-like timestamp, as protobuf hands it over.
  recordChat(book, { id: 'new@g.us', conversationTimestamp: { toString: () => '300' } });
  // The same chat in a later batch with an older time keeps the newer one.
  recordChat(book, { id: 'new@g.us', conversationTimestamp: 200 });
  const member = (d: string) => ({ id: PN(d) });
  const groups = buildGroups(
    book,
    new Map(),
    [
      { id: 'old@g.us', subject: 'Old', participants: [member('972540000001')] },
      { id: 'quiet-big@g.us', subject: 'Big', participants: [member('972540000002'), member('972540000003')] },
      { id: 'new@g.us', subject: 'New', participants: [member('972540000004')] },
      { id: 'quiet-small@g.us', subject: 'Small', participants: [member('972540000005')] },
    ],
    SELF,
  );
  assert.deepEqual(
    groups.map((g: { id: string; lastActivityAt: number | null }) => [g.id, g.lastActivityAt]),
    [
      ['new@g.us', 300],
      ['old@g.us', 100],
      ['quiet-small@g.us', null],
      ['quiet-big@g.us', null],
    ],
  );
});

test('a one-on-one chat under either alias sets when they last chatted', () => {
  const book = createContactBook();
  mergeContact(book, { id: PN('972541111111'), name: 'Saved, no chat' });
  mergeContact(book, { id: LID('910'), notify: 'Hidden' });
  addLidMapping(book, LID('910'), PN('972542222222'));
  recordChat(book, { id: LID('910'), conversationTimestamp: 500 });
  recordChat(book, { id: PN('972542222222'), lastMessageRecvTimestamp: 400 });
  // A chat with someone the contacts never mentioned still yields a person.
  recordChat(book, { id: PN('972543333333'), conversationTimestamp: 50 });
  recordChat(book, { id: '120363@g.us', conversationTimestamp: 900 });
  recordChat(book, { id: PN(SELF), conversationTimestamp: 900 });

  const people = buildPeople(book, SELF);
  assert.equal(people.get('972541111111')?.lastChatAt, null);
  assert.equal(people.get('972542222222')?.lastChatAt, 500);
  assert.deepEqual(people.get('972543333333'), {
    phone: '972543333333',
    savedName: null,
    pushName: null,
    lastChatAt: 50,
  });
  assert.equal(people.size, 3);
});

test('hidden one-on-one chats with no phone yet are included in the lookup', () => {
  const book = createContactBook();
  recordChat(book, { id: LID('920'), conversationTimestamp: 1 });
  recordChat(book, { id: '120363@g.us', conversationTimestamp: 1 });
  assert.deepEqual(unresolvedLids(book), [LID('920')]);
});

const person = (
  phone: string,
  savedName: string | null,
  pushName: string | null,
  lastChatAt: number | null = null,
) => ({ phone, savedName, pushName, lastChatAt });

test('Contacts lists only people saved or chatted with, each in one section', () => {
  const contacts = knownContacts([
    person('1', 'Avi', null, 100),
    person('2', 'Bella', null),
    person('3', null, 'Gal', 300),
    person('4', 'Zohar', null, 200),
    person('5', null, 'Stranger'),
    person('6', null, null, 50),
  ]);
  assert.deepEqual(
    contacts.map((p: { phone: string }) => p.phone),
    ['1', '2', '3', '4', '6'],
  );

  const { saved, recent } = contactSections(contacts);
  // Saved runs by last chat too; a saved person never chatted with comes last.
  assert.deepEqual(saved.map((p: { phone: string }) => p.phone), ['4', '1', '2']);
  assert.deepEqual(recent.map((p: { phone: string }) => p.phone), ['3', '6']);
});

test('a self-chosen name is marked the way WhatsApp marks it', () => {
  assert.equal(whatsAppLabel(person('1', 'Avi', 'Avi K')), 'Avi');
  assert.equal(whatsAppLabel(person('1', null, 'Itay')), '~ Itay');
  assert.equal(whatsAppLabel(person('1', null, null)), '');
});

const group = (id: string, members: ReturnType<typeof person>[]) => ({
  id,
  subject: id,
  members,
  unresolvedCount: 0,
  lastActivityAt: null,
});

test('each person lists their groups smallest first', () => {
  const dana = person('972542222222', null, 'Dana');
  const big = group('big', [dana, person('1', null, null), person('2', null, null)]);
  const small = group('small', [dana]);
  const byPhone = groupsByPhone([big, small]);
  assert.deepEqual(
    byPhone.get(dana.phone)?.map((g: { id: string }) => g.id),
    ['small', 'big'],
  );
});

test('a group checkbox picks everyone pickable, and unpicks them all when full', () => {
  const a = person('972541111111', 'A', null);
  const b = person('972542222222', 'B', null);
  const listed = person('972543333333', 'Already a guest', null);
  const family = group('family', [a, b, listed]);
  const locked = new Set([listed.phone]);

  let pick = toggleGroupPick(EMPTY_WHATSAPP_PICK, family, locked);
  assert.deepEqual(pick.phones, [a.phone, b.phone]);
  assert.deepEqual(pick.groupOrder, ['family']);
  assert.deepEqual(groupPickState(family, new Set(pick.phones), locked), {
    state: 'all',
    picked: 2,
    pickable: 2,
  });

  // Unticking one person anywhere leaves the group partly picked.
  pick = setPeoplePick(pick, [b.phone], false, locked);
  assert.deepEqual(groupPickState(family, new Set(pick.phones), locked), {
    state: 'some',
    picked: 1,
    pickable: 2,
  });

  // From "some", the checkbox fills the group again rather than clearing it.
  pick = toggleGroupPick(pick, family, locked);
  assert.deepEqual(pick.phones, [a.phone, b.phone]);

  pick = toggleGroupPick(pick, family, locked);
  assert.deepEqual(pick.phones, []);
  assert.deepEqual(pick.groupOrder, []);
  // The empty pick itself is never mutated.
  assert.deepEqual(EMPTY_WHATSAPP_PICK.phones, []);
});

test('the pick becomes a name/phone/group table, one row per person', () => {
  const moshe = person('972541111111', 'Moshe Cohen', 'Moshe');
  const dana = person('972542222222', null, 'Dana');
  const nameless = person('972543333333', null, null);
  const typed = person('972544444444', null, null);
  const abroad = person('14155550100', 'Abroad', null);
  const family = group('family', [moshe, dana]);
  const friends = group('friends', [dana, nameless, typed]);

  let pick = EMPTY_WHATSAPP_PICK;
  pick = toggleGroupPick(pick, friends, new Set());
  pick = toggleGroupPick(pick, family, new Set());
  pick = setGuestGroupPick(pick, 'family', 'Family');
  pick = setGuestGroupPick(pick, 'friends', 'Friends');
  pick = setNamePick(pick, typed.phone, 'Aunt Rachel');
  pick = setPeoplePick(pick, [abroad.phone, '972549999999'], true, new Set());

  const { parsed, mapping } = toWhatsAppImportTable(
    [family, friends],
    peopleByPhone([family, friends], [moshe, abroad]),
    pick,
  );
  assert.deepEqual(mapping, WHATSAPP_IMPORT_MAPPING);
  assert.deepEqual(parsed.headers, ['name', 'phone', 'group']);
  assert.deepEqual(parsed.rows, [
    // Friends was picked from first, so it decides Dana's guest group.
    ['Dana', '0542222222', 'Friends'],
    // No name anywhere: left blank for the validate step to flag.
    ['', '0543333333', 'Friends'],
    // A name typed in the pick step wins.
    ['Aunt Rachel', '0544444444', 'Friends'],
    ['Moshe Cohen', '0541111111', 'Family'],
    // Picked from Contacts and in no picked group: no guest group. Not an
    // Israeli mobile: kept international, as a number from abroad has to be.
    ['Abroad', '+14155550100', ''],
    // 972549999999 was never read, so it is dropped.
  ]);
});

test('someone picked from Contacts takes the guest group of a picked group they are in', () => {
  const dana = person('972542222222', null, 'Dana');
  const other = person('972541111111', 'Other', null);
  const family = group('family', [dana, other]);
  let pick = setGroupMembersPick(EMPTY_WHATSAPP_PICK, family, [other.phone], true, new Set());
  pick = setGuestGroupPick(pick, 'family', 'Family');
  pick = setPeoplePick(pick, [dana.phone], true, new Set());
  const { parsed } = toWhatsAppImportTable([family], peopleByPhone([family], [dana]), pick);
  assert.deepEqual(parsed.rows, [
    ['Other', '0541111111', 'Family'],
    ['Dana', '0542222222', 'Family'],
  ]);
});

test('the pick summary counts each person once and counts those still nameless', () => {
  const dana = person('972542222222', null, 'Dana');
  const nameless = person('972543333333', null, null);
  const named = person('972544444444', null, null);
  const people = peopleByPhone([group('a', [dana, nameless, named])], [dana]);
  let pick = setPeoplePick(
    EMPTY_WHATSAPP_PICK,
    [dana.phone, nameless.phone, named.phone],
    true,
    new Set(),
  );
  pick = setNamePick(pick, named.phone, 'Typed');
  assert.deepEqual(summarizePick(people, pick), { people: 3, unnamed: 1 });

  pick = setNamePick(pick, named.phone, '   ');
  assert.deepEqual(summarizePick(people, pick), { people: 3, unnamed: 2 });
});

test('chat days are calendar days in Israel, wherever the phone is', () => {
  // 12:00 in Israel on 20 October.
  const now = new Date('2026-10-20T09:00:00Z');
  const at = (iso: string) => new Date(iso).getTime() / 1000;
  // 01:30 on the 20th in Israel, though still the 19th in UTC.
  assert.equal(chatDay(at('2026-10-19T22:30:00Z'), now), 'today');
  assert.equal(chatDay(at('2026-10-19T20:00:00Z'), now), 'yesterday');
  assert.equal(chatDay(at('2026-10-18T09:00:00Z'), now), 'earlier');
});

test('picking inside a group puts it in groupOrder, and emptying it takes it out', () => {
  const a = person('972541111111', 'A', null);
  const b = person('972542222222', 'B', null);
  const family = group('family', [a, b]);
  const none = new Set<string>();

  let pick = setGroupMembersPick(EMPTY_WHATSAPP_PICK, family, [a.phone], true, none);
  assert.deepEqual(pick.groupOrder, ['family']);
  pick = setGroupMembersPick(pick, family, [b.phone], true, none);
  assert.deepEqual(pick.groupOrder, ['family']);

  // Unticking members one by one empties it the same as its checkbox would.
  pick = setGroupMembersPick(pick, family, [a.phone], false, none);
  assert.deepEqual(pick.groupOrder, ['family']);
  pick = setGroupMembersPick(pick, family, [b.phone], false, none);
  assert.deepEqual(pick, EMPTY_WHATSAPP_PICK);
});

test('people already on the guest list are never picked, however they are picked', () => {
  const listed = new Set(['972541111111']);
  const pick = setPeoplePick(EMPTY_WHATSAPP_PICK, ['972541111111', '972542222222'], true, listed);
  assert.deepEqual(pick.phones, ['972542222222']);
});

test('a person matches by either name, their number as shown, or the digits typed', () => {
  const dana = person('972541234567', 'Dana Levi', 'Dani');
  assert.equal(personMatches('levi', dana, '054-1234567'), true);
  assert.equal(personMatches('dani', dana, '054-1234567'), true);
  assert.equal(personMatches('054-123', dana, '054-1234567'), true);
  assert.equal(personMatches('054 1234', dana, '054-1234567'), true);
  assert.equal(personMatches('9725412', dana, '054-1234567'), true);
  assert.equal(personMatches('moshe', dana, '054-1234567'), false);
  assert.equal(personMatches('', dana), true);
});

test('a group splits into pickable (named first), unnamed and listed members', () => {
  const nameless = person('972541111111', null, null);
  const named = person('972542222222', null, 'Gal');
  const listed = person('972543333333', 'Already', null);
  const lists = memberLists([nameless, named, listed], '', new Set([listed.phone]), new Map());
  assert.deepEqual(lists.all, [named, nameless]);
  assert.deepEqual(lists.unnamed, [nameless]);
  assert.deepEqual(lists.listed, [listed]);

  const searched = memberLists([nameless, named, listed], 'gal', new Set([listed.phone]), new Map());
  assert.deepEqual(searched.matches, [named]);
  assert.deepEqual(searched.all, [named]);
  assert.deepEqual(searched.listed, []);
});

test('search matches any text, ignoring case and blank terms', () => {
  assert.equal(matchesSearch('', 'anything'), true);
  assert.equal(matchesSearch('  ', null), true);
  assert.equal(matchesSearch('moSHE', 'Moshe Cohen', null), true);
  assert.equal(matchesSearch('0541', null, '0541111111'), true);
  assert.equal(matchesSearch('dana', 'Moshe', null), false);
});

test('a match splits out for highlighting, keeping the original case', () => {
  assert.deepEqual(splitMatch('Moshe Cohen', 'coh'), { before: 'Moshe ', match: 'Coh', after: 'en' });
  assert.deepEqual(splitMatch('Moshe', 'x'), { before: 'Moshe', match: '', after: '' });
  assert.deepEqual(splitMatch('Moshe', ' '), { before: 'Moshe', match: '', after: '' });
});
