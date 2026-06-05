import { PageFooter } from '@/components/tcg/layout/PageFooter';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';

/**
 * Instant navigation skeleton for the card detail route. Its presence also lets
 * Next.js prefetch this dynamic route (the App Router only prefetches dynamic
 * pages up to their nearest loading boundary), so clicking a card feels
 * immediate even before the server render lands.
 */
export default function CardDetailLoading() {
  return (
    <div className='flex min-h-screen flex-col bg-background text-foreground'>
      <PublicHeader currentPath='/cards' search={{ desktopOnly: true }} />

      <main className='mx-auto w-full max-w-[1440px] flex-grow px-5 pt-6 pb-16 md:px-16'>
        <div className='mb-8 h-5 w-40 animate-pulse rounded bg-muted' />

        <section className='mb-16 grid grid-cols-1 gap-12 lg:grid-cols-12'>
          <div className='lg:col-span-5'>
            <div className='mx-auto aspect-[2.5/3.5] w-full max-w-md animate-pulse rounded-[32px] bg-card' />
          </div>

          <div className='flex flex-col gap-6 lg:col-span-7'>
            <div className='flex flex-col gap-3'>
              <div className='flex gap-2'>
                <div className='h-7 w-20 animate-pulse rounded-full bg-muted' />
                <div className='h-7 w-24 animate-pulse rounded-full bg-muted' />
              </div>
              <div className='h-12 w-3/4 animate-pulse rounded bg-muted' />
              <div className='h-8 w-1/2 animate-pulse rounded bg-muted' />
            </div>

            <div className='h-12 w-56 animate-pulse rounded-lg bg-card' />

            <div className='flex flex-col gap-4 rounded-2xl bg-card p-8'>
              <div className='h-3 w-24 animate-pulse rounded bg-muted' />
              <div className='h-12 w-48 animate-pulse rounded bg-muted' />
              <div className='mt-4 flex gap-8 border-t border-border pt-4'>
                <div className='h-10 w-28 animate-pulse rounded bg-muted' />
                <div className='h-10 w-28 animate-pulse rounded bg-muted' />
              </div>
            </div>

            <div className='h-28 animate-pulse rounded-2xl bg-card' />
          </div>
        </section>
      </main>

      <PageFooter />
    </div>
  );
}
