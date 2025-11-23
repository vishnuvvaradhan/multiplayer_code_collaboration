import { Hash, ChevronDown, Users, Pin, Search, Info, Github } from 'lucide-react';
import { getAllTickets } from '@/lib/database';
import { HumanMessage } from './messages/HumanMessage';
import { AgentMessage } from './messages/AgentMessage';
import { SystemMessage } from './messages/SystemMessage';
import { ArchitectPlanCard } from './messages/ArchitectPlanCard';
import { DiffGeneratedCard } from './messages/DiffGeneratedCard';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';
import { AIPromptBox } from './AIPromptBox';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { createMessage, formatTimestamp, getUserInitials, getUserColor } from '@/lib/database';
import { getCurrentUserName, Message } from '@/lib/supabase';
import { getTicketByIdentifier } from '@/lib/database';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { executeCommand, getTicketContext } from '@/lib/backend-api';

interface ChatPanelProps {
  ticketId: string;
  onToggleRightPanel: () => void;
  isRightPanelOpen: boolean;
  repositoryUrl?: string;
  repositoryName?: string;
  onSelectTicket?: (ticketId: string) => void;
}

export function ChatPanel({ ticketId, onToggleRightPanel, isRightPanelOpen, repositoryUrl, repositoryName, onSelectTicket }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [ticketDbId, setTicketDbId] = useState<string | null>(null);
  const [ticketName, setTicketName] = useState<string>('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isTicketDropdownOpen, setIsTicketDropdownOpen] = useState(false);
  const [availableTickets, setAvailableTickets] = useState<Array<{ id: string; identifier: string; name: string }>>([]);
  const [shouldJustifyEnd, setShouldJustifyEnd] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUser = getCurrentUserName();
  const processedCommandsRef = useRef<Set<string>>(new Set());

  // Fetch all tickets for dropdown
  useEffect(() => {
    async function fetchAllTickets() {
      try {
        const allTickets = await getAllTickets();
        setAvailableTickets(allTickets.map(t => ({
          id: t.id,
          identifier: t.ticket_identifier,
          name: t.ticket_name,
        })));
      } catch (error) {
        console.error('Error fetching tickets:', error);
      }
    }
    fetchAllTickets();
  }, []);

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

  // Process commands from new messages (from teammates)
  const processCommandFromMessage = useCallback(async (message: Message) => {
    // Skip if already processed
    if (processedCommandsRef.current.has(message.id)) {
      return;
    }

    // Skip if it's from the current user (they already triggered it)
    if (message.user_or_agent === currentUser) {
      processedCommandsRef.current.add(message.id);
      return;
    }

    // Skip if not a human message
    if (message.message_type !== 'human') {
      return;
    }

    // Check if message contains a command
    const content = message.content?.trim() || '';

    // Detect command anywhere in the message
    const commandInfo = detectCommand(content);
    const commandType = commandInfo.type;
    const commandMessage = commandInfo.message;

    if (!commandType) {
      return; // No command detected
    }

    // Mark as processed
    processedCommandsRef.current.add(message.id);

    // Process the command
    try {
      console.log(`🤖 Processing @${commandType} command from teammate:`, message.user_or_agent);
      
      if (!ticketDbId) {
        console.error('No ticket ID available for command processing');
        return;
      }

      // Get ticket context
      const context = await getTicketContext(ticketId);
      
      // Create command-specific prompt
      let prompt = '';
      let agentName = 'AI Assistant';
      let thinkingMessage = 'Thinking...';
      
      if (commandType === 'chat') {
        if (!commandMessage) {
          console.warn('Empty @chat command, skipping');
          return;
        }
        
        prompt = `${context}

---

# USER QUESTION

${commandMessage}

---

# INSTRUCTIONS

You are a helpful coding assistant in a collaborative ticket chat.
Provide a QUICK and SHORT response (2-3 sentences max) to answer the user's question.
Be concise, actionable, and specific to the ticket context above.
Do NOT make any code changes - just provide guidance.`;
        
        agentName = 'AI Assistant';
        thinkingMessage = 'Thinking...';
      } else if (commandType === 'make_plan') {
        prompt = commandMessage || 'Create a plan for this ticket';
        agentName = 'Architect';
        thinkingMessage = 'Creating Plan...';
      } else if (commandType === 'dev') {
        prompt = commandMessage || 'Implement the plan';
        agentName = 'Developer';
        thinkingMessage = 'Generating Code';
      }

      // Map commandType to agent type
      const agentType: 'architect' | 'dev' | undefined = 
        commandType === 'make_plan' ? 'architect' :
        commandType === 'dev' ? 'dev' :
        commandType === 'chat' ? 'dev' :
        undefined;

      // Create a temporary "thinking" message
      await createMessage({
        ticket_id: ticketDbId,
        user_or_agent: agentName,
        message_type: 'agent',
        content: thinkingMessage,
        metadata: {
          agent: agentType,
          streaming: true,
        },
      });

      // Stream the response
      let fullResponse = '';
      try {
        for await (const chunk of executeCommand(ticketId, commandType, prompt)) {
          fullResponse += chunk;
        }

        // Clean up the response by removing any remaining SSE formatting artifacts
        let cleanResponse = fullResponse
          .split('\n')
          .map(line => {
            // Remove "data:" prefix if it exists at the start of the line
            let cleaned = line.trim();
            if (cleaned.startsWith('data:')) {
              cleaned = cleaned.substring(5).trim();
            }
            return cleaned;
          })
          .filter(line => line && line !== '__END__' && line !== 'END') // Remove empty lines and markers
          .join('\n')
          .trim();

        // For plan responses, also handle special architect-plan message type
        if (commandType === 'make_plan') {
          await createMessage({
            ticket_id: ticketDbId,
            user_or_agent: 'Architect',
            message_type: 'architect-plan',
            content: cleanResponse,
          });
        } else {
          // Save the final response for chat/dev
          await createMessage({
            ticket_id: ticketDbId,
            user_or_agent: agentName,
            message_type: 'agent',
            content: cleanResponse || 'No response received.',
            metadata: {
              agent: commandType === 'dev' ? 'dev' : undefined,
            },
          });
        }

        console.log(`✅ @${commandType} command processed successfully`);
        toast.success(`@${commandType} command completed`);
      } catch (error) {
        console.error(`Error streaming @${commandType} response:`, error);
        await createMessage({
          ticket_id: ticketDbId,
          user_or_agent: 'System',
          message_type: 'system',
          content: `⚠️ Failed to process @${commandType} command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        toast.error(`Failed to process @${commandType} command`);
      }
    } catch (error) {
      console.error('Error processing command from message:', error);
      toast.error('Failed to process command');
    }
  }, [ticketId, ticketDbId, currentUser]);

  // Use the messages hook for polling
  const { messages: dbMessages, loading, error } = useMessages({
    ticketId: ticketDbId,
    enabled: !!ticketDbId,
    onNewMessage: processCommandFromMessage,
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isTicketDropdownOpen && !target.closest('.ticket-dropdown-container')) {
        setIsTicketDropdownOpen(false);
      }
    };

    if (isTicketDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isTicketDropdownOpen]);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error('Failed to load messages', {
        description: error,
      });
    }
  }, [error]);

  // Helper function to detect commands anywhere in the message
  const detectCommand = (content: string): { type: 'chat' | 'make_plan' | 'dev' | null; message: string; fullCommand: string } => {
    // Look for @commands anywhere in the message using regex
    const chatMatch = content.match(/@chat\s+(.+)/);
    const planMatch = content.match(/@make_plan\s+(.+)/);
    const devMatch = content.match(/@dev\s+(.+)/);

    if (chatMatch) {
      return { type: 'chat', message: chatMatch[1].trim(), fullCommand: '@chat' };
    } else if (planMatch) {
      return { type: 'make_plan', message: planMatch[1].trim(), fullCommand: '@make_plan' };
    } else if (devMatch) {
      return { type: 'dev', message: devMatch[1].trim(), fullCommand: '@dev' };
    }

    // Also check for commands at the start (for backward compatibility)
    if (content.startsWith('@chat')) {
      return { type: 'chat', message: content.slice(5).trim(), fullCommand: '@chat' };
    } else if (content.startsWith('@make_plan')) {
      return { type: 'make_plan', message: content.slice(10).trim(), fullCommand: '@make_plan' };
    } else if (content.startsWith('@dev')) {
      return { type: 'dev', message: content.slice(4).trim(), fullCommand: '@dev' };
    }

    return { type: null, message: content, fullCommand: '' };
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !ticketDbId || sending) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    setSending(true);

    try {
      // Detect command anywhere in the message
      const commandInfo = detectCommand(messageContent);
      const isCommand = commandInfo.type !== null;

      // Save the user's message
      await createMessage({
        ticket_id: ticketDbId,
        user_or_agent: currentUser,
        message_type: 'human',
        content: messageContent,
        metadata: {
          avatar: getUserInitials(currentUser),
          isCommand: isCommand,
        },
      });

      // Always scroll to bottom when user sends a message
      scrollToBottom(true);

      // If it's a command, process it
      if (isCommand) {
        const { type: commandType, message: commandMessage } = commandInfo;

        if (!commandMessage && commandType === 'chat') {
          toast.error('Please provide a message after @chat');
          return;
        }

        // Get ticket context
        const context = await getTicketContext(ticketId);

        // Create command-specific prompt
        let prompt = '';
        let agentName = 'AI Assistant';
        let thinkingMessage = '💭 Thinking...';
        let agent: 'architect' | 'dev' | undefined = undefined;

        if (commandType === 'chat') {
          prompt = `${context}

---

# USER QUESTION

${commandMessage}

---

# INSTRUCTIONS

You are a helpful coding assistant in a collaborative ticket chat.
Provide a QUICK and SHORT response (2-3 sentences max) to answer the user's question.
Be concise, actionable, and specific to the ticket context above.
Do NOT make any code changes - just provide guidance.`;

          agentName = 'AI Assistant';
          thinkingMessage = '💭 Thinking...';
        } else if (commandType === 'make_plan') {
          prompt = commandMessage || 'Create a plan for this ticket';
          agentName = 'Architect';
          thinkingMessage = '🏗️ Creating plan...';
          agent = 'architect';
        } else if (commandType === 'dev') {
          prompt = commandMessage || 'Implement the plan';
          agentName = 'Developer';
          thinkingMessage = '⚙️ Working on it...';
          agent = 'dev';
        }

        // Create a temporary "thinking" message
        await createMessage({
          ticket_id: ticketDbId,
          user_or_agent: agentName,
          message_type: 'agent',
          content: 'Thinking...',
          metadata: {
            agent: 'dev',
          content: thinkingMessage,
          metadata: {
            agent: agent,
            streaming: true,
          },
        });

        // Stream the response
        let fullResponse = '';
        try {
          for await (const chunk of executeCommand(ticketId, commandType!, prompt)) {
            fullResponse += chunk;
          }

          // Handle different response types
          if (commandType === 'make_plan') {
            // Save plan to database
            await createMessage({
              ticket_id: ticketDbId,
              user_or_agent: 'Architect',
              message_type: 'architect-plan',
              content: fullResponse,
              metadata: {
                agent: 'architect',
              },
            });
          } else if (commandType === 'dev') {
            // Save dev response to database
            await createMessage({
              ticket_id: ticketDbId,
              user_or_agent: 'Developer',
              message_type: 'agent',
              content: fullResponse || 'Implementation completed.',
              metadata: {
                agent: 'dev',
              },
            });
          } else {
            // Save chat response
            await createMessage({
              ticket_id: ticketDbId,
              user_or_agent: 'AI Assistant',
              message_type: 'agent',
              content: fullResponse || 'No response received.',
              metadata: {
                agent: undefined,
              },
            });
          }

          if (commandType === 'chat') {
            toast.success('Response received');
          } else if (commandType === 'make_plan') {
            toast.success('Plan generated successfully!');
          } else if (commandType === 'dev') {
            toast.success('Implementation completed!');
          }
        } catch (error) {
          console.error(`Error streaming @${commandType} response:`, error);
          const errorMessage = `⚠️ Failed to process @${commandType} command: ${error instanceof Error ? error.message : 'Unknown error'}`;
          await createMessage({
            ticket_id: ticketDbId,
            user_or_agent: 'System',
            message_type: 'system',
            content: errorMessage,
          });
          toast.error(`Failed to process @${commandType} command`);
        }
      }
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
    <div className="flex-1 flex flex-col bg-gray-50 h-full">
      {/* Header */}
      <div className="h-16 border-b border-gray-200/80 flex items-center justify-between px-6 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-3 relative ticket-dropdown-container">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <Hash className="w-4 h-4 text-gray-600" />
          </div>
          <h1 className="text-gray-900 font-semibold text-base">{ticketName || ticketId}</h1>
          <button
            onClick={() => setIsTicketDropdownOpen(!isTicketDropdownOpen)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105"
          >
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isTicketDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Ticket Dropdown */}
          {isTicketDropdownOpen && (
            <div 
              className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto dropdown-enter"
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div className="p-2">
                {availableTickets.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">No tickets available</div>
                ) : (
                  availableTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => {
                        if (onSelectTicket) {
                          onSelectTicket(ticket.identifier);
                        }
                        setIsTicketDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        ticket.identifier === ticketId
                          ? 'bg-blue-50 text-blue-900 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">{ticket.name || ticket.identifier}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
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
        className="flex-1 overflow-y-auto flex flex-col bg-gray-50"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="max-w-4xl mx-auto w-full flex flex-col min-h-full px-4 py-6">
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
              // Determine agent type from metadata or author name
              let agentType: 'architect' | 'dev' = 'dev';
              if (message.metadata?.agent === 'architect') {
                agentType = 'architect';
              } else if (message.user_or_agent.toLowerCase().includes('architect')) {
                agentType = 'architect';
              }
              
              return (
                <AgentMessage
                          key={message.id}
                  content={message.content || ''}
                          agent={agentType}
                          author={message.user_or_agent}
                          timestamp={formattedTimestamp}
                          metadata={message.metadata || undefined}
                />
              );
            }

                if (message.message_type === 'architect-plan') {
                  return <ArchitectPlanCard key={message.id} timestamp={formattedTimestamp} content={message.content || undefined} />;
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
                    <div className="w-10 h-10 rounded-lg bg-slate-500 flex items-center justify-center shrink-0">
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
                            {(() => {
                              const personColor = getUserColor(person);
                              return (
                                <AvatarFallback className={`${personColor.bg} ${personColor.text} text-xs font-medium border border-gray-200`}>
                                  {getUserInitials(person)}
                                </AvatarFallback>
                              );
                            })()}
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

      {/* AI Prompt Box */}
      <div 
        className="pt-4 pb-4 border-t border-gray-200/80 bg-white/80 backdrop-blur-xl"
      >
        <AIPromptBox
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          sending={sending}
          placeholder="Write a message..."
          participants={participants}
          onAttachFile={(file) => {
            toast.info(`File attached: ${file.name}`);
            // TODO: Implement file upload logic
          }}
          onMention={(userId) => {
            toast.info(`Mentioned: ${userId}`);
          }}
          onSearch={() => {
            // TODO: Implement search functionality
            toast.info('Search functionality coming soon');
          }}
          maxLength={2000}
        />
      </div>
    </div>
  );
}
