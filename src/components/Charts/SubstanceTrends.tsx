'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import ChartCard from './ChartCard';

const COLORS: Record<string, string> = {
  fentanyl: '#b91c1c',
  heroin: '#a16207',
  xylazine: '#7c3aed',
  medetomidine: '#0891b2',
  acetaminophen: '#737373',
};

interface TrendRow {
  month: string;
  fentanyl: number;
  heroin: number;
  xylazine: number;
  medetomidine: number;
  acetaminophen: number;
  total: number;
}

export default function SubstanceTrends() {
  const [data, setData] = useState<TrendRow[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ type: 'substance-trends' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    fetch(`/api/charts?${params}`)
      .then(r => r.json())
      .then((rows: TrendRow[]) => {
        setData(rows.map(r => ({
          ...r,
          fentanyl: r.total > 0 ? Math.round((r.fentanyl / r.total) * 1000) / 10 : 0,
          heroin: r.total > 0 ? Math.round((r.heroin / r.total) * 1000) / 10 : 0,
          xylazine: r.total > 0 ? Math.round((r.xylazine / r.total) * 1000) / 10 : 0,
          medetomidine: r.total > 0 ? Math.round((r.medetomidine / r.total) * 1000) / 10 : 0,
          acetaminophen: r.total > 0 ? Math.round((r.acetaminophen / r.total) * 1000) / 10 : 0,
        })));
      });
  }, [from, to]);

  return (
    <ChartCard
      title="Substance Prevalence Over Time"
      subtitle="Percentage of samples testing positive each month"
      from={from} to={to} onFromChange={setFrom} onToChange={setTo}
    >
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.936 0.006 256)" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit="%" />
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend />
          {Object.entries(COLORS).map(([key, color]) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={2}
              dot={false}
              name={key.charAt(0).toUpperCase() + key.slice(1)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
