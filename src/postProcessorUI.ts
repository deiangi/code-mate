/**
 * Post-Processor UI Management
 * Handles the webview-based UI for creating and managing post-processors and profiles
 */

import * as vscode from 'vscode';
import { PostProcessorManager } from './postProcessorManager';
import { PostProcessor, PostProcessorProfile, PostProcessorType } from './postProcessors';

export class PostProcessorUI {
  constructor(
    private postProcessorManager: PostProcessorManager,
    private webview: vscode.Webview
  ) {}

  /**
   * Get HTML for post-processor management (without script tags)
   */
  getHtml(): string {
    return `
      <div style="padding: 20px; font-size: 14px;">
        <div style="margin-bottom: 30px;">
          <h2 style="margin-bottom: 15px;">Post-Processors</h2>
          <p style="color: var(--vscode-descriptionForeground); margin-bottom: 15px;">
            Create rules to transform model responses (e.g., fix formatting, extract data)
          </p>

          <div id="processorsList" style="margin-bottom: 20px;"></div>

          <div style="margin-bottom: 20px;">
            <h3 style="margin-bottom: 10px;">Create New Post-Processor</h3>
            
            <div class="form-group">
              <label>Name</label>
              <input type="text" id="ppName" placeholder="e.g., Fix thinking tags" style="width: 100%; padding: 6px; margin-bottom: 10px; border: 1px solid var(--vscode-input-border); border-radius: 4px;" />
            </div>

            <div class="form-group">
              <label>Description (optional)</label>
              <input type="text" id="ppDesc" placeholder="What this processor does" style="width: 100%; padding: 6px; margin-bottom: 10px; border: 1px solid var(--vscode-input-border); border-radius: 4px;" />
            </div>

            <div class="form-group">
              <label>Type</label>
              <select id="ppType" style="width: 100%; padding: 6px; margin-bottom: 10px; border: 1px solid var(--vscode-input-border); border-radius: 4px;">
                <option value="regex-replace">Regex Replace</option>
                <option value="add-prefix">Add Prefix</option>
                <option value="add-suffix">Add Suffix</option>
              </select>
            </div>

            <div id="ppTypeOptions" style="margin-bottom: 10px;">
              <div id="regexOptions" style="display: none;">
                <label>Pattern (Regex)</label>
                <input type="text" id="ppPattern" placeholder="e.g., \\</thinking\\>" style="width: 100%; padding: 6px; margin-bottom: 10px; border: 1px solid var(--vscode-input-border); border-radius: 4px; font-family: monospace;" />
                <label>Replacement</label>
                <input type="text" id="ppReplacement" placeholder="e.g., <thinking></thinking>" style="width: 100%; padding: 6px; margin-bottom: 10px; border: 1px solid var(--vscode-input-border); border-radius: 4px; font-family: monospace;" />
              </div>
              <div id="prefixOptions" style="display: none;">
                <label>Prefix Text</label>
                <input type="text" id="ppPrefix" placeholder="Text to add at the beginning" style="width: 100%; padding: 6px; margin-bottom: 10px; border: 1px solid var(--vscode-input-border); border-radius: 4px;" />
              </div>
              <div id="suffixOptions" style="display: none;">
                <label>Suffix Text</label>
                <input type="text" id="ppSuffix" placeholder="Text to add at the end" style="width: 100%; padding: 6px; margin-bottom: 10px; border: 1px solid var(--vscode-input-border); border-radius: 4px;" />
              </div>
            </div>

            <button id="createProcessorBtn" style="padding: 8px 16px; background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;">Create Processor</button>
            <div id="ppMessage" style="margin-top: 10px; font-size: 12px;"></div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--vscode-widget-border); padding-top: 20px;">
          <h2 style="margin-bottom: 15px;">Profiles</h2>
          <p style="color: var(--vscode-descriptionForeground); margin-bottom: 15px;">
            Group processors into profiles and use them for specific models
          </p>

          <div id="profilesList" style="margin-bottom: 20px;"></div>

          <div style="margin-bottom: 20px;">
            <h3 style="margin-bottom: 10px;">Create New Profile</h3>
            
            <div class="form-group">
              <label>Profile Name</label>
              <input type="text" id="profileName" placeholder="e.g., llama3.2-profile" style="width: 100%; padding: 6px; margin-bottom: 10px; border: 1px solid var(--vscode-input-border); border-radius: 4px;" />
            </div>

            <div class="form-group">
              <label>Description (optional)</label>
              <input type="text" id="profileDesc" placeholder="Profile description" style="width: 100%; padding: 6px; margin-bottom: 10px; border: 1px solid var(--vscode-input-border); border-radius: 4px;" />
            </div>

            <div class="form-group">
              <label>Post-Processors (select processors to include)</label>
              <div id="processorCheckboxes" style="border: 1px solid var(--vscode-input-border); border-radius: 4px; padding: 10px; max-height: 200px; overflow-y: auto; margin-bottom: 10px;"></div>
            </div>

            <button id="createProfileBtn" style="padding: 8px 16px; background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;">Create Profile</button>
            <div id="profileMessage" style="margin-top: 10px; font-size: 12px;"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Load and display processors and profiles
   */
  loadData(): void {
    const processors = this.postProcessorManager.getAllPostProcessors();
    const profiles = this.postProcessorManager.getAllProfiles();

    this.webview.postMessage({
      command: 'loadPostProcessors',
      processors: processors
    });

    this.webview.postMessage({
      command: 'loadProfiles',
      profiles: profiles
    });
  }

  /**
   * Handle messages from webview
   */
  async handleMessage(message: any): Promise<void> {
    try {
      switch (message.command) {
        case 'createPostProcessor':
          const processor = await this.postProcessorManager.createPostProcessor(message.processor);
          vscode.window.showInformationMessage(`✓ Processor "${processor.name}" created`);
          this.loadData();
          break;

        case 'deleteProcessor':
          await this.postProcessorManager.deletePostProcessor(message.id);
          vscode.window.showInformationMessage('✓ Processor deleted');
          this.loadData();
          break;

        case 'createProfile':
          const profile = await this.postProcessorManager.createProfile(message.profile);
          vscode.window.showInformationMessage(`✓ Profile "${profile.name}" created`);
          this.loadData();
          break;

        case 'deleteProfile':
          await this.postProcessorManager.deleteProfile(message.id);
          vscode.window.showInformationMessage('✓ Profile deleted');
          this.loadData();
          break;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Error: ${errorMsg}`);
    }
  }
}
