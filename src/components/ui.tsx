import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Button({ className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  return <button className={`button button--${variant} ${className}`} {...props} />;
}

export function IconButton({ label, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button className={`icon-button ${className}`} aria-label={label} title={label} {...props}>{children}</button>;
}

export function Sheet({ open, title, onClose, children, wide = false }: { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} className={`sheet ${wide ? 'sheet--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet__handle" />
        <header className="sheet__header"><h2 id={titleId}>{title}</h2><IconButton label="Cerrar" onClick={onClose}><X size={22} /></IconButton></header>
        <div className="sheet__body">{children}</div>
      </section>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string; count?: number }>; onChange: (value: T) => void }) {
  return <div className="segmented" role="tablist">{options.map(option => <button key={option.value} className={value === option.value ? 'active' : ''} onClick={() => onChange(option.value)} role="tab" aria-selected={value === option.value}>{option.label}{option.count === undefined ? '' : ` ${option.count}`}</button>)}</div>;
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return <div className="empty"><div className="empty__icon">{icon}</div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}

export function Progress({ value }: { value: number }) {
  return <div className="progress" aria-label={`Progreso ${Math.round(value * 100)} %`}><i style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} /></div>;
}
