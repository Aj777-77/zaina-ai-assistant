'use client';

import { useState, useEffect } from 'react';

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export default function AdminDocuments() {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/knowledge');
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      
      if (res.ok) {
        showMessage('Document added successfully!', 'success');
        setTitle('');
        setContent('');
        setIsAdding(false);
        fetchDocuments(); // Refresh list
      } else {
        const data = await res.json();
        showMessage(data.error || 'Failed to add document.', 'error');
      }
    } catch (error) {
      console.error('Error adding document:', error);
      showMessage('An unexpected error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const res = await fetch(`/api/admin/knowledge?id=${id}`, { method: 'DELETE' });
      
      if (res.ok) {
        showMessage('Document deleted successfully!', 'success');
        setDocuments(prev => prev.filter(doc => doc.id !== id));
      } else {
        const data = await res.json();
        showMessage(data.error || 'Failed to delete document.', 'error');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      showMessage('An unexpected error occurred.', 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/plain') {
      showMessage('Only .txt files are supported for now.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      setTitle(file.name.replace('.txt', ''));
      setContent(result);
      setIsAdding(true);
    };
    reader.onerror = () => {
      showMessage('Failed to read file.', 'error');
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-[#0f0f13] p-6 rounded-2xl shadow-lg border border-white/5">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Learning Hub</h2>
          <p className="text-zinc-400 mt-1">Upload knowledge documents for the AI to reference during chats.</p>
        </div>
        <div className="flex gap-4">
          <label className="bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white font-semibold py-2.5 px-6 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2">
            📄 Upload .TXT
            <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
          </label>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 transition-all active:scale-95 flex items-center gap-2 border border-white/10"
          >
            {isAdding ? 'Cancel' : '📝 New Note'}
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-green-950/30 border-green-900/50 text-green-400' : 'bg-red-950/30 border-red-900/50 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-6">
        {/* Left panel: Add form OR document viewer */}
        {(isAdding || selectedDoc) && (
          <div className="w-1/2 bg-[#0f0f13] rounded-2xl shadow-lg border border-white/5 overflow-hidden flex flex-col h-[calc(100vh-16rem)]">
            {isAdding ? (
              <form onSubmit={handleAddDocument} className="flex flex-col h-full">
                <div className="p-4 border-b border-white/5 bg-zinc-900/30">
                  <input
                    type="text"
                    placeholder="Document Title (e.g. Return Policy)"
                    className="w-full text-lg font-bold outline-none placeholder:text-zinc-600 bg-transparent text-zinc-100"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="flex-1 w-full p-6 outline-none resize-none text-sm leading-relaxed text-zinc-300 bg-zinc-950/50 border-none focus:ring-inset focus:ring-1 focus:ring-purple-500/50"
                  placeholder="Type or paste the reference content here..."
                  required
                />
                <div className="p-4 border-t border-white/5 bg-zinc-900/30 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl shadow-lg shadow-purple-900/20 transition-all active:scale-95 disabled:opacity-50 border border-white/10"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Document'}
                  </button>
                </div>
              </form>
            ) : selectedDoc && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-white/5 bg-zinc-900/30 flex justify-between items-start">
                  <h4 className="font-bold text-zinc-100 text-lg leading-tight">{selectedDoc.title}</h4>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="text-zinc-500 hover:text-zinc-200 transition-colors ml-3 shrink-0"
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <pre className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans">{selectedDoc.content}</pre>
                </div>
                <div className="p-4 border-t border-white/5 bg-zinc-900/30 text-xs text-zinc-600 font-medium uppercase tracking-wide">
                  Added: {new Date(selectedDoc.createdAt).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Existing Documents List */}
        <div className={`${isAdding ? 'w-1/2' : 'w-full'} bg-[#0f0f13] rounded-2xl shadow-lg border border-white/5 overflow-hidden h-[calc(100vh-16rem)] flex flex-col`}>
          <div className="p-4 border-b border-white/5 bg-zinc-900/30">
            <h3 className="font-semibold text-zinc-100">Knowledge Base ({documents.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="text-center p-8 text-zinc-500 animate-pulse">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="text-center flex flex-col items-center justify-center h-full text-zinc-600 p-8">
                <div className="text-6xl mb-4 opacity-50 grayscale mix-blend-overlay">🗂️</div>
                <p>No documents found.</p>
                <p className="text-sm mt-2">Upload a file or create a note to get started.</p>
              </div>
            ) : (
              documents.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => { setSelectedDoc(doc); setIsAdding(false); }}
                  className={`border rounded-xl p-4 transition-all bg-zinc-900/30 shadow-sm group cursor-pointer ${selectedDoc?.id === doc.id ? 'border-purple-500/50 bg-purple-900/10' : 'border-zinc-800 hover:border-purple-500/30'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-zinc-200 group-hover:text-purple-400 transition-colors">{doc.title}</h4>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                      className="text-red-400/50 hover:text-red-400 hover:bg-red-950/30 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Delete Document"
                    >
                      🗑️
                    </button>
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed">
                    {doc.content}
                  </p>
                  <div className="mt-3 text-xs text-zinc-600 font-medium tracking-wide uppercase">
                    Added: {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
