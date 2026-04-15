interface QuickActionsProps {
  onSelect: (message: string) => void;
  disabled?: boolean;
}

export default function QuickActions({ onSelect, disabled = false }: QuickActionsProps) {
  const suggestions = [
    { icon: '📱', text: 'Show me latest phones', query: 'Show me the latest phones available' },
    { icon: '💰', text: 'Budget phones under BD 400', query: 'I need a phone under BD 400' },
    { icon: '🍎', text: 'Apple devices', query: 'Show me Apple devices' },
    { icon: '📞', text: 'Best plans', query: 'What are the best mobile plans?' },
    { icon: '⌚', text: 'Smart watches', query: 'Show me smart watches' },
    { icon: '🎮', text: 'Gaming phones', query: 'I need a phone for gaming' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion.query)}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:border-purple-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          <span className="text-xl">{suggestion.icon}</span>
          <span className="text-sm font-medium text-zinc-200">{suggestion.text}</span>
        </button>
      ))}
    </div>
  );
}
