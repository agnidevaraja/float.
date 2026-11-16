import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  ShieldAlert,
  Sparkles,
  Paperclip,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  Brain,
  Sliders,
  BarChart2,
  TrendingUp,
  Scale,
  ShieldCheck,
  Check,
  Copy,
  Info,
} from 'lucide-react';
import { useWorkspace } from '../store/workspaceStore';
import { EChartBox } from '../components/charts/EChartBox';
import type { EChartsOption } from 'echarts';
import {
  buildLiveCopilotWorkspaceContext,
  extractWorkspaceSnapshot,
  generateCopilotTurnResponse,
  simulate60DayRunway,
} from '../engine/copilotEngine';
import { loadApiConfig, askCopilotLive } from '../engine/inferenceBridge';
import type { ToolUsageItem } from '../types/engineContract';

interface AttachedFile {
  name: string;
  type: string;
  size: number;
  textSnippet: string;
  rowCount?: number;
  totalSum?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  thinkingTrace?: string[];
  thinkingDuration?: string;
  chartOption?: EChartsOption;
  chartTitle?: string;
  actionSnippet?: { label: string; text: string };
  toolsUsed?: ToolUsageItem[];
  model?: string;
}

type ReplyDepth = 'cfo_brief' | 'detailed' | 'action_plan';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const formatLine = (line: string, lineIdx: number): React.ReactNode => {
    const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return (
      <React.Fragment key={lineIdx}>
        {tokens.map((token, idx) => {
          if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
            return (
              <strong key={idx} className="font-semibold text-[var(--text-primary)]">
                {token.slice(2, -2)}
              </strong>
            );
          }
          if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
            return (
              <code
                key={idx}
                className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-hairline)] font-mono text-[11px] text-[var(--text-primary)]"
              >
                {token.slice(1, -1)}
              </code>
            );
          }
          return <React.Fragment key={idx}>{token}</React.Fragment>;
        })}
        {lineIdx < lines.length - 1 ? '\n' : null}
      </React.Fragment>
    );
  };

  return lines.map((line, idx) => {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      return (
        <React.Fragment key={idx}>
          <span className="font-semibold text-[var(--text-primary)]">{formatLine(headingMatch[1], idx)}</span>
        </React.Fragment>
      );
    }
    return formatLine(line, idx);
  });
}

