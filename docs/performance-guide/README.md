# VRAM Magic Performance Guide

This guide covers performance optimization strategies for the VRAM Magic application, from initial load times to smooth user interactions and efficient VRAM calculations.

## Table of Contents

- [Performance Targets](#performance-targets)
- [Frontend Optimization](#frontend-optimization)
- [VRAM Calculation Performance](#vram-calculation-performance)
- [Bundle Optimization](#bundle-optimization)
- [Runtime Performance](#runtime-performance)
- [Memory Management](#memory-management)
- [Network Optimization](#network-optimization)
- [Monitoring and Profiling](#monitoring-and-profiling)

## Performance Targets

### Core Web Vitals

- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

### Application-Specific Metrics

- **Initial Bundle Size**: < 500KB gzipped
- **Time to Interactive**: < 3s
- **VRAM Calculation**: < 5s for standard simulations
- **Chart Rendering**: < 500ms for 1000 data points
- **Component Updates**: < 16ms (60 FPS)

## Frontend Optimization

### React Performance

#### Component Optimization

Use React.memo for expensive components:

```typescript
interface ExpensiveComponentProps {
  data: LargeDataSet;
  config: ComplexConfig;
}

export const ExpensiveComponent = React.memo<ExpensiveComponentProps>(
  ({ data, config }) => {
    const processedData = useMemo(() => {
      return heavyDataProcessing(data, config);
    }, [data, config]);

    return <div>{/* Expensive rendering */}</div>;
  },
  (prevProps, nextProps) => {
    // Custom comparison for complex props
    return (
      prevProps.data.id === nextProps.data.id &&
      prevProps.config.version === nextProps.config.version
    );
  }
);
```

#### Memoization Strategies

```typescript
// Expensive calculations
const VRAMChart = ({ usagePoints }: { usagePoints: VRAMUsagePoint[] }) => {
  const chartData = useMemo(() => {
    return usagePoints.map(point => ({
      timestamp: new Date(point.timestamp).toLocaleTimeString(),
      total: Math.round(point.totalVRAM),
      base: Math.round(point.breakdown.baseModel),
      kvCache: Math.round(point.breakdown.kvCache),
      activations: Math.round(point.breakdown.activations),
      overhead: Math.round(point.breakdown.overhead)
    }));
  }, [usagePoints]);

  const maxVRAM = useMemo(() => {
    return Math.max(...usagePoints.map(p => p.totalVRAM));
  }, [usagePoints]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={chartData}>
        {/* Chart configuration */}
      </AreaChart>
    </ResponsiveContainer>
  );
};
```

#### Callback Optimization

```typescript
const WorkloadConfigurator = ({ onSlotsChange }: Props) => {
  const [slots, setSlots] = useState<WorkloadSlot[]>(initialSlots);

  // Stable callback reference
  const handleSlotChange = useCallback((index: number, newSlot: WorkloadSlot) => {
    setSlots(prevSlots => {
      const newSlots = [...prevSlots];
      newSlots[index] = newSlot;
      return newSlots;
    });
  }, []);

  // Debounced external callback
  const debouncedOnChange = useMemo(
    () => debounce(onSlotsChange, 300),
    [onSlotsChange]
  );

  useEffect(() => {
    debouncedOnChange(slots);
  }, [slots, debouncedOnChange]);

  return (
    <div>
      {slots.map((slot, index) => (
        <WorkloadSlot
          key={slot.id}
          slot={slot}
          onChange={(newSlot) => handleSlotChange(index, newSlot)}
        />
      ))}
    </div>
  );
};
```

### Lazy Loading Implementation

#### Route-Based Code Splitting

```typescript
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

// Lazy load heavy components
const VRAMChart = lazy(() => import('./components/VRAMChart'));
const ModelSelector = lazy(() => import('./components/ModelSelector'));
const WorkloadConfigurator = lazy(() => import('./components/WorkloadConfigurator'));

const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" p={4}>
    <CircularProgress />
  </Box>
);

export const App = () => (
  <Suspense fallback={<LoadingFallback />}>
    <Routes>
      <Route path="/calculator" element={<VRAMChart />} />
      <Route path="/models" element={<ModelSelector />} />
      <Route path="/workloads" element={<WorkloadConfigurator />} />
    </Routes>
  </Suspense>
);
```

#### Component-Level Lazy Loading

```typescript
// Dynamic import for heavy features
const DynamicChartExport = ({ data }: { data: ChartData }) => {
  const [ExportComponent, setExportComponent] = useState<React.ComponentType | null>(null);

  const loadExportComponent = async () => {
    const { ChartExporter } = await import('./ChartExporter');
    setExportComponent(() => ChartExporter);
  };

  return (
    <div>
      {ExportComponent ? (
        <ExportComponent data={data} />
      ) : (
        <Button onClick={loadExportComponent}>
          Load Export Options
        </Button>
      )}
    </div>
  );
};
```

### Virtual Scrolling

For large datasets in the ModelSelector:

```typescript
import { FixedSizeList as List } from 'react-window';

interface VirtualizedModelListProps {
  models: Model[];
  onModelSelect: (model: Model) => void;
}

const ModelItem = ({ index, style, data }: ListChildComponentProps) => {
  const { models, onModelSelect } = data;
  const model = models[index];

  return (
    <div style={style}>
      <ModelCard
        model={model}
        onClick={() => onModelSelect(model)}
      />
    </div>
  );
};

export const VirtualizedModelList: React.FC<VirtualizedModelListProps> = ({
  models,
  onModelSelect
}) => {
  const itemData = { models, onModelSelect };

  return (
    <List
      height={400}
      itemCount={models.length}
      itemSize={120}
      itemData={itemData}
    >
      {ModelItem}
    </List>
  );
};
```

## VRAM Calculation Performance

### Web Workers for Heavy Calculations

```typescript
// vram-calculator.worker.ts
self.addEventListener('message', event => {
  const { model, workloadSlots, simulationConfig } = event.data

  try {
    const calculator = new VRAMCalculator()
    const results = calculator.simulate(model, workloadSlots, simulationConfig)

    self.postMessage({ success: true, results })
  } catch (error) {
    self.postMessage({ success: false, error: error.message })
  }
})

// Main thread usage
class VRAMCalculationService {
  private worker: Worker

  constructor() {
    this.worker = new Worker('/vram-calculator.worker.js')
  }

  async calculateVRAM(
    model: Model,
    workloadSlots: WorkloadSlot[],
    config: SimulationConfig
  ): Promise<SimulationResults> {
    return new Promise((resolve, reject) => {
      this.worker.postMessage({ model, workloadSlots, config })

      this.worker.onmessage = event => {
        const { success, results, error } = event.data
        if (success) {
          resolve(results)
        } else {
          reject(new Error(error))
        }
      }
    })
  }
}
```

### Incremental Calculation Updates

```typescript
export class IncrementalVRAMCalculator {
  private progressCallback?: (progress: number) => void

  setProgressCallback(callback: (progress: number) => void) {
    this.progressCallback = callback
  }

  async simulateWithProgress(
    model: Model,
    workloadSlots: WorkloadSlot[],
    config: SimulationConfig
  ): Promise<SimulationResults> {
    const totalSteps = config.period.duration
    const usagePoints: VRAMUsagePoint[] = []
    let maxVRAM = 0
    let totalVRAM = 0

    for (let step = 0; step < totalSteps; step++) {
      // Calculate VRAM for this time step
      const timestamp = Date.now() + step * 1000
      const point = this.calculatePointVRAM(model, workloadSlots, timestamp)

      usagePoints.push(point)
      maxVRAM = Math.max(maxVRAM, point.totalVRAM)
      totalVRAM += point.totalVRAM

      // Report progress
      if (this.progressCallback && step % 10 === 0) {
        this.progressCallback((step / totalSteps) * 100)
      }

      // Yield to main thread periodically
      if (step % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    return {
      maxVRAM,
      averageVRAM: totalVRAM / totalSteps,
      usagePoints,
      recommendations: this.generateRecommendations(maxVRAM),
      warnings: this.generateWarnings(maxVRAM),
      calculatedAt: Date.now(),
    }
  }
}
```

### Caching Strategy

```typescript
interface CacheKey {
  modelId: string
  workloadHash: string
  configHash: string
}

class VRAMCalculationCache {
  private cache = new Map<string, SimulationResults>()
  private maxSize = 50

  private generateKey(model: Model, workloads: WorkloadSlot[], config: SimulationConfig): string {
    const workloadHash = this.hashWorkloads(workloads)
    const configHash = this.hashConfig(config)
    return `${model.id}:${workloadHash}:${configHash}`
  }

  get(model: Model, workloads: WorkloadSlot[], config: SimulationConfig): SimulationResults | null {
    const key = this.generateKey(model, workloads, config)
    return this.cache.get(key) || null
  }

  set(
    model: Model,
    workloads: WorkloadSlot[],
    config: SimulationConfig,
    results: SimulationResults
  ) {
    const key = this.generateKey(model, workloads, config)

    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, results)
  }

  private hashWorkloads(workloads: WorkloadSlot[]): string {
    return workloads.map(slot => `${slot.workload?.id || 'empty'}:${slot.percentage}`).join('|')
  }

  private hashConfig(config: SimulationConfig): string {
    return `${config.period.duration}:${config.period.concurrentUsers}:${config.period.requestPattern}`
  }
}
```

## Bundle Optimization

### Webpack/Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material'],
          'chart-vendor': ['recharts', 'd3-scale', 'd3-shape'],

          // Feature chunks
          calculator: ['./src/services/vramCalculator.ts'],
          charts: ['./src/components/VRAMChart'],
          models: ['./src/components/ModelSelector'],
        },
      },
    },
    // Optimization settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
  },
})
```

### Tree Shaking Optimization

```typescript
// Ensure proper tree shaking with named imports
import { Button, TextField } from '@mui/material' // Good
import * as MUI from '@mui/material' // Avoid - imports entire library

// Use specific chart components
import { LineChart, XAxis, YAxis } from 'recharts' // Good
import * as Recharts from 'recharts' // Avoid

// Conditional imports for large features
const loadChartExporter = () => {
  return import('./ChartExporter').then(module => module.ChartExporter)
}
```

### Asset Optimization

```typescript
// Image optimization
const optimizeImages = () => {
  return {
    // Use modern formats
    webp: true,
    avif: true,

    // Responsive images
    sizes: [640, 768, 1024, 1280, 1536],

    // Lazy loading
    loading: 'lazy' as const,
  }
}

// Icon optimization - use Material UI icons instead of custom SVGs
import { Memory, Speed, Category } from '@mui/icons-material'
```

## Runtime Performance

### Debouncing User Input

```typescript
import { debounce } from 'lodash-es';

const SearchableModelSelector = ({ onModelSelect }: Props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);

  // Debounced search to avoid excessive filtering
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      const filtered = models.filter(model =>
        model.name.toLowerCase().includes(term.toLowerCase()) ||
        model.metadata.organization.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredModels(filtered);
    }, 300),
    [models]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  return (
    <TextField
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search models..."
    />
  );
};
```

### Intersection Observer for Lazy Rendering

```typescript
const LazyModelCard = ({ model }: { model: Model }) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={cardRef} style={{ minHeight: 200 }}>
      {isVisible ? (
        <FullModelCard model={model} />
      ) : (
        <SkeletonModelCard />
      )}
    </div>
  );
};
```

### RequestAnimationFrame for Smooth Animations

```typescript
const AnimatedVRAMBar = ({ targetValue }: { targetValue: number }) => {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    let animationId: number;
    const startValue = currentValue;
    const difference = targetValue - startValue;
    const startTime = performance.now();
    const duration = 1000; // 1 second animation

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);

      const newValue = startValue + (difference * easedProgress);
      setCurrentValue(newValue);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [targetValue]);

  return (
    <LinearProgress
      variant="determinate"
      value={(currentValue / 100000) * 100} // Convert to percentage
    />
  );
};
```

## Memory Management

### Component Cleanup

```typescript
const VRAMChart = ({ data }: Props) => {
  const chartRef = useRef<any>(null)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker('/chart-processor.worker.js')

    return () => {
      // Cleanup worker
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    // Cleanup chart resources
    return () => {
      if (chartRef.current) {
        chartRef.current.dispose?.()
      }
    }
  }, [])

  // Rest of component...
}
```

### Memory Leak Prevention

```typescript
const useEventListener = (event: string, handler: EventListener) => {
  const savedHandler = useRef<EventListener>()

  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    const eventListener = (event: Event) => savedHandler.current?.(event)

    window.addEventListener(event, eventListener)

    return () => {
      window.removeEventListener(event, eventListener)
    }
  }, [event])
}

