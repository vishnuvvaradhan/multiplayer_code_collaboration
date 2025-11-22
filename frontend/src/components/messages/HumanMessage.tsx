interface HumanMessageProps {
  content: string;
  author: string;
  avatar: string;
  timestamp: string;
  showAvatar?: boolean;
}

export function HumanMessage({ content, author, avatar, timestamp, showAvatar = true }: HumanMessageProps) {
  return (
    <div className={`px-4 hover:bg-gray-50 group transition-colors ${showAvatar ? 'py-3 border-t border-gray-100' : 'py-1'}`}>
      <div className="flex gap-3">
        {showAvatar ? (
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-600 to-purple-600 border-2 border-white shadow-sm">
            <span className="text-white text-sm">{avatar}</span>
          </div>
        ) : (
          <div className="w-10 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {showAvatar && (
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm text-gray-900 font-medium">{author}</span>
              <span className="text-xs text-gray-500">{timestamp}</span>
            </div>
          )}
          <p className={`text-sm text-gray-800 leading-[1.5] ${showAvatar ? '' : 'ml-0'}`}>{content}</p>
        </div>
      </div>
    </div>
  );
}