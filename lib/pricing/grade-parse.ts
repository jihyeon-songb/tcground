/**
 * Shared grading parser for price-source adapters.
 *
 * Korean marketplaces (KREAM, 번개장터), Naver Shopping and eBay all encode the
 * grading bucket inside a free-text option label or listing title — e.g.
 * `"PSA 10"`, `"BRG 8.5 영문"`, `"미감정"`, or `Charizard ... PSA 8`. This module
 * normalizes that text into the `PriceVariant` + grade company/value used by
 * `price_observations` / `card_price_snapshots`, so every adapter buckets graded
 * vs raw prices the same way.
 */

import type { PriceVariant } from './price-source.types';

/** Grading companies recognized when parsing option labels / listing titles. */
export const GRADE_COMPANIES = ['PSA', 'BGS', 'BRG', 'CGC', 'SGC', 'ARS'] as const;

export interface ParsedGrade {
  variant: PriceVariant;
  gradeCompany: string | null;
  gradeValue: string | null;
}

/**
 * Parses a free-text label (KREAM option, Naver/eBay title, Bunjang name) into a
 * grading bucket. Returns `raw` (ungraded) when no known grading company is
 * present, otherwise the company + numeric grade. Trailing qualifiers like
 * `영문`/`한글판` are ignored for bucketing.
 */
export function parseGradeLabel(label: string | undefined | null): ParsedGrade {
  const upper = (label ?? '').toUpperCase();
  const company = GRADE_COMPANIES.find((name) => upper.includes(name));

  if (!company) {
    return { variant: 'raw', gradeCompany: null, gradeValue: null };
  }

  const after = upper.slice(upper.indexOf(company) + company.length);
  const match = after.match(/\d+(\.\d+)?/);

  return {
    variant: 'graded',
    gradeCompany: company,
    gradeValue: match ? match[0] : null,
  };
}

/** Strips HTML tags (e.g. Naver titles wrap matched terms in `<b>`). */
export function stripTags(value: string | undefined | null): string {
  return (value ?? '').replace(/<[^>]*>/g, '').trim();
}
