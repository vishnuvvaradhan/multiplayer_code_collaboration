"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import { LinearIssue, LinearUser, LinearTeam, LinearLabel, fetchLinearIssues, fetchLinearUsers, fetchLinearTeams, fetchLinearLabels, createLinearIssue } from '../lib/linear';
import { Search, Loader2, UserPlus, Plus, Github, FolderGit2, CheckCircle2, Calendar, Clock, Circle, PlayCircle, CheckCircle, XCircle, GitMerge, AlertCircle, Copy, Filter, X, Check, ChevronDown, FileText, Users } from 'lucide-react';
import { createTicket, createMessage } from '../lib/database';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { createTicketWorkspace } from '../lib/backend-api';
import { AUTHORIZED_USERS, getAuthorizedUserNames, AuthorizedUser } from '../lib/authorized-users';
import { getUserColor, getUserInitials } from '../lib/database';
import {
  GitHubRepository,
  getGitHubOAuthUrl,
  fetchGitHubRepositories,
  getGitHubToken,
  setGitHubToken,
  getGitHubUser,
  removeGitHubToken
} from '../lib/github';

interface TicketSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTicket: (ticket: LinearIssue, selectedUsers: LinearUser[], repository: { fullName: string; url: string; name: string }) => void;
}

// Local authorized users for this dialog only (includes global + Tiger Shinoda)
const DIALOG_AUTHORIZED_USERS: AuthorizedUser[] = [
  ...AUTHORIZED_USERS,
  {
    id: "tiger-shinoda",
    name: "Tiger Shinoda",
    displayName: "Tiger Shinoda",
    email: "tiger@company.com",
    role: "Developer"
  }
];

const getDialogAuthorizedUserNames = (): string[] => {
  return DIALOG_AUTHORIZED_USERS.map(user => user.displayName);
};

