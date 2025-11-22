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
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

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
  const [participants, setParticipants] = useState<string[]>([]);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [shouldJustifyEnd, setShouldJustifyEnd] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUser = getCurrentUserName();

  // Fetch ticket from database to get its ID and participants
  useEffect(() => {
    async function fetchTicket() {
      try {
        const ticket = await getTicketByIdentifier(ticketId);
        if (ticket) {
          setTicketDbId(ticket.id);
          setTicketName(ticket.ticket_name);
          setParticipants(ticket.people || []);
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

  // Check if user is near the bottom of the scroll container
  const checkIfNearBottom = () => {
    if (!messagesContainerRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const threshold = 150; // pixels from bottom
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  // Scroll to bottom helper
  const scrollToBottom = (force = false) => {
    if (!messagesContainerRef.current) return;
    
    // Only scroll if user is near bottom or if forced (initial load, user sent message)
    if (force || isNearBottom) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          setIsNearBottom(true);
        }
      }, 50);
    }
  };

  // Handle scroll events to detect if user scrolled up
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      isUserScrollingRef.current = true;
      setIsNearBottom(checkIfNearBottom());
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Reset user scrolling flag after scroll ends
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isNearBottom]);

  // Check if content is shorter than container and adjust layout
  useEffect(() => {
    if (loading) return;
    
    const checkContentHeight = () => {
      if (!messagesContainerRef.current) return;
      const container = messagesContainerRef.current;
      const { scrollHeight, clientHeight } = container;
      // If content is shorter than container, add spacer to push to bottom
      // Otherwise, remove spacer to allow normal scrolling
      // Add a small buffer (10px) to account for rounding
      const needsSpacer = scrollHeight < clientHeight + 10;
      const previousNeedsSpacer = shouldJustifyEnd;
      setShouldJustifyEnd(needsSpacer);
      
      // If we just added the spacer, scroll to top (which shows bottom content due to spacer)
      if (needsSpacer && !previousNeedsSpacer) {
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = 0;
          }
        }, 50);
      }
    };
    
    // Check after DOM updates
    const timeoutId = setTimeout(checkContentHeight, 200);
    
    // Also check on window resize
    window.addEventListener('resize', checkContentHeight);
    
    // Use ResizeObserver to detect when content size changes
    let resizeObserver: ResizeObserver | null = null;
    if (messagesContainerRef.current) {
      resizeObserver = new ResizeObserver(checkContentHeight);
      resizeObserver.observe(messagesContainerRef.current);
    }
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkContentHeight);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [dbMessages, loading, shouldJustifyEnd]);

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (loading || !messagesContainerRef.current) return;
    
    const messageCount = dbMessages.length;
    const previousCount = previousMessageCountRef.current;
    
    // Always scroll on initial load or when switching tickets
    if (messageCount > 0 && previousCount === 0) {
      scrollToBottom(true);
    }
    // Only auto-scroll if user is near bottom and not actively scrolling
    else if (messageCount > previousCount && !isUserScrollingRef.current) {
      scrollToBottom(false);
    }
    
    previousMessageCountRef.current = messageCount;
  }, [dbMessages, loading, isNearBottom]);

  // Initial scroll to bottom on mount or ticket change
  useEffect(() => {
    if (!loading && dbMessages.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        scrollToBottom(true);
        // Also check if we need spacer after scrolling
        if (messagesContainerRef.current) {
          const { scrollHeight, clientHeight } = messagesContainerRef.current;
          setShouldJustifyEnd(scrollHeight < clientHeight + 10);
        }
      }, 100);
    }
  }, [ticketId]); // Reset when ticket changes

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

      // Always scroll to bottom when user sends a message
      scrollToBottom(true);
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
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto flex flex-col"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="max-w-none flex flex-col min-h-full">
          {/* Spacer to push content to bottom when content is short */}
          {shouldJustifyEnd && <div className="flex-1 min-h-0" />}
          {/* Messages list */}
          {loading && dbMessages.length === 0 ? (
            <LoadingState />
          ) : dbMessages.length > 0 ? (
            <div className="flex flex-col">
              {dbMessages.map((message, index) => {
                const formattedTimestamp = formatTimestamp(message.timestamp);
                const previousMessage = index > 0 ? dbMessages[index - 1] : null;
                
                // Calculate consecutive message count and determine if we should show avatar
                let showAvatar = true;
                if (message.message_type === 'human') {
                  const isConsecutiveHumanMessage = 
                    previousMessage?.message_type === 'human' &&
                    previousMessage?.user_or_agent === message.user_or_agent;
                  
                  if (isConsecutiveHumanMessage) {
                    // Count consecutive messages from the same user
                    let consecutiveCount = 1;
                    for (let i = index - 1; i >= 0; i--) {
                      const prevMsg = dbMessages[i];
                      if (
                        prevMsg.message_type === 'human' &&
                        prevMsg.user_or_agent === message.user_or_agent
                      ) {
                        consecutiveCount++;
                      } else {
                        break;
                      }
                    }
                    
                    // Show avatar on first message (count = 1) and every 5th message after (6th, 11th, 16th, etc.)
                    // So show when count is 1, 6, 11, 16, 21... which is when (count - 1) % 5 === 0
                    showAvatar = (consecutiveCount - 1) % 5 === 0;
                  }
                }

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
                      showAvatar={showAvatar}
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
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : null}

          {/* Ticket info and participants section - shown at bottom when no messages */}
          {!loading && dbMessages.length === 0 && (
            <div className="py-8 px-6">
              <div className="max-w-2xl mx-auto">
                {/* Ticket Information */}
                <div className="mb-8 pb-6 border-b border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Hash className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-gray-900 mb-1">
                        {ticketName || ticketId}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Ticket {ticketId}
                      </p>
                      {repositoryName && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Github className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{repositoryName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Participants Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-gray-400" />
                    <h3 className="text-base font-semibold text-gray-900">
                      {participants.length > 0 ? `People in this conversation (${participants.length})` : 'No participants yet'}
                    </h3>
                  </div>
                  {participants.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {participants.map((person, index) => (
                        <div
                          key={index}
                          className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-xs font-semibold">
                              {getUserInitials(person)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-gray-700 text-center">{person}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">
                        This is the very beginning of your conversation.
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Add participants and start the conversation.
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-6 text-center">
                    {participants.length > 0 
                      ? 'Start the conversation by sending a message below.'
                      : 'Send a message to get started.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Bar - Liquid Glass */}
      <div 
        className="px-4 pb-4 pt-2"
        style={{
          background: 'linear-gradient(to top, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        <div 
          className="rounded-lg overflow-hidden focus-within:shadow-lg transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(10px) saturate(180%)',
            WebkitBackdropFilter: 'blur(10px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Write a comment..."
            className="w-full px-3 py-2.5 text-sm outline-none text-gray-900 placeholder-gray-500"
            style={{
              background: 'transparent',
            }}
          />
          <div 
            className="flex items-center justify-between px-2 pb-2"
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <div className="flex items-center gap-1">
              <button 
                className="p-1.5 rounded transition-all" 
                title="Attach files"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                <Paperclip className="w-4 h-4 text-gray-700" />
              </button>
              <button 
                className="p-1.5 rounded transition-all" 
                title="Add emoji"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                <Smile className="w-4 h-4 text-gray-700" />
              </button>
              <button 
                className="p-1.5 rounded transition-all" 
                title="Mention"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                <AtSign className="w-4 h-4 text-gray-700" />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || sending}
              className="p-2 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              style={{
                background: sending || !inputValue.trim() 
                  ? 'rgba(34, 197, 94, 0.5)' 
                  : 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.9) 100%)',
                backdropFilter: 'blur(10px) saturate(180%)',
                WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: !inputValue.trim() || sending
                  ? 'none'
                  : '0 4px 15px rgba(34, 197, 94, 0.4), 0 0 20px rgba(34, 197, 94, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
              }}
              onMouseEnter={(e) => {
                if (!sending && inputValue.trim()) {
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.6), 0 0 30px rgba(34, 197, 94, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (!sending && inputValue.trim()) {
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(34, 197, 94, 0.4), 0 0 20px rgba(34, 197, 94, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
              title={sending ? 'Sending...' : 'Send'}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
