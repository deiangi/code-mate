<script lang="ts">
  import { afterUpdate } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { messages, conversationName, sidebarCollapsed, streamStartTime } from './chatStores';
  import Message from './Message.svelte';
  import InputBar from './InputBar.svelte';
  
  const dispatch = createEventDispatcher();
  
  let messagesContainer: HTMLDivElement;
  
  // Auto-scroll to bottom on new messages
  afterUpdate(() => {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });
  
  function handleSend(event: CustomEvent<{ text: string }>) {
    dispatch('sendMessage', { text: event.detail.text });
  }
  
  function handleFork(event: CustomEvent<{ messageId: number }>) {
    dispatch('forkConversation', { messageId: event.detail.messageId });
  }
  
  function toggleSidebar() {
    sidebarCollapsed.update(v => !v);
  }
</script>

<div class="chat-area">
  <header class="chat-header">
    {#if $sidebarCollapsed}
      <button class="expand-btn" on:click={toggleSidebar} title="Show conversations">
        ☰
      </button>
    {/if}
    <h1 class="chat-title">{$conversationName}</h1>
  </header>
  
  <div class="messages-container" bind:this={messagesContainer}>
    {#if $messages.length === 0}
      <div class="empty-state">
        <div class="empty-icon">💬</div>
        <h2>Start a conversation</h2>
        <p>Ask Code Mate anything about code, programming, or get help with your tasks.</p>
      </div>
    {:else}
      {#each $messages as message (message.id)}
        <Message 
          {message} 
          streamStartTime={message.isStreaming ? $streamStartTime : null}
          on:fork={handleFork}
        />
      {/each}
    {/if}
  </div>
  
  <InputBar on:send={handleSend} />
</div>

<style>
  .chat-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
  }
  
  .chat-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background-color: var(--vscode-editor-background);
  }
  
  .expand-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 16px;
  }
  
  .expand-btn:hover {
    background-color: var(--vscode-list-hoverBackground);
  }
  
  .chat-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--vscode-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .messages-container::-webkit-scrollbar {
    width: 8px;
  }
  
  .messages-container::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .messages-container::-webkit-scrollbar-thumb {
    background: var(--vscode-scrollbarSlider-background);
    border-radius: 4px;
  }
  
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    padding: 40px;
  }
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  .empty-state h2 {
    margin: 0 0 8px 0;
    font-size: 18px;
    color: var(--vscode-foreground);
  }
  
  .empty-state p {
    margin: 0;
    font-size: 14px;
    max-width: 300px;
  }
</style>
