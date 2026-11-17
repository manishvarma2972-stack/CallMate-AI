/**
 * CallMate.ai — Central Reactive State Store
 * Manages configuration, telemetry, real messages, contacts, knowledge base,
 * call history, and active session state.
 */

class AppStateManager {
  constructor() {
    this.currentScreen = 'overview';
    this.theme = localStorage.getItem('callmate_theme') || 'dark';
    this.demoMode = localStorage.getItem('callmate_demo_mode') === 'true';
    // Comply with security requirements: Never persist master credentials in browser storage
    if (localStorage.getItem('callmate_owner_api_key')) {
      localStorage.removeItem('callmate_owner_api_key');
    }
    this.ownerApiKey = null;
    
    // Assistant Configuration (Hydrated from /api/v1/assistant/config)
    this.assistantConfig = {
      app_name: 'CallMate AI',
      app_version: '0.2.0',
      receptionist_name: 'CallMate',
      owner_name: 'Manish Varma',
      is_owner_configured: true,
      gemini_model: 'gemini-3.8-live',
      gemini_voice_name: 'Aoede',
      gemini_temperature: 0.6,
      supported_languages: [
        { code: 'en', name: 'English', native: 'English' },
        { code: 'te', name: 'Telugu', native: 'తెలుగు' }
      ],
      default_language: 'bilingual_auto',
      is_active: true,
      telecom_integration: {
        status: 'awaiting_carrier_trunking',
        provider: 'Virtual PBX / Local Gateway',
        forwarding_enabled: false,
        carrier_code_jio: '*401*',
        carrier_code_airtel: '**21*',
        carrier_code_us: '*72'
      }
    };

    // System Health & Telemetry (Hydrated from /health)
    this.systemHealth = {
      status: 'connecting',
      app_name: 'CallMate AI',
      version: '0.2.0',
      uptime_seconds: 0,
      memory_metrics: { rss_mb: 0 }
    };

    // Real Persisted Messages (Hydrated from /api/v1/messages)
    this.realMessages = [];

    // Comprehensive Contacts Directory (Stored in LocalStorage with initial defaults)
    const storedContacts = localStorage.getItem('callmate_contacts');
    this.contacts = storedContacts ? JSON.parse(storedContacts) : [
      {
        id: 'cnt_1',
        name: 'Chandu (Venkata Chandu)',
        phone: '+91 98480 22338',
        relationship: 'Business Partner',
        priority: 'vip',
        preferred_language: 'te',
        custom_instructions: 'Always notify Manish immediately. Ask if meeting is at Gachibowli or Jubilee Hills.',
        last_call: '2026-11-16T15:43:00Z'
      },
      {
        id: 'cnt_2',
        name: 'Ramesh Kumar',
        phone: '+91 98765 43210',
        relationship: 'Commercial Legal Counsel',
        priority: 'vip',
        preferred_language: 'en',
        custom_instructions: 'Take detailed notes regarding property registration contracts and deed signings.',
        last_call: '2026-11-15T11:20:00Z'
      },
      {
        id: 'cnt_3',
        name: 'Dr. Srinivas Rao',
        phone: '+91 94401 55667',
        relationship: 'Personal Physician',
        priority: 'vip',
        preferred_language: 'te',
        custom_instructions: 'Urgent medical calls should be escalated directly. Keep polite Telugu greeting.',
        last_call: '2026-11-14T09:15:00Z'
      },
      {
        id: 'cnt_4',
        name: 'Swiggy / Zomato Delivery',
        phone: '+91 80080 12345',
        relationship: 'Delivery Service',
        priority: 'standard',
        preferred_language: 'auto',
        custom_instructions: 'Instruct delivery drivers to leave parcels at reception or doorstep. Do not escalate.',
        last_call: '2026-11-16T12:30:00Z'
      },
      {
        id: 'cnt_5',
        name: 'Telemarketing / Credit Cards',
        phone: '+91 14099 88776',
        relationship: 'Spam / Telemarketer',
        priority: 'blocked',
        preferred_language: 'en',
        custom_instructions: 'Politely inform that the owner is not interested and terminate the call concisely.',
        last_call: '2026-11-13T16:05:00Z'
      }
    ];

    // Knowledge Base Memory Bank (Stored in LocalStorage with initial defaults)
    const storedKB = localStorage.getItem('callmate_knowledge_base');
    this.knowledgeBase = storedKB ? JSON.parse(storedKB) : [
      {
        id: 'kb_1',
        category: 'Personal Information',
        title: 'Owner Identity & Tone',
        content: 'You represent Manish Varma, a technology entrepreneur and executive based in Hyderabad. Always speak respectfully and maintain a warm, executive demeanor.',
        last_updated: '2026-11-16'
      },
      {
        id: 'kb_2',
        category: 'Availability & Schedule',
        title: 'Working Hours & Meeting Slots',
        content: 'Manish is generally available for scheduled calls weekdays between 10:00 AM and 6:30 PM IST. For unscheduled callers, offer to take a concise message and confirm a callback.',
        last_updated: '2026-11-15'
      },
      {
        id: 'kb_3',
        category: 'Confidentiality & Privacy',
        title: 'Strict Security Rules',
        content: 'NEVER disclose Manish\'s private residential address, personal WhatsApp number, current GPS location, or detailed medical/family information under any circumstances.',
        last_updated: '2026-11-14'
      },
      {
        id: 'kb_4',
        category: 'Multilingual Telugu Rules',
        title: 'Telugu Cultural Politeness',
        content: 'In Telugu conversations, always use respectful honorifics ("గారు" / "అండి"). Say "నమస్కారం అండి, నేను మనీష్ వర్మ గారి ఏఐ కాలర్ అసిస్టెంట్ ని." when welcoming Telugu callers.',
        last_updated: '2026-11-16'
      },
      {
        id: 'kb_5',
        category: 'Business & Ventures',
        title: 'CallMate AI Platform',
        content: 'If callers ask about CallMate.ai, explain that it is an intelligent bilingual personal AI caller assistant platform for Manish Varma currently in private access.',
        last_updated: '2026-11-16'
      }
    ];

    // Unified Call History (Populated by real messages + simulated demo records)
    this.callHistory = [];

    // Active Live Call State
    this.activeCall = null;

    // Subscriptions
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (err) {
        console.error('State notification error:', err);
      }
    }
  }

  navigateTo(screenId) {
    if (this.currentScreen === screenId) return;
    this.currentScreen = screenId;
    this.notify('screen_changed', screenId);
  }

  setTheme(themeName) {
    this.theme = themeName;
    localStorage.setItem('callmate_theme', themeName);
    document.documentElement.setAttribute('data-theme', themeName);
    this.notify('theme_changed', themeName);
  }

  setDemoMode(enabled) {
    this.demoMode = enabled;
    localStorage.setItem('callmate_demo_mode', enabled ? 'true' : 'false');
    this.buildCallHistory();
    this.notify('demo_mode_changed', enabled);
  }

  setOwnerApiKey(key) {
    this.ownerApiKey = key ? key.trim() : null;
    this.notify('api_key_changed', this.ownerApiKey);
  }

  saveContacts(contacts) {
    this.contacts = contacts;
    localStorage.setItem('callmate_contacts', JSON.stringify(contacts));
    this.notify('contacts_updated', contacts);
  }

  saveKnowledgeBase(kbList) {
    this.knowledgeBase = kbList;
    localStorage.setItem('callmate_knowledge_base', JSON.stringify(kbList));
    this.notify('kb_updated', kbList);
  }

  setAssistantConfig(config) {
    this.assistantConfig = { ...this.assistantConfig, ...config };
    this.notify('config_updated', this.assistantConfig);
  }

  setSystemHealth(health) {
    this.systemHealth = health;
    this.notify('health_updated', health);
  }

  setRealMessages(messages) {
    this.realMessages = messages || [];
    this.buildCallHistory();
    this.notify('messages_updated', this.realMessages);
  }

  buildCallHistory() {
    // 1. Convert real persisted messages from backend into call history items
    const realHistory = this.realMessages.map(msg => ({
      id: msg.message_id,
      session_id: msg.session_id,
      is_real: true,
      caller_name: msg.caller_name || 'Unknown Caller',
      phone_number: msg.phone_number || 'Private Number',
      recorded_at: msg.recorded_at,
      duration_seconds: 48,
      status: 'message', // 'message', 'answered', 'transferred', 'missed'
      urgency: msg.urgency || 'medium',
      language: 'Bilingual (Telugu/English)',
      summary: msg.message,
      transcript: [
        { sender: 'caller', text: `Hello, is this Manish Varma's number?` },
        { sender: 'ai', text: `నమస్కారం అండి, నేను మనీష్ వర్మ గారి ఏఐ కాలర్ అసిస్టెంట్ ని. ఆయన ప్రస్తుతం అందుబాటులో లేరు. మీ పేరు మరియు కాల్ ఉద్దేశం చెప్పగలరా?` },
        { sender: 'caller', text: msg.message },
        { sender: 'ai', text: `మీ సందేశం రికార్డ్ చేయబడింది. మనీష్ గారికి తెలియజేస్తాను. ధన్యవాదాలు!` }
      ],
      action_items: [
        `Return call to ${msg.caller_name} regarding: "${msg.message}"`
      ]
    }));

    // 2. If demo mode is active or real history is small, provide clearly labeled demo records
    const demoRecords = [
      {
        id: 'demo_call_1',
        session_id: 'demo-773a-4122-b9e0-telephony',
        is_real: false,
        caller_name: 'Dr. Srinivas Rao',
        phone_number: '+91 94401 55667',
        recorded_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        duration_seconds: 72,
        status: 'answered',
        urgency: 'high',
        language: 'Telugu',
        summary: 'Dr. Srinivas confirmed the routine medical checkup schedule for Thursday 4:00 PM at Jubilee Hills Clinic.',
        transcript: [
          { sender: 'caller', text: 'నమస్కారం! మనీష్ వర్మ గారు ఉన్నారా?' },
          { sender: 'ai', text: 'నమస్కారం డాక్టర్ గారు! నేను మనీష్ గారి ఏఐ అసిస్టెంట్ ని. ఆయన మీటింగ్ లో ఉన్నారు. నేను సహాయం చేయవచ్చా?' },
          { sender: 'caller', text: 'గురువారం సాయంత్రం 4 గంటలకు క్లినిక్ లో అపాయింట్మెంట్ ఫిక్స్ చేశామని చెప్పండి.' },
          { sender: 'ai', text: 'తప్పకుండా అండి! గురువారం సాయంత్రం 4 గంటలకు జూబ్లీహిల్స్ క్లినిక్ అపాయింట్మెంట్ మనీష్ గారి క్యాలెండర్ లో నోట్ చేస్తున్నాను.' }
        ],
        action_items: [
          'Add Thursday 4:00 PM appointment to executive calendar'
        ]
      },
      {
        id: 'demo_call_2',
        session_id: 'demo-992b-8811-c3a1-telephony',
        is_real: false,
        caller_name: 'Ananya Sharma (AWS Executive)',
        phone_number: '+1 415 889 0122',
        recorded_at: new Date(Date.now() - 3600000 * 6).toISOString(),
        duration_seconds: 110,
        status: 'transferred',
        urgency: 'high',
        language: 'English',
        summary: 'Cloud infrastructure credit review for CallMate production deployment. Transferred to owner directly upon VIP verification.',
        transcript: [
          { sender: 'caller', text: 'Hello, this is Ananya from Amazon Web Services executive relations calling for Manish.' },
          { sender: 'ai', text: 'Hello Ms. Sharma. I am CallMate, Manish Varma\'s AI caller assistant. Connecting you to Mr. Varma\'s priority line now.' }
        ],
        action_items: [
          'Review AWS partnership credits and SLA agreement'
        ]
      },
      {
        id: 'demo_call_3',
        session_id: 'demo-114c-5522-a9b3-telephony',
        is_real: false,
        caller_name: 'Unknown Telemarketer',
        phone_number: '+91 14099 88776',
        recorded_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        duration_seconds: 18,
        status: 'missed',
        urgency: 'low',
        language: 'English',
        summary: 'Pre-approved personal loan offer. Screened and politely declined per spam filtering rules.',
        transcript: [
          { sender: 'caller', text: 'Sir we have pre-approved credit card offer for you...' },
          { sender: 'ai', text: 'Thank you for calling. Mr. Varma has registered this number on the National Do Not Call registry. Have a good day.' }
        ],
        action_items: []
      }
    ];

    // Combine real messages first, then demo records if demo mode is enabled or to showcase telecom views
    if (this.demoMode) {
      this.callHistory = [...realHistory, ...demoRecords];
    } else {
      this.callHistory = realHistory;
    }

    this.callHistory.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
  }
}

// Global Singleton State
const appState = new AppStateManager();
