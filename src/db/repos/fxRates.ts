import type { LocalDate } from '../../domain/dates';
import type { ReferenceRate } from '../../domain/fx';
import type { Db } from '../client';

// fx_rates only holds EUR→IDR (enforced by CHECK constraints), so the API takes no currency pair.

interface RateRow {
  date: string;
  rate_micro: number;
}

const toRate = (row: RateRow): ReferenceRate => ({ date: row.date, rateMicro: row.rate_micro });

/** Stores the ECB rate for its rate date, replacing an earlier fetch of the same date. */
export async function saveReferenceRate(db: Db, rate: ReferenceRate, source = 'ecb-frankfurter'): Promise<void> {
  if (!Number.isSafeInteger(rate.rateMicro) || rate.rateMicro <= 0) {
    throw new RangeError(`Invalid rate_micro: ${rate.rateMicro}`);
  }
  await db.runAsync(
    `INSERT INTO fx_rates (date, rate_micro, source) VALUES (?, ?, ?)
     ON CONFLICT (date, base, quote) DO UPDATE SET
       rate_micro = excluded.rate_micro, source = excluded.source, fetched_at = datetime('now')`,
    rate.date,
    rate.rateMicro,
    source,
  );
}

/** The newest stored rate, or null if none was ever fetched. */
export async function getLatestReferenceRate(db: Db): Promise<ReferenceRate | null> {
  const row = await db.getFirstAsync<RateRow>('SELECT date, rate_micro FROM fx_rates ORDER BY date DESC LIMIT 1');
  return row ? toRate(row) : null;
}

/** The rate in force on `date`: the newest one dated on or before it (ECB skips weekends and holidays). */
export async function getReferenceRateOn(db: Db, date: LocalDate): Promise<ReferenceRate | null> {
  const row = await db.getFirstAsync<RateRow>(
    'SELECT date, rate_micro FROM fx_rates WHERE date <= ? ORDER BY date DESC LIMIT 1',
    date,
  );
  return row ? toRate(row) : null;
}
