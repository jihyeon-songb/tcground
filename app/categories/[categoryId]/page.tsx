import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import {
  getPokemonCategoryPageData,
  type PokemonCategoryPageData,
  type PokemonSort,
} from '@/lib/tcg-catalog';
import { CardResults, type CardView } from './CardResults';
import { CategoryFilterBar } from './CategoryFilterBar';
import { CategoryResultsToolbar } from './CategoryResultsToolbar';
import { CategoryTabs } from './CategoryTabs';

export const dynamic = 'force-dynamic';

const KNOWN_CATEGORY_LABELS: Record<string, string> = {
  pokemon: '포켓몬',
  magic: '매직: 더 개더링',
  yugioh: '유희왕!',
  'one-piece': '원피스',
};

interface CategoryPageProps {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{
    q?: string | string[];
    rarity?: string | string[];
    set?: string | string[];
    sort?: string | string[];
    page?: string | string[];
    view?: string | string[];
  }>;
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

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { categoryId } = await params;
  const {
    q: rawQuery,
    rarity: rawRarity,
    set: rawSet,
    sort: rawSort,
    page: rawPage,
    view: rawView,
  } = await searchParams;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery ?? '').trim();
  const rarities = parseListParam(rawRarity);
  const setSlugs = parseListParam(rawSet);
  const sort = parseSortParam(rawSort);
  const page = parsePageParam(rawPage);
  const view = parseViewParam(rawView);
  const breadcrumbLabel = KNOWN_CATEGORY_LABELS[categoryId] ?? null;

  if (!breadcrumbLabel) {
    notFound();
  }

  const pokemonData =
    categoryId === 'pokemon'
      ? await getPokemonCategoryPageData({ query, rarities, setSlugs, sort, page })
      : null;

  const currentPath = buildCurrentPath(`/categories/${categoryId}`, {
    query,
    rarities,
    setSlugs,
    sort,
    page,
    view,
  });

  return (
    <div className='flex min-h-screen flex-col bg-[#f8f9fb] text-[#191c1e]'>
      <PublicHeader
        currentPath={currentPath}
        search={{ initialQuery: query, showClearButton: true, desktopOnly: true }}
      />

      <main className='mx-auto w-full max-w-[1440px] flex-grow px-5 pb-16'>
        <CategoryBreadcrumb label={breadcrumbLabel} />

        {categoryId === 'pokemon' ? (
          <PokemonCategoryContent data={pokemonData} productsHref={currentPath} view={view} />
        ) : (
          <UnknownCategoryEmptyState label={breadcrumbLabel} />
        )}
      </main>

      <PageFooter />
    </div>
  );
}

export function PokemonCategoryContent({
  data,
  productsHref = '/categories/pokemon',
  view = 'grid',
}: {
  data: PokemonCategoryPageData | null;
  productsHref?: string;
  view?: CardView;
}) {
  const cards = data?.cards ?? [];
  const query = data?.query ?? '';
  const hasQuery = query.length > 0;

  return (
    <>
      <CategoryTabs productsHref={productsHref} />

      <section className='mb-8 flex flex-col items-start gap-3'>
        <p className='text-sm leading-none font-bold tracking-wider text-[#bb001a] uppercase'>
          {data?.gameName ?? 'Pokemon TCG'}
        </p>
        <h1 className='text-3xl leading-[1.1] font-extrabold text-[#191c1e] md:text-4xl'>
          {data?.gameNameKo ?? '포켓몬 카드'}
        </h1>
        <p className='max-w-2xl text-base leading-[1.6] text-[#535f73]'>
          {data?.description ??
            '포켓몬 카드의 대표 한국판 카탈로그를 세트와 레어도 기준으로 탐색하세요.'}
        </p>
        {hasQuery ? <SearchResultBanner query={query} resultCount={data?.totalCount ?? cards.length} /> : null}
      </section>

      <CategoryFilterBar
        availableRarities={data?.availableRarities ?? []}
        availableSets={data?.availableSets ?? []}
        selectedRarities={data?.selectedRarities ?? []}
        selectedSetSlugs={data?.selectedSetSlugs ?? []}
      />

      <CategoryResultsToolbar
        totalCount={data?.totalCount ?? cards.length}
        sort={data?.sort ?? 'best'}
        view={view}
      />

      <CardResults
        initialCards={cards}
        totalCount={data?.totalCount ?? cards.length}
        page={data?.page ?? 1}
        pageSize={data?.pageSize ?? 24}
        sort={data?.sort ?? 'best'}
        query={query}
        rarities={data?.selectedRarities ?? []}
        setSlugs={data?.selectedSetSlugs ?? []}
        view={view}
      />
    </>
  );
}

function SearchResultBanner({ query, resultCount }: { query: string; resultCount: number }) {
  return (
    <div
      aria-live='polite'
      className='text-base leading-[1.5] font-bold text-[#191c1e]'
      data-testid='search-result-banner'
    >
      <span className='font-bold'>{`'${query}'`}</span>에 대한{' '}
      <span className='font-bold'>{resultCount}</span>개 결과
    </div>
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

function parseListParam(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(',') : value;
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseSortParam(value: string | string[] | undefined): PokemonSort {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'name-asc' || raw === 'name-desc') return raw;
  return 'best';
}

function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseViewParam(value: string | string[] | undefined): CardView {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'list' ? 'list' : 'grid';
}

function buildCurrentPath(
  base: string,
  filters: {
    query: string;
    rarities: readonly string[];
    setSlugs: readonly string[];
    sort: PokemonSort;
    page: number;
    view: CardView;
  },
): string {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.rarities.length > 0) params.set('rarity', filters.rarities.join(','));
  if (filters.setSlugs.length > 0) params.set('set', filters.setSlugs.join(','));
  if (filters.sort !== 'best') params.set('sort', filters.sort);
  if (filters.view === 'list') params.set('view', 'list');
  if (filters.page > 1) params.set('page', String(filters.page));
  const query = params.toString();
  return query ? `${base}?${query}` : base;
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
