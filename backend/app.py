# app.py
"""
FastAPI backend exposing unified endpoints for:
- /create_ticket : clone or load repo for a ticket
- /command       : execute @chat, @make_plan, @dev

This version correctly assumes:
- Gemini CLI uses: gemini -p "<prompt>" --resume=<session_uuid>
- All session handling lives inside gemini_module.py
- SSE is used to stream Gemini output line-by-line

"""


# tests/test_create_ticket.py

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


import os
import subprocess
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from sse_starlette import EventSourceResponse

# Import updated Gemini helpers (these call `gemini ... --resume=<session>`)
from gemini_module import gemini_chat, gemini_make_plan, gemini_dev

app = FastAPI()


# ==================================================
# Models
# ==================================================
class CommandRequest(BaseModel):
    ticket_id: str
    action: str              # "chat", "make_plan", "dev"
    message: Optional[str] = None


# ==================================================
# Helpers
# ==================================================
def ensure_workspace(ticket_id: str) -> Optional[str]:
    """
    Validate that ./tickets/<ticket_id> exists.
    Return path or None.
    """
    path = f"./tickets/{ticket_id}"
    return path if os.path.exists(path) else None


# ==================================================
# Endpoints
# ==================================================

@app.post("/create_ticket")
def create_ticket_endpoint(ticket_id: str, repo_url: str):
    """
    Create or load a ticket workspace:
    - If exists → pull latest + prepare ticket branch
    - If new   → clone repo + create ticket branch
    """
    path = f"./tickets/{ticket_id}"
    branch_name = f"ticket_{ticket_id}"

    # Case 1: Repo already exists → update
    if os.path.exists(path) and os.listdir(path):
        subprocess.run(["git", "pull"], cwd=path)
        subprocess.run(["git", "checkout", "-B", branch_name], cwd=path)

        return {
            "status": "ok",
            "ticket_id": ticket_id,
            "message": "Existing ticket loaded and branch prepared."
        }

    # Case 2: New ticket → clone repo
    os.makedirs(path, exist_ok=True)
    subprocess.run(["git", "clone", repo_url, path])
    subprocess.run(["git", "checkout", "-b", branch_name], cwd=path)

    return {
        "status": "ok",
        "ticket_id": ticket_id,
        "message": "New ticket created, repo cloned, and branch initialized."
    }


@app.post("/command")
def handle_command(cmd: CommandRequest):
    """
    Unified SSE endpoint for:
        @chat
        @make_plan
        @dev

    Streams Gemini output (line-by-line).
    """

    ticket_id = cmd.ticket_id
    action = cmd.action
    message = cmd.message

    # Ensure workspace exists
    workspace = ensure_workspace(ticket_id)
    if workspace is None:

        def err_stream():
            yield f"data: Workspace for ticket '{ticket_id}' does not exist. Call /create_ticket.\n\n"
            yield "data: __END__\n\n"

        return EventSourceResponse(err_stream())

    # Always ensure the correct branch
    branch_name = f"ticket_{ticket_id}"
    subprocess.run(["git", "checkout", "-B", branch_name], cwd=workspace)

    # Map action to Gemini handler
    if action == "chat":
        generator = gemini_chat(ticket_id, message)

    elif action == "make_plan":
        generator = gemini_make_plan(ticket_id)

    elif action == "dev":
        generator = gemini_dev(ticket_id)

    else:
        def err_stream():
            yield f"data: Unknown action '{action}'\n\n"
            yield "data: __END__\n\n"
        return EventSourceResponse(err_stream())

    # --- Wrap generator output into valid SSE stream ---
    def event_stream():
        for line in generator:
            yield f"data: {line.strip()}\n\n"
        yield "data: __END__\n\n"

    return EventSourceResponse(event_stream())
