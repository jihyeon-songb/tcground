import { describe, expect, it, vi } from 'vitest';
import {
  buildJoongnaSearchUrl,
  collectJoongnaSnapshots,
  extractJoongnaListingsFromHtml,
  mapJoongnaListingsToSnapshots,
} from './joongna-adapter';
import { JOONGNA_SOURCE_NAME } from './joongna-config';
import { PriceSourceAccessNotGrantedError, isAskingSource } from '../price-source.types';

const target = {
  names: ['리자몽 ex'],
  collectorNumber: '201/165',
  setTokens: ['SV2a', '포켓몬 카드 151'],
};

describe('extractJoongnaListingsFromHtml', () => {
  it('extracts minimized product listings from escaped Next.js hydration HTML', () => {
    const html =
      '<script>self.__next_f.push([1,"{\\"seq\\":229001,\\"price\\":60000,\\"title\\":\\"리자몽 ex 201/165 SAR\\",\\"state\\":0,\\"sortDate\\":\\"2026-06-05 09:00:00\\",\\"objectType\\":\\"product\\",\\"storeSeq\\":123}"])</script>';

    expect(extractJoongnaListingsFromHtml(html)).toEqual([
      {
        seq: 229001,
        price: 60000,
        title: '리자몽 ex 201/165 SAR',
        state: 0,
        sortDate: '2026-06-05 09:00:00',
        objectType: 'product',
      },
    ]);
  });
});

describe('mapJoongnaListingsToSnapshots', () => {
  it('filters noisy rows and creates KRW median asking snapshots', () => {
    const snapshots = mapJoongnaListingsToSnapshots(
      [
        { seq: 1, price: 60000, title: '리자몽 ex 201/165 SAR', objectType: 'product' },
        { seq: 2, price: 72000, title: '리자몽 ex 201/165 포켓몬카드 151', objectType: 'product' },
        { seq: 3, price: 999999, title: '리자몽 ex 각개합니다', objectType: 'product' },
        { seq: 4, price: 42000, title: '포켓몬 카드 151 미개봉 박스', objectType: 'product' },
        { seq: 5, price: 5000, title: '피카츄 ex 201/165', objectType: 'product' },
        { seq: 6, price: 560000, title: '리자몽 ex 201/165 PSA 10', objectType: 'product' },
        { seq: 7, price: 7777, title: '포켓몬 151 리자몽 ex 북미판', objectType: 'product' },
        { seq: 8, price: 88000, title: '포켓몬 151 리자몽 ex SAR', objectType: 'product' },
      ],
      { cardPrintingId: 'printing-4', snapshotDate: '2026-06-05', target },
    );

    expect(snapshots).toHaveLength(2);

    const raw = snapshots.find((snapshot) => snapshot.variant === 'raw');
    expect(raw?.sourceName).toBe(JOONGNA_SOURCE_NAME);
    expect(raw?.market).toBe('KR');
    expect(raw?.currency).toBe('KRW');
    expect(raw?.avgPrice).toBe(66000);
    expect(raw?.minPrice).toBe(60000);
    expect(raw?.maxPrice).toBe(72000);
    expect(raw?.sampleCount).toBe(2);
    expect(raw?.sourceUrl).toBe('https://web.joongna.com/product/1');
    expect(raw?.aggregationMethod).toBe('joongna_asking_median');

    const graded = snapshots.find((snapshot) => snapshot.variant === 'graded');
    expect(graded?.gradeCompany).toBe('PSA');
    expect(graded?.gradeValue).toBe('10');
    expect(graded?.avgPrice).toBe(560000);
  });

  it('returns an empty array when all rows are noisy or low confidence', () => {
    expect(
      mapJoongnaListingsToSnapshots(
        [
          { seq: 1, price: 40000, title: '포켓몬카드 박스 미개봉', objectType: 'product' },
          { seq: 2, price: 88000, title: '포켓몬 151 리자몽 ex SAR', objectType: 'product' },
        ],
        { cardPrintingId: 'p1', snapshotDate: '2026-06-05', target },
      ),
    ).toEqual([]);
  });
});

describe('buildJoongnaSearchUrl', () => {
  it('builds a public search URL', () => {
    const url = new URL(buildJoongnaSearchUrl('리자몽 ex 201/165'));
    expect(url.origin + url.pathname).toBe('https://web.joongna.com/search');
    expect(url.searchParams.get('keyword')).toBe('리자몽 ex 201/165');
  });
});

describe('collectJoongnaSnapshots', () => {
  it('throws PriceSourceAccessNotGrantedError when access is not granted', async () => {
    const fetchImpl = vi.fn();

    await expect(
      collectJoongnaSnapshots(
        '리자몽 ex 201/165',
        { cardPrintingId: 'printing-4', snapshotDate: '2026-06-05', target },
        { accessGranted: false, fetchImpl },
      ),
    ).rejects.toBeInstanceOf(PriceSourceAccessNotGrantedError);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fetches and maps public search HTML when access is granted', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<script>self.__next_f.push([1,"{\\"seq\\":229001,\\"price\\":60000,\\"title\\":\\"리자몽 ex 201/165 SAR\\",\\"objectType\\":\\"product\\"}"])</script>',
    } as Response);

    const snapshots = await collectJoongnaSnapshots(
      '리자몽 ex 201/165',
      { cardPrintingId: 'printing-4', snapshotDate: '2026-06-05', target },
      { accessGranted: true, fetchImpl },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(snapshots).toHaveLength(1);
  });
});

describe('joongna source classification', () => {
  it('is an asking source', () => {
    expect(isAskingSource(JOONGNA_SOURCE_NAME)).toBe(true);
  });
});
