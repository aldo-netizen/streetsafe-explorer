'use client';

import { useEffect, useState } from 'react';
import ChartCard from './ChartCard';
import styles from './Charts.module.css';

const SUBSTANCES = ['fentanyl', 'heroin', 'xylazine', 'medetomidine', 'acetaminophen'];

interface Cell {
  row: string;
  col: string;
  count: number;
}

export default function CoOccurrence() {
  const [matrix, setMatrix] = useState<Cell[]>([]);
  const [maxVal, setMaxVal] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ type: 'co-occurrence' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    fetch(`/api/charts?${params}`)
      .then(r => r.json())
      .then((cells: Cell[]) => {
        setMatrix(cells);
        const offDiag = cells.filter(c => c.row !== c.col);
        const max = Math.max(1, ...offDiag.map(c => c.count));
        setMaxVal(max);
      });
  }, [from, to]);

  const getCount = (row: string, col: string) => {
    return matrix.find(c => c.row === row && c.col === col)?.count || 0;
  };

  const getColor = (row: string, col: string) => {
    if (row === col) return 'oklch(0.96 0.034 275)';
    const count = getCount(row, col);
    const intensity = Math.min(1, count / maxVal);
    const lightness = 0.96 - intensity * 0.33;
    const chroma = 0.034 + intensity * 0.15;
    return `oklch(${lightness} ${chroma} 275)`;
  };

  const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1, 5);

  return (
    <ChartCard
      title="Substance Co-occurrence"
      subtitle="How often pairs of substances appear together in the same sample"
      from={from} to={to} onFromChange={setFrom} onToChange={setTo}
    >
      <div className={styles.heatmapWrap}>
        <table className={styles.heatmap}>
          <thead>
            <tr>
              <th></th>
              {SUBSTANCES.map(s => <th key={s}>{label(s)}</th>)}
            </tr>
          </thead>
          <tbody>
            {SUBSTANCES.map(row => (
              <tr key={row}>
                <th>{label(row)}</th>
                {SUBSTANCES.map(col => (
                  <td
                    key={col}
                    style={{ background: getColor(row, col) }}
                    title={`${row} + ${col}: ${getCount(row, col).toLocaleString()}`}
                  >
                    {getCount(row, col).toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
