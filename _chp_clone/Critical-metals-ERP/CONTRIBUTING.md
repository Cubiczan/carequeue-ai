# Contributing to Battery ERP

Thank you for your interest in contributing to Battery ERP! This document provides guidelines and instructions for contributing.

---

## 🌟 How to Contribute

### Code of Conduct

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md) to maintain a welcoming community.

### Ways to Contribute

1. **Bug Reports**: Create an issue with the `bug` label
2. **Feature Requests**: Create an issue with the `enhancement` label
3. **Documentation**: Improve docs, fix typos, add examples
4. **Code**: Fix bugs, implement features, improve performance
5. **Testing**: Write tests, improve test coverage
6. **Review**: Review pull requests, provide feedback

---

## 🚀 Getting Started

### 1. Fork the Repository

```bash
# Click "Fork" on GitHub, then:
git clone https://github.com/YOUR_USERNAME/battery-erp.git
cd battery-erp
git remote add upstream https://github.com/ORIGINAL_USERNAME/battery-erp.git
```

### 2. Set Up Development Environment

```bash
# Install dependencies
cd integrations && npm install
cd ../shop-floor && npm install

# Copy environment file
cp .env.example .env

# Start development servers
npm run dev  # In both directories
```

### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-123
```

---

## 📝 Development Guidelines

### Code Style

**Backend (Node.js)**:
```javascript
// Use ES6+ features
const authService = require('./services/auth');

// Async/await for async operations
async function login(username, password) {
  try {
    const user = await findUser(username);
    return validatePassword(user, password);
  } catch (error) {
    logger.error('Login failed', error);
    throw error;
  }
}

// Use JSDoc for documentation
/**
 * Authenticate user
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise<AuthToken>} JWT token and user info
 */
```

**Frontend (React/TypeScript)**:
```typescript
import { useState } from 'react';

// Use functional components with hooks
interface Props {
  userId: string;
  onLogout: () => void;
}

export default function UserProfile({ userId, onLogout }: Props) {
  const [loading, setLoading] = useState(false);
  
  // Use descriptive variable names
  const isUserDataLoaded = !loading;
  
  return (
    <div className="user-profile">
      {/* Component content */}
    </div>
  );
}
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add barcode scanning for battery receipt
fix: resolve JWT token expiry issue
docs: update API documentation
test: add integration tests for auth service
refactor: improve error handling in sync service
chore: update dependencies
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test additions/changes
- `refactor`: Code refactoring
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `security`: Security fixes

---

## 🧪 Testing

### Running Tests

```bash
# Backend tests
cd integrations
npm test

# Frontend tests
cd shop-floor
npm test

# Test with coverage
npm run test:coverage
```

### Writing Tests

**Backend (Jest)**:
```javascript
const authService = require('./services/auth');

describe('AuthService', () => {
  describe('login', () => {
    it('should return token for valid credentials', async () => {
      const result = await authService.login('admin', 'admin123');
      
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.username).toBe('admin');
    });
    
    it('should throw error for invalid credentials', async () => {
      await expect(authService.login('admin', 'wrong'))
        .rejects
        .toThrow('Invalid credentials');
    });
  });
});
```

**Frontend (React Testing Library)**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import Login from './Login';

describe('Login', () => {
  it('should show error for invalid credentials', async () => {
    render(<Login />);
    
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'admin' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    expect(await screen.findByText(/invalid credentials/i))
      .toBeInTheDocument();
  });
});
```

---

## 📤 Submitting Changes

### Pull Request Process

1. **Update Documentation**: If you change functionality, update docs
2. **Add Tests**: Ensure test coverage for new features
3. **Update CHANGELOG**: Add entry to [CHANGELOG.md](./CHANGELOG.md)
4. **Rebase**: Rebase on latest main branch
5. **Squash Commits**: Squash related commits

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally
```

---

## 🔍 Code Review

### Review Guidelines

- Be respectful and constructive
- Focus on code, not the person
- Suggest improvements, don't just criticize
- Acknowledge good work

### Review Criteria

- ✅ Functionality works as expected
- ✅ Code follows style guidelines
- ✅ Tests included and passing
- ✅ Documentation updated
- ✅ No security issues introduced
- ✅ Performance considered

---

## 📚 Documentation

### Documentation Standards

- Use clear, concise language
- Include code examples
- Add screenshots for UI changes
- Document edge cases
- Link to related documentation

### Building Docs

```bash
# Install docs dependencies
npm install -D markdownlint-cli

# Lint documentation
markdownlint docs/

# Build documentation site
npm run docs:build
```

---

## 🐛 Reporting Bugs

### Bug Report Template

```markdown
**Describe the bug**
Clear description of what the bug is

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment:**
- OS: [e.g. macOS, Linux]
- Node: [e.g. 18.16.0]
- Browser: [e.g. Chrome 114]
- Version: [e.g. 1.0.0]

**Additional context**
Any other relevant information
```

---

## 💡 Feature Requests

### Feature Request Template

```markdown
**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
How should the feature work?

**Alternatives Considered**
Other solutions you've thought about

**Additional Context**
Mockups, examples, references
```

---

## 📖 Resources

- [Project Architecture](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Development Setup](./docs/DEVELOPMENT.md)
- [Style Guide](./docs/STYLE_GUIDE.md)

---

## 🤝 Questions?

- **General Questions**: GitHub Discussions
- **Bug Reports**: GitHub Issues
- **Security Issues**: security@battery-recycling.com
- **Other**: Contact maintainers

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 License.

---

**Thank you for contributing to Battery ERP! 🎉**
