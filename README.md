# Multiplayer Code Collaboration Platform

A real-time multiplayer code collaboration platform with chat, Linear integration, and GitHub repository context.

## 🚀 Quick Start

**Want to get started in 5 minutes?** See [QUICK_START.md](QUICK_START.md)

**Need detailed setup?** See [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)

## Project Structure

```
multiplayer_code_collaboration/
├── frontend/              # Next.js application
│   ├── src/
│   │   ├── app/          # Next.js app directory
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks (useMessages)
│   │   └── lib/          # Utilities (supabase, database, linear)
│   └── ...
├── backend/              # Backend (placeholder)
├── supabase_schema.sql   # Database schema
├── QUICK_START.md        # 5-minute setup guide
└── SETUP_INSTRUCTIONS.md # Detailed setup guide
```

## ✨ Features

### Real-Time Chat
- Multi-user collaboration via polling (5-second interval)
- Messages sync across all connected clients
- Support for human, agent, and system messages
- Auto-scroll to latest messages

### Linear Integration
- Fetch existing Linear tickets
- Create new tickets directly from the app
- Sync ticket data to Supabase
- Link tickets to GitHub repositories

### GitHub Integration
- OAuth authentication
- Repository selection and context
- Display repository info in chat header

### Modern UI
- Clean, professional interface
- Slack-inspired sidebar
- Responsive design
- Toast notifications for feedback

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Linear API key (optional)
- GitHub OAuth app (optional)

### Installation

1. **Set up database:**
   ```bash
   # Run supabase_schema.sql in your Supabase SQL Editor
   ```

2. **Configure environment:**
   ```bash
   cd frontend
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Install and run:**
   ```bash
   npm install
   npm run dev
   ```

4. **Open browser:**
   ```
   http://localhost:3000
   ```

### Multi-Computer Demo

For hackathon demos with 3 computers:

**Computer 1:** `NEXT_PUBLIC_USER_NAME=Jane Doe`  
**Computer 2:** `NEXT_PUBLIC_USER_NAME=Mike Kim`  
**Computer 3:** `NEXT_PUBLIC_USER_NAME=Alex Chen`

All computers will see messages from each other in real-time!

## Frontend Features

- ✅ Real-time chat with polling
- ✅ Linear ticket integration
- ✅ GitHub repository context
- ✅ Multi-user collaboration
- ✅ Message history persistence
- ✅ Toast notifications
- ✅ Diff view for code changes
- ✅ Pull request management UI
- ✅ Modern, responsive interface

## Technology Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI Library:** Radix UI
- **Styling:** Tailwind CSS 4
- **Database:** Supabase (PostgreSQL)
- **State Management:** React Hooks
- **Forms:** React Hook Form + Zod
- **Notifications:** Sonner

### Backend (Current)
- **Database:** Supabase PostgreSQL
- **Real-time:** Polling (5-second interval)
- **Authentication:** Environment-based (for demo)

### Integrations
- **Linear API:** Ticket management
- **GitHub API:** Repository context

## Architecture

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Supabase      │
│   (PostgreSQL)  │
└─────────────────┘
         ↑
         │
    Polling every
     5 seconds
```

## Database Schema

### Tickets Table
- `id` - UUID primary key
- `ticket_identifier` - e.g., "REL-123"
- `ticket_name` - Ticket title
- `description` - Ticket description
- `priority` - 0-4 (None, Urgent, High, Medium, Low)
- `github_url` - Repository URL
- `people` - Array of user names
- `created_at` / `updated_at` - Timestamps

### Messages Table
- `id` - UUID primary key
- `ticket_id` - Foreign key to tickets
- `user_or_agent` - Author name
- `message_type` - human, agent, system, etc.
- `content` - Message text
- `metadata` - JSON for avatars, agent types, etc.
- `timestamp` - Message timestamp
- `created_at` - Record creation time

## Development

### Running Locally

```bash
cd frontend
npm run dev
```

### Environment Variables

See `.env.example` for required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_USER_NAME` - Current user name (change per computer)
- `NEXT_PUBLIC_POLL_INTERVAL` - Polling interval in ms (default: 5000)
- `NEXT_PUBLIC_LINEAR_API_KEY` - Linear API key (optional)

### Testing Multi-User Chat

1. Open app in 3 different browsers/computers
2. Set different `NEXT_PUBLIC_USER_NAME` for each
3. Create/select the same ticket on all instances
4. Send messages and watch them sync!

## Future Enhancements

- [ ] Replace polling with WebSockets (Supabase Realtime)
- [ ] Add user authentication
- [ ] Implement AI agents (Architect & Dev)
- [ ] Real-time code synchronization
- [ ] File attachments in chat
- [ ] Voice/video integration
- [ ] Code diff generation
- [ ] Automated PR creation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For setup help, see:
- [QUICK_START.md](QUICK_START.md) - Fast 5-minute setup
- [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) - Detailed guide