// Usage
const ModelSelector = () => {
  const handleResize = useCallback(() => {
    // Handle window resize
  }, [])

  useEventListener('resize', handleResize)

  // Rest of component...
}
```

### Large Dataset Handling

```typescript
interface PaginatedModelsProps {
  models: Model[];
  pageSize?: number;
}

const PaginatedModels: React.FC<PaginatedModelsProps> = ({
  models,
  pageSize = 20
}) => {
  const [currentPage, setCurrentPage] = useState(0);

  const paginatedModels = useMemo(() => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    return models.slice(start, end);
  }, [models, currentPage, pageSize]);

  // Only render visible models to conserve memory
  return (
    <div>
      {paginatedModels.map(model => (
        <ModelCard key={model.id} model={model} />
      ))}
      <Pagination
        count={Math.ceil(models.length / pageSize)}
        page={currentPage + 1}
        onChange={(_, page) => setCurrentPage(page - 1)}
      />
    </div>
  );
};
```

## Network Optimization

### Model Data Loading

```typescript
class ModelService {
  private cache = new Map<string, Model>()
  private loadingPromises = new Map<string, Promise<Model>>()

  async loadModel(modelId: string): Promise<Model> {
    // Return from cache if available
    if (this.cache.has(modelId)) {
      return this.cache.get(modelId)!
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(modelId)) {
      return this.loadingPromises.get(modelId)!
    }

    // Create new loading promise
    const loadingPromise = fetch(`/models/${modelId}.json`)
      .then(response => response.json())
      .then(model => {
        this.cache.set(modelId, model)
        this.loadingPromises.delete(modelId)
        return model
      })
      .catch(error => {
        this.loadingPromises.delete(modelId)
        throw error
      })

    this.loadingPromises.set(modelId, loadingPromise)
    return loadingPromise
  }

