<script lang="ts">
  import { 
    selectedProfile, 
    profileProcessors, 
    availableProcessors, 
    creatingProcessor,
    processors 
  } from '../stores';
  import { postMessage } from '../vscode';
  import ProcessorForm from './ProcessorForm.svelte';
  import type { PostProcessor } from '../types';
  
  let showProcessorForm = false;
  let editProcessor: PostProcessor | null = null;
  let showAddDropdown = false;
  let showExistingSubmenu = false;
  
  function moveProcessor(index: number, direction: 'up' | 'down') {
    if (!$selectedProfile) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const ids = [...$selectedProfile.postProcessorIds];
    
    if (newIndex < 0 || newIndex >= ids.length) return;
    
    // Swap
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    
    postMessage({
      command: 'reorderProcessors',
      profileId: $selectedProfile.id,
      processorIds: ids
    });
  }
  
  function removeProcessor(processorId: string) {
    if (!$selectedProfile) return;
    
    postMessage({
      command: 'removeProcessorFromProfile',
      profileId: $selectedProfile.id,
      processorId
    });
  }
  
  function addExistingProcessor(processorId: string) {
    if (!$selectedProfile) return;
    
    postMessage({
      command: 'addProcessorToProfile',
      profileId: $selectedProfile.id,
      processorId
    });
    
    showAddDropdown = false;
    showExistingSubmenu = false;
  }
  
  function addAllProcessors() {
    if (!$selectedProfile || $availableProcessors.length === 0) return;
    
    postMessage({
      command: 'addAllProcessorsToProfile',
      profileId: $selectedProfile.id,
      processorIds: $availableProcessors.map(p => p.id)
    });
    
    showAddDropdown = false;
  }
  
  function openCreateForm() {
    editProcessor = null;
    showProcessorForm = true;
    showAddDropdown = false;
  }
  
  function openEditForm(processor: PostProcessor) {
    editProcessor = processor;
    showProcessorForm = true;
  }
  
  function closeAddMenu() {
    showAddDropdown = false;
    showExistingSubmenu = false;
  }
</script>

{#if !$selectedProfile}
  <div class="empty-state">
    <div class="empty-text">
      {$processors.length} rules available.<br>
      Create a profile to use them.
    </div>
  </div>
{:else}
  <div class="processor-list">
    <div class="header">
      <div>
        <h2>{$selectedProfile.name}</h2>
        <div class="subtitle">Run order (top to bottom)</div>
      </div>
      
      <div class="dropdown-container">
        <button 
          class="add-btn"
          on:click={() => showAddDropdown = !showAddDropdown}
        >
          Add ▼
        </button>
        
        {#if showAddDropdown}
          <div class="dropdown-menu">
            <div class="dropdown-item" on:click={openCreateForm}>
              Create New...
            </div>
            
            {#if $availableProcessors.length > 0}
              <div 
                class="dropdown-item has-submenu"
                on:mouseenter={() => showExistingSubmenu = true}
                on:mouseleave={() => showExistingSubmenu = false}
              >
                Add Existing ▶
                
                {#if showExistingSubmenu}
                  <div class="submenu">
                    {#each $availableProcessors as processor}
                      <div 
                        class="submenu-item"
                        on:click={() => addExistingProcessor(processor.id)}
                      >
                        {processor.name}
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
              
              <div class="dropdown-divider"></div>
              
              <div 
                class="dropdown-item"
                on:click={addAllProcessors}
              >
                Add all ({$availableProcessors.length} available)
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
    
    {#if $profileProcessors.length === 0}
      <div class="no-processors">
        No processors in this profile.<br>
        Click "Add" to create or add existing rules.
      </div>
    {:else}
      <div class="processors">
        {#each $profileProcessors as processor, index}
          <div class="processor-item">
            <div class="processor-number">{index + 1}</div>
            <div class="processor-info" on:click={() => openEditForm(processor)}>
              <div class="processor-name">{processor.name}</div>
              <div class="processor-type">{processor.type}</div>
            </div>
            <div class="processor-actions">
              <button 
                class="action-btn"
                disabled={index === 0}
                on:click={() => moveProcessor(index, 'up')}
                title="Move up"
              >
                ↑
              </button>
              <button 
                class="action-btn"
                disabled={index === $profileProcessors.length - 1}
                on:click={() => moveProcessor(index, 'down')}
                title="Move down"
              >
                ↓
              </button>
              <button 
                class="action-btn remove"
                on:click={() => removeProcessor(processor.id)}
                title="Remove from profile"
              >
                ✕
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<!-- Click outside to close dropdown -->
{#if showAddDropdown}
  <div class="click-catcher" on:click={closeAddMenu}></div>
{/if}

<ProcessorForm 
  isOpen={showProcessorForm}
  {editProcessor}
  onClose={() => showProcessorForm = false}
/>

<style>
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }
  
  .empty-text {
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-size: 14px;
    line-height: 1.6;
  }
  
  .processor-list {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--vscode-widget-border);
  }
  
  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
  
  .subtitle {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 2px;
  }
  
  .dropdown-container {
    position: relative;
  }
  
  .add-btn {
    padding: 8px 16px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }
  
  .add-btn:hover {
    background: var(--vscode-button-hoverBackground);
  }
  
  .dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: var(--vscode-dropdown-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    min-width: 160px;
    z-index: 100;
  }
  
  .dropdown-item {
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    color: var(--vscode-dropdown-foreground);
  }
  
  .dropdown-item:hover {
    background: var(--vscode-list-hoverBackground);
  }
  
  .dropdown-item.has-submenu {
    position: relative;
  }
  
  .dropdown-divider {
    height: 1px;
    background: var(--vscode-widget-border);
    margin: 4px 0;
  }
  
  .submenu {
    position: absolute;
    left: 100%;
    top: 0;
    background: var(--vscode-dropdown-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    min-width: 150px;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .submenu-item {
    padding: 6px 12px;
    cursor: pointer;
    font-size: 13px;
    color: var(--vscode-dropdown-foreground);
  }
  
  .submenu-item:hover {
    background: var(--vscode-list-hoverBackground);
  }
  
  .click-catcher {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 99;
  }
  
  .no-processors {
    text-align: center;
    padding: 40px 20px;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    line-height: 1.6;
  }
  
  .processors {
    flex: 1;
    overflow-y: auto;
  }
  
  .processor-item {
    display: flex;
    align-items: center;
    padding: 12px;
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    margin-bottom: 8px;
    background: var(--vscode-editor-background);
  }
  
  .processor-number {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 50%;
    font-size: 12px;
    font-weight: 600;
    margin-right: 12px;
  }
  
  .processor-info {
    flex: 1;
    cursor: pointer;
  }
  
  .processor-info:hover .processor-name {
    text-decoration: underline;
  }
  
  .processor-name {
    font-weight: 500;
    font-size: 13px;
  }
  
  .processor-type {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 2px;
  }
  
  .processor-actions {
    display: flex;
    gap: 4px;
  }
  
  .action-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  
  .action-btn:hover:not(:disabled) {
    background: var(--vscode-button-hoverBackground);
  }
  
  .action-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  
  .action-btn.remove:hover {
    background: var(--vscode-errorForeground);
    color: white;
  }
</style>
