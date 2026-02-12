# Code Mate

[![CI](https://github.com/deiangi/code-mate/actions/workflows/ci.yml/badge.svg)](https://github.com/deiangi/code-mate/actions/workflows/ci.yml)
[![Release](https://github.com/deiangi/code-mate/actions/workflows/release.yml/badge.svg)](https://github.com/deiangi/code-mate/actions/workflows/release.yml)

A VS Code extension that brings intelligent code assistance powered by Ollama, an open-source LLM framework. Similar to roocode, Code Mate provides AI-powered code generation, completion, explanation, and refactoring.

## Features

- **Code Chat**: Ask questions about code and get intelligent responses
- **Code Completion**: Get AI-powered code suggestions
- **Code Explanation**: Understand what code does with detailed explanations
- **Code Refactoring**: Improve code quality with AI suggestions
- **Local AI**: Uses Ollama for privacy-preserving AI assistance
- **Customizable**: Choose your preferred Ollama model and adjust temperature

## Requirements

- VS Code 1.85.0 or later
- [Ollama](https://ollama.ai) installed and running locally

## Installation

### 1. Install Ollama

Download and install Ollama from [ollama.ai](https://ollama.ai)

### 2. Pull a Model

Open terminal and run:
```bash
ollama pull mistral
```

Other available models:
- `ollama pull neural-chat`
- `ollama pull dolphin-mixtral`
- `ollama pull openchat`
- `ollama pull llama2`

### 3. Start Ollama

```bash
ollama serve
```

Ollama will run on `http://localhost:11434` by default.

### 4. Install Code Mate Extension

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Code Mate"
4. Click Install

## Configuration

Open Settings (Ctrl+, / Cmd+,) and search for "Code Mate" to configure:

- **Ollama URL**: The endpoint where Ollama is running (default: `http://localhost:11434`)
- **Model**: The Ollama model to use (default: `mistral`)
- **Temperature**: Controls response creativity (0-1, default: 0.7)
- **Auto Complete**: Enable/disable automatic completion suggestions (default: true)

## Usage

### Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)

1. **Code Mate: Chat** - Ask anything about code
2. **Code Mate: Complete** - Complete your code (select code first)
3. **Code Mate: Explain** - Explain selected code
4. **Code Mate: Refactor** - Improve selected code
5. **Code Mate: Configure** - Open Code Mate settings

## Keyboard Shortcuts

You can add custom shortcuts in your `keybindings.json`:

```json
[
  {
    "key": "ctrl+shift+c",
    "command": "code-mate.chat"
  },
  {
    "key": "ctrl+shift+e",
    "command": "code-mate.explain"
  },
  {
    "key": "ctrl+shift+r",
    "command": "code-mate.refactor"
  }
]
```

## Example Workflows

### Explain Code
1. Select code in editor
2. Press Ctrl+Shift+P and run "Code Mate: Explain"
3. View explanation in Code Mate output panel

### Refactor Code
1. Select code you want to improve
2. Press Ctrl+Shift+P and run "Code Mate: Refactor"
3. Copy the refactored suggestion and apply

### Get Code Help
1. Press Ctrl+Shift+P and run "Code Mate: Chat"
2. Ask any coding question
3. Get AI-powered response

## Privacy

Code Mate runs entirely locally using Ollama. Your code is never sent to external servers - everything is processed on your machine.

## Performance Tips

- Use smaller models for faster responses: `neural-chat`
- Increase temperature for more creative suggestions
- Decrease temperature for more consistent output
- Ensure Ollama is optimized for your hardware

## Troubleshooting

### Ollama Connection Error
- Ensure Ollama is running: `ollama serve`
- Check the URL in settings matches your Ollama instance
- Try restarting Ollama

### Slow Responses
- Check if your system has enough CPU/GPU resources
- Try a smaller model
- Check if other applications are using resources

### Model Not Found
- Pull the model first: `ollama pull mistral`
- List available models: `ollama list`
- Verify model name matches settings

## Future Features

- Stream responses for real-time output
- Multi-turn conversation support
- Code snippet history
- Integration with inline completions
- Custom prompt templates
- Batch operations

## Development

### Prerequisites

- Node.js 18+ and npm
- VS Code 1.85.0+
- Ollama installed and running

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/deiangi/code-mate.git
   cd code-mate
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd webview-ui && npm install && cd ..
   ```

3. **Build the extension**
   ```bash
   npm run build:webview  # Build the webview UI
   npm run compile        # Compile TypeScript
   ```

4. **Test the extension**
   - Press `F5` in VS Code to launch debug instance
   - Or package it: `npx vsce package`

### Project Structure

```
code-mate/
├── src/                    # Extension source code
│   ├── extension.ts       # Main extension entry point
│   ├── chatPanel.ts       # Chat panel implementation
│   ├── ollama.ts          # Ollama API client
│   └── ...
├── webview-ui/            # Svelte-based webview UI
│   ├── src/
│   │   ├── components/
│   │   └── stores.ts
│   └── package.json
├── media/                 # Built webview assets
└── package.json          # Extension manifest
```

### Available Scripts

- `npm run compile` - Compile TypeScript
- `npm run watch` - Watch mode for development
- `npm run build:webview` - Build the webview UI
- `npm run dev:webview` - Start webview development server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests (when implemented)

## Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork the repository** on GitHub
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** and test thoroughly
4. **Run linting**: `npm run lint`
5. **Commit your changes**: `git commit -m "Add: brief description"`
6. **Push to your fork**: `git push origin feature/your-feature-name`
7. **Create a Pull Request** on GitHub

### Code Style

- Use TypeScript for all new code
- Follow the existing ESLint configuration
- Use meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly

### Reporting Issues

When reporting bugs, please include:
- VS Code version
- Ollama version and model used
- Steps to reproduce the issue
- Expected vs actual behavior
- Any relevant error messages

### Feature Requests

We love new ideas! When suggesting features:
- Describe the problem you're trying to solve
- Explain how the feature would work
- Consider edge cases and potential drawbacks

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [roocode](https://github.com/roocode/roocode)
- Built with [Ollama](https://ollama.ai) for local AI
- UI powered by [Svelte](https://svelte.dev)
