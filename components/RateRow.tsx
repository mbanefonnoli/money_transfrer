'use client';

import { CurrencyCode, ProviderResult } from '@/lib/types';

interface LegCellProps {
  label: string;
  result: ProviderResult | null;
  loading: boolean;
  isBest: boolean;
  isSelected: boolean;
  currency: CurrencyCode;
  onSelect: () => void;
}

function LegCell({ label, result, loading, isBest, isSelected, currency, onSelect }: LegCellProps) {
  const selectable = !!result && result.status === 'ok';

  return (
    <button
      type="button"
      onClick={selectable ? onSelect : undefined}
      disabled={!selectable}
      className={`flex-1 text-left px-2 py-1.5 transition-colors ${
        selectable ? 'cursor-pointer hover:bg-ink/[0.03]' : 'cursor-default'
      } ${isSelected ? 'bg-emerald/[0.06]' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-ink/40">{label}</span>
        {isBest && (
          <span className="text-emerald text-[10px] font-semibold uppercase tracking-wide">
            Best
          </span>
        )}
      </div>

      {loading && (
        <div className="mt-1 flex flex-col gap-1">
          <span className="block h-3 w-16 bg-ink/10 animate-pulse rounded-[2px]" />
          <span className="block h-2.5 w-12 bg-ink/10 animate-pulse rounded-[2px]" />
        </div>
      )}

      {!loading && (!result || result.status === 'unavailable') && (
        <div className="mt-0.5 text-sm text-ink/40">unavailable</div>
      )}

      {!loading && result && result.status === 'ok' && (
        <div>
          <div className={`tabular text-sm font-semibold ${isBest ? 'text-emerald' : 'text-ink'}`}>
            {result.amountReceived?.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
            {currency}
          </div>
          <div className="tabular text-[11px] text-ink/50">
            rate {result.rate?.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </div>
        </div>
      )}
    </button>
  );
}

interface RateRowProps {
  provider: { id: string; label: string };
  foreignCurrency: CurrencyCode;
  buyResult: ProviderResult | null;
  sellResult: ProviderResult | null;
  loading: boolean;
  isBestBuy: boolean;
  isBestSell: boolean;
  isSelectedBuy: boolean;
  isSelectedSell: boolean;
  onSelectBuy: () => void;
  onSelectSell: () => void;
}

export function RateRow({
  provider,
  foreignCurrency,
  buyResult,
  sellResult,
  loading,
  isBestBuy,
  isBestSell,
  isSelectedBuy,
  isSelectedSell,
  onSelectBuy,
  onSelectSell,
}: RateRowProps) {
  return (
    <div className="border-b border-hairline py-1">
      <div className="px-1 pt-1.5 text-sm font-medium">{provider.label}</div>
      <div className="flex items-stretch divide-x divide-hairline">
        <LegCell
          label={`Buy ${foreignCurrency}`}
          result={buyResult}
          loading={loading}
          isBest={isBestBuy}
          isSelected={isSelectedBuy}
          currency="NGN"
          onSelect={onSelectBuy}
        />
        <LegCell
          label={`Sell ${foreignCurrency}`}
          result={sellResult}
          loading={loading}
          isBest={isBestSell}
          isSelected={isSelectedSell}
          currency={foreignCurrency}
          onSelect={onSelectSell}
        />
      </div>
    </div>
  );
}
