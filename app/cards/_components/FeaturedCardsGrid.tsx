import { Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { PokemonCatalogCard } from '@/lib/tcg-catalog';
import { formatPrice } from '@/lib/tcg-data';
import { changeChipClass, formatChangeRate } from '../_lib/price-change';

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
