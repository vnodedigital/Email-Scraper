#!/usr/bin/env python
"""
Test script to simulate the catch-all counting scenario
"""

# Mock data that represents what you originally had
test_results = [
    {
        'email': 'test1@example.com',
        'status': 'valid',
        'is_catch_all': False,
        'reason': 'SMTP accepted'
    },
    {
        'email': 'test2@example.com', 
        'status': 'valid',
        'is_catch_all': False,
        'reason': 'SMTP accepted'
    },
    {
        'email': 'test3@example.com',
        'status': 'invalid',
        'is_catch_all': False,
        'reason': 'SMTP rejected'
    },
    {
        'email': 'test4@catchalldomain.com',
        'status': 'valid',  # This email is valid but domain is catch-all
        'is_catch_all': True,
        'reason': 'SMTP accepted - catch-all domain'
    }
]

print("=== Testing Catch-All Priority Counting Logic ===")
print(f"Total emails: {len(test_results)}")
print("\nExpected results:")
print("- 2 Valid emails (test1, test2)")  
print("- 1 Invalid email (test3)")
print("- 1 Catch-all email (test4 - even though status is valid, is_catch_all takes priority)")

# Apply the new counting logic
valid_count = 0
invalid_count = 0
catchall_count = 0

for result in test_results:
    email = result['email']
    is_catch_all = result.get('is_catch_all', False)
    status = result.get('status', 'invalid').lower()
    
    print(f"\nProcessing: {email}")
    print(f"  Status: {status}")
    print(f"  is_catch_all: {is_catch_all}")
    
    # Apply priority: Catch-all > Valid > Invalid
    if is_catch_all or status == 'catch-all':
        catchall_count += 1
        print(f"  → Counted as CATCH-ALL")
    elif status == 'valid':
        valid_count += 1
        print(f"  → Counted as VALID")
    else:
        invalid_count += 1
        print(f"  → Counted as INVALID")

print(f"\n=== Final Counts ===")
print(f"Valid: {valid_count}")
print(f"Invalid: {invalid_count}")
print(f"Catch-all: {catchall_count}")

print(f"\nSuccess Rate: {round(((valid_count + catchall_count) / len(test_results)) * 100, 2)}%")

# Test the JavaScript logic as well
print(f"\n=== Testing JavaScript Logic Equivalent ===")
js_valid = 0
js_invalid = 0  
js_catchall = 0

for r in test_results:
    is_catch_all = r.get('is_catch_all', False)
    status = (r.get('status', 'invalid')).lower()
    
    if is_catch_all or status == 'catch-all':
        js_catchall += 1
    elif status == 'valid':
        js_valid += 1
    else:
        js_invalid += 1

print(f"JavaScript equivalent counts:")
print(f"Valid: {js_valid}")
print(f"Invalid: {js_invalid}")
print(f"Catch-all: {js_catchall}")

print(f"\nLogic matches: {valid_count == js_valid and invalid_count == js_invalid and catchall_count == js_catchall}")
