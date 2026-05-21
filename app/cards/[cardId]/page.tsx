/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';

type ChangeTone = 'up' | 'down' | 'flat';

interface RelatedCard {
  name: string;
  href: string;
  alt: string;
  src: string;
  price: string;
  changeRate: string;
  changeTone: ChangeTone;
}

interface CardDetail {
  metaTitle: string;
  metaDescription: string;
  chips: string[];
  cardName: string;
  setLabel: string;
  imageAlt: string;
  imageSrc: string;
  avgPrice: string;
  changeRate: string;
  changeTone: ChangeTone;
  minLabel: string;
  minPrice: string;
  maxLabel: string;
  maxPrice: string;
  sources: string;
  lastUpdatedAt: string;
  chartPath: string;
  chartArea: string;
  backHref: string;
  backLabel: string;
  relatedSectionTitle: string;
  relatedCards: RelatedCard[];
}

const CHART_PERIODS = [
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: '90d', label: '90일' },
  { value: '1y', label: '1년' },
] as const;

const ACTIVE_CHART_PERIOD: (typeof CHART_PERIODS)[number]['value'] = '90d';

const CARD_DATA: Record<string, CardDetail> = {
  'charizard-base-set-1st-edition': {
    metaTitle: 'TCGround | Charizard - Base Set (1st Edition)',
    metaDescription:
      'Base Set 1st Edition Charizard 카드의 평균 거래가, 최저/최고가, 90일 가격 변동 추이와 관련 카드를 확인하세요.',
    chips: ['Pokemon TCG', 'Base Set', 'Rare Holo'],
    cardName: 'Charizard',
    setLabel: 'Base Set (1st Edition)',
    imageAlt: 'Charizard - Base Set 1st Edition 카드',
    imageSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDWJ2204iRPQq3aGm_UR7wsVuVULP_epAenEwBflL84eczRSF7_hZuEju_w2Ox7fMZ3CA1glEc8F3P0OWCE5cce4hBfyOJbY6AdGv4_5nvdLEcN9ALpXoBmDoqrBSUSWMRyF1aQvPjYDzpr_Qz__9S_dXz8PDz5_g-IsUgfACzZbcZVRPCslUT0XYvs8GRPjlgxLwIGrjnWuL-P0Q4t1zmmfzwmAdNs5vcEFm7GFPjdkk2_MT6J1NUIBvngoj6CdoHBaqMOsEaWaIiD',
    avgPrice: '$4,500.00',
    changeRate: '+5.2%',
    changeTone: 'up',
    minLabel: '최저가 (Ungraded)',
    minPrice: '$3,200',
    maxLabel: '최고가 (PSA 10)',
    maxPrice: '$6,800',
    sources: 'eBay, TCGPlayer, Heritage Auctions에서 집계된 데이터입니다.',
    lastUpdatedAt: '2026년 5월 8일 12:20 KST',
    chartPath: 'M0,40 C10,40 15,35 25,30 C35,25 40,35 50,20 C60,5 70,15 80,10 C90,5 95,20 100,15',
    chartArea:
      'M0,50 L0,40 C10,40 15,35 25,30 C35,25 40,35 50,20 C60,5 70,15 80,10 C90,5 95,20 100,15 L100,50 Z',
    backHref: '/categories/pokemon/base-set',
    backLabel: 'Base Set로 돌아가기',
    relatedSectionTitle: 'Base Set의 다른 카드',
    relatedCards: [
      {
        name: 'Blastoise - 1st Edition',
        href: '/cards/blastoise-base-set-1st-edition',
        alt: 'Blastoise 1st Edition 카드',
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCaxTevv89IiYxsI_P_KIAQbDIhpFo1O-ZqkfC11BLjuouZBMNa7xA7qe6KlYnbwgi9ZNdTnj0et05tHnUbD722S_xNVoeDZvnccKB7-ahPZaq93Yv2xbF9koLeHcYHIMTp5D7xORLUOmDSGYtWQyKTdVzaq9646tDP8o7Yfw_xfE3srmd9Zu3L-AHkwRLlXXcrUx3-OlQ4J0N2vXVudNpZ2gTNJfW5RFPR8FMZAMLp13ZNesykhTm2EKUclfxlmgLg9tCwsrDajxg4',
        price: '$1,200',
        changeRate: '+2.1%',
        changeTone: 'up',
      },
      {
        name: 'Venusaur - 1st Edition',
        href: '/cards/venusaur-base-set-1st-edition',
        alt: 'Venusaur 1st Edition 카드',
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBH745C98bYSTwoTcXMCzIGp2389_t1tR5WcJFfHpJa8-i3pfeKEORnXywLAOv4b9csGpRgnquaJtuiZYhLSS6SjrXpSfoKaj2XFUEDDPwvvoam5WfYBFiX80JPwY6qXKtfa6bskJVZDJIsr158O333Ds-lLRfyQD54chtiVH0SvY53C4DbQeQUkguo3JKN8GBBxub5jeJddb4bBdGmvNP8VpSe6CUrqeCJIEfAmAmTDaXgDHQYi4CvAh5NqQAbpzsGqzfjiiMfvwz-',
        price: '$850',
        changeRate: '-1.5%',
        changeTone: 'down',
      },
      {
        name: 'Pikachu - Red Cheeks',
        href: '/cards/pikachu-red-cheeks',
        alt: 'Pikachu Red Cheeks 카드',
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzTP03rWECoj1T_eqEfO5RqawO0mqaiwWn-G_ehkaSzOzSLn9C4JxtamSiTfbTTkiMDmIE1vYfuMgr9kNmg8Mbd-Up--6QzsmBcStjHbfCMxETmyiY_KsvcMZN0ygn1H9e6LzodSSUIGwpsY_E9Q4c6zc8SsUkdnsgUHpHVEYr1UxqlsWeKmnxdRmwYcTVHP7kF1WrbsHAkpFG1ZOtRc8tzSijTDQXVFCB9UpWG0HFuSY2BYoebJQvNXThOLLPiF4vXFIou8fv8PTC',
        price: '$300',
        changeRate: '+0.5%',
        changeTone: 'up',
      },
      {
        name: 'Mewtwo - 1st Edition',
        href: '/cards/mewtwo-base-set-1st-edition',
        alt: 'Mewtwo 1st Edition 카드',
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtraU0aascc0g1K2n_yKFLYxwQJCW_e1By4_YtstI4BIummuTx-YlmjztvPgzi--v0-8Ti8RoIN7MVWQ0t5OEuhMfuskTKEuAaO1EISxDdNfkDBUpUO4YZjG_WCYpPR96fmTVpCq63cQvlHVsA2HM3DOfa8utCKypfY1ZeZfNUNCUw_aaXy3mMy7veWMfVgtkAW_ATJtlWAxy4xaFkFOcDWMljeV1pNt5RcF2jLk0ITQLwoAcPMxoh81eoEU2I3Q-tJ_mCVpou3ZFI',
        price: '$650',
        changeRate: '0.0%',
        changeTone: 'flat',
      },
    ],
  },
};

