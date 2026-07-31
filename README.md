# Dark Commute

Dark Commute is a mobile-first narrative survival game about crossing a powerless city to reach home after a total blackout.

## Game foundation

- authored survival rules control location, time, inventory, scoring, stats, death, and victory;
- direct, resource, and social routes support distinct strategies;
- the Signal easter egg is discovered through repeatable clues rather than random AI output;
- Static Breach is a short, mobile-friendly rail-shooter event with an authored final choice;
- authored gameplay works offline;
- AI is optional and limited to flavor narration for freeform actions;
- the portrait-first UI includes visible stat deltas, route progress, inventory, map, log, haptics, reduced motion, scanline, sound, and large-text controls;
- external purchase links, client-visible unlock codes, and direct Duke Nukem imitation have been removed.

## Architecture

```text
index.html                           Web and Android app shell
styles.css                           Responsive portrait-first presentation
src/game-data.js                     Authored scenes, routes, items and Signal endings
src/game-core.js                     Deterministic state transition engine
src/app.js                           UI, persistence and Static Breach
src/native-commerce.js               Android billing bridge and premium gate
netlify/functions/claude.js           Fixed-contract optional narration proxy
netlify/functions/verify-purchase.js  Google Play Developer API verification
android/                              API 36 native Android wrapper and Billing 9.1
```

## Local checks

```bash
npm test
npm run check
```

A static local server is required because the browser modules use ES module imports.

## Android build

The Android wrapper bundles the current web assets into the application at build time and serves them from Android's secure `appassets.androidplatform.net` origin.

Requirements:

- JDK 17
- Android SDK platform 36
- Android build tools 36.0.0
- Gradle 9.1.0

Build a debug bundle:

```bash
gradle -p android :app:testDebugUnitTest :app:lintDebug :app:bundleDebug
```

GitHub Actions performs this build and uploads `app-debug.aab` as a workflow artifact.

## Google Play configuration

- Application ID: `app.darkcommute.game`
- One-time product ID: `dark_commute_full_game`
- Target SDK: 36
- Minimum SDK: 26
- Play Billing Library: 9.1.0

Create the one-time product in Play Console before testing purchases. The free Android prologue ends at the street route decision; a verified purchase unlocks all routes and restores across devices supported by Google Play.

Purchase verification requires a Google Cloud service account with Android Publisher access. Store the complete service-account JSON as the Netlify environment variable:

```text
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
```

The native client sends only the Play purchase token. The server hardcodes the application ID and product ID, verifies through the Google Play Developer API, and acknowledges verified purchases. A previously verified entitlement remains available offline for seven days before online re-verification is required.

## Remaining Play Console work

Repository implementation cannot complete account-side steps. Before production submission:

- create the Play Console app and managed product;
- connect the Android Publisher service account;
- configure release signing or Play App Signing;
- host and enter the final public privacy-policy URL;
- complete Data Safety and content-rating declarations;
- add store screenshots, feature graphic, support details, and tester instructions;
- run closed-track purchase, pending-payment, restore, offline, rotation, low-memory, and WebView recovery tests;
- review Android vitals after rollout.

The codebase can produce an Android App Bundle, but production approval remains dependent on these Play Console and live-device steps.
