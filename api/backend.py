from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import smtplib
import dns.resolver
import socket
import random
import string
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add a simple test endpoint
@app.get("/")
async def root():
    return {"message": "FastAPI backend is running", "status": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# ---------- Configurable Sets ----------
DISPOSABLE_DOMAINS = set([
    'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'tempmail.com'
])

FREE_PROVIDERS = set([
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com'
])

ROLE_BASED_PREFIXES = set([
    'admin', 'support', 'info', 'contact', 'sales', 'billing', 'webmaster'
])

# ---------- Utility Functions ----------

def get_mx_records(domain):
    try:
        answers = dns.resolver.resolve(domain.lower(), 'MX')
        mx_records = sorted([(r.preference, str(r.exchange).rstrip('.')) for r in answers])
        return [record[1] for record in mx_records]
    except Exception as e:
        return []

def is_catch_all(mx_host, domain):
    try:
        random_email = ''.join(random.choices(string.ascii_lowercase, k=12)) + '@' + domain
        with smtplib.SMTP(mx_host, timeout=10) as server:
            server.helo("yourdomain.com")
            server.mail("verify@yourdomain.com")
            code, _ = server.rcpt(random_email)
            return code in (250, 251)
    except Exception:
        return False

def is_disposable(domain):
    return domain.lower() in DISPOSABLE_DOMAINS

def is_free_provider(domain):
    return domain.lower() in FREE_PROVIDERS

def is_role_based(email):
    local = email.split('@')[0].lower()
    return local in ROLE_BASED_PREFIXES

def is_blacklisted(domain):
    # Example using Spamhaus (returns True if listed)
    try:
        query = '.'.join(reversed(domain.split('.'))) + '.dbl.spamhaus.org'
        dns.resolver.resolve(query, 'A')
        return True
    except Exception:
        return False

def validate_syntax(email):
    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return re.match(pattern, email) is not None

def smtp_validate(mx_host, email):
    try:
        with smtplib.SMTP(mx_host, timeout=15) as server:
            server.helo("yourdomain.com")
            server.mail("verify@yourdomain.com")
            code, response = server.rcpt(email)
            return code in (250, 251), response.decode() if isinstance(response, bytes) else str(response)
    except Exception as e:
        return False, str(e)

# ---------- DNS Record Checks ----------
def get_spf_record(domain):
    try:
        answers = dns.resolver.resolve(domain, 'TXT')
        for r in answers:
            txt = r.to_text().strip('"')
            if txt.lower().startswith('v=spf1'):
                return txt
    except Exception:
        pass
    return None

def get_dmarc_record(domain):
    try:
        dmarc_domain = f'_dmarc.{domain}'
        answers = dns.resolver.resolve(dmarc_domain, 'TXT')
        for r in answers:
            txt = r.to_text().strip('"')
            if txt.lower().startswith('v=dmarc1'):
                return txt
    except Exception:
        pass
    return None

def get_dkim_record(domain):
    # DKIM selectors are not standardized, so just check for common selectors
    selectors = ['default', 'selector1', 'google', 'mail', 'smtp']
    for selector in selectors:
        dkim_domain = f'{selector}._domainkey.{domain}'
        try:
            answers = dns.resolver.resolve(dkim_domain, 'TXT')
            for r in answers:
                txt = r.to_text().strip('"')
                if txt.lower().startswith('v=dkim1'):
                    return txt
        except Exception:
            continue
    return None

# ---------- Scoring System ----------

def calculate_score(valid_smtp, catch_all, is_disposable_email, is_role_email, is_blacklisted_email):
    score = 1.0
    if catch_all:
        score -= 0.3
    if is_disposable_email:
        score -= 0.4
    if is_role_email:
        score -= 0.2
    if not valid_smtp:
        score -= 0.6
    if is_blacklisted_email:
        score -= 0.4
    return max(0.0, min(1.0, round(score, 2)))

# ---------- Main Verifier ----------

SMTP_TIMEOUT = 15  # seconds
SMTP_RETRIES = 2   # number of MX fallback attempts

def smtp_check(email):
    if not validate_syntax(email):
        return {"status": "invalid", "reason": "Invalid syntax", "score": 0.0}

    try:
        local_part, domain = email.split('@')
        mx_hosts = get_mx_records(domain)

        if not mx_hosts:
            return {"status": "invalid", "reason": "No MX records found", "score": 0.0}

        spf = get_spf_record(domain)
        dmarc = get_dmarc_record(domain)
        dkim = get_dkim_record(domain)

        for attempt, mx_host in enumerate(mx_hosts[:SMTP_RETRIES+1]):
            catch_all = is_catch_all(mx_host, domain)
            valid_smtp, smtp_msg = smtp_validate(mx_host, email)

            is_disposable_email = is_disposable(domain)
            is_free = is_free_provider(domain)
            is_role_email = is_role_based(email)
            is_blacklisted_email = is_blacklisted(domain)

            score = calculate_score(valid_smtp, catch_all, is_disposable_email, is_role_email, is_blacklisted_email)

            if valid_smtp:
                status = "valid"
            elif catch_all:
                status = "catch-all"
            else:
                status = "invalid"

            # If valid or catch-all, or last retry, return result
            if valid_smtp or catch_all or attempt == SMTP_RETRIES or attempt == len(mx_hosts)-1:
                return {
                    "email": email,
                    "status": status,
                    "reason": smtp_msg if not valid_smtp else "SMTP accepted",
                    "is_disposable": is_disposable_email,
                    "is_free_provider": is_free,
                    "is_role_based": is_role_email,
                    "is_catch_all": catch_all,
                    "is_blacklisted": is_blacklisted_email,
                    "score": score,
                    "spf": spf,
                    "dmarc": dmarc,
                    "dkim": dkim
                }

    except Exception as e:
        return {"status": "error", "reason": str(e), "score": 0.0}

@app.post("/check_email")
async def check_email(request: Request):
    data = await request.json()
    email = data.get("email")
    if not email:
        return JSONResponse(status_code=400, content={"status": "error", "reason": "Email is required"})
    result = smtp_check(email)
    return JSONResponse(content=result)
