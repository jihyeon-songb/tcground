# Asking Price and Marketplace Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove fabricated card-detail prices, show only asking-price summaries, and make outbound links identify the correct source with a safe eBay-search fallback.

**Architecture:** Keep snapshots unchanged and derive a nullable asking-only `PriceDisplay` plus a source-aware fallback link in `lib/tcg-catalog.ts`. Preserve verified eBay listings, use a marketplace-neutral renderer, and show an explicit no-price state when no asking snapshot exists.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Supabase snapshot view models, Vitest, Testing Library

**Design spec:** `docs/superpowers/specs/2026-07-07-asking-price-marketplace-links-design.md`

---

## File map

- Modify `memory-bank/prd/product-detail.md`, `memory-bank/architecture.md`, and `memory-bank/trouble-shooting.md` for the canonical contract.
- Modify `lib/pricing/ebay/browse-adapter.ts` and its test for a shared search URL builder.
- Modify `lib/tcg-catalog.ts` and its test for nullable asking prices and source-aware links.
- Create `app/cards/[cardId]/_components/MarketplaceLinks.tsx` and its test; delete `EbayListings.tsx`.
- Modify `app/cards/[cardId]/page.tsx` and its test for asking/no-price states.
- Modify `memory-bank/implementation-plan.md` and `memory-bank/progress.md` for tracking.

### Task 1: Synchronize the product contract before code changes

**Files:**

- Modify: `memory-bank/prd/product-detail.md`
- Modify: `memory-bank/architecture.md`
- Modify: `memory-bank/trouble-shooting.md`

- [ ] **Step 1: Update product requirements**

Add these requirements:

```markdown
- 대표 가격은 판매중 호가(`asking`) snapshot만 사용하며 `평균 판매 호가`로 표시한다.
- 판매 호가 이력이 없으면 임의 가격을 만들지 않고 `시세 정보 없음`을 표시한다.
- 과거 판매 호가만 있으면 마지막 값을 유지하고 `마지막 수집 N일 전 · 현재 매물 여부 미확인`을 표시한다.
- 검증된 개별 매물 링크가 없으면 실제 snapshot 출처 링크를 표시하고, 출처 링크도 없으면 eBay 검색 결과로 이동한다.
- 판매 완료 데이터는 대표 가격 계산에서 제외하고 차트 참고 데이터로만 유지한다.
```

- [ ] **Step 2: Update architecture**

Replace the deterministic-price statement with:

```markdown
- 상세 대표 가격은 실제 `asking` snapshot에서만 파생하며, snapshot이 없으면 `null`로 두어 `시세 정보 없음`을 렌더링한다. deterministic 가격 fallback은 사용하지 않는다.
- 외부 링크는 검증된 eBay listing → 실제 asking source URL → eBay 검색 결과 순서로 선택한다. listings가 없는 레거시 `ebay_browse.source_url`은 직접 링크로 사용하지 않는다.
```

- [ ] **Step 3: Record the edge case**

Add:

```markdown
## 카드 상세 eBay fallback이 다른 카드·사이트로 이동

`card_price_snapshots.source_url`은 출처 공통 필드이고, 과거 eBay Browse 행은 listing-level 카드 번호 필터 전에 저장된 item URL일 수 있다. UI는 원시 URL의 출처를 추측하지 않는다. 필터링된 eBay listings를 우선하고, 국내 source URL은 실제 출처명으로 표시하며, 신뢰 가능한 직접 URL이 없으면 eBay 검색 결과를 사용한다.
```

- [ ] **Step 4: Verify and commit documentation**

```bash
pnpm exec prettier --check memory-bank/prd/product-detail.md memory-bank/architecture.md memory-bank/trouble-shooting.md
git add memory-bank/prd/product-detail.md memory-bank/architecture.md memory-bank/trouble-shooting.md
git commit -m "docs: 판매 호가 표시 정책 확정"
```

Expected: Prettier passes and only the contract files are committed.

### Task 2: Share the eBay search fallback builder

**Files:**

- Modify: `lib/pricing/ebay/browse-adapter.test.ts`
- Modify: `lib/pricing/ebay/browse-adapter.ts`

