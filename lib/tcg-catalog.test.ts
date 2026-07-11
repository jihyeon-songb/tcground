import { describe, expect, it } from 'vitest';
import {
  buildPriceHistory,
  deriveAskingPriceDisplayFromHistory,
  deriveEbayListings,
  deriveMarketplaceFallbackLink,
  derivePriceDisplayFromEbayListings,
  derivePriceDisplayFromHistory,
  fetchSnapshotsByPrinting,
  getCardDetailBySlug,
  getRecommendedCardIds,
  mapCardDetailRow,
  mapPokemonCategoryPageData,
  mapTcgCategoryOverviewRows,
  parseCardEdition,
  selectFeaturedPokemonCards,
  sortPokemonCatalogCardsByRecommendation,
  type CardDetailRow,
  type PokemonCatalogCard,
  type PokemonCatalogCardRow,
  type TcgGameRow,
} from './tcg-catalog';

const pokemonGame: TcgGameRow = {
  id: 'game-pokemon',
  slug: 'pokemon',
  name: 'Pokemon TCG',
  name_ko: '포켓몬 카드',
  description: '검증된 한국판 포켓몬 대표 카드 카탈로그',
};

describe('tcg catalog view models', () => {
  it('maps top-level category overview from catalog rows without fake counts', () => {
    const categories = mapTcgCategoryOverviewRows({
      games: [
        {
          id: 'game-pokemon',
          slug: 'pokemon',
          name: 'Pokemon TCG',
          name_ko: '포켓몬 카드',
          description: '검증된 한국판 포켓몬 대표 카드 카탈로그',
        },
        {
          id: 'game-magic',
          slug: 'magic',
          name: 'Magic: The Gathering',
          name_ko: '매직 더 개더링',
          description: null,
        },
      ],
      cards: [
        { id: 'card-1', game_id: 'game-pokemon' },
        { id: 'card-2', game_id: 'game-pokemon' },
        { id: 'card-3', game_id: 'game-pokemon' },
      ],
      sets: [
        { id: 'set-1', game_id: 'game-pokemon' },
        { id: 'set-2', game_id: 'game-pokemon' },
      ],
      printings: [
        { id: 'printing-1', card_id: 'card-1' },
        { id: 'printing-2', card_id: 'card-2' },
      ],
      snapshots: [
        { card_printing_id: 'printing-1' },
        { card_printing_id: 'printing-1' },
        { card_printing_id: 'printing-2' },
      ],
    });

    expect(categories.map((category) => category.slug)).toEqual([
      'pokemon',
      'yugioh',
      'one-piece',
      'magic',
    ]);
    expect(categories[0]).toEqual({
      slug: 'pokemon',
      name: '포켓몬 카드',
      description: '검증된 한국판 포켓몬 대표 카드 카탈로그',
      href: '/categories/pokemon',
      cardCount: 3,
      setCount: 2,
      priceSnapshotCount: 3,
      status: 'live',
      statusLabel: '가격 추적 중',
    });
    expect(categories[1]).toMatchObject({
      slug: 'yugioh',
      cardCount: 0,
      setCount: 0,
      priceSnapshotCount: 0,
      status: 'empty',
    });
    expect(categories[2]).toMatchObject({
      slug: 'one-piece',
      cardCount: 0,
      setCount: 0,
      priceSnapshotCount: 0,
      status: 'empty',
    });
    expect(categories[3]).toEqual({
      slug: 'magic',
      name: '매직 더 개더링',
      description: '매직 더 개더링 staples와 세트별 카탈로그를 준비 중입니다.',
      href: '/categories/magic',
      cardCount: 0,
      setCount: 0,
      priceSnapshotCount: 0,
      status: 'empty',
      statusLabel: '준비 중',
    });
  });

  it('marks category overview as catalog-only when cards exist but prices do not', () => {
    const categories = mapTcgCategoryOverviewRows({
      games: [
        {
          id: 'game-pokemon',
          slug: 'pokemon',
          name: 'Pokemon TCG',
          name_ko: '포켓몬 카드',
          description: null,
        },
      ],
      cards: [{ id: 'card-1', game_id: 'game-pokemon' }],
      sets: [],
      printings: [{ id: 'printing-1', card_id: 'card-1' }],
      snapshots: [],
    });

    expect(categories[0]).toMatchObject({
      cardCount: 1,
      priceSnapshotCount: 0,
      status: 'catalog-only',
      statusLabel: '카탈로그 연결',
    });
  });

  it('uses exact count overrides instead of returned row length for category totals', () => {
    const categories = mapTcgCategoryOverviewRows({
      games: [
        {
          id: 'game-pokemon',
          slug: 'pokemon',
          name: 'Pokemon TCG',
          name_ko: '포켓몬 카드',
          description: null,
        },
      ],
      cards: [{ id: 'card-1', game_id: 'game-pokemon' }],
      sets: [{ id: 'set-1', game_id: 'game-pokemon' }],
      cardCounts: [{ game_id: 'game-pokemon', count: 3668 }],
      setCounts: [{ game_id: 'game-pokemon', count: 31 }],
      printings: [],
      snapshots: [],
    });

    expect(categories[0]).toMatchObject({
      cardCount: 3668,
      setCount: 31,
    });
  });

  it('maps ten Pokemon seed cards into category cards with stable detail links', () => {
    const rows = Array.from({ length: 10 }, (_, index) =>
      createCardRow({
        sampleId: `PKMKR-BS20230142${String(index + 1).padStart(2, '0')}`,
        slug: `kr-${String(index + 1).padStart(3, '0')}-sample-card`,
        name: `샘플 카드 ${index + 1}`,
        setSlug: index < 5 ? 'pokemon-kr-151' : 'pokemon-kr-terastal-festa-ex',
        setName: index < 5 ? '포켓몬 카드 151' : '테라스탈 페스타 ex',
      }),
    );

    const data = mapPokemonCategoryPageData(pokemonGame, rows);

    expect(data.gameNameKo).toBe('포켓몬 카드');
    expect(data.cards).toHaveLength(10);
    expect(data.cards[0]?.href).toBe('/cards/kr-001-sample-card');
    expect(data.cards[0]?.sampleId).toBe('PKMKR-BS2023014201');
    expect(data.availableSets).toEqual([
      { slug: 'pokemon-kr-151', name: '포켓몬 카드 151' },
      { slug: 'pokemon-kr-terastal-festa-ex', name: '테라스탈 페스타 ex' },
    ]);
    expect(data.availableRarities).toEqual(['SAR']);
    expect(data.selectedRarities).toEqual([]);
    expect(data.selectedSetSlugs).toEqual([]);
  });

  it('orders recommendation cards by snapshot count, most data first', () => {
    const rows = [
      createCardRow({
        sampleId: 'PKMKR-BS2023014201',
        slug: 'kr-001-no-price',
        name: '시세 없음',
        setSlug: 'pokemon-kr-151',
        setName: '포켓몬 카드 151',
      }),
      createCardRow({
        sampleId: 'PKMKR-BS2023014202',
        slug: 'kr-002-cheap',
        name: '시세 저렴',
        setSlug: 'pokemon-kr-151',
        setName: '포켓몬 카드 151',
      }),
      createCardRow({
        sampleId: 'PKMKR-BS2023014203',
        slug: 'kr-003-expensive',
        name: '시세 비쌈',
        setSlug: 'pokemon-kr-151',
        setName: '포켓몬 카드 151',
      }),
    ];
    // kr-002-cheap has one snapshot, kr-003-expensive has three; kr-001 has none.
    const snapshotsByPrinting = new Map([
      ['kr-002-cheap-printing', [createSnapshotRow({ avg_price: 50000 })]],
      [
        'kr-003-expensive-printing',
        [
          createSnapshotRow({ snapshot_date: '2026-05-01', avg_price: 300000 }),
          createSnapshotRow({ snapshot_date: '2026-05-02', avg_price: 310000 }),
          createSnapshotRow({ snapshot_date: '2026-05-03', avg_price: 320000 }),
        ],
      ],
    ]);

    const data = mapPokemonCategoryPageData(
      pokemonGame,
      rows,
      { sort: 'best' },
      snapshotsByPrinting,
    );

    // Most snapshots first (3 > 1 > 0), regardless of price; no-data cards sort last.
    expect(data.cards.map((card) => card.slug)).toEqual([
      'kr-003-expensive',
      'kr-002-cheap',
      'kr-001-no-price',
    ]);
  });

  it('keeps the category list usable when the recommendation RPC is unavailable', async () => {
    const ids = await getRecommendedCardIds({
      rpc: async () => ({
        data: null,
        error: { message: 'Could not find the function public.get_cards_by_snapshot_count' },
      }),
    } as never);

    expect(ids).toEqual([]);
  });

  it('leaves explicitly sorted card arrays in their caller-provided order', () => {
    const cards: PokemonCatalogCard[] = [
      makeSimpleCard('kr-003-card', null),
      makeSimpleCard('kr-001-card', 'https://assets.tcgdex.net/1.webp'),
      makeSimpleCard('kr-002-card', 'https://assets.tcgdex.net/2.webp'),
    ];

    expect(
      sortPokemonCatalogCardsByRecommendation(cards, 'name-asc').map((card) => card.slug),
    ).toEqual(['kr-003-card', 'kr-001-card', 'kr-002-card']);
  });

  it('maps card detail with set, rarity, collector number, and printing identity', () => {
    const detail = mapCardDetailRow(
      createDetailRow({
        sampleId: 'PKMKR-BS2023014201',
        slug: 'kr-004-charizard-ex-151',
        name: '리자몽 ex',
        setName: '포켓몬 카드 151',
        setCode: 'BS2023014201',
        collectorNumber: '201/165',
        rarity: 'SAR',
      }),
    );

    expect(detail.cardName).toBe('리자몽 ex');
    expect(detail.setLabel).toBe('포켓몬 카드 151');
    expect(detail.rarity).toBe('SAR');
    expect(detail.collectorNumber).toBe('201/165');
    expect(detail.printing.setCode).toBe('BS2023014201');
    expect(detail.printing.sampleId).toBe('PKMKR-BS2023014201');
    expect(detail.chips).toContain('201/165');
  });

  it('maps category card images by thumbnail, printing, then card image priority', () => {
    const printingImageUrl = 'https://assets.tcgdex.net/ja/SV/SV2a/201/high.webp';
    const thumbnailUrl = 'https://assets.tcgdex.net/ja/SV/SV2a/205/low.webp';
    const cardImageUrl = 'https://assets.tcgdex.net/ja/SV/SV2a/202/high.webp';
    const data = mapPokemonCategoryPageData(pokemonGame, [
      createCardRow({
        sampleId: 'PKMKR-BS2023014201',
        slug: 'kr-004-charizard-ex-151',
        name: '리자몽 ex',
        setSlug: 'pokemon-kr-151',
        setName: '포켓몬 카드 151',
        printingImageUrl,
        thumbnailUrl: 'https://assets.tcgdex.net/ja/SV/SV2a/201/low.webp',
        cardImageUrl,
      }),
      createCardRow({
        sampleId: 'PKMKR-BS2023014205',
        slug: 'kr-005-mew-ex-151',
        name: '뮤 ex',
        setSlug: 'pokemon-kr-151',
        setName: '포켓몬 카드 151',
        thumbnailUrl,
        cardImageUrl,
      }),
      createCardRow({
        sampleId: 'PKMKR-BS2023014202',
        slug: 'kr-007-blastoise-ex-151',
        name: '거북왕 ex',
        setSlug: 'pokemon-kr-151',
        setName: '포켓몬 카드 151',
        cardImageUrl,
      }),
    ]);

    expect(data.cards.map((card) => card.imageUrl)).toEqual([
      'https://assets.tcgdex.net/ja/SV/SV2a/201/low.webp',
      thumbnailUrl,
      cardImageUrl,
    ]);
  });

  it('prefers Korean Pokemon Center printing images over Japanese thumbnail fallback', () => {
    const data = mapPokemonCategoryPageData(pokemonGame, [
      createCardRow({
        sampleId: 'PKMKR-BS2023014201',
        slug: 'bs2023014201-리자몽-ex',
        name: '리자몽 ex',
        setSlug: 'bs2023014',
        setName: '스칼렛&바이올렛 강화 확장팩 「포켓몬 카드 151」',
        printingImageUrl:
          'https://cards.image.pokemonkorea.co.kr/data/wmimages/SV/SV2a/SV2a_201.png?w=512',
        thumbnailUrl: 'https://assets.tcgdex.net/ja/SV/SV2a/201/low.webp',
        cardImageUrl: 'https://assets.tcgdex.net/ja/SV/SV2a/201/high.webp',
      }),
    ]);

    expect(data.cards[0].imageUrl).toBe(
      'https://cards.image.pokemonkorea.co.kr/data/wmimages/SV/SV2a/SV2a_201.png?w=512',
    );
  });

  it('maps card detail images by printing image before card image fallback', () => {
    const printingImageUrl = 'https://assets.tcgdex.net/ja/SV/SV2a/201/high.webp';
    const cardImageUrl = 'https://assets.tcgdex.net/ja/SV/SV2a/202/high.webp';

    expect(
      mapCardDetailRow(
        createDetailRow({
          sampleId: 'PKMKR-BS2023014201',
          slug: 'kr-004-charizard-ex-151',
          name: '리자몽 ex',
          setName: '포켓몬 카드 151',
          setCode: 'BS2023014201',
          collectorNumber: '201/165',
          rarity: 'SAR',
          printingImageUrl,
          cardImageUrl,
        }),
      ).imageUrl,
    ).toBe(printingImageUrl);

    expect(
      mapCardDetailRow(
        createDetailRow({
          sampleId: 'PKMKR-BS2023014202',
          slug: 'kr-007-blastoise-ex-151',
          name: '거북왕 ex',
          setName: '포켓몬 카드 151',
          setCode: 'BS2023014202',
          collectorNumber: '202/165',
          rarity: 'SAR',
          cardImageUrl,
        }),
      ).imageUrl,
    ).toBe(cardImageUrl);
  });

  it('selects the Korean edition by default for card detail', () => {
    const detail = mapCardDetailRow(createMultiEditionDetailRow());

    expect(detail.selectedEdition).toBe('kr');
    expect(detail.printing).toMatchObject({
      id: 'printing-kr',
      language: 'ko',
      region: 'KR',
    });
    expect(detail.imageUrl).toBe(
      'https://cards.image.pokemonkorea.co.kr/data/wmimages/SV/SV2a/SV2a_201.png?w=512',
    );
    expect(detail.editionOptions).toEqual([
      {
        value: 'kr',
        label: '한국판',
        shortLabel: 'KR',
        isSelected: true,
        isAvailable: true,
        printingId: 'printing-kr',
      },
      {
        value: 'jp',
        label: '일본판',
        shortLabel: 'JP',
        isSelected: false,
        isAvailable: true,
        printingId: 'printing-jp',
      },
      {
        value: 'na',
        label: '미국판',
        shortLabel: 'US',
        isSelected: false,
        isAvailable: true,
        printingId: 'printing-na',
      },
    ]);
  });

  it('selects the requested Japanese edition for card detail', () => {
    const detail = mapCardDetailRow(createMultiEditionDetailRow(), [], { edition: 'jp' });

    expect(detail.selectedEdition).toBe('jp');
    expect(detail.printing).toMatchObject({
      id: 'printing-jp',
      language: 'ja',
      region: 'JP',
    });
    expect(detail.imageUrl).toBe('https://assets.tcgdex.net/ja/SV/SV2a/201/high.webp');
    expect(detail.editionOptions.find((option) => option.value === 'jp')?.isSelected).toBe(true);
  });

  it('returns no detail price without asking snapshots', () => {
    expect(mapCardDetailRow(createMultiEditionDetailRow(), []).price).toBeNull();
  });

  it('does not promote sold-only evidence to the detail price', () => {
    const detail = mapCardDetailRow(createMultiEditionDetailRow(), [
      createSnapshotRow({
        source_name: 'pricecharting_ebay_sold',
        aggregation_method: 'sold_median',
        avg_price: 120000,
      }),
    ]);

    expect(detail.price).toBeNull();
    expect(detail.priceHistory.soldPoints).toHaveLength(1);
  });

  it('parses unsupported edition params as the Korean default', () => {
    expect(parseCardEdition(undefined)).toBe('kr');
    expect(parseCardEdition('na')).toBe('na');
    expect(parseCardEdition('unknown')).toBe('kr');
  });

  it('propagates the search query into the category page data', () => {
    const data = mapPokemonCategoryPageData(pokemonGame, [], { query: '리자몽' });

    expect(data.query).toBe('리자몽');
    expect(data.cards).toEqual([]);
    expect(data.availableSets).toEqual([]);
    expect(data.availableRarities).toEqual([]);
  });

  it('defaults the search query to an empty string when omitted', () => {
    const data = mapPokemonCategoryPageData(pokemonGame, []);

    expect(data.query).toBe('');
  });

  it('preserves provided filter option pools and selections through mapping', () => {
    const rows = Array.from({ length: 3 }, (_, index) =>
      createCardRow({
        sampleId: `KR-${String(index + 1).padStart(3, '0')}`,
        slug: `kr-${String(index + 1).padStart(3, '0')}-sample-card`,
        name: `샘플 카드 ${index + 1}`,
        setSlug: 'pokemon-kr-151',
        setName: '포켓몬 카드 151',
      }),
    );

    const data = mapPokemonCategoryPageData(pokemonGame, rows, {
      availableSets: [
        { slug: 'pokemon-kr-151', name: '포켓몬 카드 151' },
        { slug: 'pokemon-kr-terastal-festa-ex', name: '테라스탈 페스타 ex' },
      ],
      availableRarities: ['SAR', 'AR'],
      selectedRarities: ['SAR'],
      selectedSetSlugs: ['pokemon-kr-151'],
      query: '리자몽',
    });

    expect(data.availableSets).toEqual([
      { slug: 'pokemon-kr-151', name: '포켓몬 카드 151' },
      { slug: 'pokemon-kr-terastal-festa-ex', name: '테라스탈 페스타 ex' },
    ]);
    expect(data.availableRarities).toEqual(['SAR', 'AR']);
    expect(data.selectedRarities).toEqual(['SAR']);
    expect(data.selectedSetSlugs).toEqual(['pokemon-kr-151']);
    expect(data.query).toBe('리자몽');
  });

  it('selects featured cards with images and respects the limit', () => {
    const cards: PokemonCatalogCard[] = [
      makeSimpleCard('kr-001-charizard-ex', null),
      makeSimpleCard('kr-003-charizard-ex-bf', 'https://assets.tcgdex.net/3.webp'),
      makeSimpleCard('kr-004-charizard-ex-151', 'https://assets.tcgdex.net/4.webp'),
      makeSimpleCard('kr-005-mew-ex-151', ''),
      makeSimpleCard('kr-006-pikachu-151', 'https://assets.tcgdex.net/6.webp'),
    ];

    const selected = selectFeaturedPokemonCards(cards, 2);

    expect(selected.map((card) => card.slug)).toEqual([
      'kr-003-charizard-ex-bf',
      'kr-004-charizard-ex-151',
    ]);
  });

  it('decodes percent-encoded Korean slugs before querying the catalog', async () => {
    let capturedSlug = '';
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: (_column: string, value: string) => {
            capturedSlug = value;
            return { maybeSingle: async () => ({ data: null, error: null }) };
          },
        }),
      }),
    } as unknown as Parameters<typeof getCardDetailBySlug>[1];

    // Next can hand the route param over still percent-encoded ("피콘").
    await getCardDetailBySlug('sv10-bs2025006001-%ED%94%BC%EC%BD%98', fakeClient);

    expect(capturedSlug).toBe('sv10-bs2025006001-피콘');
  });

  it('falls back to legacy snapshot columns when FX display columns do not exist', async () => {
    const selectedColumns: string[] = [];
    const fakeClient = {
      from: () => ({
        select: (columns: string) => {
          selectedColumns.push(columns);
          return {
            in: () => ({
              order: async () => {
                if (columns.includes('source_currency')) {
                  return {
                    data: null,
                    error: {
                      message: 'column card_price_snapshots.source_currency does not exist',
                    },
                  };
                }
                return {
                  data: [
                    {
                      card_printing_id: 'printing-1',
                      snapshot_date: '2026-05-28',
                      market: 'KR',
                      currency: 'KRW',
                      variant: 'raw',
                      condition_label: null,
                      source_name: 'manual_kream',
                      avg_price: 100000,
                      min_price: 90000,
                      max_price: 110000,
                      sample_count: 3,
                      grade_company: null,
                      grade_value: null,
                    },
                  ],
                  error: null,
                };
              },
            }),
          };
        },
      }),
    } as unknown as Parameters<typeof fetchSnapshotsByPrinting>[0];

    const snapshots = await fetchSnapshotsByPrinting(fakeClient, ['printing-1']);

    expect(selectedColumns[0]).toContain('source_currency');
    expect(selectedColumns[1]).not.toContain('source_currency');
    expect(snapshots.get('printing-1')).toHaveLength(1);
  });
});

