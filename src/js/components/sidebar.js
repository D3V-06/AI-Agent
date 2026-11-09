/**
 * Sidebar Component
 * Controls desktop collapse, mobile drawer, conversation list, search filter, and conversation management.
 */
import { StorageManager } from '../storage.js';

export class SidebarComponent {
  constructor({ onSelectConversation, onNewChat, onOpenSettings }) {
    this.onSelectConversation = onSelectConversation;
    this.onNewChat = onNewChat;
    this.onOpenSettings = onOpenSettings;

    this.sidebarEl = document.getElementById('sidebar');
    this.backdropEl = document.getElementById('sidebar-backdrop');
    this.convListEl = document.getElementById('conversations-list');
    this.searchInputEl = document.getElementById('sidebar-search');
    this.btnCollapseDesktop = document.getElementById('btn-collapse-sidebar');
    this.btnNewChat = document.getElementById('btn-new-chat');
    this.btnSettings = document.getElementById('btn-sidebar-settings');

    this.searchQuery = '';
    this.init();
  }

  init() {
    // Sidebar toggle: closes drawer on mobile, toggles collapse on desktop
    if (this.btnCollapseDesktop) {
      this.btnCollapseDesktop.addEventListener('click', () => {
        if (window.innerWidth <= 767) {
          this.closeMobileDrawer();
        } else {
          this.toggleDesktopCollapse();
        }
      });
    }

    // Backdrop click on mobile closes drawer
    if (this.backdropEl) {
      this.backdropEl.addEventListener('click', () => {
        this.closeMobileDrawer();
      });
    }

    // Escape key closes mobile drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.sidebarEl?.classList.contains('mobile-open')) {
        this.closeMobileDrawer();
      }
    });

    // New Chat button
    if (this.btnNewChat) {
      this.btnNewChat.addEventListener('click', () => {
        this.onNewChat();
        this.closeMobileDrawer();
      });
    }

    // Settings button
    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => {
        this.onOpenSettings();
        this.closeMobileDrawer();
      });
    }

    // Search filter input
    if (this.searchInputEl) {
      this.searchInputEl.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderConversationList();
      });
    }

    this.renderConversationList();
  }

  toggleDesktopCollapse() {
    this.sidebarEl.classList.toggle('collapsed');
    const isCollapsed = this.sidebarEl.classList.contains('collapsed');
    this.btnCollapseDesktop.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
  }

  openMobileDrawer() {
    this.sidebarEl.classList.add('mobile-open');
    this.backdropEl.classList.add('active');
  }

  closeMobileDrawer() {
    this.sidebarEl.classList.remove('mobile-open');
    this.backdropEl.classList.remove('active');
  }

  renderConversationList() {
    if (!this.convListEl) return;

    const convs = StorageManager.getConversations();
    const activeId = StorageManager.getActiveId();

    const filtered = convs.filter(c => {
      if (!this.searchQuery) return true;
      return c.title.toLowerCase().includes(this.searchQuery);
    });

    if (filtered.length === 0) {
      this.convListEl.innerHTML = `
        <div class="empty-conv-hint">
          ${this.searchQuery ? 'No matching conversations' : 'No conversations yet'}
        </div>
      `;
      return;
    }

    this.convListEl.innerHTML = filtered.map(c => {
      const isActive = c.id === activeId;
      return `
        <li class="conv-item ${isActive ? 'active' : ''}" data-id="${c.id}" tabindex="0" role="button" aria-label="Conversation: ${this.escapeHtml(c.title)}">
          <div class="conv-item-left">
            <svg class="conv-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span class="conv-title sidebar-text">${this.escapeHtml(c.title)}</span>
          </div>
          <div class="conv-actions">
            <button type="button" class="btn-conv-action edit" data-action="rename" data-id="${c.id}" title="Rename conversation" aria-label="Rename conversation">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
            <button type="button" class="btn-conv-action delete" data-action="delete" data-id="${c.id}" title="Delete conversation" aria-label="Delete conversation">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </li>
      `;
    }).join('');

    // Delegated click handler on conversations list
    this.convListEl.onclick = (e) => {
      const deleteBtn = e.target.closest('.btn-conv-action.delete');
      if (deleteBtn) {
        e.stopPropagation();
        e.preventDefault();
        const id = deleteBtn.getAttribute('data-id');
        this.handleDeleteConversation(id);
        return;
      }

      const renameBtn = e.target.closest('.btn-conv-action.edit');
      if (renameBtn) {
        e.stopPropagation();
        e.preventDefault();
        const id = renameBtn.getAttribute('data-id');
        this.handleRenameConversation(id);
        return;
      }

      const item = e.target.closest('.conv-item');
      if (item) {
        const id = item.getAttribute('data-id');
        this.onSelectConversation(id);
        this.closeMobileDrawer();
        this.renderConversationList();
      }
    };

    // Accessible keyboard handling
    this.convListEl.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const item = e.target.closest('.conv-item');
        if (item && !e.target.closest('.btn-conv-action')) {
          e.preventDefault();
          const id = item.getAttribute('data-id');
          this.onSelectConversation(id);
          this.closeMobileDrawer();
          this.renderConversationList();
        }
      }
    };
  }

  handleRenameConversation(id) {
    const conv = StorageManager.getConversation(id);
    if (!conv) return;

    window.openRenameModal(conv.id, conv.title, (newTitle) => {
      StorageManager.updateConversation(id, { title: newTitle });
      this.renderConversationList();
      window.showToast('Conversation renamed', 'success');
    });
  }

  handleDeleteConversation(id) {
    const conv = StorageManager.getConversation(id);
    const title = conv ? conv.title : 'this conversation';

    const executeDelete = () => {
      const nextActiveId = StorageManager.deleteConversation(id);
      this.onSelectConversation(nextActiveId);
      this.renderConversationList();
      window.showToast('Conversation deleted', 'info');
    };

    if (window.openConfirmModal) {
      window.openConfirmModal({
        title: 'Delete Conversation',
        message: `Are you sure you want to delete "${this.escapeHtml(title)}"? This will permanently remove its message history.`,
        confirmText: 'Delete',
        danger: true,
        onConfirm: executeDelete
      });
    } else {
      executeDelete();
    }
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
}
