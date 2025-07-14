import time
import re
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright
from scraper.models import ScrapedFromGoogle

def scrape_multilevel(url, user):
    if not isinstance(url, str):
        raise ValueError("The URL must be a valid string.")
    
    emails = set()  # Use a set to automatically handle duplicates
    visited_urls = set()  # Keep track of URLs that have already been visited to avoid re-scraping
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)  # Set headless=True for production
        context = browser.new_context()
        page = context.new_page()

        try:
            # First-level scraping (initial URL)
            scrape_page(url, page, emails, visited_urls)
            
            # Get all links on the first-level page and follow them for second-level scraping
            links = get_links(page)
            for link in links:
                if link not in visited_urls:
                    visited_urls.add(link)
                    scrape_page(link, page, emails, visited_urls)  # Scrape the second-level pages
            
        except Exception as e:
            print(f"Error navigating to {url}: {str(e)}")
        finally:
            page.close()
            browser.close()

    # Save the scraped data to the database
    try:
        ScrapedFromGoogle.objects.create(
            user=user,  # Pass the user object when calling this function
            keyword=url,
            urls=list(visited_urls) if visited_urls else [],  # Ensure URLs are saved as a list
            emails=list(emails) if emails else []  # Ensure emails are saved as a list
        )
        print("Data saved successfully.")
    except Exception as e:
        print(f"Error saving data to the database: {str(e)}")
    return {"emails": list(emails)}  # Return emails as a list, as sets are unordered


def scrape_page(url, page, emails, visited_urls):
    # Scrape emails from the page
    try:
        print(f"Scraping page: {url}")
        page.goto(url, timeout=30000)  # Timeout of 30 seconds for page load
        content = page.content()
        new_emails = extract_valid_emails(content)
        emails.update(new_emails)  # Add emails to the set (avoiding duplicates)
        visited_urls.add(url)  # Add the current URL to visited URLs
    except Exception as e:
        print(f"Error scraping page {url}: {str(e)}")

def get_links(page):
    # Extract all links (anchor tags) from the page
    links = set()
    try:
        anchor_elements = page.query_selector_all("a")  # Select all anchor tags
        for anchor in anchor_elements:
            href = anchor.get_attribute("href")
            if href:
                # Convert relative URLs to absolute URLs
                absolute_url = urljoin(page.url, href)
                links.add(absolute_url)
    except Exception as e:
        print(f"Error getting links from page: {str(e)}")
    return links

def extract_valid_emails(content):
    # Define a more stringent regular expression to match valid emails
    email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"

    # Extract emails using regex
    found_emails = re.findall(email_pattern, content)

    # Remove invalid emails (filtering out non-email-like values such as 'chosen-sprite@2x.png')
    valid_emails = {email.lower() for email in found_emails if is_valid_email(email)}  # Convert to lowercase
    
    return valid_emails

def is_valid_email(email):
    # A more stringent email regex to check for valid email addresses
    email_regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(email_regex, email)) and not email.endswith(('.png', '.jpg', '.jpeg', '.gif'))



