# `unity/prebuilt/` — captured Unity build output (future use)

This folder is a placeholder for the **compiled** Unity Android artifacts, so the app
can one day be rebuilt **without** running Unity's IL2CPP toolchain.

## What will live here (later)

After a successful Android build on a machine with the full Unity Android toolchain
(see [`BUILD_ANDROID.md`](../../BUILD_ANDROID.md)), these will be copied in:

- `unityLibrary-release.aar` — the compiled Unity library
  (from `android/unityLibrary/build/outputs/aar/unityLibrary-release.aar`)
- `libil2cpp.so` (arm64-v8a) — the IL2CPP native library
  (from `android/unityLibrary/src/main/jniLibs/arm64-v8a/libil2cpp.so`)

Capturing these means a later build — including one on a Linux dev machine that
**cannot** run Unity's Windows IL2CPP compiler — could consume the prebuilt `.aar`
instead of recompiling from `unity/builds/`.

## Status: NOT implemented yet

Wiring the app to **consume** a prebuilt `.aar` is a **future** step and is not done.
Right now the build still comes from the full export under `unity/builds/android/`.

## Why this folder IS tracked in git

Unlike `unity/builds/` (≈1.5 GB raw export, git-ignored and shipped as a zip), the
captured artifacts here are the small, reusable outputs we want in version control.
`.gitignore` intentionally does **not** ignore `unity/prebuilt/`.
