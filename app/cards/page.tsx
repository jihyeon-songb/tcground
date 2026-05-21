import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import { featuredCards, formatKrw, type FeaturedCard } from '@/lib/tcg-data';

export const metadata: Metadata = {
  title: 'TCGround | 인기 카드',
  description: '현재 TCGround에서 우선 추적하는 인기 카드와 가격 요약을 확인하세요.',
};

export default function CardsPage() {
  return (
    <div className='flex min-h-screen flex-col bg-[#f8f9fb] text-[#191c1e]'>
      <PublicHeader currentPath='/cards' search={{ desktopOnly: true }} />

      <main className='mx-auto w-full max-w-[1440px] flex-grow px-5 pb-16'>
        <section className='pt-10 pb-8'>
          <p className='mb-3 text-sm leading-none font-bold tracking-wider text-[#bb001a] uppercase'>
            인기 카드
          </p>
          <h1 className='max-w-3xl text-4xl leading-[1.1] font-extrabold text-[#191c1e] md:text-[56px]'>
            시장 흐름을 빠르게 볼 수 있는 카드 목록
          </h1>
          <p className='mt-5 max-w-2xl text-lg leading-[1.6] text-[#535f73]'>
            평균 거래가와 최근 변동률을 기준으로 지금 주목받는 카드를 확인하세요.
          </p>
        </section>

        <FeaturedCardsGrid cards={featuredCards} />
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
        <FooterColumn title='게임' links={['포켓몬', '매직 더 개더링', '유희왕', '원피스']} />
        <FooterColumn title='법적 고지' links={['개인정보 처리방침', '이용약관', '채용정보']} />
      </footer>
    </div>
  );
}

export function FeaturedCardsGrid({ cards }: { cards: readonly FeaturedCard[] }) {
  if (cards.length === 0) {
    return <EmptyFeaturedCardsState />;
  }

  return (
    <section aria-labelledby='featured-cards-heading'>
      <div className='mb-5 flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h2 id='featured-cards-heading' className='text-[32px] leading-[1.2] font-bold'>
            인기 카드 목록
          </h2>
          <p className='mt-2 text-base leading-[1.5] text-[#535f73]'>
            평균 거래가, 최저가, 최고가와 최근 변동률을 함께 표시합니다.
          </p>
        </div>
        <Link
          href='/categories'
          className='inline-flex rounded-lg border border-[#e0e3e5] bg-white px-5 py-2 text-sm font-semibold text-[#191c1e] transition-colors hover:bg-[#f2f4f6]'
        >
          카테고리 보기
        </Link>
      </div>

      <div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4'>
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className='group flex min-h-72 flex-col justify-between rounded-2xl border border-[#e0e3e5] bg-white p-6 shadow-sm transition-transform duration-200 hover:scale-[1.01] hover:shadow-md'
          >
            <div>
              <div className='mb-5 flex items-center justify-between gap-3'>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${paletteClass(card.palette)}`}
                >
                  {card.gameTitle}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${changeClass(card.priceChangeRate)}`}
                >
                  {formatChangeRate(card.priceChangeRate)}
                </span>
              </div>
              <h3 className='text-2xl leading-[1.15] font-extrabold text-[#191c1e]'>
                {card.cardName}
              </h3>
              <p className='mt-3 text-base leading-[1.5] text-[#535f73]'>
                {card.setName} · {card.rarity}
              </p>
            </div>

            <div className='mt-8 border-t border-[#e6e8ea] pt-5'>
              <p className='text-xs font-semibold tracking-wider text-[#535f73] uppercase'>
                평균 거래가
              </p>
              <p className='mt-1 text-3xl font-extrabold tabular-nums'>
                {formatKrw(card.avgPrice)}
              </p>
              <dl className='mt-5 grid grid-cols-2 gap-3'>
                <div>
                  <dt className='text-xs font-semibold tracking-wider text-[#535f73] uppercase'>
                    최저
                  </dt>
                  <dd className='mt-1 text-base font-bold tabular-nums'>
                    {formatKrw(card.minPrice)}
                  </dd>
                </div>
                <div>
                  <dt className='text-xs font-semibold tracking-wider text-[#535f73] uppercase'>
                    최고
                  </dt>
                  <dd className='mt-1 text-base font-bold tabular-nums'>
                    {formatKrw(card.maxPrice)}
                  </dd>
                </div>
              </dl>
              <p className='mt-5 text-sm leading-[1.5] text-[#535f73]'>
                마지막 업데이트: {card.lastUpdatedAt}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function EmptyFeaturedCardsState() {
  return (
    <section
      aria-live='polite'
      className='flex flex-col items-center justify-center gap-3 rounded-2xl bg-white px-6 py-16 text-center'
    >
      <span
        className='material-symbols-outlined text-[48px] leading-none text-[#bb001a]'
        aria-hidden
      >
        style
      </span>
      <h2 className='text-2xl leading-tight font-bold text-[#191c1e]'>
        아직 표시할 인기 카드가 없습니다
      </h2>
      <p className='max-w-md text-base leading-[1.5] text-[#535f73]'>
        인기 카드 데이터가 준비되면 이곳에 가격 요약과 함께 표시됩니다.
      </p>
      <Link
        href='/search'
        className='mt-2 inline-flex rounded-lg bg-[#bb001a] px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#930012]'
      >
        카드 검색하기
      </Link>
    </section>
  );
}

function formatChangeRate(rate: number) {
  if (rate > 0) return `+${rate.toFixed(1)}%`;
  return `${rate.toFixed(1)}%`;
}

function changeClass(rate: number) {
  if (rate > 0) return 'bg-[#e8f5e9] text-[#2e7d32]';
  if (rate < 0) return 'bg-[#ffebee] text-[#c62828]';
  return 'bg-[#e6e8ea] text-[#535f73]';
}

function paletteClass(palette: FeaturedCard['palette']) {
  if (palette === 'red') return 'bg-[#ffebee] text-[#bb001a]';
  if (palette === 'blue') return 'bg-[#edf4ff] text-[#2459a6]';
  if (palette === 'green') return 'bg-[#e8f5e9] text-[#2e7d32]';
  return 'bg-[#f2f4f6] text-[#535f73]';
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
