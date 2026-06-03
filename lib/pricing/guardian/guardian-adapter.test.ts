import { describe, expect, it, vi } from 'vitest';
import {
  buildGuardianEstimateUrl,
  collectGuardianSnapshots,
  compareToGuardian,
  mapGuardianEstimatesToSnapshots,
} from './guardian-adapter';
import { GUARDIAN_SOURCE_NAME } from './guardian-config';
import type { SnapshotAggregate } from '../price-source.types';
import estimatePayload from './fixtures/estimate.sample.json';

describe('buildGuardianEstimateUrl', () => {
  it('builds an estimate URL with name + number', () => {
    const url = new URL(
      buildGuardianEstimateUrl({
        cardPrintingId: 'p4',
        cardName: '리자몽 ex',
        collectorNumber: '201/165',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://guardiantcg.app/api/estimate');
    expect(url.searchParams.get('name')).toBe('리자몽 ex');
    expect(url.searchParams.get('number')).toBe('201/165');
  });
});

describe('mapGuardianEstimatesToSnapshots', () => {
  it('maps each priced tier to a reference snapshot and drops zero-priced tiers', () => {
    const snapshots = mapGuardianEstimatesToSnapshots(estimatePayload, {
      cardPrintingId: 'printing-4',
      snapshotDate: '2026-05-21',
    });

    expect(snapshots).toHaveLength(2);

    const raw = snapshots.find((s) => s.variant === 'raw');
    expect(raw?.sourceName).toBe(GUARDIAN_SOURCE_NAME);
    expect(raw?.avgPrice).toBe(160.24);
    expect(raw?.minPrice).toBe(160.24);
    expect(raw?.maxPrice).toBe(160.24);
    expect(raw?.sampleCount).toBe(12);
    expect(raw?.aggregationMethod).toBe('guardian_estimate');
    expect(raw?.sourceUrl).toContain('guardiantcg.app');

    const graded = snapshots.find((s) => s.variant === 'graded');
    expect(graded?.gradeCompany).toBe('PSA');
    expect(graded?.gradeValue).toBe('10');
    expect(graded?.avgPrice).toBe(420);
  });
});

describe('collectGuardianSnapshots', () => {
  it('sends the API key and maps the response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => estimatePayload,
    } as Response);

    const snapshots = await collectGuardianSnapshots(
      { cardPrintingId: 'printing-4', cardName: '리자몽 ex', collectorNumber: '201/165' },
      { config: { apiKey: 'key-123' }, fetchImpl, snapshotDate: '2026-05-21' },
    );

    expect(snapshots).toHaveLength(2);
    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer key-123');
  });
});

describe('compareToGuardian', () => {
  const base: SnapshotAggregate = {
    cardPrintingId: 'p4',
    snapshotDate: '2026-05-21',
    market: 'NA',
    currency: 'USD',
    variant: 'raw',
    conditionLabel: null,
    gradeCompany: null,
    gradeValue: null,
    avgPrice: 180,
    minPrice: 150,
    maxPrice: 210,
    sampleCount: 5,
    sourceName: 'ebay_scrape',
    sourceUrl: null,
    aggregationMethod: 'median_filtered',
  };

  it('computes the delta ratio for a matching bucket', () => {
    const guardian: SnapshotAggregate = { ...base, sourceName: GUARDIAN_SOURCE_NAME, avgPrice: 160 };
    const result = compareToGuardian(base, guardian);
    expect(result.matched).toBe(true);
    expect(result.deltaRatio).toBeCloseTo((180 - 160) / 160);
  });

  it('does not compare across different grade buckets', () => {
    const guardian: SnapshotAggregate = {
      ...base,
      sourceName: GUARDIAN_SOURCE_NAME,
      variant: 'graded',
      gradeCompany: 'PSA',
      gradeValue: '10',
      avgPrice: 420,
    };
    const result = compareToGuardian(base, guardian);
    expect(result.matched).toBe(false);
    expect(result.deltaRatio).toBeNull();
  });
});
