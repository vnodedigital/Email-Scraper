from django.shortcuts import render, redirect
from django.contrib.auth.models import User  # Import the User model
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from datetime import timedelta, date
from django.contrib import messages
from django.http import JsonResponse


# Helper functions
def check_scraper_subscription_valid(user_profile):
    """Check if the scraper subscription is valid"""
    today = date.today()
    return (user_profile.subscription_start and 
            user_profile.subscription_end and 
            user_profile.subscription_start <= today <= user_profile.subscription_end)

def check_verifier_subscription_valid(user_profile):
    """Check if the verifier subscription is valid"""
    today = date.today()
    return (user_profile.verifier_subscription_start and 
            user_profile.verifier_subscription_end and 
            user_profile.verifier_subscription_start <= today <= user_profile.verifier_subscription_end)

def get_subscription_status(user_profile):
    """Get comprehensive subscription status for both services"""
    today = date.today()
    
    # Scraper subscription status
    scraper_active = check_scraper_subscription_valid(user_profile)
    scraper_days_remaining = 0
    if user_profile.subscription_end and user_profile.subscription_end >= today:
        scraper_days_remaining = (user_profile.subscription_end - today).days
    
    # Verifier subscription status
    verifier_active = check_verifier_subscription_valid(user_profile)
    verifier_days_remaining = 0
    if user_profile.verifier_subscription_end and user_profile.verifier_subscription_end >= today:
        verifier_days_remaining = (user_profile.verifier_subscription_end - today).days
    
    return {
        'scraper_active': scraper_active,
        'scraper_days_remaining': scraper_days_remaining,
        'verifier_active': verifier_active,
        'verifier_days_remaining': verifier_days_remaining,
        'today': today
    }


# Create your views here.

@login_required
def package(request):
    user = request.user
    subscription_status = get_subscription_status(user.profile)
    
    context = {
        'user': user,
        'profile': user.profile,
        'subscription_status': subscription_status,
        'today': subscription_status['today'],
        'remaining_days': subscription_status['scraper_days_remaining'],
        'verifier_remaining_days': subscription_status['verifier_days_remaining'],
    }
    return render(request, 'package/package_pricing.html', context)


@login_required
def scraper_subscription(request, package):
    user = request.user
    
    if package == 'free':
        if user.profile.claimed_free_package:
            messages.error(request, 'You have already claimed your free scraper package.')
            return redirect('package:package')
        else:
            user.profile.scraper_package = 'free'
            user.profile.email_credits += 1500  # 1,500 email extractions as per pricing page
            user.profile.subscription_start = timezone.now()
            user.profile.subscription_end = timezone.now() + timedelta(days=30)
            user.profile.is_trial = True
            user.profile.claimed_free_package = True
            user.profile.save()
            messages.success(request, 'You have successfully subscribed to the free scraper plan with 1,500 email credits. Your subscription will end on ' + user.profile.subscription_end.strftime('%Y-%m-%d'))
    
    elif package == 'starter':
        user.profile.scraper_package = 'starter'
        user.profile.email_credits += 20000  # 20,000 email extractions
        user.profile.subscription_start = timezone.now()
        user.profile.subscription_end = timezone.now() + timedelta(days=30)
        user.profile.is_trial = False
        user.profile.save()
        messages.success(request, 'You have successfully subscribed to the Starter scraper plan with 20,000 email credits for $30/month. Your subscription will end on ' + user.profile.subscription_end.strftime('%Y-%m-%d'))
    
    elif package == 'pro':
        user.profile.scraper_package = 'pro'
        user.profile.email_credits += 50000  # 50,000 email extractions
        user.profile.subscription_start = timezone.now()
        user.profile.subscription_end = timezone.now() + timedelta(days=30)
        user.profile.is_trial = False
        user.profile.save()
        messages.success(request, 'You have successfully subscribed to the Pro scraper plan with 50,000 email credits for $50/month. Your subscription will end on ' + user.profile.subscription_end.strftime('%Y-%m-%d'))
    
    elif package == 'enterprise':
        user.profile.scraper_package = 'enterprise'
        user.profile.email_credits += 100000  # 100,000+ email extractions
        user.profile.subscription_start = timezone.now()
        user.profile.subscription_end = timezone.now() + timedelta(days=30)
        user.profile.is_trial = False
        user.profile.save()
        messages.success(request, 'You have successfully subscribed to the Enterprise scraper plan with 100,000+ email credits for $100/month. Your subscription will end on ' + user.profile.subscription_end.strftime('%Y-%m-%d'))
    
    else:
        messages.error(request, 'Invalid package selected.')
    
    return redirect('package:package')


@login_required
def verifier_package(request):
    user = request.user
    context = {
        'user': user,
    }
    return render(request, 'package/verifier_pricing.html', context)


