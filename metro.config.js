// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web runs SQLite as WebAssembly (wa-sqlite) in a worker.
config.resolver.assetExts.push('wasm');

// expo-sqlite's web docs require cross-origin isolation (it enables SharedArrayBuffer). This covers the
// dev server only; docker/nginx.conf sends the same headers in production.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  middleware(req, res, next);
};

module.exports = config;
