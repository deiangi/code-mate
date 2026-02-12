import * as vscode from 'vscode';
import axios from 'axios';
import { OllamaClient } from './ollama';
import { ConfigPanel } from './configPanel';
import { ChatPanel } from './chatPanel';
import { PostProcessorManager } from './postProcessorManager';

let ollamaClient: OllamaClient;
let outputChannel: vscode.OutputChannel;
let rawApiChannel: vscode.OutputChannel;
let postProcessorManager: PostProcessorManager;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Code Mate');
  rawApiChannel = vscode.window.createOutputChannel('Code Mate - API Log');

  // Initialize post-processor manager
  postProcessorManager = new PostProcessorManager(context);

  // Initialize Ollama client with config
  const config = vscode.workspace.getConfiguration('code-mate');
  ollamaClient = new OllamaClient({
    url: config.get('ollamaUrl') || 'http://localhost:11434',
    model: config.get('model') || 'mistral',
    temperature: config.get('temperature') || 0.7,
    contextSize: config.get('contextSize') || 4096,
  });

  // Check Ollama connection on startup
  checkOllamaConnection();

  // Register commands
  registerCommands(context);

  // Open chat panel by default on activation
  ChatPanel.createOrShow(context.extensionUri, ollamaClient, rawApiChannel);

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('code-mate')) {
        const config = vscode.workspace.getConfiguration('code-mate');
        ollamaClient.updateConfig({
          url: config.get('ollamaUrl') || 'http://localhost:11434',
          model: config.get('model') || 'mistral',
          temperature: config.get('temperature') || 0.7,
          contextSize: config.get('contextSize') || 4096,
        });
        postProcessorManager.reload();
        checkOllamaConnection();
      }
    })
  );

  outputChannel.appendLine('Code Mate extension activated!');
}

function registerCommands(context: vscode.ExtensionContext) {
  // Activate command - opens chat by default
  context.subscriptions.push(
    vscode.commands.registerCommand('code-mate.activate', async () => {
      ChatPanel.createOrShow(context.extensionUri, ollamaClient, rawApiChannel);
    })
  );

  // Chat command
  context.subscriptions.push(
    vscode.commands.registerCommand('code-mate.chat', async () => {
      ChatPanel.createOrShow(context.extensionUri, ollamaClient, rawApiChannel);
    })
  );

  // Complete command
  context.subscriptions.push(
    vscode.commands.registerCommand('code-mate.complete', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage(
          'Please open a file to use code completion'
        );
        return;
      }

      const selection = editor.selection;
      const code = editor.document.getText(selection || undefined);

      if (!code) {
        vscode.window.showErrorMessage('Please select code to complete');
        return;
      }

      await executeCommand('complete', code);
    })
  );

  // Explain command
  context.subscriptions.push(
    vscode.commands.registerCommand('code-mate.explain', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage(
          'Please open a file to explain code'
        );
        return;
      }

      const selection = editor.selection;
      const code = editor.document.getText(selection || undefined);

      if (!code) {
        vscode.window.showErrorMessage('Please select code to explain');
        return;
      }

      await executeCommand('explain', code);
    })
  );

  // Refactor command
  context.subscriptions.push(
    vscode.commands.registerCommand('code-mate.refactor', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage(
          'Please open a file to refactor'
        );
        return;
      }

      const selection = editor.selection;
      const code = editor.document.getText(selection || undefined);

      if (!code) {
        vscode.window.showErrorMessage('Please select code to refactor');
        return;
      }

      await executeCommand('refactor', code);
    })
  );

  // Configure command
  context.subscriptions.push(
    vscode.commands.registerCommand('code-mate.configure', async () => {
      ConfigPanel.createOrShow(context.extensionUri);
    })
  );

  // View API Log command
  context.subscriptions.push(
    vscode.commands.registerCommand('code-mate.viewApiLog', async () => {
      rawApiChannel.show();
    })
  );

  // Select Model command
  context.subscriptions.push(
    vscode.commands.registerCommand('code-mate.selectModel', async () => {
      try {
        const config = vscode.workspace.getConfiguration('code-mate');
        const ollamaUrl = config.get('ollamaUrl') as string || 'http://localhost:11434';
        
        outputChannel.appendLine(`[CodeMate] Fetching models from ${ollamaUrl}...`);
        
        // Fetch models from Ollama
        const response = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 5000 });
        const models = response.data.models?.map((m: any) => m.name) || [];
        
        if (models.length === 0) {
          vscode.window.showErrorMessage('No models found. Make sure Ollama is running and has models installed.');
          return;
        }
        
        // Show QuickPick with models
        const currentModel = config.get('model') as string;
        const selected = await vscode.window.showQuickPick(models, {
          placeHolder: `Current model: ${currentModel}`,
          title: 'Select Ollama Model'
        });
        
        if (selected) {
          await config.update('model', selected, true);
          vscode.window.showInformationMessage(`Model changed to: ${selected}`);
          outputChannel.appendLine(`[CodeMate] Model changed to: ${selected}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch models';
        vscode.window.showErrorMessage(`Code Mate: ${errorMessage}`);
        outputChannel.appendLine(`[CodeMate] Error fetching models: ${errorMessage}`);
      }
    })
  );
}

async function executeCommand(
  command: 'chat' | 'complete' | 'explain' | 'refactor',
  input: string
) {
  try {
    outputChannel.show();
    outputChannel.appendLine(`\n[${new Date().toLocaleTimeString()}] ${command.toUpperCase()}`);
    outputChannel.appendLine('Processing...');

    let response: string;

    switch (command) {
      case 'chat':
        response = await ollamaClient.chat(input);
        break;
      case 'complete':
        response = await ollamaClient.complete(input);
        break;
      case 'explain':
        response = await ollamaClient.explain(input);
        break;
      case 'refactor':
        response = await ollamaClient.refactor(input);
        break;
    }

    outputChannel.clear();
    outputChannel.appendLine(`[CODE MATE - ${command.toUpperCase()}]\n`);
    outputChannel.appendLine(response);
    outputChannel.show();

    vscode.window.showInformationMessage(
      `Code Mate: ${command} completed successfully!`
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    outputChannel.appendLine(`Error: ${errorMessage}`);
    vscode.window.showErrorMessage(`Code Mate Error: ${errorMessage}`);
  }
}

async function checkOllamaConnection() {
  try {
    const isConnected = await ollamaClient.checkConnection();
    if (isConnected) {
      outputChannel.appendLine(
        '✓ Connected to Ollama successfully'
      );
    } else {
      outputChannel.appendLine(
        '✗ Unable to connect to Ollama. Check your settings.'
      );
      vscode.window.showWarningMessage(
        'Code Mate: Unable to connect to Ollama. Configure your settings.'
      );
    }
  } catch (error) {
    outputChannel.appendLine('✗ Connection check failed');
  }
}

export function deactivate() {
  outputChannel.dispose();
  rawApiChannel.dispose();
}

export function getPostProcessorManager(): PostProcessorManager {
  return postProcessorManager;
}

export function getOllamaClient(): OllamaClient {
  return ollamaClient;
}

export function getOutputChannel(): vscode.OutputChannel {
  return outputChannel;
}
