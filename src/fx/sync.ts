import type { Db } from '../db/client';
import { getLatestReferenceRate, saveReferenceRate } from '../db/repos/fxRates';
import { getSetting, setSetting } from '../db/repos/settings';
import { todayLocal, type LocalDate } from '../domain/dates';
import type { ReferenceRate } from '../domain/fx';
import { fetchEurIdrRate } from './frankfurter';

/** Local date of the last successful check, so the API is asked at most once a day. */
export const FX_CHECKED_ON_KEY = 'fx_checked_on';

export type SyncResult = 'skipped' | 'updated' | 'failed';

export interface SyncOptions {
  fetchRate?: () => Promise<ReferenceRate>;
  today?: LocalDate;
}

/**
 * Refreshes the stored ECB rate once a day. Failures (offline, timeout, bad response) are silent:
 * the last stored rate stays in use and the next app start or foreground tries again.
 */
export async function syncReferenceRate(db: Db, { fetchRate = fetchEurIdrRate, today = todayLocal() }: SyncOptions = {}): Promise<SyncResult> {
  if ((await getSetting(db, FX_CHECKED_ON_KEY)) === today) return 'skipped';
  if ((await getLatestReferenceRate(db))?.date === today) {
    await setSetting(db, FX_CHECKED_ON_KEY, today);
    return 'skipped';
  }
  try {
    const rate = await fetchRate();
    await saveReferenceRate(db, rate);
    await setSetting(db, FX_CHECKED_ON_KEY, today);
    return 'updated';
  } catch {
    return 'failed';
  }
}
