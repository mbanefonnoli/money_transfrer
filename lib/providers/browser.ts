import type { Browser, Page } from 'puppeteer-core';

// Vercel's serverless Linux runtime can't run the full `puppeteer` package's
// bundled Chromium download, so production uses `puppeteer-core` pointed at
// `@sparticuz/chromium`'s Lambda-compatible binary. That binary is Linux-only
// and does nothing useful on a Windows dev machine, so local development
// instead uses the full `puppeteer` package, which bundles a Chromium build
// for the local OS. Both branches satisfy the same puppeteer-core `Browser`
// type, so callers don't need to know which one they got.
export async function getBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = await import('puppeteer-core');
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    }) as unknown as Promise<Browser>;
  }

  const puppeteer = await import('puppeteer');
  return puppeteer.launch({
    headless: true,
    args: ['--disable-gpu', '--disable-dev-shm-usage'],
  }) as unknown as Promise<Browser>;
}

// Both scraped providers' pages pull in a lot of images/fonts/stylesheets
// that don't affect the numbers we're scraping but noticeably slow down
// reaching a usable page (measured: ~4.9s to domcontentloaded on TransferGo's
// converter page with all assets, ~3.2s with these blocked). Route through
// this instead of `browser.newPage()` directly for a meaningfully faster —
// and therefore more likely to fit inside the timeout budget — scrape.
export async function newOptimizedPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'font', 'media', 'stylesheet'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });
  return page;
}
