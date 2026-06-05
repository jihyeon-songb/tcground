import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageFooter } from '@/components/tcg/layout/PageFooter';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import { getPokemonCategoryPageData } from '@/lib/tcg-catalog';
import { buildCategoryHref, parseCategoryFilters } from './_lib/category-search-params';
import { CategoryBreadcrumb } from './_components/CategoryBreadcrumb';
import { PokemonCategoryContent } from './_components/PokemonCategoryContent';
import { UnknownCategoryEmptyState } from './_components/UnknownCategoryEmptyState';

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
    return {
      title: 'TCGround | 포켓몬 카테고리',
      description: '포켓몬 카테고리에서 시세를 추적하고 컬렉션을 탐색하세요.',
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
  const filters = parseCategoryFilters(await searchParams);
  const { query, rarities, setSlugs, sort, page, view } = filters;
  const breadcrumbLabel = KNOWN_CATEGORY_LABELS[categoryId] ?? null;

  if (!breadcrumbLabel) {
    notFound();
  }

  const pokemonData =
    categoryId === 'pokemon'
      ? await getPokemonCategoryPageData({ query, rarities, setSlugs, sort, page })
      : null;

  const currentPath = buildCategoryHref(`/categories/${categoryId}`, filters);

  return (
    <div className='flex min-h-screen flex-col bg-background text-foreground'>
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
