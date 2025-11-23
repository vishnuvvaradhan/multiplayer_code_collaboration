# PR Tab Setup Guide

## TLDR Setup for PR Tab

### 1. GitHub OAuth App
```bash
# In frontend/.env.local
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

### 2. Connect GitHub in UI
- Open "Create a Chat" → Repository step
- Click "Connect GitHub" (if not configured yet)
- Complete OAuth flow

### 3. PR Requirements
- Ticket must have `github_url`
- PR branch named `ticket_{ticketId}` (e.g., `ticket_COD-35`)
- PR exists in that repo

**Result**: PR tab shows real GitHub data (status, checks, comments) without needing stored PR links.
