<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { isStreaming, contextTokenCount, messages } from './chatStores';
  import { models, settings } from '../../stores';
  import { postMessage } from '../../vscode';
  
  const dispatch = createEventDispatcher();
  
  let inputText = '';
  let textareaEl: HTMLTextAreaElement;
  let contextSizeSlider: HTMLInputElement;
  
  // Context size configuration
  const CONTEXT_STEP = 1024; // Smaller step for smoother slider
  const CONTEXT_MIN = 1024;
  // CONTEXT_MAX is now dynamic based on settings
  
  function handleSend() {
    const text = inputText.trim();
    if (!text || $isStreaming) return;
    
    dispatch('send', { text });
    inputText = '';
    if (textareaEl) {
      textareaEl.style.height = '40px';
    }
  }
  
  function handleStop() {
    postMessage({ command: 'stopGeneration' });
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }
  
  function handleInput() {
    if (textareaEl) {
      textareaEl.style.height = 'auto';
      textareaEl.style.height = Math.min(textareaEl.scrollHeight, 120) + 'px';
    }
  }
  
  function handleModelChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const model = select.value;
    if (model) {
      postMessage({ command: 'selectModel', model });
    }
  }
  
  function handleContextSizeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const newSize = parseInt(input.value);
    // Update VS Code setting
    postMessage({ command: 'updateSetting', key: 'contextSize', value: newSize });
  }
  
  // Calculate approximate RAM usage for context
  function calculateContextRAM(contextSize: number): string {
    // More accurate estimate for LLM context memory usage
    // KV cache is typically 2-4 bytes per token depending on model and quantization
    // Using 3 bytes per token as a reasonable average
    const bytesPerToken = 3;
    const totalBytes = contextSize * bytesPerToken;
    
    if (totalBytes < 1024 * 1024) {
      // Show in KB for smaller contexts
      const totalKB = Math.round(totalBytes / 1024);
      return `${totalKB}KB`;
    } else {
      // Show in MB for larger contexts
      const totalMB = Math.round(totalBytes / (1024 * 1024));
      return `${totalMB}MB`;
    }
  }
  
  // Get model max context (rough estimates based on common models)
  function getModelMaxContext(modelName: string): number {
    const name = modelName.toLowerCase();
    if (name.includes('32k') || name.includes('32b')) return 32768;
    if (name.includes('128k')) return 131072;
    if (name.includes('256k')) return 262144;
    if (name.includes('llama') && name.includes('65b')) return 4096;
    if (name.includes('llama') && name.includes('13b')) return 4096;
    if (name.includes('llama') && name.includes('7b')) return 4096;
    if (name.includes('mistral') || name.includes('mixtral')) return 32768;
    if (name.includes('codellama')) return 16384;
    // Default fallback
    return 8192;
  }
  
  $: messageCount = $messages.length;
  $: modelMaxContext = getModelMaxContext($settings.model || '');
  $: userMaxContext = $settings.maxContextSize || 131072;
  $: currentContextMax = Math.min(modelMaxContext, userMaxContext);
  $: contextRAM = calculateContextRAM($settings.contextSize || 4096);
  $: contextPercentage = (($contextTokenCount || 0) / ($settings.contextSize || 4096)) * 100;
</script>

