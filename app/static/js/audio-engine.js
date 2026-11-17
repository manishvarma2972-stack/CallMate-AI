/**
 * CallMate.ai — Real-Time Voice Streaming Engine
 * Connects directly to FastAPI WebSocket & Gemini 3.8 Live engine.
 * Supports continuous multi-turn conversations, 16kHz PCM downsampling,
 * 24kHz speaker playback, instantaneous barge-in cutoff, and acoustic analysis.
 */

class AudioStreamEngine {
  constructor() {
    this.ws = null;
    this.micStream = null;
    this.micAudioContext = null;
    this.micSource = null;
    this.processorNode = null;
    this.micAnalyser = null;

    this.spkAudioContext = null;
    this.spkAnalyser = null;
    this.activeAudioSources = [];
    this.nextPlayTime = 0;

    this.isCalling = false;
    this.isMuted = false;
    this.turnCount = 0;
    this.currentSession = null;
    this.state = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'listening', 'speaking', 'interrupted'

    // Callbacks
    this.onStateChange = null;
    this.onTranscript = null;
    this.onLevelUpdate = null;
    this.onToolEvent = null;
    this.onLog = null;
  }

  log(message, type = 'info') {
    if (this.onLog) {
      this.onLog(message, type);
    } else {
      console.log(`[AudioEngine:${type}] ${message}`);
    }
  }

  setState(newState) {
    this.state = newState;
    if (this.onStateChange) {
      this.onStateChange(newState);
    }
  }

