'use client';

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ChartSpec } from '@/types';

const COLORS = [
  'oklch(0.632 0.185 275)',
  '#b91c1c',
  '#a16207',
  'oklch(0.527 0.154 150.069)',
  '#7c3aed',
  '#0891b2',
];

interface Props {
  spec: ChartSpec;
}

export default function DynamicChart({ spec }: Props) {
  if (!spec.data || spec.data.length === 0) return null;

  return (
    <div style={{
      marginTop: 16,
      background: 'oklch(0.959 0.004 256)',
      borderRadius: 10,
      padding: 16,
    }}>
      {spec.title && (
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>
          {spec.title}
        </div>
      )}
      <ResponsiveContainer width="100%" height={280}>
        {spec.type === 'line' ? (
          <LineChart data={spec.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.936 0.006 256)" />
            <XAxis dataKey={spec.xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {spec.yKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                name={spec.labels?.[key] || key}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={spec.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.936 0.006 256)" />
            <XAxis dataKey={spec.xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {spec.yKeys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                fill={COLORS[i % COLORS.length]}
                name={spec.labels?.[key] || key}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
