'use client';

import { ArbitrageLeg } from '@/lib/types';

interface LegRowsProps {
  title: string;
  leg: ArbitrageLeg | null;
  loading: boolean;
}

export function LegRows({ title, leg, loading }: LegRowsProps) {
  return (
    <div className="mt-5">
      <div className="text-xs uppercase tracking-wide text-ink/50">{title}</div>

      {loading && (
        <div className="mt-2 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-hairline">
              <span className="block h-3 w-24 bg-ink/10 animate-pulse rounded-[2px]" />
              <span className="block h-3 w-20 bg-ink/10 animate-pulse rounded-[2px]" />
            </div>
          ))}
        </div>
      )}

      {!loading && !leg && <p className="mt-2 text-sm text-ink/40">Not checked yet.</p>}

      {!loading && leg && (
        <div className="mt-1">
          {leg.results.map((r) => {
            const isBest = !!leg.best && leg.best.provider === r.label;
            return (
              <div
                key={r.provider}
                className="flex items-center justify-between py-2 border-b border-hairline"
              >
                <div className="flex items-center gap-2">
                  {isBest && (
                    <span className="text-emerald text-xs font-semibold uppercase tracking-wide">
                      Best
                    </span>
                  )}
                  <span className="text-sm font-medium">{r.label}</span>
                </div>
                {r.status === 'ok' ? (
                  <div className="text-right">
                    <div className={`tabular text-sm font-semibold ${isBest ? 'text-emerald' : 'text-ink'}`}>
                      {r.amountReceived?.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                      {leg.to}
                    </div>
                    <div className="tabular text-xs text-ink/50">
                      rate {r.rate?.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-ink/40">rate unavailable</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
