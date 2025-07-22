from django.contrib.auth.decorators import login_required
from django.core.mail import send_mail
from django.shortcuts import redirect
from django.urls import reverse
from django.contrib import messages
from scraper.models import ScrapedFromGoogle
from django.shortcuts import render, get_object_or_404
from email_validator import validate_email, EmailNotValidError
from django.views.decorators.http import require_POST
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import json
from datetime import datetime
from accounts.models import UserProfile
from .models import EmailVerificationHistory
from .utils import smtp_check
import csv
import openpyxl
from django.http import HttpResponse
from functools import wraps


def ajax_login_required(view_func):
    """
    Decorator for AJAX/API views that require authentication.
    Returns JSON error response instead of redirecting to login page.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({
                'success': False,
                'error': 'Authentication required'
            }, status=401)
        return view_func(request, *args, **kwargs)
    return _wrapped_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse, HttpResponse
from django.core.paginator import Paginator
import csv
import io
import openpyxl
import smtplib
import dns.resolver
import json
from datetime import datetime
from .utils import smtp_check
from .serializers import EmailVerificationSerializer, EmailVerificationResponseSerializer
from accounts.models import UserProfile
from .models import EmailVerificationHistory


@login_required
def verify_emails(request):
    user_profile = get_object_or_404(UserProfile, user=request.user)
    
    # Get verification history for this user
    history_list = EmailVerificationHistory.objects.filter(user=request.user)[:10]  # Latest 10 records
    
    return render(request, 'verifier/verifier.html', {
        'user_profile': user_profile,
        'history_list': history_list
    })


@login_required
def api_example(request):
    return render(request, 'verifier/api_example.html')


def auth_status(request):
    """Debug endpoint to check authentication status"""
    return JsonResponse({
        'authenticated': request.user.is_authenticated,
        'user': request.user.username if request.user.is_authenticated else 'Anonymous',
        'session_key': request.session.session_key,
        'csrf_token': request.META.get('CSRF_COOKIE'),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_email_api(request):
    """
    API endpoint to verify a single email address
    """
    serializer = EmailVerificationSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        
        # Get user profile and check credits
        try:
            user_profile = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            return Response(
                {"error": "User profile not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user has enough verify credits
        if user_profile.verify_credits <= 0:
            return Response(
                {
                    "error": "Insufficient verify credits",
                    "message": "You need at least 1 verify credit to verify an email address",
                    "current_credits": user_profile.verify_credits
                },
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        try:
            # Perform email verification
            result = smtp_check(email)
            
            # Deduct 1 verify credit after successful verification
            user_profile.verify_credits -= 1
            user_profile.save()
            
            # Add remaining credits to the response
            result['remaining_credits'] = user_profile.verify_credits
            
            # Serialize the response
            response_serializer = EmailVerificationResponseSerializer(data=result)
            if response_serializer.is_valid():
                return Response(response_serializer.data, status=status.HTTP_200_OK)
            else:
                return Response(
                    {"error": "Invalid response data", "details": response_serializer.errors},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        except Exception as e:
            return Response(
                {"error": "Email verification failed", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_credits(request):
    """
    API endpoint to check user's verify credits
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        return Response({
            "user": request.user.username,
            "verify_credits": user_profile.verify_credits,
            "email_credits": user_profile.email_credits,
            "subscription_package": user_profile.subscription_package,
            "status": user_profile.status
        }, status=status.HTTP_200_OK)
    except UserProfile.DoesNotExist:
        return Response(
            {"error": "User profile not found"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
def health_check(request):
    """
    Health check endpoint
    """
    return Response({"status": "healthy"}, status=status.HTTP_200_OK)


@api_view(['GET'])
def api_root(request):
    """
    API root endpoint
    """
    return Response({
        "message": "Django REST API Email Verifier is running",
        "status": "ok",
        "endpoints": {
            "check_email": "/api/check-email/",
            "check_credits": "/api/check-credits/",
            "health": "/api/health/",
        }
    }, status=status.HTTP_200_OK)


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def batch_verify_emails(request):
    """
    API endpoint to verify multiple emails and save to history
    """
    try:
        print(f"[DEBUG] Batch verify called by user: {request.user.username}")
        data = json.loads(request.body)
        emails = data.get('emails', [])
        title = data.get('title', f'Email Verification - {datetime.now().strftime("%Y-%m-%d %H:%M")}')
        
        print(f"[DEBUG] Received {len(emails)} emails to verify")
        print(f"[DEBUG] Title: {title}")
        
        if not emails:
            return JsonResponse(
                {"error": "No emails provided"},
                status=400
            )
        
        # Get user profile and check credits
        try:
            user_profile = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            return JsonResponse(
                {"error": "User profile not found"},
                status=404
            )
        
        # Check if user has enough verify credits
        if user_profile.verify_credits < len(emails):
            return JsonResponse(
                {
                    "error": "Insufficient verify credits",
                    "message": f"You need {len(emails)} verify credits, but only have {user_profile.verify_credits}",
                    "current_credits": user_profile.verify_credits,
                    "required_credits": len(emails)
                },
                status=402
            )
        
        # Process emails
        results = []
        valid_count = 0
        invalid_count = 0
        catchall_count = 0
        
        for email in emails:
            try:
                result = smtp_check(email.strip())
                results.append(result)
                
                # Count results based on catch-all priority logic with detailed debugging
                is_catch_all = result.get('is_catch_all', False)
                status = result.get('status', 'invalid').lower()
                
                # Debug: Log every email verification result
                print(f"[CATCH-ALL DEBUG] Email: {email.strip()}")
                print(f"[CATCH-ALL DEBUG] Status: '{status}'")
                print(f"[CATCH-ALL DEBUG] is_catch_all: {is_catch_all}")
                print(f"[CATCH-ALL DEBUG] All result fields: {list(result.keys())}")
                
                # Apply priority: Catch-all > Valid > Invalid
                if is_catch_all or status == 'catch-all':
                    catchall_count += 1
                    print(f"[CATCH-ALL DEBUG] ✅ Counted as CATCH-ALL. Total catch-all: {catchall_count}")
                elif status == 'valid':
                    valid_count += 1
                    print(f"[CATCH-ALL DEBUG] Counted as VALID. Total valid: {valid_count}")
                else:
                    invalid_count += 1
                    print(f"[CATCH-ALL DEBUG] Counted as INVALID. Total invalid: {invalid_count}")
                
                print(f"[CATCH-ALL DEBUG] Current counts: Valid={valid_count}, Invalid={invalid_count}, Catch-all={catchall_count}")
                print(f"[CATCH-ALL DEBUG] ---")
                    
            except Exception as e:
                # If verification fails, still add to results
                result = {
                    'email': email.strip(),
                    'status': 'invalid',
                    'reason': str(e),
                    'is_catch_all': False,
                    'domain': email.split('@')[1] if '@' in email else '',
                    'error': str(e),
                    'score': 0
                }
                results.append(result)
                invalid_count += 1
        
        # Deduct credits
        credits_used = len(emails)
        user_profile.verify_credits -= credits_used
        user_profile.save()

        # Save to history
        print(f"[DEBUG] Saving to database: {len(emails)} emails processed")
        print(f"[CATCH-ALL DEBUG] FINAL COUNTS BEFORE SAVING:")
        print(f"[CATCH-ALL DEBUG] Valid: {valid_count}")
        print(f"[CATCH-ALL DEBUG] Invalid: {invalid_count}")
        print(f"[CATCH-ALL DEBUG] Catch-all: {catchall_count}")
        print(f"[CATCH-ALL DEBUG] Total processed: {len(results)}")
        history_record = EmailVerificationHistory.objects.create(
            user=request.user,
            title=title,
            email_count=len(emails),
            verified_emails={'results': results, 'metadata': {'batch_processed': True}},
            credits_used=credits_used,
            valid_count=valid_count,
            invalid_count=invalid_count,
            catchall_count=catchall_count
        )
        print(f"[DEBUG] History record created with ID: {history_record.id}")
        
        return JsonResponse({
            'success': True,
            'history_id': history_record.id,
            'results': results,
            'summary': {
                'total': len(emails),
                'valid': valid_count,
                'invalid': invalid_count,
                'catchall': catchall_count,
                'success_rate': history_record.success_rate
            },
            'remaining_credits': user_profile.verify_credits
        })
        
    except Exception as e:
        print(f"[DEBUG] Error in batch_verify_emails: {str(e)}")
        return JsonResponse(
            {"error": "Batch verification failed", "details": str(e)},
            status=500
        )


@ajax_login_required
def get_verification_history(request):
    """
    Get verification history for the user
    """
    history_list = EmailVerificationHistory.objects.filter(user=request.user)
    
    # Prepare data for JSON response
    history_data = []
    for history in history_list:
        history_data.append({
            'id': history.id,
            'title': history.title,
            'email_count': history.email_count,
            'valid_count': history.valid_count,
            'invalid_count': history.invalid_count,
            'catchall_count': history.catchall_count,
            'success_rate': history.success_rate,
            'credits_used': history.credits_used,
            'created_at': history.created_at.isoformat(),
            'formatted_date': history.formatted_date,
            'status': history.status
        })
    
    return JsonResponse({
        'success': True,
        'history': history_data
    })


@ajax_login_required
def get_verification_details(request, history_id):
    """
    Get detailed results for a specific verification history
    """
    print(f"[DEBUG] get_verification_details called for history_id: {history_id}")
    print(f"[DEBUG] User authenticated: {request.user.is_authenticated}")
    print(f"[DEBUG] User: {request.user}")
    print(f"[DEBUG] Request headers: {dict(request.headers)}")
    
    try:
        history = EmailVerificationHistory.objects.get(id=history_id, user=request.user)
        print(f"[DEBUG] Found history record: {history.title}")
        
        return JsonResponse({
            'success': True,
            'history': {
                'id': history.id,
                'title': history.title,
                'email_count': history.email_count,
                'valid_count': history.valid_count,
                'invalid_count': history.invalid_count,
                'catchall_count': history.catchall_count,
                'success_rate': history.success_rate,
                'credits_used': history.credits_used,
                'created_at': history.created_at.isoformat(),
                'formatted_date': history.formatted_date,
                'status': history.status,
                'verified_emails': history.verified_emails
            }
        })
        
    except EmailVerificationHistory.DoesNotExist:
        print(f"[DEBUG] History record not found for ID: {history_id}, user: {request.user}")
        return JsonResponse({
            'success': False,
            'error': 'Verification history not found'
        }, status=404)


@login_required
def export_verification_history(request, history_id):
    """
    Export verification history results as CSV or Excel
    """
    try:
        history = EmailVerificationHistory.objects.get(id=history_id, user=request.user)
        export_format = request.GET.get('format', 'csv').lower()
        
        # Get filter parameters
        include_valid = request.GET.get('valid', 'true') == 'true'
        include_invalid = request.GET.get('invalid', 'true') == 'true'
        include_catchall = request.GET.get('catchall', 'true') == 'true'
        include_safe = request.GET.get('safe', 'true') == 'true'
        include_medium = request.GET.get('medium', 'true') == 'true'
        include_risk = request.GET.get('risk', 'true') == 'true'
        
        # Filter results based on parameters
        all_results = history.verified_emails.get('results', [])
        filtered_results = []
        
        for result in all_results:
            # Filter by validation status - fix field mapping
            status = result.get('status', 'invalid')
            is_catch_all = result.get('is_catch_all', False)
            
            if status == 'valid' and not is_catch_all and not include_valid:
                continue
            if is_catch_all and not include_catchall:
                continue
            if status == 'invalid' and not include_invalid:
                continue
                
            # Filter by risk level
            score = result.get('score', 0) * 100  # Convert to 0-100 scale
            if score >= 70 and not include_safe:
                continue
            if 41 <= score < 70 and not include_medium:
                continue
            if score < 41 and not include_risk:
                continue
                
            filtered_results.append(result)
        
        if export_format == 'excel':
            # Create Excel file
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Email Verification Results"
            
            # Headers
            headers = ['Email', 'Domain', 'Domain Type', 'Blacklist', 'SMTP', 'Catch-All', 'Score', 'Risk Level']
            ws.append(headers)
            
            # Data
            for result in filtered_results:
                score = result.get('score', 0) * 100
                risk_level = 'Safe' if score >= 70 else 'Medium Risk' if score >= 41 else 'High Risk'
                
                # Extract domain from email if not available
                domain = result.get('domain')
                if not domain and result.get('email'):
                    domain = result.get('email').split('@')[1] if '@' in result.get('email', '') else ''
                
                row = [
                    result.get('email', ''),
                    domain or '',
                    'Free' if result.get('is_free_provider', False) else 'Disposable' if result.get('is_disposable', False) else 'Business',
                    'Yes' if result.get('is_blacklisted', False) else 'No',
                    result.get('status', 'Invalid').title(),
                    'Yes' if result.get('is_catch_all', False) else 'No',
                    f"{score:.0f}",
                    risk_level
                ]
                ws.append(row)
            
            # Create response
            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{history.title}_results.xlsx"'
            wb.save(response)
            return response
            
        else:
            # Create CSV file
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{history.title}_results.csv"'
            
            writer = csv.writer(response)
            writer.writerow(['Email', 'Domain', 'Domain Type', 'Blacklist', 'SMTP', 'Catch-All', 'Score', 'Risk Level'])
            
            for result in filtered_results:
                score = result.get('score', 0) * 100
                risk_level = 'Safe' if score >= 70 else 'Medium Risk' if score >= 41 else 'High Risk'
                
                # Extract domain from email if not available
                domain = result.get('domain')
                if not domain and result.get('email'):
                    domain = result.get('email').split('@')[1] if '@' in result.get('email', '') else ''
                
                writer.writerow([
                    result.get('email', ''),
                    domain or '',
                    'Free' if result.get('is_free_provider', False) else 'Disposable' if result.get('is_disposable', False) else 'Business',
                    'Yes' if result.get('is_blacklisted', False) else 'No',
                    result.get('status', 'Invalid').title(),
                    'Yes' if result.get('is_catch_all', False) else 'No',
                    f"{score:.0f}",
                    risk_level
                ])
            
            return response
            
    except EmailVerificationHistory.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Verification history not found'
        }, status=404)


@ajax_login_required 
def delete_verification_history(request, history_id):
    """
    Delete a specific verification history record
    """
    if request.method == 'DELETE':
        try:
            history = EmailVerificationHistory.objects.get(id=history_id, user=request.user)
            history.delete()
            
            return JsonResponse({
                'success': True,
                'message': 'Verification history deleted successfully'
            })
            
        except EmailVerificationHistory.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Verification history not found'
            }, status=404)
    
    return JsonResponse({
        'success': False,
        'error': 'Method not allowed'
    }, status=405)


@ajax_login_required
def clear_all_history(request):
    """
    Clear all verification history for the user
    """
    if request.method == 'POST':
        deleted_count = EmailVerificationHistory.objects.filter(user=request.user).delete()[0]
        
        return JsonResponse({
            'success': True,
            'message': f'Cleared {deleted_count} verification records'
        })
    
    return JsonResponse({
        'success': False,
        'error': 'Method not allowed'
    }, status=405)
