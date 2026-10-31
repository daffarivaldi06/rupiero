// Native strings the launcher shows outside the app (the widget picker's description) in Indonesian
// on Indonesian phones; app.json holds the English default. react-native-android-widget writes its
// description as translatable="false", so that flag is dropped to allow the values-in copy.
const fs = require('fs');
const path = require('path');
const { withDangerousMod, withStringsXml } = require('expo/config-plugins');

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, "\\'");

module.exports = function withNativeTranslations(config, { strings }) {
  config = withStringsXml(config, (cfg) => {
    for (const entry of cfg.modResults.resources.string ?? []) {
      if (entry.$.name in strings) delete entry.$.translatable;
    }
    return cfg;
  });

  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'values-in');
      fs.mkdirSync(dir, { recursive: true });
      const lines = Object.entries(strings).map(([name, text]) => `  <string name="${name}">${escape(text)}</string>`);
      fs.writeFileSync(path.join(dir, 'strings.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${lines.join('\n')}\n</resources>\n`);
      return cfg;
    },
  ]);
};
