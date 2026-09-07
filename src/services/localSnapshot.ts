import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import type { AppState } from '../types';

export const SNAPSHOT_FORMAT = 'mirecibo-local-snapshot';
const RECOVERY_KEY = 'mirecibo-recovery-snapshot-v1';

interface LocalSnapshot { format: typeof SNAPSHOT_FORMAT; version: 1; appVersion: string; exportedAt: string; summary: { items: number; receipts: number; refuels: number; vehicles: number; categories: number; recurringExpenses: number }; state: AppState }

function validState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<AppState>;
  return Array.isArray(state.items) && Array.isArray(state.receipts) && Array.isArray(state.refuels) && Array.isArray(state.vehicles) && Array.isArray(state.alerts) && typeof state.postalCode === 'string';
}

export function createSnapshot(state: AppState, appVersion: string, exportedAt = new Date().toISOString()) {
  const snapshot: LocalSnapshot = { format: SNAPSHOT_FORMAT, version: 1, appVersion, exportedAt, summary: { items: state.items.length, receipts: state.receipts.length, refuels: state.refuels.length, vehicles: state.vehicles.length, categories: state.categories.length, recurringExpenses: state.recurringExpenses.length }, state };
  return JSON.stringify(snapshot, null, 2);
}

export function parseSnapshot(raw: string): { state: AppState; exportedAt?: string; appVersion?: string } {
  const parsed = JSON.parse(raw) as Partial<LocalSnapshot> & { state?: unknown };
  const state = parsed.state ?? parsed;
  if (!validState(state)) throw new Error('El archivo no contiene un snapshot válido de MiRecibo.');
  return { state, exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined, appVersion: typeof parsed.appVersion === 'string' ? parsed.appVersion : undefined };
}

export async function exportSnapshot(state: AppState, appVersion: string) {
  const payload = createSnapshot(state, appVersion);
  const fileName = `MiRecibo-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
  if (Capacitor.isNativePlatform()) {
    const result = await Filesystem.writeFile({ path: fileName, data: payload, directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true });
    await Share.share({ title: 'Snapshot local de MiRecibo', text: 'Guarda esta copia para restaurarla después de actualizar.', url: result.uri, dialogTitle: 'Guardar snapshot' });
  } else {
    const file = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(file); const link = document.createElement('a'); link.href = url; link.download = fileName; link.click(); URL.revokeObjectURL(url);
  }
  return fileName;
}

export async function saveRecoverySnapshot(state: AppState, appVersion: string) {
  const value = createSnapshot(state, appVersion);
  localStorage.setItem(RECOVERY_KEY, value);
  await Preferences.set({ key: RECOVERY_KEY, value });
}

export async function loadRecoverySnapshot() {
  const local = localStorage.getItem(RECOVERY_KEY);
  const raw = local ?? (await Preferences.get({ key: RECOVERY_KEY })).value;
  return raw ? parseSnapshot(raw).state : null;
}

export async function hasRecoverySnapshot() {
  if (localStorage.getItem(RECOVERY_KEY)) return true;
  return Boolean((await Preferences.get({ key: RECOVERY_KEY })).value);
}

export async function clearRecoverySnapshot() {
  localStorage.removeItem(RECOVERY_KEY);
  await Preferences.remove({ key: RECOVERY_KEY });
}
