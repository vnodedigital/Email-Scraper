from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from accounts.models import UserProfile
from scraper.models import ScrapedFromGoogle
from datetime import date

from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.sites.shortcuts import get_current_site
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode

from django.utils.http import urlsafe_base64_decode
from django.contrib.auth import get_user_model, update_session_auth_hash
from django.core.exceptions import ObjectDoesNotExist
from django.utils.crypto import get_random_string
from django.utils.html import format_html

from django.utils.timezone import now
from django.utils import timezone
from datetime import timedelta

from django.http import HttpResponse
import csv
from openpyxl import Workbook


def claim_daily_reward(request):
    if request.user.is_authenticated:
        profile = request.user.profile
        today = now().date()

        if profile.last_reward_claim == today:
            messages.error(request, "You have already claimed your reward today!")
        else:
            profile.email_credits += 50
            profile.last_reward_claim = today
            profile.save()
            messages.success(request, "You have successfully claimed 50 email credits!")

    return redirect('accounts:user_profile')  # Replace 'dashboard' with your desired redirect URL



def custom_login(request):
    # Redirect authenticated users to the profile page
    if request.user.is_authenticated:
        return redirect('accounts:user_profile')
    
    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            messages.error(request, 'Invalid email or password.')
            return redirect('login')
        
        # Check if the user's profile status is pending
        if hasattr(user, 'profile') and user.profile.status == 'pending':
            messages.error(request, 'Your account is not activated. Please check your email inbox for the activation link.')
            return redirect('accounts:custom_login')

        user = authenticate(request, username=user.username, password=password)

        if user is not None:
            login(request, user)
            return redirect('home')  # ? Redirect to home or dashboard
        else:
            messages.error(request, 'Invalid email or password.')

    return render(request, 'accounts/login.html')


def custom_logout(request):
    logout(request)
    return redirect('accounts:custom_login')


@login_required
def user_profile(request):
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    today = date.today()

    # Calculate remaining days
    remaining_days = None
    if profile.subscription_end:
        remaining_days = (profile.subscription_end - today).days

    return render(request, 'accounts/user_profile.html', {
        'profile': profile,
        'today': today,
        'remaining_days': remaining_days,
    })


@login_required
def edit_profile(request):
    user = request.user
    profile, created = UserProfile.objects.get_or_create(user=user)

    if request.method == 'POST':
        user.first_name = request.POST.get('first_name')
        user.last_name = request.POST.get('last_name')
        user.save()

        profile.company_name = request.POST.get('company_name')
        profile.phone_number = request.POST.get('phone_number')
        profile.save()

    # Check if the email has changed
        if user.email != request.POST.get('email'):
            token = get_random_string(length=64)
            profile.verification_token = token
            profile.status = 'pending'  # Set status to pending for email verification
            profile.save()
            current_site = get_current_site(request)
            protocol = 'https' if request.is_secure() else 'http'  # Determine the protocol
            subject = 'Activate Your Account'
            message = render_to_string('accounts/email_confirmation.html', {
                'user': user,
                'domain': current_site.domain,
                'uid': urlsafe_base64_encode(force_bytes(user.pk)),
                'token': token,
                'protocol': protocol,
            })
            user.email = request.POST.get('email')  # Update the email in the user model
            user.save()
            email = EmailMessage(subject, message, to=[user.email])  # Fixed email recipient
            email.send()
            success_message = format_html("Your account 'email' has been updated successfully. We have sent a verification link to your email: <strong>{}</strong>", user.email)
            messages.success(request, success_message)
            logout(request)  # Log out the user after email change
            return redirect('accounts:custom_login')
        
        messages.success(request, 'Profile updated successfully.')
        return redirect('accounts:user_profile')

    context = {
        'user': user,
        'profile': profile,
    }
    return render(request, 'accounts/edit_profile.html', context)


@login_required
def dashboard(request):
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    scraped_results = ScrapedFromGoogle.objects.filter(user=request.user).order_by('-scraped_at')
    today = date.today()

    # Calculate remaining days
    remaining_days = None
    if profile.subscription_end:
        remaining_days = (profile.subscription_end - today).days

    # Calculate total scraped email count
    total_scraped_emails = sum(len(result.emails) for result in scraped_results)

    # Check unique and duplicate emails
    all_emails = [email for result in scraped_results for email in result.emails]
    unique_emails = set(all_emails)
    duplicate_emails = len(all_emails) - len(unique_emails)

    # Extract unique keywords and countries
    unique_keywords = set(result.keyword for result in scraped_results if result.keyword)
    unique_countries = set(result.country for result in scraped_results if result.country)

    return render(request, 'accounts/dashboard.html', {
        'profile': profile,
        'scraped_results': scraped_results,
        'today': today,
        'remaining_days': remaining_days,
        'total_scraped_emails': total_scraped_emails,
        'unique_emails_count': len(unique_emails),
        'duplicate_emails_count': duplicate_emails,
        'unique_keywords': unique_keywords,
        'unique_countries': unique_countries,
    })



