import { useState, useEffect } from 'react';
import { X, Check, FileCode, GitPullRequest, Clock, Settings, Hash, Users, Github, Calendar, Tag, Loader2, FileText } from 'lucide-react';
import { DiffView } from './DiffView';
import { PRView } from './PRView';
import { getUserColor, getUserInitials, getTicketByIdentifier, deleteTicket, getAllTickets, getMessagesByTicketId, createMessage } from '@/lib/database';
import { Ticket } from '@/lib/supabase';
import { HoldToDeleteButton } from './HoldToDeleteButton';
import { toast } from 'sonner';
import { executeCommand, getTicketContext } from '@/lib/backend-api';
import { Button } from './ui/button';

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
            planExists={planExists}
            generating={generating}
            onGeneratePlan={async () => {
              if (!ticketDbId) {
                toast.error('Ticket not found');
                return;
              }
              
              setGenerating(true);
              try {
                // Get context
                const context = await getTicketContext(ticketId);
                
                // Create system message
                await createMessage({
                  ticket_id: ticketDbId,
                  user_or_agent: 'System',
                  message_type: 'system',
                  content: planExists ? '🔄 Updating plan based on feedback...' : '📝 Generating implementation plan...',
                });
                
                // Stream the plan generation
                let fullPlan = '';
                for await (const chunk of executeCommand(ticketId, 'make_plan')) {
                  fullPlan += chunk;
                }
                
                // Save plan to database
                await createMessage({
                  ticket_id: ticketDbId,
                  user_or_agent: 'Architect',
                  message_type: 'agent',
                  content: fullPlan,
                  metadata: {
                    agent: 'architect',
                  },
                });
                
                setPlanExists(true);
                toast.success('Plan generated successfully!');
              } catch (error) {
                console.error('Error generating plan:', error);
                toast.error('Failed to generate plan', {
                  description: error instanceof Error ? error.message : 'Please try again',
                });
              } finally {
                setGenerating(false);
              }
            }}
          />
        )}
        {activeTab === 'changes' && <DiffView prLink={prLink} />}
        {activeTab === 'pr' && (
          <PRView 
            ticketId={ticketId}
            ticketDbId={ticketDbId}
            planExists={planExists}
            prExists={prExists}
            generating={generating}
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
  planExists: boolean;
  generating: boolean;
  onGeneratePlan: () => Promise<void>;
}

function PlanTab({ ticketId, ticketDbId, planExists, generating, onGeneratePlan }: PlanTabProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Action Button */}
      <Button
        onClick={onGeneratePlan}
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
      {/* PRD Card */}
      <div className="bg-white border border-gray-300 rounded-md p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200">
          <div>
            <h3 className="text-gray-900 mb-1">Payment Validation</h3>
            <p className="text-xs text-gray-600">PRD · REL-123</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-xs text-gray-700 mb-2 uppercase tracking-wide">Summary</h4>
            <p className="text-sm text-gray-800">
              Implement comprehensive payment method validation in the checkout flow with user-friendly error messaging.
            </p>
          </div>

          <div>
            <h4 className="text-xs text-gray-700 mb-2 uppercase tracking-wide">Requirements</h4>
            <ul className="space-y-1.5">
              <li className="text-sm text-gray-800 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1.5"></div>
                Real-time card number validation
              </li>
              <li className="text-sm text-gray-800 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1.5"></div>
                CVV and expiry date checks
              </li>
              <li className="text-sm text-gray-800 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1.5"></div>
                Clear error messages per field
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs text-gray-700 mb-2 uppercase tracking-wide">Acceptance Criteria</h4>
            <ul className="space-y-1.5">
              <li className="text-sm text-gray-800 flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                Invalid cards show inline errors
              </li>
              <li className="text-sm text-gray-800 flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                Error messages are specific and actionable
              </li>
              <li className="text-sm text-gray-800 flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                Validation works on blur and submit
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs text-gray-700 mb-2 uppercase tracking-wide">Files</h4>
            <div className="flex flex-wrap gap-2">
              <div className="px-2.5 py-1.5 bg-blue-50 rounded-md text-xs text-blue-700 flex items-center gap-1.5 border border-blue-200">
                <FileCode className="w-3.5 h-3.5" />
                PaymentForm.tsx
              </div>
              <div className="px-2.5 py-1.5 bg-blue-50 rounded-md text-xs text-blue-700 flex items-center gap-1.5 border border-blue-200">
                <FileCode className="w-3.5 h-3.5" />
                validation.ts
              </div>
              <div className="px-2.5 py-1.5 bg-blue-50 rounded-md text-xs text-blue-700 flex items-center gap-1.5 border border-blue-200">
                <FileCode className="w-3.5 h-3.5" />
                ErrorMessage.tsx
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Section */}
      <div className="bg-white border border-gray-300 rounded-md p-4 shadow-sm">
        <h4 className="text-xs text-gray-700 mb-3 uppercase tracking-wide">Approvals</h4>
        
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            {(() => {
              const approverName = 'Jane Doe';
              const approverColor = getUserColor(approverName);
              return (
                <div className={`w-9 h-9 rounded-full ${approverColor.bg} ${approverColor.text} flex items-center justify-center border border-gray-300 shadow-sm`}>
                  <span className="text-sm font-medium">{getUserInitials(approverName)}</span>
            </div>
              );
            })()}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-600 rounded-full border-2 border-white flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-900">Jane Doe</div>
            <div className="text-xs text-gray-600">Approved</div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            {(() => {
              const pendingName = 'Mike Kim';
              const pendingColor = getUserColor(pendingName);
              return (
                <div className={`w-9 h-9 rounded-full ${pendingColor.bg} ${pendingColor.text} flex items-center justify-center border border-gray-300 shadow-sm`}>
                  <span className="text-sm font-medium">{getUserInitials(pendingName)}</span>
            </div>
              );
            })()}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center">
              <Clock className="w-2.5 h-2.5 text-gray-600" />
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-900">Mike Kim</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
        </div>

        <button className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          Approve Plan
        </button>
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