// Lead Agent - Complete Data Extraction
const SENT_NUMBERS_KEY = 'sentNumbersLog';
const REGEX_REGNO = /[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}/g;
const REGEX_PHONE = /(91-?)?[6-9]\d{9}/g;
const REGEX_KM = /\b(\d+)\s*(km|k\.m|kilometers)/gi;
const REGEX_YEAR = /\b(19|20)\d{2}\b/g;

let seenNumbers = new Set();
let lastCapturedLead = null;

function cleanText(str) {
  return str.replace(/[^\w\s]/g, ' ').trim();
}

function extractAllData() {
  try {
    const pageText = document.body.innerText;
    if (!pageText) return null;

    // Extract phones
    const phonesRaw = pageText.match(REGEX_PHONE) || [];
    const phones = new Set();
    phonesRaw.forEach(p => {
      const normalized = p.replace(/[^0-9]/g, '');
      if (normalized.length === 10 || normalized.length === 12) {
        phones.add(normalized.slice(-10));
      }
    });

    if (phones.size === 0) return null;

    // Extract registration number
    const regnoMatch = pageText.match(REGEX_REGNO);
    const regNo = regnoMatch ? regnoMatch[0] : '';

    // Extract year
    const yearMatches = pageText.match(REGEX_YEAR) || [];
    const year = yearMatches.length > 0 ? yearMatches[yearMatches.length - 1] : '';

    // Extract KM
    const kmMatch = pageText.match(REGEX_KM);
    const km = kmMatch ? kmMatch[0].match(/\d+/)[0] : '';

    // Extract title/model from page
    const titleEl = document.querySelector('h1') || document.querySelector('[data-testid="ad-title"]');
    const carModel = titleEl ? cleanText(titleEl.innerText) : document.title;

    // Extract address
    const addressEl = document.querySelector('[data-testid="location"]') || document.querySelector('.location');
    const address = addressEl ? cleanText(addressEl.innerText) : '';

    // Build leads array
    const leads = [];
    phones.forEach(mobile => {
      if (!seenNumbers.has(mobile)) {
        leads.push({
          mobile,
          regNo,
          carModel,
          year,
          km,
          address,
          source: 'OLX/FB',
          timestamp: new Date().toISOString()
        });
        seenNumbers.add(mobile);
      }
    });

    return leads.length > 0 ? leads : null;
  } catch (e) {
    console.error('Extraction error:', e);
    return null;
  }
}

function createPanel() {
  if (document.getElementById('lead-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'lead-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0,0,0,0.9);
    color: #fff;
    padding: 12px;
    border-radius: 8px;
    font-family: system-ui;
    font-size: 12px;
    z-index: 999999;
    min-width: 250px;
    max-width: 300px;
  `;

  panel.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px; color: #0f0;">📱 Lead Agent</div>
    <button id="scan-btn" style="width:100%; padding:8px; margin-bottom:6px; background:#007bff; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;">SCAN PAGE</button>
    <div id="status" style="font-size:11px; padding:6px; background:rgba(255,255,255,0.1); border-radius:4px; min-height:20px;">Ready</div>
  `;

  document.body.appendChild(panel);

  document.getElementById('scan-btn').addEventListener('click', () => {
    const leads = extractAllData();
    if (leads) {
      lastCapturedLead = leads[0];
      const data = leads.map(l => `${l.mobile}|${l.regNo}|${l.carModel}|${l.year}|${l.km}|${l.address}`).join('\n');
      chrome.runtime.sendMessage({ type: 'COPY_DATA', data }, response => {
        document.getElementById('status').textContent = `✅ Copied: ${leads.length} numbers`;
        setTimeout(() => { document.getElementById('status').textContent = 'Ready'; }, 3000);
      });
    } else {
      document.getElementById('status').textContent = '❌ No data found';
    }
  });
}

function init() {
  chrome.storage.sync.get(SENT_NUMBERS_KEY, (res) => {
    if (res[SENT_NUMBERS_KEY]) {
      res[SENT_NUMBERS_KEY].forEach(num => seenNumbers.add(num));
    }
  });
  createPanel();
  // Auto-scan on page load
  setTimeout(() => {
    const leads = extractAllData();
    if (leads && leads.length > 0) {
      document.getElementById('status').textContent = `✅ Found: ${leads.length} numbers`;
    }
  }, 2000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
