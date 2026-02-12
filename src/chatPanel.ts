import * as vscode from 'vscode';
import * as fs from 'fs';
import axios from 'axios';
import { OllamaClient } from './ollama';
import { getPostProcessorManager } from './extension';
import { executeProfile } from './postProcessors';
import { ConversationManager, Conversation } from './conversationManager';

export class ChatPanel {
  public static currentPanel: ChatPanel | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _ollamaClient: OllamaClient;
  private readonly _apiLogChannel: vscode.OutputChannel;
  private readonly _postProcessorManager = getPostProcessorManager();
  private readonly _conversationManager = new ConversationManager();
  private _messageId: number = 0;
  private _conversationContext: number[] = [];
  private _conversationHistory: Array<{ role: string; content: string }> = [];
  private _currentConversationId: string | null = null;
  private _abortController: AbortController | null = null;

  public static createOrShow(
    extensionUri: vscode.Uri,
    ollamaClient: OllamaClient,
    apiLogChannel: vscode.OutputChannel
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ChatPanel.currentPanel) {
      ChatPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'codeMateChat',
      'Code Mate - Chat',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
      }
    );

    ChatPanel.currentPanel = new ChatPanel(
      panel,
      extensionUri,
      ollamaClient,
      apiLogChannel
    );
  }

  private _disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    ollamaClient: OllamaClient,
    apiLogChannel: vscode.OutputChannel
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._ollamaClient = ollamaClient;
    this._apiLogChannel = apiLogChannel;

    // Set debug logging callback
    this._ollamaClient.onDebugLog = (message: string) => {
      this._apiLogChannel.appendLine(message);
    };

    this._panel.onDidDispose(() => this.dispose(), null);
    this._panel.webview.onDidReceiveMessage(
      (message) => this._handleMessage(message),
      null
    );

    // Listen for configuration changes to refresh profiles and settings
    this._disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('code-mate.postProcessors')) {
          this._postProcessorManager.reload();
          this._loadProfiles();
        }
        if (e.affectsConfiguration('code-mate.contextSize') || 
            e.affectsConfiguration('code-mate.maxContextSize') ||
            e.affectsConfiguration('code-mate.model') ||
            e.affectsConfiguration('code-mate.temperature') ||
            e.affectsConfiguration('code-mate.ollamaUrl') ||
            e.affectsConfiguration('code-mate.autoComplete')) {
          this._updateWebviewSettings();
        }
      })
    );

    this._panel.webview.html = this._getHtmlForWebview();
  }

  private async _handleMessage(message: any) {
    switch (message.command) {
      case 'webviewReady':
        // Webview is ready, send initial data
        const config = vscode.workspace.getConfiguration('code-mate');
        const modelInfo = await this._ollamaClient.getModelInfo();
        this._panel.webview.postMessage({
          command: 'settingsLoaded',
          settings: {
            ollamaUrl: config.get('ollamaUrl') || 'http://localhost:11434',
            model: config.get('model') || '',
            temperature: config.get('temperature') || 0.7,
            autoComplete: config.get('autoComplete') || true,
            contextSize: config.get('contextSize') || 4096,
            maxContextSize: config.get('maxContextSize') || 131072,
          },
          modelInfo: modelInfo
        });
        break;
      case 'sendMessage':
        await this._handleChatMessage(message.text);
        break;
      case 'stopGeneration':
        this._stopGeneration();
        break;
      case 'clearContext':
        this._clearContext();
        break;
      case 'compressContext':
        await this._compressContext();
        break;
      case 'selectProfile':
        await this._selectProfile(message.profileId);
        break;
      case 'requestProfiles':
        this._loadProfiles();
        break;
      case 'requestModels':
        await this._loadModels();
        break;
      case 'selectModel':
        await this._selectModel(message.model);
        break;
      case 'listConversations':
        await this._listConversations();
        break;
      case 'loadConversation':
        await this._loadConversation(message.id);
        break;
      case 'saveConversation':
        await this._saveConversation(message.conversation);
        break;
      case 'deleteConversation':
        await this._deleteConversation(message.id);
        break;
      case 'restoreConversation':
        this._restoreConversation(message.conversation);
        break;
      case 'forkConversation':
        await this._forkConversation(message.contextSnapshot, message.messages);
        break;
      case 'confirmDelete':
        await this._handleDeleteConfirmation(message.conversationName, message.conversationId);
        break;
      case 'compressConversation':
        await this._compressConversationById(message.id);
        break;
    }
  }

  private async _updateWebviewSettings() {
    const config = vscode.workspace.getConfiguration('code-mate');
    const modelInfo = await this._ollamaClient.getModelInfo();
    this._panel.webview.postMessage({
      command: 'settingsLoaded',
      settings: {
        ollamaUrl: config.get('ollamaUrl') || 'http://localhost:11434',
        model: config.get('model') || '',
        temperature: config.get('temperature') || 0.7,
        autoComplete: config.get('autoComplete') || true,
        contextSize: config.get('contextSize') || 4096,
        maxContextSize: config.get('maxContextSize') || 131072,
      },
      modelInfo: modelInfo
    });
  }

  private _stopGeneration() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
      this._apiLogChannel.appendLine(`[${new Date().toISOString()}] GENERATION STOPPED BY USER`);
    }
  }

  // ===== Conversation Management =====

  private async _listConversations() {
    try {
      const conversations = await this._conversationManager.list();
      this._panel.webview.postMessage({
        command: 'conversationsLoaded',
        conversations
      });
    } catch (error) {
      this._apiLogChannel.appendLine(`[ERROR] Failed to list conversations: ${error}`);
    }
  }

  private async _loadConversation(id: string) {
    try {
      const conversation = await this._conversationManager.load(id);
      if (conversation) {
        this._panel.webview.postMessage({
          command: 'conversationLoaded',
          conversation
        });
      } else {
        vscode.window.showErrorMessage(`Conversation not found: ${id}`);
      }
    } catch (error) {
      this._apiLogChannel.appendLine(`[ERROR] Failed to load conversation: ${error}`);
      vscode.window.showErrorMessage(`Failed to load conversation`);
    }
  }

  private async _saveConversation(data: { id?: string; name: string; messages: Array<{ role: string; content: string }> }) {
    try {
      const now = new Date().toISOString();
      const id = data.id || this._conversationManager.generateId();
      
      const conversation: Conversation = {
        id,
        name: data.name || 'Untitled',
        createdAt: data.id ? (await this._conversationManager.load(data.id))?.createdAt || now : now,
        updatedAt: now,
        messages: data.messages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
        ollamaContext: this._conversationContext,
        model: this._ollamaClient.getModel(),
        lastContextSize: this._conversationContext.length
      };
      
      await this._conversationManager.save(conversation);
      this._currentConversationId = id;
      
      this._panel.webview.postMessage({
        command: 'conversationSaved',
        id
      });
      
      this._apiLogChannel.appendLine(`[${new Date().toISOString()}] Conversation saved: ${id}`);
    } catch (error) {
      this._apiLogChannel.appendLine(`[ERROR] Failed to save conversation: ${error}`);
      vscode.window.showErrorMessage(`Failed to save conversation`);
    }
  }

  private async _deleteConversation(id: string) {
    try {
      const success = await this._conversationManager.delete(id);
      if (success) {
        // Refresh the list
        await this._listConversations();
        
        // If this was the current conversation, clear state
        if (this._currentConversationId === id) {
          this._currentConversationId = null;
        }
        
      this._apiLogChannel.appendLine(`[${new Date().toISOString()}] Conversation deleted: ${id}`);
      }
    } catch (error) {
      this._apiLogChannel.appendLine(`[ERROR] Failed to delete conversation: ${error}`);
      vscode.window.showErrorMessage(`Failed to delete conversation`);
    }
  }

  private async _handleDeleteConfirmation(conversationName: string, conversationId: string) {
    const result = await vscode.window.showWarningMessage(
      `Delete conversation "${conversationName}"?`,
      { modal: true },
      'Delete'
    );
    
    console.log(`[ChatPanel] Delete confirmation result:`, result);
    
    if (result === 'Delete') {
      console.log(`[ChatPanel] User confirmed delete, sending deleteConfirmed message`);
      // Send delete command back to webview
      this._panel.webview.postMessage({
        command: 'deleteConfirmed',
        conversationId: conversationId
      });
    } else {
      console.log(`[ChatPanel] User cancelled delete`);
    }
  }

  private _restoreConversation(conversation: Conversation) {
    // Restore backend state from loaded conversation
    this._currentConversationId = conversation.id;
    this._conversationContext = conversation.ollamaContext || [];
    this._conversationHistory = conversation.messages.map(m => ({ role: m.role, content: m.content }));
    this._messageId = conversation.messages.length;
    
    // Update context info in UI
    this._panel.webview.postMessage({
      command: 'updateContextInfo',
      tokenCount: this._conversationContext.length,
      messageCount: this._conversationHistory.length,
    });
    
    this._apiLogChannel.appendLine(`[${new Date().toISOString()}] Restored conversation: ${conversation.id} with ${this._conversationContext.length} context tokens`);
  }

  private async _forkConversation(contextSnapshot: number[], messages: Array<{ role: string; content: string }>) {
    // Clear current state and start fresh with forked context
    this._currentConversationId = null;
    this._conversationContext = contextSnapshot || [];
    this._conversationHistory = messages.map(m => ({ role: m.role, content: m.content }));
    this._messageId = 0;
    
    // Clear the UI
    this._panel.webview.postMessage({ command: 'clearChat' });
    
    // Replay messages in the UI
    for (const msg of messages) {
      const id = ++this._messageId;
      this._panel.webview.postMessage({
        command: 'addMessage',
        id,
        role: msg.role,
        content: msg.content,
      });
    }
    
    // Update context info
    this._panel.webview.postMessage({
      command: 'updateContextInfo',
      tokenCount: this._conversationContext.length,
      messageCount: this._conversationHistory.length,
    });
    
    this._apiLogChannel.appendLine(`[${new Date().toISOString()}] Forked conversation with ${this._conversationContext.length} context tokens and ${messages.length} messages`);
    vscode.window.showInformationMessage(`Forked conversation from message - ready to continue!`);
  }

  private async _handleChatMessage(userMessage: string) {
    const messageId = ++this._messageId;

    // Add to conversation history
    this._conversationHistory.push({ role: 'user', content: userMessage });

    // Log user message
    this._apiLogChannel.appendLine(`\n${'='.repeat(80)}`);
    this._apiLogChannel.appendLine(
      `[${new Date().toISOString()}] USER MESSAGE #${messageId}`
    );
    this._apiLogChannel.appendLine('─'.repeat(80));
    this._apiLogChannel.appendLine(userMessage);
    if (this._conversationContext.length > 0) {
      this._apiLogChannel.appendLine(
        `Context tokens: ${this._conversationContext.length}`
      );
    }
    this._apiLogChannel.appendLine('─'.repeat(80));

    // Send user message to webview
    this._panel.webview.postMessage({
      command: 'addMessage',
      id: messageId,
      role: 'user',
      content: userMessage,
    });

    // Create assistant message placeholder
    const assistantId = ++this._messageId;
    this._panel.webview.postMessage({
      command: 'addMessage',
      id: assistantId,
      role: 'assistant',
      content: '',
    });

    this._apiLogChannel.appendLine(
      `[${new Date().toISOString()}] ASSISTANT RESPONSE #${assistantId}`
    );
    this._apiLogChannel.appendLine('─'.repeat(80));

    // Create abort controller for this request
    this._abortController = new AbortController();
    const startTime = Date.now();

    try {
      // Stream raw JSON responses for logging
      let tokenCount = 0;
      let assistantResponse = '';

      // Use custom chat with context
      for await (const jsonResponse of this._ollamaClient.chatStreamRaw(
        userMessage,
        undefined,
        this._conversationContext.length > 0 ? this._conversationContext : undefined,
        this._abortController.signal
      )) {
        // Extract and display text content
        if (jsonResponse.response) {
          assistantResponse += jsonResponse.response;
          this._panel.webview.postMessage({
            command: 'updateMessage',
            id: assistantId,
            content: jsonResponse.response,
            append: true,
          });
          tokenCount++;
        }

        // Update context for next request
        if (jsonResponse.context) {
          this._conversationContext = jsonResponse.context;
        }
      }

      // Add to history
      this._conversationHistory.push({
        role: 'assistant',
        content: assistantResponse,
      });

      // Apply post-processing
      const processedResponse = this._applyPostProcessing(assistantResponse);
      
      // If post-processing changed the response, update the message
      if (processedResponse !== assistantResponse) {
        this._panel.webview.postMessage({
          command: 'updateMessage',
          id: assistantId,
          content: processedResponse,
          append: false,
        });
        // Update history with processed response
        this._conversationHistory[this._conversationHistory.length - 1].content = processedResponse;
      }

      // Log completion summary
      this._apiLogChannel.appendLine('─'.repeat(80));
      this._apiLogChannel.appendLine(
        `[${new Date().toISOString()}] RESPONSE COMPLETE (${tokenCount} chunks)`
      );
      if (this._conversationContext.length > 0) {
        this._apiLogChannel.appendLine(
          `Context saved: ${this._conversationContext.length} tokens`
        );
      }

      // Update context info in UI
      this._panel.webview.postMessage({
        command: 'updateContextInfo',
        tokenCount: this._conversationContext.length,
        messageCount: this._conversationHistory.length,
      });

      // Mark message as complete with stats and context snapshot
      const durationMs = Date.now() - startTime;
      this._panel.webview.postMessage({
        command: 'completeMessage',
        id: assistantId,
        tokenCount,
        durationMs,
        contextSnapshot: this._conversationContext,
      });
    } catch (error) {
      // Check if this was an abort
      if (axios.isCancel(error)) {
        this._apiLogChannel.appendLine('─'.repeat(80));
        this._apiLogChannel.appendLine(`[${new Date().toISOString()}] STREAM ABORTED`);
        this._panel.webview.postMessage({
          command: 'updateMessage',
          id: assistantId,
          content: '\n\n⏹ [Stopped]',
          append: true,
        });
      } else {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        this._apiLogChannel.appendLine(`[ERROR] ${errorMsg}`);
        this._apiLogChannel.appendLine('─'.repeat(80));
        this._panel.webview.postMessage({
          command: 'updateMessage',
          id: assistantId,
          content: `\n\n⚠️ Error: ${errorMsg}`,
          append: true,
        });
      }
      // Mark message complete even on error
      this._panel.webview.postMessage({
        command: 'completeMessage',
        id: assistantId,
        durationMs: Date.now() - startTime,
      });
    } finally {
      this._abortController = null;
    }
  }

  private _clearContext() {
    this._conversationContext = [];
    this._conversationHistory = [];
    this._messageId = 0;

    this._apiLogChannel.appendLine('\n' + '='.repeat(80));
    this._apiLogChannel.appendLine(
      `[${new Date().toISOString()}] CONTEXT CLEARED`
    );
    this._apiLogChannel.appendLine('─'.repeat(80));

    this._panel.webview.postMessage({
      command: 'clearChat',
    });

    this._panel.webview.postMessage({
      command: 'updateContextInfo',
      tokenCount: 0,
      messageCount: 0,
    });

    vscode.window.showInformationMessage('Conversation context cleared');
  }

  private async _compressConversationById(conversationId: string) {
    try {
      const conversation = await this._conversationManager.load(conversationId);
      if (!conversation) {
        vscode.window.showErrorMessage('Conversation not found');
        return;
      }

      this._apiLogChannel.appendLine('\n' + '='.repeat(80));
      this._apiLogChannel.appendLine(
        `[${new Date().toISOString()}] COMPRESSING CONTEXT FOR CONVERSATION: ${conversation.name}`
      );
      this._apiLogChannel.appendLine('─'.repeat(80));
      this._apiLogChannel.appendLine(`Current context size: ${conversation.ollamaContext.length} tokens`);

      vscode.window.showInformationMessage(
        `Compressing context for "${conversation.name}"...`,
        { modal: false }
      );

      // Create summary of messages
      const summary = conversation.messages
        .map(
          (m) =>
            `${m.role === 'user' ? '👤 User' : '🤖 Assistant'}: ${m.content.substring(0, 100)}...`
        )
        .join('\n');

      try {
        // Send a summarization request
        const summarizePrompt = `Summarize this conversation concisely in 2-3 sentences:\n\n${summary}`;

        let compressed = '';
        let compressedContext: number[] = [];
        for await (const jsonResponse of this._ollamaClient.chatStreamRaw(
          summarizePrompt,
          'You are a conversation summarizer. Create a brief, concise summary of the conversation in 2-3 sentences.'
        )) {
          if (jsonResponse.response) {
            compressed += jsonResponse.response;
          }
          if (jsonResponse.context) {
            compressedContext = jsonResponse.context;
          }
        }

        // Replace history with summary and system message
        const originalMessageCount = conversation.messages.length;
        conversation.messages = [
          {
            role: 'system',
            content: `[Context compressed from ${originalMessageCount} messages]`,
          },
          {
            role: 'assistant',
            content: compressed,
          }
        ];
        
        // Update conversation
        conversation.ollamaContext = compressedContext;
        conversation.lastContextSize = compressedContext.length;
        conversation.updatedAt = new Date().toISOString();
        
        await this._conversationManager.save(conversation);

        this._apiLogChannel.appendLine('─'.repeat(80));
        this._apiLogChannel.appendLine('Compressed summary:');
        this._apiLogChannel.appendLine(compressed);
        this._apiLogChannel.appendLine(
          `New context tokens: ${compressedContext.length}`
        );

        // Refresh the list
        await this._listConversations();

        vscode.window.showInformationMessage(
          `Compressed ${originalMessageCount} messages - context reduced to ${compressedContext.length} tokens`
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this._apiLogChannel.appendLine(`[ERROR] Compression failed: ${errorMsg}`);
        vscode.window.showErrorMessage(`Failed to compress context: ${errorMsg}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this._apiLogChannel.appendLine(`[ERROR] Failed to compress conversation: ${errorMsg}`);
      vscode.window.showErrorMessage(`Failed to compress conversation`);
    }
  }

  private async _compressContext() {
    if (this._conversationHistory.length === 0) {
      vscode.window.showWarningMessage('No conversation to compress');
      return;
    }

    const summary = this._conversationHistory
      .map(
        (m) =>
          `${m.role === 'user' ? '👤 User' : '🤖 Assistant'}: ${m.content.substring(0, 100)}...`
      )
      .join('\n');

    this._apiLogChannel.appendLine('\n' + '='.repeat(80));
    this._apiLogChannel.appendLine(
      `[${new Date().toISOString()}] COMPRESSING CONTEXT`
    );
    this._apiLogChannel.appendLine('─'.repeat(80));
    this._apiLogChannel.appendLine('Current conversation:');
    this._apiLogChannel.appendLine(summary);

    vscode.window.showInformationMessage(
      'Compressing conversation context...',
      { modal: false }
    );

    // Create summary message in UI
    const summaryId = ++this._messageId;
    this._panel.webview.postMessage({
      command: 'addMessage',
      id: summaryId,
      role: 'system',
      content: '📦 Compressing conversation history...',
    });

    try {
      // Send a summarization request
      const summarizePrompt = `Summarize this conversation concisely in 2-3 sentences:\n\n${summary}`;

      let compressed = '';
      for await (const jsonResponse of this._ollamaClient.chatStreamRaw(
        summarizePrompt,
        'You are a conversation summarizer. Create a brief, concise summary of the conversation in 2-3 sentences.'
      )) {
        if (jsonResponse.response) {
          compressed += jsonResponse.response;
        }
        if (jsonResponse.context) {
          this._conversationContext = jsonResponse.context;
        }
      }

      // Replace history with summary
      this._conversationHistory = [
        {
          role: 'system',
          content: `[Compressed: ${compressed}]`,
        },
      ];

      this._panel.webview.postMessage({
        command: 'updateMessage',
        id: summaryId,
        content: `✅ Context compressed:\n\n${compressed}`,
        append: false,
      });

      this._apiLogChannel.appendLine('─'.repeat(80));
      this._apiLogChannel.appendLine('Compressed summary:');
      this._apiLogChannel.appendLine(compressed);
      this._apiLogChannel.appendLine(
        `New context tokens: ${this._conversationContext.length}`
      );

      // Update UI
      this._panel.webview.postMessage({
        command: 'updateContextInfo',
        tokenCount: this._conversationContext.length,
        messageCount: 1,
      });

      vscode.window.showInformationMessage(
        `Compressed ${this._conversationHistory.length} messages into summary`
      );
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this._panel.webview.postMessage({
        command: 'updateMessage',
        id: summaryId,
        content: `❌ Compression failed: ${errorMsg}`,
        append: false,
      });
    }
  }

  private async _selectProfile(profileId: string | null) {
    try {
      await this._postProcessorManager.setActiveProfile(profileId);
      
      // Load profiles for UI update
      const profiles = this._postProcessorManager.getAllProfiles();
      const activeProfile = this._postProcessorManager.getActiveProfile();
      
      this._panel.webview.postMessage({
        command: 'profilesLoaded',
        profiles: profiles,
        activeProfileId: activeProfile?.id || null,
      });

      const profileName = activeProfile?.name || 'None';
      vscode.window.showInformationMessage(`Post-processor profile set to: ${profileName}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to select profile: ${errorMsg}`);
    }
  }

  private _loadProfiles(): void {
    const profiles = this._postProcessorManager.getAllProfiles();
    const activeProfile = this._postProcessorManager.getActiveProfile();
    
    this._panel.webview.postMessage({
      command: 'profilesLoaded',
      profiles: profiles,
      activeProfileId: activeProfile?.id || null,
    });
  }

  private async _loadModels(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('code-mate');
      const ollamaUrl = config.get('ollamaUrl') as string || 'http://localhost:11434';
      
      // Fetch models from Ollama
      const response = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 5000 });
      const models = response.data.models?.map((m: any) => m.name) || [];
      const currentModel = this._ollamaClient.getModel();
      
      this._panel.webview.postMessage({
        command: 'modelsLoaded',
        models: models,
        currentModel: currentModel,
      });
    } catch (error) {
      this._apiLogChannel.appendLine(`[ERROR] Failed to load models: ${error}`);
      // Send empty models list on error
      this._panel.webview.postMessage({
        command: 'modelsLoaded',
        models: [],
        currentModel: this._ollamaClient.getModel(),
      });
    }
  }

  private async _selectModel(model: string): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('code-mate');
      await config.update('model', model, true);
      
      // Update the client with new model
      const updatedConfig = vscode.workspace.getConfiguration('code-mate');
      this._ollamaClient.updateConfig({
        url: updatedConfig.get('ollamaUrl') as string || 'http://localhost:11434',
        model: model,
        temperature: updatedConfig.get('temperature') as number || 0.7,
        contextSize: updatedConfig.get('contextSize') as number || 4096,
      });
      
      // Fetch new model info and update webview
      const modelInfo = await this._ollamaClient.getModelInfo(model);
      this._panel.webview.postMessage({
        command: 'settingsLoaded',
        settings: {
          ollamaUrl: updatedConfig.get('ollamaUrl') || 'http://localhost:11434',
          model: model,
          temperature: updatedConfig.get('temperature') || 0.7,
          autoComplete: updatedConfig.get('autoComplete') || true,
          contextSize: updatedConfig.get('contextSize') || 4096,
          maxContextSize: updatedConfig.get('maxContextSize') || 131072,
        },
        modelInfo: modelInfo
      });
      
      vscode.window.showInformationMessage(`Model changed to: ${model}`);
      this._apiLogChannel.appendLine(`[CodeMate] Model changed to: ${model}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to select model: ${errorMsg}`);
      this._apiLogChannel.appendLine(`[ERROR] Failed to select model: ${errorMsg}`);
    }
  }

  private _applyPostProcessing(response: string): string {
    const activeProfile = this._postProcessorManager.getActiveProfile();
    if (!activeProfile) {
      return response;
    }

    const processorsMap = this._postProcessorManager.getProcessorsMap();
    const processed = executeProfile(activeProfile, processorsMap, response);
    
    if (processed !== response) {
      this._apiLogChannel.appendLine(`\n[POST-PROCESSING] Applied profile: ${activeProfile.name}`);
      this._apiLogChannel.appendLine('Original response preview:');
      this._apiLogChannel.appendLine(response.substring(0, 200) + '...');
      this._apiLogChannel.appendLine('Processed response preview:');
      this._apiLogChannel.appendLine(processed.substring(0, 200) + '...');
      this._apiLogChannel.appendLine('─'.repeat(80));
    } else {
      this._apiLogChannel.appendLine(`\n[POST-PROCESSING] Applied but no rule activated. Profile: ${activeProfile.name}`);
    }

    return processed;
  }

  private _getHtmlForWebview(): string {
    const webview = this._panel.webview;
    
    // Get URIs for the built Svelte app
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'build', 'assets', 'chat.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'build', 'assets', 'chat.css')
    );
    
    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://cdn.jsdelivr.net; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net; font-src ${webview.cspSource};">
  <title>Code Mate Chat</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }

  public dispose() {
    ChatPanel.currentPanel = undefined;
    this._disposables.forEach(d => d.dispose());
    this._panel.dispose();
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