interface CardDetailPageProps {
  params: Promise<{ cardId: string }>;
}

export async function generateMetadata({ params }: CardDetailPageProps): Promise<Metadata> {
  const { cardId } = await params;
  const card = CARD_DATA[cardId];

  if (card) {
    return {
      title: card.metaTitle,
      description: card.metaDescription,
    };
  }

  return {
    title: 'TCGround | 카드 상세',
    description: '카드의 평균 거래가, 최저/최고가, 가격 변동 추이를 확인하세요.',
  };
}

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { cardId } = await params;
  const card = CARD_DATA[cardId];

  if (!card) {
    notFound();
  }

  return (
    <div className='flex min-h-screen flex-col bg-[#f8f9fb] text-[#191c1e]'>
      <PublicHeader currentPath={`/cards/${cardId}`} search={{ desktopOnly: true }} />

      <main className='mx-auto w-full max-w-[1440px] flex-grow px-5 pt-6 pb-16 md:px-16'>
        <nav
          aria-label='Breadcrumb'
          className='mb-8 flex items-center gap-2 text-sm text-[#535f73]'
        >
          <Link
            href={card.backHref}
            className='inline-flex items-center gap-1 font-semibold transition-colors hover:text-[#bb001a]'
          >
            <span className='material-symbols-outlined text-[18px] leading-none' aria-hidden>
              {/*arrow_back*/}
            </span>
            {card.backLabel}
          </Link>
        </nav>

        <section className='mb-16 grid grid-cols-1 gap-12 lg:grid-cols-12'>
          <div className='lg:col-span-5'>
            <div className='mx-auto w-full max-w-md overflow-hidden rounded-[32px] bg-white'>
              <img
                alt={card.imageAlt}
                src={card.imageSrc}
                className='block aspect-[2.5/3.5] w-full rounded-[32px] object-cover'
              />
            </div>
          </div>

          <div className='flex flex-col gap-6 lg:col-span-7'>
            <div>
              <div className='mb-3 flex flex-wrap gap-2'>
                {card.chips.map((chip) => (
                  <span
                    key={chip}
                    className='rounded-full bg-[#e6e8ea] px-3 py-1 text-sm leading-none font-semibold text-[#191c1e]'
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <h1 className='mb-2 text-4xl leading-[1.1] font-extrabold text-[#191c1e] md:text-[48px]'>
                {card.cardName}
              </h1>
              <h2 className='text-2xl leading-[1.2] font-bold text-[#535f73] md:text-[32px]'>
                {card.setLabel}
              </h2>
            </div>

            <div className='flex flex-col gap-4 rounded-2xl bg-white p-8'>
              <div className='flex flex-col gap-1'>
                <span className='text-sm leading-none font-semibold tracking-wider text-[#535f73] uppercase'>
                  평균 거래가
                </span>
                <div className='flex flex-wrap items-baseline gap-3'>
                  <span className='text-4xl leading-[1.1] font-extrabold text-[#191c1e] tabular-nums md:text-[48px]'>
                    {card.avgPrice}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm leading-none font-semibold ${changeChipClass(
                      card.changeTone,
                    )}`}
                  >
                    <span
                      className='material-symbols-outlined text-[16px] leading-none'
                      aria-hidden
                    >
                      {trendIcon(card.changeTone)}
                    </span>
                    {card.changeRate}
                  </span>
                </div>
              </div>
              <div className='mt-4 flex flex-wrap gap-8 border-t border-[#e6e8ea] pt-4'>
                <div className='flex flex-col gap-1'>
                  <span className='text-base text-[#535f73]'>{card.minLabel}</span>
                  <span className='text-2xl leading-[1.2] font-bold text-[#191c1e] tabular-nums md:text-[28px]'>
                    {card.minPrice}
                  </span>
                </div>
                <div className='flex flex-col gap-1'>
                  <span className='text-base text-[#535f73]'>{card.maxLabel}</span>
                  <span className='text-2xl leading-[1.2] font-bold text-[#191c1e] tabular-nums md:text-[28px]'>
                    {card.maxPrice}
                  </span>
                </div>
              </div>
            </div>

            <div className='mt-2 flex flex-wrap gap-4'>
              <button
                type='button'
                className='flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#bb001a] px-8 py-4 text-lg leading-none font-bold whitespace-nowrap text-white shadow-sm transition-transform duration-200 hover:scale-[1.02] hover:bg-[#930012] focus-visible:ring-2 focus-visible:ring-[#bb001a] focus-visible:ring-offset-2 focus-visible:outline-none'
              >
                <span className='material-symbols-outlined text-[20px] leading-none' aria-hidden>
                  {/*add_circle*/}
                </span>
                관심 카드 추가
              </button>
              <button
                type='button'
                className='flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#e6e8ea] bg-white px-8 py-4 text-lg leading-none font-bold whitespace-nowrap text-[#191c1e] transition-colors duration-200 hover:bg-[#f2f4f6] focus-visible:ring-2 focus-visible:ring-[#bb001a] focus-visible:ring-offset-2 focus-visible:outline-none'
              >
                <span className='material-symbols-outlined text-[20px] leading-none' aria-hidden>
                  {/*notifications*/}
                </span>
                가격 알림 설정
              </button>
            </div>

            <section
              aria-labelledby='price-history-heading'
              className='mt-8 rounded-2xl bg-white p-6'
            >
              <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                <h3
                  id='price-history-heading'
                  className='text-2xl leading-[1.2] font-bold text-[#191c1e]'
                >
                  가격 변동 (90일)
                </h3>
                <div
                  className='flex items-center gap-1 rounded-full bg-[#f2f4f6] p-1'
                  role='tablist'
                  aria-label='차트 기간'
                >
                  {CHART_PERIODS.map((period) => {
                    const isActive = period.value === ACTIVE_CHART_PERIOD;
                    return (
                      <button
                        key={period.value}
                        type='button'
                        role='tab'
                        aria-selected={isActive}
                        className={`rounded-full px-3 py-1.5 text-sm leading-none font-semibold transition-colors ${
                          isActive
                            ? 'bg-white text-[#191c1e] shadow-sm'
                            : 'text-[#535f73] hover:text-[#191c1e]'
                        }`}
                      >
                        {period.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className='relative h-56 w-full overflow-hidden rounded-xl bg-[#f8f9fb]'>
                <svg
                  className='h-full w-full'
                  viewBox='0 0 100 50'
                  preserveAspectRatio='none'
                  aria-hidden='true'
                >
                  <defs>
                    <linearGradient id='card-detail-chart-gradient' x1='0' x2='0' y1='0' y2='1'>
                      <stop offset='0%' stopColor='#bb001a' stopOpacity='0.25' />
                      <stop offset='100%' stopColor='#bb001a' stopOpacity='0' />
                    </linearGradient>
                  </defs>
                  <path d={card.chartArea} fill='url(#card-detail-chart-gradient)' />
                  <path
                    d={card.chartPath}
                    fill='none'
                    stroke='#bb001a'
                    strokeWidth='2'
                    vectorEffect='non-scaling-stroke'
                  />
                </svg>
              </div>
            </section>

            <p className='mt-2 flex items-center gap-2 text-sm leading-[1.5] text-[#535f73]'>
              <span className='material-symbols-outlined text-[16px] leading-none' aria-hidden>
                info
              </span>
              {card.sources}
            </p>
            <p className='text-sm leading-[1.5] text-[#535f73]'>
              마지막 업데이트: {card.lastUpdatedAt}
            </p>
          </div>
        </section>

        <section className='border-t border-[#e6e8ea] pt-12'>
          <h3 className='mb-8 text-2xl leading-[1.2] font-bold text-[#191c1e] md:text-[32px]'>
            {card.relatedSectionTitle}
          </h3>
          <div className='columns-2 gap-5 space-y-5 md:columns-3 lg:columns-4'>
            {card.relatedCards.map((related) => (
              <Link
                key={related.href}
                href={related.href}
                className='group block cursor-pointer break-inside-avoid overflow-hidden rounded-2xl bg-white transition-transform duration-200 hover:scale-[1.02]'
              >
                <img
                  alt={related.alt}
                  src={related.src}
                  className='block h-auto w-full rounded-t-2xl object-cover'
                />
                <div className='p-3'>
                  <h4 className='truncate text-sm leading-none font-semibold text-[#191c1e]'>
                    {related.name}
                  </h4>
                  <div className='mt-2 flex items-center justify-between'>
                    <span className='text-base text-[#535f73] tabular-nums'>{related.price}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${changeChipClass(
                        related.changeTone,
                      )}`}
                    >
                      {related.changeRate}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className='mt-auto grid w-full gap-5 bg-[#f2f4f6] px-5 py-16 md:grid-cols-4 md:px-16'>
        <div className='col-span-1 mb-8 md:mb-0'>
          <Image
            src='/logo-transparent.png'
            alt='TCGround Logo'
            width={172}
            height={40}
            className='mb-4 h-8 w-auto object-contain'
          />
          <p className='text-base leading-[1.5] font-normal text-[#535f73]'>
            © 2024 TCGround. 수집가를 위한 큐레이션 플랫폼.
          </p>
        </div>
        <FooterColumn title='플랫폼' links={['소개', '지원', 'API 문서']} />
        <FooterColumn title='게임' links={['포켓몬', '매직: 더 개더링', '유희왕!']} />
        <FooterColumn title='법적 고지' links={['개인정보 처리방침', '이용약관', '채용정보']} />
      </footer>
    </div>
  );
}

function changeChipClass(tone: ChangeTone): string {
  if (tone === 'up') return 'bg-[#e8f5e9] text-[#2e7d32]';
  if (tone === 'down') return 'bg-[#ffebee] text-[#c62828]';
  return 'bg-[#e6e8ea] text-[#535f73]';
}

function trendIcon(tone: ChangeTone): string {
  if (tone === 'up') return 'trending_up';
  if (tone === 'down') return 'trending_down';
  return 'trending_flat';
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div className='flex flex-col gap-3'>
      <h4 className='mb-2 text-sm leading-none font-bold tracking-wider text-[#191c1e] uppercase'>
        {title}
      </h4>
      {links.map((link) => (
        <Link
          key={link}
          className='text-base leading-[1.5] font-normal text-[#5c3f3d] underline transition-colors hover:text-[#bb001a]'
          href='#'
        >
          {link}
        </Link>
      ))}
    </div>
  );
}
