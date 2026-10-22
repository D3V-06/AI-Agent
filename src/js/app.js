/**
 * Main Application Orchestrator
 * Connects Storage, Sidebar, Chat Panel, Composer, AI Service, and Modals.
 */
import { StorageManager } from './storage.js';
import { AIService } from './ai-service.js';
import { SidebarComponent } from './components/sidebar.js';
import { ChatPanelComponent } from './components/chat-panel.js';
import { ComposerComponent } from './components/composer.js';
import { ModalsManager } from './components/modals.js';

class App {
  constructor() {
    this.sidebar = null;
    this.chatPanel = null;
    this.composer = null;
    this.modals = null;

    this.activeStreamText = '';
  }

  init() {
    // 1. Initialize Modals
    this.modals = new ModalsManager({
      onSettingsSaved: (settings) => {
        this.chatPanel.updateModelDisplay();
      }
    });

    // 2. Initialize Sidebar
    this.sidebar = new SidebarComponent({
      onSelectConversation: (id) => {
        StorageManager.setActiveId(id);
        this.chatPanel.renderMessages();
      },
      onNewChat: () => {
        const newConv = StorageManager.createConversation('New Conversation');
        this.sidebar.renderConversationList();
        this.chatPanel.renderMessages();
        this.composer.focus();
      },
      onOpenSettings: () => {
        this.modals.openSettings();
      }
    });

    // 3. Initialize Chat Panel
    this.chatPanel = new ChatPanelComponent({
      onSendMessage: (prompt) => {
        this.handleUserSubmit(prompt);
      },
      onRegenerateMessage: () => {
        this.handleRegenerate();
      },
      onOpenSettings: () => {
        this.modals.openSettings();
      },
      onToggleSidebar: () => {
        this.sidebar.openMobileDrawer();
      }
    });

    // 4. Initialize Composer
    this.composer = new ComposerComponent({
      onSubmit: (prompt) => {
        this.handleUserSubmit(prompt);
      },
      onStop: () => {
        AIService.stopGenerating();
        this.finishStreamGeneration(false);
      }
    });

    // Initial render
    this.chatPanel.renderMessages();
  }

  async handleUserSubmit(prompt) {
    const activeId = StorageManager.getActiveId();
    if (!activeId) return;

    // 1. Save and display user message
    const userMsg = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: prompt,
      timestamp: Date.now()
    };
    StorageManager.addMessage(activeId, userMsg);
    this.sidebar.renderConversationList();
    this.chatPanel.appendUserMessage(prompt);

    // 2. Transition composer to generating state
    this.composer.setGeneratingState(true);
    this.chatPanel.showTypingIndicator();

    // 3. Prepare AI generation
    this.activeStreamText = '';
    let isFirstChunk = true;
    const conv = StorageManager.getConversation(activeId);
    const sessionId = StorageManager.getSessionId(activeId);
    const history = conv ? conv.messages.slice(0, -1) : [];

    await AIService.streamResponse({
      userPrompt: prompt,
      sessionId: sessionId,
      history,
      onChunk: (chunkText) => {
        if (isFirstChunk) {
          isFirstChunk = false;
          this.chatPanel.startStreamingAssistantMessage();
        }
        this.activeStreamText = chunkText;
        this.chatPanel.updateStreamingMessage(chunkText);
      },
      onComplete: () => {
        this.finishStreamGeneration(true);
      },
      onError: (errMessage) => {
        this.chatPanel.showErrorMessage(errMessage);
        this.composer.setGeneratingState(false);
      }
    });
  }

  finishStreamGeneration(isNaturalComplete = true) {
    const activeId = StorageManager.getActiveId();
    if (!activeId || !this.activeStreamText) {
      this.composer.setGeneratingState(false);
      this.chatPanel.removeTypingIndicator();
      return;
    }

    // Save assistant message to storage
    const assistantMsg = {
      id: 'msg-' + Date.now(),
      role: 'assistant',
      content: this.activeStreamText,
      timestamp: Date.now()
    };
    StorageManager.addMessage(activeId, assistantMsg);
    this.chatPanel.finishStreamingMessage(this.activeStreamText);
    this.sidebar.renderConversationList();
    this.composer.setGeneratingState(false);
    this.activeStreamText = '';
  }

  handleRegenerate() {
    const activeId = StorageManager.getActiveId();
    const conv = StorageManager.getConversation(activeId);
    if (!conv || !conv.messages || conv.messages.length === 0) return;

    // Find the last user message
    const userMessages = conv.messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return;

    const lastUserPrompt = userMessages[userMessages.length - 1].content;

    // Remove the trailing assistant message if one exists
    if (conv.messages[conv.messages.length - 1].role === 'assistant') {
      conv.messages.pop();
      StorageManager.saveConversations(StorageManager.getConversations());
      this.chatPanel.renderMessages();
    }

    this.handleUserSubmit(lastUserPrompt);
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
