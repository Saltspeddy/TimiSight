// Dynamic Expo config.
//
// WHY THIS FILE EXISTS: the Google Maps Android API key (used by expo-maps) must NOT be
// committed to git. Expo loads app.json first and passes it here as `config`; we spread
// that static base unchanged and inject the dynamic/secret bits at build time:
//   * android.config.googleMaps.apiKey  ← from the env var below (lives only in .env)
//   * the expo-location config plugin   ← foreground-location permission rationale
//   * the expo-maps config plugin       ← request location permission on the map
//
// The real key goes in .env (which is gitignored); see .env.example for the variable name.
// A Google Maps Android key is embedded in the APK anyway, so the protection that matters
// is RESTRICTING the key in Google Cloud to this app's package + signing SHA-1 — not
// keeping it out of the binary. Keeping it out of git avoids an unrestricted key leaking.

// Read at config-evaluation time (Node), so a plain non-public env var is fine — it does
// NOT need the EXPO_PUBLIC_ prefix (that prefix is only for values read in app JS at runtime).
const GOOGLE_MAPS_ANDROID_KEY = process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '';

module.exports = ({ config }) => {
  // Replace the bare "expo-maps" plugin string (added by `expo install`) with a configured
  // entry that requests location permission, and add expo-location with a rationale string.
  const basePlugins = (config.plugins ?? []).filter(
    (p) => !(p === 'expo-maps' || (Array.isArray(p) && p[0] === 'expo-maps')),
  );

  const hasGoogleMapsKey = GOOGLE_MAPS_ANDROID_KEY.trim().length > 0;

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...(config.android && config.android.config),
        googleMaps: { apiKey: GOOGLE_MAPS_ANDROID_KEY },
      },
    },
    extra: {
      // Spread existing extra (auth0, EAS projectId, etc.) and add a reliable runtime flag:
      // whether a Google Maps key was baked in. `extra` is always fully serialized into
      // Constants.expoConfig.extra at runtime, unlike android.config, so the Quests screen
      // can safely decide whether to mount the native map (which hard-crashes without a key).
      ...(config.extra ?? {}),
      hasGoogleMapsKey,
    },
    plugins: [
      ...basePlugins,
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'TimiSight uses your location to give warmer/colder hints toward the next flower on a path.',
        },
      ],
      [
        'expo-maps',
        {
          requestLocationPermission: true,
          locationPermission: 'TimiSight uses your location to show nearby flowers on the map.',
        },
      ],
    ],
  };
};
