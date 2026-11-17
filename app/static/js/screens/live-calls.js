/**
 * CallMate.ai — Live Calls & Voice Studio Screen (Section 7)
 * Dedicated real-time call monitoring interface and live Gemini Live voice studio.
 * Provides live mic streaming, 16kHz PCM downsampler, 24kHz speaker playback,
 * live animated waveform, real-time transcription, barge-in, and an explicitly
 * labeled acoustic live simulation mode for testing without a Gemini API key.
 */

class LiveCallsScreen {
  constructor() {
    this.container = document.getElementById('screen-live-calls');
    this.waveform = null;
    this.orb = null;
    this.callTimerInterval = null;
    this.callSeconds = 0;
    this.isSimulating = false;
    this.simulationTimeouts = [];
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <!-- Top Studio Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <div>
          <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-primary); letter-spacing:-0.02em;">Live Voice Studio & Telephony Monitor</h2>
          <p style="font-size:0.85rem; color:var(--text-muted);">Bidirectional 16kHz &harr; 24kHz Gemini 3.8 Live streaming console & acoustic testbed</p>
        </div>

        <div style="display:flex; align-items:center; gap:10px;">
          <span class="demo-mode-badge" id="studioDemoBadge" style="display:none;">DEMO SIMULATION ACTIVE</span>
          <span class="pill-badge" style="background:var(--bg-elevated); font-family:var(--font-mono); font-size:0.75rem;">
            Turns: <strong id="studioTurnCount" style="color:var(--secondary);">0</strong>
          </span>
          <span class="pill-badge" id="studioTimerBadge" style="display:none; background:var(--primary-soft); color:var(--primary); font-family:var(--font-mono); font-weight:700;">
            00:00
          </span>
        </div>
      </div>

      <!-- Studio Mode Grid -->
      <div class="grid-2">
        <!-- Panel 1: Live Voice Session Console -->
        <div class="card" style="display:flex; flex-direction:column; gap:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="voice-orb-container" style="width:54px; height:54px;">
                <canvas id="studioOrbCanvas" class="orb-canvas"></canvas>
              </div>
              <div>
                <h3 style="font-size:1.05rem; font-weight:700; color:var(--text-primary);" id="studioCallStatus">Voice Stream Disconnected</h3>
                <span style="font-size:0.75rem; color:var(--text-muted);" id="studioCallSubstatus">Select an option below to begin testing</span>
              </div>
            </div>

            <span class="status-badge status-disconnected" id="studioConnectionBadge">Idle</span>
          </div>

          <!-- Real-Time Waveform Visualizer -->
          <div class="waveform-container">
            <canvas id="studioWaveformCanvas" class="waveform-canvas"></canvas>
          </div>

          <!-- Live Audio Meters (Mic Inbound & Speaker Outbound) -->
          <div>
            <div class="level-meter-wrapper">
              <div class="level-meter-label">
                <span>Microphone Input (16kHz Linear PCM)</span>
                <span id="studioMicPct" style="font-family:var(--font-mono);">0%</span>
              </div>
              <div class="level-meter-bar">
                <div class="level-meter-fill" id="studioMicFill"></div>
              </div>
            </div>

            <div class="level-meter-wrapper" style="margin-top:8px;">
              <div class="level-meter-label">
                <span>CallMate Voice Output (24kHz Synthesized PCM)</span>
                <span id="studioSpkPct" style="font-family:var(--font-mono);">0%</span>
              </div>
              <div class="level-meter-bar">
                <div class="level-meter-fill spk" id="studioSpkFill"></div>
              </div>
            </div>
          </div>

          <!-- Session Controls -->
          <div style="display:flex; gap:10px; flex-wrap:wrap; padding-top:8px; border-top:1px solid var(--border-subtle);">
            <button class="btn btn-primary" id="btnStudioStart" onclick="liveCallsScreen.startVoiceCall()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Start Real Voice Call</span>
            </button>

            <button class="btn btn-outline" id="btnStudioSim" onclick="liveCallsScreen.startLiveSimulation()" title="Preview full acoustic flow without a Gemini API key">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              <span>Preview Live Simulation [Demo]</span>
            </button>