function makeSimpleCard(slug: string, imageUrl: string | null): PokemonCatalogCard {
  return {
    slug,
    name: slug,
    href: `/cards/${slug}`,
    setName: '포켓몬 카드 151',
    setSlug: 'pokemon-kr-151',
    rarity: 'SAR',
    collectorNumber: '201/165',
    sampleId: 'PKMKR-UNKNOWN',
    imageUrl,
    price: {
      avgPrice: 100000,
      minPrice: 80000,
      maxPrice: 130000,
      changeRate: 1.2,
      changeTone: 'up',
      lastUpdatedAt: '2026년 5월 22일',
      stalenessDays: 0,
      sourceLabel: '카탈로그 대표값',
      currency: 'KRW',
      sampleCount: 0,
    },
    priceSnapshotCount: 0,
  };
}

function createCardRow({
  sampleId,
  slug,
  name,
  setSlug,
  setName,
  printingImageUrl = null,
  thumbnailUrl = null,
  cardImageUrl = null,
}: {
  sampleId: string;
  slug: string;
  name: string;
  setSlug: string;
  setName: string;
  printingImageUrl?: string | null;
  thumbnailUrl?: string | null;
  cardImageUrl?: string | null;
}): PokemonCatalogCardRow {
  const cardNum = sampleId.startsWith('PKMKR-') ? sampleId.slice('PKMKR-'.length) : null;
  return {
    id: slug,
    slug,
    name,
    collector_number: '201/165',
    rarity: 'SAR',
    image_url: cardImageUrl,
    thumbnail_url: thumbnailUrl,
    card_sets: {
      slug: setSlug,
      name: setName,
      name_ko: setName,
    },
    card_printings: [
      {
        id: `${slug}-printing`,
        language: 'ko',
        region: 'KR',
        set_name: setName,
        set_code: cardNum ?? 'BS2023014201',
        collector_number: '201/165',
        rarity: 'SAR',
        finish: 'unknown',
        image_url: printingImageUrl,
        external_ids: {
          sample_id: sampleId,
          ...(cardNum ? { card_num: cardNum } : {}),
        },
      },
    ],
  };
}

