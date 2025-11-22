"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { LinearIssue, LinearUser, fetchLinearIssues, fetchLinearUsers, createLinearIssue } from '../lib/linear';
import { Search, Loader2, UserPlus, Hash, Plus, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { toast } from 'sonner';

interface TicketSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTicket: (ticket: LinearIssue, selectedUsers: LinearUser[]) => void;
}

export function TicketSelectionDialog({
  open,
  onOpenChange,
  onSelectTicket,
}: TicketSelectionDialogProps) {
  const [tickets, setTickets] = useState<LinearIssue[]>([]);
  const [users, setUsers] = useState<LinearUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<LinearIssue | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'tickets' | 'users'>('tickets');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [newTicketPriority, setNewTicketPriority] = useState<number>(0);

  useEffect(() => {
    if (open) {
      loadData();
    } else {
      // Reset state when dialog closes
      setSearchQuery('');
      setSelectedTicket(null);
      setSelectedUsers(new Set());
      setStep('tickets');
      setIsCreateDialogOpen(false);
      setNewTicketTitle('');
      setNewTicketDescription('');
      setNewTicketPriority(0);
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketsData, usersData] = await Promise.all([
        fetchLinearIssues(100),
        fetchLinearUsers(),
      ]);
      setTickets(ticketsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) =>
    ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.identifier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTicketSelect = (ticket: LinearIssue) => {
    setSelectedTicket(ticket);
    setStep('users');
  };

  const handleUserToggle = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleCreate = () => {
    if (selectedTicket) {
      const selectedUsersList = users.filter((user) =>
        selectedUsers.has(user.id)
      );
      onSelectTicket(selectedTicket, selectedUsersList);
      onOpenChange(false);
    }
  };

  const handleCreateNewTicket = async () => {
    if (!newTicketTitle.trim()) return;

    setCreating(true);
    try {
      const newTicket = await createLinearIssue({
        title: newTicketTitle,
        description: newTicketDescription || undefined,
        priority: newTicketPriority || undefined,
      });

      // Show success notification
      toast.success('Ticket created in Linear!', {
        description: `${newTicket.identifier}: ${newTicket.title}`,
        action: {
          label: 'Open in Linear',
          onClick: () => window.open(newTicket.url, '_blank'),
        },
        duration: 5000,
      });

      // Refresh tickets list
      await loadData();

      // Select the newly created ticket
      setSelectedTicket(newTicket);
      setIsCreateDialogOpen(false);
      setNewTicketTitle('');
      setNewTicketDescription('');
      setNewTicketPriority(0);
      
      // Move to users step
      setStep('users');
    } catch (error) {
      console.error('Error creating ticket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create ticket. Please try again.';
      toast.error('Failed to create ticket', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setCreating(false);
    }
  };

  const getPriorityLabel = (priority: number | null) => {
    if (priority === null) return 'None';
    const labels = ['', 'Urgent', 'High', 'Medium', 'Low'];
    return labels[priority] || 'None';
  };

  const getPriorityColor = (priority: number | null) => {
    if (priority === null) return 'bg-gray-500';
    const colors = ['', 'bg-red-600', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500'];
    return colors[priority] || 'bg-gray-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'tickets' ? 'Select a Linear Ticket' : 'Add People to Group'}
          </DialogTitle>
          <DialogDescription>
            {step === 'tickets'
              ? 'Choose a ticket to work on, then add team members to collaborate.'
              : `Selected: ${selectedTicket?.identifier} - ${selectedTicket?.title}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {step === 'tickets' ? (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tickets by title or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                  {filteredTickets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No tickets found
                    </div>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => handleTicketSelect(ticket)}
                        className={`w-full text-left p-3 rounded-lg border transition-all hover:bg-gray-50 ${
                          selectedTicket?.id === ticket.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Hash className="w-4 h-4 text-gray-500 shrink-0" />
                              <span className="font-semibold text-sm text-gray-900">
                                {ticket.identifier}
                              </span>
                              {ticket.priority && (
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getPriorityColor(
                                    ticket.priority
                                  )}`}
                                >
                                  {getPriorityLabel(ticket.priority)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 truncate">
                              {ticket.title}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              <span
                                className="px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${ticket.state.color}20`,
                                  color: ticket.state.color,
                                }}
                              >
                                {ticket.state.name}
                              </span>
                              <span>{ticket.team.key}</span>
                              {ticket.assignee && (
                                <span>Assigned to {ticket.assignee.displayName}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Select team members to add to the group
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No users available
                  </div>
                ) : (
                  users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"
                    >
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                      />
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                        <AvatarFallback>
                          {user.displayName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex items-center gap-2">
          {step === 'users' && (
            <Button
              variant="outline"
              onClick={() => setStep('tickets')}
            >
              Back
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === 'tickets' && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
          )}
          {step === 'tickets' ? (
            <Button
              onClick={() => {
                if (selectedTicket) {
                  setStep('users');
                }
              }}
              disabled={!selectedTicket}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={selectedUsers.size === 0}
            >
              Create Group ({selectedUsers.size})
            </Button>
          )}
        </DialogFooter>

        {/* Create New Ticket Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Linear Ticket</DialogTitle>
              <DialogDescription>
                Create a new ticket in Linear to work on
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter ticket title..."
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  disabled={creating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter ticket description (optional)..."
                  value={newTicketDescription}
                  onChange={(e) => setNewTicketDescription(e.target.value)}
                  disabled={creating}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  value={newTicketPriority}
                  onChange={(e) => setNewTicketPriority(Number(e.target.value))}
                  disabled={creating}
                  className="flex h-9 w-full rounded-md border border-input bg-input-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value={0}>None</option>
                  <option value={1}>Urgent</option>
                  <option value={2}>High</option>
                  <option value={3}>Medium</option>
                  <option value={4}>Low</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNewTicket}
                disabled={!newTicketTitle.trim() || creating}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Ticket
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

