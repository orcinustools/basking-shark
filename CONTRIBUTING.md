# Contributing to Basking Shark

First off, thank you for considering contributing to Basking Shark! It's people like you that make Basking Shark such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## What we're looking for

There are many ways you can contribute to Basking Shark:

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 💻 Code refactoring
- 🎨 UI/UX enhancements
- 🌐 Internationalization
- 🧪 Test coverage improvements

## Getting Started

1. Create your own fork of the code
2. Do the changes in your fork
3. If you like the change and think the project could use it:
   - Be sure you have followed the code style
   - Send a pull request

## How to report a bug

When filing an issue, make sure to answer these questions:

1. What version of Basking Shark are you using?
2. What version of Node.js are you using?
3. What did you do?
4. What did you expect to see?
5. What did you see instead?

## How to suggest a feature or enhancement

If you find yourself wishing for a feature that doesn't exist in Basking Shark, you are probably not alone. Open an issue which describes:

1. Clear and descriptive title
2. Detailed description of the feature
3. Examples of how the feature would be used
4. Why this feature would be useful to most Basking Shark users

## Development environment setup

1. Prerequisites:
   - Node.js (v14 or higher)
   - npm (v6 or higher)
   - Git

2. Setup steps:
   ```bash
   # Clone your fork
   git clone https://github.com/your-username/basking-shark.git
   cd basking-shark

   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install

   # Create environment file
   cp .env.example .env
   # Add your API keys to .env
   ```

3. Development workflow:
   ```bash
   # Terminal 1: Run client in dev mode
   cd client
   npm run dev

   # Terminal 2: Run server in dev mode
   cd server
   npm run dev
   ```

## Code Style

### JavaScript/Vue

- Use ES6+ features
- Follow Vue.js Style Guide
- Use meaningful variable names
- Keep functions small and focused
- Add comments for complex logic
- Use TypeScript types/interfaces where possible

### CSS/Tailwind

- Use Tailwind utility classes
- Follow component-based structure
- Keep styles modular and reusable
- Use CSS variables for theming
- Follow BEM naming convention for custom classes

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line
- Consider starting the commit message with an applicable emoji:
  - ✨ `:sparkles:` when adding a new feature
  - 🐛 `:bug:` when fixing a bug
  - 📝 `:memo:` when adding or updating documentation
  - ♻️ `:recycle:` when refactoring code
  - 🎨 `:art:` when improving UI/UX
  - ⚡️ `:zap:` when improving performance
  - 🔒 `:lock:` when dealing with security

## Pull Request Process

1. Update the README.md with details of changes to the interface
2. Update the version numbers in package.json following Semantic Versioning
3. The PR will be merged once you have the sign-off of maintainers

### PR Title Format

```
type(scope): description

Examples:
feat(cloud): add support for DigitalOcean
fix(ui): improve dark mode contrast
docs(readme): update installation steps
```

### PR Description Template

```markdown
## Description
Clear and concise description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where needed
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
```

## Community

- Join our [Discord server](https://discord.gg/basking-shark)
- Follow us on [Twitter](https://twitter.com/baskingshark)
- Read our [blog](https://blog.basking-shark.dev)

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Our website's contributor page

Thank you for contributing to Basking Shark! 🦈✨