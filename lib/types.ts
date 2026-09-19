export type CurrencyCode = 'NGN' | 'RON' | 'EUR';

export type ProviderId = 'wise' | 'transfergo' | 'taptapsend';

export interface ProviderQuote {
  rate: number;
  amountReceived: number;
}

export interface ProviderResult {
  provider: ProviderId;
  label: string;
  status: 'ok' | 'unavailable';
  rate: number | null;
  amountReceived: number | null;
  reason?: string;
}

export interface RatesRequest {
  amount: number;
  foreignCurrency: CurrencyCode;
}

// A bureau board shows both directions at once: BUY (you buy the foreign
// currency from a customer, i.e. foreignCurrency -> NGN) and SELL (you sell
// it to them, i.e. NGN -> foreignCurrency) — both computed from the same
// typed amount, applied to each leg's own currency.
export interface RatesResponse {
  buy: ProviderResult[];
  sell: ProviderResult[];
}

export type Leg = 'buy' | 'sell';

export interface HistoryRecord {
  id: string;
  date: string;
  from: CurrencyCode;
  to: CurrencyCode;
  amount: number;
  provider: string;
  marketRate: number;
  markupPct: number;
  quotedAmount: number;
}
