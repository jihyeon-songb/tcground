import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@tcground/ui';
import { notFound } from 'next/navigation';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import { createClient } from '@/lib/supabase/server';
import {
  getCardDetailBySlug,
  getCardRatingSummary,
  getPriceTrendSeries,
  getViewerRating,
  type CardRatingSummary,
  type CatalogCardDetail,
} from '@/lib/tcg-catalog';
import { formatPrice } from '@/lib/tcg-data';
import { PriceHistoryChart } from './PriceHistoryChart';
import { CardRating } from './CardRating';

export const dynamic = 'force-dynamic';

// Re-exported for tests that exercise the pure geometry helper against `./page`.
export { buildChartGeometry } from './price-chart';

type ChangeTone = 'up' | 'down' | 'flat';

interface CardDetailPageProps {
  params: Promise<{ cardId: string }>;
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

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { cardId } = await params;
  const card = await getCardDetailBySlug(cardId);

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

  return (
    <div className='flex min-h-screen flex-col bg-[#f8f9fb] text-[#191c1e]'>
      <PublicHeader currentPath={`/cards/${cardId}`} search={{ desktopOnly: true }} />

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
      <nav aria-label='Breadcrumb' className='mb-8 flex items-center gap-2 text-sm text-[#535f73]'>
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
          <CardArtPanel card={card} />
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
                  {formatPrice(card.price.avgPrice, card.price.currency)}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm leading-none font-semibold ${changeChipClass(
                    card.price.changeTone,
                  )}`}
                >
                  <span className='material-symbols-outlined text-[16px] leading-none' aria-hidden>
                    {trendIcon(card.price.changeTone)}
                  </span>
                  {formatChangeRate(card.price.changeRate)}
                </span>
              </div>
            </div>
            <div className='mt-4 flex flex-wrap gap-8 border-t border-[#e6e8ea] pt-4'>
              <div className='flex flex-col gap-1'>
                <span className='text-base text-[#535f73]'>최저가 ({priceGradeLabel})</span>
                <span className='text-2xl leading-[1.2] font-bold text-[#191c1e] tabular-nums md:text-[28px]'>
                  {formatPrice(card.price.minPrice, card.price.currency)}
                </span>
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-base text-[#535f73]'>최고가 ({priceGradeLabel})</span>
                <span className='text-2xl leading-[1.2] font-bold text-[#191c1e] tabular-nums md:text-[28px]'>
                  {formatPrice(card.price.maxPrice, card.price.currency)}
                </span>
              </div>
            </div>
          </div>

          <dl className='grid grid-cols-2 gap-3 rounded-2xl bg-white p-6 md:grid-cols-4'>
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
              <span className='material-symbols-outlined text-[20px] leading-none' aria-hidden>
                {/*add_circle*/}
              </span>
              관심 카드 추가
            </Button>
            <Button
              type='button'
              variant='outline'
              size='cta'
            >
              <span className='material-symbols-outlined text-[20px] leading-none' aria-hidden>
                {/*notifications*/}
              </span>
              가격 알림 설정
            </Button>
          </div>

          <PriceHistoryChart
            trendSeries={trendSeries}
            overlaySold={overlaySold}
            hasData={card.priceHistory.hasData}
            gradeLabel={card.priceHistory.gradeLabel}
          />

          <p className='mt-2 flex items-center gap-2 text-sm leading-[1.5] text-[#535f73]'>
            <span className='material-symbols-outlined text-[16px] leading-none' aria-hidden>
              info
            </span>
            {card.price.sourceLabel}
          </p>
          <p className='text-sm leading-[1.5] text-[#535f73]'>
            마지막 업데이트: {card.price.lastUpdatedAt}
          </p>
        </div>
      </section>
    </>
  );
}

function CardArtPanel({ card }: { card: CatalogCardDetail }) {
  if (card.imageUrl) {
    return (
      <div className='mx-auto w-full max-w-md overflow-hidden rounded-[32px] bg-white'>
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
    <div className='mx-auto flex aspect-[2.5/3.5] w-full max-w-md flex-col justify-between overflow-hidden rounded-[32px] bg-[#eceef0] p-8'>
      <div className='flex items-center justify-between gap-3'>
        <span className='rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[#535f73]'>
          {card.printing.sampleId}
        </span>
        <span className='rounded-full bg-[#bb001a] px-3 py-1 text-xs font-bold text-white'>
          {card.rarity}
        </span>
      </div>
      <div>
        <p className='text-sm font-semibold tracking-wider text-[#535f73] uppercase'>
          Korean Pokemon
        </p>
        <p className='mt-3 text-5xl leading-[1.05] font-extrabold text-[#191c1e]'>
          {card.cardName}
        </p>
        <p className='mt-4 text-base font-semibold text-[#535f73]'>{card.collectorNumber}</p>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className='text-xs font-semibold tracking-wider text-[#535f73] uppercase'>{label}</dt>
      <dd className='mt-1 text-base font-bold text-[#191c1e]'>{value}</dd>
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

function formatChangeRate(rate: number) {
  if (rate > 0) return `+${rate.toFixed(1)}%`;
  return `${rate.toFixed(1)}%`;
}

function PageFooter() {
  return (
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
  );
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
