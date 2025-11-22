"use client";

import { useState, useEffect } from 'react';
import { LeftSidebar } from '../components/LeftSidebar';
import { ChatPanel } from '../components/ChatPanel';
import { RightPanel } from '../components/RightPanel';

interface RepositoryInfo {
  fullName: string;
  url: string;
  name: string;
}

export default function Home() {
  const [selectedTicket, setSelectedTicket] = useState('REL-123');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [repositoryInfo, setRepositoryInfo] = useState<RepositoryInfo | null>(null);

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
          />
        )}
      </div>
    </div>
  );
}
