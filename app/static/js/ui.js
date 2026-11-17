/**
 * CallMate.ai — UI Orchestrator & Component Interactivity
 * Manages toast notifications, drawers, modals, keyboard shortcuts,
 * search filtering, and theme toggling.
 */

class AppUI {
  constructor() {
    this.selectedCallId = null;
    this.notifPopoverOpen = false;
    this.initKeyboardShortcuts();
  }

  // Toast Notification Queue
  showToast(type = 'info', title = '', message = '', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else if (type === 'warning') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    } else {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:2px;" onclick="this.parentElement.remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // Theme Toggler
  toggleTheme() {
    const nextTheme = appState.theme === 'dark' ? 'light' : 'dark';
    appState.setTheme(nextTheme);

    const sun = document.getElementById('themeIconSun');
    const moon = document.getElementById('themeIconMoon');
    if (sun && moon) {
      if (nextTheme === 'light') {
        sun.style.display = 'block';
        moon.style.display = 'none';
      } else {
        sun.style.display = 'none';
        moon.style.display = 'block';
      }
    }

    this.showToast('info', 'Theme Updated', `Switched to ${nextTheme} theme.`);
  }

  // Mobile Sidebar Drawer
  toggleSidebar() {
    const sidebar = document.getElementById('appSidebar');
    if (sidebar) {
      sidebar.classList.toggle('open');
    }
  }

  closeSidebar() {
    const sidebar = document.getElementById('appSidebar');
    if (sidebar) {
      sidebar.classList.remove('open');
    }
  }

  // Call Detail Drawer
  openCallDetail(callId) {
    const call = appState.callHistory.find(c => c.id === callId);
    if (!call) return;

    this.selectedCallId = callId;
    const drawer = document.getElementById('callDetailDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    const body = document.getElementById('drawerBody');
    const nameEl = document.getElementById('drawerCallerName');
    const metaEl = document.getElementById('drawerCallMeta');

    if (!drawer || !body) return;

    nameEl.textContent = call.caller_name;
    const timeFormatted = new Date(call.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = new Date(call.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    metaEl.textContent = `${call.phone_number} • ${dateFormatted} at ${timeFormatted} • ${call.duration_seconds}s`;

    // Status & urgency badges
    const urgencyBadge = `<span class="pill-badge" style="background:var(--${call.urgency === 'high' ? 'danger' : 'primary'}-soft); color:var(--${call.urgency === 'high' ? 'danger' : 'primary'}); font-weight:700; text-transform:uppercase;">Urgency: ${call.urgency}</span>`;
    const modeBadge = call.is_real 
      ? `<span class="pill-badge" style="background:var(--success-soft); color:var(--success); font-weight:700;">● Real Live Call</span>`
      : `<span class="pill-badge" style="background:rgba(245, 158, 11, 0.15); color:#fbbf24; font-weight:700;">[Demo Mode Preview]</span>`;

    // Build bilingual transcript bubbles
    let transcriptHtml = '';
    if (call.transcript && call.transcript.length > 0) {
      transcriptHtml = call.transcript.map(t => `
        <div class="transcript-bubble ${t.sender}">
          <div class="bubble-sender">
            <span>${t.sender === 'ai' ? '🤖 CallMate AI' : '👤 ' + call.caller_name}</span>
          </div>
          <div>${t.text}</div>
        </div>
      `).join('');
    } else {
      transcriptHtml = `<div style="font-size:0.85rem; color:var(--text-muted); font-style:italic;">No spoken transcript recorded for this turn.</div>`;
    }

    // Extracted action items
    let actionsHtml = '';
    if (call.action_items && call.action_items.length > 0) {
      actionsHtml = call.action_items.map(act => `
        <li style="margin-bottom:6px; display:flex; align-items:flex-start; gap:8px;">
          <span style="color:var(--primary); font-weight:bold;">→</span>
          <span>${act}</span>
        </li>
      `).join('');
    } else {
      actionsHtml = `<li style="color:var(--text-muted);">No follow-up actions flagged.</li>`;
    }

    body.innerHTML = `
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
        ${modeBadge}
        ${urgencyBadge}
        <span class="pill-badge">${call.language}</span>
      </div>

      <!-- AI-Generated Summary Box -->
      <div class="card" style="background:var(--bg-elevated); border:1px solid var(--border-glow); padding:16px;">
        <div style="font-size:0.75rem; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <span>AI-Generated Call Summary</span>
        </div>
        <p style="font-size:0.92rem; color:var(--text-primary); line-height:1.5;">${call.summary}</p>
      </div>

      <!-- Audio Recording Playback Simulation -->
      <div class="card" style="padding:14px; background:var(--bg-surface);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Voice Call Recording</span>
          <span style="font-size:0.75rem; font-family:var(--font-mono); color:var(--text-secondary);">0:00 / 0:${call.duration_seconds < 10 ? '0' : ''}${call.duration_seconds}</span>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn btn-secondary btn-sm" onclick="appUI.toggleRecordingPlayback(this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Play</span>
          </button>
          <div style="flex:1; height:6px; background:var(--bg-elevated); border-radius:3px; position:relative; overflow:hidden;">
            <div style="width:35%; height:100%; background:var(--primary);"></div>
          </div>
        </div>
      </div>

      <!-- Follow-up Action Items -->
      <div class="card" style="padding:16px;">
        <h4 style="font-size:0.85rem; font-weight:700; color:var(--text-primary); margin-bottom:10px;">Extracted Action Items</h4>
        <ul style="font-size:0.85rem; color:var(--text-secondary); padding-left:4px;">
          ${actionsHtml}
        </ul>
      </div>

      <!-- Complete Turn-by-Turn Bilingual Transcript -->
      <div>
        <h4 style="font-size:0.85rem; font-weight:700; color:var(--text-primary); margin-bottom:10px;">Conversation Transcript</h4>
        <div class="transcript-flow">
          ${transcriptHtml}
        </div>
      </div>
    `;

    backdrop.classList.add('open');
    drawer.classList.add('open');
  }

  closeCallDrawer() {
    const drawer = document.getElementById('callDetailDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    this.selectedCallId = null;
  }

  copyDrawerMessage() {
    const call = appState.callHistory.find(c => c.id === this.selectedCallId);
    if (!call) return;
    navigator.clipboard.writeText(`${call.caller_name} (${call.phone_number}): "${call.summary}"`);
    this.showToast('success', 'Summary Copied', 'Call summary copied to clipboard.');
  }

  initiateCallBack() {
    const call = appState.callHistory.find(c => c.id === this.selectedCallId);
    if (!call) return;
    this.showToast('info', 'Initiating Call', `Dialing ${call.caller_name} at ${call.phone_number}...`);
    window.location.href = `tel:${call.phone_number.replace(/\s+/g, '')}`;
  }

  toggleRecordingPlayback(btn) {
    const span = btn.querySelector('span');
    if (span.textContent === 'Play') {
      span.textContent = 'Pause';
      this.showToast('info', 'Playing Audio', 'Simulated acoustic playback active.');
    } else {
      span.textContent = 'Play';
    }
  }

  // Generic Modal Manager
  openGenericModal(title, bodyHtml, footerHtml = '') {
    const backdrop = document.getElementById('genericModalBackdrop');
    const titleEl = document.getElementById('genericModalTitle');
    const bodyEl = document.getElementById('genericModalBody');
    const footerEl = document.getElementById('genericModalFooter');

    if (!backdrop || !bodyEl) return;

    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml;
    footerEl.innerHTML = footerHtml || `<button class="btn btn-secondary" onclick="appUI.closeGenericModal()">Close</button>`;

    backdrop.classList.add('open');
  }

  closeGenericModal() {
    const backdrop = document.getElementById('genericModalBackdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  // Keyboard Shortcuts Modal
  openShortcutsModal() {
    const html = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-subtle);">
          <span style="font-size:0.88rem; color:var(--text-primary);">Focus Global Search</span>
          <kbd style="font-family:var(--font-mono); background:var(--bg-elevated); padding:3px 8px; border-radius:4px; border:1px solid var(--border-subtle); font-size:0.75rem;">⌘K / Ctrl+K</kbd>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-subtle);">
          <span style="font-size:0.88rem; color:var(--text-primary);">Open Live Voice Studio</span>
          <kbd style="font-family:var(--font-mono); background:var(--bg-elevated); padding:3px 8px; border-radius:4px; border:1px solid var(--border-subtle); font-size:0.75rem;">Alt+V</kbd>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-subtle);">
          <span style="font-size:0.88rem; color:var(--text-primary);">Open Onboarding Guide</span>
          <kbd style="font-family:var(--font-mono); background:var(--bg-elevated); padding:3px 8px; border-radius:4px; border:1px solid var(--border-subtle); font-size:0.75rem;">Alt+O</kbd>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-subtle);">
          <span style="font-size:0.88rem; color:var(--text-primary);">Toggle Dark / Light Theme</span>
          <kbd style="font-family:var(--font-mono); background:var(--bg-elevated); padding:3px 8px; border-radius:4px; border:1px solid var(--border-subtle); font-size:0.75rem;">Alt+T</kbd>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0;">
          <span style="font-size:0.88rem; color:var(--text-primary);">Close Drawer / Modal</span>
          <kbd style="font-family:var(--font-mono); background:var(--bg-elevated); padding:3px 8px; border-radius:4px; border:1px solid var(--border-subtle); font-size:0.75rem;">Esc</kbd>
        </div>
      </div>
    `;
    this.openGenericModal('Keyboard Shortcuts', html);
  }

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // ⌘K or Ctrl+K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('globalSearchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      // Alt+V for voice studio
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        appState.navigateTo('live-calls');
      }
      // Alt+T for theme toggle
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        this.toggleTheme();
      }
      // Alt+O for onboarding
      if (e.altKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        onboardingWizard.openWizard();
      }
      // Escape closes open modals and drawers
      if (e.key === 'Escape') {
        this.closeCallDrawer();
        this.closeGenericModal();
        onboardingWizard.closeWizard();
        this.closeSidebar();
      }
      // ? opens shortcuts
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        this.openShortcutsModal();
      }
    });
  }

  // Global Search Filter
  handleGlobalSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Return to active screen render
      appMain.renderActiveScreen();
      return;
    }

    // Filter calls, contacts, and knowledge
    const matchedCalls = appState.callHistory.filter(c => 
      c.caller_name.toLowerCase().includes(q) ||
      c.phone_number.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q)
    );

    const matchedContacts = appState.contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.custom_instructions.toLowerCase().includes(q)
    );

    const matchedKB = appState.knowledgeBase.filter(k =>
      k.title.toLowerCase().includes(q) ||
      k.content.toLowerCase().includes(q)
    );

    const activeContainer = document.querySelector('.screen-container.active');
    if (!activeContainer) return;

    activeContainer.innerHTML = `
      <div style="margin-bottom:20px;">
        <h2 style="font-size:1.3rem; font-weight:800; color:var(--text-primary); margin-bottom:4px;">Search Results for "${query}"</h2>
        <p style="font-size:0.85rem; color:var(--text-muted);">Found ${matchedCalls.length} calls, ${matchedContacts.length} contacts, and ${matchedKB.length} knowledge items.</p>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 class="card-title" style="margin-bottom:12px;">Calls & Messages (${matchedCalls.length})</h3>
          ${matchedCalls.length === 0 ? '<p style="color:var(--text-muted); font-size:0.85rem;">No matching calls found.</p>' : `
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${matchedCalls.map(c => `
                <div class="card" style="padding:10px 14px; background:var(--bg-elevated); cursor:pointer;" onclick="appUI.openCallDetail('${c.id}')">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:var(--text-primary); font-size:0.88rem;">${c.caller_name}</strong>
                    <span style="font-size:0.75rem; color:var(--text-muted);">${c.phone_number}</span>
                  </div>
                  <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">${c.summary}</p>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div class="card">
          <h3 class="card-title" style="margin-bottom:12px;">Contacts (${matchedContacts.length})</h3>
          ${matchedContacts.length === 0 ? '<p style="color:var(--text-muted); font-size:0.85rem;">No matching contacts found.</p>' : `
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${matchedContacts.map(c => `
                <div class="card" style="padding:10px 14px; background:var(--bg-elevated); cursor:pointer;" onclick="appState.navigateTo('contacts')">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:var(--text-primary); font-size:0.88rem;">${c.name}</strong>
                    <span class="pill-badge">${c.priority.toUpperCase()}</span>
                  </div>
                  <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">${c.custom_instructions}</p>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // Notifications Popover Dropdown
  toggleNotificationsPopover() {
    this.notifPopoverOpen = !this.notifPopoverOpen;
    const btn = document.getElementById('notifBellBtn');
    let popover = document.getElementById('notifPopover');

    if (!this.notifPopoverOpen) {
      if (popover) popover.remove();
      return;
    }

    popover = document.createElement('div');
    popover.id = 'notifPopover';
    popover.className = 'card';
    popover.style.cssText = `
      position: absolute;
      top: 68px;
      right: 24px;
      width: 360px;
      max-height: 480px;
      overflow-y: auto;
      z-index: 100;
      box-shadow: var(--shadow-xl);
      padding: 16px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-card);
    `;

    const realMsgs = appState.realMessages || [];
    let itemsHtml = '';
    if (realMsgs.length > 0) {
      itemsHtml = realMsgs.map(m => `
        <div style="padding:10px; border-bottom:1px solid var(--border-subtle); cursor:pointer;" onclick="appUI.openCallDetail('${m.message_id}'); document.getElementById('notifPopover')?.remove(); appUI.notifPopoverOpen = false;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="font-size:0.85rem; color:var(--text-primary);">${m.caller_name}</strong>
            <span class="pill-badge" style="font-size:0.68rem; background:var(--primary-soft); color:var(--primary);">${m.urgency}</span>
          </div>
          <p style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4;">"${m.message}"</p>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">Recorded ${new Date(m.recorded_at).toLocaleTimeString()}</div>
        </div>
      `).join('');
    } else {
      itemsHtml = `<p style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:20px 0;">No new caller messages recorded yet.</p>`;
    }

    popover.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border-subtle); padding-bottom:8px;">
        <span style="font-size:0.88rem; font-weight:700; color:var(--text-primary);">Caller Messages (${realMsgs.length})</span>
        <button style="background:transparent; border:none; color:var(--text-muted); font-size:0.75rem; cursor:pointer;" onclick="this.closest('#notifPopover').remove(); appUI.notifPopoverOpen = false;">Close</button>
      </div>
      <div style="display:flex; flex-direction:column;">
        ${itemsHtml}
      </div>
    `;

    document.body.appendChild(popover);
  }

  // Count-up KPI animations when genuine values are loaded (Section 4)
  animateCountUp(element, endVal, durationMs = 600, suffix = '') {
    if (!element) return;
    const end = parseFloat(endVal);
    if (isNaN(end)) {
      element.textContent = endVal + suffix;
      return;
    }

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      element.textContent = (Number.isInteger(end) ? end : end.toFixed(1)) + suffix;
      return;
    }

    const start = 0;
    const startTime = performance.now();
    const isInt = Number.isInteger(end);

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const ease = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      const current = start + (end - start) * ease;
      element.textContent = (isInt ? Math.round(current) : current.toFixed(1)) + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        element.textContent = (isInt ? end : end.toFixed(1)) + suffix;
      }
    };

    requestAnimationFrame(step);
  }

  // Floating Incoming Call Notification (Section 6)
  showIncomingCallNotification(options = {}) {
    const {
      caller_name = 'Unknown Caller',
      phone_number = '+91 00000 00000',
      language = 'English + Telugu',
      urgency = 'normal',
      onAnswer = null,
      onDecline = null
    } = options;

    const container = document.getElementById('incomingCallContainer');
    if (!container) return;

    this.dismissIncomingCallNotification();

    const banner = document.createElement('div');
    banner.className = 'incoming-call-card';
    banner.id = 'activeIncomingCallCard';

    banner.innerHTML = `
      <div class="incoming-call-pulse-glow"></div>
      <div style="display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:2;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="caller-avatar" style="width:42px; height:42px; font-size:1rem; background:var(--color-surface-2); border-color:var(--color-brand-primary);">
            ${caller_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '📞'}
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <h4 style="font-size:0.98rem; font-weight:700; color:var(--color-text-primary); margin:0;">${caller_name}</h4>
              <span class="status-indicator-dot" style="background:var(--color-brand-audio-cyan);"></span>
            </div>
            <div style="font-size:0.8rem; color:var(--color-text-muted); font-family:var(--font-mono); margin-top:2px;">
              ${phone_number}
            </div>
          </div>
        </div>
        <span class="pill-badge" style="background:var(--color-state-info-subtle); color:var(--color-brand-primary); font-size:0.7rem; font-weight:700;">
          INCOMING CALL
        </span>
      </div>

      <div style="display:flex; align-items:center; gap:8px; font-size:0.75rem; color:var(--color-text-secondary); position:relative; z-index:2;">
        <span>🗣️ Spoken Language: <strong>${language}</strong></span>
        ${urgency === 'high' ? '<span class="pill-badge" style="background:var(--color-state-error-subtle); color:var(--color-state-error);">VIP HIGH</span>' : ''}
      </div>

      <div style="display:flex; gap:10px; margin-top:4px; position:relative; z-index:2;">
        <button class="btn btn-success btn-sm" id="btnAnswerIncomingCall" style="flex:1;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <span>Answer / Screen</span>
        </button>
        <button class="btn btn-secondary btn-sm" id="btnDeclineIncomingCall" style="flex:1;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <span>Decline</span>
        </button>
      </div>
    `;

    container.appendChild(banner);

    const btnAnswer = banner.querySelector('#btnAnswerIncomingCall');
    const btnDecline = banner.querySelector('#btnDeclineIncomingCall');

    if (btnAnswer) {
      btnAnswer.onclick = () => {
        this.dismissIncomingCallNotification();
        if (onAnswer) onAnswer();
      };
    }

    if (btnDecline) {
      btnDecline.onclick = () => {
        this.dismissIncomingCallNotification();
        if (onDecline) onDecline();
      };
    }
  }

  dismissIncomingCallNotification() {
    const banner = document.getElementById('activeIncomingCallCard');
    if (!banner) return;
    banner.classList.add('dismissing');
    setTimeout(() => {
      banner.remove();
    }, 220);
  }
}

// Global Singleton UI Manager
const appUI = new AppUI();
