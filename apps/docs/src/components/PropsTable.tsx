import type {ReactNode} from 'react';

export interface PropRow {
  default?: string;
  description: ReactNode;
  name: string;
  type: string;
}

interface PropsTableProps {
  rows: PropRow[];
}

export default function PropsTable({rows}: PropsTableProps) {
  return (
    <div className="props-table">
      <table>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>
                <code>{row.name}</code>
              </td>
              <td>
                <code>{row.type}</code>
              </td>
              <td>{row.default ? <code>{row.default}</code> : <span aria-hidden>—</span>}</td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}