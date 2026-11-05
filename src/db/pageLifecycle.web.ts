// Web only: release the database when the page is left, so the next page in the tab can open it.
//
// Chrome's back/forward cache can keep a page we leave frozen in memory, workers included.
// expo-sqlite runs SQLite in a worker whose VFS (wa-sqlite's AccessHandlePoolVFS) holds the
// database's OPFS file handles exclusively until the worker ends. A frozen page therefore keeps the
// handles, and the next page fails with "Invalid VFS state". Closing the database does not help:
// expo-sqlite's close only calls sqlite3.close(), and nothing ever closes the VFS. So when the page is
// hidden, the worker is terminated (what closing the tab does anyway, so saved data is safe), and a
// page restored from the cache reloads to open the database again.
//
// WORKAROUND tied to expo-sqlite 16.x (its private worker and AccessHandlePoolVFS). Recheck it when
// upgrading expo-sqlite: if the package releases its file handles itself, remove this module.
// README, "What was hard", explains the cause.

/** The parts of `window` this needs (the DOM types declare Worker on the global scope only). */
export type PageWindow = Pick<Window, 'addEventListener' | 'location'> & { Worker: typeof Worker };

const installedOn = new WeakSet<object>();

/**
 * Records the workers the page starts and terminates them on `pagehide`; reloads on a `pageshow`
 * from the back/forward cache. Must run before the database opens (expo-sqlite starts its worker
 * on the first open). Installing twice on the same window does nothing.
 */
export function installPageLifecycle(win: PageWindow): void {
  if (installedOn.has(win)) return;
  installedOn.add(win);

  // Every worker is recorded, not only expo-sqlite's: Expo's worker shim starts it from a blob: URL
  // with a random id (the real script URL is only inside the blob), so the URL cannot identify it.
  // The app starts no other worker, and terminating any worker is harmless once the page is left.
  const workers = new Set<Worker>();
  const NativeWorker = win.Worker;
  win.Worker = class RecordedWorker extends NativeWorker {
    constructor(scriptURL: string | URL, options?: WorkerOptions) {
      super(scriptURL, options);
      workers.add(this);
    }
  };

  win.addEventListener('pagehide', () => {
    for (const worker of workers) worker.terminate();
    workers.clear();
  });

  win.addEventListener('pageshow', (event) => {
    // Restored from the back/forward cache: its database worker is gone, so start over. A reload is
    // never itself restored from the cache, so this cannot loop.
    if ((event as PageTransitionEvent).persisted) win.location.reload();
  });
}

if (typeof window !== 'undefined' && typeof window.Worker === 'function') installPageLifecycle(window);
