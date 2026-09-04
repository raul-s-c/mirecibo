import { Capacitor } from '@capacitor/core';
import { AlertTriangle, Camera, Check, CheckCircle2, Fuel, Keyboard, Mic, Plus, ScanLine, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { captureReceipt } from '../services/capture';
import { analyzeFuelImage, analyzeReceiptImage } from '../services/aiReceiptAnalyzer';
import { parseFuelText, parseReceiptText } from '../services/receiptAnalyzer';
import { recognizeReceipt } from '../services/receiptAnalyzer';
import { auditReceipt, findDuplicateReceipt } from '../services/receiptQuality';
import { interpretShoppingText } from '../services/shoppingInterpreter';
import { listenSpanish } from '../services/speech';
import { useStore } from '../store/StoreProvider';
import type { NewShoppingItem, Receipt, Refuel } from '../types';
import { money } from '../utils/format';
import { Button, Field, Progress, Sheet } from './ui';
import { AiListGenerator } from './AiListGenerator';

type Flow = 'menu' | 'products' | 'generate-list' | 'ticket' | 'ticket-review' | 'fuel' | 'fuel-review';

export function AddFlow({ open, onClose, initial = 'menu' }: { open: boolean; onClose: () => void; initial?: Flow }) {
  const { state, addItems, addReceipt, addRefuel } = useStore();
  const [flow, setFlow] = useState<Flow>(initial);
  const [text, setText] = useState('');
  const [items, setItems] = useState<NewShoppingItem[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [refuel, setRefuel] = useState<Refuel | null>(null);
  const [rawOcr, setRawOcr] = useState('');
  const [vehicleId, setVehicleId] = useState(state.vehicles[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [duplicateOverride, setDuplicateOverride] = useState(false);

  const resetAndClose = () => { setFlow(initial); setText(''); setItems([]); setReceipt(null); setRefuel(null); setRawOcr(''); setBusy(false); setError(''); setDuplicateOverride(false); onClose(); };
  const title = ({ menu: 'Añadir', products: 'Añadir productos', 'generate-list': 'Generar lista con IA', ticket: 'Escanear ticket', 'ticket-review': 'Revisar ticket', fuel: 'Añadir repostaje', 'fuel-review': 'Revisar repostaje' } as const)[flow];

  const interpretProducts = async (value = text) => {
    setBusy(true); setError('');
    try {
      const parsed = await interpretShoppingText(value);
      if (!parsed.length) { setError('No he encontrado productos. Prueba con “dos cafés, leche y papel higiénico”.'); return; }
      setItems(parsed);
    } catch { setError('No he podido separar los productos. Prueba otra vez o sepáralos con una pausa.'); }
    finally { setBusy(false); }
  };

  const listen = async () => {
    setBusy(true); setError('');
    try { const value = await listenSpanish(); setText(value); await interpretProducts(value); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No he podido usar el micrófono.'); }
    finally { setBusy(false); }
  };

  const scan = async (kind: 'ticket' | 'fuel') => {
    setBusy(true); setError(''); setProgress(0.15);
    try {
      const image = await captureReceipt(); setProgress(0.38);
      const local = await recognizeReceipt(image.path).catch(() => null);
      const ocrText = local?.text ?? '';
      setRawOcr(ocrText);
      setProgress(0.58);
      if (kind === 'ticket') {
        const analyzed = await analyzeReceiptImage(image.base64, image.mimeType, image.preview, ocrText);
        setReceipt(analyzed); setFlow('ticket-review');
      } else {
        setRefuel(await analyzeFuelImage(image.base64, image.mimeType, vehicleId, ocrText)); setFlow('fuel-review');
      }
      setProgress(1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido analizar la imagen.'); }
    finally { setBusy(false); }
  };

  const analyzePasted = (kind: 'ticket' | 'fuel') => {
    if (!rawOcr.trim()) { setError('Pega el texto reconocido del ticket para continuar en el navegador.'); return; }
    if (kind === 'ticket') { setReceipt(parseReceiptText(rawOcr)); setFlow('ticket-review'); }
    else { setRefuel(parseFuelText(rawOcr, vehicleId)); setFlow('fuel-review'); }
    setError('');
  };

  return <Sheet open={open} title={title} onClose={resetAndClose} wide={flow === 'ticket-review' || flow === 'generate-list'}>
    {flow === 'menu' ? <div className="add-options">
      <button onClick={() => setFlow('products')}><span className="option-icon green"><Mic /></span><span><b>Hablar o escribir</b><small>Añade varios productos a tu lista</small></span></button>
      <button className="ai-option" onClick={() => setFlow('generate-list')}><span className="option-icon violet"><Sparkles /></span><span><b>Generar lista con IA</b><small>Describe una receta o una tarea y revisa la propuesta</small></span></button>
      <button onClick={() => setFlow('ticket')}><span className="option-icon blue"><ScanLine /></span><span><b>Escanear ticket</b><small>Guarda productos, precios y total</small></span></button>
      <button onClick={() => setFlow('fuel')}><span className="option-icon orange"><Fuel /></span><span><b>Repostaje</b><small>Registra combustible y vehículo</small></span></button>
    </div> : null}

    {flow === 'generate-list' ? <AiListGenerator onDone={resetAndClose} /> : null}

    {flow === 'products' ? <div className="product-add">
      <div className={`voice-orb ${busy ? 'listening' : ''}`}><Mic size={38} /></div><h3>{busy ? 'Separando productos…' : 'Dime lo que necesitas'}</h3><p>Puedes decirlos seguidos: “leche huevos tostadas y papel de cocina”.</p>
      <Button variant="secondary" className="button--wide" onClick={listen} disabled={busy}><Mic size={19} /> {busy ? 'Procesando…' : 'Hablar'}</Button>
      <div className="separator"><span>o escribe</span></div>
      <Field label="Productos"><textarea rows={3} value={text} onChange={event => setText(event.target.value)} placeholder="Añade leche, huevos y pollo…" /></Field>
      {items.length ? <div className="detected-list"><div className="success-note"><Check /> He detectado {items.length} {items.length === 1 ? 'producto' : 'productos'}</div>{items.map((item, index) => <div key={`${item.name}-${index}`}><span><b>{item.name}</b><small>{item.category}</small></span><strong>{item.quantity} {item.unit}</strong><button aria-label={`Quitar ${item.name}`} onClick={() => setItems(values => values.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={17} /></button></div>)}</div> : null}
      {error ? <p className="error-note">{error}</p> : null}
      {items.length ? <Button className="button--wide" onClick={() => { addItems(items); resetAndClose(); }}><Plus size={19} /> Añadir a mi lista</Button> : <Button className="button--wide" onClick={() => void interpretProducts()} disabled={!text.trim() || busy}><Sparkles size={18} /> {busy ? 'Separando…' : 'Interpretar'}</Button>}
    </div> : null}

    {flow === 'ticket' ? <div className="scan-flow"><div className="scan-illustration"><ReceiptGlyph /></div><h3>Fotografía todo el ticket</h3><p>La IA analizará la imagen completa y entenderá cada línea aunque cambie el formato del ticket.</p>
      {Capacitor.isNativePlatform() ? <Button className="button--wide" onClick={() => scan('ticket')} disabled={busy}><Camera size={20} /> {busy ? 'Analizando…' : 'Abrir cámara'}</Button> : <><div className="web-hint"><Keyboard /> En el navegador puedes probar el analizador pegando el texto de un ticket. El APK utiliza la cámara y OCR local.</div><Field label="Texto del ticket"><textarea rows={8} value={rawOcr} onChange={event => setRawOcr(event.target.value)} placeholder={'MERCADONA\nLECHE ENTERA 1,25\nHUEVOS M 2,40\nTOTAL 3,65'} /></Field><Button className="button--wide" onClick={() => analyzePasted('ticket')}>Analizar texto</Button></>}
      {busy ? <Progress value={progress} /> : null}{error ? <p className="error-note">{error}</p> : null}
    </div> : null}

    {flow === 'ticket-review' && receipt ? <ReceiptReview receipt={receipt} setReceipt={setReceipt} rawOcr={rawOcr} setRawOcr={setRawOcr} duplicate={findDuplicateReceipt(state.receipts, receipt)} duplicateOverride={duplicateOverride} onAllowDuplicate={() => setDuplicateOverride(true)} onReanalyze={() => setReceipt({ ...parseReceiptText(rawOcr), imageUri: receipt.imageUri, ocrText: rawOcr, analysisMethod: 'local-ocr' })} onSave={() => { addReceipt(receipt); resetAndClose(); }} /> : null}

    {flow === 'fuel' ? <div className="scan-flow"><div className="scan-illustration orange"><Fuel size={52} /></div><h3>Ticket de combustible</h3><p>La IA interpretará estación, fecha, combustible, litros, precio por litro y total.</p><Field label="Vehículo"><select value={vehicleId} onChange={event => setVehicleId(event.target.value)}>{state.vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}</select></Field>
      {Capacitor.isNativePlatform() ? <Button className="button--wide" onClick={() => scan('fuel')} disabled={busy}><Camera size={20} /> {busy ? 'Analizando…' : 'Fotografiar ticket'}</Button> : <><Field label="Texto del ticket"><textarea rows={8} value={rawOcr} onChange={event => setRawOcr(event.target.value)} placeholder={'REPSOL\nGASOLINA 95\n12,34 L  1,589 €/L\nTOTAL 19,61'} /></Field><Button className="button--wide" onClick={() => analyzePasted('fuel')}>Analizar texto</Button></>}
      {busy ? <Progress value={progress} /> : null}{error ? <p className="error-note">{error}</p> : null}
    </div> : null}

    {flow === 'fuel-review' && refuel ? <FuelReview refuel={refuel} setRefuel={setRefuel} vehicles={state.vehicles} onSave={() => { addRefuel(refuel); resetAndClose(); }} /> : null}
  </Sheet>;
}

function ReceiptGlyph() { return <div className="receipt-glyph"><i /><i /><i /><i /></div>; }

function ReceiptReview({ receipt, setReceipt, rawOcr, setRawOcr, duplicate, duplicateOverride, onAllowDuplicate, onReanalyze, onSave }: { receipt: Receipt; setReceipt: (value: Receipt) => void; rawOcr: string; setRawOcr: (value: string) => void; duplicate?: Receipt; duplicateOverride: boolean; onAllowDuplicate: () => void; onReanalyze: () => void; onSave: () => void }) {
  const audit = useMemo(() => auditReceipt(receipt), [receipt]);
  const updateLine = (index: number, patch: Partial<Receipt['lines'][number]>) => setReceipt({ ...receipt, lines: receipt.lines.map((value, lineIndex) => lineIndex === index ? { ...value, ...patch } : value) });
  return <div className="review-flow">
    <section className={`receipt-audit receipt-audit--${audit.label.toLowerCase()}`}><div><span className="audit-score">{audit.score}</span><span><b>{audit.label === 'Fiable' ? 'Lectura fiable' : audit.label === 'Revisar' ? 'Conviene revisar' : 'Lectura incompleta'}</b><small>{receipt.lines.length} productos detectados</small></span></div><ul><li className={receipt.lines.length ? 'pass' : 'fail'}>{receipt.lines.length ? <CheckCircle2 /> : <AlertTriangle />} Hay líneas de producto</li><li className={audit.matchesTotal ? 'pass' : 'warn'}>{audit.matchesTotal ? <CheckCircle2 /> : <AlertTriangle />} {audit.matchesTotal ? 'Cuadra con el total' : `Diferencia de ${money(Math.abs(audit.difference))}`}</li></ul></section>
    {duplicate && !duplicateOverride ? <div className="duplicate-note"><AlertTriangle /><span><b>Este ticket parece duplicado</b><small>Ya guardaste uno igual de {duplicate.store} con fecha {duplicate.date}.</small></span><Button variant="secondary" onClick={onAllowDuplicate}>Guardar igualmente</Button></div> : null}
    {receipt.analysisWarnings?.length ? <div className="warning-note"><strong>Revisa estos puntos:</strong>{receipt.analysisWarnings.map(warning => <span key={warning}>{warning}</span>)}</div> : null}
    <div className="field-grid"><Field label="Establecimiento"><input value={receipt.store} onChange={event => setReceipt({ ...receipt, store: event.target.value })} /></Field><Field label="Fecha"><input type="date" value={receipt.date} onChange={event => setReceipt({ ...receipt, date: event.target.value })} /></Field></div>
    <div className="review-heading"><h3>Productos ({receipt.lines.length})</h3>{audit.uncertainCount ? <span className="warning">Revisar {audit.uncertainCount}</span> : <span className="ok">Todo parece correcto</span>}</div>
    <div className="editable-lines"><div className="editable-lines__head"><span>Producto</span><span>Cant.</span><span>P. unit.</span><span>Total</span><span /></div>{receipt.lines.map((line, index) => <div className={line.confidence < 0.8 ? 'uncertain' : ''} key={line.id}><label className="editable-field editable-field--name"><span>Producto</span><input aria-label="Nombre" value={line.name} onChange={event => updateLine(index, { name: event.target.value })} /></label><label className="editable-field"><span>Cantidad</span><input aria-label="Cantidad" type="number" min="0.001" step="0.01" value={line.quantity} onChange={event => { const quantity = Number(event.target.value); updateLine(index, { quantity, unitPrice: quantity > 0 ? line.total / quantity : 0 }); }} /></label><label className="editable-field"><span>Precio unit.</span><input aria-label="Precio unitario" type="number" min="0" step="0.01" value={line.unitPrice} onChange={event => { const unitPrice = Number(event.target.value); updateLine(index, { unitPrice, total: Math.round(unitPrice * line.quantity * 100) / 100 }); }} /></label><label className="editable-field"><span>Total</span><input aria-label="Importe" type="number" step="0.01" value={line.total} onChange={event => { const total = Number(event.target.value); updateLine(index, { total, unitPrice: line.quantity > 0 ? total / line.quantity : 0 }); }} /></label><button aria-label={`Eliminar ${line.name}`} onClick={() => setReceipt({ ...receipt, lines: receipt.lines.filter((_, lineIndex) => lineIndex !== index) })}><Trash2 size={17} /></button></div>)}</div>
    <button className="add-line" onClick={() => setReceipt({ ...receipt, lines: [...receipt.lines, { id: crypto.randomUUID(), name: 'Nuevo producto', quantity: 1, unit: 'ud.', unitPrice: 0, total: 0, category: 'Otros', confidence: 1 }] })}><Plus size={17} /> Agregar producto</button>
    <div className="totals-review"><span>Total calculado <b>{money(audit.lineSum)}</b></span><label>Total del ticket <input type="number" step="0.01" value={receipt.total} onChange={event => setReceipt({ ...receipt, total: Number(event.target.value) })} /></label><span className={audit.matchesTotal ? 'difference-ok' : 'difference-warn'}>Diferencia <b>{money(audit.difference)}</b></span>{audit.issues.map(issue => <small key={issue}>{issue}</small>)}</div>
    {rawOcr ? <details className="ocr-details"><summary>Ver o corregir el OCR local de respaldo</summary><textarea rows={10} value={rawOcr} onChange={event => setRawOcr(event.target.value)} /><Button variant="secondary" className="button--wide" onClick={onReanalyze}>Analizar solo este texto</Button></details> : null}
    <Button className="button--wide" onClick={onSave} disabled={!receipt.store.trim() || receipt.total <= 0 || !receipt.lines.length || Boolean(duplicate && !duplicateOverride)}>Guardar ticket</Button>
  </div>;
}

function FuelReview({ refuel, setRefuel, vehicles, onSave }: { refuel: Refuel; setRefuel: (value: Refuel) => void; vehicles: Array<{ id: string; name: string }>; onSave: () => void }) {
  return <div className="form-stack"><div className="success-note"><Check /> Datos extraídos. Corrige lo que sea necesario.</div><Field label="Estación"><input value={refuel.station} onChange={event => setRefuel({ ...refuel, station: event.target.value })} /></Field><Field label="Fecha"><input type="date" value={refuel.date} onChange={event => setRefuel({ ...refuel, date: event.target.value })} /></Field><Field label="Tipo de combustible"><input value={refuel.fuelType} onChange={event => setRefuel({ ...refuel, fuelType: event.target.value })} /></Field><div className="field-grid"><Field label="Litros"><input type="number" step="0.01" value={refuel.liters} onChange={event => setRefuel({ ...refuel, liters: Number(event.target.value) })} /></Field><Field label="Precio / litro"><input type="number" step="0.001" value={refuel.pricePerLiter} onChange={event => setRefuel({ ...refuel, pricePerLiter: Number(event.target.value) })} /></Field></div><Field label="Total"><input type="number" step="0.01" value={refuel.total} onChange={event => setRefuel({ ...refuel, total: Number(event.target.value) })} /></Field><Field label="Vehículo"><select value={refuel.vehicleId} onChange={event => setRefuel({ ...refuel, vehicleId: event.target.value })}>{vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}</select></Field><Field label="Kilometraje (opcional)"><input type="number" value={refuel.odometer ?? ''} onChange={event => setRefuel({ ...refuel, odometer: event.target.value ? Number(event.target.value) : undefined })} /></Field><Button className="button--wide" onClick={onSave} disabled={!refuel.station.trim() || refuel.total <= 0}>Guardar repostaje</Button></div>;
}
