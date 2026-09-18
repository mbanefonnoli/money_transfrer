import { CurrencyCode, ProviderQuote } from '../types';
import { getBrowser, newOptimizedPage } from './browser';
import { extractRateFromText } from './parseRate';

// FRAGILE PARSING — read this before touching anything below.
// TransferGo has no public API. We rely on the human-readable "1 XXX = Y ZZZ"
// string their currency-converter page renders (e.g. "1 EUR = 1,527.14
// NGN"), matched via extractRateFromText() in parseRate.ts.
//
// IMPORTANT — two things that will bite whoever touches this next:
//
// 1. This MUST be scraped with a real headless browser, not a plain fetch().
//    The page's server-rendered HTML already contains a "1 XXX = Y ZZZ"
//    string with the CORRECT currency codes, but it's a generic placeholder
//    NUMBER (something like "1.14113", regardless of which pair you asked
//    for) baked into the page shell before TransferGo's client-side JS
//    hydrates and fetches the live rate. Confirmed by hand: the raw HTML for
//    /currency-converter/eur-to-ngn says "1 EUR = 1.14113 NGN" (nonsense —
//    that's roughly a GBP/EUR rate) while the JS-hydrated page says
//    "1 EUR = 1527.xx NGN" (correct order of magnitude).
//
// 2. Because the placeholder already has the right currency codes, you can't
//    tell "real data" from "placeholder" by waiting for the regex to match —
//    it matches immediately, before hydration. What actually works is
//    reading the rate right away, then polling until the extracted number
//    CHANGES from that first reading (pollForRealRate below) — the
//    placeholder is a fixed decoy value, so any real rate for these pairs
//    will differ from it.
//
// If TransferGo changes the rendered copy/format, update RATE_REGEX in
// parseRate.ts. If they stop shipping a placeholder number (i.e. the first
// reading is already correct), pollForRealRate still works fine — it just
// exits on its first check.
async function pollForRealRate(
  page: import('puppeteer-core').Page,
  from: CurrencyCode,
  to: CurrencyCode,
  budgetMs: number
): Promise<number | null> {
  const readRate = async () => {
    const text = await page.evaluate(() => document.body.innerText);
    return extractRateFromText(text.replace(/\s+/g, ' '), from, to);
  };

  const initialRate = await readRate();
  const deadline = Date.now() + budgetMs;
  let lastRate = initialRate;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const candidate = await readRate();
    if (candidate !== null && candidate !== initialRate) {
      return candidate;
    }
    lastRate = candidate ?? lastRate;
  }

  return lastRate;
}

export async function transferGo(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  _signal: AbortSignal
): Promise<ProviderQuote> {
  const pair = `${from.toLowerCase()}-to-${to.toLowerCase()}`;
  const url = `https://www.transfergo.com/currency-converter/${pair}?amount=${amount}`;

  const browser = await getBrowser();
  try {
    // Blocking images/fonts/stylesheets (see newOptimizedPage) roughly halves
    // time-to-usable-page on this site — still not fast, hence the generous
    // per-provider timeout for scraped providers in app/api/rates/route.ts.
    const page = await newOptimizedPage(browser);
    // networkidle2 never fires on this page (persistent analytics/websocket
    // connections keep it "busy" indefinitely) — wait for DOM content instead.
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 9000 });

    const rate = await pollForRealRate(page, from, to, 2500);
    if (rate === null) {
      throw new Error('TransferGo: rate not found in rendered page');
    }
    return { rate, amountReceived: amount * rate };
  } finally {
    await browser.close();
  }
}
