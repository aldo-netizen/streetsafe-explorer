'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import ChartCard from './ChartCard';

interface MismatchRow {
  assumed: string;
  total: number;
  mismatches: number;
}

export default function MismatchRates() {
  const [data, setData] = useState<MismatchRow[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ type: 'mismatch-rates' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    fetch(`/api/charts?${params}`)
      .then(r => r.json())
      .then((rows: MismatchRow[]) => {
        setData(rows.map(r => ({
          ...r,
          matches: r.total - r.mismatches,
          mismatchPct: r.total > 0 ? Math.round((r.mismatches / r.total) * 100) : 0,
        })));
      });
  }, [from, to]);

  return (
    <ChartCard
      title="Expected vs Actual Substance"
      subtitle="How often what people thought they had matched what was detected"
      from={from} to={to} onFromChange={setFrom} onToChange={setTo}
    >
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.936 0.006 256)" />
          <XAxis dataKey="assumed" tick={{ fontSize: 10, angle: -30 }} height={60} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="matches" stackId="a" fill="oklch(0.527 0.154 150.069)" name="Matched" />
          <Bar dataKey="mismatches" stackId="a" fill="#b91c1c" name="Mismatched" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
