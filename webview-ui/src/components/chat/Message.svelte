<script lang="ts">
  import { onDestroy, createEventDispatcher } from 'svelte';
  import { rawContent, toggleMessageMarkdown } from './chatStores';
  import type { ChatMessage } from '../../types';
  
  export let message: ChatMessage;
  export let streamStartTime: number | null = null;
  
  const dispatch = createEventDispatcher();
  
  // Real-time counter state
  let liveTokenCount = 0;
  let liveElapsedMs = 0;
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  
  // Track streaming state changes
  $: if (message.isStreaming && streamStartTime) {
    startTimer();
  } else {
    stopTimer();
  }
  
  // Count tokens from raw content length changes
  $: if (message.isStreaming) {
    const content = $rawContent.get(message.id) || '';
    // Rough token estimate: count chunks (will be updated by actual count on complete)
    liveTokenCount = content.split(/\s+/).filter(s => s).length;
  }
  
  function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
      if (streamStartTime) {
        liveElapsedMs = Date.now() - streamStartTime;
      }
    }, 100); // Update every 100ms for smoother display
  }
  
  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }
  
  onDestroy(() => stopTimer());
  
  // Get raw content for this message
  $: raw = $rawContent.get(message.id) || message.content;
  
  // Render content based on per-message markdown setting
  $: useMarkdown = message.markdownEnabled ?? true;
  $: renderedContent = useMarkdown && message.role === 'assistant' 
    ? renderMarkdown(raw)
    : escapeHtml(raw);
  
  // Display values: use live during streaming, final when complete
  $: displayTokens = message.isStreaming ? liveTokenCount : (message.tokenCount || 0);
  $: displayDuration = message.isStreaming ? liveElapsedMs : (message.durationMs || 0);
  
  function renderMarkdown(text: string): string {
    if (typeof window !== 'undefined' && (window as any).marked) {
      return (window as any).marked.parse(text);
    }
    return escapeHtml(text);
  }
  
  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function getRoleIcon(role: string): string {
    switch (role) {
      case 'user': return '👤';
      case 'assistant': return '🤖';
      case 'system': return '⚙️';
      default: return '💬';
    }
  }
  
  function formatDuration(ms: number): string {
    if (!ms) return '0.0s';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }
  
  function handleToggleMd() {
    toggleMessageMarkdown(message.id);
  }
  
  function handleFork() {
    dispatch('fork', { messageId: message.id });
  }
</script>

