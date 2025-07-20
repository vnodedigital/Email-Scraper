import smtplib
import dns.resolver
import random
import string
import re


# ---------- Configurable Sets ----------
DISPOSABLE_DOMAINS = set([
    'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'tempmail.com',
    'yopmail.com', 'maildrop.cc', 'temp-mail.org', 'throwaway.email',
    'fakeinbox.com', 'fake-mail.ml', 'sharklasers.com', 'grr.la',
    'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de',
    'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com',
    'pokemail.net', 'spam4.me', 'bccto.me', 'rcpt.at', 'chacuo.net',
    'emailsensei.com', 'emailtemporay.com', 'emailtemporay.info',
    'emailtemporay.net', 'emailtemporay.org', 'emailtemporay.com',
    'emailtemporar.com', 'emailtemporar.info', 'emailtemporar.net',
    'emailtemporar.org', 'emailtemporar.com'
])

FREE_PROVIDERS = set([
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com',
    'live.com', 'msn.com', 'ymail.com', 'rocketmail.com', 'mail.com',
    'gmx.com', 'zoho.com', 'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'tutanota.com', 'fastmail.com', 'hushmail.com',
    'lycos.com', 'inbox.com', 'yandex.com', 'mail.ru', 'rediffmail.com'
])

ROLE_BASED_PREFIXES = set([
    'admin', 'support', 'info', 'contact', 'sales', 'billing', 'webmaster',
    'noreply', 'no-reply', 'postmaster', 'hostmaster', 'abuse', 'security',
    'privacy', 'legal', 'compliance', 'help', 'service', 'team', 'office',
    'hello', 'hi', 'welcome', 'notifications', 'alerts', 'updates'
])

# ---------- Utility Functions ----------

def get_mx_records(domain):
    """Get MX records for a domain"""
    try:
        answers = dns.resolver.resolve(domain.lower(), 'MX')
        mx_records = sorted([(r.preference, str(r.exchange).rstrip('.')) for r in answers])
        return [record[1] for record in mx_records]
    except Exception as e:
        return []


def is_catch_all(mx_host, domain):
    """Check if domain accepts catch-all emails"""
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
    """Check if domain is a disposable email provider"""
    return domain.lower() in DISPOSABLE_DOMAINS


def is_free_provider(domain):
    """Check if domain is a free email provider"""
    return domain.lower() in FREE_PROVIDERS


def is_role_based(email):
    """Check if email is role-based"""
    local = email.split('@')[0].lower()
    return local in ROLE_BASED_PREFIXES


def is_blacklisted(domain):
    """Check if domain is blacklisted (using Spamhaus)"""
    try:
        query = '.'.join(reversed(domain.split('.'))) + '.dbl.spamhaus.org'
        dns.resolver.resolve(query, 'A')
        return True
    except Exception:
        return False


def validate_syntax(email):
    """Validate email syntax"""
    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return re.match(pattern, email) is not None


def smtp_validate(mx_host, email):
    """Validate email via SMTP"""
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
    """Get SPF record for domain"""
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
    """Get DMARC record for domain"""
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
    """Get DKIM record for domain"""
    # DKIM selectors are not standardized, so check common selectors
    selectors = ['default', 'selector1', 'google', 'mail', 'smtp', 'k1', 'dkim', 'key1']
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
    """Calculate email score based on various factors"""
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
SMTP_TIMEOUT = 10  # Reduced timeout for better performance
SMTP_RETRIES = 2   # number of MX fallback attempts
SMTP_PORTS = [25, 587, 2525]  # Common SMTP ports to try


def smtp_check(email):
    """Main email verification function with improved SMTP handling"""
    if not validate_syntax(email):
        return {"status": "invalid", "reason": "Invalid syntax", "score": 0.0}

    try:
        local_part, domain = email.split('@')
        mx_hosts = get_mx_records(domain)

        if not mx_hosts:
            return {"status": "invalid", "reason": "No MX records found", "score": 0.0}

        # Get DNS records
        spf = get_spf_record(domain)
        dmarc = get_dmarc_record(domain)
        dkim = get_dkim_record(domain)

        # Try multiple MX hosts with port fallback
        last_error = "Connection failed"
        
        for attempt, mx_host in enumerate(mx_hosts[:SMTP_RETRIES + 1]):
            # Try different ports for each MX host
            for port in SMTP_PORTS:
                try:
                    catch_all = is_catch_all_improved(mx_host, domain, port)
                    valid_smtp, smtp_msg = smtp_validate_improved(mx_host, email, port)

                    is_disposable_email = is_disposable(domain)
                    is_free = is_free_provider(domain)
                    is_role_email = is_role_based(email)
                    is_blacklisted_email = is_blacklisted(domain)

                    # Calculate score with DNS record bonuses
                    score = calculate_score(valid_smtp, catch_all, is_disposable_email, is_role_email, is_blacklisted_email)
                    
                    # Add DNS record bonuses
                    if spf:
                        score += 0.1
                    if dkim:
                        score += 0.1
                    if dmarc:
                        score += 0.1
                    
                    score = max(0.0, min(1.0, round(score, 2)))

                    if valid_smtp:
                        status = "valid"
                    elif catch_all:
                        status = "catch-all"
                    else:
                        status = "invalid"

                    # If we got a valid connection (success or catch-all), return immediately
                    if valid_smtp or catch_all:
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
                            "dkim": dkim,
                            "mx_host": mx_host,
                            "port": port
                        }
                    
                    last_error = smtp_msg
                    
                except Exception as e:
                    last_error = f"Port {port} failed: {str(e)}"
                    continue
            
            # If we tried all ports for this MX host and failed, try next MX host
            if attempt < len(mx_hosts) - 1 and attempt < SMTP_RETRIES:
                continue

        # If we've tried all MX hosts and ports, return the result based on other checks
        is_disposable_email = is_disposable(domain)
        is_free = is_free_provider(domain)
        is_role_email = is_role_based(email)
        is_blacklisted_email = is_blacklisted(domain)
        
        score = calculate_score(False, False, is_disposable_email, is_role_email, is_blacklisted_email)
        
        # Add DNS record bonuses even if SMTP failed
        if spf:
            score += 0.1
        if dkim:
            score += 0.1
        if dmarc:
            score += 0.1
        
        score = max(0.0, min(1.0, round(score, 2)))

        return {
            "email": email,
            "status": "invalid",
            "reason": f"SMTP connection failed: {last_error}",
            "is_disposable": is_disposable_email,
            "is_free_provider": is_free,
            "is_role_based": is_role_email,
            "is_catch_all": False,
            "is_blacklisted": is_blacklisted_email,
            "score": score,
            "spf": spf,
            "dmarc": dmarc,
            "dkim": dkim
        }

    except Exception as e:
        return {"status": "error", "reason": f"General error: {str(e)}", "score": 0.0}
