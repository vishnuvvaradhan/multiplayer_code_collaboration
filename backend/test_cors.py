#!/usr/bin/env python3
"""
Quick test to verify CORS is configured correctly
"""
import requests

# Test health endpoint
print("Testing health endpoint...")
response = requests.get("http://localhost:8000/")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
print(f"Headers: {dict(response.headers)}")
print()

# Test CORS preflight (OPTIONS request)
print("Testing CORS preflight...")
headers = {
    "Origin": "http://localhost:3000",
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type",
}
response = requests.options("http://localhost:8000/create_ticket", headers=headers)
print(f"Status: {response.status_code}")
print(f"CORS Headers:")
for key, value in response.headers.items():
    if "access-control" in key.lower():
        print(f"  {key}: {value}")