            <button class="btn btn-danger" id="btnStudioHangup" onclick="liveCallsScreen.stopVoiceCall()" disabled>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/></svg>
              <span>Hang Up</span>
            </button>

            <button class="btn btn-secondary" id="btnStudioBargein" onclick="liveCallsScreen.bargeIn()" disabled title="Cut off assistant speech immediately (<50ms buffer flush)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              <span>Barge-in / Interrupt</span>
            </button>

            <button class="btn btn-secondary" id="btnStudioMute" onclick="liveCallsScreen.toggleMute()" disabled>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              <span id="btnStudioMuteText">Mute Mic</span>
            </button>
          </div>
        </div>

        <!-- Panel 2: Live Conversation Transcription & Event Stream -->
        <div class="card" style="display:flex; flex-direction:column;">
          <div class="card-header" style="margin-bottom:12px;">
            <div class="card-title-group">
              <div class="card-icon" style="color:var(--primary);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div>
                <h3 class="card-title">Live Conversation Stream</h3>
                <span class="card-subtitle">Real-time English & Telugu speech recognition</span>
              </div>
            </div>

            <button class="btn btn-secondary btn-sm" onclick="liveCallsScreen.clearTranscript()">Clear</button>
          </div>

          <!-- Live Transcript Output Box -->
          <div class="studio-console" id="studioTranscriptBox" style="flex:1; min-height:260px; max-height:340px;">
            <div class="console-entry info">[System] Ready to stream. Press 'Start Real Voice Call' or 'Preview Live Simulation [Demo]' to test.</div>
          </div>
        </div>
      </div>

      <!-- Suggested Conversational Prompts Card -->
      <div class="card" style="margin-top:20px;">
        <div class="card-header">
          <div class="card-title-group">
            <div class="card-icon" style="color:var(--secondary);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
            </div>
            <div>
              <h3 class="card-title">Acoustic Verification Scenarios</h3>
              <span class="card-subtitle">Recommended test phrases for bilingual conversational evaluation</span>
            </div>
          </div>
        </div>

        <div class="grid-2" style="margin-bottom:0;">
          <div style="padding:12px; background:var(--bg-elevated); border-radius:var(--radius-md); border-left:3px solid var(--primary);">
            <strong style="font-size:0.88rem; color:var(--text-primary); display:block; margin-bottom:4px;">Scenario A: Assistant Identity (English)</strong>
            <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:4px;">"Hello! Who is this, and whose phone have I reached?"</p>
            <span style="font-size:0.75rem; color:var(--secondary);">Expected: Identifies naturally as Manish Varma's AI caller assistant ("Hello! I'm Manish Varma's AI caller assistant. How can I help you?").</span>
          </div>

          <div style="padding:12px; background:var(--bg-elevated); border-radius:var(--radius-md); border-left:3px solid var(--secondary);">
            <strong style="font-size:0.88rem; color:var(--text-primary); display:block; margin-bottom:4px;">Scenario B: Natural Language Switch (Telugu)</strong>
            <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:4px;">"నమస్కారం! మనీష్ వర్మ గారు ఉన్నారా? మాట్లాడవచ్చా?"</p>
            <span style="font-size:0.75rem; color:var(--secondary);">Expected: Switches politely to Telugu explaining owner availability.</span>
          </div>

          <div style="padding:12px; background:var(--bg-elevated); border-radius:var(--radius-md); border-left:3px solid var(--success);">
            <strong style="font-size:0.88rem; color:var(--text-primary); display:block; margin-bottom:4px;">Scenario C: Message Taking Tool (take_message)</strong>
            <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:4px;">"Please tell him that Ramesh called regarding the commercial contract at 9876543210."</p>
            <span style="font-size:0.75rem; color:var(--success);">Expected: Calls take_message tool, saves to disk, confirms recording.</span>
          </div>

