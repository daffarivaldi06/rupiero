// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web runs SQLite as WebAssembly (wa-sqlite) in a worker.
config.resolver.assetExts.push('wasm');

// expo-sqlite's web docs ask for these headers (cross-origin isolation enables SharedArrayBuffer). In
// SDK 54 Expo CLI serves the HTML page before this middleware runs, so in dev only Metro's own responses
// (bundles, assets) get them and the page is not isolated. That is fine: the app uses only the async
// SQLite API, which works without isolation. docker/nginx.conf sends them on every response in production.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  middleware(req, res, next);
};

module.exports = config;
