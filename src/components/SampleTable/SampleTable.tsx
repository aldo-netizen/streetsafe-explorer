'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from './SampleTable.module.css';
import type { Sample, SamplesResponse } from '@/types';
import SampleDetail from '../SampleDetail/SampleDetail';

const SUBSTANCES = ['fentanyl', 'heroin', 'xylazine', 'medetomidine', 'acetaminophen'] as const;

export default function SampleTable() {
  const [data, setData] = useState<SamplesResponse | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [substance, setSubstance] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const fetchData = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '25');
    params.set('sort', sort);
    params.set('order', order);
    if (search) params.set('search', search);
    if (substance) params.set('substance', substance);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    fetch(`/api/samples?${params}`)
      .then(r => r.json())
      .then(setData);
  }, [page, sort, order, search, substance, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (col: string) => {
    if (sort === col) {
      setOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(col);
      setOrder('desc');
    }
    setPage(1);
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const sortIcon = (col: string) => {
    if (sort !== col) return '';
    return order === 'asc' ? ' \u2191' : ' \u2193';
  };

  return (
    <div>
      <div className={styles.filters}>
        <div className={styles.searchRow}>
          <input
            className={styles.input}
            type="text"
            placeholder="Search by ID, substance, or city..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button className={styles.searchBtn} onClick={handleSearch}>Search</button>
        </div>
        <div className={styles.filterRow}>
          <select
            className={styles.select}
            value={substance}
            onChange={e => { setSubstance(e.target.value); setPage(1); }}
          >
            <option value="">All Substances</option>
            {SUBSTANCES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <input
            className={styles.input}
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            placeholder="From"
          />
          <input
            className={styles.input}
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            placeholder="To"
          />
          {(search || substance || dateFrom || dateTo) && (
            <button
              className={styles.clearBtn}
              onClick={() => {
                setSearch(''); setSearchInput(''); setSubstance('');
                setDateFrom(''); setDateTo(''); setPage(1);
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort('date')}>Date{sortIcon('date')}</th>
              <th onClick={() => handleSort('sample_id')}>Sample ID{sortIcon('sample_id')}</th>
              <th onClick={() => handleSort('city')}>Location{sortIcon('city')}</th>
              <th>Assumed</th>
              {SUBSTANCES.map(s => (
                <th key={s} className={styles.substanceCol}>
                  {s.charAt(0).toUpperCase() + s.slice(1, 4)}
                </th>
              ))}
              <th onClick={() => handleSort('total_substances')}>Total{sortIcon('total_substances')}</th>
            </tr>
          </thead>
          <tbody>
            {data?.samples.map((s: Sample) => (
              <tr key={s.sample_id} onClick={() => setSelectedId(s.sample_id)} className={styles.row}>
                <td>{s.date || '—'}</td>
                <td className={styles.idCell}>{s.sample_id}</td>
                <td>{s.city || '—'}</td>
                <td className={styles.assumedCell}>{s.assumed_substance || '—'}</td>
                {SUBSTANCES.map(sub => (
                  <td key={sub} className={styles.flagCell}>
                    {s[sub] ? <span className={styles.dot} /> : null}
                  </td>
                ))}
                <td className={styles.totalCell}>{s.total_substances}</td>
              </tr>
            ))}
            {data && data.samples.length === 0 && (
              <tr><td colSpan={10} className={styles.empty}>No samples found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {data.pages} ({data.total.toLocaleString()} results)
          </span>
          <button
            className={styles.pageBtn}
            disabled={page >= data.pages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {selectedId && (
        <SampleDetail
          sampleId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
