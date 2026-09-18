import { CurrencyCode, ProviderQuote } from '../types';

interface WiseRate {
  rate: number;
  source: string;
  target: string;
  time: string;
}

export async function wise(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  signal: AbortSignal
): Promise<ProviderQuote> {
  const apiKey = process.env.WISE_API_KEY;
  if (!apiKey) {
    throw new Error('WISE_API_KEY is not configured');
  }

  const url = `https://api.wise.com/v1/rates?source=${from}&target=${to}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal,
  });

  if (!res.ok) {
    throw new Error(`Wise rates request failed: ${res.status}`);
  }

  const data = (await res.json()) as WiseRate[];
  const entry = Array.isArray(data) ? data[0] : null;
  if (!entry || typeof entry.rate !== 'number') {
    throw new Error('Wise returned no rate for this pair');
  }

  return { rate: entry.rate, amountReceived: amount * entry.rate };
}
