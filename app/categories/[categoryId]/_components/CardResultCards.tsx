import Image from 'next/image';
import Link from 'next/link';
import type { MouseEvent } from 'react';
import type { PokemonCatalogCard, PriceDisplay } from '@/lib/tcg-catalog';
import { formatPrice } from '@/lib/tcg-data';

interface CardLinkProps {
  card: PokemonCatalogCard;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

export function GridCard({ card, onNavigate }: CardLinkProps) {
  return (
    <Link
      href={card.href}
      aria-label={`${card.name} 상세 보기`}
      onClick={onNavigate}
      scroll
      className='group border-border bg-card flex h-full w-full flex-col overflow-hidden rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md'
    >
      <CardImage card={card} />
      <div className='flex flex-1 flex-col gap-1 p-4'>
        <h3 className='text-foreground group-hover:text-tcg-red line-clamp-2 text-base leading-tight font-bold transition-colors'>
          {card.name}
        </h3>
        <p className='text-muted-foreground line-clamp-1 text-sm font-medium'>
          {card.setName} · {card.rarity} · {card.collectorNumber}
        </p>
        <div className='mt-auto pt-3'>
          <PriceSummary price={card.price} />
        </div>
      </div>
    </Link>
  );
}

export function ListCard({ card, onNavigate }: CardLinkProps) {
  return (
    <Link
      href={card.href}
      aria-label={`${card.name} 상세 보기`}
      onClick={onNavigate}
      scroll
      className='group border-border bg-card flex w-full gap-4 rounded-xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md'
    >
      <ListImage card={card} />
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <h3 className='text-foreground group-hover:text-tcg-red line-clamp-2 text-base leading-tight font-bold transition-colors'>
          {card.name}
        </h3>
        <p className='text-muted-foreground text-sm font-medium'>
          {card.setName} · {card.rarity} · {card.collectorNumber}
        </p>
        <div className='mt-auto pt-2'>
          <PriceSummary price={card.price} />
        </div>
      </div>
    </Link>
  );
}

export function EmptyCardsState({ title }: { title: string }) {
  return (
    <section
      aria-live='polite'
      className='bg-card flex flex-col items-center justify-center gap-3 rounded-2xl px-6 py-16 text-center'
    >
      <h3 className='text-foreground text-2xl leading-tight font-bold'>{title}</h3>
      <p className='text-muted-foreground max-w-md text-base leading-[1.5]'>
        다른 카테고리를 둘러보거나 검색어로 카드를 찾아보세요.
      </p>
    </section>
  );
}

function PriceSummary({ price }: { price: PriceDisplay | null }) {
  if (!price) {
    return <p className='text-muted-foreground text-sm font-semibold'>시세 정보 없음</p>;
  }

  return (
    <>
      <p className='text-muted-foreground text-xs font-semibold tracking-wide'>
        {price.sampleCount > 0 ? `${price.sampleCount}건 등록 · 시세` : '시세'}
      </p>
      <p className='text-foreground text-xl leading-none font-bold tabular-nums'>
        {formatPrice(price.avgPrice, price.currency)}
      </p>
      <p className='text-muted-foreground mt-1 text-sm font-semibold tabular-nums'>
        최저 {formatPrice(price.minPrice, price.currency)}
      </p>
    </>
  );
}

function CardImage({ card }: { card: PokemonCatalogCard }) {
  if (card.imageUrl) {
    return (
      <div className='bg-surface-container relative aspect-[2.5/3.5] w-full overflow-hidden'>
        <Image
          alt={`${card.name} 카드`}
          src={card.imageUrl}
          fill
          sizes='(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw'
          className='object-contain'
        />
      </div>
    );
  }

  return (
    <div className='bg-surface-container flex aspect-[2.5/3.5] w-full flex-col justify-between p-4'>
      <div className='flex items-center justify-between gap-2'>
        <span className='bg-card/80 text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-bold'>
          {card.sampleId}
        </span>
        <span className='bg-tcg-red text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-bold'>
          {card.rarity}
        </span>
      </div>
      <div>
        <p className='text-foreground line-clamp-2 text-lg leading-tight font-extrabold'>
          {card.name}
        </p>
        <p className='text-muted-foreground mt-1 text-xs font-semibold'>{card.collectorNumber}</p>
      </div>
    </div>
  );
}

function ListImage({ card }: { card: PokemonCatalogCard }) {
  if (card.imageUrl) {
    return (
      <div className='bg-surface-container relative aspect-[2.5/3.5] w-24 shrink-0 overflow-hidden rounded-lg sm:w-28'>
        <Image
          alt={`${card.name} 카드`}
          src={card.imageUrl}
          fill
          sizes='112px'
          className='object-contain'
        />
      </div>
    );
  }

  return (
    <div className='bg-surface-container flex aspect-[2.5/3.5] w-24 shrink-0 flex-col justify-between rounded-lg p-2 sm:w-28'>
      <span className='bg-tcg-red text-primary-foreground self-start rounded-full px-2 py-0.5 text-[10px] font-bold'>
        {card.rarity}
      </span>
      <span className='text-muted-foreground text-[10px] font-semibold'>
        {card.collectorNumber}
      </span>
    </div>
  );
}
