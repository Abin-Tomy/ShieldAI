// ShieldAI Warning Page Script
// MV3-compliant external script (replaces former inline script)

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    url:          params.get('url')          || 'Unknown URL',
    prediction:   params.get('prediction')   || 'phishing',
    confidence:   parseFloat(params.get('confidence')) || 0,
    risk_level:   params.get('risk_level')   || 'critical',
    threat_report: params.get('threat_report') || 'This site was identified as a phishing threat.',
    aatr_action:  params.get('aatr_action')  || 'block',
    shap:         JSON.parse(params.get('shap') || '[]')
  };
}

// Human-readable plain-English explanations for SHAP feature names
function friendlyFeatureName(rawName) {
  const map = {
    'has_ip':             'Uses a raw IP address instead of a real domain name',
    'long_url':           'The link is unusually long — a common trick to hide the real destination',
    'short_url':          'Uses a link shortener to disguise the real URL',
    'has_at':             'Contains an "@" symbol, which can redirect you without you knowing',
    'double_slash':       'Has unusual "//" in the middle of the link',
    'prefix_suffix':      'Uses hyphens in the domain name to mimic a trusted site',
    'sub_domain':         'Has many sub-domains stacked together — a phishing hallmark',
    'sslfinal_state':     'SSL / "https" certificate looks suspicious or is missing',
    'domain_reg_len':     'Domain was registered very recently (less than a year old)',
    'favicon':            'The website icon is loaded from a different, suspicious domain',
    'port':               'Uses an unusual port number instead of the standard 443/80',
    'http_token':         'Has "http" hidden inside the path, not just at the start',
    'request_url':        'Most content is loaded from unknown external domains',
    'url_of_anchor':      'Links on the page lead to completely different websites',
    'links_in_tags':      'Meta / script tags point to unrelated external servers',
    'sfh':                'The form on this page sends your data to a suspicious server',
    'submitting_to_email': 'Your info would be submitted directly to an email address',
    'abnormal_url':       'Domain in the URL does not match the actual site origin (WHOIS)',
    'redirect':           'The page redirects you multiple times before loading',
    'on_mouseover':       'The link in the status bar changes when you hover over it',
    'rightclick':         'Right-clicking has been disabled to hide the page source',
    'popupwindow':        'Opens pop-up windows asking for personal information',
    'iframe':             'Hides invisible frames that load other suspicious content',
    'age_of_domain':      'Domain name is brand new — less than 6 months old',
    'dnsrecord':          'No proper DNS registration found for this domain',
    'web_traffic':        'Website has very little or no web traffic history',
    'page_rank':          'Page has an extremely low trust/authority ranking',
    'google_index':       'This page is not indexed by Google — often a sign of a throwaway site',
    'links_pointing_to_page': 'Very few other sites link to this page',
    'statistical_report': 'Flagged in known phishing / spam statistical databases',
  };
  return map[rawName] || rawName.replace(/_/g, ' ');
}

function populatePage() {
  const data = getUrlParams();

  // Blocked URL
  document.getElementById('blocked-url').textContent = data.url;

  // Confidence
  document.getElementById('confidence').textContent =
    (data.confidence * 100).toFixed(1) + '% confident';

  // Prediction (plain English)
  const pred = data.prediction.toLowerCase();
  document.getElementById('prediction').textContent =
    pred === 'phishing' ? 'Phishing / Scam site' : pred.charAt(0).toUpperCase() + pred.slice(1);

  // Action (plain English)
  const actionMap = {
    block:       'Blocked (page not loaded)',
    quarantine:  'Quarantined (access restricted)',
    warn:        'Warning shown',
    allow:       'Allowed through',
  };
  document.getElementById('aatr-action').textContent =
    actionMap[data.aatr_action] || data.aatr_action.toUpperCase();

  // Risk badge
  const riskBadge = document.getElementById('risk-badge');
  const level = data.risk_level.toLowerCase();
  riskBadge.textContent = level.toUpperCase();
  riskBadge.className = 'risk-badge risk-' + level;

  // Why section — prefer SHAP features, fall back to threat report
  const shapSection = document.getElementById('shap-section');

  if (data.shap && data.shap.length > 0) {
    // Show top 4 SHAP reasons in plain English
    const topItems = data.shap
      .filter(f => f.direction === 'increases_risk')
      .slice(0, 4);

    if (topItems.length > 0) {
      shapSection.innerHTML = topItems.map(f => `
        <div class="why-item">
          <div class="why-dot"></div>
          <span>${friendlyFeatureName(f.name)}</span>
        </div>
      `).join('');
      return;
    }
  }

  // Fallback to threat report text
  shapSection.innerHTML = `<div class="threat-desc">${data.threat_report}</div>`;
}

// Go back button
document.getElementById('go-back').addEventListener('click', () => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.close();
  }
});

// Proceed anyway button
document.getElementById('proceed-anyway').addEventListener('click', () => {
  const ok = confirm(
    'WARNING: This page was identified as a phishing / scam site.\n\n' +
    'If you continue you may:\n' +
    '  • Have your passwords or credit card details stolen\n' +
    '  • Have your account compromised\n' +
    '  • Be a victim of identity theft\n\n' +
    'Are you absolutely sure you want to proceed?'
  );
  if (ok) {
    const data = getUrlParams();
    window.location.href = data.url;
  }
});

document.addEventListener('DOMContentLoaded', populatePage);
