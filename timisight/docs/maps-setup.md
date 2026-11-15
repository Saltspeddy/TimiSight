# Google Maps setup (Android) — location-based quests

The location-based Quests feature uses **`expo-maps`** to show a map pin for the daily
quest. On Android, `expo-maps` renders **Google Maps**, which needs a Google Cloud API key.
Hot/cold path hints use `expo-location` and need **no** key — only the map pin does.

This project ships Android only and builds with `npx expo run:android` (a local dev build),
so these instructions cover the **debug keystore** path, not Google Play app signing.

> `expo-location` works in Expo Go; `expo-maps` is a native module and does **not** — it only
> appears in a dev build (`npx expo run:android`), never in Expo Go.

---

## What you need, exactly

| Thing | Value for this app |
| --- | --- |
| Google Cloud API/service to enable | **Maps SDK for Android** (this one specifically — not "Maps JavaScript API", not "Maps SDK for iOS") |
| Billing | A Cloud **billing account must be linked** to the project, even on the free tier. Without it, Maps SDK requests are rejected. |
| Android package name | `com.anonymous.timisight` (from `app.json` → `expo.android.package`) |
| Signing fingerprint | **SHA-1** of the debug keystore (`~/.android/debug.keystore`) |
| Where the key goes | `timisight/.env` as `GOOGLE_MAPS_ANDROID_API_KEY=...` (gitignored). `app.config.js` injects it into `android.config.googleMaps.apiKey` at build time. |

A Maps Android key is embedded in the APK and can be extracted from any installed build, so
**secrecy is not the protection — key restriction is.** A key locked to this app's package +
SHA-1 is useless to anyone else even if it leaks. Keeping it out of git (via `.env`) only
guards against an *unrestricted* key being scraped and billed. Restrict the key regardless.

---

## The chicken-and-egg (read this first)

The debug keystore does not exist until your **first** Android build, but the key restriction
needs that keystore's SHA-1. So the order is:

1. Build once **without** a key → this creates the keystore. Map is blank, rest of app works.
2. Read the SHA-1 from the keystore.
3. Restrict the key in Cloud Console using that SHA-1.
4. Put the key in `.env`.
5. Build again → the key bakes in, map renders.

---

## Step 1 — First build (creates the debug keystore)

With `GOOGLE_MAPS_ANDROID_API_KEY` left blank in `.env` (its default):

```bash
cd timisight
npx expo run:android
```

The app builds and runs. The daily-quest map area is blank/grey (no valid key yet);
everything else — hot/cold hints, scanning, points — works normally. This run creates
`~/.android/debug.keystore`.

## Step 2 — Get the debug SHA-1

```bash
keytool -list -v \
  -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android
```

(`android` is the standard password for the auto-generated debug keystore.)

In the output, copy the line labeled **`SHA1:`** — 20 hex pairs, e.g.
`A1:B2:C3:D4:E5:F6:07:18:29:3A:4B:5C:6D:7E:8F:90:A1:B2:C3:D4`.

> If `keytool` is not found, it ships with the JDK that Android Studio installs
> (e.g. `~/Android/Sdk/.../jbr/bin/keytool`, or via your system JDK).

## Step 3 — Enable + restrict the key in Google Cloud Console

Your colleague already has a Cloud project; you can reuse it or make a new one. In
[console.cloud.google.com](https://console.cloud.google.com), with that project selected:

### 3a. Enable the Maps SDK for Android
- **APIs & Services → Library** → search **"Maps SDK for Android"** → open it → **Enable**.
- This is per-project and independent of whatever API the colleague's other app used. If it's
  already enabled on the project, skip.
- Confirm the project has a **billing account linked** (Billing in the left nav). Required even
  for free-tier Maps usage; unlinked billing = rejected requests.

### 3b. Create or open the API key
- **APIs & Services → Credentials**.
- Either reuse the existing key (click it to edit) or **Create Credentials → API key**, then
  **Edit API key**.

### 3c. Restrict it (this is the important part)
- **Application restrictions** → choose **Android apps**.
- **Add an item**, and enter BOTH:
  - **Package name:** `com.anonymous.timisight`
  - **SHA-1 certificate fingerprint:** the value from Step 2
- **API restrictions** → **Restrict key** → select **Maps SDK for Android** only. (So a leaked
  key can't be used against other Google APIs.)
- **Save.**

> Reusing the colleague's key: if it was already restricted to their app, adding your
> package+SHA-1 as a second item makes it serve both. If their key is **unrestricted**, don't
> reuse it as-is — either restrict it now, or make a dedicated new key for this app. An
> unrestricted key is the one case where a leak actually costs money.

## Step 4 — Put the key in `.env`

Edit `timisight/.env` (gitignored — never commit it):

```
GOOGLE_MAPS_ANDROID_API_KEY=AIzaSy...your-real-key...
```

`.env.example` documents this variable; do not put a real key there.

## Step 5 — Rebuild

The key is injected at **native build time** (by `app.config.js`), so a Metro refresh is not
enough — you must rebuild:

```bash
npx expo run:android
```

The daily-quest map should now render with a pin.

---

## Verifying it worked

- Open the app → **Quests** tab → the **Daily Quests** section shows a map with one pin at the
  daily flower's location.
- A freshly restricted key can take a few minutes (occasionally longer) to propagate on
  Google's side. If the map is still grey right after Step 5, wait a bit before debugging.

## If the map stays blank/grey

1. **`adb logcat | grep -i "google maps\|API key\|Authorization"`** while opening the Quests
   tab — Google logs a specific reason (key invalid, API not enabled, package/SHA mismatch,
   billing not enabled).
2. Confirm the key actually baked in:
   `npx expo config --type public` → check `android.config.googleMaps.apiKey` is your key and
   not empty. If empty, `.env` wasn't loaded — confirm the variable name is exactly
   `GOOGLE_MAPS_ANDROID_API_KEY` and you rebuilt (not just reloaded).
3. Re-check the restriction: the package must be exactly `com.anonymous.timisight` and the
   SHA-1 must match the keystore that signed **this** build (debug keystore for
   `npx expo run:android`). A different machine has a different debug keystore / SHA-1 — add
   each developer's debug SHA-1 to the key, or share one keystore.
4. Confirm **Maps SDK for Android** (not another Maps product) is enabled, and billing is
   linked.

## Notes

- **Coordinates are placeholders.** `web/supabase/flowers-geo.sql` and the bundled fallback in
  `src/constants/flowers.ts` seed rough Timișoara coordinates marked `PLACEHOLDER`. Replace
  them with the real landmark positions (Casa Mühle, Opera House, Carol Miklósi Tram Museum,
  Timișoreana brewery) before relying on the map pin or hot/cold distances.
- **iOS:** not set up. `expo-maps` uses Apple Maps on iOS (needs iOS 17+) and the map component
  is gated to Android in `quests.tsx`. Revisit when iOS is on the roadmap.
- **Hot/cold needs no key.** If you only care about the path mini-game and not the daily map,
  you can skip all of the above; `expo-location` just needs the location permission, which the
  app requests at runtime.
