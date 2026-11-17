/**
 * CallMate.ai — Backend API Client
 * Manages HTTP communication with FastAPI endpoints.
 */

class ApiClient {
  constructor() {
    this.baseUrl = window.location.origin;
  }

  async getHealth() {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      if (!res.ok) throw new Error(`Health probe HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend /health unreachable:', err.message);
      return null;
    }
  }

  async checkAuthSession() {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/session`, {
        credentials: 'same-origin'
      });
      if (!res.ok) return { authenticated: false };
      return await res.json();
    } catch {
      return { authenticated: false };
    }
  }

  async getAssistantConfig() {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/assistant/config`);
      if (!res.ok) throw new Error(`Config HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend /api/v1/assistant/config unreachable:', err.message);
      return null;
    }
  }

  async getMessages() {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/messages`);
      if (!res.ok) throw new Error(`Messages HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend /api/v1/messages unreachable:', err.message);
      return { messages: [], total: 0 };
    }
  }

  async deleteMessage(messageId) {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/messages/${encodeURIComponent(messageId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`Delete HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`Failed to delete message ${messageId}:`, err);
      throw err;
    }
  }

  async createVoiceSession(apiKey = null, languageHint = 'en') {
    const headers = {
      'Content-Type': 'application/json'
    };
    const key = apiKey || appState.ownerApiKey;
    if (key) {
      headers['X-API-Key'] = key;
    }

    const res = await fetch(`${this.baseUrl}/api/v1/voice/sessions`, {
      method: 'POST',
      headers: headers,
      credentials: 'same-origin',
      body: JSON.stringify({
        language_hint: languageHint
      })
    });

    if (!res.ok) {
      const errorPayload = await res.json().catch(() => ({}));
      const detail = errorPayload.error?.message || errorPayload.detail || errorPayload.message || `HTTP ${res.status}`;
      const errorCode = errorPayload.error?.code || `HTTP_${res.status}`;
      const err = new Error(`Failed to provision voice session: ${detail}`);
      err.status = res.status;
      err.code = errorCode;
      throw err;
    }

    return await res.json();
  }
}

// Global Singleton API Client
const apiClient = new ApiClient();
