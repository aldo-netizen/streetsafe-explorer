'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from './SummaryCards.module.css';
import type { StatsResponse } from '@/types';

type Period = '30d' | '90d' | '1y' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '1y': 'Last year',
  'all': 'All time',
};

function PeriodSelect({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  return (
    <select
      className={styles.periodSelect}
      value={value}
      onChange={e => onChange(e.target.value as Period)}
    >
      {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([k, label]) => (
        <option key={k} value={k}>{label}</option>
      ))}
    </select>
  );
}

export default function SummaryCards() {
  const [period, setPeriod] = useState<Period>('all');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback((p: Period) => {
    setLoading(true);
    fetch(`/api/stats?period=${p}`)
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStats(period); }, [period, fetchStats]);

  const handlePeriodChange = (p: Period) => setPeriod(p);

  if (!stats && loading) {
    return <div className={styles.grid}>{[1,2,3,4].map(i => (
      <div key={i} className={styles.card}><div className={styles.skeleton} /></div>
    ))}</div>;
  }

  if (!stats) return null;

  const periodLabel = PERIOD_LABELS[period];

  return (
    <div className={styles.grid}>
      <div className={`${styles.card} ${loading ? styles.cardLoading : ''}`}>
        <div className={styles.cardHeader}>
          <div className={styles.label}>Total<br />Samples</div>
          <PeriodSelect value={period} onChange={handlePeriodChange} />
        </div>
        <div className={styles.cardBody}>
          <div className={styles.value}>{stats.totalSamples.toLocaleString()}</div>
          <div className={styles.sub}>
            {period === 'all' ? `${stats.recentSamples.toLocaleString()} in last 30 days` : periodLabel}
          </div>
        </div>
      </div>
      <div className={`${styles.card} ${loading ? styles.cardLoading : ''}`}>
        <div className={styles.cardHeader}>
          <div className={styles.label}>Fentanyl<br />Positive</div>
          <PeriodSelect value={period} onChange={handlePeriodChange} />
        </div>
        <div className={styles.cardBody}>
          <div className={`${styles.value} ${styles.valueDanger}`}>{stats.fentanylPercent}%</div>
          <div className={styles.sub}>of samples tested</div>
        </div>
      </div>
      <div className={`${styles.card} ${loading ? styles.cardLoading : ''}`}>
        <div className={styles.cardHeader}>
          <div className={styles.label}>Top<br />Substance</div>
          <PeriodSelect value={period} onChange={handlePeriodChange} />
        </div>
        <div className={styles.cardBody}>
          <div className={`${styles.value} ${styles.valueSmall}`}>
            {stats.topSubstances[0]?.name || '—'}
          </div>
          <div className={styles.sub}>{stats.topSubstances[0]?.count.toLocaleString()} detections</div>
        </div>
      </div>
      <div className={`${styles.card} ${loading ? styles.cardLoading : ''}`}>
        <div className={styles.cardHeader}>
          <div className={styles.label}>Geographic<br />Coverage</div>
          <PeriodSelect value={period} onChange={handlePeriodChange} />
        </div>
        <div className={styles.cardBody}>
          <div className={styles.value}>{stats.cityCount.toLocaleString()}</div>
          <div className={styles.sub}>cities across {stats.stateCount} states</div>
        </div>
      </div>
    </div>
  );
}
