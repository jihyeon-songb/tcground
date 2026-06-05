import { describe, expect, it, vi } from 'vitest';
import {
  buildBunjangSearchUrl,
  collectBunjangSnapshots,
  mapBunjangListingsToSnapshots,
} from './bunjang-adapter';
import { BUNJANG_SOURCE_NAME } from './bunjang-config';
import { PriceSourceAccessNotGrantedError } from '../price-source.types';
import searchPayload from './fixtures/search.sample.json';

describe('mapBunjangListingsToSnapshots', () => {
  it('splits listings into raw and graded median asking snapshots in KR/KRW', () => {
    const snapshots = mapBunjangListingsToSnapshots(searchPayload, {
      cardPrintingId: 'printing-4',
      snapshotDate: '2026-05-21',
    });

    expect(snapshots).toHaveLength(2);

    const raw = snapshots.find((s) => s.variant === 'raw');
    expect(raw?.sourceName).toBe(BUNJANG_SOURCE_NAME);
    expect(raw?.market).toBe('KR');
    expect(raw?.currency).toBe('KRW');
    // Usable raw prices are 60000, 72000, 95000 (the "0" listing is dropped); median = 72000
    expect(raw?.avgPrice).toBe(72000);
    expect(raw?.minPrice).toBe(60000);
    expect(raw?.maxPrice).toBe(95000);
    expect(raw?.sampleCount).toBe(3);
    expect(raw?.aggregationMethod).toBe('bunjang_asking_median');

    const graded = snapshots.find((s) => s.variant === 'graded');
    expect(graded?.gradeCompany).toBe('PSA');
    expect(graded?.gradeValue).toBe('10');
    expect(graded?.avgPrice).toBe(560000);
    expect(graded?.sampleCount).toBe(1);
  });

  it('returns an empty array when there are no priced listings', () => {
    expect(
      mapBunjangListingsToSnapshots(
        { list: [] },
        { cardPrintingId: 'p1', snapshotDate: '2026-05-21' },
      ),
    ).toEqual([]);
  });
});

describe('buildBunjangSearchUrl', () => {
  it('builds a score-sorted search URL', () => {
    const url = new URL(buildBunjangSearchUrl('리자몽 ex 201/165', 50));
    expect(url.origin + url.pathname).toBe('https://api.bunjang.co.kr/api/1/find_v2.json');
    expect(url.searchParams.get('q')).toBe('리자몽 ex 201/165');
    expect(url.searchParams.get('n')).toBe('50');
    expect(url.searchParams.get('order')).toBe('score');
  });
});

describe('collectBunjangSnapshots', () => {
  it('throws PriceSourceAccessNotGrantedError when access is not granted', async () => {
    const fetchImpl = vi.fn();

    await expect(
      collectBunjangSnapshots(
        '리자몽 ex 201/165',
        { cardPrintingId: 'printing-4', snapshotDate: '2026-05-21' },
        { accessGranted: false, fetchImpl },
      ),
    ).rejects.toBeInstanceOf(PriceSourceAccessNotGrantedError);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fetches and maps listings when access is granted', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => searchPayload,
    } as Response);

    const snapshots = await collectBunjangSnapshots(
      '리자몽 ex 201/165',
      { cardPrintingId: 'printing-4', snapshotDate: '2026-05-21' },
      { accessGranted: true, fetchImpl },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(snapshots).toHaveLength(2);
  });
});
