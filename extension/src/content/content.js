// ShieldAI v2 Content Script
// Runs on every page to detect threats and show warnings

(function() {
  'use strict';

  // ---------------------------------------------------------------------- //
  // State                                                                  //
  // ---------------------------------------------------------------------- //

  let warningBanner = null;

  // ---------------------------------------------------------------------- //
  // CamPhish Detection                                                     //
  // ---------------------------------------------------------------------- //

  function detectCameraAccess() {
    try {
      // Check if page JS is trying to access camera/media
      const scripts = document.getElementsByTagName('script');
      for (const script of scripts) {
        if (script.textContent && (
          script.textContent.includes('getUserMedia') ||
          script.textContent.includes('mediaDevices') ||
          script.textContent.includes('navigator.camera')
        )) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  function detectLocationAccess() {
    try {
      // Check for geolocation requests
      const scripts = document.getElementsByTagName('script');
      for (const script of scripts) {
        if (script.textContent && (
          script.textContent.includes('getCurrentPosition') ||
          script.textContent.includes('watchPosition') ||
          script.textContent.includes('navigator.geolocation')
        )) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  function detectSuspiciousForm() {
    try {
      const forms = document.querySelectorAll('form');
      const currentDomain = window.location.hostname;

      for (const form of forms) {
        // Check if form has password field
        const hasPassword = form.querySelector('input[type="password"]');
        if (!hasPassword) continue;

        // Check if action points to different domain
        const action = form.getAttribute('action');
        if (action) {
          try {
            const actionUrl = new URL(action, window.location.href);
            if (actionUrl.hostname !== currentDomain) {
              return true;
            }
          } catch {
            // Relative URL, probably safe
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  function detectFakeUpdate() {
    try {
      const title = document.title.toLowerCase();
      const hasUpdateInTitle = title.includes('update') || title.includes('upgrade');

      if (!hasUpdateInTitle) return false;

      // Look for download buttons
      const buttons = document.querySelectorAll('button, a, input[type="button"]');
      for (const button of buttons) {
        const text = button.textContent?.toLowerCase() || '';
        const href = button.getAttribute('href')?.toLowerCase() || '';

        if (text.includes('download') || text.includes('install') ||
            href.includes('download') || href.includes('.exe')) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------- //
  // Warning Banner                                                         //
  // ---------------------------------------------------------------------- //

  function createWarningBanner(message) {
    if (warningBanner) {
      return; // Banner already exists
    }

    // Create banner container
    warningBanner = document.createElement('div');
    warningBanner.id = 'shieldai-warning-banner';

    // Styles to ensure it doesn't break page layout
    warningBanner.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: 100% !important;
      z-index: 2147483647 !important;
      background: linear-gradient(135deg, #ef4444, #f97316) !important;
      color: white !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
      font-size: 14px !important;
      line-height: 1.4 !important;
      padding: 12px 16px !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
      border: none !important;
      margin: 0 !important;
      box-sizing: border-box !important;
    `;

    // SVG shield icon
    const shieldIcon = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
        <path d="M12 1L3 5.5V11.5C3 17.1 6.84 22.29 12 23C17.16 22.29 21 17.1 21 11.5V5.5L12 1Z"/>
      </svg>
    `;

    // Banner HTML
    warningBanner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; max-width: 100%;">
        <div style="display: flex; align-items: center; flex: 1; min-width: 0;">
          ${shieldIcon}
          <div style="flex: 1; min-width: 0;">
            <strong style="display: block; margin-bottom: 4px;">⚠️ ShieldAI Warning</strong>
            <div style="font-size: 13px; opacity: 0.9;">${message}</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; margin-left: 16px;">
          <button id="shieldai-leave-page" style="
            background: rgba(255,255,255,0.2) !important;
            border: 1px solid rgba(255,255,255,0.3) !important;
            color: white !important;
            padding: 6px 12px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 12px !important;
            font-family: inherit !important;
          ">Leave Page</button>
          <button id="shieldai-understand-risk" style="
            background: transparent !important;
            border: 1px solid rgba(255,255,255,0.3) !important;
            color: white !important;
            padding: 6px 12px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 12px !important;
            font-family: inherit !important;
          ">I Understand</button>
          <button id="shieldai-close-banner" style="
            background: none !important;
            border: none !important;
            color: white !important;
            cursor: pointer !important;
            font-size: 18px !important;
            padding: 4px !important;
            line-height: 1 !important;
            font-family: inherit !important;
          ">&times;</button>
        </div>
      </div>
    `;

    // Add event listeners
    const leaveButton = warningBanner.querySelector('#shieldai-leave-page');
    const understandButton = warningBanner.querySelector('#shieldai-understand-risk');
    const closeButton = warningBanner.querySelector('#shieldai-close-banner');

    leaveButton.onclick = () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    };

    understandButton.onclick = closeBanner;
    closeButton.onclick = closeBanner;

    // Insert at beginning of body to ensure visibility
    if (document.body) {
      document.body.insertBefore(warningBanner, document.body.firstChild);
    } else {
      // If body doesn't exist yet, wait for it
      const observer = new MutationObserver(() => {
        if (document.body) {
          document.body.insertBefore(warningBanner, document.body.firstChild);
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    // Adjust page content to account for banner height
    adjustPageForBanner();

    console.log('[ShieldAI] Warning banner shown');
  }

  function closeBanner() {
    if (warningBanner && warningBanner.parentNode) {
      warningBanner.parentNode.removeChild(warningBanner);
      warningBanner = null;

      // Restore page layout
      restorePageLayout();

      console.log('[ShieldAI] Warning banner closed');
    }
  }

  function adjustPageForBanner() {
    if (!warningBanner) return;

    // Get banner height
    const bannerHeight = warningBanner.offsetHeight;

    // Add padding to body to account for fixed banner
    const body = document.body;
    if (body) {
      const currentPaddingTop = parseInt(window.getComputedStyle(body).paddingTop) || 0;
      body.style.paddingTop = (currentPaddingTop + bannerHeight) + 'px';
      body.setAttribute('data-shieldai-original-padding', currentPaddingTop.toString());
    }
  }

  function restorePageLayout() {
    const body = document.body;
    if (body) {
      const originalPadding = body.getAttribute('data-shieldai-original-padding');
      if (originalPadding !== null) {
        body.style.paddingTop = originalPadding + 'px';
        body.removeAttribute('data-shieldai-original-padding');
      }
    }
  }

  // ---------------------------------------------------------------------- //
  // Threat Detection                                                       //
  // ---------------------------------------------------------------------- //

  function runThreatDetection() {
    try {
      let threatDetected = false;
      let threatMessage = '';

      // Check for CamPhish indicators
      if (detectCameraAccess()) {
        threatDetected = true;
        threatMessage = 'This page is requesting camera access — possible CamPhish attack detected';
      } else if (detectLocationAccess()) {
        threatDetected = true;
        threatMessage = 'This page is requesting location access — possible tracking attempt detected';
      } else if (detectSuspiciousForm()) {
        threatDetected = true;
        threatMessage = 'This page contains a suspicious login form — credentials may be harvested';
      } else if (detectFakeUpdate()) {
        threatDetected = true;
        threatMessage = 'This appears to be a fake browser update page';
      }

      if (threatDetected) {
        console.log('[ShieldAI] Threat detected:', threatMessage);
        createWarningBanner(threatMessage);
      }

    } catch (error) {
      console.error('[ShieldAI] Threat detection error:', error);
    }
  }

  // ---------------------------------------------------------------------- //
  // Message Listener                                                       //
  // ---------------------------------------------------------------------- //

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      switch (message.type) {
        case 'SHOW_WARNING_BANNER':
          createWarningBanner(message.data.message);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[ShieldAI] Message handler error:', error);
      sendResponse({ error: error.message });
    }
  });

  // ---------------------------------------------------------------------- //
  // Initialization                                                         //
  // ---------------------------------------------------------------------- //

  // Run threat detection when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runThreatDetection);
  } else {
    runThreatDetection();
  }

  // Run again after a short delay to catch dynamically loaded content
  setTimeout(runThreatDetection, 2000);

  console.log('[ShieldAI] Content script loaded on:', window.location.href);

})();