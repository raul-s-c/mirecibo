import { Capacitor, registerPlugin } from '@capacitor/core';

type ConsentResult = { canRequestAds: boolean; privacyOptionsRequired: boolean; warning?: string };
type BannerResult = { shown: boolean; height?: number; warning?: string };
type BannerPosition = { top: number; left: number; width: number; visible?: boolean };
type AdsPlugin = {
  initialize(): Promise<ConsentResult>;
  showBanner(options: BannerPosition): Promise<BannerResult>;
  positionBanner(options: BannerPosition): Promise<void>;
  hideBanner(): Promise<void>;
  showPrivacyOptions(): Promise<{ shown: boolean }>;
};

const adsRuntime = globalThis as typeof globalThis & {
  __mireciboAdsPlugin?: AdsPlugin;
  __mireciboAdsConsent?: Promise<ConsentResult>;
};
const NativeAds = adsRuntime.__mireciboAdsPlugin ??= registerPlugin<AdsPlugin>('MiReciboAds');
let bannerSuppressed = false;
const suppressionListeners = new Set<(suppressed: boolean) => void>();

export const isNativeAdsAvailable = () => Capacitor.isNativePlatform();
export const isAdLayoutDemo = () => import.meta.env.DEV && new URLSearchParams(location.search).get('ad-demo') === '1';

export function setAdBannerSuppressed(suppressed: boolean) {
  bannerSuppressed = suppressed;
  suppressionListeners.forEach(listener => listener(suppressed));
}

export function subscribeToAdBannerSuppression(listener: (suppressed: boolean) => void) {
  suppressionListeners.add(listener);
  listener(bannerSuppressed);
  return () => suppressionListeners.delete(listener);
}

export function initializeAds() {
  if (!isNativeAdsAvailable()) return Promise.resolve({ canRequestAds: false, privacyOptionsRequired: false });
  return adsRuntime.__mireciboAdsConsent ??= NativeAds.initialize();
}

export async function showAdBanner(position: BannerPosition) {
  const consent = await initializeAds();
  if (!consent.canRequestAds) return { shown: false } satisfies BannerResult;
  return NativeAds.showBanner(position);
}

export async function positionAdBanner(position: BannerPosition) {
  if (isNativeAdsAvailable()) await NativeAds.positionBanner(position);
}

export async function hideAdBanner() {
  if (isNativeAdsAvailable()) await NativeAds.hideBanner();
}

export async function openAdPrivacyOptions() {
  if (!isNativeAdsAvailable()) return { shown: false };
  await initializeAds();
  return NativeAds.showPrivacyOptions();
}
