'use client';

import { useState } from 'react';

type ScrapeResult = {
  type: string;
  saved: number;
  errors: number;
  summary: Record<string, number>;
};

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function ScrapePage() {
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeType, setActiveType] = useState<string>('');

  const runScrape = async (type: 'products' | 'plans' | 'all') => {
    setStatus('loading');
    setActiveType(type);
    setResults([]);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();

      if (data.success) {
        setResults(data.results);
        setStatus('success');
      } else {
        setErrorMsg(data.error || 'Unknown error');
        setStatus('error');
      }
    } catch (err) {
      setErrorMsg(String(err));
      setStatus('error');
    }
  };

  const isLoading = status === 'loading';

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Data Sync</h1>
        <p className="text-zinc-500 mt-1 text-sm">Fetch latest products and plans from the Zain e-shop and save to Firestore.</p>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => runScrape('products')}
          disabled={isLoading}
          className="flex flex-col items-center gap-2 px-6 py-5 rounded-2xl bg-purple-900/30 border border-purple-500/20 hover:bg-purple-900/50 hover:border-purple-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-center"
        >
          <span className="text-2xl">📦</span>
          <span className="font-semibold text-zinc-100">Fetch Products</span>
          <span className="text-xs text-zinc-500">Smartphones, tablets, accessories...</span>
        </button>

        <button
          onClick={() => runScrape('plans')}
          disabled={isLoading}
          className="flex flex-col items-center gap-2 px-6 py-5 rounded-2xl bg-indigo-900/30 border border-indigo-500/20 hover:bg-indigo-900/50 hover:border-indigo-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-center"
        >
          <span className="text-2xl">📋</span>
          <span className="font-semibold text-zinc-100">Fetch Plans</span>
          <span className="text-xs text-zinc-500">Postpaid, prepaid, broadband...</span>
        </button>

        <button
          onClick={() => runScrape('all')}
          disabled={isLoading}
          className="flex flex-col items-center gap-2 px-6 py-5 rounded-2xl bg-emerald-900/30 border border-emerald-500/20 hover:bg-emerald-900/50 hover:border-emerald-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-center"
        >
          <span className="text-2xl">🔄</span>
          <span className="font-semibold text-zinc-100">Fetch All</span>
          <span className="text-xs text-zinc-500">Products + Plans together</span>
        </button>
      </div>

      {/* Status */}
      {isLoading && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-3 text-zinc-300">
            <svg className="animate-spin h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="font-medium">
              Scraping <span className="text-purple-400 capitalize">{activeType}</span>... This may take a few minutes.
            </span>
          </div>
          <p className="text-zinc-600 text-xs mt-2">Do not close this page.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-5">
          <p className="text-red-400 font-semibold mb-1">Scrape failed</p>
          <p className="text-red-300/70 text-sm font-mono break-all">{errorMsg}</p>
        </div>
      )}

      {status === 'success' && results.length > 0 && (
        <div className="space-y-4">
          <p className="text-emerald-400 font-semibold">Done! Here&apos;s what was saved:</p>
          {results.map((r) => (
            <div key={r.type} className="bg-zinc-900 border border-zinc-700/50 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-100 font-semibold capitalize">{r.type}</span>
                <div className="flex gap-3 text-sm">
                  <span className="text-emerald-400 font-mono">{r.saved} saved</span>
                  {r.errors > 0 && <span className="text-red-400 font-mono">{r.errors} errors</span>}
                </div>
              </div>
              <div className="border-t border-zinc-800 pt-3 space-y-1">
                {Object.entries(r.summary).map(([label, count]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-zinc-400">{label}</span>
                    <span className="text-zinc-300 font-mono">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
