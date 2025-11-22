import { Plus, Hash, ChevronDown, Circle } from 'lucide-react';

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
}

export function LeftSidebar({ selectedTicket, onSelectTicket }: LeftSidebarProps) {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-300 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-300 bg-white">
        <button className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors border border-gray-300">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gray-900 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M4 10L10 4L16 10M4 10L10 16L16 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-gray-900 text-sm">Relay</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Tickets Section */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-3">
          <button className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-md transition-colors mb-1">
            <span className="font-semibold">Tickets</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
          </button>
          
          <div className="space-y-0.5">
            {tickets.map((ticket) => {
              const isSelected = ticket.id === selectedTicket;
              const config = statusConfig[ticket.status];

              return (
                <button
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all group ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Hash className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                    <span className="truncate">{ticket.title.toLowerCase().replace(/\s+/g, '-')}</span>
                  </div>
                  {ticket.unread && !isSelected && (
                    <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-xs font-medium min-w-[18px] text-center">
                      {ticket.unread}
                    </span>
                  )}
                  {isSelected && (
                    <Circle className={`w-2 h-2 flex-shrink-0 ${config.color} fill-current`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add ticket button */}
        <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors">
          <Plus className="w-4 h-4" />
          <span>Add ticket</span>
        </button>
      </div>
    </div>
  );
}