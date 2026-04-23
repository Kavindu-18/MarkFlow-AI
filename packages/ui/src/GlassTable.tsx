import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface GlassTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function GlassTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data',
}: GlassTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/5 backdrop-blur-md">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-sm font-semibold text-white/70 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-white/40">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={[
                  'border-b border-white/5 transition-colors',
                  onRowClick ? 'cursor-pointer hover:bg-white/10' : '',
                ].join(' ')}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-white/90">
                    {col.render ? col.render(item) : String(item[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
