// Custom hook for managing messages with polling
import { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '@/lib/supabase';
import { getMessagesByTicketId, getMessagesAfterTimestamp } from '@/lib/database';
import { getPollingInterval } from '@/lib/supabase';

interface UseMessagesOptions {
  ticketId: string | null;
  enabled?: boolean;
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMessages({ ticketId, enabled = true }: UseMessagesOptions): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all messages initially
  const fetchAllMessages = useCallback(async () => {
    if (!ticketId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fetchedMessages = await getMessagesByTicketId(ticketId);
      setMessages(fetchedMessages);
      
      // Update last timestamp
      if (fetchedMessages.length > 0) {
        lastTimestampRef.current = fetchedMessages[fetchedMessages.length - 1].timestamp;
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Poll for new messages
  const pollNewMessages = useCallback(async () => {
    if (!ticketId || !lastTimestampRef.current) return;

    try {
      const newMessages = await getMessagesAfterTimestamp(
        ticketId,
        lastTimestampRef.current
      );

      if (newMessages.length > 0) {
        setMessages((prev) => [...prev, ...newMessages]);
        lastTimestampRef.current = newMessages[newMessages.length - 1].timestamp;
      }
    } catch (err) {
      console.error('Error polling messages:', err);
      // Don't set error state for polling failures to avoid UI disruption
    }
  }, [ticketId]);

  // Initial fetch
  useEffect(() => {
    if (enabled && ticketId) {
      fetchAllMessages();
    }
  }, [enabled, ticketId, fetchAllMessages]);

  // Set up polling
  useEffect(() => {
    if (!enabled || !ticketId) {
      // Clear polling if disabled or no ticket
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Start polling
    const interval = getPollingInterval();
    pollingIntervalRef.current = setInterval(pollNewMessages, interval);

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [enabled, ticketId, pollNewMessages]);

  return {
    messages,
    loading,
    error,
    refetch: fetchAllMessages,
  };
}