          <div style="padding:12px; background:var(--bg-elevated); border-radius:var(--radius-md); border-left:3px solid var(--danger);">
            <strong style="font-size:0.88rem; color:var(--text-primary); display:block; margin-bottom:4px;">Scenario D: Barge-in & Interruption</strong>
            <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:4px;">Start speaking or click "Barge-in" while the AI is in the middle of a sentence.</p>
            <span style="font-size:0.75rem; color:var(--danger);">Expected: Instantaneous audio cutoff (&lt;50ms) and prompt attention.</span>
          </div>
        </div>
      </div>
    `;

    // Clean up previous renderers to prevent leaks
    if (this.waveform) {
      this.waveform.destroy();
    }
    if (this.orb) {
      this.orb.destroy();
    }

    // Initialize Waveform & Orb renderers
    this.waveform = new AudioWaveformVisualizer('studioWaveformCanvas');
    this.orb = new VoiceOrbRenderer('studioOrbCanvas');
    this.orb.setState(audioEngine.isCalling ? audioEngine.state : 'disconnected');

    // Attach callbacks to AudioEngine
    audioEngine.onStateChange = (state) => this.handleEngineState(state);
    audioEngine.onTranscript = (text) => this.appendTranscript(text, 'model');
    audioEngine.onLevelUpdate = (source, pct) => this.updateLevels(source, pct);
    audioEngine.onToolEvent = (type, name, data) => this.handleToolEvent(type, name, data);
    audioEngine.onLog = (msg, type) => this.appendConsoleLog(msg, type);
  }

  async startVoiceCall() {
    this.clearSimulation();
    try {
      document.getElementById('btnStudioStart').disabled = true;
      document.getElementById('btnStudioSim').disabled = true;
      await audioEngine.startCall('en');
    } catch (err) {
      document.getElementById('btnStudioStart').disabled = false;
      document.getElementById('btnStudioSim').disabled = false;

      const isAuthError = err.status === 401 || (err.message && err.message.toLowerCase().includes('unauthorized')) || (err.message && err.message.toLowerCase().includes('owner'));

      if (isAuthError) {
        this.appendConsoleLog(`[Auth Failure] CallMate owner authorization error: ${err.message}`, 'error');
        this.appendConsoleLog(`[Diagnosis] Session provisioning failed at /api/v1/voice/sessions. Verify browser session cookie or X-API-Key.`, 'warn');
        appUI.showToast('danger', 'Authorization Error', err.message || 'CallMate owner authorization failed.');
      } else {
        this.appendConsoleLog(`[Connection Error] Voice stream error: ${err.message}`, 'error');
        this.appendConsoleLog(`[Suggestion] To preview complete acoustic waveforms and conversation flow without an active connection, click 'Preview Live Simulation [Demo]'.`, 'info');
        appUI.showToast('warning', 'Live Session Notice', `Voice connection notice: ${err.message}`);
      }
    }
  }

  // Explicit Demonstration Mode Preview (No API Key Required)
  startLiveSimulation() {
    this.clearSimulation();
    this.isSimulating = true;
    audioEngine.stopCall(); // Ensure real socket is stopped

    const demoBadge = document.getElementById('studioDemoBadge');
    if (demoBadge) demoBadge.style.display = 'inline-flex';

    document.getElementById('btnStudioStart').disabled = true;
    document.getElementById('btnStudioSim').disabled = true;
    document.getElementById('btnStudioHangup').disabled = false;
    document.getElementById('btnStudioBargein').disabled = false;
    document.getElementById('btnStudioMute').disabled = false;

    this.clearTranscript();
    this.appendConsoleLog('[Simulation] Starting explicitly labeled demonstration mode...', 'info');
    this.appendConsoleLog('[Simulation] Simulating incoming bilingual call from Ramesh Kumar (+91 98765 43210)...', 'info');

    // Trigger smooth incoming call notification banner (Section 6)
    appUI.showIncomingCallNotification({
      caller_name: 'Ramesh Kumar',
      phone_number: '+91 98765 43210',
      language: 'Telugu + English',
      urgency: 'high',
      onAnswer: () => {
        appUI.showToast('info', 'Call Connected', 'CallMate AI is screening live incoming call.');
      },
      onDecline: () => {
        this.stopVoiceCall();
      }
    });

    this.handleEngineState('listening');
    this.startCallTimer();
    let turn = 1;
    document.getElementById('studioTurnCount').textContent = turn;

    // Simulation Sequence
    // Step 1: Caller speaks in Telugu (Namaskaram! Manish Varma garu unnara?)
    this.queueSimTimeout(() => {
      if (!this.isSimulating) return;
      this.animateLevels('mic', 45, 1800);
      this.appendTranscript('నమస్కారం! మనీష్ వర్మ గారు ఉన్నారా? మాట్లాడవచ్చా? (Namaskaram! Manish Varma garu unnara?)', 'caller');
    }, 1000);

    // Step 2: Assistant thinks
    this.queueSimTimeout(() => {
      if (!this.isSimulating) return;
      this.handleEngineState('thinking');
    }, 3200);

    // Step 3: Assistant speaks polite Telugu
    this.queueSimTimeout(() => {
      if (!this.isSimulating) return;
      this.handleEngineState('speaking');
      this.animateLevels('spk', 65, 3000);
      this.appendTranscript('నమస్కారం అండి, నేను మనీష్ వర్మ గారి ఏఐ కాలర్ అసిస్టెంట్ ని. ఆయన ప్రస్తుతం అందుబాటులో లేరు. మీ పేరు మరియు కాల్ ఉద్దేశం చెప్పగలరా?', 'model');
    }, 4000);

    // Step 4: Assistant finishes turn 1 and listens
    this.queueSimTimeout(() => {
      if (!this.isSimulating) return;
      turn = 2;
      document.getElementById('studioTurnCount').textContent = turn;
      this.handleEngineState('listening');
      this.appendConsoleLog('[Turn 1 Complete] Ready for caller input...', 'success');
    }, 7600);

    // Step 5: Caller leaves message with callback number
    this.queueSimTimeout(() => {
      if (!this.isSimulating) return;
      this.animateLevels('mic', 55, 2600);
      this.appendTranscript('నా పేరు రమేష్ కుమార్. కమర్షియల్ కాంట్రాక్ట్ డాక్యుమెంట్స్ సైనింగ్ గురించి మాట్లాడాలి. నన్ను 9876543210 కి కాల్ చేయమని చెప్పండి.', 'caller');
    }, 8500);

    // Step 6: Assistant triggers take_message tool
    this.queueSimTimeout(() => {
      if (!this.isSimulating) return;
      this.handleEngineState('thinking');
      this.handleToolEvent('call', 'take_message', {
        caller_name: 'Ramesh Kumar',
        phone_number: '+919876543210',
        urgency: 'high',
        message: 'Commercial contract documents signing inquiry'
      });
    }, 11500);

    // Step 7: Tool execution result confirmed
    this.queueSimTimeout(() => {
      if (!this.isSimulating) return;
      this.handleToolEvent('result', null, {
        status: 'recorded',
        message_id: 'msg_simulated_' + Date.now(),
        message: 'Message recorded successfully.'
      });
    }, 12500);

    // Step 8: Assistant speaks confirmation
    this.queueSimTimeout(() => {
      if (!this.isSimulating) return;
      this.handleEngineState('speaking');
      this.animateLevels('spk', 70, 3200);
      this.appendTranscript('రమేష్ గారు, మీ సందేశం మరియు ఫోన్ నంబర్ రికార్డ్ చేయబడింది. మనీష్ గారికి వెంటనే తెలియజేస్తాను. ధన్యవాదాలు!', 'model');
    }, 13200);

    // Step 9: Call completes
    this.queueSimTimeout(() => {
      if (!this.isSimulating) return;
      this.handleEngineState('listening');
      this.appendConsoleLog('[Simulation] Multi-turn bilingual call simulation completed successfully.', 'success');
      appUI.showToast('success', 'Simulation Finished', 'Multi-turn bilingual call completed with message taken.');
    }, 17000);
  }

  animateLevels(source, targetPct, durationMs) {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (!this.isSimulating) {
        clearInterval(interval);
        return;
      }
      const elapsed = Date.now() - startTime;
      if (elapsed >= durationMs) {
        this.updateLevels(source, 0);
        clearInterval(interval);
      } else {
        const factor = Math.sin((elapsed / durationMs) * Math.PI);
        const current = Math.round(targetPct * factor + (Math.random() - 0.5) * 15);
        this.updateLevels(source, Math.max(0, Math.min(100, current)));
      }
    }, 60);
  }

  queueSimTimeout(fn, delayMs) {
    const id = setTimeout(fn, delayMs);
    this.simulationTimeouts.push(id);
  }

  clearSimulation() {
    this.isSimulating = false;
    appUI.dismissIncomingCallNotification();
    for (const id of this.simulationTimeouts) {
      clearTimeout(id);
    }
    this.simulationTimeouts = [];
    const demoBadge = document.getElementById('studioDemoBadge');
    if (demoBadge) demoBadge.style.display = 'none';
    this.updateLevels('mic', 0);
    this.updateLevels('spk', 0);
  }

  stopVoiceCall() {
    this.clearSimulation();
    audioEngine.stopCall();
    this.handleEngineState('disconnected');
    const btnStart = document.getElementById('btnStudioStart');
    const btnSim = document.getElementById('btnStudioSim');
    if (btnStart) btnStart.disabled = false;
    if (btnSim) btnSim.disabled = false;
  }

  bargeIn() {
    if (this.isSimulating) {
      this.updateLevels('spk', 0);
      this.handleEngineState('interrupted');
      this.appendConsoleLog('[Simulation] Barge-in triggered: instant audio playback cut off.', 'warn');
      appUI.showToast('warning', 'Barge-in', 'Simulated speech cut off; returned to listening.');
      setTimeout(() => {
        if (this.isSimulating) this.handleEngineState('listening');
      }, 400);
      return;
    }
    audioEngine.sendInterruption();
    appUI.showToast('warning', 'Barge-in', 'Cut off audio playback.');
  }

  toggleMute() {
    if (this.isSimulating) {
      appUI.showToast('info', 'Microphone', 'Toggled microphone mute in simulation.');
      return;
    }
    const isMuted = audioEngine.toggleMute();
    const btnText = document.getElementById('btnStudioMuteText');
    if (btnText) btnText.textContent = isMuted ? 'Unmute Mic' : 'Mute Mic';
  }

  handleEngineState(state) {
    const statusEl = document.getElementById('studioCallStatus');
    const substatusEl = document.getElementById('studioCallSubstatus');
    const badgeEl = document.getElementById('studioConnectionBadge');
    const btnStart = document.getElementById('btnStudioStart');
    const btnSim = document.getElementById('btnStudioSim');
    const btnHangup = document.getElementById('btnStudioHangup');
    const btnBargein = document.getElementById('btnStudioBargein');
    const btnMute = document.getElementById('btnStudioMute');
    const timerBadge = document.getElementById('studioTimerBadge');

    if (this.orb) this.orb.setState(state);

    if (state === 'connecting') {
      if (statusEl) statusEl.textContent = 'Authorizing & Connecting...';
      if (substatusEl) substatusEl.textContent = 'Handshaking with Gemini 3.8 Live API';
      if (badgeEl) { badgeEl.className = 'status-badge status-connecting'; badgeEl.textContent = 'Connecting'; }
      if (btnStart) btnStart.disabled = true;
      if (btnSim) btnSim.disabled = true;
      if (btnHangup) btnHangup.disabled = false;
    } else if (state === 'connected' || state === 'listening') {
      if (statusEl) statusEl.textContent = 'CallMate is Listening';
      if (substatusEl) substatusEl.textContent = 'Speak in English, Telugu, or mix both';
      if (badgeEl) { badgeEl.className = 'status-badge status-connected'; badgeEl.textContent = 'In Call'; }
      if (btnStart) btnStart.disabled = true;
      if (btnSim) btnSim.disabled = true;
      if (btnHangup) btnHangup.disabled = false;
      if (btnBargein) btnBargein.disabled = false;
      if (btnMute) btnMute.disabled = false;
      if (timerBadge) timerBadge.style.display = 'inline-flex';
      this.startCallTimer();
    } else if (state === 'speaking') {
      if (statusEl) statusEl.textContent = 'CallMate Speaking';
      if (substatusEl) substatusEl.textContent = 'Synthesizing 24kHz audio output';
      if (badgeEl) { badgeEl.className = 'status-badge status-active'; badgeEl.textContent = 'Speaking'; }
    } else if (state === 'thinking') {
      if (statusEl) statusEl.textContent = 'CallMate Processing Turn';
      if (substatusEl) substatusEl.textContent = 'Evaluating conversational intent & tools';
      if (badgeEl) { badgeEl.className = 'status-badge status-connecting'; badgeEl.textContent = 'Thinking'; }
    } else if (state === 'interrupted') {
      if (statusEl) statusEl.textContent = 'Interrupted (Barge-in)';
      if (substatusEl) substatusEl.textContent = 'Flushed audio queue; listening';
    } else {
      // Disconnected
      if (statusEl) statusEl.textContent = 'Voice Stream Disconnected';
      if (substatusEl) substatusEl.textContent = 'Session ended';
      if (badgeEl) { badgeEl.className = 'status-badge status-disconnected'; badgeEl.textContent = 'Idle'; }
      if (btnStart) btnStart.disabled = false;
      if (btnSim) btnSim.disabled = false;
      if (btnHangup) btnHangup.disabled = true;
      if (btnBargein) btnBargein.disabled = true;
      if (btnMute) btnMute.disabled = true;
      if (timerBadge) timerBadge.style.display = 'none';
      this.stopCallTimer();
    }
  }

  updateLevels(source, pct) {
    if (this.waveform) this.waveform.setLevel(source, pct);
    if (this.orb) this.orb.setAudioLevel(pct);

    if (source === 'mic') {
      const fill = document.getElementById('studioMicFill');
      const text = document.getElementById('studioMicPct');
      if (fill) fill.style.width = `${pct}%`;
      if (text) text.textContent = `${pct}%`;
    } else if (source === 'spk') {
      const fill = document.getElementById('studioSpkFill');
      const text = document.getElementById('studioSpkPct');
      if (fill) fill.style.width = `${pct}%`;
      if (text) text.textContent = `${pct}%`;
    }
  }

  appendTranscript(text, type = 'model') {
    const box = document.getElementById('studioTranscriptBox');
    if (!box) return;

    const div = document.createElement('div');
    div.className = `console-entry ${type}`;
    const prefix = type === 'caller' ? '[Caller]' : '[AI]';
    div.textContent = `${prefix} ${text}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  appendConsoleLog(msg, type = 'info') {
    const box = document.getElementById('studioTranscriptBox');
    if (!box) return;

    const div = document.createElement('div');
    div.className = `console-entry ${type}`;
    const time = new Date().toLocaleTimeString();
    div.textContent = `[${time}] ${msg}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  handleToolEvent(type, name, data) {
    if (type === 'call') {
      this.appendConsoleLog(`⚡ Tool Invoked: ${name}(${JSON.stringify(data)})`, 'tool');
      appUI.showToast('info', 'Tool Invoked', `CallMate is recording message via ${name}...`);
    } else if (type === 'result') {
      this.appendConsoleLog(`✓ Tool Executed: Message recorded successfully to disk!`, 'success');
      appUI.showToast('success', 'Message Recorded', 'Caller message persisted to disk storage.');
    }
  }

  clearTranscript() {
    const box = document.getElementById('studioTranscriptBox');
    if (box) box.innerHTML = '';
  }

  startCallTimer() {
    if (this.callTimerInterval) return;
    this.callSeconds = 0;
    this.callTimerInterval = setInterval(() => {
      this.callSeconds++;
      const mins = Math.floor(this.callSeconds / 60);
      const secs = this.callSeconds % 60;
      const formatted = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
      const badge = document.getElementById('studioTimerBadge');
      if (badge) badge.textContent = formatted;
    }, 1000);
  }

  stopCallTimer() {
    if (this.callTimerInterval) {
      clearInterval(this.callTimerInterval);
      this.callTimerInterval = null;
    }
    this.callSeconds = 0;
  }
}

// Global Singleton Screen Instance
const liveCallsScreen = new LiveCallsScreen();
