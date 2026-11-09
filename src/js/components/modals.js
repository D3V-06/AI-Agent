/**
 * Modals and Toast Manager
 * Handles webhook configuration modal, conversation rename dialog, confirmation dialog, and feedback toasts.
 */
import { StorageManager } from '../storage.js';

export class ModalsManager {
  constructor({ onSettingsSaved }) {
    this.onSettingsSaved = onSettingsSaved;

    this.settingsModal = document.getElementById('settings-modal');
    this.renameModal = document.getElementById('rename-modal');
    this.confirmModal = document.getElementById('confirm-modal');
    this.toastContainer = document.getElementById('toast-container');

    this.initToasts();
    this.initSettingsModal();
    this.initRenameModal();
    this.initConfirmModal();
  }

  initToasts() {
    window.showToast = (message, type = 'info') => {
      if (!this.toastContainer) return;

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      
      let icon = '';
      if (type === 'success') {
        icon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      } else if (type === 'error') {
        icon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
      } else {
        icon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
      }

      toast.innerHTML = `${icon}<span>${this.escapeHtml(message)}</span>`;
      this.toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-6px)';
        setTimeout(() => toast.remove(), 250);
      }, 2800);
    };
  }

  initSettingsModal() {
    if (!this.settingsModal) return;

    const btnClose = this.settingsModal.querySelector('.btn-close-modal');
    const btnCancel = this.settingsModal.querySelector('.btn-cancel-settings');
    const form = document.getElementById('settings-form');
    const testWebhookBtn = document.getElementById('btn-test-webhook');

    [btnClose, btnCancel].forEach(b => {
      if (b) b.addEventListener('click', () => this.closeSettings());
    });

    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.closeSettings();
    });

    // Test webhook button
    if (testWebhookBtn) {
      testWebhookBtn.addEventListener('click', async () => {
        const url = document.getElementById('setting-webhook-url')?.value.trim();
        if (!url) {
          window.showToast('Please enter an n8n Webhook URL first', 'error');
          return;
        }

        testWebhookBtn.disabled = true;
        testWebhookBtn.textContent = 'Testing...';

        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*' },
            body: JSON.stringify({
              message: 'Connection ping test from frontend',
              sessionId: 'ping-test-session'
            })
          });

          if (resp.ok) {
            window.showToast('n8n Webhook reached (HTTP 200)', 'success');
          } else if (resp.status === 404 && url.includes('/webhook-test/')) {
            window.showToast('HTTP 404: Click "Listen for test event" in n8n first.', 'info');
          } else if (resp.status === 404) {
            window.showToast('HTTP 404: Ensure workflow is set to "Active" in n8n.', 'error');
          } else {
            window.showToast(`n8n returned HTTP ${resp.status}`, 'error');
          }
        } catch (err) {
          window.showToast(`Connection failed: ${err.message}`, 'error');
        } finally {
          testWebhookBtn.disabled = false;
          testWebhookBtn.textContent = 'Test Connection';
        }
      });
    }

    // Save form
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const settings = StorageManager.getSettings();
        settings.webhookUrl = document.getElementById('setting-webhook-url')?.value.trim() || '';

        StorageManager.saveSettings(settings);
        this.closeSettings();
        if (this.onSettingsSaved) this.onSettingsSaved(settings);
        window.showToast('Webhook settings saved', 'success');
      });
    }
  }

  openSettings() {
    const settings = StorageManager.getSettings();
    const urlInput = document.getElementById('setting-webhook-url');
    if (urlInput) urlInput.value = settings.webhookUrl || '';

    this.settingsModal.classList.add('open');
  }

  closeSettings() {
    this.settingsModal.classList.remove('open');
  }

  initRenameModal() {
    if (!this.renameModal) return;

    let currentCallback = null;
    const input = document.getElementById('rename-conv-title');
    const form = document.getElementById('rename-conv-form');
    const btnCancel = this.renameModal.querySelector('.btn-cancel-rename');
    const btnClose = this.renameModal.querySelector('.btn-close-modal');

    const closeModal = () => {
      this.renameModal.classList.remove('open');
      currentCallback = null;
    };

    [btnCancel, btnClose].forEach(b => {
      if (b) b.addEventListener('click', closeModal);
    });

    this.renameModal.addEventListener('click', (e) => {
      if (e.target === this.renameModal) closeModal();
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTitle = input.value.trim();
        if (newTitle && currentCallback) {
          currentCallback(newTitle);
        }
        closeModal();
      });
    }

    window.openRenameModal = (id, currentTitle, callback) => {
      input.value = currentTitle;
      currentCallback = callback;
      this.renameModal.classList.add('open');
      setTimeout(() => input.focus(), 50);
    };
  }

  initConfirmModal() {
    if (!this.confirmModal) return;

    let confirmCallback = null;
    const titleEl = document.getElementById('confirm-modal-title');
    const descEl = document.getElementById('confirm-modal-desc');
    const btnConfirm = document.getElementById('btn-modal-confirm-action');
    const btnCancel = this.confirmModal.querySelector('.btn-cancel-confirm');
    const btnClose = this.confirmModal.querySelector('.btn-close-modal');

    const closeModal = () => {
      this.confirmModal.classList.remove('open');
      confirmCallback = null;
    };

    [btnCancel, btnClose].forEach(b => {
      if (b) b.addEventListener('click', closeModal);
    });

    this.confirmModal.addEventListener('click', (e) => {
      if (e.target === this.confirmModal) closeModal();
    });

    if (btnConfirm) {
      btnConfirm.addEventListener('click', () => {
        if (confirmCallback) {
          const cb = confirmCallback;
          closeModal();
          cb();
        } else {
          closeModal();
        }
      });
    }

    window.openConfirmModal = ({ title, message, confirmText = 'Delete', danger = true, onConfirm }) => {
      if (titleEl) titleEl.textContent = title || 'Confirm Action';
      if (descEl) descEl.textContent = message || 'Are you sure you want to proceed?';
      if (btnConfirm) {
        btnConfirm.textContent = confirmText;
        btnConfirm.classList.toggle('btn-danger', Boolean(danger));
      }
      confirmCallback = onConfirm;
      this.confirmModal.classList.add('open');
    };
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
}
