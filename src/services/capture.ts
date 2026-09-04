import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se ha podido preparar la fotografía.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(blob);
  });
}

export async function captureReceipt(): Promise<{ path: string; preview: string; base64: string; mimeType: string }> {
  const photo = await Camera.getPhoto({
    quality: 88,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Prompt,
    correctOrientation: true,
    promptLabelHeader: 'Ticket',
    promptLabelPhoto: 'Elegir de la galería',
    promptLabelPicture: 'Hacer una foto'
  });
  const path = photo.path ?? photo.webPath;
  if (!path) throw new Error('No se ha podido abrir la imagen.');
  const preview = photo.webPath ?? path;
  const blob = await fetch(preview).then(response => {
    if (!response.ok) throw new Error('No se ha podido leer la fotografía.');
    return response.blob();
  });
  if (blob.size > 18 * 1024 * 1024) throw new Error('La imagen es demasiado grande. Reduce la resolución e inténtalo de nuevo.');
  const base64 = await blobToBase64(blob);
  if (!base64) throw new Error('La fotografía está vacía.');
  return { path, preview, base64, mimeType: blob.type || `image/${photo.format || 'jpeg'}` };
}
