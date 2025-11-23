// Backend API client for FastAPI integration
import { getTicketByIdentifier, getMessagesByTicketId, Ticket, Message } from './database';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// ============================================================================
// CONTEXT GATHERING
// ============================================================================

/**
 * Gather comprehensive context for a ticket including:
 * - Ticket information (identifier, name, description, priority, github_url, people)
 * - All chat messages (human and agent)
 * 
 * This context is used to provide better guidance to the AI agents.
 */
export async function getTicketContext(ticketIdentifier: string): Promise<string> {
  try {
    // Get ticket information
    const ticket = await getTicketByIdentifier(ticketIdentifier);
    if (!ticket) {
      throw new Error(`Ticket ${ticketIdentifier} not found`);
    }

    // Get all messages for this ticket
    const messages = await getMessagesByTicketId(ticket.id);

    // Format context as structured prompt
    const context = `
# TICKET INFORMATION

**Ticket ID:** ${ticket.ticket_identifier}
**Title:** ${ticket.ticket_name}
**Description:** ${ticket.description || 'No description provided'}
**Priority:** ${ticket.priority !== null ? ticket.priority : 'Not set'}
**Repository:** ${ticket.github_url || 'No repository linked'}
**Team Members:** ${ticket.people.length > 0 ? ticket.people.join(', ') : 'No team members assigned'}

---

# CONVERSATION HISTORY

${messages.length === 0 ? 'No messages yet.' : messages.map((msg, index) => {
  const timestamp = new Date(msg.timestamp).toLocaleString();
  const sender = msg.message_type === 'human' ? msg.user_or_agent : `[${msg.message_type.toUpperCase()}]`;
  return `**[${index + 1}] ${sender}** (${timestamp}):\n${msg.content || '(no content)'}`;
}).join('\n\n---\n\n')}

---

# END OF CONTEXT
`.trim();

    return context;
  } catch (error) {
    console.error('Error gathering ticket context:', error);
    throw error;
  }
}

// ============================================================================
// BACKEND API CALLS
// ============================================================================

/**
 * Create a ticket workspace in the backend (clone/load repo)
 */
export async function createTicketWorkspace(
  ticketId: string,
  repoUrl: string
): Promise<{ status: string; message: string }> {
  const response = await fetch(`${BACKEND_URL}/create_ticket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ticket_id: ticketId,
      repo_url: repoUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create ticket workspace: ${error}`);
  }

  return response.json();
}

/**
 * Execute a command (@chat, @make_plan, @dev) and stream the response
 */
export async function* executeCommand(
  ticketId: string,
  action: 'chat' | 'make_plan' | 'dev',
  message?: string
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${BACKEND_URL}/command`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ticket_id: ticketId,
      action,
      message,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to execute command: ${error}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  // Parse SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // Remove 'data: ' prefix
          
          // Check for end marker
          if (data === '__END__') {
            return;
          }
          
          yield data;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Check if backend is reachable
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}

