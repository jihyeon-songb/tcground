import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function CategoryBreadcrumb({ label }: { label: string }) {
  return (
    <nav
      aria-label='Breadcrumb'
      className='mb-8 flex items-center gap-2 pt-6 text-sm font-semibold text-muted-foreground'
    >
      <Link href='/' className='transition-colors hover:text-tcg-red'>
        홈
      </Link>
      <ChevronRight className='size-4' aria-hidden />
      <Link href='/categories' className='transition-colors hover:text-tcg-red'>
        카테고리
      </Link>
      <ChevronRight className='size-4' aria-hidden />
      <span className='text-foreground'>{label}</span>
    </nav>
  );
}
