import { Suspense } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@tcground/ui';
import { HomeSearchForm } from '@/components/tcg/search/HomeSearchForm';
import { PageFooter } from '@/components/tcg/layout/PageFooter';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import { getFeaturedPokemonCards, type PokemonCatalogCard } from '@/lib/tcg-catalog';
import { formatPrice } from '@/lib/tcg-data';

export const metadata: Metadata = {
  title: 'TCGround - Curated Discovery for Collectors',
  description: 'TCGround에서 트레이딩 카드 컬렉션을 발견하고, 추적하며, 가치를 평가하세요.',
};

const categoryTiles = [
  {
    title: '포켓몬',
    alt: 'Pokemon Trading Cards',
    href: '/categories/pokemon',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRogrJvcZ6wzWmloM0IbmCShi2zsvELtqXK5ARMK52XwdDm8FyOkxN_FKpxMt6QEGxNWMDowfxiziuZ3LdUdceWVovo7jzGFB0ut8eLKzA5Byqky8dFymrcJs2bwKXOM5DVB-6dBfhzX8VJ9wGYZ4ALUapH-H15w8XDL9ueVjSq1nK1sQI76EH3UZN_x_yn_l491scjPXFtuBFKaxDeyIR4Qrvpra8fwT3gdrKGqsYauPFe1PskSUdK9oRl_MF1sqKeuNfORV6-Gwx',
  },
  {
    title: '매직: 더 개더링',
    alt: 'Magic The Gathering Cards',
    href: '/categories/magic',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA36JScoXTFa2-iZ73Dx527OjCHPDtpqOH_HY3m1JPb93oQ8qNzObcbSPkxjAfA_I0Q2MllLUx6tuxcxZUYZeEmWR1EooA3QZ2m2WWDAj2QCCCv3LmCj26TNvK9wvi0OdSeKgE3UXYTFSq8F88iyxCSg-0bhzU95OWCsr4PcvRRED856Vb8_987cBfqoKMY9glsp1l7uap6c9Z9jX16zMIRgCXW6PB3UKFEYt3HJQ8A5k8Tw73MaJXoKfwLdz8qDcdrR5dA2iH2b4X6',
  },
  {
    title: '유희왕!',
    alt: 'Yu-Gi-Oh Cards',
    href: '/categories/yugioh',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOQuv5uh9ovaQyWEHitOMAl6ecugPX5N3C0lxhKchEIRriFUW8dMqnppvezvo7gcWcHDwC04_82N6--X9_p1b9ACfTW3RqAygKMLCm2LrIj7mttEKTAzNdC9Q3LFgbvVDDA8BpxjYn5mendig8-c65YIsWHejx4JEc5SWLTVb9Y9gY43SbgwWKhvkqjY9LIoMDrUhmOPoQyrfo6G_hpNDQky3LWU0bwIPWLJr0LUKzGmWw-30pXe0nJlSAIMmjURanTvIq7PrKd-cB',
  },
];

