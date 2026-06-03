/**
 * Extends memory-bank/price-source-validation.csv with pending evidence rows
 * for every Korean Pokémon catalog printing currently in Supabase.
 *
 * This does not create public prices. Rows are written with
 * `source_name=pending` and `exclude_reason=pending_evidence`, so the CSV
 * parser skips them until a human replaces the row with verified sold evidence.
 */

import { readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '../lib/supabase/admin';
import { parseCsv } from '../lib/pricing/csv-import';

const CSV_PATH = join(process.cwd(), 'memory-bank', 'price-source-validation.csv');
const PAGE_SIZE = 1000;
const SAMPLE_ID_PREFIX = 'PKMKR-';

interface ExistingCsvRow {
  sampleId: string;
  cardName: string;
  setName: string;
  collectorNumber: string;
  language: string;
  region: string;
  finish: string;
}

interface CatalogPrintingRow {
  id: string;
  language: string | null;
  region: string | null;
  set_name: string | null;
  set_code: string | null;
  collector_number: string | null;
  rarity: string | null;
  finish: string | null;
  external_ids: Record<string, unknown> | null;
  cards: { name: string | null } | null;
}

function parseExistingRows(content: string): ExistingCsvRow[] {
  const rows = parseCsv(content);
  if (rows.length < 2) return [];

  const header = rows[0];
  const column = (name: string): number => {
    const index = header.indexOf(name);
    if (index < 0) throw new Error(`CSV header is missing "${name}"`);
    return index;
  };

  const indexes = {
    sampleId: column('sample_id'),
    cardName: column('card_name'),
    setName: column('set_name'),
    collectorNumber: column('collector_number'),
    language: column('language'),
    region: column('region'),
    finish: column('finish'),
  };

  return rows.slice(1).map((row) => ({
    sampleId: row[indexes.sampleId] ?? '',
    cardName: row[indexes.cardName] ?? '',
    setName: row[indexes.setName] ?? '',
    collectorNumber: row[indexes.collectorNumber] ?? '',
    language: row[indexes.language] ?? '',
    region: row[indexes.region] ?? '',
    finish: row[indexes.finish] ?? '',
  }));
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function identityKey(row: {
  cardName: string | null | undefined;
  setName: string | null | undefined;
  collectorNumber: string | null | undefined;
  language: string | null | undefined;
  region: string | null | undefined;
  finish: string | null | undefined;
}): string {
  return [
    row.language,
    row.region,
    row.setName,
    row.cardName,
    row.collectorNumber,
    row.finish,
  ]
    .map(normalize)
    .join('|');
}

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function buildPendingRow(row: CatalogPrintingRow): string | null {
  const cardNum = row.external_ids?.card_num;
  if (typeof cardNum !== 'string' || cardNum.length === 0) return null;

  const cardName = row.cards?.name ?? '';
  const setName = row.set_name ?? '';
  const collectorNumber = row.collector_number ?? '';
  if (!cardName || !setName || !collectorNumber) return null;

  const sampleId = `${SAMPLE_ID_PREFIX}${cardNum}`;
  const rawPayload = JSON.stringify({
    memo:
      '전체 한국판 포켓몬 카탈로그 pending worklist — 실제 sold evidence 없음. 공개 가격 산정 제외.',
  });

  const cells = [
    sampleId,
    cardName,
    setName,
    row.set_code ?? '',
    collectorNumber,
    row.rarity ?? '',
    row.language ?? 'ko',
    row.region ?? 'KR',
    row.finish ?? 'unknown',
    'pending',
    '',
    '',
    '',
    'KR',
    'KRW',
    'sold',
    '',
    '',
    '',
    '',
    'raw',
    '',
    '',
    '',
    '',
    rawPayload,
    'pending_evidence',
  ];

  return cells.map(csvCell).join(',');
}

async function fetchKoreanPrintings(supabase: SupabaseClient): Promise<CatalogPrintingRow[]> {
  const rows: CatalogPrintingRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('card_printings')
      .select(
        'id, language, region, set_name, set_code, collector_number, rarity, finish, external_ids, cards(name)',
      )
      .eq('language', 'ko')
      .eq('region', 'KR')
      .order('set_code', { ascending: true })
      .order('collector_number', { ascending: true })
      .range(from, to);

    if (error) throw new Error(`Failed to load catalog printings: ${error.message}`);
    const page = (data ?? []) as unknown as CatalogPrintingRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

async function main(): Promise<void> {
  const content = readFileSync(CSV_PATH, 'utf8');
  const existingRows = parseExistingRows(content);
  const existingSampleIds = new Set(existingRows.map((row) => row.sampleId).filter(Boolean));
  const existingIdentities = new Set(
    existingRows.map((row) =>
      identityKey({
        cardName: row.cardName,
        setName: row.setName,
        collectorNumber: row.collectorNumber,
        language: row.language,
        region: row.region,
        finish: row.finish,
      }),
    ),
  );

  const supabase = createAdminClient();
  const catalogRows = await fetchKoreanPrintings(supabase);
  const pendingRows: string[] = [];
  let skippedCovered = 0;
  let skippedMissingCardNum = 0;

  for (const row of catalogRows) {
    const cardNum = row.external_ids?.card_num;
    const sampleId = typeof cardNum === 'string' ? `${SAMPLE_ID_PREFIX}${cardNum}` : null;
    const key = identityKey({
      cardName: row.cards?.name,
      setName: row.set_name,
      collectorNumber: row.collector_number,
      language: row.language,
      region: row.region,
      finish: row.finish,
    });

    if ((sampleId && existingSampleIds.has(sampleId)) || existingIdentities.has(key)) {
      skippedCovered += 1;
      continue;
    }

    const pendingRow = buildPendingRow(row);
    if (!pendingRow) {
      skippedMissingCardNum += 1;
      continue;
    }

    pendingRows.push(pendingRow);
    existingSampleIds.add(sampleId!);
    existingIdentities.add(key);
  }

  if (pendingRows.length > 0) {
    const needsNewline = !content.endsWith('\n');
    appendFileSync(CSV_PATH, `${needsNewline ? '\n' : ''}${pendingRows.join('\n')}\n`);
  }

  console.log(
    JSON.stringify(
      {
        catalogPrintings: catalogRows.length,
        appendedPendingRows: pendingRows.length,
        skippedAlreadyCovered: skippedCovered,
        skippedMissingCardNum,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
