import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bonusRecords, packageState, recordPackage, splitByPackage } from './record-package';

describe('bonusRecords', () => {
  it('gives nothing below 150 paid records', () => {
    assert.equal(bonusRecords(0), 0);
    assert.equal(bonusRecords(1), 0);
    assert.equal(bonusRecords(149), 0);
  });

  it('gives 10 from 150 paid records, whatever the package size', () => {
    assert.equal(bonusRecords(150), 10);
    assert.equal(bonusRecords(200), 10);
    assert.equal(bonusRecords(201), 10);
    assert.equal(bonusRecords(1000), 10);
  });
});

describe('recordPackage', () => {
  it('sums the payments and adds the automatic bonus', () => {
    assert.deepEqual(recordPackage({ payments: [200], bonusOverride: null }), {
      paid: 200,
      bonus: 10,
      bonusIsCustom: false,
      size: 210,
    });
  });

  it('computes the bonus from the total, so a split purchase never stacks it', () => {
    assert.deepEqual(recordPackage({ payments: [150, 150], bonusOverride: null }), {
      paid: 300,
      bonus: 10,
      bonusIsCustom: false,
      size: 310,
    });
  });

  it('grants the bonus once a top-up crosses 150 paid records', () => {
    assert.deepEqual(recordPackage({ payments: [100, 50], bonusOverride: null }), {
      paid: 150,
      bonus: 10,
      bonusIsCustom: false,
      size: 160,
    });
  });

  it('keeps an Operator override, including through a top-up', () => {
    assert.deepEqual(recordPackage({ payments: [200, 300], bonusOverride: 30 }), {
      paid: 500,
      bonus: 30,
      bonusIsCustom: true,
      size: 530,
    });
  });

  it('honours an override of zero', () => {
    assert.deepEqual(recordPackage({ payments: [200], bonusOverride: 0 }), {
      paid: 200,
      bonus: 0,
      bonusIsCustom: true,
      size: 200,
    });
  });

  it('is null when no payment was ever recorded', () => {
    assert.equal(recordPackage({ payments: [], bonusOverride: null }), null);
    assert.equal(recordPackage({ payments: [], bonusOverride: 20 }), null);
  });
});

/** A record with a phone, which it got at `phoneAddedAt`. */
const record = (id: string, phoneAddedAt: string, reached = false) => ({
  id,
  phoneAddedAt,
  reached,
});
/** A record with no phone number. */
const noPhone = (id: string, reached = false) => ({ id, phoneAddedAt: null, reached });

