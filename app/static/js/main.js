/**
 * CallMate.ai — Main Application Bootstrapper
 * Coordinates state hydration, screen routing, real-time telemetry polling,
 * and component lifecycle management.
 */

class AppMain {
  constructor() {
    this.healthInterval = null;
    this.messagesInterval = null;
  }

  async init() {
    console.log('Initializing CallMate.ai Frontend Platform...');

    // 1. Initialize Theme
    appState.setTheme(appState.theme);

    // 2. Hydrate Backend Telemetry & Configuration
    await this.hydrateSystem();

    // 3. Register State Change Listeners
    appState.subscribe((event, data) => {
      if (event === 'screen_changed') {
        this.renderActiveScreen();
        this.updateNavHighlight(data);
      } else if (event === 'health_updated') {
        this.updateHealthIndicator(data);
      } else if (event === 'messages_updated') {
        this.updateMessageBadges();
      } else if (event === 'config_updated') {
        this.updateHeaderProfile();
      }
    });

    // 4. Initial Screen Render
    this.renderActiveScreen();
    this.updateNavHighlight(appState.currentScreen);

    // 5. Periodic Background Telemetry Polling (Every 10 seconds)
    this.startBackgroundSync();

    console.log('CallMate.ai Platform ready: Your AI. Your Calls. Your Control.');
  }

  async hydrateSystem() {
    // 0. Check / initialize owner session
    try {
      const authStatus = await apiClient.checkAuthSession();
      if (authStatus && authStatus.authenticated) {
        console.log(`CallMate session active (${authStatus.auth_method || 'authenticated'}).`);
      }
    } catch {}

    // A. Fetch live health probe
    try {
      const health = await apiClient.getHealth();
      if (health) {
        appState.setSystemHealth(health);
        this.updateHealthIndicator(health);
      }
    } catch {}

    // B. Fetch live assistant configuration
    try {
      const config = await apiClient.getAssistantConfig();
      if (config) {
        appState.setAssistantConfig(config);
        this.updateHeaderProfile();
      }
    } catch {}

    // C. Fetch real persisted caller messages from backend
    try {
      const msgsData = await apiClient.getMessages();
      if (msgsData && msgsData.messages) {
        appState.setRealMessages(msgsData.messages);
        this.updateMessageBadges();
      }
    } catch {}
  }

  startBackgroundSync() {
    // Health polling
    this.healthInterval = setInterval(async () => {
      const health = await apiClient.getHealth();
      if (health) {
        appState.setSystemHealth(health);
      }
    }, 10000);

    // Messages polling (Keep real calls synced)
    this.messagesInterval = setInterval(async () => {
      const msgsData = await apiClient.getMessages();
      if (msgsData && msgsData.messages) {
        appState.setRealMessages(msgsData.messages);
      }
    }, 8000);
  }

