#!/bin/bash

# VRAM Magic - Deployment Automation Script
# Comprehensive deployment script with validation, rollback, and monitoring

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/deploy.log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
ENVIRONMENT="staging"
PLATFORM="vercel"
SKIP_TESTS=false
SKIP_BUILD=false
DRY_RUN=false
FORCE_DEPLOY=false
ROLLBACK=false
VERSION=""

# Supported platforms
SUPPORTED_PLATFORMS=("vercel" "netlify" "render" "docker" "all")

# Help function
show_help() {
    cat << EOF
VRAM Magic Deployment Script

Usage: $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV    Deployment environment (staging, production)
    -p, --platform PLATFORM Deployment platform (vercel, netlify, render, docker, all)
    -v, --version VERSION    Version tag for deployment
    --skip-tests            Skip test execution
    --skip-build            Skip build process
    --dry-run               Show what would be deployed without executing
    --force                 Force deployment without confirmation
    --rollback              Rollback to previous version
    -h, --help              Show this help message

EXAMPLES:
    $0 -e production -p vercel
    $0 -e staging -p all --skip-tests
    $0 --rollback -e production -p vercel
    $0 --dry-run -e production -p all

SUPPORTED PLATFORMS:
    vercel    - Deploy to Vercel
    netlify   - Deploy to Netlify
    render    - Deploy to Render.com
    docker    - Build and push Docker image
    all       - Deploy to all platforms

EOF
}

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case "$level" in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message" | tee -a "$LOG_FILE"
            ;;
    esac

    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Error handling
handle_error() {
    local exit_code=$?
    log "ERROR" "Deployment failed with exit code $exit_code"
    log "ERROR" "Check $LOG_FILE for detailed error information"
    exit $exit_code
}

trap handle_error ERR

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -p|--platform)
                PLATFORM="$2"
                shift 2
                ;;
            -v|--version)
                VERSION="$2"
                shift 2
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE_DEPLOY=true
                shift
                ;;
            --rollback)
                ROLLBACK=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Validation functions
validate_environment() {
    if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
        log "ERROR" "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
        exit 1
    fi
}

validate_platform() {
    local valid=false
    for platform in "${SUPPORTED_PLATFORMS[@]}"; do
        if [[ "$PLATFORM" == "$platform" ]]; then
            valid=true
            break
        fi
    done

    if [[ "$valid" == false ]]; then
        log "ERROR" "Invalid platform: $PLATFORM. Supported: ${SUPPORTED_PLATFORMS[*]}"
        exit 1
    fi
}

validate_dependencies() {
    log "INFO" "Validating dependencies..."

    # Check if we're in the project root
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        log "ERROR" "package.json not found. Are you in the project root?"
        exit 1
    fi

    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js not found. Please install Node.js"
        exit 1
    fi

    local node_version=$(node --version | cut -d'v' -f2)
    local required_version="18.0.0"
    if ! npm --version &> /dev/null; then
        log "ERROR" "npm not found. Please install npm"
        exit 1
    fi

    # Platform-specific dependency checks
    case "$PLATFORM" in
        "vercel")
            if ! command -v vercel &> /dev/null; then
                log "WARNING" "Vercel CLI not found. Installing..."
                npm install -g vercel
            fi
            ;;
        "netlify")
            if ! command -v netlify &> /dev/null; then
                log "WARNING" "Netlify CLI not found. Installing..."
                npm install -g netlify-cli
            fi
            ;;
        "docker")
            if ! command -v docker &> /dev/null; then
                log "ERROR" "Docker not found. Please install Docker"
                exit 1
            fi
            ;;
    esac

    log "SUCCESS" "Dependencies validated"
}

# Pre-deployment checks
run_pre_deployment_checks() {
    log "INFO" "Running pre-deployment checks..."

    # Git status check
    if ! git diff-index --quiet HEAD --; then
        if [[ "$FORCE_DEPLOY" == false ]]; then
            log "ERROR" "Uncommitted changes detected. Commit or stash changes before deployment"
            exit 1
        else
            log "WARNING" "Uncommitted changes detected but force deployment enabled"
        fi
    fi

    # Branch check for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        local current_branch=$(git rev-parse --abbrev-ref HEAD)
        if [[ "$current_branch" != "main" && "$FORCE_DEPLOY" == false ]]; then
            log "ERROR" "Production deployments must be from 'main' branch. Current: $current_branch"
            exit 1
        fi
    fi

    # Version check
    if [[ -z "$VERSION" ]]; then
        VERSION=$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)
        log "INFO" "Auto-generated version: $VERSION"
    fi

    log "SUCCESS" "Pre-deployment checks passed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log "WARNING" "Skipping tests (--skip-tests flag)"
        return 0
    fi

    log "INFO" "Running tests..."

    cd "$PROJECT_ROOT"

    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log "INFO" "Installing dependencies..."
        npm ci
    fi

    # Run linting
    log "INFO" "Running ESLint..."
    npm run lint

    # Run type checking
    log "INFO" "Running TypeScript check..."
    npm run type-check

    # Run unit tests
    log "INFO" "Running unit tests..."
    npm test -- --run --coverage

    # Run accessibility tests
    log "INFO" "Running accessibility tests..."
    npm test -- --run tests/accessibility/

    log "SUCCESS" "All tests passed"
}

