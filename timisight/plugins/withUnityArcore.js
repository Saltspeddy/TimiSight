// Supplementary Expo config plugin for the Unity ARCore export.
//
// This runs AFTER the stock `@azesmway/react-native-unity` plugin (declared next in
// app.json) and only closes the gaps that plugin leaves for THIS ARCore export:
//
//   1. The stock plugin includes `:unityLibrary` but NOT the extra
//      `:unityLibrary:xrmanifest.androidlib` Gradle submodule that the ARCore export
//      ships (its `unityLibrary/build.gradle` has
//      `implementation project(':unityLibrary:xrmanifest.androidlib')`). We add that
//      include to the generated `android/settings.gradle`.
//   2. The export was produced on a Windows machine and carries hardcoded `C:/...`
//      SDK/NDK/JDK paths (in `unityLibrary/build.gradle`, `gradle.properties`,
//      `local.properties`). Those break the build on any other machine, so we strip
//      them and let the build machine resolve the SDK/NDK from its own
//      `local.properties` / `ANDROID_HOME`.
//   3. The generated `android/gradle.properties` must have AndroidX + Jetifier on for
//      the Unity libraries to link.
//   4. React Native's root `com.facebook.react.rootproject` plugin runs a
//      `project.subprojects { ... }` sweep that, for EVERY subproject, calls
//      `subproject.setProperty("react.newArchEnabled", "true")` (and `newArchEnabled`)
//      whenever `subproject.hasProperty(...)` is true. `hasProperty` is true for the
//      Unity modules because the value is visible/inherited from the root
//      `gradle.properties`, but `setProperty` THROWS on the plain
//      `com.android.library` Unity modules (`:unityLibrary` and
//      `:unityLibrary:xrmanifest.androidlib`) — they carry no RN/Expo plugin and thus
//      no settable property by that name. We inject a `subprojects { ... }` ext shim
//      into the generated ROOT android/build.gradle, BEFORE the rootproject plugin is
//      applied, so each Unity subproject has a real, writable extra property by the time
//      the root plugin's sweep sets it. (Doing this inside the module build.gradle files
//      is too late — the root sweep runs before any subproject script is evaluated.)
//
// NOTE on `../shared/*.gradle`: the export's `unityLibrary/build.gradle` applies
// `../shared/keepUnitySymbols.gradle` and `../shared/common.gradle` RELATIVE to the
// module's projectDir. The stock plugin sets that projectDir to
// `../unity/builds/android/unityLibrary`, so `../shared` resolves to
// `unity/builds/android/shared/` — exactly where Task 1 placed those files. Nothing to
// edit for `shared/`; this is intentional and verified, so there is no gradle mod here.
//
// Everything below is idempotent: safe to re-run on every `expo prebuild`.

