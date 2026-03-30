'use client';

import { useState, useEffect } from 'react';

interface ChatMessage {
  role: string;
  content: string;
  timestamp?: string;
}

interface Chat {
  id: string;
  userData: { name: string; phone: string };
  messages: ChatMessage[];
  updatedAt: string;
  needsLearning: boolean;
  needsLearningMsg: string | null;
  resolvedAt: string | null;
}

export default function AdminChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'flagged' | 'resolved'>('all');
  const [teachAnswer, setTeachAnswer] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const res = await fetch('/api/admin/chats');
      const data = await res.json();
      if (data.chats) setChats(data.chats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeach = async () => {
    if (!selectedChat || !teachAnswer.trim()) return;
    setIsSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`/api/admin/chats/${selectedChat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'teach',
          question: selectedChat.needsLearningMsg || '',
          answer: teachAnswer.trim(),
        }),
      });
      if (res.ok) {
        setSaveMsg('Saved to knowledge base!');
        setTeachAnswer('');
        // Update local state
        setChats(prev => prev.map(c =>
          c.id === selectedChat.id
            ? { ...c, needsLearning: false, resolvedAt: new Date().toISOString() }
            : c
        ));
        setSelectedChat(prev => prev ? { ...prev, needsLearning: false, resolvedAt: new Date().toISOString() } : null);
      } else {
        setSaveMsg('Error saving. Try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedChat) return;
    setIsSaving(true);
    try {
      await fetch(`/api/admin/chats/${selectedChat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve' }),
      });
      setChats(prev => prev.map(c =>
        c.id === selectedChat.id
          ? { ...c, needsLearning: false, resolvedAt: new Date().toISOString() }
          : c
      ));
      setSelectedChat(prev => prev ? { ...prev, needsLearning: false, resolvedAt: new Date().toISOString() } : null);
    } finally {
      setIsSaving(false);
    }
  };

  const flaggedCount = chats.filter(c => c.needsLearning).length;

  const filteredChats = chats.filter(chat => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !chat.userData?.name?.toLowerCase().includes(q) &&
        !chat.userData?.phone?.toLowerCase().includes(q)
      ) return false;
    }
    if (filter === 'flagged') return chat.needsLearning;
    if (filter === 'resolved') return !chat.needsLearning && !!chat.resolvedAt;
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6">
      {/* Chat List */}
      <div className="w-1/3 bg-[#0f0f13] rounded-2xl shadow-lg border border-white/5 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-zinc-900/30 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-100">All Chats ({chats.length})</h2>
            {flaggedCount > 0 && (
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                {flaggedCount} flagged
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
          />
          {/* Filter tabs */}
          <div className="flex gap-1">
            {(['all', 'flagged', 'resolved'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 text-xs py-1 rounded-lg capitalize transition-all ${
                  filter === f
                    ? f === 'flagged'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-purple-900/30 text-purple-300 border border-purple-500/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="text-center p-8 text-zinc-500 animate-pulse">Loading...</div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center p-8 text-zinc-500">No chats found.</div>
          ) : (
            <ul className="space-y-2">
              {filteredChats.map(chat => (
                <li key={chat.id}>
                  <button
                    onClick={() => { setSelectedChat(chat); setTeachAnswer(''); setSaveMsg(''); }}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      selectedChat?.id === chat.id
                        ? 'bg-purple-900/30 border border-purple-500/20 shadow-inner'
                        : 'hover:bg-zinc-900/50 border border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-zinc-200 truncate pr-2">
                        {chat.userData?.name || 'Anonymous'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {chat.needsLearning && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                            needs learning
                          </span>
                        )}
                        {!chat.needsLearning && chat.resolvedAt && (
                          <span className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full">
                            taught
                          </span>
                        )}
                        <span className="text-xs text-zinc-500 whitespace-nowrap">
                          {new Date(chat.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 mb-2 font-mono">
                      {chat.userData?.phone || 'No Phone'}
                    </div>
                    <div className="text-sm text-zinc-500 truncate">
                      {chat.messages[chat.messages.length - 1]?.content || 'No messages'}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Chat Viewer */}
      <div className="flex-1 bg-[#0f0f13] rounded-2xl shadow-lg border border-white/5 flex flex-col overflow-hidden">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-zinc-900/30 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-zinc-100">{selectedChat.userData.name}</h3>
                <p className="text-sm text-zinc-400">{selectedChat.userData.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedChat.needsLearning && (
                  <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full">
                    Needs Learning
                  </span>
                )}
                <div className="text-sm text-zinc-500 font-medium px-3 py-1 bg-zinc-950 rounded-full border border-zinc-800">
                  {selectedChat.messages.length} messages
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-950/50 shadow-inner min-h-0">
              {selectedChat.messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-5 py-4 ${
                    msg.role === 'user'
                      ? 'bg-linear-to-br from-purple-600 to-indigo-600 text-white rounded-br-sm shadow-md'
                      : 'bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 text-zinc-100 rounded-bl-sm shadow-sm'
                  }`}>
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Teach AI Panel — shown when chat is flagged */}
            {selectedChat.needsLearning && (
              <div className="shrink-0 border-t border-amber-500/20 bg-amber-950/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-semibold text-sm">Teach AI</span>
                  <span className="text-xs text-zinc-500">— AI flagged this as uncertain or out of scope</span>
                </div>

                {selectedChat.needsLearningMsg && (
                  <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-400">
                    <span className="text-xs text-zinc-600 block mb-1">User asked:</span>
                    <span className="text-zinc-300">{selectedChat.needsLearningMsg}</span>
                  </div>
                )}

                <textarea
                  value={teachAnswer}
                  onChange={e => setTeachAnswer(e.target.value)}
                  placeholder="Write the correct answer or guideline for this question..."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none"
                />

                {saveMsg && (
                  <p className={`text-xs ${saveMsg.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                    {saveMsg}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleTeach}
                    disabled={isSaving || !teachAnswer.trim()}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save to Knowledge Base'}
                  </button>
                  <button
                    onClick={handleResolve}
                    disabled={isSaving}
                    className="px-4 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded-xl transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Already resolved banner */}
            {!selectedChat.needsLearning && selectedChat.resolvedAt && (
              <div className="shrink-0 border-t border-green-500/20 bg-green-950/10 px-4 py-3">
                <p className="text-xs text-green-400">
                  Taught on {new Date(selectedChat.resolvedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 p-8 text-center bg-zinc-950/30 shadow-inner">
            <div className="text-6xl mb-4 opacity-50 grayscale mix-blend-overlay">💬</div>
            <p className="text-lg">Select a chat from the list to view the conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
