import { BarChart3, Bell, Home, ListChecks, ReceiptText, Settings } from 'lucide-react';
import type { AppPage } from '../types';
import { IconButton } from './ui';

const nav: Array<{ page: AppPage; label: string; icon: typeof Home }> = [
  { page: 'home', label: 'Inicio', icon: Home },
  { page: 'list', label: 'Lista', icon: ListChecks },
  { page: 'tickets', label: 'Tickets', icon: ReceiptText },
  { page: 'analysis', label: 'Análisis', icon: BarChart3 },
  { page: 'settings', label: 'Más', icon: Settings }
];

export function AppHeader({ title, subtitle, page, onNavigate }: { title: string; subtitle?: string; page: AppPage; onNavigate: (page: AppPage) => void }) {
  return <header className="app-header"><div><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div><div className="app-header__actions"><IconButton label="Alertas" onClick={() => onNavigate('alerts')} className={page === 'alerts' ? 'active' : ''}><Bell size={22} /></IconButton><IconButton label="Ajustes" onClick={() => onNavigate('settings')} className={page === 'settings' ? 'active' : ''}><Settings size={22} /></IconButton></div></header>;
}

export function BottomNav({ page, onNavigate }: { page: AppPage; onNavigate: (page: AppPage) => void }) {
  return <nav className="bottom-nav" aria-label="Navegación principal">{nav.map(item => { const Icon = item.icon; return <button key={item.page} onClick={() => onNavigate(item.page)} className={page === item.page ? 'active' : ''}><Icon size={22} /><span>{item.label}</span></button>; })}</nav>;
}
