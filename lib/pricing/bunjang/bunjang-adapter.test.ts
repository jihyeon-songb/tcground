import { describe, expect, it, vi } from 'vitest';
import { collectBunjangSnapshot, mapBunjangListingsToSnapshot } from './bunjang-adapter';
import { BUNJANG_SOURCE_NAME } from './bunjang-config';
import { PriceSourceAccessNotGrantedError } from '../price-source.types';
import searchPayload from './fixtures/search.sample.json';

describe('mapBunjangListingsToSnapshot', () => {
  it('produces a median asking snapshot in KR/KRW', () => {
    const snapshot = mapBunjangListingsToSnapshot(searchPayload, {
      cardPrintingId: 'printing-4',
      snapshotDate: '2026-05-21',
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.sourceName).toBe(BUNJANG_SOURCE_NAME);
    expect(snapshot?.market).toBe('KR');
    expect(snapshot?.currency).toBe('KRW');
    // Usable prices are 60000, 72000, 95000 (the "0" listing is dropped); median = 72000
    expect(snapshot?.avgPrice).toBe(72000);
    expect(snapshot?.minPrice).toBe(60000);
    expect(snapshot?.maxPrice).toBe(95000);
    expect(snapshot?.sampleCount).toBe(3);
    expect(snapshot?.variant).toBe('raw');
    expect(snapshot?.aggregationMethod).toBe('bunjang_asking_median');
  });

  it('returns null when there are no priced listings', () => {
    expect(
      mapBunjangListingsToSnapshot(
        { list: [] },
        { cardPrintingId: 'p1', snapshotDate: '2026-05-21' },
      ),
    ).toBeNull();
  });
});

describe('collectBunjangSnapshot', () => {
  it('throws PriceSourceAccessNotGrantedError when access is not granted', async () => {
    const fetchImpl = vi.fn();

    await expect(
      collectBunjangSnapshot(
        '리자몽 ex 201/165',
        { cardPrintingId: 'printing-4', snapshotDate: '2026-05-21' },
        { accessGranted: false, fetchImpl },
      ),
    ).rejects.toBeInstanceOf(PriceSourceAccessNotGrantedError);

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