function createSnapshotRow(overrides: Record<string, unknown> = {}) {
  return {
    snapshot_date: '2026-06-01',
    market: 'KR',
    currency: 'KRW',
    variant: 'raw',
    source_name: 'manual_kream',
    avg_price: 100000,
    min_price: 90000,
    max_price: 120000,
    sample_count: 3,
    grade_company: null,
    grade_value: null,
    ...overrides,
  };
}

function createDetailRow({
  sampleId,
  slug,
  name,
  setName,
  setCode,
  collectorNumber,
  rarity,
  printingImageUrl = null,
  cardImageUrl = null,
}: {
  sampleId: string;
  slug: string;
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  rarity: string;
  printingImageUrl?: string | null;
  cardImageUrl?: string | null;
}): CardDetailRow {
  const cardNum = sampleId.startsWith('PKMKR-') ? sampleId.slice('PKMKR-'.length) : null;
  return {
    ...createCardRow({
      sampleId,
      slug,
      name,
      setSlug: 'pokemon-kr-151',
      setName,
      cardImageUrl,
    }),
    collector_number: collectorNumber,
    rarity,
    tcg_games: {
      slug: 'pokemon',
      name: 'Pokemon TCG',
      name_ko: '포켓몬 카드',
    },
    card_printings: [
      {
        id: `${slug}-printing`,
        language: 'ko',
        region: 'KR',
        set_name: setName,
        set_code: setCode,
        collector_number: collectorNumber,
        rarity,
        finish: 'unknown',
        image_url: printingImageUrl,
        external_ids: {
          sample_id: sampleId,
          ...(cardNum ? { card_num: cardNum } : {}),
        },
      },
    ],
  };
}

