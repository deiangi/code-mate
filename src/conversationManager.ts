/**
 * Conversation Manager
 * Handles saving/loading chat conversations to persistent storage
 * Storage location: %appdata%\.codemate\chats\ (Windows) or ~/.codemate/chats/ (Unix)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount?: number;
  durationMs?: number;
}

export interface Conversation {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  ollamaContext: number[];
  model?: string;
  lastContextSize?: number; // Size of last context returned
}

// Internal storage format with compressed context
interface StoredConversation {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  // Context stored as gzip-compressed base64 string
  ollamaContextCompressed?: string;
  // Fallback for old uncompressed format
  ollamaContext?: number[];
  lastContextSize?: number;
  model?: string;
  // Store context size for quick access during listing
  contextSize?: number;
}

export interface ConversationSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
  contextSize?: number; // Total context tokens
  lastContextSize?: number; // Last context used
}

export class ConversationManager {
  private storagePath: string;

  constructor() {
    // Use %appdata%\.codemate\chats on Windows, ~/.codemate/chats on Unix
    const baseDir = process.platform === 'win32'
      ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
      : os.homedir();
    
    this.storagePath = path.join(baseDir, '.codemate', 'chats');
    this.ensureStorageExists();
  }

  private ensureStorageExists(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  private getFilePath(id: string): string {
    return path.join(this.storagePath, `${id}.json`);
  }

  /**
   * Generate a unique conversation ID
   */
  generateId(): string {
    return `conv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Compress context array to base64 string
   */
  private async compressContext(context: number[]): Promise<string> {
    if (!context || context.length === 0) {
      return '';
    }
    const jsonStr = JSON.stringify(context);
    const compressed = await gzip(Buffer.from(jsonStr, 'utf-8'));
    return compressed.toString('base64');
  }

  /**
   * Decompress base64 string back to context array
   */
  private async decompressContext(compressed: string): Promise<number[]> {
    if (!compressed) {
      return [];
    }
    try {
      const buffer = Buffer.from(compressed, 'base64');
      const decompressed = await gunzip(buffer);
      return JSON.parse(decompressed.toString('utf-8'));
    } catch (error) {
      console.error('Failed to decompress context:', error);
      return [];
    }
  }

  /**
   * Save a conversation (compresses context for storage efficiency)
   */
  async save(conversation: Conversation): Promise<void> {
    this.ensureStorageExists();
    const filePath = this.getFilePath(conversation.id);
    
    // Compress context before saving
    const compressedContext = await this.compressContext(conversation.ollamaContext);
    
    const stored: StoredConversation = {
      id: conversation.id,
      name: conversation.name,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages,
      ollamaContextCompressed: compressedContext,
      model: conversation.model,
      lastContextSize: conversation.lastContextSize,
      contextSize: conversation.ollamaContext?.length || 0
    };
    
    const data = JSON.stringify(stored, null, 2);
    await fs.promises.writeFile(filePath, data, 'utf-8');
  }

  /**
   * Load a conversation by ID (decompresses context)
   */
  async load(id: string): Promise<Conversation | null> {
    const filePath = this.getFilePath(id);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const data = await fs.promises.readFile(filePath, 'utf-8');
      const stored = JSON.parse(data) as StoredConversation;
      
      // Decompress context (supports both old and new format)
      let ollamaContext: number[] = [];
      if (stored.ollamaContextCompressed) {
        ollamaContext = await this.decompressContext(stored.ollamaContextCompressed);
      } else if (stored.ollamaContext) {
        // Fallback for old uncompressed format
        ollamaContext = stored.ollamaContext;
      }
      
      return {
        id: stored.id,
        name: stored.name,
        createdAt: stored.createdAt,
        updatedAt: stored.updatedAt,
        messages: stored.messages,
        ollamaContext,
        lastContextSize: stored.lastContextSize,
        model: stored.model
      };
    } catch (error) {
      console.error(`Failed to load conversation ${id}:`, error);
      return null;
    }
  }

  /**
   * List all saved conversations (summaries only)
   */
  async list(): Promise<ConversationSummary[]> {
    this.ensureStorageExists();
    
    const files = await fs.promises.readdir(this.storagePath);
    const conversations: ConversationSummary[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      try {
        const filePath = path.join(this.storagePath, file);
        const data = await fs.promises.readFile(filePath, 'utf-8');
        const conv = JSON.parse(data) as StoredConversation;
        
        // Create summary with preview of last message
        const lastMessage = conv.messages[conv.messages.length - 1];
        const preview = lastMessage 
          ? lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : '')
          : '(empty)';

        // Calculate context size for display
        let contextSize = conv.contextSize;
        if (contextSize === undefined) {
          // For old conversations without stored contextSize, calculate from ollamaContext
          if (conv.ollamaContextCompressed) {
            // For compressed context, we can't efficiently get the length without decompressing
            // Use lastContextSize as fallback, or 0
            contextSize = conv.lastContextSize || 0;
          } else if (conv.ollamaContext) {
            contextSize = conv.ollamaContext.length;
          } else {
            contextSize = 0;
          }
        }

        conversations.push({
          id: conv.id,
          name: conv.name,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          messageCount: conv.messages.length,
          preview,
          contextSize,
          lastContextSize: conv.lastContextSize || contextSize
        });
      } catch (error) {
        console.error(`Failed to read conversation file ${file}:`, error);
      }
    }

    // Sort by updatedAt descending (most recent first)
    conversations.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return conversations;
  }

  /**
   * Delete a conversation
   */
  async delete(id: string): Promise<boolean> {
    const filePath = this.getFilePath(id);
    
    if (!fs.existsSync(filePath)) {
      return false;
    }

    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Failed to delete conversation ${id}:`, error);
      return false;
    }
  }

  /**
   * Rename a conversation
   */
  async rename(id: string, newName: string): Promise<boolean> {
    const conversation = await this.load(id);
    if (!conversation) {
      return false;
    }

    conversation.name = newName;
    conversation.updatedAt = new Date().toISOString();
    await this.save(conversation);
    return true;
  }

  /**
   * Get the storage path (for display/debugging)
   */
  getStoragePath(): string {
    return this.storagePath;
  }
}
