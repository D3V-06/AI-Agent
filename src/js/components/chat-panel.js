/**
 * Chat Panel Component
 * Controls chat header, welcome screen suggestions, message rendering, streaming, and message actions.
 */
import { StorageManager } from '../storage.js';
import { N8nService } from '../n8n-service.js';
import { renderMarkdown } from '../markdown.js';

export class ChatPanelComponent {
  constructor({ onSendMessage, onRegenerateMessage, onOpenSettings, onToggleSidebar }) {
    this.onSendMessage = onSendMessage;
    this.onRegenerateMessage = onRegenerateMessage;
    this.onOpenSettings = onOpenSettings;
    this.onToggleSidebar = onToggleSidebar;

    this.headerEl = document.getElementById('chat-header');
    this.scrollAreaEl = document.getElementById('chat-scroll-area');
    this.innerAreaEl = document.getElementById('chat-inner-area');
    this.statusBadgeEl = document.getElementById('webhook-status-badge');
    this.statusTextEl = document.getElementById('webhook-status-text');
    this.btnHeaderSettings = document.getElementById('btn-header-settings');
    this.btnHeaderExport = document.getElementById('btn-header-export');
    this.btnHeaderClear = document.getElementById('btn-header-clear');
    this.btnMobileMenu = document.getElementById('btn-mobile-menu');

    this.currentStreamingMsgEl = null;

    this.init();
  }

  init() {
    // Mobile menu toggle
    if (this.btnMobileMenu) {
      this.btnMobileMenu.addEventListener('click', () => {
        this.onToggleSidebar();
      });
    }

    // Settings button
    if (this.btnHeaderSettings) {
      this.btnHeaderSettings.addEventListener('click', () => {
        this.onOpenSettings();
      });
    }

    // Clear messages button
    if (this.btnHeaderClear) {
      this.btnHeaderClear.addEventListener('click', () => {
        const activeId = StorageManager.getActiveId();
        if (!activeId) return;

        const executeClear = () => {
          StorageManager.clearActiveConversationMessages(activeId);
          this.renderMessages();
          window.showToast('Conversation cleared', 'info');
        };

        if (window.openConfirmModal) {
          window.openConfirmModal({
            title: 'Clear Messages',
            message: 'Are you sure you want to clear all messages in this conversation? This action cannot be undone.',
            confirmText: 'Clear',
            danger: true,
            onConfirm: executeClear
          });
        } else {
          executeClear();
        }
      });
    }

    // Export button
    if (this.btnHeaderExport) {
      this.btnHeaderExport.addEventListener('click', () => {
        this.exportConversation();
      });
    }

    // Global copy code & message action delegations
    this.scrollAreaEl.addEventListener('click', (e) => {
      // Code copy button
      const copyBtn = e.target.closest('.btn-copy-code');
      if (copyBtn) {
        this.handleCopyCode(copyBtn);
        return;
      }

      // Message copy button
      const msgCopyBtn = e.target.closest('.btn-msg-copy');
      if (msgCopyBtn) {
        this.handleCopyMessage(msgCopyBtn);
        return;
      }

      // Message delete button
      const deleteMsgBtn = e.target.closest('.btn-msg-delete');
      if (deleteMsgBtn) {
        const msgId = deleteMsgBtn.getAttribute('data-msg-id');
        this.handleDeleteMessage(msgId);
        return;
      }

      // Message regenerate
      const regenBtn = e.target.closest('.btn-msg-regenerate');
      if (regenBtn) {
        this.onRegenerateMessage();
        return;
      }

      // Suggestion card click
      const card = e.target.closest('.suggestion-card');
      if (card) {
        const prompt = card.getAttribute('data-prompt');
        if (prompt) {
          this.onSendMessage(prompt);
        }
      }
    });

    this.updateWebhookStatus();
  }

  updateWebhookStatus() {
    if (!this.statusBadgeEl || !this.statusTextEl) return;

    const url = N8nService.getWebhookUrl();
    this.statusBadgeEl.classList.remove('status-warning', 'status-offline');

    if (!url) {
      this.statusBadgeEl.classList.add('status-offline');
      this.statusTextEl.textContent = 'Unconfigured';
    } else if (N8nService.isTestWebhook(url)) {
      this.statusBadgeEl.classList.add('status-warning');
      this.statusTextEl.textContent = 'n8n Test Mode';
    } else {
      this.statusTextEl.textContent = 'n8n Connected';
    }
  }

  renderMessages() {
    const activeId = StorageManager.getActiveId();
    const conv = StorageManager.getConversation(activeId);
    this.currentStreamingMsgEl = null;

    if (!conv || !conv.messages || conv.messages.length === 0) {
      this.renderWelcomeScreen();
      return;
    }

    const html = `
      <div class="messages-list" role="log" aria-live="polite">
        ${conv.messages.map((m, idx) => this.renderMessageItem(m, idx)).join('')}
      </div>
    `;

    this.innerAreaEl.innerHTML = html;
    this.scrollToBottom(false);
  }

