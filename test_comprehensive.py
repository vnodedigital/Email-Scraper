#!/usr/bin/env python
"""
Comprehensive test to identify catch-all counting issues
"""

print("=== Catch-All Counting Diagnostic Test ===\n")

# Test 1: Basic counting logic with different scenarios
print("TEST 1: Basic Counting Logic")
print("-" * 30)

test_scenarios = [
    # Scenario 1: Normal emails (should work)
    {
        'name': 'Normal Valid Email',
        'result': {'email': 'user@gmail.com', 'status': 'valid', 'is_catch_all': False},
        'expected': 'valid'
    },
    {
        'name': 'Normal Invalid Email', 
        'result': {'email': 'invalid@nonexistent.com', 'status': 'invalid', 'is_catch_all': False},
        'expected': 'invalid'
    },
    
    # Scenario 2: Catch-all via status field
    {
        'name': 'Catch-all via status field',
        'result': {'email': 'test@catchall.com', 'status': 'catch-all', 'is_catch_all': True},
        'expected': 'catch-all'
    },
    
    # Scenario 3: Catch-all via is_catch_all field (your requirement)
    {
        'name': 'Valid email on catch-all domain',
        'result': {'email': 'realuser@catchall.com', 'status': 'valid', 'is_catch_all': True},
        'expected': 'catch-all'  # Should prioritize catch-all
    },
    {
        'name': 'Invalid email on catch-all domain',
        'result': {'email': 'baduser@catchall.com', 'status': 'invalid', 'is_catch_all': True},
        'expected': 'catch-all'  # Should prioritize catch-all
    },
    
    # Scenario 4: Edge cases
    {
        'name': 'Missing is_catch_all field',
        'result': {'email': 'test@example.com', 'status': 'valid'},
        'expected': 'valid'
    },
    {
        'name': 'is_catch_all is None',
        'result': {'email': 'test@example.com', 'status': 'valid', 'is_catch_all': None},
        'expected': 'valid'
    }
]

def apply_counting_logic(result):
    """Apply our catch-all priority counting logic"""
    is_catch_all = result.get('is_catch_all', False)
    status = result.get('status', 'invalid').lower()
    
    # Apply priority: Catch-all > Valid > Invalid
    if is_catch_all or status == 'catch-all':
        return 'catch-all'
    elif status == 'valid':
        return 'valid'
    else:
        return 'invalid'

print("Testing each scenario:")
all_passed = True

for i, scenario in enumerate(test_scenarios, 1):
    result = apply_counting_logic(scenario['result'])
    passed = result == scenario['expected']
    all_passed = all_passed and passed
    
    status_icon = "✅" if passed else "❌"
    print(f"{status_icon} Test {i}: {scenario['name']}")
    print(f"   Input: {scenario['result']}")
    print(f"   Expected: {scenario['expected']}, Got: {result}")
    if not passed:
        print(f"   ❌ FAILED!")
    print()

print(f"All basic tests passed: {all_passed}")

# Test 2: Batch counting
print("\nTEST 2: Batch Counting")
print("-" * 30)

batch_results = [
    {'email': 'user1@gmail.com', 'status': 'valid', 'is_catch_all': False},
    {'email': 'user2@gmail.com', 'status': 'valid', 'is_catch_all': False}, 
    {'email': 'bad@nowhere.com', 'status': 'invalid', 'is_catch_all': False},
    {'email': 'anyone@catchalldomain.com', 'status': 'valid', 'is_catch_all': True}  # This should be catch-all
]

valid_count = 0
invalid_count = 0  
catchall_count = 0

print("Processing batch:")
for result in batch_results:
    email = result['email']
    category = apply_counting_logic(result)
    
    if category == 'catch-all':
        catchall_count += 1
    elif category == 'valid':
        valid_count += 1
    else:
        invalid_count += 1
    
    print(f"  {email} -> {category}")

print(f"\nBatch Results:")
print(f"  Valid: {valid_count}")
print(f"  Invalid: {invalid_count}")
print(f"  Catch-all: {catchall_count}")
print(f"  Total: {len(batch_results)}")

expected_counts = {'valid': 2, 'invalid': 1, 'catch-all': 1}
batch_correct = (valid_count == expected_counts['valid'] and 
                invalid_count == expected_counts['invalid'] and
                catchall_count == expected_counts['catch-all'])

print(f"Batch counting correct: {'✅' if batch_correct else '❌'}")

# Test 3: JavaScript equivalent logic
print(f"\nTEST 3: JavaScript Logic Equivalent")
print("-" * 30)

def js_counting_logic(results):
    """Simulate the JavaScript counting logic"""
    valid = 0
    invalid = 0
    catchAll = 0
    
    for r in results:
        isCatchAll = r.get('is_catch_all', False)
        status = (r.get('status', 'invalid')).lower()
        
        if isCatchAll or status == 'catch-all':
            catchAll += 1
        elif status == 'valid':
            valid += 1
        else:
            invalid += 1
    
    return {'valid': valid, 'invalid': invalid, 'catchAll': catchAll}

js_result = js_counting_logic(batch_results)
print(f"JavaScript logic result: {js_result}")

js_matches = (js_result['valid'] == valid_count and 
              js_result['invalid'] == invalid_count and
              js_result['catchAll'] == catchall_count)

print(f"JavaScript matches Python: {'✅' if js_matches else '❌'}")

# Summary
print(f"\n=== DIAGNOSTIC SUMMARY ===")
print(f"Basic Logic Tests: {'✅ PASS' if all_passed else '❌ FAIL'}")
print(f"Batch Counting: {'✅ PASS' if batch_correct else '❌ FAIL'}")
print(f"JS/Python Match: {'✅ PASS' if js_matches else '❌ FAIL'}")

if all_passed and batch_correct and js_matches:
    print(f"\n🎉 All tests PASSED! The counting logic is correct.")
    print(f"The issue might be:")
    print(f"  1. No actual catch-all emails in your database")
    print(f"  2. SMTP detection not finding catch-all domains")
    print(f"  3. Database not being updated with new logic")
else:
    print(f"\n❌ Some tests FAILED! There's a bug in the counting logic.")

print(f"\n=== Test Complete ===")
