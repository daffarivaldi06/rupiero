import { todayLocal, type LocalDate } from '../../domain/dates';
import type { Locale } from '../../i18n';
import { getLocale } from '../../i18n/locale';
import type { Db } from '../client';
import { notifyDataChanged } from '../events';
import { SAMPLE_DATA_SEEDED_KEY, seedSampleData } from '../seed';
import { getSetting, setSetting } from './settings';

export const SAMPLE_OFFER_DISMISSED_KEY = 'sample_offer_dismissed';

/**
 * Whether to offer sample data: never loaded, never dismissed, and nothing recorded yet. The
 * default accounts and categories every new database gets do not count as data.
 */
export async function shouldOfferSampleData(db: Db): Promise<boolean> {
  const [seeded, dismissed, used] = await Promise.all([
    getSetting(db, SAMPLE_DATA_SEEDED_KEY),
    getSetting(db, SAMPLE_OFFER_DISMISSED_KEY),
    db.getFirstAsync<{ used: number }>(
      'SELECT EXISTS (SELECT 1 FROM transactions) OR EXISTS (SELECT 1 FROM transfers) AS used',
    ),
  ]);
  return seeded !== '1' && dismissed !== '1' && !used?.used;
}

/** Adds the sample data (the same seed as development builds). */
export async function loadSampleData(db: Db, options: { today?: LocalDate; locale?: Locale } = {}): Promise<void> {
  await seedSampleData(db, { today: options.today ?? todayLocal(), locale: options.locale ?? getLocale() });
  notifyDataChanged();
}

/** "No thanks": the database stays empty and the offer does not come back. */
export async function dismissSampleData(db: Db): Promise<void> {
  await setSetting(db, SAMPLE_OFFER_DISMISSED_KEY, '1');
  notifyDataChanged();
}
