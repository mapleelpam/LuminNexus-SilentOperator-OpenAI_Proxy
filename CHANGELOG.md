# Changelog

All notable changes to LuminNexus SilentOperator OpenAI Proxy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-13

### Added
- Initial release of Simple OpenAI Realtime Proxy
- WebSocket proxy for OpenAI Realtime API
- AWS Cognito JWT authentication integration
- Health check endpoint for AWS App Runner
- Basic connection management (max 2 connections per user)
- Docker containerization support
- AWS App Runner deployment configuration
- Node.js 20 runtime support

### Features
- ✅ OpenAI Realtime API WebSocket proxy
- ✅ AWS Cognito JWT authentication
- ✅ Support for 4-hour long connections
- ✅ Auto-scaling with AWS App Runner
- ✅ Docker containerization
- ✅ Minimal design (single-file architecture)

### Security
- OpenAI API key never exposed to frontend
- JWT token validation with JWKS
- Basic rate limiting per user
- Secure WebSocket connections