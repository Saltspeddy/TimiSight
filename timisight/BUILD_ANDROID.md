# Building the Android app with the embedded Unity AR library

This guide takes the exported **`unityLibrary`** (produced by
[`EXPORT_TUTORIAL.md`](./EXPORT_TUTORIAL.md)) and builds the React Native app
(`visittm`) with the Unity AR view embedded. You run this in the **app repo**
(`visittm`).

**Goal of this document:** go from a cloned app repo + a local copy of the Unity
export to an installed Android build on a physical device, and capture the compiled
output so future builds can skip Unity.

> **Who this is for:** a teammate who has the full **Unity 6 + Android Build Support**
> toolchain (OpenJDK + Android SDK & NDK) working on their machine. The embedded Unity
> library compiles its C++ (IL2CPP) at Gradle build time, so that toolchain must be
> present — a plain Node/Expo setup is not enough.

---

## Prerequisites (confirm before starting)

- **Unity `6000.3.27f2`** with **Android Build Support** (OpenJDK + Android SDK & NDK).
  The IL2CPP compile step needs the Unity Android NDK/SDK on this machine.
- **Android SDK** installed, with `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) set, or an
  `android/local.properties` with `sdk.dir=...` (the prebuild/run step can generate
  one). A matching **NDK** installed.
- **Node + the app repo dependencies** installed (`npm install` / `bun install`).
  `npm install` also runs `patch-package` (postinstall) to fix the Unity wrapper's
  gradle — do not skip it.
- A **physical, ARCore-capable Android device** connected over USB with USB debugging
  on. An emulator will not do geospatial AR.
- The **Unity export** placed locally (next step).

### Windows-specific prerequisites (read if building on Windows)

- **MAX_PATH / 260-character path limit.** Unity's IL2CPP native build creates very
  deeply nested paths that exceed Windows' legacy 260-char limit, which breaks the
  build. Two mitigations, use both:
  1. Keep the project **close to a drive root** (e.g. `D:\visittm`), not nested under
     long `Documents\...\...` paths.
  2. The config plugin already redirects the CMake staging dir to a short path on
     Windows (`<drive>:/cxx_app`, inside the `android {}` block of
     `android/app/build.gradle`). To override where that goes, set the
     `UNITY_CXX_STAGING_DIR` environment variable to a short path before building.
  Optionally also enable long paths globally: `git config --system core.longpaths true`
  and set `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled=1`.
- **JDK version.** The build is sensitive to the Java version. If you hit Java/Gradle
  version errors, align your JDK with the one known to work for this project (a
  teammate had to downgrade their JDK). Point `JAVA_HOME` at that JDK, or let Android
  Studio's embedded JDK drive the build.

---

## Step 1 — Place the Unity export locally

The export is **git-ignored** (≈1.5 GB) and transferred as a **zip**, not through git.
Unzip it so the final layout under the app repo is exactly:

```
visittm/
  unity/
    builds/
      android/
        unityLibrary/      ← the exported Unity library
        shared/            ← common.gradle + keepUnitySymbols.gradle (needed by unityLibrary)
        build.gradle
        settings.gradle
        gradle.properties
        local.properties
