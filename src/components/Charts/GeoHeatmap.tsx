'use client';

import { useEffect, useState } from 'react';
import ChartCard from './ChartCard';
import styles from './Charts.module.css';

interface HeatmapRow {
  location: string;
  state: string;
  count: number;
  fentanyl_pct: number;
  xylazine_pct: number;
}

export default function GeoHeatmap() {
  const [data, setData] = useState<HeatmapRow[]>([]);
  const [maxCount, setMaxCount] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ type: 'geo-heatmap' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    fetch(`/api/charts?${params}`)
      .then(r => r.json())
      .then((rows: HeatmapRow[]) => {
        setData(rows);
        setMaxCount(Math.max(1, ...rows.map(r => r.count)));
      });
  }, [from, to]);

  const getCellBg = (count: number) => {
    const intensity = Math.min(1, count / maxCount);
    const lightness = 0.96 - intensity * 0.34;
    const chroma = 0.008 + intensity * 0.177;
    return `oklch(${lightness} ${chroma} 275)`;
  };

  const getTextColor = (count: number) => {
    const intensity = Math.min(1, count / maxCount);
    return intensity > 0.5 ? 'white' : 'var(--color-text)';
  };

  return (
    <ChartCard
      title="Geographic Sample Density"
      subtitle="Sample volume and substance prevalence by city"
      from={from} to={to} onFromChange={setFrom} onToChange={setTo}
    >
      <div className={styles.geoHeatmapGrid}>
        {data.map(row => (
          <div
            key={`${row.location}-${row.state}`}
            className={styles.geoHeatmapCell}
            style={{
              background: getCellBg(row.count),
              color: getTextColor(row.count),
            }}
            title={`${row.location}${row.state ? `, ${row.state}` : ''}: ${row.count} samples`}
          >
            <div className={styles.geoHeatmapCity}>{row.location}</div>
            {row.state && (
              <div className={styles.geoHeatmapState} style={{ color: getTextColor(row.count) === 'white' ? 'rgba(255,255,255,0.7)' : undefined }}>
                {row.state}
              </div>
            )}
            <div className={styles.geoHeatmapStats}>
              <span className={styles.geoHeatmapStat} style={{ color: 'inherit' }}>
                <span className={styles.geoHeatmapStatVal}>{row.count.toLocaleString()}</span> samples
              </span>
              <span className={styles.geoHeatmapStat} style={{ color: 'inherit' }}>
                <span className={styles.geoHeatmapStatVal}>{row.fentanyl_pct}%</span> fent
              </span>
              <span className={styles.geoHeatmapStat} style={{ color: 'inherit' }}>
                <span className={styles.geoHeatmapStatVal}>{row.xylazine_pct}%</span> xyl
              </span>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
