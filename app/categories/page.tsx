import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import { getTcgCategoryOverview, type TcgCategoryOverview } from '@/lib/tcg-catalog';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'TCGround | 카테고리',
  description: '포켓몬, 매직 더 개더링, 유희왕, 원피스 카테고리별 카드 시세를 탐색하세요.',
};

const CATEGORY_VISUALS: Record<
  string,
  {
    imageUrl?: string;
    label: string;
    fallbackClass: string;
    icon: string;
  }
> = {
  pokemon: {
    label: 'Pokemon',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBRogrJvcZ6wzWmloM0IbmCShi2zsvELtqXK5ARMK52XwdDm8FyOkxN_FKpxMt6QEGxNWMDowfxiziuZ3LdUdceWVovo7jzGFB0ut8eLKzA5Byqky8dFymrcJs2bwKXOM5DVB-6dBfhzX8VJ9wGYZ4ALUapH-H15w8XDL9ueVjSq1nK1sQI76EH3UZN_x_yn_l491scjPXFtuBFKaxDeyIR4Qrvpra8fwT3gdrKGqsYauPFe1PskSUdK9oRl_MF1sqKeuNfORV6-Gwx',
    fallbackClass: 'from-[#18263a] via-[#425d74] to-[#e65845]',
    icon: 'style',
  },
  yugioh: {
    label: 'Yu-Gi-Oh',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBOQuv5uh9ovaQyWEHitOMAl6ecugPX5N3C0lxhKchEIRriFUW8dMqnppvezvo7gcWcHDwC04_82N6--X9_p1b9ACfTW3RqAygKMLCm2LrIj7mttEKTAzNdC9Q3LFgbvVDDA8BpxjYn5mendig8-c65YIsWHejx4JEc5SWLTVb9Y9gY43SbgwWKhvkqjY9LIoMDrUhmOPoQyrfo6G_hpNDQky3LWU0bwIPWLJr0LUKzGmWw-30pXe0nJlSAIMmjURanTvIq7PrKd-cB',
    fallbackClass: 'from-[#211624] via-[#60455e] to-[#c7a65a]',
    icon: 'auto_awesome',
  },
  'one-piece': {
    label: 'One Piece',
    imageUrl: '/categories/one-piece.jpg',
    fallbackClass: 'from-[#113042] via-[#1b6a7a] to-[#e2b05f]',
    icon: 'sailing',
  },
  magic: {
    label: 'Magic',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA36JScoXTFa2-iZ73Dx527OjCHPDtpqOH_HY3m1JPb93oQ8qNzObcbSPkxjAfA_I0Q2MllLUx6tuxcxZUYZeEmWR1EooA3QZ2m2WWDAj2QCCCv3LmCj26TNvK9wvi0OdSeKgE3UXYTFSq8F88iyxCSg-0bhzU95OWCsr4PcvRRED856Vb8_987cBfqoKMY9glsp1l7uap6c9Z9jX16zMIRgCXW6PB3UKFEYt3HJQ8A5k8Tw73MaJXoKfwLdz8qDcdrR5dA2iH2b4X6',
    fallbackClass: 'from-[#1d2930] via-[#53605a] to-[#c87f3f]',
    icon: 'local_fire_department',
  },
};