export default function Home() {
  return (
    <div className='flex min-h-screen flex-col bg-background text-foreground'>
      <PublicHeader currentPath='/' />

      <main className='mx-auto w-full max-w-[1440px] flex-grow pb-16'>
        <section className='mt-16 mb-16 px-5 text-center'>
          <h1 className='mb-6 text-5xl leading-[1.1] font-extrabold text-foreground md:text-[70px]'>
            안전하고 확실한 카드 수집
          </h1>
          <p className='mx-auto mb-8 max-w-2xl text-xl leading-[1.5] font-normal text-muted-foreground'>
            데이터 기반 큐레이션 플랫폼에서 트레이딩 카드 컬렉션을 발견하고, 추적하며, 가치를
            평가하세요.
          </p>
          <div className='mx-auto flex w-full max-w-[800px] justify-center'>
            <HomeSearchForm showSubmitButton size='hero' />
          </div>
        </section>

        <section className='mb-16 px-5' aria-label='Game categories'>
          <div className='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4'>
            {categoryTiles.map((category) => (
              <Link
                key={category.title}
                href={category.href}
                className='group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-2xl'
              >
                <Image
                  alt={category.alt}
                  fill
                  sizes='(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw'
                  className='absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                  src={category.src}
                />
                <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent' />
                <h3 className='absolute bottom-6 left-6 text-[32px] leading-[1.2] font-bold text-white'>
                  {category.title}
                </h3>
              </Link>
            ))}

            <Link
              href='/categories/one-piece'
              className='group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-[#113042] via-[#1b6a7a] to-[#e2b05f]'
            >
              <Image
                alt='One Piece Card Game'
                fill
                sizes='(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw'
                className='absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                src='/categories/one-piece.jpg'
              />
              <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent' />
              <h3 className='absolute bottom-6 left-6 text-[32px] leading-[1.2] font-bold text-white'>
                원피스
              </h3>
            </Link>
          </div>
        </section>

        <section className='mb-16 px-5'>
          <div className='mb-8 flex items-end justify-between'>
            <h2 className='text-[32px] leading-[1.2] font-bold text-foreground'>
              현재 인기 있는 카드
            </h2>
            <Link
              className='flex items-center gap-1 text-sm leading-none font-semibold text-tcg-red hover:underline'
              href='/cards'
            >
              모두 보기
              <ArrowRight className='size-4' aria-hidden />
            </Link>
          </div>

          <Suspense fallback={<TrendingCardsSkeleton />}>
            <TrendingCardsSection />
          </Suspense>
        </section>

        <section className='mb-16 px-5'>
          <div className='rounded-[24px] bg-muted p-12 text-center md:flex md:items-center md:justify-between md:text-left'>
            <div className='md:max-w-xl'>
              <h2 className='mb-4 text-[32px] leading-[1.2] font-bold text-foreground'>
                컬렉션 업그레이드
              </h2>
              <p className='mb-8 text-base leading-[1.5] font-normal text-muted-foreground md:mb-0'>
                실시간 시장 데이터, 포트폴리오 추적 및 원활한 탐색을 위해 TCGround를 신뢰하는 수천
                명의 수집가와 함께하세요.
              </p>
            </div>
            <Link
              className='inline-flex rounded-lg bg-tcg-red px-8 py-4 text-lg leading-none font-semibold whitespace-nowrap text-primary-foreground shadow-sm transition-colors hover:bg-tcg-red-dark'
              href='/login'
            >
              TCGround 가입하기
            </Link>
          </div>
        </section>
      </main>

      <PageFooter />
    </div>
  );
}

async function TrendingCardsSection() {
  const cards = await getTrendingCards();
  return <TrendingCardsGrid cards={cards} />;
}

function TrendingCardsSkeleton() {
  return (
    <div className='grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4'>
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className='aspect-[3/4] w-full rounded-xl' />
      ))}
    </div>
  );
}

async function getTrendingCards(): Promise<PokemonCatalogCard[]> {
  try {
    return await getFeaturedPokemonCards({ limit: 8 });
  } catch (error) {
    console.error('Failed to load home featured cards', error);
    return [];
  }
}

export function TrendingCardsGrid({ cards }: { cards: readonly PokemonCatalogCard[] }) {
  if (cards.length === 0) {
    return (
      <div className='rounded-2xl bg-card p-12 text-center text-base text-muted-foreground'>
        아직 표시할 인기 카드가 없습니다.
      </div>
    );
  }

  return (
    <div className='columns-1 gap-5 space-y-5 sm:columns-2 md:columns-3 lg:columns-4'>
      {cards.map((card) => (
        <Link
          key={card.slug}
          href={card.href}
          aria-label={`${card.name} 상세 보기`}
          className='group block cursor-pointer break-inside-avoid overflow-hidden rounded-2xl bg-card transition-transform duration-200 hover:scale-[1.02]'
        >
          <div className='relative'>
            {card.imageUrl ? (
              <div className='relative aspect-[2.5/3.5] w-full bg-surface-container'>
                <Image
                  alt={`${card.name} 카드`}
                  src={card.imageUrl}
                  fill
                  sizes='(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw'
                  className='object-contain'
                />
              </div>
            ) : (
              <div className='flex aspect-[2.5/3.5] w-full items-center justify-center bg-muted'>
                <Sparkles className='size-[70px] text-tcg-red opacity-50' aria-hidden />
              </div>
            )}
            <div className='absolute top-3 right-3 flex items-center gap-1 rounded-full border border-border bg-card/90 px-3 py-1 shadow-sm backdrop-blur-sm'>
              <span className='text-sm leading-none font-bold text-foreground tabular-nums'>
                {card.price ? formatPrice(card.price.avgPrice, card.price.currency) : '시세 정보 없음'}
              </span>
            </div>
          </div>
          <div className='bg-card p-3'>
            <h4 className='truncate text-base leading-[1.5] font-bold text-foreground'>
              {card.name}
            </h4>
            <p className='mt-1 text-sm leading-none font-semibold text-muted-foreground'>
              {card.setName} · {card.rarity}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

