// ECB reference rates through Frankfurter (https://frankfurter.dev), no API key. Checked 2026-10-31:
// GET /v1/latest?base=EUR&symbols=IDR → {"amount":1.0,"base":"EUR","date":"2026-10-30","rates":{"IDR":20275.17}}
import { isValidLocalDate } from '../domain/dates';
import { parseRateMicro, type ReferenceRate } from '../domain/fx';

export const FRANKFURTER_LATEST_URL = 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=IDR';
export const FETCH_TIMEOUT_MS = 5000;

export class RateFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateFetchError';
  }
}

type Fetch = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** The latest EUR→IDR reference rate. Throws RateFetchError on network errors, timeouts and odd responses. */
export async function fetchEurIdrRate(fetchImpl: Fetch = fetch, timeoutMs = FETCH_TIMEOUT_MS): Promise<ReferenceRate> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let body: unknown;
  try {
    const response = await fetchImpl(FRANKFURTER_LATEST_URL, { signal: controller.signal });
    if (!response.ok) throw new RateFetchError(`HTTP ${response.status}`);
    body = await response.json();
  } catch (e) {
    if (e instanceof RateFetchError) throw e;
    throw new RateFetchError(controller.signal.aborted ? 'Timed out' : `Network error: ${String(e)}`);
  } finally {
    clearTimeout(timer);
  }
  return parseLatest(body);
}

function parseLatest(body: unknown): ReferenceRate {
  const data = body as { base?: unknown; date?: unknown; rates?: { IDR?: unknown } } | null;
  if (!data || data.base !== 'EUR' || typeof data.date !== 'string' || !isValidLocalDate(data.date)) {
    throw new RateFetchError('Unexpected response');
  }
  const idr = data.rates?.IDR;
  if (typeof idr !== 'number') throw new RateFetchError('No IDR rate in response');
  try {
    return { date: data.date, rateMicro: parseRateMicro(idr) };
  } catch {
    throw new RateFetchError(`Invalid IDR rate: ${idr}`);
  }
}
