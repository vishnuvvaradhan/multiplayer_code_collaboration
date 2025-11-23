"use client";

import { useState, useEffect } from 'react';
import { LeftSidebar } from '../components/LeftSidebar';
import { ChatPanel } from '../components/ChatPanel';
import { RightPanel } from '../components/RightPanel';
import { setGitHubToken } from '../lib/github';
import { toast } from 'sonner';

interface RepositoryInfo {
  fullName: string;
  url: string;
  name: string;
}

export default function Home() {
  const [selectedTicket, setSelectedTicket] = useState('REL-123');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [repositoryInfo, setRepositoryInfo] = useState<RepositoryInfo | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Handle GitHub OAuth callback - capture token from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const githubToken = urlParams.get('github_token');
      const error = urlParams.get('error');
      
      if (error) {
        // Show error to user
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
        // Store token and show success
        setGitHubToken(githubToken);
        toast.success('GitHub Connected!', {
          description: 'Your GitHub account has been successfully connected.',
          duration: 3000,
        });
        
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // Log repository info changes for testing
  useEffect(() => {
    if (repositoryInfo) {
      console.log('🌐 Repository info updated in page.tsx:', {
        fullName: repositoryInfo.fullName,
        url: repositoryInfo.url,
        name: repositoryInfo.name,
      });
    }
  }, [repositoryInfo]);

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          selectedTicket={selectedTicket}
          onSelectTicket={setSelectedTicket}
          onRepositorySelected={setRepositoryInfo}
          refreshTrigger={refreshTrigger}
        />

        <ChatPanel
          ticketId={selectedTicket}
          onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
          isRightPanelOpen={isRightPanelOpen}
          repositoryUrl={repositoryInfo?.url}
          repositoryName={repositoryInfo?.fullName}
          onSelectTicket={setSelectedTicket}
        />

        {isRightPanelOpen && (
          <RightPanel
            ticketId={selectedTicket}
            onClose={() => setIsRightPanelOpen(false)}
            onTicketDeleted={() => {
              setSelectedTicket('');
              setRefreshTrigger(prev => prev + 1);
            }}
          />
        )}
      </div>
    </div>
  );
}
