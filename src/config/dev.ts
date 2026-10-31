// Development-only switches. Both are always false in release builds (__DEV__ is false there).

/** Add sample accounts, categories and transactions on first launch. Disable with EXPO_PUBLIC_SEED_SAMPLE_DATA=false in .env.local. */
export const SEED_SAMPLE_DATA = __DEV__ && process.env.EXPO_PUBLIC_SEED_SAMPLE_DATA !== 'false';

/** Show the "reset & reseed" tools in Settings. */
export const SHOW_DEV_TOOLS = __DEV__;
