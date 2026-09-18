'use client';

import { HistoryRecord } from '@/lib/types';

interface HistoryTableProps {
  history: HistoryRecord[];
  onExportCsv: () => void;
}

export function HistoryTable({ history, onExportCsv }: HistoryTableProps) {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between border-b border-hairline pb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/70">History</h2>
        {history.length > 0 && (
          <button
            type="button"
            onClick={onExportCsv}
            className="text-xs text-ink/60 underline underline-offset-2 hover:text-ink"
          >
            Export CSV
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="mt-3 text-sm text-ink/40">No quotes logged yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full mt-2 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Pair</th>
                <th className="py-2 pr-3 font-medium text-right">Amount</th>
                <th className="py-2 pr-3 font-medium">Provider</th>
                <th className="py-2 pr-3 font-medium text-right">Rate</th>
                <th className="py-2 pr-3 font-medium text-right">Markup %</th>
                <th className="py-2 font-medium text-right">Quoted</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => (
                <tr key={record.id} className="border-b border-hairline">
                  <td className="py-2 pr-3 whitespace-nowrap text-ink/70">{record.date}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {record.from} → {record.to}
                  </td>
                  <td className="tabular py-2 pr-3 text-right">
                    {record.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">{record.provider}</td>
                  <td className="tabular py-2 pr-3 text-right">
                    {record.marketRate.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </td>
                  <td className="tabular py-2 pr-3 text-right">{record.markupPct}</td>
                  <td className="tabular py-2 text-right font-medium">
                    {record.quotedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
