# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Code Mate, please help us by reporting it responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by emailing:
- **Security Email**: [Your security contact email - replace with actual email]
- **Subject Line**: `[SECURITY] Code Mate Vulnerability Report`

### What to Include

When reporting a vulnerability, please include:

1. **Description**: A clear description of the vulnerability
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Impact**: What an attacker could achieve by exploiting this vulnerability
4. **Environment**: Your setup (VS Code version, OS, Ollama version, etc.)
5. **Proof of Concept**: If available, a minimal example demonstrating the vulnerability

### Our Response Process

1. **Acknowledgment**: We'll acknowledge receipt within 48 hours
2. **Investigation**: We'll investigate and validate the report
3. **Updates**: We'll provide regular updates on our progress
4. **Fix**: We'll develop and test a fix
5. **Disclosure**: We'll coordinate disclosure timing with you

### Security Considerations

Code Mate integrates with Ollama for local AI processing. Please be aware of:

- **Local AI Processing**: All AI processing happens locally on your machine
- **Data Privacy**: Conversations are stored locally in your VS Code workspace
- **Network Communications**: Only communicates with your local Ollama instance
- **Extension Permissions**: Only requests necessary VS Code permissions

### Best Practices

- Keep your Ollama installation updated
- Use strong passwords for any remote Ollama setups
- Regularly update VS Code and the Code Mate extension
- Be cautious with custom post-processors and configurations

### Responsible Disclosure

We kindly ask that you:

- Give us reasonable time to fix the issue before public disclosure
- Avoid accessing or modifying user data
- Don't perform DoS attacks or degrade service performance
- Don't spam our systems with automated vulnerability scanners

### Recognition

We appreciate security researchers who help keep our users safe. With your permission, we'll acknowledge your contribution in our security advisories.

## Security Updates

Security updates will be released as patch versions with high priority. Users will be notified through:

- GitHub Security Advisories
- Release notes
- VS Code Marketplace notifications

## Contact

For security-related questions or concerns:
- **Email**: [Your contact email]
- **GitHub Issues**: For non-security related issues only

Thank you for helping keep Code Mate secure!