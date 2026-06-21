import type { ReactNode } from "react";

export interface TableProps {
  columns: string[];
  rows: ReactNode[][];
  /** Shown in place of the table body when there are no rows. */
  empty?: string;
}

/** Shared data table. Header cells from `columns`, one `<tr>` per row. */
export function Table({ columns, rows, empty }: TableProps) {
  if (rows.length === 0 && empty) {
    return <p className="table-empty">{empty}</p>;
  }
  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i}>
            {cells.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
