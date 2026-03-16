'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import styles from './SampleDetail.module.css';
import SubstanceExpander from './SubstanceExpander';
import CityExpander from './CityExpander';
import SampleChat from './SampleChat';
import type { SampleDetail as SampleDetailType } from '@/types';

type TabKey = 'overview' | 'spectra' | 'notes';

interface Props {
  sampleId: string;
  onClose: () => void;
}

export default function SampleDetail({ sampleId, onClose }: Props) {
  const [sample, setSample] = useState<SampleDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [expandedSubstance, setExpandedSubstance] = useState<string | null>(null);
  const [cityExpanded, setCityExpanded] = useState(false);
  const [cityClosing, setCityClosing] = useState(false);
  const [spectraZoomed, setSpectraZoomed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const closeCity = useCallback(() => {
    setCityClosing(true);
    setTimeout(() => {
      setCityExpanded(false);
      setCityClosing(false);
    }, 250);
  }, []);

  useEffect(() => {
    setLoading(true);
    setActiveTab('overview');
    setExpandedSubstance(null);
    setCityExpanded(false);
    setChatOpen(false);
    fetch(`/api/samples/${sampleId}`)
      .then(r => r.json())
      .then(data => { setSample(data); setLoading(false); });
  }, [sampleId]);

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: 'overview', label: 'Overview', show: true },
    { key: 'spectra', label: 'Spectra', show: true },
    { key: 'notes', label: 'Notes', show: true },
  ];

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup className={styles.popup}>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : sample ? (
            <>
              {/* Header */}
              <div className={styles.header}>
                <div>
                  <Dialog.Title className={styles.title}>
                    Sample {sample.sample_id}
                  </Dialog.Title>
                  <Dialog.Description className={styles.subtitle}>
                    <button
                      className={styles.clickableLocation}
                      onClick={() => setCityExpanded(true)}
                    >
                      {sample.city || 'Unknown'}
                    </button>
                    {sample.state ? `, ${sample.state}` : ''} — {sample.date || 'Unknown date'}
                  </Dialog.Description>
                </div>
                <Dialog.Close className={styles.closeBtn}>&times;</Dialog.Close>
              </div>

              {/* Body — tabs + content + chat overlay */}
              <div className={styles.body}>
                {/* Tab bar */}
                <div className={styles.tabBar}>
                  {tabs.filter(t => t.show).map(t => (
                    <button
                      key={t.key}
                      className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
                      onClick={() => setActiveTab(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Content area */}
                <div className={styles.contentArea}>
                  <div className={styles.tabContent}>
                  {activeTab === 'overview' && (
                    <div className={styles.overviewTab}>
                      <div className={styles.metaLabel}>Detected Substances</div>
                      <div className={styles.substanceList}>
                        {sample.substances.map((s, i) => (
                          <div key={i}>
                            <div className={styles.substanceRow}>
                              <button
                                className={styles.substanceNameClickable}
                                onClick={() => setExpandedSubstance(
                                  expandedSubstance === s.substance ? null : s.substance
                                )}
                              >
                                {s.substance}
                              </button>
                              {s.abundance && (
                                <span className={`${styles.badge} ${s.abundance === 'Primary' ? styles.badgePrimary : styles.badgeTrace}`}>
                                  {s.abundance}
                                </span>
                              )}
                              {s.peak && (
                                <span className={styles.peak}>{s.peak}</span>
                              )}
                            </div>
                            <SubstanceExpander
                              substanceName={s.substance}
                              isOpen={expandedSubstance === s.substance}
                              onToggle={() => setExpandedSubstance(
                                expandedSubstance === s.substance ? null : s.substance
                              )}
                            />
                          </div>
                        ))}
                        {sample.substances.length === 0 && (
                          <div className={styles.noSubstances}>No substance data available</div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'spectra' && (
                    <div className={styles.spectraTab}>
                      {sample.substances.filter(s => s.peak).length > 0 && (
                        <div className={styles.spectraMeta}>
                          <div className={styles.metaLabel}>Major substances in graph</div>
                          <div className={styles.spectraPeaks}>
                            {sample.substances.filter(s => s.peak).map((s, i) => (
                              <span key={i} className={styles.spectraPeak}>
                                Peak {s.peak} = {s.substance}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {sample.method && (
                        <div className={styles.spectraMeta}>
                          <div className={styles.metaLabel}>Method</div>
                          <div className={styles.metaValue}>{sample.method}</div>
                        </div>
                      )}
                      {sample.spectra_url ? (
                        <>
                          <div
                            className={`${styles.spectraContainer} ${spectraZoomed ? styles.spectraZoomed : ''}`}
                            onClick={() => setSpectraZoomed(!spectraZoomed)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sample.spectra_url}
                              alt="GCMS Spectra"
                              className={styles.spectraLarge}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const container = (e.target as HTMLImageElement).parentElement;
                                if (container) {
                                  container.style.display = 'none';
                                  const hint = container.nextElementSibling;
                                  if (hint) hint.textContent = 'Spectra image not available';
                                }
                              }}
                            />
                          </div>
                          <p className={styles.spectraHint}>
                            {spectraZoomed ? 'Click to zoom out' : 'Click to zoom in'}
                          </p>
                        </>
                      ) : (
                        <div className={styles.noSubstances}>No spectra available for this sample</div>
                      )}
                    </div>
                  )}

                  {activeTab === 'notes' && (
                    <div className={styles.notesTab}>
                      {sample.assumed_substance && (
                        <div className={styles.noteItem}>
                          <div className={styles.metaLabel}>Assumed substance</div>
                          <div className={styles.metaValue}>{sample.assumed_substance}</div>
                        </div>
                      )}
                      {sample.appearance && (
                        <div className={styles.noteItem}>
                          <div className={styles.metaLabel}>Appearance</div>
                          <div className={styles.noteAppearance}>{sample.appearance}</div>
                        </div>
                      )}
                      {sample.method && (
                        <div className={styles.noteItem}>
                          <div className={styles.metaLabel}>Testing method</div>
                          <div className={styles.metaValue}>{sample.method}</div>
                        </div>
                      )}
                      <div className={styles.noteItem}>
                        <div className={styles.metaLabel}>Total substances detected</div>
                        <div className={styles.metaValue}>{sample.total_substances}</div>
                      </div>
                      <div className={styles.noteItem}>
                        <div className={styles.metaLabel}>Date tested</div>
                        <div className={styles.metaValue}>{sample.date || 'Unknown'}</div>
                      </div>
                      <div className={styles.noteItem}>
                        <div className={styles.metaLabel}>Location</div>
                        <div className={styles.metaValue}>
                          <button
                            className={styles.clickableLocation}
                            onClick={() => setCityExpanded(true)}
                          >
                            {sample.city || 'Unknown'}
                          </button>
                          {sample.state ? `, ${sample.state}` : ''}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                </div>

                {/* Chat overlay — covers tabs + content when open */}
                {chatOpen && (
                  <div className={styles.chatOverlay}>
                    <SampleChat sample={sample} onClose={() => setChatOpen(false)} />
                  </div>
                )}
              </div>

              {/* Anchored chat input — same style as chat overlay input */}
              {!chatOpen && (
                <div className={styles.chatInputRow}>
                  <input
                    className={styles.chatInput}
                    placeholder="Ask about this sample..."
                    readOnly
                    onClick={() => setChatOpen(true)}
                  />
                  <button
                    className={styles.chatSendBtn}
                    disabled
                  >
                    Send
                  </button>
                </div>
              )}

              <div className={styles.footer}>
                <a
                  href={`https://results.streetsafe.supply/sample/${sample.sample_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  View on StreetSafe &rarr;
                </a>
              </div>
            </>
          ) : (
            <div className={styles.loading}>Sample not found</div>
          )}

          {/* City panel — full-height overlay on top of the entire popup */}
          {cityExpanded && sample?.city && (
            <div className={`${styles.cityOverlay} ${cityClosing ? styles.cityOverlayClosing : ''}`}>
              <div className={styles.cityOverlayHeader}>
                <button className={styles.chatBackBtn} onClick={closeCity}>
                  &larr; Back
                </button>
                <h3 className={styles.cityOverlayTitle}>{sample.city}</h3>
              </div>
              <div className={styles.cityOverlayContent}>
                <CityExpander
                  city={sample.city}
                  isOpen={true}
                  onToggle={closeCity}
                />
              </div>
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
