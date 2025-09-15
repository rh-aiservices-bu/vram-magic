#!/bin/bash

# VRAM Magic - Health Check and Monitoring Script
# Comprehensive health monitoring for deployed applications

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/health-check.log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
ENVIRONMENT="production"
CHECK_INTERVAL=30
MAX_RETRIES=3
TIMEOUT=10
VERBOSE=false
CONTINUOUS=false
ALERT_WEBHOOK=""
SLACK_WEBHOOK=""

# Deployment URLs (configure for your deployments)
declare -A DEPLOYMENT_URLS=(
    ["vercel-production"]="https://vram-magic.vercel.app"
    ["vercel-staging"]="https://vram-magic-staging.vercel.app"
    ["netlify-production"]="https://vram-magic.netlify.app"
    ["netlify-staging"]="https://vram-magic-staging.netlify.app"
    ["render-production"]="https://vram-magic.onrender.com"
    ["render-staging"]="https://vram-magic-staging.onrender.com"
)

# Help function
show_help() {
    cat << EOF
VRAM Magic Health Check Script

Usage: $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV    Environment to check (staging, production, all)
    -p, --platform PLATFORM Platform to check (vercel, netlify, render, all)
    -u, --url URL           Custom URL to check
    -i, --interval SECONDS  Check interval for continuous monitoring (default: 30)
    -r, --retries COUNT     Maximum number of retries (default: 3)
    -t, --timeout SECONDS   Request timeout (default: 10)
    -c, --continuous        Run continuous monitoring
    -v, --verbose           Verbose output
    --webhook URL           Webhook URL for alerts
    --slack-webhook URL     Slack webhook URL for notifications
    -h, --help              Show this help message

EXAMPLES:
    $0 -e production -p all
    $0 -u https://custom-domain.com
    $0 -c -i 60 -e production
    $0 --verbose -e staging -p vercel

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
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
    esac

    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

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
            -u|--url)
                CUSTOM_URL="$2"
                shift 2
                ;;
            -i|--interval)
                CHECK_INTERVAL="$2"
                shift 2
                ;;
            -r|--retries)
                MAX_RETRIES="$2"
                shift 2
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            -c|--continuous)
                CONTINUOUS=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            --webhook)
                ALERT_WEBHOOK="$2"
                shift 2
                ;;
            --slack-webhook)
                SLACK_WEBHOOK="$2"
                shift 2
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

# Health check function
check_url() {
    local url="$1"
    local name="$2"
    local retry_count=0
    local success=false

    while [[ $retry_count -lt $MAX_RETRIES && $success == false ]]; do
        if [[ $retry_count -gt 0 ]]; then
            log "INFO" "Retrying $name (attempt $((retry_count + 1))/$MAX_RETRIES)..."
            sleep 2
        fi

        # Perform HTTP health check
        local response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total};SIZE:%{size_download}" \
                        --max-time $TIMEOUT \
                        "$url" 2>/dev/null || echo "HTTPSTATUS:000;TIME:0;SIZE:0")

        local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
        local time_total=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
        local size_download=$(echo "$response" | grep -o "SIZE:[0-9]*" | cut -d: -f2)

        if [[ "$http_code" == "200" ]]; then
            success=true
            log "SUCCESS" "$name is healthy (${http_code}, ${time_total}s, ${size_download} bytes)"

            # Additional content checks
            local content=$(echo "$response" | sed 's/HTTPSTATUS:.*//g')

            # Check if it's actually the VRAM Magic app
            if echo "$content" | grep -q "VRAM Magic" || echo "$content" | grep -q "vram-magic"; then
                log "SUCCESS" "$name content validation passed"
            else
                log "WARNING" "$name returned 200 but content validation failed"
                success=false
            fi

            # Performance check
            if (( $(echo "$time_total > 3.0" | bc -l) )); then
                log "WARNING" "$name is slow (${time_total}s response time)"
            fi

        else
            log "ERROR" "$name health check failed (HTTP $http_code, ${time_total}s)"
        fi

        retry_count=$((retry_count + 1))
    done

    if [[ $success == false ]]; then
        send_alert "$name health check failed after $MAX_RETRIES attempts"
        return 1
    fi

    return 0
}

