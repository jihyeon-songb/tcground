/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';

export const metadata: Metadata = {
  title: 'TCGround | 검색 결과',
  description: '검색어와 일치하는 트레이딩 카드 목록과 가격 요약을 확인하세요.',
};

interface SearchResultCard {
  name: string;
  setLabel: string;
  condition: string;
  price: string;
  changeRate: string;
  changeTone: 'up' | 'down' | 'flat';
  alt: string;
  href: string;
  src: string;
}

const filterChips = ['Holo', 'Base Set', 'PSA 10'];

const searchResults: SearchResultCard[] = [
  {
    name: 'Charizard - Base Set Unlimited',
    setLabel: 'Holo Rare',
    condition: 'PSA 9 Mint',
    price: '$3,500.00',
    changeRate: '+2.4%',
    changeTone: 'up',
    alt: 'Charizard Base Set Unlimited 홀로 카드',
    href: '/cards/charizard-base-set-unlimited',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBYS-LhXZpBukmU1NgqxaeyukgCZAUPkuhEKYHfRPO_gsX8Rq90BvKOByJ_4ZWGpO_ae-20NgiQJxCNlHSglxz2g_IvYzC4TEbTZMGxAgCrYurjmraZ69XfghkjKUj50lGnbo7cNhaZUV0uIoOKCnfZe6P52_i4oGA87AjcCCakej11ywffQElLE-UYnFxL4Jwd7vgLhMgcnCo2AD4bOGlZVojLmPAT-ODNlit2UzlcddaHU2e1RBJmPi8_hzADFJqX0NrmkCI1sn6m',
  },
  {
    name: 'Shiny Charizard VMAX',
    setLabel: 'Shining Fates',
    condition: 'Raw - Near Mint',
    price: '$245.50',
    changeRate: '-1.2%',
    changeTone: 'down',
    alt: 'Shiny Charizard VMAX 카드',
    href: '/cards/shiny-charizard-vmax',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3LM93ijpzI7vKJcWPB1S8VIhQWXB3MQi64uTvTe3D8Zt29qjd6puBdbBOCE7HRhILBE7iVN-DxAHphw-00L-dEgMCMdla6zZju1snUO3m4LTtocRhUa1sLwMMVs1_s2uLP60OWWA3slLQpQetu0H3RWErGRxyipLBXda-x7WXkTMRbl18RFHq9eIMBFRaQsnu3lv_ZH52pss2BeBLVazuHFy5VmElPhGmcRlDVA4Nzva7W09xUmaYSqacvMP0Dky03o0oa-FxoBFi',
  },
  {
    name: 'Charizard - 1st Edition Base Set',
    setLabel: 'Shadowless Holo Rare',
    condition: 'PSA 10 Gem Mint',
    price: '$350,000.00',
    changeRate: '+15.0%',
    changeTone: 'up',
    alt: '1st Edition Base Set Charizard 카드',
    href: '/cards/charizard-1st-edition-base-set',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCBxICAKvJhqWcPpNBiRs8EQeLuLDF_hc0KrSkV3mJV4uagCyZ2TZzuO8K_zJFgP5Vnd_gPBjK678nn8aXl_e4A9Q5IGiHoqxRD912HhHLkZqKAeTSH7hywaAObBq6rACIZhngzf_kfSbgsNNPt7obtuAhdKFruLSEYK-yPihsa1mpJTJFhJsKaIlcxVMCcyDVDr1PdpHhvkwgBMHIWfraCF3LkfB8px88kCITxfBf407Akhje19LZ-RKCwR_PRq36wFxxOfQE_y66F',
  },
  {
    name: 'Charizard Gold Star',
    setLabel: 'Dragon Frontiers',
    condition: 'Raw - Lightly Played',
    price: '$2,100.00',
    changeRate: '0.0%',
    changeTone: 'flat',
    alt: 'Charizard Gold Star 카드',
    href: '/cards/charizard-gold-star',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4hpikgj2hAVzn5YlrKl5rKyI_Jm6tufkreCDaFA3mjyRT5lhMI6tWSY5Jd6z-gFbDB7eVNkHq7WMuhsb5TxwsrSiQpvZrNzzIhKJLFQh9jXtNT6UL3VFkEZA8q-LOUXxDX9RYPOXPZkbGubt5yPfMblg8jYZhIKrM3yceA7es58sXvAywHYNDYFCju56QQslKwC4OcJuVk3I1djldjiHi0DgkutTr3BKTmfX91xkVnU5Hqo0VyYCCaCC6KgkTDeKk28ThJO_o16FA',
  },
  {
    name: 'Charizard EX Full Art',
    setLabel: 'Flashfire',
    condition: 'Raw - Near Mint',
    price: '$125.00',
    changeRate: '-0.5%',
    changeTone: 'down',
    alt: 'Charizard EX Full Art 카드',
    href: '/cards/charizard-ex-full-art',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMTorXQD7PpcmtLco9D1W-P7MVBuLxOst2w14ePAy2nwCJq8vO4OsicbxdE-YbuPIESOQiVSiXvt1LxYH_pD-jahx91145J5gv_e9VrfsaksZAZIjvtM295S4Zw1hcu9eEXBuLv6PKi27C4WLmJtc0P6GrjZnbN7LjS1lioFA-MthC5i4D1ELGdGPyYhDObYgX0YWGiJ49SLsPVJ_ttaSS-c9SxBVHjoeCjOXxlCC_eABrYCIP8bMYydeDjOveulM12ZD4AeJXi6a4',
  },
  {
    name: 'Dark Charizard',
    setLabel: 'Team Rocket Holo',
    condition: 'CGC 8.5 NM/Mint+',
    price: '$450.00',
    changeRate: '+5.2%',
    changeTone: 'up',
    alt: 'Dark Charizard Team Rocket 홀로 카드',
    href: '/cards/dark-charizard',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxBnGk31d0sbh6SuyiYQjKnWc-5qcXVVHRCpLvxNrK9mI7sMVnAGUV6Uqt2RcR-ud2mitedIPZG4zPdJH7-DWc59etIX0293Gm_DEuLiLX4b-bsRWBRRABCt0VfrVTbXX2tVUTrH-SA-6ZAP_IJSuUIH_XVN-g5TFhRrfy_3p6wS3iH1likzciiqtxYdqq8H0T7w5FnAB-QIdHc7DaAabNlBkgjBhtQsemblzqCDWLIFI2f1pciz9Nr4qBMF5x1VDk1t6Lw3D6DTku',
  },
];

