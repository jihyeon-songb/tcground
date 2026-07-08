/**
 * URL for the "이 카드 바꾸기" link: re-pick THIS slot while keeping the other
 * card in place. So it drops this column's slug and preserves only the sibling's
 * slot (empty when there's no sibling → both pickers).
 */
export function changeCardHref(slot: 'left' | 'right', otherSlug: string | null): string {
  if (!otherSlug) return '/compare';
  const otherParam = slot === 'left' ? 'right' : 'left';
  return `/compare?${otherParam}=${encodeURIComponent(otherSlug)}`;
}
