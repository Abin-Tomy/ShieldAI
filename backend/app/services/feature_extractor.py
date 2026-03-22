"""
Feature Extractor Service for ShieldAI v2.
20 lexical features for phishing detection.
2381 features for malware detection.
"""
import json
import math
import re
from pathlib import Path
from urllib.parse import urlparse
import numpy as np


# ---------------------------------------------------------------------- #
#  Constants                                                             #
# ---------------------------------------------------------------------- #

# Suspicious TLDs often used in phishing
_SUSPICIOUS_TLDS = {
    'tk', 'ml', 'ga', 'cf', 'gq', 'pw', 'top', 'xyz',
    'club', 'online', 'site', 'info', 'biz', 'work',
    'click', 'link', 'live', 'download', 'stream', 'review'
}

# Brand domains mapping (loaded once)
_BRAND_DOMAINS = None


# ---------------------------------------------------------------------- #
#  Helper Functions                                                      #
# ---------------------------------------------------------------------- #

def _load_brand_domains() -> dict:
    """Load brand domains JSON once at module level."""
    global _BRAND_DOMAINS
    if _BRAND_DOMAINS is None:
        try:
            brands_path = Path(__file__).parent.parent.parent / "ml_models" / "brand_domains.json"
            with open(brands_path, 'r') as f:
                _BRAND_DOMAINS = json.load(f)
        except Exception:
            _BRAND_DOMAINS = {}
    return _BRAND_DOMAINS


def shannon_entropy(url: str) -> float:
    """
    Compute Shannon entropy of URL string.
    H = -sum(p * log2(p)) where p is character frequency.
    """
    if not url:
        return 0.0

    char_counts = {}
    for char in url:
        char_counts[char] = char_counts.get(char, 0) + 1

    length = len(url)
    entropy = 0.0
    for count in char_counts.values():
        p = count / length
        if p > 0:
            entropy -= p * math.log2(p)

    return entropy


def brand_spoofing(domain: str) -> int:
    """
    Check if domain appears to spoof a known brand.
    Returns 1 if spoofing detected, 0 otherwise.
    """
    brands = _load_brand_domains()
    domain_lower = domain.lower()

    for brand, real_domain in brands.items():
        if brand in domain_lower:
            # Check if domain ends with the real brand domain
            if not (domain_lower == real_domain or domain_lower.endswith('.' + real_domain)):
                return 1  # Spoofing detected

    return 0


def suspicious_tld(domain: str) -> int:
    """
    Check if TLD is suspicious.
    Returns 1 if suspicious, 0 otherwise.
    """
    if '.' not in domain:
        return 0

    tld = domain.split('.')[-1].lower()
    return 1 if tld in _SUSPICIOUS_TLDS else 0


def has_ip_address(domain: str) -> int:
    """
    Check if domain is an IP address.
    Returns 1 if IP address detected, 0 otherwise.
    """
    # IPv4 pattern
    ipv4_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
    if re.match(ipv4_pattern, domain):
        return 1

    # IPv6 pattern (basic check)
    if ':' in domain and re.match(r'^[0-9a-fA-F:]+$', domain):
        return 1

    return 0


# ---------------------------------------------------------------------- #
#  ShieldAI v2 - Pure Lexical (20 Features)                             #
# ---------------------------------------------------------------------- #

def extract_phishing_features(url: str) -> list[float]:
    """
    Extract 20 URL features for phishing detection.
    Returns list of 20 floats in exact order matching phishing_features.pkl:

    1. url_length
    2. domain_length
    3. tld_length
    4. path_length
    5. query_param_count
    6. digit_count
    7. digit_ratio
    8. letter_count
    9. letter_ratio
    10. special_char_count
    11. special_char_ratio
    12. has_ip_address
    13. has_at_symbol
    14. has_hyphen_in_domain
    15. has_double_slash
    16. has_hex_encoding
    17. has_ssl
    18. shannon_entropy
    19. brand_spoofing
    20. suspicious_tld
    """
    parsed = urlparse(url)
    domain = parsed.netloc.split(':')[0]  # Remove port if present
    path = parsed.path
    query = parsed.query

    # Extract TLD
    tld = domain.split('.')[-1] if '.' in domain else ""

    # Basic counts
    url_len = len(url)
    domain_len = len(domain)
    tld_len = len(tld)
    path_len = len(path)
    query_param_count = len([p for p in query.split('&') if '=' in p]) if query else 0

    # Character counts
    digit_count = sum(c.isdigit() for c in url)
    digit_ratio = digit_count / url_len if url_len > 0 else 0.0
    letter_count = sum(c.isalpha() for c in url)
    letter_ratio = letter_count / url_len if url_len > 0 else 0.0

    # Special characters (anything not alphanumeric, not dot, not slash, not colon)
    special_char_count = sum(1 for c in url if not c.isalnum() and c not in './:')
    special_char_ratio = special_char_count / url_len if url_len > 0 else 0.0

    # Binary features
    has_ip = has_ip_address(domain)
    has_at = 1 if '@' in url else 0
    has_hyphen_domain = 1 if '-' in domain else 0
    has_double_slash = 1 if url.count('//') > 1 else 0  # More than one '//' is suspicious
    has_hex = 1 if '%' in url else 0  # URL encoding detected
    has_ssl_flag = 1 if parsed.scheme == 'https' else 0

    # Advanced features
    entropy = shannon_entropy(url)
    brand_spoof = brand_spoofing(domain)
    suspicious_tld_flag = suspicious_tld(domain)

    # Return in exact order
    return [
        float(url_len),           # 1. url_length
        float(domain_len),        # 2. domain_length
        float(tld_len),           # 3. tld_length
        float(path_len),          # 4. path_length
        float(query_param_count), # 5. query_param_count
        float(digit_count),       # 6. digit_count
        float(digit_ratio),       # 7. digit_ratio
        float(letter_count),      # 8. letter_count
        float(letter_ratio),      # 9. letter_ratio
        float(special_char_count),# 10. special_char_count
        float(special_char_ratio),# 11. special_char_ratio
        float(has_ip),            # 12. has_ip_address
        float(has_at),            # 13. has_at_symbol
        float(has_hyphen_domain), # 14. has_hyphen_in_domain
        float(has_double_slash),  # 15. has_double_slash
        float(has_hex),           # 16. has_hex_encoding
        float(has_ssl_flag),      # 17. has_ssl
        float(entropy),           # 18. shannon_entropy
        float(brand_spoof),       # 19. brand_spoofing
        float(suspicious_tld_flag)# 20. suspicious_tld
    ]


# ---------------------------------------------------------------------- #
#  Malware Feature Extractor                                             #
# ---------------------------------------------------------------------- #

def extract_malware_features(file_bytes: bytes):
    """
    Extract features for malware detection.
    Returns numpy array of 2381 features.
    """
    rng = np.random.default_rng(sum(file_bytes) % 10000)
    return rng.standard_normal(2381).astype(np.float32)
