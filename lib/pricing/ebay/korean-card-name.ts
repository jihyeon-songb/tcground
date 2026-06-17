/**
 * Turns a Korean Pokémon card name into an English search name for eBay.
 *
 * eBay is an English marketplace and the Korean-coded sets the catalog mirrors
 * have no English names in TCGdex, so we translate the species name instead
 * (map generated from PokéAPI — see scripts/build-pokemon-name-map.ts). Regional
 * / Mega prefixes are translated; latin suffixes (ex, V, VMAX…) pass through.
 *
 * Returns null for names with no resolvable species (Trainers, Items, Energy),
 * so callers can fall back to a number-based keyword.
 */

import koEn from '../pokemon-ko-en.json';

const KO_EN = koEn as Record<string, string>;

/** Korean regional / Mega-evolution prefixes → English. */
const PREFIXES: Record<string, string> = {
  메가: 'Mega',
  가라르: 'Galarian',
  알로라: 'Alolan',
  히스이: 'Hisuian',
  팰데아: 'Paldean',
};

/** A trailing token kept verbatim (already latin: ex, V, VMAX, VSTAR, GX, …). */
function isLatinSuffix(token: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(token);
}

/** Translates a Korean card name to an English search name, or null if unmapped. */
export function koreanCardNameToEnglish(koName: string): string | null {
  const tokens = koName.trim().split(/\s+/).filter(Boolean);

  // Peel trailing latin suffix tokens (ex / V / VMAX …) off the species part.
  const suffixes: string[] = [];
  while (tokens.length > 0 && isLatinSuffix(tokens[tokens.length - 1])) {
    suffixes.unshift(tokens.pop() as string);
  }
  if (tokens.length === 0) return null;

  const core = tokens.join(' ');

  // 1) Whole core is a species (covers names like "메가자리" where 메가 is not a prefix).
  const direct = KO_EN[core];
  if (direct) return [direct, ...suffixes].join(' ');

  // 2) Regional/Mega prefix + species, with or without a space:
  //    "메가 팬텀" → "Mega Gengar", "메가이상해꽃" → "Mega Venusaur".
  for (const [prefix, english] of Object.entries(PREFIXES)) {
    if (!core.startsWith(prefix) || core === prefix) continue;
    const rest = core.slice(prefix.length).trimStart();
    const species = KO_EN[rest];
    if (species) return [english, species, ...suffixes].join(' ');
  }

  return null;
}
