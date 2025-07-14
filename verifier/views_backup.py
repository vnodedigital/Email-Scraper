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
def verify_email(request, result_id):
    result = get_object_or_404(ScrapedFromGoogle, pk=result_id)
    emails = result.emails or []

    valid_emails = []
    invalid_emails = []

    for email in emails:
        try:
            validate_email(email)
            valid_emails.append(email)
        except EmailNotValidError:
            invalid_emails.append(email)

    return render(request, 'verifier/verify_email.html', {
        'result': result,
        'valid_emails': valid_emails,
        'invalid_emails': invalid_emails
    })


@require_POST
@login_required
def save_valid_emails(request, result_id):
    result = get_object_or_404(ScrapedFromGoogle, pk=result_id)
    
    # Get valid emails from POST and split into list
    valid_emails_str = request.POST.get('valid_emails', '')
    new_valid_emails = [email.strip() for email in valid_emails_str.split(',') if email.strip()]

    # Replace the old emails with the new valid ones
    result.emails = new_valid_emails
    result.verified = True
    result.save()

    messages.success(request, "Valid emails saved successfully.")
    return redirect('accounts:dashboard')





def smtp_check(email):
    import logging
    import time
    try:
        domain = email.split('@')[1]
        records = dns.resolver.resolve(domain, 'MX')
        mx_record = str(records[0].exchange).rstrip('.')
        server = smtplib.SMTP(timeout=20)
        server.set_debuglevel(0)
        server.connect(mx_record, 25)
        server.helo('vnode.digital')
        server.mail('noreply@vnode.digital.com')
        time.sleep(1)
        code, message = server.rcpt(email)
        server.quit()
        # 250/251 = valid, 550/551/553/554 = unavailable, others = unavailable
        if code in (250, 251):
            return True
        else:
            logging.warning(f'SMTP check failed or unknown code for {email}: {code} {message}')
            return False
    except Exception as e:
        import sys
        logging.error(f'SMTP check error for {email}: {e} ({sys.exc_info()})')
        return False


def verify_emails(request):
    valid_emails = []
    invalid_emails = []
    inbox_unavailable = []
    if request.method == 'POST':
        emails = []
        # Get emails from textarea
        textarea_emails = request.POST.get('emails', '')
        if textarea_emails:
            emails += [e.strip() for e in textarea_emails.splitlines() if e.strip()]
        # Get emails from file
        uploaded_file = request.FILES.get('file')
        if uploaded_file:
            if uploaded_file.name.endswith('.csv'):
                decoded = uploaded_file.read().decode('utf-8')
                reader = csv.reader(io.StringIO(decoded))
                for row in reader:
                    emails += [e.strip() for e in row if e.strip()]
            elif uploaded_file.name.endswith(('.xls', '.xlsx')):
                wb = openpyxl.load_workbook(uploaded_file)
                ws = wb.active
                for row in ws.iter_rows(values_only=True):
                    for cell in row:
                        if cell:
                            emails.append(str(cell).strip())
                            
            
        # Remove duplicates
        emails = list(set(emails))
        # Check if inbox check is requested
        check_inbox = request.POST.get('check_inbox') == '1'
        # Validate emails using email_validator
        for email in emails:
            try:
                validate_email(email)
                if check_inbox:
                    result = smtp_check(email)
                    if result == "valid":
                        valid_emails.append(email)
                    elif result == "temporary":
                        # Optionally, add to a separate list or notify user to try again later
                        inbox_unavailable.append(email)
                    else:
                        inbox_unavailable.append(email)
                else:
                    valid_emails.append(email)
            except EmailNotValidError:
                invalid_emails.append(email)
    return render(request, 'verifier/manual_verify.html', {
        'valid_emails': valid_emails,
        'invalid_emails': invalid_emails,
        'inbox_unavailable': inbox_unavailable
    })
