/**
 * Generates the Korean→English Pokémon species name map used to build eBay
 * search keywords for the Korean catalog.
 *
 * The catalog (pokemoncard.co.kr) carries only Korean names, but eBay is an
 * English marketplace. TCGdex has no English names for the Japanese-coded sets
 * the catalog mirrors, so we translate the species name instead: PokéAPI exposes
 * localized species names (ko + en), which is enough to turn "팬텀" → "Gengar".
 *
 * One-time generator. Writes lib/pricing/pokemon-ko-en.json (committed) so
 * runtime/enrichment never calls PokéAPI.
 *
 * Usage:
 *   node --import tsx scripts/build-pokemon-name-map.ts
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const POKEAPI = 'https://pokeapi.co/api/v2';
const OUT_PATH = join(process.cwd(), 'lib/pricing/pokemon-ko-en.json');

interface SpeciesNames {
  names: Array<{ language: { name: string }; name: string }>;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
}

async function main(): Promise<void> {
  const list = await fetchJson<{ results: Array<{ url: string }> }>(
    `${POKEAPI}/pokemon-species?limit=2000`,
  );
  console.log(`[name-map] species=${list.results.length}, fetching names…`);

  const map: Record<string, string> = {};
  let done = 0;
  // ponytail: serial fetch keeps us polite to PokéAPI; it's a one-time script.
  for (const { url } of list.results) {
    const species = await fetchJson<SpeciesNames>(url);
    const byLang = (lang: string) => species.names.find((n) => n.language.name === lang)?.name;
    const ko = byLang('ko');
    const en = byLang('en');
    if (ko && en) map[ko] = en;
    done += 1;
    if (done % 200 === 0) console.log(`[name-map] ${done}/${list.results.length}`);
  }

  writeFileSync(OUT_PATH, `${JSON.stringify(map, null, 0)}\n`);
  console.log(`[name-map] wrote ${Object.keys(map).length} entries → ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
