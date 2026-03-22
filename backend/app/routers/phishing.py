"""
Phishing scan router — POST /api/phishing/scan
"""
import json
import time
import uuid
from urllib.parse import urlparse

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.database import AsyncSessionLocal
from app.models.scan_result import ScanResult
from app.services.ml_service import ml_service
from app.services.shap_service import shap_service
from app.services.feature_extractor import extract_phishing_features
from app.services.aatr_service import aatr_service
from app.services.intel_service import intel_service
from app.services.macl_service import macl_service
from app.utils.logger import log_scan

router = APIRouter()


# ---------------------------------------------------------------------- #
#  Trusted Domains Whitelist                                             #
# ---------------------------------------------------------------------- #

TRUSTED_DOMAINS = {
    'google.com', 'gmail.com',
    'youtube.com', 'googleapis.com',
    'accounts.google.com',
    'github.com', 'github.io',
    'microsoft.com', 'outlook.com',
    'office.com', 'live.com',
    'microsoftonline.com',
    'apple.com', 'icloud.com',
    'facebook.com', 'instagram.com',
    'whatsapp.com', 'messenger.com',
    'amazon.com', 'amazon.co.uk',
    'amazonaws.com',
    'twitter.com', 'x.com',
    'linkedin.com',
    'netflix.com',
    'paypal.com',
    'ebay.com',
    'wikipedia.org',
    'reddit.com',
    'stackoverflow.com',
    'discord.com',
    'spotify.com',
    'dropbox.com',
    'adobe.com',
    'salesforce.com',
    'cloudflare.com',
    'cloudfront.net',
    'fastly.net',
}


def _is_whitelisted(url: str) -> tuple[bool, str]:
    """
    Check if URL domain is in trusted whitelist.
    Returns: (is_whitelisted, domain)
    """
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.split(':')[0].lower()

        # Remove www. prefix
        if domain.startswith('www.'):
            domain = domain[4:]

        # Check exact match or subdomain match
        for trusted in TRUSTED_DOMAINS:
            if domain == trusted or domain.endswith('.' + trusted):
                return True, domain

        return False, domain
    except Exception:
        return False, ""


class PhishingScanRequest(BaseModel):
    url: str


@router.post("/scan")
async def scan_phishing(body: PhishingScanRequest):
    t0 = time.perf_counter()
    url = body.url.strip()
    scan_id = str(uuid.uuid4())

    # ── 0. Whitelist check ───────────────────────────────────────────── #
    is_whitelisted, domain = _is_whitelisted(url)
    if is_whitelisted:
        elapsed = (time.perf_counter() - t0) * 1000
        result = {
            "scan_id": scan_id,
            "url": url,
            "prediction": "legitimate",
            "confidence": 0.99,
            "risk_level": "low",
            "aatr_action": "allow",
            "intel_match": False,
            "intel_domain": None,
            "shap_explanation": [],
            "threat_report": f"Domain '{domain}' is a trusted domain. No ML scanning required.",
            "processing_time_ms": round(elapsed, 2),
        }
        print(f"[WHITELIST] {domain} trusted")
        log_scan("PHISHING", False, domain, 0.99, "allow")
        await _save_result(scan_id, "phishing", url, "legitimate", 0.99, "low", "allow",
                           [], result["threat_report"], elapsed)
        return result

    # ── 1. Intel feed check ──────────────────────────────────────────── #
    is_blocked, domain = intel_service.check_url(url)
    if is_blocked:
        elapsed = (time.perf_counter() - t0) * 1000
        result = {
            "scan_id": scan_id,
            "url": url,
            "prediction": "phishing",
            "confidence": 1.0,
            "risk_level": "critical",
            "aatr_action": "block",
            "intel_match": True,
            "intel_domain": domain,
            "shap_explanation": [],
            "threat_report": (
                f"Domain '{domain}' is listed in the OpenPhish threat intelligence feed. "
                f"This URL is known phishing. Do not visit this page."
            ),
            "processing_time_ms": round(elapsed, 2),
        }
        log_scan("PHISHING", True, domain, 1.0, "block")
        await _save_result(scan_id, "phishing", url, "phishing", 1.0, "critical", "block",
                           [], result["threat_report"], elapsed)
        return result

    # ── 2. Feature extraction ────────────────────────────────────────── #
    try:
        features = extract_phishing_features(url)
        # Now returns list of 20 floats directly
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Feature extraction failed: {e}")

    feature_array = np.array(features, dtype=np.float32).reshape(1, -1)

    # ── 3. ML prediction ─────────────────────────────────────────────── #
    if ml_service.phishing_model is None:
        return {
            "status": "model_not_loaded",
            "message": "Phishing model is being retrained. Available soon."
        }
    prediction, confidence, risk_level = ml_service.predict_phishing(features)

    # ── 4. SHAP explanation ──────────────────────────────────────────── #
    feat_names = (
        ml_service.phishing_features
        if ml_service.phishing_features
        else [
            "URLLength", "DomainLength", "CharContinuationRate", "URLCharProb",
            "TLDLength", "NoOfSubDomain", "NoOfLettersInURL", "LetterRatioInURL",
            "NoOfDegitsInURL", "DegitRatioInURL", "NoOfOtherSpecialCharsInURL",
            "SpacialCharRatioInURL",
        ]
    )
    shap_top = shap_service.explain_phishing(feature_array, feat_names)

    # ── 5. AATR triage ───────────────────────────────────────────────── #
    aatr_action = aatr_service.triage(confidence, prediction, "phishing")

    # ── 6. Threat report ─────────────────────────────────────────────── #
    threat_report = shap_service.generate_threat_report("phishing", prediction, confidence, shap_top)

    elapsed = (time.perf_counter() - t0) * 1000

    # ── 7. Auto-MACL queue ───────────────────────────────────────────── #
    if prediction == "phishing" and confidence > 0.90:
        macl_service.add_sample(
            engine_type="phishing",
            feature_vector=features,
            label=1,
            source="model_high_confidence",
            confidence=confidence,
        )

    # ── 8. Persist ───────────────────────────────────────────────────── #
    await _save_result(scan_id, "phishing", url, prediction, confidence, risk_level,
                       aatr_action, shap_top, threat_report, elapsed)

    # ── 9. Log ───────────────────────────────────────────────────────── #
    log_scan("PHISHING", prediction == "phishing", domain or url, confidence, aatr_action)

    return {
        "scan_id": scan_id,
        "url": url,
        "prediction": prediction,
        "confidence": round(confidence, 4),
        "risk_level": risk_level,
        "aatr_action": aatr_action,
        "intel_match": False,
        "intel_domain": domain,
        "shap_explanation": shap_top,
        "threat_report": threat_report,
        "processing_time_ms": round(elapsed, 2),
    }


async def _save_result(
    scan_id, scan_type, input_value, prediction, confidence,
    risk_level, aatr_action, shap_top, threat_report, elapsed_ms
):
    try:
        from datetime import datetime
        async with AsyncSessionLocal() as session:
            record = ScanResult(
                scan_id=scan_id,
                scan_type=scan_type,
                input_value=input_value,
                prediction=prediction,
                confidence=confidence,
                risk_level=risk_level,
                aatr_action=aatr_action,
                shap_top_features=json.dumps(shap_top),
                threat_report=threat_report,
                processing_time_ms=elapsed_ms,
                timestamp=datetime.utcnow(),
            )
            session.add(record)
            await session.commit()
    except Exception:
        pass  # non-fatal — never break the scan response due to DB issues
