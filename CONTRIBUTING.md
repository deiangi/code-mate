# Contributing to Code Mate

Thank you for your interest in contributing to Code Mate! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md) to ensure a welcoming environment for all contributors.

## Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **VS Code 1.85.0+** for development
- **Ollama** installed and running locally

### Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/code-mate.git
   cd code-mate
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd webview-ui && npm install && cd ..
   ```

3. **Build the project**
   ```bash
   npm run build:webview
   npm run compile
   ```

4. **Test the extension**
   - Press `F5` in VS Code to launch debug mode
   - Test your changes thoroughly

## Development Workflow

### 1. Choose an Issue
- Check [GitHub Issues](https://github.com/deiangi/code-mate/issues) for open tasks
- Comment on an issue to indicate you're working on it
- Create a new issue if you have a feature idea

### 2. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Make Changes
- Write clear, focused commits
- Test your changes frequently
- Follow the coding standards below

### 4. Test Thoroughly
- Run `npm run lint` to check code quality
- Test in VS Code debug mode
- Verify Ollama integration works
- Test edge cases and error conditions

### 5. Submit a Pull Request
- Push your branch to GitHub
- Create a Pull Request with a clear description
- Reference any related issues
- Wait for review and address feedback

## Project Structure

```
code-mate/
├── src/                          # Extension backend (TypeScript)
│   ├── extension.ts             # Main entry point
│   ├── chatPanel.ts             # Chat panel implementation
│   ├── configPanel.ts           # Configuration panel
│   ├── ollama.ts                # Ollama API client
│   ├── conversationManager.ts   # Conversation persistence
│   └── postProcessor*.ts        # Text processing pipeline
├── webview-ui/                  # Frontend (Svelte)
│   ├── src/
│   │   ├── App.svelte          # Main app component
│   │   ├── components/         # UI components
│   │   │   ├── chat/           # Chat-specific components
│   │   │   └── ...             # Other UI components
│   │   ├── stores.ts           # Svelte stores
│   │   └── types.ts            # TypeScript interfaces
│   └── package.json            # Frontend dependencies
├── media/                       # Built webview assets
├── .github/                     # GitHub configuration
│   ├── workflows/              # CI/CD pipelines
│   └── ISSUE_TEMPLATES/        # Issue templates
└── package.json                # Extension manifest
```

## Coding Standards

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow the existing ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Prefer `const` over `let`, avoid `var`

### Svelte Components
- Use TypeScript in script blocks
- Follow Svelte's accessibility guidelines
- Use reactive statements appropriately
- Keep components focused on single responsibilities
- Use stores for shared state

### Git Commits
- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove)
- Reference issue numbers when applicable
- Keep commits focused and atomic

Example commit messages:
```
Add: Context size slider to input bar
Fix: Memory calculation in RAM estimator
Update: README with development setup instructions
```

## Testing

### Manual Testing
- Test all user-facing features
- Verify error handling works
- Test with different Ollama models
- Check performance with large contexts

### Automated Testing (Future)
- Unit tests for utility functions
- Integration tests for Ollama API
- E2E tests for VS Code commands

## Submitting Changes

### Pull Request Process

1. **Ensure your branch is up to date**
   ```bash
   git fetch origin
   git rebase origin/master
   ```

2. **Run final checks**
   ```bash
   npm run lint
   npm run build:webview
   npm run compile
   ```

3. **Create the Pull Request**
   - Use a clear, descriptive title
   - Provide detailed description of changes
   - Reference related issues
   - Add screenshots for UI changes

4. **Address Review Feedback**
   - Be responsive to reviewer comments
   - Make requested changes
   - Update the PR description if needed

### PR Checklist
- [ ] Code follows project standards
- [ ] Linting passes (`npm run lint`)
- [ ] Builds successfully (`npm run compile && npm run build:webview`)
- [ ] Tests pass (manual testing completed)
- [ ] Documentation updated if needed
- [ ] Commit messages are clear and descriptive

## Reporting Issues

### Bug Reports
- Use the [bug report template](.github/ISSUE_TEMPLATES/bug-report.md)
- Include VS Code and Ollama versions
- Provide steps to reproduce
- Add error messages and logs

### Feature Requests
- Use the [feature request template](.github/ISSUE_TEMPLATES/feature-request.md)
- Describe the problem and proposed solution
- Consider alternative approaches

### Questions
- Check existing issues and documentation first
- Use clear, specific titles
- Provide context about your setup

## Recognition

Contributors will be recognized in release notes and may be added to a future contributors file. Thank you for helping make Code Mate better!

---

For questions or help getting started, feel free to open an issue or start a discussion on GitHub.