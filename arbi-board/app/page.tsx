'use client';

import { useState } from 'react';
import { ArbitrageResponse, CurrencyCode } from '@/lib/types';
import { LegRows } from '@/components/LegRows';

export default function Home() {
  const [amount, setAmount] = useState('500');
  const [foreignCurrency, setForeignCurrency] = useState<'RON' | 'EUR'>('EUR');
  const [direction, setDirection] = useState<'fromNGN' | 'toNGN'>('fromNGN');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ArbitrageResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const from: CurrencyCode = direction === 'fromNGN' ? 'NGN' : foreignCurrency;
  const to: CurrencyCode = direction === 'fromNGN' ? foreignCurrency : 'NGN';

  const amountNumber = parseFloat(amount);
  const amountValid = !Number.isNaN(amountNumber) && amountNumber > 0;

  async function handleCheck() {
    if (!amountValid) return;
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await fetch('/api/arbitrage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNumber, from, to }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data: ArbitrageResponse = await res.json();
      setResult(data);
    } catch {
      setErrorMsg('Could not reach the arbitrage service. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const profitPct =
    result?.profit !== null && result?.profit !== undefined && result.direct.best
      ? (result.profit / result.direct.best.amountReceived) * 100
      : null;

  return (
    <main className="min-h-screen">
      <header className="bg-navy py-5">
        <div className="max-w-board mx-auto px-4">
          <h1 className="text-paper text-lg font-semibold tracking-wide">ARBI BOARD</h1>
          <p className="text-paper/60 text-xs mt-0.5">Direct vs. via a third currency.</p>
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
            onClick={handleCheck}
            disabled={!amountValid || loading}
            className="mt-5 w-full bg-navy text-paper text-sm font-medium py-3 disabled:opacity-40 hover:bg-navy/90 transition-colors"
          >
            {loading ? 'Checking…' : 'Check arbitrage'}
          </button>

          <p className="mt-2 text-xs text-ink/40">
            This may take 15-25s — it's checking 3 providers across up to 3 real conversion legs
            (direct, plus two hops via the third currency), not cached or precomputed.
          </p>

          {errorMsg && <p className="mt-2 text-sm text-ink/60">{errorMsg}</p>}
        </section>

        {result && (
          <section className="mt-6 border-l-2 border-ochre bg-ochre/[0.06] px-4 py-4">
            {result.betterOption === 'path' && result.profit !== null && profitPct !== null && (
              <p className="text-sm">
                <span className="text-ochre font-semibold">Path via {result.via} wins</span> — +
                {result.profit.toLocaleString(undefined, { maximumFractionDigits: 2 })} {result.to}{' '}
                ({profitPct >= 0 ? '+' : ''}
                {profitPct.toFixed(2)}%) over the direct quote.
              </p>
            )}
            {result.betterOption === 'direct' && result.profit !== null && (
              <p className="text-sm">
                <span className="text-ink font-semibold">Direct route wins</span> — going via{' '}
                {result.via} would lose{' '}
                {Math.abs(result.profit).toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                {result.to}.
              </p>
            )}
            {result.betterOption === 'direct' && result.profit === null && (
              <p className="text-sm">
                <span className="text-ink font-semibold">Only the direct route has data</span> — the
                via-{result.via} path came back unavailable from every provider.
              </p>
            )}
            {result.betterOption === 'path' && result.profit === null && (
              <p className="text-sm">
                <span className="text-ochre font-semibold">Only the via-{result.via} path has data</span>{' '}
                — the direct route came back unavailable from every provider.
              </p>
            )}
            {result.betterOption === 'unknown' && (
              <p className="text-sm text-ink/60">
                No provider returned a rate for either route this time. Try again.
              </p>
            )}
          </section>
        )}

        {(loading || result) && (
          <LegRows
            title={`Direct: ${from} → ${to}`}
            leg={result?.direct ?? null}
            loading={loading}
          />
        )}

        {(loading || result) && (
          <LegRows
            title={`Hop 1: ${from} → ${result?.via ?? (foreignCurrency === 'RON' ? 'EUR' : 'RON')}`}
            leg={result?.hop1 ?? null}
            loading={loading}
          />
        )}

        {(loading || result) && (
          <LegRows
            title={
              result?.hop1?.best
                ? `Hop 2: ${result.via} → ${to} (using ${result.hop1.best.amountReceived.toLocaleString(
                    undefined,
                    { maximumFractionDigits: 2 }
                  )} ${result.via})`
                : `Hop 2: ${result?.via ?? ''} → ${to}`
            }
            leg={result?.hop2 ?? null}
            loading={loading}
          />
        )}
      </div>
    </main>
  );
}