- [ ] **Step 1: Write the failing URL-builder test**

Import `buildEbaySearchPageUrl` and add:

```ts
describe('buildEbaySearchPageUrl', () => {
  it('builds a human-facing eBay search URL with the encoded keyword', () => {
    const url = new URL(buildEbaySearchPageUrl('Charizard ex 201/165 Korean'));
    expect(url.origin).toBe('https://www.ebay.com');
    expect(url.pathname).toBe('/sch/i.html');
    expect(url.searchParams.get('_nkw')).toBe('Charizard ex 201/165 Korean');
  });
});
```

- [ ] **Step 2: Run it and verify failure**

```bash
pnpm exec vitest run lib/pricing/ebay/browse-adapter.test.ts
```

Expected: FAIL because the builder is private.

- [ ] **Step 3: Export the existing builder**

```ts
export function buildEbaySearchPageUrl(keyword: string): string {
  const url = new URL(`${EBAY_WEB_BASE_URL}/sch/i.html`);
  url.searchParams.set('_nkw', keyword);
  return url.toString();
}
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm exec vitest run lib/pricing/ebay/browse-adapter.test.ts
git add lib/pricing/ebay/browse-adapter.ts lib/pricing/ebay/browse-adapter.test.ts
git commit -m "refactor: eBay 검색 URL 빌더 공유"
```

Expected: focused tests PASS.

### Task 3: Derive nullable asking prices and source-aware fallback links

**Files:**

- Modify: `lib/tcg-catalog.test.ts`
- Modify: `lib/tcg-catalog.ts`

- [ ] **Step 1: Write a failing asking-only derivation test**

Add this test using the existing `createSnapshotRow` fixture:

```ts
it('keeps historical asking with staleness', () => {
  const history = buildPriceHistory([
    createSnapshotRow({
      snapshot_date: '2026-06-30',
      source_name: 'kream',
      aggregation_method: 'kream_asking_median',
      market: 'KR',
      currency: 'KRW',
      avg_price: 100000,
    }),
  ]);
  expect(
    deriveAskingPriceDisplayFromHistory(history, new Date('2026-07-07T00:00:00Z')),
  ).toMatchObject({ avgPrice: 100000, stalenessDays: 7 });
});
```

- [ ] **Step 2: Add failing fallback-link tests**

```ts
const ebayQuery = {
  cardPrintingId: 'printing-1',
  cardName: '리자몽 ex',
  nameEn: 'Charizard ex',
  collectorNumber: '201/165',
  setCode: 'SV2a',
};

it('labels a domestic source instead of presenting it as eBay', () => {
  expect(
    deriveMarketplaceFallbackLink(
      [
        createSnapshotRow({
          source_name: 'kream',
          aggregation_method: 'kream_asking_median',
          source_url: 'https://kream.co.kr/products/804751',
        }),
      ],
      ebayQuery,
    ),
  ).toEqual({
    kind: 'source',
    href: 'https://kream.co.kr/products/804751',
    sourceLabel: 'KREAM',
    actionLabel: 'KREAM에서 보기',
  });
});

it('rejects a legacy eBay item URL and falls back to search', () => {
  const link = deriveMarketplaceFallbackLink(
    [
      createSnapshotRow({
        source_name: 'ebay_browse',
        source_url: 'https://www.ebay.com/itm/298286038307',
        listings: null,
      }),
    ],
    ebayQuery,
  );
  expect(link.kind).toBe('search');
  expect(new URL(link.href).searchParams.get('_nkw')).toBe('Charizard ex 201/165 Korean');
});

it('rejects non-http source URLs', () => {
  const link = deriveMarketplaceFallbackLink(
    [createSnapshotRow({ source_name: 'kream', source_url: 'javascript:alert(1)' })],
    ebayQuery,
  );
  expect(link.kind).toBe('search');
});

it.each([
  ['bunjang', '번개장터'],
  ['joongna', '중고나라'],
  ['unknown_market', '외부 판매처'],
])('maps %s to a safe public label', (sourceName, sourceLabel) => {
  const link = deriveMarketplaceFallbackLink(
    [createSnapshotRow({ source_name: sourceName, source_url: 'https://market.example/item/1' })],
    ebayQuery,
  );
  expect(link.sourceLabel).toBe(sourceLabel);
});
```

