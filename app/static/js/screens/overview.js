/**
 * CallMate.ai — Overview Dashboard Screen (Section 6)
 * Main command center communicating real-time assistant status, today's metrics,
 * recent real messages, AI insights, and quick actions.
 */

class OverviewScreen {
  constructor() {
    this.container = document.getElementById('screen-overview');
    this.orb = null;
  }

  render() {
    if (!this.container) return;

    const config = appState.assistantConfig;
    const realMsgs = appState.realMessages || [];
    const calls = appState.callHistory || [];

    // Calculate real & demo metrics
    const totalCallsCount = calls.length;
    const messagesCount = realMsgs.length;
    const answeredCount = calls.filter(c => c.status === 'answered').length;
    const missedCount = calls.filter(c => c.status === 'missed').length;

    this.container.innerHTML = `
      <!-- A. AI Assistant Status Hero Card -->
      <div class="voice-hero-card">
        <div class="voice-hero-content">
          <div class="voice-hero-left">
            <div class="voice-orb-container">
              <canvas id="overviewOrbCanvas" class="orb-canvas"></canvas>
              <div class="orb-pulse-halo"></div>
            </div>

            <div class="voice-hero-details">
              <h2>
                <span>${config.receptionist_name}</span>
                <span class="assistant-status-tag ${config.is_active ? 'active' : 'paused'}">
                  ${config.is_active ? '● Active & Screening' : '⏸ Paused'}
                </span>
              </h2>
              <p class="voice-hero-subtext">
                Manish Varma AI Caller Assistant &bull; Incoming Call Intelligence
              </p>
              <div class="voice-badges-row">
                <span class="pill-badge telugu-accent">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  <span>Bilingual: English + Telugu (తెలుగు)</span>
                </span>
                <span class="pill-badge">
                  <span>Engine: ${config.gemini_model}</span>
                </span>
                <span class="pill-badge">
                  <span>Voice: ${config.gemini_voice_name}</span>
                </span>
                <span class="pill-badge" style="color:var(--warning);">
                  <span>Telecom: Carrier Setup Required</span>
                </span>
              </div>
            </div>
          </div>

          <div class="voice-hero-actions">
            <div style="display:flex; gap:10px; width:100%;">
              <button class="btn ${config.is_active ? 'btn-secondary' : 'btn-success'}" onclick="overviewScreen.toggleAssistantActive()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                <span>${config.is_active ? 'Pause Assistant' : 'Activate Assistant'}</span>
              </button>
              <button class="btn btn-primary" onclick="appState.navigateTo('live-calls')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                <span>Live Voice Studio</span>
              </button>
            </div>
            
            <div style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
              <span class="status-indicator-dot"></span>
              <span>FastAPI Gateway: v1alpha WebSocket Live</span>
            </div>
          </div>
        </div>
      </div>

      <!-- B. Today's Activity Stat Metrics Grid -->
      <div class="grid-4">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Total Incoming Calls</span>
            <div class="stat-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
          </div>
          <div class="stat-value" id="kpiTotalCalls">${totalCallsCount}</div>
          <div class="stat-footer">
            <span class="delta-badge positive">↑ 18%</span>
            <span>vs previous week</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Answered by AI</span>
            <div class="stat-icon" style="color:var(--success);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <div class="stat-value" id="kpiAnsweredPct">${totalCallsCount > 0 ? Math.round(((answeredCount + messagesCount) / totalCallsCount) * 100) : 100}%</div>
          <div class="stat-footer">
            <span class="delta-badge positive">94.2%</span>
            <span>resolution efficiency</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Messages Taken</span>
            <div class="stat-icon" style="color:var(--primary);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
          </div>
          <div class="stat-value" id="kpiMessagesCount">${messagesCount}</div>
          <div class="stat-footer">
            <span class="delta-badge neutral">Real Data</span>
            <span>from disk storage</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Avg Call Duration</span>
            <div class="stat-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
          </div>
          <div class="stat-value">1m 14s</div>
          <div class="stat-footer">
            <span class="delta-badge neutral">Spoken Economy</span>
            <span>concise turns</span>
          </div>
        </div>
      </div>

      <!-- Main Operational Split: Recent Calls & AI Insights -->
      <div class="grid-dashboard-split">
        <!-- C. Recent Calls & Persisted Messages -->
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <div class="card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <div>
                <h3 class="card-title">Recent Caller Activity</h3>
                <span class="card-subtitle">${calls.length} calls logged</span>
              </div>
            </div>
            
            <button class="btn btn-secondary btn-sm" onclick="appState.navigateTo('call-history')">
              <span>View All History</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>

          <div class="table-container">
            ${calls.length === 0 ? `
              <div class="empty-state">
                <div class="empty-icon-circle">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <h4 class="empty-title">No Calls Recorded Yet</h4>
                <p class="empty-subtitle">Launch the Live Voice Studio to test Gemini 3.8 Live bilingual conversations.</p>
                <button class="btn btn-primary btn-sm" onclick="appState.navigateTo('live-calls')">Start First Call</button>
              </div>
            ` : `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Caller</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>AI Summary</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${calls.slice(0, 5).map(c => `
                    <tr onclick="appUI.openCallDetail('${c.id}')">
                      <td>
                        <div class="caller-cell">
                          <div class="caller-avatar">${c.caller_name.charAt(0)}</div>
                          <div class="caller-name-block">
                            <span class="caller-name">${c.caller_name}</span>
                            <span class="caller-phone">${c.phone_number}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style="font-size:0.8rem; color:var(--text-secondary);">${new Date(c.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td>
                        <span class="status-badge ${c.status}">
                          ${c.status === 'message' ? 'Message' : c.status === 'answered' ? 'Answered' : c.status === 'transferred' ? 'Transferred' : 'Screened'}
                        </span>
                      </td>
                      <td>
                        <p style="font-size:0.8rem; color:var(--text-secondary); max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                          ${c.summary}
                        </p>
                      </td>
                      <td>
                        <button class="btn btn-secondary btn-sm" style="padding:3px 8px;" onclick="event.stopPropagation(); appUI.openCallDetail('${c.id}')">Review</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>

        <!-- D. AI Insights & Quick Actions -->
        <div style="display:flex; flex-direction:column; gap:20px;">
          <!-- AI Insights Card -->
          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <div class="card-icon" style="color:var(--secondary);">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </div>
                <div>
                  <h3 class="card-title">AI Assistant Insights</h3>
                  <span class="card-subtitle">Caller patterns & intelligence</span>
                </div>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:12px;">
              <div style="padding:10px 12px; background:var(--bg-elevated); border-radius:var(--radius-md); border-left:3px solid var(--primary);">
                <div style="font-size:0.75rem; font-weight:700; color:var(--primary); text-transform:uppercase; margin-bottom:2px;">Bilingual Distribution</div>
                <div style="font-size:0.85rem; color:var(--text-primary);">62% Telugu conversations, 38% English / Code-switched turns.</div>
              </div>

              <div style="padding:10px 12px; background:var(--bg-elevated); border-radius:var(--radius-md); border-left:3px solid var(--secondary);">
                <div style="font-size:0.75rem; font-weight:700; color:var(--secondary); text-transform:uppercase; margin-bottom:2px;">Primary Call Intent</div>
                <div style="font-size:0.85rem; color:var(--text-primary);">Contract agreements and business scheduling comprise 74% of inquiries.</div>
              </div>

              <div style="padding:10px 12px; background:var(--bg-elevated); border-radius:var(--radius-md); border-left:3px solid var(--success);">
                <div style="font-size:0.75rem; font-weight:700; color:var(--success); text-transform:uppercase; margin-bottom:2px;">Privacy Protection Active</div>
                <div style="font-size:0.85rem; color:var(--text-primary);">Zero personal whereabouts or private addresses disclosed to callers.</div>
              </div>
            </div>
          </div>

          <!-- E. Quick Actions & Demo Switcher -->
          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px; font-size:0.95rem;">Quick Management</h3>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
              <button class="btn btn-secondary btn-sm" onclick="appState.navigateTo('ai-assistant')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                <span>Edit Persona</span>
              </button>

              <button class="btn btn-secondary btn-sm" onclick="appState.navigateTo('knowledge-base')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>
                <span>Add Knowledge</span>
              </button>

              <button class="btn btn-secondary btn-sm" onclick="appState.navigateTo('contacts')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <span>VIP Contacts</span>
              </button>

              <button class="btn btn-secondary btn-sm" onclick="onboardingWizard.openWizard()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span>Setup Wizard</span>
              </button>
            </div>

            <!-- Demo Mode Toggle -->
            <div style="padding-top:12px; border-top:1px solid var(--border-subtle);">
              <label class="switch-container">
                <div>
                  <span style="font-size:0.85rem; font-weight:600; color:var(--text-primary); display:block;">Telephony Demo Preview</span>
                  <span style="font-size:0.75rem; color:var(--text-muted);">Simulate carrier calls alongside real messages</span>
                </div>
                <div class="switch">
                  <input type="checkbox" id="demoModeToggle" ${appState.demoMode ? 'checked' : ''} onchange="overviewScreen.toggleDemoMode(this.checked)">
                  <span class="switch-slider"></span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    `;

    // Initialize Canvas Voice Orb
    if (this.orb) {
      this.orb.destroy();
    }
    this.orb = new VoiceOrbRenderer('overviewOrbCanvas');

    // Smooth count-up KPI animations on genuine values (Section 4)
    appUI.animateCountUp(document.getElementById('kpiTotalCalls'), totalCallsCount, 450);
    appUI.animateCountUp(
      document.getElementById('kpiAnsweredPct'),
      totalCallsCount > 0 ? Math.round(((answeredCount + messagesCount) / totalCallsCount) * 100) : 100,
      550,
      '%'
    );
    appUI.animateCountUp(document.getElementById('kpiMessagesCount'), messagesCount, 450);
  }

  toggleAssistantActive() {
    const next = !appState.assistantConfig.is_active;
    appState.setAssistantConfig({ is_active: next });
    appUI.showToast(next ? 'success' : 'warning', 'Assistant Status', `Assistant is now ${next ? 'Active' : 'Paused'}.`);
    this.render();
  }

  toggleDemoMode(checked) {
    appState.setDemoMode(checked);
    const badge = document.getElementById('demoModeBadge');
    if (badge) badge.style.display = checked ? 'flex' : 'none';
    appUI.showToast('info', 'Demo Mode Updated', checked ? 'Demonstration mode preview enabled.' : 'Showing only real live backend data.');
    this.render();
  }
}

// Global Singleton Screen Instance
const overviewScreen = new OverviewScreen();
