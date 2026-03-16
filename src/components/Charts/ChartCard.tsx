'use client';

import { useRef, useCallback } from 'react';
import styles from './Charts.module.css';

interface Props {
  title: string;
  subtitle: string;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  children: React.ReactNode;
}

export default function ChartCard({
  title, subtitle, from, to, onFromChange, onToChange, children,
}: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    const el = chartRef.current;
    if (!el) return;

    const { default: html2canvas } = await import('html2canvas-pro');
    const canvas = await html2canvas(el, {
      backgroundColor: '#ffffff',
      scale: 2,
    });
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [title]);

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div>
          <h3 className={styles.chartTitle}>{title}</h3>
          <p className={styles.chartSub}>{subtitle}</p>
        </div>
        <div className={styles.chartActions}>
          <div className={styles.dateFilters}>
            <input
              type="date"
              className={styles.dateInput}
              value={from}
              onChange={e => onFromChange(e.target.value)}
              aria-label="From date"
            />
            <span className={styles.dateSep}>&ndash;</span>
            <input
              type="date"
              className={styles.dateInput}
              value={to}
              onChange={e => onToChange(e.target.value)}
              aria-label="To date"
            />
          </div>
          <button
            className={styles.downloadBtn}
            onClick={handleDownload}
            title="Download chart as PNG"
            aria-label="Download chart"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v8m0 0L5 7m3 3l3-3" />
              <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" />
            </svg>
          </button>
        </div>
      </div>
      <div ref={chartRef} className={styles.chartWrap}>
        {children}
      </div>
    </div>
  );
}