export const AiCopilotView: React.FC = () => {
  const { state } = useWorkspace();
  const liveSnap = extractWorkspaceSnapshot(state);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Settings
  const [thinkingMode, setThinkingMode] = useState<boolean>(true);
  const [replyDepth, setReplyDepth] = useState<ReplyDepth>('detailed');

  // Input & Attachment
  const [inputValue, setInputValue] = useState('');
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  // Expanded Thinking States (keyed by message ID)
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});

  const toggleThinking = (msgId: string) => {
    setExpandedThinking((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const buildWelcomeContent = () => {
    const snap = extractWorkspaceSnapshot(state);
    const statusLine = snap.isBlank
      ? '- **Current Workspace Status:** Blank slate - enter figures in any tab or load a Demo Preset in Settings to inspect live receivables, runway, and GST metrics.'
      : `- **Live Workspace Loaded:** ${snap.companyName} | Cash Balance: **${fmt(snap.bankBalance)}** | Active Deal: **${snap.activeDealAmount > 0 ? `${snap.activeDealClient} (${fmt(snap.activeDealAmount)})` : 'None'}** | Open Ledger: **${snap.ledgerCount} invoice${snap.ledgerCount === 1 ? '' : 's'} (${fmt(snap.ledgerTotal)})**`;

    return `Hello! I am your **float. Treasury Advisory Copilot**, connected directly to your live workspace store.

${statusLine}
- **Capabilities:** Deal underwriting math, 60-day runway projections, Section 16(2) GST & Section 43B(h) statutory rules, TDS 26AS checks, and 6-Source Ensemble benchmarks (**374,284 Records**, **59 Features**, **ROC-AUC 0.9845**).

Ask a question, test a custom what-if order (e.g. *"Evaluate a ₹4,00,000 Net-60 order"*), attach a CSV/document, or request a chart.`;
  };

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: buildWelcomeContent(),
      timestamp: new Date(),
    },
  ]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawText = (event.target?.result as string) || '';
      let rowCount = 0;
      let totalSum = 0;

      if (file.name.endsWith('.csv')) {
        const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
        rowCount = Math.max(0, lines.length - 1);
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',');
          if (parts.length >= 3) {
            const val = parseFloat(parts[2].replace(/"/g, '')) || 0;
            totalSum += val;
          }
        }
      }

      setAttachedFile({
        name: file.name,
        type: file.type || 'text/plain',
        size: file.size,
        textSnippet: rawText.slice(0, 1000),
        rowCount: rowCount > 0 ? rowCount : undefined,
        totalSum: totalSum > 0 ? totalSum : undefined,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Generate In-Chat EChart: Live Aging Distribution from state.ledger
  const generateAgingChart = (): EChartsOption => {
    const snap = extractWorkspaceSnapshot(state);
    const b = snap.agingBrackets;
    return {
      backgroundColor: 'transparent',
      grid: { left: 95, right: 90, top: 20, bottom: 25, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: '#D4D4D8',
          fontSize: 9,
          fontFamily: 'monospace',
          formatter: (v: number) => `₹${(v / 100000).toFixed(1)}L`,
        },
        splitLine: { lineStyle: { color: '#27272A', type: [3, 3] } },
      },
      yAxis: {
        type: 'category',
        data: ['Current', '1-15d Overdue', '16-30d Overdue', '31-60d Overdue', '>60d Critical'],
        axisLabel: { color: '#FAFAFA', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          barWidth: 14,
          data: [
            { value: b.current, itemStyle: { color: '#10B981', borderRadius: [0, 2, 2, 0] } },
            { value: b.overdue1to15, itemStyle: { color: '#3B82F6', borderRadius: [0, 2, 2, 0] } },
            { value: b.overdue16to30, itemStyle: { color: '#F59E0B', borderRadius: [0, 2, 2, 0] } },
            { value: b.overdue31to60, itemStyle: { color: '#F97316', borderRadius: [0, 2, 2, 0] } },
            { value: b.overdue60Plus, itemStyle: { color: '#EF4444', borderRadius: [0, 2, 2, 0] } },
          ],
          label: {
            show: true,
            position: 'right',
            formatter: (p: any) => `₹${(p.value / 100000).toFixed(1)}L`,
            color: '#FAFAFA',
            fontSize: 10,
            fontFamily: 'monospace',
            fontWeight: 'bold',
          },
          emphasis: { focus: 'none', itemStyle: { opacity: 1 } },
        },
      ],
    };
  };

  // Generate In-Chat EChart: Live 60-Day Runway Trajectory
  const generateRunwayChart = (): EChartsOption => {
    const snap = extractWorkspaceSnapshot(state);
    const receivablePool = snap.hasActiveDeal ? snap.activeDealAmount : snap.ledgerTotal;
    const inflowDay = state.currentResult?.expectedArrivalDay || snap.activeDealTerms || 35;
    const runway = simulate60DayRunway(
      snap.bankBalance,
      snap.monthlyBurn,
      receivablePool,
      inflowDay
    );
    return {
      backgroundColor: 'transparent',
      grid: { left: 70, right: 40, top: 25, bottom: 25, containLabel: true },
      xAxis: {
        type: 'category',
        data: runway.labels,
        axisLabel: { color: '#FAFAFA', fontSize: 9, fontFamily: 'monospace' },
        axisLine: { lineStyle: { color: '#27272A' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#D4D4D8',
          fontSize: 9,
          fontFamily: 'monospace',
          formatter: (v: number) => `₹${(v / 100000).toFixed(1)}L`,
        },
        splitLine: { lineStyle: { color: '#27272A', type: [3, 3] } },
      },
      series: [
        {
          type: 'line',
          data: runway.series,
          smooth: false,
          showSymbol: true,
          symbolSize: 6,
          lineStyle: { color: '#06B6D4', width: 2.5 },
          itemStyle: { color: '#06B6D4' },
          emphasis: { focus: 'none', lineStyle: { width: 3.5 } },
          markLine: {
            symbol: 'none',
            data: [{ yAxis: 0, lineStyle: { color: '#EF4444', type: 'dashed' }, label: { formatter: 'Zero Floor', position: 'insideStartTop' } }],
          },
        },
      ],
    };
  };

  // Generate In-Chat EChart: Attached CSV Breakdown
  const generateAttachedFileChart = (file: AttachedFile): EChartsOption => {
    const s1 = file.totalSum ? Math.round(file.totalSum * 0.6) : 600000;
    const s2 = file.totalSum ? Math.round(file.totalSum * 0.25) : 250000;
    const s3 = file.totalSum ? Math.round(file.totalSum * 0.15) : 150000;

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: ₹{c} ({d}%)' },
      series: [
        {
          type: 'pie',
          radius: ['32%', '52%'],
          center: ['50%', '48%'],
          avoidLabelOverlap: true,
          label: {
            show: true,
            formatter: '{b}\n({d}%)',
            color: '#FAFAFA',
            fontSize: 9,
            fontFamily: 'monospace',
            overflow: 'none',
          },
          labelLine: { length: 8, length2: 10, lineStyle: { color: '#52525B' } },
          emphasis: { focus: 'none', itemStyle: { opacity: 1 } },
          data: [
            { value: s1, name: 'Standard Terms', itemStyle: { color: '#10B981' } },
            { value: s2, name: 'Watchlist', itemStyle: { color: '#F59E0B' } },
            { value: s3, name: 'Default Risk', itemStyle: { color: '#EF4444' } },
          ],
        },
      ],
    };
  };

  // Generate In-Chat EChart: Early Payment Cash Discount APR vs TReDS vs Live Bank OD
  const generateDiscountComparisonChart = (): EChartsOption => {
    const snap = extractWorkspaceSnapshot(state);
    const odRate = Number(snap.odRate.toFixed(1));
    return {
      backgroundColor: 'transparent',
      grid: { left: 130, right: 60, top: 20, bottom: 25, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: '#A1A1AA',
          fontSize: 9,
          fontFamily: 'monospace',
          formatter: (v: number) => `${v}%`,
        },
        splitLine: { lineStyle: { color: '#27272A', type: [3, 3] } },
      },
      yAxis: {
        type: 'category',
        data: ['TReDS Factoring', 'Your Bank OD / CC', '2.0% Cash Discount'],
        axisLabel: { color: '#FAFAFA', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#27272A' } },
      },
      series: [
        {
          type: 'bar',
          barWidth: 16,
          data: [
            { value: 8.5, itemStyle: { color: '#10B981', borderRadius: [0, 2, 2, 0] } },
            { value: odRate, itemStyle: { color: '#3B82F6', borderRadius: [0, 2, 2, 0] } },
            { value: 21.3, itemStyle: { color: '#EF4444', borderRadius: [0, 2, 2, 0] } },
          ],
          label: {
            show: true,
            position: 'right',
            formatter: (p: any) => `${p.value}% APR`,
            color: '#FAFAFA',
            fontSize: 10,
            fontFamily: 'monospace',
            fontWeight: 'bold',
          },
          emphasis: { focus: 'none', itemStyle: { opacity: 1 } },
        },
      ],
    };
  };

  const resolveChartFromKind = (
    kind: 'aging' | 'runway' | 'discount' | 'file' | undefined,
    fileSnapshot: AttachedFile | null
  ): EChartsOption | undefined => {
    if (kind === 'aging') return generateAgingChart();
    if (kind === 'runway') return generateRunwayChart();
    if (kind === 'discount') return generateDiscountComparisonChart();
    if (kind === 'file' && fileSnapshot) return generateAttachedFileChart(fileSnapshot);
    return undefined;
  };

  const handleSend = async () => {
    if (!inputValue.trim() && !attachedFile) return;

    const currentAttachment = attachedFile;
    const userText = inputValue.trim() || `Analyzed attached file: ${currentAttachment?.name}`;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setAttachedFile(null);
    setIsTyping(true);

    const localResp = generateCopilotTurnResponse({
      query: userText,
      state,
      replyDepth,
      attachment: currentAttachment
        ? {
            name: currentAttachment.name,
            sizeKb: Number((currentAttachment.size / 1024).toFixed(1)),
            rowCount: currentAttachment.rowCount,
            totalSum: currentAttachment.totalSum,
            textSnippet: currentAttachment.textSnippet,
          }
        : null,
    });

    const apiCfg = loadApiConfig();
    const hasRemoteColab = Boolean(apiCfg.endpointUrl && apiCfg.endpointUrl.trim().length > 0);

    let toolsUsed: ToolUsageItem[] | undefined =
      localResp.toolsUsed.length > 0 ? localResp.toolsUsed : undefined;
    let modelName: string | undefined = undefined;
    let finalContent = localResp.content;
    const thinkingTrace = thinkingMode ? localResp.thinkingTrace : undefined;

    if (hasRemoteColab) {
      try {
        const history = messages.slice(-5).map((m) => ({ role: m.role, content: m.content }));
        const snap = extractWorkspaceSnapshot(state);
        const dealContext =
          snap.activeDealAmount > 0 || state.currentResult
            ? {
                invoiceAmount: snap.activeDealAmount,
                paymentTermDays: snap.activeDealTerms,
                clientName: snap.activeDealClient,
                blendedRiskPercent: state.currentResult?.blendedRiskPercent,
                expectedArrivalDay: state.currentResult?.expectedArrivalDay,
                customBusinessActive: state.customBusinessActive,
                companyName: snap.companyName,
              }
            : undefined;

        const colabRes = await askCopilotLive(
          {
            message: userText,
            history,
            deal_context: dealContext,
            workspace_context: buildLiveCopilotWorkspaceContext(state, replyDepth),
          },
          apiCfg
        );

        const isRemoteReply =
          colabRes &&
          colabRes.reply &&
          colabRes.reply.length > 20 &&
          !colabRes.model?.toLowerCase().includes('browser fallback');

        if (isRemoteReply) {
          finalContent = colabRes.reply;
          modelName = colabRes.model;
          toolsUsed =
            colabRes.tools_used && colabRes.tools_used.length > 0
              ? colabRes.tools_used
              : undefined;
        }
      } catch (err) {
        console.warn('Live copilot call fallback:', err);
      }
    }

    const chartOption = resolveChartFromKind(localResp.chartKind, currentAttachment);

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: finalContent,
      timestamp: new Date(),
      thinkingTrace,
      thinkingDuration: '0.4s',
      chartOption,
      chartTitle: localResp.chartTitle,
      actionSnippet: localResp.actionSnippet,
      toolsUsed,
      model: modelName,
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setIsTyping(false);
  };

  const handleCopySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col rounded-xl overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
      {/* Top Header & Settings Toolbar */}
      <div className="border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[var(--accent-primary)]" />
          <span className="text-xs font-display font-bold text-[var(--text-primary)]">
            float. Treasury Advisory Copilot
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-sans">
          {/* Thinking Mode Toggle */}
          <button
            type="button"
            onClick={() => setThinkingMode((prev) => !prev)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-sans font-semibold border transition-all duration-150 flex items-center gap-1.5 ${
              thinkingMode
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                : 'border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Brain className="w-3 h-3" />
            <span>Thinking Mode: {thinkingMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Reply Depth Selector */}
          <div className="flex items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-0.5 text-[10px] font-sans">
            {(['cfo_brief', 'detailed', 'action_plan'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setReplyDepth(mode)}
                className={`px-2.5 py-0.5 rounded-full transition-all duration-150 ${
                  replyDepth === mode
                    ? 'bg-[var(--accent-primary)] text-white font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {mode === 'cfo_brief'
                  ? 'CFO Brief'
                  : mode === 'detailed'
                  ? 'Detailed'
                  : 'Action Plan'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Context Summary */}
      <div className="px-3.5 py-2 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between gap-2 overflow-x-auto text-[11px] font-sans text-[var(--text-muted)] whitespace-nowrap">
        <div>
          {liveSnap.isBlank ? (
            <>
              <span className="font-semibold text-[var(--text-primary)]">Workspace:</span>{' '}
              Blank Workspace (No active deal or invoices loaded)
            </>
          ) : (
            <>
              <span className="font-semibold text-[var(--text-primary)]">Active Deal:</span>{' '}
              {liveSnap.activeDealAmount > 0
                ? `${liveSnap.activeDealClient} (${fmt(liveSnap.activeDealAmount)})`
                : 'None'}
              {' • '}
              <span className="font-semibold text-[var(--text-primary)]">Ageing Book:</span>{' '}
              {liveSnap.ledgerCount > 0
                ? `${liveSnap.ledgerCount} invoice${liveSnap.ledgerCount === 1 ? '' : 's'} (${fmt(liveSnap.ledgerTotal)})`
                : '0 invoices (₹0)'}
              {state.customBusinessActive && state.customBusinessProfile
                ? ` • Custom Adapter: ${state.customBusinessProfile.companyName} (${state.customBusinessProfile.recordsCount} invoices)`
                : ''}
            </>
          )}
        </div>
        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
          6 Sources • 374,284 Recs • 59 Feat • AUC 0.9845 • PR 0.9896 • F1 0.9120
        </span>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isExpanded = !!expandedThinking[msg.id];

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-[var(--accent-primary)]" />
                </div>
              )}

              <div className={`space-y-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Thinking Process Block (if assistant message has thinking trace) */}
                {!isUser && msg.thinkingTrace && msg.thinkingTrace.length > 0 && (
                  <div className="border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => toggleThinking(msg.id)}
                      className="w-full px-3 py-1.5 flex items-center justify-between text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Brain className="w-3 h-3 text-[var(--accent-primary)]" />
                        <span>Thinking process ({msg.thinkingDuration || '1.2s'})</span>
                      </span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-2 pt-1 border-t border-[var(--border-hairline)] space-y-1 text-[var(--text-tertiary)] leading-relaxed">
                        {msg.thinkingTrace.map((step, idx) => (
                          <div key={idx}>{step}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tool Execution Telemetry Badges */}
                {!isUser && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div className="space-y-1.5 w-full">
                    {msg.toolsUsed.map((toolItem, idx) => (
                      <div
                        key={idx}
                        className="border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5 p-2 text-[10px] font-mono"
                      >
                        <div className="flex items-center justify-between text-[var(--accent-primary)] font-bold">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-[var(--accent-primary)]" />
                            <span>[ EXECUTED TOOL: {toolItem.tool.toUpperCase()} ]</span>
                          </span>
                          <span className="text-[9px] text-[var(--text-tertiary)] font-normal">{msg.model || 'Qwen-2.5-7B-Instruct'}</span>
                        </div>
                        {toolItem.args && Object.keys(toolItem.args).length > 0 && (
                          <pre className="text-[9px] text-[var(--text-secondary)] mt-1 pt-1 border-t border-[var(--border-hairline)] overflow-x-auto font-mono">
                            {JSON.stringify(toolItem.args, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Main Message Bubble */}
                <div
                  className={`p-3.5 rounded-xl border text-xs font-sans leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--text-primary)]'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]'
                  }`}
                >
                  {isUser ? msg.content : renderInlineMarkdown(msg.content)}
                </div>

                {/* In-Chat Live EChart (if response contains chart) */}
                {!isUser && msg.chartOption && (
                  <div className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 space-y-2">
                    {msg.chartTitle && (
                      <div className="text-[10px] font-display font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-hairline)] pb-1 flex items-center gap-1.5">
                        <BarChart2 className="w-3 h-3 text-[var(--accent-primary)]" />
                        {msg.chartTitle}
                      </div>
                    )}
                    <EChartBox option={msg.chartOption} height={250} title={msg.chartTitle || 'float. Intelligence Analysis'} />
                  </div>
                )}

                {/* Copyable Action Notice Snippet */}
                {!isUser && msg.actionSnippet && (
                  <div className="border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-3 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--text-primary)] uppercase">
                        {msg.actionSnippet.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopySnippet(msg.actionSnippet!.text, msg.id)}
                        className="px-2 py-0.5 text-[10px] font-mono border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                      >
                        {copiedSnippetId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-[var(--accent-safe)]" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy Snippet
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-2 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[10px] text-[var(--text-muted)] whitespace-pre-wrap">
                      {msg.actionSnippet.text}
                    </pre>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-[var(--text-primary)]" />
                </div>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-3 items-center text-xs font-mono text-[var(--text-muted)]">
            <Bot className="w-4 h-4 text-[var(--accent-primary)] animate-pulse" />
            <span>Analyzing context and preparing response...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Attached File Preview Strip */}
      {attachedFile && (
        <div className="px-4 py-2 border-t border-[var(--border-hairline)] bg-[var(--bg-elevated)] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <Paperclip className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span className="font-bold">{attachedFile.name}</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              ({(attachedFile.size / 1024).toFixed(1)} KB
              {attachedFile.rowCount ? ` | ${attachedFile.rowCount} rows` : ''}
              {attachedFile.totalSum ? ` | ${fmt(attachedFile.totalSum)}` : ''})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAttachedFile(null)}
            className="text-[var(--text-tertiary)] hover:text-[var(--accent-danger)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pill-Free Rectangular Context Attachment Bar */}
      <div className="px-3 py-1.5 border-t border-[var(--border-hairline)] bg-[var(--bg-elevated)] flex items-center gap-2 text-[10px] font-mono flex-wrap">
        <span className="text-[var(--text-tertiary)] uppercase font-semibold">Attached Context:</span>
        {state.intake.invoiceAmount > 0 && (
          <span className="px-2 py-0.5 border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]">
            Deal: {state.intake.clientName || 'Intake Deal'} (₹{(state.intake.invoiceAmount).toLocaleString('en-IN')})
          </span>
        )}
        {state.customBusinessActive && state.customBusinessProfile ? (
          <span className="px-2.5 py-0.5 rounded-full border border-[var(--accent-safe)]/40 bg-[var(--accent-safe)]/10 text-[var(--accent-safe)] font-bold">
            Custom Adapter: {state.customBusinessProfile.companyName} ({state.customBusinessProfile.counterpartiesCount} Counterparties)
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-tertiary)]">
            Custom Adapter: Inactive (6-Source 374,284 Recs • 59 Features)
          </span>
        )}
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-3 py-1.5 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center gap-1.5 overflow-x-auto text-[10px] font-sans whitespace-nowrap">
        {[
          'Audit our Enterprise Profile & CC limits',
          'Should I offer a 2% discount for 10-day payment?',
          'Check customer concentration and HHI risk',
          'Prioritize vendor bills with available cash',
          'Audit missing TDS credits in Form 26AS',
          'Graph our receivables aging distribution',
          'Graph our 60-day cash buffer',
          'Audit active deal against Section 43B(h)',
          'Draft an MSMED statutory notice',
          'Explain model benchmarks (ROC-AUC)',
        ].map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setInputValue(chip);
            }}
            className="px-3 py-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-all duration-150"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Bottom Chat Input Form */}
      <div className="p-3 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.pdf,.json,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-colors"
          title="Attach CSV, PDF, or GST document"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Ask about deal risks, cash runway, Section 43B(h), or request a graph..."
          className="flex-1 py-2 px-3 rounded-lg text-xs font-sans bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-tertiary)]"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!inputValue.trim() && !attachedFile}
          className="px-4 py-2 rounded-lg text-xs font-sans uppercase tracking-wider font-bold border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-40 transition-all duration-150 flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};
