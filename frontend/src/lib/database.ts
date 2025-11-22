// Database operations for Supabase
import { supabase, Ticket, Message, MessageType, MessageMetadata } from './supabase';

// ============================================================================
// TICKET OPERATIONS
// ============================================================================

/**
 * Create a new ticket in Supabase
 */
export async function createTicket(data: {
  ticket_identifier: string;
  ticket_name: string;
  description?: string;
  priority?: number;
  github_url?: string;
  people: string[];
}): Promise<Ticket> {
  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      ticket_identifier: data.ticket_identifier,
      ticket_name: data.ticket_name,
      description: data.description || null,
      priority: data.priority || null,
      github_url: data.github_url || null,
      people: data.people,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating ticket:', error);
    throw new Error(`Failed to create ticket: ${error.message}`);
  }

  return ticket;
}

/**
 * Get a ticket by its identifier (e.g., "REL-123")
 */
export async function getTicketByIdentifier(identifier: string): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('ticket_identifier', identifier)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching ticket:', error);
    throw new Error(`Failed to fetch ticket: ${error.message}`);
  }

  return data;
}

/**
 * Get a ticket by its ID
 */
export async function getTicketById(id: string): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching ticket:', error);
    throw new Error(`Failed to fetch ticket: ${error.message}`);
  }

  return data;
}

/**
 * Get all tickets
 */
export async function getAllTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tickets:', error);
    throw new Error(`Failed to fetch tickets: ${error.message}`);
  }

  return data || [];
}

/**
 * Update a ticket
 */
export async function updateTicket(
  id: string,
  updates: Partial<Omit<Ticket, 'id' | 'created_at' | 'updated_at'>>
): Promise<Ticket> {
  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating ticket:', error);
    throw new Error(`Failed to update ticket: ${error.message}`);
  }

  return data;
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

/**
 * Create a new message
 */
export async function createMessage(data: {
  ticket_id: string;
  user_or_agent: string;
  message_type: MessageType;
  content?: string;
  metadata?: MessageMetadata;
  timestamp?: string;
}): Promise<Message> {
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      ticket_id: data.ticket_id,
      user_or_agent: data.user_or_agent,
      message_type: data.message_type,
      content: data.content || null,
      metadata: data.metadata || null,
      timestamp: data.timestamp || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating message:', error);
    throw new Error(`Failed to create message: ${error.message}`);
  }

  return message;
}

/**
 * Get all messages for a ticket
 */
export async function getMessagesByTicketId(ticketId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return data || [];
}

/**
 * Get messages after a specific timestamp (for polling)
 */
export async function getMessagesAfterTimestamp(
  ticketId: string,
  afterTimestamp: string
): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .gt('timestamp', afterTimestamp)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching new messages:', error);
    throw new Error(`Failed to fetch new messages: ${error.message}`);
  }

  return data || [];
}

/**
 * Delete a message
 */
export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase.from('messages').delete().eq('id', id);

  if (error) {
    console.error('Error deleting message:', error);
    throw new Error(`Failed to delete message: ${error.message}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user initials for avatar
 */
export function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