- [ ] **Step 3: Run the catalog test and verify failure**

```bash
pnpm exec vitest run lib/tcg-catalog.test.ts
```

Expected: FAIL because the asking-only and marketplace-link exports do not exist.

- [ ] **Step 4: Add view-model types**

```ts
export interface MarketplaceFallbackLink {
  kind: 'source' | 'search';
  href: string;
  sourceLabel: string;
  actionLabel: string;
}
```

- [ ] **Step 5: Implement asking-only detail price derivation**

```ts
export function deriveAskingPriceDisplayFromHistory(
  history: PriceHistory,
  today: Date = new Date(),
): PriceDisplay | null {
  if (history.askingSeries.length === 0) return null;
  return derivePriceDisplayFromSeries(history.askingSeries, true, history.gradeLabel, today);
}
```

Extract the current latest/first/change/source/currency/sample/FX calculation into `derivePriceDisplayFromSeries`. Keep `derivePriceDisplayFromHistory` and the current mapper wiring unchanged in this task so all existing callers continue to compile.

```ts
function derivePriceDisplayFromSeries(
  series: readonly PricePoint[],
  usingAsking: boolean,
  gradeLabel: string | null,
  today: Date,
): PriceDisplay | null {
  if (series.length === 0) return null;
  const latest = series[series.length - 1];
  const first = series[0];
  const changeRate =
    first.avgPrice > 0
      ? Number((((latest.avgPrice - first.avgPrice) / first.avgPrice) * 100).toFixed(1))
      : 0;
  return {
    avgPrice: latest.avgPrice,
    minPrice: latest.minPrice,
    maxPrice: latest.maxPrice,
    changeRate,
    changeTone: getChangeTone(changeRate),
    lastUpdatedAt: formatSnapshotDate(latest.date),
    stalenessDays: stalenessDaysSince(latest.date, today),
    sourceLabel: usingAsking
      ? `${formatSourceNames(latest.sourceNames) || askingSourcePrefix(latest)} 판매중 호가 ${latest.sampleCount}건 기준${formatFxSuffix(latest)}`
      : `최근 ${formatSourceNames(latest.sourceNames) || '수동 evidence'} ${gradeLabel ? `${gradeLabel} ` : ''}실거래가 집계 ${latest.sampleCount}건 기준${formatFxSuffix(latest)}`,
    currency: latest.currency,
    sampleCount: latest.sampleCount,
    sourceUrl: latest.sourceUrl,
    sourceCurrency: latest.sourceCurrency,
    fxRateDate: latest.fxRateDate,
    fxProvider: latest.fxProvider,
  };
}
```

Then make both public derivations call it:

```ts
export function derivePriceDisplayFromHistory(
  history: PriceHistory,
  today: Date = new Date(),
): PriceDisplay | null {
  const usingAsking = history.askingSeries.length > 0;
  return derivePriceDisplayFromSeries(
    getPriceTrendSeries(history),
    usingAsking,
    history.gradeLabel,
    today,
  );
}

export function deriveAskingPriceDisplayFromHistory(
  history: PriceHistory,
  today: Date = new Date(),
): PriceDisplay | null {
  return derivePriceDisplayFromSeries(history.askingSeries, true, history.gradeLabel, today);
}
```

- [ ] **Step 6: Implement safe fallback derivation**

Import `buildBrowseKeyword`, `buildEbaySearchPageUrl`, and `BrowseCardQuery`. Add:

```ts
function safeExternalHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
```

`deriveMarketplaceFallbackLink(snapshots, query)` must:

1. inspect asking rows and exclude `ebay_browse` rows without filtered listings;
2. keep only safe HTTP(S) `source_url` values;
3. find the most recent date among the remaining trustworthy source candidates;
4. on that date, choose the source row whose average is closest to the candidate-source average;
5. map known source names to eBay, KREAM, 번개장터, or 중고나라 and unknown names to `외부 판매처`;
6. return `buildEbaySearchPageUrl(buildBrowseKeyword(query))` with `eBay에서 검색` when no candidate remains.

