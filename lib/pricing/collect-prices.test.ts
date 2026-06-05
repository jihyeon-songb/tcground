import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import {
  insertPriceObservations,
  selectCardWindow,
  splitIntoSourceBatches,
  upsertExchangeRates,
} from './collect-prices';
import type { ExchangeRateInput } from './fx';
import type { PriceObservationInput } from './price-source.types';

function rate(overrides: Partial<ExchangeRateInput> = {}): ExchangeRateInput {
  return {
    baseCurrency: 'USD',
    quoteCurrency: 'KRW',
    rate: 1380.5,
    rateDate: '2026-05-14',
    provider: 'korea_exim',
    fetchedAt: '2026-05-14T01:00:00Z',
    rawPayload: {},
    ...overrides,
  };
}

describe('upsertExchangeRates', () => {
  it('deduplicates rows by exchange-rate conflict key before upsert', async () => {
    const upsertedRows: unknown[][] = [];
    const supabase = {
      from: () => ({
        upsert: (rows: unknown[]) => {
          upsertedRows.push(rows);
          return Promise.resolve({ error: null });
        },
      }),
    } as unknown as SupabaseClient;

    const written = await upsertExchangeRates(supabase, [
      rate({ fetchedAt: '2026-05-14T01:00:00Z' }),
      rate({ fetchedAt: '2026-05-14T02:00:00Z' }),
      rate({ baseCurrency: 'JPY', rate: 9.5 }),
    ]);

    expect(written).toBe(2);
    expect(upsertedRows).toHaveLength(1);
    expect(upsertedRows[0]).toMatchObject([
      { base_currency: 'USD', quote_currency: 'KRW', rate_date: '2026-05-14' },
      { base_currency: 'JPY', quote_currency: 'KRW', rate_date: '2026-05-14' },
    ]);
  });
});

describe('selectCardWindow', () => {
  it('applies offset and limit for retryable catalog windows', () => {
    expect(selectCardWindow([0, 1, 2, 3, 4], { cardOffset: 2, cardLimit: 2 })).toEqual([2, 3]);
  });

  it('keeps the remainder when limit is omitted', () => {
    expect(selectCardWindow([0, 1, 2, 3], { cardOffset: 1 })).toEqual([1, 2, 3]);
  });
});

describe('splitIntoSourceBatches', () => {
  it('splits cards into source-sized retry batches', () => {
    expect(splitIntoSourceBatches([0, 1, 2, 3, 4], 2)).toEqual([[0, 1], [2, 3], [4]]);
  });

  it('keeps a single batch when no source batch size is provided', () => {
    expect(splitIntoSourceBatches([0, 1, 2], undefined)).toEqual([[0, 1, 2]]);
  });

  it('does not create an empty run batch when the selected card window is empty', () => {
    expect(splitIntoSourceBatches([], 50)).toEqual([]);
  });
});

function observation(overrides: Partial<PriceObservationInput> = {}): PriceObservationInput {
  return {
    cardPrintingId: 'printing-1',
    sourceName: 'manual_kream',
    market: 'KR',
    currency: 'KRW',
    soldPrice: 120000,
    soldAt: '2026-05-14T00:00:00.000Z',
    observedAt: '2026-06-05T00:00:00.000Z',
    conditionLabel: 'near_mint',
    gradeCompany: null,
    gradeValue: null,
    variant: 'raw',
    listingTitle: 'KREAM trade',
    sourceUrl: 'https://kream.co.kr/products/804751',
    sourceItemId: '804751-grade-raw',
    confidenceScore: 0.95,
    rawPayload: {},
    ...overrides,
  };
}

describe('insertPriceObservations', () => {
  it('filters existing rows using source URL bucket identity even when item ids differ', async () => {
    const insertedRows: unknown[][] = [];
    const existing = [
      {
        source_name: 'manual_kream',
        source_item_id: '804751-grade-psa10',
        source_url: 'https://kream.co.kr/products/804751',
        sold_at: '2026-05-14 00:00:00+00',
        sold_price: '120000.00',
        variant: 'raw',
        grade_company: null,
        grade_value: null,
      },
    ];
    const supabase = {
      from: () => ({
        select: () => {
          const builder = {
            in: () => builder,
            then: (
              resolve: (value: { data: typeof existing; error: null }) => void,
            ) => resolve({ data: existing, error: null }),
          };
          return builder;
        },
        insert: (rows: unknown[]) => {
          insertedRows.push(rows);
          return Promise.resolve({ error: null });
        },
      }),
    } as unknown as SupabaseClient;

    const inserted = await insertPriceObservations(supabase, [
      observation({ sourceItemId: '804751-grade-raw' }),
    ]);

    expect(inserted).toBe(0);
    expect(insertedRows).toHaveLength(0);
  });
});
