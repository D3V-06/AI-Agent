/**
 * AI Service for Student Support Chatbot
 * Strictly routes all message requests directly to the n8n webhook backend.
 * Zero mock responses: all replies originate from the n8n workflow.
 */
import { N8nService } from './n8n-service.js';

export class AIService {
  static abortController = null;

  /**
   * Dispatches a user message to the n8n webhook and streams the returned reply.
   * @param {Object} params
   * @param {string} params.userPrompt - Current user prompt
   * @param {string} params.sessionId - Unique persistent conversation session ID
   * @param {Array} [params.history=[]] - Previous message history
   * @param {Function} params.onChunk - Callback for progressive streaming updates
   * @param {Function} params.onComplete - Callback when response completes
   * @param {Function} params.onError - Callback for failures
   */
  static async streamResponse({ userPrompt, sessionId, history = [], onChunk, onComplete, onError }) {
    this.abortController = new AbortController();

    if (!N8nService.isConfigured()) {
      onError('n8n Webhook URL is not configured. Please set VITE_N8N_WEBHOOK_URL in .env or configure it in Settings.');
      return;
    }

    try {
      // 1. Send request directly to n8n Webhook
      const result = await N8nService.sendMessage({
        message: userPrompt,
        sessionId: sessionId || 'default-session',
        signal: this.abortController.signal
      });

      // 2. Stream the real n8n reply progressively for smooth UI rendering
      const replyText = result.reply || 'Workflow execution completed, but no reply text was returned.';
      await this.streamStaticText(replyText, onChunk, this.abortController.signal);
      onComplete();

    } catch (err) {
      if (err.name === 'AbortError' || this.abortController?.signal?.aborted) {
        onComplete();
        return;
      }
      console.error('n8n response error:', err.message);
      onError(err.message || 'Error communicating with the n8n student risk assessment workflow.');
    }
  }

  /**
   * Aborts an in-flight request to n8n
   */
  static stopGenerating() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Streams the actual n8n reply progressively to the UI
   */
  static async streamStaticText(text, onChunk, signal) {
    if (!text) return;
    const tokens = text.split(/(?<=\s|\n)/);
    let accumulated = '';

    for (let i = 0; i < tokens.length; i++) {
      if (signal?.aborted) break;
      accumulated += tokens[i];
      onChunk(accumulated);
      await new Promise(r => setTimeout(r, 12));
    }
  }
}
