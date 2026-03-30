'use client';

import { useState, useEffect } from 'react';

export default function AdminRules() {
  const [persona, setPersona] = useState('');
  const [criticalRules, setCriticalRules] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [tab, setTab] = useState<'persona' | 'rules'>('persona');

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/admin/rules');
      const data = await res.json();
      if (data.content) setPersona(data.content);
      if (data.criticalRules) setCriticalRules(data.criticalRules.trim());
    } catch (error) {
      console.error('Error fetching rules:', error);
      showMessage('Failed to load current rules.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch('/api/admin/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: persona }),
      });
      if (res.ok) {
        showMessage('Persona updated successfully!', 'success');
      } else {
        const data = await res.json();
        showMessage(data.error || 'Failed to update.', 'error');
      }
    } catch {
      showMessage('An unexpected error occurred.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#0f0f13] p-6 rounded-2xl shadow-lg border border-white/5">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Bot Rules</h2>
          <p className="text-sm text-zinc-500 mt-1">Persona is editable. Critical rules are enforced in code.</p>
        </div>
        {tab === 'persona' && (
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-white/10"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-green-950/30 border-green-900/50 text-green-400' : 'bg-red-950/30 border-red-900/50 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('persona')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'persona' ? 'bg-purple-900/40 text-purple-300 border border-purple-500/30' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'}`}
        >
          Persona
        </button>
        <button
          onClick={() => setTab('rules')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'rules' ? 'bg-purple-900/40 text-purple-300 border border-purple-500/30' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'}`}
        >
          Critical Rules
          <span className="ml-2 text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700">read-only</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-[#0f0f13] rounded-2xl shadow-lg border border-white/5 overflow-hidden flex flex-col h-[calc(100vh-18rem)]">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 animate-pulse">Loading...</div>
        ) : tab === 'persona' ? (
          <textarea
            value={persona}
            onChange={e => setPersona(e.target.value)}
            className="flex-1 w-full p-6 outline-none resize-none font-mono text-sm leading-relaxed text-zinc-300 bg-zinc-950/50 border-none focus:ring-inset focus:ring-1 focus:ring-purple-500/50"
            placeholder="Enter the AI persona and tone here..."
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/25 px-3 py-1 rounded-full">
                These rules are enforced in code and cannot be changed from here. Edit <code className="font-mono">src/lib/criticalRules.ts</code> to modify them.
              </span>
            </div>
            <pre className="font-mono text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{criticalRules}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
