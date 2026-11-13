# Remove Unity-as-a-Library AR integration from the Expo app

This change strips the entire Unity/ARCore integration out of the `timisight` Expo app: the `/ar` route screen, the persistent `UnityArProvider` host, the `withUnityArcore` config plugin, the `react-native-unity` patch, the prebuilt Unity artifacts (including a 90 MB `libil2cpp.so`), and all the Unity-specific build/export docs and planning notes. The remaining app keeps home, places, place detail, and leaderboard screens wired through Expo Router. The approach is a straight excision — delete the Unity-owned files, unwire the three integration points (`_layout.tsx`, `(tabs)/index.tsx`, `app.json`), and drop the now-dead `patch-package`/`postinstall` plumbing and `.gitignore`/`.gitattributes` Unity rules.

Watch for: nothing blocking. The removal is complete and the diff is scoped to Unity/AR plus its direct plumbing. One informational note — `plan.md` was deleted alongside the three `ar-reopen-*` task files; it isn't on the checklist but its removal is consistent with the stated intent and recorded in the commit message (confirmed).

**Verdict**: APPROVED

## High-level view

The three live integration points are cleanly unwired. `_layout.tsx` drops the `UnityArProvider` import and wrapper so `AnimatedSplashOverlay` and the router `Stack` now render directly, and the `ar` `Stack.Screen` plus its explanatory block comment are gone. `(tabs)/index.tsx` loses the "Open AR" button and the unused `btnAlt` style; the `router` import stays live because `router.navigate('/places')` still uses it, and every other style remains referenced. `app.json` drops both Unity plugin entries while keeping `expo-router` and `expo-splash-screen`.

Dependency plumbing is fully retired: `@azesmway/react-native-unity`, the `patch-package` devDependency, and the `postinstall: patch-package` script are all removed from `package.json`, and `package-lock.json` was regenerated (zero `azesmway` entries remain). The `.gitignore` Unity-export block and the `.gitattributes` `*.unity3d` rule are gone.

No Unity/AR references survive anywhere in tracked source. A case-insensitive grep for `unity|arcore|azesmway|withUnityArcore` returns only `community` substrings (eslint, react-native, README's "Join the community") and a stale, gitignored eslint cache that points at a different sibling project. Greps for `useUnityAr|UnityArProvider|unity-ar-host` and for `'/ar'`/`"/ar"` return zero real matches.

Recorded verification is clean: the commit message documents `npx tsc --noEmit` passing with exit 0 and `npx expo lint` reporting only pre-existing issues in `use-color-scheme.web.ts` and `(tabs)/leaderboard.tsx`, both untouched by this commit.

<details>
<summary>Issues (0)</summary>

No blocking or actionable findings. `plan.md` removal is informational only and consistent with the change's intent.

</details>

<details>
<summary>Details</summary>

### The three integration points, unwired

`_layout.tsx` carried the heaviest coupling: Unity ran as a single persistent `<UnityView>` mounted by `UnityArProvider` as a sibling of the router `Stack`, with a block comment pointing at the crash-investigation doc (Option B). The diff removes the import, the provider wrapper, the `ar` screen registration, and the comment in one pass, leaving `AnimatedSplashOverlay` and the `Stack` (with `(tabs)` and `place/[id]`) rendering directly under `ThemeProvider`.

`(tabs)/index.tsx` drops the orange "Open AR" `Pressable` and its `router.push('/ar')`, plus the now-orphaned `btnAlt` style. Worth confirming because removing a button often leaves a dangling import or style: the `router` import survives correctly (`router.navigate('/places')` still uses it), the "places" CTA is intact, and `btn`/`btnPressed`/`btnText`/`ctaRow` all remain referenced. No dead imports or styles left behind.

### Dependency and build plumbing retirement

The patch workflow existed solely for `@azesmway/react-native-unity` (`patches/@azesmway+react-native-unity+1.1.1.patch` applied via `patch-package` in `postinstall`). With the dependency gone, keeping `patch-package` would leave a `postinstall` step with nothing to patch, so removing the devDependency and the script together is the correct cleanup. `package-lock.json` was regenerated rather than hand-edited (commit notes 15 packages removed; a grep confirms zero `azesmway` entries), and all three JSON files parse.

### Residual-reference sweep

The only surviving matches for the Unity grep are `community` substrings and a stale eslint cache at `.expo/cache/eslint/.cache_1cnni0o` that references `UniHack_2026_PreComp/visittm/...` — a different sibling checkout, not this repo. `git check-ignore` confirms that cache file is gitignored and untracked, so it has no bearing on the committed state. README and `AGENTS.md` contain no Unity/AR/ARCore/BUILD_ANDROID/EXPORT_TUTORIAL references; README is the unmodified Expo template.

### Verification evidence

Per instruction, the lint/typecheck suites were not re-run. The commit message records `npx tsc --noEmit` at exit 0 with no type errors and `npx expo lint` surfacing only pre-existing issues (1 error in `src/hooks/use-color-scheme.web.ts`, 1 warning in `src/app/(tabs)/leaderboard.tsx`), with a note that both files are unchanged by this commit. That evidence is present and internally consistent with the diff (neither file appears in the changed-files list), so it is accepted as-is.

</details>

<details>
<summary>File map</summary>

Deleted:
- `src/app/ar.tsx` — the `/ar` route screen
- `src/components/unity-ar-host.tsx` — `UnityArProvider`/`useUnityAr`/persistent `UnityView`
- `plugins/withUnityArcore.js` (+ empty `plugins/` dir) — ARCore config plugin
- `patches/@azesmway+react-native-unity+1.1.1.patch` (+ empty `patches/` dir)
- `BUILD_ANDROID.md`, `EXPORT_TUTORIAL.md` — Unity build/export docs
- `unity/` — prebuilt AAR/jniLibs artifacts (incl. 90 MB `libil2cpp.so`)
- `.agents/tasks/ar-reopen-crash-investigation.md`, `ar-reopen-review.json`, `ar-reopen-review.md`, `plan.md`

Edited:
- `src/app/_layout.tsx` — drop `UnityArProvider` import/wrapper, `ar` `Stack.Screen`, comment
- `src/app/(tabs)/index.tsx` — remove "Open AR" button + unused `btnAlt` style
- `app.json` — drop `@azesmway/react-native-unity` and `./plugins/withUnityArcore` plugins
- `package.json` — drop Unity dep, `patch-package` devDep, `postinstall` script
- `.gitignore` — drop Unity-as-a-Library export block
- `.gitattributes` — drop `*.unity3d` binary rule
- `package-lock.json` — regenerated

Full diff: `git diff main` (run from repo root `/home/chris/WORK/Coding Projects/Unihack/Unihack2026/TimiSight`).

</details>
