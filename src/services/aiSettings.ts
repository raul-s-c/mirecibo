import { Preferences } from '@capacitor/preferences';

const SETTINGS_KEY = 'mirecibo-ai-settings-v1';
const INSTALL_ID_KEY = 'mirecibo-install-id-v1';
const embeddedSettings = {
  endpoint: 'https://mirecibo-ai.raul-nihongo.workers.dev',
  accessToken: import.meta.env.VITE_MIRECIBO_ACCESS_TOKEN?.trim() ?? ''
};
export const isAiPreconfigured = true;

export interface AiSettings {
  endpoint: string;
  accessToken: string;
}

const withEmbeddedDefaults = (settings?: Partial<AiSettings> | null): AiSettings => ({
  endpoint: settings?.endpoint?.trim() || embeddedSettings.endpoint,
  accessToken: settings?.accessToken?.trim() || embeddedSettings.accessToken
});

export function loadAiSettings(): AiSettings {
  if (isAiPreconfigured) return embeddedSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return withEmbeddedDefaults(raw ? JSON.parse(raw) : null);
  } catch {
    return withEmbeddedDefaults();
  }
}

export async function hydrateAiSettings(): Promise<AiSettings> {
  if (isAiPreconfigured) return embeddedSettings;
  const local = loadAiSettings();
  if (local.endpoint && local.accessToken) return local;
  const stored = await Preferences.get({ key: SETTINGS_KEY });
  if (!stored.value) return local;
  const settings = withEmbeddedDefaults(JSON.parse(stored.value));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}

export async function saveAiSettings(settings: AiSettings) {
  if (isAiPreconfigured) return;
  const normalized = {
    endpoint: settings.endpoint.trim().replace(/\/$/, ''),
    accessToken: settings.accessToken.trim()
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  await Preferences.set({ key: SETTINGS_KEY, value: JSON.stringify(normalized) });
}

async function installId() {
  const local = localStorage.getItem(INSTALL_ID_KEY);
  if (local) return local;
  const stored = await Preferences.get({ key: INSTALL_ID_KEY });
  if (stored.value) {
    localStorage.setItem(INSTALL_ID_KEY, stored.value);
    return stored.value;
  }
  const value = crypto.randomUUID();
  localStorage.setItem(INSTALL_ID_KEY, value);
  await Preferences.set({ key: INSTALL_ID_KEY, value });
  return value;
}

export async function aiRequestHeaders(settings: AiSettings): Promise<Record<string, string>> {
  if (settings.accessToken) return { Authorization: `Bearer ${settings.accessToken}` };
  return { 'X-Install-Id': await installId() };
}
