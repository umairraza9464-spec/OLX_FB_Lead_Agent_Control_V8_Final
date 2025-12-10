const SENT_NUMBERS_KEY = 'sentNumbersLog';

/**
 * CONTENT.JS V8 FINAL
 * 
 * CRITICAL TODO:
 * 1. Implement Persistent Duplicate Check before sending
 * 2. Load sentNumbersLog from chrome.storage.local
 * 3. If lead.mobile found in log, set status "DUPLICATE: [mobile]"
 * 4. Extract max vehicle data: carModel, year, km, variant, regNo, address
 * 5. Implement follow-up logic (manual note or auto-scan)
 * 6. Display control panel with Mobile, Name, Reg No, Model, Year, KM, Variant, Address
 */

(function() {
  const seenNumbers = new Set(); // Page-level deduplication

  // PLACEHOLDER: Persistent duplicate check
  async function isPersistentDuplicate(mobile) {
    return new Promise((resolve) => {
      chrome.storage.local.get(SENT_NUMBERS_KEY, (result) => {
        const sentLog = result[SENT_NUMBERS_KEY] || [];
        resolve(sentLog.includes(mobile));
      });
    });
  }

  // PLACEHOLDER: Send lead with checks
  async function sendLead(lead) {
    // Check persistent log
    if (await isPersistentDuplicate(lead.mobile)) {
      console.log(`DUPLICATE (persistent): ${lead.mobile}`);
      updateStatus(`DUPLICATE: ${lead.mobile}`);
      return;
    }

    // Check page-level
    if (seenNumbers.has(lead.mobile)) {
      console.log(`DUPLICATE (page): ${lead.mobile}`);
      updateStatus(`DUPLICATE: ${lead.mobile}`);
      return;
    }

    seenNumbers.add(lead.mobile);

    chrome.runtime.sendMessage(
      { type: 'SEND_LEAD', payload: lead },
      (response) => {
        if (response && response.ok) {
          updateStatus('SENT');
        } else {
          updateStatus(`FAILED: ${response?.error || 'Unknown'}`);
        }
      }
    );
  }

  // PLACEHOLDER: Extract vehicle details
  function extractFromPage() {
    return {
      carModel: '',      // TODO: Extract from page text/DOM
      year: '',          // TODO: Extract year if available
      km: '',            // TODO: Extract odometer/km reading
      variant: '',       // TODO: Extract vehicle variant
      regNo: '',         // TODO: Extract registration number
      address: ''        // TODO: Extract location/address
    };
  }

  // PLACEHOLDER: Build follow-up note
  function buildFollowUp(manualNote = '') {
    // Manual scan: user-provided note
    // Auto scan: empty string
    return manualNote || '';
  }

  // PLACEHOLDER: Update UI status
  function updateStatus(status) {
    console.log(`Status: ${status}`);
    // TODO: Update control panel UI
  }

  // PLACEHOLDER: Control panel to display last lead
  function initControlPanel() {
    // TODO: Create floating panel with
    // Mobile, Name, Reg No, Model, Year, KM, Variant, Address
  }

  // PLACEHOLDER: Scan page for leads
  function scanPageForLeads() {
    // TODO: Implement DOM scanning logic
    console.log('Page scanning ready');
  }

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initControlPanel();
      scanPageForLeads();
    });
  } else {
    initControlPanel();
    scanPageForLeads();
  }

  // Expose sendLead globally for debugging
  window._sendLead = sendLead;
  window._scanPage = scanPageForLeads;
})();
