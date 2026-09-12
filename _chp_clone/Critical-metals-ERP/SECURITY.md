# Security Policy

## Supported Versions

| Version | Supported | End of Support |
|---------|-----------|----------------|
| 1.x.x   | ✅ Yes    | Current        |
| 0.x.x   | ❌ No     | 2024-06-01     |

## Reporting a Vulnerability

We take the security of Battery ERP seriously. If you believe you've found a security vulnerability, please follow these steps:

### **DO NOT** create a public GitHub issue for security vulnerabilities.

### How to Report

1. **Email**: security@battery-recycling.com
2. **PGP Key**: Available upon request
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Time

- **Initial Response**: Within 48 hours
- **Status Update**: Within 5 business days
- **Resolution Timeline**: Depends on severity (see below)

### Severity Levels

| Severity | Response Time | Resolution Target |
|----------|---------------|-------------------|
| Critical | 24 hours | 7 days |
| High | 48 hours | 14 days |
| Medium | 5 days | 30 days |
| Low | 10 days | Next release |

## Security Best Practices

### For Users

1. **Change Default Credentials Immediately**
   ```bash
   # Default users to change:
   # admin / admin123
   # supervisor / supervisor123
   # operator / operator123
   # quality / quality123
   ```

2. **Use Strong JWT Secrets**
   ```bash
   # Generate secure secret
   openssl rand -hex 32
   ```

3. **Enable HTTPS/TLS**
   - Use valid SSL certificates
   - Enable HSTS
   - Redirect HTTP to HTTPS

4. **Configure Firewall**
   - Only expose necessary ports
   - Use fail2ban for brute force protection
   - Enable DDoS protection

5. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Apply patches promptly

### For Developers

1. **Input Validation**
   - Validate all user inputs
   - Use parameterized queries
   - Sanitize outputs

2. **Authentication**
   - Use bcrypt for password hashing (10+ rounds)
   - Implement account lockout
   - Use secure session management

3. **Authorization**
   - Implement RBAC
   - Validate permissions on every request
   - Use principle of least privilege

4. **Logging**
   - Log security events
   - Never log sensitive data
   - Monitor for anomalies

5. **Dependencies**
   - Run `npm audit` regularly
   - Use dependabot
   - Pin dependency versions

## Security Features

### Implemented

- ✅ JWT authentication with expiry
- ✅ Rate limiting (100 req/15min, 10 auth attempts/hour)
- ✅ CORS configuration
- ✅ Helmet.js security headers
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ Security audit logging
- ✅ IP blocking capability
- ✅ Password hashing (bcrypt)
- ✅ Session management

### Planned

- [ ] Two-factor authentication (2FA)
- [ ] OAuth2/OIDC support
- [ ] SAML SSO
- [ ] Audit log export
- [ ] Intrusion detection
- [ ] Automated security scanning

## Vulnerability Disclosure Policy

We follow a coordinated disclosure process:

1. **Report Received**: Acknowledge within 48 hours
2. **Verification**: Confirm vulnerability within 5 days
3. **Fix Development**: Work on patch
4. **Testing**: Test fix thoroughly
5. **Release**: Publish security release
6. **Disclosure**: Public disclosure after 30 days

### Recognition

We acknowledge responsible security researchers in our security advisories (with permission).

## Security Advisories

Past security advisories are published at:
https://github.com/YOUR_USERNAME/battery-erp/security/advisories

### Recent Advisories

| ID | Severity | Description | Date |
|----|----------|-------------|------|
| BERP-2024-001 | Medium | XSS in barcode input | 2024-04-15 |

## Contact

- **Security Email**: security@battery-recycling.com
- **PGP Fingerprint**: [Available upon request]
- **Response Hours**: Monday-Friday, 9 AM - 5 PM UTC

---

**Last Updated**: 2024-04-29
