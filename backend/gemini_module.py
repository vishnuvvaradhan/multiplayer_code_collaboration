# gemini_module.py
"""
Gemini CLI helper module for hackathon backend.

Provides per-ticket sessions and supports three commands:
- @chat → small, safe conversational interactions (no code changes)
- @plan → generate/update plan.md (thinking step)
- @dev  → implement plan, apply diffs, commit changes

This module abstracts all Gemini CLI interactions in a clean, deterministic way.
"""

import os
import subprocess
from typing import Generator, List, Dict


SESSION_STORE: Dict[str, str] = {}   # In-memory session store, maps session IDs to ticket IDs that way we can maintain correct sessions per chat 
TICKETS_ROOT = "./tickets"           # Root directory for all ticket repos


def get_or_create_session(ticket_id: str) -> str:
    """
    Return an existing session for a ticket OR create a new one.
    Using deterministic session string simplifies debugging.
    """
    if ticket_id in SESSION_STORE:
        return SESSION_STORE[ticket_id]

    session_id = f"session_{ticket_id}"
    SESSION_STORE[ticket_id] = session_id
    return session_id



def stream_subprocess(cmd: List[str], cwd: str) -> Generator[str, None, None]:
    """
    Run a subprocess and stream stdout line-by-line.
    This allows the frontend to display AI output incrementally.
    """
    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    if proc.stdout:
        for line in proc.stdout:
            yield line

    proc.wait()


def run_gemini_cmd(ticket_id: str, args: List[str]) -> Generator[str, None, None]:
    """
    Execute a Gemini CLI command inside the ticket repo workspace.
    Ensures correct session and working directory.
    """
    workspace = os.path.join(TICKETS_ROOT, ticket_id)
    if not os.path.exists(workspace):
        yield f"Error: workspace for ticket {ticket_id} not found. Run /create_ticket first."
        return

    session_id = get_or_create_session(ticket_id)
    full_cmd = ["genai"] + args + [f"--session={session_id}"]

    yield from stream_subprocess(full_cmd, cwd=workspace)



def gemini_chat(ticket_id: str, prompt: str) -> Generator[str, None, None]:
    """
    Handle @chat:
    Safe conversational queries — no repo changes or commits.
    Useful for explanations, small suggestions, debugging help.
    """
    if not prompt:
        yield "Error: @chat requires a message."
        return

    cmd = ["code", "chat", "--dir", ".", f"--prompt={prompt}"]
    yield from run_gemini_cmd(ticket_id, cmd)


#TODO: Need to fetch context from somewhere, eyal maybe figure out where to store chat history, needs to be ticket_id -> chat history or some mapping lmk
def get_chat_context(ticket_id: str) -> str:
    """
    TODO: Fetch and compile chat history for the ticket.
    This will eventually enrich @plan with discussion context.
    """
    return ""  



def gemini_make_plan(ticket_id: str) -> Generator[str, None, None]:
    """
    Handle @plan:
    Create or update plan.md — AI's structured implementation plan.
    No code modifications occur here.
    """
    workspace = os.path.join(TICKETS_ROOT, ticket_id)

    if not os.path.exists(workspace):
        yield f"Error: workspace for ticket {ticket_id} not found."
        return

    plan_path = os.path.join(workspace, "plan.md")

    # Ensure plan.md exists
    if not os.path.exists(plan_path):
        with open(plan_path, "w") as f:
            f.write("# Implementation Plan\n\n")

    context = get_chat_context(ticket_id)


    #FIX HERE proper prompting for when we eventually figure out how to grab context 
    cmd = ["code", "plan", "plan.md", f"--prompt={context}"]

    yield from run_gemini_cmd(ticket_id, cmd)


def gemini_dev(ticket_id: str) -> Generator[str, None, None]:
    """
    Handle @dev:
    Applies the plan, commits code, pushes branch, and creates/updates a GitHub PR
    using the local GitHub CLI (gh). Assumes user is already authenticated.
    """

    workspace = os.path.join(TICKETS_ROOT, ticket_id)
    if not os.path.exists(workspace):
        yield f"Error: workspace for ticket {ticket_id} not found."
        return

    plan_path = os.path.join(workspace, "plan.md")
    if not os.path.exists(plan_path):
        yield "Error: plan.md not found. Run @plan first."
        return


    cmd = ["code", "apply", "plan.md"]

    yield from run_gemini_cmd(ticket_id, cmd)


    subprocess.run(["git", "add", "."], cwd=workspace)
    subprocess.run(["git", "commit", "-m", "AI-generated implementation"], cwd=workspace)

    yield "Changes committed. Preparing PR...\n"

    branch_name = f"ticket_{ticket_id}"

 
    subprocess.run(
        ["git", "push", "--set-upstream", "origin", branch_name],
        cwd=workspace
    )

    yield f"Branch '{branch_name}' pushed to remote.\n"

    # check pr existence
    pr_view = subprocess.run(
        ["gh", "pr", "view", branch_name, "--json", "url"],
        cwd=workspace,
        capture_output=True,
        text=True
    )

    if pr_view.returncode == 0:
        # PR already exists
        import json
        pr_url = json.loads(pr_view.stdout)["url"]
        yield f"Existing PR detected: {pr_url}\n"
        yield "PR updated with new commits.\n"
        return

    #if not we just create new pr here...
    pr_create = subprocess.run(
        [
            "gh", "pr", "create",
            "--head", branch_name,
            "--base", "main",
            "--title", f"AI Implementation for Ticket {ticket_id}",
            "--body", "This PR was generated automatically via @dev."
        ],
        cwd=workspace,
        capture_output=True,
        text=True
    )

    if pr_create.returncode != 0:
        yield "Error creating PR:\n"
        yield pr_create.stderr
        return

    yield pr_create.stdout
    yield "Pull request created successfully.\n"
