interface QuickActionsProps {
  onSelect: (message: string) => void;
  disabled?: boolean;
}

export default function QuickActions({ onSelect, disabled = false }: QuickActionsProps) {
  const suggestions = [
    { icon: '📱', text: 'Show me latest phones', query: 'Show me the latest phones available' },
    { icon: '💰', text: 'Budget phones under BD 300', query: 'I need a phone under BD 300' },
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
          className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          <span className="text-xl">{suggestion.icon}</span>
          <span className="text-sm font-medium text-gray-700">{suggestion.text}</span>
        </button>
      ))}
    </div>
  );
}
