import { describe, expect, it } from 'vitest';
import {
  buildKreamSegmentedSearchKeywords,
  mapKreamSearchProductsToSnapshots,
  parseKreamSearchProductText,
} from './search-page-adapter';
import type { CardQuery } from '../collect-prices';

const charizard151: CardQuery = {
  cardPrintingId: 'printing-charizard-151-sar',
  cardName: '리자몽 ex',
  collectorNumber: '201/165',
  nameEn: 'Charizard ex',
  nameJa: null,
  setName: '포켓몬 카드 151',
  setCode: 'SV2A',
  rarity: 'SAR',
  kreamProductUrl: null,
};

const charizard151Rr: CardQuery = {
  ...charizard151,
  cardPrintingId: 'printing-charizard-151-rr',
  collectorNumber: '006/165',
  rarity: 'RR',
};

describe('parseKreamSearchProductText', () => {
  it('extracts product title, price, and trade count from rendered card text', () => {
    const product = parseKreamSearchProductText(
      '804751',
      [
        'Pokemon TCG',
        '포켓몬 TCG 리자몽 ex SAR 포켓몬 카드 151 (한글판)',
        '250,000원',
        '관심 103',
        '· 리뷰 2',
        '· 거래 9',
      ].join('\n'),
    );

    expect(product).toEqual({
      productId: '804751',
      productUrl: 'https://kream.co.kr/products/804751',
      title: '포켓몬 TCG 리자몽 ex SAR 포켓몬 카드 151 (한글판)',
      price: 250000,
      tradeCount: 9,
    });
  });

  it('rejects an implausible ₩1,000,000,000 placeholder price', () => {
    const product = parseKreamSearchProductText(
      '803593',
      'Pokemon TCG\n포켓몬 TCG 페르시온 AR 나이트원더러 (한글판)\n1,000,000,000원\n관심 1',
    );

    expect(product).toBeNull();
  });
});

describe('mapKreamSearchProductsToSnapshots', () => {
  it('maps only confident title + set + rarity matches to asking snapshots', () => {
    const product = parseKreamSearchProductText(
      '804751',
      'Pokemon TCG\n포켓몬 TCG 리자몽 ex SAR 포켓몬 카드 151 (한글판)\n250,000원\n관심 103 · 거래 9',
    );

    const result = mapKreamSearchProductsToSnapshots(
      product ? [product] : [],
      [charizard151, charizard151Rr],
      '2026-06-16',
    );

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].card.cardPrintingId).toBe('printing-charizard-151-sar');
    expect(result.snapshots).toEqual([
      expect.objectContaining({
        cardPrintingId: 'printing-charizard-151-sar',
        snapshotDate: '2026-06-16',
        sourceName: 'kream',
        sourceUrl: 'https://kream.co.kr/products/804751',
        market: 'KR',
        currency: 'KRW',
        avgPrice: 250000,
        aggregationMethod: 'kream_search_page_asking',
      }),
    ]);
  });

  it('skips foreign-edition products so a 일어판 card never matches a 한글판 printing', () => {
    const enamorusKo: CardQuery = {
      cardPrintingId: 'printing-enamorus-sv5a-ar',
      cardName: '러브로스',
      collectorNumber: '074/066',
      nameEn: 'Enamorus',
      nameJa: null,
      setName: '스칼렛&바이올렛 강화 확장팩 「크림슨헤이즈」',
      setCode: 'SV5a',
      rarity: 'AR',
      kreamProductUrl: null,
    };
    const product = parseKreamSearchProductText(
      '649915',
      'Pokemon TCG\n포켓몬 TCG 러브로스 AR 크림슨 헤이즈 (일어판)\n980,000원\n관심 5 · 거래 1',
    );

    const result = mapKreamSearchProductsToSnapshots(
      product ? [product] : [],
      [enamorusKo],
      '2026-06-24',
    );

    expect(result.snapshots).toHaveLength(0);
    expect(result.skipped[0]?.reason).toBe('low_confidence');
  });

  it('skips ambiguous same-score matches', () => {
    const product = parseKreamSearchProductText(
      '999999',
      'Pokemon TCG\n포켓몬 TCG 리자몽 ex 포켓몬 카드 151 (한글판)\n250,000원',
    );

    const result = mapKreamSearchProductsToSnapshots(
      product ? [product] : [],
      [charizard151, charizard151Rr],
      '2026-06-16',
      0.7,
    );

    expect(result.snapshots).toHaveLength(0);
    expect(result.skipped[0]?.reason).toBe('ambiguous_match');
  });
});

describe('buildKreamSegmentedSearchKeywords', () => {
  it('builds base, set, and set-rarity keywords without duplicates', () => {
    expect(buildKreamSegmentedSearchKeywords([charizard151, charizard151Rr])).toEqual([
      '포켓몬카드 한글판',
      '포켓몬 카드 151 한글판',
      '포켓몬 카드 151 SAR 한글판',
      '포켓몬 카드 151 RR 한글판',
    ]);
  });
});
