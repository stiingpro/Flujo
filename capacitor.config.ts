import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stiingpro.radar',
  appName: 'Radar Financiero',
  webDir: 'public',
  server: {
    url: 'https://flujostiing.up.railway.app',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
