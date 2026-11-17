/**
 * CallMate.ai — Analytics & Operational Intelligence Screen (Section 12)
 * Meaningful visual analytics: call volume trends, AI resolution efficiency,
 * bilingual Telugu vs English distribution, caller intents, and hourly traffic.
 */

class AnalyticsScreen {
  constructor() {
    this.container = document.getElementById('screen-analytics');
    this.timeframe = '7d';
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-primary); letter-spacing:-0.02em;">Analytics & Intelligence</h2>
          <p style="font-size:0.85rem; color:var(--text-muted);">Real-time metrics on AI resolution rates, language split, and traffic patterns</p>
        </div>

        <div style="display:flex; background:var(--bg-surface); padding:3px; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
          <button class="btn btn-sm ${this.timeframe === 'today' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="analyticsScreen.setTimeframe('today')">Today</button>
          <button class="btn btn-sm ${this.timeframe === '7d' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="analyticsScreen.setTimeframe('7d')">Last 7 Days</button>
          <button class="btn btn-sm ${this.timeframe === '30d' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="analyticsScreen.setTimeframe('30d')">Last 30 Days</button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid-4">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">AI Resolution Rate</span>
            <div class="stat-icon" style="color:var(--success);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <div class="stat-value">91.4%</div>
          <div class="stat-footer">
            <span class="delta-badge positive">↑ 3.2%</span>
            <span>calls resolved without escalation</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Total Spoken Minutes</span>
            <div class="stat-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
          </div>
          <div class="stat-value">342m</div>
          <div class="stat-footer">
            <span class="delta-badge neutral">1m 14s avg</span>
            <span>per call turn</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Telugu Language Share</span>
            <div class="stat-icon" style="color:var(--primary);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
          </div>
          <div class="stat-value">58%</div>
          <div class="stat-footer">
            <span class="delta-badge positive">తెలుగు</span>
            <span>native or mixed speech</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Spam Block Rate</span>
            <div class="stat-icon" style="color:var(--danger);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            </div>
          </div>
          <div class="stat-value">100%</div>
          <div class="stat-footer">
            <span class="delta-badge positive">Protected</span>
            <span>telemarketers politely declined</span>
          </div>
        </div>
      </div>

      <!-- Charts Row 1: Volume Trend & Language Split -->
      <div class="grid-2">
        <!-- Call Volume Trend (SVG Chart) -->
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <div class="card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              </div>
              <div>
                <h3 class="card-title">Call Volume Trend</h3>
                <span class="card-subtitle">Daily calls handled vs human escalations</span>
              </div>
            </div>
          </div>

          <div style="height:220px; display:flex; flex-direction:column; justify-content:flex-end;">
            <svg viewBox="0 0 500 200" style="width:100%; height:100%; overflow:visible;">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#3478F6" stop-opacity="0.35"/>
                  <stop offset="100%" stop-color="#3478F6" stop-opacity="0.0"/>
                </linearGradient>
              </defs>
              <!-- Grid lines -->
              <line x1="0" y1="40" x2="500" y2="40" stroke="currentColor" stroke-opacity="0.08" stroke-width="1"/>
              <line x1="0" y1="90" x2="500" y2="90" stroke="currentColor" stroke-opacity="0.08" stroke-width="1"/>
              <line x1="0" y1="140" x2="500" y2="140" stroke="currentColor" stroke-opacity="0.08" stroke-width="1"/>
              <line x1="0" y1="180" x2="500" y2="180" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>

              <!-- Area Fill -->
              <polygon points="20,180 20,130 95,95 170,120 245,60 320,80 395,45 470,55 470,180" fill="url(#chartGradient)"/>

              <!-- Line Chart -->
              <polyline points="20,130 95,95 170,120 245,60 320,80 395,45 470,55" fill="none" stroke="#3478F6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

              <!-- Data dots -->
              <circle cx="20" cy="130" r="4" fill="#3478F6" stroke="#fff" stroke-width="2"/>
              <circle cx="95" cy="95" r="4" fill="#3478F6" stroke="#fff" stroke-width="2"/>
              <circle cx="170" cy="120" r="4" fill="#3478F6" stroke="#fff" stroke-width="2"/>
              <circle cx="245" cy="60" r="4" fill="#3478F6" stroke="#fff" stroke-width="2"/>
              <circle cx="320" cy="80" r="4" fill="#3478F6" stroke="#fff" stroke-width="2"/>
              <circle cx="395" cy="45" r="4" fill="#3478F6" stroke="#fff" stroke-width="2"/>
              <circle cx="470" cy="55" r="4" fill="#3478F6" stroke="#fff" stroke-width="2"/>