<div class="input-bar">
  <div class="input-container">
    <!-- Top line: Context usage -->
    <div class="context-usage">
      <span>📦 {$contextTokenCount || 0} / {$settings.contextSize || 4096} tokens</span>
      <div class="context-progress">
        <div class="context-bar">
          <div 
            class="context-fill" 
            class:warning={contextPercentage > 80} 
            class:error={contextPercentage > 95}
            style="width: {contextPercentage}%"
          ></div>
        </div>
      </div>
      <span class="ram-estimate">(~{contextRAM})</span>
    </div>
    
    <!-- Middle line: Auto-sizing text input -->
    <div class="input-wrapper">
      <textarea
        bind:this={textareaEl}
        bind:value={inputText}
        on:keydown={handleKeydown}
        on:input={handleInput}
        placeholder="Ask Code Mate anything..."
        disabled={$isStreaming}
      ></textarea>
    </div>
    
    <!-- Bottom line: Model selector and context size slider -->
    <div class="controls-row">
      <div class="model-section">
        <span class="model-label">Model:</span>
        <select class="model-select" bind:value={$settings.model}>
          {#each $models as model}
            <option value={model}>{model}</option>
          {/each}
        </select>
      </div>
      
      <div class="context-section">
        <span class="context-label">Context: {$settings.contextSize || 4096} tokens (~{contextRAM})</span>
        <div class="context-slider">
          <input
            type="number"
            class="context-input"
            min={CONTEXT_MIN}
            max={currentContextMax}
            step={CONTEXT_STEP}
            bind:value={$settings.contextSize}
            on:input={handleContextSizeChange}
            title="Context window size"
          />
          <input
            type="range"
            class="context-slider-input"
            min={CONTEXT_MIN}
            max={currentContextMax}
            step={CONTEXT_STEP}
            bind:value={$settings.contextSize}
            on:input={handleContextSizeChange}
            title="Context window size"
          />
          <span class="context-max">Max: {currentContextMax.toLocaleString()}</span>
        </div>
      </div>
      
      {#if $isStreaming}
        <button class="stop-btn" on:click={handleStop} title="Stop generation">
          ⏹
        </button>
      {:else}
        <button 
          class="send-btn" 
          on:click={handleSend}
          disabled={!inputText.trim()}
          title="Send message"
        >
          ➤
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .input-bar {
    padding: 16px;
    background-color: var(--vscode-editor-background);
  }
  
  .input-container {
    max-width: 800px;
    margin: 0 auto;
  }
  
  /* Top line: Context usage */
  .context-usage {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
  }
  
  .context-progress {
    flex: 1;
    margin: 0 12px;
  }
  
  .context-bar {
    width: 100%;
    height: 4px;
    background-color: var(--vscode-progressBar-background, var(--vscode-input-border));
    border-radius: 2px;
    overflow: hidden;
  }
  
  .context-fill {
    height: 100%;
    background-color: var(--vscode-progressBar-foreground, var(--vscode-focusBorder));
    transition: width 0.3s ease;
  }
  
  .context-fill.warning {
    background-color: var(--vscode-inputValidation-warningBackground, #ffcc00);
  }
  
  .context-fill.error {
    background-color: var(--vscode-inputValidation-errorBackground, #f48771);
  }
  
  /* Middle line: Text input */
  .input-wrapper {
    position: relative;
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 8px;
    margin-bottom: 8px;
    transition: border-color 0.2s ease;
  }
  
  .input-wrapper:focus-within {
    border-color: var(--vscode-focusBorder);
    box-shadow: 0 0 0 1px var(--vscode-focusBorder);
  }
  
  textarea {
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: transparent;
    color: var(--vscode-input-foreground);
    font-family: var(--vscode-font-family);
    font-size: 14px;
    resize: none;
    min-height: 20px;
    max-height: 200px;
    line-height: 1.4;
    outline: none;
    box-sizing: border-box;
  }
  
  textarea::placeholder {
    color: var(--vscode-input-placeholderForeground, var(--vscode-descriptionForeground));
  }
  
  textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  /* Bottom line: Controls */
  .controls-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .model-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .model-label {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    font-weight: 500;
  }
  
  .model-select {
    padding: 4px 8px;
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    background-color: var(--vscode-dropdown-background);
    color: var(--vscode-dropdown-foreground);
    font-size: 12px;
    cursor: pointer;
    outline: none;
    min-width: 120px;
  }
  
  .model-select:focus {
    border-color: var(--vscode-focusBorder);
  }
  
  .context-section {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .context-label {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    font-weight: 500;
    white-space: nowrap;
  }
  
  .context-slider {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .context-input {
    width: 80px;
    padding: 2px 6px;
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-size: 11px;
    text-align: center;
    outline: none;
  }
  
  .context-input:focus {
    border-color: var(--vscode-focusBorder);
  }
  
  .context-slider-input {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: var(--vscode-input-border);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }
  
  .context-slider-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--vscode-focusBorder);
    cursor: pointer;
  }
  
  .context-slider-input::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--vscode-focusBorder);
    cursor: pointer;
    border: none;
  }
  
  .context-max {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
  }
  
  .ram-estimate {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
  }
  
  .send-btn, .stop-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s ease;
    outline: none;
    margin-left: 8px;
  }
  
  .send-btn {
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }
  
  .send-btn:hover:not(:disabled) {
    background-color: var(--vscode-button-hoverBackground);
    transform: scale(1.05);
  }
  
  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  .stop-btn {
    background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
    color: var(--vscode-inputValidation-errorForeground, #fff);
    border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
  }
  
  .stop-btn:hover {
    opacity: 0.9;
    transform: scale(1.05);
  }
</style>
