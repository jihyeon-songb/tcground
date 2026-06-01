import { describe, expect, it, vi } from 'vitest';
import {
  collectKreamTrades,
  mapKreamTradesToObservations,
  parseKreamOption,
} from './kream-adapter';
import { KREAM_SOURCE_NAME } from './kream-config';
import { PriceSourceAccessNotGrantedError } from '../price-source.types';
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
});
