import { Capacitor, registerPlugin } from '@capacitor/core';

export const CURRENT_VERSION = '0.9.0';
const RELEASE_API = 'https://api.github.com/repos/raul-s-c/mirecibo/releases/latest';
const NativeUpdater = registerPlugin<{ installApk(options: { url: string; fileName: string }): Promise<{ permissionRequired?: boolean }> }>('MiReciboUpdater');

export interface AppRelease { version: string; notes: string; downloadUrl: string; fileName: string }

export function compareVersions(left: string, right: string) {
  const parts = (value: string) => value.replace(/^v/i, '').split('.').map(part => Number.parseInt(part, 10) || 0);
  const a = parts(left); const b = parts(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) > (b[index] ?? 0) ? 1 : -1;
  }
  return 0;
}

export async function latestRelease(): Promise<AppRelease> {
  const response = await fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok) throw new Error(response.status === 404 ? 'Todavía no hay una versión publicada.' : 'No se pudo consultar la actualización.');
  const data = await response.json() as { tag_name?: string; body?: string; assets?: Array<{ name?: string; browser_download_url?: string }> };
  const asset = data.assets?.find(value => value.name?.toLowerCase().endsWith('.apk') && value.browser_download_url);
  if (!data.tag_name || !asset?.browser_download_url || !asset.name) throw new Error('La versión publicada no contiene una APK instalable.');
  return { version: data.tag_name.replace(/^v/i, ''), notes: data.body?.trim() || 'Mejoras y correcciones de MiRecibo.', downloadUrl: asset.browser_download_url, fileName: asset.name };
}

export async function installRelease(release: AppRelease) {
  if (!Capacitor.isNativePlatform()) throw new Error('La instalación integrada solo está disponible en Android.');
  return NativeUpdater.installApk({ url: release.downloadUrl, fileName: release.fileName });
}
