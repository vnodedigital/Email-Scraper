import time
import tempfile
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import random

def scrape_yellow_pages(keyword, location, result_limit=5):
    """Scrape Yellow Pages for companies based on a search term and location."""
    # Set a random user agent (optional, for better simulation)
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ]
    user_agent = random.choice(user_agents)

    # Create a temporary unique user data directory
    user_data_dir = tempfile.mkdtemp()

    try:
        # Start Playwright and launch the browser
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)  # Launch without proxy
            page = browser.new_page()

            # # Set user-agent and custom headers
            # page.set_user_agent(user_agent)

            # Open the Yellow Pages search URL
            url = f"https://www.yellowpages.com/search?search_terms={keyword}&geo_location_terms={location}"
            print(f"Url: {url}")
            page.goto(url)

            # Wait for the results to load (increase timeout if needed)
            page.wait_for_selector('.result', timeout=900000)

            # Scroll down to trigger dynamic loading
            for _ in range(5):  # Scroll down 5 times
                page.evaluate("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(random.uniform(2, 4))

            # Save the raw page source for debugging
            with open("yellowpages_output.html", "w", encoding="utf-8") as f:
                f.write(page.content())

            # Parse the page source with BeautifulSoup
            soup = BeautifulSoup(page.content(), 'html.parser')
            listings = soup.find_all('div', class_='result')[:result_limit]
            print(f"Found {len(listings)} listings.")

            companies = []
            for listing in listings:
                company = {}
                name = listing.find('a', class_='business-name')
                phone = listing.find('div', class_='phones')
                address = listing.find('span', class_='street-address')
                locality = listing.find('span', class_='locality')
                website = listing.find('a', class_='track-visit-website')

                company["name"] = name.text.strip() if name else ""
                company["phone"] = phone.text.strip() if phone else ""
                company["address"] = f"{address.text.strip()}, {locality.text.strip()}" if address and locality else ""
                company["website"] = website['href'] if website else ""

                companies.append(company)

            browser.close()

            return {
                "success": True,
                "companies": companies,
                "total_links": len(companies)
            }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
