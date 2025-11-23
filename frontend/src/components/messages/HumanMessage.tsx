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
    <div className={`group transition-all duration-200 ${showAvatar ? 'py-4' : 'py-2'}`}>
      <div className="flex gap-4">
        {showAvatar ? (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${userColor.bg} ${userColor.text} shadow-sm ring-1 ring-gray-200/50`}>
            <span className="text-xs font-semibold">{avatar}</span>
          </div>
        ) : (
          <div className="w-8 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {showAvatar && (
            <div className="flex items-baseline gap-2.5 mb-2">
              <span className="text-sm text-gray-900 font-semibold">{author}</span>
              <span className="text-xs text-gray-400">{timestamp}</span>
            </div>
          )}
          <div className="prose prose-sm max-w-none">
            <p className={`text-[15px] text-gray-800 leading-7 ${showAvatar ? '' : 'ml-0'}`}>{displayContent}</p>
          </div>
        </div>
      </div>
    </div>
  );
}