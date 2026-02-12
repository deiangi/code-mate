<script lang="ts">
  import { onMount } from 'svelte';
  import { postMessage, onMessage } from '../../vscode';
  import { models, modelInfo } from '../../stores';
  import Sidebar from './Sidebar.svelte';
  import ChatArea from './ChatArea.svelte';
  import {
    messages,
    conversations,
    currentConversationId,
    conversationName,
    isStreaming,
    streamStartTime,
    chatProfiles,
    activeProfileId,
    contextTokenCount,
    rawContent,
    clearMessages,
    addMessage,
    updateMessage,
    completeMessage
  } from './chatStores';
  
  // Configure marked on mount
  onMount(() => {
    if (typeof window !== 'undefined' && (window as any).marked) {
      (window as any).marked.setOptions({
        breaks: true,
        gfm: true
      });
    }
    
    // Set up message handler
    onMessage((msg) => {
      switch (msg.command) {
        case 'addMessage':
          addMessage(msg.role, msg.content, msg.role === 'assistant');
          break;
          
        case 'updateMessage':
          updateMessage(msg.id, msg.content, msg.append);
          break;
          
        case 'completeMessage':
          completeMessage(msg.id, msg.tokenCount, msg.durationMs, msg.contextSnapshot);
          isStreaming.set(false);
          // Auto-save after response completes
          saveCurrentConversation();
          break;
          
        case 'profilesLoaded':
          chatProfiles.set(msg.profiles || []);
          activeProfileId.set(msg.activeProfileId || null);
          break;
          
        case 'modelsLoaded':
          models.set(msg.models || []);
          // Update settings with current model
          settings.update(s => ({ ...s, model: msg.currentModel || s.model }));
          break;
          
        case 'settingsLoaded':
          settings.set(msg.settings || {});
          if (msg.modelInfo) {
            modelInfo.set(msg.modelInfo);
          }
          break;
          
        case 'updateContextInfo':
          contextTokenCount.set(msg.tokenCount || 0);
          break;
          
        case 'conversationsLoaded':
          conversations.set(msg.conversations || []);
          break;
          
        case 'conversationLoaded':
          if (msg.conversation) {
            loadConversationData(msg.conversation);
          }
          break;
          
        case 'conversationSaved':
          if (msg.id) {
            currentConversationId.set(msg.id);
          }
          // Refresh list
          postMessage({ command: 'listConversations' });
          break;
          
        case 'deleteConfirmed':
          postMessage({ 
            command: 'deleteConversation', 
            id: msg.conversationId 
          });
          // If deleting current conversation, clear chat
          if ($currentConversationId === msg.conversationId) {
            clearMessages();
          }
          break;
          
        case 'clearChat':
          clearMessages();
          break;
      }
    });
    
    // Signal ready and request initial data
    postMessage({ command: 'webviewReady' });
    postMessage({ command: 'requestProfiles' });
    postMessage({ command: 'requestModels' });
    postMessage({ command: 'listConversations' });
  });
  
  function loadConversationData(conv: any) {
    clearMessages();
    currentConversationId.set(conv.id);
    conversationName.set(conv.name);
    contextTokenCount.set(conv.ollamaContext?.length || 0);
    
    // Replay messages
    if (conv.messages) {
      conv.messages.forEach((m: any, idx: number) => {
        addMessage(m.role, m.content, false);
      });
    }
    
    // Tell backend to restore context
    postMessage({ 
      command: 'restoreConversation', 
      conversation: conv 
    });
  }
  
  function handleSendMessage(event: CustomEvent<{ text: string }>) {
    isStreaming.set(true);
    streamStartTime.set(Date.now());
    
    // Generate name from first message if new conversation
    if (!$currentConversationId && $messages.length === 0) {
      const preview = event.detail.text.substring(0, 30);
      conversationName.set(preview + (event.detail.text.length > 30 ? '...' : ''));
    }
    
    postMessage({ 
      command: 'sendMessage', 
      text: event.detail.text 
    });
  }
  
  function handleNewChat() {
    clearMessages();
    postMessage({ command: 'clearContext' });
  }
  
  function handleLoadConversation(event: CustomEvent<{ id: string }>) {
    postMessage({ 
      command: 'loadConversation', 
      id: event.detail.id 
    });
  }
  
  function handleDeleteConversation(event: CustomEvent<{ id: string }>) {
    postMessage({ 
      command: 'deleteConversation', 
      id: event.detail.id 
    });
    
    // If deleting current conversation, clear chat
    if ($currentConversationId === event.detail.id) {
      clearMessages();
    }
  }
  
  function handleCompressConversation(event: CustomEvent<{ id: string }>) {
    postMessage({ 
      command: 'compressConversation', 
      id: event.detail.id 
    });
  }
  
  function handleForkConversation(event: CustomEvent<{ messageId: number }>) {
    // Find the message and its context
    const msg = $messages.find(m => m.id === event.detail.messageId);
    if (!msg || !msg.contextSnapshot) return;
    
    // Get all messages up to and including this one
    const msgIndex = $messages.findIndex(m => m.id === event.detail.messageId);
    const messagesUpToFork = $messages.slice(0, msgIndex + 1).map(m => ({
      role: m.role,
      content: $rawContent.get(m.id) || m.content
    }));
    
    postMessage({
      command: 'forkConversation',
      messageId: event.detail.messageId,
      contextSnapshot: msg.contextSnapshot,
      messages: messagesUpToFork
    });
  }
  
  function saveCurrentConversation() {
    if ($messages.length === 0) return;
    
    // Build messages array from store
    const msgArray = $messages.map(m => ({
      role: m.role,
      content: $rawContent.get(m.id) || m.content
    }));
    
    postMessage({
      command: 'saveConversation',
      conversation: {
        id: $currentConversationId,
        name: $conversationName,
        messages: msgArray
      }
    });
  }
</script>

<svelte:head>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
</svelte:head>

<div class="chat-app">
  <Sidebar 
    on:newChat={handleNewChat}
    on:select={handleLoadConversation}
    on:delete={handleDeleteConversation}
  />
  <ChatArea 
    on:sendMessage={handleSendMessage} 
    on:forkConversation={handleForkConversation}
  />
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    overflow: hidden;
  }
  
  :global(*) {
    box-sizing: border-box;
  }
  
  .chat-app {
    display: flex;
    height: 100vh;
    width: 100%;
  }
</style>
