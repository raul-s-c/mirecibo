import { Capacitor, CapacitorHttp } from '@capacitor/core';

/** One attempt only: retrying a POST can duplicate paid inference. */
export async function aiFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    // Native networking avoids WebView CORS restrictions; receipt images are resized before reaching this bridge.
    if (Capacitor.isNativePlatform()) {
      const result = await CapacitorHttp.request({
        url, method: init.method ?? 'POST', headers,
        data: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
        connectTimeout: 15_000, readTimeout: 120_000, responseType: 'json', disableRedirects: true
      });
      return new Response(typeof result.data === 'string' ? result.data : JSON.stringify(result.data), {
        status: result.status, headers: result.headers
      });
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      // Include reading the response in the timeout, not only receiving headers.
      const body = await response.text();
      return new Response(body, { status: response.status, headers: response.headers });
    } finally { clearTimeout(timer); }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/abort|timeout|timed out/i.test(message)) throw new Error('El servidor de IA ha tardado demasiado. Tu lista no ha cambiado. Puedes volver a intentarlo.');
    throw new Error('No se ha podido enviar el ticket al servicio de análisis. Comprueba la conexión e inténtalo de nuevo. Tu lista no ha cambiado.');
  }
}
