// Native: there are no tabs, and opening again in the app works. See startupRecovery.web.ts for the web.

export function isOpenInAnotherTab(_error: Error): boolean {
  return false;
}

export function retryStartup(retryInApp: () => void): void {
  retryInApp();
}
