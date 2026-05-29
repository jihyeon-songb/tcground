/**
 * Aggregates raw sold `price_observations` into daily, per-bucket
 * `card_price_snapshots`. Pure functions only — no DB or network access.
 *
 * Buckets are keyed by (card_printing, date, market, currency, variant,
 * condition, grade) so markets/currencies/conditions are never mixed. Outliers
 * are removed with an IQR filter before computing avg/min/max.
 */

import type {
  PriceObservationInput,
  SnapshotAggregate,
} from './price-source.types';

/** Observations below this card-match confidence are excluded from aggregation. */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

export interface AggregateOptions {
  confidenceThreshold?: number;
  sourceName?: string;
  aggregationMethod?: string;
}

/**
 * Groups sold observations into daily snapshots. One snapshot per
 * (printing, date, market, currency, variant, condition, grade) bucket.
 */
export function aggregateObservations(
  observations: readonly PriceObservationInput[],
  options: AggregateOptions = {},
): SnapshotAggregate[] {
  const {
    confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
    sourceName = 'aggregate',
    aggregationMethod = 'median_filtered',
  } = options;

  const buckets = new Map<string, PriceObservationInput[]>();

  for (const observation of observations) {
    if (observation.confidenceScore < confidenceThreshold) continue;
    if (!Number.isFinite(observation.soldPrice) || observation.soldPrice <= 0) continue;

    const snapshotDate = toSnapshotDate(observation.soldAt);
    if (!snapshotDate) continue;

    const key = bucketKey(observation, snapshotDate);
    const existing = buckets.get(key);
    if (existing) {
      existing.push(observation);
    } else {
      buckets.set(key, [observation]);
    }
  }

  const snapshots: SnapshotAggregate[] = [];

  for (const group of buckets.values()) {
    const prices = removeOutliers(group.map((item) => item.soldPrice));
    if (prices.length === 0) continue;

    const sample = group[0];
    snapshots.push({
      cardPrintingId: sample.cardPrintingId,
      snapshotDate: toSnapshotDate(sample.soldAt) as string,
      market: sample.market,
      currency: sample.currency,
      variant: sample.variant,
      conditionLabel: sample.conditionLabel,
      gradeCompany: sample.gradeCompany,
      gradeValue: sample.gradeValue,
      avgPrice: roundCurrency(mean(prices)),
      minPrice: roundCurrency(Math.min(...prices)),
      maxPrice: roundCurrency(Math.max(...prices)),
      sampleCount: prices.length,
      sourceName,
      sourceUrl: null,
      aggregationMethod,
    });
  }

  return snapshots;
}

/** Extracts a `YYYY-MM-DD` date from an ISO timestamp, or null if unparseable. */
export function toSnapshotDate(isoTimestamp: string): string | null {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/**
 * Removes outliers using the 1.5·IQR rule. Samples of fewer than 4 values are
 * returned unchanged, since IQR is meaningless for tiny samples.
 */
export function removeOutliers(values: readonly number[]): number[] {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length < 4) return [...finite];

  const sorted = [...finite].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;

  return sorted.filter((value) => value >= lower && value <= upper);
}

function bucketKey(observation: PriceObservationInput, snapshotDate: string): string {
  return [
    observation.cardPrintingId,
    snapshotDate,
    observation.market,
    observation.currency,
    observation.variant,
    observation.conditionLabel ?? '',
    observation.gradeCompany ?? '',
    observation.gradeValue ?? '',
  ].join('|');
}

function quantile(sortedValues: readonly number[], fraction: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const position = (sortedValues.length - 1) * fraction;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const weight = position - lowerIndex;

  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
