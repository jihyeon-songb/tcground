import { describe, expect, it, vi } from 'vitest';
import {
  buildCardSlug,
  fetchTcgdexSet,
  mapCardToRows,
  mapSetToRow,
  normalizeName,
  tcgdexImageUrl,
  type TcgdexSet,
} from './tcgdex-import';

const GAME_ID = 'game-pokemon';

const sampleSet: TcgdexSet = {
  id: 'SV2a',
  name: 'Pokemon Card 151',
  releaseDate: '2023-06-16',
  cardCount: { official: 165, total: 207 },
  cards: [
    {
      id: 'SV2a-201',
      localId: '201',
      name: 'Charizard ex',
      image: 'https://assets.tcgdex.net/ja/sv/sv2a/201',
      rarity: 'Special Art Rare',
    },
    {
      id: 'SV2a-025',
      localId: '025',
      name: 'Pikachu',
      // no image — exercises the null asset path
    },
  ],
};

describe('normalizeName', () => {
  it('lowercases, strips symbols, and collapses whitespace', () => {
    expect(normalizeName('  Charizard  ex! ')).toBe('charizard ex');
  });

  it('keeps Hangul characters', () => {
    expect(normalizeName('리자몽 ex')).toBe('리자몽 ex');
  });
});

describe('buildCardSlug', () => {
  it('is deterministic and unique per set + localId', () => {
    expect(buildCardSlug('Charizard ex', 'SV2a', '201')).toBe('sv2a-201-charizard-ex');
  });

  it('collapses repeated separators', () => {
    expect(buildCardSlug('Mr. Mime', 'SV2a', '122')).toBe('sv2a-122-mr-mime');
  });
});

describe('tcgdexImageUrl', () => {
  it('appends quality and extension', () => {
    expect(tcgdexImageUrl('https://x/SV2a/201', 'high')).toBe('https://x/SV2a/201/high.webp');
  });

  it('returns null when no base image', () => {
    expect(tcgdexImageUrl(undefined, 'low')).toBeNull();
  });
});

describe('mapSetToRow', () => {
  it('maps a ko-resolved set with a Korean name', () => {
    const row = mapSetToRow(sampleSet, 'ko', GAME_ID);
    expect(row).toMatchObject({
      game_id: GAME_ID,
      slug: 'sv2a',
      name: 'Pokemon Card 151',
      name_ko: 'Pokemon Card 151',
      released_on: '2023-06-16',
      card_count: 165,
    });
  });

  it('leaves name_ko null for a fallback locale', () => {
    expect(mapSetToRow(sampleSet, 'ja', GAME_ID).name_ko).toBeNull();
  });
});

describe('mapCardToRows', () => {
  it('maps a card brief to card + ko printing rows', () => {
    const { card, printing } = mapCardToRows(sampleSet.cards[0]!, {
      gameId: GAME_ID,
      setId: 'sv2a',
      setName: sampleSet.name,
      locale: 'ko',
    });

    expect(card).toMatchObject({
      game_id: GAME_ID,
      set_id: 'sv2a',
      slug: 'sv2a-201-charizard-ex',
      name: 'Charizard ex',
      normalized_name: 'charizard ex',
      collector_number: '201',
      rarity: 'Special Art Rare',
      image_url: 'https://assets.tcgdex.net/ja/sv/sv2a/201/high.webp',
      thumbnail_url: 'https://assets.tcgdex.net/ja/sv/sv2a/201/low.webp',
    });

    expect(printing).toMatchObject({
      card_slug: 'sv2a-201-charizard-ex',
      language: 'ko',
      region: 'KR',
      set_code: 'sv2a',
      collector_number: '201',
      finish: 'unknown',
      external_ids: {
        tcgdex_id: 'SV2a-201',
        tcgdex_locale: 'ko',
        tcgdex_match_basis: 'native',
      },
    });
  });

  it('marks fallback-locale printings as original_equivalent with no image', () => {
    const { card, printing } = mapCardToRows(sampleSet.cards[1]!, {
      gameId: GAME_ID,
      setId: 'sv2a',
      setName: sampleSet.name,
      locale: 'ja',
    });

    expect(card.image_url).toBeNull();
    expect(printing).toMatchObject({
      language: 'ja',
      region: 'JP',
      external_ids: { tcgdex_locale: 'ja', tcgdex_match_basis: 'original_equivalent' },
    });
  });
});

describe('fetchTcgdexSet', () => {
  function jsonResponse(body: unknown, ok = true, status = 200): Response {
    return { ok, status, json: async () => body } as unknown as Response;
  }

  it('falls back past a ko shell with no cards to ja', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ id: 'SV2a', name: '151', cards: [] }))
      .mockResolvedValueOnce(jsonResponse(sampleSet));

    const resolved = await fetchTcgdexSet('SV2a', ['ko', 'ja', 'en'], fetchImpl);

    expect(resolved.locale).toBe('ja');
    expect(resolved.attempted).toEqual(['ko']);
    expect(resolved.set.cards).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('skips non-ok responses and resolves the first locale with cards', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(null, false, 404))
      .mockResolvedValueOnce(jsonResponse(sampleSet));

    const resolved = await fetchTcgdexSet('SV2a', ['ko', 'ja'], fetchImpl);
    expect(resolved.locale).toBe('ja');
  });

  it('throws when no locale resolves cards', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(null, false, 404));
    await expect(fetchTcgdexSet('NOPE', ['ko', 'ja'], fetchImpl)).rejects.toThrow(/not resolvable/);
  });
});
