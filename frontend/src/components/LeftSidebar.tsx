"use client";

import { useState, useEffect } from 'react';
import { Plus, Hash, ChevronDown, Circle, Loader2 } from 'lucide-react';
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
    <div className="w-64 border-r border-purple-900/50 flex flex-col h-full shadow-lg" style={{ backgroundColor: '#350D36' }}>
      {/* Header */}
      <div className="p-3 border-b border-purple-900/50" style={{ backgroundColor: '#350D36' }}>
        <button className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-700/50 rounded-md transition-all duration-200 border border-purple-600/30 hover:border-purple-500/50 hover:shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center shadow-sm">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M4 10L10 4L16 10M4 10L10 16L16 10" stroke="#350D36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-bold tracking-wide" style={{ color: '#ffffff' }}>Relay</span>
          </div>
          <ChevronDown className="w-4 h-4" style={{ color: '#e9d5ff' }} />
        </button>
      </div>

      {/* Tickets Section */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-4">
          <button className="w-full flex items-center justify-between px-2.5 py-2 text-xs hover:bg-purple-700/40 rounded-md transition-all duration-200 mb-2 hover:shadow-sm" style={{ color: '#f3e8ff' }}>
            <span className="font-bold uppercase tracking-wider" style={{ color: '#f3e8ff' }}>Tickets</span>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: '#e9d5ff' }} />
          </button>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#f3e8ff' }} />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 px-3">
              <p className="text-sm" style={{ color: '#c084fc' }}>No tickets yet</p>
              <p className="text-xs mt-1" style={{ color: '#9333ea' }}>Click Create to add one</p>
            </div>
          ) : (
            <div className="space-y-1">
              {tickets.map((ticket) => {
                const isSelected = ticket.ticket_identifier === selectedTicket;
                const messageCount = unreadCounts[ticket.ticket_identifier];

                return (
                  <button
                    key={ticket.id}
                    onClick={() => onSelectTicket(ticket.ticket_identifier)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-200 ease-in-out group relative ${
                      isSelected
                        ? 'shadow-md'
                        : 'hover:bg-purple-700/50 hover:shadow-sm'
                    }`}
                    style={{
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      color: isSelected ? '#350D36' : '#f3e8ff',
                      backgroundColor: isSelected ? '#ffffff' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = 'scale(1.01)';
                        const hashIcon = e.currentTarget.querySelector('svg');
                        if (hashIcon) hashIcon.style.color = '#f3e8ff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = 'scale(1)';
                        const hashIcon = e.currentTarget.querySelector('svg');
                        if (hashIcon) hashIcon.style.color = '#c084fc';
                      }
                    }}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <Hash className="w-4 h-4 shrink-0 transition-colors duration-200" style={{ color: isSelected ? '#350D36' : '#c084fc' }} />
                      <span className="truncate font-medium" style={{ color: isSelected ? '#350D36' : '#f3e8ff' }}>
                        {ticket.ticket_name.toLowerCase().replace(/\s+/g, '-')}
                      </span>
                    </div>
                    {messageCount && !isSelected && (
                      <span className="px-2 py-0.5 bg-white text-[#350D36] rounded-full text-xs font-bold min-w-[20px] text-center shadow-sm">
                        {messageCount}
                      </span>
                    )}
                    {isSelected && (
                      <Circle className="w-2.5 h-2.5 shrink-0 bg-blue-600 fill-current animate-pulse" />
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
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-all duration-200 font-medium hover:shadow-md border border-green-700 bg-green-600 hover:bg-green-700 text-white relative"
          style={{ 
            transform: 'scale(1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.01)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Plus className="w-4 h-4 shrink-0" style={{ position: 'absolute', left: '12px' }} />
          <span className="text-sm font-semibold">Create</span>
        </button>
      </div>

      <TicketSelectionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSelectTicket={handleTicketSelected}
      />
    </div>
  );
}