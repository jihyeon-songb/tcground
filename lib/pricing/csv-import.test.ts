import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCsv, parsePriceValidationCsv, resolveCardPrintingIds } from './csv-import';

const HEADER = [
  'sample_id,card_name,set_name,set_code,collector_number,rarity,language,region,finish,',
  'source_name,source_item_id,source_url,listing_title,market,currency,price_kind,sold_price,',
  'sold_at,observed_at,condition_label,variant,grade_company,grade_value,shipping_price,',
  'confidence_score,raw_payload_json,exclude_reason',
].join('');

function csv(...dataRows: string[]): string {
  return [HEADER, ...dataRows].join('\n');
}

describe('parseCsv', () => {
  it('handles quoted fields with embedded commas and escaped quotes', () => {
    const rows = parseCsv('a,b,c\n1,"two, with comma","he said ""hi"""');
    expect(rows[1]).toEqual(['1', 'two, with comma', 'he said "hi"']);
  });
});

describe('parsePriceValidationCsv', () => {
  it('parses a sold row into a normalized observation', () => {
    const content = csv(
      'KR-004,리자몽 ex,151,BS2023014201,201/165,SAR,ko,KR,unknown,' +
        'ebay_sold,389546254393,https://www.ebay.com/itm/389546254393,Korean Charizard,NA,USD,sold,139.99,' +
        '2026-01-30T12:49:00+00:00,2026-05-21T18:39:22+09:00,near_mint,raw,,,,' +
        '0.92,"{""memo"":""match""}",',
    );

    const observations = parsePriceValidationCsv(content);
    expect(observations).toHaveLength(1);

    const { match, observation, priceKind } = observations[0];
    expect(priceKind).toBe('sold');
    expect(match.sampleId).toBe('KR-004');
    expect(match.collectorNumber).toBe('201/165');
    expect(observation.market).toBe('NA');
    expect(observation.currency).toBe('USD');
    expect(observation.soldPrice).toBeCloseTo(139.99);
    expect(observation.confidenceScore).toBeCloseTo(0.92);
    expect(observation.rawPayload).toEqual({ memo: 'match' });
  });

  it('skips rows with an exclude_reason (e.g. bundles)', () => {
    const content = csv(
      'KR-002,M리자몽,cp6,BS2016009104,104/100,SR,ko,KR,unknown,' +
        'ebay_sold,267402552242,https://www.ebay.com/itm/267402552242,Bundle,NA,GBP,sold,196.65,' +
        '2025-09-21T12:00:00+00:00,2026-05-21T18:48:05+09:00,near_mint,raw,,,,' +
        '0.55,"{}",bundle_contains_multiple_cards',
    );

    expect(parsePriceValidationCsv(content)).toHaveLength(0);
  });

  it('parses graded sales with grade fields', () => {
    const content = csv(
      'KR-004,리자몽 ex,151,BS2023014201,201/165,SAR,ko,KR,unknown,' +
        'manual_kream,804751,https://kream.co.kr/products/804751,PSA 10,KR,KRW,sold,550000,' +
        '2026-05-12T12:00:00+09:00,2026-05-21T18:39:22+09:00,,graded,PSA,10,,' +
        '0.88,"{}",',
    );

    const [{ observation }] = parsePriceValidationCsv(content);
    expect(observation.variant).toBe('graded');
    expect(observation.gradeCompany).toBe('PSA');
    expect(observation.gradeValue).toBe('10');
    expect(observation.currency).toBe('KRW');
  });
});

describe('resolveCardPrintingIds', () => {
  it('attaches printing ids and drops unmatched cards', () => {
    const content = csv(
      'KR-004,리자몽 ex,151,BS2023014201,201/165,SAR,ko,KR,unknown,' +
        'ebay_sold,1,https://e/1,t,NA,USD,sold,100,2026-01-01T00:00:00Z,2026-01-02T00:00:00Z,near_mint,raw,,,,0.9,"{}",',
      'KR-999,Unknown,?,?,?,?,ko,KR,unknown,' +
        'ebay_sold,2,https://e/2,t,NA,USD,sold,100,2026-01-01T00:00:00Z,2026-01-02T00:00:00Z,near_mint,raw,,,,0.9,"{}",',
    );

    const parsed = parsePriceValidationCsv(content);
    const resolved = resolveCardPrintingIds(parsed, new Map([['KR-004', 'printing-4']]));

    expect(resolved).toHaveLength(1);
    expect(resolved[0].cardPrintingId).toBe('printing-4');
  });
});

describe('real validation dataset', () => {
  it('parses the seed CSV and excludes flagged rows', () => {
    const content = readFileSync(
      join(process.cwd(), 'memory-bank', 'price-source-validation.csv'),
      'utf8',
    );

    const observations = parsePriceValidationCsv(content);
    expect(observations.length).toBeGreaterThan(0);
    expect(observations.every((item) => item.priceKind === 'sold')).toBe(true);
    expect(observations.every((item) => item.observation.soldPrice > 0)).toBe(true);
  });
});
