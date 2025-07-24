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
        # Generate multiple random emails to be more certain
        test_emails = [
            ''.join(random.choices(string.ascii_lowercase, k=12)) + '@' + domain,
            ''.join(random.choices(string.ascii_lowercase, k=15)) + '9999@' + domain,
            'nonexistent' + str(random.randint(10000, 99999)) + '@' + domain
        ]
        
        accepted_count = 0
        
        with smtplib.SMTP(mx_host, timeout=SMTP_TIMEOUT) as server:
            server.helo("vnode.digital")  # Use your actual domain
            server.mail("info.aminul3065@gmail.com")  # Use your configured Gmail
            
            for test_email in test_emails:
                try:
                    code, _ = server.rcpt(test_email)
                    if code in (250, 251):
                        accepted_count += 1
                except Exception:
                    continue
                    
        # If 2 or more random emails are accepted, it's likely catch-all
        return accepted_count >= 2
        
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
        with smtplib.SMTP(mx_host, timeout=SMTP_TIMEOUT) as server:
            server.helo("vnode.digital")  # Use your actual domain
            server.mail("info.aminul3065@gmail.com")  # Use your configured Gmail
            code, response = server.rcpt(email)
            return code in (250, 251), response.decode() if isinstance(response, bytes) else str(response)
    except Exception as e:
        return False, str(e)


def smtp_validate_improved(mx_host, email, port=25):
    """Improved SMTP validation with port support and better error handling"""
    try:
        with smtplib.SMTP(timeout=SMTP_TIMEOUT) as server:
            try:
                server.connect(mx_host, port)
                server.helo("vnode.digital")  # Use your actual domain
                server.mail("info.aminul3065@gmail.com")  # Use your configured Gmail
                code, response = server.rcpt(email)

                # Handle response
                response_text = response.decode() if isinstance(response, bytes) else str(response)

                if code == 250:
                    return True, "Email accepted"
                elif code == 251:
                    return True, "User not local, will forward"
                elif code in (450, 451, 452):
                    return False, f"Temporary failure: {response_text}"
                elif code in (550, 551, 552, 553, 554):
                    return False, f"Permanent failure: {response_text}"
                else:
                    return False, f"Unknown response {code}: {response_text}"
            except smtplib.SMTPHeloError as e:
                return False, f"HELO refused: {str(e)}"
            except smtplib.SMTPSenderRefused as e:
                return False, f"Sender refused: {str(e)}"

    except smtplib.SMTPConnectError as e:
        return False, f"Connection failed on port {port}: {str(e)}"
    except smtplib.SMTPServerDisconnected as e:
        return False, f"Server disconnected on port {port}: {str(e)}"
    except smtplib.SMTPRecipientsRefused as e:
        return False, f"Recipients refused: {str(e)}"
    except ConnectionRefusedError as e:
        return False, f"Connection refused on port {port}: {str(e)}"
    except OSError as e:
        if "timed out" in str(e).lower():
            return False, f"Connection timeout on port {port}: {str(e)}"
        else:
            return False, f"Network error on port {port}: {str(e)}"
    except Exception as e:
        return False, f"SMTP error on port {port}: {str(e)}"


def is_catch_all_improved(mx_host, domain, port=25):
    """Improved catch-all detection with port support"""
    try:
        # Generate multiple random emails that are very unlikely to exist
        test_emails = [
            ''.join(random.choices(string.ascii_lowercase, k=15)) + '9999@' + domain,
            'definitely-not-real-' + str(random.randint(100000, 999999)) + '@' + domain,
            'test-nonexistent-' + ''.join(random.choices(string.ascii_lowercase, k=10)) + '@' + domain
        ]
        
        accepted_count = 0

        with smtplib.SMTP(timeout=SMTP_TIMEOUT) as server:
            try:
                server.connect(mx_host, port)
                server.helo("vnode.digital")  # Use your actual domain
                server.mail("info.aminul3065@gmail.com")  # Use your configured Gmail
                
                for test_email in test_emails:
                    try:
                        code, _ = server.rcpt(test_email)
                        if code in (250, 251):
                            accepted_count += 1
                    except Exception:
                        continue
                        
                # If 2 or more random emails are accepted, it's catch-all
                return accepted_count >= 2
                
            except smtplib.SMTPHeloError:
                return False
            except smtplib.SMTPSenderRefused:
                return False
    except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, 
            ConnectionRefusedError, OSError):
        return False
    except Exception:
        return False


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

    # Catch-all detection reduces score but doesn't make it invalid
    if catch_all:
        score -= 0.3
    
    # Major penalties
    if is_disposable_email:
        score -= 0.4
    if is_blacklisted_email:
        score -= 0.4
    
    # Medium penalties
    if not valid_smtp and not catch_all:  # Only penalize if both SMTP and catch-all failed
        score -= 0.6
    if is_role_email:
        score -= 0.2

    return max(0.0, min(1.0, round(score, 2)))


# ---------- Main Verifier ----------
SMTP_TIMEOUT = 10  # Increased timeout for better connectivity (10 seconds per attempt)
SMTP_RETRIES = 1   # reduced retry attempts for faster response
SMTP_PORTS = [587, 25, 2587]  # Try 587 first (submission port), then 25, then alternative


