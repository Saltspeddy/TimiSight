# Exporting the Unity AR project as an Android library (`unityLibrary`)

This guide produces the **`unityLibrary`** Android module that the React Native app
(`visittm`) will embed. You run this in the **Unity project** (`Unihack_2026_AR`).

**Goal of this document:** go from a working Unity project to a committed
`unityLibrary` folder inside this repo. It stops at the `unityLibrary` — wiring it
into the React Native app is a separate step handled on the app side.

> **Who this is for:** a teammate who already has the full toolchain working
> (Unity 6, Android Build Support incl. OpenJDK + Android SDK & NDK, Git LFS, a
> working Cesium package, and the ARCore/Cesium API keys configured). If any of
> those are missing, fix them first — a broken dependency makes the export fail.

---

## Prerequisites (confirm before starting)

- **Unity `6000.3.27f2`** with **Android Build Support** (OpenJDK + Android SDK & NDK Tools).
- **Git LFS** installed and `git lfs pull` already run, so `Assets/3DMODELS` are real
  files and not tiny pointer stubs (otherwise models render pink/broken).
- **Cesium** package resolves and the project compiles with no console errors.
- **API keys set:**
  - **ARCore Geospatial / Google Cloud API key** — *Edit → Project Settings →
    XR Plug-in Management → ARCore Extensions*. If this is empty the export itself
    fails, because `GeospatialPreprocessBuild.cs` validates it at build time.
  - **Cesium ion token** — *Window → Cesium*.
- The project **opens and enters Play mode without compile errors.**

---

## Step 1 — Get the React Native bridge files (from the app repo)

The Unity side of the bridge is a small set of **C# + Unity settings files** that
ship *inside* the npm package `@azesmway/react-native-unity`. They are plain Unity
files; npm is only the delivery mechanism. You are **not** adding `node_modules` or
npm to the Unity project.

These files live in the app repo (`visittm`), not here. Someone with the app repo
needs to install the package once so the folder exists on disk:

```bash
# Run in the visittm (Expo) project — Expo SDK 58 / RN 0.88
npx expo install @azesmway/react-native-unity
```

That creates:

```
visittm/node_modules/@azesmway/react-native-unity/unity/
```

If you already have this folder (committed, zipped, or shared by the person who set
up the app), you don't need to install anything — you just need its **contents**.

---

## Step 2 — Copy the bridge files into the Unity project root

Copy the **contents** of that `unity/` folder into the **root** of this Unity
project (`Unihack_2026_AR/`, the folder that contains `Assets/`, `Packages/`,
`ProjectSettings/`).

```
visittm/node_modules/@azesmway/react-native-unity/unity/*
            │  copy the CONTENTS
            ▼
Unihack_2026_AR/            ← paste here (next to Assets/, Packages/)
```

After copying, reopen or refocus Unity so it imports the new files. Confirm there
are **no new compile errors** in the Console.

> These files add the glue that lets React Native tell Unity which scene/landmark to
> load, and lets Unity tell React Native when the AR view is closed. Without them the
> export still builds, but the app can't talk to it.

---

## Step 3 — Switch to the Android platform

1. **File → Build Profiles** (Unity 6 renamed "Build Settings" to "Build Profiles").
2. Select the **Android** platform.
3. Click **Switch Platform** if it isn't already the active target. First switch can
   take a while (it reimports assets for Android).

---

## Step 4 — Player Settings (required for Unity-as-a-Library)

Open **Player Settings** (button in Build Profiles, or *Edit → Project Settings →
Player*), Android tab:

- **Scripting Backend = IL2CPP** — *required*. Mono does not work for
  Unity-as-a-Library. (Configuration → Scripting Backend)
- **Target Architectures = ARM64 only** — tick **ARM64**, untick **ARMv7**.
  (64-bit is required for real devices / Play Store and keeps the export smaller.)
- Leave the rest as the project already has it (package name, min SDK, etc.).

Confirm **`GeospacialDemo.unity`** is the scene that will be included
(*Build Profiles → Scene List* / "Scenes In Build"). It is the only scene, so it
must be present and ticked.

