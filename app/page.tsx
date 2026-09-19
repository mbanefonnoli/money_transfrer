'use client';

import { useEffect, useState } from 'react';
import { CurrencyCode, HistoryRecord, Leg, ProviderId, ProviderResult, RatesResponse } from '@/lib/types';
import { RateRow } from '@/components/RateRow';
import { QuotePanel } from '@/components/QuotePanel';
import { HistoryTable } from '@/components/HistoryTable';
import { downloadHistoryCsv, loadHistory, saveHistoryRecord } from '@/lib/storage';

const PROVIDER_ORDER: { id: ProviderId; label: string }[] = [
  { id: 'wise', label: 'Wise' },
  { id: 'transfergo', label: 'TransferGo' },
  { id: 'taptapsend', label: 'Taptap Send' },
];

interface Selection {
  leg: Leg;
  providerId: ProviderId;
}

function bestProviderId(results: ProviderResult[] | undefined): ProviderId | null {
  if (!results) return null;
  let best: ProviderResult | null = null;
  for (const r of results) {
    if (r.status === 'ok' && r.amountReceived !== null) {
      if (!best || r.amountReceived > (best.amountReceived ?? -Infinity)) {
        best = r;
      }
    }
  }
  return best?.provider ?? null;
}

export default function Home() {
  const [amount, setAmount] = useState('100');
  const [foreignCurrency, setForeignCurrency] = useState<'RON' | 'EUR'>('EUR');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RatesResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [markupPct, setMarkupPct] = useState('');

  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const amountNumber = parseFloat(amount);
  const amountValid = !Number.isNaN(amountNumber) && amountNumber > 0;

  const bestBuyId = bestProviderId(results?.buy);
  const bestSellId = bestProviderId(results?.sell);

  const selectedResult = selection
    ? (results?.[selection.leg].find((r) => r.provider === selection.providerId) ?? null)
    : null;

  // BUY: foreignCurrency -> NGN. SELL: NGN -> foreignCurrency.
  const selectedFrom: CurrencyCode | null = selection
    ? selection.leg === 'buy'
      ? foreignCurrency
      : 'NGN'
    : null;
  const selectedTo: CurrencyCode | null = selection
    ? selection.leg === 'buy'
      ? 'NGN'
      : foreignCurrency
    : null;

  async function handleCompare() {
    if (!amountValid) return;
    setLoading(true);
    setErrorMsg(null);
    setResults(null);
    setSelection(null);
    setMarkupPct('');

    try {
      const res = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNumber, foreignCurrency }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data: RatesResponse = await res.json();
      setResults(data);
    } catch {
      setErrorMsg('Could not reach the rates service. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleLogQuote() {
    if (
      !selectedResult ||
      selectedResult.status !== 'ok' ||
      selectedResult.amountReceived === null ||
      !selectedFrom ||
      !selectedTo
    ) {
      return;
    }
    const markupValue = parseFloat(markupPct);
    const hasMarkup = markupPct.trim() !== '' && !Number.isNaN(markupValue);
    const quotedAmount = hasMarkup
      ? selectedResult.amountReceived * (1 - markupValue / 100)
      : selectedResult.amountReceived;

    const record: HistoryRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      date: new Date().toLocaleString(),
      from: selectedFrom,
      to: selectedTo,
      amount: amountNumber,
      provider: selectedResult.label,
      marketRate: selectedResult.rate ?? 0,
      markupPct: hasMarkup ? markupValue : 0,
      quotedAmount,
    };

    setHistory(saveHistoryRecord(record));
  }

  return (
    <main className="min-h-screen">
      <header className="bg-navy py-5">
        <div className="max-w-board mx-auto px-4">
          <h1 className="text-paper text-lg font-semibold tracking-wide">RATE BOARD</h1>
          <p className="text-paper/60 text-xs mt-0.5">Compare, then quote.</p>
        </div>
      </header>

      <div className="max-w-board mx-auto px-4 pb-16">
        <section className="mt-6">
          <label htmlFor="amount" className="text-xs uppercase tracking-wide text-ink/50">
            Amount
          </label>
          <input
            id="amount"
            type="number"
            inputMode="decimal"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="tabular w-full border-b border-hairline bg-transparent text-3xl font-semibold py-2 focus:outline-none focus:border-navy"
            placeholder="0"
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="tabular text-lg font-semibold">NGN / {foreignCurrency}</div>
          </div>

          <div className="mt-2 flex gap-2">
            {(['RON', 'EUR'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForeignCurrency(c)}
                className={`px-3 py-1.5 text-sm border ${
                  foreignCurrency === c
                    ? 'border-navy bg-navy text-paper'
                    : 'border-hairline text-ink/70 hover:bg-ink/[0.03]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCompare}
            disabled={!amountValid || loading}
            className="mt-5 w-full bg-navy text-paper text-sm font-medium py-3 disabled:opacity-40 hover:bg-navy/90 transition-colors"
          >
            {loading ? 'Comparing…' : 'Compare rates'}
          </button>

          {errorMsg && <p className="mt-2 text-sm text-ink/60">{errorMsg}</p>}
        </section>

        {(loading || results) && (
          <section className="mt-6">
            {PROVIDER_ORDER.map((provider) => (
              <RateRow
                key={provider.id}
                provider={provider}
                foreignCurrency={foreignCurrency}
                buyResult={results?.buy.find((r) => r.provider === provider.id) ?? null}
                sellResult={results?.sell.find((r) => r.provider === provider.id) ?? null}
                loading={loading}
                isBestBuy={provider.id === bestBuyId}
                isBestSell={provider.id === bestSellId}
                isSelectedBuy={selection?.leg === 'buy' && selection.providerId === provider.id}
                isSelectedSell={selection?.leg === 'sell' && selection.providerId === provider.id}
                onSelectBuy={() => setSelection({ leg: 'buy', providerId: provider.id })}
                onSelectSell={() => setSelection({ leg: 'sell', providerId: provider.id })}
              />
            ))}
          </section>
        )}

        {selectedResult &&
          selectedResult.status === 'ok' &&
          selectedResult.amountReceived !== null &&
          selectedTo && (
            <QuotePanel
              providerLabel={`${selectedResult.label} (${selection?.leg === 'buy' ? 'buy' : 'sell'} ${foreignCurrency})`}
              baseAmount={selectedResult.amountReceived}
              toCurrency={selectedTo}
              markupPct={markupPct}
              onMarkupChange={setMarkupPct}
              onLogQuote={handleLogQuote}
            />
          )}

        <HistoryTable history={history} onExportCsv={() => downloadHistoryCsv(history)} />
      </div>
    </main>
  );
}
