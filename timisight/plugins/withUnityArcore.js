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
    return modConfig;
  });

// (2) Strip the Windows-absolute toolchain paths from the export files.
//
// These files live OUTSIDE `android/` (under `unity/builds/android/`), but they are
// consumed by the generated Gradle build. Re-applying the strip on every prebuild via
// withDangerousMod is more robust than a one-time manual edit a teammate could forget
// after re-exporting from Unity. Each edit is idempotent (a no-op once the literal is
// already gone).
//
// RATIONALE (why strip rather than rewrite): `unityLibrary/build.gradle`'s
// `buildIl2Cpp` task reads `getProperty("unity.androidNdkPath")` and
// `getProperty("unity.androidSdkPath")`. A `.properties` file cannot compute a value
// from the environment, so we cannot substitute a portable path here. Stripping the
// bad `C:/` literals makes the build fall back to the machine's own SDK/NDK
// (`local.properties` `sdk.dir` / `ANDROID_HOME`). If the IL2CPP task still needs the
// two `unity.*` paths on a given machine, the teammate supplies them as `-P` Gradle
// properties — documented in BUILD_ANDROID.md. This fails loudly with a clear message
// instead of silently pointing at a nonexistent `C:/` path.
const EXPORT_DIR = ['unity', 'builds', 'android'];

const withStrippedWindowsPaths = (config) =>
  withDangerousMod(config, [
    'android',
    (modConfig) => {
      const root = modConfig.modRequest.projectRoot;
      const abs = (...parts) => path.join(root, ...EXPORT_DIR, ...parts);

      // unityLibrary/build.gradle — drop the hardcoded `ndkPath "C:/..."` line.
      // Leave `ndkVersion` intact so Gradle resolves the NDK from the installed SDK.
      const buildGradlePath = abs('unityLibrary', 'build.gradle');
      if (fs.existsSync(buildGradlePath)) {
        let c = fs.readFileSync(buildGradlePath, 'utf8');
        c = c.replace(/^[^\S\r\n]*ndkPath\s+".*"[^\S\r\n]*\r?\n/m, '');
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

const withUnityArcore = (config) => {
  config = withXrManifestInclude(config);
  config = withAndroidXProperties(config);
  config = withStrippedWindowsPaths(config);
  return config;
};

module.exports = createRunOncePlugin(withUnityArcore, pkg.name + '-unity-arcore', '1.0.0');