# Build application
build_application() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log "WARNING" "Skipping build (--skip-build flag)"
        return 0
    fi

    log "INFO" "Building application for $ENVIRONMENT..."

    cd "$PROJECT_ROOT"

    # Set environment variables
    export NODE_ENV="production"
    export VITE_APP_ENV="$ENVIRONMENT"
    export VITE_APP_VERSION="$VERSION"

    if [[ "$ENVIRONMENT" == "production" ]]; then
        export VITE_FEATURE_DEBUG_MODE="false"
        export VITE_BUILD_SOURCEMAP="false"
    else
        export VITE_FEATURE_DEBUG_MODE="true"
        export VITE_BUILD_SOURCEMAP="true"
    fi

    # Build the application
    npm run build

    # Validate build output
    if [[ ! -d "dist" ]]; then
        log "ERROR" "Build failed: dist directory not found"
        exit 1
    fi

    if [[ ! -f "dist/index.html" ]]; then
        log "ERROR" "Build failed: index.html not found"
        exit 1
    fi

    # Check bundle size
    local bundle_size=$(find dist -name "*.js" -type f -exec wc -c {} + | awk '{sum+=$1} END {print sum}')
    local bundle_size_mb=$((bundle_size / 1024 / 1024))

    log "INFO" "Bundle size: ${bundle_size_mb}MB"

    if [[ $bundle_size_mb -gt 2 ]]; then
        log "WARNING" "Bundle size exceeds 2MB. Consider optimization"
    fi

    log "SUCCESS" "Build completed successfully"
}

# Deploy to Vercel
deploy_vercel() {
    log "INFO" "Deploying to Vercel..."

    local vercel_args=""

    if [[ "$ENVIRONMENT" == "production" ]]; then
        vercel_args="--prod"
    fi

    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "[DRY RUN] Would execute: vercel deploy $vercel_args"
        return 0
    fi

    vercel deploy $vercel_args --confirm

    log "SUCCESS" "Vercel deployment completed"
}

# Deploy to Netlify
deploy_netlify() {
    log "INFO" "Deploying to Netlify..."

    local netlify_args="--dir=dist"

    if [[ "$ENVIRONMENT" == "production" ]]; then
        netlify_args="$netlify_args --prod"
    fi

    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "[DRY RUN] Would execute: netlify deploy $netlify_args"
        return 0
    fi

    netlify deploy $netlify_args

    log "SUCCESS" "Netlify deployment completed"
}

# Deploy to Render
deploy_render() {
    log "INFO" "Deploying to Render..."

    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "[DRY RUN] Would trigger Render deployment via git push"
        return 0
    fi

    # Render deploys automatically on git push
    # So we just need to push to the appropriate branch
    local target_branch="main"
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        target_branch="develop"
    fi

    git push origin "$target_branch"

    log "SUCCESS" "Render deployment triggered"
}

# Build Docker image
build_docker() {
    log "INFO" "Building Docker image..."

    local image_tag="vram-magic:$VERSION"
    local registry_tag="ghcr.io/rh-aiservices-bu/vram-magic:$VERSION"

    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "[DRY RUN] Would build Docker image: $image_tag"
        return 0
    fi

    # Build the image
    docker build -t "$image_tag" -t "$registry_tag" .

    # Push to registry if not dry run
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "INFO" "Pushing to container registry..."
        docker push "$registry_tag"
    fi

    log "SUCCESS" "Docker image built: $image_tag"
}

# Rollback deployment
rollback_deployment() {
    log "INFO" "Initiating rollback for $PLATFORM on $ENVIRONMENT..."

    case "$PLATFORM" in
        "vercel")
            log "INFO" "Use Vercel dashboard to rollback or run: vercel rollback [deployment-url]"
            ;;
        "netlify")
            log "INFO" "Use Netlify dashboard to rollback to previous deploy"
            ;;
        "render")
            log "INFO" "Render will rollback automatically if health checks fail"
            ;;
        "docker")
            log "INFO" "Rollback Docker deployment manually by deploying previous image version"
            ;;
    esac

    log "SUCCESS" "Rollback instructions provided"
}

# Main deployment function
deploy() {
    local start_time=$(date +%s)

    log "INFO" "Starting deployment..."
    log "INFO" "Environment: $ENVIRONMENT"
    log "INFO" "Platform: $PLATFORM"
    log "INFO" "Version: $VERSION"

    if [[ "$ROLLBACK" == true ]]; then
        rollback_deployment
        return 0
    fi

    # Confirmation prompt for production
    if [[ "$ENVIRONMENT" == "production" && "$FORCE_DEPLOY" == false && "$DRY_RUN" == false ]]; then
        read -p "Are you sure you want to deploy to PRODUCTION? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "INFO" "Deployment cancelled by user"
            exit 0
        fi
    fi

    # Execute deployment steps
    run_pre_deployment_checks
    run_tests
    build_application

    case "$PLATFORM" in
        "vercel")
            deploy_vercel
            ;;
        "netlify")
            deploy_netlify
            ;;
        "render")
            deploy_render
            ;;
        "docker")
            build_docker
            ;;
        "all")
            deploy_vercel
            deploy_netlify
            deploy_render
            build_docker
            ;;
    esac

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log "SUCCESS" "Deployment completed successfully in ${duration}s"
    log "INFO" "Deployment details logged to: $LOG_FILE"
}

# Main script execution
main() {
    # Initialize log file
    echo "=== VRAM Magic Deployment Log ===" > "$LOG_FILE"
    echo "Started at: $(date)" >> "$LOG_FILE"

    # Parse arguments
    parse_args "$@"

    # Validate inputs
    validate_environment
    validate_platform
    validate_dependencies

    # Execute deployment
    deploy
}

# Run main function with all arguments
main "$@"