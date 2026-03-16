'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import ChartCard from './ChartCard';

interface GeoRow {
  location: string;
  count: number;
}

export default function GeoDistribution() {
  const [data, setData] = useState<GeoRow[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ type: 'geo-distribution' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    fetch(`/api/charts?${params}`)
      .then(r => r.json())
      .then(setData);
  }, [from, to]);

  return (
    <ChartCard
      title="Top Locations by Sample Count"
      subtitle="Top 20 cities with the most submitted samples"
      from={from} to={to} onFromChange={setFrom} onToChange={setTo}
    >
      <ResponsiveContainer width="100%" height={500}>
        <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.936 0.006 256)" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="location" tick={{ fontSize: 11 }} width={90} />
          <Tooltip />
          <Bar dataKey="count" fill="oklch(0.632 0.185 275)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
