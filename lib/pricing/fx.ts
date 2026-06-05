import type { SnapshotAggregate } from './price-source.types';

export const KOREA_EXIM_FX_PROVIDER = 'korea_exim';
export const DEFAULT_DISPLAY_CURRENCY = 'KRW';
export const KOREA_EXIM_EXCHANGE_URL =
  'https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON';

export interface ExchangeRateInput {
  baseCurrency: string;
  quoteCurrency: string;
  /** Quote amount per one base-currency unit. Example: USD/KRW = 1380.25. */
  rate: number;
  /** `YYYY-MM-DD`. */
  rateDate: string;
  provider: string;
  fetchedAt: string;
  rawPayload: Record<string, unknown>;
}

interface KoreaEximRateRow {
  result?: number;
  cur_unit?: string;
  deal_bas_r?: string;
  cur_nm?: string;
}

export interface FetchKoreaEximOptions {
  authKey?: string;
  fetchImpl?: typeof fetch;
  /** `YYYY-MM-DD`; defaults to today UTC. */
  rateDate?: string;
  /** Retry prior dates when the provider returns no rates, e.g. weekends. */
  lookbackDays?: number;
}

export function buildKoreaEximExchangeUrl(authKey: string, rateDate: string): string {
  const url = new URL(KOREA_EXIM_EXCHANGE_URL);
  url.searchParams.set('authkey', authKey);
  url.searchParams.set('searchdate', toKoreaEximDate(rateDate));
  url.searchParams.set('data', 'AP01');
  return url.toString();
}

