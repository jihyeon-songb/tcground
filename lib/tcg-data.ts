export interface TcgCategory {
  id: string;
  name: string;
  label: string;
  cardCount: number;
  trackedSets: number;
  momentum: 'up' | 'flat' | 'down';
  href: string;
}

export interface FeaturedCard {
  id: string;
  cardName: string;
  gameTitle: string;
  setName: string;
  rarity: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  priceChangeRate: number;
  lastUpdatedAt: string;
  href: string;
  palette: 'red' | 'blue' | 'green' | 'neutral';
}

export interface MarketSignal {
  label: string;
  value: string;
  caption: string;
}

export const tcgCategories: TcgCategory[] = [
  {
    id: 'pokemon',
    name: '포켓몬 카드',
    label: 'Scarlet & Violet 중심',
    cardCount: 1284,
    trackedSets: 42,
    momentum: 'up',
    href: '/categories/pokemon',
  },
  {
    id: 'yugioh',
    name: '유희왕',
    label: 'Quarter Century Rare 추적',
    cardCount: 936,
    trackedSets: 31,
    momentum: 'flat',
    href: '/categories/yugioh',
  },
  {
    id: 'magic',
    name: '매직 더 개더링',
    label: 'Commander staples',
    cardCount: 774,
    trackedSets: 28,
    momentum: 'down',
    href: '/categories/magic',
  },
  {
    id: 'one-piece',
    name: '원피스',
    label: '리더 카드와 병행 수입판',
    cardCount: 412,
    trackedSets: 14,
    momentum: 'up',
    href: '/categories/one-piece',
  },
];

export const featuredCards: FeaturedCard[] = [
  {
    id: 'pikachu-ex-sar',
    cardName: '피카츄 ex SAR',
    gameTitle: '포켓몬 카드',
    setName: 'Super Electric Breaker',
    rarity: 'SAR',
    avgPrice: 168000,
    minPrice: 142000,
    maxPrice: 219000,
    priceChangeRate: 12.4,
    lastUpdatedAt: '2026-05-08 12:20',
    href: '/cards/pikachu-ex-sar',
    palette: 'red',
  },
  {
    id: 'blue-eyes-qcsr',
    cardName: '블루아이즈 화이트 드래곤',
    gameTitle: '유희왕',
    setName: 'Quarter Century Chronicle',
    rarity: 'QCSR',
    avgPrice: 92000,
    minPrice: 81000,
    maxPrice: 126000,
    priceChangeRate: 4.8,
    lastUpdatedAt: '2026-05-08 11:45',
    href: '/cards/blue-eyes-qcsr',
    palette: 'blue',
  },
  {
    id: 'charizard-ex-sir',
    cardName: '리자몽 ex SIR',
    gameTitle: '포켓몬 카드',
    setName: 'Paldean Fates',
    rarity: 'SIR',
    avgPrice: 221000,
    minPrice: 198000,
    maxPrice: 277000,
    priceChangeRate: -3.2,
    lastUpdatedAt: '2026-05-08 10:10',
    href: '/cards/charizard-ex-sir',
    palette: 'green',
  },
  {
    id: 'black-lotus-30a',
    cardName: 'Black Lotus',
    gameTitle: '매직 더 개더링',
    setName: '30th Anniversary',
    rarity: 'Rare',
    avgPrice: 1350000,
    minPrice: 1180000,
    maxPrice: 1650000,
    priceChangeRate: 0.7,
    lastUpdatedAt: '2026-05-08 09:30',
    href: '/cards/black-lotus-30a',
    palette: 'neutral',
  },
];

export const popularSearches = ['피카츄', '리자몽 ex', '블루아이즈', 'Black Lotus', 'SAR'];

export const marketSignals: MarketSignal[] = [
  {
    label: '오늘 추적 카드',
    value: '2,994',
    caption: '전일 대비 +86',
  },
  {
    label: '평균 가격 변동',
    value: '+3.8%',
    caption: '상승 카드 비중 41%',
  },
  {
    label: '최근 업데이트',
    value: '12:20',
    caption: '2026년 5월 8일 기준',
  },
];

export function formatKrw(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}
