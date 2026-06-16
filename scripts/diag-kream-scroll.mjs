import { chromium } from 'playwright';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const KEYWORD = '포켓몬카드 한글판';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ locale: 'ko-KR', userAgent: UA, viewport: { width: 1280, height: 900 } });

// capture search API responses
page.on('response', async (resp) => {
  const url = resp.url();
  if (!/search/i.test(url) || !/\/api\//.test(url)) return;
  try {
    const json = await resp.json();
    const keys = Object.keys(json);
    const meta = {};
    for (const k of ['total_count', 'totalCount', 'total', 'count', 'next', 'next_cursor', 'cursor', 'has_next', 'last', 'per_page', 'page'])
      if (k in json) meta[k] = json[k];
    const arr = ['items', 'data', 'products', 'results', 'list', 'searchResult'].find((k) => Array.isArray(json[k]));
    console.log('API:', url.slice(0, 90));
    console.log('  topKeys:', keys.join(','));
    console.log('  meta:', JSON.stringify(meta), 'arrKey:', arr, 'arrLen:', arr ? json[arr].length : '-');
  } catch {}
});

await page.goto('https://kream.co.kr/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2500);
await page.locator('a[href*="search"]').first().click().catch(() => {});
await page.waitForTimeout(1500);
const input = page.locator('input[type="search"], input[placeholder*="검색"]').first();
await input.click().catch(() => {});
await input.fill(KEYWORD).catch(async () => { await page.keyboard.type(KEYWORD); });
await page.keyboard.press('Enter');
await page.waitForTimeout(5000);

// scroll a bit to trigger any page-2 fetch
for (let i = 0; i < 5; i++) {
  await page.mouse.move(640, 450);
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(1200);
}
await page.waitForTimeout(2000);
await browser.close();