import { BarChart3, ChevronRight, Fuel, ReceiptText, ShoppingBag, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState, Sheet } from '../components/ui';
import { availableExpenseMonths, buildAnalyticsData, type ExpenseCategory, type ExpenseKind, type ExpenseLine } from '../services/analytics';
import { useStore } from '../store/StoreProvider';
import { money, percent, shortDate } from '../utils/format';
import { monthLabel } from '../utils/monthPeriod';

const COLORS: Record<ExpenseCategory, string> = { Alimentación: '#079455', Hogar: '#2e90fa', Higiene: '#7f56d9', Mascotas: '#f79009', Otros: '#667085', Combustible: '#e66b19' };
type Drilldown = { type: 'all' | 'category' | 'store' | 'month' | 'product'; key: string; title: string };

function AnalyticsDetailSheet({ selection, lines, onClose }: { selection: Drilldown | null; lines: ExpenseLine[]; onClose: () => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, ExpenseLine[]>();
    lines.forEach(line => map.set(`${line.sourceType}:${line.sourceId}`, [...(map.get(`${line.sourceType}:${line.sourceId}`) ?? []), line]));
    return [...map.values()].sort((a, b) => b[0].date.localeCompare(a[0].date));
  }, [lines]);
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  return <Sheet open={Boolean(selection)} title={selection?.title ?? 'Detalle'} onClose={onClose}>
    <div className="analytics-detail-summary"><span>{lines.length} conceptos · {groups.length} documentos</span><strong>{money(total)}</strong></div>
    <div className="analytics-documents">{groups.map(group => {
      const first = group[0];
      const subtotal = group.reduce((sum, line) => sum + line.amount, 0);
      return <section key={`${first.sourceType}:${first.sourceId}`} className="analytics-document">
        <header><span className={`store-mark ${first.sourceType === 'refuel' ? 'orange' : ''}`}>{first.sourceType === 'refuel' ? <Fuel size={18} /> : first.merchant.slice(0, 1)}</span><span><b>{first.merchant}</b><small>{shortDate(first.date)} · {first.sourceType === 'refuel' ? 'Repostaje' : 'Ticket'}</small></span><strong>{money(subtotal)}</strong></header>
        <div>{group.map(line => <div className="analytics-line" key={line.id}><span><b>{line.name}</b><small>{line.category}</small></span><span><small>{line.quantity.toLocaleString('es-ES', { maximumFractionDigits: 3 })} {line.unit}</small><small>{money(line.unitPrice)}/{line.unit}</small></span><strong>{money(line.amount)}</strong></div>)}</div>
      </section>;
    })}</div>
  </Sheet>;
}

