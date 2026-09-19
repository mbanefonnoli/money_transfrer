import { NextRequest, NextResponse } from 'next/server';
import { CurrencyCode, ProviderId, ProviderResult, RatesRequest } from '@/lib/types';
import { wise } from '@/lib/providers/wise';
import { transferGo } from '@/lib/providers/transfergo';
import { taptapSend } from '@/lib/providers/taptapsend';

export const runtime = 'nodejs';
export const maxDuration = 30;

type ProviderFn = (
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  signal: AbortSignal
) => Promise<{ rate: number; amountReceived: number }>;

// Wise is a direct API call (sub-second in practice), so it keeps the 5s
// budget. TransferGo and Taptap Send are headless-browser scrapes — even
// optimized (see newOptimizedPage in browser.ts), launching Chromium and
// waiting for their pages to hydrate real data measured at 4-8s on its own
// (worse when both scrapers run concurrently and contend for CPU — measured
// on a 4-core dev machine, so likely better on Vercel's per-invocation
// resources but budgeted conservatively here regardless), before any
// Vercel cold-start overhead on top. A 5s budget made those two fail nearly
// every time, which defeats the point of scraping them for a real rate
// instead of just showing "unavailable" outright. They get a longer budget
// instead.
const PROVIDERS: { id: ProviderId; label: string; fn: ProviderFn; timeoutMs: number }[] = [
  { id: 'wise', label: 'Wise', fn: wise, timeoutMs: 5000 },
  { id: 'transfergo', label: 'TransferGo', fn: transferGo, timeoutMs: 12000 },
  { id: 'taptapsend', label: 'Taptap Send', fn: taptapSend, timeoutMs: 12000 },
];

const CURRENCIES: CurrencyCode[] = ['NGN', 'RON', 'EUR'];

// Each provider gets its own AbortController: if it hasn't settled within
// its timeoutMs, we abort its signal (fetch-based providers respect this
// directly) and reject so Promise.allSettled below can't be held up by one
// slow/hanging provider — the others still resolve on their own schedule.
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  controller: AbortController
): Promise<T> {
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

export async function POST(req: NextRequest) {
  let body: RatesRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { amount, from, to } = body;
  const isValidCurrency = (c: unknown): c is CurrencyCode =>
    typeof c === 'string' && CURRENCIES.includes(c as CurrencyCode);

  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !isValidCurrency(from) ||
    !isValidCurrency(to) ||
    from === to
  ) {
    return NextResponse.json({ error: 'Invalid amount/from/to' }, { status: 400 });
  }

  const settled = await Promise.allSettled(
    PROVIDERS.map(({ fn, timeoutMs }) => {
      const controller = new AbortController();
      return withTimeout(fn(amount, from, to, controller.signal), timeoutMs, controller);
    })
  );

  const payload: ProviderResult[] = PROVIDERS.map((p, i) => {
    const result = settled[i];
    if (result.status === 'fulfilled') {
      return {
        provider: p.id,
        label: p.label,
        status: 'ok',
        rate: result.value.rate,
        amountReceived: result.value.amountReceived,
      };
    }
    // Log the real reason server-side, and also surface it in the response.
    // This is a single-user personal tool with no untrusted audience, so a
    // raw error string here is a debugging aid, not an information leak —
    // it's what makes "why is TransferGo unavailable on Vercel but not
    // locally" answerable without digging through platform logs.
    const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
    console.error(`[rates] ${p.id} unavailable:`, result.reason);
    return {
      provider: p.id,
      label: p.label,
      status: 'unavailable',
      rate: null,
      amountReceived: null,
      reason,
    };
  });

  return NextResponse.json(payload);
}
