// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { initialState } from '../data/seed';
import { clearRecoverySnapshot, createSnapshot, hasRecoverySnapshot, loadRecoverySnapshot, parseSnapshot, saveRecoverySnapshot, SNAPSHOT_FORMAT } from './localSnapshot';

describe('local snapshots', () => {
  it('round-trips every local data collection', () => {
    const raw = createSnapshot(initialState, '0.9.2', '2026-09-07T10:00:00.000Z');
    const decoded = JSON.parse(raw);
    expect(decoded).toMatchObject({ format: SNAPSHOT_FORMAT, version: 1, appVersion: '0.9.2', summary: { items: 0, receipts: 0, refuels: 0 } });
    expect(parseSnapshot(raw).state).toEqual(initialState);
  });
  it('accepts previous exports that wrapped state', () => expect(parseSnapshot(JSON.stringify({ version: 2, state: initialState })).state).toEqual(initialState));
  it('rejects incomplete or unrelated JSON', () => expect(() => parseSnapshot('{"hello":"world"}')).toThrow('snapshot válido'));
  it('keeps and clears the automatic pre-import recovery copy', async () => {
    await saveRecoverySnapshot(initialState, '0.9.2');
    expect(await hasRecoverySnapshot()).toBe(true);
    expect(await loadRecoverySnapshot()).toEqual(initialState);
    await clearRecoverySnapshot();
    expect(await hasRecoverySnapshot()).toBe(false);
  });
});
