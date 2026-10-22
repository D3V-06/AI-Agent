/**
 * n8n Webhook Service
 * Handles communication between the chatbot frontend and the n8n
 * International Student Deadline & Risk Agent workflow.
 */
import { StorageManager } from './storage.js';

export class N8nService {
  /**
   * Resolves the configured n8n webhook URL.
   * Priority: LocalStorage user override > Vite env variable VITE_N8N_WEBHOOK_URL
   * @returns {string} The active webhook URL
   */
  static getWebhookUrl() {
    const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_N8N_WEBHOOK_URL) || (typeof process !== 'undefined' ? process.env?.VITE_N8N_WEBHOOK_URL : '') || '';
    const settings = StorageManager.getSettings();
    if (settings && settings.webhookUrl && settings.webhookUrl.trim().length > 0) {
      if (!settings.webhookUrl.includes('localhost:5678') || !envUrl) {
        return settings.webhookUrl.trim();
      }
    }
    return (envUrl || '').trim();
  }


  /**
   * Checks whether a webhook URL is configured.
   * @returns {boolean}
   */
  static isConfigured() {
    return this.getWebhookUrl().length > 0;
  }

  /**
   * Determines if the current webhook URL is an n8n test webhook.
   * @param {string} url
   * @returns {boolean}
   */
  static isTestWebhook(url = this.getWebhookUrl()) {
    return url.includes('/webhook-test/');
  }

  /**
   * Sends a user query to the n8n webhook.
   * Request Contract:
   *   POST {url}
   *   Content-Type: application/json
   *   Body: { "message": string, "sessionId": string }
   *
   * Response Contract:
   *   { "success": boolean, "reply": string }
   *
   * @param {Object} params
   * @param {string} params.message - The natural language message
   * @param {string} params.sessionId - The unique persistent conversation ID
   * @param {AbortSignal} [params.signal] - Optional external abort signal
   * @param {number} [params.timeoutMs=60000] - Request timeout in milliseconds (default 60s)
   * @returns {Promise<{ success: boolean, reply: string }>}
   */
  static async sendMessage({ message, sessionId, signal, timeoutMs = 60000 }) {
    const url = this.getWebhookUrl();
    if (!url) {
      throw new Error(
        'The n8n webhook URL is not configured. Please set VITE_N8N_WEBHOOK_URL in your .env file or enter the endpoint in Settings & API.'
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Message cannot be empty.');
    }

    if (!sessionId) {
      throw new Error('A valid sessionId is required for conversation state tracking.');
    }

    // Set up request timeout
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

    // Combine external signal and timeout signal
    let combinedSignal = timeoutController.signal;
    if (signal) {
      const onAbort = () => timeoutController.abort();
      signal.addEventListener('abort', onAbort, { once: true });
    }

    const payload = {
      message: message.trim(),
      sessionId: String(sessionId)
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify(payload),
        signal: combinedSignal
      });

      clearTimeout(timeoutId);

      // Handle non-success HTTP status codes with user-friendly explanations
      if (!response.ok) {
        if (response.status === 404) {
          if (this.isTestWebhook(url)) {
            throw new Error(
              'The n8n test webhook is currently not listening (HTTP 404). In n8n, please open your workflow and click "Listen for test event" / "Test step", or switch to the production webhook URL once the workflow is activated.'
            );
          } else {
            throw new Error(
              'The n8n webhook endpoint was not found (HTTP 404). Please ensure the workflow is active in n8n and the production webhook URL is correct.'
            );
          }
        }

        if (response.status === 500 || response.status === 502 || response.status === 503) {
          throw new Error(
            `The n8n risk assessment workflow encountered an internal error (HTTP ${response.status}). Please check your n8n workflow execution logs for node errors (e.g., Google Sheets, OpenAI, or Switch node).`
          );
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error(
            `Authorization failed (HTTP ${response.status}). The n8n webhook rejected the request.`
          );
        }

        throw new Error(`The n8n server returned an error (HTTP ${response.status}: ${response.statusText}).`);
      }

      // Parse JSON response safely
      const rawText = await response.text();
      let data = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        // Response is plain text rather than JSON
        if (rawText && rawText.trim().length > 0) {
          return {
            success: true,
            reply: rawText.trim()
          };
        }
      }

      // Extract the reply field according to the response contract
      const reply = this.extractReplyContent(data, rawText);

      return {
        success: data?.success !== false,
        reply: reply
      };

    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        if (signal?.aborted) {
          throw new Error('Request was cancelled.');
        }
        throw new Error(
          'The request to n8n timed out. Complex student risk workflows may take longer to process. Please check the execution history in n8n.'
        );
      }

      // Handle network errors (e.g., connection refused, CORS failure)
      if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
        throw new Error(
          'Unable to connect to the n8n webhook. Please ensure n8n is running, the URL is accessible, and CORS is allowed.'
        );
      }

      throw err;
    }
  }

  /**
   * Safely extracts the reply field from various n8n response structures.
   * Handles single objects, array of items, or fallback fields.
   * @param {any} data
   * @param {string} rawText
   * @returns {string}
   */
  static extractReplyContent(data, rawText) {
    if (!data) {
      if (rawText && rawText.trim().length > 0) {
        return rawText.trim();
      }
      return 'The workflow executed successfully, but no reply content was returned.';
    }

    // 1. Direct standard contract: { "reply": "..." }
    if (typeof data.reply === 'string' && data.reply.trim().length > 0) {
      return data.reply.trim();
    }

    // 2. n8n default node list return: [ { "reply": "..." } ] or [ { "output": "..." } ]
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      if (typeof first === 'object' && first !== null) {
        const candidate = first.reply || first.output || first.response || first.message || first.text || first.report;
        if (typeof candidate === 'string') return candidate.trim();
      }
    }

    // 3. Fallback fields: output, message, text, response, report
    const fallbacks = [data.output, data.response, data.message, data.text, data.report];
    for (const fb of fallbacks) {
      if (typeof fb === 'string' && fb.trim().length > 0) {
        return fb.trim();
      }
    }

    // 4. Object representation if reply is structured and non-empty
    if (typeof data === 'object' && Object.keys(data).length > 0) {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        // ignore
      }
    }

    return 'The workflow executed successfully, but no reply content was returned.';
  }

  /**
   * Pings the n8n webhook to test connectivity.
   * Sends a lightweight test payload.
   * @returns {Promise<{ ok: boolean, message: string }>}
   */
  static async pingTest() {
    const url = this.getWebhookUrl();
    if (!url) {
      return { ok: false, message: 'No webhook URL configured.' };
    }

    try {
      const result = await this.sendMessage({
        message: 'Connection ping test from frontend',
        sessionId: 'ping-test-session',
        timeoutMs: 15000
      });
      return { ok: true, message: result.reply || 'Connected successfully!' };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }
}
