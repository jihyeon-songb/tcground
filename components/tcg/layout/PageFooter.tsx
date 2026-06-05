import Image from 'next/image';
import Link from 'next/link';

interface FooterColumn {
  title: string;
  links: string[];
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  { title: '플랫폼', links: ['소개', '지원', 'API 문서'] },
  { title: '게임', links: ['포켓몬', '매직: 더 개더링', '유희왕!'] },
  { title: '법적 고지', links: ['개인정보 처리방침', '이용약관', '채용정보'] },
];

interface PageFooterProps {
  /** Column definitions. Defaults to the standard platform/games/legal set. */
  columns?: FooterColumn[];
}

/** Shared site footer used across the public marketing/catalog pages. */
export function PageFooter({ columns = DEFAULT_COLUMNS }: PageFooterProps) {
  return (
    <footer className='mt-auto grid w-full gap-5 bg-muted px-5 py-16 md:grid-cols-4 md:px-16'>
      <div className='col-span-1 mb-8 md:mb-0'>
        <Image
          src='/logo-transparent.png'
          alt='TCGround Logo'
          width={172}
          height={40}
          className='mb-4 h-8 w-auto object-contain'
        />
        <p className='text-base leading-[1.5] font-normal text-muted-foreground'>
          © 2024 TCGround. 수집가를 위한 큐레이션 플랫폼.
        </p>
      </div>
      {columns.map((column) => (
        <FooterColumn key={column.title} title={column.title} links={column.links} />
      ))}
    </footer>
  );
}

function FooterColumn({ title, links }: FooterColumn) {
  return (
    <div className='flex flex-col gap-3'>
      <h4 className='mb-2 text-sm leading-none font-bold tracking-wider text-foreground uppercase'>
        {title}
      </h4>
      {links.map((link) => (
        <Link
          key={link}
          className='text-base leading-[1.5] font-normal text-muted-foreground underline transition-colors hover:text-tcg-red'
          href='#'
        >
          {link}
        </Link>
      ))}
    </div>
  );
}
