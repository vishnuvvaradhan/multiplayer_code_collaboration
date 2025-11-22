"use client";

import { useState } from 'react';
import { Plus, Hash, ChevronDown, Circle } from 'lucide-react';
import { TicketSelectionDialog } from './TicketSelectionDialog';
import { LinearIssue, LinearUser } from '../lib/linear';

interface Ticket {
  id: string;
  title: string;
  status: 'in-progress' | 'review' | 'done' | 'blocked';
  unread?: number;
}

const tickets: Ticket[] = [
  { id: 'REL-123', title: 'Add payment method validation', status: 'in-progress', unread: 3 },
  { id: 'REL-122', title: 'Fix checkout button styling', status: 'review' },
  { id: 'REL-121', title: 'Implement address autocomplete', status: 'done' },
  { id: 'REL-120', title: 'Add promo code field', status: 'in-progress', unread: 1 },
  { id: 'REL-119', title: 'Update cart calculations', status: 'blocked' },
  { id: 'REL-118', title: 'Redesign order summary', status: 'done' },
];

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
    
    // TODO: Create group/session with selected ticket, users, and repository
    // The repository URL is now available in the chat context via repositoryInfo state
    // Repository info:
    //   - repository.url: Full GitHub URL (e.g., https://github.com/user/repo)
    //   - repository.fullName: Full name (e.g., user/repo)
    //   - repository.name: Repo name (e.g., repo)
    
    // You can add logic here to:
    // - Create a collaboration group/session with repository context
    // - Notify selected users
    // - Set up the workspace for the ticket
    // - The repository URL is automatically passed to ChatPanel for agent context
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
          
          <div className="space-y-1">
            {tickets.map((ticket) => {
              const isSelected = ticket.id === selectedTicket;
              const config = statusConfig[ticket.status];

              return (
                <button
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket.id)}
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
                    <span className="truncate font-medium" style={{ color: isSelected ? '#350D36' : '#f3e8ff' }}>{ticket.title.toLowerCase().replace(/\s+/g, '-')}</span>
                  </div>
                  {ticket.unread && !isSelected && (
                    <span className="px-2 py-0.5 bg-white text-[#350D36] rounded-full text-xs font-bold min-w-[20px] text-center shadow-sm">
                      {ticket.unread}
                    </span>
                  )}
                  {isSelected && (
                    <Circle className={`w-2.5 h-2.5 shrink-0 ${config.color} fill-current animate-pulse`} />
                  )}
                </button>
              );
            })}
          </div>
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