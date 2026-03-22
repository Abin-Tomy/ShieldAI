// ShieldAI v2 Popup Script
// Handles popup UI interactions and communication with background script

document.addEventListener('DOMContentLoaded', async () => {
  // ---------------------------------------------------------------------- //
  // DOM Elements                                                           //
  // ---------------------------------------------------------------------- //

  const statusPill = document.getElementById('status-pill');
  const statusText  = document.getElementById('status-text');
  const backendStatus = document.getElementById('backend-status');

  const totalScansEl = document.getElementById('total-scans');
  const threatsBlockedEl = document.getElementById('threats-blocked');
  const malwareBlockedEl = document.getElementById('malware-blocked');

  const lastScanContent = document.getElementById('last-scan-content');

  const manualUrlInput = document.getElementById('manual-url');
  const scanBtn = document.getElementById('scan-btn');
  const manualScanResult = document.getElementById('manual-scan-result');

  const openDashboardBtn = document.getElementById('open-dashboard');
  const refreshIntelBtn  = document.getElementById('refresh-intel');

  const allowSiteBtn       = document.getElementById('allow-site-btn');
  const currentSiteDomain  = document.getElementById('current-site-domain');

  let _activeDomain = null; // domain of the currently open tab

  // ---------------------------------------------------------------------- //
  // Helper Functions                                                       //
  // ---------------------------------------------------------------------- //

  function sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  function truncateUrl(url, maxLength = 30) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  }

  function timeAgo(timestamp) {
    if (!timestamp) return 'unknown';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function setLoading(element, isLoading, originalText = '') {
    if (isLoading) {
      element.disabled = true;
      element.innerHTML = `<div class="loading"></div> Loading...`;
    } else {
      element.disabled = false;
      element.innerHTML = originalText;
    }
  }

  // ---------------------------------------------------------------------- //
  // Backend Status Check                                                   //
  // ---------------------------------------------------------------------- //

  async function updateBackendStatus() {
    try {
      const response = await sendMessage({ type: 'CHECK_BACKEND' });
      const isOnline = response?.online || false;

      if (isOnline) {
        statusPill.className = 'status-pill status-pill-online';
        statusText.textContent = 'ONLINE';
        backendStatus.textContent = 'Connected';
        backendStatus.style.color = '#10b981';
      } else {
        statusPill.className = 'status-pill status-pill-offline';
        statusText.textContent = 'OFFLINE';
        backendStatus.textContent = 'Offline';
        backendStatus.style.color = '#ef4444';
      }

      return isOnline;
    } catch (error) {
      console.error('Failed to check backend status:', error);
      statusPill.className = 'status-pill status-pill-offline';
      statusText.textContent = 'ERROR';
      backendStatus.textContent = 'Error';
      backendStatus.style.color = '#ef4444';
      return false;
    }
  }

  // ---------------------------------------------------------------------- //
  // Stats Loading                                                          //
  // ---------------------------------------------------------------------- //

  async function loadStats() {
    try {
      const response = await sendMessage({ type: 'GET_STATS' });

      if (response) {
        totalScansEl.textContent = response.totalScans || 0;
        threatsBlockedEl.textContent = response.threatsBlocked || 0;
        malwareBlockedEl.textContent = response.malwareBlocked || 0;

        updateLastScan(response.lastScan);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  // ---------------------------------------------------------------------- //
  // Last Scan Display                                                      //
  // ---------------------------------------------------------------------- //

  function updateLastScan(scanData) {
    if (!scanData) {
      lastScanContent.innerHTML = `
        <div class="scan-row">
          <div class="scan-badge badge-empty">🛡️</div>
          <div class="scan-info">
            <div class="scan-url">No sites scanned yet</div>
            <div class="scan-meta">Visit any website to scan it</div>
          </div>
        </div>
      `;
      return;
    }

    const isPhishing = scanData.prediction === 'phishing';
    const emoji = isPhishing ? '⚠️' : '✅';
    const badgeClass = isPhishing ? 'badge-phishing' : 'badge-safe';
    const labelText = isPhishing ? 'Flagged as phishing' : 'Looks safe';
    const confClass = isPhishing ? 'conf-phishing' : 'conf-safe';

    lastScanContent.innerHTML = `
      <div class="scan-row">
        <div class="scan-badge ${badgeClass}">${emoji}</div>
        <div class="scan-info">
          <div class="scan-url" title="${scanData.url || ''}">${truncateUrl(scanData.url || '', 32)}</div>
          <div class="scan-meta">${labelText} • ${timeAgo(scanData.timestamp)}</div>
        </div>
        <div class="scan-confidence ${confClass}">${((scanData.confidence || 0) * 100).toFixed(0)}%</div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------- //
  // Manual Scan                                                            //
  // ---------------------------------------------------------------------- //

  async function performManualScan() {
    const url = manualUrlInput.value.trim();

    if (!url) {
      showError('Please enter a URL');
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      showError('Please enter a valid URL');
      return;
    }

    const originalText = scanBtn.innerHTML;
    setLoading(scanBtn, true);
    manualScanResult.style.display = 'none';

    try {
      const result = await sendMessage({
        type: 'MANUAL_SCAN',
        data: { url }
      });

      if (result) {
        const isPhishing = result.prediction === 'phishing';
        const cardClass = isPhishing ? 'result-phishing-card' : 'result-safe-card';
        const verdictClass = isPhishing ? 'result-verdict-phishing' : 'result-verdict-safe';
        const emoji = isPhishing ? '⚠️' : '✅';
        const label = isPhishing ? 'Phishing detected — don\'t visit this!' : 'Looks safe to visit';
        const conf = (result.confidence * 100).toFixed(1);

        manualScanResult.className = cardClass;
        manualScanResult.innerHTML = `
          <div class="result-verdict ${verdictClass}">${emoji} ${label}</div>
          <div class="result-sub">Confidence: ${conf}%${result.risk_level ? ' · Risk: ' + result.risk_level : ''}</div>
        `;
        manualScanResult.style.display = 'block';

        // Refresh stats to include this scan
        setTimeout(loadStats, 500);
      } else {
        showError('Scan failed — backend may be offline');
      }

    } catch (error) {
      console.error('Manual scan error:', error);
      showError('Scan failed — please try again');
    } finally {
      setLoading(scanBtn, false, originalText);
    }
  }

  function showError(message) {
    manualScanResult.className = 'result-error-card';
    manualScanResult.innerHTML = `
      <div class="result-verdict result-verdict-error">⚠️ ${message}</div>
    `;
    manualScanResult.style.display = 'block';
  }

  // ---------------------------------------------------------------------- //
  // Quick Actions                                                          //
  // ---------------------------------------------------------------------- //

  async function openDashboard() {
    try {
      await chrome.tabs.create({ url: 'http://localhost:5173' });
      window.close();
    } catch (error) {
      console.error('Failed to open dashboard:', error);
    }
  }

  async function refreshIntel() {
    const originalText = refreshIntelBtn.innerHTML;
    setLoading(refreshIntelBtn, true);

    try {
      const response = await sendMessage({ type: 'REFRESH_INTEL' });

      if (response?.success) {
        refreshIntelBtn.innerHTML = '✓ Refreshed';
        refreshIntelBtn.style.background = '#10b981';

        setTimeout(() => {
          refreshIntelBtn.innerHTML = originalText;
          refreshIntelBtn.style.background = '';
        }, 1500);
      } else {
        throw new Error('Refresh failed');
      }

    } catch (error) {
      console.error('Intel refresh error:', error);

      refreshIntelBtn.innerHTML = '✗ Failed';
      refreshIntelBtn.style.background = '#ef4444';

      setTimeout(() => {
        refreshIntelBtn.innerHTML = originalText;
        refreshIntelBtn.style.background = '';
      }, 1500);
    } finally {
      setLoading(refreshIntelBtn, false, originalText);
    }
  }

  // ---------------------------------------------------------------------- //
  // Event Listeners                                                        //
  // ---------------------------------------------------------------------- //

  scanBtn.addEventListener('click', performManualScan);

  manualUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performManualScan();
    }
  });

  openDashboardBtn.addEventListener('click', openDashboard);
  refreshIntelBtn.addEventListener('click', refreshIntel);

  // ---------------------------------------------------------------------- //
  // Allowlist UI                                                           //
  // ---------------------------------------------------------------------- //

  async function loadCurrentSite() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) return;

      // Skip extension pages / new-tab
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

      const url = new URL(tab.url);
      _activeDomain = url.hostname.toLowerCase().replace(/^www\./, '');
      currentSiteDomain.textContent = _activeDomain;

      // Check if already allowed
      const { allowlist } = await sendMessage({ type: 'GET_ALLOWLIST' });
      const isAllowed = (allowlist || []).includes(_activeDomain);
      renderAllowBtn(isAllowed);
    } catch (e) {
      currentSiteDomain.textContent = '—';
    }
  }

  function renderAllowBtn(isAllowed) {
    if (isAllowed) {
      allowSiteBtn.textContent = '✗ Remove';
      allowSiteBtn.className = 'allow-btn allow-btn-remove';
    } else {
      allowSiteBtn.textContent = '✓ Allow site';
      allowSiteBtn.className = 'allow-btn allow-btn-add';
    }
  }

  allowSiteBtn.addEventListener('click', async () => {
    if (!_activeDomain) return;
    const isCurrentlyAllowed = allowSiteBtn.classList.contains('allow-btn-remove');

    if (isCurrentlyAllowed) {
      await sendMessage({ type: 'REMOVE_FROM_ALLOWLIST', data: { domain: _activeDomain } });
      renderAllowBtn(false);
    } else {
      await sendMessage({ type: 'ADD_TO_ALLOWLIST', data: { domain: _activeDomain } });
      renderAllowBtn(true);
    }
  });

  // ---------------------------------------------------------------------- //
  // Initialization                                                         //
  // ---------------------------------------------------------------------- //

  // Load data when popup opens
  await Promise.all([
    updateBackendStatus(),
    loadStats(),
    loadCurrentSite()
  ]);

  // Focus URL input for quick scanning
  manualUrlInput.focus();

  console.log('[ShieldAI] Popup loaded');
});