'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './SearchChat.module.css';
import DynamicChart from './DynamicChart';
import type { ChatMessage, ChartSpec } from '@/types';

const EXAMPLE_PROMPTS = [
  'Which cities have the highest fentanyl rates?',
  'Show me the trend of xylazine over the last year',
  'What substances most commonly appear with heroin?',
  'Compare the drug supply in Detroit vs Philadelphia',
];

interface Props {
  onOpenChange?: (open: boolean) => void;
}

export default function SearchChat({ onOpenChange }: Props) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const setOpenState = (value: boolean) => {
    setOpen(value);
    onOpenChange?.(value);
  };

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const submitQuestion = async (question: string) => {
    if (!question || loading) return;

    if (!open) setOpenState(true);

    setInput(question);
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.error || 'Something went wrong.',
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.text,
          chartSpecs: data.chartSpecs,
          sql: data.sqlQueries,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to connect to the search API.',
      }]);
    } finally {
      setLoading(false);
      setInput('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  // Auto-scroll dropdown to bottom only on follow-up questions
  useEffect(() => {
    if (dropdownRef.current && messages.length > 2) {
      dropdownRef.current.scrollTo({ top: dropdownRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Lock page scroll when search is open
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  const handleSubmit = () => {
    submitQuestion(input.trim());
  };

  const handleExampleClick = (prompt: string) => {
    setInput(prompt);
    // Show the term in the bar, then submit after a beat
    setTimeout(() => {
      submitQuestion(prompt);
    }, 600);
  };

  const handleClearInput = () => {
    setInput('');
    inputRef.current?.focus();
  };

  const handleClose = () => {
    setOpenState(false);
    setMessages([]);
    setInput('');
  };

  return (
    <div className={styles.container}>
      {/* Backdrop — no blur, just a light overlay */}
      {open && <div className={styles.backdrop} onClick={handleClose} />}

      {/* Search bar — always in place, stays above modal */}
      <div ref={barRef} className={styles.searchBar}>
        <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="M12.5 12.5L17 17" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onFocus={() => { if (!open) setOpenState(true); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder={messages.length > 0 ? "Ask a follow-up question..." : "Ask AI about the data..."}
          disabled={loading}
        />
        {input.trim() && !loading && (
          <button className={styles.clearInputBtn} onClick={handleClearInput}>
            Clear
          </button>
        )}
        <button
          className={styles.sendBtn}
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
        {open && (
          <button className={styles.closeBarBtn} onClick={handleClose}>&times;</button>
        )}
      </div>

      {/* Full-height dropdown below the search bar */}
      {open && (
        <div ref={dropdownRef} className={styles.dropdown}>
          {messages.length === 0 && !loading && (
            <div className={styles.examples}>
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  className={styles.example}
                  onClick={() => handleExampleClick(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div className={styles.messages}>
            {messages.map((msg, i) => (
              <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
                <div className={styles.messageLabel}>
                  {msg.role === 'user' ? 'You' : 'Explorer'}
                </div>
                <div className={styles.messageContent}>
                  {msg.content}
                </div>
                {msg.chartSpecs?.map((spec: ChartSpec, j: number) => (
                  <DynamicChart key={j} spec={spec} />
                ))}
                {msg.sql && msg.sql.length > 0 && (
                  <details className={styles.sqlDetails}>
                    <summary>View SQL queries ({msg.sql.length})</summary>
                    {msg.sql.map((q: string, j: number) => (
                      <pre key={j} className={styles.sqlCode}>{q}</pre>
                    ))}
                  </details>
                )}
              </div>
            ))}
            {loading && (
              <div className={messages.length <= 1 ? styles.loadingStateCentered : styles.loadingStateInline}>
                <div className={styles.loadingDots}>
                  <span className={styles.loadingDot} />
                  <span className={styles.loadingDot} />
                  <span className={styles.loadingDot} />
                </div>
                <div className={styles.loadingLabel}>Analyzing your question</div>
                <div className={styles.loadingSub}>Querying the database and preparing results</div>
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <button className={styles.clearBtn} onClick={handleClose}>
              Clear &amp; close
            </button>
          )}
        </div>
      )}
    </div>
  );
}
