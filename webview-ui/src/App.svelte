<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    settings, 
    models, 
    profiles,
    processors,
    selectedProfileId,
    activeTab,
    loadingModels,
    savingSettings,
    creatingProcessor,
    creatingProfile,
    status
  } from './stores';
  import { onMessage, postMessage, signalReady } from './vscode';
  import ProfileList from './components/ProfileList.svelte';
  import ProcessorList from './components/ProcessorList.svelte';
  
  let tempModel = '';
  let currentModel = '';
  
  // Reactive: current selected model (use setting if valid, otherwise empty)
  $: {
    currentModel = $models.length > 0 && $models.includes($settings.model) ? $settings.model : '';
    console.log('[ConfigPanel] currentModel changed:', currentModel, 'models:', $models, 'settings.model:', $settings.model);
  }

  
  // Debug: log currentModel changes
  $: if (typeof window !== 'undefined') {
    console.log('[ConfigPanel] currentModel changed:', currentModel, 'models:', $models, 'settings.model:', $settings.model);
  }
  
  // Sync currentModel back to settings when it changes
  $: if (currentModel && currentModel !== $settings.model) {
    console.log('[ConfigPanel] Syncing currentModel to settings:', currentModel);
    settings.update(s => ({ ...s, model: currentModel }));
  }
  onMount(() => {
    // Setup message handler
    onMessage((msg) => {
      switch (msg.command) {
        case 'loadSettings':
          console.log('[ConfigPanel] loadSettings received:', msg.settings);
          settings.set(msg.settings);
          tempModel = msg.settings.model;
          break;
          
        case 'modelsLoaded':
          console.log('[ConfigPanel] modelsLoaded received:', msg.models);
          loadingModels.set(false);
          if (msg.success) {
            models.set(msg.models);
            // Update selected model if it exists in new list
            const currentModel = $settings.model;
            if (!msg.models.includes(currentModel) && msg.models.length > 0) {
              console.log('[ConfigPanel] Current model not in list, selecting first:', msg.models[0]);
              settings.update(s => ({ ...s, model: msg.models[0] }));
            }
          } else {
            status.set({ message: msg.error || 'Failed to load models', type: 'error' });
          }
          break;
          
        case 'settingsSaved':
          savingSettings.set(false);
          if (msg.success) {
            status.set({ message: 'Settings saved successfully!', type: 'success' });
            setTimeout(() => status.set({ message: '', type: '' }), 3000);
          } else {
            status.set({ message: 'Failed to save settings', type: 'error' });
          }
          break;
          
        case 'settingsLoaded':
          settings.set(msg.settings);
          break;
          
        case 'loadPostProcessors':
          processors.set(msg.processors || []);
          creatingProcessor.set(false);
          break;
          
        case 'loadProfiles':
          profiles.set(msg.profiles || []);
          creatingProfile.set(false);
          break;
          
        case 'processorCreated':
          creatingProcessor.set(false);
          // Processor data will be sent via loadPostProcessors
          break;
          
        case 'profileCreated':
          creatingProfile.set(false);
          if (msg.success && msg.profile) {
            selectedProfileId.set(msg.profile.id);
          }
          break;
      }
    });
    
    // Signal ready
    signalReady();
  });
  
  function refreshModels() {
    loadingModels.set(true);
    postMessage({
      command: 'refreshModels',
      ollamaUrl: $settings.ollamaUrl
    });
  }
  
  function saveSettings() {
    savingSettings.set(true);
    status.set({ message: '', type: '' });
    postMessage({
      command: 'saveSettings',
      settings: $settings
    });
  }
  
  function handleModelChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const model = select.value;
    console.log('[ConfigPanel] handleModelChange called with model:', model);
    if (model) {
      currentModel = model;
      postMessage({ command: 'selectModel', model });
    }
  }
</script>

