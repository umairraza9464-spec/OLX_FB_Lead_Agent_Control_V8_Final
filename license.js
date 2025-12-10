// LEADS PRO License Management System

const PLANS = {
  'free': { name: 'Free', leads_per_day: 10, agents: 1, campaigns: 1 },
  'basic': { name: 'Basic', leads_per_day: 50, agents: 3, campaigns: 3 },
  'premium': { name: 'Premium', leads_per_day: 200, agents: 10, campaigns: 10 },
  'enterprise': { name: 'Enterprise', leads_per_day: Infinity, agents: Infinity, campaigns: Infinity }
};

class LicenseManager {
  constructor() {
    this.licenseKey = null;
    this.planType = 'free';
    this.expiryDate = null;
    this.leadsUsedToday = 0;
    this.lastResetDate = new Date().toDateString();
  }

  validateLicense(key) {
    // Validate license key format (basic example)
    if (!key || key.length < 20) return false;
    
    // Decode license info
    const decoded = this.decodeLicense(key);
    if (!decoded) return false;

    this.licenseKey = key;
    this.planType = decoded.plan;
    this.expiryDate = new Date(decoded.expiry);
    
    chrome.storage.sync.set({
      licenseKey: key,
      licenseExpiry: this.expiryDate.getTime(),
      licensePlan: this.planType
    });

    console.log(`License activated: ${this.planType}`);
    return true;
  }

  decodeLicense(key) {
    try {
      const decoded = JSON.parse(atob(key));
      if (decoded.plan && decoded.expiry) return decoded;
    } catch (e) {
      console.error('Invalid license format');
    }
    return null;
  }

  canSendLead() {
    // Reset counter if new day
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.leadsUsedToday = 0;
      this.lastResetDate = today;
    }

    // Check if license is expired
    if (this.expiryDate && new Date() > this.expiryDate) {
      console.warn('License expired');
      return false;
    }

    // Check daily limit
    const plan = PLANS[this.planType] || PLANS.free;
    if (this.leadsUsedToday >= plan.leads_per_day) {
      console.warn(`Daily limit reached: ${plan.leads_per_day}`);
      return false;
    }

    this.leadsUsedToday++;
    return true;
  }

  getQuotaStatus() {
    const plan = PLANS[this.planType] || PLANS.free;
    return {
      plan: plan.name,
      leads_today: this.leadsUsedToday,
      leads_limit: plan.leads_per_day,
      percent_used: Math.round((this.leadsUsedToday / plan.leads_per_day) * 100),
      expiry_date: this.expiryDate
    };
  }

  generateLicenseKey(plan, daysValid = 365) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysValid);

    const licenseData = {
      plan: plan,
      expiry: expiryDate.toISOString(),
      created: new Date().toISOString(),
      signature: Math.random().toString(36).substr(2, 9)
    };

    return btoa(JSON.stringify(licenseData));
  }
}

const licenseManager = new LicenseManager();

// Export for Chrome extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LicenseManager, licenseManager };
}
