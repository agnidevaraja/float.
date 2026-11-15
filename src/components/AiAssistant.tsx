import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User, Sparkles } from 'lucide-react';
import type { DealInput, RiskEvaluationResult } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AiAssistantProps {
  input: DealInput;
  result: RiskEvaluationResult;
}

const QUICK_QUERIES = [
  'Why is this deal risky?',
  'How can I reduce exposure?',
  'What is my cash runway?',
  'Explain the SHAP factors',
  'What payment terms should I offer?',
  'Is my counterparty safe?',
];

export const AiAssistant: React.FC<AiAssistantProps> = ({ input, result }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'I am your B2B risk advisor. Ask me about your current deal, risk scores, cash runway, or payment strategies. For deep analysis, use the dedicated modules.',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const respond = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('why') && (q.includes('risk') || q.includes('danger'))) {
      const top = result.topShapFactors[0];
      const dir = top.direction === 'RISK_INCREASE' ? '+' : '-';
      return `This deal scores ${result.blendedRiskPercent.toFixed(1)}% risk. Primary driver: "${top.factor}" (${dir}${top.impactScore.toFixed(2)}). ${top.explanation} B2B+FRED: ${result.b2bMacroRiskPercent.toFixed(1)}%, Credit: ${result.creditDefaultRiskPercent.toFixed(1)}%, Fraud: ${result.fraudSpikeRiskPercent.toFixed(1)}%.`;
    }

    if (q.includes('reduce') || q.includes('exposure') || q.includes('fix') || q.includes('terms')) {
      const t = result.recommendedTerms;
      return `Restructure to: ${t.upfrontPercent}% upfront + ${t.onDeliveryPercent}% delivery + Net-${t.netTermDays}. Reduces exposure by ~${t.exposureReductionPercent}%. ${t.rationale}`;
    }

    if (q.includes('runway') || q.includes('cash') || q.includes('survive')) {
      if (result.isRunwayCollision) {
        return `COLLISION: Balance hits zero on Day ${result.collisionDay}. AI-predicted arrival is Day ${result.expectedArrivalDay}. Shortfall: INR ${result.shortfallAmount.toLocaleString('en-IN')}. Apply Smart Payment-Term Fixer to prevent this.`;
      }
      return `Runway safe. Buffer of INR ${result.cashBufferAtArrival.toLocaleString('en-IN')} when cash arrives Day ${result.expectedArrivalDay}. Daily burn: INR ${(input.monthlyFixedExpenses / 30).toLocaleString('en-IN')}.`;
    }

    if (q.includes('shap') || q.includes('factor') || q.includes('driver')) {
      const factors = result.topShapFactors.slice(0, 3).map(f => `- ${f.factor}: ${f.direction === 'RISK_INCREASE' ? '+' : '-'}${f.impactScore.toFixed(2)}`).join('\n');
      return `Top SHAP drivers:\n${factors}`;
    }

    if (q.includes('shell') || q.includes('vendor') || q.includes('fraud')) {
      const shellWarn = result.integrityWarnings.find(w => w.code === 'WARN_SHELL_VENDOR');
      if (shellWarn) return `WARNING: ${shellWarn.description}. Exercise extreme caution. Recommend upfront payment or escrow.`;
      return 'No shell-vendor patterns detected. Tenure and order size are within normal B2B distributions.';
    }

    if (q.includes('gst') || q.includes('tax') || q.includes('itc')) {
      if (input.gstRegistered) {
        return `GST ITC lockup: INR ${result.gstItcLocked.toLocaleString('en-IN')} (18%). Total at risk: INR ${result.totalAtRisk.toLocaleString('en-IN')}. If supplier fails to file GSTR-1/GSTR-3B, this 18% becomes trapped.`;
      }
      return 'GST not registered. No ITC lockup exposure.';
    }

    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
      return 'Hello. I analyze your B2B payment risk. Ask about risk scores, cash runway, payment strategies, or anomalies.';
    }

    return `Risk: ${result.blendedRiskPercent.toFixed(1)}%. Ask me about: risk drivers, cash runway, payment terms, GST exposure, or anomaly flags.`;
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const reply: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: respond(inputValue) };
      setMessages(prev => [...prev, reply]);
      setIsTyping(false);
    }, 600 + Math.random() * 500);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-11 h-11 border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-center hover:bg-[var(--bg-elevated)] transition-colors"
        style={{ borderRadius: 0 }}
      >
        {isOpen ? <X className="w-5 h-5 text-[var(--text-muted)]" /> : (
          <div className="relative">
            <Bot className="w-5 h-5 text-[var(--accent-primary)]" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--accent-safe)]" />
          </div>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col" style={{ borderRadius: 0, width: '380px', height: '500px' }}>
          <div className="px-4 py-3 border-b border-[var(--border-hairline)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
              <div>
                <span className="text-[11px] font-semibold text-[var(--text-primary)]">Risk Advisor</span>
                <p className="text-[9px] text-[var(--text-tertiary)]">Quick queries. Use modules for deep analysis.</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-[var(--accent-safe)]" />
              <span className="text-[9px] font-mono text-[var(--text-tertiary)]">LIVE</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 border border-[var(--accent-primary)]/40 flex items-center justify-center bg-[var(--accent-primary)]/10 shrink-0">
                    <Bot className="w-3 h-3 text-[var(--accent-primary)]" />
                  </div>
                )}
                <div className={`max-w-[85%] p-2.5 text-[11px] leading-relaxed whitespace-pre-line ${msg.role === 'user' ? 'bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--text-primary)]' : 'bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-muted)]'}`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 border border-[var(--border-hairline)] flex items-center justify-center shrink-0">
                    <User className="w-3 h-3 text-[var(--text-tertiary)]" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2">
                <div className="w-6 h-6 border border-[var(--accent-primary)]/40 flex items-center justify-center bg-[var(--accent-primary)]/10 shrink-0">
                  <Bot className="w-3 h-3 text-[var(--accent-primary)]" />
                </div>
                <div className="p-2.5 bg-[var(--bg-elevated)] border border-[var(--border-hairline)] flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[var(--text-tertiary)] animate-pulse" />
                  <div className="w-1.5 h-1.5 bg-[var(--text-tertiary)] animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1.5 h-1.5 bg-[var(--text-tertiary)] animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="px-4 py-2 border-t border-[var(--border-hairline)]">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {QUICK_QUERIES.map((q) => (
                <button key={q} onClick={() => setInputValue(q)} className="shrink-0 px-2 py-1 text-[9px] font-mono border border-[var(--border-hairline)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap">
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 border-t border-[var(--border-hairline)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about this deal..."
                className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-2 px-3 text-[11px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-subtle)] focus:outline-none"
              />
              <button onClick={handleSend} disabled={!inputValue.trim()} className="px-3 border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 disabled:opacity-30 transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
