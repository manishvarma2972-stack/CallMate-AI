/**
 * CallMate.ai — AI Assistant Configuration Screen (Section 8)
 * Configures identity, bilingual Telugu settings, Gemini voice personas with
 * interactive previews, conversation behavior, and screening rules.
 */

class AIAssistantScreen {
  constructor() {
    this.container = document.getElementById('screen-ai-assistant');
    this.activeTab = 'identity'; // 'identity', 'languages', 'voice', 'behavior', 'rules'
  }

  render() {
    if (!this.container) return;

    const config = appState.assistantConfig;

    this.container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-primary); letter-spacing:-0.02em;">Manish Varma AI Caller Assistant Customization</h2>
          <p style="font-size:0.85rem; color:var(--text-muted);">Configure how your AI Caller Assistant introduces itself, speaks, screens callers, and protects privacy</p>
        </div>

        <button class="btn btn-primary" onclick="aiAssistantScreen.saveConfiguration()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>Save Changes</span>
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div style="display:flex; gap:6px; background:var(--bg-surface); padding:4px; border-radius:var(--radius-lg); border:1px solid var(--border-subtle); margin-bottom:20px; overflow-x:auto;">
        <button class="btn btn-sm ${this.activeTab === 'identity' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="aiAssistantScreen.setTab('identity')">
          <span>Identity & Persona</span>
        </button>
        <button class="btn btn-sm ${this.activeTab === 'languages' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="aiAssistantScreen.setTab('languages')">
          <span>Language (Telugu & EN)</span>
        </button>
        <button class="btn btn-sm ${this.activeTab === 'voice' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="aiAssistantScreen.setTab('voice')">
          <span>Voice Personas</span>
        </button>
        <button class="btn btn-sm ${this.activeTab === 'behavior' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="aiAssistantScreen.setTab('behavior')">
          <span>Behavior & Privacy</span>
        </button>
        <button class="btn btn-sm ${this.activeTab === 'rules' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="aiAssistantScreen.setTab('rules')">
          <span>Screening Rules</span>
        </button>
      </div>

      <!-- Tab Viewports -->
      <div id="aiTabContent">
        ${this.renderActiveTabContent(config)}
      </div>
    `;
  }

  setTab(tab) {
    this.activeTab = tab;
    this.render();
  }

  renderActiveTabContent(config) {
    if (this.activeTab === 'identity') {
      return `
        <div class="card">
          <h3 class="card-title" style="margin-bottom:16px;">Assistant Identity & Persona</h3>
          
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Assistant Display Name</label>
              <input type="text" class="form-input" id="cfgAssistantName" value="${config.receptionist_name}">
              <p class="form-hint">The name callers hear when CallMate introduces itself.</p>
            </div>

            <div class="form-group">
              <label class="form-label">Owner Display Name</label>
              <input type="text" class="form-input" id="cfgOwnerName" value="${config.owner_name}">
              <p class="form-hint">The executive/person on whose behalf the AI answers calls.</p>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Communication Persona & Tone</label>
            <select class="form-select" id="cfgCommunicationStyle">
              <option value="polite_executive" selected>Polite & Professional Executive Concierge (Recommended)</option>
              <option value="warm_friendly">Warm, Helpful & Friendly</option>
              <option value="concise_direct">Concise, Direct & Fast</option>
              <option value="corporate_gatekeeper">Strict Corporate Gatekeeper</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Spoken English Greeting</label>
            <input type="text" class="form-input" id="cfgGreetingEn" value="Hello! I'm Manish Varma's AI caller assistant. How can I help you?">
          </div>