<main>
  <div class="container">
    <h1>Code Mate Configuration</h1>
    
    <!-- Tabs -->
    <div class="tabs">
      <button 
        class="tab"
        class:active={$activeTab === 'settings'}
        on:click={() => activeTab.set('settings')}
      >
        Settings
      </button>
      <button 
        class="tab"
        class:active={$activeTab === 'processors'}
        on:click={() => activeTab.set('processors')}
      >
        Post-Processors
      </button>
    </div>
    
    <!-- Settings Tab -->
    {#if $activeTab === 'settings'}
      <div class="tab-content">
        <div class="section">
          <h2>Ollama Settings</h2>
          
          <div class="form-group">
            <label for="url">URL</label>
            <input
              id="url"
              type="text"
              bind:value={$settings.ollamaUrl}
              placeholder="http://localhost:11434"
            />
          </div>
          
          <div class="form-group">
            <label for="model">
              Model
              <button 
                class="refresh-btn"
                on:click={refreshModels}
                disabled={$loadingModels}
              >
                {$loadingModels ? 'Loading...' : 'Refresh'}
              </button>
            </label>
            <select id="model" value={currentModel} on:change={handleModelChange}>
              {#if $models.length === 0}
                <option value="">No models available</option>
              {:else}
                {#each $models as model}
                  <option value={model}>{model}</option>
                {/each}
              {/if}
            </select>
          </div>
          
          <div class="form-group">
            <label for="temperature">Temperature</label>
            <input
              id="temperature"
              type="number"
              bind:value={$settings.temperature}
              min="0"
              max="2"
              step="0.1"
            />
          </div>
          
          <div class="form-group">
            <label for="contextSize">Context Size (tokens)</label>
            <input
              id="contextSize"
              type="number"
              bind:value={$settings.contextSize}
              min="512"
              max="32768"
              step="1024"
            />
            <small>Current context window size used for conversations</small>
          </div>
          
          <div class="form-group">
            <label for="maxContextSize">Max Context Size (tokens)</label>
            <input
              id="maxContextSize"
              type="number"
              bind:value={$settings.maxContextSize}
              min="1024"
              max="1048576"
              step="1024"
            />
            <small>Maximum allowed context size (limits the context slider)</small>
          </div>
          
          <div class="form-group checkbox">
            <label>
              <input
                type="checkbox"
                bind:checked={$settings.autoComplete}
              />
              Enable Auto-Complete
            </label>
          </div>
          
          <button 
            class="save-btn"
            on:click={saveSettings}
            disabled={$savingSettings}
          >
            {$savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
          
          {#if $status.message}
            <div class="status" class:success={$status.type === 'success'} class:error={$status.type === 'error'}>
              {$status.message}
            </div>
          {/if}
        </div>
      </div>
    {/if}
    
    <!-- Processors Tab -->
    {#if $activeTab === 'processors'}
      <div class="tab-content processors-layout">
        <div class="left-panel">
          <ProfileList />
        </div>
        <div class="right-panel">
          <ProcessorList />
        </div>
      </div>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
  }
  
  :global(*) {
    box-sizing: border-box;
  }
  
  main {
    padding: 20px;
  }
  
  .container {
    max-width: 900px;
    margin: 0 auto;
  }
  
  h1 {
    margin: 0 0 20px 0;
    font-size: 24px;
    color: var(--vscode-titleBar-activeForeground);
  }
  
  .tabs {
    display: flex;
    border-bottom: 1px solid var(--vscode-widget-border);
    margin-bottom: 20px;
  }
  
  .tab {
    padding: 10px 20px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 14px;
  }
  
  .tab:hover {
    background: var(--vscode-list-hoverBackground);
  }
  
  .tab.active {
    border-bottom-color: var(--vscode-tab-activeBorder);
    color: var(--vscode-tab-foreground);
  }
  
  .tab-content {
    min-height: 400px;
  }
  
  .processors-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 20px;
    height: calc(100vh - 180px);
  }
  
  .left-panel,
  .right-panel {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 6px;
    padding: 15px;
    overflow: hidden;
  }
  
  .section {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 6px;
    padding: 20px;
    max-width: 600px;
  }
  
  h2 {
    margin: 0 0 20px 0;
    font-size: 18px;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  .form-group.checkbox {
    display: flex;
    align-items: center;
  }
  
  .form-group.checkbox label {
    display: flex;
    align-items: center;
    cursor: pointer;
  }
  
  .form-group.checkbox input {
    margin-right: 8px;
  }
  
  label {
    display: block;
    margin-bottom: 5px;
    font-size: 13px;
    color: var(--vscode-foreground);
  }
  
  input[type="text"],
  input[type="number"],
  select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--vscode-input-border);
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border-radius: 4px;
    font-size: 13px;
  }
  
  .refresh-btn {
    margin-left: 10px;
    padding: 4px 10px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
  }
  
  .refresh-btn:hover {
    background: var(--vscode-button-hoverBackground);
  }
  
  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .save-btn {
    padding: 10px 20px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }
  
  .save-btn:hover {
    background: var(--vscode-button-hoverBackground);
  }
  
  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .status {
    margin-top: 10px;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
  }
  
  .status.success {
    background: var(--vscode-testing-iconPassed);
    color: var(--vscode-button-foreground);
  }
  
  .status.error {
    background: var(--vscode-testing-iconFailed);
    color: var(--vscode-button-foreground);
  }
</style>