<div class="message {message.role}">
  <div class="message-icon">{getRoleIcon(message.role)}</div>
  <div class="message-wrapper">
    {#if message.role === 'assistant'}
      <div class="message-header" class:streaming={message.isStreaming}>
        <label class="md-toggle" title="Toggle Markdown rendering">
          <input type="checkbox" checked={useMarkdown} on:change={handleToggleMd}>
          MD
        </label>
        <span class="stat" class:live={message.isStreaming} title="Tokens generated">
          🎫 {displayTokens}
        </span>
        {#if message.contextSnapshot}
          <span class="stat" title="Context size">
            📦 {message.contextSnapshot.length}
          </span>
        {/if}
        <span class="stat" class:live={message.isStreaming} title="Generation time">
          ⏱ {formatDuration(displayDuration)}
        </span>
        {#if !message.isStreaming && message.contextSnapshot}
          <button class="fork-btn" on:click={handleFork} title="Fork conversation from here">
            🔀 Fork
          </button>
        {/if}
      </div>
    {/if}
    <div 
      class="message-content" 
      class:markdown={useMarkdown && message.role === 'assistant'}
      class:streaming={message.isStreaming}
    >
      {#if message.role === 'assistant' && useMarkdown && !message.isStreaming}
        {@html renderedContent}
      {:else}
        {message.content}
      {/if}
      {#if message.isStreaming}
        <span class="cursor">▋</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .message {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .message.user {
    flex-direction: row-reverse;
  }

  .message-icon {
    font-size: 20px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .message-wrapper {
    max-width: 80%;
    display: flex;
    flex-direction: column;
  }

  .message-content {
    background-color: var(--vscode-editor-selectionBackground);
    color: var(--vscode-editor-foreground);
    border-radius: 12px;
    padding: 12px 16px;
    word-wrap: break-word;
    line-height: 1.5;
  }

  .message.user .message-content {
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-radius: 12px 12px 4px 12px;
  }

  .message.assistant .message-content {
    border-radius: 12px 12px 12px 4px;
    border-left: 3px solid var(--vscode-button-background);
  }

  .message.system .message-content {
    color: var(--vscode-descriptionForeground);
    border-left: 3px solid var(--vscode-descriptionForeground);
    font-style: italic;
    font-size: 13px;
  }

  /* Markdown styles */
  .message-content.markdown :global(code) {
    background-color: var(--vscode-editor-background);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
    font-size: 12px;
  }

  .message-content.markdown :global(pre) {
    background-color: var(--vscode-editor-background);
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 8px 0;
  }

  .message-content.markdown :global(pre code) {
    background-color: transparent;
    padding: 0;
    border-radius: 0;
  }

  .message-content.markdown :global(h1),
  .message-content.markdown :global(h2),
  .message-content.markdown :global(h3) {
    margin: 12px 0 8px 0;
    font-weight: 600;
  }
  .message-content.markdown :global(h1) { font-size: 1.4em; }
  .message-content.markdown :global(h2) { font-size: 1.2em; }
  .message-content.markdown :global(h3) { font-size: 1.1em; }

  .message-content.markdown :global(ul),
  .message-content.markdown :global(ol) {
    margin: 8px 0;
    padding-left: 24px;
  }

  .message-content.markdown :global(li) {
    margin: 4px 0;
  }

  .message-content.markdown :global(blockquote) {
    border-left: 3px solid var(--vscode-textBlockQuote-border);
    margin: 8px 0;
    padding: 4px 12px;
    color: var(--vscode-textBlockQuote-foreground);
  }

  .message-content.markdown :global(p) {
    margin: 8px 0;
  }

  .message-content.markdown :global(p:first-child) {
    margin-top: 0;
  }

  .message-content.markdown :global(p:last-child) {
    margin-bottom: 0;
  }

  .message-content.markdown :global(a) {
    color: var(--vscode-textLink-foreground);
  }

  .message-content.markdown :global(hr) {
    border: none;
    border-top: 1px solid var(--vscode-widget-border);
    margin: 12px 0;
  }

  /* Streaming cursor */
  .cursor {
    animation: blink 1s infinite;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }

  /* Message header with stats (at top) */
  .message-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 6px;
    padding: 4px 8px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    background: var(--vscode-editor-background);
    border-radius: 6px 6px 0 0;
    border-bottom: 1px solid var(--vscode-widget-border);
  }

  .message-header.streaming {
    background: linear-gradient(90deg, 
      var(--vscode-editor-background) 0%, 
      var(--vscode-editor-selectionBackground) 50%,
      var(--vscode-editor-background) 100%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .md-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    user-select: none;
    opacity: 0.7;
  }

  .md-toggle:hover {
    opacity: 1;
  }

  .md-toggle input {
    cursor: pointer;
    width: 12px;
    height: 12px;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 3px;
    opacity: 0.8;
  }

  .stat.live {
    color: var(--vscode-charts-green, #4ec9b0);
    font-weight: 500;
  }

  .fork-btn {
    margin-left: auto;
    padding: 2px 8px;
    font-size: 10px;
    background: transparent;
    border: 1px solid var(--vscode-button-secondaryBackground);
    color: var(--vscode-descriptionForeground);
    border-radius: 4px;
    cursor: pointer;
    opacity: 0.7;
  }

  .fork-btn:hover {
    opacity: 1;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
</style>
