import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'me.yuzone.music',
  appName: 'Yuzone Music',
  webDir: 'out',
  server: {
    url: 'https://music.yuzone.me',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
