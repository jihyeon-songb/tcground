import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildPriceHistory,
  derivePriceDisplayFromHistory,
  fetchSnapshotRowsForPrintings,
  type CardPriceSnapshotRow,
} from '@/lib/tcg-catalog';
import type { AlertDirection, ActiveAlert, AlertHit } from './types';
import { sendPriceAlertEmail } from './email';

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

async function loadPrintingCardInfo(
  supabase: SupabaseClient,
  printingIds: string[],
): Promise<Map<string, { cardName: string; slug: string }>> {
  const { data, error } = await supabase
    .from('card_printings')
    .select('id, cards(name, slug)')
    .in('id', printingIds);
  if (error) throw error;
  const map = new Map<string, { cardName: string; slug: string }>();
  // PostgREST types the embedded to-one `cards` as an array, but a belongs-to
  // relationship returns a single object at runtime — cast through unknown.
  for (const row of (data ?? []) as unknown as Array<{
    id: string;
    cards: { name: string; slug: string } | null;
  }>) {
    if (row.cards) map.set(row.id, { cardName: row.cards.name, slug: row.cards.slug });
  }
  return map;
}

/** 히트를 인앱 insert + 이메일 발송 + 알림 비활성화로 처리. */
export async function deliverAlertHits(
  supabase: SupabaseClient,
  hits: AlertHit[],
): Promise<{ delivered: number }> {
  if (hits.length === 0) return { delivered: 0 };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const cardInfo = await loadPrintingCardInfo(
    supabase,
    [...new Set(hits.map((h) => h.alert.cardPrintingId))],
  );

  let delivered = 0;
  for (const hit of hits) {
    const info = cardInfo.get(hit.alert.cardPrintingId);
    const cardName = info?.cardName ?? '카드';
    const cardUrl = info ? `${siteUrl}/cards/${info.slug}` : siteUrl;
    const dirText = hit.alert.direction === 'below' ? '이하로 떨어졌습니다' : '이상으로 올랐습니다';

    // 인앱 원장 (실패 시 비활성화 보류 → 다음 배치 재시도)
    const { error: notifErr } = await supabase.from('notifications').insert({
      user_id: hit.alert.userId,
      alert_id: hit.alert.id,
      title: `${cardName} 가격 알림`,
      body: `${hit.alert.threshold} ${hit.alert.direction === 'below' ? '이하' : '이상'} 목표가 ${dirText}. 현재가 ${hit.currentPrice}.`,
      card_printing_id: hit.alert.cardPrintingId,
    });
    if (notifErr) {
      console.warn('[price-alert] notifications insert 실패', notifErr);
      continue;
    }

    // 이메일 (실패해도 인앱 원장에 남았으므로 계속)
    const { data: userData } = await supabase.auth.admin.getUserById(hit.alert.userId);
    const email = userData?.user?.email;
    if (email) {
      await sendPriceAlertEmail({
        to: email,
        cardName,
        direction: hit.alert.direction,
        threshold: hit.alert.threshold,
        currentPrice: hit.currentPrice,
        currency: hit.alert.currency,
        cardUrl,
      });
    }

    // 1회 발송 후 비활성화
    const { error: updErr } = await supabase
      .from('price_alerts')
      .update({ is_active: false, fired_at: new Date().toISOString() })
      .eq('id', hit.alert.id);
    if (updErr) {
      console.warn('[price-alert] 알림 비활성화 실패', updErr);
      continue;
    }
    delivered++;
  }
  return { delivered };
}

/** 배치 진입점: 평가 → 전달. 실패는 호출측에서 격리. */
export async function runPriceAlertEvaluation(
  supabase: SupabaseClient,
): Promise<{ hits: number; delivered: number }> {
  const hits = await evaluateActiveAlerts(supabase);
  const { delivered } = await deliverAlertHits(supabase, hits);
  return { hits: hits.length, delivered };
}
