# Code Mate

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

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## License

MIT

## Related Projects

- [Ollama](https://ollama.ai) - Local LLM framework
- [roocode](https://github.com/roocode/roocode) - AI code assistant (inspiration)

## Support

For issues, feature requests, or questions, please create an issue on the GitHub repository.
