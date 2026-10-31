// MainActivity keeps the newest intent, so Linking.getInitialURL() also sees a deep link that arrives
// through onNewIntent before JavaScript is ready, e.g. a widget "+ EUR" tap that restarts a killed
// process into its existing task (the url event fires before any listener exists).
const { withMainActivity } = require('expo/config-plugins');

const MARKER = '// rupiero: keep latest intent';

module.exports = function withLatestIntent(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;
    if (!src.includes('import android.content.Intent')) {
      src = src.replace('import android.os.Bundle', 'import android.content.Intent\nimport android.os.Bundle');
    }
    const method = `
  ${MARKER}
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
  }
`;
    const end = src.lastIndexOf('}');
    cfg.modResults.contents = src.slice(0, end) + method + src.slice(end);
    return cfg;
  });
};
