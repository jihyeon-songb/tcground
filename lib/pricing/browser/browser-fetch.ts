/**
 * Headless-browser-backed `fetch` for gated scrape sources (KREAM, eBay sold).
 *
 * Plain server-side `fetch` from a datacenter IP is blocked by these sites'
 * anti-bot (eBay → 403 error page, KREAM → 500). A real Chromium session carrying
 * cookies, a realistic UA and an established origin visit passes where `fetch`
 * cannot. This wraps a single shared browser context as a `typeof fetch`-shaped
 * function, so the existing adapters (which accept `fetchImpl`) stay unchanged.
 *
 * Must run from a residential / Korean IP (KREAM in particular). Used only by
 * `scripts/collect-prices.ts`, never on the Vercel Cron (datacenter) path.
 *
 * `playwright` is an optional devDependency and is imported lazily, so building
 * and running non-browser code never requires it to be installed.
 */

export interface CreateBrowserFetchOptions {
  /** Origins visited once before requests so cookies / anti-bot tokens are set. */
  warmupUrls?: readonly string[];
  userAgent?: string;
  locale?: string;
  /** Minimum gap between requests, ms (politeness / rate-limit safety). */
  minDelayMs?: number;
  /** Per-request timeout, ms. */
  timeoutMs?: number;
  /** Launch a visible browser (debugging). Defaults to headless. */
  headed?: boolean;
}

export interface BrowserFetch {
  /** `fetch`-compatible function backed by the browser context (shares cookies). */
  fetch: typeof fetch;
  /** Tears down the context and browser. Always call when collection finishes. */
  close: () => Promise<void>;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Launches a headless Chromium and returns a `fetch` that routes through its
 * request context. Lazily imports `playwright` so this module never forces the
 * dependency on callers that don't use it.
 */
export async function createBrowserFetch(
  options: CreateBrowserFetchOptions = {},
): Promise<BrowserFetch> {
  const {
    warmupUrls = [],
    userAgent = DEFAULT_USER_AGENT,
    locale = 'ko-KR',
    minDelayMs = 800,
    timeoutMs = 20000,
    headed = false,
  } = options;

  // Variable specifier keeps TypeScript from requiring the module at build time.
  const moduleName = 'playwright';
  const { chromium } = (await import(moduleName)) as { chromium: PlaywrightChromium };

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({ userAgent, locale });

  // Warm up: visiting the origin lets the site set the cookies its API expects.
  for (const url of warmupUrls) {
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    } catch {
      // A failed warmup is non-fatal; the request below may still succeed.
    } finally {
      await page.close();
    }
  }

  let lastRequestAt = 0;

  const browserFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const gap = minDelayMs - (Date.now() - lastRequestAt);
    if (gap > 0) await sleep(gap);

    const url = typeof input === 'string' ? input : input.toString();
    const response = await context.request.fetch(url, {
      method: init?.method ?? 'GET',
      headers: init?.headers as Record<string, string> | undefined,
      timeout: timeoutMs,
    });
    lastRequestAt = Date.now();

    // Minimal Response-shaped shim — adapters use ok/status/text()/json() only.
    return {
      ok: response.ok(),
      status: response.status(),
      text: () => response.text(),
      json: () => response.json(),
    } as Response;
  }) as typeof fetch;

  return {
    fetch: browserFetch,
    close: async () => {
      await context.close();
      await browser.close();
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Structural type for the slice of Playwright's `chromium` we use. */
interface PlaywrightChromium {
  launch(options?: { headless?: boolean }): Promise<PlaywrightBrowser>;
}
interface PlaywrightBrowser {
  newContext(options?: { userAgent?: string; locale?: string }): Promise<PlaywrightContext>;
  close(): Promise<void>;
}
interface PlaywrightContext {
  newPage(): Promise<PlaywrightPage>;
  request: {
    fetch(
      url: string,
      options?: { method?: string; headers?: Record<string, string>; timeout?: number },
    ): Promise<PlaywrightApiResponse>;
  };
  close(): Promise<void>;
}
interface PlaywrightPage {
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
  close(): Promise<void>;
}
interface PlaywrightApiResponse {
  ok(): boolean;
  status(): number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}
