'use client';

import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-gray-950 px-4">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-red-100 dark:border-red-900 flex flex-col items-center gap-4 max-w-md text-center">
        <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-full text-red-500">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100">Application Error</h2>
        <p className="text-sm text-slate-500 dark:text-gray-400 font-mono">
          {error.message ?? 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-md"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