  renderWelcomeScreen() {
    this.innerAreaEl.innerHTML = `
      <div class="welcome-screen">
        <div class="welcome-icon-box" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
        <h1 class="welcome-title">Student Deadline & Risk Agent</h1>
        <p class="welcome-desc">
          Monitor attendance and GPA indicators, track visa compliance deadlines, and review student support interventions.
        </p>

        <div class="suggestions-grid">
          <button type="button" class="suggestion-card" data-prompt="Check the risk status of international students with low attendance or pending visa holds.">
            <div class="suggestion-header">
              <div class="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <svg class="suggestion-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
            <div class="suggestion-title">Check Student Risk Status</div>
            <div class="suggestion-subtitle">Query academic standing, attendance rates, and visa compliance.</div>
          </button>

          <button type="button" class="suggestion-card" data-prompt="List all upcoming critical I-20 and SEVIS registration deadlines for international students.">
            <div class="suggestion-header">
              <div class="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <svg class="suggestion-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
            <div class="suggestion-title">Visa & Compliance Deadlines</div>
            <div class="suggestion-subtitle">Review document submission dates and registration milestones.</div>
          </button>

          <button type="button" class="suggestion-card" data-prompt="Assess academic standing metrics: GPA distributions and attendance trends for at-risk cohorts.">
            <div class="suggestion-header">
              <div class="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </div>
              <svg class="suggestion-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
            <div class="suggestion-title">Assess Academic Standing</div>
            <div class="suggestion-subtitle">Check credit minimums, GPA benchmarks, and risk tiers.</div>
          </button>

          <button type="button" class="suggestion-card" data-prompt="Generate an advisor intervention report for students currently flagged in the High Risk tier.">
            <div class="suggestion-header">
              <div class="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <svg class="suggestion-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
            <div class="suggestion-title">Generate Intervention Report</div>
            <div class="suggestion-subtitle">Summarize high-risk students and recommended actions.</div>
          </button>
        </div>
      </div>
    `;
  }

