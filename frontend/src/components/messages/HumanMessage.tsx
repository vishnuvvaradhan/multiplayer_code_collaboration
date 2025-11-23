import { getUserColor } from '@/lib/database';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface HumanMessageProps {
  content: string;
  author: string;
  avatar: string;
  timestamp: string;
  showAvatar?: boolean;
}

// Helper function to detect and highlight commands anywhere in the message
const highlightCommands = (content: string): string => {
  // Replace @commands with bold versions anywhere in the message
  return content
    .replace(/(@chat)\s+/g, '**$1** ')
    .replace(/(@make_plan)\s+/g, '**$1** ')
    .replace(/(@dev)\s+/g, '**$1** ')
    // Also handle commands at the start for backward compatibility
    .replace(/^(@chat)\s+/, '**$1** ')
    .replace(/^(@make_plan)\s+/, '**$1** ')
    .replace(/^(@dev)\s+/, '**$1** ');
};

export function HumanMessage({ content, author, avatar, timestamp, showAvatar = true }: HumanMessageProps) {
  const userColor = getUserColor(author);

  // Check if message contains commands and highlight them
  const processedContent = highlightCommands(content);
  
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
          <div className={showAvatar ? '' : 'ml-0'}>
            <MarkdownRenderer content={processedContent} />
          </div>
        </div>
      </div>
    </div>
  );
}