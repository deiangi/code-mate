<script lang="ts">
  import { processors, creatingProcessor } from '../stores';
  import { postMessage } from '../vscode';
  import type { PostProcessor, PostProcessorType } from '../types';
  
  export let isOpen = false;
  export let onClose: () => void;
  export let editProcessor: PostProcessor | null = null;
  
  let name = '';
  let description = '';
  let type: PostProcessorType = 'regex-replace';
  let pattern = '';
  let replacement = '';
  let prefix = '';
  let suffix = '';
  
  let lastOpenState = false;
  
  // Initialize form only when dialog opens (not on every prop change)
  $: if (isOpen && !lastOpenState) {
    lastOpenState = true;
    initializeForm();
  }
  
  // Reset tracking when closed
  $: if (!isOpen && lastOpenState) {
    lastOpenState = false;
  }
  
  function initializeForm() {
    if (editProcessor) {
      // Edit mode
      name = editProcessor.name;
      description = editProcessor.description || '';
      type = editProcessor.type;
      pattern = editProcessor.pattern || '';
      replacement = editProcessor.replacement || '';
      prefix = editProcessor.prefix || '';
      suffix = editProcessor.suffix || '';
    } else {
      // Create mode
      name = '';
      description = '';
      type = 'regex-replace';
      pattern = '';
      replacement = '';
      prefix = '';
      suffix = '';
    }
  }
  
  function handleSubmit() {
    if (!name.trim()) return;
    
    // Validate based on type
    if (type === 'regex-replace' && !pattern) return;
    if (type === 'add-prefix' && !prefix) return;
    if (type === 'add-suffix' && !suffix) return;
    
    creatingProcessor.set(true);
    
    const processor: any = {
      name: name.trim(),
      description: description.trim(),
      type,
      enabled: true
    };
    
    if (type === 'regex-replace') {
      processor.pattern = pattern;
      processor.replacement = replacement;
    } else if (type === 'add-prefix') {
      processor.prefix = prefix;
    } else if (type === 'add-suffix') {
      processor.suffix = suffix;
    }
    
    if (editProcessor) {
      postMessage({
        command: 'updateProcessor',
        id: editProcessor.id,
        processor
      });
    } else {
      postMessage({
        command: 'createPostProcessor',
        processor
      });
    }
    
    onClose();
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }
</script>

{#if isOpen}
  <div class="modal-overlay" on:click={onClose} on:keydown={handleKeydown} role="dialog" aria-modal="true">
    <div class="modal-content" on:click|stopPropagation>
      <h3>{editProcessor ? 'Edit' : 'Create'} Processor</h3>
      
      <div class="form-group">
        <label for="proc-name">Name</label>
        <input
          id="proc-name"
          type="text"
          bind:value={name}
          placeholder="e.g., Fix thinking tags"
        />
      </div>
      
      <div class="form-group">
        <label for="proc-desc">Description (optional)</label>
        <input
          id="proc-desc"
          type="text"
          bind:value={description}
          placeholder="What this processor does"
        />
      </div>
      
      <div class="form-group">
        <label for="proc-type">Type</label>
        <select id="proc-type" bind:value={type}>
          <option value="regex-replace">Regex Replace</option>
          <option value="add-prefix">Add Prefix</option>
          <option value="add-suffix">Add Suffix</option>
        </select>
      </div>
      
      {#if type === 'regex-replace'}
        <div class="form-group">
          <label for="proc-pattern">Pattern (Regex)</label>
          <input
            id="proc-pattern"
            type="text"
            bind:value={pattern}
            placeholder="e.g., \\</thinking\\>"
            class="monospace"
          />
        </div>
        <div class="form-group">
          <label for="proc-replacement">Replacement</label>
          <input
            id="proc-replacement"
            type="text"
            bind:value={replacement}
            placeholder="e.g., <thinking></thinking>"
            class="monospace"
          />
        </div>
      {:else if type === 'add-prefix'}
        <div class="form-group">
          <label for="proc-prefix">Prefix Text</label>
          <input
            id="proc-prefix"
            type="text"
            bind:value={prefix}
            placeholder="Text to add at the beginning"
          />
        </div>
      {:else if type === 'add-suffix'}
        <div class="form-group">
          <label for="proc-suffix">Suffix Text</label>
          <input
            id="proc-suffix"
            type="text"
            bind:value={suffix}
            placeholder="Text to add at the end"
          />
        </div>
      {/if}
      
      <div class="modal-actions">
        <button class="secondary" on:click={onClose}>Cancel</button>
        <button 
          on:click={handleSubmit} 
          disabled={!name.trim() || (type === 'regex-replace' && !pattern) || (type === 'add-prefix' && !prefix) || (type === 'add-suffix' && !suffix)}
        >
          {editProcessor ? 'Update' : 'Create'} Processor
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 6px;
    padding: 20px;
    width: 450px;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  h3 {
    margin: 0 0 20px 0;
    font-size: 16px;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  label {
    display: block;
    margin-bottom: 5px;
    font-size: 13px;
    color: var(--vscode-foreground);
  }
  
  input, select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--vscode-input-border);
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border-radius: 4px;
    font-size: 13px;
    box-sizing: border-box;
  }
  
  .monospace {
    font-family: monospace;
  }
  
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }
  
  button {
    padding: 8px 16px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }
  
  button:hover {
    background: var(--vscode-button-hoverBackground);
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  button.secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
</style>
