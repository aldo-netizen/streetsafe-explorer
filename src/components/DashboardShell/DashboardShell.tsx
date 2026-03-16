'use client';

import { useState } from 'react';
import styles from './DashboardShell.module.css';
import SummaryCards from '../SummaryCards/SummaryCards';
import SampleTable from '../SampleTable/SampleTable';
import SubstanceTrends from '../Charts/SubstanceTrends';
import GeoDistribution from '../Charts/GeoDistribution';
import MismatchRates from '../Charts/MismatchRates';
import CoOccurrence from '../Charts/CoOccurrence';
import GeoHeatmap from '../Charts/GeoHeatmap';
import SearchChat from '../SearchChat/SearchChat';

const TABS = [
  { key: 'data', label: 'Samples' },
  { key: 'trends', label: 'Trends' },
  { key: 'geography', label: 'Geography' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function DashboardShell() {
  const [activeTab, setActiveTab] = useState<TabKey>('data');
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <nav className={`${styles.navbar} ${searchOpen ? styles.navbarSearchOpen : ''}`}>
        <span className={styles.title}>StreetSafe Explorer</span>
        <div className={styles.searchSection}>
          <SearchChat onOpenChange={setSearchOpen} />
        </div>
        <a href="/about" className={styles.aboutLink}>About</a>
      </nav>

      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <SummaryCards />

      <div className={styles.content} key={activeTab}>
        {activeTab === 'data' && <SampleTable />}
        {activeTab === 'trends' && (
          <>
            <SubstanceTrends />
            <MismatchRates />
            <CoOccurrence />
          </>
        )}
        {activeTab === 'geography' && (
          <>
            <GeoDistribution />
            <GeoHeatmap />
          </>
        )}
      </div>
    </div>
  );
}