describe('splitByPackage', () => {
  it('puts everyone inside while the list fits', () => {
    const split = splitByPackage({
      packageSize: 3,
      records: [record('a', '2026-01-01'), record('b', '2026-01-02')],
      reachedDeletedCount: 0,
    });
    assert.deepEqual(split.outside, []);
    assert.equal(split.used, 2);
    assert.equal(split.uncounted, 0);
    assert.equal(split.left, 1);
    assert.equal(split.over, 0);
  });

  it('leaves the records that got a phone last outside', () => {
    const split = splitByPackage({
      packageSize: 2,
      records: [
        record('c', '2026-01-03'),
        record('a', '2026-01-01'),
        record('b', '2026-01-02'),
      ],
      reachedDeletedCount: 0,
    });
    assert.deepEqual(split.outside, ['c']);
    assert.equal(split.over, 1);
    assert.equal(split.left, 0);
  });

  it('keeps a Reached record inside even when it got its phone last', () => {
    const split = splitByPackage({
      packageSize: 2,
      records: [
        record('a', '2026-01-01'),
        record('b', '2026-01-02'),
        record('c', '2026-01-03', true),
      ],
      reachedDeletedCount: 0,
    });
    assert.deepEqual(split.outside, ['b']);
  });

  it('counts deleted Reached records against the package', () => {
    const split = splitByPackage({
      packageSize: 3,
      records: [record('a', '2026-01-01'), record('b', '2026-01-02')],
      reachedDeletedCount: 2,
    });
    assert.deepEqual(split.outside, ['b']);
    assert.equal(split.used, 4);
    assert.equal(split.over, 1);
  });

  it('never pushes a Reached record outside, even past the package', () => {
    const split = splitByPackage({
      packageSize: 1,
      records: [record('a', '2026-01-01', true), record('b', '2026-01-02', true)],
      reachedDeletedCount: 0,
    });
    assert.deepEqual(split.outside, []);
    assert.equal(split.over, 1);
  });

  it('breaks a phone-date tie by id so the split is stable', () => {
    const split = splitByPackage({
      packageSize: 1,
      records: [record('b', '2026-01-01'), record('a', '2026-01-01')],
      reachedDeletedCount: 0,
    });
    assert.deepEqual(split.outside, ['b']);
  });

  it('puts every unreached record with a phone outside when there is no package', () => {
    const split = splitByPackage({
      packageSize: 0,
      records: [record('a', '2026-01-01'), record('b', '2026-01-02', true), noPhone('c')],
      reachedDeletedCount: 0,
    });
    assert.deepEqual(split.outside, ['a']);
  });

  describe('records with no phone (ADR 0033)', () => {
    const pad = (i: number) => String(i).padStart(3, '0');
    const withPhones = (count: number) =>
      Array.from({ length: count }, (_, i) => record(`p${pad(i)}`, `2026-02-01T00:00:00.${pad(i)}Z`));
    const withoutPhones = (count: number) =>
      Array.from({ length: count }, (_, i) => noPhone(`n${pad(i)}`));

    it('leaves them out of the count: 90 with a phone and 20 without fit a package of 100', () => {
      const split = splitByPackage({
        packageSize: 100,
        records: [...withPhones(90), ...withoutPhones(20)],
        reachedDeletedCount: 0,
      });
      assert.deepEqual(split.outside, []);
      assert.equal(split.used, 90);
      assert.equal(split.uncounted, 20);
      assert.equal(split.left, 10);
      assert.equal(split.over, 0);
    });

    it('never lets them hold a slot a guest with a phone needs', () => {
      // Whatever order they were added in, the 100 records with a phone all fit.
      const split = splitByPackage({
        packageSize: 100,
        records: [...withoutPhones(20), ...withPhones(100)],
        reachedDeletedCount: 0,
      });
      assert.deepEqual(split.outside, []);
      assert.equal(split.used, 100);
      assert.equal(split.uncounted, 20);
    });

    it('never tags them outside, even over the package', () => {
      const split = splitByPackage({
        packageSize: 1,
        records: [record('a', '2026-01-01'), record('b', '2026-01-02'), noPhone('c')],
        reachedDeletedCount: 0,
      });
      assert.deepEqual(split.outside, ['b']);
      assert.equal(split.uncounted, 1);
    });

    it('lines up an old record that just got a phone behind everyone who already had one', () => {
      // `old` was added first but only got its phone today, so it is the one left outside.
      const split = splitByPackage({
        packageSize: 2,
        records: [
          record('old', '2026-03-01'),
          record('a', '2026-01-02'),
          record('b', '2026-01-03'),
        ],
        reachedDeletedCount: 0,
      });
      assert.deepEqual(split.outside, ['old']);
    });

    it('keeps counting a Reached record that later lost its phone', () => {
      const split = splitByPackage({
        packageSize: 2,
        records: [noPhone('a', true), record('b', '2026-01-02'), record('c', '2026-01-03')],
        reachedDeletedCount: 0,
      });
      assert.deepEqual(split.outside, ['c']);
      assert.equal(split.used, 3);
      assert.equal(split.uncounted, 0);
    });
  });
});

describe('packageState', () => {
  it('reads the brief worked examples on a package of 210', () => {
    assert.equal(packageState(210, 187), 'room');
    assert.equal(packageState(210, 205), 'near');
    assert.equal(packageState(210, 210), 'full');
    assert.equal(packageState(210, 225), 'over');
  });

  it('turns near at exactly 90%', () => {
    assert.equal(packageState(100, 89), 'room');
    assert.equal(packageState(100, 90), 'near');
  });
});
