import { describe, expect, it, vi } from 'vitest';
import {
  buildKreamAsksUrl,
  buildKreamTradesUrl,
  collectKreamAskingSnapshots,
  collectKreamTrades,
  extractKreamProductId,
  mapKreamAsksToSnapshots,
  mapKreamTradesToObservations,
  parseKreamOption,
} from './kream-adapter';
import { KREAM_SOURCE_NAME } from './kream-config';
import { PriceSourceAccessNotGrantedError, isAskingSource } from '../price-source.types';
import asksPayload from './fixtures/asks.sample.json';
import tradesPayload from './fixtures/trades.sample.json';

describe('parseKreamOption', () => {
  it('parses graded option labels into company + numeric grade', () => {
    expect(parseKreamOption('PSA 10')).toEqual({
      variant: 'graded',
      gradeCompany: 'PSA',
      gradeValue: '10',
    });
    expect(parseKreamOption('BRG 8.5 영문')).toEqual({
      variant: 'graded',
      gradeCompany: 'BRG',
      gradeValue: '8.5',
    });
  });

  it('treats unknown/ungraded labels as raw', () => {
    expect(parseKreamOption('미감정')).toEqual({
      variant: 'raw',
      gradeCompany: null,
      gradeValue: null,
    });
    expect(parseKreamOption(undefined)).toEqual({
      variant: 'raw',
      gradeCompany: null,
      gradeValue: null,
    });
  });
});

describe('mapKreamTradesToObservations', () => {
  it('maps settled trades and drops unparseable prices', () => {
    const observations = mapKreamTradesToObservations(tradesPayload, {
      cardPrintingId: 'printing-4',
      confidenceScore: 0.82,
      productUrl: 'https://kream.co.kr/products/804751',
      observedAt: '2026-05-21T00:00:00Z',
    });

    expect(observations).toHaveLength(3);
    const [first] = observations;
    expect(first.sourceName).toBe(KREAM_SOURCE_NAME);
    expect(first.market).toBe('KR');
    expect(first.currency).toBe('KRW');
    expect(first.soldPrice).toBe(550000);
    expect(first.variant).toBe('graded');
    expect(first.gradeCompany).toBe('PSA');
    expect(first.gradeValue).toBe('10');
    expect(first.sourceUrl).toBe('https://kream.co.kr/products/804751');

    const raw = observations[2];
    expect(raw.variant).toBe('raw');
    expect(raw.gradeCompany).toBeNull();
  });

  it('minimizes the stored payload and excludes buyer identity', () => {
    const [observation] = mapKreamTradesToObservations(tradesPayload, {
      cardPrintingId: 'printing-4',
      confidenceScore: 0.82,
    });

    expect(observation.rawPayload).toEqual({ productId: '804751', optionLabel: 'PSA 10' });
    expect(JSON.stringify(observation.rawPayload)).not.toContain('should-not-be-stored');
  });
});

describe('extractKreamProductId / buildKreamTradesUrl', () => {
  it('extracts the numeric product id from a product URL', () => {
    expect(extractKreamProductId('https://kream.co.kr/products/804751')).toBe('804751');
    expect(extractKreamProductId('https://kream.co.kr/exhibition')).toBeNull();
  });

  it('builds the trade-history URL for a product', () => {
    expect(buildKreamTradesUrl('804751')).toBe(
      'https://kream.co.kr/api/products/804751/trading_infos',
    );
  });

  it('builds the asking-options URL for a product', () => {
    expect(buildKreamAsksUrl('804751')).toBe(
      'https://kream.co.kr/api/products/804751/sales_options',
    );
  });
});

describe('mapKreamAsksToSnapshots', () => {
  it('reduces active asks into median asking snapshots by grade bucket', () => {
    const snapshots = mapKreamAsksToSnapshots(asksPayload, {
      cardPrintingId: 'printing-4',
      snapshotDate: '2026-06-15',
      productUrl: 'https://kream.co.kr/products/804751',
    });

    expect(snapshots).toHaveLength(3);
    const psa10 = snapshots.find((snapshot) => snapshot.gradeCompany === 'PSA');
    expect(psa10).toMatchObject({
      cardPrintingId: 'printing-4',
      sourceName: KREAM_SOURCE_NAME,
      sourceUrl: 'https://kream.co.kr/products/804751',
      market: 'KR',
      currency: 'KRW',
      variant: 'graded',
      gradeCompany: 'PSA',
      gradeValue: '10',
      avgPrice: 560000,
      minPrice: 560000,
      maxPrice: 560000,
      sampleCount: 1,
      aggregationMethod: 'kream_asking_median',
    });

    const raw = snapshots.find((snapshot) => snapshot.variant === 'raw');
    expect(raw?.avgPrice).toBe(95000);
  });

  it('marks the automated KREAM source as asking', () => {
    expect(isAskingSource(KREAM_SOURCE_NAME)).toBe(true);
  });
});

describe('collectKreamTrades', () => {
  it('throws PriceSourceAccessNotGrantedError when access is not granted', async () => {
    const fetchImpl = vi.fn();

    await expect(
      collectKreamTrades(
        'https://kream.co.kr/products/804751',
        { cardPrintingId: 'printing-4', confidenceScore: 0.82 },
        { accessGranted: false, fetchImpl },
      ),
    ).rejects.toBeInstanceOf(PriceSourceAccessNotGrantedError);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fetches and maps trades when access is granted', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => tradesPayload,
    } as Response);

    const observations = await collectKreamTrades(
      'https://kream.co.kr/products/804751',
      { cardPrintingId: 'printing-4', confidenceScore: 0.82 },
      { accessGranted: true, fetchImpl },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://kream.co.kr/api/products/804751/trading_infos',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(observations).toHaveLength(3);
    expect(observations[0].sourceUrl).toBe('https://kream.co.kr/products/804751');
  });
});

describe('collectKreamAskingSnapshots', () => {
  it('throws PriceSourceAccessNotGrantedError when access is not granted', async () => {
    const fetchImpl = vi.fn();

    await expect(
      collectKreamAskingSnapshots(
        'https://kream.co.kr/products/804751',
        { cardPrintingId: 'printing-4', snapshotDate: '2026-06-15' },
        { accessGranted: false, fetchImpl },
      ),
    ).rejects.toBeInstanceOf(PriceSourceAccessNotGrantedError);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fetches and maps asks when access is granted', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => asksPayload,
    } as Response);

    const snapshots = await collectKreamAskingSnapshots(
      'https://kream.co.kr/products/804751',
      { cardPrintingId: 'printing-4', snapshotDate: '2026-06-15' },
      { accessGranted: true, fetchImpl },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://kream.co.kr/api/products/804751/sales_options',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(snapshots).toHaveLength(3);
    expect(snapshots[0].sourceUrl).toBe('https://kream.co.kr/products/804751');
    expect(
      snapshots.every((snapshot) => snapshot.aggregationMethod === 'kream_asking_median'),
    ).toBe(true);
  });
});
