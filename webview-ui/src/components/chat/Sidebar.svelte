<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { conversations, sidebarCollapsed } from './chatStores';
  import ConversationItem from './ConversationItem.svelte';
  
  const dispatch = createEventDispatcher();
  
  function handleNewChat() {
    dispatch('newChat');
  }
  
  function handleSelect(event: CustomEvent<{ id: string }>) {
    dispatch('select', event.detail);
  }
  
  function handleDelete(event: CustomEvent<{ id: string }>) {
    dispatch('delete', event.detail);
  }
  
  function toggleSidebar() {
    sidebarCollapsed.update(v => !v);
  }
</script>

{#if !$sidebarCollapsed}
  <aside class="sidebar">
    <div class="sidebar-header">
      <button class="new-chat-btn" on:click={handleNewChat}>
        + New Chat
      </button>
      <button class="collapse-btn" on:click={toggleSidebar} title="Collapse sidebar">
        ◀
      </button>
    </div>
    
    <div class="conversations-list">
      {#if $conversations.length === 0}
        <div class="empty-state">
          No saved conversations yet
        </div>
      {:else}
        {#each $conversations as conv (conv.id)}
          <ConversationItem 
            conversation={conv}
            on:select={handleSelect}
            on:delete={handleDelete}
          />
        {/each}
      {/if}
    </div>
  </aside>
{/if}

<style>
  .sidebar {
    width: 260px;
    min-width: 260px;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--vscode-sideBar-background);
    border-right: 1px solid var(--vscode-panel-border);
  }
  
  .sidebar-header {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
  }
  
  .new-chat-btn {
    flex: 1;
    padding: 8px 12px;
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }
  
  .new-chat-btn:hover {
    background-color: var(--vscode-button-hoverBackground);
  }
  
  .collapse-btn {
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
    font-size: 12px;
  }
  
  .collapse-btn:hover {
    background-color: var(--vscode-list-hoverBackground);
  }
  
  .conversations-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }
  
  .conversations-list::-webkit-scrollbar {
    width: 6px;
  }
  
  .conversations-list::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .conversations-list::-webkit-scrollbar-thumb {
    background: var(--vscode-scrollbarSlider-background);
    border-radius: 3px;
  }
  
  .empty-state {
    padding: 20px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
  }
</style>
