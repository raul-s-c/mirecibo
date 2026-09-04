import { Coins, DatabaseZap, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AI_USAGE_UPDATED, clearAiUsageRecords, loadAiUsageRecords, usageActionLabel, type AiUsageRecord } from '../services/usageLedger';
import { Button } from './ui';

const tokens = (value: number) => new Intl.NumberFormat('es-ES').format(value);
const dollars = (value: number) => value < 0.0001 && value > 0 ? '< 0,0001 US$' : `${value.toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} US$`;

export function AiUsagePanel() {
  const [records, setRecords] = useState<AiUsageRecord[]>([]);
  useEffect(() => {
    let active = true;
    const refresh = () => void loadAiUsageRecords().then(value => { if (active) setRecords(value); });
    refresh();
    window.addEventListener(AI_USAGE_UPDATED, refresh);
    return () => { active = false; window.removeEventListener(AI_USAGE_UPDATED, refresh); };
  }, []);
  const totals = useMemo(() => records.reduce((sum, record) => ({
    tokens: sum.tokens + record.totalTokens,
    input: sum.input + record.inputTokens,
    output: sum.output + record.outputTokens,
    cached: sum.cached + record.cachedInputTokens,
    cost: sum.cost + record.estimatedCostUsd
  }), { tokens: 0, input: 0, output: 0, cached: 0, cost: 0 }), [records]);

  return <section className="usage-panel">
    <div className="settings-card-title"><Coins /><div><h2>Consumo de IA</h2><p>Cada acción queda vinculada a los tokens que devuelve OpenAI.</p></div></div>
    {!records.length ? <div className="usage-empty"><DatabaseZap /><span><b>Aún no hay operaciones registradas</b><small>Empezaremos a medirlas desde esta versión.</small></span></div> : <>
      <div className="usage-totals"><span><small>Tokens reales</small><b>{tokens(totals.tokens)}</b></span><span><small>Coste tarifario</small><b>{dollars(totals.cost)}</b></span></div>
      <small className="usage-breakdown">Entrada {tokens(totals.input)} · salida {tokens(totals.output)}{totals.cached ? ` · ${tokens(totals.cached)} de entrada en caché` : ''}</small>
      <div className="usage-history">{records.slice(0, 20).map(record => <article key={record.id}>
        <div><b>{usageActionLabel[record.action] ?? record.action}</b><small>{new Date(record.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })} · {record.model}</small></div>
        <span><b>{record.cacheHit ? '0 tokens' : `${tokens(record.totalTokens)} tokens`}</b><small>{record.cacheHit ? 'Resultado reutilizado · sin llamada al modelo' : `${tokens(record.inputTokens)} entrada + ${tokens(record.outputTokens)} salida${record.requestCount > 1 ? ` · ${record.requestCount} llamadas` : ''} · ${dollars(record.estimatedCostUsd)}`}</small></span>
      </article>)}</div>
      <Button variant="secondary" className="button--wide usage-clear" onClick={() => confirm('¿Borrar únicamente el historial local de consumo de IA?') && clearAiUsageRecords()}><Trash2 size={16} /> Borrar historial de consumo</Button>
    </>}
    <small className="usage-disclaimer">Los tokens son los comunicados por la API. El importe aplica la tarifa pública de GPT-5.4 mini; tu factura puede ser menor o cero por los tokens gratuitos de tu cuenta.</small>
  </section>;
}
