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
import time
from typing import Generator, Dict
from database import get_messages_by_ticket_identifier, format_chat_history

TICKETS_ROOT = "./tickets"          # Root directory for all ticket repos
SESSION_STORE: Dict[str, str] = {}  # ticket_id -> Gemini session UUID


# -----------------------------------------------------------------------------
# Low-level subprocess streaming
# -----------------------------------------------------------------------------
def stream_subprocess(cmd, cwd: str) -> Generator[str, None, None]:
    """
    Run a subprocess and stream stdout line-by-line.
    This is used so the FastAPI layer can forward output via SSE.
    Filters out Gemini's own "data:" prefixes to avoid double-wrapping.
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
            # Remove "data: " prefix if Gemini CLI adds it
            cleaned_line = line
            if cleaned_line.strip().startswith('data:'):
                cleaned_line = cleaned_line.strip()[5:].strip()  # Remove "data:" prefix
            
            # Skip empty lines and __END__ markers from Gemini
            if cleaned_line.strip() and cleaned_line.strip() != '__END__':
                yield cleaned_line

    proc.wait()


# -----------------------------------------------------------------------------
# Session management (real UUID sessions)
# -----------------------------------------------------------------------------
def _parse_latest_session_uuid(stdout: str, stderr: str) -> str:
    """
    Parse `gemini --list-sessions` text output and return the last session's UUID.

    Expected pattern for each session line (example):

      "  5. session_test (Just now) [5a249b28-9b10-499f-94f3-89cca14dc7c5]"

    We scan all lines and keep the last UUID we see.
    Note: The output may be in stdout OR stderr depending on the CLI version.
    """
    uuid = None
    uuid_pattern = re.compile(r"\[([0-9a-fA-F-]{36})\]")
    
    # Check both stdout and stderr
    combined_output = stdout + stderr

    for line in combined_output.splitlines():
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
    
    # Wait for session to be registered
    time.sleep(1)

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

    # Step (c): parse latest UUID (check both stdout and stderr)
    session_uuid = _parse_latest_session_uuid(list_proc.stdout, list_proc.stderr)

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
    - Includes conversation history for context.
    - Designed for explanation/debugging, not guaranteed to change files.
    """
    if not prompt:
        yield "Error: @chat requires a message.\n"
        return

    # Get conversation history for context
    try:
        messages = get_messages_by_ticket_id(ticket_id)
        chat_history = format_chat_history(messages)
    except Exception as e:
        chat_history = f"Error retrieving chat history: {e}"

    system_prompt = (
        "You are a helpful coding assistant working inside a collaborative ticket.\n"
        "You have access to the conversation history and repository context.\n"
        "Answer questions about this repository and help with development tasks.\n"
        "Unless explicitly requested, do NOT modify any files.\n"
        "Be aware of the ongoing conversation and previous discussions.\n"
    )

    full_prompt = f"{system_prompt}\n\nConversation History:\n{chat_history}\n\nCurrent User Message:\n{prompt}"
    yield from run_gemini_prompt(ticket_id, full_prompt)


# -----------------------------------------------------------------------------
# @plan — generate or update plan.md (thinking step)
# -----------------------------------------------------------------------------
def get_chat_context(ticket_id: str) -> str:
    """
    Get the chat history for a ticket to provide context for planning and development.
    Returns formatted conversation history from Supabase.
    ticket_id can be either a UUID or human-readable identifier (e.g., "COD-28")
    """
    try:
        messages = get_messages_by_ticket_identifier(ticket_id)
        return format_chat_history(messages)
    except Exception as e:
        print(f"Error fetching chat context for ticket {ticket_id}: {e}")
        return "Error: Could not retrieve conversation history."


