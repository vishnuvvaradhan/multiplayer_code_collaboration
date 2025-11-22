// Supabase client configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface Ticket {
  id: string;
  ticket_identifier: string;
  ticket_name: string;
  description: string | null;
  priority: number | null;
  github_url: string | null;
  people: string[]; // Array of user names
  created_at: string;
  updated_at: string;
}

export type MessageType = 'human' | 'agent' | 'system' | 'architect-plan' | 'diff-generated';

export interface Message {
  id: string;
  ticket_id: string;
  user_or_agent: string;
  message_type: MessageType;
  content: string | null;
  metadata: Record<string, any> | null;
  timestamp: string;
  created_at: string;
}

export interface MessageMetadata {
  avatar?: string;
  agent?: 'architect' | 'dev';
  [key: string]: any;
}

// Utility to get current user name from environment
export function getCurrentUserName(): string {
  const userName = process.env.NEXT_PUBLIC_USER_NAME;
  if (!userName) {
    console.warn('NEXT_PUBLIC_USER_NAME not set, using default');
    return 'Anonymous User';
  }
  return userName;
}

// Utility to get polling interval from environment
export function getPollingInterval(): number {
  const interval = process.env.NEXT_PUBLIC_POLL_INTERVAL;
  return interval ? parseInt(interval, 10) : 5000; // Default 5 seconds
}