interface SearchPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams;
  const rawQuery = resolvedParams.q;
  const queryValue = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;
  const query = (queryValue ?? '').trim();
  const hasQuery = query.length > 0;
  const resultCount = hasQuery ? searchResults.length : 0;
  const currentPath = hasQuery ? `/search?q=${encodeURIComponent(query)}` : '/search';

  return (
    <div className='flex min-h-screen flex-col bg-[#f8f9fb] text-[#191c1e]'>
      <PublicHeader
        currentPath={currentPath}
        search={{ initialQuery: query, showClearButton: true }}
      />

      <main className='mx-auto w-full max-w-[1440px] flex-grow px-5 pb-16'>
        <div className='sticky top-[72px] z-40 mb-6 flex flex-col justify-between gap-4 bg-[#f8f9fb]/95 py-4 backdrop-blur-sm md:flex-row md:items-center'>
          <div className='scrollbar-hide flex items-center gap-2 overflow-x-auto pb-2 md:pb-0'>
            <button
              type='button'
              className='flex items-center gap-1 rounded-full bg-[#eceef0] px-4 py-2 text-sm leading-none font-semibold whitespace-nowrap text-[#191c1e] shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors hover:bg-[#e6e8ea]'
            >
              필터
            </button>
            <span className='mx-2 h-6 w-px bg-[#d7e3fb]' aria-hidden />
            <button
              type='button'
              aria-pressed='true'
              className='rounded-full bg-[#bb001a] px-4 py-2 text-sm leading-none font-semibold whitespace-nowrap text-white'
            >
              포켓몬
            </button>
            {filterChips.map((chip) => (
              <button
                key={chip}
                type='button'
                className='rounded-full bg-[#eceef0] px-4 py-2 text-sm leading-none font-semibold whitespace-nowrap text-[#191c1e] shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors hover:bg-[#e6e8ea]'
              >
                {chip}
              </button>
            ))}
            <button
              type='button'
              className='flex items-center gap-1 rounded-full bg-[#eceef0] px-4 py-2 text-sm leading-none font-semibold whitespace-nowrap text-[#191c1e] shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors hover:bg-[#e6e8ea]'
            >
              가격: 높은순
            </button>
          </div>
          <div className='text-base leading-[1.5] font-bold text-[#191c1e]'>
            {hasQuery ? (
              <>
                <span className='font-bold'>{`'${query}'`}</span>에 대한{' '}
                <span className='font-bold'>{resultCount}</span>개 결과
              </>
            ) : (
              '검색어를 입력하세요'
            )}
          </div>
        </div>

        {hasQuery ? (
          <div className='columns-2 gap-2 sm:columns-3 lg:columns-4 xl:columns-5'>
            {searchResults.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className='group mb-2 block cursor-pointer break-inside-avoid overflow-hidden rounded-lg bg-white transition-transform duration-300 hover:scale-[1.01]'
              >
                <div className='relative'>
                  <img alt={card.alt} className='block h-auto w-full object-cover' src={card.src} />
                  <div className='absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-sm leading-none font-bold text-[#191c1e] shadow-sm backdrop-blur-md'>
                    {card.price}
                  </div>
                  <button
                    type='button'
                    aria-label={`${card.name} 관심 카드에 추가`}
                    className='absolute top-3 right-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[#535f73] opacity-0 shadow-sm backdrop-blur-md transition-opacity group-hover:opacity-100 hover:text-[#bb001a]'
                  >
                    <span
                      className='material-symbols-outlined text-[18px] leading-none'
                      aria-hidden
                    >
                      favorite
                    </span>
                  </button>
                </div>
                <div className='flex flex-col gap-1 p-3'>
                  <h3 className='text-base leading-tight font-bold text-[#191c1e]'>{card.name}</h3>
                  <div className='mt-1 flex items-center justify-between'>
                    <span className='text-sm leading-none font-semibold text-[#535f73]'>
                      {card.setLabel}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        card.changeTone === 'up'
                          ? 'bg-[#00657a] text-white'
                          : card.changeTone === 'down'
                            ? 'bg-[#ba1a1a] text-white'
                            : 'bg-[#e0e3e5] text-[#5c3f3d]'
                      }`}
                    >
                      {card.changeRate}
                    </span>
                  </div>
                  <div className='mt-2 text-sm leading-none font-semibold text-[#bbc7de]'>
                    {card.condition}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <section
            aria-live='polite'
            className='flex flex-col items-center justify-center gap-3 rounded-2xl bg-white px-6 py-16 text-center'
          >
            <span
              className='material-symbols-outlined text-[48px] leading-none text-[#bb001a]'
              aria-hidden
            >
              search
            </span>
            <h2 className='text-2xl leading-tight font-bold text-[#191c1e]'>
              찾고 있는 카드가 있나요?
            </h2>
            <p className='max-w-md text-base leading-[1.5] font-normal text-[#535f73]'>
              상단 검색창에 카드 명칭, 세트 또는 캐릭터를 입력하면 가격 정보를 확인할 수 있습니다.
            </p>
          </section>
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