export default async function CategoriesPage() {
  const categories = await getCategoriesForPage();
  const totals = summarizeCategories(categories);

  return (
    <div className='flex min-h-screen flex-col bg-[#f4f5f2] text-[#191c1e]'>
      <PublicHeader currentPath='/categories' search={{ desktopOnly: true }} />

      <main className='mx-auto w-full max-w-[1440px] flex-grow px-5 pb-16'>
        <section className='grid gap-8 pt-10 pb-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end'>
          <div>
            <p className='mb-3 text-sm leading-none font-bold tracking-wider text-[#bb001a] uppercase'>
              카테고리
            </p>
            <h1 className='max-w-3xl text-4xl leading-[1.05] font-extrabold text-[#191c1e] md:text-[56px]'>
              대분류별로 카드 시장을 탐색하세요
            </h1>
            <p className='mt-5 max-w-2xl text-lg leading-[1.6] text-[#535f73]'>
              포켓몬, 유희왕, 원피스, 매직 더 개더링을 기본으로 보여주고 Supabase에 연결된 실제
              카드·세트·가격 기록 수만 집계합니다.
            </p>
          </div>

          <CategorySummary totals={totals} />
        </section>

        <CategoryOverviewList categories={categories} />
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

async function getCategoriesForPage(): Promise<TcgCategoryOverview[]> {
  try {
    return await getTcgCategoryOverview();
  } catch (error) {
    console.error('Failed to load category overview', error);
    return [];
  }
}

export function CategoryOverviewList({
  categories,
}: {
  categories: readonly TcgCategoryOverview[];
}) {
  if (categories.length === 0) {
    return <EmptyCategoryOverviewState />;
  }

  return (
    <section aria-labelledby='categories-heading'>
      <div className='mb-5 flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h2 id='categories-heading' className='text-[28px] leading-[1.2] font-bold'>
            대분류 카테고리
          </h2>
          <p className='mt-2 text-base leading-[1.5] text-[#535f73]'>
            데이터가 아직 없는 카테고리는 0으로 표시하고, 들어온 카탈로그는 자동 집계합니다.
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4'>
        {categories.map((category) => {
          const visual = getCategoryVisual(category.slug);

          return (
            <Link
              key={category.slug}
              href={category.href}
              aria-label={`${category.name} 카테고리 열기`}
              className='group relative flex min-h-[380px] overflow-hidden rounded-xl bg-[#111827] shadow-sm ring-1 ring-black/5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg'
            >
              {visual.imageUrl ? (
                <Image
                  src={visual.imageUrl}
                  alt=''
                  fill
                  sizes='(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw'
                  className='object-cover transition-transform duration-500 group-hover:scale-105'
                />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${visual.fallbackClass}`}>
                  <span
                    className='material-symbols-outlined absolute right-6 bottom-8 text-[112px] leading-none text-white/20'
                    aria-hidden
                  >
                    {visual.icon}
                  </span>
                </div>
              )}
              <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/10' />

              <div className='relative flex w-full flex-col justify-between p-5 text-white'>
                <div>
                  <div className='mb-5 flex items-start justify-between gap-3'>
                    <span className='rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-[0.18em] uppercase backdrop-blur-sm'>
                      {visual.label}
                    </span>
                    <span className='flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-sm'>
                      <span className={`h-2 w-2 rounded-full ${statusDotClass(category.status)}`} />
                      {category.statusLabel}
                    </span>
                  </div>
                  <h3 className='text-3xl leading-[1.05] font-extrabold md:text-[34px]'>
                    {category.name}
                  </h3>
                  <p className='mt-3 line-clamp-3 text-base leading-[1.5] text-white/80'>
                    {category.description}
                  </p>
                </div>

                <div>
                  <dl className='grid grid-cols-3 gap-2 rounded-lg bg-white/12 p-3 backdrop-blur-md'>
                    <div>
                      <dt className='text-[11px] font-bold tracking-wider text-white/65'>카드</dt>
                      <dd className='mt-1 text-xl font-extrabold tabular-nums'>
                        {category.cardCount.toLocaleString('ko-KR')}
                      </dd>
                    </div>
                    <div>
                      <dt className='text-[11px] font-bold tracking-wider text-white/65'>세트</dt>
                      <dd className='mt-1 text-xl font-extrabold tabular-nums'>
                        {category.setCount.toLocaleString('ko-KR')}
                      </dd>
                    </div>
                    <div>
                      <dt className='text-[11px] font-bold tracking-wider text-white/65'>가격</dt>
                      <dd className='mt-1 text-xl font-extrabold tabular-nums'>
                        {category.priceSnapshotCount.toLocaleString('ko-KR')}
                      </dd>
                    </div>
                  </dl>

                  <div className='mt-4 flex items-center justify-between text-sm font-bold text-white'>
                    <span>탐색하기</span>
                    <span
                      className='material-symbols-outlined text-[18px] leading-none transition-transform group-hover:translate-x-1'
                      aria-hidden
                    >
                      <svg
                        width='20'
                        height='20'
                        viewBox='0 0 24 24'
                        fill='currentColor'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <path d='M5.87988 4.12L13.7599 12L5.87988 19.88L7.99988 22L17.9999 12L7.99988 2L5.87988 4.12Z' />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function summarizeCategories(categories: readonly TcgCategoryOverview[]) {
  return {
    categoryCount: categories.length,
    cardCount: categories.reduce((sum, category) => sum + category.cardCount, 0),
    setCount: categories.reduce((sum, category) => sum + category.setCount, 0),
    liveCount: categories.filter((category) => category.status === 'live').length,
  };
}

function CategorySummary({ totals }: { totals: ReturnType<typeof summarizeCategories> }) {
  return (
    <aside
      aria-label='카테고리 데이터 요약'
      className='rounded-lg border border-[#dfe3e6] bg-white p-5 shadow-sm'
    >
      <p className='text-sm font-bold text-[#667085]'>실데이터 집계</p>
      <dl className='mt-5 grid grid-cols-2 gap-x-5 gap-y-4'>
        <div>
          <dt className='text-xs font-semibold text-[#667085]'>카테고리</dt>
          <dd className='mt-1 text-3xl font-extrabold tabular-nums'>
            {totals.categoryCount.toLocaleString('ko-KR')}
          </dd>
        </div>
        <div>
          <dt className='text-xs font-semibold text-[#667085]'>가격 추적 중</dt>
          <dd className='mt-1 text-3xl font-extrabold tabular-nums'>
            {totals.liveCount.toLocaleString('ko-KR')}
          </dd>
        </div>
        <div>
          <dt className='text-xs font-semibold text-[#667085]'>등록 카드</dt>
          <dd className='mt-1 text-3xl font-extrabold tabular-nums'>
            {totals.cardCount.toLocaleString('ko-KR')}
          </dd>
        </div>
        <div>
          <dt className='text-xs font-semibold text-[#667085]'>등록 세트</dt>
          <dd className='mt-1 text-3xl font-extrabold tabular-nums'>
            {totals.setCount.toLocaleString('ko-KR')}
          </dd>
        </div>
      </dl>
    </aside>
  );
}

function EmptyCategoryOverviewState() {
  return (
    <section
      aria-live='polite'
      className='rounded-lg border border-[#dfe3e6] bg-white px-6 py-16 text-center shadow-sm'
    >
      <h2 className='text-2xl leading-tight font-bold text-[#191c1e]'>
        연결된 카테고리가 없습니다
      </h2>
      <p className='mx-auto mt-3 max-w-md text-base leading-[1.5] text-[#535f73]'>
        Supabase 카탈로그에 게임 데이터가 추가되면 이곳에 카테고리별 집계가 표시됩니다.
      </p>
    </section>
  );
}

function statusDotClass(status: TcgCategoryOverview['status']) {
  if (status === 'live') return 'bg-[#16a34a]';
  if (status === 'catalog-only') return 'bg-[#facc15]';
  return 'bg-[#f97316]';
}

function getCategoryVisual(slug: string) {
  return (
    CATEGORY_VISUALS[slug] ?? {
      label: slug,
      fallbackClass: 'from-[#1f2937] via-[#475569] to-[#bb001a]',
      icon: 'style',
    }
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
