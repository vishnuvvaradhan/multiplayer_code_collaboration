# System Architecture

## 🏗️ High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     User Computers                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Computer 1  │  │  Computer 2  │  │  Computer 3  │     │
│  │  Jane Doe    │  │  Mike Kim    │  │  Alex Chen   │     │
│  │              │  │              │  │              │     │
│  │  Next.js App │  │  Next.js App │  │  Next.js App │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          │   Poll every 5s  │   Poll every 5s  │   Poll every 5s
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Cloud                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              PostgreSQL Database                    │    │
│  │                                                     │    │
│  │  ┌──────────────┐        ┌──────────────┐        │    │
│  │  │   tickets    │        │   messages   │        │    │
│  │  ├──────────────┤        ├──────────────┤        │    │
│  │  │ id           │◄───────┤ ticket_id    │        │    │
│  │  │ identifier   │        │ user_or_agent│        │    │
│  │  │ ticket_name  │        │ message_type │        │    │
│  │  │ description  │        │ content      │        │    │
│  │  │ priority     │        │ metadata     │        │    │
│  │  │ github_url   │        │ timestamp    │        │    │
│  │  │ people[]     │        └──────────────┘        │    │
│  │  └──────────────┘                                 │    │
│  │                                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
          ▲                  ▲                  ▲
          │                  │                  │
          │   Read/Write     │   Read/Write     │   Read/Write
          │                  │                  │
┌─────────┴──────────────────┴──────────────────┴──────────────┐
│                   External Services                           │
│                                                              │
│  ┌──────────────┐              ┌──────────────┐            │
│  │    Linear    │              │    GitHub    │            │
│  │              │              │              │            │
│  │  - Tickets   │              │  - Repos     │            │
│  │  - Users     │              │  - OAuth     │            │
│  │  - Projects  │              │  - Context   │            │
│  └──────────────┘              └──────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Message Flow

### Sending a Message

```
1. User types message in ChatPanel
   │
   ├─► handleSend() called
   │
   ├─► createMessage() in database.ts
   │
   ├─► Supabase PostgreSQL INSERT
   │
   └─► Message saved with timestamp
```

### Receiving Messages (Polling)

```
Every 5 seconds:

1. useMessages hook triggers
   │
   ├─► getMessagesAfterTimestamp(lastTimestamp)
   │
   ├─► Supabase PostgreSQL SELECT
   │   WHERE timestamp > lastTimestamp
   │
   ├─► New messages returned
   │
   ├─► State updated: setMessages([...old, ...new])
   │
   └─► UI re-renders with new messages
```

---

## 📦 Component Architecture

```
App (page.tsx)
│
├─► TopBar
│   └─► Navigation & Branding
│
├─► LeftSidebar
│   ├─► Ticket List
│   └─► Create Button
│       └─► TicketSelectionDialog
│           ├─► Ticket Selection
│           ├─► Repository Selection
│           └─► User Selection
│
├─► ChatPanel
│   ├─► Header (with GitHub link)
│   ├─► Messages Area
│   │   ├─► useMessages hook (polling)
│   │   ├─► HumanMessage
│   │   ├─► AgentMessage
│   │   ├─► SystemMessage
│   │   ├─► ArchitectPlanCard
│   │   └─► DiffGeneratedCard
│   └─► Input Bar
│       └─► Send Button
│
└─► RightPanel
    ├─► Plan Tab
    ├─► Changes Tab (DiffView)
    └─► PR Tab (PRView)
```

---

## 🗄️ Database Schema

### Tickets Table

```sql
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_identifier TEXT NOT NULL UNIQUE,  -- "REL-123"
    ticket_name TEXT NOT NULL,               -- "Add payment validation"
    description TEXT,                         -- Full description
    priority INTEGER,                         -- 0-4
    github_url TEXT,                          -- Repository URL
    people TEXT[] NOT NULL DEFAULT '{}',     -- ["Jane Doe", "Mike Kim"]
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tickets_identifier ON tickets(ticket_identifier);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
```

