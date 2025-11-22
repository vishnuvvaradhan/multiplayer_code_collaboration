"use client";

import { useState } from 'react';
import { TopBar } from '../components/TopBar';
import { LeftSidebar } from '../components/LeftSidebar';
import { ChatPanel } from '../components/ChatPanel';
import { RightPanel } from '../components/RightPanel';

export default function Home() {
  const [selectedTicket, setSelectedTicket] = useState('REL-123');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          selectedTicket={selectedTicket}
          onSelectTicket={setSelectedTicket}
        />

        <ChatPanel
          ticketId={selectedTicket}
          onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
          isRightPanelOpen={isRightPanelOpen}
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
