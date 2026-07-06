import type { AlertDirection } from './types';

/** 목표가 도달 판정. 경계값(같을 때)은 도달로 본다. */
export function isThresholdMet(
  direction: AlertDirection,
  currentPrice: number,
  threshold: number,
): boolean {
  return direction === 'below' ? currentPrice <= threshold : currentPrice >= threshold;
}
