#!/usr/bin/env python
import os
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sme_ai.settings')
django.setup()

from verifier.models import EmailVerificationHistory

def analyze_catch_all_record():
    print("=== ANALYZING CATCH-ALL DETECTION ISSUE ===")
    
    # Find the record with the catch-all email
    for record in EmailVerificationHistory.objects.all():
        if record.verified_emails and isinstance(record.verified_emails, dict):
            results = record.verified_emails.get('results', [])
            if isinstance(results, list):
                for result in results:
                    if isinstance(result, dict):
                        email = result.get('email', '')
                        is_catch_all = result.get('is_catch_all', False)
                        status = result.get('status', '')
                        
                        if is_catch_all:
                            print(f"\n🎯 FOUND CATCH-ALL EMAIL!")
                            print(f"Record ID: {record.id}")
                            print(f"Title: {record.title}")
                            print(f"Email: {email}")
                            print(f"Status: {status}")
                            print(f"is_catch_all: {is_catch_all}")
                            print(f"Recorded counts in database:")
                            print(f"  - Valid Count: {record.valid_count}")
                            print(f"  - Invalid Count: {record.invalid_count}")
                            print(f"  - Catch-All Count: {record.catchall_count}")
                            
                            # What SHOULD the counts be based on the logic?
                            print(f"\n🔍 ANALYSIS:")
                            print(f"According to the catch-all priority logic:")
                            print(f"  - If is_catch_all={is_catch_all} OR status='{status}' == 'catch-all':")
                            
                            if is_catch_all or status == 'catch-all':
                                print(f"  ✅ This email SHOULD be counted as CATCH-ALL")
                                if record.catchall_count > 0:
                                    print(f"  ✅ CORRECTLY counted as catch-all: {record.catchall_count}")
                                    print(f"  ✅ FIXED: The counting logic is working correctly!")
                                else:
                                    print(f"  ❌ But it was counted as: Valid={record.valid_count}, Catch-all={record.catchall_count}")
                                    print(f"  🐛 BUG CONFIRMED: The counting logic failed!")
                            else:
                                print(f"  ❌ This email should NOT be counted as catch-all")
                            
                            print(f"\n📊 Full result data:")
                            print(json.dumps(result, indent=2))
                            return
    
    print("No catch-all emails found in database records")

if __name__ == '__main__':
    analyze_catch_all_record()