function createMultiEditionDetailRow(): CardDetailRow {
  const base = createDetailRow({
    sampleId: 'PKMKR-BS2023014201',
    slug: 'bs2023014201-리자몽-ex',
    name: '리자몽 ex',
    setName: '스칼렛&바이올렛 강화 확장팩 「포켓몬 카드 151」',
    setCode: 'BS2023014201',
    collectorNumber: '201/165',
    rarity: 'SAR',
    cardImageUrl: 'https://assets.tcgdex.net/ja/SV/SV2a/201/high.webp',
  });

  return {
    ...base,
    card_printings: [
      {
        id: 'printing-jp',
        language: 'ja',
        region: 'JP',
        set_name: 'Pokemon Card 151',
        set_code: 'SV2a',
        collector_number: '201/165',
        rarity: 'SAR',
        finish: 'unknown',
        image_url: 'https://assets.tcgdex.net/ja/SV/SV2a/201/high.webp',
        external_ids: {
          sample_id: 'JP-004',
        },
      },
      {
        id: 'printing-kr',
        language: 'ko',
        region: 'KR',
        set_name: '스칼렛&바이올렛 강화 확장팩 「포켓몬 카드 151」',
        set_code: 'BS2023014201',
        collector_number: '201/165',
        rarity: 'SAR',
        finish: 'unknown',
        image_url:
          'https://cards.image.pokemonkorea.co.kr/data/wmimages/SV/SV2a/SV2a_201.png?w=512',
        external_ids: {
          sample_id: 'PKMKR-BS2023014201',
          source: 'pokemoncard.co.kr',
        },
      },
      {
        id: 'printing-na',
        language: 'en',
        region: 'NA',
        set_name: 'Scarlet & Violet 151',
        set_code: 'SV2a',
        collector_number: '201/165',
        rarity: 'SIR',
        finish: 'unknown',
        image_url: 'https://images.pokemontcg.io/sv3pt5/199_hires.png',
        external_ids: {
          sample_id: 'NA-004',
        },
      },
    ],
  };
}

