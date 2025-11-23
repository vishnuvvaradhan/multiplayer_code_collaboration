# Backend Integration Guide

This document describes the integration between the Next.js frontend and the FastAPI backend for the multiplayer code collaboration platform.

## 🎯 Overview

The backend provides AI-powered code generation capabilities through three main actions:
- **@chat** - Quick Q&A responses for developers
- **@make_plan** - Generate implementation plans
- **@dev** - Implement plans and create PRs

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  ChatPanel   │  │  RightPanel  │  │TicketDialog │     │
│  │              │  │              │  │              │     │
│  │  @chat msgs  │  │  Plan/PR btns│  │  Create tick │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          │   SSE Stream     │   SSE Stream     │   HTTP POST
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (FastAPI)                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ /create_ticket│  │  /command    │  │ Gemini CLI   │     │
│  │              │  │              │  │              │     │
│  │ Clone repo   │  │ Execute cmd  │  │ AI Agent     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  📁 ./tickets/{ticket_id}/  ← Git repositories              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                     │
│                                                              │
│  - Tickets (metadata)                                        │
│  - Messages (chat history, plans, PRs)                       │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Setup

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Install Gemini CLI separately (follow Gemini docs)
# https://github.com/gemini/cli

# Start the backend server
uvicorn app:app --reload --port 8000
```

### 2. Frontend Environment Variables

Create/update `frontend/.env.local`:

```bash
# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# User (existing)
NEXT_PUBLIC_USER_NAME=Your Name
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📡 API Integration

### Backend API Client (`lib/backend-api.ts`)

The frontend communicates with the backend through three main functions:

#### 1. `createTicketWorkspace(ticketId, repoUrl)`

Called when a ticket is created. Clones the repository to `./tickets/{ticket_id}/`.

```typescript
import { createTicketWorkspace } from '@/lib/backend-api';

await createTicketWorkspace('REL-123', 'https://github.com/user/repo.git');
```

#### 2. `getTicketContext(ticketId)`

Gathers comprehensive context for AI agents:
- Ticket metadata (name, description, priority, etc.)
- Full chat history (all messages)
- Team members

```typescript
import { getTicketContext } from '@/lib/backend-api';

const context = await getTicketContext('REL-123');
// Returns formatted markdown string with all context
```

#### 3. `executeCommand(ticketId, action, message?)`

Executes AI commands with SSE streaming:

```typescript
import { executeCommand } from '@/lib/backend-api';

// Stream responses
for await (const chunk of executeCommand('REL-123', 'chat', 'How do I implement this?')) {
  console.log(chunk); // Real-time output
}
```

**Actions:**
- `'chat'` - Quick Q&A (requires `message`)
- `'make_plan'` - Generate implementation plan
- `'dev'` - Implement plan and create PR

## 💬 Features

### 1. @chat Command

**User Experience:**
1. User types `@chat <question>` in the chat
2. The `@chat` text is highlighted in blue
3. Backend streams a quick, short response (2-3 sentences)
4. Response appears as an agent message in chat

**Implementation:**
- Detection: `ChatPanel.tsx` checks if message starts with `@chat`
- Highlighting: `HumanMessage.tsx` renders `@chat` with blue badge
- Context: Full ticket context + chat history sent to backend
- Prompt: Specialized for quick, concise responses

**Example:**
```
User: @chat How should I structure the validation logic?

AI Assistant: Create a separate validation.ts file with pure functions 
for each validation rule (card number, CVV, expiry). Import and use 
them in PaymentForm.tsx with useState for error handling.
```

### 2. Plan Generation

**User Experience:**
1. User clicks "Create Plan" button in Plan tab (right sidebar)
2. Button shows loading state: "Creating Plan..."
3. Backend generates implementation plan
4. Plan saved to Supabase and displayed in Plan tab
5. Button changes to "Update Plan" for future iterations

**Implementation:**
- Button: `RightPanel.tsx` → `PlanTab` component
- Context: Ticket info + chat history sent to backend
- Backend: Creates `plan.md` in `./tickets/{ticket_id}/`
- Storage: Plan content saved as agent message in Supabase
- Detection: Checks for existing plan messages to show "Update Plan"

**Plan Structure:**
```markdown
# Implementation Plan

## Overview/Goal
[High-level description]

## Step-by-step Tasks
1. Task 1
2. Task 2
...

## Files to Modify/Create
- file1.ts
- file2.tsx

## Implementation Notes
[Technical details]
```

