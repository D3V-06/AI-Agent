/**
 * Storage Manager for AI Workflow Chatbot
 * Manages conversation history, message logs, and user settings in localStorage.
 */

const STORAGE_KEYS = {
  CONVERSATIONS: 'ai_workflow_conversations',
  ACTIVE_ID: 'ai_workflow_active_id',
  SETTINGS: 'ai_workflow_settings'
};

const DEFAULT_SETTINGS = {
  model: 'Workflow-4.5 Ultra',
  webhookUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_N8N_WEBHOOK_URL) || (typeof process !== 'undefined' ? process.env?.VITE_N8N_WEBHOOK_URL : '') || '',
  apiKey: '',
  temperature: 0.7,
  streamSpeed: 18, // ms per word/chunk
  systemPrompt: 'You are the International Student Deadline & Risk Agent, specialized in evaluating academic milestones, monitoring visa compliance deadlines, calculating risk tiers, and coordinating advisor interventions.'
};


const SEED_CONVERSATIONS = [];

export class StorageManager {
  static getConversations() {
    try {
      const data = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.CONVERSATIONS) : null;
      if (!data) {
        const initialConv = {
          id: 'conv-' + Date.now(),
          sessionId: 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
          title: 'Student Support Chat',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: []
        };
        const convs = [initialConv];
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(convs));
          localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, initialConv.id);
        }
        return convs;
      }
      const parsed = JSON.parse(data);
      // Clean out any legacy mock seed conversations
      const cleaned = Array.isArray(parsed) ? parsed.filter(c => !c.id.startsWith('conv-seed-')) : [];
      if (cleaned.length === 0) {
        const initialConv = {
          id: 'conv-' + Date.now(),
          sessionId: 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
          title: 'Student Support Chat',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: []
        };
        this.saveConversations([initialConv]);
        this.setActiveId(initialConv.id);
        return [initialConv];
      }
      return cleaned;
    } catch (e) {
      console.error('Failed to parse conversations from localStorage', e);
      return [];
    }
  }


  static saveConversations(convs) {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(convs));
  }

  static getActiveId() {
    const active = localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
    if (active) return active;
    const convs = this.getConversations();
    if (convs.length > 0) {
      this.setActiveId(convs[0].id);
      return convs[0].id;
    }
    return null;
  }

  static setActiveId(id) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
  }

  static getConversation(id) {
    const convs = this.getConversations();
    return convs.find(c => c.id === id) || null;
  }

  static createConversation(title = 'New Conversation') {
    const convs = this.getConversations();
    const newConv = {
      id: 'conv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      sessionId: 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      title: title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };
    convs.unshift(newConv);
    this.saveConversations(convs);
    this.setActiveId(newConv.id);
    return newConv;
  }

  static getSessionId(convId) {
    const convs = this.getConversations();
    const conv = convs.find(c => c.id === convId);
    if (!conv) {
      return 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    }
    if (!conv.sessionId) {
      conv.sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      this.saveConversations(convs);
    }
    return conv.sessionId;
  }


  static updateConversation(id, updates) {
    const convs = this.getConversations();
    const idx = convs.findIndex(c => c.id === id);
    if (idx !== -1) {
      convs[idx] = { ...convs[idx], ...updates, updatedAt: Date.now() };
      this.saveConversations(convs);
      return convs[idx];
    }
    return null;
  }

  static deleteConversation(id) {
    let convs = this.getConversations();
    convs = convs.filter(c => c.id !== id);

    if (convs.length === 0) {
      const fresh = {
        id: 'conv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        sessionId: 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        title: 'New Conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      };
      this.saveConversations([fresh]);
      this.setActiveId(fresh.id);
      return fresh.id;
    }

    this.saveConversations(convs);

    if (this.getActiveId() === id) {
      this.setActiveId(convs[0].id);
      return convs[0].id;
    }
    return this.getActiveId();
  }

  static deleteMessage(convId, messageId) {
    const convs = this.getConversations();
    const conv = convs.find(c => c.id === convId);
    if (conv && conv.messages) {
      conv.messages = conv.messages.filter((m, idx) => {
        const idToCompare = m.id || `msg-${idx}`;
        return idToCompare !== messageId && String(m.id) !== String(messageId);
      });
      conv.updatedAt = Date.now();
      this.saveConversations(convs);
      return conv;
    }
    return null;
  }

  static addMessage(convId, message) {
    const convs = this.getConversations();
    const conv = convs.find(c => c.id === convId);
    if (conv) {
      if (!conv.messages) conv.messages = [];
      conv.messages.push(message);
      conv.updatedAt = Date.now();
      
      // Auto-update conversation title from first user message if it was "New Conversation"
      if (conv.messages.length === 1 && conv.title === 'New Conversation' && message.role === 'user') {
        const cleanTitle = message.content.slice(0, 36).trim();
        conv.title = cleanTitle.length > 0 ? cleanTitle : 'Conversation';
      }

      this.saveConversations(convs);
      return conv;
    }
    return null;
  }

  static updateLastMessageContent(convId, content) {
    const convs = this.getConversations();
    const conv = convs.find(c => c.id === convId);
    if (conv && conv.messages && conv.messages.length > 0) {
      const lastMsg = conv.messages[conv.messages.length - 1];
      lastMsg.content = content;
      conv.updatedAt = Date.now();
      this.saveConversations(convs);
    }
  }

  static clearActiveConversationMessages(convId) {
    const convs = this.getConversations();
    const conv = convs.find(c => c.id === convId);
    if (conv) {
      conv.messages = [];
      conv.updatedAt = Date.now();
      this.saveConversations(convs);
    }
  }

  static getSettings() {
    try {
      const data = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SETTINGS) : null;
      const envWebhook = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_N8N_WEBHOOK_URL) || (typeof process !== 'undefined' ? process.env?.VITE_N8N_WEBHOOK_URL : '') || '';
      if (!data) {
        return {
          ...DEFAULT_SETTINGS,
          webhookUrl: envWebhook || DEFAULT_SETTINGS.webhookUrl
        };
      }
      const parsed = JSON.parse(data);
      const merged = { ...DEFAULT_SETTINGS, ...parsed };
      // If webhookUrl is empty or was set to an old localhost test URL, use the real .env webhook URL
      if ((!merged.webhookUrl || merged.webhookUrl.includes('localhost:5678')) && envWebhook) {
        merged.webhookUrl = envWebhook;
        this.saveSettings(merged);
      }
      return merged;
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  static saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }
}
