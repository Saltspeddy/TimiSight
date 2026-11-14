# TimiSight — Mobile App

The explorer experience for [TimiSight](../README.md): scan physical NFC flowers around Timișoara, build your collection, read the stories behind the city's landmarks, and earn points for perks.

## Tech stack

- **Expo SDK 58** / **React Native 0.88** with **React 19**
- **TypeScript**
- **Expo Router** — file-based navigation (routes live in `src/app/`)
- **expo-auth-session** + **expo-secure-store** — authentication and secure token storage
- **react-native-reanimated** + **react-native-gesture-handler** — animated educational popups
- **expo-image**, **@expo/ui**, **expo-glass-effect**, **expo-symbols** — UI
- **@react-native-async-storage/async-storage** — local persistence

## Project structure

```
src/
  app/            # Screens (Expo Router). Every file is a route; _layout.tsx defines navigators.
    (tabs)/       # Main tabbed UI: home, places, leaderboard, shop, account
    place/        # Place detail screens
    login.tsx
  components/     # Reusable UI components
  hooks/          # Custom hooks
  lib/            # Clients, helpers, API
  constants/      # Shared constants
```

Keep non-route code (components, hooks, utils) **outside** `src/app/`.

## Prerequisites

- [Node.js](https://nodejs.org) (LTS)
- The Expo tooling is used via `npx` — no global install required.
- For features with native modules (e.g. NFC), you need a **development build** rather than Expo Go.

## Getting started

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npx expo start
```

From the Expo dev server you can open the app in:

- a [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- an [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- an [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go) (limited — bundled native modules only)

Run directly on a device/simulator:

```bash
npx expo run:android
npx expo run:ios
```

## Adding dependencies

Always install packages through Expo so it resolves SDK-compatible versions:

```bash
npx expo install <package>
```

## Checks

Run both before considering a change done:

```bash
npx expo lint      # lint
npx tsc --noEmit   # typecheck
```

Diagnose dependency/config issues:

```bash
npx expo-doctor
npx expo install --fix
```

## Native configuration

If `ios/` and `android/` directories don't exist, they're generated (Continuous Native Generation). Don't create or edit them by hand — configure native behavior in `app.json` and config plugins.

## Building & shipping (EAS)

Builds, signing, submission, and over-the-air updates run in the cloud via EAS — no local Xcode/Android Studio required:

```bash
npx eas-cli@latest build --profile development
npx eas-cli@latest build
npx eas-cli@latest submit
npx eas-cli@latest update
```

Docs: <https://docs.expo.dev/eas/>
