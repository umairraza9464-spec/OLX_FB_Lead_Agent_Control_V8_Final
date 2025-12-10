// LEADS PRO Real-Time Supervisor Sync System
// Receives lead data 5 seconds BEFORE agent sends it

class SupervisorSync {
  constructor() {
    this.leadsBuffer = [];
    this.maxLeadsShown = 50;
    this.syncInterval = 2000; // Update UI every 2 seconds
  }

  // Start listening for lead captures from content script
  startListening() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'LEAD_CAPTURED') {
        // Lead detected 5 seconds before sending
        this.addLeadToBuffer({
          ...msg.lead,
          captured_time: new Date(),
          agent: msg.agent_id,
          source: msg.source,
          status: 'CAPTURED_WAITING'
        });
        this.broadcastToSupervisor(msg.lead);
      }

      if (msg.type === 'LEAD_SENT') {
        // Lead actually sent to webhook
        this.updateLeadStatus(msg.mobile, 'SENT_TO_WEBHOOK');
      }
    });
  }

  addLeadToBuffer(lead) {
    this.leadsBuffer.unshift(lead); // Add to beginning
    if (this.leadsBuffer.length > this.maxLeadsShown) {
      this.leadsBuffer.pop(); // Remove oldest
    }
    this.updateDashboard();
  }

  // Send lead data to supervisor dashboard
  broadcastToSupervisor(lead) {
    // In real implementation, this would send to a server
    // For now, we store in local storage for the dashboard to read
    chrome.storage.local.get('supervisorLeads', (result) => {
      const leads = result.supervisorLeads || [];
      leads.unshift({
        ...lead,
        received_at: new Date().getTime(),
        ahead_of_agent_by: '5 seconds'
      });
      
      if (leads.length > 100) leads.pop();
      chrome.storage.local.set({ supervisorLeads: leads });
    });
  }

  updateLeadStatus(mobile, status) {
    const lead = this.leadsBuffer.find(l => l.mobile === mobile);
    if (lead) {
      lead.status = status;
      lead.sent_time = new Date();
      this.updateDashboard();
    }
  }

  updateDashboard() {
    // Send data to supervisor.html
    chrome.storage.local.set({ 
      currentLeadsBuffer: this.leadsBuffer,
      lastUpdate: new Date().getTime()
    });
  }

  // Get agent statistics
  getAgentStats() {
    const stats = {};
    this.leadsBuffer.forEach(lead => {
      if (!stats[lead.agent]) {
        stats[lead.agent] = { total: 0, sent: 0, processing: 0 };
      }
      stats[lead.agent].total++;
      if (lead.status === 'SENT_TO_WEBHOOK') {
        stats[lead.agent].sent++;
      } else {
        stats[lead.agent].processing++;
      }
    });
    return stats;
  }

  // Get owner detection accuracy
  getOwnerDetectionAccuracy() {
    const total = this.leadsBuffer.length;
    if (total === 0) return 0;
    
    const detected = this.leadsBuffer.filter(l => l.owner_type).length;
    return Math.round((detected / total) * 100);
  }
}

const supervisorSync = new SupervisorSync();
supervisorSync.startListening();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SupervisorSync, supervisorSync };
}