describe('price history view models', () => {
  function snapshotRow(overrides: Record<string, unknown> = {}) {
    return {
      snapshot_date: '2026-05-28',
      market: 'NA',
      currency: 'USD',
      variant: 'raw',
      source_name: 'ebay_browse',
      avg_price: 160,
      min_price: 140,
      max_price: 200,
      sample_count: 3,
      ...overrides,
    };
  }

  it('splits asking trend from sold overlay points', () => {
    const history = buildPriceHistory([
      snapshotRow({ snapshot_date: '2026-05-29', avg_price: 168 }),
      snapshotRow({ snapshot_date: '2026-05-28', avg_price: 160 }),
      snapshotRow({ source_name: 'aggregate', snapshot_date: '2026-01-30', avg_price: 139.99 }),
    ]);

    expect(history.hasData).toBe(true);
    expect(history.askingSeries).toHaveLength(2);
    expect(history.askingSeries[0].date).toBe('2026-05-28');
    expect(history.soldPoints).toHaveLength(1);
    expect(history.currency).toBe('USD');
  });

  it('excludes graded and variant-mismatched sales from the sold overlay', () => {
    const history = buildPriceHistory([
      snapshotRow({ snapshot_date: '2026-05-29', avg_price: 168 }),
      // comparable: raw, USD, ungraded → kept
      snapshotRow({ source_name: 'aggregate', snapshot_date: '2026-05-20', avg_price: 150 }),
      // graded PSA 10 → excluded so it can't distort the raw-price axis
      snapshotRow({
        source_name: 'aggregate',
        snapshot_date: '2026-05-21',
        avg_price: 1200,
        grade_company: 'PSA',
        grade_value: '10',
      }),
      // different variant → excluded
      snapshotRow({
        source_name: 'aggregate',
        snapshot_date: '2026-05-22',
        avg_price: 400,
        variant: 'reverse_holo',
      }),
    ]);

    expect(history.soldPoints).toHaveLength(1);
    expect(history.soldPoints[0].avgPrice).toBe(150);
  });

  it('reports zero staleness when the latest snapshot is today', () => {
    const history = buildPriceHistory([
      snapshotRow({ snapshot_date: '2026-05-29', avg_price: 110 }),
    ]);
    const price = derivePriceDisplayFromHistory(history, new Date('2026-05-29T09:00:00Z'));
    expect(price?.stalenessDays).toBe(0);
  });

  it('counts days since the latest snapshot for a stale price', () => {
    const history = buildPriceHistory([
      snapshotRow({ snapshot_date: '2026-05-21', avg_price: 110 }),
    ]);
    const price = derivePriceDisplayFromHistory(history, new Date('2026-05-29T09:00:00Z'));
    expect(price?.stalenessDays).toBe(8);
  });

  it('draws graded sold data as the trend (with a grade label) only when no raw data exists', () => {
    const history = buildPriceHistory([
      // Legacy KREAM PSA 10 sold evidence — the only data this card has, so it becomes the line
      snapshotRow({
        source_name: 'kream',
        aggregation_method: 'median_filtered',
        market: 'KR',
        currency: 'KRW',
        variant: 'graded',
        grade_company: 'PSA',
        grade_value: '10',
        snapshot_date: '2026-05-20',
        avg_price: 500000,
      }),
      snapshotRow({
        source_name: 'kream',
        aggregation_method: 'median_filtered',
        market: 'KR',
        currency: 'KRW',
        variant: 'graded',
        grade_company: 'PSA',
        grade_value: '10',
        snapshot_date: '2026-05-21',
        avg_price: 520000,
      }),
    ]);

    expect(history.askingSeries).toHaveLength(0);
    expect(history.soldPoints.map((p) => p.avgPrice)).toEqual([500000, 520000]);
    expect(history.gradeLabel).toBe('PSA 10');

    const price = derivePriceDisplayFromHistory(history);
    expect(price?.sourceLabel).toContain('PSA 10');
  });

  it('keeps graded data out of the trend when raw data is present', () => {
    const history = buildPriceHistory([
      // raw 번개장터 호가 — the comparable trend
      snapshotRow({
        source_name: 'bunjang',
        market: 'KR',
        currency: 'KRW',
        snapshot_date: '2026-05-28',
        avg_price: 60000,
      }),
      // KREAM PSA 10 — far higher; excluded from the raw line and overlay
      snapshotRow({
        source_name: 'kream',
        aggregation_method: 'median_filtered',
        market: 'KR',
        currency: 'KRW',
        variant: 'graded',
        grade_company: 'PSA',
        grade_value: '10',
        snapshot_date: '2026-05-20',
        avg_price: 500000,
      }),
    ]);

    expect(history.gradeLabel).toBeNull();
    expect(history.askingSeries.map((p) => p.avgPrice)).toEqual([60000]);
    expect(history.soldPoints).toHaveLength(0);
  });

  it('prefers a KRW bucket over a larger USD bucket for the trend', () => {
    const history = buildPriceHistory([
      // USD asking (eBay) — more rows, but not domestic
      snapshotRow({ snapshot_date: '2026-05-26', avg_price: 160 }),
      snapshotRow({ snapshot_date: '2026-05-27', avg_price: 162 }),
      snapshotRow({ snapshot_date: '2026-05-28', avg_price: 164 }),
      // KRW asking (번개장터) — fewer rows, but wins because this is a KR catalog
      snapshotRow({
        source_name: 'bunjang',
        currency: 'KRW',
        market: 'KR',
        snapshot_date: '2026-05-29',
        avg_price: 72000,
      }),
    ]);

    expect(history.currency).toBe('KRW');
    expect(history.askingSeries.map((p) => p.avgPrice)).toEqual([72000]);
  });

  it('keeps different markets in separate price buckets', () => {
    const history = buildPriceHistory([
      snapshotRow({
        source_name: 'bunjang',
        market: 'KR',
        currency: 'KRW',
        snapshot_date: '2026-05-28',
        avg_price: 100000,
      }),
      snapshotRow({
        source_name: 'bunjang',
        market: 'JP',
        currency: 'KRW',
        snapshot_date: '2026-05-28',
        avg_price: 500000,
      }),
    ]);

    expect(history.askingSeries).toHaveLength(1);
    expect(history.askingSeries[0].avgPrice).toBe(100000);
  });

  it('ignores snapshots without an average price', () => {
    const history = buildPriceHistory([snapshotRow({ avg_price: null })]);
    expect(history.hasData).toBe(false);
  });

  it('treats KREAM asking snapshots as the asking trend', () => {
    const history = buildPriceHistory([
      snapshotRow({
        source_name: 'kream',
        aggregation_method: 'kream_asking_median',
        market: 'KR',
        currency: 'KRW',
        snapshot_date: '2026-05-28',
        avg_price: 60000,
      }),
      snapshotRow({
        source_name: 'kream',
        aggregation_method: 'kream_asking_median',
        market: 'KR',
        currency: 'KRW',
        snapshot_date: '2026-05-29',
        avg_price: 72000,
      }),
      snapshotRow({
        source_name: 'manual_kream',
        aggregation_method: 'median_filtered',
        market: 'KR',
        currency: 'KRW',
        snapshot_date: '2026-05-20',
        avg_price: 90000,
      }),
    ]);

    expect(history.askingSeries).toHaveLength(2);
    expect(history.askingSeries.map((point) => point.avgPrice)).toEqual([60000, 72000]);
    expect(history.soldPoints).toHaveLength(1);
    expect(history.soldPoints[0].avgPrice).toBe(90000);
    expect(history.currency).toBe('KRW');
  });

  it('keeps legacy KREAM median_filtered snapshots as sold overlay points', () => {
    const history = buildPriceHistory([
      snapshotRow({
        source_name: 'bunjang',
        market: 'KR',
        currency: 'KRW',
        snapshot_date: '2026-05-28',
        avg_price: 60000,
      }),
      snapshotRow({
        source_name: 'bunjang',
        market: 'KR',
        currency: 'KRW',
        snapshot_date: '2026-05-29',
        avg_price: 72000,
      }),
      snapshotRow({
        source_name: 'kream',
        aggregation_method: 'median_filtered',
        market: 'KR',
        currency: 'KRW',
        snapshot_date: '2026-05-20',
        avg_price: 90000,
      }),
    ]);

    expect(history.askingSeries).toHaveLength(2);
    expect(history.soldPoints).toHaveLength(1);
    expect(history.soldPoints[0].avgPrice).toBe(90000);
    expect(history.currency).toBe('KRW');
  });

  it('uses aggregation_method to split manual_bunjang asking from sold evidence', () => {
    const history = buildPriceHistory([
      snapshotRow({
        source_name: 'manual_bunjang',
        aggregation_method: 'manual_asking_median',
        market: 'KR',
        currency: 'KRW',
        snapshot_date: '2026-05-28',
        avg_price: 88000,
      }),
      snapshotRow({
        source_name: 'manual_bunjang',
        aggregation_method: 'median_filtered',
        market: 'KR',
        currency: 'KRW',
        snapshot_date: '2026-05-05',
        avg_price: 124000,
      }),
    ]);

    expect(history.askingSeries).toHaveLength(1);
    expect(history.askingSeries[0].avgPrice).toBe(88000);
    expect(history.soldPoints).toHaveLength(1);
    expect(history.soldPoints[0].avgPrice).toBe(124000);
  });

  it('preserves the sold source name in the detail price summary', () => {
    const history = buildPriceHistory([
      snapshotRow({
        source_name: 'pricecharting_ebay_sold',
        aggregation_method: 'median_filtered',
        snapshot_date: '2026-05-07',
        avg_price: 56.99,
      }),
    ]);

    const price = derivePriceDisplayFromHistory(history);
    expect(price?.sourceLabel).toContain('PriceCharting eBay sold');
    expect(price?.sourceLabel).toContain('실거래가');
  });

  it('prefers the KRW bucket over a same-size USD bucket for the trend', () => {
    const history = buildPriceHistory([
      // USD asking (eBay) — same row count as the KRW asking bucket
      snapshotRow({ snapshot_date: '2026-05-28', avg_price: 160 }),
      snapshotRow({ snapshot_date: '2026-05-29', avg_price: 168 }),
      // KRW asking (번개장터) — wins the tie because this is a Korean-print catalog
      snapshotRow({
        source_name: 'bunjang',
        currency: 'KRW',
        market: 'KR',
        snapshot_date: '2026-05-28',
        avg_price: 60000,
      }),
      snapshotRow({
        source_name: 'bunjang',
        currency: 'KRW',
        market: 'KR',
        snapshot_date: '2026-05-29',
        avg_price: 72000,
      }),
    ]);

    expect(history.currency).toBe('KRW');
    expect(history.askingSeries.map((p) => p.avgPrice)).toEqual([60000, 72000]);
  });

  it('derives the summary and change rate from the asking series', () => {
    const history = buildPriceHistory([
      snapshotRow({ snapshot_date: '2026-05-28', avg_price: 100 }),
      snapshotRow({ snapshot_date: '2026-05-29', avg_price: 110 }),
    ]);
    const price = derivePriceDisplayFromHistory(history);

    expect(price).not.toBeNull();
    expect(price?.avgPrice).toBe(110);
    expect(price?.currency).toBe('USD');
    expect(price?.changeRate).toBeCloseTo(10);
    expect(price?.changeTone).toBe('up');
  });

  it('uses KRW display values and keeps the FX rate date in the source label', () => {
    const history = buildPriceHistory([
      snapshotRow({
        snapshot_date: '2026-05-28',
        currency: 'USD',
        avg_price: 100,
        min_price: 90,
        max_price: 120,
        source_currency: 'USD',
        source_avg_price: 100,
        source_min_price: 90,
        source_max_price: 120,
        display_currency: 'KRW',
        display_avg_price: 138000,
        display_min_price: 124200,
        display_max_price: 165600,
        fx_rate: 1380,
        fx_rate_date: '2026-05-27',
        fx_provider: 'korea_exim',
      }),
      snapshotRow({
        snapshot_date: '2026-05-29',
        currency: 'USD',
        avg_price: 110,
        min_price: 100,
        max_price: 130,
        source_currency: 'USD',
        source_avg_price: 110,
        source_min_price: 100,
        source_max_price: 130,
        display_currency: 'KRW',
        display_avg_price: 151800,
        display_min_price: 138000,
        display_max_price: 179400,
        fx_rate: 1380,
        fx_rate_date: '2026-05-27',
        fx_provider: 'korea_exim',
      }),
    ]);
    const price = derivePriceDisplayFromHistory(history);

    expect(history.currency).toBe('KRW');
    expect(history.askingSeries.map((point) => point.avgPrice)).toEqual([138000, 151800]);
    expect(history.askingSeries[0].sourceCurrency).toBe('USD');
    expect(price?.currency).toBe('KRW');
    expect(price?.sourceCurrency).toBe('USD');
    expect(price?.sourceLabel).toContain('USD->KRW 환율 2026년 5월 27일 기준');
  });

  it('derives the summary from the sold series when there is no asking trend', () => {
    const history = buildPriceHistory([
      snapshotRow({ source_name: 'aggregate', snapshot_date: '2026-05-28', avg_price: 100 }),
      snapshotRow({ source_name: 'aggregate', snapshot_date: '2026-05-29', avg_price: 120 }),
    ]);
    const price = derivePriceDisplayFromHistory(history);

    expect(history.askingSeries).toHaveLength(0);
    expect(price?.avgPrice).toBe(120);
    expect(price?.changeRate).toBeCloseTo(20);
    expect(price?.sourceLabel).toContain('실거래가');
  });

  it('returns null when there are no priced snapshots at all', () => {
    const history = buildPriceHistory([snapshotRow({ avg_price: null })]);
    expect(derivePriceDisplayFromHistory(history)).toBeNull();
  });

  it('keeps historical asking with staleness', () => {
    const history = buildPriceHistory([
      createSnapshotRow({
        snapshot_date: '2026-06-30',
        source_name: 'kream',
        aggregation_method: 'kream_asking_median',
        market: 'KR',
        currency: 'KRW',
        avg_price: 100000,
      }),
    ]);

    expect(
      deriveAskingPriceDisplayFromHistory(history, new Date('2026-07-07T00:00:00Z')),
    ).toMatchObject({ avgPrice: 100000, stalenessDays: 7 });
  });
});

