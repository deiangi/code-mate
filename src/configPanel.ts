import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { getPostProcessorManager, getOutputChannel } from './extension';
import { PostProcessorUI } from './postProcessorUI';

export class ConfigPanel {
  public static currentPanel: ConfigPanel | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private postProcessorUI: PostProcessorUI | undefined;

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ConfigPanel.currentPanel) {
      ConfigPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'codeMateConfig',
      'Code Mate - Configuration',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media', 'build'),
          vscode.Uri.joinPath(extensionUri, 'media', 'build', 'assets')
        ],
      }
    );

    ConfigPanel.currentPanel = new ConfigPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.onDidDispose(() => this.dispose(), null);
    this._panel.webview.onDidReceiveMessage(
      (message) => this._handleMessage(message),
      null
    );

    this._panel.webview.html = this._getHtmlForWebview();
    this._initializePanel();
  }

  private async _initializePanel() {
    // Wait for webview to signal it's ready (handled in _handleMessage)
  }

  private _webviewReady: boolean = false;

  private async _handleMessage(message: any) {
    switch (message.command) {
      case 'webviewReady':
        this._webviewReady = true;
        this._loadSettings();
        const config = vscode.workspace.getConfiguration('code-mate');
        const ollamaUrl = config.get('ollamaUrl') as string || 'http://localhost:11434';
        await this._loadModels(ollamaUrl);
        try {
          this.postProcessorUI = new PostProcessorUI(getPostProcessorManager(), this._panel.webview);
          if (this.postProcessorUI) {
            this.postProcessorUI.loadData();
          }
        } catch (error) {
          console.error('Failed to initialize post-processor UI:', error);
        }
        break;
      case 'saveSettings':
        await this._saveSettings(message.settings);
        break;
      case 'refreshModels':
        await this._loadModels(message.ollamaUrl);
        break;
      case 'createPostProcessor':
      case 'deleteProcessor':
      case 'createProfile':
      case 'deleteProfile':
      case 'addProcessorToProfile':
      case 'removeProcessorFromProfile':
      case 'reorderProcessors':
      case 'addAllProcessorsToProfile':
      case 'updateProcessor':
        await this._handlePostProcessorMessage(message);
        break;
    }
  }

  private async _handlePostProcessorMessage(message: any) {
    try {
      const manager = getPostProcessorManager();
      
      switch (message.command) {
        case 'createPostProcessor':
          const processor = await manager.createPostProcessor(message.processor);
          this._panel.webview.postMessage({ 
            command: 'processorCreated', 
            success: true,
            processor 
          });
          this.postProcessorUI?.loadData();
          vscode.window.showInformationMessage(`✓ Processor "${processor.name}" created`);
          break;
          
        case 'updateProcessor':
          await manager.updatePostProcessor(message.id, message.processor);
          this.postProcessorUI?.loadData();
          vscode.window.showInformationMessage('✓ Processor updated');
          break;
          
        case 'deleteProcessor':
          await manager.deletePostProcessor(message.id);
          this.postProcessorUI?.loadData();
          vscode.window.showInformationMessage('✓ Processor deleted');
          break;
          
        case 'createProfile':
          const profile = await manager.createProfile(message.profile);
          this._panel.webview.postMessage({ 
            command: 'profileCreated', 
            success: true,
            profile 
          });
          this.postProcessorUI?.loadData();
          vscode.window.showInformationMessage(`✓ Profile "${profile.name}" created`);
          break;
          
        case 'deleteProfile':
          await manager.deleteProfile(message.id);
          this.postProcessorUI?.loadData();
          vscode.window.showInformationMessage('✓ Profile deleted');
          break;
          
        case 'addProcessorToProfile':
          await this._addProcessorToProfile(message.profileId, message.processorId);
          this.postProcessorUI?.loadData();
          break;
          
        case 'removeProcessorFromProfile':
          await this._removeProcessorFromProfile(message.profileId, message.processorId);
          this.postProcessorUI?.loadData();
          break;
          
        case 'reorderProcessors':
          await this._reorderProcessors(message.profileId, message.processorIds);
          this.postProcessorUI?.loadData();
          break;
          
        case 'addAllProcessorsToProfile':
          await this._addAllProcessorsToProfile(message.profileId, message.processorIds);
          this.postProcessorUI?.loadData();
          break;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Error: ${errorMsg}`);
      
      // Send error response
      if (message.command === 'createPostProcessor') {
        this._panel.webview.postMessage({ command: 'processorCreated', success: false });
      } else if (message.command === 'createProfile') {
        this._panel.webview.postMessage({ command: 'profileCreated', success: false });
      }
    }
  }

  private async _addProcessorToProfile(profileId: string, processorId: string) {
    const config = vscode.workspace.getConfiguration('code-mate');
    const profiles = config.get<any[]>('postProcessors.profiles', []);
    const profile = profiles.find(p => p.id === profileId);
    
    if (profile && !profile.postProcessorIds.includes(processorId)) {
      profile.postProcessorIds.push(processorId);
      await config.update('postProcessors.profiles', profiles, true);
    }
  }

  private async _removeProcessorFromProfile(profileId: string, processorId: string) {
    const config = vscode.workspace.getConfiguration('code-mate');
    const profiles = config.get<any[]>('postProcessors.profiles', []);
    const profile = profiles.find(p => p.id === profileId);
    
    if (profile) {
      profile.postProcessorIds = profile.postProcessorIds.filter((id: string) => id !== processorId);
      await config.update('postProcessors.profiles', profiles, true);
    }
  }

  private async _reorderProcessors(profileId: string, processorIds: string[]) {
    const config = vscode.workspace.getConfiguration('code-mate');
    const profiles = config.get<any[]>('postProcessors.profiles', []);
    const profile = profiles.find(p => p.id === profileId);
    
    if (profile) {
      profile.postProcessorIds = processorIds;
      await config.update('postProcessors.profiles', profiles, true);
    }
  }

  private async _addAllProcessorsToProfile(profileId: string, processorIds: string[]) {
    const config = vscode.workspace.getConfiguration('code-mate');
    const profiles = config.get<any[]>('postProcessors.profiles', []);
    const profile = profiles.find(p => p.id === profileId);
    
    if (profile) {
      const existingIds = new Set(profile.postProcessorIds);
      processorIds.forEach((id: string) => {
        if (!existingIds.has(id)) {
          profile.postProcessorIds.push(id);
        }
      });
      await config.update('postProcessors.profiles', profiles, true);
    }
  }

  private async _loadModels(ollamaUrl: string) {
    const outputChannel = getOutputChannel();
    try {
      outputChannel.appendLine(`[CodeMate Config] Loading models from: ${ollamaUrl}`);
      const response = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 5000 });
      outputChannel.appendLine(`[CodeMate Config] Models response: ${JSON.stringify(response.data)}`);
      const models = response.data.models?.map((m: any) => m.name) || [];
      outputChannel.appendLine(`[CodeMate Config] Parsed models: ${JSON.stringify(models)}`);
      this._panel.webview.postMessage({ command: 'modelsLoaded', models, success: true });
    } catch (error) {
      outputChannel.appendLine(`[CodeMate Config] Failed to load models: ${error}`);
      this._panel.webview.postMessage({
        command: 'modelsLoaded',
        models: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load models',
      });
    }
  }

  private _loadSettings() {
    const config = vscode.workspace.getConfiguration('code-mate');
    const settings = {
      ollamaUrl: config.get('ollamaUrl') || 'http://localhost:11434',
      model: config.get('model') || 'mistral',
      temperature: config.get('temperature') || 0.7,
      autoComplete: config.get('autoComplete') || true,
    };

    this._panel.webview.postMessage({ command: 'loadSettings', settings });
  }

  private async _saveSettings(settings: any) {
    const config = vscode.workspace.getConfiguration('code-mate');
    try {
      await config.update('ollamaUrl', settings.ollamaUrl, true);
      await config.update('model', settings.model, true);
      await config.update('temperature', settings.temperature, true);
      await config.update('autoComplete', settings.autoComplete, true);

      vscode.window.showInformationMessage('Code Mate settings saved!');
      this._panel.webview.postMessage({ command: 'settingsSaved', success: true });
    } catch (error) {
      vscode.window.showErrorMessage('Failed to save settings');
      this._panel.webview.postMessage({ command: 'settingsSaved', success: false });
    }
  }

  private _getHtmlForWebview(): string {
    const buildPath = path.join(this._extensionUri.fsPath, 'media', 'build');
    const indexPath = path.join(buildPath, 'index.html');
    
    // Check if build exists
    if (!fs.existsSync(indexPath)) {
      return this._getDevelopmentHtml();
    }
    
    let htmlContent = fs.readFileSync(indexPath, 'utf8');

    // Replace any /assets/... references with webview URIs so the
    // built Svelte files load correctly inside the webview.
    const assetsBase = vscode.Uri.joinPath(this._extensionUri, 'media', 'build', 'assets');

    htmlContent = htmlContent.replace(/(src|href)=["']\/assets\/([^"'\s>]+)["']/g, (match, attr, filename) => {
      const fileUri = vscode.Uri.joinPath(assetsBase, filename);
      const webviewUri = this._panel.webview.asWebviewUri(fileUri);
      return `${attr}="${webviewUri.toString()}"`;
    });
    
    // Add CSP meta tag after charset meta
    const cspTag = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${this._panel.webview.cspSource}; style-src ${this._panel.webview.cspSource} 'unsafe-inline';" />`;
    htmlContent = htmlContent.replace(
      /<meta charset="UTF-8"\s*\/?>/,
      `<meta charset="UTF-8" />\n    ${cspTag}`
    );
    
    console.log('[ConfigPanel] Final HTML length:', htmlContent.length);
    
    return htmlContent;
  }

  private _getDevelopmentHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Code Mate - Development Mode</title>
  <style>
    body { 
      font-family: sans-serif; 
      padding: 40px; 
      text-align: center;
      background: #1e1e1e;
      color: #cccccc;
    }
    .warning {
      background: #5c3b00;
      border: 1px solid #8a5c00;
      padding: 20px;
      border-radius: 6px;
      max-width: 600px;
      margin: 0 auto;
    }
    h2 { color: #ffcc00; margin-top: 0; }
    code {
      background: #2d2d2d;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="warning">
    <h2>Development Mode</h2>
    <p>The webview UI has not been built yet.</p>
    <p>Please run:</p>
    <p><code>npm run build:webview</code></p>
    <p>Then reload the window.</p>
  </div>
</body>
</html>`;
  }

  public dispose() {
    ConfigPanel.currentPanel = undefined;
    this._panel.dispose();
  }
}
