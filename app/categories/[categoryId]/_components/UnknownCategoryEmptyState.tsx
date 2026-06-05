import { PackageOpen } from 'lucide-react';
import Link from 'next/link';

export function UnknownCategoryEmptyState({ label }: { label: string }) {
  return (
    <section
      aria-live='polite'
      className='flex flex-col items-center justify-center gap-3 rounded-2xl bg-card px-6 py-16 text-center'
    >
      <PackageOpen className='size-12 text-tcg-red' aria-hidden />
      <h2 className='text-2xl leading-tight font-bold text-foreground'>
        {label} 카테고리는 아직 준비 중입니다
      </h2>
      <p className='max-w-md text-base leading-[1.5] text-muted-foreground'>
        새로운 카드가 등록되는 대로 이곳에서 확인하실 수 있습니다.
      </p>
      <Link
        href='/'
        className='mt-2 inline-flex items-center gap-1 rounded-lg bg-tcg-red px-6 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-tcg-red-dark'
      >
        다른 카테고리 보기
      </Link>
    </section>
  );
}
