// ShieldAI v2 Background Service Worker
// Handles URL scanning, download monitoring, and threat detection

// ---------------------------------------------------------------------- //
// Constants & Configuration                                              //
// ---------------------------------------------------------------------- //

const BACKEND_URL = 'http://localhost:8000';
const SCAN_TIMEOUT = 5000;
const DOMAIN_COOLDOWN = 5000; // 5 seconds between scans per domain

// Malware file extensions to scan
const MALWARE_EXTENSIONS = new Set([
  'exe', 'dll', 'pdf', 'js', 'zip', 'msi', 'bat', 'ps1', 'vbs',
  'doc', 'docx', 'sh', 'cmd', 'scr', 'hta'
]);

// ---------------------------------------------------------------------- //
// State Management                                                       //
// ---------------------------------------------------------------------- //

// Recent scans to avoid duplicate scanning
const recentScans = new Map();
let extensionId = '';

// ---------------------------------------------------------------------- //
// Helper Functions                                                       //
// ---------------------------------------------------------------------- //

function extractDomain(url) {
  try {
    const parsed = new URL(url);
    let domain = parsed.hostname.toLowerCase();
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    return domain;
  } catch {
    return '';
  }
}

function isTrustedDomain(url) {
  try {
    const hostname = new URL(url).hostname
      .toLowerCase()
      .replace(/^www\./, '');

    const TRUSTED = new Set([
      'google.com', 'gmail.com',
      'youtube.com', 'googleapis.com',
      'google.co.in', 'google.co.uk',
      'accounts.google.com',
      'github.com', 'github.io',
      'microsoft.com', 'outlook.com',
      'office.com', 'live.com',
      'microsoftonline.com', 'bing.com',
      'azure.com', 'azurewebsites.net',
      'apple.com', 'icloud.com',
      'facebook.com', 'instagram.com',
      'whatsapp.com', 'messenger.com',
      'fbcdn.net',
      'amazon.com', 'amazon.co.uk',
      'amazonaws.com', 'amazon.in',
      'twitter.com', 'x.com', 't.co',
      'linkedin.com',
      'netflix.com',
      'paypal.com',
      'ebay.com',
      'wikipedia.org', 'wikimedia.org',
      'reddit.com', 'redd.it',
      'stackoverflow.com',
      'stackexchange.com',
      'discord.com', 'discordapp.com',
      'spotify.com',
      'dropbox.com',
      'adobe.com',
      'cloudflare.com', 'cloudfront.net',
      'fastly.net', 'akamai.net',
      'cdn.jsdelivr.net',
      'unpkg.com',
      'claude.ai', 'anthropic.com',
      'openai.com', 'chatgpt.com',
      'localhost', '127.0.0.1',
    ]);

    // Check exact match
    if (TRUSTED.has(hostname)) return true;

    // Check if hostname ends with any trusted domain (subdomain match)
    for (const trusted of TRUSTED) {
      if (hostname.endsWith('.' + trusted)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function shouldSkipUrl(url) {
  // Skip chrome://, chrome-extension://, about:, data:, javascript: URLs
  return url.startsWith('chrome://') ||
         url.startsWith('chrome-extension://') ||
         url.startsWith('about:') ||
         url.startsWith('data:') ||
         url.startsWith('javascript:');
}

// ── LAYER 1b: Trusted TLD ────────────────────────────────────────────────── //
// Unconditionally trust government, education, and military domains.
// These are regulated and cannot be registered by bad actors.
function isTrustedTld(url) {
  try {
    const tld = new URL(url).hostname.toLowerCase().split('.').pop();
    return ['gov', 'edu', 'mil', 'int'].includes(tld);
  } catch {
    return false;
  }
}

// ── LAYER 2: Pre-scan heuristic filter ───────────────────────────────────── //
// Only send a URL to the ML model if it has ≥ 2 hard red-flag signals.
// This prevents clean HTTPS URLs from ever reaching the model.
function hasSuspiciousSignals(url) {
  let score = 0;
  try {
    const parsed   = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const fullUrl  = url.toLowerCase();

    // ── Hard signals ────────────────────────────────────────
    // IP address used as hostname (e.g. http://192.168.1.1/login)
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) score += 3;

    // Plain HTTP — HTTPS is the norm for legitimate sites
    if (parsed.protocol === 'http:') score += 2;

    // @ symbol in URL (classic redirect trick: http://legit.com@evil.com)
    if (fullUrl.includes('@')) score += 3;

    // Non-standard port (not 80 / 443 / empty)
    if (parsed.port && parsed.port !== '80' && parsed.port !== '443') score += 2;

    // Suspicious brand / action words embedded in the hostname itself
    // (NOT in the path — legitimate sites have /login paths all the time)
    const suspiciousInHost = [
      'paypal', 'amazon', 'netflix', 'apple', 'microsoft', 'google',
      'facebook', 'instagram', 'whatsapp', 'ebay', 'bank', 'secure',
      'verify', 'account', 'update', 'confirm', 'signin', 'login',
      'support', 'helpdesk', 'wallet', 'crypto', 'coinbase', 'binance',
    ];
    for (const word of suspiciousInHost) {
      if (hostname.includes(word)) { score += 2; break; }
    }

    // ── Soft signals (accumulating) ──────────────────────────
    // Hyphens in the second-level domain (paypal-secure.com)
    const parts      = hostname.split('.');
    const sld        = parts.length >= 2 ? parts[parts.length - 2] : hostname;
    if (sld.includes('-')) score += 1;

    // More than 3 dot-separated labels (sub.sub.domain.com — classic evasion)
    if (parts.length > 3) score += 1;

    // Very long URL (often generated URLs hiding the real destination)
    if (fullUrl.length > 150) score += 1;
    if (fullUrl.length > 250) score += 1;

    // Unusual TLD — not in the common safe set
    const safeTlds = new Set([
      'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
      'io', 'co', 'ai', 'app', 'dev', 'tech',
      'uk', 'de', 'fr', 'in', 'ca', 'au', 'jp', 'cn',
      'ru', 'br', 'mx', 'es', 'it', 'nl', 'se', 'no',
      'dk', 'fi', 'pl', 'pt', 'be', 'ch', 'at', 'nz',
      'za', 'sg', 'hk', 'kr', 'tw', 'il', 'ae', 'sa',
      'us', 'eu', 'tv', 'me', 'info', 'biz', 'xyz',
    ]);
    const tld = parts[parts.length - 1];
    if (!safeTlds.has(tld)) score += 1;

  } catch {
    return true; // Can't parse → treat as suspicious
  }

  const suspicious = score >= 2;
  if (suspicious) {
    console.log(`[ShieldAI] Pre-scan score ${score} ≥ 2 — scanning`);
  } else {
    console.log(`[ShieldAI] Pre-scan score ${score} < 2 — skip (looks clean)`);
  }
  return suspicious;
}

// ── LAYER 3: User personal allowlist ─────────────────────────────────────── //
// Domains the user has explicitly said are safe.
async function isUserAllowed(domain) {
  try {
    const { userAllowlist } = await chrome.storage.local.get(['userAllowlist']);
    const list = userAllowlist || [];
    return list.includes(domain);
  } catch {
    return false;
  }
}

async function addToAllowlist(domain) {
  const { userAllowlist } = await chrome.storage.local.get(['userAllowlist']);
  const list = userAllowlist || [];
  if (!list.includes(domain)) list.push(domain);
  await chrome.storage.local.set({ userAllowlist: list });
}

async function removeFromAllowlist(domain) {
  const { userAllowlist } = await chrome.storage.local.get(['userAllowlist']);
  const list = (userAllowlist || []).filter(d => d !== domain);
  await chrome.storage.local.set({ userAllowlist: list });
}


function isRecentlyScananed(domain) {
  const now = Date.now();
  const lastScan = recentScans.get(domain);
  if (lastScan && (now - lastScan) < DOMAIN_COOLDOWN) {
    return true;
  }
  recentScans.set(domain, now);

  // Clean old entries (older than 1 minute)
  for (const [d, time] of recentScans.entries()) {
    if ((now - time) > 60000) {
      recentScans.delete(d);
    }
  }

  return false;
}

async function updateStats(increment) {
  const result = await chrome.storage.local.get(['stats']);
  const stats = result.stats || {
    totalScans: 0,
    threatsBlocked: 0,
    malwareBlocked: 0
  };

  Object.assign(stats, increment);
  await chrome.storage.local.set({ stats });
}

// ---------------------------------------------------------------------- //
// Badge Management                                                       //
// ---------------------------------------------------------------------- //

async function setBadge(text, color, tabId = null) {
  try {
    if (tabId) {
      await chrome.action.setBadgeText({ text, tabId });
      await chrome.action.setBadgeBackgroundColor({ color, tabId });
    } else {
      await chrome.action.setBadgeText({ text });
      await chrome.action.setBadgeBackgroundColor({ color });
    }
  } catch (error) {
    console.error('Failed to set badge:', error);
  }
}

async function clearBadge(tabId = null) {
  await setBadge('', '#666666', tabId);
}

// ---------------------------------------------------------------------- //
// Notification System                                                    //
// ---------------------------------------------------------------------- //

function showNotification(title, message, type = 'basic') {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message
  });
}

// ---------------------------------------------------------------------- //
// URL Scanning                                                           //
// ---------------------------------------------------------------------- //

async function scanUrl(url, tabId) {
  try {
    console.log('[ShieldAI] Scanning URL:', url);

    const response = await fetch(`${BACKEND_URL}/api/phishing/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(SCAN_TIMEOUT)
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();

    // Store scan result
    await chrome.storage.local.set({
      lastScan: {
        ...result,
        timestamp: Date.now()
      }
    });

    // Update stats
    await updateStats({ totalScans: 1 });

    // Handle threat detection
    // Warn level: phishing predicted with confidence >= 0.70 and < 0.90
    // Block level: phishing predicted with confidence >= 0.90
    if (result.prediction === 'phishing' && result.confidence >= 0.70) {

      if (result.confidence >= 0.90 &&
          (result.aatr_action === 'block' || result.aatr_action === 'quarantine')) {
        // ── BLOCK LEVEL ─────────────────────────────────────────────────── //
        console.log('[ShieldAI] High-confidence phishing BLOCKED:', url,
          `(${(result.confidence * 100).toFixed(1)}%, action=${result.aatr_action})`);

        await setBadge('!', '#ef4444', tabId); // Red badge
        await updateStats({ threatsBlocked: 1 });

        // Inject warning banner via content script
        if (tabId) {
          try {
            await chrome.tabs.sendMessage(tabId, {
              type: 'SHOW_WARNING_BANNER',
              data: {
                message: `Phishing blocked (${(result.confidence * 100).toFixed(1)}% confidence)`,
                threat: result
              }
            });
          } catch (error) {
            console.log('[ShieldAI] Content script not ready for banner');
          }
        }

        // Redirect to warning page
        if (tabId) {
          const warningUrl = chrome.runtime.getURL('src/popup/warning.html') +
            `?${new URLSearchParams({
              url: result.url,
              prediction: result.prediction,
              confidence: result.confidence,
              risk_level: result.risk_level,
              threat_report: result.threat_report,
              aatr_action: result.aatr_action,
              shap: JSON.stringify(result.shap_explanation || [])
            })}`;

          await chrome.tabs.update(tabId, { url: warningUrl });
        }

      } else if (result.confidence >= 0.70 && result.confidence < 0.90) {
        // ── WARN LEVEL ──────────────────────────────────────────────────── //
        // Orange badge only — do NOT redirect or inject banner
        console.log('[ShieldAI] Moderate-confidence warning (badge only):', url,
          `(${(result.confidence * 100).toFixed(1)}%)`);
        await setBadge('!', '#f97316', tabId); // Orange badge
      }

    } else {
      await clearBadge(tabId);
    }

    return result;

  } catch (error) {
    console.error('[ShieldAI] Scan failed:', error);

    // Backend offline - show gray badge
    await setBadge('?', '#666666', tabId);

    // Fail open - don't block
    return null;
  }
}

// ---------------------------------------------------------------------- //
// Download Scanning                                                      //
// ---------------------------------------------------------------------- //

async function scanDownload(downloadId, url, filename) {
  try {
    console.log('[ShieldAI] Scanning download:', filename);

    // Pause download immediately
    await chrome.downloads.pause(downloadId);

    // Fetch file content (first 1MB)
    const response = await fetch(url, {
      headers: { 'Range': 'bytes=0-1048576' }, // 1MB
      signal: AbortSignal.timeout(SCAN_TIMEOUT)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }

    const blob = await response.blob();

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', blob, filename);

    // Send to malware API
    const scanResponse = await fetch(`${BACKEND_URL}/api/malware/scan`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(SCAN_TIMEOUT * 2) // Allow more time for file scanning
    });

    if (!scanResponse.ok) {
      throw new Error(`Malware scan failed: ${scanResponse.status}`);
    }

    const result = await scanResponse.json();

    // Handle result
    if (result.prediction === 'malicious' && result.confidence > 0.80) {
      console.log('[ShieldAI] Malware detected:', filename);

      // Cancel download
      await chrome.downloads.cancel(downloadId);

      // Show notification
      showNotification(
        'ShieldAI — Malware Blocked',
        `${filename} - ${(result.confidence * 100).toFixed(1)}% confidence`
      );

      // Update stats
      await updateStats({ malwareBlocked: 1 });
    } else {
      // Resume download
      await chrome.downloads.resume(downloadId);
    }

  } catch (error) {
    console.error('[ShieldAI] Download scan failed:', error);

    // Fail open - resume download
    try {
      await chrome.downloads.resume(downloadId);
    } catch (resumeError) {
      console.error('Failed to resume download:', resumeError);
    }
  }
}

// ---------------------------------------------------------------------- //
// Event Listeners                                                        //
// ---------------------------------------------------------------------- //

// Web Navigation Monitoring
chrome.webNavigation.onCommitted.addListener(async (details) => {
  // Only monitor main frame navigation
  if (details.frameId !== 0) return;

  const { url, tabId } = details;

  // Layer 0: Skip browser-internal URLs
  if (shouldSkipUrl(url)) return;

  // Layer 1a: Skip named trusted domains (whitelist)
  if (isTrustedDomain(url)) {
    console.log('[ShieldAI] Trusted domain — skip:', extractDomain(url));
    await clearBadge(tabId);
    return;
  }

  // Layer 1b: Skip government / education / military TLDs
  if (isTrustedTld(url)) {
    console.log('[ShieldAI] Trusted TLD — skip:', extractDomain(url));
    await clearBadge(tabId);
    return;
  }

  const domain = extractDomain(url);

  // Layer 3: Skip user-allowed domains
  if (await isUserAllowed(domain)) {
    console.log('[ShieldAI] User allowlist — skip:', domain);
    await clearBadge(tabId);
    return;
  }

  // Cooldown: skip if this domain was scanned very recently
  if (isRecentlyScananed(domain)) return;

  // Layer 2: Pre-scan heuristic — only scan suspicious-looking URLs
  if (!hasSuspiciousSignals(url)) {
    await clearBadge(tabId);
    return;
  }

  // All layers passed — send to ML model
  await scanUrl(url, tabId);
});


// Download Monitoring
chrome.downloads.onCreated.addListener(async (downloadItem) => {
  const { id, url, filename } = downloadItem;

  // Skip if no filename or trusted domain
  if (!filename || isTrustedDomain(url)) return;

  // Check file extension
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension || !MALWARE_EXTENSIONS.has(extension)) return;

  // Scan download
  await scanDownload(id, url, filename);
});

// Message Handler for popup communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'GET_STATS':
          const statsResult = await chrome.storage.local.get(['stats']);
          const lastScanResult = await chrome.storage.local.get(['lastScan']);
          const stats = statsResult.stats || { totalScans: 0, threatsBlocked: 0, malwareBlocked: 0 };
          sendResponse({ ...stats, lastScan: lastScanResult.lastScan });
          break;

        case 'GET_LAST_SCAN':
          const scanResult = await chrome.storage.local.get(['lastScan']);
          sendResponse(scanResult.lastScan);
          break;

        case 'MANUAL_SCAN':
          const result = await scanUrl(message.data.url, null);
          sendResponse(result);
          break;

        case 'ADD_TO_ALLOWLIST':
          await addToAllowlist(message.data.domain);
          sendResponse({ success: true });
          break;

        case 'REMOVE_FROM_ALLOWLIST':
          await removeFromAllowlist(message.data.domain);
          sendResponse({ success: true });
          break;

        case 'GET_ALLOWLIST': {
          const { userAllowlist } = await chrome.storage.local.get(['userAllowlist']);
          sendResponse({ allowlist: userAllowlist || [] });
          break;
        }

        case 'REFRESH_INTEL':
          try {
            const response = await fetch(`${BACKEND_URL}/api/intel/refresh`, {
              method: 'POST',
              signal: AbortSignal.timeout(SCAN_TIMEOUT)
            });
            sendResponse({ success: response.ok });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'CHECK_BACKEND':
          try {
            const response = await fetch(`${BACKEND_URL}/api/health/ready`, {
              signal: AbortSignal.timeout(3000)
            });
            sendResponse({ online: response.ok });
          } catch {
            sendResponse({ online: false });
          }
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ error: error.message });
    }
  })();

  return true; // Indicate we will respond asynchronously
});

// Extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('[ShieldAI] Extension started');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ShieldAI] Extension installed');
  extensionId = chrome.runtime.id;
});

console.log('[ShieldAI] Background script loaded');