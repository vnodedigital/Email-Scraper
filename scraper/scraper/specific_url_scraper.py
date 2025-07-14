import time
import re
from playwright.sync_api import sync_playwright
from scraper.models import ScrapedFromGoogle

def scrape_specific_url(url, user):
    attempts = 3
    emails = []  # List to store unique emails
    seen_emails = set()  # Set to track emails in lowercase for case-insensitive comparison

    for attempt in range(attempts):
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(url, timeout=60000)  # Wait for up to 60 seconds
                
                # Extract page content
                content = page.content()
                
                # Extract emails using the regular expression
                emails_found = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', content)
                
                # Check and store valid emails
                for email in emails_found:
                    if is_valid_email(email):
                        email_lower = email.lower()  # Convert to lowercase for case-insensitive comparison
                        if email_lower not in seen_emails:  # Only add if it's not already in the set
                            seen_emails.add(email_lower)  # Add to seen emails set
                            emails.append(email)  # Add the original email to the list

                browser.close()
                return {"emails": emails}  # Return the list of unique emails
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            time.sleep(5)  # Wait before retrying
    # Save the scraped data to the database
    try:
        ScrapedFromGoogle.objects.create(
            user=user,  # Ensure the user object is passed correctly
            keyword=url,
            emails=list(emails) if emails else []  # Save as an empty list if no emails
        )
        print("Data saved successfully.")
    except Exception as e:
        print(f"Error saving data to the database: {str(e)}")

def is_valid_email(email):
    """
    Validate that the email is in a correct format and does not end with invalid file extensions.
    """
    email_regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    
    # Check if email matches the regex pattern and is not a file name (e.g., .png, .jpg)
    return bool(re.match(email_regex, email)) and not email.endswith(('.png', '.jpg', '.jpeg', '.gif'))