### 3. PR Generation

**User Experience:**
1. User clicks "Generate PR" button in PR tab (right sidebar)
2. Button disabled unless plan exists
3. Backend implements plan, commits, pushes, creates PR
4. PR link displayed in both PR tab and Changes tab
5. System message in chat with PR link

**Implementation:**
- Button: `RightPanel.tsx` → `PRView` component
- Validation: Checks `planExists` state before allowing
- Backend: Reads `plan.md`, generates code edits, commits, pushes, creates PR via `gh` CLI
- Extraction: Frontend extracts PR URL from backend output
- Storage: PR info saved as agent message with `prLink` in metadata
- Display: PR link shown in both PR and Changes tabs

**Backend Flow:**
```
1. Read plan.md
2. Generate structured JSON edits
3. Apply edits to files
4. git add . && git commit
5. git push origin ticket_{ticket_id}
6. gh pr create (or update existing)
7. Return PR URL
```

## 🔄 Data Flow

### Creating a Ticket

```
1. User selects Linear ticket + repo + users
   ↓
2. Frontend creates ticket in Supabase
   ↓
3. Frontend calls createTicketWorkspace(ticketId, repoUrl)
   ↓
4. Backend clones repo to ./tickets/{ticket_id}/
   ↓
5. System message added to chat: "Repository workspace initialized"
```

### Using @chat

```
1. User types "@chat how do I...?"
   ↓
2. Message saved to Supabase (human message)
   ↓
3. Frontend detects @chat prefix
   ↓
4. Frontend gathers context via getTicketContext()
   ↓
5. Frontend calls executeCommand(ticketId, 'chat', prompt)
   ↓
6. Backend streams response via SSE
   ↓
7. Frontend saves response to Supabase (agent message)
   ↓
8. Response appears in chat via polling
```

### Generating a Plan

```
1. User clicks "Create Plan" button
   ↓
2. Frontend gathers context via getTicketContext()
   ↓
3. Frontend calls executeCommand(ticketId, 'make_plan')
   ↓
4. Backend runs Gemini with plan generation prompt
   ↓
5. Backend writes plan.md to ./tickets/{ticket_id}/
   ↓
6. Backend streams plan content via SSE
   ↓
7. Frontend saves plan to Supabase (agent message)
   ↓
8. Plan appears in Plan tab
```

### Generating a PR

```
1. User clicks "Generate PR" button
   ↓
2. Frontend calls executeCommand(ticketId, 'dev')
   ↓
3. Backend reads plan.md
   ↓
4. Backend generates code edits (JSON format)
   ↓
5. Backend applies edits to files
   ↓
6. Backend commits and pushes to GitHub
   ↓
7. Backend creates PR via gh CLI
   ↓
8. Backend streams output (including PR URL) via SSE
   ↓
9. Frontend extracts PR URL from output
   ↓
10. Frontend saves PR info to Supabase (agent message with prLink)
   ↓
11. PR link displayed in PR and Changes tabs
```

## 🗄️ Database Schema

### Messages Table

Messages store all chat content, plans, and PR information:

```typescript
interface Message {
  id: string;
  ticket_id: string;
  user_or_agent: string;
  message_type: 'human' | 'agent' | 'system' | 'architect-plan' | 'diff-generated';
  content: string | null;
  metadata: {
    avatar?: string;
    agent?: 'chat' | 'plan' | 'dev';
    prLink?: string;
    isCommand?: boolean;
    streaming?: boolean;
  } | null;
  timestamp: string;
  created_at: string;
}
```

**Message Types:**
- `human` - User messages (including @chat commands)
- `agent` - AI responses (chat, plan, dev)
- `system` - System notifications

**Agent Metadata:**
- `agent: 'chat'` - @chat responses
- `agent: 'plan'` - Implementation plans
- `agent: 'dev'` - PR generation output
- `prLink` - GitHub PR URL (when available)

## 🎨 UI Components

### ChatPanel
- Detects `@chat` in messages
- Highlights `@chat` with blue badge
- Handles message sending and @chat execution
- Displays streaming responses

### RightPanel
- Manages Plan, Changes, and PR tabs
- Tracks plan/PR existence state
- Handles button states (loading, disabled)
- Coordinates between tabs

