import { ArrowRight, CalendarClock, CalendarDays, ChefHat, ChevronLeft, ChevronRight, Fuel, ListChecks, ReceiptText, ScanLine, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '../store/StoreProvider';
import type { AppPage } from '../types';
import { money, shortDate } from '../utils/format';
import { Button, EmptyState, Segmented } from '../components/ui';
import { expenseSummary, type ExpensePeriod } from '../utils/expensePeriod';
import { monthKey, monthLabel, moveMonth } from '../utils/monthPeriod';
import { dueReminderExpenses } from '../services/recurringExpenses';
import { AdBannerSlot } from '../components/AdBannerSlot';

export function HomeScreen({ onNavigate, onAdd, onScan }: { onNavigate: (page: AppPage) => void; onAdd: () => void; onScan: () => void }) {
  const { state } = useStore();
  const currentMonth = monthKey();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [period, setPeriod] = useState<ExpensePeriod>('month');
  const currentYear = Number(currentMonth.slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const summary = useMemo(() => expenseSummary(state, period, selectedMonth, year), [state.receipts, state.refuels, period, selectedMonth, year]);
  const recent = useMemo(() => [...state.receipts].sort((a, b) => `${b.date}${b.time ?? ''}`.localeCompare(`${a.date}${a.time ?? ''}`)).slice(0, 4), [state.receipts]);
  const pending = state.items.filter(item => !item.completed).length;
  const recurringDue = dueReminderExpenses(state);
  return <div className="screen home-screen">
    <Segmented value={period} onChange={setPeriod} options={[{ value: 'month', label: 'Mes' }, { value: 'year', label: 'Año' }, { value: 'all', label: 'Desde el inicio' }]} />
    {period === 'month' ? <div className="month-selector">
      <button aria-label="Mes anterior" onClick={() => setSelectedMonth(value => moveMonth(value, -1))}><ChevronLeft /><span>Anterior</span></button>
      <label><CalendarDays /><span>{monthLabel(selectedMonth)}</span><input aria-label="Elegir mes" type="month" max={currentMonth} value={selectedMonth} onChange={event => event.target.value && setSelectedMonth(event.target.value)} /></label>
      <button aria-label="Mes siguiente" disabled={selectedMonth >= currentMonth} onClick={() => setSelectedMonth(value => moveMonth(value, 1))}><span>Siguiente</span><ChevronRight /></button>
    </div> : period === 'year' ? <div className="month-selector">
      <button aria-label="Año anterior" onClick={() => setYear(value => value - 1)}><ChevronLeft /><span>Anterior</span></button>
      <span className="year-label"><CalendarDays /> {year}</span>
      <button aria-label="Año siguiente" disabled={year >= currentYear} onClick={() => setYear(value => value + 1)}><span>Siguiente</span><ChevronRight /></button>
    </div> : <p className="period-note">Acumulado de todos tus tickets y repostajes guardados.</p>}
    <section className="hero-summary">
      <div><span>{period === 'all' ? 'Desde el inicio' : period === 'year' ? `Año ${year}` : selectedMonth === currentMonth ? 'Este mes' : monthLabel(selectedMonth)}</span><strong>{money(summary.total)}</strong><small><CalendarDays size={14} /> {summary.receipts.length} tickets · {summary.refuels.length} repostajes</small><small>Compras: {money(summary.shopping)} · Combustible: {money(summary.fuel)}</small></div>
      <span className="hero-trust"><ShieldCheck /><small>Datos<br />locales</small></span>
    </section>
    <AdBannerSlot />
    <div className="quick-grid">
      <button onClick={() => onNavigate('list')}><span className="quick-icon green"><ListChecks /></span><span><b>Mi lista</b><small>{pending ? `${pending} pendientes` : 'Todo comprado'}</small></span><ArrowRight /></button>
      <button onClick={() => onNavigate('fuel')}><span className="quick-icon orange"><Fuel /></span><span><b>Combustible</b><small>{state.refuels.length} repostajes</small></span><ArrowRight /></button>
    </div>
    <Button className="button--wide add-main" onClick={onScan}><ScanLine size={20} /> Escanear ticket</Button>
    <button className="secondary-add" onClick={onAdd}>Añadir productos o repostaje</button>
    {recurringDue.length ? <button className="recurring-home-alert" onClick={() => onNavigate('settings')}><CalendarClock /><span><b>{recurringDue.length} {recurringDue.length === 1 ? 'gasto periódico pendiente' : 'gastos periódicos pendientes'}</b><small>Revísalos antes de añadirlos a tus gastos.</small></span><ArrowRight /></button> : null}
    <section className="section-block"><div className="section-heading"><h2>Actividad reciente</h2>{recent.length ? <button onClick={() => onNavigate('tickets')}>Ver todo</button> : null}</div>
      {!recent.length ? <EmptyState icon={<ScanLine />} title="Empieza con tu primer ticket" text="Haz una foto y verificaremos productos, precios y total antes de guardarlo." action={<Button onClick={onScan}>Escanear el primero</Button>} /> : <div className="activity-list">
        {recent.map(receipt => <button key={receipt.id} onClick={() => onNavigate('tickets')}><span className="round-icon"><ReceiptText /></span><span><b>{receipt.store}</b><small>{shortDate(receipt.date)} · {receipt.lines.length} productos</small></span><strong>{money(receipt.total)}</strong><ArrowRight /></button>)}
      </div>}
    </section>
    <button className="saving-tip meal-home-entry" onClick={() => onNavigate('pantry')}><span><ChefHat /></span><div><b>Planifica con tu despensa</b><small>Crea recetas o una semana completa aprovechando lo que ya tienes.</small></div><strong>{state.pantryItems.length ? `${state.pantryItems.length} productos` : 'Empezar'}</strong><ArrowRight /></button>
  </div>;
}
