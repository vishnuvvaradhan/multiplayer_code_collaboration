// Linear API utility functions

const LINEAR_API_KEY = process.env.NEXT_PUBLIC_LINEAR_API_KEY;
const LINEAR_API_URL = 'https://api.linear.app/graphql';

if (!LINEAR_API_KEY) {
  throw new Error(
    'NEXT_PUBLIC_LINEAR_API_KEY is not set. Please add it to your .env.local file. ' +
    'Get your API key from: https://linear.app/settings/api'
  );
}

// TypeScript assertion: we know LINEAR_API_KEY is defined after the check above
const API_KEY: string = LINEAR_API_KEY;

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority: number | null;
  estimate?: number | null;
  dueDate?: string | null;
  state: {
    id: string;
    name: string;
    type: string;
    color: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  };
  creator: {
    id: string;
    name: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  };
  team: {
    id: string;
    name: string;
    key: string;
  };
  labels?: {
    nodes: Array<{
      id: string;
      name: string;
      color: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface LinearUser {
  id: string;
  name: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  active: boolean;
}

async function linearQuery(query: string, variables?: Record<string, unknown>) {
  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    let errorMessage = `Linear API error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.text();
      if (errorBody) {
        errorMessage += ` - ${errorBody}`;
      }
    } catch {
      // Ignore if we can't parse the error body
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();

  if (result.errors) {
    const errorMessages = result.errors.map((err: { message: string; extensions?: unknown }) => 
      err.message || JSON.stringify(err)
    ).join('; ');
    throw new Error(`Linear API errors: ${errorMessages}`);
  }

  return result.data;
}

export async function fetchLinearIssues(limit: number = 50): Promise<LinearIssue[]> {
  const query = `
    query($first: Int!) {
      issues(first: $first) {
        nodes {
          id
          identifier
          title
          description
          priority
          estimate
          dueDate
          state {
            id
            name
            type
            color
          }
          assignee {
            id
            name
            email
            displayName
            avatarUrl
          }
          creator {
            id
            name
            email
            displayName
            avatarUrl
          }
          team {
            id
            name
            key
          }
          labels {
            nodes {
              id
              name
              color
            }
          }
          createdAt
          updatedAt
          url
        }
      }
    }
  `;

  const data = await linearQuery(query, { first: limit });
  return data.issues.nodes;
}

export async function fetchLinearUsers(): Promise<LinearUser[]> {
  const query = `
    query {
      users {
        nodes {
          id
          name
          email
          displayName
          avatarUrl
          active
        }
      }
    }
  `;

  const data = await linearQuery(query);
  return data.users.nodes.filter((user: LinearUser) => user.active);
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  priority?: number; // 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low
  teamKey?: string;
  assigneeId?: string;
  labelIds?: string[];
  projectId?: string;
  dueDate?: string; // ISO date string
  estimate?: number;
}

export async function createLinearIssue(input: CreateIssueInput): Promise<LinearIssue> {
  // First, get team ID
  const getTeamsQuery = `
    query {
      teams {
        nodes {
          id
          name
          key
        }
      }
    }
  `;

  const teamsData = await linearQuery(getTeamsQuery);
  let teamId = teamsData.teams.nodes[0]?.id;

  if (input.teamKey) {
    const team = teamsData.teams.nodes.find((t: { key: string }) => t.key === input.teamKey);
    if (team) {
      teamId = team.id;
    }
  }

  if (!teamId) {
    throw new Error('No team found');
  }

  // Get state ID for the initial state (usually "Todo" or "Backlog")
  const getStatesQuery = `
    query($teamId: ID!) {
      workflowStates(filter: { team: { id: { eq: $teamId } } }) {
        nodes {
          id
          name
          type
        }
      }
    }
  `;

  const statesData = await linearQuery(getStatesQuery, { teamId });
  
  // Find "Todo" or "Backlog" state, or use the first unstarted state
  let stateId: string | null = null;
  if (statesData.workflowStates?.nodes) {
    const todoState = statesData.workflowStates.nodes.find(
      (s: { type: string; name: string }) => 
        s.type === 'unstarted' && (s.name.toLowerCase() === 'todo' || s.name.toLowerCase() === 'backlog')
    ) || statesData.workflowStates.nodes.find((s: { type: string }) => s.type === 'unstarted');
    
    if (todoState) {
      stateId = todoState.id;
    }
  }

  // Build the issue input
  const issueInput: Record<string, unknown> = {
    teamId: teamId,
    title: input.title,
  };

  if (input.description) {
    issueInput.description = input.description;
  }

  if (stateId) {
    issueInput.stateId = stateId;
  }

  if (input.assigneeId) {
    issueInput.assigneeId = input.assigneeId;
  }

  if (input.priority !== undefined) {
    issueInput.priority = input.priority;
  }

  if (input.labelIds && input.labelIds.length > 0) {
    issueInput.labelIds = input.labelIds;
  }

  if (input.projectId) {
    issueInput.projectId = input.projectId;
  }

  if (input.dueDate) {
    issueInput.dueDate = input.dueDate;
  }

  if (input.estimate !== undefined) {
    issueInput.estimate = input.estimate;
  }

  // Create the mutation
  const createMutation = `
    mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          title
          description
          priority
          state {
            id
            name
            type
            color
          }
          assignee {
            id
            name
            email
            displayName
            avatarUrl
          }
          creator {
            id
            name
            email
            displayName
            avatarUrl
          }
          team {
            id
            name
            key
          }
          labels {
            nodes {
              id
              name
              color
            }
          }
          createdAt
          updatedAt
          url
        }
      }
    }
  `;

  const data = await linearQuery(createMutation, { input: issueInput });

  if (!data.issueCreate?.success) {
    throw new Error('Failed to create issue');
  }

  return data.issueCreate.issue;
}