---

## Step 5 — Enable "Export Project" and export

1. In **Build Profiles → Android**, tick **Export Project**.
   - With this **on**, Unity writes out a **Gradle project** (a folder) instead of a
     finished `.apk`/`.aab`.
2. Click **Export**.
3. When asked for an output folder, export to a **temporary/scratch location first**
   (e.g. `~/unity-export/`), *not* straight into the repo. We copy only the piece we
   need in the next step. The export produces two Gradle modules:
   - `launcher/` — a throwaway wrapper app. **We do not use this.**
   - `unityLibrary/` — **this is the library we keep.**

---

## Step 6 — Place `unityLibrary` inside THIS repo (for git)

We commit the exported library into the Unity repo so the app can pull/import it from
git. Copy **only** the `unityLibrary` folder out of your scratch export into this repo
under a top-level `AndroidExport/` folder:

```
Unihack_2026_AR/
  Assets/
  Packages/
  ProjectSettings/
  AndroidExport/
    unityLibrary/      ← paste the exported unityLibrary here
```

So the final path is:

```
Unihack_2026_AR/AndroidExport/unityLibrary/
```

> Keeping it under `AndroidExport/` (rather than loose at the repo root) keeps the
> export clearly separated from the Unity source. Do **not** copy the `launcher/`
> folder — only `unityLibrary/`.

### Quick sanity check — the folder should look roughly like:

```
AndroidExport/unityLibrary/
  build.gradle
  src/
    main/
      AndroidManifest.xml
      assets/            ← your scenes/models are baked in here (can be large)
      jniLibs/ (or libs/) ← native .so files, incl. arm64-v8a
  ...
```

If `unityLibrary/` has **no `src/main/assets`** and **no `.so` libraries**, the export
didn't finish correctly — re-run Step 5.

---

## Step 7 — Git LFS for the big binaries (important)

The export contains large binaries (native `.so` libraries, baked scene/model
assets). Track them with Git LFS so the repo stays usable:

```bash
# Run at the root of Unihack_2026_AR
git lfs install

git lfs track "AndroidExport/unityLibrary/**/*.so"
git lfs track "AndroidExport/unityLibrary/**/*.a"
# Unity bundles assets as .bundle / .resource / .obb-like files — track the big ones:
git lfs track "AndroidExport/unityLibrary/src/main/assets/**"

git add .gitattributes
git add AndroidExport/unityLibrary
git commit -m "Add Android unityLibrary export"
git push
git lfs push --all origin   # make sure the LFS blobs actually upload
```

> Double-check `git lfs status` before pushing. If teammates pull and see tiny text
> files instead of real binaries, they need `git lfs pull`.

---

## Done — what you've produced

```
Unihack_2026_AR/AndroidExport/unityLibrary/   ← committed, pullable from git
```

Hand this off / confirm it's pushed. The React Native app will reference this
`unityLibrary` from git in the next phase (that wiring is done on the app side and is
not part of this document).

---

## Troubleshooting

- **Export fails mentioning ARCore / API key / `GeospatialPreprocessBuild`:** the
  ARCore Geospatial API key is empty or invalid — set it in *Project Settings → XR
  Plug-in Management → ARCore Extensions* and re-export.
- **Compile errors after Step 2:** the bridge files didn't import cleanly, or there's
  a pre-existing error. Fix all Console errors before exporting — you can't export a
  project that doesn't compile.
- **Cesium errors on open:** the Cesium package path isn't resolving on this machine.
  Resolve Cesium first; the export can't succeed if the project won't compile.
- **Pink / missing 3D models:** `git lfs pull` wasn't run in the Unity project.
- **`unityLibrary` is tiny / missing `assets` or `.so`:** the export was interrupted
  or Scripting Backend wasn't IL2CPP. Recheck Step 4 and re-export.
- **Gradle/version mismatch warnings in the export:** expected for now — those are
  reconciled on the app side when the library is embedded, not here.
```
