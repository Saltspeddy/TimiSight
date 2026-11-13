# Persistent single UnityView to fix the AR re-open crash (Option B)

The AR re-open crash came from React unmounting `<UnityView>` on navigation away from `/ar`, which fires the wrapper's `componentWillUnmount` → `unloadUnity()` → `UnityPlayer.unload()`; for this ARCore/geospatial build Unity never reports `onUnityPlayerUnloaded`, so a second open booted a second `UnityPlayer` in-process and crashed ~5s later. This change implements Option B from the investigation: a new `UnityArProvider` mounts exactly one `<UnityView>` as a sibling of the router `<Stack>` in the root `_layout.tsx`, so the engine boots once and never unmounts. The `/ar` route no longer owns the surface — it became a thin controller that reveals/hides the persistent surface and sends explicit `hold`/`resume` signals to the Unity `ReactNativeBridge` on focus/blur. The teardown path (`unloadUnity`) is gone entirely.

Watch for: the persistent surface is hidden by `opacity:0` + `translateX:100000` + `pointerEvents:none` rather than unmounted (confirmed) — this is the intended invariant, but it means Unity holds camera/GL resources for the whole app session until `hold` suspends them, which is exactly the Option B tradeoff the investigation accepted. No blocking correctness gaps found against the investigation, the bridge contract, or the wrapper API.

**Verdict**: APPROVED

## High-level view

The single-mount invariant holds. `<UnityView>` is instantiated in exactly one place (`src/components/unity-ar-host.tsx`), rendered by `UnityArProvider`, which `_layout.tsx` wraps around the router `<Stack>`. Because the provider lives in the root layout outside the routed tree, it is never unmounted or re-created by navigation between `(tabs)`, `place/[id]`, and `ar`. This is a standard React composition pattern and is sound for Expo Router SDK 58 — the root `_layout.tsx` is the top-level component and a sibling of `<Stack>` persists for the app lifetime.

The teardown path is fully removed. `src/app/ar.tsx` no longer imports or holds a `UnityView` ref and no longer calls `unloadUnity()` anywhere; the string `unloadUnity` now survives only in explanatory comments. No navigation path calls it between AR sessions, so the unload→reinit crash path cannot be reached.

The bridge contract matches exactly. The provider sends `postMessage('ReactNativeBridge', 'OnHostMessage', 'resume')` on reveal and `postMessage('ReactNativeBridge', 'OnHostMessage', 'hold')` on hide, all lowercase, matching `REACT_NATIVE_BRIDGE_CONTRACT.md`. The `postMessage(gameObject, methodName, message)` signature and the `androidKeepPlayerMounted?: boolean` prop both match the installed wrapper source (`src/UnityView.tsx` and the shipped `lib/module/UnityView.js`).

The focus wiring is correct for a pushed route. `/ar` is reached via `router.push('/ar')`; `useFocusEffect` (imported from `expo-router`, which does re-export it) runs `showAndResume` on focus and the cleanup `hideAndHold` on blur. `hold` is sent before hiding and `resume` after revealing, which is the safe ordering.

Known tradeoff, not a defect: the hidden-but-mounted surface keeps Unity resident. The `hold` signal is what the Unity side uses to release the camera and suspend the session/Cesium; until the handler lands and runs on-device this is unverifiable here, but the RN side drives it correctly.

<details>
<summary>Issues (2)</summary>

1. **Verification evidence for THIS change not recorded in-repo** — the `tsc`/`lint` results in `plan.md` describe the prior Option 2 iteration (the `ar.tsx` `useFocusEffect`→`unloadUnity` approach), not this Option B diff. A reviewer-run project-wide `tsc --noEmit` shows the AR files clean (only two pre-existing, unrelated CSS-module import errors remain). Non-blocking: have the coder record `npx tsc --noEmit` and `npx expo lint` output for the Option B change so the gate rests on the coder's own evidence rather than a spot-check.
2. **Hidden surface relies on resource suspension happening Unity-side** — the RN side keeps `<UnityView>` mounted and hidden, so camera/GL/ARCore stay held until the Unity `hold` handler suspends them. Correct per Option B, but the memory/camera residency is only acceptable if the Unity `ReactNativeBridge` handler actually runs; verify on-device that `hold` releases the camera. Non-blocking (out of RN scope).

</details>

<details>
<summary>Details</summary>

### Single-mount invariant and where the surface lives

`<UnityView>` is created once, in `src/components/unity-ar-host.tsx`, via a web-guarded `require('@azesmway/react-native-unity').default`. A grep across `src/**/*.tsx` finds no other instantiation. `_layout.tsx` wraps the router with `<UnityArProvider>…<Stack/>…</UnityArProvider>`, and the provider renders the surface *after* `children`:

```
RootLayout
└─ UnityArProvider            (root layout — never unmounts on navigation)
   ├─ children
   │  ├─ AnimatedSplashOverlay
   │  └─ Stack                (routes mount/unmount here)
   │     ├─ (tabs)
   │     ├─ place/[id]
   │     └─ ar                (reveals the surface; does NOT own it)
   └─ <UnityView/>            (persistent; overlays Stack when visible)
```

