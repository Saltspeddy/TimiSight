# Implementation Plan — Phase-1 UaaL runtime fix (visittm)

Scope: smallest-change-first fix for the Expo SDK 58 / RN 0.88 + Unity-as-a-Library
(`@azesmway/react-native-unity@1.1.1`) Android integration. The app builds and installs;
the bugs are at RUNTIME. Three tasks: (A) strip launcher/deep-link intent-filters from the
Unity export manifest via the existing config plugin; (B) harden the RN `/ar` screen
lifecycle; (C) document both in `BUILD_ANDROID.md`.

Hard constraints (do NOT violate):
- NO `android:process` / separate-process config anywhere (that is deferred Phase 2).
- Do NOT edit the generated `android/` folder (CNG). Native config goes through config plugins / `app.json`.
- Do NOT change `app.json` `name`/`slug`/`package`, nor unrelated screens/components.
- Do NOT remove the activities themselves, the `com.google.android.ar.API_KEY` meta-data, or any ARCore/Cesium/Unity meta-data, permissions, or `uses-feature`.
- Keep every plugin edit idempotent (sentinel / no-op-on-rerun), matching the existing `withUnityArcore.js` style.
- Files WE author (`plugins/withUnityArcore.js`, `src/app/ar.tsx`, `BUILD_ANDROID.md`) MUST be written with LF endings (root `.gitattributes` enforces `eol=lf`). NOTE: the Unity export manifest under `unity/builds/` currently has CRLF endings and is git-ignored — the Task A transform must TOLERATE and PRESERVE that file's existing EOL, not force-convert it.
- Work on branch `Integrate-Unity-Project`. Commit at the end; do NOT push.
- You cannot build/run here (no Android SDK; IL2CPP is Windows-only). Verification is: lint, typecheck, and an in-process Node simulation of the manifest transform.

## Verified context (confirm, don't re-derive)

Root cause of all four symptoms traces to the Unity export library manifest
`unity/builds/android/unityLibrary/src/main/AndroidManifest.xml`. It declares TWO
`<activity>` elements — `com.unity3d.player.UnityPlayerActivity` and
`com.unity3d.player.UnityPlayerGameActivity` — and EACH has exactly two `<intent-filter>`
blocks:

1. a LAUNCHER/MAIN filter (observed verbatim, 2-space-indented, order is category-then-action):
   ```xml
       <activity ... android:name="com.unity3d.player.UnityPlayerActivity" ...>
         <intent-filter>
           <category android:name="android.intent.category.LAUNCHER" />
           <action android:name="android.intent.action.MAIN" />
         </intent-filter>
   ```
   (and the identical shape inside `UnityPlayerGameActivity`.)
2. a deep-link filter with the standalone-app scheme (observed verbatim):
   ```xml
         <intent-filter>
           <category android:name="android.intent.category.DEFAULT" />
           <category android:name="android.intent.category.BROWSABLE" />
           <data android:scheme="ar_gara_apk3" />
           <action android:name="android.intent.action.VIEW" />
         </intent-filter>
   ```

The LAUNCHER/MAIN filters produce the duplicate launcher icon and the standalone Unity entry
point (symptoms 1, 2). Opening that standalone entry boots Unity in-process and, on exit,
QUITS it — `ReactNativeUnity.java` then sets `_isUnityQuit` and refuses to recreate the player,
which is why the RN `/ar` view later shows only the logo and hangs (symptom 4). The
`ar_gara_apk3` filters are standalone-app deep-link cruft. The wrapper does NOT use these
activities: its own `node_modules/@azesmway/react-native-unity/android/src/main/AndroidManifest.xml`
is EMPTY (`<manifest>` with only a package attr, no `<application>`), and `ReactNativeUnity.java`
builds a `UPlayer` view by reflection inside the host RN activity. So removing the two
intent-filter blocks from both activities is SAFE and is the PRIMARY fix for symptoms 1–4.

Current counts in the manifest (capture these as the "before" baseline, confirmed by reading the file):
`LAUNCHER=2, MAIN=2, ar_gara_apk3=2, <activity>=2, <intent-filter>=4`.

Wrapper lifecycle facts relevant to Task B (confirmed by reading the sources):
- `UnityView.tsx` `componentWillUnmount()` ALWAYS calls `Commands.unloadUnity(...)` — the
  `androidKeepPlayerMounted` prop does NOT suppress this. So popping the `/ar` route unmounts
  `<UnityView>` and unloads the engine every time.
- A clean `unloadUnity()` path goes `unload()` → `onPlayerGone(quit=false)`, which RESETS state
  and even replays a pending create — it does NOT set `_isUnityQuit`. Only `onQuit`/`destroy`
  (standalone Unity activity exit, or host destroy) sets `_isUnityQuit`. So with the launcher
  activities gone (Task A), the clean unmount→unload→remount cycle is recoverable.
