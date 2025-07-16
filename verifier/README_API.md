# Django REST API Email Verifier

This document explains how to use the Django REST API for email verification, which replaces the previous FastAPI implementation.

## Overview

The Django REST API Email Verifier provides comprehensive email verification capabilities including:
- SMTP validation
- Domain validation
- MX record checking
- SPF, DMARC, and DKIM record verification
- Disposable email detection
- Role-based email detection
- Catch-all domain detection
- Blacklist checking

## API Endpoints

### Base URL
```
/verifier/api/
```

### Endpoints

#### 1. Health Check
```
GET /verifier/api/health/
```
Returns the health status of the API.

**Response:**
```json
{
    "status": "healthy"
}
```

#### 2. API Root
```
GET /verifier/api/
```
Returns basic API information and available endpoints.

**Response:**
```json
{
    "message": "Django REST API Email Verifier is running",
    "status": "ok",
    "endpoints": {
        "check_email": "/api/check-email/",
        "health": "/api/health/"
    }
}
```

#### 3. Email Verification
```
POST /verifier/api/check-email/
```
Verifies a single email address.

**Request Body:**
```json
{
    "email": "test@example.com"
}
```

**Response:**
```json
{
    "email": "test@example.com",
    "status": "valid",
    "reason": "SMTP accepted",
    "is_disposable": false,
    "is_free_provider": true,
    "is_role_based": false,
    "is_catch_all": false,
    "is_blacklisted": false,
    "score": 0.8,
    "spf": "v=spf1 include:_spf.google.com ~all",
    "dmarc": "v=DMARC1; p=none; rua=mailto:mailauth-reports@google.com",
    "dkim": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
}
```

**Status Values:**
- `valid`: Email is valid and deliverable
- `invalid`: Email is invalid or not deliverable
- `catch-all`: Domain accepts all emails (catch-all)
- `error`: An error occurred during verification

## Authentication

The API requires authentication. Users must be logged in to access the email verification endpoints.

## JavaScript Client

### Using the EmailChecker Class

```javascript
// Initialize the email checker
const emailChecker = new EmailChecker();

// Check API health
const isHealthy = await emailChecker.healthCheck();

// Verify a single email
const result = await emailChecker.verifyEmail('test@example.com');

// Verify multiple emails with progress tracking
const emails = ['test1@example.com', 'test2@example.com', 'test3@example.com'];
const results = await emailChecker.verifyEmails(emails, (progress) => {
    console.log(`Progress: ${progress.percentage}%`);
    console.log(`Current email: ${progress.currentEmail}`);
});

// Export results to CSV
emailChecker.exportToCSV(results);

// Get statistics
const stats = emailChecker.getStatistics(results);
```

### Example Usage

```html
<!DOCTYPE html>
<html>
<head>
    <title>Email Verifier</title>
    <script src="{% static 'js/mailChecker.js' %}"></script>
</head>
<body>
    <input type="email" id="emailInput" placeholder="Enter email">
    <button onclick="verifyEmail()">Verify</button>
    <div id="result"></div>

    <script>
        const emailChecker = new EmailChecker();

        async function verifyEmail() {
            const email = document.getElementById('emailInput').value;
            try {
                const result = await emailChecker.verifyEmail(email);
                document.getElementById('result').innerHTML = 
                    `<p>Status: ${result.status}</p>
                     <p>Score: ${result.score}</p>
                     <p>Reason: ${result.reason}</p>`;
            } catch (error) {
                console.error('Error:', error);
            }
        }
    </script>
</body>
</html>
```

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (authentication required)
- `500`: Internal Server Error

Error responses include details about the error:
```json
{
    "error": "Email verification failed",
    "details": "Invalid email format"
}
```

## Installation and Setup

1. Install Django REST Framework:
```bash
pip install djangorestframework
```

2. Add to `INSTALLED_APPS` in `settings.py`:
```python
INSTALLED_APPS = [
    # ... other apps
    'rest_framework',
    # ... other apps
]
```

3. Add REST Framework configuration:
```python
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
}
```

4. Include the URLs in your main `urls.py`:
```python
from django.urls import path, include

urlpatterns = [
    # ... other patterns
    path('verifier/', include('verifier.urls')),
]
```

## Testing

Run the Django tests:
```bash
python manage.py test verifier.test_api
```

Or test manually by visiting:
- `/verifier/api-example/` - Interactive API example page
- `/verifier/api/health/` - Health check endpoint

## Migration from FastAPI

The Django REST API provides the same functionality as the previous FastAPI implementation with these key differences:

1. **Authentication**: Uses Django's built-in session authentication instead of custom auth
2. **URLs**: Endpoints are under `/verifier/api/` instead of root level
3. **CSRF Protection**: Includes Django's CSRF protection for security
4. **Integration**: Better integration with Django's user system and middleware

The JavaScript client (`mailChecker.js`) handles these differences automatically and provides the same interface as before.

## Performance Considerations

- The API includes rate limiting through Django's built-in mechanisms
- SMTP timeouts are configured to prevent hanging requests
- Multiple MX record fallback is implemented for better reliability
- Results can be cached using Django's caching framework

## Security Features

- CSRF protection for all POST requests
- User authentication required for all verification endpoints
- Input validation and sanitization
- Secure error handling that doesn't expose sensitive information
