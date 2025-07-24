#!/usr/bin/env python3
"""
Test script to verify that SMTP verification returns correct smtp_valid field
"""

import os
import sys
import django

# Add the parent directory to the path
sys.path.append('.')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sme_ai.settings')
django.setup()

from verifier.utils import smtp_check

def test_emails():
    """Test various email addresses to verify smtp_valid field is correctly returned"""
    
    test_emails = [
        "info.aminul3065@gmail.com",  # Should have smtp_valid: True
        "test@example.com",           # Likely smtp_valid: False (blocked)
        "invalid@nonexistentdomain12345.com",  # Should have smtp_valid: False
        "admin@google.com"            # Might have smtp_valid: False (blocked/protected)
    ]
    
    print("Testing SMTP verification with smtp_valid field...")
    print("=" * 60)
    
    for email in test_emails:
        print(f"\nTesting: {email}")
        print("-" * 40)
        
        try:
            result = smtp_check(email)
            
            # Check if smtp_valid field exists and display key info
            smtp_valid = result.get('smtp_valid', 'NOT_SET')
            status = result.get('status', 'unknown')
            mx_host = result.get('mx_host', None)
            port = result.get('port', None)
            reason = result.get('reason', 'No reason')
            
            print(f"Status: {status}")
            print(f"SMTP Valid: {smtp_valid}")
            print(f"MX Host: {mx_host}")
            print(f"Port: {port}")
            print(f"Reason: {reason}")
            
            # Verify consistency
            if smtp_valid is True:
                if mx_host and port:
                    print("✅ CONSISTENT: smtp_valid=True and has mx_host/port")
                else:
                    print("⚠️  INCONSISTENT: smtp_valid=True but missing mx_host/port")
            elif smtp_valid is False:
                print("✅ CONSISTENT: smtp_valid=False")
            else:
                print(f"❌ ERROR: smtp_valid field not properly set: {smtp_valid}")
                
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
    
    print("\n" + "=" * 60)
    print("Test completed!")

if __name__ == "__main__":
    test_emails()
