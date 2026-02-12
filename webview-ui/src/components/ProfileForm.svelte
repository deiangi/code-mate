<script lang="ts">
  import { settings, creatingProfile } from '../stores';
  import { postMessage } from '../vscode';
  import { tick, onMount } from 'svelte';
  
  export let isOpen = false;
  export let onClose: () => void;
  
  let name = '';
  let nameInput: HTMLInputElement | null = null;

  // Pre-fill name when the dialog opens, but only if the user hasn't typed anything yet.
  $: if (isOpen && !name) {
    const modelName = $settings.model || '';
    // Use last segment after '/' so 'hf/unsloth/nemotron' -> 'nemotron'
    const newName = modelName ? (modelName.split('/').pop() || modelName) : 'New Profile';
    console.log('[ProfileForm] initializing name from model:', { modelName, newName });
    name = newName;
  }

  // Debug: log when isOpen or settings change
  $: console.log('[ProfileForm] reactive -> isOpen:', isOpen);
  $: console.log('[ProfileForm] reactive -> $settings:', $settings);

  onMount(() => {
    console.log('[ProfileForm] onMount, initial isOpen:', isOpen, ' initial $settings:', $settings);
  });

  // When opened, focus the input so the user can type immediately
  $: if (isOpen) {
    tick().then(() => nameInput?.focus());
  }
  
  function handleSubmit() {
    console.log('[ProfileForm] saving to name :', {name });
    if (!name.trim()) return;
    
    creatingProfile.set(true);
    postMessage({
      command: 'createProfile',
      profile: { name: name.trim(), postProcessorIds: [] }
    });
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
      <h3>Create New Profile</h3>
      
      <div class="form-group">
        <label for="profile-name">Profile Name</label>
        <input
          id="profile-name"
          type="text"
          bind:this={nameInput}
          bind:value={name}
          placeholder="e.g., llama3.2-profile"
          on:keydown={(e) => e.key === 'Enter' && handleSubmit()}
        />
      </div>
      
      <div class="modal-actions">
        <button class="secondary" on:click={onClose}>Cancel</button>
        <button on:click={handleSubmit} disabled={!name.trim()}>
          Create Profile
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
    width: 400px;
    max-width: 90vw;
  }
  
  h3 {
    margin: 0 0 20px 0;
    font-size: 16px;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  label {
    display: block;
    margin-bottom: 5px;
    font-size: 13px;
    color: var(--vscode-foreground);
  }
  
  input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--vscode-input-border);
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border-radius: 4px;
    font-size: 13px;
    box-sizing: border-box;
  }
  
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
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