Implement those rules directly:

```ts
export function deriveMarketplaceFallbackLink(
  snapshots: readonly CardPriceSnapshotRow[],
  query: BrowseCardQuery,
): MarketplaceFallbackLink {
  const candidates = snapshots.flatMap((row) => {
    if (!isAskingSnapshot(row) || row.source_name === 'ebay_browse') return [];
    const href = safeExternalHttpUrl(row.source_url);
    return href ? [{ row, href }] : [];
  });

  if (candidates.length > 0) {
    const latest = latestDate(candidates.map(({ row }) => row));
    const latestCandidates = candidates.filter(({ row }) => row.snapshot_date === latest);
    const target =
      latestCandidates.reduce((sum, { row }) => sum + (snapshotAvgPrice(row) ?? 0), 0) /
      latestCandidates.length;
    const selected = latestCandidates.reduce((best, candidate) =>
      Math.abs((snapshotAvgPrice(candidate.row) ?? 0) - target) <
      Math.abs((snapshotAvgPrice(best.row) ?? 0) - target)
        ? candidate
        : best,
    );
    const sourceLabel = formatMarketplaceSourceName(selected.row.source_name);
    return {
      kind: 'source',
      href: selected.href,
      sourceLabel,
      actionLabel: `${sourceLabel}에서 보기`,
    };
  }

  return {
    kind: 'search',
    href: buildEbaySearchPageUrl(buildBrowseKeyword(query)),
    sourceLabel: 'eBay',
    actionLabel: 'eBay에서 검색',
  };
}
```

- [ ] **Step 7: Make featured eBay selection source-local**

Make the existing `displayAvgPrice` parameter optional, stop reading it, and calculate the target from latest `ebay_browse` rows:

```ts
const target =
  latestRows.reduce((sum, row) => sum + (snapshotAvgPrice(row) ?? 0), 0) / latestRows.length;
```

Select the verified listing closest to this eBay target, not a KREAM/combined summary.

- [ ] **Step 8: Verify and commit**

```bash
pnpm exec vitest run lib/tcg-catalog.test.ts
pnpm exec tsc --noEmit
git add lib/tcg-catalog.ts lib/tcg-catalog.test.ts
git commit -m "feat: 판매 호가 링크 파생 로직 추가"
```

Expected: catalog tests PASS and type-check exits 0 because mapper wiring remains unchanged until Task 5.

### Task 4: Add the marketplace-aware renderer

**Files:**

- Create: `app/cards/[cardId]/_components/MarketplaceLinks.test.tsx`
- Create: `app/cards/[cardId]/_components/MarketplaceLinks.tsx`

- [ ] **Step 1: Write failing component tests**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MarketplaceLinks } from './MarketplaceLinks';

afterEach(cleanup);

