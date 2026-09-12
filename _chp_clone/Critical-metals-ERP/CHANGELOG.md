# Changelog

All notable changes to Battery ERP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Initial release of Battery ERP
- Complete authentication system with JWT and RBAC
- Barcode scanning and label printing functionality
- Hazardous waste tracking with EPA compliance
- Inventory management with multi-warehouse support
- Shop Floor UI (10 pages, tablet-optimized)
- Integration with ERPNext, Carbon, Xero, and Precoro
- Astra DB integration for time-series data
- Security hardening (rate limiting, XSS/CSRF protection)
- GitHub Actions CI/CD pipeline
- Comprehensive documentation

### Security
- JWT authentication with configurable expiry
- Rate limiting (100 req/15min, 10 auth attempts/hour)
- Security headers via Helmet.js
- Input validation and sanitization
- Audit logging for security events

---

## [1.0.0] - 2024-04-30

### Added
- **Authentication System**
  - User login/logout with JWT tokens
  - Session management (8-hour expiry)
  - Role-based access control (4 roles)
  - Protected routes and API endpoints
  - User management CRUD operations

- **Barcode System**
  - Batch ID generation (BAT-YYYYMMDD-XXXX-C format)
  - QR code and Code 128 barcode generation
  - Camera-based barcode scanning (html5-qrcode)
  - USB barcode scanner support
  - Label printing with 3 size options
  - Batch ID validation with checksum

- **Hazardous Waste Tracking**
  - EPA manifest creation and management
  - Waste item tracking by EPA waste codes
  - 90-day accumulation monitoring (LQG)
  - 180-day accumulation monitoring (SQG)
  - Compliance alerts and reporting
  - Pickup scheduling with vendors
  - Storage location tracking

- **Inventory Management**
  - Multi-warehouse stock tracking
  - Stock transfers between warehouses
  - Stock adjustments
  - Low stock alerts
  - Reorder point configuration
  - Real-time inventory dashboard

- **Shop Floor UI**
  - Login page with authentication
  - Dashboard with operations overview
  - Work order management
  - Battery receipt with barcode scanning
  - Quality inspection interface
  - Material recovery tracking
  - Traceability chain viewer
  - Hazardous waste management
  - Inventory management
  - Settings page

- **Integrations**
  - ERPNext bi-directional sync
  - Carbon MES integration
  - Xero accounting sync
  - Precoro procurement integration
  - Astra DB for time-series data

- **Security Features**
  - JWT authentication
  - Rate limiting (general and auth-specific)
  - CORS configuration
  - Helmet.js security headers
  - XSS protection (xss-clean)
  - CSRF protection
  - Input validation (express-validator)
  - HTTP Parameter Pollution protection (hpp)
  - Security audit logging
  - IP blocking capability

- **Documentation**
  - README with comprehensive overview
  - API reference documentation
  - Deployment guide
  - Security policy
  - Contributing guidelines
  - Code of Conduct
  - License (AGPL-3.0)
  - Third-party attributions (NOTICE)

- **DevOps**
  - GitHub Actions CI/CD pipeline
  - Automated testing workflow
  - Security scanning (Trivy)
  - Docker deployment configurations
  - Dependency update automation
  - Issue and PR templates

### Changed
- None (initial release)

### Deprecated
- None (initial release)

### Removed
- None (initial release)

### Fixed
- None (initial release)

### Security
- All credentials excluded from version control
- Security advisory process documented
- Default passwords documented for immediate change
- Token rotation guidelines provided

---

## Version History

| Version | Release Date | Key Features |
|---------|--------------|--------------|
| 1.0.0 | 2024-04-30 | Initial release with all core features |

---

## Upcoming Features (Roadmap)

### Q2 2024
- [ ] Mobile app (React Native)
- [ ] Offline mode with sync
- [ ] Push notifications

### Q3 2024
- [ ] Advanced analytics dashboards
- [ ] Predictive maintenance
- [ ] Machine learning for quality prediction

### Q4 2024
- [ ] IoT sensor integration
- [ ] EDI for supplier communications
- [ ] Multi-language support

---

## Breaking Changes

### Version 1.0.0
- None (initial release)

---

## Migration Guide

### From No Previous Version (First Install)

1. Clone repository
2. Copy `.env.example` to `.env`
3. Configure environment variables
4. Run `npm install` in both `integrations/` and `shop-floor/`
5. Start services with `npm run dev`
6. Access at http://localhost:3002
7. Login with default credentials (change immediately!)

---

## Contributors

Battery ERP is built by the Battery Recycling Company team and the open-source community.

Special thanks to:
- ERPNext (Frappe Technologies)
- Carbon (Carbon Contributors)
- All open-source library maintainers

---

**Note**: This changelog follows [Keep a Changelog](https://keepachangelog.com) format.

For more information about this project, visit the [README](../README.md).
