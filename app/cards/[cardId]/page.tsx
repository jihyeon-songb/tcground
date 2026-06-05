import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@tcground/ui';
import { ArrowLeft, Bell, CirclePlus, Info, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { notFound } from 'next/navigation';
import { PageFooter } from '@/components/tcg/layout/PageFooter';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import { createClient } from '@/lib/supabase/server';
import {
  getCardDetailBySlug,
  getCardRatingSummary,
  getPriceTrendSeries,
  getViewerRating,
  parseCardEdition,
  type CardRatingSummary,
  type CatalogCardDetail,
} from '@/lib/tcg-catalog';
import { formatPrice } from '@/lib/tcg-data';
import { PriceHistoryChart } from './_components/PriceHistoryChart';
import { CardRating } from './_components/CardRating';

export const dynamic = 'force-dynamic';

// Re-exported for tests that exercise the pure geometry helper against `./page`.
export { buildChartGeometry } from './_lib/price-chart';

type ChangeTone = 'up' | 'down' | 'flat';

interface CardDetailPageProps {
  params: Promise<{ cardId: string }>;
  searchParams?: Promise<{
    edition?: string | string[];
  }>;
}

export async function generateMetadata({ params }: CardDetailPageProps): Promise<Metadata> {
  const { cardId } = await params;
  const card = await getCardDetailBySlug(cardId);

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

export default async function CardDetailPage({ params, searchParams }: CardDetailPageProps) {
  const { cardId } = await params;
  const { edition: rawEdition } = (await searchParams) ?? {};
  const edition = parseCardEdition(rawEdition);
  const card = await getCardDetailBySlug(cardId, undefined, { edition });

  if (!card) {
    notFound();
  }

  const supabase = await createClient();
  const [ratingSummary, viewerRating, claims] = await Promise.all([
    getCardRatingSummary(card.cardId, supabase),
    getViewerRating(card.cardId, supabase),
    supabase.auth.getClaims(),
  ]);
  const isAuthenticated = Boolean(claims.data?.claims?.sub);
  const currentPath =
    card.selectedEdition === 'kr'
      ? `/cards/${cardId}`
      : `/cards/${cardId}?edition=${card.selectedEdition}`;

  return (
    <div className='flex min-h-screen flex-col bg-background text-foreground'>
      <PublicHeader currentPath={currentPath} search={{ desktopOnly: true }} />

      <main className='mx-auto w-full max-w-[1440px] flex-grow px-5 pt-6 pb-16 md:px-16'>
        <CardDetailContent
          card={card}
          ratingSummary={ratingSummary}
          viewerRating={viewerRating}
          isAuthenticated={isAuthenticated}
        />
      </main>

      <PageFooter />
    </div>
  );
}

interface CardDetailContentProps {
  card: CatalogCardDetail;
  ratingSummary: CardRatingSummary;
  viewerRating: number | null;
  isAuthenticated: boolean;
}

export function CardDetailContent({
  card,
  ratingSummary,
  viewerRating,
  isAuthenticated,
}: CardDetailContentProps) {
  // Draw the trend line from the asking series when we have it, otherwise from
  // the coherent sold series — so a sold-only history is still a real line, not
  // scattered dots. Overlay sold points only when they're distinct from the line.
  const trendSeries = getPriceTrendSeries(card.priceHistory);
  const overlaySold =
    card.priceHistory.askingSeries.length > 0 ? card.priceHistory.soldPoints : [];
  // When the trend is a graded fallback (e.g. KREAM PSA 10 체결가), label the
  // price as that grade instead of the default raw 시세 so the user isn't misled.
  const priceGradeLabel = card.priceHistory.gradeLabel ?? 'Raw';

  return (
    <>
      <nav aria-label='Breadcrumb' className='mb-8 flex items-center gap-2 text-sm text-muted-foreground'>
        <Link
          href={card.backHref}
          className='inline-flex items-center gap-1 font-semibold transition-colors hover:text-tcg-red'
        >
          <ArrowLeft className='size-[18px]' aria-hidden />
          {card.backLabel}
        </Link>
      </nav>

      <section className='mb-16 grid grid-cols-1 gap-12 lg:grid-cols-12'>
        <div className='lg:col-span-5'>
          <CardArtPanel card={card} />
        </div>

        <div className='flex flex-col gap-6 lg:col-span-7'>
          <div>
            <div className='mb-3 flex flex-wrap gap-2'>
              {card.chips.map((chip) => (
                <span
                  key={chip}
                  className='rounded-full bg-muted px-3 py-1 text-sm leading-none font-semibold text-foreground'
                >
                  {chip}
                </span>
              ))}
            </div>
            <h1 className='mb-2 text-4xl leading-[1.1] font-extrabold text-foreground md:text-[48px]'>
              {card.cardName}
            </h1>
            <h2 className='text-2xl leading-[1.2] font-bold text-muted-foreground md:text-[32px]'>
              {card.setLabel}
            </h2>
          </div>

          <EditionSelector card={card} />

          <div className='flex flex-col gap-4 rounded-2xl bg-card p-8'>
            <div className='flex flex-col gap-1'>
              <span className='text-sm leading-none font-semibold tracking-wider text-muted-foreground uppercase'>
                평균 거래가
              </span>
              <div className='flex flex-wrap items-baseline gap-3'>
                <span className='text-4xl leading-[1.1] font-extrabold text-foreground tabular-nums md:text-[48px]'>
                  {formatPrice(card.price.avgPrice, card.price.currency)}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm leading-none font-semibold ${changeChipClass(
                    card.price.changeTone,
                  )}`}
                >
                  <TrendIcon tone={card.price.changeTone} />
                  {formatChangeRate(card.price.changeRate)}
                </span>
              </div>
            </div>
            <div className='mt-4 flex flex-wrap gap-8 border-t border-border pt-4'>
              <div className='flex flex-col gap-1'>
                <span className='text-base text-muted-foreground'>최저가 ({priceGradeLabel})</span>
                <span className='text-2xl leading-[1.2] font-bold text-foreground tabular-nums md:text-[28px]'>
                  {formatPrice(card.price.minPrice, card.price.currency)}
                </span>
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-base text-muted-foreground'>최고가 ({priceGradeLabel})</span>
                <span className='text-2xl leading-[1.2] font-bold text-foreground tabular-nums md:text-[28px]'>
                  {formatPrice(card.price.maxPrice, card.price.currency)}
                </span>
              </div>
            </div>
          </div>

          <dl className='grid grid-cols-2 gap-3 rounded-2xl bg-card p-6 md:grid-cols-4'>
            <InfoItem label='시장' value={card.printing.region} />
            <InfoItem label='언어' value={card.printing.language.toUpperCase()} />
            <InfoItem label='세트 코드' value={card.printing.setCode} />
            <InfoItem label='카드 번호' value={card.printing.collectorNumber} />
          </dl>

          <CardRating
            cardId={card.cardId}
            slug={card.slug}
            summary={ratingSummary}
            viewerRating={viewerRating}
            isAuthenticated={isAuthenticated}
          />

          <div className='mt-2 flex flex-wrap gap-4'>
            <Button
              type='button'
              size='cta'
              className='hover:scale-[1.02]'
            >
              <CirclePlus className='size-5' aria-hidden />
              관심 카드 추가
            </Button>
            <Button
              type='button'
              variant='outline'
              size='cta'
            >
              <Bell className='size-5' aria-hidden />
              가격 알림 설정
            </Button>
          </div>

          <PriceHistoryChart
            trendSeries={trendSeries}
            overlaySold={overlaySold}
            hasData={card.priceHistory.hasData}
            gradeLabel={card.priceHistory.gradeLabel}
          />

          <p className='mt-2 flex items-center gap-2 text-sm leading-[1.5] text-muted-foreground'>
            <Info className='size-4 shrink-0' aria-hidden />
            {card.price.sourceLabel}
          </p>
          <p className='text-sm leading-[1.5] text-muted-foreground'>
            마지막 업데이트: {card.price.lastUpdatedAt}
          </p>
        </div>
      </section>
    </>
  );
}

function EditionSelector({ card }: { card: CatalogCardDetail }) {
  return (
    <section aria-labelledby='edition-selector-heading' className='flex flex-col gap-3'>
      <h3
        id='edition-selector-heading'
        className='text-sm leading-none font-semibold tracking-wider text-muted-foreground uppercase'
      >
        판본
      </h3>
      <div className='inline-flex w-fit rounded-lg border border-border bg-card p-1'>
        {card.editionOptions.map((option) => {
          const className = `inline-flex min-w-20 items-center justify-center rounded-md px-4 py-2 text-sm font-bold transition-colors ${
            option.isSelected
              ? 'bg-tcg-red text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`;

          if (!option.isAvailable) {
            return (
              <span
                key={option.value}
                aria-disabled='true'
                className='inline-flex min-w-20 items-center justify-center rounded-md px-4 py-2 text-sm font-bold text-muted-foreground'
              >
                {option.label}
              </span>
            );
          }

          return (
            <Link
              key={option.value}
              href={editionHref(card.slug, option.value)}
              aria-current={option.isSelected ? 'page' : undefined}
              className={className}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function editionHref(slug: string, edition: string): string {
  return edition === 'kr' ? `/cards/${slug}` : `/cards/${slug}?edition=${edition}`;
}

function CardArtPanel({ card }: { card: CatalogCardDetail }) {
  if (card.imageUrl) {
    return (
      <div className='mx-auto w-full max-w-md overflow-hidden rounded-[32px] bg-card'>
        <Image
          alt={`${card.cardName} 카드`}
          src={card.imageUrl}
          width={640}
          height={896}
          sizes='(min-width: 1024px) 33vw, 100vw'
          className='block h-auto w-full rounded-[32px] object-contain'
        />
      </div>
    );
  }

  return (
    <div className='mx-auto flex aspect-[2.5/3.5] w-full max-w-md flex-col justify-between overflow-hidden rounded-[32px] bg-surface-container p-8'>
      <div className='flex items-center justify-between gap-3'>
        <span className='rounded-full bg-card/80 px-3 py-1 text-xs font-bold text-muted-foreground'>
          {card.printing.sampleId}
        </span>
        <span className='rounded-full bg-tcg-red px-3 py-1 text-xs font-bold text-primary-foreground'>
          {card.rarity}
        </span>
      </div>
      <div>
        <p className='text-sm font-semibold tracking-wider text-muted-foreground uppercase'>
          Korean Pokemon
        </p>
        <p className='mt-3 text-5xl leading-[1.05] font-extrabold text-foreground'>
          {card.cardName}
        </p>
        <p className='mt-4 text-base font-semibold text-muted-foreground'>{card.collectorNumber}</p>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>{label}</dt>
      <dd className='mt-1 text-base font-bold text-foreground'>{value}</dd>
    </div>
  );
}

function changeChipClass(tone: ChangeTone): string {
  if (tone === 'up') return 'bg-[#e8f5e9] text-[#2e7d32]';
  if (tone === 'down') return 'bg-[#ffebee] text-[#c62828]';
  return 'bg-muted text-muted-foreground';
}

function TrendIcon({ tone }: { tone: ChangeTone }) {
  const Icon = tone === 'up' ? TrendingUp : tone === 'down' ? TrendingDown : Minus;
  return <Icon aria-hidden className='size-4' strokeWidth={2.5} />;
}

function formatChangeRate(rate: number) {
  if (rate > 0) return `+${rate.toFixed(1)}%`;
  return `${rate.toFixed(1)}%`;
}

