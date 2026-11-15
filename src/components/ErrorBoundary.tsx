import React, { Component, type ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Veritas AI Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex items-center justify-center h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] p-8">
          <div className="max-w-md border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent-danger)] mb-3">Module Error</div>
            <p className="text-sm text-[var(--text-muted)] mb-4">A view failed to render. This is a client-side issue.</p>
            <pre className="text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--bg-elevated)] p-3 border border-[var(--border-hairline)] overflow-auto max-h-40 whitespace-pre-wrap">
              {this.state.error?.message}
            </pre>
            <button onClick={() => this.setState({ hasError: false, error: null })} className="mt-4 px-4 py-2 text-[11px] font-mono border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-colors">
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
