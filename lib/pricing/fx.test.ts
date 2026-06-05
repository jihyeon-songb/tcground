import { describe, expect, it, vi } from 'vitest';
import {
  applyDisplayCurrencyToSnapshot,
  buildKoreaEximExchangeUrl,
  fetchKoreaEximExchangeRates,
  findExchangeRate,
  parseKoreaEximExchangeRates,
} from './fx';
import type { SnapshotAggregate } from './price-source.types';

function snapshot(overrides: Partial<SnapshotAggregate> = {}): SnapshotAggregate {
  return {
    cardPrintingId: 'printing-1',
    snapshotDate: '2026-05-14',
    market: 'NA',
    currency: 'USD',
    variant: 'raw',
    conditionLabel: null,
    gradeCompany: null,
    gradeValue: null,
    avgPrice: 100,
    minPrice: 80,
    maxPrice: 120,
    sampleCount: 3,
    sourceName: 'ebay_browse',
    sourceUrl: null,
    aggregationMethod: 'browse_asking_median',
    ...overrides,
  };
}

describe('parseKoreaEximExchangeRates', () => {
  it('normalizes comma rates and 100-unit currency rows to per-unit KRW rates', () => {
    const rates = parseKoreaEximExchangeRates(
      [
        { result: 1, cur_unit: 'USD', deal_bas_r: '1,380.50', cur_nm: '미국 달러' },
        { result: 1, cur_unit: 'JPY(100)', deal_bas_r: '950.25', cur_nm: '일본 엔' },
      ],
      { rateDate: '2026-05-14', fetchedAt: '2026-05-14T01:00:00Z' },
    );

    expect(rates.find((rate) => rate.baseCurrency === 'USD')?.rate).toBe(1380.5);
    expect(rates.find((rate) => rate.baseCurrency === 'JPY')?.rate).toBe(9.5025);
    expect(rates.find((rate) => rate.baseCurrency === 'KRW')?.rate).toBe(1);
  });
});

describe('applyDisplayCurrencyToSnapshot', () => {
  it('attaches KRW display prices while preserving source currency', () => {
    const converted = applyDisplayCurrencyToSnapshot(snapshot(), [
      {
        baseCurrency: 'USD',
        quoteCurrency: 'KRW',
        rate: 1380.5,
        rateDate: '2026-05-14',
        provider: 'korea_exim',
        fetchedAt: '2026-05-14T01:00:00Z',
        rawPayload: {},
      },
    ]);

    expect(converted.currency).toBe('USD');
    expect(converted.sourceCurrency).toBe('USD');
    expect(converted.sourceAvgPrice).toBe(100);
    expect(converted.displayCurrency).toBe('KRW');
    expect(converted.displayAvgPrice).toBe(138050);
    expect(converted.fxRateDate).toBe('2026-05-14');
  });

  it('uses the most recent prior rate when the exact date is missing', () => {
    const rate = findExchangeRate(
      [
        {
          baseCurrency: 'USD',
          quoteCurrency: 'KRW',
          rate: 1300,
          rateDate: '2026-05-10',
          provider: 'korea_exim',
          fetchedAt: '2026-05-10T01:00:00Z',
          rawPayload: {},
        },
        {
          baseCurrency: 'USD',
          quoteCurrency: 'KRW',
          rate: 1400,
          rateDate: '2026-05-12',
          provider: 'korea_exim',
          fetchedAt: '2026-05-12T01:00:00Z',
          rawPayload: {},
        },
      ],
      'USD',
      'KRW',
      '2026-05-14',
    );

    expect(rate?.rate).toBe(1400);
    expect(rate?.rateDate).toBe('2026-05-12');
  });
});

describe('fetchKoreaEximExchangeRates', () => {
  it('builds AP01 URLs and falls back to a previous date when the first response is empty', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ result: 1, cur_unit: 'USD', deal_bas_r: '1,380.50' }]), {
          status: 200,
        }),
      );

    const rates = await fetchKoreaEximExchangeRates({
      authKey: 'test-key',
      fetchImpl,
      rateDate: '2026-05-14',
      lookbackDays: 1,
    });

    expect(fetchImpl).toHaveBeenCalledWith(buildKoreaEximExchangeUrl('test-key', '2026-05-14'));
    expect(fetchImpl).toHaveBeenLastCalledWith(buildKoreaEximExchangeUrl('test-key', '2026-05-13'));
    expect(rates.find((rate) => rate.baseCurrency === 'USD')?.rateDate).toBe('2026-05-13');
  });
});
