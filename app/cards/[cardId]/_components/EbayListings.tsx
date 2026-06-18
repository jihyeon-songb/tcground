'use client';

import { useState } from 'react';
import { Button } from '@tcground/ui';
import type { EbayListing } from '@/lib/tcg-catalog';
import { formatPrice } from '@/lib/tcg-data';

const PAGE_SIZE = 5;

interface EbayListingsProps {
  listings: EbayListing[];
  featuredIndex: number;
  /** Fallback single link (cheapest/search) used when no individual listings exist. */
  fallbackUrl?: string | null;
}

/**
 * eBay 판매중(즉시구매) 링크 목록. 평균가에 가장 가까운 1건을 대표로 보여주고,
 * 더보기로 나머지를 가격 낮은순 5개씩 펼친다.
 */
export function EbayListings({ listings, featuredIndex, fallbackUrl }: EbayListingsProps) {
  const [shown, setShown] = useState(0);

  if (listings.length === 0) {
    if (!fallbackUrl) return null;
    return (
      <a
        href={fallbackUrl}
        target='_blank'
        rel='noopener noreferrer'
        className='text-muted-foreground hover:text-foreground mt-2 inline-flex w-fit items-center gap-1 text-sm font-medium underline'
      >
        eBay에서 보기
      </a>
    );
  }

  const featured = listings[featuredIndex] ?? listings[0];
  // Everything except the featured listing, kept in price-ascending order.
  const rest = listings.filter((listing) => listing !== featured);
  const visible = rest.slice(0, shown);
  const remaining = rest.length - visible.length;

  return (
    <div className='mt-2 flex flex-col gap-3'>
      <a
        href={featured.url}
        target='_blank'
        rel='noopener noreferrer'
        className='border-border hover:border-foreground/30 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors'
      >
        <div className='flex flex-col gap-0.5'>
          <span className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
            평균가 판매중
          </span>
          <span className='text-foreground text-lg font-bold tabular-nums'>
            {formatPrice(featured.priceKrw, 'KRW')}
          </span>
          {featured.title && (
            <span className='text-muted-foreground line-clamp-1 text-xs'>{featured.title}</span>
          )}
        </div>
        <span className='text-muted-foreground shrink-0 text-sm font-medium underline'>
          eBay에서 보기
        </span>
      </a>

      {visible.length > 0 && (
        <ul className='flex flex-col gap-2'>
          {visible.map((listing) => (
            <li key={listing.url}>
              <a
                href={listing.url}
                target='_blank'
                rel='noopener noreferrer'
                className='hover:bg-muted/50 flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors'
              >
                <span className='text-foreground font-semibold tabular-nums'>
                  {formatPrice(listing.priceKrw, 'KRW')}
                </span>
                {listing.title && (
                  <span className='text-muted-foreground line-clamp-1 flex-1 text-xs'>
                    {listing.title}
                  </span>
                )}
                <span className='text-muted-foreground shrink-0 text-xs underline'>보기</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='w-fit'
          onClick={() => setShown((count) => count + PAGE_SIZE)}
        >
          더보기 ({remaining})
        </Button>
      )}
    </div>
  );
}
