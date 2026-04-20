# Contributing to Distribution Management System

First off, thank you for considering contributing to Distribution Management System! It's people like you that make this project better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)

---

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards others

**Unacceptable behavior includes:**
- Harassment, trolling, or derogatory comments
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

---

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**When reporting a bug, include:**
- Clear and descriptive title
- Exact steps to reproduce the problem
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, Node version, etc.)
- Error messages or logs

**Use this template:**
```markdown
**Bug Description:**
A clear description of what the bug is.

**To Reproduce:**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior:**
What you expected to happen.

**Screenshots:**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., Windows 10]
- Node Version: [e.g., 18.0.0]
- App Version: [e.g., 1.0.0]
```

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:
- Clear and descriptive title
- Detailed description of the proposed functionality
- Use cases and benefits
- Possible implementation approach
- Screenshots or mockups if applicable

### Pull Requests

We actively welcome your pull requests! Here's how:

1. **Fork the repository**
2. **Create a feature branch** from `develop`
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

---

## Development Setup

### Prerequisites

- Node.js v18+
- MySQL 8.0+
- Git
- Code editor (VS Code recommended)

### Setup Steps

1. **Clone your fork:**
   ```bash
   git clone https://github.com/your-username/distribution-management-system.git
   cd distribution-management-system
   ```

2. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Install dependencies:**
   ```bash
   # Backend
   cd backend && npm install

   # Desktop
   cd desktop && npm install

   # Mobile
   cd mobile && npm install
   ```

4. **Configure environment:**
   ```bash
   cp backend/.env.example backend/.env
   # Edit .env with your local configuration
   ```

5. **Initialize database:**
   ```bash
   mysql -u root -p distribution_system_db < backend/database/create_db.sql
   ```

6. **Start development servers:**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Desktop
   cd desktop && npm start

   # Terminal 3: Mobile
   cd mobile && npm start
   ```

---

## Coding Standards

### JavaScript/Node.js

- **Style Guide:** Use ES6+ features
- **Formatting:** 2 spaces for indentation
- **Naming Conventions:**
  - camelCase for variables and functions
  - PascalCase for classes and components
  - UPPER_SNAKE_CASE for constants

**Example:**
```javascript
// Good
const userName = 'John';
const calculateTotal = (items) => { ... };

class UserService { ... }

const API_BASE_URL = 'http://localhost:5000';

// Bad
const user_name = 'John';
const CalculateTotal = (items) => { ... };
const apibaseurl = 'http://localhost:5000';
```

### React/React Native

- **Functional Components:** Use hooks over class components
- **Component Structure:**
  ```javascript
  // Imports
  import React, { useState, useEffect } from 'react';

  // Component
  const MyComponent = ({ prop1, prop2 }) => {
    // Hooks
    const [state, setState] = useState(null);

    // Effects
    useEffect(() => {
      // ...
    }, []);

    // Event handlers
    const handleClick = () => {
      // ...
    };

    // Render
    return (
      <div>...</div>
    );
  };

  export default MyComponent;
  ```

### File Organization

```
backend/
  src/
    controllers/    # Business logic
    routes/         # API routes
    models/         # Data models
    middleware/     # Express middleware
    services/       # External services
    utils/          # Helper functions

desktop/
  src/
    components/     # Reusable UI components
    pages/          # Page components
    services/       # API services
    context/        # React Context
    utils/          # Helper functions

mobile/
  src/
    screens/        # Screen components
    components/     # Reusable components
    services/       # API services
    context/        # React Context
    utils/          # Helper functions
```

### Database Queries

- Use parameterized queries (never string concatenation)
- Always handle errors
- Use transactions for multi-step operations

**Example:**
```javascript
// Good
const [products] = await db.query(
  'SELECT * FROM products WHERE category_id = ?',
  [categoryId]
);

// Bad
const [products] = await db.query(
  `SELECT * FROM products WHERE category_id = ${categoryId}`
);
```

---

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation changes
- **style:** Code style changes (formatting, no logic change)
- **refactor:** Code refactoring
- **perf:** Performance improvements
- **test:** Adding or updating tests
- **chore:** Maintenance tasks (dependencies, config)
- **ci:** CI/CD changes

### Examples

```bash
feat(backend): add warehouse stock transfer API

Implement API endpoint for transferring stock between warehouses.
Includes validation and transaction support.

Closes #123

---

fix(mobile): resolve sync conflict on offline orders

Fixed issue where offline orders were causing conflicts during sync.
Added conflict resolution logic to prefer newer timestamps.

Fixes #456

---

docs(readme): update installation instructions

Added missing step for database initialization.
Clarified Node.js version requirements.

---

refactor(desktop): extract order form into separate component

Improved code organization and reusability.
No functional changes.
```

### Rules

- Use present tense ("add" not "added")
- Use imperative mood ("move" not "moves")
- First line max 72 characters
- Reference issues and PRs in footer

---

## Pull Request Process

### Before Submitting

1. ✅ **Test your changes** thoroughly
2. ✅ **Update documentation** if needed
3. ✅ **Follow coding standards**
4. ✅ **Write meaningful commit messages**
5. ✅ **Ensure no merge conflicts**
6. ✅ **Add tests** for new features

### PR Template

When submitting a PR, include:

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested your changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing

## Screenshots (if applicable)
Add screenshots to demonstrate changes.

## Related Issues
Closes #123
```

### Review Process

1. **Automated checks** must pass (linting, tests)
2. **Code review** by at least one maintainer
3. **Testing** by reviewer if significant changes
4. **Approval** required before merge
5. **Squash and merge** to maintain clean history

### After Merge

- Delete your feature branch
- Update your local repository
- Close related issues

---

## Testing Requirements

### Backend Testing

```bash
cd backend
npm test
```

**Test coverage:**
- API endpoints (success and error cases)
- Authentication and authorization
- Database operations
- Business logic

### Desktop Testing

```bash
cd desktop
npm test
```

**Test coverage:**
- Component rendering
- User interactions
- API integration
- State management

### Mobile Testing

```bash
cd mobile
npm test
```

**Test coverage:**
- Screen navigation
- Offline functionality
- Data synchronization
- API integration

### Manual Testing

Before submitting, test:
- All affected features work correctly
- No console errors or warnings
- Responsive design (if UI changes)
- Cross-browser compatibility (desktop)
- Different screen sizes (mobile)

---

## Code Review Guidelines

### For Contributors

- Be open to feedback
- Respond promptly to review comments
- Make requested changes
- Ask questions if unclear

### For Reviewers

- Be respectful and constructive
- Explain the "why" behind suggestions
- Approve when changes meet standards
- Test significant changes locally

---

## Documentation

### When to Update Documentation

- Adding new features
- Changing APIs
- Modifying configuration
- Updating dependencies
- Fixing bugs with workarounds

### Documentation Locations

- **README.md** - Project overview and quick start
- **API_DOCUMENTATION.md** - API endpoint documentation
- **INSTALLATION_GUIDE.md** - Detailed installation steps
- **DEPLOYMENT_GUIDE.md** - Production deployment
- **Code comments** - Complex logic explanation

---

## Questions?

- **General questions:** Open a discussion on GitHub
- **Bug reports:** Create an issue
- **Security concerns:** Email security@ummahtechinnovations.com
- **Feature requests:** Create an issue with enhancement label

---

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project website (if applicable)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Distribution Management System! 🎉
