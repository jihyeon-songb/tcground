/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import {
  getPokemonCategoryPageData,
  type PokemonCatalogCard,
  type PokemonCategoryPageData,
  type PokemonSetSummary,
} from '@/lib/tcg-catalog';
import { formatKrw } from '@/lib/tcg-data';

export const dynamic = 'force-dynamic';

const KNOWN_CATEGORY_LABELS: Record<string, string> = {
  pokemon: '포켓몬',
  magic: '매직: 더 개더링',
  yugioh: '유희왕!',
  'one-piece': '원피스',
};

interface CategoryPageProps {
  params: Promise<{ categoryId: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { categoryId } = await params;

  if (categoryId === 'pokemon') {
    const data = await getPokemonCategoryPageData();

    return {
      title: 'TCGround | 포켓몬 카테고리',
      description: data?.description ?? '포켓몬 카테고리에서 시세를 추적하고 컬렉션을 탐색하세요.',
    };
  }

  const fallbackLabel = KNOWN_CATEGORY_LABELS[categoryId];
  if (fallbackLabel) {
    return {
      title: `TCGround | ${fallbackLabel} 카테고리`,
      description: `${fallbackLabel} 카테고리에서 시세를 추적하고 컬렉션을 탐색하세요.`,
    };
  }

  return {
    title: 'TCGround | 카테고리',
    description: '카테고리별로 트레이딩 카드를 탐색하고 시세를 추적하세요.',
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categoryId } = await params;
  const breadcrumbLabel = KNOWN_CATEGORY_LABELS[categoryId] ?? null;

  if (!breadcrumbLabel) {
    notFound();
  }

  const pokemonData = categoryId === 'pokemon' ? await getPokemonCategoryPageData() : null;

  return (
    <div className='flex min-h-screen flex-col bg-[#f8f9fb] text-[#191c1e]'>
      <PublicHeader currentPath={`/categories/${categoryId}`} search={{ desktopOnly: true }} />

      <main className='mx-auto w-full max-w-[1440px] flex-grow px-5 pb-16'>
        <CategoryBreadcrumb label={breadcrumbLabel} />

        {categoryId === 'pokemon' ? (
          <PokemonCategoryContent data={pokemonData} />
        ) : (
          <UnknownCategoryEmptyState label={breadcrumbLabel} />
        )}
      </main>

      <PageFooter />
    </div>
  );
}

export function PokemonCategoryContent({ data }: { data: PokemonCategoryPageData | null }) {
  const sets = data?.sets ?? [];
  const cards = data?.cards ?? [];
  const rarityFilters = Array.from(new Set(cards.map((card) => card.rarity))).sort((a, b) =>
    a.localeCompare(b, 'ko-KR'),
  );

  return (
    <>
      <section className='mb-10 flex flex-col items-start gap-4'>
        <p className='text-sm leading-none font-bold tracking-wider text-[#bb001a] uppercase'>
          {data?.gameName ?? 'Pokemon TCG'}
        </p>
        <h1 className='text-4xl leading-[1.1] font-extrabold text-[#191c1e] md:text-[48px]'>
          {data?.gameNameKo ?? '포켓몬 카드'}
        </h1>
        <p className='max-w-2xl text-lg leading-[1.6] text-[#535f73]'>
          {data?.description ??
            '포켓몬 카드의 대표 한국판 카탈로그를 세트와 레어도 기준으로 탐색하세요.'}
        </p>
      </section>

      <div className='flex flex-col gap-6 lg:flex-row lg:gap-8'>
        <aside className='flex w-full shrink-0 flex-col gap-6 lg:w-64'>
          <FilterCard title='레어도'>
            <div className='flex flex-col gap-3'>
              {rarityFilters.length === 0 ? (
                <p className='text-sm leading-[1.5] text-[#535f73]'>등록된 레어도가 없습니다.</p>
              ) : (
                rarityFilters.map((rarity, index) => (
                  <label key={rarity} className='group flex cursor-pointer items-center gap-3'>
                    <input
                      type='checkbox'
                      defaultChecked={index === 0}
                      className='h-5 w-5 rounded border-[#535f73] text-[#bb001a] focus:ring-[#bb001a]'
                    />
                    <span className='text-base text-[#191c1e] transition-colors group-hover:text-[#bb001a]'>
                      {rarity}
                    </span>
                  </label>
                ))
              )}
            </div>
          </FilterCard>

          <FilterCard title='세트'>
            <div className='flex flex-col gap-3'>
              {sets.length === 0 ? (
                <p className='text-sm leading-[1.5] text-[#535f73]'>등록된 세트가 없습니다.</p>
              ) : (
                sets.map((set, index) => (
                  <label key={set.slug} className='group flex cursor-pointer items-center gap-3'>
                    <input
                      type='radio'
                      name='set'
                      defaultChecked={index === 0}
                      className='h-5 w-5 border-[#535f73] text-[#bb001a] focus:ring-[#bb001a]'
                    />
                    <span className='text-base text-[#191c1e] transition-colors group-hover:text-[#bb001a]'>
                      {set.name}
                    </span>
                  </label>
                ))
              )}
            </div>
          </FilterCard>
        </aside>

        <div className='flex flex-1 flex-col gap-12'>
          <PokemonSetSection sets={sets} />
          <PokemonCardSection cards={cards} />
        </div>
      </div>
    </>
  );
}

function CategoryBreadcrumb({ label }: { label: string }) {
  return (
    <nav
      aria-label='Breadcrumb'
      className='mb-8 flex items-center gap-2 pt-6 text-sm font-semibold text-[#535f73]'
    >
      <Link href='/' className='transition-colors hover:text-[#bb001a]'>
        홈
      </Link>
      <span className='material-symbols-outlined text-[16px] leading-none' aria-hidden>
        {/*chevron_right*/}
      </span>
      <Link href='/categories' className='transition-colors hover:text-[#bb001a]'>
        카테고리
      </Link>
      <span className='material-symbols-outlined text-[16px] leading-none' aria-hidden>
        {/*chevron_right*/}
      </span>
      <span className='text-[#191c1e]'>{label}</span>
    </nav>
  );
}

function PokemonSetSection({ sets }: { sets: readonly PokemonSetSummary[] }) {
  return (
    <section aria-labelledby='popular-sets-heading'>
      <div className='mb-6 flex items-center justify-between'>
        <h2
          id='popular-sets-heading'
          className='text-[32px] leading-[1.2] font-bold text-[#191c1e]'
        >
          등록 세트
        </h2>
      </div>

      {sets.length === 0 ? (
        <EmptyCardsState title='등록된 세트가 없습니다' />
      ) : (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {sets.map((set) => (
            <Link
              key={set.slug}
              href={set.href}
              className='group flex min-h-44 flex-col justify-between rounded-xl border border-[#e0e3e5] bg-white p-5 shadow-sm transition-transform duration-200 hover:scale-[1.01] hover:shadow-md'
            >
              <div>
                <p className='text-xs font-bold tracking-wider text-[#bb001a] uppercase'>
                  Korean Pokemon
                </p>
                <h3 className='mt-3 text-2xl leading-[1.2] font-extrabold text-[#191c1e]'>
                  {set.name}
                </h3>
              </div>
              <p className='mt-6 text-sm font-semibold text-[#535f73]'>
                등록 카드 {set.cardCount.toLocaleString('ko-KR')}장
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function PokemonCardSection({ cards }: { cards: readonly PokemonCatalogCard[] }) {
  return (
    <section aria-labelledby='trending-cards-heading'>
      <h2
        id='trending-cards-heading'
        className='mb-6 text-[32px] leading-[1.2] font-bold text-[#191c1e]'
      >
        등록 카드
      </h2>
      {cards.length === 0 ? (
        <EmptyCardsState title='등록된 카드가 없습니다' />
      ) : (
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3'>
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              aria-label={`${card.name} 상세 보기`}
              className='group flex min-h-96 flex-col overflow-hidden rounded-xl border border-[#e0e3e5] bg-white shadow-sm transition-all duration-200 hover:shadow-md'
            >
              <CardImagePlaceholder card={card} />
              <div className='flex flex-1 flex-col justify-between p-4'>
                <div>
                  <h3 className='line-clamp-1 text-lg leading-tight font-bold text-[#191c1e]'>
                    {card.name}
                  </h3>
                  <p className='mt-1 text-sm font-medium text-[#535f73]'>
                    {card.setName} · {card.rarity} · {card.collectorNumber}
                  </p>
                </div>
                <div className='mt-5'>
                  <div className='flex items-center justify-between gap-3'>
                    <span className='text-2xl leading-none font-bold text-[#191c1e] tabular-nums'>
                      {formatKrw(card.price.avgPrice)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${changeChipClass(
                        card.price.changeTone,
                      )}`}
                    >
                      {formatChangeRate(card.price.changeRate)}
                    </span>
                  </div>
                  <dl className='mt-4 grid grid-cols-2 gap-3 border-t border-[#e6e8ea] pt-4'>
                    <div>
                      <dt className='text-xs font-semibold tracking-wider text-[#535f73] uppercase'>
                        최저
                      </dt>
                      <dd className='mt-1 text-base font-bold tabular-nums'>
                        {formatKrw(card.price.minPrice)}
                      </dd>
                    </div>
                    <div>
                      <dt className='text-xs font-semibold tracking-wider text-[#535f73] uppercase'>
                        최고
                      </dt>
                      <dd className='mt-1 text-base font-bold tabular-nums'>
                        {formatKrw(card.price.maxPrice)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function CardImagePlaceholder({ card }: { card: PokemonCatalogCard }) {
  if (card.imageUrl) {
    return (
      <img
        alt={`${card.name} 카드`}
        src={card.imageUrl}
        className='block aspect-[2.5/3.5] w-full object-cover'
      />
    );
  }

  return (
    <div className='flex aspect-[2.5/3.5] w-full flex-col justify-between bg-[#eceef0] p-5'>
      <div className='flex items-center justify-between gap-3'>
        <span className='rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[#535f73]'>
          {card.sampleId}
        </span>
        <span className='rounded-full bg-[#bb001a] px-3 py-1 text-xs font-bold text-white'>
          {card.rarity}
        </span>
      </div>
      <div>
        <p className='text-sm font-semibold tracking-wider text-[#535f73] uppercase'>
          Korean Pokemon
        </p>
        <p className='mt-2 text-3xl leading-[1.05] font-extrabold text-[#191c1e]'>{card.name}</p>
        <p className='mt-3 text-sm font-semibold text-[#535f73]'>{card.collectorNumber}</p>
      </div>
    </div>
  );
}

function FilterCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='rounded-xl border border-[#e0e3e5] bg-white p-6 shadow-sm'>
      <h3 className='mb-4 text-xs font-semibold tracking-wider text-[#535f73] uppercase'>
        {title}
      </h3>
      {children}
    </div>
  );
}

function changeChipClass(tone: 'up' | 'down' | 'flat'): string {
  if (tone === 'up') return 'bg-[#eceef0] text-[#1e8e3e]';
  if (tone === 'down') return 'bg-[#eceef0] text-[#d93025]';
  return 'bg-[#eceef0] text-[#535f73]';
}

function formatChangeRate(rate: number) {
  if (rate > 0) return `+${rate.toFixed(1)}%`;
  return `${rate.toFixed(1)}%`;
}

function EmptyCardsState({ title }: { title: string }) {
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
      <h3 className='text-2xl leading-tight font-bold text-[#191c1e]'>{title}</h3>
      <p className='max-w-md text-base leading-[1.5] text-[#535f73]'>
        다른 카테고리를 둘러보거나 검색어로 카드를 찾아보세요.
      </p>
    </section>
  );
}

function UnknownCategoryEmptyState({ label }: { label: string }) {
  return (
    <section
      aria-live='polite'
      className='flex flex-col items-center justify-center gap-3 rounded-2xl bg-white px-6 py-16 text-center'
    >
      <span
        className='material-symbols-outlined text-[48px] leading-none text-[#bb001a]'
        aria-hidden
      >
        category
      </span>
      <h2 className='text-2xl leading-tight font-bold text-[#191c1e]'>
        {label} 카테고리는 아직 준비 중입니다
      </h2>
      <p className='max-w-md text-base leading-[1.5] text-[#535f73]'>
        새로운 카드가 등록되는 대로 이곳에서 확인하실 수 있습니다.
      </p>
      <Link
        href='/'
        className='mt-2 inline-flex items-center gap-1 rounded-lg bg-[#bb001a] px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#930012]'
      >
        다른 카테고리 보기
      </Link>
    </section>
  );
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
