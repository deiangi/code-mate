/**
 * Type definitions for Code Mate Webview UI
 */

export type PostProcessorType = 'regex-replace' | 'add-prefix' | 'add-suffix';

export interface PostProcessor {
  id: string;
  name: string;
  description?: string;
  type: PostProcessorType;
  enabled: boolean;
  pattern?: string;
  replacement?: string;
  prefix?: string;
  suffix?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostProcessorProfile {
  id: string;
  name: string;
  description?: string;
  postProcessorIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  ollamaUrl: string;
  model: string;
  temperature: number;
  autoComplete: boolean;
  contextSize: number;
}

export interface WebviewMessage {
  command: string;
  [key: string]: any;
}

// Chat types
export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  tokenCount?: number;
  durationMs?: number;  // How long the response took to generate
  markdownEnabled?: boolean;
  // Stored context snapshot after this response (for fork/revert)
  contextSnapshot?: number[];
}

export interface ConversationSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
}
