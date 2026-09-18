'use client';

import { useEffect, useState } from 'react';
import { CurrencyCode, HistoryRecord, ProviderId, ProviderResult } from '@/lib/types';
import { RateRow } from '@/components/RateRow';
import { QuotePanel } from '@/components/QuotePanel';
import { HistoryTable } from '@/components/HistoryTable';
import { downloadHistoryCsv, loadHistory, saveHistoryRecord } from '@/lib/storage';

const PROVIDER_ORDER: { id: ProviderId; label: string }[] = [
  { id: 'wise', label: 'Wise' },
  { id: 'transfergo', label: 'TransferGo' },
  { id: 'taptapsend', label: 'Taptap Send' },
];

export default function Home() {
  const [amount, setAmount] = useState('100');
  const [foreignCurrency, setForeignCurrency] = useState<'RON' | 'EUR'>('EUR');
  const [direction, setDirection] = useState<'fromNGN' | 'toNGN'>('fromNGN');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProviderResult[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(null);
  const [markupPct, setMarkupPct] = useState('');

  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const from: CurrencyCode = direction === 'fromNGN' ? 'NGN' : foreignCurrency;
  const to: CurrencyCode = direction === 'fromNGN' ? foreignCurrency : 'NGN';

  const amountNumber = parseFloat(amount);
  const amountValid = !Number.isNaN(amountNumber) && amountNumber > 0;

  const bestProviderId = (() => {
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
  })();

  const selectedResult = results?.find((r) => r.provider === selectedProvider) ?? null;

  async function handleCompare() {
    if (!amountValid) return;
    setLoading(true);
    setErrorMsg(null);
    setResults(null);
    setSelectedProvider(null);
    setMarkupPct('');

    try {
      const res = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNumber, from, to }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data: ProviderResult[] = await res.json();
      setResults(data);
    } catch {
      setErrorMsg('Could not reach the rates service. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectProvider(providerId: ProviderId) {
    setSelectedProvider(providerId);
  }

  function handleLogQuote() {
    if (!selectedResult || selectedResult.status !== 'ok' || selectedResult.amountReceived === null) {
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
      from,
      to,
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
            <div className="tabular text-lg font-semibold">
              {from} → {to}
            </div>
            <button
              type="button"
              aria-label="Swap direction"
              onClick={() => setDirection((d) => (d === 'fromNGN' ? 'toNGN' : 'fromNGN'))}
              className="border border-hairline px-3 py-1.5 text-sm hover:bg-ink/[0.03]"
            >
              Swap
            </button>
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
                result={results?.find((r) => r.provider === provider.id) ?? null}
                loading={loading}
                isBest={provider.id === bestProviderId}
                isSelected={provider.id === selectedProvider}
                toCurrency={to}
                onSelect={() => handleSelectProvider(provider.id)}
              />
            ))}
          </section>
        )}

        {selectedResult && selectedResult.status === 'ok' && selectedResult.amountReceived !== null && (
          <QuotePanel
            providerLabel={selectedResult.label}
            baseAmount={selectedResult.amountReceived}
            toCurrency={to}
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
