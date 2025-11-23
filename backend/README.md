# Backend - AI Code Generation Service

FastAPI backend that provides AI-powered code generation capabilities through the Gemini CLI.

## 🎯 Overview

This backend service enables:
- **@chat** - Quick Q&A responses for developers
- **@make_plan** - Generate implementation plans
- **@dev** - Implement plans and create GitHub PRs

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         FastAPI Backend                 │
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ /create_ticket│  │  /command    │   │
│  │              │  │              │   │
│  │ Clone repo   │  │ Execute cmd  │   │
│  └──────┬───────┘  └──────┬───────┘   │
│         │                  │            │
│         ▼                  ▼            │
│  ┌─────────────────────────────────┐  │
│  │      gemini_module.py           │  │
│  │                                 │  │
│  │  - gemini_chat()                │  │
│  │  - gemini_make_plan()           │  │
│  │  - gemini_dev()                 │  │
│  └────────────┬────────────────────┘  │
│               │                        │
└───────────────┼────────────────────────┘
                │
                ▼
         ┌──────────────┐
         │  Gemini CLI  │
         │              │
         │  AI Agent    │
         └──────────────┘
                │
                ▼
         ┌──────────────┐
         │ Git + GitHub │
         │              │
         │  gh CLI      │
         └──────────────┘
```

## 📦 Installation

### Prerequisites

1. **Python 3.8+**
   ```bash
   python --version
   ```

2. **Gemini CLI** (install separately)
   ```bash
   # Follow Gemini installation instructions
   gemini --version
   ```

3. **GitHub CLI**
   ```bash
   # macOS
   brew install gh
   
   # Linux
   sudo apt install gh
   
   # Verify
   gh --version
   ```

4. **Git**
   ```bash
   git --version
   ```

### Setup

1. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure GitHub CLI:**
   ```bash
   gh auth login
   # Follow prompts to authenticate
   ```

3. **Configure Git:**
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

## 🚀 Running the Server

### Development

```bash
uvicorn app:app --reload --port 8000
```

### Production

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
```

### With Custom Port

```bash
uvicorn app:app --reload --port 8001
```

## 📡 API Endpoints

### 1. Create Ticket Workspace

**Endpoint:** `POST /create_ticket`

**Description:** Clone or load a repository for a ticket.

**Request:**
```json
{
  "ticket_id": "REL-123",
  "repo_url": "https://github.com/user/repo.git"
}
```

**Response:**
```json
{
  "status": "ok",
  "ticket_id": "REL-123",
  "message": "New ticket created, repo cloned, and branch initialized."
}
```

**What it does:**
- Creates `./tickets/{ticket_id}/` directory
- Clones repository (or pulls if exists)
- Creates/checks out branch `ticket_{ticket_id}`

### 2. Execute Command

**Endpoint:** `POST /command`

**Description:** Execute AI commands with SSE streaming.

**Request:**
```json
{
  "ticket_id": "REL-123",
  "action": "chat",
  "message": "How do I implement validation?"
}
```

**Actions:**
- `"chat"` - Quick Q&A (requires `message`)
- `"make_plan"` - Generate implementation plan
- `"dev"` - Implement plan and create PR

**Response:** Server-Sent Events (SSE) stream

```
data: Line 1 of output
data: Line 2 of output
data: ...
data: __END__
```

## 🔧 Configuration

### Environment Variables

Create `.env` file (optional):

```bash
# Port (default: 8000)
PORT=8000

# Tickets directory (default: ./tickets)
TICKETS_ROOT=./tickets
```

### Directory Structure

```
backend/
├── app.py              # FastAPI application
├── gemini_module.py    # Gemini CLI integration
├── requirements.txt    # Python dependencies
├── tickets/           # Ticket workspaces (created automatically)
│   ├── REL-123/       # Cloned repository for REL-123
│   ├── REL-124/       # Cloned repository for REL-124
│   └── ...
└── README.md          # This file
```

## 🧪 Testing

### Manual Testing

1. **Test server health:**
   ```bash
   curl http://localhost:8000/
   ```

