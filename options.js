// Load settings from chrome.storage.sync
function loadSettings() {
  chrome.storage.sync.get(['webhookUrl', 'licenseKey', 'defaultNote'], (result) => {
    if (result.webhookUrl) {
      document.getElementById('webhookUrl').value = result.webhookUrl;
    }
    if (result.licenseKey) {
      document.getElementById('licenseKey').value = result.licenseKey;
    }
    if (result.defaultNote) {
      document.getElementById('defaultNote').value = result.defaultNote;
    }
  });
}

// Save settings to chrome.storage.sync
document.getElementById('saveBtn').addEventListener('click', () => {
  const webhookUrl = document.getElementById('webhookUrl').value.trim();
  const licenseKey = document.getElementById('licenseKey').value.trim();
  const defaultNote = document.getElementById('defaultNote').value.trim();

  if (!webhookUrl) {
    showStatus('Webhook URL is required', 'error');
    return;
  }

  chrome.storage.sync.set({
    webhookUrl,
    licenseKey,
    defaultNote
  }, () => {
    showStatus('Settings saved successfully!', 'success');
    console.log('Settings saved:', { webhookUrl, licenseKey });
  });
});

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = type;
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusDiv.className = '';
  }, 3000);
}

// Load settings on page load
window.addEventListener('DOMContentLoaded', loadSettings);
