# `unity/prebuilt/` — captured Unity build output

This folder holds the **compiled** Unity IL2CPP native library so the app can be
rebuilt **without** re-running Unity's IL2CPP toolchain (which is Windows-only in our
export and very slow). It is tracked in git via **Git LFS** (see the repo-root
`.gitattributes`).

## What's here

- `jniLibs/arm64-v8a/libil2cpp.so` — the compiled IL2CPP native library (arm64-v8a),
  ~90 MB, produced by a successful Android build on the Unity toolchain machine. This
  is the expensive output of the `buildIl2Cpp` Gradle task.

## How it's used

Before a build, this `libil2cpp.so` must sit at:

```
unity/builds/android/unityLibrary/src/main/jniLibs/arm64-v8a/libil2cpp.so
```

When it is already present there, Gradle's `buildIl2Cpp` task sees its output exists
and **skips** the IL2CPP compile — so a machine without the Unity IL2CPP toolchain
(e.g. a Linux dev box) can still assemble the app, as long as the Android SDK/NDK are
installed.

> Caveat: the skip depends on Gradle's up-to-date check. `expo prebuild --clean` or a
> changed input can still re-trigger `buildIl2Cpp`, which fails on a machine without
> the Unity toolchain. Treat this as "usually skips," not a guarantee.

### Restoring it after a fresh export unzip

`unity/builds/` is git-ignored and arrives as a zip without a compiled `libil2cpp.so`.
After unzipping a fresh export, copy this captured library back into place:

```bash
cp unity/prebuilt/jniLibs/arm64-v8a/libil2cpp.so \
   unity/builds/android/unityLibrary/src/main/jniLibs/arm64-v8a/libil2cpp.so
```

(If the captured `.so` and the fresh export's Unity C# ever diverge, this library is
stale — recapture it from a real build on the Unity toolchain machine.)

## Why this folder IS tracked in git

Unlike `unity/builds/` (≈1.5 GB raw export, git-ignored and shipped as a zip), the
captured `libil2cpp.so` is the small, reusable output we want in version control —
stored via Git LFS so the repo stays usable.
