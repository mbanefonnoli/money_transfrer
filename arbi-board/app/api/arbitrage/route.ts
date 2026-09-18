import { NextRequest, NextResponse } from 'next/server';
import { fetchLeg } from '@/lib/fetchLeg';
import { ArbitrageResponse, CurrencyCode } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const CURRENCIES: CurrencyCode[] = ['NGN', 'RON', 'EUR'];

export async function POST(req: NextRequest) {
  let body: { amount?: number; from?: string; to?: string };
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

  // With exactly 3 currencies in play, there is exactly one possible
  // intermediary for any (from, to) pair: whichever of the 3 is neither.
  const via = CURRENCIES.find((c) => c !== from && c !== to);
  if (!via) {
    return NextResponse.json({ error: 'No intermediary currency available' }, { status: 400 });
  }

  // Direct leg and hop 1 are independent of each other, so run them
  // together. Hop 2 depends on hop 1's winning amount, so it has to wait.
  const [direct, hop1] = await Promise.all([
    fetchLeg(amount, from, to),
    fetchLeg(amount, from, via),
  ]);

  const hop2 = hop1.best ? await fetchLeg(hop1.best.amountReceived, via, to) : null;

  const pathFinalAmount = hop2?.best?.amountReceived ?? null;
  const directAmount = direct.best?.amountReceived ?? null;

  const profit =
    directAmount !== null && pathFinalAmount !== null ? pathFinalAmount - directAmount : null;

  let betterOption: ArbitrageResponse['betterOption'] = 'unknown';
  if (profit !== null) {
    betterOption = profit > 0 ? 'path' : 'direct';
  } else if (directAmount !== null) {
    betterOption = 'direct';
  } else if (pathFinalAmount !== null) {
    betterOption = 'path';
  }

  const payload: ArbitrageResponse = {
    amount,
    from,
    to,
    via,
    direct,
    hop1,
    hop2,
    pathFinalAmount,
    profit,
    betterOption,
  };

  return NextResponse.json(payload);
}
