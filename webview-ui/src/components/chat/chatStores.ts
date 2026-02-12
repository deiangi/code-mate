import { writable, derived } from 'svelte/store';
import type { ChatMessage, ConversationSummary, PostProcessorProfile } from '../../types';

// Current conversation ID (null = new unsaved conversation)
export const currentConversationId = writable<string | null>(null);

// Current conversation name
export const conversationName = writable<string>('New Chat');

// Messages in current conversation
export const messages = writable<ChatMessage[]>([]);

// Raw content storage for markdown toggle (messageId -> raw text)
export const rawContent = writable<Map<number, string>>(new Map());

// List of saved conversations (summaries)
export const conversations = writable<ConversationSummary[]>([]);

// Sidebar collapsed state
export const sidebarCollapsed = writable<boolean>(false);

// Is currently streaming a response
export const isStreaming = writable<boolean>(false);

// Stream start time for real-time duration tracking
export const streamStartTime = writable<number | null>(null);

// Default markdown setting for new messages
export const defaultMarkdownEnabled = writable<boolean>(true);

// Current message ID counter
export const messageIdCounter = writable<number>(0);

// Post-processor profiles for chat
export const chatProfiles = writable<PostProcessorProfile[]>([]);
export const activeProfileId = writable<string | null>(null);

// Context info
export const contextTokenCount = writable<number>(0);

// Helper to generate next message ID
export function getNextMessageId(): number {
  let id: number = 0;
  messageIdCounter.update(n => {
    id = n + 1;
    return id;
  });
  return id;
}

// Helper to add a message
export function addMessage(role: ChatMessage['role'], content: string, isStreaming = false): number {
  const id = getNextMessageId();
  let useMarkdown = true;
  defaultMarkdownEnabled.subscribe(v => useMarkdown = v)();
  
  const message: ChatMessage = { 
    id, 
    role, 
    content, 
    isStreaming,
    markdownEnabled: role === 'assistant' ? useMarkdown : undefined
  };
  messages.update(msgs => [...msgs, message]);
  
  // Store raw content
  rawContent.update(map => {
    map.set(id, content);
    return map;
  });
  
  return id;
}

// Helper to update a message
export function updateMessage(id: number, content: string, append: boolean = false): void {
  messages.update(msgs => 
    msgs.map(m => {
      if (m.id === id) {
        const newContent = append ? m.content + content : content;
        return { ...m, content: newContent };
      }
      return m;
    })
  );
  
  // Update raw content
  rawContent.update(map => {
    const current = map.get(id) || '';
    map.set(id, append ? current + content : content);
    return map;
  });
}

// Helper to mark message as complete (not streaming)
export function completeMessage(id: number, tokenCount?: number, durationMs?: number, contextSnapshot?: number[]): void {
  messages.update(msgs => 
    msgs.map(m => m.id === id ? { ...m, isStreaming: false, tokenCount, durationMs, contextSnapshot } : m)
  );
  streamStartTime.set(null);
}

// Helper to toggle markdown for a specific message
export function toggleMessageMarkdown(id: number): void {
  messages.update(msgs => 
    msgs.map(m => m.id === id ? { ...m, markdownEnabled: !m.markdownEnabled } : m)
  );
}

// Helper to clear all messages
export function clearMessages(): void {
  messages.set([]);
  rawContent.set(new Map());
  messageIdCounter.set(0);
  currentConversationId.set(null);
  conversationName.set('New Chat');
  contextTokenCount.set(0);
}