def register(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        email = request.POST.get('email')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')

        # Validate passwords
        if password != confirm_password:
            messages.error(request, "Passwords do not match.")
            return render(request, 'accounts/registration.html', {
                'username': username,
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
            })

        # Check if username or email already exists
        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already exists.")
            return render(request, 'accounts/registration.html', {
                'username': username,
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
            })

        if User.objects.filter(email=email).exists():
            messages.error(request, "Email already exists.")
            return render(request, 'accounts/registration.html', {
                'username': username,
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
            })

        # Create user and profile
        user = User.objects.create_user(username=username, first_name=first_name, last_name=last_name, email=email, password=password)
        user.is_active = False  # Deactivate account until email confirmation
        user.save()

        profile = UserProfile.objects.create(user=user, status='pending')

        # Save the token and expiration time in the user's model
        token = get_random_string(length=64)
        print("Token:", token)

        # Save the token in the user's profile
        profile.verification_token = token
        profile.subscription_start = timezone.now()
        profile.subscription_end = timezone.now() + timedelta(days=7)
        profile.save()

        # Send the verification email
        current_site = get_current_site(request)
        protocol = 'https' if request.is_secure() else 'http'  # Determine the protocol
        subject = 'Activate Your Account'
        message = render_to_string('accounts/email_confirmation.html', {
            'user': user,
            'domain': current_site.domain,
            'uid': urlsafe_base64_encode(force_bytes(user.pk)),
            'token': token,
            'protocol': protocol,
        })
        
        email = EmailMessage(subject, message, to=[user.email])
        email.send()
        #messages.success(request, "Your account create successfully. We are verification link in your email" )
        success_message = format_html("Your account has been created successfully. We have sent a verification link to your email: <strong>{}</strong>", user.email)

        messages.success(request, "Registration successful! Please check your email to confirm your account.")
        return redirect('accounts:custom_login')  # Redirect to login page

    return render(request, 'accounts/registration.html')

def verify_email(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
        profile = user.profile  # Access the UserProfile
    except (TypeError, ValueError, OverflowError, User.DoesNotExist, UserProfile.DoesNotExist):
        user = None
        profile = None

    if user is not None and profile is not None:
        if profile.verification_token == token:
            # Mark the user as active
            user.is_active = True
            profile.email_verify = True
            profile.status = 'approve'
            profile.verification_token = None  # Clear the token after verification
            user.save()
            profile.save()
            messages.success(request, "Your email has been verified successfully. You can now log in.")
            return redirect('accounts:custom_login')  # Redirect to login page
        else:
            messages.error(request, "The verification link is invalid or has expired. Please request a new one.")
    else:
        messages.error(request, "The verification link is invalid or has expired. Please request a new one.")

    return redirect('accounts:custom_login')  # Redirect to login page



def forgot_password(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        User = get_user_model()

        try:
            # Check if the user with the provided email exists
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            user = None

        if user is not None:
            # Generate a unique token for password reset
            token = get_random_string(length=64)

            # Ensure the user has a profile
            profile, created = UserProfile.objects.get_or_create(user=user)
            profile.verification_token = token
            profile.save()

            # Send the password reset email
            current_site = get_current_site(request)
            protocol = 'https' if request.is_secure() else 'http'  # Determine the protocol
            subject = 'Password Reset Request'
            message = render_to_string('accounts/password_reset_email.html', {
                'user': user,
                'domain': current_site.domain,
                'uid': urlsafe_base64_encode(force_bytes(user.pk)),
                'token': token,
                'protocol': protocol,
            })

            email_message = EmailMessage(subject, message, to=[user.email])
            email_message.send()

        # Always show a success message to prevent email enumeration
        messages.success(request, "If your email exists in our system, you will receive a password reset link shortly.")
        return redirect('accounts:custom_login')

    return render(request, 'accounts/forgot_password.html')


def reset_password(request, uidb64, token):
    try:
        # Decode the user ID from the URL
        uid = force_str(urlsafe_base64_decode(uidb64))
        User = get_user_model()
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, ObjectDoesNotExist):
        user = None

    # Check if the user and token are valid
    if user is not None:
        try:
            profile = UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            profile = None

        if profile is not None and profile.verification_token == token:
            # Valid token, proceed with password reset
            if request.method == 'POST':
                password1 = request.POST.get('password1')
                password2 = request.POST.get('password2')

                if password1 == password2:
                    # Set the new password and clear the token
                    user.set_password(password1)
                    profile.verification_token = None  # Clear the token after password reset
                    user.save()
                    profile.save()

                    # Update the session with the new password
                    update_session_auth_hash(request, user)
                    messages.success(request, "Your password has been reset successfully. You can now log in with your new password.")
                    return redirect('accounts:custom_login')
                else:
                    messages.error(request, "Passwords do not match. Please try again.")
            return render(request, 'accounts/reset_password.html', {'uidb64': uidb64, 'token': token})
        else:
            messages.error(request, "The password reset link is invalid or has expired. Please request a new one.")
            return redirect('accounts:forgot_password')
    else:
        messages.error(request, "The password reset link is invalid or has expired. Please request a new one.")
        return redirect('accounts:forgot_password')


@login_required
def export_filtered_data(request):
    if request.method == "POST":
        keyword = request.POST.get("keyword", "")
        country = request.POST.get("country", "")
        email_filter = request.POST.get("email", "")

        # Filter data based on the selected values
        scraped_results = ScrapedFromGoogle.objects.filter(user=request.user)
        if keyword != "":
            scraped_results = scraped_results.filter(keyword=keyword)

        if country != "":
            scraped_results = scraped_results.filter(country=country)


        # Prepare email data
        all_emails = [email for result in scraped_results for email in result.emails]
        unique_emails = list(set(all_emails)) if email_filter == "unique" else all_emails

        # Create Excel file
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Filtered Data"

        # Add headers
        sheet.append(["Keyword", "Country", "Email"])

        # Add data rows
        if email_filter == "unique":
            for email in unique_emails:
                for result in scraped_results:
                    if email in result.emails:
                        sheet.append([result.keyword, result.country, email])
                        break
        else:
            for result in scraped_results:
                for email in result.emails:
                    sheet.append([result.keyword, result.country, email])

        # Prepare response
        filename = f"{keyword}_{country}_{email_filter}.xlsx" if keyword or country else "filtered_data.xlsx"
        response = HttpResponse(content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = 'attachment; filename="{}"'.format(filename)
        workbook.save(response)
        return response

    return redirect("user_profile")
