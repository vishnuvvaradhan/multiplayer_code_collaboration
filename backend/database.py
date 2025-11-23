"""
Backend database operations for Supabase
"""

import os
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Initialize supabase client (will be None if env vars missing)
supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_ANON_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    except Exception as e:
        print(f"Warning: Failed to initialize Supabase client: {e}")
        supabase = None
else:
    print("Warning: SUPABASE_URL or SUPABASE_ANON_KEY not set. Database functions will not work.")


# ============================================================================
# MESSAGE OPERATIONS
# ============================================================================

def get_ticket_uuid_by_identifier(ticket_identifier: str) -> Optional[str]:
    """
    Get the UUID of a ticket by its human-readable identifier (e.g., "COD-28")
    """
    if not supabase:
        print(f"Warning: Supabase not initialized, cannot lookup ticket {ticket_identifier}")
        return None

    try:
        response = supabase.table('tickets').select('id').eq('ticket_identifier', ticket_identifier).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]['id']
        return None
    except Exception as e:
        print(f"Error looking up ticket UUID for {ticket_identifier}: {e}")
        return None


def get_messages_by_ticket_identifier(ticket_identifier: str) -> List[Dict[str, Any]]:
    """
    Get all messages for a ticket by its identifier (e.g., "COD-28"), ordered by timestamp
    """
    # First, get the actual ticket UUID
    ticket_uuid = get_ticket_uuid_by_identifier(ticket_identifier)
    if not ticket_uuid:
        print(f"Warning: Could not find ticket UUID for identifier {ticket_identifier}")
        return []

    return get_messages_by_ticket_id(ticket_uuid)


def get_messages_by_ticket_id(ticket_id: str) -> List[Dict[str, Any]]:
    """
    Get all messages for a ticket by its UUID, ordered by timestamp
    """
    if not supabase:
        print(f"Warning: Supabase not initialized, cannot fetch messages for ticket {ticket_id}")
        return []

    try:
        response = supabase.table('messages').select('*').eq('ticket_id', ticket_id).order('timestamp').execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching messages for ticket {ticket_id}: {e}")
        return []


def get_messages_after_timestamp(ticket_id: str, after_timestamp: str) -> List[Dict[str, Any]]:
    """
    Get messages after a specific timestamp (for polling)
    """
    try:
        response = supabase.table('messages').select('*').eq('ticket_id', ticket_id).gt('timestamp', after_timestamp).order('timestamp').execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching messages after timestamp for ticket {ticket_id}: {e}")
        return []


def create_message(ticket_id: str, user_or_agent: str, message_type: str, content: Optional[str] = None, metadata: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Create a new message
    """
    try:
        data = {
            'ticket_id': ticket_id,
            'user_or_agent': user_or_agent,
            'message_type': message_type,
            'content': content,
            'metadata': metadata
        }
        response = supabase.table('messages').insert(data).execute()
        return response.data[0] if response.data else {}
    except Exception as e:
        print(f"Error creating message: {e}")
        return {}


# ============================================================================
# TICKET OPERATIONS
# ============================================================================

def get_ticket_by_identifier(identifier: str) -> Optional[Dict[str, Any]]:
    """
    Get a ticket by its identifier (e.g., "REL-123")
    """
    try:
        response = supabase.table('tickets').select('*').eq('ticket_identifier', identifier).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error fetching ticket {identifier}: {e}")
        return None


def get_ticket_by_id(ticket_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a ticket by its ID
    """
    try:
        response = supabase.table('tickets').select('*').eq('id', ticket_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error fetching ticket by ID {ticket_id}: {e}")
        return None


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def format_chat_history(messages: List[Dict[str, Any]]) -> str:
    """
    Format chat messages into a readable conversation context for Gemini
    """
    if not messages:
        return "No previous conversation."

    formatted_lines = []
    for msg in messages[-20:]:  # Only include last 20 messages to avoid token limits
        timestamp = msg.get('timestamp', '')[:19]  # Format timestamp
        user = msg.get('user_or_agent', 'Unknown')
        msg_type = msg.get('message_type', 'unknown')
        content = msg.get('content', '')

        if msg_type == 'human':
            formatted_lines.append(f"[{timestamp}] {user}: {content}")
        elif msg_type == 'agent':
            formatted_lines.append(f"[{timestamp}] AI Assistant: {content}")
        elif msg_type == 'system':
            formatted_lines.append(f"[{timestamp}] System: {content}")
        elif msg_type == 'architect-plan':
            formatted_lines.append(f"[{timestamp}] Architect: {content}")
        elif msg_type == 'diff-generated':
            formatted_lines.append(f"[{timestamp}] Developer: {content}")

    return "\n".join(formatted_lines)
