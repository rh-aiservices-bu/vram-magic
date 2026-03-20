# VRAM Magic - Production Docker Configuration
# Multi-stage build, OpenShift compatible (random UID, GID 0)

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
    autoconf \
    automake \
    libtool \
    nasm \
    zlib-dev \
    libpng-dev \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Install dependencies with npm ci for reproducible builds
RUN npm ci

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

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/conf.d/default.conf

# OpenShift compatibility: make directories writable by GID 0 (root group)
# OpenShift runs with a random UID but always GID 0
RUN chgrp -R 0 /usr/share/nginx/html /etc/nginx/conf.d /var/cache/nginx /var/log/nginx && \
    chmod -R g=u /usr/share/nginx/html /etc/nginx/conf.d /var/cache/nginx /var/log/nginx

# Expose unprivileged port
EXPOSE 8080

# Labels for metadata
LABEL maintainer="VRAM Magic Team" \
      version="0.1.0" \
      description="GPU memory calculator for LLM deployments" \
      org.opencontainers.image.source="https://github.com/rh-aiservices-bu/vram-magic" \
      org.opencontainers.image.title="VRAM Magic" \
      org.opencontainers.image.description="React application for calculating GPU memory requirements" \
      org.opencontainers.image.version="0.1.0"

# Run as non-root (OpenShift will override UID but keep GID 0)
USER 1001

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
