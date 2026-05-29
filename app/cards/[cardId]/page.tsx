import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@tcground/ui';
import { notFound } from 'next/navigation';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import {
  getCardDetailBySlug,
  getPriceTrendSeries,
  type CatalogCardDetail,
  type PricePoint,
} from '@/lib/tcg-catalog';
import { formatPrice } from '@/lib/tcg-data';

export const dynamic = 'force-dynamic';

type ChangeTone = 'up' | 'down' | 'flat';

const CHART_PERIODS = [
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: '90d', label: '90일' },
  { value: '1y', label: '1년' },
] as const;

const ACTIVE_CHART_PERIOD: (typeof CHART_PERIODS)[number]['value'] = '90d';

interface ChartGeometry {
  linePath: string;
  areaPath: string;
  linePoints: Array<{ x: number; y: number }>;
  overlayPoints: Array<{ x: number; y: number }>;
  hasData: boolean;
}

// Chart drawing band inside the `0 0 100 50` viewBox: the trend spans y 6..44,
// leaving headroom above and a baseline below for the filled area.
const CHART_Y_TOP = 6;
const CHART_Y_BOTTOM = 44;

/**
 * Maps the asking trend line and sold overlay points to SVG coordinates in a
 * `0 0 100 50` viewBox. Both axes are scaled to the asking series alone so the
 * trend line always fills the chart; sold points are overlaid only when they
 * fall inside that time window, with prices clamped to the drawing band so a
 * stray sale can't push them off-canvas.
 */
export function buildChartGeometry(
  series: readonly PricePoint[],
  overlay: readonly PricePoint[],
): ChartGeometry {
  // Scale to the asking series; fall back to the overlay only when there is no
  // trend line at all, so a sold-only history still renders.
  const scaleBasis = series.length > 0 ? series : overlay;
  if (scaleBasis.length === 0) {
    return { linePath: '', areaPath: '', linePoints: [], overlayPoints: [], hasData: false };
  }

  const times = scaleBasis.map((point) => new Date(point.date).getTime());
  const prices = scaleBasis.map((point) => point.avgPrice);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);

  const xOf = (date: string) =>
    maxTime === minTime ? 50 : ((new Date(date).getTime() - minTime) / (maxTime - minTime)) * 100;
  const yOf = (price: number) => {
    if (highPrice === lowPrice) return (CHART_Y_TOP + CHART_Y_BOTTOM) / 2;
    const y = CHART_Y_BOTTOM - ((price - lowPrice) / (highPrice - lowPrice)) * (CHART_Y_BOTTOM - CHART_Y_TOP);
    return Math.min(CHART_Y_BOTTOM, Math.max(CHART_Y_TOP, y));
  };

  const linePoints = series.map((point) => ({ x: xOf(point.date), y: yOf(point.avgPrice) }));
  const linePath = linePoints
    .map((coord, index) => `${index === 0 ? 'M' : 'L'}${coord.x.toFixed(2)},${coord.y.toFixed(2)}`)
    .join(' ');
  const areaPath =
    linePoints.length > 0
      ? `M${linePoints[0].x.toFixed(2)},50 ${linePoints
          .map((coord) => `L${coord.x.toFixed(2)},${coord.y.toFixed(2)}`)
          .join(' ')} L${linePoints[linePoints.length - 1].x.toFixed(2)},50 Z`
      : '';

  // Drop overlay points outside the trend window — they have no real position on
  // an axis scaled to the asking series, and stretching the axis to include them
  // is what squashed the trend in the first place.
  const overlayPoints = overlay
    .filter((point) => {
      const time = new Date(point.date).getTime();
      return time >= minTime && time <= maxTime;
    })
    .map((point) => ({ x: xOf(point.date), y: yOf(point.avgPrice) }));

  return { linePath, areaPath, linePoints, overlayPoints, hasData: true };
}

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

  return (
    <div className='flex min-h-screen flex-col bg-[#f8f9fb] text-[#191c1e]'>
      <PublicHeader currentPath={`/cards/${cardId}`} search={{ desktopOnly: true }} />

      <main className='mx-auto w-full max-w-[1440px] flex-grow px-5 pt-6 pb-16 md:px-16'>
        <CardDetailContent card={card} />
      </main>

      <PageFooter />
    </div>
  );
}

