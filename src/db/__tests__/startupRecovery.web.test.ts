import { classifyStartupError } from '../startupRecovery.web';

// The texts Chrome and expo-sqlite 16.x produce (captured from a real second tab).
const LOCK =
  "Error: NoModificationAllowedError: Failed to execute 'createSyncAccessHandle' on 'FileSystemFileHandle': Access Handles cannot be created if there is another open Access Handle or Writable stream associated with the same file.";
const STUCK = 'Error: Invalid VFS state';

describe('classifyStartupError', () => {
  it('recognises the lock error of a second tab', () => {
    expect(classifyStartupError(LOCK, false)).toEqual({ anotherTab: true, sawLockError: true });
  });

  it('treats "Invalid VFS state" as another tab only after the lock error in the same page', () => {
    expect(classifyStartupError(STUCK, true)).toEqual({ anotherTab: true, sawLockError: true });
    expect(classifyStartupError(STUCK, false)).toEqual({ anotherTab: false, sawLockError: false });
  });

  it('leaves other failures to the generic message', () => {
    expect(classifyStartupError('SecurityError: The operation is insecure.', false)).toEqual({ anotherTab: false, sawLockError: false });
    expect(classifyStartupError('Error: database disk image is malformed', true)).toEqual({ anotherTab: false, sawLockError: true });
  });
});
