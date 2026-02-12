<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { postMessage } from '../../vscode';
  import type { ConversationSummary } from '../../types';
  import { currentConversationId } from './chatStores';
  
  export let conversation: ConversationSummary;
  
  const dispatch = createEventDispatcher();
  
  $: isActive = $currentConversationId === conversation.id;
  
  function handleClick() {
    dispatch('select', { id: conversation.id });
  }
  
  async function handleDelete(event: MouseEvent) {
    console.log('[ConversationItem] handleDelete called', { conversation: conversation.name, eventType: event.type });
    event.stopPropagation();
    
    postMessage({
      command: 'confirmDelete',
      conversationName: conversation.name,
      conversationId: conversation.id
    });
  }
  
  function handleCompress(event: MouseEvent) {
    event.stopPropagation();
    postMessage({
      command: 'compressConversation',
      conversationId: conversation.id
    });
  }
  
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }
  
  function formatContextSize(size: number): string {
    if (size >= 1000) {
      const kValue = Math.round(size / 1000);
      return `${kValue}K`;
    }
    return size.toString();
  }
</script>

<div 
  class="conversation-item"
  class:active={isActive}
  on:click={handleClick}
  title={conversation.preview}
>
  <div class="conv-info">
    <div class="conv-name">{conversation.name}</div>
    <div class="conv-meta">
      {conversation.messageCount} msgs · {formatDate(conversation.updatedAt)}
    </div>
    {#if conversation.contextSize !== undefined}
      <div class="conv-context">
        📦 {conversation.lastContextSize || 0} / {formatContextSize(conversation.contextSize)} tokens
      </div>
    {/if}
  </div>
  <div class="actions">
    {#if conversation.contextSize !== undefined && conversation.contextSize > 0}
      <button 
        class="compress-btn"
        on:click={handleCompress}
        title="Compress context"
        aria-label="Compress conversation context"
      >
        ⚙
      </button>
    {/if}
    <button 
      class="delete-btn"
      on:click={handleDelete}
      title="Delete conversation"
      aria-label="Delete conversation"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="pointer-events: none;">
        <path d="M1.5 3h11M9 1.5H5M2 3.5v8.5c0 .55.45 1 1 1h8c.55 0 1-.45 1-1V3.5M5.5 6v5M8.5 6v5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .conversation-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 12px;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    color: var(--vscode-foreground);
    transition: background-color 0.15s;
  }
  
  .conversation-item:hover {
    background-color: var(--vscode-list-hoverBackground);
  }
  
  .conversation-item.active {
    background-color: var(--vscode-list-activeSelectionBackground);
    color: var(--vscode-list-activeSelectionForeground);
  }
  
  .conv-info {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
  
  .conv-name {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .conv-meta {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 2px;
  }
  
  .conv-context {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    margin-top: 3px;
    opacity: 0.8;
  }
  
  .active .conv-meta,
  .active .conv-context {
    color: var(--vscode-list-activeSelectionForeground);
    opacity: 0.8;
  }
  
  .actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
  
  .compress-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    opacity: 0.4;
    transition: opacity 0.15s, color 0.15s, background-color 0.15s;
    padding: 0;
    font-size: 14px;
  }
  
  .conversation-item:hover .compress-btn {
    opacity: 1;
  }
  
  .compress-btn:hover {
    color: var(--vscode-button-foreground);
    background-color: var(--vscode-button-background);
  }
  
  .delete-btn {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    opacity: 0.4;
    transition: opacity 0.15s, color 0.15s, background-color 0.15s;
    padding: 0;
  }
  
  .conversation-item:hover .delete-btn {
    opacity: 1;
  }
  
  .delete-btn:hover {
    color: var(--vscode-errorForeground);
    background-color: rgba(255, 0, 0, 0.1);
  }
  
  .delete-btn:active {
    background-color: rgba(255, 0, 0, 0.2);
  }
</style>
