/**
 * Guardian TCG adapter (aggregate estimates → reference snapshots).
 *
 * Guardian returns a per-card price *estimate* per grade tier (raw, PSA 10, …),
 * not individual sales. We map each tier to a `SnapshotAggregate` tagged
 * `aggregationMethod: 'guardian_estimate'` under the `guardian_tcg` source, so it
 * is stored separately and used for cross-validation rather than as part of the
 * sold/asking trend. `compareToGuardian` reports the gap between our own snapshot
 * and Guardian's estimate for the same bucket.
 */

import {
  GUARDIAN_API_BASE_URL,
  GUARDIAN_CURRENCY,
  GUARDIAN_ESTIMATE_PATH,
  GUARDIAN_MARKET,
  GUARDIAN_SOURCE_NAME,
  loadGuardianConfig,
  type GuardianConfig,
} from './guardian-config';
import { parseGradeLabel } from '../grade-parse';
import type { SnapshotAggregate } from '../price-source.types';

/** One grade-tier estimate from a Guardian response. */
interface GuardianEstimate {
  /** Grade label, e.g. "raw" / "ungraded" / "PSA 10". */
  grade?: string;
  /** Estimated value. May arrive as number or numeric string. */
  price?: number | string;
  currency?: string;
  /** Optional number of underlying sales the estimate is based on. */
  sampleCount?: number;
}

interface GuardianResponse {
  url?: string;
  estimates?: GuardianEstimate[];
}

export interface GuardianCardQuery {
  cardPrintingId: string;
  cardName: string;
  collectorNumber: string | null;
}

export interface GuardianSnapshotContext {
  cardPrintingId: string;
  /** `YYYY-MM-DD` for the snapshot. */
  snapshotDate: string;
}

export interface CollectGuardianOptions {
  config?: GuardianConfig;
  fetchImpl?: typeof fetch;
  snapshotDate?: string;
}

/** Builds the Guardian estimate URL for a card. Pure. */
export function buildGuardianEstimateUrl(query: GuardianCardQuery): string {
  const url = new URL(`${GUARDIAN_API_BASE_URL}${GUARDIAN_ESTIMATE_PATH}`);
  url.searchParams.set('name', query.cardName);
  if (query.collectorNumber) url.searchParams.set('number', query.collectorNumber);
  return url.toString();
}

/**
 * Maps Guardian per-grade estimates to reference snapshots (one per tier).
 * Each snapshot has avg=min=max=estimate since Guardian reports a single value.
 */
export function mapGuardianEstimatesToSnapshots(
  payload: GuardianResponse,
  context: GuardianSnapshotContext,
): SnapshotAggregate[] {
  const snapshots: SnapshotAggregate[] = [];

  for (const estimate of payload.estimates ?? []) {
    const price = typeof estimate.price === 'string' ? Number.parseFloat(estimate.price) : estimate.price;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) continue;

    const { variant, gradeCompany, gradeValue } = parseGradeLabel(estimate.grade);

    snapshots.push({
      cardPrintingId: context.cardPrintingId,
      snapshotDate: context.snapshotDate,
      market: GUARDIAN_MARKET,
      currency: estimate.currency ?? GUARDIAN_CURRENCY,
      variant,
      conditionLabel: null,
      gradeCompany,
      gradeValue,
      avgPrice: roundCurrency(price),
      minPrice: roundCurrency(price),
      maxPrice: roundCurrency(price),
      sampleCount: estimate.sampleCount ?? 0,
      sourceName: GUARDIAN_SOURCE_NAME,
      sourceUrl: payload.url ?? null,
      aggregationMethod: 'guardian_estimate',
    });
  }

  return snapshots;
}

/**
 * Fetches Guardian estimates for one card and returns reference snapshots.
 * Throws if the API key is missing.
 */
export async function collectGuardianSnapshots(
  query: GuardianCardQuery,
  options: CollectGuardianOptions = {},
): Promise<SnapshotAggregate[]> {
  const config = options.config ?? loadGuardianConfig();
  const fetchImpl = options.fetchImpl ?? fetch;
  const snapshotDate = options.snapshotDate ?? new Date().toISOString().slice(0, 10);

  const response = await fetchImpl(buildGuardianEstimateUrl(query), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Guardian TCG estimate fetch failed (${response.status})`);
  }

  const payload = (await response.json()) as GuardianResponse;
  return mapGuardianEstimatesToSnapshots(payload, {
    cardPrintingId: query.cardPrintingId,
    snapshotDate,
  });
}

export interface GuardianComparison {
  /** True when both snapshots describe the same currency/variant/grade bucket. */
  matched: boolean;
  ourPrice: number | null;
  guardianPrice: number | null;
  /** (ours − guardian) / guardian, as a fraction; null when not comparable. */
  deltaRatio: number | null;
}

/**
 * Cross-validates one of our snapshots against a Guardian estimate for the same
 * bucket. Used to flag suspicious own-aggregations, not to alter stored data.
 */
export function compareToGuardian(
  ours: SnapshotAggregate,
  guardian: SnapshotAggregate,
): GuardianComparison {
  const matched =
    ours.currency === guardian.currency &&
    ours.variant === guardian.variant &&
    (ours.gradeCompany ?? '') === (guardian.gradeCompany ?? '') &&
    (ours.gradeValue ?? '') === (guardian.gradeValue ?? '');

  const ourPrice = ours.avgPrice;
  const guardianPrice = guardian.avgPrice;
  const deltaRatio =
    matched && ourPrice !== null && guardianPrice !== null && guardianPrice > 0
      ? (ourPrice - guardianPrice) / guardianPrice
      : null;

  return { matched, ourPrice, guardianPrice, deltaRatio };
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
