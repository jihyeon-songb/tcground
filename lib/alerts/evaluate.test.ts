import { describe, expect, it } from 'vitest';
import { isThresholdMet, computeAlertHits } from './evaluate';
import type { ActiveAlert } from './types';

function alert(overrides: Partial<ActiveAlert>): ActiveAlert {
  return {
    id: 'a1', userId: 'u1', cardPrintingId: 'p1', currency: 'KRW',
    gradeLabel: null, direction: 'below', threshold: 10000, ...overrides,
  };
}

// 최소 스냅샷 행 — buildPriceHistory가 sold 시리즈로 접는 형태.
// aggregation_method: 'median_filtered' → isAskingSnapshot이 false 반환(sold 분류).
// display_avg_price, avg_price 모두 avg로 설정하여 snapshotAvgPrice가 avg를 반환.
function snap(date: string, avg: number) {
  return {
    snapshot_date: date, market: 'KR', currency: 'KRW', variant: 'raw',
    condition_label: null, grade_company: null, grade_value: null,
    source_name: 'kream', source_url: null, aggregation_method: 'median_filtered',
    avg_price: avg, min_price: avg, max_price: avg, sample_count: 3,
    display_currency: 'KRW', display_avg_price: avg, display_min_price: avg,
    display_max_price: avg,
  } as unknown as import('@/lib/tcg-catalog').CardPriceSnapshotRow;
}

describe('computeAlertHits', () => {
  it('below 도달 시 히트, currentPrice는 파생 대표가', () => {
    const alerts = [alert({ direction: 'below', threshold: 10000 })];
    const byPrinting = new Map([['p1', [snap('2026-07-05', 9000)]]]);
    const hits = computeAlertHits(alerts, byPrinting);
    expect(hits).toHaveLength(1);
    expect(hits[0].currentPrice).toBe(9000);
  });

  it('미도달 시 히트 없음', () => {
    const alerts = [alert({ direction: 'below', threshold: 8000 })];
    const byPrinting = new Map([['p1', [snap('2026-07-05', 9000)]]]);
    expect(computeAlertHits(alerts, byPrinting)).toHaveLength(0);
  });

  it('스냅샷 없는 printing은 스킵(파생가 null)', () => {
    const alerts = [alert({ cardPrintingId: 'pX' })];
    const byPrinting = new Map<string, ReturnType<typeof snap>[]>();
    expect(computeAlertHits(alerts, byPrinting)).toHaveLength(0);
  });
});

describe('isThresholdMet', () => {
  it('below: 현재가가 임계값보다 낮으면 true', () => {
    expect(isThresholdMet('below', 9000, 10000)).toBe(true);
  });
  it('below: 현재가가 임계값과 같으면 true (도달 포함)', () => {
    expect(isThresholdMet('below', 10000, 10000)).toBe(true);
  });
  it('below: 현재가가 임계값보다 높으면 false', () => {
    expect(isThresholdMet('below', 11000, 10000)).toBe(false);
  });
  it('above: 현재가가 임계값보다 높으면 true', () => {
    expect(isThresholdMet('above', 11000, 10000)).toBe(true);
  });
  it('above: 현재가가 임계값과 같으면 true', () => {
    expect(isThresholdMet('above', 10000, 10000)).toBe(true);
  });
  it('above: 현재가가 임계값보다 낮으면 false', () => {
    expect(isThresholdMet('above', 9000, 10000)).toBe(false);
  });
});
