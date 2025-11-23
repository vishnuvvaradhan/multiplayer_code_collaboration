import { Bot, FileCode, CheckCircle } from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface ArchitectPlanCardProps {
  timestamp: string;
  content?: string;
}

export function ArchitectPlanCard({ timestamp, content }: ArchitectPlanCardProps) {
  return (
    <div className="px-4 py-3 hover:bg-gray-50 group transition-colors border-t border-gray-100">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-white shadow-sm">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-sm text-gray-900">Architect</span>
            <span className="text-xs text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded border border-gray-300">BOT</span>
            <span className="text-xs text-gray-500">{timestamp}</span>
          </div>
          <div className="border border-gray-300 rounded-md p-4 bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-gray-900">Implementation Plan</h3>
            </div>

            <div className="prose prose-sm max-w-none">
              {content ? (
                <MarkdownRenderer content={content} className="text-sm" />
              ) : (
                <p className="text-sm text-gray-600 italic">Plan content loading...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}