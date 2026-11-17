/**
 * CallMate.ai — Settings & Telephony Integration Screen (Section 13)
 * Telecom carrier forwarding instructions, API key management, account settings,
 * privacy/data retention, notification preferences, and subscription tier.
 */

class SettingsScreen {
  constructor() {
    this.container = document.getElementById('screen-settings');
  }

  render() {
    if (!this.container) return;

    const config = appState.assistantConfig;

    this.container.innerHTML = `
      <div style="margin-bottom:20px;">
        <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-primary); letter-spacing:-0.02em;">Settings & Telephony Integration</h2>
        <p style="font-size:0.85rem; color:var(--text-muted);">Manage carrier call forwarding, security keys, privacy policies, and subscription</p>
      </div>

      <div class="grid-2">
        <!-- 1. Telecom Carrier Forwarding Setup -->
        <div class="card" style="border:1px solid rgba(245, 158, 11, 0.3);">
          <div class="card-header">
            <div class="card-title-group">
              <div class="card-icon" style="color:var(--warning);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <div>
                <h3 class="card-title">Phone Forwarding Integration</h3>
                <span class="card-subtitle">Connect your mobile carrier to CallMate</span>
              </div>
            </div>
            <span class="pill-badge" style="background:var(--warning-soft); color:var(--warning); font-weight:700;">Carrier Setup Required</span>
          </div>

          <div style="background:rgba(245, 158, 11, 0.08); border:1px solid rgba(245, 158, 11, 0.25); border-radius:var(--radius-md); padding:12px; margin-bottom:16px; font-size:0.8rem; color:#fef3c7; line-height:1.45;">
            <strong>Telephony Notice:</strong> Inbound call interception requires setting up conditional call forwarding (CFNR / busy) on your cellular SIM. Forwarding capabilities depend on carrier SIP trunking.
          </div>

          <div class="form-group">
            <label class="form-label">Dedicated Virtual Assistant Number</label>
            <div style="display:flex; gap:8px;">
              <input type="text" class="form-input" style="font-family:var(--font-mono);" value="+91 40 6812 9900" readonly>
              <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('+914068129900'); appUI.showToast('info', 'Copied', 'Virtual number copied.');">Copy</button>
            </div>
          </div>

          <div style="font-size:0.82rem; font-weight:600; color:var(--text-secondary); margin-bottom:8px;">Carrier Activation Codes (Dial from your phone):</div>
          
          <div style="display:flex; flex-direction:column; gap:8px; font-size:0.8rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:var(--bg-elevated); border-radius:var(--radius-sm);">
              <span>Jio (Forward when unanswered):</span>
              <code style="color:var(--primary); font-family:var(--font-mono);">*401*4068129900</code>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:var(--bg-elevated); border-radius:var(--radius-sm);">
              <span>Airtel / Vi (Forward all calls):</span>
              <code style="color:var(--primary); font-family:var(--font-mono);">**21*4068129900#</code>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:var(--bg-elevated); border-radius:var(--radius-sm);">
              <span>US / Global (AT&T, Verizon, T-Mobile):</span>
              <code style="color:var(--primary); font-family:var(--font-mono);">*72 4068129900</code>
            </div>
          </div>

          <div style="margin-top:16px;">
            <button class="btn btn-secondary btn-sm" style="width:100%;" onclick="settingsScreen.verifyCarrierForwarding()">
              Verify Carrier Connection
            </button>
          </div>
        </div>

        <!-- 2. Security & API Key Management -->
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <div class="card-icon" style="color:var(--primary);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div>
                <h3 class="card-title">Security & Session Authorization</h3>
                <span class="card-subtitle">Local development credentials & tokens</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Voice Session Authorization</label>
            ${appState.ownerAuthenticated ? `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--bg-elevated); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="status-indicator-dot" style="background:var(--success);"></span>
                  <div>
                    <div style="font-size:0.85rem; font-weight:600; color:var(--text-primary);">Owner Session Authenticated (HttpOnly Cookie)</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">Protected by HMAC-SHA256 token and HTTPS Secure flag.</div>
                  </div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="settingsScreen.logoutOwner()">Logout</button>
              </div>
            ` : `
              <div style="padding:12px; background:var(--bg-elevated); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                  <span class="status-indicator-dot" style="background:var(--warning);"></span>
                  <span style="font-size:0.85rem; font-weight:600; color:var(--warning);">Unauthenticated Visitor</span>
                </div>
                <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:10px;">Enter your Owner API Key to authenticate and access voice session provisioning.</p>
                <div style="display:flex; gap:8px;">
                  <input type="password" class="form-input" id="ownerApiKeyInput" placeholder="Enter OWNER_API_KEY">
                  <button class="btn btn-primary btn-sm" onclick="settingsScreen.loginOwner()">Login</button>
                </div>
              </div>
            `}
          </div>

          <div class="form-group">
            <label class="form-label">Google Gemini Live Status</label>
            <div style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:var(--bg-elevated); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
              <span class="status-indicator-dot"></span>
              <div>
                <div style="font-size:0.85rem; font-weight:600; color:var(--text-primary);">Configured in Backend Environment (.env)</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">Model: ${config.gemini_model || 'gemini-3.8-live'} &bull; Status: Verified &bull; Voice: ${config.gemini_voice_name || 'Aoede'}</div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Session Token TTL (Time-to-Live)</label>
            <input type="text" class="form-input" value="300 seconds (Single-use token with HMAC-SHA256 signature)" readonly>
          </div>
        </div>

        <!-- 3. Notification Preferences -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom:16px;">Notification Preferences</h3>

          <div class="form-group">
            <label class="switch-container">
              <div>
                <span style="font-weight:600; color:var(--text-primary);">WhatsApp Instant Message Alerts</span>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block;">Receive message summary via WhatsApp when a caller leaves details.</span>
              </div>
              <div class="switch">
                <input type="checkbox" checked>
                <span class="switch-slider"></span>
              </div>
            </label>
          </div>

          <div class="form-group">
            <label class="switch-container">
              <div>
                <span style="font-weight:600; color:var(--text-primary);">SMS Push for Urgent Inquiries</span>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block;">Deliver direct SMS for calls marked "urgent" or "high".</span>
              </div>
              <div class="switch">
                <input type="checkbox" checked>
                <span class="switch-slider"></span>
              </div>
            </label>
          </div>

          <div class="form-group">
            <label class="switch-container">
              <div>
                <span style="font-weight:600; color:var(--text-primary);">Daily Executive Call Digest Email</span>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block;">Delivered every evening at 7:00 PM IST with key takeaways.</span>
              </div>
              <div class="switch">
                <input type="checkbox" checked>
                <span class="switch-slider"></span>
              </div>
            </label>
          </div>
        </div>

        <!-- 4. Privacy & Data Retention -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom:16px;">Privacy & Data Retention</h3>

          <div class="form-group">
            <label class="form-label">Voice Recording Retention Window</label>
            <select class="form-select">
              <option value="30">Retain for 30 Days (Recommended)</option>
              <option value="90">Retain for 90 Days</option>
              <option value="0">Do Not Retain Spoken Audio (Metadata & Transcript Only)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="switch-container">
              <div>
                <span style="font-weight:600; color:var(--text-primary);">PII Redaction in Application Logs</span>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block;">Zero caller telephone numbers or transcript texts logged in standard stdout.</span>
              </div>
              <div class="switch">
                <input type="checkbox" checked disabled>
                <span class="switch-slider"></span>
              </div>
            </label>
          </div>

          <div class="form-group">
            <label class="switch-container">
              <div>
                <span style="font-weight:600; color:var(--text-primary);">Restricted File System Storage (0o600)</span>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block;">Messages saved with strict owner read/write permissions to prevent unauthorized access.</span>
              </div>
              <div class="switch">
                <input type="checkbox" checked disabled>
                <span class="switch-slider"></span>
              </div>
            </label>
          </div>
        </div>
      </div>
    `;
  }

  async loginOwner() {
    const keyInput = document.getElementById('ownerApiKeyInput');
    const key = keyInput ? keyInput.value.trim() : '';
    if (!key) {
      appUI.showToast('warning', 'API Key Required', 'Please enter your Owner API Key.');
      return;
    }
    try {
      const res = await apiClient.loginOwner(key);
      appUI.showToast('success', 'Authenticated', `Welcome, ${res.owner_name || 'Owner'}. Voice sessions unlocked.`);
      appState.ownerAuthenticated = true;
      this.render();
    } catch (err) {
      appUI.showToast('danger', 'Login Failed', err.message || 'Invalid Owner API Key.');
    }
  }

  async logoutOwner() {
    try {
      await apiClient.logoutOwner();
      appUI.showToast('info', 'Logged Out', 'Owner session cleared.');
      appState.ownerAuthenticated = false;
      this.render();
    } catch (err) {
      appUI.showToast('danger', 'Logout Failed', err.message);
    }
  }

  verifyCarrierForwarding() {
    appUI.showToast('info', 'Verifying Trunking', 'Testing carrier MMI routing status...');
    setTimeout(() => {
      appUI.showToast('warning', 'Forwarding Status', 'Carrier forwarding test: Not yet registered with cellular gateway. Use Live Voice Studio for acoustic mic testing.');
    }, 1200);
  }
}

// Global Singleton Screen Instance
const settingsScreen = new SettingsScreen();
