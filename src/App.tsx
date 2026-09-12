import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AddFlow, type AddFlowName } from './components/AddFlow';
import { AdBannerManager } from './components/AdBannerManager';
import { AppHeader, BottomNav } from './components/AppShell';
import { AnalysisScreen } from './screens/AnalysisScreen';
import { FuelScreen } from './screens/FuelScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ListScreen } from './screens/ListScreen';
import { PantryScreen } from './screens/PantryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TicketsScreen } from './screens/TicketsScreen';
import type { AppPage } from './types';

const meta: Record<AppPage, { title: string; subtitle?: string }> = {
  home: { title: 'MiRecibo', subtitle: 'Tu compra, bien entendida' },
  list: { title: 'Mi lista', subtitle: 'Lo que necesitas comprar' },
  tickets: { title: 'Tickets', subtitle: 'Tus compras reales' },
  fuel: { title: 'Combustible', subtitle: 'Repostajes y consumo' },
  analysis: { title: 'Análisis', subtitle: 'Resumen de tus compras' },
  pantry: { title: 'Despensa y menús', subtitle: 'Aprovecha lo que ya tienes' },
  settings: { title: 'Ajustes', subtitle: 'Privacidad y datos' }
};

export function App() {
  const [page, setPage] = useState<AppPage>('home');
  const [addOpen, setAddOpen] = useState(false);
  const [addInitial, setAddInitial] = useState<AddFlowName>('menu');
  const openAdd = (flow: AddFlowName = 'menu') => { setAddInitial(flow); setAddOpen(true); };
  const screen = useMemo(() => {
    if (page === 'home') return <HomeScreen onNavigate={setPage} onAdd={() => openAdd()} onScan={() => openAdd('ticket')} />;
    if (page === 'list') return <ListScreen onAdd={() => openAdd('products')} onGenerate={() => openAdd('generate-list')} onPantry={() => setPage('pantry')} />;
    if (page === 'tickets') return <TicketsScreen onScan={() => openAdd('ticket')} onManual={() => openAdd('manual-ticket')} />;
    if (page === 'fuel') return <FuelScreen onAdd={() => openAdd('fuel')} />;
    if (page === 'analysis') return <AnalysisScreen />;
    if (page === 'pantry') return <PantryScreen />;
    return <SettingsScreen />;
  }, [page]);

  const adVisible = !addOpen && (page === 'home' || page === 'tickets' || page === 'analysis');
  return <div className="app-shell">
    <AppHeader {...meta[page]} page={page} onNavigate={setPage} />
    <main>{screen}</main>
    {page !== 'home' && page !== 'analysis' && page !== 'pantry' && page !== 'settings' ? <button className="fab" aria-label="Añadir" onClick={() => openAdd(page === 'tickets' ? 'ticket' : page === 'fuel' ? 'fuel' : 'products')}><Plus /></button> : null}
    <BottomNav page={page} onNavigate={setPage} />
    <AddFlow key={`${addOpen}-${addInitial}`} open={addOpen} initial={addInitial} onClose={() => setAddOpen(false)} />
    <AdBannerManager visible={adVisible} />
  </div>;
}