  // Preload popular models
  preloadModels(modelIds: string[]) {
    modelIds.forEach(id => {
      if (!this.cache.has(id) && !this.loadingPromises.has(id)) {
        this.loadModel(id).catch(() => {
          // Ignore preload errors
        })
      }
    })
  }
}
```

### Resource Hints

```html
<!-- In index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://cdn.jsdelivr.net" />

<!-- Preload critical resources -->
<link rel="preload" href="/models/popular-models.json" as="fetch" />
<link rel="prefetch" href="/models/llama-2-7b.json" />
```

### Service Worker for Caching

```typescript
// service-worker.js
const CACHE_NAME = 'vram-magic-v1'
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/models/popular-models.json',
]

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)))
})

self.addEventListener('fetch', event => {
  // Cache model data
  if (event.request.url.includes('/models/')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          return response
        }
        return fetch(event.request).then(response => {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone)
          })
          return response
        })
      })
    )
  }
})
```

## Monitoring and Profiling

### Performance Metrics Collection

```typescript
class PerformanceMonitor {
  private metrics: PerformanceEntry[] = []

  startMeasure(name: string) {
    performance.mark(`${name}-start`)
  }

  endMeasure(name: string) {
    performance.mark(`${name}-end`)
    performance.measure(name, `${name}-start`, `${name}-end`)

    const measure = performance.getEntriesByName(name, 'measure')[0]
    this.metrics.push(measure)

    // Report to analytics
    this.reportMetric(name, measure.duration)
  }

