import { Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PageFooter } from '@/components/tcg/layout/PageFooter';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import { getFeaturedPokemonCards, type PokemonCatalogCard } from '@/lib/tcg-catalog';
import { formatPrice } from '@/lib/tcg-data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'TCGround | 인기 카드',
  description: '현재 TCGround에서 우선 추적하는 인기 카드와 가격 요약을 확인하세요.',
};

export default async function CardsPage() {
  const cards = await getCardsPageFeaturedCards();

  return (
    <div className='flex min-h-screen flex-col bg-background text-foreground'>
      <PublicHeader currentPath='/cards' search={{ desktopOnly: true }} />

      <main className='mx-auto w-full max-w-[1440px] flex-grow px-5 pb-16'>
        <section className='pt-10 pb-8'>
          <p className='mb-3 text-sm leading-none font-bold tracking-wider text-tcg-red uppercase'>
            인기 카드
          </p>
          <h1 className='max-w-3xl text-4xl leading-[1.1] font-extrabold text-foreground md:text-[56px]'>
            시장 흐름을 빠르게 볼 수 있는 카드 목록
          </h1>
          <p className='mt-5 max-w-2xl text-lg leading-[1.6] text-muted-foreground'>
            평균 거래가와 최근 변동률을 기준으로 지금 주목받는 카드를 확인하세요.
          </p>
        </section>

        <FeaturedCardsGrid cards={cards} />
      </main>

      <PageFooter
        columns={[
          { title: '플랫폼', links: ['소개', '지원', 'API 문서'] },
          { title: '게임', links: ['포켓몬', '매직 더 개더링', '유희왕', '원피스'] },
          { title: '법적 고지', links: ['개인정보 처리방침', '이용약관', '채용정보'] },
        ]}
      />
    </div>
  );
}

async function getCardsPageFeaturedCards(): Promise<PokemonCatalogCard[]> {
  try {
    return await getFeaturedPokemonCards({ limit: 8 });
  } catch (error) {
    console.error('Failed to load cards page featured cards', error);
    return [];
  }
}

export function FeaturedCardsGrid({ cards }: { cards: readonly PokemonCatalogCard[] }) {
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
          <p className='mt-2 text-base leading-[1.5] text-muted-foreground'>
            평균 거래가, 최저가, 최고가와 최근 변동률을 함께 표시합니다.
          </p>
        </div>
        <Link
          href='/categories'
          className='inline-flex rounded-lg border border-border bg-card px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted'
        >
          카테고리 보기
        </Link>
      </div>

      <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3'>
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            aria-label={`${card.name} 상세 보기`}
            className='group flex min-h-96 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md'
          >
            <CardImage card={card} />
            <div className='flex flex-1 flex-col justify-between p-4'>
              <div>
                <h3 className='line-clamp-1 text-lg leading-tight font-bold text-foreground'>
                  {card.name}
                </h3>
                <p className='mt-1 text-sm font-medium text-muted-foreground'>
                  {card.setName} · {card.rarity} · {card.collectorNumber}
                </p>
              </div>
              <div className='mt-5'>
                {card.price ? (
                  <>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-2xl leading-none font-bold text-foreground tabular-nums'>
                        {formatPrice(card.price.avgPrice, card.price.currency)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${changeChipClass(
                          card.price.changeTone,
                        )}`}
                      >
                        {formatChangeRate(card.price.changeRate)}
                      </span>
                    </div>
                    <dl className='mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4'>
                      <div>
                        <dt className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                          최저
                        </dt>
                        <dd className='mt-1 text-base font-bold tabular-nums'>
                          {formatPrice(card.price.minPrice, card.price.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                          최고
                        </dt>
                        <dd className='mt-1 text-base font-bold tabular-nums'>
                          {formatPrice(card.price.maxPrice, card.price.currency)}
                        </dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <p className='text-base font-semibold text-muted-foreground'>시세 정보 없음</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CardImage({ card }: { card: PokemonCatalogCard }) {
  if (card.imageUrl) {
    return (
      <div className='relative aspect-[2.5/3.5] w-full bg-surface-container'>
        <Image
          alt={`${card.name} 카드`}
          src={card.imageUrl}
          fill
          sizes='(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw'
          className='object-contain'
        />
      </div>
    );
  }

  return (
    <div className='flex aspect-[2.5/3.5] w-full flex-col justify-between bg-surface-container p-5'>
      <div className='flex items-center justify-between gap-3'>
        <span className='rounded-full bg-card/80 px-3 py-1 text-xs font-bold text-muted-foreground'>
          {card.sampleId}
        </span>
        <span className='rounded-full bg-tcg-red px-3 py-1 text-xs font-bold text-primary-foreground'>
          {card.rarity}
        </span>
      </div>
      <div>
        <p className='text-sm font-semibold tracking-wider text-muted-foreground uppercase'>
          Korean Pokemon
        </p>
        <p className='mt-2 text-3xl leading-[1.05] font-extrabold text-foreground'>{card.name}</p>
        <p className='mt-3 text-sm font-semibold text-muted-foreground'>{card.collectorNumber}</p>
      </div>
    </div>
  );
}

function EmptyFeaturedCardsState() {
  return (
    <section
      aria-live='polite'
      className='flex flex-col items-center justify-center gap-3 rounded-2xl bg-card px-6 py-16 text-center'
    >
      <Sparkles className='size-12 text-tcg-red' aria-hidden />
      <h2 className='text-2xl leading-tight font-bold text-foreground'>
        아직 표시할 인기 카드가 없습니다
      </h2>
      <p className='max-w-md text-base leading-[1.5] text-muted-foreground'>
        인기 카드 데이터가 준비되면 이곳에 가격 요약과 함께 표시됩니다.
      </p>
      <Link
        href='/categories/pokemon'
        className='mt-2 inline-flex rounded-lg bg-tcg-red px-6 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-tcg-red-dark'
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

function changeChipClass(tone: 'up' | 'down' | 'flat'): string {
  if (tone === 'up') return 'bg-surface-container text-[#1e8e3e]';
  if (tone === 'down') return 'bg-surface-container text-[#d93025]';
  return 'bg-surface-container text-muted-foreground';
}