# Comprehensive health check
check_application_health() {
    local url="$1"
    local name="$2"

    log "INFO" "Performing comprehensive health check for $name..."

    # Basic HTTP health check
    if ! check_url "$url" "$name"; then
        return 1
    fi

    # Check specific endpoints
    local endpoints=(
        "/health"
        "/models/llama2-7b.json"
        "/"
    )

    local failed_endpoints=0

    for endpoint in "${endpoints[@]}"; do
        local full_url="${url}${endpoint}"

        if [[ $VERBOSE == true ]]; then
            log "INFO" "Checking endpoint: $endpoint"
        fi

        local response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$full_url" 2>/dev/null || echo "000")

        if [[ "$response" =~ 200$ ]]; then
            if [[ $VERBOSE == true ]]; then
                log "SUCCESS" "Endpoint $endpoint is accessible"
            fi
        else
            log "WARNING" "Endpoint $endpoint returned HTTP ${response: -3}"
            failed_endpoints=$((failed_endpoints + 1))
        fi
    done

    # SSL/TLS check for HTTPS URLs
    if [[ "$url" =~ ^https:// ]]; then
        if [[ $VERBOSE == true ]]; then
            log "INFO" "Checking SSL certificate..."
        fi

        local ssl_info=$(curl -s -I --max-time $TIMEOUT "$url" 2>/dev/null | grep -i "HTTP/")
        if [[ -n "$ssl_info" ]]; then
            log "SUCCESS" "SSL certificate is valid"
        else
            log "WARNING" "SSL certificate check failed"
            failed_endpoints=$((failed_endpoints + 1))
        fi
    fi

    # Security headers check
    if [[ $VERBOSE == true ]]; then
        log "INFO" "Checking security headers..."
    fi

    local headers=$(curl -s -I --max-time $TIMEOUT "$url" 2>/dev/null)
    local security_score=0

    if echo "$headers" | grep -qi "x-content-type-options"; then
        security_score=$((security_score + 1))
    fi

    if echo "$headers" | grep -qi "x-frame-options"; then
        security_score=$((security_score + 1))
    fi

    if echo "$headers" | grep -qi "x-xss-protection"; then
        security_score=$((security_score + 1))
    fi

    if echo "$headers" | grep -qi "referrer-policy"; then
        security_score=$((security_score + 1))
    fi

    if [[ $security_score -ge 3 ]]; then
        if [[ $VERBOSE == true ]]; then
            log "SUCCESS" "Security headers check passed ($security_score/4)"
        fi
    else
        log "WARNING" "Security headers incomplete ($security_score/4)"
    fi

    # Performance metrics
    local perf_start=$(date +%s.%N)
    curl -s --max-time $TIMEOUT "$url" > /dev/null 2>&1
    local perf_end=$(date +%s.%N)
    local perf_time=$(echo "$perf_end - $perf_start" | bc)

    if (( $(echo "$perf_time > 2.0" | bc -l) )); then
        log "WARNING" "Performance: Page load time is ${perf_time}s (>2s threshold)"
    elif [[ $VERBOSE == true ]]; then
        log "SUCCESS" "Performance: Page load time is ${perf_time}s"
    fi

    if [[ $failed_endpoints -gt 0 ]]; then
        log "WARNING" "$failed_endpoints endpoint(s) failed for $name"
        return 1
    fi

    log "SUCCESS" "Comprehensive health check passed for $name"
    return 0
}

# Send alert notification
send_alert() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Generic webhook alert
    if [[ -n "$ALERT_WEBHOOK" ]]; then
        curl -s -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"message\": \"VRAM Magic Alert: $message\", \"timestamp\": \"$timestamp\"}" \
            > /dev/null 2>&1
    fi

    # Slack webhook alert
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"🚨 VRAM Magic Alert\\n*Message:* $message\\n*Time:* $timestamp\"}" \
            > /dev/null 2>&1
    fi
}

# Monitor function for continuous checking
monitor_continuously() {
    log "INFO" "Starting continuous monitoring (interval: ${CHECK_INTERVAL}s)"
    log "INFO" "Press Ctrl+C to stop monitoring"

    local check_count=0
    local failure_count=0

    while true; do
        check_count=$((check_count + 1))
        log "INFO" "=== Health Check #$check_count ==="

        local current_failures=0

        if [[ -n "${CUSTOM_URL:-}" ]]; then
            if ! check_application_health "$CUSTOM_URL" "Custom URL"; then
                current_failures=$((current_failures + 1))
            fi
        else
            # Check configured deployments
            for key in "${!DEPLOYMENT_URLS[@]}"; do
                local env_platform=$(echo "$key" | cut -d'-' -f2)
                local platform=$(echo "$key" | cut -d'-' -f1)

                # Filter by environment and platform if specified
                if [[ "$ENVIRONMENT" != "all" && "$env_platform" != "$ENVIRONMENT" ]]; then
                    continue
                fi

                if [[ "${PLATFORM:-all}" != "all" && "$platform" != "${PLATFORM:-all}" ]]; then
                    continue
                fi

                if ! check_application_health "${DEPLOYMENT_URLS[$key]}" "$key"; then
                    current_failures=$((current_failures + 1))
                fi
            done
        fi

        if [[ $current_failures -gt 0 ]]; then
            failure_count=$((failure_count + current_failures))
            log "ERROR" "$current_failures deployment(s) failed health check"
        else
            log "SUCCESS" "All deployments passed health check"
        fi

        log "INFO" "Next check in ${CHECK_INTERVAL}s..."
        sleep "$CHECK_INTERVAL"
    done
}

# Main execution function
main() {
    # Initialize log file
    echo "=== VRAM Magic Health Check Log ===" > "$LOG_FILE"
    echo "Started at: $(date)" >> "$LOG_FILE"

    # Parse arguments
    parse_args "$@"

    # Validate dependencies
    if ! command -v curl &> /dev/null; then
        log "ERROR" "curl is required but not installed"
        exit 1
    fi

    if ! command -v bc &> /dev/null; then
        log "WARNING" "bc is not installed. Performance timing will be simplified"
    fi

    log "INFO" "Starting VRAM Magic health check..."

    if [[ "$CONTINUOUS" == true ]]; then
        monitor_continuously
    else
        # One-time health check
        local failed_checks=0

        if [[ -n "${CUSTOM_URL:-}" ]]; then
            if ! check_application_health "$CUSTOM_URL" "Custom URL"; then
                failed_checks=$((failed_checks + 1))
            fi
        else
            # Check configured deployments
            for key in "${!DEPLOYMENT_URLS[@]}"; do
                local env_platform=$(echo "$key" | cut -d'-' -f2)
                local platform=$(echo "$key" | cut -d'-' -f1)

                # Filter by environment and platform if specified
                if [[ "$ENVIRONMENT" != "all" && "$env_platform" != "$ENVIRONMENT" ]]; then
                    continue
                fi

                if [[ "${PLATFORM:-all}" != "all" && "$platform" != "${PLATFORM:-all}" ]]; then
                    continue
                fi

                if ! check_application_health "${DEPLOYMENT_URLS[$key]}" "$key"; then
                    failed_checks=$((failed_checks + 1))
                fi
            done
        fi

        if [[ $failed_checks -gt 0 ]]; then
            log "ERROR" "$failed_checks deployment(s) failed health check"
            exit 1
        else
            log "SUCCESS" "All health checks passed"
        fi
    fi
}

# Trap for graceful shutdown
trap 'log "INFO" "Health check monitoring stopped"; exit 0' INT TERM

# Run main function with all arguments
main "$@"