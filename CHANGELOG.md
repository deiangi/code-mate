# Changelog

All notable changes to Code Mate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub repository setup with CI/CD pipelines
- Issue templates for bug reports and feature requests
- Code of conduct and contributing guidelines
- Security policy and vulnerability reporting process
- Comprehensive README with development setup
- Automated building and testing with GitHub Actions
- Release automation for VSIX packaging

### Changed
- Enhanced input bar with 3-line layout (context usage, text input, controls)
- Improved context size management with RAM calculation
- Updated model selection dropdown in input bar
- Refined conversation management with better UI

### Fixed
- Input bar layout issues with nested buttons
- Context display and progress bar functionality
- Model loading and selection integration
- Configuration change handling

## [1.0.0] - 2024-01-XX

### Added
- Initial release of Code Mate VS Code extension
- Chat functionality with Ollama integration
- Conversation management with file-based persistence
- Post-processor system for text processing
- Configuration panel for extension settings
- Webview-based UI with Svelte frontend
- Context size tracking and display
- Auto-open chat window on extension startup
- Model selection and context size configuration
- Delete and compress conversation features

### Technical Features
- TypeScript backend with VS Code API integration
- Svelte frontend with reactive components
- Ollama API client with streaming support
- Conversation compression and management
- Dynamic configuration updates
- Error handling and user feedback

---

## Types of Changes

- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` for vulnerability fixes

## Version History

For detailed commit history, see the [GitHub repository](https://github.com/deiangi/code-mate/commits/master).

---

*This changelog was started with version 1.0.0. Previous changes are not documented here.*