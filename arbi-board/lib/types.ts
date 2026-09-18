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

export interface BestQuote {
  provider: string;
  rate: number;
  amountReceived: number;
}

export interface ArbitrageLeg {
  from: CurrencyCode;
  to: CurrencyCode;
  amountIn: number;
  results: ProviderResult[];
  best: BestQuote | null;
}

export interface ArbitrageResponse {
  amount: number;
  from: CurrencyCode;
  to: CurrencyCode;
  via: CurrencyCode;
  direct: ArbitrageLeg;
  hop1: ArbitrageLeg;
  hop2: ArbitrageLeg | null;
  pathFinalAmount: number | null;
  profit: number | null;
  betterOption: 'direct' | 'path' | 'unknown';
}
