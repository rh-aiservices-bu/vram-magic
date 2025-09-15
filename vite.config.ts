import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

export default defineConfig(({ command, mode }) => {
  // Load environment variables with proper precedence
  const env = loadEnv(mode, process.cwd(), '')
  const isDev = command === 'serve'
  const isProd = mode === 'production'

  // Environment-specific configuration
  const envConfig = {
    // Base configuration that applies to all environments
    base: {
      VITE_APP_ENV: mode,
      VITE_APP_VERSION: process.env.npm_package_version || '0.1.0',
      VITE_BUILD_TIME: new Date().toISOString(),
    },
    // Development-specific overrides
    development: {
      VITE_BUILD_ANALYZE: env.VITE_BUILD_ANALYZE === 'true',
      VITE_BUILD_SOURCEMAP: 'true',
      VITE_DEV_HMR: env.VITE_DEV_HMR !== 'false',
      VITE_DEV_OVERLAY: env.VITE_DEV_OVERLAY !== 'false',
    },
    // Production-specific overrides
    production: {
      VITE_BUILD_ANALYZE: env.VITE_BUILD_ANALYZE === 'true',
      VITE_BUILD_SOURCEMAP: 'false',
      VITE_BUILD_MINIFY: 'true',
    },
    // Test-specific overrides
    test: {
      VITE_USE_MOCK_DATA: 'true',
      VITE_TEST_TIMEOUT: env.VITE_TEST_TIMEOUT || '30000',
    },
  }

  // Merge environment configuration
  const finalEnv = {
    ...envConfig.base,
    ...(envConfig[mode] || {}),
    ...env, // User-provided environment variables take precedence
  }

  return {
    define: {
      // Environment variable handling for client-side
      __APP_VERSION__: JSON.stringify(finalEnv.VITE_APP_VERSION),
      __BUILD_TIME__: JSON.stringify(finalEnv.VITE_BUILD_TIME),
      __APP_ENV__: JSON.stringify(finalEnv.VITE_APP_ENV),

      // Feature flags
      __FEATURE_DARK_MODE__: JSON.stringify(finalEnv.VITE_FEATURE_DARK_MODE === 'true'),
      __FEATURE_ACCESSIBILITY__: JSON.stringify(finalEnv.VITE_FEATURE_ACCESSIBILITY !== 'false'),
      __FEATURE_EXPORT__: JSON.stringify(finalEnv.VITE_FEATURE_EXPORT !== 'false'),
      __FEATURE_DEBUG_MODE__: JSON.stringify(finalEnv.VITE_FEATURE_DEBUG_MODE === 'true'),
      __FEATURE_PERFORMANCE_MONITORING__: JSON.stringify(
        finalEnv.VITE_FEATURE_PERFORMANCE_MONITORING === 'true'
      ),

      // API configuration
      __API_BASE_URL__: JSON.stringify(finalEnv.VITE_API_BASE_URL || '/api'),
      __MODELS_BASE_URL__: JSON.stringify(finalEnv.VITE_MODELS_BASE_URL || '/models'),

      // Build configuration
      __BUILD_ANALYZE__: JSON.stringify(finalEnv.VITE_BUILD_ANALYZE === 'true'),
    },

    plugins: [
      react({
        // React optimizations for production
        jsxRuntime: 'automatic',
        jsxImportSource: '@emotion/react',
        babel: isProd
          ? {
              compact: true,
              minified: true,
              comments: false,
            }
          : undefined,
      }),

      // Compression plugins for production
      ...(isProd
        ? [
            // Gzip compression
            viteCompression({
              algorithm: 'gzip',
              ext: '.gz',
              threshold: 1024,
              deleteOriginFile: false,
            }),

            // Brotli compression (better compression than gzip)
            viteCompression({
              algorithm: 'brotliCompress',
              ext: '.br',
              threshold: 1024,
              deleteOriginFile: false,
            }),
          ]
        : []),

      // Bundle visualizer for detailed analysis (when enabled)
      finalEnv.VITE_BUILD_ANALYZE === 'true' &&
        visualizer({
          filename: 'dist/stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
          template: 'treemap', // sunburst, treemap, network
        }),
    ].filter(Boolean),

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@/components': resolve(__dirname, 'src/components'),
        '@/services': resolve(__dirname, 'src/services'),
        '@/types': resolve(__dirname, 'src/types'),
        '@/utils': resolve(__dirname, 'src/utils'),
        '@/hooks': resolve(__dirname, 'src/hooks'),
        '@/contexts': resolve(__dirname, 'src/contexts'),
        '@/data': resolve(__dirname, 'src/data'),
        '@/theme': resolve(__dirname, 'src/theme'),
      },
    },

    build: {
      target: 'es2020',
      sourcemap: finalEnv.VITE_BUILD_SOURCEMAP === 'true' ? true : isProd ? 'hidden' : true,
      minify: finalEnv.VITE_BUILD_MINIFY === 'true' || isProd ? 'terser' : false,
      cssMinify: isProd,

      // Terser options for better minification
      terserOptions: isProd
        ? {
            compress: {
              drop_console: true, // Remove console.log in production
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.info', 'console.debug'],
              passes: 2,
            },
            mangle: {
              safari10: true,
            },
            format: {
              safari10: true,
            },
          }
        : {},

      rollupOptions: {
        // External dependencies that shouldn't be bundled
        external: [],

        output: {
          // More granular code splitting
          manualChunks: id => {
            // Vendor chunk for core React ecosystem
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react'
              }

              // Material UI chunk (large library)
              if (id.includes('@mui') || id.includes('@emotion')) {
                return 'vendor-mui'
              }

              // Charts chunk
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'vendor-charts'
              }

              // DnD chunk
              if (id.includes('react-dnd')) {
                return 'vendor-dnd'
              }

              // Validation and utilities
              if (id.includes('zod') || id.includes('ajv')) {
                return 'vendor-validation'
              }

              // All other node_modules
              return 'vendor-misc'
            }

            // Application code splitting
            if (id.includes('/src/components/')) {
              return 'components'
            }

            if (id.includes('/src/services/')) {
              return 'services'
            }

            if (id.includes('/src/contexts/')) {
              return 'contexts'
            }

            // Default chunk
            return 'index'
          },

          // Optimize chunk file names
          chunkFileNames: chunkInfo => {
            const name = chunkInfo.name || 'chunk'

            // Add hash for cache busting but keep readable names in dev
            return isDev ? `${name}.js` : `${name}-[hash].js`
          },

          assetFileNames: assetInfo => {
            const info = assetInfo.name.split('.')
            const ext = info[info.length - 1]

            // Organize assets by type
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
              return `fonts/[name]-[hash][extname]`
            }

            if (/\.(png|jpe?g|gif|svg|ico|webp)$/i.test(assetInfo.name)) {
              return `images/[name]-[hash][extname]`
            }

            if (ext === 'css') {
              return `styles/[name]-[hash][extname]`
            }

            return `assets/[name]-[hash][extname]`
          },

          // Optimize output configuration
          compact: isProd,

          // Modern module preloading
          hoistTransitiveImports: true,

          // Enable advanced optimizations
          generatedCode: 'es2015',
        },
      },

      // Chunk size warnings (target < 500KB per chunk)
      chunkSizeWarningLimit: 500,

      // Asset inlining threshold (4KB default is good)
      assetsInlineLimit: 4096,

      // Enable CSS code splitting
      cssCodeSplit: true,

      // Report compressed size
      reportCompressedSize: true,
    },

    // Optimization settings
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@mui/material',
        '@emotion/react',
        '@emotion/styled',
        'recharts',
        'zod',
        'react-dnd',
        'react-dnd-html5-backend',
      ],
      exclude: ['@vitejs/plugin-react'],
    },

    server: {
      port: parseInt(finalEnv.VITE_DEV_PORT) || 3000,
      host: finalEnv.VITE_DEV_HOST || 'localhost',
      open: finalEnv.VITE_DEV_OPEN !== 'false',
      // Enable compression in dev mode
      compression: isDev,
      // HMR configuration
      hmr: finalEnv.VITE_DEV_HMR !== 'false',
      // Headers for better caching in dev
      headers: isDev
        ? {
            'Cache-Control': 'no-cache',
          }
        : {},
    },

    preview: {
      port: 4173,
      // Production preview with compression
      headers: {
        'Cache-Control': 'public, max-age=31536000',
      },
    },

    // Environment-specific configurations
    esbuild: {
      // Remove console and debugger in production
      drop: isProd ? ['console', 'debugger'] : [],
      // Legal comments handling
      legalComments: isProd ? 'none' : 'inline',
    },

    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
