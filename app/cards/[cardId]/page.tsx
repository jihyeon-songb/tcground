import { Suspense, type ReactNode } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@tcground/ui';
import { ArrowLeft, Bell, CirclePlus, Info } from 'lucide-react';
import { notFound } from 'next/navigation';
import { PageFooter } from '@/components/tcg/layout/PageFooter';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import { refreshEbayBrowseSnapshotForCardDetail } from '@/lib/pricing/ebay/current-asking';
import { createPublicClient } from '@/lib/supabase/public';
import { createClient } from '@/lib/supabase/server';
import {
  getCardDetailBySlug,
  getCardRatingSummary,
  getPriceTrendSeries,
  getViewerRating,
  parseCardEdition,
  type CatalogCardDetail,
} from '@/lib/tcg-catalog';
import { formatPrice } from '@/lib/tcg-data';
import { PriceHistoryChart } from './_components/PriceHistoryChart';
import { EbayListings } from './_components/EbayListings';
import { CardRating } from './_components/CardRating';
import { CardDetailScrollReset } from './_components/CardDetailScrollReset';
import { changeChipClass, formatChangeRate, TrendIcon } from '../_lib/price-change';

// Re-exported for tests that exercise the pure geometry helper against `./page`.
export { buildChartGeometry } from './_lib/price-chart';

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
  let card = await getCardDetailBySlug(cardId, undefined, { edition });

  if (!card) {
    notFound();
  }

  card = await refreshEbayBrowsePriceForPage(cardId, card, edition);

  const currentPath =
    card.selectedEdition === 'kr'
      ? `/cards/${cardId}`
      : `/cards/${cardId}?edition=${card.selectedEdition}`;

  return (
    <div className='bg-background text-foreground flex min-h-screen flex-col'>
      <PublicHeader currentPath={currentPath} search={{ desktopOnly: true }} />

      <main className='mx-auto w-full max-w-[1440px] flex-grow px-5 pt-6 pb-16 md:px-16'>
        <CardDetailScrollReset currentPath={currentPath} />
        {/* The card body comes from the cached catalog read, so it streams
            immediately. The rating block depends on per-request auth (cookies),
            so it renders inside its own Suspense boundary and never blocks the
            cached content from painting. */}
        <CardDetailContent
          card={card}
          ratingSlot={
            <Suspense fallback={<CardRatingSkeleton />}>
              <CardRatingSection cardId={card.cardId} slug={card.slug} />
            </Suspense>
          }
        />
      </main>

      <PageFooter />
    </div>
  );
}

async function refreshEbayBrowsePriceForPage(
  cardId: string,
  card: CatalogCardDetail,
  edition: ReturnType<typeof parseCardEdition>,
): Promise<CatalogCardDetail> {
  try {
    const refresh = await refreshEbayBrowseSnapshotForCardDetail(card);
    if (!refresh.shouldReloadDetail) return card;

    return (await getCardDetailBySlug(cardId, createPublicClient(), { edition })) ?? card;
  } catch (error) {
    console.warn(
      'Failed to refresh eBay Browse asking snapshot',
      error instanceof Error ? error.message : error,
    );
    return card;
  }
}

async function CardRatingSection({ cardId, slug }: { cardId: string; slug: string }) {
  const supabase = await createClient();
  const [ratingSummary, viewerRating, claims] = await Promise.all([
    getCardRatingSummary(cardId, supabase),
    getViewerRating(cardId, supabase),
    supabase.auth.getClaims(),
  ]);
  const isAuthenticated = Boolean(claims.data?.claims?.sub);

  return (
    <CardRating
      cardId={cardId}
      slug={slug}
      summary={ratingSummary}
      viewerRating={viewerRating}
      isAuthenticated={isAuthenticated}
    />
  );
}

function CardRatingSkeleton() {
  return (
    <section aria-hidden className='bg-card flex flex-col gap-4 rounded-2xl p-8'>
      <div className='bg-muted h-3 w-28 animate-pulse rounded' />
      <div className='flex items-center gap-4'>
        <div className='bg-muted h-10 w-16 animate-pulse rounded' />
        <div className='bg-muted h-6 w-32 animate-pulse rounded' />
      </div>
      <div className='border-border border-t pt-4'>
        <div className='bg-muted h-8 w-48 animate-pulse rounded' />
      </div>
    </section>
  );
}

interface CardDetailContentProps {
  card: CatalogCardDetail;
  /** Auth-dependent rating block, streamed in via a Suspense boundary. */
  ratingSlot?: ReactNode;
}

