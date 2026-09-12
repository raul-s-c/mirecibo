import { Capacitor, registerPlugin } from '@capacitor/core';

type ConsentResult = { canRequestAds: boolean; privacyOptionsRequired: boolean; warning?: string };
type BannerResult = { shown: boolean; height?: number; warning?: string };
type AdsPlugin = {
  initialize(): Promise<ConsentResult>;
  showBanner(): Promise<BannerResult>;
  hideBanner(): Promise<void>;
  showPrivacyOptions(): Promise<{ shown: boolean }>;
};

const adsRuntime = globalThis as typeof globalThis & {
  __mireciboAdsPlugin?: AdsPlugin;
  __mireciboAdsConsent?: Promise<ConsentResult>;
};
const NativeAds = adsRuntime.__mireciboAdsPlugin ??= registerPlugin<AdsPlugin>('MiReciboAds');

export const isNativeAdsAvailable = () => Capacitor.isNativePlatform();
export const isAdLayoutDemo = () => import.meta.env.DEV && new URLSearchParams(location.search).get('ad-demo') === '1';

export function initializeAds() {
  if (!isNativeAdsAvailable()) return Promise.resolve({ canRequestAds: false, privacyOptionsRequired: false });
  return adsRuntime.__mireciboAdsConsent ??= NativeAds.initialize();
}

export async function showAdBanner() {
  const consent = await initializeAds();
  if (!consent.canRequestAds) return { shown: false } satisfies BannerResult;
  return NativeAds.showBanner();
}

export async function hideAdBanner() {
  if (isNativeAdsAvailable()) await NativeAds.hideBanner();
}

export async function openAdPrivacyOptions() {
  if (!isNativeAdsAvailable()) return { shown: false };
  await initializeAds();
  return NativeAds.showPrivacyOptions();
}
