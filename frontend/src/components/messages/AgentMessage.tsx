import { Bot, Code } from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface AgentMessageProps {
  content: string;
  agent: 'architect' | 'dev';
  author: string;
  timestamp: string;
  metadata?: {
    agent?: string;
  };
}

export function AgentMessage({ content, agent, author, timestamp, metadata }: AgentMessageProps) {
  const isArchitect = agent === 'architect';
  
  return (
    <div className="px-4 py-3 hover:bg-gray-50 group transition-colors border-t border-gray-100">
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm ${
          isArchitect 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
            : 'bg-gradient-to-br from-purple-500 to-purple-600'
        }`}>
          {isArchitect ? (
            <Bot className="w-5 h-5 text-white" />
          ) : (
            <Code className="w-5 h-5 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm text-gray-900">{author}</span>
            <span className="text-xs text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded border border-gray-300">BOT</span>
            <span className="text-xs text-gray-500">{timestamp}</span>
          </div>
          <MarkdownRenderer content={content} />
        </div>
      </div>
    </div>
  );
}