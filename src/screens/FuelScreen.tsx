import { Fuel, Gauge, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '../store/StoreProvider';
import { Button, EmptyState, Sheet } from '../components/ui';
import type { Refuel } from '../types';
import { money, shortDate } from '../utils/format';
import { monthLabel } from '../utils/monthPeriod';

export function FuelScreen({ onAdd }: { onAdd: () => void }) {
  const { state, deleteRefuel } = useStore();
  const [month, setMonth] = useState('all');
  const [vehicleId, setVehicleId] = useState('all');
  const [selected, setSelected] = useState<Refuel | null>(null);
  const months = useMemo(() => [...new Set(state.refuels.map(value => value.date.slice(0, 7)))].sort((a, b) => b.localeCompare(a)), [state.refuels]);
  const refuels = useMemo(() => state.refuels.filter(refuel => (month === 'all' || refuel.date.startsWith(month)) && (vehicleId === 'all' || refuel.vehicleId === vehicleId)), [month, state.refuels, vehicleId]);
  const total = refuels.reduce((sum, refuel) => sum + refuel.total, 0);
  const liters = refuels.reduce((sum, refuel) => sum + refuel.liters, 0);
  const selectedVehicle = selected ? state.vehicles.find(value => value.id === selected.vehicleId) : null;
  return <div className="screen fuel-screen">
    <section className="metric-banner fuel-banner"><span>Combustible en el periodo</span><strong>{money(total)}</strong><small>{refuels.length} repostajes · {liters.toLocaleString('es-ES', { maximumFractionDigits: 1 })} L</small></section>
    <div className="fuel-filters"><label><span>Mes</span><select aria-label="Mes de los repostajes" value={month} onChange={event => setMonth(event.target.value)}><option value="all">Todo el historial</option>{months.map(value => <option value={value} key={value}>{monthLabel(value)}</option>)}</select></label><label><span>Vehículo</span><select aria-label="Vehículo" value={vehicleId} onChange={event => setVehicleId(event.target.value)}><option value="all">Todos</option>{state.vehicles.map(vehicle => <option value={vehicle.id} key={vehicle.id}>{vehicle.name}</option>)}</select></label></div>
    <Button onClick={onAdd} className="button--wide"><Plus size={20} /> Añadir repostaje</Button>
    <div className="section-heading"><h2>Facturas de combustible</h2><small>{refuels.length} visibles</small></div>
    {!refuels.length ? <EmptyState icon={<Fuel />} title="Sin repostajes en este filtro" text="Selecciona otro mes o vehículo, o escanea una factura nueva." action={<Button onClick={onAdd}>Añadir repostaje</Button>} /> : <div className="ticket-list">{refuels.map(refuel => { const vehicle = state.vehicles.find(value => value.id === refuel.vehicleId); return <button type="button" key={refuel.id} onClick={() => setSelected(refuel)}><span className="store-mark orange">{refuel.station.slice(0, 1)}</span><span><b>{refuel.station}</b><small>{shortDate(refuel.date)} · {refuel.fuelType} · {vehicle?.name ?? 'Sin vehículo'}</small><small>{refuel.liters.toLocaleString('es-ES')} L · {money(refuel.pricePerLiter)}/L</small></span><strong>{money(refuel.total)}</strong></button>; })}</div>}
    <Sheet open={Boolean(selected)} title="Detalle del repostaje" onClose={() => setSelected(null)}>{selected ? <div className="fuel-detail">
      <div className="receipt-summary"><span className="store-mark orange"><Fuel size={22} /></span><div><h3>{selected.station}</h3><p>{shortDate(selected.date)}</p></div><strong>{money(selected.total)}</strong></div>
      <dl><div><dt>Combustible</dt><dd>{selected.fuelType}</dd></div><div><dt>Litros</dt><dd>{selected.liters.toLocaleString('es-ES')} L</dd></div><div><dt>Precio por litro</dt><dd>{money(selected.pricePerLiter)}/L</dd></div><div><dt>Vehículo</dt><dd>{selectedVehicle?.name ?? 'Sin asignar'}</dd></div>{selected.odometer ? <div><dt><Gauge size={15} /> Kilometraje</dt><dd>{selected.odometer.toLocaleString('es-ES')} km</dd></div> : null}{selected.tags.length ? <div><dt>Etiquetas</dt><dd>{selected.tags.join(' · ')}</dd></div> : null}</dl>
      <Button variant="danger" className="button--wide" onClick={() => { if (window.confirm('¿Eliminar esta factura de combustible?')) { deleteRefuel(selected.id); setSelected(null); } }}><Trash2 size={18} /> Eliminar factura</Button>
    </div> : null}</Sheet>
  </div>;
}
