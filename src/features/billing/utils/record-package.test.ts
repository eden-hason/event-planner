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

const record = (id: string, createdAt: string, reached = false) => ({ id, createdAt, reached });

describe('splitByPackage', () => {
  it('puts everyone inside while the list fits', () => {
    const split = splitByPackage({
      packageSize: 3,
      records: [record('a', '2026-01-01'), record('b', '2026-01-02')],
      reachedDeletedCount: 0,
    });
    assert.deepEqual(split.outside, []);
    assert.equal(split.used, 2);
    assert.equal(split.left, 1);
    assert.equal(split.over, 0);
  });

  it('leaves the newest unreached records outside', () => {
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

  it('keeps a Reached record inside even when it was added last', () => {
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

  it('breaks a created-at tie by id so the split is stable', () => {
    const split = splitByPackage({
      packageSize: 1,
      records: [record('b', '2026-01-01'), record('a', '2026-01-01')],
      reachedDeletedCount: 0,
    });
    assert.deepEqual(split.outside, ['b']);
  });

  it('puts every unreached record outside when there is no package', () => {
    const split = splitByPackage({
      packageSize: 0,
      records: [record('a', '2026-01-01'), record('b', '2026-01-02', true)],
      reachedDeletedCount: 0,
    });
    assert.deepEqual(split.outside, ['a']);
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
