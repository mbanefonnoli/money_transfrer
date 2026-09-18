import { wise } from './providers/wise';
import { transferGo } from './providers/transfergo';
import { taptapSend } from './providers/taptapsend';
import { ArbitrageLeg, BestQuote, CurrencyCode, ProviderId, ProviderResult } from './types';

type ProviderFn = (
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  signal: AbortSignal
) => Promise<{ rate: number; amountReceived: number }>;

// Same per-provider timeout split as Rate Board's app/api/rates/route.ts:
// Wise is a direct API call (fast), TransferGo/Taptap Send are headless
// scrapes that measured 4-8s+ on their own — see that route's comment for
// the full reasoning. Kept identical here since this is the same real-world
// latency problem, just invoked once per leg instead of once per request.
const PROVIDERS: { id: ProviderId; label: string; fn: ProviderFn; timeoutMs: number }[] = [
  { id: 'wise', label: 'Wise', fn: wise, timeoutMs: 5000 },
  { id: 'transfergo', label: 'TransferGo', fn: transferGo, timeoutMs: 12000 },
  { id: 'taptapsend', label: 'Taptap Send', fn: taptapSend, timeoutMs: 12000 },
];

function withTimeout<T>(promise: Promise<T>, ms: number, controller: AbortController): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// Fetches all 3 providers for one leg (from -> to, given amountIn) and picks
// the best (highest amountReceived) successful one. Used for the direct leg
// and for each hop of the arbitrage path — same logic, just called with
// different (from, to, amount) each time.
export async function fetchLeg(
  amountIn: number,
  from: CurrencyCode,
  to: CurrencyCode
): Promise<ArbitrageLeg> {
  const settled = await Promise.allSettled(
    PROVIDERS.map(({ fn, timeoutMs }) => {
      const controller = new AbortController();
      return withTimeout(fn(amountIn, from, to, controller.signal), timeoutMs, controller);
    })
  );

  const results: ProviderResult[] = PROVIDERS.map((p, i) => {
    const result = settled[i];
    if (result.status === 'fulfilled') {
      return {
        provider: p.id,
        label: p.label,
        status: 'ok' as const,
        rate: result.value.rate,
        amountReceived: result.value.amountReceived,
      };
    }
    console.error(`[arbitrage] ${p.id} unavailable for ${from}->${to}:`, result.reason);
    return { provider: p.id, label: p.label, status: 'unavailable' as const, rate: null, amountReceived: null };
  });

  let best: BestQuote | null = null;
  for (const r of results) {
    if (r.status === 'ok' && r.rate !== null && r.amountReceived !== null) {
      if (!best || r.amountReceived > best.amountReceived) {
        best = { provider: r.label, rate: r.rate, amountReceived: r.amountReceived };
      }
    }
  }

  return { from, to, amountIn, results, best };
}
