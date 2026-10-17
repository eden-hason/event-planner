import assert from 'node:assert/strict';
import test from 'node:test';
// prettier-ignore
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { describeUpsertFailure } from './upsert-error.ts';

const t = (key: string, values?: Record<string, string | number>) =>
  values ? `${key} ${JSON.stringify(values)}` : key;

test('a phone already in the list names who has it, or says it is taken', () => {
  assert.equal(
    describeUpsertFailure({ message: 'x', phoneTakenBy: 'דני' }, t),
    'form.phoneTakenBy {"name":"דני"}',
  );
  assert.equal(
    describeUpsertFailure({ phoneTakenBy: null }, t),
    'form.phoneTaken',
  );
});

test('the seating guard becomes the shortfall sentence', () => {
  assert.equal(
    describeUpsertFailure(
      { message: 'seating_over_capacity party=4 free=2 shortfall=2' },
      t,
    ),
    'form.table.overCapacity {"party":4,"free":2,"shortfall":2}',
  );
  assert.equal(
    describeUpsertFailure({ message: 'seating_table_not_found' }, t),
    'form.table.tableGone',
  );
});

test('any other message passes through, and none falls back', () => {
  assert.equal(describeUpsertFailure({ message: 'boom' }, t), 'boom');
  assert.equal(describeUpsertFailure({}, t), 'form.somethingWentWrong');
});
