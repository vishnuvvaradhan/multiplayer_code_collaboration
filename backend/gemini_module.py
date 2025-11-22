# gemini_module.py
"""
Gemini CLI helper module for hackathon backend.

Handles:
- @chat  → conversational prompt (NO guaranteed code changes)
- @plan  → ask Gemini to create/update plan.md
- @dev   → ask Gemini to implement plan.md and then we git commit/push/PR

Uses the Gemini CLI:

    gemini -p "<prompt>" --resume=<session_uuid>

We maintain ONE Gemini session per ticket_id, and reuse it for chat, plan, and dev
so Gemini can accumulate context about the repo and prior discussion.
"""

import os
import re
import json
import subprocess
from typing import Generator, Dict

TICKETS_ROOT = "./tickets"          # Root directory for all ticket repos
SESSION_STORE: Dict[str, str] = {}  # ticket_id -> Gemini session UUID


# -----------------------------------------------------------------------------
# Low-level subprocess streaming
# -----------------------------------------------------------------------------
def stream_subprocess(cmd, cwd: str) -> Generator[str, None, None]:
    """
    Run a subprocess and stream stdout line-by-line.
    This is used so the FastAPI layer can forward output via SSE.
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


# -----------------------------------------------------------------------------
# Session management (real UUID sessions)
# -----------------------------------------------------------------------------
def _parse_latest_session_uuid(output: str) -> str:
    """
    Parse `gemini --list-sessions` text output and return the last session's UUID.

    Expected pattern for each session line (example):

      "  5. session_test (Just now) [5a249b28-9b10-499f-94f3-89cca14dc7c5]"

    We scan all lines and keep the last UUID we see.
    """
    uuid = None
    uuid_pattern = re.compile(r"\[([0-9a-fA-F-]{36})\]")

    for line in output.splitlines():
        match = uuid_pattern.search(line)
        if match:
            uuid = match.group(1)

    if uuid is None:
        raise RuntimeError("Could not find any session UUID in `gemini --list-sessions` output.")

    return uuid


def _ensure_workspace(ticket_id: str) -> str:
    """
    Resolve and validate the workspace path for a ticket.
    """
    workspace = os.path.join(TICKETS_ROOT, ticket_id)
    if not os.path.exists(workspace):
        raise FileNotFoundError(f"Workspace for ticket '{ticket_id}' not found.")
    return workspace


def get_or_create_session(ticket_id: str) -> str:
    """
    Return existing session UUID for this ticket OR create a brand-new
    Gemini session in this ticket's workspace.

    Implementation:
      1. If SESSION_STORE has ticket_id -> session_uuid, return it.
      2. Else:
         a) Run a dummy prompt to force-create a new session in this repo.
         b) Call `gemini --list-sessions`.
         c) Parse the output, get the latest session's UUID.
         d) Cache it in SESSION_STORE and return.
    """
    if ticket_id in SESSION_STORE:
        return SESSION_STORE[ticket_id]

    workspace = _ensure_workspace(ticket_id)

    # Step (a): create a new session by sending a simple initialization prompt
    init_prompt = f"Initialize a long-lived development session for ticket {ticket_id}."
    subprocess.run(
        ["gemini", "-p", init_prompt],
        cwd=workspace,
        capture_output=True,
        text=True,
    )

    # Step (b): list sessions
    list_proc = subprocess.run(
        ["gemini", "--list-sessions"],
        cwd=workspace,
        capture_output=True,
        text=True,
    )
    if list_proc.returncode != 0:
        raise RuntimeError(
            f"Failed to list sessions for ticket '{ticket_id}': {list_proc.stderr}"
        )

    # Step (c): parse latest UUID
    session_uuid = _parse_latest_session_uuid(list_proc.stdout)

    print(session_uuid)

    # Step (d): cache and return
    SESSION_STORE[ticket_id] = session_uuid
    return session_uuid


def run_gemini_prompt(ticket_id: str, prompt: str) -> Generator[str, None, None]:
    """
    Core wrapper around the Gemini CLI.

    Always:
      - ensures workspace exists
      - ensures a session UUID exists for this ticket
      - runs: gemini -p "<prompt>" --resume=<session_uuid>
    """
    try:
        workspace = _ensure_workspace(ticket_id)
    except FileNotFoundError as e:
        yield f"Error: {e}\n"
        return

    try:
        session_uuid = get_or_create_session(ticket_id)
    except Exception as e:
        yield f"Error: failed to create/resume session for ticket '{ticket_id}': {e}\n"
        return

    cmd = [
        "gemini",
        "-p",
        prompt,
        f"--resume={session_uuid}",
        # You can add output format if you want structured streaming later:
        # "--output-format=stream-json",
    ]

    yield from stream_subprocess(cmd, cwd=workspace)


# -----------------------------------------------------------------------------
# @chat — conversational, no explicit code edits required
# -----------------------------------------------------------------------------
def gemini_chat(ticket_id: str, prompt: str) -> Generator[str, None, None]:
    """
    Handle @chat:
    - Uses the per-ticket Gemini session (so it remembers prior Q&A and repo context).
    - Designed for explanation/debugging, not guaranteed to change files.
    """
    if not prompt:
        yield "Error: @chat requires a message.\n"
        return

    system_prompt = (
        "You are a helpful coding assistant working inside a collaborative ticket.\n"
        "Answer questions about this repository and the ticket context.\n"
        "Unless explicitly requested, do NOT modify any files.\n"
    )

    full_prompt = f"{system_prompt}\n\nUser message:\n{prompt}"
    yield from run_gemini_prompt(ticket_id, full_prompt)


# -----------------------------------------------------------------------------
# @plan — generate or update plan.md (thinking step)
# -----------------------------------------------------------------------------
def get_chat_context(ticket_id: str) -> str:
    """
    TODO: integrate with Supabase or other storage.

    For now, returns an empty string. In the future, this should return
    a summarized chat history string for the given ticket_id.
    """
    return ""


def gemini_make_plan(ticket_id: str) -> Generator[str, None, None]:
    """
    Handle @plan:
    - Make sure plan.md exists.
    - Ask Gemini (within the same session) to create or update plan.md.
    - We rely on Gemini's tools to open/edit that file in the workspace.
    """
    try:
        workspace = _ensure_workspace(ticket_id)
    except FileNotFoundError as e:
        yield f"Error: {e}\n"
        return

    plan_path = os.path.join(workspace, "plan.md")

    # Ensure plan.md exists so Gemini has a target file
    if not os.path.exists(plan_path):
        with open(plan_path, "w") as f:
            f.write("# Implementation Plan\n\n")

    context = get_chat_context(ticket_id)

    prompt_text = (
        "You are the planning agent for this ticket.\n"
        "Your job is to write or update `plan.md` in this repository with a clear,\n"
        "step-by-step implementation plan for the current ticket.\n"
        "- Do NOT modify any source code files in this step.\n"
        "- Only create or update `plan.md`.\n\n"
        f"Here is some (optional) prior chat context:\n{context}\n"
    )

    yield from run_gemini_prompt(ticket_id, prompt_text)


# -----------------------------------------------------------------------------
# @dev — implement the plan (code edits, commit, push, PR)
# -----------------------------------------------------------------------------
def gemini_dev(ticket_id: str) -> Generator[str, None, None]:
    """
    Handle @dev:

    We:
      - Ensure plan.md exists.
      - Ask Gemini (same session) to read plan.md and apply code changes.
      - Then we git add/commit/push and create/update a GitHub PR via `gh`.

    NOTE:
      This assumes you trust Gemini to use its internal tools to edit files.
      For a more deterministic approach, you could instead have Gemini produce
      a unified diff and apply it yourself (git apply) before committing.
    """
    try:
        workspace = _ensure_workspace(ticket_id)
    except FileNotFoundError as e:
        yield f"Error: {e}\n"
        return

    plan_path = os.path.join(workspace, "plan.md")
    if not os.path.exists(plan_path):
        yield "Error: plan.md not found. Run @plan first.\n"
        return

    prompt_text = (
        "You are the development agent for this ticket.\n"
        "Read `plan.md` in this repository and implement the plan by editing the\n"
        "appropriate source files.\n"
        "- Make all necessary code changes to fully implement the plan.\n"
        "- Do NOT modify `plan.md` itself in this step.\n"
        "- You may run tests or other commands if needed, but keep changes focused.\n"
    )

    # Let Gemini attempt to edit files via its tools inside this session
    yield from run_gemini_prompt(ticket_id, prompt_text)

    # After Gemini finishes, we stage and commit all changes
    subprocess.run(["git", "add", "."], cwd=workspace)
    subprocess.run(["git", "commit", "-m", "AI-generated implementation"], cwd=workspace)

    yield "Changes committed.\n"


    branch_name = f"ticket_{ticket_id}"
    subprocess.run(
        ["git", "push", "--set-upstream", "origin", branch_name],
        cwd=workspace,
    )
    yield f"Branch '{branch_name}' pushed to origin.\n"

 
    pr_view = subprocess.run(
        ["gh", "pr", "view", branch_name, "--json", "url"],
        cwd=workspace,
        capture_output=True,
        text=True,
    )

    if pr_view.returncode == 0:
        try:
            pr_url = json.loads(pr_view.stdout)["url"]
            yield f"Existing PR detected: {pr_url}\n"
            yield "PR updated with new commits.\n"
            return
        except Exception:
            
            pass

    # Otherwise create a new PR
    pr_create = subprocess.run(
        [
            "gh",
            "pr",
            "create",
            "--head",
            branch_name,
            "--base",
            "main",
            "--title",
            f"AI Implementation for Ticket {ticket_id}",
            "--body",
            "This PR was generated automatically via @dev.",
        ],
        cwd=workspace,
        capture_output=True,
        text=True,
    )

    if pr_create.returncode != 0:
        yield "Error creating PR:\n"
        yield pr_create.stderr
        return

    yield pr_create.stdout
    yield "Pull request created successfully.\n"
