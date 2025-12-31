# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Docker containerization with multi-stage build
- Docker Compose configuration for easy deployment
- Nginx configuration with security headers and gzip compression
- CI/CD pipeline with GitHub Actions
- Comprehensive deployment documentation (DEPLOYMENT.md)
- Security best practices documentation (SECURITY.md)
- API specification for backend implementation (API.md)
- Contributing guidelines (CONTRIBUTING.md)
- Terms of Service page (/terms)
- Privacy Policy page (/privacy)
- Error boundary for graceful error handling
- Environment variable configuration (.env.example)
- Code splitting for optimized bundle sizes
- Health check endpoint configuration
- .dockerignore for optimized Docker builds
- Production-ready README with comprehensive documentation

### Changed
- Updated README with production-ready information
- Improved .gitignore to exclude environment files and build artifacts
- Fixed CSS import order to resolve build warnings
- Added ErrorBoundary wrapper to App component
- Configured QueryClient with better defaults
- Optimized Vite build configuration with manual chunks

### Security
- Fixed all npm security vulnerabilities (upgraded vite to 7.3.0)
- Added security headers in nginx configuration
- Documented security requirements and best practices
- Added HTTPS enforcement configuration
- Implemented proper error handling to prevent information leakage

### Fixed
- Resolved CSS @import ordering issue in index.css
- Fixed npm audit vulnerabilities

## [0.0.0] - Initial Release

### Added
- Initial React + TypeScript + Vite setup
- Tailwind CSS configuration
- shadcn/ui components integration
- User authentication flow (signup, login)
- Group creation and management
- Dashboard and profile pages
- Transaction history
- Browse and join groups functionality
- Contribution and payout system
- Security deposit management
- Protected routes
- Responsive design
- Form validation with Zod
- Toast notifications

[Unreleased]: https://github.com/Olamability/ajo-secure/compare/v0.0.0...HEAD
[0.0.0]: https://github.com/Olamability/ajo-secure/releases/tag/v0.0.0
