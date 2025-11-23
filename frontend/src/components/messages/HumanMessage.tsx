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
          <div className={showAvatar ? '' : 'ml-0'}>
            <MarkdownRenderer content={processedContent} />
          </div>
        </div>
      </div>
    </div>
  );
}