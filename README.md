# OLX/FB Lead Agent V8 Final

**Chrome Extension for OLX/FB Lead Extraction with Persistent Duplicate Detection and No-Miss Queue System**

## Features

✅ **No-Miss Lead Delivery** - Automatic queue system retries failed leads
✅ **Zero Duplication** - Persistent duplicate log prevents re-sending same leads
✅ **Webhook Integration** - Direct Google Sheets synchronization
✅ **Advanced Lead Extraction** - Support for carModel, year, km, variant, regNo, address
✅ **Follow-up Logic** - Manual notes and automatic scan support

## Files

- `manifest.json` - Extension configuration
- `background.js` - Queue management and webhook delivery
- `content.js` - Page scanning and lead extraction (placeholder for integration)
- `options.html` - Settings UI
- `options.js` - Settings management

## Installation

1. Download the repository ZIP
2. Extract to a folder
3. Go to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the folder

## Configuration

1. Click extension icon → Options
2. Enter Google Apps Script Webhook URL
3. Add License Key
4. Save settings

## How It Works

### Background (Queue + Persistent Log)
- Receives `SEND_LEAD` messages from content script
- Sends to webhook immediately
- On success: adds mobile to `sentNumbersLog` in chrome.storage.local
- On failure: queues for retry
- On startup: auto-processes queue

### Content (Duplicate Check)
- Checks persistent `sentNumbersLog` before sending
- Maintains page-level `seenNumbers` set
- Skips duplicates with status message
- Sends new leads via `SEND_LEAD` message

## Next Steps for Integration

**In content.js, complete:**
1. Persistent duplicate check from sentNumbersLog
2. Advanced vehicle data extraction (carModel, year, km, etc.)
3. Follow-up logic implementation
4. Control panel UI with lead display

## Version
8.0 - Final with persistent duplicate detection

## Author
Umair Raza (umairraza9464-spec)