export function CardDetailContent({ card, ratingSlot }: CardDetailContentProps) {
  // Draw the trend line from the asking series when we have it, otherwise from
  // the coherent sold series — so a sold-only history is still a real line, not
  // scattered dots. Overlay sold points only when they're distinct from the line.
  const trendSeries = getPriceTrendSeries(card.priceHistory);
  const overlaySold = card.priceHistory.askingSeries.length > 0 ? card.priceHistory.soldPoints : [];
  // When the trend is a graded fallback (e.g. KREAM PSA 10 체결가), label the
  // price as that grade instead of the default raw 시세 so the user isn't misled.
  const priceGradeLabel = card.priceHistory.gradeLabel ?? 'Raw';

  return (
    <>
      <nav
        aria-label='Breadcrumb'
        className='text-muted-foreground mb-8 flex items-center gap-2 text-sm'
      >
        <Link
          href={card.backHref}
          className='hover:text-tcg-red inline-flex items-center gap-1 font-semibold transition-colors'
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
                  className='bg-muted text-foreground rounded-full px-3 py-1 text-sm leading-none font-semibold'
                >
                  {chip}
                </span>
              ))}
            </div>
            <h1 className='text-foreground mb-2 text-4xl leading-[1.1] font-extrabold md:text-[48px]'>
              {card.cardName}
            </h1>
            <h2 className='text-muted-foreground text-2xl leading-[1.2] font-bold md:text-[32px]'>
              {card.setLabel}
            </h2>
          </div>

          <EditionSelector card={card} />

          <div className='bg-card flex flex-col gap-4 rounded-2xl p-8'>
            <div className='flex flex-col gap-1'>
              <span className='text-muted-foreground text-sm leading-none font-semibold tracking-wider uppercase'>
                평균 거래가
              </span>
              <div className='flex flex-wrap items-baseline gap-3'>
                <span className='text-foreground text-4xl leading-[1.1] font-extrabold tabular-nums md:text-[48px]'>
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
            <div className='border-border mt-4 flex flex-wrap gap-8 border-t pt-4'>
              <div className='flex flex-col gap-1'>
                <span className='text-muted-foreground text-base'>최저가 ({priceGradeLabel})</span>
                <span className='text-foreground text-2xl leading-[1.2] font-bold tabular-nums md:text-[28px]'>
                  {formatPrice(card.price.minPrice, card.price.currency)}
                </span>
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-muted-foreground text-base'>최고가 ({priceGradeLabel})</span>
                <span className='text-foreground text-2xl leading-[1.2] font-bold tabular-nums md:text-[28px]'>
                  {formatPrice(card.price.maxPrice, card.price.currency)}
                </span>
              </div>
            </div>
            <EbayListings
              listings={card.ebayListings}
              featuredIndex={card.featuredListingIndex}
              fallbackUrl={card.price.sourceUrl}
            />
          </div>

          <dl className='bg-card grid grid-cols-2 gap-3 rounded-2xl p-6 md:grid-cols-4'>
            <InfoItem label='시장' value={card.printing.region} />
            <InfoItem label='언어' value={card.printing.language.toUpperCase()} />
            <InfoItem label='세트 코드' value={card.printing.setCode} />
            <InfoItem label='카드 번호' value={card.printing.collectorNumber} />
          </dl>

          {ratingSlot}

          <div className='mt-2 flex flex-wrap gap-4'>
            <Button type='button' size='cta' className='hover:scale-[1.02]'>
              <CirclePlus className='size-5' aria-hidden />
              관심 카드 추가
            </Button>
            <Button type='button' variant='outline' size='cta'>
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

          <p className='text-muted-foreground mt-2 flex items-center gap-2 text-sm leading-[1.5]'>
            <Info className='size-4 shrink-0' aria-hidden />
            {card.price.sourceLabel}
          </p>
          <p className='text-muted-foreground text-sm leading-[1.5]'>
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
        className='text-muted-foreground text-sm leading-none font-semibold tracking-wider uppercase'
      >
        판본
      </h3>
      <div className='border-border bg-card inline-flex w-fit rounded-lg border p-1'>
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
                className='text-muted-foreground inline-flex min-w-20 items-center justify-center rounded-md px-4 py-2 text-sm font-bold'
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
      <div className='bg-card mx-auto w-full max-w-md overflow-hidden rounded-[32px]'>
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
    <div className='bg-surface-container mx-auto flex aspect-[2.5/3.5] w-full max-w-md flex-col justify-between overflow-hidden rounded-[32px] p-8'>
      <div className='flex items-center justify-between gap-3'>
        <span className='bg-card/80 text-muted-foreground rounded-full px-3 py-1 text-xs font-bold'>
          {card.printing.sampleId}
        </span>
        <span className='bg-tcg-red text-primary-foreground rounded-full px-3 py-1 text-xs font-bold'>
          {card.rarity}
        </span>
      </div>
      <div>
        <p className='text-muted-foreground text-sm font-semibold tracking-wider uppercase'>
          Korean Pokemon
        </p>
        <p className='text-foreground mt-3 text-5xl leading-[1.05] font-extrabold'>
          {card.cardName}
        </p>
        <p className='text-muted-foreground mt-4 text-base font-semibold'>{card.collectorNumber}</p>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
        {label}
      </dt>
      <dd className='text-foreground mt-1 text-base font-bold'>{value}</dd>
    </div>
  );
}
