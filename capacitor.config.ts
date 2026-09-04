import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'es.mirecibo.app',
  appName: 'MiRecibo',
  webDir: 'dist',
  backgroundColor: '#ffffff',
  android: {
    allowMixedContent: false,
    backgroundColor: '#ffffff'
  }
};

export default config;
