import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { initDb } from '../../db/init';
import { getLatestReferenceRate, saveReferenceRate } from '../../db/repos/fxRates';
import { fetchEurIdrRate, FRANKFURTER_LATEST_URL, RateFetchError } from '../frankfurter';
import { syncReferenceRate } from '../sync';

const jsonResponse = (body: unknown, status = 200) => async () => ({ ok: status < 400, status, json: async () => body });
const LATEST = { amount: 1.0, base: 'EUR', date: '2026-10-30', rates: { IDR: 20275.17 } };

describe('fetchEurIdrRate', () => {
  it('asks Frankfurter for EUR→IDR and converts the rate without floats', async () => {
    const fetchMock = jest.fn(jsonResponse(LATEST));
    expect(await fetchEurIdrRate(fetchMock)).toEqual({ date: '2026-10-30', rateMicro: 20_275_170_000 });
    expect(fetchMock).toHaveBeenCalledWith(FRANKFURTER_LATEST_URL, expect.objectContaining({ signal: expect.anything() }));
  });

  it('turns network errors, HTTP errors and broken bodies into RateFetchError', async () => {
    await expect(fetchEurIdrRate(async () => Promise.reject(new TypeError('Network request failed')))).rejects.toThrow(RateFetchError);
    await expect(fetchEurIdrRate(jsonResponse({ message: 'not found' }, 404))).rejects.toThrow('HTTP 404');
    for (const body of [null, {}, { ...LATEST, base: 'USD' }, { ...LATEST, date: '30-10-2026' }, { ...LATEST, rates: {} }, { ...LATEST, rates: { IDR: -1 } }, { ...LATEST, rates: { IDR: '20275.17' } }]) {
      await expect(fetchEurIdrRate(jsonResponse(body))).rejects.toThrow(RateFetchError);
    }
  });

  it('gives up after the timeout', async () => {
    jest.useFakeTimers();
    const hanging = (_url: string, init?: { signal?: AbortSignal }) =>
      new Promise<never>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    const result = fetchEurIdrRate(hanging, 5000);
    jest.advanceTimersByTime(5000);
    await expect(result).rejects.toThrow('Timed out');
    jest.useRealTimers();
  });
});

describe('syncReferenceRate', () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await createTestDb();
    await initDb(db, { seed: false, locale: 'id', defaultCategories: false });
  });
  afterEach(() => db.close());

  const rate = { date: '2026-10-30', rateMicro: 20_275_170_000 };

  it('stores the fetched rate', async () => {
    expect(await syncReferenceRate(db, { fetchRate: async () => rate, today: '2026-10-31' })).toBe('updated');
    expect(await getLatestReferenceRate(db)).toEqual(rate);
  });

  it('fetches at most once a day', async () => {
    const fetchRate = jest.fn(async () => rate);
    await syncReferenceRate(db, { fetchRate, today: '2026-10-31' });
    expect(await syncReferenceRate(db, { fetchRate, today: '2026-10-31' })).toBe('skipped');
    expect(fetchRate).toHaveBeenCalledTimes(1);
    expect(await syncReferenceRate(db, { fetchRate, today: '2026-11-01' })).toBe('updated');
    expect(fetchRate).toHaveBeenCalledTimes(2);
  });

  it('does not fetch when today’s rate is already stored', async () => {
    await saveReferenceRate(db, { date: '2026-10-30', rateMicro: 1 });
    const fetchRate = jest.fn(async () => rate);
    expect(await syncReferenceRate(db, { fetchRate, today: '2026-10-30' })).toBe('skipped');
    expect(fetchRate).not.toHaveBeenCalled();
  });

  it('fails silently offline, keeps the last rate and retries next time', async () => {
    await saveReferenceRate(db, { date: '2026-10-29', rateMicro: 20_250_000_000 });
    const offline = jest.fn(async () => {
      throw new RateFetchError('Network error');
    });
    expect(await syncReferenceRate(db, { fetchRate: offline, today: '2026-10-31' })).toBe('failed');
    expect(await getLatestReferenceRate(db)).toEqual({ date: '2026-10-29', rateMicro: 20_250_000_000 });
    expect(await syncReferenceRate(db, { fetchRate: async () => rate, today: '2026-10-31' })).toBe('updated');
  });
});
