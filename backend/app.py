# app.py
"""
FastAPI backend exposing unified endpoints for:
- /create_ticket: Clone or update repo for a ticket
- /command: Execute @chat, @make_plan, @dev commands
Safety checks included.
"""

import os
import subprocess
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from gemini_module import gemini_chat, gemini_make_plan, gemini_dev

app = FastAPI()

class CommandRequest(BaseModel):
    ticket_id: str
    action: str
    message: Optional[str] = None


def ensure_workspace(ticket_id: str) -> Optional[str]:
    """
    Validate that a workspace exists for the given ticket.
    Returns the workspace path or None if missing.
    """
    path = f"./tickets/{ticket_id}"
    if not os.path.exists(path):
        return None
    return path


@app.post("/create_ticket")
def create_ticket_endpoint(ticket_id: str, repo_url: str):
    """
    Create or load a ticket workspace.
    If repo already exists: pull latest & prepare branch.
    If not: clone fresh repo & initialize new branch.
    """
    path = f"./tickets/{ticket_id}"
    branch_name = f"ticket_{ticket_id}"

    # CASE 1: Ticket exists
    if os.path.exists(path) and os.listdir(path):
        subprocess.run(["git", "pull"], cwd=path)
        subprocess.run(["git", "checkout", "-B", branch_name], cwd=path)
        return {
            "status": "ok",
            "ticket_id": ticket_id,
            "message": "Existing ticket loaded and branch prepared."
        }

    # CASE 2: New ticket
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
    Handle AI commands for a given ticket.
    Ensures workspace exists and switches to the correct branch.
    """
    ticket_id = cmd.ticket_id
    action = cmd.action
    message = cmd.message

    workspace = ensure_workspace(ticket_id)
    if workspace is None:
        return {
            "status": "error",
            "message": f"Workspace for ticket {ticket_id} does not exist. Call /create_ticket first."
        }

    # Checkout correct branch
    branch_name = f"ticket_{ticket_id}"
    subprocess.run(["git", "checkout", "-B", branch_name], cwd=workspace)

    # Execute action
    if action == "chat":
        output = list(gemini_chat(ticket_id, message))
        return {"status": "ok", "output": output}

    elif action == "make_plan":
        output = list(gemini_make_plan(ticket_id))
        return {"status": "ok", "output": output}

    elif action == "dev":
        output = list(gemini_dev(ticket_id))
        return {"status": "ok", "output": output}

    else:
        return {"status": "error", "message": f"Unknown action: {action}"}