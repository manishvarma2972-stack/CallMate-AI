/**
 * CallMate.ai — Contacts Management Screen (Section 11)
 * VIP caller recognition, relationship tagging, custom handling instructions,
 * and language preferences per contact.
 */

class ContactsScreen {
  constructor() {
    this.container = document.getElementById('screen-contacts');
    this.filterPriority = 'all';
    this.searchQuery = '';
  }

  render() {
    if (!this.container) return;

    let contacts = [...appState.contacts];

    if (this.filterPriority !== 'all') {
      contacts = contacts.filter(c => c.priority === this.filterPriority);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      contacts = contacts.filter(c => 
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.relationship.toLowerCase().includes(q)
      );
    }

    this.container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-primary); letter-spacing:-0.02em;">Contacts & VIP Handling Rules</h2>
          <p style="font-size:0.85rem; color:var(--text-muted);">Define custom greeting instructions, language preferences, and VIP escalation priorities</p>
        </div>

        <button class="btn btn-primary" onclick="contactsScreen.openAddModal()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Add New Contact</span>
        </button>
      </div>

      <!-- Filters & Search Bar -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; gap:6px; background:var(--bg-surface); padding:3px; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
          <button class="btn btn-sm ${this.filterPriority === 'all' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="contactsScreen.setPriorityFilter('all')">All (${appState.contacts.length})</button>
          <button class="btn btn-sm ${this.filterPriority === 'vip' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="contactsScreen.setPriorityFilter('vip')">VIP Priority</button>
          <button class="btn btn-sm ${this.filterPriority === 'standard' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="contactsScreen.setPriorityFilter('standard')">Standard</button>
          <button class="btn btn-sm ${this.filterPriority === 'blocked' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="contactsScreen.setPriorityFilter('blocked')">Blocked / Spam</button>
        </div>

        <input type="text" class="form-input" style="width:240px; padding:6px 12px; font-size:0.82rem;" placeholder="Search contacts..." oninput="contactsScreen.handleSearch(this.value)">
      </div>