  renderActiveScreen() {
    const screenId = appState.currentScreen;
    
    // Hide all screen containers
    document.querySelectorAll('.screen-container').forEach(c => c.classList.remove('active'));

    // Update Page Header Titles
    const titleEl = document.getElementById('pageTitle');
    const subtitleEl = document.getElementById('pageSubtitle');

    switch (screenId) {
      case 'overview':
        if (titleEl) titleEl.textContent = 'Overview';
        if (subtitleEl) subtitleEl.textContent = 'Live AI Caller Assistant Dashboard & Activity';
        const scrOverview = document.getElementById('screen-overview');
        if (scrOverview) { scrOverview.classList.add('active'); overviewScreen.render(); }
        break;

      case 'live-calls':
        if (titleEl) titleEl.textContent = 'Live Calls & Studio';
        if (subtitleEl) subtitleEl.textContent = 'Bidirectional Voice Streaming & Telephony Monitor';
        const scrLive = document.getElementById('screen-live-calls');
        if (scrLive) { scrLive.classList.add('active'); liveCallsScreen.render(); }
        break;

      case 'call-history':
        if (titleEl) titleEl.textContent = 'Call History';
        if (subtitleEl) subtitleEl.textContent = 'Recorded Calls, Bilingual Transcripts & Messages';
        const scrHistory = document.getElementById('screen-call-history');
        if (scrHistory) { scrHistory.classList.add('active'); callHistoryScreen.render(); }
        break;

      case 'ai-assistant':
        if (titleEl) titleEl.textContent = 'AI Caller Assistant';
        if (subtitleEl) subtitleEl.textContent = 'Manish Varma AI Caller Assistant Persona, Voices & Screening Rules';
        const scrAssistant = document.getElementById('screen-ai-assistant');
        if (scrAssistant) { scrAssistant.classList.add('active'); aiAssistantScreen.render(); }
        break;

      case 'knowledge-base':
        if (titleEl) titleEl.textContent = 'Knowledge Base';
        if (subtitleEl) subtitleEl.textContent = 'Teach Facts, FAQs & Personal Spoken Guidelines';
        const scrKB = document.getElementById('screen-knowledge-base');
        if (scrKB) { scrKB.classList.add('active'); knowledgeBaseScreen.render(); }
        break;

      case 'contacts':
        if (titleEl) titleEl.textContent = 'Contacts';
        if (subtitleEl) subtitleEl.textContent = 'VIP Handling, Relationships & Language Rules';
        const scrContacts = document.getElementById('screen-contacts');
        if (scrContacts) { scrContacts.classList.add('active'); contactsScreen.render(); }
        break;

      case 'analytics':
        if (titleEl) titleEl.textContent = 'Analytics';
        if (subtitleEl) subtitleEl.textContent = 'Traffic Trends, Language Share & Resolution Rate';
        const scrAnalytics = document.getElementById('screen-analytics');
        if (scrAnalytics) { scrAnalytics.classList.add('active'); analyticsScreen.render(); }
        break;

      case 'settings':
        if (titleEl) titleEl.textContent = 'Settings';
        if (subtitleEl) subtitleEl.textContent = 'Carrier Forwarding, Security & Notifications';
        const scrSettings = document.getElementById('screen-settings');
        if (scrSettings) { scrSettings.classList.add('active'); settingsScreen.render(); }
        break;
    }

    // Close mobile sidebar on navigation
    appUI.closeSidebar();
  }

  updateNavHighlight(screenId) {
    document.querySelectorAll('.app-sidebar .nav-item').forEach(item => {
      if (item.getAttribute('data-screen') === screenId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  updateHealthIndicator(health) {
    const dot = document.getElementById('systemHealthDot');
    const text = document.getElementById('systemHealthText');
    const pill = document.getElementById('systemHealthPill');

    if (!dot || !text) return;

    if (health && health.status === 'healthy') {
      dot.className = 'status-indicator-dot';
      text.textContent = `Healthy • v${health.version || '0.2.0'} • ${Math.round(health.uptime_seconds || 0)}s`;
      if (pill) pill.title = `Memory: ${health.memory_metrics?.rss_mb || 0} MB • Host: ${window.location.host}`;
    } else {
      dot.className = 'status-indicator-dot offline';
      text.textContent = 'Backend Offline';
    }
  }

  updateMessageBadges() {
    const count = appState.realMessages.length;
    const notifBadge = document.getElementById('notifBadge');
    const callCountBadge = document.getElementById('sidebarCallCountBadge');

    if (notifBadge) notifBadge.textContent = count;
    if (callCountBadge) callCountBadge.textContent = appState.callHistory.length;
  }

  updateHeaderProfile() {
    const config = appState.assistantConfig;
    const nameEl = document.getElementById('sidebarOwnerName');
    const avatarEl = document.getElementById('sidebarUserAvatar');

    if (nameEl && config.owner_name) {
      nameEl.textContent = config.owner_name;
    }
    if (avatarEl && config.owner_name) {
      const parts = config.owner_name.split(' ');
      const initials = parts.map(p => p[0]).join('').slice(0, 2).toUpperCase();
      avatarEl.textContent = initials || 'MV';
    }
  }
}

// Global Main Instance
const appMain = new AppMain();

// Boot application upon DOM ready
window.addEventListener('DOMContentLoaded', () => {
  appMain.init();
});
