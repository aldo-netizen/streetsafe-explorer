'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './SampleDetail.module.css';
import DynamicChart from '../SearchChat/DynamicChart';
import { streamSearch } from '@/lib/streamSearch';
import type { SampleDetail, ChatMessage, ChartSpec } from '@/types';

interface Props {
  sample: SampleDetail;
  onClose?: () => void;
}

export default function SampleChat({ sample, onClose }: Props) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFirstMessage = useRef(true);

  const substanceList = sample.substances.map(s => s.substance).join(', ');

  const suggestedPrompts = [
    `Is this sample typical for ${sample.city || 'this area'}?`,
    `What are the risks of ${sample.substances[0]?.substance || 'these substances'} combined with other detected substances?`,
    `How has the drug supply in ${sample.city || 'this area'} changed over time?`,
  ];

  const buildContextPrefix = () =>
    `[Context: Sample ${sample.sample_id} from ${sample.city || 'unknown city'}${sample.state ? `, ${sample.state}` : ''}, dated ${sample.date || 'unknown date'}. Detected substances: ${substanceList || 'none'}. Assumed substance: ${sample.assumed_substance || 'unknown'}.]\n\n`;

  const submitQuestion = async (question: string) => {
    if (!question.trim() || loading) return;

    setLoading(true);

    const fullMessage = isFirstMessage.current
      ? buildContextPrefix() + question
      : question;

    isFirstMessage.current = false;

    setMessages(prev => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: '', chartSpecs: [], sql: [] },
    ]);

    try {
      await streamSearch(fullMessage, {
        onText: (text) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: last.content + text };
            }
            return updated;
          });
        },
        onChart: (spec) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { ...last, chartSpecs: [...(last.chartSpecs || []), spec] };
            }
            return updated;
          });
        },
        onSql: (query) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { ...last, sql: [...(last.sql || []), query] };
            }
            return updated;
          });
        },
        onDone: () => {},
        onError: (error) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: error };
            }
            return updated;
          });
        },
      });
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: 'Failed to connect to the search API.' };
        }
        return updated;
      });
    } finally {
      setLoading(false);
      setInput('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  return (
    <div className={styles.chatContainer}>
      {onClose && (
        <div className={styles.chatHeader}>
          <button className={styles.chatBackBtn} onClick={onClose}>
            &larr; Back
          </button>
        </div>
      )}
      <div ref={scrollRef} className={styles.chatMessages}>
        {messages.length === 0 && !loading && (
          <div className={styles.chatSuggestions}>
            <p className={styles.chatSuggestionsLabel}>Ask about this sample</p>
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                className={styles.chatSuggestBtn}
                onClick={() => {
                  setInput(prompt);
                  setTimeout(() => submitQuestion(prompt), 400);
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`${styles.chatMsg} ${styles[`chat_${msg.role}`]}`}>
            <div className={styles.chatMsgLabel}>
              {msg.role === 'user' ? 'You' : 'Explorer'}
            </div>
            <div className={styles.chatMsgContent}>{msg.content}</div>
            {msg.chartSpecs?.map((spec: ChartSpec, j: number) => (
              <DynamicChart key={j} spec={spec} />
            ))}
            {msg.sql && msg.sql.length > 0 && (
              <details className={styles.chatSqlDetails}>
                <summary>View SQL ({msg.sql.length})</summary>
                {msg.sql.map((q: string, j: number) => (
                  <pre key={j} className={styles.chatSqlCode}>{q}</pre>
                ))}
              </details>
            )}
          </div>
        ))}

        {loading && messages[messages.length - 1]?.content === '' && (
          <div className={styles.chatLoading}>
            <div className={styles.chatLoadingDots}>
              <span /><span /><span />
            </div>
            <span>Analyzing...</span>
          </div>
        )}
      </div>

      <div className={styles.chatInputRow}>
        <input
          ref={inputRef}
          className={styles.chatInput}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitQuestion(input.trim())}
          placeholder="Ask about this sample..."
          disabled={loading}
        />
        <button
          className={styles.chatSendBtn}
          onClick={() => submitQuestion(input.trim())}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
