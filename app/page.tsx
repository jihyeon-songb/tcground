/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { HomeSearchForm } from '@/components/tcg/search/HomeSearchForm';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import { getFeaturedPokemonCards, type PokemonCatalogCard } from '@/lib/tcg-catalog';
import { formatKrw } from '@/lib/tcg-data';

export const dynamic = 'force-dynamic';

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

export default async function Home() {
  const trendingCards = await getFeaturedPokemonCards({ limit: 8 });

  return (
    <div className='flex min-h-screen flex-col bg-[#f8f9fb] text-[#191c1e]'>
      <PublicHeader currentPath='/' />

      <main className='mx-auto w-full max-w-[1440px] flex-grow pb-16'>
        <section className='mt-16 mb-16 px-5 text-center'>
          <h1 className='mb-6 text-5xl leading-[1.1] font-extrabold text-[#191c1e] md:text-[70px]'>
            안전하고 확실한 카드 수집
          </h1>
          <p className='mx-auto mb-8 max-w-2xl text-xl leading-[1.5] font-normal text-[#535f73]'>
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
                <img
                  alt={category.alt}
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
              className='relative flex aspect-[4/5] cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-[#e6e8ea]'
            >
              <span className='material-symbols-outlined absolute top-1/3 mb-4 block w-full text-center text-[70px] leading-none text-[#bb001a]'>
                sailing
              </span>
              <h3 className='absolute bottom-6 left-6 text-[32px] leading-[1.2] font-bold text-[#191c1e]'>
                원피스
              </h3>
            </Link>
          </div>
        </section>

        <section className='mb-16 px-5'>
          <div className='mb-8 flex items-end justify-between'>
            <h2 className='text-[32px] leading-[1.2] font-bold text-[#191c1e]'>
              현재 인기 있는 카드
            </h2>
            <Link
              className='flex items-center gap-1 text-sm leading-none font-semibold text-[#bb001a] hover:underline'
              href='/cards'
            >
              모두 보기
              {/*<span className='material-symbols-outlined text-sm leading-none'>arrow_forward</span>*/}
            </Link>
          </div>

          <TrendingCardsGrid cards={trendingCards} />
        </section>

        <section className='mb-16 px-5'>
          <div className='rounded-[24px] bg-[#e6e8ea] p-12 text-center md:flex md:items-center md:justify-between md:text-left'>
            <div className='md:max-w-xl'>
              <h2 className='mb-4 text-[32px] leading-[1.2] font-bold text-[#191c1e]'>
                컬렉션 업그레이드
              </h2>
              <p className='mb-8 text-base leading-[1.5] font-normal text-[#535f73] md:mb-0'>
                실시간 시장 데이터, 포트폴리오 추적 및 원활한 탐색을 위해 TCGround를 신뢰하는 수천
                명의 수집가와 함께하세요.
              </p>
            </div>
            <Link
              className='inline-flex rounded-lg bg-[#bb001a] px-8 py-4 text-lg leading-none font-semibold whitespace-nowrap text-white shadow-sm transition-colors hover:bg-[#930012]'
              href='/login'
            >
              TCGround 가입하기
            </Link>
          </div>
        </section>
      </main>

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
    </div>
  );
}

export function TrendingCardsGrid({ cards }: { cards: readonly PokemonCatalogCard[] }) {
  if (cards.length === 0) {
    return (
      <div className='rounded-2xl bg-white p-12 text-center text-base text-[#535f73]'>
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
          className='group block cursor-pointer break-inside-avoid overflow-hidden rounded-2xl bg-white transition-transform duration-200 hover:scale-[1.02]'
        >
          <div className='relative'>
            {card.imageUrl ? (
              <img
                alt={`${card.name} 카드`}
                className='block aspect-[2.5/3.5] w-full object-cover'
                src={card.imageUrl}
              />
            ) : (
              <div className='flex aspect-[2.5/3.5] w-full items-center justify-center bg-[#e6e8ea]'>
                <span className='material-symbols-outlined text-[70px] leading-none text-[#bb001a] opacity-50'>
                  style
                </span>
              </div>
            )}
            <div className='absolute top-3 right-3 flex items-center gap-1 rounded-full border border-[#e6bdb9] bg-white/90 px-3 py-1 shadow-sm backdrop-blur-sm'>
              <span className='text-sm leading-none font-bold text-[#191c1e] tabular-nums'>
                {formatKrw(card.price.avgPrice)}
              </span>
            </div>
          </div>
          <div className='bg-white p-3'>
            <h4 className='truncate text-base leading-[1.5] font-bold text-[#191c1e]'>
              {card.name}
            </h4>
            <p className='mt-1 text-sm leading-none font-semibold text-[#535f73]'>
              {card.setName} · {card.rarity}
            </p>
          </div>
        </Link>
      ))}
    </div>
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
