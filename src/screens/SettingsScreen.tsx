import { Download, MapPin, RefreshCw, RotateCcw, ShieldCheck, Sparkles, Undo2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/ui';
import { isAiPreconfigured } from '../services/aiSettings';
import { useStore } from '../store/StoreProvider';
import { AiUsagePanel } from '../components/AiUsagePanel';
import { compareVersions, CURRENT_VERSION, installRelease, latestRelease, type AppRelease } from '../services/appUpdater';
import { clearRecoverySnapshot, exportSnapshot, hasRecoverySnapshot, loadRecoverySnapshot, parseSnapshot, saveRecoverySnapshot } from '../services/localSnapshot';
import { FinanceSettings } from '../components/FinanceSettings';

export function SettingsScreen() {
  const { state, reset, setPostalCode, replaceState } = useStore();
  const [backupMessage, setBackupMessage] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [release, setRelease] = useState<AppRelease | null>(null);
  const [updating, setUpdating] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  useEffect(() => { void hasRecoverySnapshot().then(setRecoveryAvailable); }, []);
  const exportData = async () => {
    setBackupBusy(true); setBackupMessage('Preparando snapshot…');
    try { const fileName = await exportSnapshot(state, CURRENT_VERSION); setBackupMessage(`${fileName} preparado. Guárdalo en Archivos, Drive o donde prefieras.`); }
    catch { setBackupMessage('No se pudo guardar el snapshot. Inténtalo de nuevo.'); }
    finally { setBackupBusy(false); }
  };
  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const snapshot = parseSnapshot(await file.text()); const next = snapshot.state;
      if (!confirm(`¿Restaurar este snapshot con ${next.receipts.length} tickets, ${next.refuels.length} repostajes y ${next.items.length} productos? Antes guardaremos una copia de recuperación de tus datos actuales.`)) return;
      await saveRecoverySnapshot(state, CURRENT_VERSION); replaceState(next); setRecoveryAvailable(true); setBackupMessage('Snapshot restaurado. Si algo no cuadra, puedes deshacer la restauración.');
    } catch (error) { setBackupMessage(error instanceof Error ? error.message : 'El archivo no es un snapshot válido de MiRecibo.'); }
    finally { if (importRef.current) importRef.current.value = ''; }
  };
  const undoRestore = async () => {
    const recovery = await loadRecoverySnapshot();
    if (!recovery) { setBackupMessage('No hay una copia de recuperación disponible.'); return; }
    if (!confirm('¿Deshacer la última restauración y recuperar los datos que tenías antes?')) return;
    replaceState(recovery); await clearRecoverySnapshot(); setRecoveryAvailable(false); setBackupMessage('Datos anteriores recuperados correctamente.');
  };
  const checkUpdate = async () => {
    setUpdating(true); setUpdateMessage('Buscando la última versión…');
    try {
      const next = await latestRelease(); setRelease(next);
      setUpdateMessage(compareVersions(next.version, CURRENT_VERSION) > 0 ? `Nueva versión ${next.version} disponible.` : `MiRecibo ${CURRENT_VERSION} está actualizado.`);
    } catch (error) { setUpdateMessage(error instanceof Error ? error.message : 'No se pudo consultar la actualización.'); }
    finally { setUpdating(false); }
  };
  const downloadUpdate = async () => {
    if (!release) return;
    setUpdating(true); setUpdateMessage('Descargando la actualización dentro de MiRecibo…');
    try {
      const result = await installRelease(release);
      setUpdateMessage(result.permissionRequired ? 'Activa “Permitir desde esta fuente”, vuelve a MiRecibo y pulsa instalar otra vez.' : 'Descarga terminada. Confirma la instalación en Android.');
    } catch (error) { setUpdateMessage(error instanceof Error ? error.message : 'No se pudo instalar la actualización.'); }
    finally { setUpdating(false); }
  };
  return <div className="screen settings-screen">
    <section className="privacy-card"><ShieldCheck /><div><h2>Datos locales y análisis protegido</h2><p>Tu lista, tickets y estadísticas se guardan en este dispositivo. Al escanear, la fotografía se envía cifrada al servicio de IA para interpretarla y la clave de OpenAI nunca se incluye en la aplicación.</p></div></section>
    <section className="ai-settings-card"><div className="settings-card-title"><Sparkles /><div><h2>Análisis inteligente</h2><p>Contrasta la imagen con OCR local para entender tickets con formatos distintos.</p></div></div>{isAiPreconfigured ? <div className="success-note"><Sparkles /> Configurado automáticamente y listo para usar.</div> : null}<small>No tienes que introducir claves. La clave de OpenAI permanece únicamente en el servidor y el servicio limita automáticamente el uso abusivo.</small></section>
    <AiUsagePanel />
    <section className="ai-settings-card"><div className="settings-card-title"><RefreshCw /><div><h2>Actualizaciones</h2><p>Busca, descarga e instala nuevas versiones sin abrir el navegador.</p></div></div><div className="update-version"><span>Instalada</span><b>{CURRENT_VERSION}</b></div>{release && compareVersions(release.version, CURRENT_VERSION) > 0 ? <><div className="success-note">Versión {release.version} disponible</div><p className="update-notes">{release.notes}</p><Button className="button--wide" disabled={updating} onClick={() => void downloadUpdate()}><Download size={18} /> {updating ? 'Descargando…' : 'Descargar e instalar'}</Button></> : <Button variant="secondary" className="button--wide" disabled={updating} onClick={() => void checkUpdate()}><RefreshCw size={18} /> {updating ? 'Comprobando…' : 'Buscar actualizaciones'}</Button>}{updateMessage ? <p className="backup-message" role="status">{updateMessage}</p> : null}<small>Android puede pedir una vez permiso para instalar aplicaciones desde MiRecibo. Tus tickets y ajustes se conservan al actualizar.</small></section>
    <section className="ai-settings-card"><div className="settings-card-title"><MapPin /><div><h2>Zona de precios</h2><p>Sirve para ordenar y filtrar supermercados por distancia.</p></div></div><label>Código postal<input inputMode="numeric" maxLength={5} value={state.postalCode} onChange={event => setPostalCode(event.target.value.replace(/\D/g, ''))} placeholder="08812 o 46900" /></label><small>No limita las cadenas consultadas y no necesitas compartir tu dirección exacta.</small></section>
    <FinanceSettings />
    <section className="settings-group"><h2>Snapshot local</h2><p className="snapshot-summary">Incluye {state.items.length} productos, {state.receipts.length} tickets, {state.refuels.length} repostajes, {state.categories.length} categorías y {state.recurringExpenses.length} gastos periódicos. Nunca incluye claves ni fotografías.</p><button disabled={backupBusy} onClick={() => void exportData()}><Download /><span><b>{backupBusy ? 'Preparando snapshot…' : 'Exportar snapshot'}</b><small>Guarda toda tu base de datos local en un archivo JSON</small></span></button><button onClick={() => importRef.current?.click()}><Upload /><span><b>Importar snapshot</b><small>Restaura un archivo después de instalar o actualizar</small></span></button><input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={event => void importData(event.target.files?.[0])} />{recoveryAvailable ? <button onClick={() => void undoRestore()}><Undo2 /><span><b>Deshacer última restauración</b><small>Recupera automáticamente los datos que había antes</small></span></button> : null}{backupMessage ? <p className="backup-message" role="status">{backupMessage}</p> : null}<button className="danger-row" onClick={() => confirm('¿Eliminar todos los datos de la aplicación?') && reset()}><RotateCcw /><span><b>Borrar y empezar de nuevo</b><small>Esta acción no se puede deshacer</small></span></button></section>
    <section className="about"><b>MiRecibo</b><span>Versión {CURRENT_VERSION}</span><p>Lista inteligente, tickets, mapa comparativo, precios y repostajes.</p></section>
    <a className="button button--secondary button--wide" href="privacy.html" target="_blank" rel="noreferrer">Política de privacidad</a>
  </div>;
}