const fs = require('fs');
const path = require('path');
const {
  withSettingsGradle,
  withGradleProperties,
  withProjectBuildGradle,
  withAppBuildGradle,
  withDangerousMod,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const pkg = require('../package.json');

// Mirror the stock plugin's relative projectDir form (`../unity/builds/android/...`)
// so both `:unityLibrary` and its submodule resolve from the generated `android/`.
const XR_MODULE = ":unityLibrary:xrmanifest.androidlib";
const XR_PROJECT_DIR = "../unity/builds/android/unityLibrary/xrmanifest.androidlib";

// (1) Include the ARCore `xrmanifest.androidlib` submodule in settings.gradle.
const withXrManifestInclude = (config) =>
  withSettingsGradle(config, (modConfig) => {
    const contents = modConfig.modResults.contents;
    if (!contents.includes(XR_MODULE)) {
      modConfig.modResults.contents =
        contents +
        `\ninclude '${XR_MODULE}'\n` +
        `project('${XR_MODULE}').projectDir=new File('${XR_PROJECT_DIR}')\n`;
    }
    return modConfig;
  });

// (3) Ensure AndroidX + Jetifier are enabled in the generated android/gradle.properties.
const withAndroidXProperties = (config) =>
  withGradleProperties(config, (modConfig) => {
    const ensure = (key, value) => {
      const exists = modConfig.modResults.some(
        (item) => item.type === 'property' && item.key === key
      );
      if (!exists) {
        modConfig.modResults.push({ type: 'property', key, value });
      }
    };
    ensure('android.useAndroidX', 'true');
    ensure('android.enableJetifier', 'true');

    // Bump the Gradle JVM heap. Adding Unity + enabling Jetifier makes the build
    // transform a large set of AARs (incl. RN's react-android-*.aar); the default/
    // export heap (4G) overflows with "Java heap space" during JetifyTransform. Force
    // a larger, explicit heap. Unlike the keys above, org.gradle.jvmargs may ALREADY
    // exist in the generated gradle.properties, so OVERWRITE it rather than skip.
    const JVM_ARGS =
      '-Xmx6144m -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8';
    const jvmIdx = modConfig.modResults.findIndex(
      (item) => item.type === 'property' && item.key === 'org.gradle.jvmargs'
    );
    if (jvmIdx === -1) {
      modConfig.modResults.push({
        type: 'property',
        key: 'org.gradle.jvmargs',
        value: JVM_ARGS,
      });
    } else {
      modConfig.modResults[jvmIdx].value = JVM_ARGS;
    }
    return modConfig;
  });

// (2) Make the export's toolchain paths portable across build machines.
//
// These files live OUTSIDE `android/` (under `unity/builds/android/`), but they are
// consumed by the generated Gradle build. Re-applying the transform on every prebuild
// via withDangerousMod is more robust than a one-time manual edit a teammate could
// forget after re-exporting from Unity. Each edit is idempotent.
//
// TWO things happen here:
//
//   (a) Strip the hardcoded Windows `C:/...`/`D:/...` literals (`ndkPath` in
//       unityLibrary/build.gradle, five `unity.*` keys in gradle.properties, `sdk.dir`
//       in local.properties). Those are specific to the machine that produced the
//       export and are wrong everywhere else.
//
//   (b) CRITICAL: the `buildIl2Cpp` task in unityLibrary/build.gradle calls
//       `getProperty("unity.androidNdkPath")` and `getProperty("unity.androidSdkPath")`
//       (for `--tool-chain-path` and the ANDROID_*_ROOT env vars). `getProperty` THROWS
//       "Could not get unknown property" when the key is absent — so merely stripping
//       the `unity.*` keys (step a) makes the IL2CPP compile crash. We therefore REWRITE
//       those `getProperty(...)` call sites to resolve portably at task-execution time:
//         - SDK: the file already has a `getSdkDir()` helper (reads `sdk.dir` from
//           local.properties); we fall back to the ANDROID_HOME/ANDROID_SDK_ROOT env.
//         - NDK: `<sdk>/ndk/<ndkVersion>`, where `ndkVersion` is declared in this same
//           build.gradle. AGP already installs that exact NDK earlier in the build, so
//           the path exists on whatever machine runs the build (Windows or Linux).
//       This replaces machine-specific absolute paths with values derived from the
//       build machine's own installed SDK/NDK — no `-P` flags required.
const EXPORT_DIR = ['unity', 'builds', 'android'];

// Portable helpers injected into unityLibrary/build.gradle, plus the replacements for
// the two `getProperty("unity.*")` expressions the IL2CPP task uses.
const UNITY_PATHS_SENTINEL = 'expo-unity-portable-paths';
const PORTABLE_PATHS_BLOCK =
  `\n// ${UNITY_PATHS_SENTINEL} (added by withUnityArcore.js)\n` +
  `// Resolve SDK/NDK from the build machine instead of the stripped Windows unity.* props.\n` +
  `ext.resolveAndroidSdkDir = {\n` +
  `    def fromLocal = null\n` +
  `    def lp = new File("\${rootDir}/local.properties")\n` +
  `    if (lp.exists()) { def p = new Properties(); lp.withInputStream { p.load(it) }; fromLocal = p.getProperty('sdk.dir') }\n` +
  `    def sdk = fromLocal ?: System.getenv('ANDROID_HOME') ?: System.getenv('ANDROID_SDK_ROOT')\n` +
  `    if (sdk == null) throw new GradleException('Android SDK not found: set sdk.dir in local.properties or ANDROID_HOME')\n` +
  `    return sdk.replace('\\\\', '/')\n` +
  `}\n` +
  `ext.resolveAndroidNdkDir = {\n` +
  `    def sdk = ext.resolveAndroidSdkDir()\n` +
  `    def ver = project.android.ndkVersion\n` +
  `    return "\${sdk}/ndk/\${ver}"\n` +
  `}\n`;

const withStrippedWindowsPaths = (config) =>
  withDangerousMod(config, [
    'android',
    (modConfig) => {
      const root = modConfig.modRequest.projectRoot;
      const abs = (...parts) => path.join(root, ...EXPORT_DIR, ...parts);

      // unityLibrary/build.gradle — drop the hardcoded `ndkPath "C:/..."` line, inject
      // the portable SDK/NDK resolver helpers, and repoint the IL2CPP task's
      // getProperty("unity.android*Path") calls at those helpers.
      const buildGradlePath = abs('unityLibrary', 'build.gradle');
      if (fs.existsSync(buildGradlePath)) {
        let c = fs.readFileSync(buildGradlePath, 'utf8');
        // Drop the hardcoded ndkPath "C:/..." line (ndkVersion stays so AGP resolves NDK).
        c = c.replace(/^[^\S\r\n]*ndkPath\s+".*"[^\S\r\n]*\r?\n/m, '');
        // Repoint the IL2CPP property reads at the portable resolvers. getProperty throws
        // on a missing key; the resolvers derive the path from the installed SDK/NDK.
        c = c.replace(/getProperty\(\s*["']unity\.androidNdkPath["']\s*\)/g, 'ext.resolveAndroidNdkDir()');
        c = c.replace(/getProperty\(\s*["']unity\.androidSdkPath["']\s*\)/g, 'ext.resolveAndroidSdkDir()');
        // Inject the resolver helpers once (idempotent via sentinel), near the top.
        if (!c.includes(UNITY_PATHS_SENTINEL)) {
          const anchor = "apply plugin: 'com.android.library'";
          const idx = c.indexOf(anchor);
          if (idx !== -1) {
            const lineEnd = c.indexOf('\n', idx);
            const at = lineEnd === -1 ? c.length : lineEnd + 1;
            c = c.slice(0, at) + PORTABLE_PATHS_BLOCK + c.slice(at);
          } else {
            c = PORTABLE_PATHS_BLOCK + c;
          }
        }
        fs.writeFileSync(buildGradlePath, c);
      }

      // gradle.properties — remove the five keys carrying Windows/`D:` literals.
      const gradlePropsPath = abs('gradle.properties');
      if (fs.existsSync(gradlePropsPath)) {
        let c = fs.readFileSync(gradlePropsPath, 'utf8');
        for (const key of [
          'unityProjectPath',
          'unity.projectPath',
          'unity.androidSdkPath',
          'unity.androidNdkPath',
          'unity.jdkPath',
        ]) {
          const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          c = c.replace(new RegExp(`^[^\\S\\r\\n]*${escaped}=.*\\r?\\n`, 'm'), '');
        }
        fs.writeFileSync(gradlePropsPath, c);
      }

      // local.properties — drop the Windows `sdk.dir=C:\...` line so the build
      // machine's own local.properties / ANDROID_HOME is used instead.
      const localPropsPath = abs('local.properties');
      if (fs.existsSync(localPropsPath)) {
        let c = fs.readFileSync(localPropsPath, 'utf8');
        c = c.replace(/^[^\S\r\n]*sdk\.dir=.*\r?\n?/m, '');
        fs.writeFileSync(localPropsPath, c);
      }

      return modConfig;
    },
  ]);

// (4) Inject a `subprojects {}` ext shim into the generated ROOT android/build.gradle,
// BEFORE the `com.facebook.react.rootproject` plugin is applied.
//
// RATIONALE / TIMING (confirmed from a build stacktrace): the failure
//   "Could not set unknown property 'react.newArchEnabled' for project
//    ':unityLibrary:xrmanifest.androidlib'"
// is thrown while the ROOT build.gradle is being evaluated (line 27, `apply plugin:
// 'com.facebook.react.rootproject'`). That plugin's `ReactRootProjectPlugin.apply`
// runs `project.subprojects { sp -> if (sp.hasProperty("react.newArchEnabled"))
// sp.setProperty("react.newArchEnabled", "true") ... }`. `hasProperty(...)` is true for
// the Unity modules (the value is visible/inherited from the root gradle.properties),
// but `setProperty(...)` THROWS on a plain `com.android.library` subproject that has no
// settable property/extension by that name — i.e. the Unity-generated modules
// `:unityLibrary` and `:unityLibrary:xrmanifest.androidlib`.
//
// A previous attempt declared the ext INSIDE each Unity module's own build.gradle. That
// is too late: Gradle runs the root `subprojects {}` sweep during ROOT configuration,
// BEFORE any subproject's own build.gradle is evaluated. The property must therefore be
// established from the ROOT script, before line 27. Gradle registers multiple root
// `subprojects {}` actions in declaration order, so a block inserted ABOVE the
// rootproject apply runs first and gives each Unity subproject a real, writable `ext`
// property — then RN's own sweep finds a target and succeeds.
//
// Scoped by project path to the Unity subprojects only — this does NOT change the app's
// new-arch setting (RN 0.82+ no longer lets you disable new arch app-wide anyway).
//
// Idempotent: guarded by the `expo-unity-newarch-shim` sentinel so repeated prebuilds
// don't duplicate the block.
const NEWARCH_SENTINEL = 'expo-unity-newarch-shim';
const NEWARCH_ROOT_SHIM =
  `// ${NEWARCH_SENTINEL} (added by withUnityArcore.js) — give the Unity subprojects a\n` +
  `// real, settable newArch ext property BEFORE com.facebook.react.rootproject's\n` +
  `// subprojects{} sweep calls setProperty on them (which would otherwise throw).\n` +
  `subprojects { sp ->\n` +
  `  if (sp.path == ':unityLibrary' || sp.path.startsWith(':unityLibrary:')) {\n` +
  `    sp.ext.set('react.newArchEnabled', 'true')\n` +
  `    sp.ext.set('newArchEnabled', 'true')\n` +
  `  }\n` +
  `}\n`;
// The RN rootproject plugin is applied via one of these lines in the generated root
// build.gradle; we insert our block immediately BEFORE whichever is present.
const ROOTPROJECT_APPLY_PATTERNS = [
  /^[^\S\r\n]*apply plugin:\s*["']com\.facebook\.react\.rootproject["'].*\r?\n/m,
  /^[^\S\r\n]*id\s*\(?\s*["']com\.facebook\.react\.rootproject["']\s*\)?.*\r?\n/m,
];

const withUnityNewArchShim = (config) =>
  withProjectBuildGradle(config, (modConfig) => {
    let c = modConfig.modResults.contents;
    if (c.includes(NEWARCH_SENTINEL)) {
      return modConfig; // already shimmed
    }
    const block = NEWARCH_ROOT_SHIM + '\n';
    let inserted = false;
    for (const pat of ROOTPROJECT_APPLY_PATTERNS) {
      const m = c.match(pat);
      if (m) {
        const at = m.index;
        c = c.slice(0, at) + block + c.slice(at);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      // rootproject apply not found by pattern (generated layout changed) — append the
      // block. A root `subprojects {}` action registers regardless of position relative
      // to the apply, because Gradle collects all such actions before firing them per
      // subproject; appending still establishes the ext before subprojects evaluate.
      c = c.endsWith('\n') ? c + block : c + '\n' + block;
    }
    modConfig.modResults.contents = c;
    return modConfig;
  });

// (5) Windows MAX_PATH workaround: redirect the CMake native build staging directory
// to a SHORT path on Windows only.
//
// RATIONALE: the Unity IL2CPP native build produces very deeply nested paths under the
// app module's default `.cxx/` staging dir. On Windows the legacy 260-char MAX_PATH
// limit trips over this and the build fails. Redirecting `buildStagingDirectory` to a
// short root-level path keeps every generated path well under the limit. (A teammate
// hit this and hand-edited android/app/build.gradle with a hardcoded `D:/cxx_app`; that
// edit lived only in the gitignored android/ folder and did not survive transfer, so we
// reproduce it here portably.)
//
// Scoped to Windows: Linux/macOS have no MAX_PATH limit, so we must NOT set a Windows
// drive path there. We pick the short dir from UNITY_CXX_STAGING_DIR if set, else a
// drive-root default on the same drive as the project; non-Windows is left untouched.
const CXX_STAGING_SENTINEL = 'expo-unity-cxx-staging';
const withWindowsCxxStagingDir = (config) =>
  withAppBuildGradle(config, (modConfig) => {
    // Only meaningful for Groovy build.gradle (Expo default). Skip .kts defensively.
    if (modConfig.modResults.language !== 'groovy') {
      return modConfig;
    }
    let c = modConfig.modResults.contents;
    if (c.includes(CXX_STAGING_SENTINEL)) {
      return modConfig; // already injected
    }
    // Insert an externalNativeBuild block INSIDE the `android {` block, guarded at
    // Gradle-eval time so it only applies when the build runs on Windows. The staging
    // dir is chosen on the build machine (env override or <drive-root>/cxx_app), never
    // hardcoded to one teammate's path.
    const block =
      `\n    // ${CXX_STAGING_SENTINEL} (added by withUnityArcore.js) — Windows MAX_PATH workaround.\n` +
      `    // Unity's IL2CPP .cxx staging paths exceed the 260-char limit under the default\n` +
      `    // location; redirect to a short path, but ONLY on Windows (no such limit elsewhere).\n` +
      `    if (org.gradle.internal.os.OperatingSystem.current().isWindows()) {\n` +
      `        externalNativeBuild {\n` +
      `            cmake {\n` +
      `                def shortCxx = System.getenv('UNITY_CXX_STAGING_DIR')\n` +
      `                if (shortCxx == null || shortCxx.trim().isEmpty()) {\n` +
      `                    def drive = rootDir.getAbsolutePath().take(2) // e.g. "D:"\n` +
      `                    shortCxx = "\${drive}/cxx_app"\n` +
      `                }\n` +
      `                buildStagingDirectory shortCxx\n` +
      `            }\n` +
      `        }\n` +
      `    }\n`;
    // Insert right after the first `android {` opening brace.
    const m = c.match(/\bandroid\s*\{/);
    if (m) {
      const at = m.index + m[0].length;
      c = c.slice(0, at) + block + c.slice(at);
    } else {
      // Unexpected: no android{} block found — append a top-level note-free no-op guard.
      // Do nothing rather than risk producing invalid Groovy.
      return modConfig;
    }
    modConfig.modResults.contents = c;
    return modConfig;
  });

// (6) Strip the standalone-app launcher + deep-link intent-filters from the Unity
// export's library manifest.
//
// WHY: the ARCore export was produced as a STANDALONE Unity app, so its library
// manifest (`unity/builds/android/unityLibrary/src/main/AndroidManifest.xml`) declares
// two activities — `com.unity3d.player.UnityPlayerActivity` and
// `com.unity3d.player.UnityPlayerGameActivity` — and EACH carries two `<intent-filter>`
// blocks that only make sense for a standalone app:
//   (i)  a LAUNCHER/MAIN filter — this is what put a SECOND "visittm" launcher icon on
//        the device (the Unity app) alongside the real RN app, and let the user open
//        Unity directly as its own entry point; and
//   (ii) a VIEW/BROWSABLE deep-link filter on the `ar_gara_apk3` scheme — leftover
//        standalone-app deep-link cruft.
// Opening the standalone Unity entry boots Unity in-process and, on exit, QUITS it; the
// wrapper's `ReactNativeUnity.java` then sets `_isUnityQuit` and refuses to recreate the
// player, which is why re-entering the RN `/ar` view afterwards only shows the logo and
// hangs. The `@azesmway/react-native-unity` wrapper does NOT use these activities at all
// — it renders the Unity player by reflection inside the host RN activity (its own
// bundled manifest has no `<application>`). So removing just these two intent-filter
// kinds from both activities is the core runtime fix (duplicate icon + leaked entry
// point + quit-poisoned re-entry), while leaving the activities, their meta-data
// (`unityplayer.UnityActivity`, `com.google.android.ar.API_KEY`, ARCore/Cesium, etc.),
// permissions and `uses-feature` fully intact.
//
// This file is OUTSIDE `android/` (git-ignored export) and currently uses CRLF endings;
// the transform below only DELETES matched runs, so it preserves whatever EOL the file
// already has — it does not normalize line endings.
//
// Inherently idempotent: a second run finds no LAUNCHER/`ar_gara_apk3` intent-filters to
// remove and is a no-op. No sentinel needed.
const stripUnityLauncherFilters = (contents) =>
  contents.replace(
    /[^\S\r\n]*<intent-filter>[\s\S]*?<\/intent-filter>[^\S\r\n]*\r?\n?/g,
    (block) =>
      /android\.intent\.category\.LAUNCHER/.test(block) || /ar_gara_apk3/.test(block)
        ? ''
        : block
  );

const withStripUnityLauncherFilters = (config) =>
  withDangerousMod(config, [
    'android',
    (modConfig) => {
      const root = modConfig.modRequest.projectRoot;
      const abs = (...parts) => path.join(root, ...EXPORT_DIR, ...parts);

      const manifestPath = abs(
        'unityLibrary',
        'src',
        'main',
        'AndroidManifest.xml'
      );
      if (fs.existsSync(manifestPath)) {
        const c = fs.readFileSync(manifestPath, 'utf8');
        const next = stripUnityLauncherFilters(c);
        // Only write if something actually changed, to avoid needless churn and to keep
        // the no-op-on-rerun contract observable.
        if (next !== c) {
          fs.writeFileSync(manifestPath, next);
        }
      }

      return modConfig;
    },
  ]);

const withUnityArcore = (config) => {
  config = withXrManifestInclude(config);
  config = withAndroidXProperties(config);
  config = withStrippedWindowsPaths(config);
  config = withUnityNewArchShim(config);
  config = withWindowsCxxStagingDir(config);
  config = withStripUnityLauncherFilters(config);
  return config;
};

module.exports = createRunOncePlugin(withUnityArcore, pkg.name + '-unity-arcore', '1.0.0');
// Exposed for the in-process manifest-transform verification (see BUILD_ANDROID.md /
// the Task-A simulation). This is the EXACT function the withDangerousMod step runs.
module.exports.stripUnityLauncherFilters = stripUnityLauncherFilters;