- `androidKeepPlayerMounted` (prop on the native view) only affects `ReactNativeUnityView.onDetachedFromWindow`
  (park player in background instead of tearing down) and focus-driven pause/resume in
  `onWindowFocusChanged`. It does not keep the player across a full React unmount.
- `/ar` is reached via `router.push('/ar')` from `src/app/(tabs)/index.tsx` (line ~48) and is a
  Stack screen in `src/app/_layout.tsx`. Leaving it (Close button `router.back()` or hardware
  back) pops the route and unmounts the screen.

---

## Task A — strip the Unity-manifest launcher + deep-link intent-filters (config plugin)

- [ ] 1. Re-read `plugins/withUnityArcore.js` end-to-end and confirm the live manifest contents before writing any regex.
      Open `/home/chris/WORK/Coding Projects/Unihack/Unihack2026/UniHack_2026_PreComp/visittm/plugins/withUnityArcore.js` and
      `/home/chris/WORK/Coding Projects/Unihack/Unihack2026/UniHack_2026_PreComp/visittm/unity/builds/android/unityLibrary/src/main/AndroidManifest.xml`.
      Confirm: the plugin uses `withDangerousMod('android', ...)` with sentinel-guarded idempotency and `createRunOncePlugin`; the manifest has the exact two activities and four intent-filters described above; the file uses CRLF (so regexes must use `\r?\n` and must not assume LF).
      Files: none (read-only).
      Verify: baseline counts match `LAUNCHER=2, MAIN=2, ar_gara_apk3=2, <activity>=2, <intent-filter>=4`. Capture these as the before-numbers for step 3.

