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
from django.views.decorators.http import require_http_methods
import csv
import io
import openpyxl
import smtplib
import dns.resolver
import json
from .utils import smtp_check
from .serializers import EmailVerificationSerializer, EmailVerificationResponseSerializer


@login_required
def verify_emails(request):
    return render(request, 'verifier/verifier.html')


@login_required
def api_example(request):
    return render(request, 'verifier/api_example.html')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_email_api(request):
    """
    API endpoint to verify a single email address
    """
    serializer = EmailVerificationSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        
        try:
            # Perform email verification
            result = smtp_check(email)
            
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
            "health": "/api/health/",
        }
    }, status=status.HTTP_200_OK)