### PlanTab
- "Create Plan" / "Update Plan" button
- Displays plan content (from messages)
- Shows loading state during generation

### PRView
- "Generate PR" button (disabled without plan)
- Displays PR information
- Links to GitHub PR

### DiffView
- Shows PR link when available
- "View PR" button opens GitHub
- Placeholder for future diff display

## 🚨 Error Handling

### Backend Offline
- Ticket creation continues (backend call wrapped in try-catch)
- System message warns: "Backend may be offline"
- User can still use chat and UI

### Command Failures
- Toast notification with error message
- System message in chat with error details
- Button returns to ready state

### Streaming Errors
- Partial responses saved if available
- Error message displayed in chat
- User can retry

## 🔐 Security Notes

### Current (Development)
- Backend runs on localhost:8000
- No authentication between frontend/backend
- Supabase uses anon key with RLS disabled

### Future (Production)
- Add API key authentication
- Implement rate limiting
- Enable Supabase RLS
- Use secure token exchange

## 🧪 Testing

### Manual Testing Checklist

**Ticket Creation:**
- [ ] Create ticket with valid repo URL
- [ ] Check backend logs for repo clone
- [ ] Verify system message in chat
- [ ] Test with backend offline (should gracefully fail)

**@chat Command:**
- [ ] Type `@chat how do I...?`
- [ ] Verify `@chat` is highlighted in blue
- [ ] Check response appears as agent message
- [ ] Test with backend offline

**Plan Generation:**
- [ ] Click "Create Plan" button
- [ ] Verify loading state
- [ ] Check plan appears in chat and Plan tab
- [ ] Click "Update Plan" with feedback in chat
- [ ] Verify plan updates

**PR Generation:**
- [ ] Verify button disabled without plan
- [ ] Generate plan first
- [ ] Click "Generate PR"
- [ ] Verify PR link in PR and Changes tabs
- [ ] Check system message with PR link
- [ ] Click "View PR" to open GitHub

## 📝 Development Notes

### Adding New Commands

To add a new command (e.g., `@review`):

1. **Backend** (`gemini_module.py`):
   ```python
   def gemini_review(ticket_id: str) -> Generator[str, None, None]:
       prompt = "Review the code..."
       yield from run_gemini_prompt(ticket_id, prompt)
   ```

2. **Backend** (`app.py`):
   ```python
   elif action == "review":
       generator = gemini_review(ticket_id)
   ```

3. **Frontend** (`backend-api.ts`):
   ```typescript
   // Update type
   action: 'chat' | 'make_plan' | 'dev' | 'review'
   ```

4. **Frontend** (UI):
   - Add button/trigger in appropriate component
   - Call `executeCommand(ticketId, 'review')`
   - Handle response and save to Supabase

### Debugging

**Backend Logs:**
```bash
# Backend terminal shows:
- Ticket workspace creation
- Command execution
- Gemini CLI output
- Git operations
```

**Frontend Console:**
```javascript
// Check network tab for:
- POST /create_ticket
- POST /command (SSE stream)

// Check console for:
- Context gathering
- SSE chunk reception
- Message saving
```

**Database:**
```sql
-- Check messages
SELECT * FROM messages WHERE ticket_id = 'xxx' ORDER BY timestamp DESC;

-- Check tickets
SELECT * FROM tickets WHERE ticket_identifier = 'REL-123';
```

## 🚀 Deployment

### Backend Deployment
1. Deploy FastAPI to cloud (Railway, Render, etc.)
2. Install Gemini CLI on server
3. Configure git credentials for PR creation
4. Set up GitHub token for `gh` CLI
5. Update `NEXT_PUBLIC_BACKEND_URL` in frontend

### Frontend Deployment
1. Update `.env.production` with backend URL
2. Deploy to Vercel/Netlify
3. Ensure CORS configured on backend

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SSE (Server-Sent Events)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Gemini CLI](https://github.com/gemini/cli)
- [GitHub CLI](https://cli.github.com/)

## 🤝 Contributing

When modifying the integration:

1. Update this documentation
2. Test all three commands (@chat, plan, PR)
3. Verify error handling
4. Check both online and offline scenarios
5. Update ARCHITECTURE.md if structure changes

---

**Last Updated:** November 23, 2025
**Version:** 1.0.0

