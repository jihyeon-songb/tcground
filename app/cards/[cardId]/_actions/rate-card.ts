'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface RateCardInput {
  cardId: string;
  /** Card slug, used to revalidate the detail page after rating. */
  slug: string;
  score: number;
}

export type RateCardResult = { ok: true } | { ok: false; error: string };

function isValidScore(score: number): boolean {
  return Number.isInteger(score) && score >= 1 && score <= 5;
}

/**
 * Upserts the signed-in user's 1–5 rating for a card. RLS guarantees the row is
 * scoped to the current user; the public average is read separately via the
 * `get_card_rating_summary` RPC.
 */
export async function submitCardRating(input: RateCardInput): Promise<RateCardResult> {
  if (!isValidScore(input.score)) {
    return { ok: false, error: '평점은 1점에서 5점 사이여야 합니다.' };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    return { ok: false, error: '평점을 남기려면 로그인이 필요합니다.' };
  }

  const { error } = await supabase
    .from('card_ratings')
    .upsert(
      { user_id: userId, card_id: input.cardId, score: input.score, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,card_id' },
    );

  if (error) {
    return { ok: false, error: '평점을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' };
  }

  revalidatePath(`/cards/${input.slug}`);
  return { ok: true };
}
