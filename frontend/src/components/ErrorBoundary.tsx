'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
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
    console.error('[ErrorBoundary]', error, info);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center w-full h-full bg-slate-50 dark:bg-gray-950">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-red-100 dark:border-red-900 flex flex-col items-center gap-4 max-w-md text-center">
            <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-full text-red-500">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100">Something went wrong</h2>
            <p className="text-sm text-slate-500 dark:text-gray-400 font-mono">
              {this.state.error?.message ?? 'Unknown error'}
            </p>
            <button
              onClick={this.retry}
              className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-md"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
