import re
import time
from playwright.sync_api import sync_playwright

def get_google_search_results(query, num_pages=5):
    """Scrapes multiple pages of Google search results."""
    search_results = set()  # Store unique URLs

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        google_search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}&num=10"
        page.goto(google_search_url)
        page.wait_for_load_state("domcontentloaded")
        time.sleep(2)

        for _ in range(num_pages):
            # Extract search result links
            links = page.locator("a:has(h3)").evaluate_all("elements => elements.map(e => e.href)")
            search_results.update(links)

            # Try clicking the "Next" button to go to the next page
            try:
                next_button = page.locator("text=Next")
                if next_button.is_visible():
                    next_button.click()
                    page.wait_for_load_state("domcontentloaded")
                    time.sleep(2)  # Avoid rate-limiting
                else:
                    break  # Stop if no Next button
            except:
                break  # Stop if there's an error

        browser.close()
    
    return list(search_results)

def extract_emails_from_page(page):
    """Extracts emails from a web page."""
    content = page.content()
    email_pattern = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    found_emails = list(set(re.findall(email_pattern, content)))
    return found_emails

def scrape_emails_from_urls(urls):
    """Scrapes emails from a list of URLs using Playwright."""
    emails = set()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for url in urls:
            try:
                print(f"Processing URL: {url}")
                page.goto(url, timeout=30000)
                page.wait_for_load_state("domcontentloaded")
                found_emails = extract_emails_from_page(page)
                emails.update(found_emails)
            except Exception as e:
                print(f"Failed to scrape {url}: {e}")

        browser.close()

    return list(emails)

