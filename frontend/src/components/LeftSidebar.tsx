"use client";

import { useState, useEffect } from 'react';
import { Plus, Hash, ChevronDown, Loader2, MoreVertical, Bell } from 'lucide-react';
import { TicketSelectionDialog } from './TicketSelectionDialog';
import { LinearIssue, LinearUser } from '../lib/linear';
import { getAllTickets, getMessagesByTicketId } from '../lib/database';
import { Ticket } from '../lib/supabase';

const statusConfig = {
  'in-progress': { color: 'bg-blue-600', label: 'In Progress' },
  'review': { color: 'bg-yellow-500', label: 'Review' },
  'done': { color: 'bg-green-600', label: 'Done' },
  'blocked': { color: 'bg-red-600', label: 'Blocked' },
};

interface LeftSidebarProps {
  selectedTicket: string;
  onSelectTicket: (id: string) => void;
  onRepositorySelected?: (repository: { fullName: string; url: string; name: string }) => void;
}

export function LeftSidebar({ selectedTicket, onSelectTicket, onRepositorySelected }: LeftSidebarProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Fetch tickets from Supabase
  useEffect(() => {
    async function fetchTickets() {
      try {
        setLoading(true);
        const dbTickets = await getAllTickets();
        setTickets(dbTickets);

        // Fetch unread message counts for each ticket
        // For now, we'll just show if there are any messages
        const counts: Record<string, number> = {};
        for (const ticket of dbTickets) {
          const messages = await getMessagesByTicketId(ticket.id);
          // You can implement more sophisticated unread logic here
          // For now, just count total messages as a placeholder
          if (messages.length > 0) {
            counts[ticket.ticket_identifier] = messages.length;
          }
        }
        setUnreadCounts(counts);
      } catch (error) {
        console.error('Error fetching tickets:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, []);

  const handleTicketSelected = (
    ticket: LinearIssue, 
    selectedUsers: LinearUser[], 
    repository: { fullName: string; url: string; name: string }
  ) => {
    console.log('📋 Ticket selected:', ticket.identifier, ticket.title);
    console.log('👥 Users selected:', selectedUsers.map(u => u.displayName));
    console.log('🔗 Repository selected:', {
      fullName: repository.fullName,
      url: repository.url,
      name: repository.name,
    });
    
    // Pass repository info to parent component so it can be used in chat context
    if (onRepositorySelected) {
      console.log('✅ Passing repository to parent:', repository.url);
      onRepositorySelected(repository);
    } else {
      console.warn('⚠️ onRepositorySelected callback not provided');
    }
    
    // Switch to the selected ticket
    onSelectTicket(ticket.identifier);
    
    // Refresh tickets to show the newly created one
    getAllTickets().then(setTickets);
  };
  return (
    <div className="w-64 border-r border-amber-800/20 flex flex-col h-full shadow-lg" style={{ backgroundColor: '#F5F1EB' }}>
      {/* Header */}
      <div className="p-3 border-b border-amber-800/20" style={{ backgroundColor: '#F5F1EB' }}>
        <button className="w-full flex items-center justify-between px-3 py-2 hover:bg-amber-900/10 rounded-md transition-all duration-200 border border-amber-800/20 hover:border-amber-800/30 hover:shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center shadow-sm">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M4 10L10 4L16 10M4 10L10 16L16 10" stroke="#8B6F47" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-bold tracking-wide" style={{ color: '#5D4037' }}>CodeRoom</span>
          </div>
          <ChevronDown className="w-4 h-4" style={{ color: '#8B6F47' }} />
        </button>
      </div>

      {/* Tickets Section */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-4">
          <button className="w-full flex items-center justify-between px-2.5 py-2 text-xs hover:bg-amber-900/10 rounded-md transition-all duration-200 mb-2 hover:shadow-sm" style={{ color: '#5D4037' }}>
            <span className="font-bold uppercase tracking-wider" style={{ color: '#5D4037' }}>Tickets</span>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: '#8B6F47' }} />
          </button>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#8B6F47' }} />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 px-3">
              <p className="text-sm" style={{ color: '#8B6F47' }}>No tickets yet</p>
              <p className="text-xs mt-1" style={{ color: '#9B7F57' }}>Click Create to add one</p>
            </div>
          ) : (
            <div className="space-y-1">
              {tickets.map((ticket) => {
                const isSelected = ticket.ticket_identifier === selectedTicket;
                const messageCount = unreadCounts[ticket.ticket_identifier];

                return (
                  <button
                    key={ticket.id}
                    onClick={() => {
                      onSelectTicket(ticket.ticket_identifier);
                      // Clear unread count when ticket is selected
                      setUnreadCounts(prev => {
                        const newCounts = { ...prev };
                        delete newCounts[ticket.ticket_identifier];
                        return newCounts;
                      });
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-300 ease-in-out group relative ${
                      isSelected
                        ? 'shadow-md'
                        : ''
                    }`}
                    style={{
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      color: isSelected ? '#5D4037' : '#5D4037',
                      backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                      boxShadow: isSelected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = 'scale(1.01)';
                        e.currentTarget.style.backgroundColor = 'rgba(217, 119, 6, 0.1)';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(217, 119, 6, 0.4), 0 0 40px rgba(217, 119, 6, 0.2), 0 0 60px rgba(217, 119, 6, 0.1)';
                        e.currentTarget.style.border = '1px solid rgba(217, 119, 6, 0.5)';
                        const hashIcon = e.currentTarget.querySelector('svg');
                        if (hashIcon) hashIcon.style.color = '#5D4037';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.border = 'none';
                        const hashIcon = e.currentTarget.querySelector('svg');
                        if (hashIcon) hashIcon.style.color = '#8B6F47';
                      }
                    }}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <Hash className="w-4 h-4 shrink-0 transition-colors duration-200" style={{ color: isSelected ? '#5D4037' : '#8B6F47' }} />
                      <span className="truncate font-medium" style={{ color: isSelected ? '#5D4037' : '#5D4037' }}>
                        {ticket.ticket_name.toLowerCase().replace(/\s+/g, '-')}
                      </span>
                    </div>
                    {messageCount && !isSelected && (
                      <span className="px-2 py-0.5 bg-amber-800 text-white rounded-full text-xs font-bold min-w-[20px] text-center shadow-sm">
                        {messageCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Create button */}
        <button
          onClick={() => setIsDialogOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-all duration-300 font-medium text-white relative overflow-hidden"
          style={{ 
            transform: 'scale(1)',
            backgroundColor: '#D97706',
            borderColor: '#B45309',
            borderWidth: '1px',
            borderStyle: 'solid',
            boxShadow: '0 0 0 rgba(217, 119, 6, 0)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.backgroundColor = '#B45309';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(217, 119, 6, 0.8), 0 0 40px rgba(217, 119, 6, 0.6), 0 0 60px rgba(217, 119, 6, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = '#D97706';
            e.currentTarget.style.boxShadow = '0 0 0 rgba(217, 119, 6, 0)';
          }}
        >
          <Plus className="w-4 h-4 shrink-0" style={{ position: 'absolute', left: '12px' }} />
          <span className="text-sm font-semibold">Create</span>
        </button>
      </div>

      {/* Profile Section - Bottom Left (Slack style) */}
      <div className="p-2 border-t border-amber-800/20" style={{ backgroundColor: '#F5F1EB' }}>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-amber-900/10 transition-colors cursor-pointer group">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center border-2 border-white shadow-sm">
              <span className="text-white text-xs font-semibold">JD</span>
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold truncate" style={{ color: '#5D4037' }}>Jane Doe</span>
            </div>
            <span className="text-xs truncate block" style={{ color: '#8B6F47' }}>Active</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1 hover:bg-amber-900/20 rounded transition-colors">
              <Bell className="w-4 h-4" style={{ color: '#8B6F47' }} />
            </button>
            <button className="p-1 hover:bg-amber-900/20 rounded transition-colors">
              <MoreVertical className="w-4 h-4" style={{ color: '#8B6F47' }} />
            </button>
          </div>
        </div>
      </div>

      <TicketSelectionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSelectTicket={handleTicketSelected}
      />
    </div>
  );
}