import React, { Component, type ReactNode } from 'react';
import { generateSecureId } from '../../engine/security';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  incidentId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, incidentId: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const incidentId = generateSecureId('SEC_ERR').toUpperCase();
    return { hasError: true, error, incidentId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // In production, avoid leaking internal object state or tokens
    if (import.meta.env.DEV) {
      console.error('[float. ErrorBoundary] Caught exception:', error, errorInfo);
    } else {
      console.error(`[float. ErrorBoundary] Incident ${this.state.incidentId}: An isolated module error occurred.`);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, incidentId: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-[400px] h-full w-full bg-[var(--bg-canvas)] text-[var(--text-primary)] p-6">
          <div className="max-w-md w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3 mb-4">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent-danger)]">
                Isolated Module Recovery
              </span>
              <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                {this.state.incidentId}
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
              An isolated execution fault was intercepted. Your financial dataset and workspace state remain intact and secure.
            </p>

            <pre className="text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border-hairline)] overflow-auto max-h-36 whitespace-pre-wrap mb-4">
              {this.state.error?.message || 'Unknown runtime error'}
            </pre>

            <div className="flex items-center gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-2 text-[11px] font-mono font-semibold uppercase tracking-wider border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-colors"
              >
                Reset View
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 text-[11px] font-mono text-[var(--text-muted)] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
