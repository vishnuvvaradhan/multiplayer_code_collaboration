#!/usr/bin/env python3
"""
Full workflow test: Create ticket → Chat → Make Plan → Dev (implement changes)
Ticket goal: Improve the UI of the VideoArchive project
"""

import requests
import time
import os

BASE = "http://127.0.0.1:8000"

TICKET_ID = "ui_improvement_003"
REPO_URL = "https://github.com/EyalShechtman/VideoArchive.git"


def stream_sse(action, message=None):
    """Stream SSE events and return the output."""
    payload = {
        "ticket_id": TICKET_ID,
        "action": action,
        "message": message
    }
    
    print(f"\n{'='*60}")
    print(f"ACTION: {action.upper()}")
    if message:
        print(f"MESSAGE: {message}")
    print('='*60)
    print()

    with requests.post(f"{BASE}/command", json=payload, stream=True) as resp:
        resp.raise_for_status()

        for line in resp.iter_lines(decode_unicode=True):
            if not line:
                continue

            if line.startswith("data:"):
                data = line.replace("data:", "").strip()
                
                if data == "__END__":
                    break
                
                print(data)
    
    print()


def create_ticket():
    """Create the ticket workspace."""
    print("\n" + "="*60)
    print("STEP 1: CREATE TICKET")
    print("="*60)
    
    r = requests.post(
        f"{BASE}/create_ticket",
        params={
            "ticket_id": TICKET_ID,
            "repo_url": REPO_URL
        }
    )
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    return r.status_code == 200


def chat_about_ui():
    """Chat with Gemini about UI improvements."""
    print("\n" + "="*60)
    print("STEP 2: CHAT - Discuss UI Improvements")
    print("="*60)
    
    stream_sse(
        "chat",
        "I want to improve the UI of this project. Please analyze the HTML/CSS files "
        "and suggest some simple improvements like: better colors, improved layout, "
        "modern styling, better spacing, and responsive design. Keep it simple but impactful."
    )


def make_plan():
    """Generate implementation plan."""
    print("\n" + "="*60)
    print("STEP 3: MAKE PLAN - Generate Implementation Plan")
    print("="*60)
    
    stream_sse("make_plan")


def implement_plan():
    """Execute the development step to implement the plan."""
    print("\n" + "="*60)
    print("STEP 4: DEV - Implement the Plan")
    print("="*60)
    
    stream_sse("dev")


def check_results():
    """Check if plan.md was created and show summary."""
    print("\n" + "="*60)
    print("RESULTS")
    print("="*60)
    
    plan_path = f"./tickets/{TICKET_ID}/plan.md"
    
    if os.path.exists(plan_path):
        with open(plan_path, "r") as f:
            content = f.read()
        
        print(f"\n✅ plan.md created ({len(content)} characters)")
        print("\n--- PLAN PREVIEW (first 500 chars) ---")
        print(content[:500])
        if len(content) > 500:
            print("...")
        print()
    else:
        print("\n❌ plan.md not found")
    
    # Check for git changes
    print("\n--- GIT STATUS ---")
    import subprocess
    workspace = f"./tickets/{TICKET_ID}"
    result = subprocess.run(
        ["git", "status", "--short"],
        cwd=workspace,
        capture_output=True,
        text=True
    )
    if result.stdout.strip():
        print("Modified files:")
        print(result.stdout)
    else:
        print("No changes detected (yet)")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 FULL WORKFLOW TEST: UI IMPROVEMENT")
    print("="*60)
    print(f"Ticket ID: {TICKET_ID}")
    print(f"Repo: {REPO_URL}")
    print(f"Goal: Improve UI with modern styling")
    print("="*60)
    
    # Step 1: Create ticket
    if not create_ticket():
        print("\n❌ Failed to create ticket. Exiting.")
        exit(1)
    
    time.sleep(2)
    
    # Step 2: Chat about UI improvements
    chat_about_ui()
    
    time.sleep(2)
    
    # Step 3: Make plan
    make_plan()
    
    time.sleep(2)
    
    # Step 4: Implement (this will take longer)
    print("\n⚠️  NOTE: The dev step may take several minutes as Gemini implements the changes...")
    implement_plan()
    
    time.sleep(2)
    
    # Check results
    check_results()
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETE")
    print("="*60)
    print(f"\nCheck the changes in: ./tickets/{TICKET_ID}/")
    print("Review plan.md for the implementation details")
    print("Check git status to see modified files")
    print()
