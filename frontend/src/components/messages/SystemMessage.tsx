import { MarkdownRenderer } from '../MarkdownRenderer';

interface SystemMessageProps {
  content: string;
  timestamp: string;
}

export function SystemMessage({ content, timestamp }: SystemMessageProps) {
  return (
    <div className="px-4 py-4 border-t border-gray-100">
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">
          <MarkdownRenderer content={content} className="text-xs text-gray-700" />
          <span className="text-xs text-gray-500">·</span>
          <span className="text-xs text-gray-500">{timestamp}</span>
        </div>
      </div>
    </div>
  );
}