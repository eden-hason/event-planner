import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { DEFAULT_GUEST_LIST_PARAMS, activeFilterCount, parseGuestListParams, writeGuestListParams } from './guest-list-params.ts';

const parse = (query: string) =>
  parseGuestListParams(new URLSearchParams(query));

const write = (
  params: Parameters<typeof writeGuestListParams>[0],
  base = '',
) => {
  const search = new URLSearchParams(base);
  writeGuestListParams(params, search);
  return search.toString();
};

test('an empty query is the default view', () => {
  assert.deepEqual(parse(''), DEFAULT_GUEST_LIST_PARAMS);
});

test('every filter reads back from the query', () => {
  assert.deepEqual(
    parse(
      'q=%D7%9B%D7%94%D7%9F&status=pending&group=a,b&side=groom&noPhone=1&sort=name_desc',
    ),
    {
      q: 'כהן',
      status: 'pending',
      groups: ['a', 'b'],
      side: 'groom',
      noPhone: true,
      sort: 'name_desc',
      issue: null,
      outside: false,
    },
  );
});

test('the outside-the-package filter round-trips through the URL', () => {
  assert.equal(parse('package=outside').outside, true);
  assert.equal(parse('package=inside').outside, false);
  assert.equal(write({ ...DEFAULT_GUEST_LIST_PARAMS, outside: true }), 'package=outside');
});

test('values that are not ours are ignored rather than trusted', () => {
  assert.deepEqual(
    parse('status=maybe&side=both&sort=random&group='),
    DEFAULT_GUEST_LIST_PARAMS,
  );
});

test('a health-check issue sorts by name so duplicates sit together', () => {
  const params = parse('issue=duplicates');
  assert.equal(params.issue, 'duplicates');
  assert.equal(params.sort, 'name_asc');
});

test('an explicit sort wins over the issue default', () => {
  assert.equal(parse('issue=duplicates&sort=rsvp').sort, 'rsvp');
});

test('the no-phone issue is the no-phone filter, not a scope', () => {
  const params = parse('issue=no-phone');
  assert.equal(params.noPhone, true);
  assert.equal(params.issue, null);
});

test('writing the default view leaves the query clean', () => {
  assert.equal(write(DEFAULT_GUEST_LIST_PARAMS), '');
});

test('writing keeps params that are not the list’s own', () => {
  const query = write(
    { ...DEFAULT_GUEST_LIST_PARAMS, status: 'declined', groups: ['a', 'b'] },
    'guest=123&status=pending',
  );
  const search = new URLSearchParams(query);
  assert.equal(search.get('guest'), '123');
  assert.equal(search.get('status'), 'declined');
  assert.equal(search.get('group'), 'a,b');
});

test('a written view reads back as itself', () => {
  const view = {
    q: 'לוי',
    status: 'confirmed' as const,
    groups: ['x'],
    side: 'bride' as const,
    noPhone: true,
    sort: 'amount_desc' as const,
    issue: 'duplicates' as const,
    outside: true,
  };
  assert.deepEqual(parse(write(view)), view);
});

test('the name sort an issue implies is not written out', () => {
  const query = write({
    ...DEFAULT_GUEST_LIST_PARAMS,
    issue: 'duplicates',
    sort: 'name_asc',
  });
  assert.equal(query, 'issue=duplicates');
});

test('the filter badge counts group, side and no-phone, never status or search', () => {
  assert.equal(activeFilterCount(DEFAULT_GUEST_LIST_PARAMS), 0);
  assert.equal(
    activeFilterCount({
      ...DEFAULT_GUEST_LIST_PARAMS,
      q: 'x',
      status: 'pending',
      groups: ['a', 'b'],
      side: 'groom',
      noPhone: true,
    }),
    4,
  );
});
