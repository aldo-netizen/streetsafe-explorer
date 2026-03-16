'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './SampleDetail.module.css';
import type { SubstanceInfo } from '@/types';

interface Props {
  substanceName: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function SubstanceExpander({ substanceName, isOpen, onToggle }: Props) {
  const [data, setData] = useState<SubstanceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const cache = useRef<Map<string, SubstanceInfo>>(new Map());

  useEffect(() => {
    if (!isOpen) return;

    const cached = cache.current.get(substanceName);
    if (cached) { setData(cached); return; }

    setLoading(true);
    fetch(`/api/substances/${encodeURIComponent(substanceName)}`)
      .then(r => r.json())
      .then((info: SubstanceInfo) => {
        cache.current.set(substanceName, info);
        setData(info);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, substanceName]);

  if (!isOpen) return null;

  return (
    <div className={styles.expansion}>
      {loading ? (
        <div className={styles.expansionSkeleton}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} style={{ width: '70%' }} />
          <div className={styles.skeletonLine} style={{ width: '50%' }} />
        </div>
      ) : data ? (
        <>
          {data.description && (
            <p className={styles.expansionDesc}>{data.description}</p>
          )}
          <div className={styles.expansionStat}>
            <span className={styles.expansionLabel}>Frequency</span>
            <span className={styles.expansionValue}>
              Found in {data.frequency_pct}% of all samples ({data.sample_count.toLocaleString()} of {data.total_samples.toLocaleString()})
            </span>
          </div>
          {data.co_occurrences.length > 0 && (
            <div className={styles.expansionStat}>
              <span className={styles.expansionLabel}>Often found with</span>
              <div className={styles.coOccList}>
                {data.co_occurrences.map((co, i) => (
                  <span key={i} className={styles.coOccPill}>{co.substance}</span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.expansionError}>Could not load substance data</div>
      )}
    </div>
  );
}