2. **Test ticket creation:**
   ```bash
   curl -X POST http://localhost:8000/create_ticket \
     -H "Content-Type: application/json" \
     -d '{"ticket_id": "TEST-1", "repo_url": "https://github.com/user/repo.git"}'
   ```

3. **Test chat command:**
   ```bash
   curl -X POST http://localhost:8000/command \
     -H "Content-Type: application/json" \
     -d '{"ticket_id": "TEST-1", "action": "chat", "message": "Hello"}'
   ```

### Automated Testing

Run the test suite:

```bash
python test.py
```

See `TEST_RESULTS.md` for test results.

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port 8000
lsof -ti:8000

# Kill the process
lsof -ti:8000 | xargs kill -9

# Or use a different port
uvicorn app:app --reload --port 8001
```

### Gemini CLI Not Found

```bash
# Check if Gemini is installed
which gemini

# If not found, install Gemini CLI
# Follow official Gemini installation guide
```

### GitHub CLI Not Authenticated

```bash
# Check authentication status
gh auth status

# Login if needed
gh auth login
```

### Repository Clone Fails

```bash
# Check git credentials
git config --list

# Test manual clone
git clone https://github.com/user/repo.git test_clone

# Check SSH keys (if using SSH)
ssh -T git@github.com
```

### Permission Denied on tickets/

```bash
# Fix permissions
chmod 755 tickets/

# Or recreate directory
rm -rf tickets/
mkdir tickets/
```

## 📊 Monitoring

### Logs

The backend logs to stdout. View logs:

```bash
# If running with uvicorn
# Logs appear in terminal

# If running as service
journalctl -u backend -f
```

### Health Check

```bash
# Simple health check
curl http://localhost:8000/

# Check if tickets directory exists
ls -la tickets/

# Check Gemini sessions
cd tickets/REL-123/
gemini --list-sessions
```

## 🔐 Security

### Current (Development)

- No authentication
- Runs on localhost
- Direct file system access

### Production Recommendations

1. **Add API Key Authentication:**
   ```python
   from fastapi import Header, HTTPException
   
   async def verify_api_key(x_api_key: str = Header(...)):
       if x_api_key != os.getenv("API_KEY"):
           raise HTTPException(status_code=401)
   ```

2. **Enable CORS:**
   ```python
   from fastapi.middleware.cors import CORSMiddleware
   
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://your-frontend.com"],
       allow_methods=["POST"],
       allow_headers=["*"],
   )
   ```

3. **Rate Limiting:**
   ```python
   from slowapi import Limiter
   
   limiter = Limiter(key_func=get_remote_address)
   app.state.limiter = limiter
   ```

4. **Input Validation:**
   - Validate ticket IDs (alphanumeric + dash)
   - Validate repo URLs (GitHub only)
   - Sanitize file paths

## 🚀 Deployment

### Docker (Recommended)

Create `Dockerfile`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh

# Install Gemini CLI (follow official instructions)

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create tickets directory
RUN mkdir -p tickets

# Expose port
EXPOSE 8000

# Run server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t backend .
docker run -p 8000:8000 -v $(pwd)/tickets:/app/tickets backend
```

### Railway / Render

1. Connect GitHub repository
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
4. Add environment variables (if needed)

### VPS (Ubuntu)

```bash
# Install dependencies
sudo apt update
sudo apt install python3-pip git gh

# Install Gemini CLI

# Clone repository
git clone https://github.com/your/repo.git
cd repo/backend

# Install Python packages
pip3 install -r requirements.txt

# Create systemd service
sudo nano /etc/systemd/system/backend.service
```

Service file:

```ini
[Unit]
Description=Backend API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/repo/backend
ExecStart=/usr/local/bin/uvicorn app:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable backend
sudo systemctl start backend
sudo systemctl status backend
```

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Gemini CLI](https://github.com/gemini/cli)
- [GitHub CLI](https://cli.github.com/)
- [SSE Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)

## 🤝 Contributing

When modifying the backend:

1. Update this README
2. Test all three commands
3. Verify SSE streaming works
4. Check error handling
5. Update `TEST_RESULTS.md`

---

**Last Updated:** November 23, 2025  
**Version:** 1.0.0