  // Downsample input audio buffer to 16000 Hz if hardware audio context runs at 44.1k or 48k
  resampleTo16k(inputBuffer, inputSampleRate) {
    if (inputSampleRate === 16000) {
      return inputBuffer;
    }
    const ratio = inputSampleRate / 16000;
    const newLength = Math.round(inputBuffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetInput = 0;
    while (offsetResult < result.length) {
      const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
      let accum = 0, count = 0;
      for (let i = offsetInput; i < nextOffsetInput && i < inputBuffer.length; i++) {
        accum += inputBuffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : inputBuffer[offsetInput];
      offsetResult++;
      offsetInput = nextOffsetInput;
    }
    return result;
  }

  async startCall(languageHint = 'en') {
    if (this.isCalling) return;

    this.setState('connecting');
    this.log(`Initiating authenticated voice session with language_hint="${languageHint}"...`, 'info');

    try {
      // 1. Provision signed session token via POST /api/v1/voice/sessions
      const sessionData = await apiClient.createVoiceSession(appState.ownerApiKey, languageHint);
      this.currentSession = sessionData;
      this.turnCount = 0;

      this.log(`Session authorized: ID=${sessionData.session_id.slice(0, 8)}... Token expires in ${sessionData.expires_at - Math.floor(Date.now()/1000)}s`, 'success');

      // 2. Initialize 24kHz Web Audio Output Context for speaker playback
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      try {
        this.spkAudioContext = new AudioCtx({ sampleRate: 24000 });
      } catch {
        this.spkAudioContext = new AudioCtx();
      }
      if (this.spkAudioContext.state === 'suspended') {
        await this.spkAudioContext.resume();
      }
      this.spkAnalyser = this.spkAudioContext.createAnalyser();
      this.spkAnalyser.fftSize = 64;
      this.nextPlayTime = this.spkAudioContext.currentTime;
      this.activeAudioSources = [];

      // 3. Form target WebSocket URL
      const loc = window.location;
      const wsProto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      const targetWsUrl = `${wsProto}//${loc.host}${sessionData.ws_url}?token=${encodeURIComponent(sessionData.token)}`;

      this.log(`Connecting WebSocket stream to ${sessionData.ws_url}...`, 'info');
      this.ws = new WebSocket(targetWsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = async () => {
        this.log('WebSocket handshake accepted by CallMate AI backend.', 'success');
        this.isCalling = true;
        this.setState('connected');
        await this.startMicrophoneCapture();
      };

      this.ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          this.handleServerControlMessage(event.data);
        } else if (event.data instanceof ArrayBuffer) {
          this.handleIncomingAudioChunk(event.data);
        }
      };

      this.ws.onerror = (err) => {
        this.log(`WebSocket error: ${err.message || 'Stream interrupted'}`, 'error');
      };

      this.ws.onclose = (event) => {
        this.log(`WebSocket closed: code=${event.code}, reason="${event.reason || 'Session ended'}"`, 'warn');
        this.stopCall();
      };

    } catch (err) {
      this.log(`Voice call setup failed: ${err.message}`, 'error');
      this.stopCall();
      throw err;
    }
  }

  async startMicrophoneCapture() {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.micAudioContext = new AudioCtx();
      this.micSource = this.micAudioContext.createMediaStreamSource(this.micStream);
      
      this.micAnalyser = this.micAudioContext.createAnalyser();
      this.micAnalyser.fftSize = 64;
      this.micSource.connect(this.micAnalyser);

      // ScriptProcessor captures 1024-sample frames
      this.processorNode = this.micAudioContext.createScriptProcessor(1024, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isCalling || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        if (this.isMuted) return;

        const inputFloat32 = e.inputBuffer.getChannelData(0);

        // Downsample to 16kHz Linear PCM
        const pcmFloat16k = this.resampleTo16k(inputFloat32, this.micAudioContext.sampleRate);

        // Convert Float32 to 16-bit signed Linear PCM
        const pcm16 = new Int16Array(pcmFloat16k.length);
        let sumSquares = 0;
        for (let i = 0; i < pcmFloat16k.length; i++) {
          const s = Math.max(-1, Math.min(1, pcmFloat16k[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          sumSquares += s * s;
        }

        // Inbound mic audio level calculation
        const rms = Math.sqrt(sumSquares / pcmFloat16k.length);
        const levelPct = Math.min(100, Math.round(rms * 280));
        
        if (this.onLevelUpdate) {
          this.onLevelUpdate('mic', levelPct);
        }

        // Send binary PCM frame over WebSocket
        this.ws.send(pcm16.buffer);
      };

      this.micSource.connect(this.processorNode);
      this.processorNode.connect(this.micAudioContext.destination);

      this.log(`Microphone streaming active (${this.micAudioContext.sampleRate}Hz hardware -> 16000Hz PCM stream).`, 'success');
      this.setState('listening');
    } catch (err) {
      this.log(`Microphone access error: ${err.message}`, 'error');
      throw err;
    }
  }

  handleServerControlMessage(text) {
    try {
      const msg = JSON.parse(text);
      if (msg.event === 'session_ready') {
        this.log('[Gemini 3.8 Live] Audio pipeline ready. CallMate is listening...', 'success');
        this.setState('listening');
      } else if (msg.event === 'incoming_call') {
        const callerName = msg.details?.caller_name || 'Incoming Caller';
        const phone = msg.details?.phone_number || '+91 00000 00000';
        const lang = msg.details?.language || 'English + Telugu';
        this.log(`[Incoming Call] ${callerName} (${phone})`, 'info');
        if (typeof appUI !== 'undefined') {
          appUI.showIncomingCallNotification({
            caller_name: callerName,
            phone_number: phone,
            language: lang,
            urgency: msg.details?.urgency || 'normal',
            onAnswer: () => {
              this.setState('listening');
              if (typeof appState !== 'undefined') appState.navigateTo('live-calls');
            },
            onDecline: () => {
              this.stopCall();
            }
          });
        }
      } else if (msg.event === 'transcript') {
        const chunk = msg.details?.text || '';
        this.log(`[AI Speech] ${chunk}`, 'model');
        if (this.onTranscript) {
          this.onTranscript(chunk);
        }
      } else if (msg.event === 'interrupted') {
        this.log(`[Barge-in] Caller interrupted speaking. Dropped ${msg.details?.dropped_frames || 0} buffered frames.`, 'warn');
        this.flushAudioPlayback();
        this.setState('interrupted');
        setTimeout(() => {
          if (this.isCalling) this.setState('listening');
        }, 300);
      } else if (msg.event === 'turn_complete') {
        this.turnCount++;
        this.log(`[Turn ${this.turnCount} Complete] Finished speaking turn. Ready for next turn...`, 'success');
        this.setState('listening');
      } else if (msg.event === 'tool_call') {
        const toolName = msg.details?.name || 'unknown';
        const args = msg.details?.args || {};
        this.log(`[Tool Call] Assistant invoked tool: ${toolName}(${JSON.stringify(args)})`, 'tool');
        if (this.onToolEvent) {
          this.onToolEvent('call', toolName, args);
        }
      } else if (msg.event === 'tool_result') {
        const result = msg.details?.result || {};
        this.log(`[Tool Result] ${JSON.stringify(result)}`, 'success');
        if (this.onToolEvent) {
          this.onToolEvent('result', null, result);
        }
        // Refresh real persisted messages in background
        apiClient.getMessages().then(data => {
          appState.setRealMessages(data.messages);
        }).catch(() => {});
      } else {
        this.log(`[Control Event] ${text}`, 'info');
      }
    } catch {
      this.log(`[Raw Control] ${text}`, 'info');
    }
  }

  handleIncomingAudioChunk(arrayBuffer) {
    if (!this.spkAudioContext) return;

    this.setState('speaking');

    const pcm16 = new Int16Array(arrayBuffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }

    // Outbound speaker level meter
    let sumSquares = 0;
    for (let i = 0; i < float32.length; i++) sumSquares += float32[i] * float32[i];
    const rms = Math.sqrt(sumSquares / float32.length);
    const levelPct = Math.min(100, Math.round(rms * 280));
    
    if (this.onLevelUpdate) {
      this.onLevelUpdate('spk', levelPct);
    }

    // Schedule 24kHz single-channel PCM audio buffer
    const buffer = this.spkAudioContext.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = this.spkAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.spkAnalyser);
    this.spkAnalyser.connect(this.spkAudioContext.destination);

    this.activeAudioSources.push(source);
    source.onended = () => {
      const idx = this.activeAudioSources.indexOf(source);
      if (idx !== -1) this.activeAudioSources.splice(idx, 1);
      if (this.activeAudioSources.length === 0 && this.isCalling) {
        if (this.onLevelUpdate) this.onLevelUpdate('spk', 0);
      }
    };

    const currentTime = this.spkAudioContext.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime;
    }
    source.start(this.nextPlayTime);
    this.nextPlayTime += buffer.duration;
  }

  flushAudioPlayback() {
    for (const src of this.activeAudioSources) {
      try {
        src.stop();
      } catch {}
    }
    this.activeAudioSources = [];
    if (this.spkAudioContext) {
      this.nextPlayTime = this.spkAudioContext.currentTime;
    }
    if (this.onLevelUpdate) {
      this.onLevelUpdate('spk', 0);
    }
  }

  sendInterruption() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'barge_in' }));
      this.flushAudioPlayback();
      this.log('Dispatched manual barge-in signal to backend.', 'warn');
      this.setState('interrupted');
      setTimeout(() => {
        if (this.isCalling) this.setState('listening');
      }, 300);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.log(`Microphone ${this.isMuted ? 'Muted' : 'Unmuted'}.`, 'info');
    if (this.isMuted && this.onLevelUpdate) {
      this.onLevelUpdate('mic', 0);
    }
    return this.isMuted;
  }

  stopCall() {
    this.isCalling = false;
    this.setState('disconnected');
    if (typeof appUI !== 'undefined') {
      appUI.dismissIncomingCallNotification();
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micAudioContext) {
      this.micAudioContext.close().catch(() => {});
      this.micAudioContext = null;
    }

    this.flushAudioPlayback();

    if (this.spkAudioContext) {
      this.spkAudioContext.close().catch(() => {});
      this.spkAudioContext = null;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    if (this.onLevelUpdate) {
      this.onLevelUpdate('mic', 0);
      this.onLevelUpdate('spk', 0);
    }

    this.log('Voice call completed and resources cleanly released.', 'info');
  }
}

// Global Singleton Audio Engine
const audioEngine = new AudioStreamEngine();
