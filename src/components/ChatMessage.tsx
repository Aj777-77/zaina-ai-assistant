interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export default function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-purple-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div className="flex items-start gap-2">
          {!isUser && (
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
              Z
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm whitespace-pre-wrap">{content}</p>
            {timestamp && (
              <p className={`text-xs mt-1 ${isUser ? 'text-purple-200' : 'text-gray-500'}`}>
                {timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
