import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';

const QUICK_QUERIES = [
  'Why is this deal risky?',
  'How can I reduce exposure?',
  'What is my cash runway?',
  'Explain the SHAP factors',
  'What payment terms should I offer?',
  'Is my counterparty a shell vendor?',
];

export const AiCopilotView: React.FC = () => {
  const { state } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: 'Welcome to the AI Risk Copilot. Attach a deal from your underwriting dossier or ledger, then return here for advisory.', timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const respond = (query: string): string => {
    const ctx = state.currentResult;
    const q = query.toLowerCase();
    if (!ctx) {
      return 'No active deal in your dossier. Go to Deal Underwriting, run an evaluation, then return here for advisory. In the meantime, I can explain general B2B payment risk concepts.';
    }
    if (q.includes('why') && (q.includes('risk') || q.includes('danger'))) {
      const top = ctx.topShapFactors[0];
      const dir = top.direction === 'RISK_INCREASE' ? '+' : '-';
      return `This deal scores ${ctx.blendedRiskPercent.toFixed(1)}% risk. Primary driver: "${top.factor}" (${dir}${top.impactScore.toFixed(2)}). ${top.explanation} B2B+FRED: ${ctx.b2bMacroRiskPercent.toFixed(1)}%, Credit: ${ctx.creditDefaultRiskPercent.toFixed(1)}%, Fraud: ${ctx.fraudSpikeRiskPercent.toFixed(1)}%.`;
    }
    if (q.includes('reduce') || q.includes('exposure') || q.includes('fix') || q.includes('terms')) {
      const t = ctx.recommendedTerms;
      return `Restructure to: ${t.upfrontPercent}% upfront + ${t.onDeliveryPercent}% delivery + Net-${t.netTermDays}. Reduces exposure by ~${t.exposureReductionPercent}%. ${t.rationale}`;
    }
    if (q.includes('runway') || q.includes('cash') || q.includes('survive')) {
      if (ctx.isRunwayCollision) {
        return `COLLISION: Balance hits zero on Day ${ctx.collisionDay}. AI-predicted arrival is Day ${ctx.expectedArrivalDay}. Shortfall: INR ${ctx.shortfallAmount.toLocaleString('en-IN')}. Apply Smart Payment-Term Fixer to prevent this.`;
      }
      return `Runway safe. Buffer of INR ${ctx.cashBufferAtArrival.toLocaleString('en-IN')} when cash arrives Day ${ctx.expectedArrivalDay}.`;
    }
    if (q.includes('shap') || q.includes('factor') || q.includes('driver')) {
      const factors = ctx.topShapFactors.slice(0, 3).map(f => `- ${f.factor}: ${f.direction === 'RISK_INCREASE' ? '+' : '-'}${f.impactScore.toFixed(2)}`).join('\n');
      return `Top SHAP drivers:\n${factors}`;
    }
    if (q.includes('shell') || q.includes('vendor') || q.includes('fraud')) {
      const shellWarn = ctx.integrityWarnings.find(w => w.code === 'WARN_SHELL_VENDOR');
      if (shellWarn) return `WARNING: ${shellWarn.description}. Exercise extreme caution. Recommend upfront payment or escrow.`;
      return 'No shell-vendor patterns detected. Tenure and order size are within normal B2B distributions.';
    }
    if (q.includes('gst') || q.includes('tax') || q.includes('itc')) {
      return `GST ITC lockup: INR ${ctx.gstItcLocked.toLocaleString('en-IN')}. Total at risk: INR ${ctx.totalAtRisk.toLocaleString('en-IN')}.`;
    }
    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
      return 'Hello. I analyze your B2B payment risk. Ask about risk drivers, cash runway, payment terms, GST exposure, or anomaly flags.';
    }
    return `Current deal risk: ${ctx.blendedRiskPercent.toFixed(1)}%. Ask me about: risk drivers, cash runway, payment terms, GST exposure, or anomaly flags.`;
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
    <div className="flex h-full">
      <div className="w-48 border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] shrink-0 p-3 space-y-2">
        <div className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Active Context</div>
        {state.currentResult ? (
          <div className="border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-2.5">
            <div className="text-[9px] font-mono text-[var(--text-tertiary)] mb-1">Current Dossier</div>
            <div className="text-[10px] font-mono text-[var(--text-primary)]">Risk: {state.currentResult.blendedRiskPercent.toFixed(1)}%</div>
            <div className="text-[10px] font-mono text-[var(--text-muted)]">Arrival: Day {state.currentResult.expectedArrivalDay}</div>
          </div>
        ) : (
          <div className="text-[10px] font-mono text-[var(--text-tertiary)]">No active deal. Run underwriting first.</div>
        )}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 border border-[var(--accent-primary)]/40 flex items-center justify-center bg-[var(--accent-primary)]/10 shrink-0">
                  <Bot className="w-4 h-4 text-[var(--accent-primary)]" />
                </div>
              )}
              <div className={`max-w-[70%] p-3 text-[11px] leading-relaxed whitespace-pre-line ${msg.role === 'user' ? 'bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--text-primary)]' : 'bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-muted)]'}`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 border border-[var(--border-hairline)] flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-[var(--text-tertiary)]" />
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-7 h-7 border border-[var(--accent-primary)]/40 flex items-center justify-center bg-[var(--accent-primary)]/10 shrink-0">
                <Bot className="w-4 h-4 text-[var(--accent-primary)]" />
              </div>
              <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-hairline)] flex gap-1">
                <div className="w-1.5 h-1.5 bg-[var(--text-tertiary)] animate-pulse" />
                <div className="w-1.5 h-1.5 bg-[var(--text-tertiary)] animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 bg-[var(--text-tertiary)] animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="p-4 border-t border-[var(--border-hairline)]">
          <div className="flex gap-1.5 overflow-x-auto mb-2">
            {QUICK_QUERIES.map((q) => (
              <button key={q} onClick={() => setInputValue(q)} className="shrink-0 px-2 py-1 text-[9px] font-mono border border-[var(--border-hairline)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap">{q}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about your active deal..."
              className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-hairline)] py-2.5 px-3 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-subtle)] focus:outline-none"
            />
            <button onClick={handleSend} disabled={!inputValue.trim()} className="px-4 border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 disabled:opacity-30 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 text-[9px] font-mono text-[var(--text-tertiary)]">Copilot handles advisory queries. Full underwriting, trajectories, and batch audits use dedicated modules.</div>
        </div>
      </div>
    </div>
  );
};
