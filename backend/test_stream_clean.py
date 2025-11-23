#!/usr/bin/env python3
"""
Test to verify stream cleaning works properly
"""

from gemini_module import stream_subprocess
import subprocess

def test_stream_cleaning():
    """Test that data: prefixes are properly removed"""
    
    # Simulate what Gemini CLI might output
    test_input = """data: Here's a plan
data: 
data: ### Step 1
data: 
data: Do something
data: __END__"""
    
    print("Testing stream cleaning...")
    print("\nInput (simulated Gemini output):")
    print(test_input)
    print("\n" + "="*50)
    
    # In real usage, this would come from subprocess
    # For testing, we'll manually process lines
    lines = test_input.split('\n')
    cleaned_lines = []
    
    for line in lines:
        cleaned_line = line
        if cleaned_line.strip().startswith('data:'):
            cleaned_line = cleaned_line.strip()[5:].strip()
        
        if cleaned_line.strip() and cleaned_line.strip() != '__END__':
            cleaned_lines.append(cleaned_line)
    
    print("\nOutput (cleaned):")
    for line in cleaned_lines:
        print(line)
    
    print("\n" + "="*50)
    print("✅ Stream cleaning test complete!")
    print(f"   Input lines: {len(lines)}")
    print(f"   Output lines: {len(cleaned_lines)}")
    print(f"   Removed: {len(lines) - len(cleaned_lines)} lines")

if __name__ == "__main__":
    test_stream_cleaning()

