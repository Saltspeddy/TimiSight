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
- A **physical, ARCore-capable Android device** connected over USB with USB debugging
  on. An emulator will not do geospatial AR.
- The **Unity export** placed locally (next step).

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
unloads the Unity engine.

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

## Troubleshooting

- **Gradle can't find the SDK / NDK, or complains about a `C:/...` path:** the config
  plugin removes the export's hardcoded Windows paths, so the build relies on *your*
  SDK/NDK. Set `ANDROID_HOME` (or add `sdk.dir=...` to `android/local.properties`) and
  install a matching NDK, then re-run `npx expo prebuild --clean`.
- **IL2CPP task fails referencing `unity.androidSdkPath` / `unity.androidNdkPath`:**
  those keys were stripped on purpose (they pointed at a nonexistent `C:/` path). If
  the task still needs them, pass your own paths as Gradle properties, e.g.
  `npx expo run:android -- -Punity.androidSdkPath=$ANDROID_HOME -Punity.androidNdkPath=/path/to/ndk`.
- **`xrmanifest.androidlib` project not found:** confirm
  `unity/builds/android/unityLibrary/xrmanifest.androidlib/` exists in the unzipped
  export, then re-run prebuild (the local plugin includes that submodule).
- **This does not build on Linux.** The export's IL2CPP compiler is a Windows `.exe`;
  the Linux dev machine only ships the integration code. Do the Android build on a
  machine with the Unity Android toolchain.
- **`unity/builds/` shows up in git status:** it should be ignored. Check `.gitignore`
  still has the `unity/builds/` entry; never commit the raw export.