```

> The stock `@azesmway/react-native-unity` plugin hardcodes
> `../unity/builds/android/unityLibrary`, so the path above is not optional — the
> `unityLibrary/` folder must land exactly there. `shared/` must sit next to it
> (`unityLibrary/build.gradle` applies `../shared/common.gradle`).

### Quick sanity check

```bash
ls unity/builds/android/unityLibrary/build.gradle   # exists
ls unity/builds/android/shared/common.gradle        # exists
```

If either is missing, re-check the zip contents against the layout above.

---

## Step 2 — The Unity integration is already wired (nothing to edit)

`@azesmway/react-native-unity` is already configured through `app.json` → `plugins`:

1. `@azesmway/react-native-unity` — the stock plugin (includes `:unityLibrary`, adds
   the `flatDir` repo, gradle properties and `strings.xml` entry).
2. `./plugins/withUnityArcore` — a local supplementary plugin that:
   - includes the ARCore `:unityLibrary:xrmanifest.androidlib` submodule;
   - ensures `android.useAndroidX` / `android.enableJetifier` are on;
   - **strips the export's hardcoded Windows `C:/...` SDK/NDK/JDK paths** so the build
     uses *your* machine's SDK/NDK.

You do **not** need to hand-edit any Gradle files. The plugins re-apply on every
prebuild.

---

## Step 3 — Prebuild and run on a device

From the app repo root:

```bash
npx expo prebuild --clean     # regenerate android/ with the Unity plugins applied
npx expo run:android          # build + install on the connected device
```

> Use a **connected, ARCore-capable physical device**. A geospatial AR scene will not
> run on an emulator.

In the app: open the **Home** tab and tap **Open AR** to launch the full-screen Unity
AR view. Tap **Close** (or use the Android back button) to return — leaving the screen
hides the (persistent) Unity surface and suspends the AR session; it does **not** unload
the engine (see Runtime / UaaL notes below).

---

## Step 4 — Expect a slow first build (IL2CPP)

The Unity library's `buildIl2Cpp` Gradle task compiles Unity's C++ output into
`libil2cpp.so` for `arm64-v8a`. This is **CPU-heavy and slow the first time**, and it
requires the Unity Android toolchain (SDK/NDK/OpenJDK) on this machine. Later
incremental builds are faster because the IL2CPP output is cached.

---

## Step 5 — Save the result (so future builds can skip Unity)

After a successful build, the compiled artifacts exist under the generated `android/`
tree. Copy them into the tracked `unity/prebuilt/` folder:

```bash
cp android/unityLibrary/build/outputs/aar/unityLibrary-release.aar unity/prebuilt/
cp android/unityLibrary/src/main/jniLibs/arm64-v8a/libil2cpp.so    unity/prebuilt/
```

`unity/prebuilt/` **is** committed to git (unlike `unity/builds/`). The idea: a later
build — including one on the **Linux dev machine**, which cannot run Unity's Windows
IL2CPP compiler — could consume this prebuilt `.aar` instead of recompiling.

> ⚠️ **Not implemented yet:** wiring the app to **consume** the prebuilt `.aar` is a
> **future** step. Capturing the files now just preserves the output. Today's build
> still comes from the full export in `unity/builds/android/`.

---

## Runtime / UaaL notes

A few things about how the embedded Unity (Unity-as-a-Library) behaves at runtime, and
why the integration is shaped the way it is:

- **No duplicate launcher icon / no standalone Unity entry point.** The ARCore export was
  produced as a *standalone* Unity app, so its library manifest
  (`unity/builds/android/unityLibrary/src/main/AndroidManifest.xml`) declared LAUNCHER/MAIN
  and `ar_gara_apk3` deep-link `<intent-filter>`s on both Unity activities. Those put a
  second "visittm" icon on the device and let Unity open as its own app. The
  `withUnityArcore` plugin now strips exactly those two intent-filter kinds from both
  activities (leaving the activities, their meta-data, the ARCore API key, permissions and
  `uses-feature` intact). Unity is rendered only *in-process*, inside the RN `/ar` screen,
  via the `@azesmway/react-native-unity` wrapper.

- **Unity can only boot once per process → ONE persistent UnityView, never unloaded
  (Option B).** Unity-as-a-Library cannot be re-initialized within the same process. An
  earlier design unloaded Unity on leaving `/ar` (`UnityPlayer.unload()` via a
  `useFocusEffect` cleanup) and reinitialized it on re-entry. For this ARCore/geospatial
  build that **crashed the app on the second open**: Unity never reports
  `onUnityPlayerUnloaded`, so the wrapper deferred the second create (blank screen) and,
  after a 5 s safety-net timeout, booted a SECOND `UnityPlayer` in the same process — which
  UaaL does not support. (Full root-cause trace:
  `.agents/tasks/ar-reopen-crash-investigation.md`.)

  The fix mounts a **single `<UnityView>` once**, in `UnityArProvider`
  (`src/components/unity-ar-host.tsx`), as a sibling of the router `<Stack>` in
  `src/app/_layout.tsx`. It is **never unmounted** between AR sessions, so `unloadUnity()`
  is never called on navigation and the reinit crash path cannot occur. The `/ar` screen
  (`src/app/ar.tsx`) is just a controller: on focus it reveals the surface; on blur it
  hides it (kept mounted via `opacity: 0` + off-screen + `pointerEvents="none"`). The
  provider also sets the wrapper's `androidKeepPlayerMounted` prop so Android window-blur
  pauses rather than tears down. The Close button lives in the provider overlay (layered
  above the native surface so it stays tappable) and calls `router.back()`.

- **Explicit hold/resume signals → requires the Unity-side `ReactNativeBridge` handler.**
  Because the persistent surface is only *covered* (not unmounted) when leaving `/ar`, the
  wrapper's automatic window-focus pause does not fire. So on blur/focus the RN side sends
  explicit signals to Unity via `postMessage`:
  `postMessage('ReactNativeBridge', 'OnHostMessage', 'hold')` on leave and `'resume'` on
  return. These drive a C# handler in the Unity project
  (`Unihack_2026_AR_QR_AND_DISTANCE/Assets/ReactNativeBridge.cs`) that suspends/resumes the
  AR session, camera feed and Cesium tiles. Contract doc:
  `Unihack_2026_AR_QR_AND_DISTANCE/REACT_NATIVE_BRIDGE_CONTRACT.md`.

  > ⚠️ **This handler must be in the Unity export you build from.** `ReactNativeBridge.cs`
  > lives in the Unity project, not in `unity/builds/`. If you build from an export zip
  > produced **before** that script was added, the `ReactNativeBridge` GameObject will not
  > exist: `hold`/`resume` are delivered to nothing (no crash, but the camera is not
  > released on leave and AR does not resume on return). **Re-export the Unity Android
  > project after confirming `ReactNativeBridge.cs` compiles**, then re-place it at
  > `unity/builds/android/` (Step 1) before prebuilding.

- **If returning-to-RN instability persists (Phase 2, NOT done yet).** If, after an
  on-device retest, re-entering AR is still unstable, the next step is to run Unity in a
  *separate Android process* (so each AR session gets a fresh process and the once-per-
  process limit no longer bites). That is **not implemented** — there is intentionally no
  `android:process` configuration anywhere yet. Treat it as the fallback only if the
  persistent-instance approach above proves insufficient in testing.

---

## Troubleshooting

- **Gradle can't find the SDK / NDK, or complains about a `C:/...` path:** the config
  plugin removes the export's hardcoded Windows paths, so the build relies on *your*
  SDK/NDK. Set `ANDROID_HOME` (or add `sdk.dir=...` to `android/local.properties`) and
  install a matching NDK, then re-run `npx expo prebuild --clean`.
- **IL2CPP task fails referencing `unity.androidSdkPath` / `unity.androidNdkPath`:**
  those Windows keys are stripped, and the config plugin rewrites the IL2CPP task to
  resolve the SDK/NDK from *your* machine instead: the SDK from `sdk.dir`
  (`android/local.properties`) or `ANDROID_HOME`/`ANDROID_SDK_ROOT`, and the NDK from
  `<sdk>/ndk/<ndkVersion>` (the `ndkVersion` AGP already installs). So no `-P` flags are
  needed — just ensure the SDK is discoverable and a matching NDK is installed, then
  re-run `npx expo prebuild --clean`. If it still fails, check that
  `android/local.properties` has a valid `sdk.dir` (or `ANDROID_HOME` is set) and that
  the NDK version named in `unity/builds/android/unityLibrary/build.gradle` (`ndkVersion`)
  is installed under `<sdk>/ndk/`.
- **Build runs out of memory (`Java heap space`, often during `JetifyTransform`):** the
  config plugin sets `org.gradle.jvmargs=-Xmx6144m`; this needs ~8 GB+ free RAM. Close
  the Unity Editor and other heavy apps while building. If it still OOMs, tell the
  maintainer — disabling Jetifier (`android.enableJetifier=false`) is the next step to
  test, since modern RN/Expo don't need it.
- **`xrmanifest.androidlib` project not found:** confirm
  `unity/builds/android/unityLibrary/xrmanifest.androidlib/` exists in the unzipped
  export, then re-run prebuild (the local plugin includes that submodule).
- **This does not build on Linux.** The export's IL2CPP compiler is a Windows `.exe`;
  the Linux dev machine only ships the integration code. Do the Android build on a
  machine with the Unity Android toolchain.
- **`unity/builds/` shows up in git status:** it should be ignored. Check `.gitignore`
  still has the `unity/builds/` entry; never commit the raw export.
- **`Failed to apply plugin 'com.facebook.react.rootproject'` →
  `Could not set unknown property 'react.newArchEnabled' for project
  ':unityLibrary:xrmanifest.androidlib'`:** React Native's root project plugin sweeps
  every Gradle subproject and calls `setProperty("react.newArchEnabled", ...)` on each
  one; that throws on the plain `com.android.library` Unity modules, which have no such
  settable property. The config plugin (`plugins/withUnityArcore.js`) fixes this by
  injecting a small `ext { set('react.newArchEnabled', 'true'); set('newArchEnabled',
  'true') }` shim (marked with the `expo-unity-newarch-shim` sentinel) into both
  `unity/builds/android/unityLibrary/build.gradle` and
  `unity/builds/android/unityLibrary/xrmanifest.androidlib/build.gradle`. If you see
  this error after a **fresh Unity re-export** (which overwrites those files and drops
  the shim), just re-run `npx expo prebuild --clean` — prebuild re-applies the shim.
