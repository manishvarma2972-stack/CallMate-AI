/**
 * CallMate.ai — Knowledge Base Screen (Section 9)
 * Interface where users teach their AI voice assistant about personal facts,
 * business context, availability rules, and custom answers.
 */

class KnowledgeBaseScreen {
  constructor() {
    this.container = document.getElementById('screen-knowledge-base');
    this.activeCategory = 'all';
    this.searchQuery = '';
  }

  render() {
    if (!this.container) return;

    let items = [...appState.knowledgeBase];

    // Filter by category
    if (this.activeCategory !== 'all') {
      items = items.filter(k => k.category.toLowerCase().includes(this.activeCategory.toLowerCase()));
    }

    // Filter by search query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter(k => k.title.toLowerCase().includes(q) || k.content.toLowerCase().includes(q));
    }

    this.container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-primary); letter-spacing:-0.02em;">Knowledge Base & Memory</h2>
          <p style="font-size:0.85rem; color:var(--text-muted);">Teach CallMate facts, FAQs, business details, and custom spoken guidelines</p>
        </div>

        <button class="btn btn-primary" onclick="knowledgeBaseScreen.openAddModal()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Add Knowledge Item</span>
        </button>
      </div>

      <!-- Categories Filter Bar -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; gap:6px; background:var(--bg-surface); padding:3px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); overflow-x:auto;">
          <button class="btn btn-sm ${this.activeCategory === 'all' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="knowledgeBaseScreen.setCategory('all')">All (${appState.knowledgeBase.length})</button>
          <button class="btn btn-sm ${this.activeCategory === 'personal' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="knowledgeBaseScreen.setCategory('personal')">Personal</button>
          <button class="btn btn-sm ${this.activeCategory === 'availability' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="knowledgeBaseScreen.setCategory('availability')">Availability</button>
          <button class="btn btn-sm ${this.activeCategory === 'confidentiality' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="knowledgeBaseScreen.setCategory('confidentiality')">Privacy & Rules</button>
          <button class="btn btn-sm ${this.activeCategory === 'telugu' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="knowledgeBaseScreen.setCategory('telugu')">Telugu Cultural</button>
          <button class="btn btn-sm ${this.activeCategory === 'business' ? 'btn-primary' : 'btn-secondary'}" style="border:none;" onclick="knowledgeBaseScreen.setCategory('business')">Business</button>
        </div>

        <input type="text" class="form-input" style="width:240px; padding:6px 12px; font-size:0.82rem;" placeholder="Search memory..." oninput="knowledgeBaseScreen.handleSearch(this.value)">
      </div>

      <!-- Knowledge Cards Grid -->
      <div class="grid-2">
        ${items.length === 0 ? `
          <div class="empty-state" style="grid-column: span 2;">
            <div class="empty-icon-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>
            </div>
            <h4 class="empty-title">No Knowledge Items</h4>
            <p class="empty-subtitle">Teach your assistant customized facts so it responds accurately to common questions.</p>
            <button class="btn btn-primary btn-sm" onclick="knowledgeBaseScreen.openAddModal()">Add First Knowledge Fact</button>
          </div>
        ` : items.map(k => `
          <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <span class="pill-badge" style="font-size:0.7rem; text-transform:uppercase; font-weight:700;">${k.category}</span>
                <span style="font-size:0.7rem; color:var(--text-muted);">Updated ${k.last_updated}</span>
              </div>
              <h3 style="font-size:1.02rem; font-weight:700; color:var(--text-primary); margin-bottom:8px;">${k.title}</h3>
              <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.5;">${k.content}</p>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px; padding-top:10px; border-top:1px solid var(--border-subtle);">
              <button class="btn btn-secondary btn-sm" onclick="knowledgeBaseScreen.openEditModal('${k.id}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="knowledgeBaseScreen.deleteItem('${k.id}')">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  setCategory(cat) {
    this.activeCategory = cat;
    this.render();
  }

  handleSearch(query) {
    this.searchQuery = query.trim();
    this.render();
  }

  openAddModal() {
    const html = `
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-select" id="kbNewCategory">
          <option value="Personal Information">Personal Information</option>
          <option value="Availability & Schedule">Availability & Schedule</option>
          <option value="Confidentiality & Privacy">Confidentiality & Privacy</option>
          <option value="Multilingual Telugu Rules">Multilingual Telugu Rules</option>
          <option value="Business & Ventures">Business & Ventures</option>
          <option value="Frequently Asked Questions">Frequently Asked Questions</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Knowledge Topic / Question</label>
        <input type="text" class="form-input" id="kbNewTitle" placeholder="e.g. Office Location & Visiting Hours">
      </div>

      <div class="form-group">
        <label class="form-label">Information / Spoken Guideline</label>
        <textarea class="form-textarea" id="kbNewContent" placeholder="Describe the information CallMate should use when callers ask about this topic..."></textarea>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="appUI.closeGenericModal()">Cancel</button>
      <button class="btn btn-primary" onclick="knowledgeBaseScreen.saveNewItem()">Save to Memory</button>
    `;

    appUI.openGenericModal('Add Knowledge Item', html, footer);
  }

  saveNewItem() {
    const cat = document.getElementById('kbNewCategory').value;
    const title = document.getElementById('kbNewTitle').value.trim();
    const content = document.getElementById('kbNewContent').value.trim();

    if (!title || !content) {
      appUI.showToast('warning', 'Validation Error', 'Please provide both title and content.');
      return;
    }

    const newItem = {
      id: `kb_${Date.now()}`,
      category: cat,
      title,
      content,
      last_updated: new Date().toISOString().split('T')[0]
    };

    const updated = [newItem, ...appState.knowledgeBase];
    appState.saveKnowledgeBase(updated);
    appUI.closeGenericModal();
    appUI.showToast('success', 'Knowledge Saved', `Added "${title}" to AI memory.`);
    this.render();
  }

  openEditModal(id) {
    const item = appState.knowledgeBase.find(k => k.id === id);
    if (!item) return;

    const html = `
      <div class="form-group">
        <label class="form-label">Category</label>
        <input type="text" class="form-input" id="kbEditCategory" value="${item.category}">
      </div>

      <div class="form-group">
        <label class="form-label">Topic / Title</label>
        <input type="text" class="form-input" id="kbEditTitle" value="${item.title}">
      </div>

      <div class="form-group">
        <label class="form-label">Content</label>
        <textarea class="form-textarea" id="kbEditContent">${item.content}</textarea>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="appUI.closeGenericModal()">Cancel</button>
      <button class="btn btn-primary" onclick="knowledgeBaseScreen.saveEditedItem('${id}')">Save Changes</button>
    `;

    appUI.openGenericModal('Edit Knowledge Item', html, footer);
  }

  saveEditedItem(id) {
    const item = appState.knowledgeBase.find(k => k.id === id);
    if (!item) return;

    item.category = document.getElementById('kbEditCategory').value.trim();
    item.title = document.getElementById('kbEditTitle').value.trim();
    item.content = document.getElementById('kbEditContent').value.trim();
    item.last_updated = new Date().toISOString().split('T')[0];

    appState.saveKnowledgeBase([...appState.knowledgeBase]);
    appUI.closeGenericModal();
    appUI.showToast('success', 'Updated', 'Knowledge item successfully updated.');
    this.render();
  }

  deleteItem(id) {
    if (!confirm('Are you sure you want to remove this knowledge fact from memory?')) return;
    const updated = appState.knowledgeBase.filter(k => k.id !== id);
    appState.saveKnowledgeBase(updated);
    appUI.showToast('info', 'Deleted', 'Knowledge fact removed.');
    this.render();
  }
}

// Global Singleton Screen Instance
const knowledgeBaseScreen = new KnowledgeBaseScreen();