      <!-- Contacts Table -->
      <div class="card">
        <div class="table-container">
          ${contacts.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <h4 class="empty-title">No Contacts Found</h4>
              <p class="empty-subtitle">Add contacts with custom handling instructions for your AI caller assistant.</p>
              <button class="btn btn-primary btn-sm" onclick="contactsScreen.openAddModal()">Add First Contact</button>
            </div>
          ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Contact Name</th>
                  <th>Phone Number</th>
                  <th>Relationship</th>
                  <th>Priority</th>
                  <th>Preferred Language</th>
                  <th>Custom AI Instructions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${contacts.map(c => `
                  <tr>
                    <td>
                      <div class="caller-cell">
                        <div class="caller-avatar" style="background:${c.priority === 'vip' ? 'var(--primary-soft)' : 'var(--bg-elevated)'}; color:${c.priority === 'vip' ? 'var(--primary)' : 'var(--text-secondary)'};">
                          ${c.name.charAt(0)}
                        </div>
                        <span class="caller-name">${c.name}</span>
                      </div>
                    </td>
                    <td>
                      <span style="font-family:var(--font-mono); font-size:0.82rem; color:var(--text-secondary);">${c.phone}</span>
                    </td>
                    <td>
                      <span style="font-size:0.82rem; color:var(--text-muted);">${c.relationship}</span>
                    </td>
                    <td>
                      <span class="pill-badge" style="font-size:0.7rem; font-weight:700; text-transform:uppercase; background:var(--${c.priority === 'vip' ? 'primary' : c.priority === 'blocked' ? 'danger' : 'secondary'}-soft); color:var(--${c.priority === 'vip' ? 'primary' : c.priority === 'blocked' ? 'danger' : 'secondary'});">
                        ${c.priority}
                      </span>
                    </td>
                    <td>
                      <span class="pill-badge" style="font-size:0.72rem;">
                        ${c.preferred_language === 'te' ? 'తెలుగు (Telugu)' : c.preferred_language === 'en' ? 'English' : 'Auto Detect'}
                      </span>
                    </td>
                    <td>
                      <p style="font-size:0.8rem; color:var(--text-secondary); max-width:280px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${c.custom_instructions}
                      </p>
                    </td>
                    <td>
                      <div style="display:flex; gap:6px;">
                        <button class="btn btn-secondary btn-sm" style="padding:3px 8px;" onclick="contactsScreen.openEditModal('${c.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" style="padding:3px 8px;" onclick="contactsScreen.deleteContact('${c.id}')">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
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

  setPriorityFilter(priority) {
    this.filterPriority = priority;
    this.render();
  }

  handleSearch(query) {
    this.searchQuery = query.trim();
    this.render();
  }

  openAddModal() {
    const html = `
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input type="text" class="form-input" id="cntNewName" placeholder="e.g. Ramesh Kumar">
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="text" class="form-input" id="cntNewPhone" placeholder="+91 98765 43210">
        </div>

        <div class="form-group">
          <label class="form-label">Relationship / Role</label>
          <input type="text" class="form-input" id="cntNewRel" placeholder="e.g. Legal Counsel / Business Partner">
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Priority Level</label>
          <select class="form-select" id="cntNewPriority">
            <option value="vip">VIP (Urgent Callback / Direct Notify)</option>
            <option value="standard" selected>Standard (Take Detailed Message)</option>
            <option value="blocked">Blocked / Spam (Decline Politely)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Preferred Language</label>
          <select class="form-select" id="cntNewLang">
            <option value="auto" selected>Auto Detect (English / Telugu)</option>
            <option value="te">Telugu (తెలుగు)</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Custom Handling Instructions for AI</label>
        <textarea class="form-textarea" id="cntNewInstructions" placeholder="Specify exact guidance for when this person calls (e.g. 'Ask for deed documents and confirm callback after 6 PM')."></textarea>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="appUI.closeGenericModal()">Cancel</button>
      <button class="btn btn-primary" onclick="contactsScreen.saveNewContact()">Add Contact</button>
    `;

    appUI.openGenericModal('Add Contact', html, footer);
  }

  saveNewContact() {
    const name = document.getElementById('cntNewName').value.trim();
    const phone = document.getElementById('cntNewPhone').value.trim();
    const rel = document.getElementById('cntNewRel').value.trim();
    const priority = document.getElementById('cntNewPriority').value;
    const lang = document.getElementById('cntNewLang').value;
    const instructions = document.getElementById('cntNewInstructions').value.trim();

    if (!name || !phone) {
      appUI.showToast('warning', 'Validation', 'Name and Phone Number are required.');
      return;
    }

    const newContact = {
      id: `cnt_${Date.now()}`,
      name,
      phone,
      relationship: rel || 'Contact',
      priority,
      preferred_language: lang,
      custom_instructions: instructions || 'Standard message recording.',
      last_call: new Date().toISOString()
    };

    const updated = [newContact, ...appState.contacts];
    appState.saveContacts(updated);
    appUI.closeGenericModal();
    appUI.showToast('success', 'Contact Created', `Added ${name} to contacts directory.`);
    this.render();
  }

  openEditModal(id) {
    const contact = appState.contacts.find(c => c.id === id);
    if (!contact) return;

    const html = `
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input type="text" class="form-input" id="cntEditName" value="${contact.name}">
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="text" class="form-input" id="cntEditPhone" value="${contact.phone}">
        </div>

        <div class="form-group">
          <label class="form-label">Relationship</label>
          <input type="text" class="form-input" id="cntEditRel" value="${contact.relationship}">
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-select" id="cntEditPriority">
            <option value="vip" ${contact.priority === 'vip' ? 'selected' : ''}>VIP Priority</option>
            <option value="standard" ${contact.priority === 'standard' ? 'selected' : ''}>Standard</option>
            <option value="blocked" ${contact.priority === 'blocked' ? 'selected' : ''}>Blocked</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Preferred Language</label>
          <select class="form-select" id="cntEditLang">
            <option value="auto" ${contact.preferred_language === 'auto' ? 'selected' : ''}>Auto Detect</option>
            <option value="te" ${contact.preferred_language === 'te' ? 'selected' : ''}>Telugu</option>
            <option value="en" ${contact.preferred_language === 'en' ? 'selected' : ''}>English</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Custom Handling Instructions</label>
        <textarea class="form-textarea" id="cntEditInstructions">${contact.custom_instructions}</textarea>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="appUI.closeGenericModal()">Cancel</button>
      <button class="btn btn-primary" onclick="contactsScreen.saveEditedContact('${id}')">Save Changes</button>
    `;

    appUI.openGenericModal('Edit Contact', html, footer);
  }

  saveEditedContact(id) {
    const contact = appState.contacts.find(c => c.id === id);
    if (!contact) return;

    contact.name = document.getElementById('cntEditName').value.trim();
    contact.phone = document.getElementById('cntEditPhone').value.trim();
    contact.relationship = document.getElementById('cntEditRel').value.trim();
    contact.priority = document.getElementById('cntEditPriority').value;
    contact.preferred_language = document.getElementById('cntEditLang').value;
    contact.custom_instructions = document.getElementById('cntEditInstructions').value.trim();

    appState.saveContacts([...appState.contacts]);
    appUI.closeGenericModal();
    appUI.showToast('success', 'Updated', 'Contact updated successfully.');
    this.render();
  }

  deleteContact(id) {
    if (!confirm('Are you sure you want to remove this contact?')) return;
    const updated = appState.contacts.filter(c => c.id !== id);
    appState.saveContacts(updated);
    appUI.showToast('info', 'Deleted', 'Contact removed.');
    this.render();
  }
}

// Global Singleton Screen Instance
const contactsScreen = new ContactsScreen();
