// Signs release builds with the Rupiero key when its Gradle properties are set (in
// ~/.gradle/gradle.properties, outside the repo): RUPIERO_UPLOAD_STORE_FILE, RUPIERO_UPLOAD_KEY_ALIAS,
// RUPIERO_UPLOAD_STORE_PASSWORD, RUPIERO_UPLOAD_KEY_PASSWORD. Without them, release falls back to the
// debug key. Updates only install over a build signed with the same key, so never lose it.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// rupiero: release signing';

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;

    src = src.replace(
      /signingConfigs \{\n(\s*)debug \{/,
      (match, indent) => `signingConfigs {
${indent}${MARKER}
${indent}if (project.hasProperty('RUPIERO_UPLOAD_STORE_FILE')) {
${indent}    release {
${indent}        storeFile file(RUPIERO_UPLOAD_STORE_FILE)
${indent}        storePassword RUPIERO_UPLOAD_STORE_PASSWORD
${indent}        keyAlias RUPIERO_UPLOAD_KEY_ALIAS
${indent}        keyPassword RUPIERO_UPLOAD_KEY_PASSWORD
${indent}    }
${indent}}
${indent}debug {`,
    );
    src = src.replace(
      /(release \{\n\s*\/\/ Caution! In production[^\n]*\n\s*\/\/ see [^\n]*\n\s*)signingConfig signingConfigs\.debug/,
      "$1signingConfig project.hasProperty('RUPIERO_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );
    if (!src.includes("signingConfigs.release : signingConfigs.debug")) {
      throw new Error('with-release-signing: could not find the release signingConfig line in app/build.gradle');
    }
    cfg.modResults.contents = src;
    return cfg;
  });
};
