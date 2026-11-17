/**
 * CallMate.ai — Call History Screen (Section 10)
 * Search, multi-criteria filtering, comprehensive call records, and detailed
 * turn-by-turn bilingual transcript inspections.
 */

class CallHistoryScreen {
  constructor() {
    this.container = document.getElementById('screen-call-history');
    this.filterStatus = 'all';
    this.searchQuery = '';
  }

  render() {
    if (!this.container) return;

    let calls = [...appState.callHistory];

    // Filter by status
    if (this.filterStatus !== 'all') {
      calls = calls.filter(c => c.status === this.filterStatus);
    }

    // Filter by search query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      calls = calls.filter(c => 
        c.caller_name.toLowerCase().includes(q) ||
        c.phone_number.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q)
      );
    }

    this.container.innerHTML = `
      <!-- Header with Filter Controls -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-primary); letter-spacing:-0.02em;">Call History & Recordings</h2>
          <p style="font-size:0.85rem; color:var(--text-muted);">Inspect bilingual call transcripts, audio logs, and extracted action items</p>
        </div>

        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <!-- Filter Buttons -->
          <div style="display:flex; background:var(--bg-surface); padding:3px; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <button class="btn btn-sm ${this.filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="callHistoryScreen.setFilter('all')">All</button>
            <button class="btn btn-sm ${this.filterStatus === 'message' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="callHistoryScreen.setFilter('message')">Messages</button>
            <button class="btn btn-sm ${this.filterStatus === 'answered' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="callHistoryScreen.setFilter('answered')">Answered</button>
            <button class="btn btn-sm ${this.filterStatus === 'transferred' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="callHistoryScreen.setFilter('transferred')">Transferred</button>
            <button class="btn btn-sm ${this.filterStatus === 'missed' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="callHistoryScreen.setFilter('missed')">Screened</button>
          </div>

          <button class="btn btn-secondary btn-sm" onclick="callHistoryScreen.refreshHistory()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Main History Table -->
      <div class="card">
        <div class="table-container">
          ${calls.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h4 class="empty-title">No Call Records Found</h4>
              <p class="empty-subtitle">No calls match the current status filter. Toggle Demo Mode or launch a live voice test.</p>
            </div>
          ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Caller</th>
                  <th>Date & Time</th>
                  <th>Duration</th>
                  <th>Language</th>
                  <th>Status</th>
                  <th>AI Summary</th>
                  <th>Urgency</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${calls.map(c => `
                  <tr onclick="appUI.openCallDetail('${c.id}')">
                    <td>
                      <div class="caller-cell">
                        <div class="caller-avatar" style="background:${c.is_real ? 'var(--primary-soft)' : 'var(--bg-elevated)'}; color:${c.is_real ? 'var(--primary)' : 'var(--text-secondary)'};">
                          ${c.caller_name.charAt(0)}
                        </div>
                        <div class="caller-name-block">
                          <span class="caller-name">${c.caller_name}</span>
                          <span class="caller-phone">${c.phone_number}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style="font-size:0.8rem; color:var(--text-secondary);">
                        ${new Date(c.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${new Date(c.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td>
                      <span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--text-muted);">${c.duration_seconds}s</span>
                    </td>
                    <td>
                      <span class="pill-badge" style="font-size:0.72rem;">${c.language.includes('Telugu') ? 'తెలుగు / EN' : 'English'}</span>
                    </td>
                    <td>
                      <span class="status-badge ${c.status}">
                        ${c.status === 'message' ? 'Message' : c.status === 'answered' ? 'Answered' : c.status === 'transferred' ? 'Transferred' : 'Screened'}
                      </span>
                    </td>
                    <td>
                      <p style="font-size:0.82rem; color:var(--text-secondary); max-width:280px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${c.summary}
                      </p>
                    </td>
                    <td>
                      <span class="pill-badge" style="background:var(--${c.urgency === 'high' ? 'danger' : 'primary'}-soft); color:var(--${c.urgency === 'high' ? 'danger' : 'primary'}); font-size:0.7rem; font-weight:700; text-transform:uppercase;">
                        ${c.urgency}
                      </span>
                    </td>
                    <td>
                      <div style="display:flex; gap:6px;" onclick="event.stopPropagation();">
                        <button class="btn btn-secondary btn-sm" style="padding:4px 8px;" onclick="appUI.openCallDetail('${c.id}')">View</button>
                        ${c.is_real ? `
                          <button class="btn btn-danger btn-sm" style="padding:4px 8px;" title="Delete Message from Storage" onclick="callHistoryScreen.deleteRecordedMessage('${c.id}')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  setFilter(status) {
    this.filterStatus = status;
    this.render();
  }

  async deleteRecordedMessage(messageId) {
    if (!confirm('Are you sure you want to delete this recorded caller message from disk?')) return;
    try {
      await apiClient.deleteMessage(messageId);
      appUI.showToast('success', 'Deleted', 'Message removed from storage.');
      const data = await apiClient.getMessages();
      appState.setRealMessages(data.messages);
      this.render();
    } catch (err) {
      appUI.showToast('error', 'Delete Failed', err.message);
    }
  }

  async refreshHistory() {
    try {
      const data = await apiClient.getMessages();
      appState.setRealMessages(data.messages);
      this.render();
      appUI.showToast('info', 'Refreshed', 'Call records updated from storage.');
    } catch (err) {
      appUI.showToast('error', 'Refresh Failed', err.message);
    }
  }
}

// Global Singleton Screen Instance
const callHistoryScreen = new CallHistoryScreen();
