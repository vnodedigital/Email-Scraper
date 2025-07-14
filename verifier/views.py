from django.contrib.auth.decorators import login_required
from django.core.mail import send_mail
from django.shortcuts import redirect
from django.urls import reverse
from django.contrib import messages
from scraper.models import ScrapedFromGoogle
from django.shortcuts import render, get_object_or_404
from email_validator import validate_email, EmailNotValidError
from django.views.decorators.http import require_POST
import csv
import io
import openpyxl
import smtplib
import dns.resolver


@login_required
def verify_emails(request):
    return render(request, 'verifier/verifier.html')