              <!-- X-Axis Labels -->
              <text x="20" y="196" font-size="10" fill="currentColor" opacity="0.6" text-anchor="middle">Mon</text>
              <text x="95" y="196" font-size="10" fill="currentColor" opacity="0.6" text-anchor="middle">Tue</text>
              <text x="170" y="196" font-size="10" fill="currentColor" opacity="0.6" text-anchor="middle">Wed</text>
              <text x="245" y="196" font-size="10" fill="currentColor" opacity="0.6" text-anchor="middle">Thu</text>
              <text x="320" y="196" font-size="10" fill="currentColor" opacity="0.6" text-anchor="middle">Fri</text>
              <text x="395" y="196" font-size="10" fill="currentColor" opacity="0.6" text-anchor="middle">Sat</text>
              <text x="470" y="196" font-size="10" fill="currentColor" opacity="0.6" text-anchor="middle">Sun</text>
            </svg>
          </div>
        </div>

        <!-- Language Distribution Donut Breakdown -->
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <div class="card-icon" style="color:var(--primary);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <div>
                <h3 class="card-title">Language Distribution</h3>
                <span class="card-subtitle">Natural Telugu vs English code-switching</span>
              </div>
            </div>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-around; height:220px; flex-wrap:wrap; gap:16px;">
            <!-- Circular Gauge -->
            <svg viewBox="0 0 120 120" style="width:130px; height:130px; transform:rotate(-90deg);">
              <!-- Background Circle -->
              <circle cx="60" cy="60" r="48" fill="none" stroke="var(--bg-elevated)" stroke-width="14"/>
              <!-- Telugu (58%) -->
              <circle cx="60" cy="60" r="48" fill="none" stroke="#3478F6" stroke-width="14" stroke-dasharray="301.6" stroke-dashoffset="126.6" stroke-linecap="round"/>
              <!-- English (32%) -->
              <circle cx="60" cy="60" r="48" fill="none" stroke="#32C7D9" stroke-width="14" stroke-dasharray="301.6" stroke-dashoffset="205.1" stroke-linecap="round" style="transform-origin:center; transform:rotate(208deg);"/>
              <!-- Mixed (10%) -->
              <circle cx="60" cy="60" r="48" fill="none" stroke="#22C55E" stroke-width="14" stroke-dasharray="301.6" stroke-dashoffset="271.4" stroke-linecap="round" style="transform-origin:center; transform:rotate(324deg);"/>
            </svg>

            <!-- Legend -->
            <div style="display:flex; flex-direction:column; gap:10px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="width:10px; height:10px; border-radius:50%; background:#3478F6;"></span>
                <span style="font-size:0.85rem; color:var(--text-primary);">Telugu (తెలుగు) — 58%</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="width:10px; height:10px; border-radius:50%; background:#32C7D9;"></span>
                <span style="font-size:0.85rem; color:var(--text-primary);">English — 32%</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="width:10px; height:10px; border-radius:50%; background:#22C55E;"></span>
                <span style="font-size:0.85rem; color:var(--text-primary);">Code-Switched Mix — 10%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Caller Intent Categorization -->
      <div class="card" style="margin-top:20px;">
        <h3 class="card-title" style="margin-bottom:16px;">Caller Intent Categorization</h3>
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:4px;">
              <span>Business Contracts & Legal Agreements</span>
              <span style="font-family:var(--font-mono); color:var(--text-primary);">44% (150 calls)</span>
            </div>
            <div style="height:6px; background:var(--bg-elevated); border-radius:3px; overflow:hidden;">
              <div style="width:44%; height:100%; background:var(--primary);"></div>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:4px;">
              <span>Schedule Confirmations & Appointments</span>
              <span style="font-family:var(--font-mono); color:var(--text-primary);">30% (102 calls)</span>
            </div>
            <div style="height:6px; background:var(--bg-elevated); border-radius:3px; overflow:hidden;">
              <div style="width:30%; height:100%; background:var(--secondary);"></div>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:4px;">
              <span>Personal Friends & Family Inquiries</span>
              <span style="font-family:var(--font-mono); color:var(--text-primary);">16% (55 calls)</span>
            </div>
            <div style="height:6px; background:var(--bg-elevated); border-radius:3px; overflow:hidden;">
              <div style="width:16%; height:100%; background:var(--success);"></div>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:4px;">
              <span>Filtered Telemarketing & Spam</span>
              <span style="font-family:var(--font-mono); color:var(--text-primary);">10% (35 calls)</span>
            </div>
            <div style="height:6px; background:var(--bg-elevated); border-radius:3px; overflow:hidden;">
              <div style="width:10%; height:100%; background:var(--danger);"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setTimeframe(tf) {
    this.timeframe = tf;
    this.render();
  }
}

// Global Singleton Screen Instance
const analyticsScreen = new AnalyticsScreen();
