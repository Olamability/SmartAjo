# Contributing to Ajo Secure

Thank you for your interest in contributing to Ajo Secure! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Git

### Setting Up Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/ajo-secure.git
   cd ajo-secure
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env` file based on `.env.example`

5. Start the development server:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards

3. Test your changes:
   ```bash
   npm run lint
   npm run build
   ```

4. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add user profile page
fix: resolve login authentication issue
docs: update deployment guide
```

### Pull Request Process

1. Update documentation if needed
2. Ensure all tests pass
3. Update the CHANGELOG.md if applicable
4. Create a Pull Request with a clear description
5. Link any related issues
6. Wait for code review

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested your changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Avoid using `any` type
- Define proper interfaces and types
- Use strict mode

### React

- Use functional components with hooks
- Follow React best practices
- Avoid prop drilling (use Context or state management)
- Memoize expensive computations

### Code Style

- Use ESLint configuration provided
- Format code with Prettier (if configured)
- Follow naming conventions:
  - PascalCase for components
  - camelCase for functions and variables
  - UPPER_SNAKE_CASE for constants

### File Organization

```
src/
├── components/     # Reusable components
├── pages/          # Page components
├── services/       # API and business logic
├── contexts/       # React contexts
├── hooks/          # Custom hooks
├── types/          # TypeScript types
├── lib/            # Utility functions
└── assets/         # Static assets
```

## Testing Guidelines

### Unit Tests

- Test individual functions and components
- Aim for high code coverage
- Use meaningful test descriptions

### Integration Tests

- Test user flows
- Test component interactions
- Test API integrations

### E2E Tests

- Test critical user journeys
- Test across different browsers
- Test responsive behavior

## Documentation

- Update README.md for significant changes
- Add JSDoc comments for complex functions
- Update API documentation
- Include examples in documentation

## Reporting Bugs

### Before Reporting

- Check existing issues
- Verify bug in latest version
- Collect relevant information

### Bug Report Template

```markdown
**Describe the bug**
A clear description of the bug

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment:**
- OS: [e.g., Windows, macOS, Linux]
- Browser: [e.g., Chrome, Safari]
- Version: [e.g., 1.0.0]

**Additional context**
Any other relevant information
```

## Feature Requests

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Description of the problem

**Describe the solution you'd like**
Clear description of desired solution

**Describe alternatives you've considered**
Alternative solutions or features

**Additional context**
Any other context or screenshots
```

## Security Issues

**DO NOT** create public issues for security vulnerabilities.

Instead, email security@ajosecure.com with:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## Questions?

Feel free to reach out:
- Email: dev@ajosecure.com
- Documentation: https://docs.ajosecure.com
- Discussions: GitHub Discussions tab

Thank you for contributing to Ajo Secure! 🚀
