import { Bot, Code, Sparkles } from 'lucide-react';
import { TextShimmer } from '../TextShimmer';

interface AgentMessageProps {
  content: string;
  agent: 'architect' | 'dev';
  author: string;
  timestamp: string;
  metadata?: {
    agent?: string;
    streaming?: boolean;
  };
}

export function AgentMessage({ content, agent, author, timestamp, metadata }: AgentMessageProps) {
  // Determine agent type: architect (blue), AI Assistant (orange), or dev (purple)
  const isAIAssistant = author.toLowerCase().includes('ai assistant') || author.toLowerCase().includes('assistant');
  const agentType = agent || metadata?.agent || (author.toLowerCase().includes('architect') ? 'architect' : 'dev');
  const isArchitect = agentType === 'architect' && !isAIAssistant;
  const isStreaming = metadata?.streaming || false;
  
  // Determine colors and icon based on agent type
  let avatarBg = 'bg-gradient-to-br from-purple-500 to-purple-600';
  let messageBg = 'bg-purple-50 border border-purple-100';
  let icon = <Code className="w-5 h-5 text-white" />;
  let shimmerText = 'Generating Code';
  
  if (isAIAssistant) {
    avatarBg = 'bg-gradient-to-br from-orange-500 to-orange-600';
    messageBg = 'bg-orange-50 border border-orange-100';
    icon = <Sparkles className="w-5 h-5 text-white" />;
    shimmerText = 'Thinking...';
  } else if (isArchitect) {
    avatarBg = 'bg-gradient-to-br from-blue-500 to-blue-600';
    messageBg = 'bg-blue-50 border border-blue-100';
    icon = <Bot className="w-5 h-5 text-white" />;
    shimmerText = 'Creating Plan...';
  }
  
  return (
    <div className="group transition-all duration-200 py-4">
      <div className="flex gap-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md ring-1 ring-gray-200/50 ${avatarBg}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2.5 mb-2.5">
            <span className="text-sm text-gray-900 font-semibold">{author}</span>
            <span className="text-xs text-gray-400">{timestamp}</span>
          </div>
          <div className={`rounded-2xl px-4 py-3.5 shadow-sm ring-1 ring-inset ${messageBg} transition-all duration-200 group-hover:shadow-md`}>
            <div className="prose prose-sm max-w-none">
              {isStreaming ? (
                <p className="text-[15px] leading-7">
                  <TextShimmer text={shimmerText} />
                </p>
              ) : (
                <p className="text-[15px] text-gray-800 leading-7 whitespace-pre-wrap">{content}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}