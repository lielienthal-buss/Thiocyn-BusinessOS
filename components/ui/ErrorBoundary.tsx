import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Optional fallback component. Default: built-in error card. */
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <span className="text-4xl mb-3">💥</span>
          <p className="text-sm font-semibold text-red-400 mb-1">Something crashed</p>
          <p className="text-xs text-slate-500 max-w-md mb-4 font-mono">
            {this.state.error?.message ?? 'Unknown error'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 text-xs font-bold text-slate-300 bg-surface-700 border border-white/[0.08] rounded-lg hover:bg-surface-600 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
