import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { hideAdBanner, isAdLayoutDemo, positionAdBanner, showAdBanner, subscribeToAdBannerSuppression } from '../services/ads';

function slotPosition(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const headerBottom = document.querySelector('.app-header')?.getBoundingClientRect().bottom ?? 0;
  const navigationTop = document.querySelector('.bottom-nav')?.getBoundingClientRect().top ?? innerHeight;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    visible: rect.top >= headerBottom && rect.bottom <= navigationTop && rect.bottom > 0 && rect.top < innerHeight
  };
}

export function AdBannerSlot() {
  const slotRef = useRef<HTMLElement>(null);
  const [height, setHeight] = useState(0);
  const demo = isAdLayoutDemo();

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    let active = true;
    let frame = 0;
    let loaded = false;
    let suppressed = false;

    const syncPosition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!active || !slotRef.current || demo || !loaded || suppressed) return;
        const position = slotPosition(slotRef.current);
        if (position.visible) void positionAdBanner(position);
        else void hideAdBanner();
      });
    };

    if (demo) {
      setHeight(50);
    } else {
      void showAdBanner(slotPosition(slot)).then(result => {
        if (!active || !result.shown) return;
        loaded = true;
        setHeight(result.height ?? 50);
        syncPosition();
      }).catch(() => active && setHeight(0));
    }

    const observer = new ResizeObserver(syncPosition);
    observer.observe(slot);
    const unsubscribe = subscribeToAdBannerSuppression(next => {
      suppressed = next;
      if (next) void hideAdBanner();
      else syncPosition();
    });
    addEventListener('scroll', syncPosition, { passive: true });
    addEventListener('resize', syncPosition, { passive: true });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      unsubscribe();
      removeEventListener('scroll', syncPosition);
      removeEventListener('resize', syncPosition);
      void hideAdBanner();
    };
  }, [demo]);

  return <aside ref={slotRef} className={`ad-inline-slot ${height ? 'ad-inline-slot--active' : ''}`} style={{ '--ad-slot-height': `${height}px` } as CSSProperties} aria-label="Publicidad">
    {demo ? <div><span>Publicidad</span><b>Espacio de anuncio adaptativo</b></div> : null}
  </aside>;
}
