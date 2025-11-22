import { Hash, ChevronDown, Users, Pin, Search, Info, Smile, Paperclip, AtSign, Send, Github } from 'lucide-react';
import { HumanMessage } from './messages/HumanMessage';
import { AgentMessage } from './messages/AgentMessage';
import { SystemMessage } from './messages/SystemMessage';
import { ArchitectPlanCard } from './messages/ArchitectPlanCard';
import { DiffGeneratedCard } from './messages/DiffGeneratedCard';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';
import { useState, useEffect, useRef } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { createMessage, formatTimestamp, getUserInitials } from '@/lib/database';
import { getCurrentUserName } from '@/lib/supabase';
import { getTicketByIdentifier } from '@/lib/database';
import { toast } from 'sonner';

interface ChatPanelProps {
  ticketId: string;
  onToggleRightPanel: () => void;
  isRightPanelOpen: boolean;
  repositoryUrl?: string;
  repositoryName?: string;
}

export function ChatPanel({ ticketId, onToggleRightPanel, isRightPanelOpen, repositoryUrl, repositoryName }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [ticketDbId, setTicketDbId] = useState<string | null>(null);
  const [ticketName, setTicketName] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = getCurrentUserName();

  // Fetch ticket from database to get its ID
  useEffect(() => {
    async function fetchTicket() {
      try {
        const ticket = await getTicketByIdentifier(ticketId);
        if (ticket) {
          setTicketDbId(ticket.id);
          setTicketName(ticket.ticket_name);
        }
      } catch (error) {
        console.error('Error fetching ticket:', error);
        toast.error('Failed to load ticket');
      }
    }
    fetchTicket();
  }, [ticketId]);

  // Use the messages hook for polling
  const { messages: dbMessages, loading, error } = useMessages({
    ticketId: ticketDbId,
    enabled: !!ticketDbId,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dbMessages]);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error('Failed to load messages', {
        description: error,
      });
    }
  }, [error]);

  const handleSend = async () => {
    if (!inputValue.trim() || !ticketDbId || sending) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    setSending(true);

    try {
      await createMessage({
        ticket_id: ticketDbId,
        user_or_agent: currentUser,
        message_type: 'human',
        content: messageContent,
        metadata: {
          avatar: getUserInitials(currentUser),
        },
      });

      // Message will appear via polling
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
      // Restore the message in input
      setInputValue(messageContent);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      {/* Header */}
      <div className="h-14 border-b border-gray-300 flex items-center justify-between px-4 bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <Hash className="w-5 h-5 text-gray-600" />
          <h1 className="text-gray-900">{ticketName || ticketId}</h1>
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
          {loading && dbMessages.length === 0 ? (
            <LoadingState />
          ) : dbMessages.length === 0 ? (
            <EmptyState />
          ) : (
            dbMessages.map((message) => {
              const formattedTimestamp = formatTimestamp(message.timestamp);

              if (message.message_type === 'system') {
                return (
                  <SystemMessage
                    key={message.id}
                    content={message.content || ''}
                    timestamp={formattedTimestamp}
                  />
                );
              }

              if (message.message_type === 'human') {
                return (
                  <HumanMessage
                    key={message.id}
                    content={message.content || ''}
                    author={message.user_or_agent}
                    avatar={message.metadata?.avatar || getUserInitials(message.user_or_agent)}
                    timestamp={formattedTimestamp}
                  />
                );
              }

              if (message.message_type === 'agent') {
                return (
                  <AgentMessage
                    key={message.id}
                    content={message.content || ''}
                    agent={message.metadata?.agent || 'dev'}
                    author={message.user_or_agent}
                    timestamp={formattedTimestamp}
                  />
                );
              }

              if (message.message_type === 'architect-plan') {
                return <ArchitectPlanCard key={message.id} timestamp={formattedTimestamp} />;
              }

              if (message.message_type === 'diff-generated') {
                return <DiffGeneratedCard key={message.id} timestamp={formattedTimestamp} />;
              }

              return null;
            })
          )}
          <div ref={messagesEndRef} />
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
              disabled={!inputValue.trim() || sending}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'Sending...' : 'Send'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
