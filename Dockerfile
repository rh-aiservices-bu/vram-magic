# VRAM Magic - Production Docker Configuration
# Multi-stage build for optimal production deployment

# Stage 1: Build environment
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Install dependencies with npm ci for reproducible builds
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Remove dev-only files from build context
RUN rm -rf node_modules/.cache \
    && rm -rf .git \
    && rm -rf tests \
    && rm -rf docs \
    && rm -rf .storybook \
    && rm -rf storybook-static

# Set build environment
ENV NODE_ENV=production
ENV VITE_APP_ENV=production
ENV GENERATE_SOURCEMAP=false

# Build the application
RUN npm run build

# Verify build output
RUN ls -la dist/ && \
    find dist -name "*.js" -exec wc -c {} + | sort -n && \
    echo "Build completed successfully"

# Stage 2: Production runtime
FROM nginx:1.25-alpine AS production

# Install security updates
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S vrammagic -u 1001 -G nodejs

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/conf.d/default.conf

# Create nginx cache directories
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Security: Run as non-root user
USER nginx

# Expose port
EXPOSE 80

# Labels for metadata
LABEL maintainer="VRAM Magic Team" \
      version="0.1.0" \
      description="GPU memory calculator for LLM deployments" \
      org.opencontainers.image.source="https://github.com/rh-aiservices-bu/vram-magic" \
      org.opencontainers.image.title="VRAM Magic" \
      org.opencontainers.image.description="React application for calculating GPU memory requirements" \
      org.opencontainers.image.version="0.1.0"

# Start nginx
CMD ["nginx", "-g", "daemon off;"]