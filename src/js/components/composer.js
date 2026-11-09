/**
 * Message Composer Component
 * Handles auto-resizing textarea, keyboard shortcuts, and streaming state controls.
 */

export class ComposerComponent {
  constructor({ onSubmit, onStop }) {
    this.onSubmit = onSubmit;
    this.onStop = onStop;

    this.textareaEl = document.getElementById('composer-textarea');
    this.btnSendEl = document.getElementById('btn-send');
    this.btnStopEl = document.getElementById('btn-stop-generating');

    this.isGenerating = false;

    this.init();
  }

  init() {
    if (!this.textareaEl || !this.btnSendEl) return;

    // Auto-resizing textarea
    this.textareaEl.addEventListener('input', () => {
      this.handleInput();
    });

    // Enter to send on desktop, Shift+Enter for new line
    this.textareaEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.submitMessage();
      }
    });

    // Send button click
    this.btnSendEl.addEventListener('click', () => {
      this.submitMessage();
    });

    // Stop button click
    if (this.btnStopEl) {
      this.btnStopEl.addEventListener('click', () => {
        this.onStop();
      });
    }

    this.updateSendButtonState();
  }

  handleInput() {
    this.textareaEl.style.height = 'auto';
    const maxHeight = window.innerWidth <= 767 ? 120 : 160;
    const newHeight = Math.min(this.textareaEl.scrollHeight, maxHeight);
    this.textareaEl.style.height = `${newHeight}px`;

    this.updateSendButtonState();
  }

  updateSendButtonState() {
    const hasText = this.textareaEl.value.trim().length > 0;
    this.btnSendEl.disabled = !hasText || this.isGenerating;
  }

  submitMessage() {
    if (this.isGenerating) return;

    const text = this.textareaEl.value.trim();
    if (!text) return;

    this.textareaEl.value = '';
    this.textareaEl.style.height = 'auto';
    this.updateSendButtonState();

    // Blur on mobile to dismiss virtual keyboard after sending so user can read the response
    if (window.innerWidth <= 767) {
      this.textareaEl.blur();
    }

    this.onSubmit(text);
  }

  setGeneratingState(generating) {
    this.isGenerating = generating;
    this.updateSendButtonState();

    if (generating) {
      this.btnSendEl.style.display = 'none';
      if (this.btnStopEl) this.btnStopEl.style.display = 'inline-flex';
      this.textareaEl.disabled = true;
    } else {
      this.btnSendEl.style.display = 'inline-flex';
      if (this.btnStopEl) this.btnStopEl.style.display = 'none';
      this.textareaEl.disabled = false;
      if (window.innerWidth > 768) {
        this.textareaEl.focus();
      }
    }
  }

  focus() {
    if (this.textareaEl) this.textareaEl.focus();
  }
}
