import { ArrowDownRight, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Fuel, ListChecks, ReceiptText, ScanLine, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '../store/StoreProvider';
import type { AppPage } from '../types';
import { money, shortDate } from '../utils/format';
import { Button, EmptyState, Segmented } from '../components/ui';
import { expenseSummary, type ExpensePeriod } from '../utils/expensePeriod';
import { monthKey, monthLabel, moveMonth } from '../utils/monthPeriod';

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
  const priceSavings = useMemo(() => {
    const last = new Map<string, number>();
    let saving = 0;
    [...state.receipts].reverse().forEach(receipt => receipt.lines.forEach(line => {
      if (line.lineType && line.lineType !== 'product') return;
      const key = line.name.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      const current = line.unitPrice || line.total / Math.max(line.quantity, 1);
      const previous = last.get(key);
      if (previous !== undefined && current < previous) saving += (previous - current) * Math.max(line.quantity, 1);
      last.set(key, current);
    }));
    return saving;
  }, [state.receipts]);
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
    <div className="quick-grid">
      <button onClick={() => onNavigate('list')}><span className="quick-icon green"><ListChecks /></span><span><b>Mi lista</b><small>{pending ? `${pending} pendientes` : 'Todo comprado'}</small></span><ArrowRight /></button>
      <button onClick={() => onNavigate('fuel')}><span className="quick-icon orange"><Fuel /></span><span><b>Combustible</b><small>{state.refuels.length} repostajes</small></span><ArrowRight /></button>
    </div>
    <Button className="button--wide add-main" onClick={onScan}><ScanLine size={20} /> Escanear ticket</Button>
    <button className="secondary-add" onClick={onAdd}>Añadir productos o repostaje</button>
    <section className="section-block"><div className="section-heading"><h2>Actividad reciente</h2>{recent.length ? <button onClick={() => onNavigate('tickets')}>Ver todo</button> : null}</div>
      {!recent.length ? <EmptyState icon={<ScanLine />} title="Empieza con tu primer ticket" text="Haz una foto y verificaremos productos, precios y total antes de guardarlo." action={<Button onClick={onScan}>Escanear el primero</Button>} /> : <div className="activity-list">
        {recent.map(receipt => <button key={receipt.id} onClick={() => onNavigate('tickets')}><span className="round-icon"><ReceiptText /></span><span><b>{receipt.store}</b><small>{shortDate(receipt.date)} · {receipt.lines.length} productos</small></span><strong>{money(receipt.total)}</strong><ArrowRight /></button>)}
      </div>}
    </section>
    <button className="saving-tip" onClick={() => onNavigate('alerts')}><span><ArrowDownRight /></span><div><b>Comparar cesta en el mapa</b><small>{priceSavings > 0 ? 'Mira dónde comprar tu lista y cuánto puedes ahorrar.' : 'Calcula tu lista en los supermercados cercanos.'}</small></div><strong>{priceSavings > 0 ? money(priceSavings) : 'Abrir mapa'}</strong><ArrowRight /></button>
  </div>;
}
