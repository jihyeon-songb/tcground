import { createClient } from '@/lib/supabase/server';
import {
  NotificationBellDropdown,
  type NotificationRow,
} from './_NotificationBellDropdown';

export async function NotificationBell() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) return null; // 미로그인 시 벨 미표시

  const { data } = await supabase
    .from('notifications')
    .select('id, title, body, read_at, card_printing_id, card_printings(cards(slug))')
    .order('created_at', { ascending: false })
    .limit(20);

  const rows: NotificationRow[] = (data ?? []).map((row) => {
    const rawPrinting = row.card_printings;
    const printing = Array.isArray(rawPrinting) ? rawPrinting[0] : rawPrinting;
    const rawCards = printing?.cards;
    const cards = Array.isArray(rawCards) ? rawCards[0] : rawCards;
    return {
      id: row.id as string,
      title: row.title as string,
      body: row.body as string,
      read_at: (row.read_at as string | null) ?? null,
      card_slug: cards?.slug ?? null,
    };
  });

  const unread = rows.filter((r) => r.read_at === null).length;

  return <NotificationBellDropdown rows={rows} unread={unread} />;
}
