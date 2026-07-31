# Dark Commute

Dark Commute is a mobile-first narrative survival game about crossing a powerless city to reach home after a total blackout.

## Release foundation

This branch replaces the original single-file prototype with a deterministic, testable game foundation:

- authored survival rules control location, time, inventory, scoring, stats, death, and victory;
- three route styles support direct, resource, and social play;
- the Signal easter egg is discovered through repeatable clues rather than random AI output;
- Static Breach is a short, mobile-friendly rail-shooter event with an authored final choice;
- standard gameplay works offline after assets load;
- AI is optional and limited to flavor narration for freeform actions;
- mobile UI includes visible stat deltas, route progress, inventory, map, log, haptics, reduced motion, scanline, sound, and large-text controls;
- external Gumroad purchase links and client-visible unlock codes are removed;
- direct Duke Nukem quotes and character imitation are removed.

## Architecture

```text
index.html                 App shell and accessible screens
styles.css                 Responsive portrait-first presentation
src/game-data.js           Authored scenes, actions, routes, items, Signal endings
src/game-core.js           Deterministic state transition engine
src/app.js                 UI, persistence, optional narrative calls, Static Breach
netlify/functions/claude.js Fixed-contract optional narration proxy
```

## Local checks

```bash
npm test
npm run check
```

A static local server is required because the browser modules use ES module imports.

## Google Play path

The web foundation is intentionally separated from Android packaging. The next release step is to add Capacitor, Android API 36 configuration, Play Billing for a premium unlock, server-verified entitlement, Android app icons/screenshots, privacy-policy URL, crash reporting, and closed-track testing.

The current code is a stronger gameplay and security foundation, not a claim that the app is already approved for Google Play production.
