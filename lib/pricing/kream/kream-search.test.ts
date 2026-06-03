import { describe, expect, it } from 'vitest';
import { buildKreamSearchUrl, resolveKreamProduct } from './kream-search';

const target = {
  names: ['블래키 ex'],
  collectorNumber: '217/187',
  setTokens: ['테라스탈 페스타'],
};

describe('buildKreamSearchUrl', () => {
  it('builds a keyword search URL', () => {
    const url = new URL(buildKreamSearchUrl('블래키 ex 217/187'));
    expect(url.origin + url.pathname).toBe('https://kream.co.kr/api/search');
    expect(url.searchParams.get('keyword')).toBe('블래키 ex 217/187');
  });
});

describe('resolveKreamProduct', () => {
  it('picks the highest-confidence product and builds its URL', () => {
    const resolved = resolveKreamProduct(
      {
        items: [
          { id: 111, translatedName: '리자몽 ex 201/165' },
          { id: 222, translatedName: '블래키 ex 217/187 테라스탈 페스타' },
        ],
      },
      target,
    );

    expect(resolved?.productId).toBe('222');
    expect(resolved?.productUrl).toBe('https://kream.co.kr/products/222');
    expect(resolved?.confidence).toBeCloseTo(1, 5);
  });

  it('returns null when no product matches', () => {
    const resolved = resolveKreamProduct(
      { items: [{ id: 1, translatedName: '리자몽 ex 201/165' }] },
      target,
    );
    expect(resolved).toBeNull();
  });

  it('ignores products without an id and empty payloads', () => {
    expect(resolveKreamProduct({ items: [{ translatedName: '블래키 ex 217/187' }] }, target)).toBeNull();
    expect(resolveKreamProduct({}, target)).toBeNull();
  });

  it('drops an ambiguous accessory listing (scores 0)', () => {
    const resolved = resolveKreamProduct(
      { items: [{ id: 9, translatedName: '블래키 ex 슬리브 217/187' }] },
      target,
    );
    expect(resolved).toBeNull();
  });
});
