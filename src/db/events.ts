// One signal for "the data changed", fired by every repo write. The app listens to reload screens
// and redraw the home-screen widget; tests and the widget's headless task simply have no listeners.

type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribes to data changes; returns the unsubscribe function. */
export function onDataChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyDataChanged(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (e) {
      console.error(e);
    }
  }
}
