import { CurrencyCode, ProviderQuote } from '../types';
import { getBrowser, newOptimizedPage } from './browser';

// FRAGILE PARSING — read this before touching anything below.
// Taptap Send has no public API. Its rate calculator on
// https://www.taptapsend.com/en/send-money-to/{country} is two number
// inputs (#origin-currency select drives which corridor, input
// name="origin-amount-2" / name="destination-amount-2" hold the numbers) —
// NOT text like "1 EUR = X NGN" anywhere in the page, so this does not use
// the regex approach in parseRate.ts at all. Confirmed by hand by dumping
// `document.querySelectorAll('input')` on that page.
//
// Two gotchas that will bite whoever touches this next:
// 1. origin-amount-2 is a REACT-CONTROLLED input. Puppeteer's normal
//    `input.type(...)` (and even manual Backspace + type) gets silently
//    reverted back to the default "100" — React's re-render wins the race.
//    The only thing that reliably works is calling the *native* HTMLInputElement
//    value setter and dispatching real `input`/`change` events afterwards
//    (setNativeValue below) — this is what makes React's onChange fire.
// 2. Switching #origin-currency does NOT change destination-currency — the
//    page already defaults destination to whatever country is in the URL,
//    which is why RECEIVE_COUNTRY below maps `to` to a URL path rather than
//    also driving a destination dropdown.
//
// If Taptap Send restructures this calculator (different input names,
// different currency-selection UI), re-run the same manual inspection
// (page.$$eval('input', ...) and page.$$eval('#origin-currency option', ...))
// before assuming the whole provider is broken.
//
// COVERAGE NOTE: Taptap Send only sends money INTO a fixed set of countries
// (Africa/Asia/Latin America) FROM a fixed set of sending countries — it does
// not support sending money out of Nigeria, and Romania is not a receiving
// country at all. So of this app's 4 pairs, only EUR->NGN has any chance of
// returning a real rate here; NGN->RON, NGN->EUR and RON->NGN are expected to
// resolve as "unavailable" every time. That's treated as normal, not a bug.
const RECEIVE_COUNTRY: Partial<Record<CurrencyCode, string>> = {
  NGN: 'nigeria',
};

export async function taptapSend(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  _signal: AbortSignal
): Promise<ProviderQuote> {
  const country = RECEIVE_COUNTRY[to];
  if (!country || from === 'NGN') {
    throw new Error(`Taptap Send has no corridor for ${from}->${to}`);
  }

  const url = `https://www.taptapsend.com/en/send-money-to/${country}`;

  const browser = await getBrowser();
  try {
    const page = await newOptimizedPage(browser);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 9000 });

    // The currency <select> starts empty and gets populated by client-side
    // JS shortly after domcontentloaded — reading its options immediately
    // (no wait) intermittently sees zero options and wrongly concludes the
    // corridor doesn't exist. Wait for it to actually have entries first.
    await page.waitForFunction(
      () => (document.querySelectorAll('#origin-currency option').length ?? 0) > 1,
      { timeout: 3000 }
    );

    const originOptions = await page.$$eval('#origin-currency option', (els) =>
      els.map((el) => (el as HTMLOptionElement).value)
    );
    const match = originOptions.find((v) => v.includes(`-${from}-ORIGIN`));
    if (!match) {
      throw new Error(`Taptap Send: no origin option for ${from}`);
    }
    await page.select('#origin-currency', match);
    // Changing the origin currency re-renders the calculator with its own
    // default amount — give it a moment before we override the amount.
    await new Promise((resolve) => setTimeout(resolve, 600));

    await page.evaluate((value: string) => {
      const el = document.querySelector<HTMLInputElement>('input[name="origin-amount-2"]');
      if (!el) return;
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeSetter?.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, String(amount));

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const destinationValue = await page.$eval(
      'input[name="destination-amount-2"]',
      (el) => (el as HTMLInputElement).value
    );
    const amountReceived = parseFloat(destinationValue.replace(/,/g, ''));
    if (Number.isNaN(amountReceived) || amountReceived <= 0) {
      throw new Error('Taptap Send: destination amount not found');
    }

    return { rate: amountReceived / amount, amountReceived };
  } finally {
    await browser.close();
  }
}