  private reportMetric(name: string, duration: number) {
    // Send to analytics service
    console.log(`Performance metric: ${name} took ${duration}ms`)
  }

  getMetrics() {
    return this.metrics
  }
}

// Usage in components
const VRAMCalculator = () => {
  const monitor = useRef(new PerformanceMonitor())

  const calculateVRAM = async () => {
    monitor.current.startMeasure('vram-calculation')

    try {
      const results = await performCalculation()
      return results
    } finally {
      monitor.current.endMeasure('vram-calculation')
    }
  }
}
```

### React DevTools Profiler

```typescript
import { Profiler } from 'react';

const ProfiledComponent = ({ children }: { children: React.ReactNode }) => {
  const onRender = (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    console.log('Profiler:', {
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime
    });
  };

  return (
    <Profiler id="VRAMCalculator" onRender={onRender}>
      {children}
    </Profiler>
  );
};
```

### Web Vitals Monitoring

```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

const initWebVitals = () => {
  getCLS(console.log)
  getFID(console.log)
  getFCP(console.log)
  getLCP(console.log)
  getTTFB(console.log)
}

// Initialize in main app
useEffect(() => {
  initWebVitals()
}, [])
```

### Performance Testing

```typescript
// performance.test.ts
import { render, waitFor } from '@testing-library/react';
import { VRAMChart } from './VRAMChart';