### Messages Table

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_or_agent TEXT NOT NULL,             -- "Jane Doe" or "Architect"
    message_type TEXT NOT NULL,              -- 'human', 'agent', 'system'
    content TEXT,                            -- Message text (nullable)
    metadata JSONB,                          -- { avatar: "JD", agent: "architect" }
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_ticket_id ON messages(ticket_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_messages_ticket_timestamp ON messages(ticket_id, timestamp DESC);
```

---

## 🔐 Security Model

### Current (Demo)

```
┌─────────────────┐
│   Frontend      │
│   (Browser)     │
└────────┬────────┘
         │
         │ Supabase Anon Key
         │ (Public, in .env.local)
         │
         ▼
┌─────────────────┐
│   Supabase      │
│   (Database)    │
│                 │
│   RLS: Allow   │  ← Row Level Security
│   All Access   │     (Open for demo)
└─────────────────┘
```

### Production (Future)

```
┌─────────────────┐
│   Frontend      │
│   (Browser)     │
└────────┬────────┘
         │
         │ JWT Token
         │ (After login)
         │
         ▼
┌─────────────────┐
│  Supabase Auth  │
│                 │
│  Verify Token   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Supabase      │
│   (Database)    │
│                 │
│   RLS: Check   │  ← Row Level Security
│   User ID      │     (Secure)
└─────────────────┘
```

---

## 🔌 API Integration

### Linear API

```
Frontend
   │
   ├─► fetchLinearIssues()
   │   └─► GET https://api.linear.app/graphql
   │       └─► Returns: List of tickets
   │
   ├─► createLinearIssue()
   │   └─► POST https://api.linear.app/graphql
   │       └─► Creates: New ticket in Linear
   │
   └─► Sync to Supabase
       └─► createTicket() in database.ts
```

### GitHub API

```
Frontend
   │
   ├─► OAuth Flow
   │   └─► Redirect to GitHub
   │       └─► Returns: Access token
   │
   ├─► fetchGitHubRepositories()
   │   └─► GET https://api.github.com/user/repos
   │       └─► Returns: List of repos
   │
   └─► Store in Ticket
       └─► github_url field
```

---

## 📊 Data Flow Diagram

### Creating a Group/Session

```
User clicks "Create"
   │
   ▼
TicketSelectionDialog opens
   │
   ├─► Step 1: Select Ticket
   │   ├─► Fetch from Linear API
   │   └─► Display list
   │
   ├─► Step 2: Select Repository
   │   ├─► Fetch from GitHub API
   │   └─► Display list
   │
   ├─► Step 3: Select Users
   │   ├─► Fetch from Linear API
   │   └─► Display list
   │
   └─► Click "Create Group"
       │
       ├─► createTicket() → Supabase
       │   └─► Saves: ticket + github_url + people
       │
       ├─► createMessage() → Supabase
       │   └─► Saves: "Ticket created" system message
       │
       └─► Navigate to ChatPanel
           └─► Start polling for messages
```

### Sending a Message

```
User types in input
   │
   ▼
Press Enter or Click Send
   │
   ▼
handleSend() called
   │
   ├─► Get current user from env
   │   └─► NEXT_PUBLIC_USER_NAME
   │
   ├─► createMessage({
   │       ticket_id,
   │       user_or_agent: "Jane Doe",
   │       message_type: "human",
   │       content: "Hello!",
   │       metadata: { avatar: "JD" }
   │   })
   │
   └─► Supabase INSERT
       │
       └─► Message saved with timestamp
```

### Receiving Messages

```
useMessages hook
   │
   └─► setInterval(5000ms)
       │
       └─► Every 5 seconds:
           │
           ├─► getMessagesAfterTimestamp(
           │       ticketId,
           │       lastTimestamp
           │   )
           │
           ├─► Supabase SELECT
           │   WHERE ticket_id = ? AND timestamp > ?
           │
           ├─► Returns: New messages only
           │
           ├─► Update state:
           │   setMessages([...existing, ...new])
           │
           └─► UI re-renders
               └─► New messages appear
```

---

## 🎯 Performance Optimization

### Current Optimizations

1. **Indexed Queries**
   ```sql
   -- Fast lookup by ticket
   CREATE INDEX idx_messages_ticket_id ON messages(ticket_id);
   
   -- Fast sorting by time
   CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
   
   -- Composite for polling query
   CREATE INDEX idx_messages_ticket_timestamp 
   ON messages(ticket_id, timestamp DESC);
   ```

2. **Efficient Polling**
   ```typescript
   // Only fetch messages newer than last seen
   getMessagesAfterTimestamp(ticketId, lastTimestamp)
   
   // Instead of fetching all messages every time
   // ❌ getAllMessages(ticketId) 
   ```

3. **Client-Side Caching**
   ```typescript
   // Messages stored in React state
   // No re-fetch on component re-render
   const [messages, setMessages] = useState([]);
   ```

### Future Optimizations

1. **WebSockets (Supabase Realtime)**
   - Replace polling with push notifications
   - Instant message delivery
   - Lower server load

2. **Message Pagination**
   - Load only recent messages initially
   - Lazy load older messages on scroll

3. **Optimistic Updates**
   - Show message immediately
   - Sync to server in background

---

## 🔧 Configuration Flow

```
.env.local
   │
   ├─► NEXT_PUBLIC_SUPABASE_URL
   │   └─► Used by: supabase.ts
   │       └─► Creates: Supabase client
   │
   ├─► NEXT_PUBLIC_SUPABASE_ANON_KEY
   │   └─► Used by: supabase.ts
   │       └─► Authenticates: API requests
   │
   ├─► NEXT_PUBLIC_USER_NAME
   │   └─► Used by: ChatPanel.tsx
   │       └─► Sets: Message author
   │
   ├─► NEXT_PUBLIC_POLL_INTERVAL
   │   └─► Used by: useMessages.ts
   │       └─► Sets: Polling frequency
   │
   ├─► NEXT_PUBLIC_LINEAR_API_KEY
   │   └─► Used by: linear.ts
   │       └─► Authenticates: Linear API
   │
   └─► NEXT_PUBLIC_GITHUB_CLIENT_ID
       └─► Used by: github.ts
           └─► Authenticates: GitHub OAuth
```

---

## 🚀 Deployment Architecture

### Development

```
localhost:3000
   │
   ├─► Next.js Dev Server
   │   └─► Hot reload enabled
   │
   └─► Supabase Cloud
       └─► Development database
```

### Production (Future)

```
                    ┌─────────────────┐
                    │   Vercel CDN    │
                    │   (Edge Network)│
                    └────────┬────────┘
                             │
                             ▼
┌─────────────────────────────────────────┐
│           Vercel Hosting                │
│                                          │
│  ┌────────────────────────────────┐    │
│  │   Next.js App                  │    │
│  │   (Server-Side Rendering)      │    │
│  └────────────┬───────────────────┘    │
│               │                         │
└───────────────┼─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│         Supabase Production             │
│                                          │
│  ┌────────────────────────────────┐    │
│  │   PostgreSQL Database          │    │
│  │   (Replicated, Backed up)      │    │
│  └────────────────────────────────┘    │
│                                          │
│  ┌────────────────────────────────┐    │
│  │   Supabase Realtime            │    │
│  │   (WebSocket Server)           │    │
│  └────────────────────────────────┘    │
│                                          │
└─────────────────────────────────────────┘
```

---

## 📈 Scalability Considerations

### Current Capacity

- **Users:** 10-20 concurrent
- **Messages:** Unlimited (PostgreSQL)
- **Polling:** 1 request per 5 seconds per user
- **Database:** Supabase free tier

### Scaling Path

1. **Phase 1: 100 users**
   - Switch to WebSockets
   - Add message pagination
   - Upgrade Supabase tier

2. **Phase 2: 1,000 users**
   - Add Redis caching
   - Implement CDN
   - Database read replicas

3. **Phase 3: 10,000+ users**
   - Microservices architecture
   - Message queue (RabbitMQ)
   - Horizontal scaling

---

## 🎓 Technology Choices

### Why Next.js?
- ✅ Server-side rendering
- ✅ API routes (future)
- ✅ Excellent developer experience
- ✅ Easy deployment (Vercel)

### Why Supabase?
- ✅ PostgreSQL (powerful, reliable)
- ✅ Built-in auth (future)
- ✅ Realtime subscriptions available
- ✅ Great free tier

### Why Polling?
- ✅ Simple to implement
- ✅ No WebSocket complexity
- ✅ Perfect for demos
- ✅ Easy to debug

### Why TypeScript?
- ✅ Type safety
- ✅ Better IDE support
- ✅ Catch errors early
- ✅ Self-documenting code

---

This architecture is designed to be:
- **Simple** - Easy to understand and maintain
- **Scalable** - Clear path to handle more users
- **Flexible** - Easy to add new features
- **Reliable** - PostgreSQL for data integrity
- **Modern** - Using latest best practices

**Perfect for a hackathon demo, ready for production! 🚀**