@login_required
def verifier_subscription(request, package):
    user = request.user
    
    if package == 'free':
        if user.profile.claimed_free_verifier_package:
            messages.error(request, 'You have already claimed your free verifier package.')
            return redirect('package:package')
        else:
            user.profile.verifier_package = 'free'
            user.profile.verify_credits += 100
            user.profile.verifier_subscription_start = timezone.now()
            user.profile.verifier_subscription_end = timezone.now() + timedelta(days=30)
            user.profile.verifier_is_trial = True
            user.profile.claimed_free_verifier_package = True
            user.profile.save()
            messages.success(request, 'You have successfully subscribed to the free verifier plan with 100 verification credits. Your subscription will end on ' + user.profile.verifier_subscription_end.strftime('%Y-%m-%d'))
    
    elif package == 'starter':
        user.profile.verifier_package = 'starter'
        user.profile.verify_credits += 5000  # 5,000 verifications
        user.profile.verifier_subscription_start = timezone.now()
        user.profile.verifier_subscription_end = timezone.now() + timedelta(days=30)
        user.profile.verifier_is_trial = False
        user.profile.save()
        messages.success(request, 'You have successfully subscribed to the Starter verifier plan with 5,000 verification credits for $19/month. Your subscription will end on ' + user.profile.verifier_subscription_end.strftime('%Y-%m-%d'))
    
    elif package == 'pro':
        user.profile.verifier_package = 'pro'
        user.profile.verify_credits += 20000  # 20,000 verifications
        user.profile.verifier_subscription_start = timezone.now()
        user.profile.verifier_subscription_end = timezone.now() + timedelta(days=30)
        user.profile.verifier_is_trial = False
        user.profile.save()
        messages.success(request, 'You have successfully subscribed to the Pro verifier plan with 20,000 verification credits for $49/month. Your subscription will end on ' + user.profile.verifier_subscription_end.strftime('%Y-%m-%d'))
    
    elif package == 'enterprise':
        user.profile.verifier_package = 'enterprise'
        user.profile.verify_credits += 100000  # Unlimited (100,000 as practical limit)
        user.profile.verifier_subscription_start = timezone.now()
        user.profile.verifier_subscription_end = timezone.now() + timedelta(days=30)
        user.profile.verifier_is_trial = False
        user.profile.save()
        messages.success(request, 'You have successfully subscribed to the Enterprise verifier plan with unlimited verification credits for $99/month. Your subscription will end on ' + user.profile.verifier_subscription_end.strftime('%Y-%m-%d'))
    
    else:
        messages.error(request, 'Invalid package selected.')
    
    return redirect('package:package')


@login_required
def subscription_status_api(request):
    """API endpoint to get current subscription status"""
    try:
        user_profile = request.user.profile
        status = get_subscription_status(user_profile)
        
        return JsonResponse({
            'success': True,
            'scraper': {
                'package': user_profile.scraper_package,
                'active': status['scraper_active'],
                'days_remaining': status['scraper_days_remaining'],
                'end_date': user_profile.subscription_end.isoformat() if user_profile.subscription_end else None,
                'is_trial': user_profile.is_trial,
                'credits': user_profile.email_credits
            },
            'verifier': {
                'package': user_profile.verifier_package,
                'active': status['verifier_active'],
                'days_remaining': status['verifier_days_remaining'],
                'end_date': user_profile.verifier_subscription_end.isoformat() if user_profile.verifier_subscription_end else None,
                'is_trial': user_profile.verifier_is_trial,
                'credits': user_profile.verify_credits
            }
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@login_required
def cancel_subscription(request, service_type):
    """Cancel a specific subscription (scraper or verifier)"""
    if request.method == 'POST':
        user_profile = request.user.profile
        
        if service_type == 'scraper':
            user_profile.scraper_package = 'free'
            user_profile.subscription_end = timezone.now().date()
            user_profile.is_trial = False
            user_profile.save()
            messages.success(request, 'Your scraper subscription has been cancelled. You will retain access until your current billing period ends.')
            
        elif service_type == 'verifier':
            user_profile.verifier_package = 'free'
            user_profile.verifier_subscription_end = timezone.now().date()
            user_profile.verifier_is_trial = False
            user_profile.save()
            messages.success(request, 'Your verifier subscription has been cancelled. You will retain access until your current billing period ends.')
            
        else:
            messages.error(request, 'Invalid service type.')
    
    return redirect('package:package')


@login_required
def upgrade_subscription(request, service_type, new_package):
    """Upgrade an existing subscription"""
    user_profile = request.user.profile
    
    if service_type == 'scraper':
        if new_package in ['starter', 'pro', 'enterprise']:
            old_package = user_profile.scraper_package
            user_profile.scraper_package = new_package
            
            # Add credits based on package
            credits_map = {
                'starter': 20000,
                'pro': 50000,
                'enterprise': 100000
            }
            user_profile.email_credits += credits_map.get(new_package, 0)
            
            # Extend subscription if active, otherwise start new
            if check_scraper_subscription_valid(user_profile):
                user_profile.subscription_end = user_profile.subscription_end + timedelta(days=30)
            else:
                user_profile.subscription_start = timezone.now()
                user_profile.subscription_end = timezone.now() + timedelta(days=30)
            
            user_profile.is_trial = False
            user_profile.save()
            
            messages.success(request, f'Successfully upgraded scraper subscription from {old_package} to {new_package}!')
        else:
            messages.error(request, 'Invalid package for upgrade.')
            
    elif service_type == 'verifier':
        if new_package in ['starter', 'pro', 'enterprise']:
            old_package = user_profile.verifier_package
            user_profile.verifier_package = new_package
            
            # Add credits based on package
            credits_map = {
                'starter': 5000,
                'pro': 20000,
                'enterprise': 100000
            }
            user_profile.verify_credits += credits_map.get(new_package, 0)
            
            # Extend subscription if active, otherwise start new
            if check_verifier_subscription_valid(user_profile):
                user_profile.verifier_subscription_end = user_profile.verifier_subscription_end + timedelta(days=30)
            else:
                user_profile.verifier_subscription_start = timezone.now()
                user_profile.verifier_subscription_end = timezone.now() + timedelta(days=30)
            
            user_profile.verifier_is_trial = False
            user_profile.save()
            
            messages.success(request, f'Successfully upgraded verifier subscription from {old_package} to {new_package}!')
        else:
            messages.error(request, 'Invalid package for upgrade.')
    else:
        messages.error(request, 'Invalid service type.')
    
    return redirect('package:package')

