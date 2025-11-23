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
from database import get_messages_by_ticket_identifier, format_chat_history, get_ticket_by_identifier

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
                # Remove "data:" (5 chars) and any following whitespace
                cleaned_line = cleaned_line.strip()[5:].lstrip()
            
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
        print(f"[DEBUG] get_or_create_session: Reusing existing session for {ticket_id}: {SESSION_STORE[ticket_id]}")
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
    print(f"[DEBUG] get_or_create_session: Created new session for {ticket_id}: {session_uuid}")
    return session_uuid


def run_gemini_prompt(ticket_id: str, prompt: str) -> Generator[str, None, None]:
    """
    Core wrapper around the Gemini CLI.

    Always:
      - ensures workspace exists
      - ensures a session UUID exists for this ticket
      - runs: gemini -p "<prompt>" --resume=<session_uuid>
    """
    print(f"[DEBUG] run_gemini_prompt called for {ticket_id}")
    print(f"[DEBUG] Prompt length: {len(prompt)} characters")
    print(f"[DEBUG] Prompt preview: {prompt[:200]}...")
    
    try:
        workspace = _ensure_workspace(ticket_id)
        print(f"[DEBUG] Workspace: {workspace}")
    except FileNotFoundError as e:
        print(f"[DEBUG] Workspace error: {e}")
        yield f"Error: {e}\n"
        return

    try:
        session_uuid = get_or_create_session(ticket_id)
        print(f"[DEBUG] Using session: {session_uuid}")
    except Exception as e:
        print(f"[DEBUG] Session error: {e}")
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
    
    print(f"[DEBUG] Running command: {' '.join(cmd[:2])} ... --resume={session_uuid}")

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
    Get the complete context for a ticket including meta and chat history.
    Returns formatted ticket information and conversation history from Supabase.
    ticket_id can be either a UUID or human-readable identifier (e.g., "COD-28")
    
    [DEBUG] This function retrieves ticket context from Supabase.
    """
    try:
        print(f"[DEBUG] get_chat_context: Fetching context for {ticket_id}")
        # Get ticket metadata
        ticket_info = get_ticket_by_identifier(ticket_id)
        print(f"[DEBUG] get_chat_context: Got ticket info")

        # Get conversation messages
        messages = get_messages_by_ticket_identifier(ticket_id)
        print(f"[DEBUG] get_chat_context: Retrieved {len(messages)} messages")

        # Format ticket information section
        ticket_section = ""
        if ticket_info:
            ticket_section = f"""# TICKET INFORMATION

**Ticket ID:** {ticket_info.get('ticket_identifier', ticket_id)}
**Title:** {ticket_info.get('ticket_name', 'No title')}
**Description:** {ticket_info.get('description', 'No description provided')}
**Priority:** {ticket_info.get('priority', 'Not set')}
**Repository:** {ticket_info.get('github_url', 'No repository linked')}

---
"""

        # Format conversation history section
        chat_section = f"""
# CONVERSATION HISTORY

