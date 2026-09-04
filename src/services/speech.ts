import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

interface WebSpeechResult { results: ArrayLike<{ 0: { transcript: string } }> }
interface WebSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: WebSpeechResult) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
}

export async function listenSpanish(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const permission = await SpeechRecognition.requestPermissions();
    if (permission.speechRecognition !== 'granted') throw new Error('Necesito permiso de micrófono para escuchar la lista.');
    const result = await SpeechRecognition.start({ language: 'es-ES', maxResults: 3, prompt: 'Di lo que necesitas comprar', popup: true, partialResults: false });
    const text = result.matches?.[0];
    if (!text) throw new Error('No he entendido nada. Puedes probar otra vez o escribirlo.');
    return text;
  }
  const SpeechCtor = (window as unknown as { SpeechRecognition?: new () => WebSpeechRecognition; webkitSpeechRecognition?: new () => WebSpeechRecognition }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => WebSpeechRecognition }).webkitSpeechRecognition;
  if (!SpeechCtor) throw new Error('El reconocimiento de voz no está disponible en este navegador.');
  return new Promise((resolve, reject) => {
    const recognition = new SpeechCtor();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = event => resolve(event.results[0][0].transcript);
    recognition.onerror = event => reject(new Error(event.error === 'not-allowed' ? 'Activa el permiso de micrófono.' : 'No he podido reconocer la frase.'));
    recognition.start();
  });
}
