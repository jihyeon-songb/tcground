'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isValidThreshold } from '../_lib/price-alert-validate';

export interface SetPriceAlertInput {
  cardPrintingId: string;
  slug: string;
  currency: string;
  gradeLabel: string | null;
  direction: 'below' | 'above';
  threshold: number;
}

export type PriceAlertResult = { ok: true } | { ok: false; error: string };

export async function setPriceAlert(input: SetPriceAlertInput): Promise<PriceAlertResult> {
  if (input.direction !== 'below' && input.direction !== 'above') {
    return { ok: false, error: '잘못된 알림 방향입니다.' };
  }
  if (!isValidThreshold(input.threshold)) {
    return { ok: false, error: '목표가는 0보다 큰 숫자여야 합니다.' };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false, error: '알림을 설정하려면 로그인이 필요합니다.' };

  // Postgres cannot infer conflict target from a PARTIAL unique index
  // (price_alerts has `where is_active` on the unique constraint).
  // Using 2-step SELECT → UPDATE or INSERT to avoid runtime "no unique or
  // exclusion constraint matching the ON CONFLICT specification" error.
  const { data: existing, error: selectError } = await supabase
    .from('price_alerts')
    .select('id')
    .eq('user_id', userId)
    .eq('card_printing_id', input.cardPrintingId)
    .eq('direction', input.direction)
    .eq('is_active', true)
    .maybeSingle();

  if (selectError) return { ok: false, error: '알림을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' };

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('price_alerts')
      .update({
        currency: input.currency,
        grade_label: input.gradeLabel,
        threshold: input.threshold,
        fired_at: null,
      })
      .eq('id', existing.id)
      .eq('is_active', true)
      .select('id');
    if (updateError) return { ok: false, error: '알림을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' };

    // If 0 rows updated, the row was concurrently deactivated by clearPriceAlert.
    // Re-arm: fall through to INSERT to create a fresh active alert.
    if (updated && updated.length > 0) {
      revalidatePath(`/cards/${input.slug}`);
      return { ok: true };
    }
  }

  // INSERT: either no existing alert (first-time) or re-arm after concurrent clear.
  // Note: concurrent first-time inserts can collide on the partial unique index
  // (price_alerts has `where is_active` on the constraint); the second will error
  // but DB integrity is preserved by the unique constraint.
  const { error: insertError } = await supabase.from('price_alerts').insert({
    user_id: userId,
    card_printing_id: input.cardPrintingId,
    currency: input.currency,
    grade_label: input.gradeLabel,
    direction: input.direction,
    threshold: input.threshold,
    is_active: true,
    fired_at: null,
  });
  if (insertError) return { ok: false, error: '알림을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' };

  revalidatePath(`/cards/${input.slug}`);
  return { ok: true };
}

export async function clearPriceAlert(input: {
  cardPrintingId: string;
  slug: string;
  direction: 'below' | 'above';
}): Promise<PriceAlertResult> {
  if (input.direction !== 'below' && input.direction !== 'above') {
    return { ok: false, error: '잘못된 알림 방향입니다.' };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false, error: '로그인이 필요합니다.' };

  const { error } = await supabase
    .from('price_alerts')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('card_printing_id', input.cardPrintingId)
    .eq('direction', input.direction)
    .eq('is_active', true);
  if (error) return { ok: false, error: '알림을 해제하지 못했습니다.' };

  revalidatePath(`/cards/${input.slug}`);
  return { ok: true };
}