export function TicketSelectionDialog({
  open,
  onOpenChange,
  onSelectTicket,
}: TicketSelectionDialogProps) {
  const [tickets, setTickets] = useState<LinearIssue[]>([]);
  const [users, setUsers] = useState<LinearUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<LinearIssue | null>(null);
  const [selectedRepository, setSelectedRepository] = useState<string>('');
  const [step, setStep] = useState<'tickets' | 'users' | 'repository'>('tickets');
  const [filters, setFilters] = useState<{
    states: Set<string>;
    priorities: Set<number>;
    teams: Set<string>;
    assignees: Set<string>;
  }>({
    states: new Set<string>(),
    priorities: new Set<number>(),
    teams: new Set<string>(),
    assignees: new Set<string>(),
  });
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUser, setGithubUser] = useState<{ login: string; avatar_url: string } | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [newTicketPriority, setNewTicketPriority] = useState<number>(0);
  const [newTicketTeam, setNewTicketTeam] = useState<string>('');
  const [newTicketLabels, setNewTicketLabels] = useState<Set<string>>(new Set());
  const [newTicketDueDate, setNewTicketDueDate] = useState<string>('');
  const [newTicketEstimate, setNewTicketEstimate] = useState<number>(0);
  const [teams, setTeams] = useState<LinearTeam[]>([]);
  const [labels, setLabels] = useState<LinearLabel[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketsData, usersData, teamsData] = await Promise.all([
        fetchLinearIssues(100),
        fetchLinearUsers(),
        fetchLinearTeams(),
      ]);
      setTickets(ticketsData);
      setUsers(usersData);
      setTeams(teamsData);
      // Set default team if available
      if (teamsData.length > 0 && !newTicketTeam) {
        setNewTicketTeam(teamsData[0].key);
      }
      
      if (ticketsData.length === 0) {
        toast.info('No tickets found', {
          description: 'Make sure your Linear API key is configured correctly.',
        });
      }
    } catch (error) {
      console.error('Error loading Linear data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tickets';
      toast.error('Failed to load Linear tickets', {
        description: errorMessage.includes('API key') || errorMessage.includes('NEXT_PUBLIC_LINEAR_API_KEY')
          ? 'Please set your Linear API key in .env.local'
          : errorMessage,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRepositories = useCallback(async (token: string) => {
    setLoadingRepos(true);
    try {
      const repos = await fetchGitHubRepositories(token);
      setRepositories(repos);
    } catch {
      toast.error('Failed to load repositories');
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  const checkGitHubConnection = useCallback(async () => {
    const token = getGitHubToken();
    if (token) {
      setGithubConnected(true);
      try {
        const user = await getGitHubUser(token);
        setGithubUser({ login: user.login, avatar_url: user.avatar_url });
        await loadRepositories(token);
      } catch {
        setGithubConnected(false);
        removeGitHubToken();
      }
    } else {
      setGithubConnected(false);
      setGithubUser(null);
    }
  }, [loadRepositories]);

  useEffect(() => {
    if (open) {
      loadData();
      checkGitHubConnection();
    } else {
      // Reset state when dialog closes
      setSearchQuery('');
      setSelectedTicket(null);
      setSelectedUsers(new Set());
      setSelectedRepository('');
      setStep('tickets');
      setIsCreateDialogOpen(false);
      setNewTicketTitle('');
      setNewTicketDescription('');
      setNewTicketPriority(0);
      setNewTicketTeam(teams.length > 0 ? teams[0].key : '');
      setNewTicketLabels(new Set());
      setNewTicketDueDate('');
      setNewTicketEstimate(0);
    }
  }, [open, checkGitHubConnection]);


  // Check for GitHub token in URL (from OAuth callback) - fallback if main page didn't catch it
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const githubToken = urlParams.get('github_token');
      const error = urlParams.get('error');
      
      if (error && !githubToken) {
        // Only show error if we don't have a token (main page should have handled it, but just in case)
        const errorMessages: Record<string, string> = {
          'github_not_configured': 'GitHub OAuth is not configured. Please set GITHUB_CLIENT_SECRET in your .env.local file.',
          'no_code': 'GitHub authorization was cancelled or failed.',
          'no_token': 'Failed to receive access token from GitHub.',
          'oauth_failed': 'GitHub OAuth authentication failed. Please try again.',
        };
        
        toast.error('GitHub Connection Failed', {
          description: errorMessages[error] || `Error: ${error}`,
          duration: 5000,
        });
        
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      } else if (githubToken) {
        setGitHubToken(githubToken);
        // Remove token from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        checkGitHubConnection();
        toast.success('GitHub connected successfully!');
      }
    }
  }, [checkGitHubConnection]);

  // Get unique values for filter options
  const uniqueStates = Array.from(new Set(tickets.map(t => t.state.name)));
  const uniqueTeams = Array.from(new Set(tickets.map(t => t.team.key)));
  const uniqueAssignees = Array.from(new Set(tickets.filter(t => t.assignee).map(t => t.assignee!.id)));

  const filteredTickets = tickets.filter((ticket) => {
    // Search filter
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.identifier.toLowerCase().includes(searchQuery.toLowerCase());

    // State filter
    const matchesState = filters.states.size === 0 || filters.states.has(ticket.state.name);

    // Priority filter
    const matchesPriority = filters.priorities.size === 0 || 
      (ticket.priority !== null && filters.priorities.has(ticket.priority)) ||
      (ticket.priority === null && filters.priorities.has(0));

    // Team filter
    const matchesTeam = filters.teams.size === 0 || filters.teams.has(ticket.team.key);

    // Assignee filter
    const matchesAssignee = filters.assignees.size === 0 || 
      (ticket.assignee && filters.assignees.has(ticket.assignee.id)) ||
      (!ticket.assignee && filters.assignees.has('unassigned'));

    return matchesSearch && matchesState && matchesPriority && matchesTeam && matchesAssignee;
  });

  const toggleFilter = (type: 'states' | 'priorities' | 'teams' | 'assignees', value: string | number) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (type === 'priorities') {
        const filterSet = new Set(prev.priorities);
        const numValue = value as number;
        if (filterSet.has(numValue)) {
          filterSet.delete(numValue);
        } else {
          filterSet.add(numValue);
        }
        return { ...newFilters, priorities: filterSet };
      } else {
        const filterSet = new Set(prev[type as 'states' | 'teams' | 'assignees']);
        const strValue = value as string;
        if (filterSet.has(strValue)) {
          filterSet.delete(strValue);
        } else {
          filterSet.add(strValue);
        }
        return { ...newFilters, [type]: filterSet };
      }
    });
  };

  const clearFilters = () => {
    setFilters({
      states: new Set(),
      priorities: new Set(),
      teams: new Set(),
      assignees: new Set(),
    });
  };

  const hasActiveFilters = filters.states.size > 0 || filters.priorities.size > 0 || 
    filters.teams.size > 0 || filters.assignees.size > 0;

  const handleTicketSelect = (ticket: LinearIssue) => {
    setSelectedTicket(ticket);
    setStep('repository');
  };

  const handleRepositoryNext = () => {
    if (selectedRepository) {
      setStep('users');
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };


  const handleConnectGitHub = () => {
    try {
      const oauthUrl = getGitHubOAuthUrl();
      window.location.href = oauthUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'GitHub OAuth not configured';
      toast.error('Cannot Connect to GitHub', {
        description: errorMessage + '. Please check your .env.local file and ensure NEXT_PUBLIC_GITHUB_CLIENT_ID is set.',
        duration: 5000,
      });
    }
  };

  const handleCreate = async () => {
    if (selectedTicket && selectedRepository) {
      // Get selected authorized users from the dialog
      const selectedAuthorizedUsers = DIALOG_AUTHORIZED_USERS.filter((user) => 
        selectedUsers.has(user.id)
      );

      // Convert to LinearUser format for compatibility
      const finalUsers: LinearUser[] = selectedAuthorizedUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: undefined,
        active: true,
      }));

      // People stored on the ticket: unique display names of all final users
      const people = Array.from(new Set(finalUsers.map((u) => u.displayName)));

      // Find the repository object to get full details
      const repo = repositories.find((r) => r.full_name === selectedRepository);

      const repositoryInfo = repo ? {
        fullName: repo.full_name,
        url: repo.html_url,
        name: repo.name,
      } : {
        fullName: selectedRepository,
        url: `https://github.com/${selectedRepository}`,
        name: selectedRepository.split('/')[1] || selectedRepository,
      };

      try {
        // Create ticket in Supabase
        const dbTicket = await createTicket({
          ticket_identifier: selectedTicket.identifier,
          ticket_name: selectedTicket.title,
          description: selectedTicket.description || undefined,
          priority: selectedTicket.priority || undefined,
          github_url: repositoryInfo.url,
          people,
        });

        // Create initial system message
        await createMessage({
          ticket_id: dbTicket.id,
          user_or_agent: 'System',
          message_type: 'system',
          content: `Ticket ${selectedTicket.identifier} created`,
        });

        // Create ticket workspace in backend (clone/load repo)
        try {
          const backendResponse = await createTicketWorkspace(
            selectedTicket.identifier,
            repositoryInfo.url
          );
          
          // Create system message about backend setup
          await createMessage({
            ticket_id: dbTicket.id,
            user_or_agent: 'System',
            message_type: 'system',
            content: `Repository workspace initialized: ${backendResponse.message}`,
          });
        } catch (backendError) {
          console.error('Error creating backend workspace:', backendError);
          // Don't fail the whole flow, just notify
          await createMessage({
            ticket_id: dbTicket.id,
            user_or_agent: 'System',
            message_type: 'system',
            content: `⚠️ Warning: Could not initialize backend workspace. Backend may be offline.`,
          });
        }

        toast.success('Group created successfully!', {
          description: `${selectedTicket.identifier}: ${selectedTicket.title}`,
        });
        
        onSelectTicket(selectedTicket, finalUsers, repositoryInfo);
        onOpenChange(false);
      } catch (error) {
        console.error('Error creating group:', error);
        toast.error('Failed to create group', {
          description: error instanceof Error ? error.message : 'Please try again',
        });
      }
    }
  };

  // Load labels when team changes
  useEffect(() => {
    if (newTicketTeam && isCreateDialogOpen) {
      const team = teams.find(t => t.key === newTicketTeam);
      if (team) {
        fetchLinearLabels(team.id).then(setLabels).catch(console.error);
      }
    }
  }, [newTicketTeam, isCreateDialogOpen, teams]);

  const handleCreateNewTicket = async () => {
    if (!newTicketTitle.trim()) return;

    setCreating(true);
    try {
      // Create ticket in Linear
      const newTicket = await createLinearIssue({
        title: newTicketTitle,
        description: newTicketDescription || undefined,
        priority: newTicketPriority || undefined,
        teamKey: newTicketTeam || undefined,
        assigneeId: undefined,
        labelIds: newTicketLabels.size > 0 ? Array.from(newTicketLabels) : undefined,
        dueDate: newTicketDueDate || undefined,
        estimate: newTicketEstimate > 0 ? newTicketEstimate : undefined,
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
      setNewTicketLabels(new Set());
      setNewTicketDueDate('');
      setNewTicketEstimate(0);
      
      // Move to repository step (will sync to Supabase when user completes the flow)
      setStep('repository');
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

  const getStateIcon = (state: { name: string; type: string }) => {
    const stateName = state.name.toLowerCase();
    const stateType = state.type.toLowerCase();

    // Match by state name first (more specific)
    if (stateName.includes('pr review') || stateName.includes('review')) {
      return GitMerge;
    }
    if (stateName.includes('ready to merge') || stateName.includes('merge')) {
      return GitMerge;
    }
    if (stateName.includes('duplicate')) {
      return Copy;
    }
    if (stateName.includes('triage')) {
      return AlertCircle;
    }
    if (stateName.includes('done') || stateName.includes('completed')) {
      return CheckCircle;
    }
    if (stateName.includes('canceled') || stateName.includes('cancelled')) {
      return XCircle;
    }

    // Match by state type
    if (stateType === 'completed' || stateType === 'done') {
      return CheckCircle;
    }
    if (stateType === 'started' || stateType === 'in_progress') {
      return PlayCircle;
    }
    if (stateType === 'canceled' || stateType === 'cancelled') {
      return XCircle;
    }
    if (stateType === 'unstarted' || stateType === 'backlog' || stateType === 'todo') {
      return Circle;
    }

    // Default to circle
    return Circle;
  };

  const getStateColor = (state: { name: string; type: string }) => {
    const stateName = state.name.toLowerCase();
    const stateType = state.type.toLowerCase();

    // Backlog → red
    if (stateName.includes('backlog') || stateType === 'backlog') {
      return 'bg-red-600';
    }

    // In Progress → blue
    if (stateName.includes('in progress') || stateName.includes('in-progress') || 
        stateType === 'started' || stateType === 'in_progress') {
      return 'bg-blue-600';
    }

    // Done/Ready for Review → green
    if (stateName.includes('done') || stateName.includes('completed') ||
        stateName.includes('ready for review') || stateName.includes('review') ||
        stateType === 'completed' || stateType === 'done') {
      return 'bg-green-600';
    }

    // Merged → purple
    if (stateName.includes('merged') || stateName.includes('merge')) {
      return 'bg-purple-600';
    }

    // Default to gray
    return 'bg-gray-600';
  };

  // Progress indicator steps with icons
  const steps = [
    { id: 'tickets', label: 'Ticket', completed: step !== 'tickets', icon: FileText },
    { id: 'repository', label: 'Repository', completed: step === 'users', icon: FolderGit2 },
    { id: 'users', label: 'Assign', completed: false, icon: Users },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create a Chat</DialogTitle>
          <DialogDescription>
            {step === 'tickets'
              ? 'Choose an already created ticket, or + New to create a new one.'
              : `Selected: ${selectedTicket?.identifier} - ${selectedTicket?.title}. Choose repository to create group chat.`}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator - Seamless Design */}
        <div className="mb-6 px-4">
          <div className="flex items-start justify-between">
            {steps.map((stepItem, index) => {
              const isActive = stepItem.id === step;
              const isCompleted = stepItem.completed;
              const isPast = index < currentStepIndex;

              return (
                <div key={stepItem.id} className="flex flex-col items-center flex-1 min-w-0">
                  {/* Step Icon */}
                  <div className="flex flex-col items-center relative z-10 w-full">
                    {(() => {
                      const StepIcon = stepItem.icon;
                      return (
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                            isActive
                              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white scale-110 shadow-lg shadow-blue-500/50'
                              : isCompleted || isPast
                              ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                              : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                          }`}
                          style={{
                            transform: isActive ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
                          }}
                        >
                          {isCompleted || isPast ? (
                            <Check className="w-5 h-5" strokeWidth={2.5} />
                          ) : (
                            <StepIcon 
                              className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} 
                              strokeWidth={2}
                            />
                          )}
                        </div>
                      );
                    })()}
                    <span
                      className={`mt-2 text-xs font-semibold transition-colors text-center ${
                        isActive
                          ? 'text-blue-600'
                          : isCompleted || isPast
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {stepItem.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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

              {/* Filters - Collapsible */}
              <div className="mb-4">
                <button
                  onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-50 transition-colors mb-2"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filters</span>
                    {hasActiveFilters && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {filters.states.size + filters.priorities.size + filters.teams.size + filters.assignees.size}
                      </span>
                    )}
                  </div>
                  <ChevronDown 
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isFiltersExpanded ? 'rotate-180' : ''}`} 
                  />
                </button>

                {/* Filter Content - Collapsible */}
                {isFiltersExpanded && (
                  <div className="space-y-3 pt-2 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-end">
                      {hasActiveFilters && (
                        <button
                          onClick={clearFilters}
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* State Filters */}
                    <div className="flex flex-wrap gap-2">
                  {uniqueStates.slice(0, 8).map((state) => {
                    const isActive = filters.states.has(state);
                    const StateIcon = getStateIcon({ name: state, type: '' });
                    return (
                      <button
                        key={state}
                        onClick={() => toggleFilter('states', state)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <StateIcon className="w-3 h-3" />
                        {state}
                      </button>
                    );
                  })}
                </div>

                {/* Priority Filters */}
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3, 4].map((priority) => {
                    const isActive = filters.priorities.has(priority);
                    const label = getPriorityLabel(priority);
                    const color = getPriorityColor(priority);
                    return (
                      <button
                        key={priority}
                        onClick={() => toggleFilter('priorities', priority)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                          isActive
                            ? `${color} text-white shadow-sm`
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : color}`} />
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Team Filters */}
                {uniqueTeams.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uniqueTeams.slice(0, 6).map((team) => {
                      const isActive = filters.teams.has(team);
                      return (
                        <button
                          key={team}
                          onClick={() => toggleFilter('teams', team)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {team}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Assignee Filters */}
                {uniqueAssignees.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleFilter('assignees', 'unassigned')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        filters.assignees.has('unassigned')
                          ? 'bg-gray-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Unassigned
                    </button>
                    {tickets
                      .filter(t => t.assignee && uniqueAssignees.includes(t.assignee.id))
                      .slice(0, 5)
                      .map((ticket) => {
                        const assignee = ticket.assignee!;
                        const isActive = filters.assignees.has(assignee.id);
                        return (
                          <button
                            key={assignee.id}
                            onClick={() => toggleFilter('assignees', assignee.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <Avatar className="w-4 h-4">
                              <AvatarImage src={assignee.avatarUrl} />
                              <AvatarFallback className="text-[8px]">
                                {assignee.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            {assignee.displayName.split(' ')[0]}
                          </button>
                        );
                      })}
                  </div>
                )}
                  </div>
                )}
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
                        className={`w-full text-left p-3 rounded-md transition-all ${
                          selectedTicket?.id === ticket.id
                            ? 'bg-blue-50 border-2 border-blue-500 shadow-md'
                            : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Assignee Avatar - Left side like Linear */}
                          {ticket.assignee && (
                            <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                              <AvatarImage src={ticket.assignee.avatarUrl} alt={ticket.assignee.displayName} />
                              <AvatarFallback className="text-[10px] font-semibold bg-gray-300 text-gray-700">
                                {ticket.assignee.displayName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          <div className="flex-1 min-w-0">
                            {/* Issue ID - Prominent at top */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-xs text-gray-600 tracking-wide">
                                {ticket.identifier}
                              </span>
                              {ticket.priority && ticket.priority > 0 && (
                                <div
                                  className={`w-2 h-2 rounded-full ${getPriorityColor(ticket.priority)} shrink-0`}
                                  title={getPriorityLabel(ticket.priority)}
                                />
                              )}
                            </div>

                            {/* Title - Main content */}
                            <h3 className="text-sm font-medium text-gray-900 mb-2 leading-snug line-clamp-2">
                              {ticket.title}
                            </h3>

                            {/* Labels/Tags - Compact row */}
                            {ticket.labels?.nodes && ticket.labels.nodes.length > 0 && (
                              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                {ticket.labels.nodes.slice(0, 4).map((label) => (
                                  <span
                                    key={label.id}
                                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                    style={{
                                      backgroundColor: `${label.color}20`,
                                      color: label.color,
                                    }}
                                  >
                                    {label.name}
                                  </span>
                                ))}
                                {ticket.labels.nodes.length > 4 && (
                                  <span className="text-[10px] text-gray-500 font-medium">
                                    +{ticket.labels.nodes.length - 4}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Footer: State, Team, Metadata - Compact */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* State with Icon */}
                              <div className="flex items-center gap-1.5">
                                {(() => {
                                  const StateIcon = getStateIcon(ticket.state);
                                  const isTodo = ticket.state.type === 'unstarted' || 
                                                ticket.state.name.toLowerCase().includes('todo') ||
                                                ticket.state.name.toLowerCase().includes('backlog');
                                  const isFilled = ticket.state.type === 'completed' || 
                                                  ticket.state.type === 'started' ||
                                                  ticket.state.name.toLowerCase().includes('done') ||
                                                  ticket.state.name.toLowerCase().includes('in progress');
                                  
                                  if (isTodo) {
                                    return (
                                      <StateIcon
                                        className="w-3.5 h-3.5 shrink-0 text-black stroke-2"
                                        fill="none"
                                      />
                                    );
                                  }
                                  
                                  return (
                                    <StateIcon
                                      className={`w-3.5 h-3.5 shrink-0 ${isFilled ? '' : 'fill-current'}`}
                                      style={{ color: ticket.state.color }}
                                    />
                                  );
                                })()}
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${getStateColor(ticket.state)}`}
                                >
                                  {ticket.state.name}
                                </span>
                              </div>

                              {/* Team */}
                              <span className="text-[10px] text-gray-500 font-medium">
                                {ticket.team.key}
                              </span>

                              {/* Estimate */}
                              {ticket.estimate && (
                                <div className="flex items-center gap-0.5 text-[10px] text-gray-500 font-medium">
                                  <Clock className="w-3 h-3" />
                                  <span>{ticket.estimate}</span>
                                </div>
                              )}

                              {/* Due Date */}
                              {ticket.dueDate && (
                                <div className="flex items-center gap-0.5 text-[10px] text-gray-500 font-medium">
                                  <Calendar className="w-3 h-3" />
                                  <span>{new Date(ticket.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                              )}

                              {/* Selection indicator */}
                              {selectedTicket?.id === ticket.id && (
                                <div className="ml-auto flex items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                </div>
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
          ) : step === 'repository' ? (
            <>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FolderGit2 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Select the GitHub repository for this collaboration
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {!githubConnected ? (
                  <div className="space-y-3">
                    {!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID === 'your_github_client_id_here' ? (
                      <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
                        <div className="flex items-start gap-3">
                          <Github className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-900 mb-1">
                              GitHub OAuth Not Configured
                            </p>
                            <p className="text-xs text-yellow-700 mb-2">
                              To connect GitHub, you need to set up OAuth credentials:
                            </p>
                            <ol className="text-xs text-yellow-700 list-decimal list-inside space-y-1 mb-3">
                              <li>Create a GitHub OAuth App at <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer" className="underline">github.com/settings/developers</a></li>
                              <li>Set Authorization callback URL to: <code className="bg-yellow-100 px-1 rounded">http://localhost:3000/api/auth/github/callback</code></li>
                              <li>Add <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_GITHUB_CLIENT_ID</code> and <code className="bg-yellow-100 px-1 rounded">GITHUB_CLIENT_SECRET</code> to your <code className="bg-yellow-100 px-1 rounded">.env.local</code> file</li>
                              <li>Restart your development server</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                        <div className="flex items-start gap-3">
                          <Github className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900 mb-1">
                              Connect GitHub
                            </p>
                            <p className="text-xs text-blue-700 mb-3">
                              Connect your GitHub account to access your repositories and create collaboration groups.
                            </p>
                            <button
                              type="button"
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                              onClick={handleConnectGitHub}
                            >
                              <Github className="w-4 h-4 inline mr-2" />
                              Connect GitHub
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {githubUser && (
                      <div className="p-3 rounded-lg border border-green-200 bg-green-50 mb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={githubUser.avatar_url} alt={githubUser.login} />
                            <AvatarFallback>{githubUser.login[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-green-900">
                            Connected as {githubUser.login}
                          </span>
                        </div>
                      </div>
                    )}

                    {loadingRepos ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-sm text-gray-500">Loading repositories...</span>
                      </div>
                    ) : repositories.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No repositories found</p>
                        <p className="text-xs mt-1">Try refreshing or check your GitHub permissions</p>
                      </div>
                    ) : (
                      repositories.map((repo) => (
                        <label
                          key={repo.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"
                        >
                          <input
                            type="radio"
                            name="repository"
                            value={repo.full_name}
                            checked={selectedRepository === repo.full_name}
                            onChange={(e) => setSelectedRepository(e.target.value)}
                            className="w-4 h-4 text-green-600"
                          />
                          <FolderGit2 className="w-5 h-5 text-gray-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {repo.name}
                              </p>
                              {repo.private && (
                                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                  Private
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {repo.full_name}
                            </p>
                            {repo.description && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                                {repo.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              {repo.language && <span>{repo.language}</span>}
                              {repo.stargazers_count > 0 && (
                                <span>⭐ {repo.stargazers_count}</span>
                              )}
                              <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
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
                {DIALOG_AUTHORIZED_USERS.map((user) => {
                  const userColor = getUserColor(user.displayName);
                  return (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"
                    >
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                      />
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={`${userColor.bg} ${userColor.text} text-xs font-semibold border border-gray-200`}>
                          {getUserInitials(user.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex items-center gap-2">
          {step === 'repository' && (
            <Button
              variant="outline"
              onClick={() => setStep('tickets')}
            >
              Back
            </Button>
          )}
          {step === 'users' && (
            <Button
              variant="outline"
              onClick={() => setStep('repository')}
            >
              Back
            </Button>
          )}
          {step === 'tickets' && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4" />
              New
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === 'tickets' ? (
            <Button
              onClick={() => {
                if (selectedTicket) {
                  setStep('repository');
                }
              }}
              disabled={!selectedTicket}
            >
              Next
            </Button>
          ) : step === 'repository' ? (
            <Button
              onClick={handleRepositoryNext}
              disabled={!selectedRepository}
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Linear Ticket</DialogTitle>
              <DialogDescription>
                Create a new ticket in Linear to work on
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
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

              {/* Team Selection */}
              {teams.length > 0 && (
                <div className="space-y-2">
                  <Label>Team</Label>
                  <div className="flex flex-wrap gap-2">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => setNewTicketTeam(team.key)}
                        disabled={creating}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          newTicketTeam === team.key
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {team.name} ({team.key})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority Selection */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 0, label: 'None', color: 'bg-gray-500' },
                    { value: 1, label: 'Urgent', color: 'bg-red-600' },
                    { value: 2, label: 'High', color: 'bg-orange-500' },
                    { value: 3, label: 'Medium', color: 'bg-yellow-500' },
                    { value: 4, label: 'Low', color: 'bg-blue-500' },
                  ].map((priority) => (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() => setNewTicketPriority(priority.value)}
                      disabled={creating}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                        newTicketPriority === priority.value
                          ? `${priority.color} text-white shadow-sm`
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${priority.color === 'bg-gray-500' ? 'bg-gray-400' : priority.color}`} />
                      {priority.label}
                    </button>
                  ))}
                </div>
              </div>


              {/* Labels Selection */}
              {labels.length > 0 && (
                <div className="space-y-2">
                  <Label>Labels</Label>
                  <div className="flex flex-wrap gap-2">
                    {labels.slice(0, 12).map((label) => {
                      const isSelected = newTicketLabels.has(label.id);
                      return (
                        <button
                          key={label.id}
                          type="button"
                          onClick={() => {
                            const newLabels = new Set(newTicketLabels);
                            if (isSelected) {
                              newLabels.delete(label.id);
                            } else {
                              newLabels.add(label.id);
                            }
                            setNewTicketLabels(newLabels);
                          }}
                          disabled={creating}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            isSelected
                              ? 'shadow-sm border-2'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                          style={{
                            backgroundColor: isSelected ? `${label.color}20` : undefined,
                            color: isSelected ? label.color : undefined,
                            borderColor: isSelected ? label.color : undefined,
                          }}
                        >
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Due Date and Estimate */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newTicketDueDate}
                    onChange={(e) => setNewTicketDueDate(e.target.value)}
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimate">Estimate (points)</Label>
                  <Input
                    id="estimate"
                    type="number"
                    min="0"
                    value={newTicketEstimate || ''}
                    onChange={(e) => setNewTicketEstimate(Number(e.target.value) || 0)}
                    disabled={creating}
                    placeholder="0"
                  />
                </div>
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

