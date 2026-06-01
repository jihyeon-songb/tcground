import { describe, expect, it } from 'vitest';
import {
  aggregateAskingObservations,
  aggregateObservations,
  removeOutliers,
  toSnapshotDate,
} from './aggregate';
import type { PriceObservationInput } from './price-source.types';

function soldObservation(overrides: Partial<PriceObservationInput> = {}): PriceObservationInput {
  return {
    cardPrintingId: 'printing-1',
    sourceName: 'ebay_sold',
    market: 'NA',
    currency: 'USD',
    soldPrice: 150,
    soldAt: '2026-03-01T12:00:00Z',
    observedAt: '2026-03-02T00:00:00Z',
    conditionLabel: 'near_mint',
    gradeCompany: null,
    gradeValue: null,
    variant: 'raw',
    listingTitle: 'Charizard SAR',
    sourceUrl: 'https://www.ebay.com/itm/1',
    sourceItemId: '1',
    confidenceScore: 0.9,
    rawPayload: {},
    ...overrides,
  };
}

describe('toSnapshotDate', () => {
  it('extracts the UTC date', () => {
    expect(toSnapshotDate('2026-03-01T12:00:00Z')).toBe('2026-03-01');
  });

  it('returns null for unparseable input', () => {
    expect(toSnapshotDate('not-a-date')).toBeNull();
  });
});

describe('removeOutliers', () => {
  it('keeps small samples unchanged', () => {
    expect(removeOutliers([10, 1000])).toEqual([10, 1000]);
  });

  it('drops an extreme value with the IQR rule on larger samples', () => {
    const result = removeOutliers([100, 105, 110, 115, 120, 5000]);
    expect(result).not.toContain(5000);
    expect(result).toContain(100);
  });
});

describe('aggregateObservations', () => {
  it('separates markets and conditions into distinct buckets', () => {
    const snapshots = aggregateObservations([
      soldObservation({ market: 'NA', currency: 'USD', soldPrice: 150 }),
      soldObservation({ market: 'KR', currency: 'KRW', soldPrice: 200000 }),
    ]);

    expect(snapshots).toHaveLength(2);
    const markets = snapshots.map((snapshot) => snapshot.market).sort();
    expect(markets).toEqual(['KR', 'NA']);
  });

  it('averages observations in the same bucket and counts the sample', () => {
    const snapshots = aggregateObservations([
      soldObservation({ soldPrice: 100 }),
      soldObservation({ soldPrice: 200, sourceItemId: '2' }),
    ]);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].avgPrice).toBe(150);
    expect(snapshots[0].minPrice).toBe(100);
    expect(snapshots[0].maxPrice).toBe(200);
    expect(snapshots[0].sampleCount).toBe(2);
    expect(snapshots[0].sourceName).toBe('aggregate');
    expect(snapshots[0].aggregationMethod).toBe('median_filtered');
  });

  it('drops observations below the confidence threshold', () => {
    const snapshots = aggregateObservations([
      soldObservation({ confidenceScore: 0.5 }),
    ]);

    expect(snapshots).toHaveLength(0);
  });

  it('groups graded sales separately from raw sales', () => {
    const snapshots = aggregateObservations([
      soldObservation({ variant: 'raw', soldPrice: 150 }),
      soldObservation({
        variant: 'graded',
        gradeCompany: 'PSA',
        gradeValue: '10',
        conditionLabel: null,
        soldPrice: 550,
      }),
    ]);

    expect(snapshots).toHaveLength(2);
  });
});

describe('aggregateAskingObservations', () => {
  function askingObservation(overrides: Partial<PriceObservationInput> = {}): PriceObservationInput {
    return soldObservation({
      sourceName: 'manual_bunjang',
      market: 'KR',
      currency: 'KRW',
      soldPrice: 60000,
      ...overrides,
    });
  }

  it('produces one median asking snapshot per source bucket and preserves the source name', () => {
    const snapshots = aggregateAskingObservations([
      askingObservation({ soldPrice: 60000 }),
      askingObservation({ soldPrice: 72000, sourceItemId: '2' }),
      askingObservation({ soldPrice: 95000, sourceItemId: '3' }),
    ]);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].avgPrice).toBe(72000);
    expect(snapshots[0].minPrice).toBe(60000);
    expect(snapshots[0].maxPrice).toBe(95000);
    expect(snapshots[0].sampleCount).toBe(3);
    expect(snapshots[0].sourceName).toBe('manual_bunjang');
    expect(snapshots[0].aggregationMethod).toBe('manual_asking_median');
  });

  it('keeps different sources in separate buckets', () => {
    const snapshots = aggregateAskingObservations([
      askingObservation({ sourceName: 'manual_bunjang', soldPrice: 60000 }),
      askingObservation({ sourceName: 'bunjang', soldPrice: 70000, sourceItemId: '2' }),
    ]);

    expect(snapshots).toHaveLength(2);
    expect(snapshots.map((s) => s.sourceName).sort()).toEqual(['bunjang', 'manual_bunjang']);
  });

  it('drops asking rows below the confidence threshold', () => {
    expect(aggregateAskingObservations([askingObservation({ confidenceScore: 0.5 })])).toHaveLength(
      0,
    );
  });
});
