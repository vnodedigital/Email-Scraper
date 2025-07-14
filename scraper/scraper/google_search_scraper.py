import re
import requests
from bs4 import BeautifulSoup
from googlesearch import search

def scrape_google_emails(keyword, country, result_count):
    if not keyword or not country:
        raise ValueError("Keyword and country must be provided.")

    query = f'"{keyword}" "{country}" "mail"'
    emails = set()
    urls = []

    # Perform Google search
    for result in search(query, num_results=result_count):
        urls.append(result)
        total_url=len(urls)
        print("Total urls------------------", total_url)
        print(urls)
    success=0
    # Extract emails from the resulting URLs
    for url in urls:
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                text = soup.get_text()
                found_emails = re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
                emails.update(found_emails)
                success +=1
            print(f"{success} : Success---- {url}")
        except Exception as e:
            print(f"Skipping {url}: {e}")

    return {
        "emails": list(emails),
        "urls": urls,
        "query": query
    }