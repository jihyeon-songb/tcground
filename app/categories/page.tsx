import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import { tcgCategories, type TcgCategory } from '@/lib/tcg-data';

export const metadata: Metadata = {
  title: 'TCGround | 카테고리',
  description: '포켓몬, 매직 더 개더링, 유희왕, 원피스 카테고리별 카드 시세를 탐색하세요.',
};

export default function CategoriesPage() {
  return (
    <div className='flex min-h-screen flex-col bg-[#f8f9fb] text-[#191c1e]'>
      <PublicHeader currentPath='/categories' search={{ desktopOnly: true }} />

      <main className='mx-auto w-full max-w-[1440px] flex-grow px-5 pb-16'>
        <section className='pt-10 pb-8'>
          <p className='mb-3 text-sm leading-none font-bold tracking-wider text-[#bb001a] uppercase'>
            TCG 카테고리
          </p>
          <h1 className='max-w-3xl text-4xl leading-[1.1] font-extrabold text-[#191c1e] md:text-[56px]'>
            게임별로 카드 시장을 탐색하세요
          </h1>
          <p className='mt-5 max-w-2xl text-lg leading-[1.6] text-[#535f73]'>
            관심 있는 TCG를 선택해 세트, 레어도, 인기 카드 흐름을 이어서 확인하세요.
          </p>
        </section>

        <CategoryOverviewList categories={tcgCategories} />
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
        <FooterColumn title='게임' links={['포켓몬', '매직 더 개더링', '유희왕', '원피스']} />
        <FooterColumn title='법적 고지' links={['개인정보 처리방침', '이용약관', '채용정보']} />
      </footer>
    </div>
  );
}

export function CategoryOverviewList({ categories }: { categories: readonly TcgCategory[] }) {
  return (
    <section aria-labelledby='categories-heading'>
      <div className='mb-5 flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h2 id='categories-heading' className='text-[32px] leading-[1.2] font-bold'>
            전체 카테고리
          </h2>
          <p className='mt-2 text-base leading-[1.5] text-[#535f73]'>
            주요 TCG 시장을 한눈에 비교하고 관심 카테고리로 이동하세요.
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4'>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={category.href}
            className='group flex min-h-64 flex-col justify-between rounded-2xl border border-[#e0e3e5] bg-white p-6 shadow-sm transition-transform duration-200 hover:scale-[1.01] hover:shadow-md'
          >
            <div>
              <div className='mb-5 flex items-center justify-between gap-3'>
                <span className='rounded-full bg-[#f2f4f6] px-3 py-1 text-xs font-bold tracking-wider text-[#535f73] uppercase'>
                  {category.id}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${momentumClass(category.momentum)}`}
                >
                  {momentumLabel(category.momentum)}
                </span>
              </div>
              <h3 className='text-3xl leading-[1.15] font-extrabold text-[#191c1e]'>
                {category.name}
              </h3>
              <p className='mt-3 text-base leading-[1.5] text-[#535f73]'>{category.label}</p>
            </div>

            <dl className='mt-8 grid grid-cols-2 gap-3 border-t border-[#e6e8ea] pt-5'>
              <div>
                <dt className='text-xs font-semibold tracking-wider text-[#535f73] uppercase'>
                  추적 카드
                </dt>
                <dd className='mt-1 text-2xl font-bold tabular-nums'>
                  {category.cardCount.toLocaleString('ko-KR')}
                </dd>
              </div>
              <div>
                <dt className='text-xs font-semibold tracking-wider text-[#535f73] uppercase'>
                  세트
                </dt>
                <dd className='mt-1 text-2xl font-bold tabular-nums'>{category.trackedSets}</dd>
              </div>
            </dl>
          </Link>
        ))}
      </div>
    </section>
  );
}

function momentumLabel(momentum: TcgCategory['momentum']) {
  if (momentum === 'up') return '상승';
  if (momentum === 'down') return '하락';
  return '보합';
}

function momentumClass(momentum: TcgCategory['momentum']) {
  if (momentum === 'up') return 'bg-[#e8f5e9] text-[#2e7d32]';
  if (momentum === 'down') return 'bg-[#ffebee] text-[#c62828]';
  return 'bg-[#e6e8ea] text-[#535f73]';
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
