// GitHub API utility functions

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  updated_at: string;
  language: string | null;
  stargazers_count: number;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
}

// Get GitHub OAuth URL
export function getGitHubOAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const redirectUri = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/auth/github/callback`
    : '';
  const scope = 'repo read:user user:email';
  const state = typeof window !== 'undefined' 
    ? btoa(JSON.stringify({ redirect: window.location.pathname }))
    : '';

  if (!clientId || clientId === 'your_github_client_id_here') {
    throw new Error(
      'GitHub OAuth is not configured. Please set NEXT_PUBLIC_GITHUB_CLIENT_ID in your .env.local file. ' +
      'Create a GitHub OAuth App at: https://github.com/settings/developers'
    );
  }

  return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
}

// Fetch user's repositories
export async function fetchGitHubRepositories(token: string): Promise<GitHubRepository[]> {
  const response = await fetch('/api/github/repositories', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch repositories: ${response.statusText}`);
  }

  const data = await response.json();
  return data.repositories || [];
}

// Get current GitHub user
export async function getGitHubUser(token: string): Promise<GitHubUser> {
  const response = await fetch('/api/github/user', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }

  return response.json();
}

// Check if user is authenticated
export function getGitHubToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('github_token');
}

// Store GitHub token
export function setGitHubToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('github_token', token);
}

// Remove GitHub token
export function removeGitHubToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('github_token');
}

