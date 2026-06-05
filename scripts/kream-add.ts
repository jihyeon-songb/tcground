/**
 * Appends verified KREAM (manual_kream) sold rows to the price validation CSV
 * from a structured JSON inbox, so streamed trade blocks become correct rows
 * without hand-editing 27-column lines.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/kream-add.ts <inbox.json> [--dry-run]
 *
 * Each inbox entry resolves to one card (sampleId must already exist in the
 * catalog). Trades are parsed for grade/variant, KR/EN language, and date
 * (YY/MM/DD, "N시간 전", "N일 전", "오늘"). Rows already present in the canonical
 * CSV (same productId + price + date + grade) are skipped, so re-runs are safe.
 *
 * This is the only compliant KREAM path: a human reads KREAM, the numbers are
 * pasted here; nothing is scraped.
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from '../lib/pricing/csv-import';

/** "Today" in KST; matches the manual collection context, not the host clock. */
const TODAY = '2026-06-05';
const OBSERVED_AT = `${TODAY}T12:00:00+09:00`;
const CSV_PATH = join(process.cwd(), 'memory-bank', 'price-source-validation.csv');

interface InboxCard {
  sampleId: string;
  cardName: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  rarity: string;
  productId: string;
  /** Short set label for the listing title, e.g. "흑염의 지배자". */
  shortSet: string;
  /** Raw trade lines: "<option> | <price> | <date>". */
  trades: string[];
}

interface ParsedTrade {
  option: string;
  price: number;
  soldDate: string; // YYYY-MM-DD
  variant: 'graded' | 'raw';
  company: string | null;
  value: string | null;
  lang: 'en' | 'ko' | null;
  confidence: number;
}

function parsePrice(raw: string): number {
  return Number(raw.replace(/[^0-9]/g, ''));
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function parseDate(raw: string): string {
  const t = raw.trim();
  const ymd = t.match(/(\d{2})\/(\d{2})\/(\d{2})/);
  if (ymd) return `20${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  if (/방금|분\s*전|시간\s*전|오늘/.test(t)) return TODAY;
  const days = t.match(/(\d+)\s*일\s*전/);
  if (days) return shiftDays(TODAY, Number(days[1]));
  throw new Error(`Unparseable date: "${raw}"`);
}

function parseOption(option: string): Omit<ParsedTrade, 'option' | 'price' | 'soldDate'> {
  const lang = /영문/.test(option) ? 'en' : /한글/.test(option) ? 'ko' : null;
  const g = option.match(/(PSA|BGS|BRG|CGC|SGC)\s*([0-9]+(?:\.[0-9])?)/i);
  if (g) {
    const company = g[1].toUpperCase();
    const confidence =
      company === 'PSA' ? 0.88 : lang === 'en' ? 0.82 : lang === 'ko' ? 0.85 : 0.85;
    return { variant: 'graded', company, value: g[2], lang, confidence };
  }
  return { variant: 'raw', company: null, value: null, lang, confidence: 0.7 };
}

function parseTrade(line: string): ParsedTrade {
  const parts = line.split('|').map((s) => s.trim());
  if (parts.length < 3) throw new Error(`Bad trade line (need "opt | price | date"): "${line}"`);
  const [option, priceRaw, dateRaw] = parts;
  const price = parsePrice(priceRaw);
  if (!Number.isFinite(price) || price <= 0) throw new Error(`Bad price: "${line}"`);
  return { option, price, soldDate: parseDate(dateRaw), ...parseOption(option) };
}

function cell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function identity(productId: string, price: number, soldDate: string, company: string | null, value: string | null, variant: string): string {
  return `${productId}|${price}|${soldDate}|${company ?? ''}|${value ?? ''}|${variant}`;
}

function buildRow(card: InboxCard, t: ParsedTrade): string {
  const langNote =
    t.variant === 'raw'
      ? 'ungraded sale.'
      : t.lang === 'en'
        ? 'English copy graded under KR product.'
        : t.lang === 'ko'
          ? 'Korean copy graded.'
          : `${card.cardName} ${card.shortSet} graded.`;
  const memo = JSON.stringify({ memo: `KREAM ${card.productId}; option ${t.option}; ${langNote}` });
  const title = `포켓몬 TCG ${card.cardName} ${card.rarity} ${card.shortSet} 한글판 ${t.option}`;
  return [
    card.sampleId, card.cardName, card.setName, card.setCode, card.collectorNumber, card.rarity,
    'ko', 'KR', 'unknown', 'manual_kream', card.productId,
    `https://kream.co.kr/products/${card.productId}`, title, 'KR', 'KRW', 'sold',
    String(t.price), `${t.soldDate}T12:00:00+09:00`, OBSERVED_AT, 'unknown', t.variant,
    t.company ?? '', t.value ?? '', '', String(t.confidence), memo, '',
  ].map((c) => cell(String(c))).join(',');
}

function loadExistingIdentities(): Set<string> {
  const rows = parseCsv(readFileSync(CSV_PATH, 'utf8'));
  const h = rows[0];
  const col = (n: string) => h.indexOf(n);
  const iItem = col('source_item_id'), iPrice = col('sold_price'), iSold = col('sold_at');
  const iComp = col('grade_company'), iVal = col('grade_value'), iVar = col('variant');
  const set = new Set<string>();
  for (const r of rows.slice(1)) {
    if (!r[iItem]) continue;
    const date = (r[iSold] ?? '').slice(0, 10);
    set.add(identity(r[iItem], Number(r[iPrice]), date, r[iComp] || null, r[iVal] || null, r[iVar] || ''));
  }
  return set;
}

function main(): void {
  const inboxPath = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  if (!inboxPath) throw new Error('Provide an inbox JSON path');

  const cards = JSON.parse(readFileSync(inboxPath, 'utf8')) as InboxCard[];
  const existing = loadExistingIdentities();
  const seen = new Set<string>();
  const newRows: string[] = [];
  let skipped = 0;

  for (const card of cards) {
    let added = 0;
    for (const line of card.trades) {
      const t = parseTrade(line);
      const id = identity(card.productId, t.price, t.soldDate, t.company, t.value, t.variant);
      if (existing.has(id) || seen.has(id)) {
        skipped += 1;
        continue;
      }
      seen.add(id);
      newRows.push(buildRow(card, t));
      added += 1;
    }
    console.log(`  ${card.sampleId} ${card.cardName} ${card.collectorNumber}: +${added}`);
  }

  console.log(`new rows: ${newRows.length}, skipped(dup): ${skipped}, dryRun: ${dryRun}`);
  if (!dryRun && newRows.length > 0) {
    const content = readFileSync(CSV_PATH, 'utf8');
    const prefix = content.endsWith('\n') ? '' : '\n';
    appendFileSync(CSV_PATH, prefix + newRows.join('\n') + '\n');
    console.log(`appended to ${CSV_PATH}`);
  }
}

main();
