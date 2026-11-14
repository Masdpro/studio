# Closebuy mobile app (Android and iPhone)

The app is a native shell (Capacitor) around the live Closebuy site, `https://cbuyapp.com`.
Every website update reaches the app immediately. You only publish a new store version when something in
this folder changes (icons, permissions, plugins).

What the app adds on top of the website: an app icon and splash screen, a proper full-screen app,
the camera (live selfie, delivery codes, photos) and location permissions, an offline screen, and
Closebuy links from emails opening in the app (Android, once step 4 is done).

## Try it on an Android phone (free, no accounts needed)

1. Push a change to this folder (or open **GitHub → Actions → Mobile app → Run workflow**).
2. When the run finishes, download **closebuy-android-test-apk** from the run's *Artifacts*.
3. Unzip it, copy `app-debug.apk` to the phone and open it (allow "Install unknown apps" when asked).

## Publish on Google Play

1. Create a Google Play developer account (one-time US$25) at https://play.google.com/console.
2. Create an **upload key** on your own computer (keep the file and passwords safe; never commit them):
   ```bash
   keytool -genkey -v -keystore closebuy-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias closebuy
   ```
3. Add these GitHub repository secrets (Settings → Secrets and variables → Actions):
   `ANDROID_KEYSTORE_BASE64` (output of `base64 -w0 closebuy-upload.jks`), `ANDROID_KEYSTORE_PASSWORD`,
   `ANDROID_KEY_ALIAS` (`closebuy`), `ANDROID_KEY_PASSWORD`.
   The next workflow run also produces **closebuy-android-play-bundle** (`app-release.aab`), which is what you upload to Play.
4. Links from emails: in Play Console → *App integrity*, copy the **SHA-256 app signing** fingerprint and
   publish it at `https://cbuyapp.com/.well-known/assetlinks.json` (ask Claude to add the file).
5. In Play Console fill in the listing: screenshots, description, privacy policy (`https://cbuyapp.com/privacy`),
   Data safety form, and content rating. New personal developer accounts must run a closed test with
   at least 12 testers for 14 days before going public.

## Publish on the App Store

1. Join the Apple Developer Program (US$99/year) at https://developer.apple.com/programs/.
2. Building and uploading needs Xcode on a Mac (or a cloud Mac service such as Codemagic, Bitrise or
   Expo EAS). On a Mac: `cd mobile && npm ci && npx cap sync ios && npx cap open ios`, choose your team
   under *Signing & Capabilities*, then *Product → Archive → Distribute App*.
3. In App Store Connect add the listing, screenshots, privacy policy (`https://cbuyapp.com/privacy`) and the
   App Privacy answers. Give Apple's reviewers a demo account (customer and vendor) in the review notes.
4. Apple rejects apps that are "just a website". Closebuy's camera, location, account deletion and offline
   screen help; push notifications (below) make approval more likely.

## Store requirements already handled

- **Account deletion inside the app**: Profile → *Delete my account* (required by Apple and Google).
- **Privacy policy and terms**: `/privacy` and `/terms` on the site.
- **Permission messages** for camera, photos and location (iPhone) and permissions (Android).

## Not done yet (needs your accounts first)

- **Push notifications**: needs a Firebase project (Android) and an Apple push key (iPhone). Once you have
  them, Claude can add the plugin and send Closebuy notifications to phones.
- **iPhone universal links** (email links opening the app): needs your Apple Team ID.

## Changing the app

- App name, id and allowed pages: `capacitor.config.ts` (id: `com.cbuyapp.closebuy`; this can't change after publishing).
- Icons and splash screens: replace `../public/logo-mark-orange.png` with a high-resolution logo, then run
  `node scripts/make-app-icons.mjs` (from the repo root) and `npm run assets` (here).
- After changing anything here, run `npx cap sync`.
