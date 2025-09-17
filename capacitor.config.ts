import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8c58a1c9e03647d9abe70f87d82ccf5d',
  appName: 'live-race-monitor',
  webDir: 'dist',
  server: {
    url: 'https://8c58a1c9-e036-47d9-abe7-0f87d82ccf5d.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;