def gemini_make_plan(ticket_id: str) -> Generator[str, None, None]:
    """
    Handle @plan:
    - Make sure plan.md exists.
    - Ask Gemini (within the same session) to create or update plan.md.
    - Capture Gemini's output and write it to plan.md.
    - Also yield the output for SSE streaming.
    """
    try:
        workspace = _ensure_workspace(ticket_id)
    except FileNotFoundError as e:
        yield f"Error: {e}\n"
        return

    plan_path = os.path.join(workspace, "plan.md")

    context = get_chat_context(ticket_id)

    prompt_text = (
        "You are a planning agent. Create an implementation plan for this ticket.\n\n"
        "IMPORTANT: Do NOT use any tools. Do NOT try to write files. "
        "Just respond with plain text markdown content that I will save.\n\n"
        f"Ticket requirements:\n{context}\n\n"
        "Please provide a detailed plan with:\n"
        "1. Overview/Goal\n"
        "2. Step-by-step tasks\n"
        "3. Files to modify/create\n"
        "4. Implementation notes\n\n"
        "Start your response with the plan content now:"
    )

    # Collect all output from Gemini AND write incrementally to plan.md
    collected_output = []
    
    # Open the file for writing as we collect (this will overwrite any existing file)
    with open(plan_path, "w") as plan_file:
        plan_file.write("# Implementation Plan\n\n")
        plan_file.flush()  # Ensure header is written immediately
        
        for line in run_gemini_prompt(ticket_id, prompt_text):
            collected_output.append(line)
            # Write each line to the file as we go
            plan_file.write(line)
            plan_file.flush()  # Flush after each line to ensure it's written
            yield line  # Stream to SSE
    
    # File is now written! Calculate stats
    full_plan = "".join(collected_output)
    
    yield f"\n✅ Plan written to plan.md ({len(full_plan)} characters)\n"