describe('deriveMarketplaceFallbackLink', () => {
  const ebayQuery = {
    cardPrintingId: 'printing-1',
    cardName: '리자몽 ex',
    nameEn: 'Charizard ex',
    collectorNumber: '201/165',
    setCode: 'SV2a',
  };

  it('labels a domestic source instead of presenting it as eBay', () => {
    expect(
      deriveMarketplaceFallbackLink(
        [
          createSnapshotRow({
            source_name: 'kream',
            aggregation_method: 'kream_asking_median',
            source_url: 'https://kream.co.kr/products/804751',
          }),
        ],
        ebayQuery,
      ),
    ).toEqual({
      kind: 'source',
      href: 'https://kream.co.kr/products/804751',
      sourceLabel: 'KREAM',
      actionLabel: 'KREAM에서 보기',
    });
  });

  it('rejects a legacy eBay item URL and falls back to search', () => {
    const link = deriveMarketplaceFallbackLink(
      [
        createSnapshotRow({
          source_name: 'ebay_browse',
          source_url: 'https://www.ebay.com/itm/298286038307',
          listings: null,
        }),
      ],
      ebayQuery,
    );

    expect(link.kind).toBe('search');
    expect(new URL(link.href).searchParams.get('_nkw')).toBe('Charizard ex 201/165 Korean');
  });

  it('rejects non-http source URLs', () => {
    const link = deriveMarketplaceFallbackLink(
      [
        createSnapshotRow({
          source_name: 'kream',
          aggregation_method: 'kream_asking_median',
          source_url: 'javascript:alert(1)',
        }),
      ],
      ebayQuery,
    );

    expect(link.kind).toBe('search');
  });

  it.each([
    ['bunjang', '번개장터'],
    ['joongna', '중고나라'],
    ['unknown_market', '외부 판매처'],
  ])('maps %s to a safe public label', (sourceName, sourceLabel) => {
    const link = deriveMarketplaceFallbackLink(
      [
        createSnapshotRow({
          source_name: sourceName,
          aggregation_method: 'manual_asking_median',
          source_url: 'https://market.example/item/1',
        }),
      ],
      ebayQuery,
    );

    expect(link.sourceLabel).toBe(sourceLabel);
  });

  it('keeps fallback candidates in one coherent price bucket', () => {
    const link = deriveMarketplaceFallbackLink(
      [
        createSnapshotRow({
          snapshot_date: '2026-06-01',
          source_name: 'kream',
          aggregation_method: 'kream_asking_median',
          source_url: 'https://kream.co.kr/products/krw',
        }),
        createSnapshotRow({
          snapshot_date: '2026-06-02',
          market: 'NA',
          currency: 'USD',
          source_name: 'unknown_market',
          aggregation_method: 'manual_asking_median',
          avg_price: 70,
          source_url: 'https://market.example/usd',
        }),
      ],
      ebayQuery,
    );

    expect(link.href).toBe('https://kream.co.kr/products/krw');
  });

  it('uses the most recent trustworthy date inside the selected bucket', () => {
    const link = deriveMarketplaceFallbackLink(
      [
        createSnapshotRow({
          snapshot_date: '2026-06-01',
          source_name: 'kream',
          aggregation_method: 'kream_asking_median',
          source_url: 'https://kream.co.kr/products/old',
        }),
        createSnapshotRow({
          snapshot_date: '2026-06-03',
          source_name: 'kream',
          aggregation_method: 'kream_asking_median',
          source_url: 'https://kream.co.kr/products/new',
        }),
        createSnapshotRow({
          snapshot_date: '2026-06-04',
          market: 'NA',
          currency: 'USD',
          source_name: 'unknown_market',
          aggregation_method: 'manual_asking_median',
          avg_price: 70,
          source_url: 'https://market.example/newest-global',
        }),
      ],
      ebayQuery,
    );

    expect(link.href).toBe('https://kream.co.kr/products/new');
  });

  it('breaks nearest-price ties independently of snapshot input order', () => {
    const rows = [
      createSnapshotRow({
        source_name: 'kream',
        aggregation_method: 'kream_asking_median',
        avg_price: 110000,
        source_url: 'https://market.example/kream',
      }),
      createSnapshotRow({
        source_name: 'bunjang',
        aggregation_method: 'manual_asking_median',
        avg_price: 90000,
        source_url: 'https://market.example/bunjang',
      }),
    ];

    expect(deriveMarketplaceFallbackLink(rows, ebayQuery).href).toBe(
      'https://market.example/bunjang',
    );
    expect(deriveMarketplaceFallbackLink([...rows].reverse(), ebayQuery).href).toBe(
      'https://market.example/bunjang',
    );
  });
});

