import { useEffect, useState } from 'react';
import { hideAdBanner, isAdLayoutDemo, showAdBanner } from '../services/ads';

export function AdBannerManager({ visible }: { visible: boolean }) {
  const [shown, setShown] = useState(false);
  const demo = isAdLayoutDemo();

  useEffect(() => {
    let current = true;
    if (!visible) {
      setShown(false);
      void hideAdBanner();
      return () => { current = false; };
    }
    if (demo) {
      setShown(true);
      return () => { current = false; };
    }
    void showAdBanner().then(result => {
      if (!current) return;
      setShown(result.shown);
      if (result.shown) document.documentElement.style.setProperty('--ad-banner-height', `${result.height ?? 50}px`);
    }).catch(() => current && setShown(false));
    return () => { current = false; };
  }, [demo, visible]);

  useEffect(() => {
    document.documentElement.classList.toggle('native-ad-visible', shown);
    return () => document.documentElement.classList.remove('native-ad-visible');
  }, [shown]);

  return demo && visible ? <aside className="ad-demo-banner" aria-label="Publicidad de prueba"><span>Publicidad</span><b>Espacio de anuncio adaptativo</b></aside> : null;
}
