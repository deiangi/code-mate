/**
 * Post-Processor Storage and Manager
 * Handles persistence via VS Code configuration
 */

import * as vscode from 'vscode';
import {
  PostProcessor,
  PostProcessorProfile,
  generateId,
  validatePostProcessor,
  validatePostProcessorProfile,
} from './postProcessors';

export class PostProcessorManager {
  private processors: Map<string, PostProcessor> = new Map();
  private profiles: Map<string, PostProcessorProfile> = new Map();
  private activeProfileId: string | null = null;

  constructor(private context: vscode.ExtensionContext) {
    this.loadFromStorage();
  }

  /**
   * Load all data from VS Code settings (Global scope)
   */
  private loadFromStorage(): void {
    const config = vscode.workspace.getConfiguration('code-mate');

    // Load processors from Global settings
    const processorsInspect = config.inspect<PostProcessor[]>('postProcessors.list');
    const processorsList = processorsInspect?.globalValue || [];
    this.processors.clear();
    processorsList.forEach((p) => {
      this.processors.set(p.id, p);
    });

    // Load profiles from Global settings
    const profilesInspect = config.inspect<PostProcessorProfile[]>('postProcessors.profiles');
    const profilesList = profilesInspect?.globalValue || [];
    this.profiles.clear();
    profilesList.forEach((p) => {
      this.profiles.set(p.id, p);
    });

    // Load active profile ID from Global settings
    const activeProfileInspect = config.inspect<string | null>('postProcessors.activeProfileId');
    this.activeProfileId = activeProfileInspect?.globalValue ?? null;
  }

  /**
   * Save all data to VS Code settings
   */
  private async saveToStorage(): Promise<void> {
    const config = vscode.workspace.getConfiguration('code-mate');

    await Promise.all([
      config.update('postProcessors.list', Array.from(this.processors.values()), vscode.ConfigurationTarget.Global),
      config.update('postProcessors.profiles', Array.from(this.profiles.values()), vscode.ConfigurationTarget.Global),
      config.update('postProcessors.activeProfileId', this.activeProfileId, vscode.ConfigurationTarget.Global),
    ]);
  }

  /**
   * Create a new post-processor
   */
  async createPostProcessor(data: Omit<PostProcessor, 'id' | 'createdAt' | 'updatedAt'>): Promise<PostProcessor> {
    const error = validatePostProcessor(data);
    if (error) {
      throw new Error(error);
    }

    const processor: PostProcessor = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.processors.set(processor.id, processor);
    await this.saveToStorage();
    return processor;
  }

  /**
   * Update a post-processor
   */
  async updatePostProcessor(id: string, data: Partial<Omit<PostProcessor, 'id' | 'createdAt'>>): Promise<PostProcessor> {
    const processor = this.processors.get(id);
    if (!processor) {
      throw new Error(`Post-processor not found: ${id}`);
    }

    const updated: PostProcessor = {
      ...processor,
      ...data,
      id: processor.id,
      createdAt: processor.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const error = validatePostProcessor(updated);
    if (error) {
      throw new Error(error);
    }

    this.processors.set(id, updated);
    await this.saveToStorage();
    return updated;
  }

  /**
   * Delete a post-processor
   */
  async deletePostProcessor(id: string): Promise<void> {
    if (!this.processors.has(id)) {
      throw new Error(`Post-processor not found: ${id}`);
    }

    // Remove from all profiles
    for (const profile of this.profiles.values()) {
      profile.postProcessorIds = profile.postProcessorIds.filter((pid) => pid !== id);
    }

    this.processors.delete(id);
    await this.saveToStorage();
  }

  /**
   * Get all post-processors
   */
  getAllPostProcessors(): PostProcessor[] {
    return Array.from(this.processors.values());
  }

  /**
   * Get a single post-processor
   */
  getPostProcessor(id: string): PostProcessor | undefined {
    return this.processors.get(id);
  }

  /**
   * Create a new profile
   */
  async createProfile(data: Omit<PostProcessorProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<PostProcessorProfile> {
    const error = validatePostProcessorProfile(data);
    if (error) {
      throw new Error(error);
    }

    const profile: PostProcessorProfile = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(profile.id, profile);
    await this.saveToStorage();
    return profile;
  }

  /**
   * Update a profile
   */
  async updateProfile(id: string, data: Partial<Omit<PostProcessorProfile, 'id' | 'createdAt'>>): Promise<PostProcessorProfile> {
    const profile = this.profiles.get(id);
    if (!profile) {
      throw new Error(`Profile not found: ${id}`);
    }

    const updated: PostProcessorProfile = {
      ...profile,
      ...data,
      id: profile.id,
      createdAt: profile.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const error = validatePostProcessorProfile(updated);
    if (error) {
      throw new Error(error);
    }

    this.profiles.set(id, updated);
    await this.saveToStorage();
    return updated;
  }

  /**
   * Delete a profile
   */
  async deleteProfile(id: string): Promise<void> {
    if (!this.profiles.has(id)) {
      throw new Error(`Profile not found: ${id}`);
    }

    if (this.activeProfileId === id) {
      this.activeProfileId = null;
    }

    this.profiles.delete(id);
    await this.saveToStorage();
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): PostProcessorProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get a single profile
   */
  getProfile(id: string): PostProcessorProfile | undefined {
    return this.profiles.get(id);
  }

  /**
   * Get the active profile
   */
  getActiveProfile(): PostProcessorProfile | undefined {
    if (!this.activeProfileId) return undefined;
    return this.profiles.get(this.activeProfileId);
  }

  /**
   * Set the active profile
   */
  async setActiveProfile(id: string | null): Promise<void> {
    if (id && !this.profiles.has(id)) {
      throw new Error(`Profile not found: ${id}`);
    }

    this.activeProfileId = id;
    await this.saveToStorage();
  }

  /**
   * Get processors map (for execution)
   */
  getProcessorsMap(): Map<string, PostProcessor> {
    return this.processors;
  }

  /**
   * Reload from storage (for when config changes externally)
   */
  reload(): void {
    this.loadFromStorage();
  }
}