describe('deriveEbayListings', () => {
  const listingRow = (overrides: Record<string, unknown> = {}) => ({
    snapshot_date: '2026-05-29',
    market: 'NA',
    currency: 'USD',
    variant: 'raw',
    source_name: 'ebay_browse',
    avg_price: 100,
    min_price: 80,
    max_price: 200,
    sample_count: 3,
    fx_rate: 1000,
    listings: [
      { price: 80, currency: 'USD', url: 'https://www.ebay.com/itm/a', title: 'A' },
      { price: 100, currency: 'USD', url: 'https://www.ebay.com/itm/b', title: 'B' },
      { price: 200, currency: 'USD', url: 'https://www.ebay.com/itm/c', title: 'C' },
    ],
    ...overrides,
  });

  it('selects the representative listing from the eBay snapshot average', () => {
    const { listings, featuredIndex } = deriveEbayListings([listingRow()], 190_000);

    expect(listings).toEqual([
      { priceKrw: 80_000, url: 'https://www.ebay.com/itm/a', title: 'A' },
      { priceKrw: 100_000, url: 'https://www.ebay.com/itm/b', title: 'B' },
      { priceKrw: 200_000, url: 'https://www.ebay.com/itm/c', title: 'C' },
    ]);
    expect(featuredIndex).toBe(1);
  });

  it('uses only the latest browse snapshot and dedupes by URL', () => {
    const { listings } = deriveEbayListings(
      [
        listingRow({
          snapshot_date: '2026-05-20',
          listings: [
            { price: 5, currency: 'USD', url: 'https://www.ebay.com/itm/old', title: 'old' },
          ],
        }),
        listingRow(),
      ],
      100_000,
    );

    expect(listings.map((listing) => listing.url)).not.toContain('https://www.ebay.com/itm/old');
    expect(listings).toHaveLength(3);
  });

  it('returns empty when no browse snapshot carries listings', () => {
    expect(deriveEbayListings([listingRow({ listings: undefined })], 100_000)).toEqual({
      listings: [],
      featuredIndex: -1,
    });
  });

  it('uses the first listing when the snapshot has no KRW-comparable target', () => {
    expect(deriveEbayListings([listingRow({ fx_rate: null })]).featuredIndex).toBe(0);
  });

  it('derives a headline summary that agrees with the listing rows', () => {
    const rows = [listingRow()];
    const { listings } = deriveEbayListings(rows);
    const price = derivePriceDisplayFromEbayListings(
      listings,
      rows,
      new Date('2026-06-12T00:00:00Z'),
    )!;

    // listings priceKrw: 80_000 / 100_000 / 200_000
    expect(price.minPrice).toBe(listings[0].priceKrw);
    expect(price.maxPrice).toBe(listings[listings.length - 1].priceKrw);
    expect(price.avgPrice).toBe(Math.round((80_000 + 100_000 + 200_000) / 3));
    expect(price.minPrice).toBeLessThanOrEqual(price.avgPrice);
    expect(price.avgPrice).toBeLessThanOrEqual(price.maxPrice);
    expect(price.currency).toBe('KRW');
    expect(price.sampleCount).toBe(listings.length);
    expect(price.stalenessDays).toBe(14); // 2026-05-29 → 2026-06-12
  });

  it('returns null with no listings', () => {
    expect(derivePriceDisplayFromEbayListings([], [])).toBeNull();
  });
});
