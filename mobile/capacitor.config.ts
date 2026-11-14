import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Closebuy for Android and iPhone.
 *
 * The app opens the live Closebuy site (cbuyapp.com), so every website update reaches the app straight
 * away with no new store release. Store releases are only needed when this native shell changes
 * (icons, permissions, plugins).
 */
const config: CapacitorConfig = {
  appId: 'com.cbuyapp.closebuy',
  appName: 'Closebuy',
  webDir: 'www',
  // Lets the site tell it is running inside the app (e.g. to hide "get the app" prompts).
  appendUserAgent: 'ClosebuyApp/1.0',
  backgroundColor: '#ffffff',
  server: {
    url: 'https://cbuyapp.com/shop',
    // Pages that stay inside the app. Anything else (maps, WhatsApp, other sites) opens in the phone's browser.
    allowNavigation: [
      'cbuyapp.com',
      '*.cbuyapp.com',
      // Paystack checkout for wallet top-ups, including card security (3-D Secure) pages it hosts.
      'checkout.paystack.com',
      '*.paystack.com',
      '*.paystack.co',
      // Cloudflare's security check on sign-up.
      'challenges.cloudflare.com',
    ],
    // Shown when the phone is offline or the site can't be reached.
    errorPath: 'offline.html',
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    // Keeps pages clear of the notch and the home bar.
    contentInset: 'always',
    scheme: 'Closebuy',
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidScaleType: 'CENTER_INSIDE',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ffffff',
      overlaysWebView: false,
    },
    SystemBars: {
      // Keep pages clear of the Android status and navigation bars (the site doesn't draw under them).
      insetsHandling: 'native',
    },
  },
};

export default config;
