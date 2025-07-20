from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from datetime import date, datetime
import json
import time
import uuid
import threading
from collections import defaultdict

from .serializers import (
    SpecificURLScrapingSerializer, 
    MultiLevelScrapingSerializer,
    GoogleScrapingSerializer,
    YellowPagesScrapingSerializer,
    ScrapingResultSerializer,
    ScrapedDataSerializer
)
from .scraper.specific_url_scraper import scrape_specific_url
from .scraper.multi_level_scraper import scrape_multilevel
from .scraper.google_search_scraper import scrape_google_emails
from .scraper.yellow_pages_scraper import scrape_yellow_pages
from .models import ScrapedFromGoogle

# Global progress tracking
scraping_progress = defaultdict(dict)

def check_user_permissions(user):
    """Check user credits and subscription status"""
    user_profile = user.profile
    today = date.today()
    
    # Check subscription validity
    subscription_active = (
        user_profile.subscription_start and 
        user_profile.subscription_end and 
        user_profile.subscription_start <= today <= user_profile.subscription_end
    )
    
    return {
        'credits': user_profile.email_credits,
        'subscription_active': subscription_active,
        'can_scrape': user_profile.email_credits > 0 and subscription_active
    }

def update_progress(task_id, status_msg, progress_percent, data=None):
    """Update progress for a scraping task"""
    scraping_progress[task_id] = {
        'status': status_msg,
        'progress': progress_percent,
        'data': data,
        'timestamp': datetime.now().isoformat()
    }

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def scrape_specific_url_api(request):
    """API endpoint for specific URL scraping"""
    serializer = SpecificURLScrapingSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check user permissions
    permissions = check_user_permissions(request.user)
    if not permissions['can_scrape']:
        return Response({
            'error': 'Insufficient credits or expired subscription',
            'credits': permissions['credits'],
            'subscription_active': permissions['subscription_active']
        }, status=status.HTTP_402_PAYMENT_REQUIRED)
    
    url = serializer.validated_data['url']
    task_id = str(uuid.uuid4())
    
    def scrape_task():
        try:
            update_progress(task_id, 'Starting scraping...', 10)
            
            # Perform scraping
            update_progress(task_id, 'Extracting emails...', 50)
            start_time = time.time()
            result = scrape_specific_url(url, request.user)
            processing_time = time.time() - start_time
            
            emails_found = len(result.get("emails", []))
            
            # Update user credits
            user_profile = request.user.profile
            user_profile.email_credits -= emails_found
            user_profile.save()
            
            # Save to database
            update_progress(task_id, 'Saving results...', 90)
            ScrapedFromGoogle.objects.create(
                user=request.user,
                keyword=f"URL: {url}",
                country="N/A",
                query=url,
                urls=[url],
                emails=result.get("emails", [])
            )
            
            # Final update
            update_progress(task_id, 'Completed', 100, {
                'emails': result.get("emails", []),
                'total_found': emails_found,
                'credits_used': emails_found,
                'remaining_credits': user_profile.email_credits,
                'processing_time': processing_time
            })
            
        except Exception as e:
            update_progress(task_id, f'Error: {str(e)}', 0, {'error': str(e)})
    
    # Start scraping in background
    threading.Thread(target=scrape_task).start()
    
    return Response({
        'task_id': task_id,
        'message': 'Scraping started',
        'credits': permissions['credits']
    }, status=status.HTTP_202_ACCEPTED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def scrape_multilevel_api(request):
    """API endpoint for multi-level scraping"""
    serializer = MultiLevelScrapingSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check user permissions
    permissions = check_user_permissions(request.user)
    if not permissions['can_scrape']:
        return Response({
            'error': 'Insufficient credits or expired subscription',
            'credits': permissions['credits'],
            'subscription_active': permissions['subscription_active']
        }, status=status.HTTP_402_PAYMENT_REQUIRED)
    
    url = serializer.validated_data['url']
    task_id = str(uuid.uuid4())
    
    def scrape_task():
        try:
            update_progress(task_id, 'Initializing multi-level scraping...', 10)
            
            # Perform scraping
            update_progress(task_id, 'Crawling multiple pages...', 30)
            start_time = time.time()
            
            update_progress(task_id, 'Extracting emails from all pages...', 70)
            result = scrape_multilevel(url, request.user)
            processing_time = time.time() - start_time
            
            emails_found = len(result.get("emails", []))
            
            # Update user credits
            user_profile = request.user.profile
            user_profile.email_credits -= emails_found
            user_profile.save()
            
            # Save to database
            update_progress(task_id, 'Saving multi-level results...', 90)
            ScrapedFromGoogle.objects.create(
                user=request.user,
                keyword=f"Multi-level: {url}",
                country="N/A",
                query=url,
                urls=result.get("urls", [url]),
                emails=result.get("emails", [])
            )
            
            # Final update
            update_progress(task_id, 'Multi-level scraping completed', 100, {
                'emails': result.get("emails", []),
                'urls': result.get("urls", []),
                'total_found': emails_found,
                'credits_used': emails_found,
                'remaining_credits': user_profile.email_credits,
                'processing_time': processing_time
            })
            
        except Exception as e:
            update_progress(task_id, f'Error: {str(e)}', 0, {'error': str(e)})
    
    # Start scraping in background
    threading.Thread(target=scrape_task).start()
    
    return Response({
        'task_id': task_id,
        'message': 'Multi-level scraping started',
        'credits': permissions['credits']
    }, status=status.HTTP_202_ACCEPTED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def scrape_google_api(request):
    """API endpoint for Google search scraping"""
    serializer = GoogleScrapingSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check user permissions
    permissions = check_user_permissions(request.user)
    if not permissions['can_scrape']:
        return Response({
            'error': 'Insufficient credits or expired subscription',
            'credits': permissions['credits'],
            'subscription_active': permissions['subscription_active']
        }, status=status.HTTP_402_PAYMENT_REQUIRED)
    
    keyword = serializer.validated_data['keyword']
    country = serializer.validated_data['country']
    result_limit = serializer.validated_data['result_limit']
    task_id = str(uuid.uuid4())
    
    def scrape_task():
        try:
            update_progress(task_id, 'Searching Google...', 10)
            
            # Perform scraping
            update_progress(task_id, f'Processing {result_limit} search results...', 30)
            start_time = time.time()
            
            update_progress(task_id, 'Extracting emails from websites...', 60)
            result = scrape_google_emails(keyword, country, result_limit)
            processing_time = time.time() - start_time
            
            emails_found = len(result.get("emails", []))
            
            # Update user credits
            user_profile = request.user.profile
            user_profile.email_credits -= emails_found
            user_profile.save()
            
            # Save to database
            update_progress(task_id, 'Saving Google search results...', 90)
            ScrapedFromGoogle.objects.create(
                user=request.user,
                keyword=keyword,
                country=country,
                query=result.get("query", ""),
                urls=result.get("urls", []),
                emails=result.get("emails", [])
            )
            
            # Final update
            update_progress(task_id, 'Google scraping completed', 100, {
                'emails': result.get("emails", []),
                'urls': result.get("urls", []),
                'query': result.get("query", ""),
                'total_found': emails_found,
                'credits_used': emails_found,
                'remaining_credits': user_profile.email_credits,
                'processing_time': processing_time
            })
            
        except Exception as e:
            update_progress(task_id, f'Error: {str(e)}', 0, {'error': str(e)})
    
    # Start scraping in background
    threading.Thread(target=scrape_task).start()
    
    return Response({
        'task_id': task_id,
        'message': f'Google scraping started for "{keyword}"',
        'credits': permissions['credits']
    }, status=status.HTTP_202_ACCEPTED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def scraping_progress_api(request, task_id):
    """API endpoint to check scraping progress"""
    if task_id in scraping_progress:
        return Response(scraping_progress[task_id])
    else:
        return Response({
            'error': 'Task not found'
        }, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_scraped_data_api(request):
    """API endpoint to get user's scraped data"""
    scraped_data = ScrapedFromGoogle.objects.filter(user=request.user).order_by('-created_at')
    serializer = ScrapedDataSerializer(scraped_data, many=True)
    return Response(serializer.data)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_scraped_data_api(request, pk):
    """API endpoint to delete scraped data"""
    try:
        scraped_data = ScrapedFromGoogle.objects.get(pk=pk, user=request.user)
        scraped_data.delete()
        return Response({'message': 'Data deleted successfully'})
    except ScrapedFromGoogle.DoesNotExist:
        return Response({
            'error': 'Data not found'
        }, status=status.HTTP_404_NOT_FOUND)
