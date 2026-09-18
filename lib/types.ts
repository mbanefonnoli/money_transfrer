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
}

export interface RatesRequest {
  amount: number;
  from: CurrencyCode;
  to: CurrencyCode;
}

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
