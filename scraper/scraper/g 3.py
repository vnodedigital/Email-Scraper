import random
import re
import time
import urllib.parse
import asyncio
from playwright.async_api import async_playwright
from requests import get
from bs4 import BeautifulSoup

PROXY_LIST = [
    "http://frilmiqr:14kc1mwxmymc@38.154.227.167:5868", 
    "http://frilmiqr:14kc1mwxmymc@38.153.152.244:9594",
    "http://frilmiqr:14kc1mwxmymc@86.38.234.176:6630",
    "http://frilmiqr:14kc1mwxmymc@173.211.0.148:6641",
    "http://frilmiqr:14kc1mwxmymc@161.123.152.115:6360",
]

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

async def extract_emails_from_url(url):
    """Extract emails from a webpage using Playwright asynchronously."""
    emails = set()
    
    async with async_playwright() as p:
        browser = None
        try:
            # Proxy configuration
            proxy_str = random.choice(PROXY_LIST)
            parsed_proxy = urllib.parse.urlparse(proxy_str)
            
            # Correct proxy server format with scheme
            proxy_server = f"{parsed_proxy.scheme}://{parsed_proxy.hostname}:{parsed_proxy.port}"
            
            browser = await p.chromium.launch(
                headless=True,
                proxy={
                    "server": proxy_server,
                    "username": parsed_proxy.username,
                    "password": parsed_proxy.password
                }
            )
            
            page = await browser.new_page(
                user_agent=random.choice(USER_AGENTS),
                extra_http_headers={'Accept-Language': 'en-US,en;q=0.9'}
            )
            
            await page.goto(url, timeout=60000)
            await page.wait_for_load_state("networkidle")
            
            content = await page.evaluate('document.body.textContent') or ""
            
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'  # Fixed regex
            found_emails = re.findall(email_pattern, content, re.IGNORECASE)
            
            for email in found_emails:
                if isinstance(email, str):
                    clean_email = email.strip().lower()
                    if not clean_email.endswith(('.png', '.jpg', '.webp')):
                        emails.add(clean_email)

        except Exception as e:
            print(f"Scraping error: {str(e)}")
        finally:
            if browser:
                await browser.close()

    return list(emails)

def get_google_results_with_proxy(query, max_results=10):
    """Fetch Google results with proxy rotation."""
    search_url = f"https://www.google.com/search?q={urllib.parse.quote(query)}&num={max_results}"
    proxy = random.choice(PROXY_LIST)
    
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
    }

    try:
        response = get(search_url, headers=headers, proxies={"http": proxy, "https": proxy}, timeout=30)
        
        if response.status_code == 200:
            # Improved URL extraction with HTML parser
            soup = BeautifulSoup(response.text, 'html.parser')
            links = []
            for a in soup.find_all('a', href=True):
                url = a['href']
                if url.startswith('/url?q='):
                    # Safely extract the 'q' parameter
                    # Safely extract the 'q' parameter
                    parsed_url = urllib.parse.urlparse(url)
                    params = urllib.parse.parse_qs(parsed_url.query)

                    # Ensure 'q' exists and is a non-empty list before trying to access the first element
                    if 'q' in params and isinstance(params['q'], list) and params['q']:
                        url = int(params['q'][0])
                    else:
                        continue  # If 'q' doesn't exist or isn't valid, skip this URL
                if isinstance(url, str) and url.startswith('http'):
                    links.append(url)
            
            # Filter out Google domains
            search_results = [url for url in links 
                            if not urllib.parse.urlparse(url).netloc.endswith(('google.com', 'google.co.uk'))]
            
            return list(dict.fromkeys(search_results))[:max_results]  # Remove duplicates
            
        return []

    except Exception as e:
        print(f"Search error: {str(e)}")
        return []

async def scrape_google_search(query):
    """Main scraping function with async handling"""
    all_emails = set()
    
    try:
        search_results = get_google_results_with_proxy(query)
        if not isinstance(search_results, list):
            raise ValueError("Invalid search results format")
            
        print(f"Found {len(search_results)} valid URLs to process")
        
        for index, url in enumerate(search_results):
            if not isinstance(url, str) or not url.startswith('http'):
                continue
                
            print(f"Processing URL {index+1}/{len(search_results)}: {url[:60]}...")
            
            try:
                emails = await extract_emails_from_url(url)
                if emails:
                    all_emails.update(emails)
                    
                # Randomized delay with exponential backoff
                delay = random.uniform(1, 5) + (2 ** index)
                time.sleep(min(delay, 30))
                
            except Exception as e:
                print(f"Error processing {url}: {str(e)}")
                continue
                
    except Exception as e:
        print(f"Critical error: {str(e)}")
        
    return sorted(all_emails)

# To run the scraping function
async def main():
    query = "example search query"
    emails = await scrape_google_search(query)
    print(f"Extracted emails: {emails}")

# Run the async scraping
asyncio.run(main())
