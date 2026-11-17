/**
 * CallMate.ai — 8-Step Interactive Onboarding Wizard (Section 14)
 * Guides new users through assistant setup, bilingual language configuration,
 * voice selection, screening policies, phone forwarding, and test activation.
 */

class OnboardingWizard {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 8;
    this.isOpen = false;
  }

  openWizard() {
    this.isOpen = true;
    this.currentStep = 1;
    const backdrop = document.getElementById('wizardModalBackdrop');
    if (backdrop) backdrop.classList.add('open');
    this.renderStep();
  }

  closeWizard() {
    this.isOpen = false;
    const backdrop = document.getElementById('wizardModalBackdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.renderStep();
    } else {
      // Completed onboarding
      this.closeWizard();
      appUI.showToast('success', 'Setup Complete!', 'CallMate AI caller assistant is now fully configured and active.');
      appState.navigateTo('overview');
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.renderStep();
    }
  }

  renderStep() {
    const body = document.getElementById('wizardBody');
    const footer = document.getElementById('wizardFooter');
    const btnPrev = document.getElementById('wizardBtnPrev');
    const btnNext = document.getElementById('wizardBtnNext');

    if (!body || !footer) return;

    if (btnPrev) btnPrev.style.display = this.currentStep === 1 ? 'none' : 'inline-flex';
    if (btnNext) {
      btnNext.textContent = this.currentStep === this.totalSteps ? 'Activate Assistant 🎉' : 'Next Step →';
    }

    // Step Progress Indicator
    const progressHtml = `
      <div class="wizard-progress">
        ${[1, 2, 3, 4, 5, 6, 7, 8].map(s => `
          <div class="wizard-step-indicator ${s === this.currentStep ? 'active' : s < this.currentStep ? 'completed' : ''}">
            <div class="step-circle">${s < this.currentStep ? '✓' : s}</div>
            <span class="step-label">Step ${s}</span>
          </div>
        `).join('')}
      </div>
    `;

    let stepHtml = '';

    switch (this.currentStep) {
      case 1:
        stepHtml = `
          <div style="text-align:center; padding:10px 0;">
            <div class="brand-icon-wrapper" style="width:56px; height:56px; margin:0 auto 16px auto;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <h3 style="font-size:1.3rem; font-weight:800; color:var(--text-primary); margin-bottom:8px;">Welcome to CallMate.ai</h3>
            <p style="font-size:0.95rem; color:var(--primary); font-weight:600; margin-bottom:12px;">Your AI. Your Calls. Your Control.</p>
            <p style="font-size:0.88rem; color:var(--text-secondary); max-width:440px; margin:0 auto; line-height:1.5;">
              CallMate is your personal AI caller assistant that screens calls, understands natural conversations in English and Telugu, records messages, and protects your private time.
            </p>
          </div>
        `;
        break;

      case 2:
        stepHtml = `
          <div>
            <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-primary); margin-bottom:6px;">Step 2: Create Your AI Assistant</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">Set your assistant's identity and confirm the owner display name.</p>
            
            <div class="form-group">
              <label class="form-label">Assistant Name</label>
              <input type="text" class="form-input" id="wizAssistantName" value="${appState.assistantConfig.receptionist_name}">
            </div>

            <div class="form-group">
              <label class="form-label">Owner Name (Your Name)</label>
              <input type="text" class="form-input" id="wizOwnerName" value="${appState.assistantConfig.owner_name}">
            </div>
          </div>
        `;
        break;

      case 3:
        stepHtml = `
          <div>
            <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-primary); margin-bottom:6px;">Step 3: Choose Assistant Language</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">Select how CallMate recognizes and responds to caller languages.</p>

            <div style="display:flex; flex-direction:column; gap:10px;">
              <label class="card" style="padding:12px; cursor:pointer; background:var(--primary-soft); border-color:var(--primary);">
                <input type="radio" name="wizLang" value="bilingual" checked style="margin-right:8px;">
                <strong style="color:var(--text-primary);">Bilingual: English + Telugu (తెలుగు) — Recommended</strong>
                <p style="font-size:0.78rem; color:var(--text-secondary); margin-top:4px;">Automatically detects Telugu or English speech and supports code-switching.</p>
              </label>

              <label class="card" style="padding:12px; cursor:pointer;">
                <input type="radio" name="wizLang" value="en" style="margin-right:8px;">
                <strong style="color:var(--text-primary);">English Only</strong>
                <p style="font-size:0.78rem; color:var(--text-secondary); margin-top:4px;">Converses strictly in formal English.</p>
              </label>

              <label class="card" style="padding:12px; cursor:pointer;">
                <input type="radio" name="wizLang" value="te" style="margin-right:8px;">
                <strong style="color:var(--text-primary);">Telugu Only (తెలుగు మాత్రమే)</strong>
                <p style="font-size:0.78rem; color:var(--text-secondary); margin-top:4px;">Greets and interacts in respectful Telugu with honorifics.</p>
              </label>
            </div>
          </div>
        `;
        break;

      case 4:
        stepHtml = `
          <div>
            <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-primary); margin-bottom:6px;">Step 4: Configure Voice & Personality</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">Select a prebuilt Gemini 3.8 Live voice persona.</p>

            <div class="persona-selector-grid">
              <div class="persona-card selected">
                <div class="persona-name">Aoede</div>
                <div style="font-size:0.72rem; color:var(--primary);">Female • Soprano</div>
                <div class="persona-desc">Warm, polished, executive assistant.</div>
              </div>
              <div class="persona-card">
                <div class="persona-name">Charon</div>
                <div style="font-size:0.72rem; color:var(--secondary);">Male • Baritone</div>
                <div class="persona-desc">Deep, authoritative and calm.</div>
              </div>
              <div class="persona-card">
                <div class="persona-name">Kore</div>
                <div style="font-size:0.72rem; color:var(--primary);">Female • Clear</div>
                <div class="persona-desc">Empathetic, clear, and reassuring.</div>
              </div>
            </div>
          </div>
        `;
        break;

      case 5:
        stepHtml = `
          <div>
            <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-primary); margin-bottom:6px;">Step 5: Incoming Call Handling</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">Determine when CallMate answers and takes messages.</p>

            <div class="form-group">
              <label class="form-label">Screening Behavior</label>
              <select class="form-select">
                <option selected>Answer all incoming calls & take messages</option>
                <option>Screen unknown numbers & pass VIP contacts</option>
                <option>Active only during working hours (9 AM - 6 PM)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="switch-container">
                <span style="font-weight:600; color:var(--text-primary);">Emergency Call Transfer</span>
                <div class="switch"><input type="checkbox" checked><span class="switch-slider"></span></div>
              </label>
            </div>
          </div>
        `;
        break;

      case 6:
        stepHtml = `
          <div>
            <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-primary); margin-bottom:6px;">Step 6: Connect Phone Forwarding</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">Forward unanswered cellular calls to CallMate's virtual assistant gateway.</p>

            <div style="background:var(--bg-elevated); border:1px solid var(--border-card); border-radius:var(--radius-md); padding:14px; margin-bottom:14px;">
              <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Dial from your phone:</span>
              <div style="font-family:var(--font-mono); font-size:1rem; color:var(--primary); font-weight:700; margin:6px 0;">*401*4068129900</div>
              <p style="font-size:0.75rem; color:var(--text-secondary);">For Jio / Airtel subscribers. US carriers use *72.</p>
            </div>

            <div style="font-size:0.75rem; color:var(--warning); display:flex; align-items:center; gap:6px;">
              <span>⚠️ Status: Virtual PBX ready; awaiting cellular carrier forwarding confirmation.</span>
            </div>
          </div>
        `;
        break;

      case 7:
        stepHtml = `
          <div>
            <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-primary); margin-bottom:6px;">Step 7: Test the Assistant</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">Verify acoustic microphone capture or test conversational Telugu prompts.</p>

            <div class="card" style="padding:16px; background:var(--bg-elevated); text-align:center;">
              <p style="font-size:0.9rem; color:var(--text-primary); margin-bottom:10px;">
                "నమస్కారం! మనీష్ వర్మ గారు ఉన్నారా?"
              </p>
              <button class="btn btn-primary btn-sm" onclick="onboardingWizard.closeWizard(); appState.navigateTo('live-calls');">
                Open Live Voice Studio
              </button>
            </div>
          </div>
        `;
        break;

      case 8:
        stepHtml = `
          <div style="text-align:center; padding:16px 0;">
            <div style="font-size:3rem; margin-bottom:12px;">🚀</div>
            <h3 style="font-size:1.3rem; font-weight:800; color:var(--text-primary); margin-bottom:8px;">Ready to Launch CallMate.ai!</h3>
            <p style="font-size:0.88rem; color:var(--text-secondary); max-width:440px; margin:0 auto; line-height:1.5;">
              Your personal AI caller assistant is configured for <strong>${appState.assistantConfig.owner_name}</strong>. It is ready to take messages in English and Telugu and screen calls securely.
            </p>
          </div>
        `;
        break;
    }

    body.innerHTML = `
      ${progressHtml}
      ${stepHtml}
    `;
  }
}

// Global Singleton Wizard Instance
const onboardingWizard = new OnboardingWizard();
