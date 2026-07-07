import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MarketplaceLinks } from './MarketplaceLinks';

afterEach(cleanup);

const ebayFallback = {
  kind: 'search' as const,
  href: 'https://www.ebay.com/sch/i.html?_nkw=Charizard',
  sourceLabel: 'eBay',
  actionLabel: 'eBay에서 검색',
};

describe('MarketplaceLinks', () => {
  it('shows a verified eBay listing with its captured price', () => {
    render(
      <MarketplaceLinks
        listings={[{ url: 'https://www.ebay.com/itm/1', title: 'Charizard', priceKrw: 120000 }]}
        featuredIndex={0}
        fallback={ebayFallback}
      />,
    );

    expect(screen.getByRole('link', { name: /Charizard/ }).getAttribute('href')).toBe(
      'https://www.ebay.com/itm/1',
    );
    expect(screen.getByText('₩120,000')).toBeTruthy();
  });

  it('shows the actual fallback source without a fabricated price or eBay branding', () => {
    render(
      <MarketplaceLinks
        listings={[]}
        featuredIndex={-1}
        fallback={{
          kind: 'source',
          href: 'https://kream.co.kr/products/1',
          sourceLabel: 'KREAM',
          actionLabel: 'KREAM에서 보기',
        }}
      />,
    );

    expect(screen.getByRole('link', { name: 'KREAM에서 보기' }).getAttribute('href')).toBe(
      'https://kream.co.kr/products/1',
    );
    expect(screen.queryByText(/^₩/)).toBeNull();
    expect(screen.queryByRole('img', { name: 'eBay' })).toBeNull();
  });

  it('labels an eBay search fallback as a search', () => {
    render(<MarketplaceLinks listings={[]} featuredIndex={-1} fallback={ebayFallback} />);

    expect(screen.getByRole('link', { name: 'eBay에서 검색' }).getAttribute('href')).toBe(
      ebayFallback.href,
    );
    expect(screen.getByRole('img', { name: 'eBay' })).toBeTruthy();
  });

  it('reveals the remaining listings five at a time', () => {
    const listings = Array.from({ length: 7 }, (_, index) => ({
      url: `https://www.ebay.com/itm/${index + 1}`,
      title: `Listing ${index + 1}`,
      priceKrw: (index + 1) * 10000,
    }));

    render(<MarketplaceLinks listings={listings} featuredIndex={0} fallback={ebayFallback} />);

    expect(screen.getByRole('link', { name: /Listing 1/ })).toBeTruthy();
    expect(screen.queryByText('Listing 2')).toBeNull();
    expect(screen.queryByText('Listing 7')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '더보기 (6)' }));

    expect(screen.getByText('Listing 2')).toBeTruthy();
    expect(screen.getByText('Listing 6')).toBeTruthy();
    expect(screen.queryByText('Listing 7')).toBeNull();
    expect(screen.getByRole('button', { name: '더보기 (1)' })).toBeTruthy();
  });
});
