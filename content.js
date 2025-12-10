// OLX/FB Lead Agent Control V8 Final - With V6 Full Features
// Auto/Manual scan, Persistent Duplicate Detection, No-Miss Queue

const SENT_NUMBERS_KEY = 'sentNumbersLog';
const REGEX_REGNO = /[A-Z]{2}?[0-9]{1,2}?[A-Z]{1,2}?[0-9]{4}/g;
const REGEX_PHONE = /(91-?)?[6-9]\d{9}/g;

const seenNumbers = new Set();
let settings = { autoEnabled: true, defaultNote: '' };
let lastCapturedLead = null;

function cleanText(str) {
  return str.replace(/\s+/g, ' ').trim();
}

function getSource() {
  const host = location.host;
  if (host.includes('olx')) return 'OLX';
  if (host.includes('facebook')) return 'FB';
  return host;
}

// ============== PERSISTENT DUPLICATE CHECK ==============
async function isPersistentDuplicate(mobile) {
  return new Promise((resolve) => {
    chrome.storage.local.get(SENT_NUMBERS_KEY, (result) => {
      const sentLog = result[SENT_NUMBERS_KEY] || [];
      resolve(sentLog.includes(mobile));
    });
  });
}

// ============== UI PANEL ==============
function createControlPanel() {
  if (document.getElementById('lead-agent-panel')) return;
  
  const panel = document.createElement('div');
  panel.id = 'lead-agent-panel';
  panel.style.position = 'fixed';
  panel.style.bottom = '12px';
  panel.style.right = '12px';
  panel.style.zIndex = '999999';
  panel.style.background = 'rgba(0,0,0,0.85)';
  panel.style.color = '#fff';
  panel.style.fontSize = '12px';
  panel.style.fontFamily = 'system-ui, sans-serif';
  panel.style.padding = '8px';
  panel.style.borderRadius = '8px';
  panel.style.boxShadow = '0 0 8px rgba(0,0,0,0.5)';
  panel.style.maxWidth = '280px';
  panel.style.wordBreak = 'break-word';

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
      <strong style="font-size:11px;">Lead Agent V8</strong>
      <label style="font-size:11px; cursor:pointer;">
        <input type="checkbox" id="la-auto-toggle" style="vertical-align:middle; margin-right:2px;" />
        Auto
      </label>
    </div>
    <button id="la-scan-page" style="width:100%; margin-bottom:3px; font-size:11px; cursor:pointer; padding:4px;">Scan Page Now</button>
    <button id="la-scan-chats" style="width:100%; margin-bottom:3px; font-size:11px; cursor:pointer; padding:4px;">Scan Old Chats</button>
    <button id="la-send-last" style="width:100%; margin-bottom:4px; font-size:11px; cursor:pointer; padding:4px;">Send Last Number</button>
    <div style="font-size:10px; margin-bottom:4px;">
      Last: <span id="la-last-mobile-span" style="color:#4CAF50;">-</span>
    </div>
    <input id="la-note" type="text" placeholder="Note/Tag" style="width:100%; font-size:11px; margin-bottom:4px; padding:3px;" />
    <div id="la-status" style="font-size:10px; opacity:0.8; color:#FFD700;">Status: Ready</div>
  `;
  
  document.body.appendChild(panel);

  const autoToggle = document.getElementById('la-auto-toggle');
  const noteInput = document.getElementById('la-note');
  
  autoToggle.checked = !!settings.autoEnabled;
  noteInput.value = settings.defaultNote;

  autoToggle.addEventListener('change', () => {
    settings.autoEnabled = autoToggle.checked;
    chrome.storage.sync.set({ autoEnabled: settings.autoEnabled });
    setStatus(settings.autoEnabled ? 'auto ON' : 'auto OFF');
  });

  noteInput.addEventListener('change', () => {
    settings.defaultNote = noteInput.value.trim();
    chrome.storage.sync.set({ defaultNote: settings.defaultNote });
  });

  document.getElementById('la-scan-page').addEventListener('click', () => {
    setStatus('manual scan page...');
    extractFromPage('MANUAL_PAGE');
  });

  document.getElementById('la-scan-chats').addEventListener('click', () => {
    setStatus('manual scan chats...');
    extractFromPage('MANUAL_CHAT');
  });

  document.getElementById('la-send-last').addEventListener('click', () => {
    if (!lastCapturedLead || !lastCapturedLead.mobile) {
      setStatus('no last number');
      return;
    }
    setStatus('sending last number...');
    const leadToSend = Object.assign({}, lastCapturedLead, { context: 'MANUAL_SINGLE', followUp: settings.defaultNote || lastCapturedLead.followUp });
    sendLead(leadToSend);
  });
}

function setStatus(text) {
  const el = document.getElementById('la-status');
  if (el) el.textContent = 'Status: ' + text;
}

function updateLastMobileUI() {
  const el = document.getElementById('la-last-mobile-span');
  if (!el) return;
  if (lastCapturedLead && lastCapturedLead.mobile) {
    el.textContent = lastCapturedLead.mobile;
  } else {
    el.textContent = '-';
  }
}

// ============== CORE SCAN ==============
function extractFromPage(context) {
  try {
    const body = document.body;
    if (!body) return;

    const text = cleanText(body.innerText);
    if (!text) return;

    // Extract phones
    const phonesRaw = text.match(REGEX_PHONE) || [];
    const phones = [];
    phonesRaw.forEach(p => {
      const normalized = p.replace(/[^0-9]/g, '');
      if (normalized.length >= 10) phones.push(normalized.slice(-10));
    });

    const uniquePhones = Array.from(new Set(phones));
    if (!uniquePhones.length) {
      if (context.startsWith('MANUAL')) setStatus('no numbers found');
      return;
    }

    // Extract RegNo
    const upperText = text.toUpperCase();
    const regMatches = upperText.match(REGEX_REGNO) || [];
    const regNo = regMatches.length ? regMatches[0] : '';

    // Extract car model from title
    const titleEl = document.querySelector('h1') || document.querySelector('title');
    const carModel = cleanText(titleEl?.innerText || document.title);

    // For each phone, create and send lead
    uniquePhones.forEach(async mobile => {
      // Check persistent duplicate BEFORE processing
      if (await isPersistentDuplicate(mobile)) {
        console.log(`DUPLICATE (persistent): ${mobile}`);
        return; // Skip this number
      }

      // Check page-level
      if (seenNumbers.has(mobile)) {
        if (!context.startsWith('MANUAL')) return;
      }

      seenNumbers.add(mobile);

      const lead = {
        name: '',
        mobile,
        regNo,
        carModel,
        variant: '',
        year: '',
        km: '',
        address: '',
        followUp: settings.defaultNote,
        source: getSource(),
        context: context || 'AUTO_SCAN'
      };

      lastCapturedLead = Object.assign({}, lead);
      updateLastMobileUI();
      sendLead(lead);
    });

    if (context.startsWith('MANUAL')) {
      setStatus(`sent ${uniquePhones.length} number(s)`);
    }
  } catch (e) {
    console.error('Lead scan error:', e);
    setStatus('error see console');
  }
}

// ============== SENDER via background ==============
function sendLead(lead) {
  chrome.runtime.sendMessage(
    { type: 'SEND_LEAD', payload: lead },
    (resp) => {
      if (chrome.runtime.lastError) {
        console.error('SEND_LEAD runtime error:', chrome.runtime.lastError);
        setStatus('send error');
        return;
      }
      if (!resp || !resp.ok) {
        console.error('SEND_LEAD failed:', resp?.error);
        setStatus('send error');
        return;
      }
      setStatus(`${lead.mobile} ok`);
    }
  );
}

// ============== INIT ==============
function initLeadAgent() {
  chrome.storage.sync.get(['autoEnabled', 'defaultNote'], (res) => {
    settings.autoEnabled = res.autoEnabled !== undefined ? res.autoEnabled : true;
    settings.defaultNote = res.defaultNote || '';

    createControlPanel();

    if (settings.autoEnabled) {
      setStatus('auto ON');
      setTimeout(() => extractFromPage('AUTO_SCAN'), 4000);
      setInterval(() => extractFromPage('AUTO_SCAN'), 8000);
    } else {
      setStatus('auto OFF');
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLeadAgent);
} else {
  initLeadAgent();
}
