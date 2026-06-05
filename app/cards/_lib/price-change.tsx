import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

export type ChangeTone = 'up' | 'down' | 'flat';

/** Signed percentage label for a price change rate (e.g. `+2.1%`, `-3.4%`). */
export function formatChangeRate(rate: number): string {
  if (rate > 0) return `+${rate.toFixed(1)}%`;
  return `${rate.toFixed(1)}%`;
}

/** Theme-token classes for a change chip, shared by the list and detail views. */
export function changeChipClass(tone: ChangeTone): string {
  if (tone === 'up') return 'bg-price-up-surface text-price-up';
  if (tone === 'down') return 'bg-price-down-surface text-price-down';
  return 'bg-price-flat-surface text-price-flat';
}

export function TrendIcon({ tone }: { tone: ChangeTone }) {
  const Icon = tone === 'up' ? TrendingUp : tone === 'down' ? TrendingDown : Minus;
  return <Icon aria-hidden className='size-4' strokeWidth={2.5} />;
}