def smtp_check(email):
    """Main email verification function with improved SMTP handling and fallback methods"""
    if not validate_syntax(email):
        return {"status": "invalid", "reason": "Invalid syntax", "score": 0.0}

    try:
        local_part, domain = email.split('@')
        mx_hosts = get_mx_records(domain)

        if not mx_hosts:
            return {"status": "invalid", "reason": "No MX records found", "score": 0.0}

        # Get DNS records first (these always work)
        spf = get_spf_record(domain)
        dmarc = get_dmarc_record(domain)
        dkim = get_dkim_record(domain)
        
        is_disposable_email = is_disposable(domain)
        is_free = is_free_provider(domain)
        is_role_email = is_role_based(email)
        is_blacklisted_email = is_blacklisted(domain)

        # Try SMTP verification with shorter timeout for faster failure detection
        smtp_success = False
        catch_all = False  # This will be properly detected now
        last_error = "Connection failed"
        used_mx_host = None
        used_port = None
        
        # Limit MX hosts to try (max 2 for speed)
        mx_hosts_to_try = mx_hosts[:min(len(mx_hosts), 2)]
        
        # Try SMTP with reduced timeout for faster response
        for mx_host in mx_hosts_to_try:
            for port in [587, 25]:  # Try most common ports only
                try:
                    # Quick SMTP check with 5-second timeout
                    with smtplib.SMTP(timeout=5) as server:
                        server.connect(mx_host, port)
                        server.helo("vnode.digital")  # Use your actual domain
                        server.mail("info.aminul3065@gmail.com")  # Use your configured Gmail
                        code, response = server.rcpt(email)
                        
                        if code in (250, 251):
                            smtp_success = True
                            used_mx_host = mx_host
                            used_port = port
                            last_error = "Email accepted"
                            
                            # Now test for catch-all if SMTP succeeded
                            try:
                                catch_all = is_catch_all_improved(mx_host, domain, port)
                            except Exception:
                                # If catch-all test fails, use fallback method
                                catch_all = is_catch_all(mx_host, domain)
                            
                            break
                        else:
                            last_error = f"SMTP rejected: {code}"
                            
                except Exception as e:
                    error_str = str(e).lower()
                    if "refused" in error_str:
                        last_error = f"Port {port} blocked"
                    elif "timed out" in error_str:
                        last_error = f"Port {port} timeout" 
                    else:
                        last_error = f"Port {port} error: {str(e)[:50]}"
                    continue
                    
            if smtp_success:
                break

        # If SMTP failed but we have MX records, try catch-all test independently
        if not smtp_success and mx_hosts:
            for mx_host in mx_hosts_to_try:
                for port in [587, 25]:
                    try:
                        catch_all = is_catch_all_improved(mx_host, domain, port)
                        if catch_all:
                            # If catch-all detected, the domain might accept emails
                            used_mx_host = mx_host
                            used_port = port
                            last_error = "Catch-all detected"
                            break
                    except Exception:
                        continue
                if catch_all:
                    break

        # Calculate base score
        score = calculate_score(smtp_success, catch_all, is_disposable_email, is_role_email, is_blacklisted_email)

        # Add DNS record bonuses (these are reliable)
        dns_bonus = 0
        if spf:
            dns_bonus += 0.1
        if dkim:
            dns_bonus += 0.1
        if dmarc:
            dns_bonus += 0.1
            
        score += dns_bonus
        score = max(0.0, min(1.0, round(score, 2)))

        # Determine status and reason
        if smtp_success:
            if catch_all:
                status = "catch-all"
                reason = "Email accepted but domain accepts all emails"
            else:
                status = "valid"
                reason = "SMTP verification successful"
        elif catch_all:
            status = "catch-all"
            reason = "Domain accepts all emails (catch-all)"
            # Adjust score for catch-all without SMTP success
            score = max(score, 0.5)
        elif is_disposable_email:
            status = "invalid"
            reason = "Disposable email provider"
        elif is_blacklisted_email:
            status = "invalid" 
            reason = "Domain is blacklisted"
        elif "blocked" in last_error or "refused" in last_error:
            # SMTP blocked but domain seems legitimate
            if dns_bonus >= 0.2:  # Good DNS setup
                status = "unknown"
                reason = "SMTP blocked - domain appears legitimate"
                score = max(score, 0.6)  # Give benefit of doubt for good domains
            else:
                status = "unknown"
                reason = "SMTP blocked - unable to verify"
                score = max(score, 0.4)
        else:
            status = "invalid"
            reason = f"SMTP verification failed: {last_error}"

        return {
            "email": email,
            "domain": domain,
            "status": status,
            "reason": reason,
            "is_disposable": is_disposable_email,
            "is_free_provider": is_free,
            "is_role_based": is_role_email,
            "is_catch_all": catch_all,
            "is_blacklisted": is_blacklisted_email,
            "smtp_valid": smtp_success,
            "score": score,
            "spf": spf,
            "dmarc": dmarc,
            "dkim": dkim,
            "mx_host": used_mx_host,
            "port": used_port
        }

    except Exception as e:
        return {"status": "error", "reason": f"General error: {str(e)}", "score": 0.0}
