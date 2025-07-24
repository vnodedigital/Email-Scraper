#!/usr/bin/env python3
"""
Quick test to verify SMTP return values
"""

import os
import sys
import django

sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sme_ai.settings')
django.setup()

from verifier.utils import smtp_check
import json

# Test emails
emails = ['info.aminul3065@gmail.com', 'test@example.com', 'invalid@nonexistent123456789.com']

print("SMTP Return Value Test")
print("=" * 50)

for email in emails:
    print(f"\nTesting: {email}")
    result = smtp_check(email)
    
    # Display key fields
    print(f"  Status: {result.get('status')}")
    print(f"  SMTP Valid: {result.get('smtp_valid')}")
    print(f"  MX Host: {result.get('mx_host')}")
    print(f"  Port: {result.get('port')}")
    print(f"  Score: {result.get('score')}")
    print(f"  Reason: {result.get('reason')}")
    
    # Show full result structure
    print(f"  Full result keys: {list(result.keys())}")

print("\nTest completed!")
