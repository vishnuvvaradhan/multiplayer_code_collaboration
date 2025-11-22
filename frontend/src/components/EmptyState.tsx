import { MessageSquare } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 border-2 border-gray-300">
          <MessageSquare className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-gray-900 mb-2">No messages yet</h3>
        <p className="text-sm text-gray-600 mb-6">
          Start a conversation with the AI agents to begin working on this ticket.
        </p>
        <button className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors">
          Start Conversation
        </button>
      </div>
    </div>
  );
}