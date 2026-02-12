import type { WebviewMessage } from './types';

// Global vscode instance from VS Code webview
declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

// Initialize vscode API
const vscode = acquireVsCodeApi();

/**
 * Send a message to the extension
 */
export function postMessage(message: WebviewMessage): void {
  vscode.postMessage(message);
}

/**
 * Listen for messages from the extension
 */
export function onMessage(handler: (message: WebviewMessage) => void): void {
  window.addEventListener('message', (event) => {
    handler(event.data);
  });
}

/**
 * Signal that the webview is ready
 */
export function signalReady(): void {
  postMessage({ command: 'webviewReady' });
}
