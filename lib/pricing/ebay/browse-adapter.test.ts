import { describe, expect, it } from 'vitest';
import {
  AUCTION_SOURCE_NAME,
  BROWSE_SOURCE_NAME,
  buildBrowseKeyword,
  buildItemSummarySearchUrl,
  mapItemSummariesToSnapshot,
} from './browse-adapter';
import type { EbayConfig } from './ebay-config';
import sampleResponse from './fixtures/item-summary.sample.json';

const config: EbayConfig = {
  environment: 'sandbox',
  clientId: 'id',
  clientSecret: 'secret',
  apiBaseUrl: 'https://api.sandbox.ebay.com',
  oauthTokenUrl: 'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
};

describe('buildBrowseKeyword', () => {
  it('prefers the English card name while biasing toward the Korean printing', () => {
    expect(
      buildBrowseKeyword({
        cardPrintingId: 'p1',
        cardName: '리자몽 ex',
        nameEn: 'Charizard ex',
        collectorNumber: '201/165',
      }),
    ).toBe('Charizard ex 201/165 Korean');
  });

  it('falls back to collector number + set code when no English name exists', () => {
    // The Korean card name returns nothing on eBay, so unmapped cards (Trainers,
    // etc.) search by number + set instead.
    expect(
      buildBrowseKeyword({
        cardPrintingId: 'p1',
        cardName: '박사의 연구',
        collectorNumber: '201/165',
        setCode: 'SV2a',
      }),
    ).toBe('201/165 SV2a Korean Pokemon');
  });
});

describe('buildItemSummarySearchUrl', () => {
  it('encodes the query and limit', () => {
    const url = new URL(buildItemSummarySearchUrl(config, 'Charizard 201/165 Korean', 50));
    expect(url.pathname).toBe('/buy/browse/v1/item_summary/search');
    expect(url.searchParams.get('q')).toBe('Charizard 201/165 Korean');
    expect(url.searchParams.get('limit')).toBe('50');
  });
});

describe('mapItemSummariesToSnapshot', () => {
  it('produces a median asking snapshot in the target currency', () => {
    const snapshot = mapItemSummariesToSnapshot(sampleResponse, {
      cardPrintingId: 'printing-4',
      snapshotDate: '2026-05-29',
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.sourceName).toBe(BROWSE_SOURCE_NAME);
    expect(snapshot?.market).toBe('NA');
    expect(snapshot?.currency).toBe('USD');
    // USD prices are 139.99, 162.00, 210.00 (GBP listing excluded); median = 162.00
    expect(snapshot?.avgPrice).toBe(162);
    expect(snapshot?.minPrice).toBe(139.99);
    expect(snapshot?.maxPrice).toBe(210);
    expect(snapshot?.sampleCount).toBe(3);
    expect(snapshot?.aggregationMethod).toBe('browse_asking_median');
  });

  it('links to the cheapest listing via sourceUrl', () => {
    const snapshot = mapItemSummariesToSnapshot(sampleResponse, {
      cardPrintingId: 'printing-4',
      snapshotDate: '2026-05-29',
    });

    // Cheapest USD listing is 139.99 → item 111.
    expect(snapshot?.sourceUrl).toBe('https://www.ebay.com/itm/111');
  });

  it('falls back to the eBay search page when the cheapest listing has no URL', () => {
    const snapshot = mapItemSummariesToSnapshot(
      { itemSummaries: [{ price: { value: '50.00', currency: 'USD' } }] },
      { cardPrintingId: 'p1', snapshotDate: '2026-05-29', keyword: 'Charizard 201/165 Korean' },
    );

    expect(snapshot?.sourceUrl).toContain('_nkw=Charizard');
  });

  it('aggregates auction current bids under the ebay_auction source', () => {
    const snapshot = mapItemSummariesToSnapshot(
      {
        itemSummaries: [
          {
            currentBidPrice: { value: '80.00', currency: 'USD' },
            itemWebUrl: 'https://www.ebay.com/itm/777',
          },
          { currentBidPrice: { value: '120.00', currency: 'USD' } },
        ],
      },
      { cardPrintingId: 'p1', snapshotDate: '2026-05-29', buyingOption: 'AUCTION' },
    );

    expect(snapshot?.sourceName).toBe(AUCTION_SOURCE_NAME);
    expect(snapshot?.aggregationMethod).toBe('auction_bid_median');
    expect(snapshot?.minPrice).toBe(80);
    expect(snapshot?.sourceUrl).toBe('https://www.ebay.com/itm/777');
  });

  it('returns null when there are no priced listings', () => {
    expect(
      mapItemSummariesToSnapshot({ itemSummaries: [] }, {
        cardPrintingId: 'p1',
        snapshotDate: '2026-05-29',
      }),
    ).toBeNull();
  });
});

describe('buildItemSummarySearchUrl buyingOption', () => {
  it('filters auctions when buyingOption is AUCTION', () => {
    const url = new URL(buildItemSummarySearchUrl(config, 'Charizard', 50, 'AUCTION'));
    expect(url.searchParams.get('filter')).toBe('buyingOptions:{AUCTION}');
  });
});