{format_chat_history(messages)}
"""

        final_context = ticket_section + chat_section
        print(f"[DEBUG] get_chat_context: Final context length: {len(final_context)} characters")
        return final_context

    except Exception as e:
        print(f"[DEBUG] get_chat_context ERROR for {ticket_id}: {e}")
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
# Internal helper: apply .new files directly
# -----------------------------------------------------------------------------
def _apply_new_files_directly(workspace: str, files_to_modify) -> int:
    """
    Apply the generated .new files by moving them into place.

    For each path in files_to_modify, if "<path>.new" exists under the workspace,
    it is atomically replaced as "<path>".

    Returns the number of files successfully applied.
    """
    applied = 0
    for file_path in files_to_modify:
        full_path = os.path.join(workspace, file_path)
        new_path = full_path + ".new"

        if not os.path.exists(new_path):
            continue

        parent_dir = os.path.dirname(full_path)
        if parent_dir:
            os.makedirs(parent_dir, exist_ok=True)

        # Atomically replace or create the target file
        os.replace(new_path, full_path)
        applied += 1

    return applied


# -----------------------------------------------------------------------------
# @dev — implement the plan (code edits, commit, push, PR)
# -----------------------------------------------------------------------------
def gemini_dev(ticket_id: str) -> Generator[str, None, None]:
    """
    Handle @dev using deterministic full-file replacements:
    
      1. Read plan.md
      2. Ask Gemini which files need to be modified
      3. For each file, ask Gemini to generate the COMPLETE new version
      4. Save new versions as {filename}.new
      5. Optionally create diffs for debugging
      6. Move .new files into place
      7. Commit and push
      
    This is deterministic because we always replace whole files with
    LLM-generated versions rather than doing in-place edits.
    """
    try:
        workspace = _ensure_workspace(ticket_id)
    except FileNotFoundError as e:
        yield f"Error: {e}\n"
        return

    plan_path = os.path.join(workspace, "plan.md")
    if not os.path.exists(plan_path):
        yield "Error: plan.md not found. Run @make_plan first.\n"
        return

    # =========================================================================
    # STEP 1: Ask Gemini which files need to be modified
    # =========================================================================
    yield "\n📋 Step 1: Identifying files to modify...\n"
    
    files_prompt = (
        "You are the development agent for this ticket.\n"
        "Read `plan.md` in this repository.\n\n"
        "Based on the plan, list ALL files that need to be modified or created.\n"
        "Output ONLY a JSON array of file paths (relative to repo root).\n"
        "Do NOT include plan.md itself.\n\n"
        "Example output:\n"
        '["src/components/App.tsx", "src/styles/main.css", "README.md"]\n\n'
        "Output the JSON array now:"
    )
    
    collected_output = []
    for line in run_gemini_prompt(ticket_id, files_prompt):
        collected_output.append(line)
        yield line
    
    files_json = "".join(collected_output).strip()
    print(f"[DEBUG] Step 1 - Raw Gemini output length: {len(files_json)} characters")
    print(f"[DEBUG] Step 1 - Raw output preview: {files_json[:300]}")
    
    # Clean up markdown fences
    if files_json.startswith("```json"):
        files_json = files_json[7:].lstrip()
    elif files_json.startswith("```"):
        files_json = files_json[3:].lstrip()
    if files_json.endswith("```"):
        files_json = files_json[:-3].rstrip()
    
    print(f"[DEBUG] Step 1 - After cleanup: {files_json[:300]}")
    
    try:
        files_to_modify = json.loads(files_json)
        if not isinstance(files_to_modify, list):
            raise ValueError("Expected a JSON array of file paths")
        print(f"[DEBUG] Step 1 - Successfully parsed {len(files_to_modify)} files")
    except (json.JSONDecodeError, ValueError) as e:
        print(f"[DEBUG] Step 1 - JSON parse error: {e}")
        yield f"\n❌ Failed to parse file list: {e}\n"
        yield f"Raw output: {files_json[:200]}...\n"
        return
    
    yield f"\n✅ Found {len(files_to_modify)} file(s) to modify:\n"
    for file_path in files_to_modify:
        yield f"   - {file_path}\n"
    
    # =========================================================================
    # STEP 2: Generate complete new version of each file
    # =========================================================================
    yield "\n📝 Step 2: Generating new file contents...\n"
    
    files_generated = 0
    
    for file_path in files_to_modify:
        full_path = os.path.join(workspace, file_path)
        new_path = full_path + ".new"
        
        print(f"[DEBUG] Step 2 - Processing file: {file_path}")
        print(f"[DEBUG] Step 2 - Full path: {full_path}")
        print(f"[DEBUG] Step 2 - New path: {new_path}")
        
        yield f"\n🔄 Generating: {file_path}\n"
        
        # Check if file exists (for context)
        file_exists = os.path.exists(full_path)
        print(f"[DEBUG] Step 2 - File exists: {file_exists}")
        
        if file_exists:
            file_gen_prompt = (
                f"Generate the COMPLETE new version of `{file_path}`.\n"
                f"The current file exists - read it first to understand its structure.\n"
                f"Then output the ENTIRE modified file content.\n\n"
                f"IMPORTANT:\n"
                f"- Output ONLY the file content (no explanations, no markdown fences)\n"
                f"- Include ALL necessary imports, functions, and code\n"
                f"- The output should be valid, runnable code\n"
                f"- Do NOT add comments like '// ... rest of file ...'\n"
                f"- Generate the COMPLETE file\n\n"
                f"Generate the complete new version of {file_path} now:"
            )
        else:
            file_gen_prompt = (
                f"Create a NEW file `{file_path}` based on the plan.\n"
                f"Output the COMPLETE file content.\n\n"
                f"IMPORTANT:\n"
                f"- Output ONLY the file content (no explanations, no markdown fences)\n"
                f"- Include ALL necessary imports, functions, and code\n"
                f"- The output should be valid, runnable code\n"
                f"- Generate the COMPLETE file\n\n"
                f"Generate the complete content for {file_path} now:"
            )
        
        # Collect the generated file content
        file_content_lines = []
        try:
            print(f"[DEBUG] Step 2 - Calling Gemini for {file_path}")
            for line in run_gemini_prompt(ticket_id, file_gen_prompt):
                file_content_lines.append(line)
            print(f"[DEBUG] Step 2 - Gemini returned {len(file_content_lines)} lines")
        except Exception as e:
            print(f"[DEBUG] Step 2 - Exception during generation: {e}")
            yield f"   ❌ Error generating content for {file_path}: {e}\n"
            continue
        
        file_content = "".join(file_content_lines).strip()
        print(f"[DEBUG] Step 2 - Content length after join: {len(file_content)} characters")
        print(f"[DEBUG] Step 2 - Content preview: {file_content[:200]}")
        
        # Check if we got any content
        if not file_content:
            print(f"[DEBUG] Step 2 - WARNING: Empty content for {file_path}")
            yield f"   ⚠️  Warning: No content generated for {file_path}, skipping\n"
            continue
        
        # Clean up any markdown fences that might have snuck in
        if file_content.startswith("```"):
            # Remove first line (```language)
            lines = file_content.split('\n')
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            file_content = '\n'.join(lines)
        
        # Write the new version
        try:
            # Ensure the directory exists before writing
            parent_dir = os.path.dirname(new_path)
            print(f"[DEBUG] Step 2 - Parent dir: {parent_dir}")
            if parent_dir:
                os.makedirs(parent_dir, exist_ok=True)
                print(f"[DEBUG] Step 2 - Created parent directory")
            
            print(f"[DEBUG] Step 2 - Writing to {new_path}")
            with open(new_path, "w") as f:
                f.write(file_content)
            print(f"[DEBUG] Step 2 - File written successfully")
            
            # Verify the file was actually created
            if not os.path.exists(new_path):
                print(f"[DEBUG] Step 2 - ERROR: File doesn't exist after writing!")
                yield f"   ❌ Error: Failed to create {new_path}\n"
                continue
            
            file_size = os.path.getsize(new_path)
            print(f"[DEBUG] Step 2 - File verified, size: {file_size} bytes")
            
            files_generated += 1
            yield f"   ✅ Generated {len(file_content)} characters → {new_path}\n"
        except Exception as e:
            print(f"[DEBUG] Step 2 - Exception writing file: {e}")
            yield f"   ❌ Error writing {new_path}: {e}\n"
            continue
    
    yield f"\n✅ Generated {files_generated} new file version(s)\n"
    print(f"[DEBUG] Step 2 - Summary: Generated {files_generated} files")
    
    # =========================================================================
    # STEP 3: Create git diffs
    # =========================================================================
    yield "\n🔍 Step 3: Creating git diffs...\n"
    
    patch_file = os.path.join(workspace, f"{ticket_id}.patch")
    patches_created = []
    
    # Create a diffs directory for individual file diffs
    diffs_dir = os.path.join(workspace, ".diffs")
    os.makedirs(diffs_dir, exist_ok=True)
    print(f"[DEBUG] Step 3 - Diffs directory: {diffs_dir}")
    
    yield f"   Looking for {len(files_to_modify)} file(s) to create diffs for...\n"
    print(f"[DEBUG] Step 3 - Files to process: {files_to_modify}")
    
    for file_path in files_to_modify:
        full_path = os.path.join(workspace, file_path)
        new_path = full_path + ".new"
        
        print(f"[DEBUG] Step 3 - Checking file: {file_path}")
        print(f"[DEBUG] Step 3 - Looking for: {new_path}")
        print(f"[DEBUG] Step 3 - File exists: {os.path.exists(new_path)}")
        
        # Verify .new file exists before creating diff
        if not os.path.exists(new_path):
            print(f"[DEBUG] Step 3 - WARNING: .new file not found!")
            yield f"   ⚠️  Warning: {new_path} not found, skipping diff\n"
            # Debug: check if the directory exists
            parent_dir = os.path.dirname(new_path)
            if os.path.exists(parent_dir):
                yield f"      (Directory exists, but .new file is missing)\n"
                # List files in directory
                try:
                    files_in_dir = os.listdir(parent_dir)
                    print(f"[DEBUG] Step 3 - Files in {parent_dir}: {files_in_dir}")
                    yield f"      (Files in directory: {', '.join(files_in_dir[:5])})\n"
                except Exception as e:
                    print(f"[DEBUG] Step 3 - Error listing directory: {e}")
            else:
                yield f"      (Directory doesn't exist: {parent_dir})\n"
                print(f"[DEBUG] Step 3 - Parent directory doesn't exist")
            continue
        
        # Create diff using git diff
        # Use absolute paths to avoid path resolution issues
        abs_full_path = os.path.abspath(full_path)
        abs_new_path = os.path.abspath(new_path)
        
        if os.path.exists(full_path):
            # Existing file - create diff
            print(f"[DEBUG] Step 3 - Creating diff for existing file: {file_path}")
            print(f"[DEBUG] Step 3 - Using absolute paths: {abs_full_path} vs {abs_new_path}")
            diff_result = subprocess.run(
                ["git", "diff", "--no-index", abs_full_path, abs_new_path],
                cwd=workspace,
                capture_output=True,
                text=True
            )
            print(f"[DEBUG] Step 3 - git diff return code: {diff_result.returncode}")
            print(f"[DEBUG] Step 3 - stdout length: {len(diff_result.stdout)}")
            print(f"[DEBUG] Step 3 - stderr length: {len(diff_result.stderr)}")
            
            # git diff --no-index returns 1 when files differ (this is normal)
            # Check for errors in stderr if stdout is empty
            if diff_result.stderr and not diff_result.stdout:
                print(f"[DEBUG] Step 3 - ERROR in git diff: {diff_result.stderr}")
                yield f"   ❌ Error creating diff for {file_path}: {diff_result.stderr}\n"
            elif diff_result.stdout:
                # Fix the diff paths to use relative paths without .new extension
                diff_output = diff_result.stdout
                lines = diff_output.split('\n')
                fixed_lines = []
                for line in lines:
                    if line.startswith('diff --git'):
                        # Normalize header to use relative paths without .new
                        fixed_lines.append(f"diff --git a/{file_path} b/{file_path}")
                    elif line.startswith('---'):
                        # Original file: use relative path
                        fixed_lines.append(f"--- a/{file_path}")
                    elif line.startswith('+++'):
                        # Modified file: use relative path (without .new)
                        fixed_lines.append(f"+++ b/{file_path}")
                    else:
                        fixed_lines.append(line)
                fixed_diff = '\n'.join(fixed_lines)
                
                patches_created.append(fixed_diff)
                # Save individual file diff for tracking
                safe_filename = file_path.replace("/", "_").replace("\\", "_")
                individual_diff_file = os.path.join(diffs_dir, f"{safe_filename}.diff")
                with open(individual_diff_file, "w") as f:
                    f.write(fixed_diff)
                print(f"[DEBUG] Step 3 - Saved diff to {individual_diff_file}")
                yield f"   ✅ Created diff for {file_path}\n"
            else:
                print(f"[DEBUG] Step 3 - No diff output (files might be identical)")
        else:
            # New file - create diff showing entire file as added
            # Use os.devnull for cross-platform compatibility
            print(f"[DEBUG] Step 3 - Creating diff for NEW file: {file_path}")
            print(f"[DEBUG] Step 3 - Using absolute path: {abs_new_path}")
            diff_result = subprocess.run(
                ["git", "diff", "--no-index", "--src-prefix=a/", "--dst-prefix=b/", os.devnull, abs_new_path],
                cwd=workspace,
                capture_output=True,
                text=True
            )
            print(f"[DEBUG] Step 3 - git diff return code: {diff_result.returncode}")
            print(f"[DEBUG] Step 3 - stdout length: {len(diff_result.stdout)}")
            print(f"[DEBUG] Step 3 - stderr length: {len(diff_result.stderr)}")
            
            # git diff --no-index returns 1 for new files (this is normal)
            # Check for errors in stderr if stdout is empty
            if diff_result.stderr and not diff_result.stdout:
                print(f"[DEBUG] Step 3 - ERROR in git diff: {diff_result.stderr}")
                yield f"   ❌ Error creating diff for new file {file_path}: {diff_result.stderr}\n"
            elif diff_result.stdout:
                # Fix the diff to use the correct file path in the +++ line
                # Replace the full path with just the relative file path
                diff_output = diff_result.stdout
                # Replace absolute paths and .new suffixes with the relative file_path
                lines = diff_output.split('\n')
                fixed_lines = []
                for line in lines:
                    if line.startswith('diff --git'):
                        # Normalize header to use relative paths without .new
                        fixed_lines.append(f"diff --git a/{file_path} b/{file_path}")
                    elif line.startswith('+++') and new_path in line:
                        # Modified file: use relative path (without .new)
                        fixed_lines.append(f"+++ b/{file_path}")
                    else:
                        fixed_lines.append(line)
                fixed_diff = '\n'.join(fixed_lines)
                
                patches_created.append(fixed_diff)
                # Save individual file diff for tracking
                safe_filename = file_path.replace("/", "_").replace("\\", "_")
                individual_diff_file = os.path.join(diffs_dir, f"{safe_filename}.diff")
                with open(individual_diff_file, "w") as f:
                    f.write(fixed_diff)
                print(f"[DEBUG] Step 3 - Saved new file diff to {individual_diff_file}")
                yield f"   ✅ Created diff for new file {file_path}\n"
            else:
                print(f"[DEBUG] Step 3 - No diff output for new file")
    
    # Always save combined patch file (even if empty) for tracking
    print(f"[DEBUG] Step 3 - Total patches created: {len(patches_created)}")
    with open(patch_file, "w") as f:
        if patches_created:
            combined_patch = "\n".join(patches_created)
            f.write(combined_patch)
            print(f"[DEBUG] Step 3 - Wrote {len(combined_patch)} characters to {patch_file}")
        else:
            f.write("# No changes detected\n")
            print(f"[DEBUG] Step 3 - No patches to write, wrote placeholder")
    yield f"\n✅ Saved combined patch to {ticket_id}.patch\n"
    if patches_created:
        yield f"✅ Saved {len(patches_created)} individual diff(s) to .diffs/\n"
    
    # =========================================================================
    # STEP 4: Apply changes by moving .new files into place
    # =========================================================================
    yield "\n🔧 Step 4: Applying file changes...\n"
    
    applied_count = _apply_new_files_directly(workspace, files_to_modify)
    yield f"✅ Applied {applied_count} file(s) from .new versions\n"
    
    yield f"\n✅ Modified {len(files_to_modify)} file(s)\n"

    # =========================================================================
    # STEP 5: Git commit and push
    # =========================================================================
    yield "\n📦 Step 5: Committing changes...\n"
    
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

    # Stage all changes (excluding .new files and patch file)
    subprocess.run(["git", "add", "."], cwd=workspace)
    
    # Remove temporary files from staging
    patch_file = f"{ticket_id}.patch"
    subprocess.run(["git", "reset", "HEAD", patch_file], cwd=workspace, capture_output=True)
    subprocess.run(["git", "reset", "HEAD", ".diffs/"], cwd=workspace, capture_output=True)
    
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
