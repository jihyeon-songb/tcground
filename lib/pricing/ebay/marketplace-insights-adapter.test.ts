import { describe, expect, it, vi } from 'vitest';
import {
  collectItemSales,
  MARKETPLACE_INSIGHTS_SOURCE_NAME,
  mapItemSalesToObservations,
} from './marketplace-insights-adapter';
import { EbayAccessNotGrantedError } from '../price-source.types';

const itemSalesPayload = {
  itemSales: [
    {
      itemId: 'v1|389546254393|0',
      title: 'Pokemon TCG Korean Charizard ex SAR 201/165',
      lastSoldPrice: { value: '139.99', currency: 'USD' },
      lastSoldDate: '2026-01-30T12:49:00.000Z',
      condition: 'Used',
      conditionId: '3000',
      totalSoldQuantity: 1,
      itemWebUrl: 'https://www.ebay.com/itm/389546254393',
      seller: { username: 'should-not-be-stored' },
    },
    {
      itemId: 'v1|invalid|0',
      lastSoldPrice: { value: 'N/A', currency: 'USD' },
      lastSoldDate: '2026-01-30T00:00:00.000Z',
    },
  ],
};

describe('mapItemSalesToObservations', () => {
  it('maps valid sales and drops unparseable prices', () => {
    const observations = mapItemSalesToObservations(itemSalesPayload, {
      cardPrintingId: 'printing-4',
      market: 'NA',
      confidenceScore: 0.9,
      observedAt: '2026-05-29T00:00:00Z',
    });

    expect(observations).toHaveLength(1);
    const [observation] = observations;
    expect(observation.sourceName).toBe(MARKETPLACE_INSIGHTS_SOURCE_NAME);
    expect(observation.soldPrice).toBeCloseTo(139.99);
    expect(observation.soldAt).toBe('2026-01-30T12:49:00.000Z');
    expect(observation.sourceItemId).toBe('v1|389546254393|0');
  });

  it('minimizes the stored payload and excludes seller identity', () => {
    const [observation] = mapItemSalesToObservations(itemSalesPayload, {
      cardPrintingId: 'printing-4',
      market: 'NA',
      confidenceScore: 0.9,
    });

    expect(observation.rawPayload).toEqual({ conditionId: '3000', totalSoldQuantity: 1 });
    expect(JSON.stringify(observation.rawPayload)).not.toContain('should-not-be-stored');
  });
});

describe('collectItemSales', () => {
  it('throws EbayAccessNotGrantedError when access is not granted', async () => {
    const fetchImpl = vi.fn();

    await expect(
      collectItemSales(
        'Charizard 201/165 Korean',
        { cardPrintingId: 'printing-4', market: 'NA', confidenceScore: 0.9 },
        { accessGranted: false, fetchImpl },
      ),
    ).rejects.toBeInstanceOf(EbayAccessNotGrantedError);

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
