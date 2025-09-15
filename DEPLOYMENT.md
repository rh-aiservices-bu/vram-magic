# VRAM Magic - Deployment Guide

This guide covers all deployment options and configurations for the VRAM Magic React application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Configuration](#environment-configuration)
3. [Platform Deployments](#platform-deployments)
4. [Docker Deployment](#docker-deployment)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- Platform-specific CLI tools (optional)

### Basic Deployment

```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Deploy to all platforms
npm run deploy:production

# Deploy to specific platform
npm run deploy:vercel
npm run deploy:netlify
npm run deploy:docker
```

## Environment Configuration

### Environment Files

The application supports multiple environment configurations:

- `.env.example` - Template with all available variables
- `.env.development` - Development-specific settings
- `.env.production` - Production-specific settings
- `.env.local` - Local overrides (not tracked in git)

### Key Environment Variables

```bash
# Application Configuration
VITE_APP_ENV=production
VITE_APP_VERSION=0.1.0
VITE_APP_TITLE="VRAM Magic"

# Feature Flags
VITE_FEATURE_DARK_MODE=true
VITE_FEATURE_ACCESSIBILITY=true
VITE_FEATURE_EXPORT=true
VITE_FEATURE_ADVANCED_CHARTS=true

# API Configuration
VITE_API_BASE_URL=https://api.vram-magic.com/api
VITE_MODELS_BASE_URL=/models

# Security
VITE_CSP_STRICT_MODE=true
VITE_FORCE_HTTPS=true
```

## Platform Deployments

### Vercel

**Automatic Deployment:**

- Push to `main` branch triggers production deployment
- Push to other branches creates preview deployments

**Manual Deployment:**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
npm run deploy:vercel

# Or use deployment script
./scripts/deploy.sh -e production -p vercel
```

**Configuration:** `vercel.json`

- Build settings and environment variables
- Custom headers for security
- Routing rules for SPA
- Caching strategies

### Netlify

**Automatic Deployment:**

- Connected to Git repository
- Builds on every push to configured branches

**Manual Deployment:**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
npm run deploy:netlify

# Or use deployment script
./scripts/deploy.sh -e production -p netlify
```

**Configuration:** `netlify.toml`

- Build commands and publish directory
- Redirects and rewrites for SPA
- Security headers
- Edge functions configuration

### Render

**Automatic Deployment:**

- Git-based deployment
- Automatic builds on push

**Configuration:** `render.yaml`

- Service definitions
- Environment variables
- Build and deploy settings
- Custom domains and SSL

### Custom Server/VPS

Use Docker deployment for custom servers:

```bash
# Build and run with Docker
npm run docker:build
npm run docker:run

# Or use Docker Compose
npm run docker:compose
```

## Docker Deployment

### Single Container

```bash
# Build image
docker build -t vram-magic .

# Run container
docker run -d -p 80:80 --name vram-magic vram-magic

# Check health
curl http://localhost/health
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Docker Compose

```bash
# Use production profile
docker-compose --profile production up -d

# With monitoring
docker-compose --profile monitoring up -d
```

### Container Registry

```bash
# Tag for registry
docker tag vram-magic ghcr.io/rh-aiservices-bu/vram-magic:latest

# Push to registry
docker push ghcr.io/rh-aiservices-bu/vram-magic:latest
```

## CI/CD Pipeline

### GitHub Actions

The project includes three GitHub Actions workflows:

1. **CI Pipeline** (`.github/workflows/ci.yml`)
   - Runs on all branches
   - Tests, linting, security checks
   - Build validation
   - Bundle analysis

2. **Deployment Pipeline** (`.github/workflows/deploy.yml`)
   - Triggered on main branch and tags
   - Multi-platform deployment
   - Docker image building
   - Health checks

3. **Test Suite** (`.github/workflows/test.yml`)
   - Comprehensive testing
   - Accessibility validation
   - Performance monitoring
   - Security scanning

### Required Secrets

Configure these secrets in your GitHub repository:

```bash
# Vercel
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id

# Netlify
NETLIFY_AUTH_TOKEN=your_netlify_token
NETLIFY_SITE_ID=your_site_id

# Google Cloud (optional)
GCP_SA_KEY=your_service_account_key

# Monitoring (optional)
SLACK_WEBHOOK_URL=your_slack_webhook
```

### Manual Workflow Triggers

```bash
# Trigger deployment manually
gh workflow run deploy.yml -f environment=production

# Run specific tests
gh workflow run test.yml -f test_type=accessibility
```

## Monitoring & Health Checks

### Health Check Endpoint

The application provides a health check endpoint at `/health`:

```bash
# Check application health
curl https://your-domain.com/health
```

### Health Check Script

Use the built-in health check script:

```bash
# Single health check
npm run health-check

# Continuous monitoring
npm run health-check:continuous

# Production environment check
npm run health-check:production

# Custom URL check
./scripts/health-check.sh -u https://custom-domain.com

# With alerts
./scripts/health-check.sh --slack-webhook https://hooks.slack.com/...
```

### Monitoring Features

- **HTTP Status Monitoring:** Checks response codes and timing
- **Content Validation:** Verifies application content
- **SSL Certificate Validation:** Ensures HTTPS security
- **Security Headers Check:** Validates security configurations
- **Performance Metrics:** Monitors page load times
- **Alert Notifications:** Slack and webhook integrations

### Prometheus Metrics (Docker)

When using Docker Compose with monitoring:

```bash
# Access Prometheus UI
open http://localhost:9090

# View metrics
curl http://localhost:9090/metrics
```

## Troubleshooting

### Common Issues

1. **Build Failures**

   ```bash
   # Clear cache and rebuild
   rm -rf node_modules dist
   npm ci
   npm run build
   ```

2. **Environment Variables Not Loading**
   - Ensure variables start with `VITE_`
   - Check `.env` file placement
   - Verify file encoding (UTF-8)

3. **Deployment Script Permissions**

   ```bash
   chmod +x scripts/deploy.sh
   chmod +x scripts/health-check.sh
   ```

4. **Docker Build Issues**

   ```bash
   # Check Docker daemon
   docker --version

   # Clear Docker cache
   docker system prune -a
   ```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Development build with debug
VITE_FEATURE_DEBUG_MODE=true npm run build

# Deployment with verbose output
./scripts/deploy.sh -e staging -p vercel --verbose
```

### Performance Issues

1. **Bundle Size Analysis**

   ```bash
   npm run build:analyze
   npm run bundle:visualize
   ```

2. **Performance Check**

   ```bash
   npm run perf-check
   ```

3. **Lighthouse Audit**
   ```bash
   npm run build
   npm run preview &
   npx lighthouse http://localhost:4173
   ```

### Platform-Specific Issues

**Vercel:**

- Check build logs in Vercel dashboard
- Verify environment variables in project settings
- Ensure functions are properly configured

**Netlify:**

- Check deploy logs in Netlify dashboard
- Verify redirects and headers in `netlify.toml`
- Test preview deployments first

**Docker:**

- Check container logs: `docker logs container-name`
- Verify port mappings and networking
- Test locally before deploying

### Getting Help

1. Check deployment logs
2. Run health checks
3. Review environment configuration
4. Test builds locally
5. Check platform-specific documentation

### Rollback Procedures

**Vercel:**

```bash
vercel rollback [deployment-url]
```

**Netlify:**
Use Netlify dashboard to rollback to previous deploy

**Docker:**

```bash
# Deploy previous image version
docker run -d -p 80:80 vram-magic:previous-tag
```

**Git-based Rollback:**

```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

## Security Considerations

1. **Environment Variables:** Never commit sensitive data
2. **HTTPS Only:** Enforce HTTPS in production
3. **Security Headers:** Configured in platform configs
4. **Content Security Policy:** Implemented for XSS protection
5. **Dependency Scanning:** Automated in CI pipeline

## Performance Optimization

1. **Bundle Splitting:** Configured in Vite
2. **Asset Compression:** Gzip and Brotli enabled
3. **Caching Strategy:** Long-term caching for static assets
4. **CDN Usage:** Automatic with deployment platforms
5. **Image Optimization:** Built into platform deployments

---

For more detailed information, refer to the platform-specific documentation and the project's CI/CD workflows.
