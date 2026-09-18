import { CurrencyCode } from '../types';

// Shared by transfergo.ts and taptapsend.ts: both providers' web pages render
// the rate as human-readable "1 XXX = Y ZZZ" text rather than exposing it via
// an API, so both scrapers scan for the same pattern. See the FRAGILE PARSING
// comment in transfergo.ts for how to fix this if a provider's page copy
// changes and matches stop showing up.
const RATE_REGEX = /1\s*([A-Z]{3})\s*=\s*([\d.,]+)\s*([A-Z]{3})/g;

export function extractRateFromText(
  text: string,
  from: CurrencyCode,
  to: CurrencyCode
): number | null {
  const matches = text.matchAll(RATE_REGEX);
  for (const m of matches) {
    const [, src, value, tgt] = m;
    if (src === from && tgt === to) {
      const rate = parseFloat(value.replace(/,/g, ''));
      if (!Number.isNaN(rate) && rate > 0) return rate;
    }
  }
  return null;
}
