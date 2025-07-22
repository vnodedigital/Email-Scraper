#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sme_ai.settings')
django.setup()

from verifier.models import EmailVerificationHistory

def check_database():
    print("=== DATABASE ANALYSIS ===")
    total_records = EmailVerificationHistory.objects.count()
    records_with_catchall = EmailVerificationHistory.objects.filter(catchall_count__gt=0).count()
    
    print(f"Total verification history records: {total_records}")
    print(f"Records with catchall_count > 0: {records_with_catchall}")
    
    print("\n=== VERIFICATION HISTORY RECORDS ===")
    for i, record in enumerate(EmailVerificationHistory.objects.all()[:5], 1):
        print(f"{i}. Title: {record.title}")
        print(f"   - Valid Count: {record.valid_count}")
        print(f"   - Invalid Count: {record.invalid_count}")
        print(f"   - Catch-All Count: {record.catchall_count}")
        print(f"   - Total Email Count: {record.email_count}")
        print(f"   - Status: {record.status}")
        print(f"   - Success Rate: {record.success_rate}%")
        print(f"   - Created: {record.formatted_date}")
        
        # Look at some sample emails from verified_emails JSON
        if record.verified_emails:
            print(f"   - Sample verified emails:")
            if isinstance(record.verified_emails, dict):
                for email, data in list(record.verified_emails.items())[:3]:
                    if isinstance(data, dict):
                        status = data.get('status', 'unknown')
                        is_catch_all = data.get('is_catch_all', False)
                        print(f"     * {email}: status={status}, is_catch_all={is_catch_all}")
                    else:
                        print(f"     * {email}: data={data} (unexpected format)")
            elif isinstance(record.verified_emails, list):
                for item in record.verified_emails[:3]:
                    if isinstance(item, dict):
                        email = item.get('email', 'unknown')
                        status = item.get('status', 'unknown')
                        is_catch_all = item.get('is_catch_all', False)
                        print(f"     * {email}: status={status}, is_catch_all={is_catch_all}")
            else:
                print(f"     * Unexpected JSON format: {type(record.verified_emails)}")
        print()
    
    print("\n=== SUMMARY STATISTICS ===")
    if total_records > 0:
        total_valid = sum(r.valid_count for r in EmailVerificationHistory.objects.all())
        total_invalid = sum(r.invalid_count for r in EmailVerificationHistory.objects.all())
        total_catchall = sum(r.catchall_count for r in EmailVerificationHistory.objects.all())
        total_emails = sum(r.email_count for r in EmailVerificationHistory.objects.all())
        
        print(f"Total across all records:")
        print(f"  - Total Emails Verified: {total_emails}")
        print(f"  - Total Valid: {total_valid}")
        print(f"  - Total Invalid: {total_invalid}")
        print(f"  - Total Catch-All: {total_catchall}")
        
        if total_emails > 0:
            print(f"  - Overall Success Rate: {round(((total_valid + total_catchall) / total_emails) * 100, 2)}%")
    else:
        print("No records found in database")

if __name__ == '__main__':
    check_database()
