import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  EBAY_SCRAPE_SOURCE_NAME,
  buildEbaySoldSearchUrl,
  collectEbayScrape,
  parseEbaySoldHtml,
} from './scrape-adapter';
import { PriceSourceAccessNotGrantedError, isAskingSource } from '../price-source.types';

const SOLD_HTML = readFileSync(join(__dirname, 'fixtures/sold-search.sample.html'), 'utf-8');
const SOLD_CARD_HTML = `
  <ul class="srp-results srp-list clearfix">
    <li class="s-card s-card--horizontal" data-listingid="205979361572">
      <a class="s-card__link image-treatment" href=https://www.ebay.com/itm/205979361572?_skw=Charizard+SAR+201%2F165+Korean&hash=item2ff553a124>
        <span class="s-card__title">Charizard SAR 201/165 Pokemon Card 151 Korean</span>
      </a>
      <div class="s-card__price"><span class="su-styled-text primary default">US $210.00</span></div>
      <div class="s-card__subtitle"><span>Sold May 18, 2026</span></div>
    </li>
    <li class="s-card s-card--horizontal" data-listingid="267402552242">
      <a class="s-card__link image-treatment" href=https://www.ebay.com/itm/267402552242?hash=item267>
        <span class="s-card__title">Pokemon Card Charizard SAR 201/165 Korean PSA 10</span>
      </a>
      <div class="s-card__price"><span>£196.65</span></div>
      <div class="s-card__caption"><span>판매됨 2026. 5. 17.</span></div>
    </li>
  </ul>
`;

const CHARIZARD_TARGET = {
  names: ['Charizard'],
  collectorNumber: '201/165',
  setTokens: [],
};

describe('buildEbaySoldSearchUrl', () => {
  it('sets the sold + completed filters and the TCG category', () => {
    const url = new URL(buildEbaySoldSearchUrl('Charizard SAR 201/165 Korean'));
    expect(url.origin + url.pathname).toBe('https://www.ebay.com/sch/i.html');
    expect(url.searchParams.get('_nkw')).toBe('Charizard SAR 201/165 Korean');
    expect(url.searchParams.get('LH_Sold')).toBe('1');
    expect(url.searchParams.get('LH_Complete')).toBe('1');
    expect(url.searchParams.get('_sacat')).toBe('183454');
  });
});

describe('parseEbaySoldHtml', () => {
  it('parses sold observations and classifies grade from the title', () => {
    const observations = parseEbaySoldHtml(SOLD_HTML, {
      cardPrintingId: 'printing-2',
      target: CHARIZARD_TARGET,
      observedAt: '2026-05-21T00:00:00Z',
    });

    // Two real sold items; the "Shop on eBay" promo block has no sold date and is dropped.
    expect(observations).toHaveLength(2);

    const [raw, graded] = observations;
    expect(raw.sourceName).toBe(EBAY_SCRAPE_SOURCE_NAME);
    expect(raw.market).toBe('NA');
    expect(raw.currency).toBe('USD');
    expect(raw.soldPrice).toBe(210);
    expect(raw.soldAt).toBe(new Date('Mar 27, 2026').toISOString());
    expect(raw.variant).toBe('raw');
    expect(raw.sourceItemId).toBe('318064794644');
    expect(raw.sourceUrl).toBe('https://www.ebay.com/itm/318064794644');
    expect(raw.listingTitle).toContain('Charizard SAR 201/165');

    expect(graded.variant).toBe('graded');
    expect(graded.gradeCompany).toBe('PSA');
    expect(graded.gradeValue).toBe('8');
    expect(graded.soldPrice).toBe(245);
  });

  it('scores each listing against the target so the wrong card scores lower', () => {
    const [raw, graded] = parseEbaySoldHtml(SOLD_HTML, {
      cardPrintingId: 'printing-2',
      target: CHARIZARD_TARGET,
    });

    // Exact card (name + 201/165): name 0.5 + full number 0.3.
    expect(raw.confidenceScore).toBeCloseTo(0.8, 5);
    // A different Charizard (#104/100): name matches but the number does not.
    expect(graded.confidenceScore).toBeCloseTo(0.5, 5);
  });

  it('does not store seller/buyer identity in the payload', () => {
    const [observation] = parseEbaySoldHtml(SOLD_HTML, {
      cardPrintingId: 'printing-2',
      target: CHARIZARD_TARGET,
    });
    expect(observation.rawPayload).toEqual({ itemId: '318064794644' });
  });

  it('parses the newer s-card search result markup', () => {
    const [raw, graded] = parseEbaySoldHtml(SOLD_CARD_HTML, {
      cardPrintingId: 'printing-2',
      target: { ...CHARIZARD_TARGET, setTokens: ['151'] },
      observedAt: '2026-06-05T00:00:00Z',
    });

    expect(raw.sourceItemId).toBe('205979361572');
    expect(raw.sourceUrl).toBe('https://www.ebay.com/itm/205979361572');
    expect(raw.currency).toBe('USD');
    expect(raw.soldPrice).toBe(210);
    expect(raw.soldAt).toBe(new Date('May 18, 2026').toISOString());
    expect(raw.confidenceScore).toBeCloseTo(1, 5);

    expect(graded.sourceItemId).toBe('267402552242');
    expect(graded.currency).toBe('GBP');
    expect(graded.variant).toBe('graded');
    expect(graded.gradeCompany).toBe('PSA');
    expect(graded.gradeValue).toBe('10');
    expect(graded.soldAt).toBe(new Date(Date.UTC(2026, 4, 17)).toISOString());
  });
});

describe('collectEbayScrape', () => {
  it('throws PriceSourceAccessNotGrantedError when scraping is not enabled', async () => {
    const fetchImpl = vi.fn();

    await expect(
      collectEbayScrape(
        'Charizard SAR 201/165 Korean',
        { cardPrintingId: 'printing-2', target: CHARIZARD_TARGET },
        { accessGranted: false, fetchImpl },
      ),
    ).rejects.toBeInstanceOf(PriceSourceAccessNotGrantedError);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fetches and parses when enabled', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => SOLD_HTML,
    } as Response);

    const observations = await collectEbayScrape(
      'Charizard SAR 201/165 Korean',
      { cardPrintingId: 'printing-2', target: CHARIZARD_TARGET },
      { accessGranted: true, fetchImpl },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(observations).toHaveLength(2);
  });

  it('treats eBay browser verification HTML as a blocked scrape', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<html><head><title>중단이 발생하여 죄송합니다.</title></head><body><h1>eBay에 액세스하기 전에 브라우저를 확인하고 있습니다.</h1><script src="splashui.js"></script></body></html>',
    } as Response);

    await expect(
      collectEbayScrape(
        'Charizard SAR 201/165 Korean',
        { cardPrintingId: 'printing-2', target: CHARIZARD_TARGET },
        { accessGranted: true, fetchImpl },
      ),
    ).rejects.toThrow('browser verification');
  });
});

describe('ebay_scrape source classification', () => {
  it('is a sold source (not an asking source)', () => {
    expect(isAskingSource(EBAY_SCRAPE_SOURCE_NAME)).toBe(false);
  });
});
