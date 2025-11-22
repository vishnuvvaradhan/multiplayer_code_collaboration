import { Hash, ChevronDown, Users, Pin, Search, Info, Smile, Paperclip, AtSign, Send, Github } from 'lucide-react';
import { HumanMessage } from './messages/HumanMessage';
import { AgentMessage } from './messages/AgentMessage';
import { SystemMessage } from './messages/SystemMessage';
import { ArchitectPlanCard } from './messages/ArchitectPlanCard';
import { DiffGeneratedCard } from './messages/DiffGeneratedCard';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';
import { useState, useEffect } from 'react';

interface ChatPanelProps {
  ticketId: string;
  onToggleRightPanel: () => void;
  isRightPanelOpen: boolean;
  repositoryUrl?: string;
  repositoryName?: string;
}

type Message = 
  | { type: 'system'; content: string; timestamp: string }
  | { type: 'human'; content: string; author: string; avatar: string; timestamp: string }
  | { type: 'agent'; content: string; agent: string; author: string; timestamp: string }
  | { type: 'architect-plan'; timestamp: string }
  | { type: 'diff-generated'; timestamp: string };

const defaultMessages: Message[] = [
  {
    type: 'system',
    content: 'Ticket created',
    timestamp: '10:23 AM',
  },
  {
    type: 'human',
    content: 'We need to add validation for payment methods in the checkout flow. Users should see clear error messages if the card is invalid.',
    author: 'Jane Doe',
    avatar: 'JD',
    timestamp: '10:24 AM',
  },
  {
    type: 'agent',
    agent: 'architect',
    content: 'I\'ll create a plan for implementing payment method validation. Let me analyze the current checkout implementation.',
    author: 'Architect',
    timestamp: '10:24 AM',
  },
  {
    type: 'architect-plan',
    timestamp: '10:25 AM',
  },
  {
    type: 'human',
    content: 'Looks good! Please implement this.',
    author: 'Jane Doe',
    avatar: 'JD',
    timestamp: '10:27 AM',
  },
  {
    type: 'system',
    content: 'Plan approved by Jane Doe',
    timestamp: '10:27 AM',
  },
  {
    type: 'agent',
    agent: 'dev',
    content: 'Starting implementation based on the approved plan. I\'ll create the validation logic and error handling components.',
    author: 'Dev Agent',
    timestamp: '10:28 AM',
  },
  {
    type: 'diff-generated',
    timestamp: '10:29 AM',
  },
  {
    type: 'human',
    content: 'Perfect! The validation is working great.',
    author: 'Mike Kim',
    avatar: 'MK',
    timestamp: '10:31 AM',
  },
];

export function ChatPanel({ ticketId, onToggleRightPanel, isRightPanelOpen, repositoryUrl, repositoryName }: ChatPanelProps) {
  // Log repository info when it changes
  useEffect(() => {
    if (repositoryUrl) {
      console.log('💬 ChatPanel received repository context:', {
        url: repositoryUrl,
        name: repositoryName,
        ticketId,
      });
    } else {
      console.log('💬 ChatPanel: No repository context available');
    }
  }, [repositoryUrl, repositoryName, ticketId]);

  // Initialize messages with repository context if available
  const initialMessages: Message[] = repositoryUrl 
    ? [
        {
          type: 'system',
          content: `Repository context: ${repositoryName || repositoryUrl}\nThis chat is connected to the GitHub repository for agent context. The agent can access code and context from: ${repositoryUrl}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...defaultMessages,
      ]
    : defaultMessages;

  const [messages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = () => {
    if (inputValue.trim()) {
      setInputValue('');
      // Handle send logic
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      {/* Header */}
      <div className="h-14 border-b border-gray-300 flex items-center justify-between px-4 bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <Hash className="w-5 h-5 text-gray-600" />
          <h1 className="text-gray-900">add-payment-method-validation</h1>
          <ChevronDown className="w-4 h-4 text-gray-500" />
          {repositoryUrl && (
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors border border-gray-300"
              title={`Repository: ${repositoryName || repositoryUrl}\nURL: ${repositoryUrl}`}
              onClick={(e) => {
                console.log('🔗 Repository link clicked:', repositoryUrl);
                // Don't prevent default - let it open the link
              }}
            >
              <Github className="w-3.5 h-3.5" />
              <span className="truncate max-w-[150px]" title={repositoryUrl}>
                {repositoryName || 'Repository'}
              </span>
            </a>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <Users className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <Pin className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <Search className="w-4 h-4 text-gray-600" />
          </button>
          <div className="w-px h-5 bg-gray-300 mx-1"></div>
          <button 
            onClick={onToggleRightPanel}
            className={`p-2 rounded-md transition-colors ${
              isRightPanelOpen ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
          >
            <Info className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-none">
          {messages.map((message, index) => {
            if (message.type === 'system') {
              return (
                <SystemMessage
                  key={index}
                  content={message.content || ''}
                  timestamp={message.timestamp}
                />
              );
            }

            if (message.type === 'human') {
              return (
                <HumanMessage
                  key={index}
                  content={message.content || ''}
                  author={message.author}
                  avatar={message.avatar}
                  timestamp={message.timestamp}
                />
              );
            }

            if (message.type === 'agent') {
              return (
                <AgentMessage
                  key={index}
                  content={message.content || ''}
                  agent={message.agent as 'architect' | 'dev'}
                  author={message.author}
                  timestamp={message.timestamp}
                />
              );
            }

            if (message.type === 'architect-plan') {
              return <ArchitectPlanCard key={index} timestamp={message.timestamp} />;
            }

            if (message.type === 'diff-generated') {
              return <DiffGeneratedCard key={index} timestamp={message.timestamp} />;
            }

            return null;
          })}

          {isLoading && <LoadingState />}
        </div>
      </div>

      {/* Input Bar */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-200 bg-white">
        <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:shadow-sm transition-all bg-white">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Write a comment..."
            className="w-full px-3 py-2.5 text-sm outline-none bg-white text-gray-900 placeholder-gray-500"
          />
          <div className="flex items-center justify-between px-2 pb-2 border-t border-gray-200">
            <div className="flex items-center gap-1">
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Attach files">
                <Paperclip className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Add emoji">
                <Smile className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Mention">
                <AtSign className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
