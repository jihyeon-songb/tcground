import { describe, expect, it } from 'vitest';
import {
  buildPriceHistory,
  createDeterministicPriceDisplay,
  derivePriceDisplayFromHistory,
  mapCardDetailRow,
  mapPokemonCategoryPageData,
  selectFeaturedPokemonCards,
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
  it('maps ten Pokemon seed cards into category cards with stable detail links', () => {
    const rows = Array.from({ length: 10 }, (_, index) =>
      createCardRow({
        sampleId: `KR-${String(index + 1).padStart(3, '0')}`,
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
    expect(data.cards[0]?.sampleId).toBe('KR-001');
    expect(data.availableSets).toEqual([
      { slug: 'pokemon-kr-151', name: '포켓몬 카드 151' },
      { slug: 'pokemon-kr-terastal-festa-ex', name: '테라스탈 페스타 ex' },
    ]);
    expect(data.availableRarities).toEqual(['SAR']);
    expect(data.selectedRarities).toEqual([]);
    expect(data.selectedSetSlugs).toEqual([]);
  });

  it('maps card detail with set, rarity, collector number, and printing identity', () => {
    const detail = mapCardDetailRow(
      createDetailRow({
        sampleId: 'KR-004',
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
    expect(detail.printing.sampleId).toBe('KR-004');
    expect(detail.chips).toContain('201/165');
  });

  it('maps category card images by thumbnail, printing, then card image priority', () => {
    const printingImageUrl = 'https://assets.tcgdex.net/ja/SV/SV2a/201/high.webp';
    const thumbnailUrl = 'https://assets.tcgdex.net/ja/SV/SV2a/205/low.webp';
    const cardImageUrl = 'https://assets.tcgdex.net/ja/SV/SV2a/202/high.webp';
    const data = mapPokemonCategoryPageData(pokemonGame, [
      createCardRow({
        sampleId: 'KR-004',
        slug: 'kr-004-charizard-ex-151',
        name: '리자몽 ex',
        setSlug: 'pokemon-kr-151',
        setName: '포켓몬 카드 151',
        printingImageUrl,
        thumbnailUrl: 'https://assets.tcgdex.net/ja/SV/SV2a/201/low.webp',
        cardImageUrl,
      }),
      createCardRow({
        sampleId: 'KR-005',
        slug: 'kr-005-mew-ex-151',
        name: '뮤 ex',
        setSlug: 'pokemon-kr-151',
        setName: '포켓몬 카드 151',
        thumbnailUrl,
        cardImageUrl,
      }),
      createCardRow({
        sampleId: 'KR-007',
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

  it('maps card detail images by printing image before card image fallback', () => {
    const printingImageUrl = 'https://assets.tcgdex.net/ja/SV/SV2a/201/high.webp';
    const cardImageUrl = 'https://assets.tcgdex.net/ja/SV/SV2a/202/high.webp';

    expect(
      mapCardDetailRow(
        createDetailRow({
          sampleId: 'KR-004',
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
          sampleId: 'KR-007',
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

  it('creates deterministic price display values without DB snapshots', () => {
    const first = createDeterministicPriceDisplay('kr-004-charizard-ex-151', 'KR-004');
    const second = createDeterministicPriceDisplay('kr-004-charizard-ex-151', 'KR-004');

    expect(first).toEqual(second);
    expect(first.avgPrice).toBeGreaterThan(first.minPrice);
    expect(first.maxPrice).toBeGreaterThan(first.avgPrice);
    expect(first.sourceLabel).not.toContain('임시 가격 표시');
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
    sampleId: 'KR-000',
    imageUrl,
    price: {
      avgPrice: 100000,
      minPrice: 80000,
      maxPrice: 130000,
      changeRate: 1.2,
      changeTone: 'up',
      lastUpdatedAt: '2026년 5월 22일',
      sourceLabel: '카탈로그 대표값',
      currency: 'KRW',
      sampleCount: 0,
    },
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
        set_code: 'BS2023014201',
        collector_number: '201/165',
        rarity: 'SAR',
        finish: 'unknown',
        image_url: printingImageUrl,
        external_ids: {
          sample_id: sampleId,
        },
      },
    ],
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

  it('ignores snapshots without an average price', () => {
    const history = buildPriceHistory([snapshotRow({ avg_price: null })]);
    expect(history.hasData).toBe(false);
  });

  it('treats 번개장터 as an asking trend and KREAM as a sold overlay', () => {
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
});
