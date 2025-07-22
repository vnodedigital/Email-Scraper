#!/usr/bin/env python
"""
Test to simulate a new email verification with catch-all emails
This will help us understand if the issue is with existing data or new verifications
"""

import json

print("=== Simulating Email Verification with Catch-All ===\n")

# Simulate what happens when we verify emails with our new logic
def simulate_batch_verify_emails(emails_to_verify):
    """Simulate the batch_verify_emails function with test data"""
    
    print(f"Simulating verification of {len(emails_to_verify)} emails...")
    
    # Simulate smtp_check results (what the function would return)
    simulated_results = []
    
    for email in emails_to_verify:
        # Simulate different types of results
        if 'catchall' in email.lower():
            # Simulate a catch-all domain
            result = {
                'email': email,
                'status': 'valid',  # Email might be valid but domain is catch-all
                'is_catch_all': True,  # This is the key field
                'reason': 'SMTP accepted - catch-all domain detected',
                'is_disposable': False,
                'is_free_provider': False,
                'is_role_based': False,
                'is_blacklisted': False,
                'score': 0.6  # Lower score due to catch-all
            }
        elif 'valid' in email.lower():
            # Simulate a normal valid email
            result = {
                'email': email,
                'status': 'valid',
                'is_catch_all': False,
                'reason': 'SMTP accepted',
                'is_disposable': False,
                'is_free_provider': True,
                'is_role_based': False,
                'is_blacklisted': False,
                'score': 0.85
            }
        else:
            # Simulate an invalid email
            result = {
                'email': email,
                'status': 'invalid',
                'is_catch_all': False,
                'reason': 'SMTP rejected',
                'is_disposable': False,
                'is_free_provider': False,
                'is_role_based': False,
                'is_blacklisted': False,
                'score': 0.1
            }
        
        simulated_results.append(result)
        print(f"  {email} -> status: {result['status']}, is_catch_all: {result['is_catch_all']}")
    
    # Apply our counting logic (same as in views.py)
    valid_count = 0
    invalid_count = 0
    catchall_count = 0
    
    print(f"\nApplying counting logic:")
    
    for result in simulated_results:
        is_catch_all = result.get('is_catch_all', False)
        status = result.get('status', 'invalid').lower()
        
        # Apply priority: Catch-all > Valid > Invalid
        if is_catch_all or status == 'catch-all':
            catchall_count += 1
            print(f"  {result['email']} -> CATCH-ALL")
        elif status == 'valid':
            valid_count += 1
            print(f"  {result['email']} -> VALID")
        else:
            invalid_count += 1
            print(f"  {result['email']} -> INVALID")
    
    print(f"\nFinal counts:")
    print(f"  Valid: {valid_count}")
    print(f"  Invalid: {invalid_count}")
    print(f"  Catch-all: {catchall_count}")
    
    # Calculate success rate (valid + catch-all)
    total = len(emails_to_verify)
    success_rate = round(((valid_count + catchall_count) / total) * 100, 2)
    print(f"  Success Rate: {success_rate}%")
    
    return {
        'results': simulated_results,
        'counts': {
            'valid': valid_count,
            'invalid': invalid_count,
            'catchall': catchall_count,
            'total': total,
            'success_rate': success_rate
        }
    }

# Test Case 1: Your original scenario
print("TEST CASE 1: Your Original Scenario")
print("-" * 40)
original_emails = [
    'valid1@gmail.com',
    'valid2@yahoo.com', 
    'invalid@nonexistent.com',
    'anything@catchalldomain.com'  # This should be catch-all
]

result1 = simulate_batch_verify_emails(original_emails)
print(f"Expected: 2 valid, 1 invalid, 1 catch-all")
actual = result1['counts']
print(f"Actual: {actual['valid']} valid, {actual['invalid']} invalid, {actual['catchall']} catch-all")
print(f"Match: {'✅' if actual['valid']==2 and actual['invalid']==1 and actual['catchall']==1 else '❌'}")

# Test Case 2: Multiple catch-all scenarios
print(f"\nTEST CASE 2: Multiple Catch-All Scenarios")
print("-" * 40)
mixed_emails = [
    'user@gmail.com',           # Valid
    'test@catchall1.com',       # Catch-all  
    'bad@nowhere.com',          # Invalid
    'admin@catchall2.com',      # Catch-all
    'info@hotmail.com',         # Valid
    'fake@catchall3.com'        # Catch-all
]

result2 = simulate_batch_verify_emails(mixed_emails)
actual2 = result2['counts']
print(f"Expected: 2 valid, 1 invalid, 3 catch-all")
print(f"Actual: {actual2['valid']} valid, {actual2['invalid']} invalid, {actual2['catchall']} catch-all")

print(f"\n=== SIMULATION COMPLETE ===")
print(f"If these simulations work correctly, then:")
print(f"1. ✅ Our counting logic is correct")
print(f"2. ✅ New verifications should work properly") 
print(f"3. ❓ The issue is likely with existing database data")
print(f"")
print(f"Next steps:")
print(f"1. Try a new email verification to test if catch-all detection works")
print(f"2. Check if existing emails actually have is_catch_all=True")
print(f"3. Run the fix_counts management command when Django environment is available")
