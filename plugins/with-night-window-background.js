// expo-system-ui sets android:windowBackground from `android.backgroundColor`, light only. This adds
// the dark value (values-night) so the window behind the splash and the first frame matches the theme.
const { AndroidConfig, withAndroidColorsNight } = require('expo/config-plugins');

module.exports = function withNightWindowBackground(config, { color }) {
  return withAndroidColorsNight(config, (cfg) => {
    cfg.modResults = AndroidConfig.Colors.assignColorValue(cfg.modResults, { name: 'activityBackground', value: color });
    return cfg;
  });
};