- [ ] 2. Add a new idempotent `withDangerousMod('android', ...)` step to `plugins/withUnityArcore.js` that strips both intent-filter kinds from the Unity export manifest, and compose it LAST in the `withUnityArcore` pipeline.
      Match the existing file's conventions exactly: a `const withStripUnityLauncherFilters = (config) => withDangerousMod(config, ['android', (modConfig) => { ... return modConfig; }]);` declaration, a header comment block in the same voice as the other steps explaining WHY (duplicate launcher icon + standalone entry that quits Unity in-process; wrapper renders the player itself and does not use these activities), and resolve the manifest path from `modConfig.modRequest.projectRoot` joined with `['unity','builds','android','unityLibrary','src','main','AndroidManifest.xml']` (reuse the `EXPORT_DIR` constant + a local `abs(...)` the same way step (2) does). Guard with `if (fs.existsSync(manifestPath))`.
      Transform strategy (validated in-process against the real file; do NOT hand-roll attribute-order-sensitive matching): read the file as utf8, then remove every whole `<intent-filter> ... </intent-filter>` block **only if that block contains `android.intent.category.LAUNCHER` OR `ar_gara_apk3`**, leaving all other intent-filters untouched. Concretely, replace with a predicate callback:
      ```js
      c = c.replace(
        /[^\S\r\n]*<intent-filter>[\s\S]*?<\/intent-filter>[^\S\r\n]*\r?\n?/g,
        (block) =>
          /android\.intent\.category\.LAUNCHER/.test(block) || /ar_gara_apk3/.test(block)
            ? ''
            : block
      );
      ```
      This is inherently idempotent (a second run finds no matching blocks → no-op) so no separate sentinel is needed, but add a short comment saying so. Write the file back WITHOUT changing its line-ending style (the `replace` above preserves the file's existing CRLF because it only deletes matched runs; do not run any LF-normalization on this file). Only write if the content changed, to avoid needless churn. Finally, add `config = withStripUnityLauncherFilters(config);` to the `withUnityArcore` composition AFTER `withWindowsCxxStagingDir(config)` and before `return config;`.
      Files: `plugins/withUnityArcore.js`
      Verify: `npx expo lint` passes with no new errors/warnings for this file.

- [ ] 3. Prove the transform with an in-process Node simulation against the real manifest (the only runtime verification available here).
      Write a throwaway Node snippet (run via `node -e`, do NOT add a file to the repo) that: loads the real manifest, applies the SAME strip function the plugin uses, and asserts the after-state. It must confirm all of: `LAUNCHER=0`, `MAIN=0`, `ar_gara_apk3=0`, `<activity>` count still `2`, `unityplayer.UnityActivity` meta still `2`, `com.google.android.ar.API_KEY` still `1`, balanced tags (`<manifest>`/`</manifest>` = 1/1, `<intent-filter>` open == close == 0), and running the transform twice equals running it once (idempotent). Report the before→after counts. Do NOT leave the manifest modified by this simulation (operate on an in-memory copy, or restore the file afterward) — the plugin, not the sim, is what should transform it at prebuild time.
      Files: none (throwaway snippet only).
      Verify: the snippet prints all assertions passing: before `{LAUNCHER:2,MAIN:2,ar_gara_apk3:2,activities:2,intentFilters:4}` → after `{LAUNCHER:0,MAIN:0,ar_gara_apk3:0,activities:2,intentFilters:0}`, `idempotent: true`, XML balanced.

## Task B — harden the RN `/ar` screen lifecycle

- [ ] 4. Re-read the wrapper sources and `src/app/ar.tsx`, then implement the chosen recovery option below.
      Read `node_modules/@azesmway/react-native-unity/src/UnityView.tsx`, `.../android/.../ReactNativeUnity.java`, `.../ReactNativeUnityView.java`, `.../ReactNativeUnityViewManager.java`, and the wrapper README, confirming the lifecycle facts in the context section (esp. that `componentWillUnmount` always unloads, and that a clean unload does NOT set `_isUnityQuit`).

      RECOMMENDED OPTION: **Option 2 — keep the unmount→clean-unload path, make it explicit and robust, and document the single-shot limitation.** Reasoning the coder must follow:
      - This is the smallest change that matches the user's "small changes first, test, then bigger changes only if necessary" directive.
      - `/ar` is a pushed Stack route; the only ways to leave are Close (`router.back()`) and hardware back, both of which POP the route and UNMOUNT the screen. There is no way to "keep `<UnityView>` mounted on blur" without relocating the Unity view to a persistent parent above the router — a large structural change that is explicitly out of scope (no new message-passing, no scene params, don't touch unrelated screens).
      - Critically, the wrapper's unmount path calls the CLEAN `unloadUnity()` (→ `unload()` → `onPlayerGone(quit=false)`), which resets state and permits a later recreate. It does NOT quit. The dead-state (symptom 4) is caused by the STANDALONE Unity launcher activity quitting Unity in-process — which Task A removes. So once Task A lands, the clean unmount/remount cycle is the recoverable path, and Option 1's pause-instead-of-unload is unnecessary complexity for Phase 1.
      - Therefore: do NOT add `androidKeepPlayerMounted`-based pause/resume plumbing. Instead make the existing clean-unload intent explicit and resilient.

      Concrete edits to `src/app/ar.tsx` (preserve all existing imports, styling, the web guard, the Close button, and conventions):
      - Add a `useRef` to the `<UnityView>` so the screen can trigger a deterministic clean unload on the way out (belt-and-suspenders alongside `componentWillUnmount`). Call it e.g. `unityRef`.
      - Add an `expo-router` `useFocusEffect` (import from `expo-router`) whose cleanup calls `unityRef.current?.unloadUnity?.()` — this guarantees the engine is cleanly unloaded (not quit) whenever the screen loses focus / is torn down, and makes the teardown explicit in the RN layer rather than relying solely on the native `componentWillUnmount`. Guard it so it is a no-op on web (`UnityView` is null there) and only calls `unloadUnity` when the ref and method exist.
      - Keep `<UnityView fullScreen ref={unityRef} style={{ flex: 1 }} />` (add the `ref`; keep `fullScreen`). Keep the Close button calling `router.back()` and keep hardware-back behavior unchanged (do not intercept it).
      - Add a concise comment explaining: Unity-as-a-Library cannot boot twice per process, so leaving `/ar` performs a CLEAN unload (never a quit); removing the standalone launcher activity (Task A) is what prevents the quit-poisoned state.
      - Do NOT add `onPlayerUnload`/`onPlayerQuit` handlers with side effects beyond at most a dev `console.log`; do NOT add message-passing, QR, or scene params.
      Files: `src/app/ar.tsx`
      Verify: `npx tsc --noEmit` passes (types for `useRef<InstanceType<typeof UnityView>>` / the ref methods resolve), and `npx expo lint` passes with no new issues.

## Task C — document the runtime behavior

- [ ] 5. Add a concise "Runtime / UaaL notes" section to `BUILD_ANDROID.md`, matching the doc's tone.
      Append a new `## Runtime / UaaL notes` section (after Troubleshooting, or before it — pick placement that reads naturally) covering: (a) the `withUnityArcore` plugin strips the Unity library manifest's LAUNCHER/MAIN + `ar_gara_apk3` intent-filters, so no duplicate launcher icon and no standalone Unity entry point — the wrapper renders Unity in-process via the RN `/ar` screen; (b) Unity-as-a-Library cannot boot twice in one process, so leaving `/ar` performs a CLEAN unload (via the wrapper's unmount path, reinforced by a `useFocusEffect` cleanup in `ar.tsx`) rather than a quit, which keeps re-entry working — describe the Option 2 approach actually implemented; (c) if returning-to-RN instability still persists after this, the next step is Phase 2 — running Unity in a SEPARATE Android process — which is NOT implemented yet. Keep it tight and in the existing documentary voice; use LF endings.
      Files: `BUILD_ANDROID.md`
      Verify: section renders as valid Markdown (no broken headings/lists); re-read to confirm it describes the behavior actually implemented in Tasks A and B (not a hypothetical option).

## Final

- [ ] 6. Run the full verification gate and commit on the current branch (do NOT push).
      Run `npx expo lint` and `npx tsc --noEmit` from the repo subfolder `visittm/`; both must pass clean. Re-run the Task A simulation snippet once more to confirm the manifest transform still asserts green. Confirm no changes were made under the generated `android/` folder and that `app.json` package/name/slug are unchanged. Confirm the three authored files are LF (no CRLF introduced).
      Stage ONLY the intended files — `plugins/withUnityArcore.js`, `src/app/ar.tsx`, `BUILD_ANDROID.md`, and this plan/task artifacts under `.agents/tasks/` if the workflow tracks them — and commit with a clear message on `Integrate-Unity-Project`. Do NOT `git push`. Do NOT stage anything under `unity/builds/` (git-ignored export) or generated `android/`.
      Files: git index only.
      Verify: `npx expo lint` + `npx tsc --noEmit` both pass; `git status` shows only the intended files staged; `git log -1` shows the new commit on `Integrate-Unity-Project`.

## Implementation results (iteration 1)

All three tasks implemented on branch `Integrate-Unity-Project`. Verification run here
(no Android SDK / IL2CPP — reasoning + Node simulation + lint/typecheck only):

- **Task A** — added `withStripUnityLauncherFilters` (+ pure `stripUnityLauncherFilters`
  helper, also exported for the sim) as the LAST step in the `withUnityArcore` pipeline.
  It removes any `<intent-filter>` block containing `android.intent.category.LAUNCHER` OR
  `ar_gara_apk3` from the Unity export manifest, preserving the file's existing CRLF and
  only writing on change. Inherently idempotent.
  Node simulation against the real manifest (ran via the EXACT exported function,
  in-memory, real file left unmodified):
  - BEFORE `{LAUNCHER:2, MAIN:2, ar_gara_apk3:2, activities:2, intentFilters:4}`
  - AFTER  `{LAUNCHER:0, MAIN:0, ar_gara_apk3:0, activities:2, intentFilters:0}`
  - `unityplayer.UnityActivity` stayed 2, `com.google.android.ar.API_KEY` stayed 1.
  - `<manifest>`/`</manifest>` = 1/1, `<application>`/`</application>` balanced,
    `<intent-filter>` open == close == 0 → well-formed.
  - idempotent: running the transform twice == once → **true**.
  - ALL CHECKS: GREEN.
- **Task B** — Option 2 (smallest change): `src/app/ar.tsx` now keeps the clean
  unmount→unload path and reinforces it with a `useRef` on `<UnityView>` + an
  `expo-router` `useFocusEffect` cleanup that calls `unityRef.current?.unloadUnity?.()` on
  blur/teardown. No pause/resume plumbing, no message-passing, no scene params. Web guard,
  Close button, hardware-back all preserved.
- **Task C** — added a concise "Runtime / UaaL notes" section to `BUILD_ANDROID.md`
  (stripped filters → no dup icon; once-per-process → clean unload via unmount +
  `useFocusEffect`; Phase 2 separate-process noted as NOT done).

Verification gate:
- `node ./node_modules/typescript/bin/tsc --noEmit` → exit 0 (pass).
- `node ./node_modules/eslint/bin/eslint.js src/app/ar.tsx` → exit 0, no errors.
  (The `node ./node_modules/.bin/eslint ...` form in the task fails because `.bin/eslint`
  is a shell wrapper, not JS; invoked the real JS bin instead — equivalent.)
- `node -e "require('./plugins/withUnityArcore.js')"` → loads, no throw.
- Task A simulation → all assertions GREEN (counts above).

**On-device retest REQUIRED:** a colleague must run `npx expo prebuild --clean` +
`npx expo run:android` on the Windows machine (Unity Android toolchain) to confirm the
four runtime symptoms are resolved. The root cause (standalone launcher activities +
quit-poisoning) is removed and `/ar` teardown is now an explicit clean unload, but that
cannot be empirically confirmed here.

## Gaps / assumptions (noted, not blocking)
- The Unity manifest under `unity/builds/` is git-ignored and CRLF; the transform preserves its EOL and never commits it. Assumption: that is intended (the export is transferred as a zip, per `BUILD_ANDROID.md`).
- We cannot empirically confirm symptom 4 is fully resolved without an on-device build (no Android SDK / Windows IL2CPP here). The plan fixes the verified root cause (launcher activities + quit poisoning) and makes the `/ar` teardown a clean unload; Task C documents Phase 2 as the fallback if instability persists. Do not mark symptom 4 "fixed" — mark the root-cause removal done and the behavior documented.