Because the provider sits in the root layout outside the routed tree, pushing and popping `/ar` cannot unmount or re-create it. This satisfies the investigation's Option B invariant (mount once, high in the tree, never unmount between sessions) and checklist items 1 and 6.

### Teardown path removal

`src/app/ar.tsx` dropped the `UnityView` require, the `unityRef`, and the `useFocusEffect` cleanup that called `unityRef.current?.unloadUnity?.()`. It now pulls `showAndResume`/`hideAndHold` from `useUnityAr()` and does nothing else on native beyond driving focus. `unloadUnity` no longer appears as a call anywhere in `src/`. This closes the crash path at its source: no unmount of `<UnityView>` between AR sessions means no `componentWillUnmount` → `unload()`, so the `_isUnityUnloading` deferral and the 5s timeout replay described in the investigation are never entered. Checklist item 2 holds.

### Bridge contract fidelity and wrapper API

The provider hard-codes the contract strings as named constants and sends them through the ref:

```ts
const BRIDGE_GAME_OBJECT = 'ReactNativeBridge';
const BRIDGE_METHOD = 'OnHostMessage';
const MSG_HOLD = 'hold';
const MSG_RESUME = 'resume';
// ...
unityRef.current?.postMessage(BRIDGE_GAME_OBJECT, BRIDGE_METHOD, MSG_RESUME); // show
unityRef.current?.postMessage(BRIDGE_GAME_OBJECT, BRIDGE_METHOD, MSG_HOLD);   // hide
```

These match `REACT_NATIVE_BRIDGE_CONTRACT.md` exactly (GameObject `ReactNativeBridge`, method `OnHostMessage`, lowercase `hold`/`resume`). The call signature matches the installed wrapper: `src/UnityView.tsx` declares `public postMessage = (gameObject: string, methodName: string, message: string) => …` and the shipped `lib/module/UnityView.js` is identical. The `androidKeepPlayerMounted` prop on the `<UnityView>` matches the wrapper's `RNUnityViewProps` (`androidKeepPlayerMounted?: boolean`). Checklist items 3, 4, 5 hold.

Ordering is deliberate and correct: `hideAndHold` sends `hold` *before* `setVisible(false)`, and `showAndResume` calls `setVisible(true)` then `resume`. Unity is told to suspend before the surface is hidden and to resume as it is revealed. The `?.` on `postMessage` means that if the ref is not yet attached on the very first focus (cold boot), the message is silently skipped — acceptable because Unity boots into its running AR state anyway, and subsequent focus cycles have a live ref.

### Persistence approach vs. Expo Router SDK 58

Confirmed against `https://docs.expo.dev/router/introduction.md` (SDK 58): the root `_layout.tsx` is the top-level layout and `<Stack>` is the navigator; routes live under `src/app/`. Rendering a persistent component as a sibling of `<Stack>` inside the root layout is plain React composition and is not special-cased by the router — it persists for the app's lifetime. The new non-route code is correctly placed in `src/components/`, keeping `src/app/` route-only per the workspace rule. `app.json` is untouched. Checklist items 7 and 8 hold.

### Hidden-state technique

When off `/ar`, the surface uses `pointerEvents="none"` plus a style of `opacity:0` and `transform:[{ translateX: 100000 }]` (a belt-and-braces off-screen push on top of zero opacity), while staying mounted. This prevents the native Unity surface from bleeding through or intercepting touches on other screens without unmounting it. The Close button is rendered inside the provider, layered above the Unity surface and shown only while `visible`, which is the right call — a button drawn by the `/ar` screen would sit beneath the native surface and be untappable.

One behavioral note, not a defect: hiding is driven only by `/ar` blur via `useFocusEffect`. Since `/ar` is only ever `push`ed on top and `back`ed off, blur reliably fires `hold`. There is no code path that reveals the surface except `/ar` focus, so it cannot leak visible onto another screen.

### Verification status

No build/run is possible on Linux (Unity IL2CPP/Cesium toolchain is Windows-only), so no runtime check is expected. The verification evidence recorded in `plan.md` corresponds to the earlier Option 2 implementation, not this Option B diff, so I ran a narrow project-wide `tsc --noEmit` spot-check: the only errors are two pre-existing CSS-module side-effect import errors (`animated-icon.web.tsx`, `theme.ts`) that are not part of this diff; the three touched/added files type-check clean. This is sufficient to clear the type-correctness concern, but the coder should still record `tsc`/`lint` for the Option B change itself (Issue 1).

</details>

<details>
<summary>File map</summary>

- `src/components/unity-ar-host.tsx` (new) — `UnityArProvider` + `useUnityAr`; owns the single persistent `<UnityView>`, the hidden/visible styling, the Close button, and the `hold`/`resume` postMessage calls.
- `src/app/_layout.tsx` — wraps the router `<Stack>` (and splash overlay) in `<UnityArProvider>`.
- `src/app/ar.tsx` — stripped of `<UnityView>` ownership and the `unloadUnity` teardown; now a thin controller that calls `showAndResume`/`hideAndHold` via `useFocusEffect`.

Full diff: `git diff main` in `UniHack_2026_PreComp/visittm`.

</details>