describe('VRAMChart Performance', () => {
  it('renders 1000 data points within 500ms', async () => {
    const largeDataset = generateDataPoints(1000);
    const startTime = performance.now();

    render(<VRAMChart data={largeDataset} />);

    await waitFor(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(500);
    });
  });

  it('maintains 60fps during chart interactions', async () => {
    const user = userEvent.setup();
    const { container } = render(<VRAMChart data={testData} />);

    const chart = container.querySelector('.recharts-surface');

    const frameRates: number[] = [];
    let lastTime = performance.now();

    const measureFrameRate = () => {
      const currentTime = performance.now();
      const delta = currentTime - lastTime;
      frameRates.push(1000 / delta);
      lastTime = currentTime;

      if (frameRates.length < 60) {
        requestAnimationFrame(measureFrameRate);
      }
    };

    requestAnimationFrame(measureFrameRate);

    // Simulate user interaction
    await user.hover(chart!);

    await waitFor(() => {
      const averageFrameRate = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
      expect(averageFrameRate).toBeGreaterThan(55); // Allow for some variance
    });
  });
});
```

## Performance Checklist

### Development

- [ ] Use React.memo for expensive components
- [ ] Implement proper memoization with useMemo/useCallback
- [ ] Avoid inline object/function creation in render
- [ ] Use lazy loading for heavy components
- [ ] Implement debouncing for user input
- [ ] Optimize re-renders with proper dependency arrays

### Build Optimization

- [ ] Enable tree shaking
- [ ] Implement code splitting
- [ ] Optimize bundle sizes < 500KB gzipped
- [ ] Use modern image formats (WebP, AVIF)
- [ ] Minify and compress assets
- [ ] Implement proper caching headers

### Runtime Performance

- [ ] Monitor Core Web Vitals
- [ ] Implement performance monitoring
- [ ] Use Web Workers for heavy calculations
- [ ] Optimize memory usage and prevent leaks
- [ ] Implement proper error boundaries
- [ ] Use service workers for caching

### Accessibility Performance

- [ ] Ensure screen reader performance
- [ ] Optimize keyboard navigation
- [ ] Implement proper focus management
- [ ] Use ARIA labels efficiently
- [ ] Test with assistive technologies

## Tools and Resources

### Development Tools

- **React DevTools**: Component profiling and optimization
- **Chrome DevTools**: Performance tab and memory analysis
- **Lighthouse**: Performance auditing and recommendations
- **Bundle Analyzer**: Bundle size analysis and optimization

### Monitoring Services

- **Web Vitals**: Core performance metrics
- **Sentry**: Error tracking and performance monitoring
- **LogRocket**: Session replay and performance insights
- **New Relic**: Application performance monitoring

### Testing Tools

- **Vitest**: Unit test performance benchmarks
- **Playwright**: End-to-end performance testing
- **k6**: Load testing for API endpoints
- **WebPageTest**: Real-world performance testing
