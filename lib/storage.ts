import { HistoryRecord } from './types';

const STORAGE_KEY = 'rate-board:history';

export function loadHistory(): HistoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistoryRecord(record: HistoryRecord): HistoryRecord[] {
  const history = [record, ...loadHistory()];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
}

const CSV_COLUMNS: { key: keyof HistoryRecord; header: string }[] = [
  { key: 'date', header: 'Date' },
  { key: 'from', header: 'From' },
  { key: 'to', header: 'To' },
  { key: 'amount', header: 'Amount' },
  { key: 'provider', header: 'Provider' },
  { key: 'marketRate', header: 'Market rate' },
  { key: 'markupPct', header: 'Markup %' },
  { key: 'quotedAmount', header: 'Quoted amount' },
];

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function historyToCsv(history: HistoryRecord[]): string {
  const rows = [
    CSV_COLUMNS.map((c) => c.header).join(','),
    ...history.map((record) =>
      CSV_COLUMNS.map((c) => csvEscape(record[c.key])).join(',')
    ),
  ];
  return rows.join('\n');
}

export function downloadHistoryCsv(history: HistoryRecord[]): void {
  const csv = historyToCsv(history);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rate-board-history-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