export async function fetchKoreaEximExchangeRates(
  options: FetchKoreaEximOptions = {},
): Promise<ExchangeRateInput[]> {
  const authKey = options.authKey ?? process.env.KOREA_EXIM_FX_API_KEY;
  if (!authKey) {
    throw new Error('Korea Eximbank FX import requires KOREA_EXIM_FX_API_KEY');
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const requestedDate = options.rateDate ?? new Date().toISOString().slice(0, 10);
  const lookbackDays = options.lookbackDays ?? 7;

  for (let offset = 0; offset <= lookbackDays; offset += 1) {
    const rateDate = addDays(requestedDate, -offset);
    const response = await fetchImpl(buildKoreaEximExchangeUrl(authKey, rateDate));
    if (!response.ok) {
      const detail = await safeReadText(response);
      throw new Error(`Korea Eximbank FX fetch failed (${response.status}): ${detail}`);
    }

    const payload = (await response.json()) as unknown;
    const rates = parseKoreaEximExchangeRates(payload, {
      rateDate,
      fetchedAt: new Date().toISOString(),
    });
    if (rates.length > 0) return rates;
  }

  return [];
}

export function parseKoreaEximExchangeRates(
  payload: unknown,
  context: { rateDate: string; fetchedAt: string },
): ExchangeRateInput[] {
  if (!Array.isArray(payload)) return [];

  const rates: ExchangeRateInput[] = [];
  for (const row of payload as KoreaEximRateRow[]) {
    if (row.result !== undefined && row.result !== 1) continue;

    const unit = parseKoreaEximCurrencyUnit(row.cur_unit);
    if (!unit) continue;

    const rawRate = parseNumericRate(row.deal_bas_r);
    if (!Number.isFinite(rawRate) || rawRate <= 0) continue;

    rates.push({
      baseCurrency: unit.currency,
      quoteCurrency: DEFAULT_DISPLAY_CURRENCY,
      rate: roundRate(rawRate / unit.unitAmount),
      rateDate: context.rateDate,
      provider: KOREA_EXIM_FX_PROVIDER,
      fetchedAt: context.fetchedAt,
      rawPayload: {
        curUnit: row.cur_unit ?? null,
        curName: row.cur_nm ?? null,
        dealBasRate: row.deal_bas_r ?? null,
      },
    });
  }

  if (rates.length > 0 && !rates.some((rate) => rate.baseCurrency === DEFAULT_DISPLAY_CURRENCY)) {
    rates.push(identityKrwRate(context.rateDate, context.fetchedAt));
  }

  return rates;
}

export function applyDisplayCurrencyToSnapshots(
  snapshots: readonly SnapshotAggregate[],
  rates: readonly ExchangeRateInput[],
  displayCurrency = DEFAULT_DISPLAY_CURRENCY,
): SnapshotAggregate[] {
  return snapshots.map((snapshot) =>
    applyDisplayCurrencyToSnapshot(snapshot, rates, displayCurrency),
  );
}

export function applyDisplayCurrencyToSnapshot(
  snapshot: SnapshotAggregate,
  rates: readonly ExchangeRateInput[],
  displayCurrency = DEFAULT_DISPLAY_CURRENCY,
): SnapshotAggregate {
  const sourceCurrency = normalizeCurrency(snapshot.currency);
  const targetCurrency = normalizeCurrency(displayCurrency);
  const rate = findExchangeRate(rates, sourceCurrency, targetCurrency, snapshot.snapshotDate);

  if (!rate) {
    return snapshot;
  }

  return {
    ...snapshot,
    sourceCurrency,
    sourceAvgPrice: snapshot.avgPrice,
    sourceMinPrice: snapshot.minPrice,
    sourceMaxPrice: snapshot.maxPrice,
    displayCurrency: targetCurrency,
    displayAvgPrice: convertNullablePrice(snapshot.avgPrice, rate.rate),
    displayMinPrice: convertNullablePrice(snapshot.minPrice, rate.rate),
    displayMaxPrice: convertNullablePrice(snapshot.maxPrice, rate.rate),
    fxRate: rate.rate,
    fxRateDate: rate.rateDate,
    fxProvider: rate.provider,
  };
}

export function findExchangeRate(
  rates: readonly ExchangeRateInput[],
  baseCurrency: string,
  quoteCurrency: string,
  targetDate: string,
): ExchangeRateInput | null {
  const normalizedBase = normalizeCurrency(baseCurrency);
  const normalizedQuote = normalizeCurrency(quoteCurrency);

  if (normalizedBase === normalizedQuote) {
    return identityRate(normalizedBase, normalizedQuote, targetDate);
  }

  const candidates = rates
    .filter(
      (rate) =>
        normalizeCurrency(rate.baseCurrency) === normalizedBase &&
        normalizeCurrency(rate.quoteCurrency) === normalizedQuote &&
        rate.rateDate <= targetDate,
    )
    .sort((a, b) => b.rateDate.localeCompare(a.rateDate));

  return candidates[0] ?? null;
}

export function collectSnapshotFxDates(snapshots: readonly SnapshotAggregate[]): string[] {
  return Array.from(
    new Set(
      snapshots
        .filter((snapshot) => normalizeCurrency(snapshot.currency) !== DEFAULT_DISPLAY_CURRENCY)
        .map((snapshot) => snapshot.snapshotDate),
    ),
  ).sort();
}

export function toKoreaEximDate(rateDate: string): string {
  return rateDate.replaceAll('-', '');
}

function parseKoreaEximCurrencyUnit(
  value: string | undefined,
): { currency: string; unitAmount: number } | null {
  const match = value?.match(/^([A-Z]{3})(?:\((\d+)\))?$/);
  if (!match) return null;

  return {
    currency: match[1],
    unitAmount: match[2] ? Number.parseInt(match[2], 10) : 1,
  };
}

function parseNumericRate(value: string | undefined): number {
  return Number.parseFloat((value ?? '').replaceAll(',', ''));
}

function normalizeCurrency(value: string): string {
  return value.toUpperCase();
}

function convertNullablePrice(value: number | null, rate: number): number | null {
  return value === null ? null : roundCurrency(value * rate);
}

function identityKrwRate(rateDate: string, fetchedAt: string): ExchangeRateInput {
  return {
    ...identityRate(DEFAULT_DISPLAY_CURRENCY, DEFAULT_DISPLAY_CURRENCY, rateDate),
    fetchedAt,
  };
}

function identityRate(
  baseCurrency: string,
  quoteCurrency: string,
  rateDate: string,
): ExchangeRateInput {
  return {
    baseCurrency,
    quoteCurrency,
    rate: 1,
    rateDate,
    provider: 'identity',
    fetchedAt: new Date().toISOString(),
    rawPayload: {},
  };
}

function addDays(date: string, amount: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundRate(value: number): number {
  return Math.round(value * 100000000) / 100000000;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '<no body>';
  }
}
