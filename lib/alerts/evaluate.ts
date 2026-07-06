import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildPriceHistory,
  derivePriceDisplayFromHistory,
  fetchSnapshotRowsForPrintings,
  type CardPriceSnapshotRow,
} from '@/lib/tcg-catalog';
import type { AlertDirection, ActiveAlert, AlertHit } from './types';

/** 목표가 도달 판정. 경계값(같을 때)은 도달로 본다. */
export function isThresholdMet(
  direction: AlertDirection,
  currentPrice: number,
  threshold: number,
): boolean {
  return direction === 'below' ? currentPrice <= threshold : currentPrice >= threshold;
}

/** 각 알림의 printing 파생 대표가를 구해 임계값 판정된 히트만 반환. 순수함수. */
export function computeAlertHits(
  alerts: ActiveAlert[],
  snapshotsByPrinting: Map<string, CardPriceSnapshotRow[]>,
): AlertHit[] {
  const hits: AlertHit[] = [];
  for (const alert of alerts) {
    const snapshots = snapshotsByPrinting.get(alert.cardPrintingId);
    if (!snapshots || snapshots.length === 0) continue;
    const display = derivePriceDisplayFromHistory(buildPriceHistory(snapshots));
    if (!display) continue;
    if (isThresholdMet(alert.direction, display.avgPrice, alert.threshold)) {
      hits.push({ alert, currentPrice: display.avgPrice });
    }
  }
  return hits;
}

interface PriceAlertRow {
  id: string;
  user_id: string;
  card_printing_id: string;
  currency: string;
  grade_label: string | null;
  direction: 'below' | 'above';
  threshold: number;
}

/** 활성 알림 로드 → 대상 printing 스냅샷 일괄 조회 → 히트 산출. */
export async function evaluateActiveAlerts(supabase: SupabaseClient): Promise<AlertHit[]> {
  const { data, error } = await supabase
    .from('price_alerts')
    .select('id, user_id, card_printing_id, currency, grade_label, direction, threshold')
    .eq('is_active', true);
  if (error) throw error;

  const rows = (data ?? []) as PriceAlertRow[];
  if (rows.length === 0) return [];

  const alerts: ActiveAlert[] = rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    cardPrintingId: r.card_printing_id,
    currency: r.currency,
    gradeLabel: r.grade_label,
    direction: r.direction,
    threshold: Number(r.threshold),
  }));

  const printingIds = [...new Set(alerts.map((a) => a.cardPrintingId))];
  const snapshotRows = await fetchSnapshotRowsForPrintings(supabase, printingIds);

  const byPrinting = new Map<string, CardPriceSnapshotRow[]>();
  for (const row of snapshotRows) {
    const list = byPrinting.get(row.card_printing_id);
    if (list) list.push(row);
    else byPrinting.set(row.card_printing_id, [row]);
  }

  return computeAlertHits(alerts, byPrinting);
}
