/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicHeader } from '@/components/tcg/PublicHeader';

interface BentoSet {
  title: string;
  caption?: string;
  href: string;
  alt: string;
  src: string;
  size: 'lg' | 'sm';
}

interface CategoryCard {
  name: string;
  meta: string;
  price: string;
  changeRate: string;
  changeTone: 'up' | 'down' | 'flat';
  alt: string;
  href: string;
  src: string;
  imageClassName?: string;
}

interface RarityFilter {
  label: string;
  defaultChecked?: boolean;
}

interface EraFilter {
  label: string;
  defaultChecked?: boolean;
}

interface CategoryDefinition {
  title: string;
  heroTitle: string;
  description: string;
  breadcrumbLabel: string;
  rarityFilters: RarityFilter[];
  eraFilters: EraFilter[];
  popularSets: BentoSet[];
  trendingCards: CategoryCard[];
}

const CATEGORY_DATA: Record<string, CategoryDefinition> = {
  pokemon: {
    title: 'TCGround | 포켓몬 카테고리',
    heroTitle: '포켓몬 TCG',
    breadcrumbLabel: '포켓몬',
    description:
      '포켓몬 트레이딩 카드 게임의 세계를 탐험하세요. 향수를 자극하는 베이스 세트부터 최신 확장팩까지, 시세를 추적하고 컬렉션을 완성하며 좋아하는 캐릭터의 일러스트를 즐겨보세요.',
    rarityFilters: [
      { label: 'Common' },
      { label: 'Uncommon' },
      { label: 'Rare Holo', defaultChecked: true },
      { label: 'Ultra Rare' },
    ],
    eraFilters: [
      { label: 'Wizards of the Coast' },
      { label: 'EX Series' },
      { label: 'Sun & Moon' },
      { label: 'Sword & Shield', defaultChecked: true },
    ],
    popularSets: [
      {
        title: 'Base Set',
        caption: '모든 것의 시작. 1999.',
        href: '/categories/pokemon/base-set',
        alt: 'Pokemon Base Set 카드 컬렉션',
        size: 'lg',
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANY9OkOkAkQQFTHd-TNv52FTLSyASEYhjNBTBPXSL3fHt664ATTESh0w8h1X1fbDOvXivh2y9kyWva4nPnnf9vBW5ieBDPp4AaMjMohhNr25CjTILjiyCADxdGBaH-vkLBEJa-WduoXGwoUkWinXESQ_h2F8T1SxqgOL4dsHzpSJfCJzTFLpiBQ36jtrVdsoutA3SsdoPtAY6XAUWrygHconVng5wmnibjsDkSTsB3aHgkaKAlNb7GVpyYTJaQBp_aBqq9Bm1pkvLJ',
      },
      {
        title: 'Jungle',
        caption: '1999 확장팩',
        href: '/categories/pokemon/jungle',
        alt: 'Pokemon Jungle 확장팩 카드',
        size: 'lg',
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBeLSxwoVF93uBPKm1KpGeusr2djG6Fqd_ZrdqZ_gvFGiziqtdurJ5bqEPI1SamyUWq3zSztU1wSIIOIhYwwFYFkHqEWVxfbqrSnhhtQSm_5zSE8uVEwh1FxTJKj9zKUio9qNW5-M5jpo3GRzbejK_dxtoJuXdDWd53dI1vevRquKG5NlUqDUrroTPRneBnXdWcSFm7CqdngRd4pkGmSeGhw7HBJ8lpf9pw-Su9i1qfT-9V-f4DxWECR8Gr1J6OBXVXP--JWy6TDAcF',
      },
      {
        title: 'Fossil',
        href: '/categories/pokemon/fossil',
        alt: 'Pokemon Fossil 카드',
        size: 'sm',
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCb422nZNjbTzfLSCjBL5JsYX2RvyCTM9uonFhu2vcT3YjoRGrDW8hE7rtFP29YgtijEKjuQSetkA3Li2-cy5iApsos9yMEiaM6KWSdiAeVe0nwsFvlsCJNNxmea2GzBF-vM0c2F3nlWqeQ3GP3YQGmDIGlvq5zV2J1bRu70RLAABody1YNvo7pxGFcGqxxHtkFK8OgcyMwvMDafctbpSzr1PWp8v6br6Q_jZI9HZ2rjnn97rUA5rrIGkcG0Ne9KlvlbVVxAd3E02Y',
      },
      {
        title: 'Team Rocket',
        href: '/categories/pokemon/team-rocket',
        alt: 'Pokemon Team Rocket 카드',
        size: 'sm',
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmjSZtzMep2P1shsiEp834j56bOFyGJnY4yi4yjjSa_kxZTZ08To9JC7MBdPDpFLvsOaFiw7A9WTcFVZSjIfG4ZMfQbBH9frsTpPdI6ZWzNicBfD9Zt-QCGCeLOPFWxYktTKhFFwB7hggGjWAeT11OqoCUT9wn-y1emsrMr78LqNOVI64RVxjn3YICS7f071gtUvoYUbAZpM3YYh_0TZ5zheyutLvV0cvFB3kZIZwhsxorJ7BdJVsUqTeLOf7V0QdBOSyqbyWdA3NV',
      },
      {
        title: 'Sword & Shield',
        href: '/categories/pokemon/sword-shield',
        alt: 'Pokemon Sword & Shield 카드',
        size: 'sm',
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCt9O0MnaJzyDnnD-K-FtnyezFdV0x8bnxYbeR0SeiDI4hjCKRhczRrd3Sc_VIQMMSUhhspEPTDTe0C-PfWuV1E-Q82bJHJAvqbsVjuB_SDiwNHkateFV3YijMOjnDu-NU1LXTMm2IdQOdIEwsVYmA2ceZQLjmi30aH4Frjkw8QTyMwx3Wgsy0S97xQXMo3nT111VhgOCnxlkUFrC72M5GhN_zYUe1ww64jvzuuzuSlb3Svxx5BtT0FBp03RjNxs5hkgtoqu1BT1N0k',
      },
    ],
    trendingCards: [
      {
        name: 'Charizard - Holo',
        meta: 'Base Set • 1999',
        price: '$2,450.00',
        changeRate: '+12.5%',
        changeTone: 'up',
        alt: 'Charizard Holo 카드',
        href: '/cards/charizard-base-set-holo',
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKn-Mr7UjGA03woVVGA5xY3aQcitp_KW0O1Q1hC4VY5AyAkf3Kxlp0oWMtrJjN7sapzvGvK9rZPx2SjjLryHQv5WTdvMFDuN_Mu2VXwGTWW5Wo-mFmWFhwMKFodqSf-5xK8z2KjM3ACjKuyBJpNq6h41j52j0CVX7D7InzrPTo-NlrF2EKHnZQq1nh6iCVb-SfCeAzPlMxrUTVuTaRYHiZeMDjqQsCZHm-U8WruK0C0mpD3xbyoLYFdLl5QmWtlvLnIew25ozMZBCa',
      },
      {
        name: 'Pikachu Illustrator',
        meta: 'Promo • 1998',
        price: '$5.2M',
        changeRate: '0.0%',
        changeTone: 'flat',
        alt: 'Pikachu Illustrator 카드',
        href: '/cards/pikachu-illustrator',
        imageClassName: 'aspect-[3/4]',
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBe3od5YQGPb49cSz-zAHNSnaI_cb2zzdGbbSLen20W4FXKcmVcvJqHaGAq47-14bbJAyIaJPz2pjEZiCwrxpwaiIXCvp1toK_PPWdGEIpAvnfyr37xfrbvlXNvVkul3rBMX4rI-VDlLODHSHfLQTpjlWqdV9j87-Nve3k6cDQeqAHbs-HxRZeJdJwhf48QsJQy_lWEa39HKQcuUMFtF9m-1ux1Gn9d4EIH30jlLdp6F8-QEhQ9CJS2DzLXK-ovBpKYvkZfeRD4WZgU',
      },
      {
        name: 'Blastoise - Holo',
        meta: 'Base Set • 1999',
        price: '$850.00',
        changeRate: '-2.1%',
        changeTone: 'down',
        alt: 'Blastoise Holo 카드',
        href: '/cards/blastoise-base-set-holo',
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvW6K--e3UnwZyKMJ9ByAbvA8leh_VQLkG3Vy97HjvrUj-X6NNQY95jlbdT3SOtBt8PX5uBvERG3bx5hvaNYidgmykhFGWrYBolvOWtqlV0skKojr2uR0RfcD52IAs76laeS8t4XK6VoVjAh424W1gjFvmEAIMsR3nrpROLgxVIDpZeM1Kua6H5iDe5pll3UqXlxj_dDa3eFKbrKn2cRmmndOuLPRd-tQIHuN2jIXK1wBBjNThnpcycdy-PfV9w5rKEuGx6E9Sy6Ux',
      },
      {
        name: 'Umbreon VMAX (Alt Art)',
        meta: 'Evolving Skies • 2021',
        price: '$620.00',
        changeRate: '+5.4%',
        changeTone: 'up',
        alt: 'Umbreon VMAX Alt Art 카드',
        href: '/cards/umbreon-vmax-alt-art',
        imageClassName: 'aspect-[4/5]',
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDLaeB38G2GutrIXVCOVeDMprVzdxlpK7oRxn_6SpcF4KE1-LNUcCIEsZnI-QZdDfWy9zzn8oCNyKyuzRWt7Ujy4jlyl7-FlS_-YenlnyoleFj14cltzo3kMwmLuKnwswRxvzTEH9cJixrn9lJYT_T2lmeWdpKzYJasUDHdSq_7VNDIHATSOQH5H-tFB0uZJ37KHs0zr-ZTd2RpgwXA-fWPf7muUyF2vZTMqyVEZxOaNRO8gM_4rwwr0hWxKII66Y14jgxmACIm4P4Y',
      },
      {
        name: 'Venusaur - Holo',
        meta: 'Base Set • 1999',
        price: '$720.00',
        changeRate: '+1.2%',
        changeTone: 'up',
        alt: 'Venusaur Holo 카드',
        href: '/cards/venusaur-base-set-holo',
        src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVdOKvflssvKpOE-VW5bUb2NY5psLonicQ8CXZFoHDMclISvG9yOJIX8XvBTneALoFLhG6Ff61iOWEHn2b2NvXex5qiBcnra4cDUDuGQDHtUj7WyuxikClbTqYxmvAwnWvaz2jv4mbrf5lSK6_9yprRSzZT4eqRyqWlJjeu2mMSXGd2IqO01BUMRi99iKZVtuMTmmmEgA7AmQOGjtEKr3cdtAknG02t3e4WOgqrR19maMXsG5hz5OUVspH7bsRHSAfyEvDgb4tnmB6',
      },
    ],
  },
};

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
  const category = CATEGORY_DATA[categoryId];

  if (category) {
    return {
      title: category.title,
      description: category.description,
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
  const category = CATEGORY_DATA[categoryId];
  const breadcrumbLabel = category?.breadcrumbLabel ?? KNOWN_CATEGORY_LABELS[categoryId] ?? null;

  if (!category && !breadcrumbLabel) {
    notFound();
  }

  return (
    <div className='flex min-h-screen flex-col bg-[#f8f9fb] text-[#191c1e]'>
      <PublicHeader currentPath={`/categories/${categoryId}`} search={{ desktopOnly: true }} />

      <main className='mx-auto w-full max-w-[1440px] flex-grow px-5 pb-16'>
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
          <span className='text-[#191c1e]'>{breadcrumbLabel ?? categoryId}</span>
        </nav>

        {category ? (
          <>
            <section className='mb-10 flex flex-col items-start gap-4'>
              <h1 className='text-4xl leading-[1.1] font-extrabold text-[#191c1e] md:text-[48px]'>
                {category.heroTitle}
              </h1>
              <p className='max-w-2xl text-lg leading-[1.6] text-[#535f73]'>
                {category.description}
              </p>
            </section>

            <div className='flex flex-col gap-6 lg:flex-row lg:gap-8'>
              <aside className='flex w-full shrink-0 flex-col gap-6 lg:w-64'>
                <FilterCard title='레어도'>
                  <div className='flex flex-col gap-3'>
                    {category.rarityFilters.map((rarity) => (
                      <label
                        key={rarity.label}
                        className='group flex cursor-pointer items-center gap-3'
                      >
                        <input
                          type='checkbox'
                          defaultChecked={rarity.defaultChecked}
                          className='h-5 w-5 rounded border-[#535f73] text-[#bb001a] focus:ring-[#bb001a]'
                        />
                        <span className='text-base text-[#191c1e] transition-colors group-hover:text-[#bb001a]'>
                          {rarity.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </FilterCard>

                <FilterCard title='시대'>
                  <div className='flex flex-col gap-3'>
                    {category.eraFilters.map((era) => (
                      <label
                        key={era.label}
                        className='group flex cursor-pointer items-center gap-3'
                      >
                        <input
                          type='radio'
                          name='era'
                          defaultChecked={era.defaultChecked}
                          className='h-5 w-5 border-[#535f73] text-[#bb001a] focus:ring-[#bb001a]'
                        />
                        <span className='text-base text-[#191c1e] transition-colors group-hover:text-[#bb001a]'>
                          {era.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </FilterCard>
              </aside>

              <div className='flex flex-1 flex-col gap-12'>
                <section aria-labelledby='popular-sets-heading'>
                  <div className='mb-6 flex items-center justify-between'>
                    <h2
                      id='popular-sets-heading'
                      className='text-[32px] leading-[1.2] font-bold text-[#191c1e]'
                    >
                      인기 세트
                    </h2>
                    <Link
                      href={`/categories/${categoryId}/sets`}
                      className='flex items-center gap-1 text-sm leading-none font-semibold text-[#bb001a] hover:underline'
                    >
                      모두 보기
                      <span
                        className='material-symbols-outlined text-[16px] leading-none'
                        aria-hidden
                      >
                        {/*arrow_forward*/}
                      </span>
                    </Link>
                  </div>

                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    {category.popularSets.map((set, index) => (
                      <Link
                        key={set.title}
                        href={set.href}
                        className={`group relative cursor-pointer overflow-hidden rounded-xl bg-white shadow-sm ${
                          set.size === 'lg'
                            ? `h-64 ${index === 0 ? 'md:col-span-2 lg:col-span-2' : ''}`
                            : 'h-48'
                        }`}
                      >
                        <img
                          alt={set.alt}
                          src={set.src}
                          className='absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                        />
                        <div
                          className={`absolute inset-0 ${
                            set.size === 'lg'
                              ? 'bg-gradient-to-t from-black/80 via-black/20 to-transparent'
                              : 'bg-gradient-to-t from-black/70 to-transparent'
                          }`}
                        />
                        <div
                          className={`absolute bottom-0 left-0 ${set.size === 'lg' ? 'p-6' : 'p-4'}`}
                        >
                          <h3
                            className={`font-bold text-white ${
                              set.size === 'lg' ? 'mb-1 text-2xl' : 'text-lg'
                            }`}
                          >
                            {set.title}
                          </h3>
                          {set.caption && set.size === 'lg' && (
                            <p className='text-base text-white/80'>{set.caption}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>

                <section aria-labelledby='trending-cards-heading'>
                  <h2
                    id='trending-cards-heading'
                    className='mb-6 text-[32px] leading-[1.2] font-bold text-[#191c1e]'
                  >
                    인기 카드
                  </h2>
                  {category.trendingCards.length === 0 ? (
                    <EmptyCardsState />
                  ) : (
                    <div className='columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4'>
                      {category.trendingCards.map((card) => (
                        <Link
                          key={card.href}
                          href={card.href}
                          className='group mb-5 block cursor-pointer break-inside-avoid overflow-hidden rounded-xl border border-[#e0e3e5] bg-white shadow-sm transition-all duration-200 hover:shadow-md'
                        >
                          <img
                            alt={card.alt}
                            src={card.src}
                            className={`block h-auto w-full object-cover ${card.imageClassName ?? ''}`}
                          />
                          <div className='p-4'>
                            <h3 className='line-clamp-1 text-lg leading-tight font-bold text-[#191c1e]'>
                              {card.name}
                            </h3>
                            <p className='mt-1 mb-3 text-sm font-medium text-[#535f73]'>
                              {card.meta}
                            </p>
                            <div className='flex items-center justify-between'>
                              <span className='text-2xl leading-none font-bold text-[#191c1e] tabular-nums'>
                                {card.price}
                              </span>
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-bold ${changeChipClass(
                                  card.changeTone,
                                )}`}
                              >
                                {card.changeRate}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        ) : (
          <UnknownCategoryEmptyState label={breadcrumbLabel ?? categoryId} />
        )}
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

function EmptyCardsState() {
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
      <h3 className='text-2xl leading-tight font-bold text-[#191c1e]'>
        이 카테고리에 등록된 카드가 없습니다
      </h3>
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
