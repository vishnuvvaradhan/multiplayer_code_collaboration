import { useState, useEffect } from 'react';
import { X, Check, FileCode, GitPullRequest, Clock, Settings, Hash, Users, Github, Calendar, Tag, Loader2, FileText } from 'lucide-react';
import { DiffView } from './DiffView';
import { PRView } from './PRView';
import { getUserColor, getUserInitials, getTicketByIdentifier, deleteTicket, getAllTickets, getMessagesByTicketId, createMessage } from '@/lib/database';
import { Ticket, getCurrentUserName } from '@/lib/supabase';
import { HoldToDeleteButton } from './HoldToDeleteButton';
import { toast } from 'sonner';
import { executeCommand, getTicketContext } from '@/lib/backend-api';
import { Button } from './ui/button';
import { Recycle } from 'lucide-react';
import { getAuthorizedUserNames } from '@/lib/authorized-users';

interface RightPanelProps {
  ticketId: string;
  onClose: () => void;
  onTicketDeleted?: () => void;
}

type Tab = 'plan' | 'changes' | 'pr' | 'settings';

export function RightPanel({ ticketId, onClose, onTicketDeleted }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('plan');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ticketId) {
      setLoading(true);
      getTicketByIdentifier(ticketId)
        .then((data) => {
          setTicket(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching ticket:', error);
          setLoading(false);
        });
    } else {
      setTicket(null);
      setLoading(false);
    }
  }, [ticketId]);

  const handleDelete = async () => {
    if (!ticket) return;

    try {
      await deleteTicket(ticket.id);
      toast.success('Ticket deleted successfully');
      if (onTicketDeleted) {
        onTicketDeleted();
      }
      onClose();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error('Failed to delete ticket', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };
  const [planExists, setPlanExists] = useState(false);
  const [prExists, setPrExists] = useState(false);
  const [prLink, setPrLink] = useState<string | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  const [ticketDbId, setTicketDbId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);

  // Check if plan and PR exist
  useEffect(() => {
    async function checkExistence() {
      try {
        const ticket = await getTicketByIdentifier(ticketId);
        if (!ticket) return;

        setTicketDbId(ticket.id);

        const messages = await getMessagesByTicketId(ticket.id);

        // Check if plan exists (look for architect-plan message or plan content)
        const hasPlan = messages.some(m => 
          m.message_type === 'architect-plan' || 
          (m.message_type === 'agent' && m.metadata?.agent === 'plan')
        );
        setPlanExists(hasPlan);

        // Check if PR exists (look for PR message or PR link)
        const prMessage = messages.find(m => 
          m.message_type === 'agent' && m.metadata?.agent === 'dev' && m.metadata?.prLink
        );
        if (prMessage) {
          setPrExists(true);
          setPrLink(prMessage.metadata?.prLink);
        }

        // Derive real participants from ticket.people and human chat messages
        const humanParticipants = messages
          .filter((m) => m.message_type === 'human' && m.user_or_agent)
          .map((m) => m.user_or_agent);

        const ticketPeople = Array.isArray(ticket.people) ? ticket.people : [];
        const combined = [...ticketPeople, ...humanParticipants];
        const uniqueParticipants = Array.from(new Set(combined));
        setParticipants(uniqueParticipants);
      } catch (error) {
        console.error('Error checking plan/PR existence:', error);
      }
    }
    
    checkExistence();
  }, [ticketId]);

  return (
    <div className="w-96 border-l border-amber-800/20 flex flex-col shadow-lg" style={{ backgroundColor: '#F5F1EB' }}>
      {/* Header */}
      <div className="h-14 border-b border-amber-800/20 flex items-center justify-between px-4" style={{ backgroundColor: '#F5F1EB' }}>
        <h2 className="text-gray-900">Details</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-md hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-amber-800/20 px-4" style={{ backgroundColor: '#F5F1EB' }}>
        <div className="flex gap-4">
          {[
            { id: 'plan', label: 'Plan' },
            { id: 'changes', label: 'Changes' },
            { id: 'pr', label: 'PR' },
            { id: 'settings', label: 'Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`py-3 px-1 relative transition-colors text-sm ${
                activeTab === tab.id
                  ? 'text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#F5F1EB' }}>
        {activeTab === 'plan' && (
          <PlanTab 
            ticketId={ticketId}
            ticketDbId={ticketDbId}
            ticket={ticket}
            planExists={planExists}
            generating={generating}
            participants={participants}
          />
        )}
        {activeTab === 'changes' && (
          <DiffView
            ticketId={ticketId}
            prLink={prLink}
          />
        )}
        {activeTab === 'pr' && (
          <PRView 
            ticketId={ticketId}
            ticketDbId={ticketDbId}
            planExists={planExists}
            prExists={prExists}
            generating={generating}
            prLink={prLink}
            repoUrl={ticket?.github_url || null}
            onGeneratePR={async () => {
              if (!ticketDbId) {
                toast.error('Ticket not found');
                return;
              }
              
              if (!planExists) {
                toast.error('Please generate a plan first');
                return;
              }
              
              setGenerating(true);
              try {
                // Create system message
                await createMessage({
                  ticket_id: ticketDbId,
                  user_or_agent: 'System',
                  message_type: 'system',
                  content: '🚀 Generating PR and implementing changes...',
                });
                
                // Stream the PR generation
                let fullOutput = '';
                for await (const chunk of executeCommand(ticketId, 'dev')) {
                  fullOutput += chunk;
                }
                
                // Extract PR link from output (look for special marker or URL pattern)
                let prLink = null;
                const markerMatch = fullOutput.match(/_PR_URL_(https:\/\/github\.com\/[^\s]+)_END_/);
                if (markerMatch) {
                  prLink = markerMatch[1];
                } else {
                  // Fallback to generic URL pattern
                  const prLinkMatch = fullOutput.match(/https:\/\/github\.com\/[^\s]+\/pull\/\d+/);
                  prLink = prLinkMatch ? prLinkMatch[0] : null;
                }
                
                // Save PR info to database
                await createMessage({
                  ticket_id: ticketDbId,
                  user_or_agent: 'Developer',
                  message_type: 'agent',
                  content: prLink 
                    ? `✅ Implementation complete!\n\nPull Request: ${prLink}\n\n${fullOutput}`
                    : `✅ Implementation complete!\n\n${fullOutput}`,
                  metadata: {
                    agent: 'dev',
                    prLink: prLink || undefined,
                  },
                });
                
                if (prLink) {
                  setPrLink(prLink);
                  setPrExists(true);
                }
                
                toast.success(prLink ? 'PR generated successfully!' : 'Changes applied successfully!', {
                  description: prLink ? 'Click to view PR' : 'Changes committed to branch',
                  action: prLink ? {
                    label: 'View PR',
                    onClick: () => window.open(prLink, '_blank'),
                  } : undefined,
                });
              } catch (error) {
                console.error('Error generating PR:', error);
                toast.error('Failed to generate PR', {
                  description: error instanceof Error ? error.message : 'Please try again',
                });
              } finally {
                setGenerating(false);
              }
            }}
          />
        )}
        {activeTab === 'settings' && <SettingsTab ticket={ticket} loading={loading} onDelete={handleDelete} />}
      </div>
    </div>
  );
}

interface PlanTabProps {
  ticketId: string;
  ticketDbId: string | null;
  ticket: Ticket | null;
  planExists: boolean;
  generating: boolean;
  participants: string[];
}

function PlanTab({ ticketId, ticketDbId, ticket, planExists, generating, participants }: PlanTabProps) {
  const showPlanActions = false;
  const currentUserName = getCurrentUserName();

  // Approval and redo state
  const [showRedoInput, setShowRedoInput] = useState<{[key: string]: boolean}>({});
  const [redoMessage, setRedoMessage] = useState('');
  const [approvals, setApprovals] = useState<{[key: string]: {approved: boolean, approver: string}}>({});

  // Get authorized users for approval tracking
  const authorizedUsers = getAuthorizedUserNames();

  // Load existing approvals from messages
  useEffect(() => {
    if (ticketDbId) {
      loadApprovals();
    }
  }, [ticketDbId]);

  const loadApprovals = async () => {
    if (!ticketDbId) return;

    try {
      const messages = await getMessagesByTicketId(ticketDbId);
      const approvalMap: {[key: string]: {approved: boolean, approver: string}} = {};

      messages.forEach(message => {
        if (message.message_type === 'system' && message.content) {
          // Check for plan approval messages
          const planMatch = message.content.match(/^(.+) approved the plan$/);
          if (planMatch) {
            const approver = planMatch[1];
            approvalMap[`plan-${approver}`] = { approved: true, approver };
          }

          // Check for PR approval messages
          const prMatch = message.content.match(/^(.+) approved the PR$/);
          if (prMatch) {
            const approver = prMatch[1];
            approvalMap[`pr-${approver}`] = { approved: true, approver };
          }
        }
      });

      setApprovals(approvalMap);

      // Check if all users approved plan and trigger dev prompt if needed
      checkAllApproved(messages);
    } catch (error) {
      console.error('Error loading approvals:', error);
    }
  };

  const checkAllApproved = async (messages: any[]) => {
    if (!ticketDbId || !planExists) return;

    const planApprovals = messages.filter(msg =>
      msg.message_type === 'system' &&
      msg.content?.includes('approved the plan')
    );

    const uniqueApprovers = new Set(
      planApprovals.map(msg => {
        const match = msg.content?.match(/^(.+) approved the plan$/);
        return match ? match[1] : null;
      }).filter(Boolean)
    );

    // If all authorized users have approved and we haven't sent the dev prompt yet
    if (uniqueApprovers.size === authorizedUsers.length) {
      const existingPrompt = messages.find(msg =>
        msg.message_type === 'agent' &&
        msg.content?.includes('@dev')
      );

      if (!existingPrompt) {
        try {
          await createMessage({
            ticket_id: ticketDbId,
            user_or_agent: 'Agent',
            message_type: 'agent',
            content: 'All team members have approved the plan! Write `@dev` to start implementing the changes and create a PR.',
            metadata: {
              workflow: 'plan_approved',
              prompt: 'dev_command'
            }
          });
        } catch (error) {
          console.error('Error sending dev prompt:', error);
        }
      }
    }
  };

  const handleApproval = async (type: 'plan' | 'pr', approver: string) => {
    if (!ticketDbId) return;

    try {
      await createMessage({
        ticket_id: ticketDbId,
        user_or_agent: 'System',
        message_type: 'system',
        content: `${approver} approved the ${type}`,
        metadata: {
          approval: {
            type: type,
            user: approver,
            action: 'approved'
          }
        }
      });

      toast.success(`${type === 'plan' ? 'Plan' : 'PR'} approved!`);

      // Reload approvals to update UI
      await loadApprovals();
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handleRedoPlan = async (feedback: string, approver: string) => {
    if (!ticketDbId || !feedback.trim()) return;

    const trimmed = feedback.trim();

    try {
      // 1) Send the visible @make_plan command as a human message
      await createMessage({
        ticket_id: ticketDbId,
        user_or_agent: approver,
        message_type: 'human',
        content: `@make_plan ${trimmed}`,
      });

      // 2) Immediately log the feedback as a system message so it shows in chat
      await createMessage({
        ticket_id: ticketDbId,
        user_or_agent: 'System',
        message_type: 'system',
        content: `${approver} requested plan changes: "${trimmed}"`,
        metadata: {
          approval: {
            type: 'plan',
            user: approver,
            action: 'feedback',
          },
        },
      });

      // 3) Then run the @make_plan flow and create a new architect-plan message
      let fullResponse = '';
      try {
        const prompt = trimmed || 'Create a plan for this ticket';

        for await (const chunk of executeCommand(ticketId, 'make_plan', prompt)) {
          fullResponse += chunk;
        }

        const cleanResponse = fullResponse.trim() || 'No response received.';

        await createMessage({
          ticket_id: ticketDbId,
          user_or_agent: 'Architect',
          message_type: 'architect-plan',
          content: cleanResponse,
          metadata: {
            agent: 'architect',
          },
        });
      } catch (err) {
        console.error('Error streaming @make_plan response from feedback:', err);
        await createMessage({
            ticket_id: ticketDbId,
            user_or_agent: 'System',
            message_type: 'system',
            content: `⚠️ Failed to process @make_plan feedback: ${
              err instanceof Error ? err.message : 'Unknown error'
            }`,
          });
        toast.error('Failed to process @make_plan feedback');
      }

      setRedoMessage('');
      setShowRedoInput((prev) => ({ ...prev, [approver]: false }));

      toast.success('Feedback sent! Plan will be regenerated.');
    } catch (error) {
      console.error('Error handling redo plan:', error);
      toast.error('Failed to send feedback');
    }
  };

  const ticketIdentifier = ticket?.ticket_identifier || ticketId;
  const ticketName = ticket?.ticket_name || 'Ticket Details';
  const ticketDescription = ticket?.description || 'No description provided for this ticket yet.';
  const ticketPriority = ticket?.priority ?? null;
  const ticketRepo = ticket?.github_url || null;

  // Build a stable list of participants with the current user first (if present)
  const uniqueParticipants = Array.from(new Set(participants));
  const sortedParticipants = uniqueParticipants.sort((a, b) => {
    if (a === currentUserName) return -1;
    if (b === currentUserName) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="p-4 space-y-4">
      {/* Action Button */}
      {showPlanActions && (
        <Button
          onClick={() => {}}
          disabled={generating || !ticketDbId}
          className="w-full"
          variant={planExists ? "outline" : "default"}
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {planExists ? 'Updating Plan...' : 'Creating Plan...'}
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              {planExists ? 'Update Plan' : 'Create Plan'}
            </>
          )}
        </Button>
      )}
      {/* PRD Card */}
      <div className="bg-white border border-gray-300 rounded-md p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200">
          <div>
            <h3 className="text-gray-900 mb-1">{ticketName}</h3>
            <p className="text-xs text-gray-600">
              Ticket · {ticketIdentifier}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-xs text-gray-700 mb-2 uppercase tracking-wide">Summary</h4>
            <p className="text-sm text-gray-800">
              {ticketDescription}
            </p>
          </div>

          <div>
            <h4 className="text-xs text-gray-700 mb-2 uppercase tracking-wide">Details</h4>
            <ul className="space-y-1.5 text-sm text-gray-800">
              {ticketPriority !== null && (
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1.5"></div>
                  <span>
                    <span className="font-medium">Priority:</span>{' '}
                    <span>{ticketPriority}</span>
                  </span>
                </li>
              )}
              {ticketRepo && (
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1.5"></div>
                  <span className="flex-1 min-w-0">
                    <span className="font-medium">Repository:</span>{' '}
                    <a
                      href={ticketRepo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {ticketRepo}
                    </a>
                  </span>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-xs text-gray-700 mb-2 uppercase tracking-wide">People Involved</h4>
            {sortedParticipants.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {sortedParticipants.map((person) => {
                  const color = getUserColor(person);
                  return (
                    <div
                      key={person}
                      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-gray-200 bg-gray-50"
                    >
                      <div
                        className={`w-7 h-7 rounded-full ${color.bg} ${color.text} flex items-center justify-center border border-gray-300 shadow-sm`}
                      >
                        <span className="text-xs font-medium">
                          {getUserInitials(person)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-800 font-medium">
                        {person}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                No participants attached to this ticket yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Plan Approval Section */}
      <div className="bg-white border border-gray-300 rounded-md p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs text-gray-700 uppercase tracking-wide">Plan Approval</h4>
          {planExists && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
              Plan Generated
            </span>
          )}
        </div>

        {authorizedUsers.length === 0 ? (
          <p className="text-sm text-gray-600">
            No authorized users configured.
          </p>
        ) : (
          <div className="space-y-3">
            {authorizedUsers.map((person) => {
              const color = getUserColor(person);
              const isCurrentUser = person === currentUserName;
              const planApproval = approvals[`plan-${person}`];
              const hasApproved = planApproval?.approved;
              const canApprove = isCurrentUser && planExists && !hasApproved;

              return (
                <div key={`plan-${person}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className={`w-9 h-9 rounded-full ${color.bg} ${color.text} flex items-center justify-center border border-gray-300 shadow-sm`}
                        >
                          <span className="text-sm font-medium">
                            {getUserInitials(person)}
                          </span>
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                            hasApproved ? 'bg-green-600' : 'bg-gray-300'
                          }`}
                        >
                          {hasApproved ? (
                            <Check className="w-2.5 h-2.5 text-white" />
                          ) : (
                            <Clock className="w-2.5 h-2.5 text-gray-600" />
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-900">{person}</div>
                        <div className="text-xs text-gray-600">
                          {hasApproved ? 'Approved' : 'Pending'}
                        </div>
                      </div>
                    </div>

                    {/* Approval buttons for current user */}
                    {canApprove && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleApproval('plan', person)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white px-3"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => setShowRedoInput(prev => ({ ...prev, [person]: !prev[person] }))}
                          variant="outline"
                          size="sm"
                          className="text-gray-600 border-gray-300 hover:bg-gray-50"
                        >
                          <Recycle className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    {/* Status indicator for approved users */}
                    {hasApproved && (
                      <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                        <Check className="w-3 h-3" />
                        Approved
                      </div>
                    )}
                  </div>

                  {/* Redo Input Section */}
                  {showRedoInput[person] && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <textarea
                        value={redoMessage}
                        onChange={(e) => setRedoMessage(e.target.value)}
                        placeholder="What changes would you like to see in the plan?"
                        className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <Button
                          onClick={() => setShowRedoInput(prev => ({ ...prev, [person]: false }))}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleRedoPlan(redoMessage, person)}
                          disabled={!redoMessage.trim()}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Send Feedback
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface SettingsTabProps {
  ticket: Ticket | null;
  loading: boolean;
  onDelete: () => void;
}

function SettingsTab({ ticket, loading, onDelete }: SettingsTabProps) {
  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-4">
        <div className="bg-white border border-gray-300 rounded-md p-4 shadow-sm">
          <p className="text-sm text-gray-600">No ticket selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Ticket Information */}
      <div className="bg-white border border-gray-300 rounded-md p-4 shadow-sm">
        <h3 className="text-gray-900 font-semibold mb-4">Ticket Information</h3>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Hash className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-600 mb-1">Identifier</div>
              <div className="text-sm text-gray-900 font-medium">{ticket.ticket_identifier}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <FileCode className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-600 mb-1">Name</div>
              <div className="text-sm text-gray-900 font-medium">{ticket.ticket_name}</div>
            </div>
          </div>

          {ticket.description && (
            <div className="flex items-start gap-3">
              <FileCode className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-600 mb-1">Description</div>
                <div className="text-sm text-gray-900">{ticket.description}</div>
              </div>
            </div>
          )}

          {ticket.github_url && (
            <div className="flex items-start gap-3">
              <Github className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-600 mb-1">Repository</div>
                <a
                  href={ticket.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {ticket.github_url}
                </a>
              </div>
            </div>
          )}

          {ticket.priority !== null && (
            <div className="flex items-start gap-3">
              <Tag className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-600 mb-1">Priority</div>
                <div className="text-sm text-gray-900">{ticket.priority}</div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Users className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-600 mb-1">Participants</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {ticket.people.map((person, idx) => {
                  const personColor = getUserColor(person);
                  return (
                    <div
                      key={idx}
                      className={`w-7 h-7 rounded-full ${personColor.bg} ${personColor.text} flex items-center justify-center border border-gray-300 shadow-sm`}
                      title={person}
                    >
                      <span className="text-xs font-medium">{getUserInitials(person)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-600 mb-1">Created</div>
              <div className="text-sm text-gray-900">
                {new Date(ticket.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete */}
      <div className="bg-white border border-red-200 rounded-md p-4 shadow-sm">
        <h3 className="text-gray-900 font-semibold mb-2">Delete</h3>
        <p className="text-xs text-gray-600 mb-4">
          Deleting this ticket will permanently remove it and all associated messages. This action cannot be undone.
        </p>
        <HoldToDeleteButton onDelete={onDelete} label="Hold to Delete Ticket" />
      </div>
    </div>
  );
}