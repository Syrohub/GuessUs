# GuessUs — iOS Party Game

Word-guessing party game for iOS with Family (4+) and Adult (17+) variants.

## Tech Stack
- **Framework:** React 18.2 + TypeScript + Vite 5
- **Native:** Capacitor 7.4.4 (iOS bridge)
- **Styles:** Tailwind CSS 3.3.6
- **Audio:** @capgo/native-audio (sound effects)
- **IAP:** cordova-plugin-purchase (In-App Purchases)
- **i18n:** Custom translations (EN, RU, ES, UA)

## Bundle IDs
- **Family:** `com.chatrixllc.guessus` (4+)
- **Adult:** `com.chatrixllc.guessus.adult` (17+)

## IAP Products
- Dirty Pack: $2.99
- Extreme Pack: $4.99
- Bundle (both): $5.99

## Key Files
- `src/App.tsx` — Main game component (88KB)
- `src/config.ts` — Feature flags & environment config
- `src/translations.ts` — i18n strings (EN/RU/ES/UA)
- `scripts/build-variant.sh` — Build specific variant
- `scripts/deploy-all.sh` — Build & deploy all variants

## Related Projects
- **guessus-editor** (`../guessus-editor/`) — Web UI for dictionary management (v2.1 deployed)
- **guessus-dictionary** (`../guessus-dictionary/`) — Word lists (v1.1)

## Common Commands
```bash
npm install
npm run dev              # Web dev server
npx cap sync ios         # Sync to iOS
npx cap open ios         # Open in Xcode
```

## Status
Development complete. Pre-App Store submission — needs metadata, screenshots, compliance.
