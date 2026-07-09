// app/compare/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import { PageFooter } from '@/components/tcg/layout/PageFooter';
import {
  getCardDetailBySlug,
  getPriceTrendSeries,
  type CatalogCardDetail,
} from '@/lib/tcg-catalog';
import { CompareView, type CompareSide } from './_components/CompareView';
import { CardPicker } from './_components/CardPicker';
import { changeCardHref } from './_lib/compare-nav';

export const metadata: Metadata = {
  title: 'TCGround | 카드 시세 비교',
  description: '두 카드의 시세 변동을 지수화 차트와 표로 나란히 비교하세요.',
};

interface ComparePageProps {
  searchParams: Promise<{ left?: string | string[]; right?: string | string[] }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toSide(card: CatalogCardDetail): CompareSide {
  return {
    label: card.cardName,
    series: getPriceTrendSeries(card.priceHistory),
    price: card.price,
  };
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { left: rawLeft, right: rawRight } = await searchParams;
  const leftSlug = first(rawLeft);
  const rightSlug = first(rawRight);

  const [leftCard, rightCard] = await Promise.all([
    leftSlug ? getCardDetailBySlug(leftSlug) : Promise.resolve(null),
    rightSlug ? getCardDetailBySlug(rightSlug) : Promise.resolve(null),
  ]);

  const sameCard = Boolean(leftCard && rightCard && leftCard.slug === rightCard.slug);

  return (
    <div className='flex min-h-screen flex-col bg-background'>
      <PublicHeader currentPath='/compare' />
      <main className='mx-auto w-full max-w-5xl flex-1 px-4 py-8'>
        <Link href='/' className='mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
          <ArrowLeft className='size-4' aria-hidden />
          돌아가기
        </Link>
        <h1 className='mb-6 text-3xl font-bold text-foreground'>카드 시세 비교</h1>

        <div className='grid gap-4 md:grid-cols-2'>
          <CardColumn card={leftCard} slot='left' otherSlug={rightCard?.slug ?? null} />
          <CardColumn card={rightCard} slot='right' otherSlug={leftCard?.slug ?? null} />
        </div>

        {sameCard && (
          <p className='mt-6 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground'>
            같은 카드입니다. 오른쪽에 다른 카드를 선택해 비교하세요.
          </p>
        )}

        {leftCard && rightCard && !sameCard && (
          <CompareView left={toSide(leftCard)} right={toSide(rightCard)} />
        )}

        {(!leftCard || !rightCard) && !sameCard && (
          <p className='mt-6 text-sm text-muted-foreground'>
            두 카드를 모두 선택하면 시세 비교가 표시됩니다.
          </p>
        )}
      </main>
      <PageFooter />
    </div>
  );
}

function CardColumn({
  card,
  slot,
  otherSlug,
}: {
  card: CatalogCardDetail | null;
  slot: 'left' | 'right';
  otherSlug: string | null;
}) {
  if (!card) {
    // useSearchParams inside CardPicker needs a Suspense boundary during SSR.
    return (
      <Suspense fallback={<div className='h-40 rounded-2xl bg-card' />}>
        <CardPicker slot={slot} />
      </Suspense>
    );
  }
  const accent = slot === 'left' ? 'text-tcg-red' : 'text-tcg-blue';
  return (
    <div className='flex items-center gap-4 rounded-2xl bg-card p-5'>
      {card.imageUrl ? (
        <Image src={card.imageUrl} alt={card.cardName} width={72} height={100} className='rounded-lg' />
      ) : (
        <span className='h-[100px] w-[72px] rounded-lg bg-muted' aria-hidden />
      )}
      <div className='min-w-0'>
        <p className={`text-xs font-semibold ${accent}`}>{slot === 'left' ? '왼쪽' : '오른쪽'}</p>
        <p className='truncate text-lg font-bold text-foreground'>{card.cardName}</p>
        <p className='truncate text-sm text-muted-foreground'>{card.setLabel}</p>
        <Link href={changeCardHref(slot, otherSlug)} className='mt-1 inline-block text-xs text-muted-foreground underline hover:text-foreground'>
          이 카드 바꾸기
        </Link>
      </div>
    </div>
  );
}
