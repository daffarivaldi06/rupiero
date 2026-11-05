// Web: tell "Rupiero is open in another tab" apart from other startup failures, and recover from them.
//
// With expo-sqlite 16.x on OPFS, while another tab holds the database the first open in a page fails
// with the browser's lock error (a NoModificationAllowedError from createSyncAccessHandle). Every
// later attempt in the same page fails with "Invalid VFS state": expo-sqlite's worker does not retry
// its VFS setup, so only a new page can open the database again.
//
// WORKAROUND tied to expo-sqlite 16.x (these error texts and its worker). Recheck them when upgrading
// expo-sqlite, together with pageLifecycle.web.ts.

const LOCK_ERROR = /NoModificationAllowedError|Access Handles cannot be created/;
const STUCK_AFTER_FAILURE = /Invalid VFS state/;

/** Pure: whether a startup error means "open in another tab", given whether this page already saw the lock error. */
export function classifyStartupError(message: string, sawLockError: boolean): { anotherTab: boolean; sawLockError: boolean } {
  if (LOCK_ERROR.test(message)) return { anotherTab: true, sawLockError: true };
  return { anotherTab: sawLockError && STUCK_AFTER_FAILURE.test(message), sawLockError };
}

let sawLockError = false;

/** Whether the database could not be opened because Rupiero is open in another tab. */
export function isOpenInAnotherTab(error: Error): boolean {
  const result = classifyStartupError(`${error.name}: ${error.message}`, sawLockError);
  sawLockError = result.sawLockError;
  return result.anotherTab;
}

/** "Try again": the database worker cannot recover in this page (see above), so start the page over. */
export function retryStartup(_retryInApp: () => void): void {
  window.location.reload();
}
