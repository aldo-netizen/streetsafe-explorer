'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './SampleDetail.module.css';
import type { CityInfo } from '@/types';

interface Props {
  city: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function CityExpander({ city, isOpen }: Props) {
  const [data, setData] = useState<CityInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const cache = useRef<Map<string, CityInfo>>(new Map());

  useEffect(() => {
    if (!isOpen) return;

    const cached = cache.current.get(city);
    if (cached) { setData(cached); return; }

    setLoading(true);
    fetch(`/api/cities/${encodeURIComponent(city)}`)
      .then(r => r.json())
      .then((info: CityInfo) => {
        cache.current.set(city, info);
        setData(info);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, city]);

  if (!isOpen) return null;

  const fentanylDiff = data ? data.fentanyl_pct - data.overall_fentanyl_pct : 0;
  const isAbove = fentanylDiff > 0;

  return (
    <div className={styles.cityExpansion}>
      {loading ? (
        <div className={styles.expansionSkeleton}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} style={{ width: '60%' }} />
        </div>
      ) : data ? (
        <>
          <div className={styles.cityStats}>
            <div className={styles.cityStat}>
              <span className={styles.cityStatValue}>{data.sample_count.toLocaleString()}</span>
              <span className={styles.cityStatLabel}>samples from {city}</span>
            </div>
            <div className={styles.cityStat}>
              <span className={`${styles.cityStatValue} ${isAbove ? styles.fentanylAbove : styles.fentanylBelow}`}>
                {data.fentanyl_pct}%
              </span>
              <span className={styles.cityStatLabel}>
                fentanyl rate {isAbove ? '↑' : '↓'} ({data.overall_fentanyl_pct}% overall)
              </span>
            </div>
          </div>
          {data.top_substances.length > 0 && (
            <div className={styles.citySubstances}>
              <span className={styles.expansionLabel}>Top substances</span>
              <div className={styles.coOccList}>
                {data.top_substances.slice(0, 5).map((s, i) => (
                  <span key={i} className={styles.coOccPill}>
                    {s.substance} <span className={styles.pillCount}>({s.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.expansionError}>Could not load city data</div>
      )}
    </div>
  );
}
