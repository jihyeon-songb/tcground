import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Skeleton } from '@tcground/ui';
import { PageFooter } from '@/components/tcg/layout/PageFooter';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import { getFeaturedPokemonCards, type PokemonCatalogCard } from '@/lib/tcg-catalog';
import { FeaturedCardsGrid } from './_components/FeaturedCardsGrid';

export const metadata: Metadata = {
  title: 'TCGround | 인기 카드',
  description: '현재 TCGround에서 우선 추적하는 인기 카드와 가격 요약을 확인하세요.',
};

export default function CardsPage() {
  return (
    <div className='flex min-h-screen flex-col bg-background text-foreground'>
      <PublicHeader currentPath='/cards' search={{ desktopOnly: true }} />

      <main className='mx-auto w-full max-w-[1440px] flex-grow px-5 pb-16'>
        <section className='pt-10 pb-8'>
          <p className='mb-3 text-sm leading-none font-bold tracking-wider text-tcg-red uppercase'>
            인기 카드
          </p>
          <h1 className='max-w-3xl text-4xl leading-[1.1] font-extrabold text-foreground md:text-[56px]'>
            시장 흐름을 빠르게 볼 수 있는 카드 목록
          </h1>
          <p className='mt-5 max-w-2xl text-lg leading-[1.6] text-muted-foreground'>
            평균 거래가와 최근 변동률을 기준으로 지금 주목받는 카드를 확인하세요.
          </p>
        </section>

        <Suspense fallback={<FeaturedCardsSkeleton />}>
          <FeaturedCardsSection />
        </Suspense>
      </main>

      <PageFooter
        columns={[
          { title: '플랫폼', links: ['소개', '지원', 'API 문서'] },
          { title: '게임', links: ['포켓몬', '매직 더 개더링', '유희왕', '원피스'] },
          { title: '법적 고지', links: ['개인정보 처리방침', '이용약관', '채용정보'] },
        ]}
      />
    </div>
  );
}

async function FeaturedCardsSection() {
  const cards = await getCardsPageFeaturedCards();
  return <FeaturedCardsGrid cards={cards} />;
}

function FeaturedCardsSkeleton() {
  return (
    <div className='grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4'>
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className='aspect-[3/4] w-full rounded-xl' />
      ))}
    </div>
  );
}

async function getCardsPageFeaturedCards(): Promise<PokemonCatalogCard[]> {
  try {
    return await getFeaturedPokemonCards({ limit: 8 });
  } catch (error) {
    console.error('Failed to load cards page featured cards', error);
    return [];
  }
}