export function CardDetailContent({ card }: { card: CatalogCardDetail }) {
  // Draw the trend line from the asking series when we have it, otherwise from
  // the coherent sold series — so a sold-only history is still a real line, not
  // scattered dots. Overlay sold points only when they're distinct from the line.
  const trendSeries = getPriceTrendSeries(card.priceHistory);
  const overlaySold =
    card.priceHistory.askingSeries.length > 0 ? card.priceHistory.soldPoints : [];
  const chartGeometry = buildChartGeometry(trendSeries, overlaySold);

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
                <span className='text-base text-[#535f73]'>최저가 (Raw)</span>
                <span className='text-2xl leading-[1.2] font-bold text-[#191c1e] tabular-nums md:text-[28px]'>
                  {formatPrice(card.price.minPrice, card.price.currency)}
                </span>
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-base text-[#535f73]'>최고가 (Raw)</span>
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

          <section
            aria-labelledby='price-history-heading'
            className='mt-8 rounded-2xl bg-white p-6'
          >
            <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
              <h3
                id='price-history-heading'
                className='text-2xl leading-[1.2] font-bold text-[#191c1e]'
              >
                가격 변동 추이
              </h3>
              <div
                className='flex items-center gap-1 rounded-full bg-[#f2f4f6] p-1'
                role='tablist'
                aria-label='차트 기간'
              >
                {CHART_PERIODS.map((period) => {
                  const isActive = period.value === ACTIVE_CHART_PERIOD;
                  return (
                    <Button
                      key={period.value}
                      type='button'
                      variant={isActive ? 'outline' : 'ghost'}
                      size='tab'
                      role='tab'
                      aria-selected={isActive}
                      className={
                        isActive
                          ? 'bg-white text-[#191c1e]'
                          : 'text-[#535f73] hover:bg-transparent hover:text-[#191c1e]'
                      }
                    >
                      {period.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            {card.priceHistory.hasData ? (
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
                  {chartGeometry.areaPath && (
                    <path d={chartGeometry.areaPath} fill='url(#card-detail-chart-gradient)' />
                  )}
                  {chartGeometry.linePath && (
                    <path
                      d={chartGeometry.linePath}
                      fill='none'
                      stroke='#bb001a'
                      strokeWidth='2'
                      vectorEffect='non-scaling-stroke'
                    />
                  )}
                </svg>
                {chartGeometry.linePoints.length === 1 && (
                  <ChartDot point={chartGeometry.linePoints[0]} className='bg-[#bb001a]' />
                )}
                {chartGeometry.overlayPoints.map((point, index) => (
                  <ChartDot
                    key={index}
                    point={point}
                    className='border-2 border-[#bb001a] bg-white'
                  />
                ))}
              </div>
            ) : (
              <div className='flex h-56 w-full items-center justify-center rounded-xl bg-[#f8f9fb] px-6 text-center text-sm text-[#535f73]'>
                아직 가격 표본을 수집 중입니다. 매일 판매 데이터를 모아 추이를 채워갑니다.
              </div>
            )}
            {card.priceHistory.hasData && chartGeometry.overlayPoints.length > 0 && (
              <div className='mt-3 flex flex-wrap items-center gap-4 text-sm text-[#535f73]'>
                <span className='flex items-center gap-2'>
                  <span className='h-2.5 w-2.5 rounded-full bg-[#bb001a]' aria-hidden />
                  판매중 호가 추이
                </span>
                <span className='flex items-center gap-2'>
                  <span
                    className='h-2.5 w-2.5 rounded-full border-2 border-[#bb001a] bg-white'
                    aria-hidden
                  />
                  실거래가 (참조)
                </span>
              </div>
            )}
          </section>

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

function ChartDot({
  point,
  className,
}: {
  point: { x: number; y: number };
  className: string;
}) {
  return (
    <span
      className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${className}`}
      style={{ left: `${point.x}%`, top: `${(point.y / 50) * 100}%` }}
      aria-hidden
    />
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
