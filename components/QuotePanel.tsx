'use client';

interface QuotePanelProps {
  providerLabel: string;
  baseAmount: number;
  toCurrency: string;
  markupPct: string;
  onMarkupChange: (value: string) => void;
  onLogQuote: () => void;
}

export function QuotePanel({
  providerLabel,
  baseAmount,
  toCurrency,
  markupPct,
  onMarkupChange,
  onLogQuote,
}: QuotePanelProps) {
  const markupValue = parseFloat(markupPct);
  const hasMarkup = markupPct.trim() !== '' && !Number.isNaN(markupValue);
  const quotedAmount = hasMarkup ? baseAmount * (1 - markupValue / 100) : baseAmount;

  return (
    <div className="mt-4 border-l-2 border-ochre bg-ochre/[0.06] px-4 py-4">
      <div className="text-xs uppercase tracking-wide text-ochre font-semibold">
        Your quote — based on {providerLabel}
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <label htmlFor="markup" className="text-sm text-ink/70">
          Markup %
        </label>
        <input
          id="markup"
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder="0.0"
          value={markupPct}
          onChange={(e) => onMarkupChange(e.target.value)}
          className="tabular w-24 border-b border-hairline bg-transparent text-right text-sm py-1 focus:outline-none focus:border-ochre"
        />
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-sm text-ink/70">Quoted amount</span>
        <span className="tabular text-lg font-semibold">
          {quotedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {toCurrency}
        </span>
      </div>

      <button
        type="button"
        onClick={onLogQuote}
        className="mt-4 w-full bg-ochre text-paper text-sm font-medium py-2.5 hover:bg-ochre/90 transition-colors"
      >
        Log this
      </button>
    </div>
  );
}