  renderMessageItem(message, index) {
    const msgId = message.id || `msg-${index}`;
    if (message.role === 'user') {
      return `
        <div class="message-item user" id="${msgId}">
          <div class="user-bubble-wrapper">
            <div class="user-bubble">${this.escapeHtml(message.content)}</div>
            <div class="user-meta-row">
              <span class="message-time">${this.formatTime(message.timestamp)}</span>
              <button type="button" class="btn-msg-delete-user btn-msg-delete" data-msg-id="${msgId}" title="Delete message" aria-label="Delete message">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      const renderedContent = renderMarkdown(message.content);

      return `
        <div class="message-item assistant" id="${msgId}">
          <div class="assistant-avatar" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <div class="assistant-content-wrapper">
            <div class="assistant-name-bar">
              <span class="assistant-label">Risk Agent</span>
              <span class="message-time">${this.formatTime(message.timestamp)}</span>
            </div>
            <div class="assistant-markdown">${renderedContent}</div>
            <div class="message-actions">
              <button type="button" class="btn-msg-action btn-msg-copy" title="Copy response" aria-label="Copy response">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy</span>
              </button>
              <button type="button" class="btn-msg-action btn-msg-regenerate" title="Regenerate response" aria-label="Regenerate response">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                <span>Retry</span>
              </button>
              <button type="button" class="btn-msg-action btn-msg-delete" data-msg-id="${msgId}" title="Delete response" aria-label="Delete response">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }

  appendUserMessage(text, msgId = `msg-${Date.now()}`) {
    let msgList = this.innerAreaEl.querySelector('.messages-list');
    if (!msgList) {
      this.innerAreaEl.innerHTML = `<div class="messages-list" role="log" aria-live="polite"></div>`;
      msgList = this.innerAreaEl.querySelector('.messages-list');
    }

    const tempDiv = document.createElement('div');
    tempDiv.className = 'message-item user';
    tempDiv.id = msgId;
    tempDiv.innerHTML = `
      <div class="user-bubble-wrapper">
        <div class="user-bubble">${this.escapeHtml(text)}</div>
        <div class="user-meta-row">
          <span class="message-time">Just now</span>
          <button type="button" class="btn-msg-delete-user btn-msg-delete" data-msg-id="${msgId}" title="Delete message" aria-label="Delete message">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
    msgList.appendChild(tempDiv);
    this.scrollToBottom(true);
  }

  showTypingIndicator() {
    let msgList = this.innerAreaEl.querySelector('.messages-list');
    if (!msgList) return;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message-item assistant typing-item';
    typingDiv.id = 'active-typing-indicator';
    typingDiv.innerHTML = `
      <div class="assistant-avatar" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      </div>
      <div class="assistant-content-wrapper">
        <div class="typing-indicator" aria-label="Processing request">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    msgList.appendChild(typingDiv);
    this.scrollToBottom(true);
  }

  removeTypingIndicator() {
    const el = document.getElementById('active-typing-indicator');
    if (el) el.remove();
  }

  startStreamingAssistantMessage() {
    this.removeTypingIndicator();
    let msgList = this.innerAreaEl.querySelector('.messages-list');
    if (!msgList) return;

    const itemDiv = document.createElement('div');
    itemDiv.className = 'message-item assistant streaming-active';
    itemDiv.innerHTML = `
      <div class="assistant-avatar" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      </div>
      <div class="assistant-content-wrapper">
        <div class="assistant-name-bar">
          <span class="assistant-label">Risk Agent</span>
          <span class="message-time">Responding...</span>
        </div>
        <div class="assistant-markdown streaming-content"></div>
      </div>
    `;
    msgList.appendChild(itemDiv);
    this.currentStreamingMsgEl = itemDiv.querySelector('.streaming-content');
    this.scrollToBottom(true);
  }

  updateStreamingMessage(text) {
    if (this.currentStreamingMsgEl) {
      this.currentStreamingMsgEl.innerHTML = renderMarkdown(text);
      this.scrollToBottom(true);
    }
  }

  finishStreamingMessage(finalText, msgId = `msg-${Date.now()}`) {
    if (this.currentStreamingMsgEl) {
      this.currentStreamingMsgEl.innerHTML = renderMarkdown(finalText);
      const itemDiv = this.currentStreamingMsgEl.closest('.message-item');
      if (itemDiv) itemDiv.id = msgId;

      const wrapper = this.currentStreamingMsgEl.closest('.assistant-content-wrapper');
      if (wrapper) {
        const timeEl = wrapper.querySelector('.message-time');
        if (timeEl) timeEl.textContent = 'Just now';

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        actionsDiv.innerHTML = `
          <button type="button" class="btn-msg-action btn-msg-copy" title="Copy response" aria-label="Copy response">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          </button>
          <button type="button" class="btn-msg-action btn-msg-regenerate" title="Regenerate response" aria-label="Regenerate response">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>Retry</span>
          </button>
          <button type="button" class="btn-msg-action btn-msg-delete" data-msg-id="${msgId}" title="Delete response" aria-label="Delete response">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Delete</span>
          </button>
        `;
        wrapper.appendChild(actionsDiv);
      }
    }
    this.currentStreamingMsgEl = null;
    this.scrollToBottom(true);
  }

  handleDeleteMessage(msgId) {
    const activeId = StorageManager.getActiveId();
    if (!activeId || !msgId) return;

    const executeDelete = () => {
      StorageManager.deleteMessage(activeId, msgId);
      this.renderMessages();
      window.showToast('Message deleted', 'info');
    };

    if (window.openConfirmModal) {
      window.openConfirmModal({
        title: 'Delete Message',
        message: 'Are you sure you want to delete this message? This action cannot be undone.',
        confirmText: 'Delete',
        danger: true,
        onConfirm: executeDelete
      });
    } else {
      executeDelete();
    }
  }

  showErrorMessage(msgText) {
    this.removeTypingIndicator();
    let msgList = this.innerAreaEl.querySelector('.messages-list');
    if (!msgList) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'chat-error-banner';
    errorDiv.innerHTML = `
      <span><strong>Error:</strong> ${this.escapeHtml(msgText)}</span>
      <button type="button" class="btn-retry-err">Retry</button>
    `;
    errorDiv.querySelector('.btn-retry-err').addEventListener('click', () => {
      errorDiv.remove();
      this.onRegenerateMessage();
    });
    msgList.appendChild(errorDiv);
    this.scrollToBottom(true);
  }

  handleCopyCode(btn) {
    const rawEncoded = btn.getAttribute('data-code');
    const raw = decodeURIComponent(rawEncoded);
    navigator.clipboard.writeText(raw).then(() => {
      btn.classList.add('copied');
      const textSpan = btn.querySelector('.copy-text');
      if (textSpan) textSpan.textContent = 'Copied!';
      setTimeout(() => {
        btn.classList.remove('copied');
        if (textSpan) textSpan.textContent = 'Copy';
      }, 2000);
    });
  }

  handleCopyMessage(btn) {
    const wrapper = btn.closest('.assistant-content-wrapper');
    if (!wrapper) return;
    const text = wrapper.querySelector('.assistant-markdown')?.innerText || '';
    navigator.clipboard.writeText(text).then(() => {
      window.showToast('Copied to clipboard', 'success');
      btn.classList.add('active');
      setTimeout(() => btn.classList.remove('active'), 1500);
    });
  }

  exportConversation() {
    const activeId = StorageManager.getActiveId();
    const conv = StorageManager.getConversation(activeId);
    if (!conv || !conv.messages || conv.messages.length === 0) {
      window.showToast('No messages to export', 'error');
      return;
    }

    let md = `# ${conv.title}\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
    conv.messages.forEach(m => {
      const sender = m.role === 'user' ? 'User' : 'Student Risk Agent';
      md += `### ${sender} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conv.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    window.showToast('Conversation exported', 'success');
  }

  scrollToBottom(smooth = true) {
    requestAnimationFrame(() => {
      this.scrollAreaEl.scrollTo({
        top: this.scrollAreaEl.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    });
  }

  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
}
