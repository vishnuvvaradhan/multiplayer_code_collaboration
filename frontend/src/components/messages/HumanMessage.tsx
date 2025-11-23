import { getUserColor } from '@/lib/database';

interface HumanMessageProps {
  content: string;
  author: string;
  avatar: string;
  timestamp: string;
  showAvatar?: boolean;
}

export function HumanMessage({ content, author, avatar, timestamp, showAvatar = true }: HumanMessageProps) {
  const userColor = getUserColor(author);
  
  // Check if message starts with a command and highlight it
  let displayContent: React.ReactNode = content;
  
  if (content.startsWith('@chat')) {
    displayContent = (
      <>
        <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">@chat</span>
        <span>{content.slice(5)}</span>
      </>
    );
  } else if (content.startsWith('@make_plan')) {
    displayContent = (
      <>
        <span className="font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">@make_plan</span>
        <span>{content.slice(10)}</span>
      </>
    );
  } else if (content.startsWith('@dev')) {
    displayContent = (
      <>
        <span className="font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">@dev</span>
        <span>{content.slice(4)}</span>
      </>
    );
  }
  
  return (
    <div className={`px-4 hover:bg-gray-50 group transition-colors ${showAvatar ? 'py-3 border-t border-gray-100' : 'py-1'}`}>
      <div className="flex gap-3">
        {showAvatar ? (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${userColor.bg} ${userColor.text} border border-gray-200 shadow-sm`}>
            <span className="text-sm font-medium">{avatar}</span>
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
          <p className={`text-sm text-gray-800 leading-[1.5] ${showAvatar ? '' : 'ml-0'}`}>{displayContent}</p>
        </div>
      </div>
    </div>
  );
}