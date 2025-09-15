#!/bin/bash

# VRAM Magic - Build Validation Script
# Validates that production build meets optimization targets

set -e

echo "🚀 VRAM Magic - Build Validation"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Targets
MAX_TOTAL_SIZE_KB=1024  # 1MB target
WARN_TOTAL_SIZE_KB=500  # Warning threshold
MAX_CHUNK_SIZE_KB=500   # Individual chunk limit

# Build the project
echo "📦 Building production bundle..."
npm run build > /dev/null 2>&1

# Calculate sizes
echo "📊 Analyzing bundle sizes..."

# Get total gzipped size (excluding stats.html)
TOTAL_SIZE_KB=$(find dist -name "*.gz" -not -name "stats.html.gz" | xargs du -c 2>/dev/null | tail -1 | awk '{print $1}')
JS_SIZE_KB=$(find dist -name "*.js.gz" -not -name "stats.html.gz" | xargs du -c 2>/dev/null | tail -1 | awk '{print $1}')

# Get largest chunk size
LARGEST_CHUNK_KB=$(find dist -name "*.js" -not -path "*/assets/*.map" | xargs ls -l | awk '{print $5}' | sort -n | tail -1)
LARGEST_CHUNK_KB=$((LARGEST_CHUNK_KB / 1024))

echo ""
echo "📈 Bundle Analysis Results:"
echo "-------------------------"
echo "Total bundle size (gzipped): ${TOTAL_SIZE_KB}KB"
echo "JavaScript bundles (gzipped): ${JS_SIZE_KB}KB"
echo "Largest individual chunk: ${LARGEST_CHUNK_KB}KB"
echo ""

# Validation checks
VALIDATION_PASSED=true

# Check total size
if [ "$TOTAL_SIZE_KB" -gt "$MAX_TOTAL_SIZE_KB" ]; then
    echo -e "${RED}❌ FAIL: Total bundle size (${TOTAL_SIZE_KB}KB) exceeds maximum (${MAX_TOTAL_SIZE_KB}KB)${NC}"
    VALIDATION_PASSED=false
elif [ "$TOTAL_SIZE_KB" -gt "$WARN_TOTAL_SIZE_KB" ]; then
    echo -e "${YELLOW}⚠️  WARN: Total bundle size (${TOTAL_SIZE_KB}KB) exceeds warning threshold (${WARN_TOTAL_SIZE_KB}KB)${NC}"
else
    echo -e "${GREEN}✅ PASS: Total bundle size (${TOTAL_SIZE_KB}KB) is within target${NC}"
fi

# Check largest chunk
if [ "$LARGEST_CHUNK_KB" -gt "$MAX_CHUNK_SIZE_KB" ]; then
    echo -e "${RED}❌ FAIL: Largest chunk (${LARGEST_CHUNK_KB}KB) exceeds maximum (${MAX_CHUNK_SIZE_KB}KB)${NC}"
    VALIDATION_PASSED=false
else
    echo -e "${GREEN}✅ PASS: Largest chunk (${LARGEST_CHUNK_KB}KB) is within limit${NC}"
fi

# Check for gzip compression
GZIP_FILES=$(find dist -name "*.gz" | wc -l)
if [ "$GZIP_FILES" -gt 0 ]; then
    echo -e "${GREEN}✅ PASS: Gzip compression enabled (${GZIP_FILES} compressed files)${NC}"
else
    echo -e "${RED}❌ FAIL: No gzip compressed files found${NC}"
    VALIDATION_PASSED=false
fi

# Check for brotli compression
BROTLI_FILES=$(find dist -name "*.br" | wc -l)
if [ "$BROTLI_FILES" -gt 0 ]; then
    echo -e "${GREEN}✅ PASS: Brotli compression enabled (${BROTLI_FILES} compressed files)${NC}"
else
    echo -e "${YELLOW}⚠️  WARN: No brotli compressed files found${NC}"
fi

# Check for code splitting
CHUNK_COUNT=$(find dist -name "*.js" -not -path "*/assets/*.map" | wc -l)
if [ "$CHUNK_COUNT" -ge 5 ]; then
    echo -e "${GREEN}✅ PASS: Code splitting implemented (${CHUNK_COUNT} chunks)${NC}"
else
    echo -e "${YELLOW}⚠️  WARN: Limited code splitting (${CHUNK_COUNT} chunks)${NC}"
fi

# Check for bundle analysis
if [ -f "dist/stats.html" ]; then
    echo -e "${GREEN}✅ PASS: Bundle visualization available${NC}"
else
    echo -e "${YELLOW}⚠️  WARN: Bundle visualization not generated${NC}"
fi

echo ""
echo "🎯 Optimization Targets:"
echo "----------------------"
echo "Bundle size target: <${MAX_TOTAL_SIZE_KB}KB (Target: ${TOTAL_SIZE_KB}/${MAX_TOTAL_SIZE_KB}KB)"
echo "Compression ratio: ~$(echo "scale=1; (${JS_SIZE_KB} * 100) / ${TOTAL_SIZE_KB}" | bc -l)% of total"
echo ""

# Performance recommendations
echo "💡 Performance Recommendations:"
echo "------------------------------"
echo "• Enable gzip/brotli compression on your web server"
echo "• Set long cache headers for hashed assets"
echo "• Use HTTP/2 server push for critical chunks"
echo "• Monitor bundle size in CI/CD pipeline"
echo "• Run lighthouse audits regularly"

echo ""
if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}🎉 All validation checks passed!${NC}"
    echo "Bundle is optimized and ready for production deployment."
    exit 0
else
    echo -e "${RED}💥 Some validation checks failed!${NC}"
    echo "Please review the issues above before deploying."
    exit 1
fi