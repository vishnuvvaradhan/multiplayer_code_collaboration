#!/usr/bin/env python3
"""Standalone test: git pull -> gemini call #1 -> gemini call #2 (with context)"""

import os
import subprocess
import re
import time

TEST_DIR = "./test_workspace"
REPO_URL = "https://github.com/vishnuvvaradhan/tickerproject.git"

# Setup repo
if os.path.exists(TEST_DIR):
    subprocess.run(["git", "pull"], cwd=TEST_DIR)
else:
    subprocess.run(["git", "clone", REPO_URL, TEST_DIR])

# Call #1
print("=== CALL #1 ===")
subprocess.run(["gemini", "-p", "What files are in this repository? List them briefly."], cwd=TEST_DIR)

# Wait a moment for session to be registered
time.sleep(1)

# Get session UUID
result = subprocess.run(["gemini", "--list-sessions"], cwd=TEST_DIR, capture_output=True, text=True)
combined_output = result.stdout + result.stderr
uuids = re.findall(r"\[([0-9a-fA-F-]{36})\]", combined_output)
if not uuids:
    print("ERROR: No session UUID found!")
    print("STDOUT:", result.stdout)
    print("STDERR:", result.stderr)
    exit(1)
session_uuid = uuids[-1]
print(f"\nSession: {session_uuid}\n")

# Call #2 (with context)
print("=== CALL #2 (should remember context) ===")
subprocess.run(["gemini", "-p", "Based on what you just saw, what kind of project is this?", f"--resume={session_uuid}"], cwd=TEST_DIR)

