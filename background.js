const SENT_NUMBERS_KEY = 'sentNumbersLog';
const QUEUE_KEY = 'pendingLeadQueueV8';

// Helper: Get JSON from storage
function getStoredJson(key, area = 'local') {
  return new Promise((resolve) => {
    chrome.storage[area].get(key, (result) => {
      resolve(result[key] || null);
    });
  });
}

// Helper: Set JSON to storage
function setStoredJson(key, value, area = 'local') {
  return new Promise((resolve) => {
    chrome.storage[area].set({ [key]: value }, resolve);
  });
}

// Add mobile number to persistent sent log
async function addToSentLog(mobile) {
  const log = (await getStoredJson(SENT_NUMBERS_KEY)) || [];
  if (!log.includes(mobile)) {
    log.push(mobile);
    await setStoredJson(SENT_NUMBERS_KEY, log);
    console.log(`Logged as sent in persistent log: ${mobile}`);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Lead logged',
      message: `Saved ${mobile} to sent log`
    });
  }
}

// Enqueue lead for retry
async function enqueueLead(lead) {
  const queue = (await getStoredJson(QUEUE_KEY)) || [];
  queue.push(lead);
  await setStoredJson(QUEUE_KEY, queue);
  console.log('Lead enqueued for retry:', lead.mobile);
}

// Dequeue and remove first lead
async function dequeueLead() {
  const queue = (await getStoredJson(QUEUE_KEY)) || [];
  if (queue.length === 0) return null;
  const lead = queue.shift();
  await setStoredJson(QUEUE_KEY, queue);
  return lead;
}

// Send lead to webhook
async function sendLeadToWebhook(lead, fromQueue = false) {
  const webhookUrl = await getStoredJson('webhookUrl', 'sync');
  const licenseKey = await getStoredJson('licenseKey', 'sync');

  if (!webhookUrl) {
    console.log('NO_WEBHOOK configured');
    return { ok: false, error: 'NO_WEBHOOK' };
  }

  const payload = {
    ...lead,
    date: new Date().toISOString(),
    licenseKey
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        console.log('Webhook response:', json);
      } catch (e) {
        console.log('Webhook response (text):', text);
      }

      // Add to persistent sent log
      await addToSentLog(payload.mobile);

      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: `Lead: ${payload.mobile}`,
        message: `Source: ${payload.source || 'N/A'} | Context: ${payload.context || 'N/A'}`
      });

      return { ok: true };
    } else {
      console.error('Webhook error:', response.status);
      if (!fromQueue) {
        await enqueueLead(lead);
      }
      return { ok: false, error: `HTTP ${response.status}` };
    }
  } catch (err) {
    console.error('BG lead send error:', err);
    if (!fromQueue) {
      await enqueueLead(lead);
    }
    return { ok: false, error: String(err) };
  }
}

// Process queue on startup
async function processQueue() {
  let lead;
  while ((lead = await dequeueLead())) {
    await sendLeadToWebhook(lead, true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Delay between retries
  }
  console.log('Queue processing complete');
}

// Message listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SEND_LEAD') {
    sendLeadToWebhook(msg.payload).then(result => {
      sendResponse(result);
    });
    return true;
  } else if (msg.type === 'PROCESS_QUEUE') {
    processQueue().then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }
});

// Auto-process queue on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started, processing queue...');
  processQueue();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated, processing queue...');
  processQueue();
});