# -----------------------------------------------------------------------------
# @dev — implement the plan (code edits, commit, push, PR)
# -----------------------------------------------------------------------------
def gemini_dev(ticket_id: str) -> Generator[str, None, None]:
    """
    Handle @dev:

    We:
      - Ensure plan.md exists.
      - Ask Gemini to generate structured JSON edits based on plan.md.
      - Apply each edit using search/replace.
      - Save the changes JSON for reference.
      - Then git add/commit/push and create/update a GitHub PR via `gh`.
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

    changes_filename = f"{ticket_id}_changes.json"
    changes_path = os.path.join(workspace, changes_filename)

    prompt_text = (
        "You are the development agent for this ticket.\n"
        "Read `plan.md` in this repository and generate structured edits to implement the plan.\n\n"
        "CRITICAL REQUIREMENTS:\n"
        "- Output ONLY valid JSON (no markdown, no code fences, no explanations)\n"
        "- Use this exact structure:\n"
        "{\n"
        '  "files": [\n'
        "    {\n"
        '      "path": "relative/path/to/file.ext",\n'
        '      "changes": [\n'
        "        {\n"
        '          "search": "exact text to find (can be multiple lines)",\n'
        '          "replace": "exact text to replace with (can be multiple lines)"\n'
        "        }\n"
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        "IMPORTANT:\n"
        "- Each 'search' string must be unique and match EXACTLY (including whitespace)\n"
        "- Include enough context in 'search' to make it unique (5-10 lines)\n"
        "- 'replace' should be the complete replacement text\n"
        "- Use \\n for newlines in JSON strings\n"
        "- Do NOT modify `plan.md` itself\n"
        "- Output ONLY the JSON, nothing else\n\n"
        "Generate the changes JSON now:"
    )

    # Collect the JSON output from Gemini
    collected_output = []
    
    for line in run_gemini_prompt(ticket_id, prompt_text):
        collected_output.append(line)
        yield line  # Stream to SSE

    json_content = "".join(collected_output).strip()
    
    # Clean up - remove markdown code fences if present
    if json_content.startswith("```json"):
        json_content = json_content[7:].lstrip()
    elif json_content.startswith("```"):
        json_content = json_content[3:].lstrip()
    
    if json_content.endswith("```"):
        json_content = json_content[:-3].rstrip()
    
    # Parse the JSON
    try:
        changes_data = json.loads(json_content)
    except json.JSONDecodeError as e:
        yield f"\n❌ Failed to parse JSON: {e}\n"
        yield "Saving raw output for debugging...\n"
        with open(changes_path, "w") as f:
            f.write(json_content)
        return
    
    # Save the changes JSON for reference
    with open(changes_path, "w") as f:
        json.dump(changes_data, f, indent=2)
    
    yield f"\n✅ Changes JSON generated: {changes_filename}\n"
    
    # Apply each change
    files_changed = 0
    total_changes = 0
    
    yield "\n📝 Applying changes to files...\n"
    
    for file_entry in changes_data.get("files", []):
        file_path = os.path.join(workspace, file_entry["path"])
        
        yield f"\n🔍 Processing: {file_entry['path']}\n"
        
        if not os.path.exists(file_path):
            yield f"⚠️  File not found: {file_path}\n"
            yield f"   (Looking in workspace: {workspace})\n"
            continue
        
        # Read the file
        with open(file_path, "r") as f:
            content = f.read()
        
        original_content = content
        changes_applied = 0
        
        # Apply each change
        for idx, change in enumerate(file_entry.get("changes", []), 1):
            search_text = change.get("search", "")
            replace_text = change.get("replace", "")
            
            if not search_text and replace_text:
                # This is a new file creation
                content = replace_text
                changes_applied += 1
                total_changes += 1
                yield f"   ✅ Change {idx}: Creating new file content\n"
            elif search_text in content:
                content = content.replace(search_text, replace_text, 1)  # Replace only first occurrence
                changes_applied += 1
                total_changes += 1
                yield f"   ✅ Change {idx}: Applied successfully\n"
            else:
                yield f"   ⚠️  Change {idx}: Search text not found, skipping...\n"
                # Show first 100 chars of search text for debugging
                search_preview = search_text[:100].replace('\n', '\\n')
                yield f"      Looking for: {search_preview}...\n"
        
        # Write back if changes were made
        if content != original_content:
            with open(file_path, "w") as f:
                f.write(content)
            files_changed += 1
            yield f"✅ Saved {file_entry['path']} with {changes_applied} change(s)\n"
        else:
            yield f"⚠️  No changes applied to {file_entry['path']}\n"
    
    yield f"\n✅ Total: {total_changes} changes applied across {files_changed} file(s)\n"

    # Check if gh CLI is available
    gh_check = subprocess.run(
        ["which", "gh"],
        capture_output=True,
        text=True
    )
    
    if gh_check.returncode != 0:
        yield "\n⚠️  GitHub CLI (gh) not found. Please install it to create PRs automatically.\n"
        yield "Install instructions: https://cli.github.com/\n"
        yield "For now, changes have been applied locally. You can manually commit and push.\n"
        return

    # Stage all changes (excluding the changes JSON file)
    subprocess.run(["git", "add", "."], cwd=workspace)
    
    # Remove the changes JSON from staging
    subprocess.run(["git", "reset", "HEAD", changes_filename], cwd=workspace)
    
    commit_result = subprocess.run(
        ["git", "commit", "-m", f"AI-generated implementation for {ticket_id}"],
        cwd=workspace,
        capture_output=True,
        text=True
    )
    
    if commit_result.returncode != 0:
        yield f"\n⚠️  Git commit failed: {commit_result.stderr}\n"
        return

    yield "Changes committed.\n"

    branch_name = f"ticket_{ticket_id}"
    push_result = subprocess.run(
        ["git", "push", "--set-upstream", "origin", branch_name],
        cwd=workspace,
        capture_output=True,
        text=True
    )
    
    if push_result.returncode != 0:
        yield f"\n⚠️  Git push failed: {push_result.stderr}\n"
        return
        
    yield f"Branch '{branch_name}' pushed to origin.\n"

    # Check if PR already exists
    pr_view = subprocess.run(
        ["gh", "pr", "view", branch_name, "--json", "url"],
        cwd=workspace,
        capture_output=True,
        text=True,
    )

    if pr_view.returncode == 0:
        try:
            pr_url = json.loads(pr_view.stdout)["url"]
            yield f"\n✅ Existing PR detected: {pr_url}\n"
            yield "PR updated with new commits.\n"
            yield f"_PR_URL_{pr_url}_END_\n"
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
        yield f"\n❌ Error creating PR: {pr_create.stderr}\n"
        return

    # Extract PR URL from output
    pr_url_match = None
    for line in pr_create.stdout.split('\n'):
        if 'https://github.com' in line:
            pr_url_match = line.strip()
            break
    
    if pr_url_match:
        yield f"\n✅ Pull request created: {pr_url_match}\n"
        yield f"_PR_URL_{pr_url_match}_END_\n"
    else:
        yield pr_create.stdout
        yield "\n✅ Pull request created successfully.\n"