          <div class="form-group">
            <label class="form-label">Spoken Telugu Greeting (తెలుగు స్వాగతం)</label>
            <input type="text" class="form-input" id="cfgGreetingTe" value="నమస్కారం అండి, నేను మనీష్ వర్మ గారి ఏఐ కాలర్ అసిస్టెంట్ ని. ఆయన ప్రస్తుతం అందుబాటులో లేరు. మీ పేరు మరియు కాల్ ఉద్దేశం చెప్పగలరా?">
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'languages') {
      return `
        <div class="card">
          <h3 class="card-title" style="margin-bottom:16px;">Multilingual & Code-Switching Settings</h3>

          <div class="form-group">
            <label class="form-label">Default Language Mode</label>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-top:8px;">
              <label class="card" style="padding:14px; cursor:pointer; background:var(--primary-soft); border-color:var(--primary);">
                <input type="radio" name="langMode" value="bilingual_auto" checked style="margin-right:8px;">
                <strong style="color:var(--text-primary); display:block; margin-bottom:2px;">Bilingual Auto-Detect (EN + తెలుగు)</strong>
                <span style="font-size:0.75rem; color:var(--text-secondary);">Seamlessly switches between English and Telugu based on caller speech.</span>
              </label>

              <label class="card" style="padding:14px; cursor:pointer;">
                <input type="radio" name="langMode" value="en" style="margin-right:8px;">
                <strong style="color:var(--text-primary); display:block; margin-bottom:2px;">English Only</strong>
                <span style="font-size:0.75rem; color:var(--text-secondary);">Always greets and converses exclusively in English.</span>
              </label>

              <label class="card" style="padding:14px; cursor:pointer;">
                <input type="radio" name="langMode" value="te" style="margin-right:8px;">
                <strong style="color:var(--text-primary); display:block; margin-bottom:2px;">Telugu Only (తెలుగు మాత్రమే)</strong>
                <span style="font-size:0.75rem; color:var(--text-secondary);">Prioritizes fluent and polite Telugu honorifics.</span>
              </label>
            </div>
          </div>

          <div class="form-group" style="margin-top:20px;">
            <label class="switch-container">
              <div>
                <span style="font-weight:600; color:var(--text-primary);">Support Telugu-English Mixed Conversations (Code-Switching)</span>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block;">Handles mixed sentences like "Meeting cancel ayyindi, repu call cheyamani cheppandi" naturally.</span>
              </div>
              <div class="switch">
                <input type="checkbox" checked id="cfgCodeSwitching">
                <span class="switch-slider"></span>
              </div>
            </label>
          </div>

          <div class="form-group" style="margin-top:16px;">
            <label class="switch-container">
              <div>
                <span style="font-weight:600; color:var(--text-primary);">Telugu Honorifics Enforcement ("గారు" / "అండి")</span>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block;">Ensures culturally respectful address when interacting with elders or business callers.</span>
              </div>
              <div class="switch">
                <input type="checkbox" checked id="cfgHonorifics">
                <span class="switch-slider"></span>
              </div>
            </label>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'voice') {
      const personas = [
        { name: 'Aoede', desc: 'Warm soprano, elegant and professional (Default)', gender: 'Female' },
        { name: 'Kore', desc: 'Calm, gentle, clear and empathetic tone', gender: 'Female' },
        { name: 'Puck', desc: 'Energetic, crisp, upbeat cadence', gender: 'Male' },
        { name: 'Charon', desc: 'Deep, resonant, authoritative baritone', gender: 'Male' },
        { name: 'Fenrir', desc: 'Steadfast, low-frequency, calm executive', gender: 'Male' }
      ];

      return `
        <div class="card">
          <h3 class="card-title" style="margin-bottom:16px;">Gemini 3.8 Live Voice Personas</h3>
          
          <div class="persona-selector-grid">
            ${personas.map(p => `
              <div class="persona-card ${config.gemini_voice_name === p.name ? 'selected' : ''}" onclick="aiAssistantScreen.selectVoicePersona('${p.name}')">
                <div class="persona-name">${p.name}</div>
                <div style="font-size:0.72rem; color:var(--primary); font-weight:600; margin-bottom:4px;">${p.gender}</div>
                <div class="persona-desc">${p.desc}</div>
                <button class="btn btn-secondary btn-sm" style="margin-top:8px; width:100%; font-size:0.72rem;" onclick="event.stopPropagation(); aiAssistantScreen.auditionVoice('${p.name}')">
                  Audition
                </button>
              </div>
            `).join('')}
          </div>

          <div class="form-group" style="margin-top:24px;">
            <label class="form-label">Voice Speaking Temperature: <span id="tempValue" style="color:var(--primary); font-family:var(--font-mono);">${config.gemini_temperature}</span></label>
            <input type="range" min="0.1" max="1.0" step="0.05" value="${config.gemini_temperature}" style="width:100%; accent-color:var(--primary);" oninput="document.getElementById('tempValue').textContent = this.value">
            <p class="form-hint">Controls expressive variability in spoken responses (0.6 is optimal for natural pacing).</p>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'behavior') {
      return `
        <div class="card">
          <h3 class="card-title" style="margin-bottom:16px;">Conversation Behavior & Privacy Boundaries</h3>

          <div class="form-group">
            <label class="form-label">Strict Confidentiality Rules (Never Disclose)</label>
            <textarea class="form-textarea" id="cfgConfidentiality">1. Never disclose Manish Varma's private schedule, physical location, home address, or personal cell phone number.
2. If asked where he is, politely reply that you do not have access to his personal whereabouts and offer to record a message.
3. Spoken economy rule: Keep all voice answers to at most 1 to 2 direct sentences.</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Required Information Gathering</label>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-secondary);">
                <input type="checkbox" checked disabled> Caller Full Name (Required before taking message)
              </label>
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-secondary);">
                <input type="checkbox" checked disabled> Purpose of Call (Required)
              </label>
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-secondary);">
                <input type="checkbox" checked> Callback Telephone Number
              </label>
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-secondary);">
                <input type="checkbox" checked> Urgency Assessment (low, medium, high, urgent)
              </label>
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'rules') {
      return `
        <div class="card">
          <h3 class="card-title" style="margin-bottom:16px;">Call Screening & Escalation Rules</h3>

          <div class="form-group">
            <label class="form-label">Incoming Call Screening Policy</label>
            <select class="form-select" id="cfgScreeningPolicy">
              <option value="screen_all" selected>Screen All Calls (AI answers every call)</option>
              <option value="vip_pass">Direct Pass for VIPs (Ring owner phone for VIP contacts)</option>
              <option value="unknown_only">Screen Unknown & Telemarketer Numbers Only</option>
            </select>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Business Hours Start</label>
              <input type="time" class="form-input" value="09:00">
            </div>

            <div class="form-group">
              <label class="form-label">Business Hours End</label>
              <input type="time" class="form-input" value="18:30">
            </div>
          </div>

          <div class="form-group">
            <label class="switch-container">
              <div>
                <span style="font-weight:600; color:var(--text-primary);">Emergency Escalation Keywords</span>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block;">If caller says "medical emergency", "urgent hospital", or "immediate crisis", attempt transfer.</span>
              </div>
              <div class="switch">
                <input type="checkbox" checked id="cfgEmergency">
                <span class="switch-slider"></span>
              </div>
            </label>
          </div>
        </div>
      `;
    }

    return '';
  }

  selectVoicePersona(personaName) {
    appState.setAssistantConfig({ gemini_voice_name: personaName });
    appUI.showToast('info', 'Voice Selected', `Selected Gemini Live persona: ${personaName}`);
    this.render();
  }

  auditionVoice(personaName) {
    appUI.showToast('info', 'Voice Audition', `Playing audio sample of ${personaName}...`);
    // Synthetic audio beep / speech demo
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  }

  saveConfiguration() {
    const nameEl = document.getElementById('cfgAssistantName');
    const ownerEl = document.getElementById('cfgOwnerName');

    const updates = {};
    if (nameEl) updates.receptionist_name = nameEl.value.trim();
    if (ownerEl) updates.owner_name = ownerEl.value.trim();

    appState.setAssistantConfig(updates);
    appUI.showToast('success', 'Changes Saved', 'AI assistant configuration successfully persisted.');
  }
}

// Global Singleton Screen Instance
const aiAssistantScreen = new AIAssistantScreen();
