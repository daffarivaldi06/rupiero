import { installPageLifecycle, type PageWindow } from '../pageLifecycle.web';

class FakeWorker {
  terminated = false;
  constructor(public url: string | URL) {}
  terminate() {
    this.terminated = true;
  }
}

/** Just enough of `window`: Worker, location.reload and page lifecycle events. */
function fakeWindow() {
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  const win = {
    Worker: FakeWorker as unknown as typeof Worker,
    location: { reload: jest.fn() },
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    fire: (type: string, event: unknown = {}) => listeners.get(type)?.forEach((listener) => listener(event)),
  };
  return win;
}
const asWindow = (win: ReturnType<typeof fakeWindow>) => win as unknown as PageWindow;

describe('installPageLifecycle', () => {
  it('terminates the workers started after it, when the page is hidden', () => {
    const win = fakeWindow();
    const before = new win.Worker('blob:early') as unknown as FakeWorker;
    installPageLifecycle(asWindow(win));
    const sqlite = new win.Worker('blob:sqlite') as unknown as FakeWorker;
    expect(sqlite).toBeInstanceOf(FakeWorker);

    win.fire('pagehide', { persisted: true });
    expect(sqlite.terminated).toBe(true);
    expect(before.terminated).toBe(false); // not recorded: the database opens after the install
  });

  it('also terminates them when the page is unloaded for good', () => {
    const win = fakeWindow();
    installPageLifecycle(asWindow(win));
    const sqlite = new win.Worker('blob:sqlite') as unknown as FakeWorker;
    win.fire('pagehide', { persisted: false });
    expect(sqlite.terminated).toBe(true);
  });

  it('reloads a page restored from the back/forward cache, and only then', () => {
    const win = fakeWindow();
    installPageLifecycle(asWindow(win));
    win.fire('pageshow', { persisted: false });
    expect(win.location.reload).not.toHaveBeenCalled();
    win.fire('pageshow', { persisted: true });
    expect(win.location.reload).toHaveBeenCalledTimes(1);
  });

  it('installs only once per window', () => {
    const win = fakeWindow();
    installPageLifecycle(asWindow(win));
    const wrapped = win.Worker;
    installPageLifecycle(asWindow(win));
    expect(win.Worker).toBe(wrapped);
    win.fire('pageshow', { persisted: true });
    expect(win.location.reload).toHaveBeenCalledTimes(1);
  });
});