describe('MarketplaceLinks', () => {
  it('shows a verified eBay listing with its captured price', () => {
    render(
      <MarketplaceLinks
        listings={[{ url: 'https://www.ebay.com/itm/1', title: 'Charizard', priceKrw: 120000 }]}
        featuredIndex={0}
        fallback={{
          kind: 'search',
          href: 'https://www.ebay.com/sch/i.html?_nkw=Charizard',
          sourceLabel: 'eBay',
          actionLabel: 'eBay에서 검색',
        }}
      />,
    );
    expect(screen.getByRole('link', { name: /Charizard/ }).getAttribute('href')).toBe(
      'https://www.ebay.com/itm/1',
    );
    expect(screen.getByText('₩120,000')).toBeTruthy();
  });

  it('shows the actual fallback source without a fabricated price', () => {
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
  });

  it('labels an eBay search fallback as a search', () => {
    render(
      <MarketplaceLinks
        listings={[]}
        featuredIndex={-1}
        fallback={{
          kind: 'search',
          href: 'https://www.ebay.com/sch/i.html?_nkw=Charizard',
          sourceLabel: 'eBay',
          actionLabel: 'eBay에서 검색',
        }}
      />,
    );
    expect(screen.getByRole('link', { name: 'eBay에서 검색' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
pnpm exec vitest run 'app/cards/[cardId]/_components/MarketplaceLinks.test.tsx'
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the component**

Move the existing eBay listing UI, featured listing, pagination, and logo into `MarketplaceLinks.tsx` with:

```ts
interface MarketplaceLinksProps {
  listings: EbayListing[];
  featuredIndex: number;
  fallback: MarketplaceFallbackLink;
}
```

When listings are empty, render `fallback.href` and `fallback.actionLabel`. Show the eBay logo only for eBay; otherwise show the actual source text. Keep `target='_blank'` and `rel='noopener noreferrer'`.

- [ ] **Step 4: Verify and commit the new component**

```bash
pnpm exec vitest run 'app/cards/[cardId]/_components/MarketplaceLinks.test.tsx'
pnpm exec tsc --noEmit
git add 'app/cards/[cardId]/_components/MarketplaceLinks.tsx' 'app/cards/[cardId]/_components/MarketplaceLinks.test.tsx'
git commit -m "refactor: 판매처 바로가기 출처 표시"
```

Expected: focused component tests PASS.

### Task 5: Wire nullable detail prices and render asking/no-price states

**Files:**

- Modify: `lib/tcg-catalog.test.ts`
- Modify: `lib/tcg-catalog.ts`
- Modify: `app/cards/[cardId]/page.test.tsx`
- Modify: `app/cards/[cardId]/page.tsx`
- Delete: `app/cards/[cardId]/_components/EbayListings.tsx`

- [ ] **Step 1: Write failing detail-mapper tests**

Remove the `createDeterministicPriceDisplay` import and deterministic-value test. Remove the old `derivePriceDisplayFromHistory(...).sourceUrl` assertions because outbound-link selection now belongs to `deriveMarketplaceFallbackLink`. Add:

```ts
it('returns no detail price without asking snapshots', () => {
  expect(mapCardDetailRow(createMultiEditionDetailRow(), []).price).toBeNull();
});

it('does not promote sold-only evidence to the detail price', () => {
  const detail = mapCardDetailRow(createMultiEditionDetailRow(), [
    createSnapshotRow({
      source_name: 'pricecharting_ebay_sold',
      aggregation_method: 'sold_median',
      avg_price: 120000,
    }),
  ]);
  expect(detail.price).toBeNull();
  expect(detail.priceHistory.soldPoints).toHaveLength(1);
});
```

- [ ] **Step 2: Write failing page tests**

Update the fixture with `marketplaceFallbackLink` and an asking source label. Add:

```tsx
it('labels the summary as average asking price', () => {
  render(<CardDetailContent card={createCardDetail()} />);
  expect(screen.getByText('평균 판매 호가')).toBeTruthy();
  expect(screen.queryByText('평균 거래가')).toBeNull();
});

it('shows no-price state without fabricated values or alerts', () => {
  const card = { ...createCardDetail(), price: null };
  render(<CardDetailContent card={card} alertSlot={<button>가격 알림</button>} />);
  expect(screen.getByText('시세 정보 없음')).toBeTruthy();
  expect(screen.queryByText('₩120,000')).toBeNull();
  expect(screen.queryByRole('button', { name: '가격 알림' })).toBeNull();
});

it('marks historical asking as currently unverified', () => {
  const base = createCardDetail();
  if (!base.price) throw new Error('fixture requires a price');
  render(<CardDetailContent card={{ ...base, price: { ...base.price, stalenessDays: 8 } }} />);
  expect(screen.getByText('마지막 수집 8일 전 · 현재 매물 여부 미확인')).toBeTruthy();
});
```

Update existing tests that spread `base.price` to assert it is non-null first.

- [ ] **Step 3: Run and verify failure**

```bash
pnpm exec vitest run lib/tcg-catalog.test.ts
pnpm exec vitest run 'app/cards/[cardId]/page.test.tsx'
```

Expected: FAIL on the old label, non-null price assumption, and old staleness copy.

- [ ] **Step 4: Wire nullable catalog detail state**

Update `CatalogCardDetail`:

```ts
price: PriceDisplay | null;
marketplaceFallbackLink: MarketplaceFallbackLink;
```

Remove `sourceUrl` from `PriceDisplay`, call `deriveAskingPriceDisplayFromHistory` in `mapCardDetailRow`, call `deriveMarketplaceFallbackLink`, and remove the obsolete second argument from `deriveEbayListings`. Delete `createDeterministicPriceDisplay` and now-unused helpers after `rg` confirms no callers.

- [ ] **Step 5: Render the nullable price branch**

Use this explicit empty state:

```tsx
{
  card.price ? (
    <PriceSummaryContent price={card.price} gradeLabel={priceGradeLabel} />
  ) : (
    <div className='flex flex-col gap-2'>
      <span className='text-muted-foreground text-sm font-semibold tracking-wider uppercase'>
        평균 판매 호가
      </span>
      <p className='text-foreground text-2xl font-bold'>시세 정보 없음</p>
      <p className='text-muted-foreground text-sm'>수집된 판매중 호가가 없습니다.</p>
    </div>
  );
}
```

Extract `PriceSummaryContent` only if it keeps `CardDetailContent` readable; do not introduce a new file for this single-use branch.

For every `stalenessDays > 0`, render:

```ts
`마지막 수집 ${price.stalenessDays}일 전 · 현재 매물 여부 미확인`;
```

Never state `현재 매물 없음`, because failed collection and zero listings are not distinguishable.

- [ ] **Step 6: Wire marketplace links and price guards**

```tsx
<MarketplaceLinks
  listings={card.ebayListings}
  featuredIndex={card.featuredListingIndex}
  fallback={card.marketplaceFallbackLink}
/>
```

Render `alertSlot`, source label, and last-updated text only when `card.price` exists. Add `if (!card.price) return null;` at the start of `PriceAlertSection`. Update fallback metadata from `평균 거래가` to `평균 판매 호가`.

After the page imports `MarketplaceLinks`, delete the now-unused `EbayListings.tsx`.

- [ ] **Step 7: Verify focused tests and types**

```bash
pnpm exec vitest run lib/tcg-catalog.test.ts
pnpm exec vitest run 'app/cards/[cardId]/page.test.tsx' 'app/cards/[cardId]/_components/MarketplaceLinks.test.tsx'
pnpm exec tsc --noEmit
```

Expected: focused tests PASS and type-check exits 0.

- [ ] **Step 8: Commit the wired behavior**

```bash
git add lib/tcg-catalog.ts lib/tcg-catalog.test.ts 'app/cards/[cardId]/page.tsx' 'app/cards/[cardId]/page.test.tsx' 'app/cards/[cardId]/_components/EbayListings.tsx'
git commit -m "fix: 상세 판매 호가 빈 상태 표시"
```

### Task 6: Verify and close documentation

**Files:**

- Modify: `memory-bank/implementation-plan.md`
- Modify: `memory-bank/progress.md`

- [ ] **Step 1: Run focused regression tests together**

```bash
pnpm exec vitest run lib/pricing/ebay/browse-adapter.test.ts lib/tcg-catalog.test.ts 'app/cards/[cardId]/_components/MarketplaceLinks.test.tsx' 'app/cards/[cardId]/page.test.tsx'
```

Expected: all focused tests PASS.

- [ ] **Step 2: Run repository quality gates**

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test --run
```

Expected: every command exits 0; no new warnings are accepted.

- [ ] **Step 3: Check formatting and whitespace**

```bash
pnpm format:check
git diff --check
```

Expected: checks pass. If repository-wide pre-existing formatting failures occur, check every changed file directly and record the pre-existing failure without modifying unrelated files.

- [ ] **Step 4: Close memory-bank tracking**

Mark phase 6.12 complete. Remove the current-work entry from `memory-bank/progress.md` and add a completion log containing the actual focused-test and quality-gate results.

- [ ] **Step 5: Commit completion state**

```bash
git add memory-bank/implementation-plan.md memory-bank/progress.md
git commit -m "docs: 판매 호가 링크 작업 완료 기록"
```

- [ ] **Step 6: Inspect final state**

```bash
git status --short
git log --oneline -6
```

Expected: no task-owned uncommitted files. Unrelated pre-existing user files remain untouched.
