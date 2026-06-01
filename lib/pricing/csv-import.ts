/**
 * Manual CSV import for the `price-source-validation.csv` schema.
 *
 * A human records verified completed sales (eBay/KREAM/중고나라/번개장터 …) into a
 * fixed-column CSV; this parser turns each row into a `ParsedPriceObservation`.
 * It is the only compliant way for an individual developer to obtain real
 * sold (실거래가) data, since the eBay sold API is restricted.
 *
 * Pure functions only — no DB access. Card-printing resolution is a separate,
 * DB-backed step (`resolveCardPrintingIds`) so parsing stays unit-testable.
 */

import type {
  CardPrintingMatchHint,
  ParsedPriceObservation,
  PriceKind,
  PriceMarket,
  PriceObservationInput,
  PriceVariant,
} from './price-source.types';

const KNOWN_MARKETS: readonly PriceMarket[] = ['KR', 'JP', 'NA'];

/** Parses raw CSV text into rows of string cells (RFC-4180 quoting). */
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && content[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  return rows;
}

/**
 * Parses the price-source validation CSV into sold observations.
 * Skips rows with an `exclude_reason` (e.g. bundles), non-sold rows, and rows
 * with an invalid price — enforcing the single-card, sold-only rule.
 */
export function parsePriceValidationCsv(content: string): ParsedPriceObservation[] {
  return parseValidationCsv(content, 'sold');
}

/**
 * Parses the same CSV into asking observations (`price_kind = asking`, e.g.
 * `manual_bunjang` listing rows). These feed the daily asking snapshot path
 * rather than `price_observations`. `sold_price`/`sold_at` columns carry the
 * listing price and observation time for asking rows.
 */
export function parseAskingValidationCsv(content: string): ParsedPriceObservation[] {
  return parseValidationCsv(content, 'asking');
}

/** Parses CSV rows matching `wantedKind`, dropping excluded/invalid rows. */
function parseValidationCsv(content: string, wantedKind: PriceKind): ParsedPriceObservation[] {
  const rows = parseCsv(content);
  if (rows.length < 2) return [];

  const header = rows[0];
  const index = buildHeaderIndex(header);
  const observations: ParsedPriceObservation[] = [];

  for (const row of rows.slice(1)) {
    const cell = (column: string): string => {
      const position = index.get(column);
      return position === undefined ? '' : (row[position] ?? '').trim();
    };

    if (cell('exclude_reason').length > 0) continue;

    const priceKind = normalizePriceKind(cell('price_kind'));
    if (priceKind !== wantedKind) continue;

    const soldPrice = Number.parseFloat(cell('sold_price'));
    if (!Number.isFinite(soldPrice) || soldPrice <= 0) continue;

    const soldAt = cell('sold_at');
    if (!soldAt) continue;

    const match: CardPrintingMatchHint = {
      sampleId: cell('sample_id'),
      setCode: emptyToNull(cell('set_code')),
      collectorNumber: emptyToNull(cell('collector_number')),
      language: emptyToNull(cell('language')),
      region: emptyToNull(cell('region')),
      finish: emptyToNull(cell('finish')),
    };

    observations.push({
      match,
      priceKind,
      observation: {
        sourceName: cell('source_name') || 'manual',
        market: normalizeMarket(cell('market')),
        currency: normalizeCurrency(cell('currency')),
        soldPrice,
        soldAt,
        observedAt: cell('observed_at') || new Date().toISOString(),
        conditionLabel: emptyToNull(cell('condition_label')),
        gradeCompany: emptyToNull(cell('grade_company')),
        gradeValue: emptyToNull(cell('grade_value')),
        variant: normalizeVariant(cell('variant')),
        listingTitle: emptyToNull(cell('listing_title')),
        sourceUrl: emptyToNull(cell('source_url')),
        sourceItemId: emptyToNull(cell('source_item_id')),
        confidenceScore: parseConfidence(cell('confidence_score')),
        rawPayload: parseRawPayload(cell('raw_payload_json')),
      },
    });
  }

  return observations;
}

/**
 * Resolves parsed observations to `card_printings.id` using a sampleId → id map.
 * Observations whose card cannot be matched are dropped.
 */
export function resolveCardPrintingIds(
  parsed: readonly ParsedPriceObservation[],
  printingIdBySampleId: ReadonlyMap<string, string>,
): PriceObservationInput[] {
  const resolved: PriceObservationInput[] = [];

  for (const item of parsed) {
    const cardPrintingId = printingIdBySampleId.get(item.match.sampleId);
    if (!cardPrintingId) continue;
    resolved.push({ cardPrintingId, ...item.observation });
  }

  return resolved;
}

function buildHeaderIndex(header: readonly string[]): Map<string, number> {
  const index = new Map<string, number>();
  header.forEach((name, position) => {
    index.set(name.trim(), position);
  });
  return index;
}

function normalizeMarket(value: string): PriceMarket {
  const upper = value.toUpperCase();
  return (KNOWN_MARKETS as readonly string[]).includes(upper) ? (upper as PriceMarket) : 'KR';
}

function normalizeVariant(value: string): PriceVariant {
  return value.toLowerCase() === 'graded' ? 'graded' : 'raw';
}

/** Currency codes are stored uppercase so chart bucketing (e.g. KRW tie-breaks) matches. */
function normalizeCurrency(value: string): string {
  return (value || 'KRW').toUpperCase();
}

/**
 * `asking` and `listing` are both active-listing (호가) rows; everything else is
 * a completed sale. Mapping `listing` to `asking` keeps priced listings out of
 * the sold (실거래가) aggregation.
 */
function normalizePriceKind(value: string): PriceKind {
  const normalized = value.toLowerCase();
  return normalized === 'asking' || normalized === 'listing' ? 'asking' : 'sold';
}

function parseConfidence(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0.5;
  return Math.min(1, Math.max(0, parsed));
}

function parseRawPayload(value: string): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Malformed JSON is ignored; we keep an empty minimized payload.
  }
  return {};
}

function emptyToNull(value: string): string | null {
  return value.length > 0 ? value : null;
}
