# AR re-open crash investigation — root cause & fix options

Investigation date: read-only trace of the shipped code on branch `main`.
Scope: why opening `/ar` a **second time** in the same app session renders nothing and then crashes the whole app after ~5 seconds.

---

## 1. Summary answer (read this first)

**The user's hypothesis is only partly right.** The *close* path is wired to a real **unload**, not a pause/sleep. On a React unmount the wrapper calls `unloadUnity` → `UnityPlayer.unload()` (not `.pause()`, not `.quit()`, not `.destroy()`). So "we put Unity to sleep instead of unloading it" is **refuted by the code** — pausing only happens on window-blur while the player stays mounted, which is not what the close button does.

**The real mechanism of the second-open failure is a race between an asynchronous unload and the synchronous second mount, resolved by a 5-second timeout that lines up exactly with the observed "~5s then crash".** Concretely:

1. `unload()` is asynchronous. Unity reports completion later via `onUnityPlayerUnloaded()`. The wrapper sets `_isUnityUnloading = true` the instant you leave `/ar`.
2. When you re-enter `/ar`, `createPlayer()` sees `_isUnityUnloading == true`, so it **does not create a player**. It just stashes the request in `_pendingActivity`/`_pendingCallback` and returns. That is why the **second screen renders nothing** (no Unity frame is ever attached).
3. The pending request is only replayed from `onPlayerGone(false)`, which fires either when Unity finally calls `onUnityPlayerUnloaded()` **or** when the **5000 ms `UNLOAD_TIMEOUT_MS` safety-net** elapses. With Unity 6 geospatial/ARCore, `onUnityPlayerUnloaded` frequently never arrives (UaaL's documented once-per-process limitation — the GL/EGL context and ARCore session do not cleanly tear down), so the 5 s timer is what fires.
4. When the pending create is replayed, it tries to build a **second `UnityPlayer` in the same process**. Unity-as-a-Library does **not** support this; the native boot of a second player on a process whose first EGL/ARCore/IL2CPP runtime was never fully released crashes the process. That crash lands **~5 s after the second open** — matching the report precisely.

So the dominant cause is **"Unity-as-a-Library cannot be re-initialized once per process"**, surfaced through the wrapper's unload-timeout path. The `_isUnityQuit` guard the docs lean on is **not** what triggers here (nothing quits on the close path), so that guard does **not** protect you — it only covers the standalone-launcher case the `withUnityArcore` plugin already removed.

Everything below is **confirmed from source** unless explicitly marked **(inference)** — the native runtime could not be executed in this Linux read-only environment.

---

## 2. What the "close AR" path actually does (confirmed from source)

Trace, JS → native:

- `src/app/ar.tsx` renders `<UnityView ref={unityRef} fullScreen />` and registers a `useFocusEffect` cleanup that calls `unityRef.current?.unloadUnity?.()`. On `router.back()` the screen both loses focus and unmounts.
- `node_modules/@azesmway/react-native-unity/.../UnityView` (both `src/UnityView.tsx` and the shipped `lib/module/UnityView.js`):
  - `unloadUnity()` → `Commands.unloadUnity(ref)`.
  - `componentWillUnmount()` → `Commands.unloadUnity(ref)` as well.
  - So the close path fires `unloadUnity` **twice** (once from the focus-effect cleanup, once from unmount). This is harmless on its own (see the `_isUnityUnloading` guard below) but confirms the intent is unload, not pause.
- `ReactNativeUnityViewManager.receiveCommand` → `case "unloadUnity": unloadUnity(view)` → `if (isUnityReady()) unload();`
- `ReactNativeUnity.unload()`:

  ```java
  public static void unload() {
      if (unityPlayer == null || _isUnityUnloading) { return; }
      _isUnityUnloading = true;
      _isUnityReady = false;
      _isUnityPaused = false;
      final UPlayer player = unityPlayer;
      player.unload();                       // <-- UnityPlayer.unload(), asynchronous
      new Handler(...).postDelayed(... UNLOAD_TIMEOUT_MS ...); // 5000 ms safety net
  }
  ```

- `UPlayer.unload()` → `unityPlayer.unload();` where `unityPlayer` is the reflected `com.unity3d.player.UnityPlayer` (or `UnityPlayerForActivityOrService`).

**Conclusion:** close = `UnityPlayer.unload()`. Not pause, not quit, not destroy. The second `unloadUnity` is a no-op because `_isUnityUnloading` is already true. **(confirmed from source)**

Pause only happens elsewhere: `ReactNativeUnityView.onWindowFocusChanged` pauses on blur **only when `keepPlayerMounted` is true**, and `ar.tsx` does not set `androidKeepPlayerMounted`, so it defaults to `false`. `onHostPause` (app backgrounded) also pauses. Neither is the close-AR path.

---

## 3. Why the SECOND open renders nothing, then crashes ~5 s later

### 3a. Nothing renders (confirmed from source)

On the second mount, `ReactNativeUnityViewManager.createViewInstance` runs:

```java
if (getPlayer() != null) { view.setUnityPlayer(getPlayer()); }
else { createPlayer(context.getCurrentActivity(), callback); }
```

`getPlayer()` returns `null` while `_isUnityReady == false` (it was set false in `unload()`), so the `else` branch runs `createPlayer`. Inside `createPlayer`:

```java
if (_isUnityQuit) { return; }          // not the case on the unload path
if (_isUnityUnloading) {               // <-- THIS is true on the 2nd open
    _pendingActivity = activity;
    _pendingCallback = callback;
    return;                            // no player built => no frame attached => blank screen
}
```

So when you re-open `/ar` before the first unload finished, the wrapper **defers** creation and returns. No Unity surface is added to the view group, so the second AR screen is **blank**. **(confirmed from source)**

### 3b. The ~5 s crash — ranked causes

**Cause #1 (most likely): second `UnityPlayer` instantiation in the same process after the unload-timeout replays the pending create.** **(confirmed-from-source for the control flow; native crash is inference)**

The deferred request is replayed only from `onPlayerGone(false)`:

```java
private static void onPlayerGone(boolean quit) {
    _isUnityReady=false; _isUnityPaused=false; _isUnityUnloading=false; _isUnityCreating=false;
    unityPlayer=null;
    final Activity activity=_pendingActivity; final UnityPlayerCallback callback=_pendingCallback;
    _pendingActivity=null; _pendingCallback=null;
    if (quit) { _isUnityQuit=true; return; }
    if (activity!=null && callback!=null) { createPlayer(activity, callback); } // replay
}
```

`onPlayerGone(false)` is called from two places:
- `wrapCallback(...).onUnload()` — i.e. when Unity actually delivers `onUnityPlayerUnloaded()`.
- the **5000 ms timeout** in `unload()`: `"Unity did not report onUnityPlayerUnloaded within 5000ms — releasing the player anyway"` → `onPlayerGone(false)`.

For a Unity 6 ARCore/geospatial (Cesium) scene, `onUnityPlayerUnloaded()` is unreliable/absent after `unload()` (UaaL cannot fully release the GL context + ARCore session in-process). **(inference, consistent with Unity's documented UaaL "one load per process" limitation and the project's own BUILD_ANDROID.md.)** So the **timeout path** fires ~5 s after close. If the user re-opened quickly, the replayed `createPlayer` then builds a brand-new `UPlayer`/`UnityPlayer` while the previous Unity native runtime (il2cpp, EGL, ARCore) was never truly torn down → native crash of the whole process. The 5 s delay is the smoking gun that this timeout is involved.

Note a second-order effect: `_isUnityUnloading` is cleared **only** inside `onPlayerGone`. Until the 5 s timer (or a real unload callback) fires, every re-open just keeps overwriting `_pendingActivity/_pendingCallback` and returns blank. So the sequence "blank for ~5 s, then crash" is exactly what the state machine produces. **(confirmed from source)**

**Cause #2 (plausible, may be the actual fatal signal): reused/destroyed native GL `SurfaceView` / EGL context.** **(inference)** Even if a second `UnityPlayer` is constructed, Unity static state and the single process-wide EGL context from the first run are still half-alive. `addUnityViewToGroup`/`addUnityViewToBackground` re-parent the player's `FrameLayout`; attaching a surface backed by a destroyed/!current EGL context is a classic native SIGSEGV. This would manifest as the same ~5 s crash once the pending create replays.

**Cause #3 (contributing, not primary): `UPlayer.unityPlayer` is `static`.** `private static UnityPlayer unityPlayer;` in `UPlayer.java` is **never nulled** by `unload()` — only `ReactNativeUnity.unityPlayer` (the `UPlayer` wrapper) is nulled in `onPlayerGone`. So the raw `com.unity3d.player.UnityPlayer` instance from run #1 lingers as a static until a new `UPlayer` overwrites it in its constructor. This is a stale-reference/leak that makes a clean second boot even less likely. **(confirmed from source)**

**Cause #4 (ruled out as the trigger here): the `_isUnityQuit` guard.** It is set **only** via `onPlayerGone(true)`, reached from `onQuit()` (Unity `onUnityPlayerQuitted`) or `destroy()`/`onHostDestroy`. The close-AR path calls none of these, so `_isUnityQuit` stays false and does **not** block the second open. The docs' claim that stripping the launcher activity "prevents the quit-poisoned state" is correct for the *old* standalone-launcher bug, but it does **not** address the unload-reinit race that remains. **(confirmed from source)**

### Ranking
1. **Second in-process `UnityPlayer` boot after the 5 s unload-timeout** (control flow confirmed; fatal native crash inference). Best matches "blank then ~5 s crash".
2. **Dead EGL/Surface/ARCore context reused** (inference) — likely the concrete native signal behind #1.
3. **Static `UPlayer.unityPlayer` never nulled** (confirmed) — aggravating leak.
4. **`_isUnityQuit` guard** — not the trigger on this path (confirmed).

---

## 4. Is the user's "pause instead of unload" hypothesis correct?

**No — refuted by code.** The close path unloads (`UnityPlayer.unload()`), it does not pause/sleep. Pause (`_isUnityPaused`, `UnityPlayer.pause()`) is reached only on window blur with `keepPlayerMounted==true` (not set here) or on `onHostPause` (app backgrounded). The user's memory of "put Unity to sleep" likely conflates the window-focus pause logic with the close path, or refers to a previous session's wiring that has since been changed. The genuine problem is not *that it doesn't unload* but *that a clean unload + fresh re-init is not actually achievable in one process for this ARCore build*, and the wrapper's async-unload/timeout state machine turns that into a blank screen followed by a ~5 s crash.

---

## 5. Other contributing reasons

- **Unity UaaL once-per-process limitation.** The wrapper's own comments and `BUILD_ANDROID.md` acknowledge Unity cannot reliably re-init in-process. `unload()`/reload is officially fragile for ARCore + geospatial (native ARCore session + EGL). **(inference, well-documented upstream behavior.)**
- **New Architecture / Fabric view recycling.** `app.json` has no `newArchEnabled` key, and the `withUnityArcore.js` comment states RN 0.82+ no longer lets you disable new arch app-wide — so on Expo 58 / RN 0.88 this runs on **Fabric**. `UnityView.componentWillUnmount` references issue #180 and warns that Fabric *recycles* views (pause) vs *unmounts* (unload). The Java manager here has **no `prepareForRecycle` override**, only `onDropViewInstance` (which nulls the static `view`). Fabric view recycling across the two mounts could additionally confuse which `ReactNativeUnityView` the async `onReady` attaches to. `createViewInstance`'s `onReady` re-reads `ReactNativeUnityViewManager.view`, which partially mitigates this, but it is another source of nondeterminism on the second mount. **(inference.)**
- **Static `UPlayer.unityPlayer` never cleared** (see Cause #3). **(confirmed.)**
- **No `android:process`.** Confirmed there is **no** `android:process` anywhere in the repo (grep found none) and the Unity export manifest is not even present on `main` (it is gitignored, on the colleague's branch). So every AR session shares the one app process — the exact condition under which UaaL re-init fails. **(confirmed from source for the absence; the export manifest could not be inspected on this branch.)**
- **The patch is irrelevant to lifecycle.** `patches/@azesmway+react-native-unity+1.1.1.patch` only removes `jcenter()` from the wrapper's `android/build.gradle`. Nothing lifecycle-related is patched. **(confirmed from source.)**

---

## 6. Fix options with tradeoffs (nothing implemented)

### Option A — Make the wrapper truly unload + reinit cleanly
Rework `ReactNativeUnity`/`UPlayer` so the first runtime is fully released (null the **static** `UPlayer.unityPlayer`, ensure EGL/ARCore teardown) before a second `createPlayer`.
- Files: `node_modules/@azesmway/react-native-unity/android/.../ReactNativeUnity.java`, `UPlayer.java` (via `patches/`).
- Risk: **High.** It fights Unity's documented once-per-process limit; even perfect wrapper code may not make UnityPlayer#2 bootable on a process that already ran ARCore. Likely to remain flaky. Not recommended as the primary fix.

### Option B — Keep ONE persistent UnityView mounted; show/hide instead of unmount (recommended short-term)
Mount `<UnityView>` once high in the tree (or a persistent AR host) and toggle visibility / navigate without unmounting. Set `androidKeepPlayerMounted` so blur pauses rather than tears down; never call `unloadUnity` between sessions. This sidesteps re-init entirely — Unity boots once and is paused/resumed.
- Files: `src/app/ar.tsx` (stop unmounting / stop calling `unloadUnity`), app layout/router (`src/app/_layout.tsx` or a persistent host component), pass `androidKeepPlayerMounted`.
- Tradeoffs: Unity stays resident in memory for the whole session (higher RAM, camera/ARCore held or paused); need to manage camera/session pause so ARCore releases the camera when hidden. Lowest risk, matches how the wrapper is actually designed to be reused (the `keepPlayerMounted` + pause/resume code paths exist for exactly this). **Recommended first attempt.**

### Option C — Run Unity in a separate `android:process` (the docs' Phase-2 fallback)
Give the Unity activity/host its own process so each AR session is a fresh process and the once-per-process limit resets.
- Files: a config plugin change to add `android:process=":unity"` to the Unity host/activities in the generated manifest (extend `plugins/withUnityArcore.js`), plus IPC for RN↔Unity messaging across the process boundary (the current `UnitySendMessage`/event bridge assumes same process).
- Tradeoffs: **High effort**, cross-process messaging rework, slower AR cold-start each time, more memory churn. Most robust for true repeated sessions. Matches what `BUILD_ANDROID.md` explicitly reserves as the fallback. Consider if B's single-session residency is unacceptable.

### Option D — Reduce the race / improve diagnostics (cheap, complementary)
Even with B or C, the async-unload/timeout state machine is brittle. Complementary tweaks: block navigation back into `/ar` until `onPlayerUnload` fires (listen to the `onPlayerUnload` event the manager already emits), or lower/raise `UNLOAD_TIMEOUT_MS` and surface the "released anyway" warning. Also null `UPlayer.unityPlayer` in teardown.
- Files: `src/app/ar.tsx` (gate re-entry on `onPlayerUnload`), `patches/` for the Java null-out.
- Tradeoffs: Low risk, but a mitigation, not a cure — does not overcome the UaaL limit by itself.

**Recommendation:** try **Option B** first (keep one persistent, paused Unity instance — it aligns with the wrapper's `keepPlayerMounted`/pause-resume design and is the lowest-risk real fix). Keep **Option C** (`android:process`) as the robust fallback the docs already anticipated. Layer **Option D** regardless for a less racy re-entry.

---

## 7. Evidence index (file : symbol)

- `src/app/ar.tsx` — `useFocusEffect` cleanup → `unityRef.current?.unloadUnity?.()`; relies on `componentWillUnmount`.
- `.../react-native-unity/src/UnityView.tsx` & `lib/module/UnityView.js` — `unloadUnity()`, `componentWillUnmount()` both call `Commands.unloadUnity`; comment re Fabric recycle (issue #180).
- `ReactNativeUnityViewManager.java` — `createViewInstance` (create/attach), `receiveCommand` (`unloadUnity`→`unload()`), `onDropViewInstance` (nulls static `view`), `onHostDestroy`→`destroy()`, pause/resume, no `prepareForRecycle`.
- `ReactNativeUnity.java` — `_isUnityUnloading`, `_isUnityQuit`, `_isUnityCreating`; `createPlayer` (defers on `_isUnityUnloading`, refuses on `_isUnityQuit`); `unload()` (async + 5000 ms `UNLOAD_TIMEOUT_MS`); `onPlayerGone` (replays `_pendingActivity/_pendingCallback`).
- `UPlayer.java` — `private static UnityPlayer unityPlayer;` never nulled on unload; `unload()`→`unityPlayer.unload()`; `destroy()`→`unityPlayer.destroy()`.
- `plugins/withUnityArcore.js` — strips LAUNCHER + `ar_gara_apk3` intent-filters; no `android:process`.
- `patches/@azesmway+react-native-unity+1.1.1.patch` — only removes `jcenter()`.
- `BUILD_ANDROID.md` "Runtime / UaaL notes" — claims clean-unload resets state and reserves `android:process` as un-implemented Phase 2. The docs' claim that stripping the launcher makes re-entry work is **incomplete**: it fixes the quit-poison case but not the unload-reinit race.
- Environment: branch `main`; `visittm/android/` absent (gitignored, on colleague's branch); Unity export manifest absent on this branch; Expo `~58.0.23`, RN `0.88.1`, `@azesmway/react-native-unity ^1.1.1` (Fabric/new-arch forced).

---

## 8. What could NOT be verified here (read-only, Linux)
- The actual native crash signal (SIGSEGV/abort) — no device/logcat. Causes #1/#2 are inference from control flow + known UaaL behavior.
- Whether `onUnityPlayerUnloaded()` ever fires for this specific ARCore/Cesium build — strongly suspected not to (hence the 5 s timeout), but needs an on-device logcat capture to confirm. Look for the log line `"Unity did not report onUnityPlayerUnloaded within 5000ms"` to confirm the timeout path is what precedes the crash.
- The Unity export `AndroidManifest.xml` contents (not on `main`) — to confirm remaining activities/meta-data and the absence of `android:process` in the generated app. If deeper manifest analysis is needed, switch to the colleague's branch that carries the compiled `android/` + export.
