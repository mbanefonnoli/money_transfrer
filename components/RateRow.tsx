'use client';

import { ProviderResult } from '@/lib/types';

interface RateRowProps {
  provider: { id: string; label: string };
  result: ProviderResult | null;
  loading: boolean;
  isBest: boolean;
  isSelected: boolean;
  toCurrency: string;
  onSelect: () => void;
}

export function RateRow({
  provider,
  result,
  loading,
  isBest,
  isSelected,
  toCurrency,
  onSelect,
}: RateRowProps) {
  const selectable = !!result && result.status === 'ok';

  return (
    <button
      type="button"
      onClick={selectable ? onSelect : undefined}
      disabled={!selectable}
      className={`w-full text-left border-b border-hairline py-3 px-1 flex items-center justify-between gap-4 transition-colors ${
        selectable ? 'cursor-pointer hover:bg-ink/[0.03]' : 'cursor-default'
      } ${isSelected ? 'bg-emerald/[0.06]' : ''}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isBest && (
          <span className="text-emerald text-xs font-semibold uppercase tracking-wide shrink-0">
            Best
          </span>
        )}
        <span className="truncate text-sm font-medium">{provider.label}</span>
      </div>

      <div className="text-right shrink-0">
        {loading && (
          <div className="flex flex-col items-end gap-1">
            <span className="block h-3 w-20 bg-ink/10 animate-pulse rounded-[2px]" />
            <span className="block h-3 w-14 bg-ink/10 animate-pulse rounded-[2px]" />
          </div>
        )}

        {!loading && (!result || result.status === 'unavailable') && (
          <span className="text-sm text-ink/40">rate unavailable</span>
        )}

        {!loading && result && result.status === 'ok' && (
          <div>
            <div
              className={`tabular text-sm font-semibold ${isBest ? 'text-emerald' : 'text-ink'}`}
            >
              {result.amountReceived?.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{' '}
              {toCurrency}
            </div>
            <div className="tabular text-xs text-ink/50">
              rate {result.rate?.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
