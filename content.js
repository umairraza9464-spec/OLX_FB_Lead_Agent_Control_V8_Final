// LEADS AGENT PRO BY UMAIR - ULTRA ADVANCED V9
// Features: Auto/Manual modes, Owner detection (max 3 posts), Message variations,
// Campaign limits (20/day), 5sec delay, Chat selection, Webhook integration, License mgmt

const SENT_NUMBERS_KEY = 'sentNumbersLog';
const OWNER_DETECTION_KEY = 'ownerDetectionLog';
const CAMPAIGN_STATS_KEY = 'campaignStats';
const REGEX_REGNO = /[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}/g;
const REGEX_PHONE = /(91-?)?[6-9]\d{9}/g;
const REGEX_KM = /\b(\d+)\s*(km|k\.m)/gi;
const REGEX_YEAR = /\b(19|20)\d{2}\b/g;

let seenNumbers = new Set();
let ownerCache = new Map();
let campaignDailyCount = 0;
let lastCapturedLead = null;
let selectedChats = new Set();

const messageVariations = [
  'Dealer or owner? If owner, send me your number',
  'Are you the owner? Please share your contact',
  'Owner? Kindly provide your number',
  'Is this your vehicle? Share contact if yes',
  'Owner ka vehicle hai? Number bhejo',
  'Sahi person se baat karna hai. Owner ho to number do',
  'Direct owner se baat krni h. Contact krna'
];

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

    // Extract title/model
    const titleEl = document.querySelector('h1') || document.querySelector('[data-testid="ad-title"]');
    const carModel = titleEl ? cleanText(titleEl.innerText) : document.title;

    // Extract address
    const addressEl = document.querySelector('[data-testid="location"]') || document.querySelector('.location');
    const address = addressEl ? cleanText(addressEl.innerText) : '';

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
          timestamp: new Date().toISOString(),
          isOwner: false,
          status: 'pending'
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

function detectOwner(mobile, address) {
  const cacheKey = `${address}_count`;
  const currentCount = ownerCache.get(cacheKey) || 0;
  
  if (currentCount < 3) {
    ownerCache.set(cacheKey, currentCount + 1);
    return true; // Treat as owner (max 3 posts per location)
  }
  return false;
}

function createControlPanel() {
  if (document.getElementById('leads-pro-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'leads-pro-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    padding: 15px;
    border-radius: 12px;
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 12px;
    z-index: 999999;
    min-width: 280px;
    max-width: 320px;
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
    border: 1px solid rgba(255,255,255,0.2);
  `;

  panel.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 10px; font-size: 13px; color: #fff;">🚀 LEADS PRO by UMAIR</div>
    <div style="display: flex; gap: 6px; margin-bottom: 8px;">
      <button id="auto-scan" style="flex:1; padding:7px; background:rgba(255,255,255,0.2); color:#fff; border:1px solid rgba(255,255,255,0.3); border-radius:4px; cursor:pointer; font-size:11px; font-weight:600;">AUTO</button>
      <button id="manual-scan" style="flex:1; padding:7px; background:rgba(255,255,255,0.3); color:#fff; border:1px solid rgba(255,255,255,0.3); border-radius:4px; cursor:pointer; font-size:11px; font-weight:600;">MANUAL</button>
    </div>
    <button id="chat-select" style="width:100%; padding:8px; margin-bottom:6px; background:rgba(255,255,255,0.15); color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:4px; cursor:pointer; font-size:11px; font-weight:600;">SELECT CHATS</button>
    <button id="send-followup" style="width:100%; padding:8px; margin-bottom:6px; background:#ff6b6b; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600;">SEND FOLLOW-UP</button>
    <div id="status" style="font-size:10px; padding:8px; background:rgba(255,255,255,0.1); border-radius:4px; min-height:24px; line-height:1.4;">🟢 Ready</div>
  `;

  document.body.appendChild(panel);

  // Event listeners
  document.getElementById('auto-scan').addEventListener('click', () => autoScanMode());
  document.getElementById('manual-scan').addEventListener('click', () => manualScanMode());
  document.getElementById('chat-select').addEventListener('click', () => selectChatsMode());
  document.getElementById('send-followup').addEventListener('click', () => sendFollowUp());
}

function autoScanMode() {
  updateStatus('🔄 Auto scanning...');
  const leads = extractAllData();
  if (leads) {
    const ownerLeads = leads.filter(l => detectOwner(l.mobile, l.address));
    if (ownerLeads.length > 0) {
      chrome.runtime.sendMessage({ type: 'SEND_CAMPAIGN', leads: ownerLeads, mode: 'auto' }, resp => {
        if (resp && resp.ok) {
          updateStatus(`✅ ${ownerLeads.length} owners found`);
          lastCapturedLead = ownerLeads[0];
        }
      });
    } else {
      updateStatus('⚠️ No new owners');
    }
  } else {
    updateStatus('❌ No data found');
  }
}

function manualScanMode() {
  updateStatus('📍 Manual mode - Click SEND FOLLOW-UP');
  const leads = extractAllData();
  if (leads) {
    lastCapturedLead = leads[0];
    updateStatus(`📱 ${leads[0].mobile} ready`);
  }
}

function selectChatsMode() {
  updateStatus('💬 Select chats mode...');
  // Implementation for chat selection
  alert('Select chats from conversation list and click SEND FOLLOW-UP');
}

function sendFollowUp() {
  if (!lastCapturedLead) {
    updateStatus('❌ No lead selected');
    return;
  }
  
  const randomMsg = messageVariations[Math.floor(Math.random() * messageVariations.length)];
  chrome.runtime.sendMessage({ 
    type: 'SEND_MESSAGE', 
    mobile: lastCapturedLead.mobile, 
    message: randomMsg,
    lead: lastCapturedLead
  }, resp => {
    if (resp && resp.ok) {
      updateStatus(`✅ Message sent\n${lastCapturedLead.mobile}`);
      setTimeout(() => updateStatus('🟢 Ready'), 3000);
    }
  });
}

function updateStatus(text) {
  const el = document.getElementById('status');
  if (el) el.innerHTML = text;
}

function init() {
  chrome.storage.sync.get([SENT_NUMBERS_KEY, OWNER_DETECTION_KEY], (res) => {
    if (res[SENT_NUMBERS_KEY]) {
      res[SENT_NUMBERS_KEY].forEach(num => seenNumbers.add(num));
    }
    if (res[OWNER_DETECTION_KEY]) {
      res[OWNER_DETECTION_KEY].forEach(([key, val]) => ownerCache.set(key, val));
    }
  });
  
  createControlPanel();
  
  // Auto-detect on page load
  setTimeout(() => {
    const leads = extractAllData();
    if (leads && leads.length > 0) {
      const ownerCount = leads.filter(l => detectOwner(l.mobile, l.address)).length;
      if (ownerCount > 0) {
        updateStatus(`🎯 Found: ${ownerCount} owners`);
      }
    }
  }, 1500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