export function AnalysisScreen() {
  const { state } = useStore();
  const [month, setMonth] = useState('all');
  const [kind, setKind] = useState<ExpenseKind>('all');
  const [selection, setSelection] = useState<Drilldown | null>(null);
  const months = useMemo(() => availableExpenseMonths(state), [state]);
  const data = useMemo(() => buildAnalyticsData(state, month, kind), [kind, month, state]);
  const selectedLines = useMemo(() => {
    if (!selection || selection.type === 'all') return data.lines;
    if (selection.type === 'category') return data.lines.filter(line => line.category === selection.key);
    if (selection.type === 'store') return data.lines.filter(line => line.merchant === selection.key);
    if (selection.type === 'month') return data.lines.filter(line => line.date.slice(0, 7) === selection.key);
    return data.lines.filter(line => line.name === selection.key);
  }, [data.lines, selection]);

  if (!state.receipts.length && !state.refuels.length) return <div className="screen"><EmptyState icon={<BarChart3 />} title="Tus análisis aparecerán aquí" text="Con cada ticket o repostaje construiremos el gasto por categoría, establecimiento y mes." /></div>;
  const chartTotal = data.category.reduce((sum, [, value]) => sum + value, 0);
  const gradient = chartTotal && data.category.length ? `conic-gradient(${data.category.map(([name, value], index) => { const before = data.category.slice(0, index).reduce((sum, item) => sum + item[1], 0) / chartTotal * 100; const after = before + value / chartTotal * 100; return `${COLORS[name]} ${before}% ${after}%`; }).join(',')})` : '#eef2f6';
  const maxMonth = Math.max(...data.months.map(item => item[1]), 1);
  const open = (type: Drilldown['type'], key: string, title: string) => setSelection({ type, key, title });

  return <div className="screen analysis-screen">
    <div className="analysis-filters">
      <label><span>Periodo</span><select aria-label="Periodo del análisis" value={month} onChange={event => { setMonth(event.target.value); setSelection(null); }}><option value="all">Todo el historial</option>{months.map(value => <option value={value} key={value}>{monthLabel(value)}</option>)}</select></label>
      <label><span>Tipo de gasto</span><select aria-label="Tipo de gasto" value={kind} onChange={event => { setKind(event.target.value as ExpenseKind); setSelection(null); }}><option value="all">Compras y combustible</option><option value="shopping">Solo compras</option><option value="fuel">Solo combustible</option></select></label>
    </div>
    <div className="kpi-grid"><div><span className="kpi-icon green"><WalletCards /></span><small>Gasto total</small><strong>{money(data.total)}</strong></div><div><span className="kpi-icon blue"><ReceiptText /></span><small>Documentos</small><strong>{data.documentCount}</strong></div><div><span className="kpi-icon purple"><ShoppingBag /></span><small>Conceptos</small><strong>{data.conceptCount.toLocaleString('es-ES')}</strong></div><div><span className="kpi-icon orange"><BarChart3 /></span><small>Gasto medio</small><strong>{money(data.documentCount ? data.total / data.documentCount : 0)}</strong></div></div>
    {data.total ? <>
      <section className="analysis-panel"><div className="analysis-panel-title"><h2>Gasto por categoría</h2><small>Toca para ver los productos</small></div><div className="donut-wrap"><button className="donut" aria-label="Ver todos los gastos" onClick={() => open('all', '', 'Todos los gastos')} style={{ background: gradient }}><span><b>{money(data.total)}</b><small>Total</small></span></button><div className="legend">{data.category.map(([name, value]) => <button key={name} onClick={() => open('category', name, name)}><i style={{ background: COLORS[name] }} /><span>{name}</span><b>{money(value)}</b><small>{percent(value / data.total)}</small><ChevronRight size={15} /></button>)}</div></div></section>
      <section className="analysis-panel"><div className="analysis-panel-title"><h2>Gasto por establecimiento</h2><small>Toca para abrir sus facturas</small></div><div className="bar-list">{data.stores.map(([name, value]) => <button key={name} onClick={() => open('store', name, name)}><span>{name}</span><div><i style={{ width: `${value / data.stores[0][1] * 100}%` }} /></div><b>{money(value)}</b><small>{percent(value / data.total)}</small><ChevronRight size={15} /></button>)}</div></section>
      <div className="analysis-split">
        <section className="analysis-panel"><div className="analysis-panel-title"><h2>Evolución del gasto</h2><small>Toca un mes</small></div><div className="month-chart">{data.months.slice(-6).map(([valueMonth, value]) => <button key={valueMonth} onClick={() => open('month', valueMonth, monthLabel(valueMonth))}><span>{money(value)}</span><i style={{ height: `${Math.max(12, value / maxMonth * 100)}%` }} /><small>{new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(`${valueMonth}-01T12:00:00`))}</small></button>)}</div></section>
        <section className="analysis-panel"><div className="analysis-panel-title"><h2>Conceptos con mayor gasto</h2><small>Toca para ver el detalle</small></div><div className="top-products">{data.products.slice(0, 5).map(([name, value], index) => <button key={name} onClick={() => open('product', name, name)}><span>{index + 1}</span><b>{name}</b><strong>{money(value)}</strong><small>{percent(value / data.total)}</small><ChevronRight size={15} /></button>)}</div></section>
      </div>
      <div className="saving-tip static"><span><BarChart3 /></span><div><b>Datos que se pueden comprobar</b><small>Cada importe abre los productos y facturas que lo componen.</small></div></div>
    </> : <EmptyState icon={<BarChart3 />} title="Sin gastos en este filtro" text="Prueba otro mes o incluye compras y combustible." />}
    <AnalyticsDetailSheet selection={selection} lines={selectedLines} onClose={() => setSelection(null)} />
  </div>;
}
