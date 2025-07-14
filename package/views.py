from django.shortcuts import render, redirect
from django.contrib.auth.models import User  # Import the User model
from django.utils import timezone
from datetime import timedelta
from django.contrib import messages


# Create your views here.

def package(request):
    user = request.user  # Retrieve all users
    context = {
        'user': user,  # Use 'users' instead of 'user' for clarity
    }
    return render(request, 'package/package_pricing.html', context)


def subscription(request, package):
    user = request.user
    if package == 'free':
        if user.profile.claimed_free_package:
            messages.error(request, 'You have already claimed your free package.')
            return redirect('package:package')
        else:
            user.profile.subscription_package = 'free'
            user.profile.email_credits += 500
            user.profile.subscription_start = timezone.now()
            user.profile.subscription_end = timezone.now() + timedelta(days=30)
            user.profile.claimed_free_package = True
            user.profile.save()
        messages.success(request, 'You have successfully subscribed to the free plan with 500 email credits. Your subscription will end on ' + user.profile.subscription_end.strftime('%Y-%m-%d'))
    return redirect('package:package')

