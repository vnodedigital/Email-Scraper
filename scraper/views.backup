from django.contrib.auth.decorators import login_required

from django.shortcuts import render
from .scraper.specific_url_scraper import scrape_specific_url
from .scraper.multi_level_scraper import scrape_multilevel
from .scraper.yellow_pages_scraper import scrape_yellow_pages
from .scraper.google_search_scraper import scrape_google_emails
from .models import ScrapedFromGoogle
from django.shortcuts import get_object_or_404, redirect
from googlesearch import search
from django.views.decorators.csrf import csrf_exempt
from datetime import date

from django.shortcuts import render, redirect


@login_required
def scraper(request):
    return render(request, "scraper/scraper.html")


@login_required
def scrape_specific(request):
    url = request.GET.get("url")
    if url:
        # Access the user's profile to check email credits
        user_profile = request.user.profile

        # Check email credits
        if user_profile.email_credits <= 0:
            return render(request, "scraper/scraper.html", {"error": "You have 0 email credits remaining. Please upgrade your plan."})
        user=request.user  # Get the user object
        result = scrape_specific_url(url, user)  # Now this returns a list of emails
        emails_len = len(result["emails"])

        # Deduct email credits
        user_profile.email_credits -= emails_len
        user_profile.save()

        return render(request, "scraper/scraper.html", {"emails": result["emails"], "url": url})
    return render(request, "scraper/scraper.html")

@login_required
def scrape_multilevel_view(request):
    url = request.GET.get('url', None)
    user = request.user
    if url:
        try:
            # Access the user's profile to check email credits
            user_profile = request.user.profile

            # Check subscription validity
            today = date.today()
            if not (user_profile.subscription_start and user_profile.subscription_end and user_profile.subscription_start <= today <= user_profile.subscription_end):
                return render(request, "scraper/scraper.html", {"error": "Your subscription is Expaired. Please renew your subscription to continue."})

            # Check email credits
            if user_profile.email_credits <= 0:
                return render(request, "scraper/scraper.html", {"error": "You have 0 email credits remaining. Please upgrade your plan."})

            if isinstance(url, str):
                result = scrape_multilevel(url, user)
                emails_len = len(result["emails"])

                # Deduct email credits
                user_profile.email_credits -= emails_len
                user_profile.save()

                return render(request, "scraper/scraper.html", {"emails": result["emails"], "url": url})
            else:
                raise ValueError("The URL parameter is not a valid string.")
        except Exception as e:
            return render(request, "scraper/scraper.html", {"error": str(e)})
    else:
        return render(request, "scraper/scraper.html", {"error": "No URL provided."})


@login_required
def scrape_google_keyword(request):
    if request.method == "POST":
        keyword = request.POST.get("keyword")
        country = request.POST.get("country")
        result_list = request.POST.get("result_list")

        # Access the user's profile to check email credits and subscription
        user_profile = request.user.profile

        # Check subscription validity
        today = date.today()
        if not (user_profile.subscription_start and user_profile.subscription_end and user_profile.subscription_start <= today <= user_profile.subscription_end):
            return render(request, "scraper/scraper.html", {"error": "Your subscription is Expaired. Please renew your subscription to continue."})

        # Check email credits
        if user_profile.email_credits <= 0:
            return render(request, "scraper/scraper.html", {"error": "You have 0 email credits remaining. Please upgrade your plan."})

        try:
            result_count = int(result_list)
            result = scrape_google_emails(keyword, country, result_count)

            # ✅ Automatically save to database
            ScrapedFromGoogle.objects.create(
                user=request.user,
                keyword=keyword,
                country=country,
                query=result["query"],
                urls=result["urls"],
                emails=result["emails"]
            )
            emails_len=len(result["emails"])
            # Deduct 1 email credit
            user_profile.email_credits -= emails_len
            user_profile.save()

            return render(request, "scraper/scraper.html", {
                "g_emails": result["emails"],
                "urls": result["urls"],
                "keyword": keyword,
                "country": country,
                "query": result["query"]
            })
        except Exception as e:
            return render(request, "scraper/scraper.html", {"error": str(e)})

    return render(request, "scraper/scraper.html")


@login_required
def save_result_view(request):
    keyword = request.GET.get("keyword")
    country = request.GET.get("country")
    query = request.GET.get("query")
    urls_raw = request.GET.get("urls", "")
    emails_raw = request.GET.get("emails", "")

    urls = urls_raw.split(",") if urls_raw else []
    emails = emails_raw.split(",") if emails_raw else []

    if keyword and emails:
        # Create and save to DB
        saved = ScrapedFromGoogle(
            user=request.user,
            keyword=keyword,
            country=country,
            query=query,
            urls=urls,
            emails=emails
        )
        saved.save()  # 🔥 This is the important line

        message = "✅ Emails saved successfully!"
    else:
        message = "⚠️ Missing keyword or emails — nothing was saved."

    return render(request, "scraper/scraper.html", {
        "g_emails": emails,
        "urls": urls,
        "keyword": keyword,
        "country": country,
        "query": query,
        "message": message
    })


@login_required
def delete_scraped_result(request, pk):
    result = get_object_or_404(ScrapedFromGoogle, pk=pk, user=request.user)
    result.delete()
    return redirect('accounts:dashboard')  # or wherever your profile page is
















@login_required
def scrape_yellow_pages_view(request):
    if request.method == 'POST':
        keyword = request.POST.get("keyword", "").strip()
        location = request.POST.get("location", "").strip()
        result_limit = int(request.POST.get("result_limit", 5))

        if not keyword or not location:
            return render(request, "scraper/scraper.html", {
                "error": "Keyword and location are required."
            })

        result = scrape_yellow_pages(keyword, location, result_limit)

        if result.get("success"):
            return render(request, "scraper/results.html", {
                "companies": result["companies"],
                "keyword": keyword,
                "location": location,
                "total_links": result["total_links"]
            })
        else:
            return render(request, "scraper/scraper.html", {
                "error": f"Yellow Pages scraping error: {result.get('error')}"
            })

    return render(request, "scraper/scraper.html")