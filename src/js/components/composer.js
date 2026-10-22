/**
 * Message Composer Component — Primary Visual Design Element
 * Features blue container (#2563EB), accessible inner input, auto-grow textarea, keyboard controls,
 * attachment picker, voice dictation, and streaming state management.
 */

export class ComposerComponent {
  constructor({ onSubmit, onStop }) {
    this.onSubmit = onSubmit;
    this.onStop = onStop;

    this.textareaEl = document.getElementById('composer-textarea');
    this.btnSendEl = document.getElementById('btn-send');
    this.charCounterEl = document.getElementById('composer-char-count');
    this.btnAttachEl = document.getElementById('btn-attach-file');
    this.btnVoiceEl = document.getElementById('btn-voice-input');
    this.btnStopEl = document.getElementById('btn-stop-generating');
    this.attachedFileContainer = document.getElementById('attached-file-container');

    this.isGenerating = false;
    this.isRecording = false;
    this.recognition = null;
    this.attachedFile = null;

    this.init();
  }

  init() {
    if (!this.textareaEl || !this.btnSendEl) return;

    // Auto-resizing textarea
    this.textareaEl.addEventListener('input', () => {
      this.handleInput();
    });

    // Enter to send, Shift+Enter for new line
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

    // Attachment file picker
    if (this.btnAttachEl) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.txt,.pdf,.csv,.json,.md,.js,.py,.html,.css';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);

      this.btnAttachEl.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.setAttachedFile(file);
        }
      });
    }

    // Voice dictation toggle
    if (this.btnVoiceEl) {
      this.initVoiceDictation();
    }

    this.updateSendButtonState();
  }

  handleInput() {
    // Auto-grow height
    this.textareaEl.style.height = 'auto';
    const newHeight = Math.min(this.textareaEl.scrollHeight, 180);
    this.textareaEl.style.height = `${newHeight}px`;

    // Char counter
    const length = this.textareaEl.value.length;
    if (this.charCounterEl) {
      this.charCounterEl.textContent = length > 0 ? `${length}` : '';
    }

    this.updateSendButtonState();
  }

  updateSendButtonState() {
    const hasText = this.textareaEl.value.trim().length > 0 || this.attachedFile !== null;
    this.btnSendEl.disabled = !hasText || this.isGenerating;
  }

  setAttachedFile(file) {
    this.attachedFile = file;
    if (this.attachedFileContainer) {
      this.attachedFileContainer.innerHTML = `
        <div class="attached-file-chip">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
          <button type="button" class="btn-remove-file" aria-label="Remove attached file">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;

      this.attachedFileContainer.querySelector('.btn-remove-file').addEventListener('click', () => {
        this.clearAttachedFile();
      });
    }
    this.updateSendButtonState();
    window.showToast(`Attached ${file.name}`, 'info');
  }

  clearAttachedFile() {
    this.attachedFile = null;
    if (this.attachedFileContainer) {
      this.attachedFileContainer.innerHTML = '';
    }
    this.updateSendButtonState();
  }

  initVoiceDictation() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;

      this.recognition.onstart = () => {
        this.isRecording = true;
        this.btnVoiceEl.classList.add('recording');
        window.showToast('Listening... Speak now', 'info');
      };

      this.recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(r => r[0].transcript)
          .join('');
        this.textareaEl.value = transcript;
        this.handleInput();
      };

      this.recognition.onerror = () => {
        this.stopVoice();
      };

      this.recognition.onend = () => {
        this.stopVoice();
      };

      this.btnVoiceEl.addEventListener('click', () => {
        if (this.isRecording) {
          this.recognition.stop();
        } else {
          try {
            this.recognition.start();
          } catch {
            this.recognition.stop();
          }
        }
      });
    } else {
      // Browser does not support SpeechRecognition
      this.btnVoiceEl.addEventListener('click', () => {
        window.showToast('Speech recognition is not supported in this browser.', 'info');
        this.textareaEl.value = 'Check the risk status of international students with low attendance or pending visa holds.';
        this.handleInput();
      });
    }
  }

  stopVoice() {
    this.isRecording = false;
    if (this.btnVoiceEl) {
      this.btnVoiceEl.classList.remove('recording');
    }
  }

  submitMessage() {
    if (this.isGenerating) return;

    let text = this.textareaEl.value.trim();
    if (this.attachedFile) {
      text = text ? `${text}\n\n[Attached: ${this.attachedFile.name}]` : `[Attached: ${this.attachedFile.name}]`;
    }

    if (!text) return;

    this.textareaEl.value = '';
    this.textareaEl.style.height = 'auto';
    this.clearAttachedFile();
    if (this.charCounterEl) this.charCounterEl.textContent = '';
    this.updateSendButtonState();

    this.onSubmit(text);
  }

  setGeneratingState(generating) {
    this.isGenerating = generating;
    this.updateSendButtonState();

    if (generating) {
      this.btnSendEl.innerHTML = `<div class="send-spinner" aria-label="Processing..."></div>`;
      this.btnSendEl.setAttribute('aria-label', 'Processing request...');
      if (this.btnStopEl) this.btnStopEl.style.display = 'flex';
      this.textareaEl.disabled = true;
    } else {
      this.btnSendEl.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      `;
      this.btnSendEl.setAttribute('aria-label', 'Send message');
      if (this.btnStopEl) this.btnStopEl.style.display = 'none';
      this.textareaEl.disabled = false;
      this.textareaEl.focus();
    }
  }

  focus() {
    if (this.textareaEl) this.textareaEl.focus();
  }
}
