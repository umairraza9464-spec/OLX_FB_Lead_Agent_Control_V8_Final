// Load settings and populate form
function loadSettings() {
  chrome.storage.sync.get(['licenseKey', 'webhookUrl', 'campaignLimit', 'messageDelay', 'mode', 'defaultNote'], (result) => {
    if (result.licenseKey) document.getElementById('licenseKey').value = result.licenseKey;
    if (result.webhookUrl) document.getElementById('webhookUrl').value = result.webhookUrl;
    if (result.campaignLimit) document.getElementById('campaignLimit').value = result.campaignLimit;
    if (result.messageDelay) document.getElementById('messageDelay').value = result.messageDelay;
    if (result.mode) document.getElementById('mode').value = result.mode;
    if (result.defaultNote) document.getElementById('defaultNote').value = result.defaultNote;
  });
}

// Save settings on form submit
document.getElementById('settingsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const licenseKey = document.getElementById('licenseKey').value.trim();
  const webhookUrl = document.getElementById('webhookUrl').value.trim();
  const campaignLimit = parseInt(document.getElementById('campaignLimit').value) || 20;
  const messageDelay = parseInt(document.getElementById('messageDelay').value) || 5;
  const mode = document.getElementById('mode').value;
  const defaultNote = document.getElementById('defaultNote').value.trim();
  
  // Validation
  if (!licenseKey) {
    showStatus('License key is required', 'error');
    return;
  }
  
  if (!webhookUrl) {
    showStatus('Webhook URL is required', 'error');
    return;
  }
  
  if (!webhookUrl.includes('script.google.com')) {
    showStatus('Invalid Google Sheets webhook URL', 'error');
    return;
  }
  
  // Save to Chrome storage
  chrome.storage.sync.set({
    licenseKey,
    webhookUrl,
    campaignLimit,
    messageDelay,
    mode,
    defaultNote,
    settingsSavedTime: new Date().toISOString()
  }, () => {
    showStatus('✅ Settings saved successfully!', 'success');
    setTimeout(() => showStatus('', 'success'), 3000);
  });
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  if (type === 'error') {
    status.style.display = 'block';
  }
}

// Load settings when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSettings);
} else {
  loadSettings();
}
