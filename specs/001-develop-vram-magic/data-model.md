# VRAM Magic: Data Model Design

## Core Entities

### Model

Represents an LLM with complete specifications for VRAM calculations.

```typescript
interface Model {
  id: string;                    // Unique identifier (e.g., "llama-2-7b")
  name: string;                  // Display name (e.g., "Llama 2 7B")
  description: string;           // Brief description
  parameters: number;            // Total parameters (e.g., 7_000_000_000)
  precision: ModelPrecision;     // Data type precision
  architecture: ModelArchitecture;
  vramRequirements: VRAMRequirements;
  performance: PerformanceMetrics[];
  metadata: ModelMetadata;
}

enum ModelPrecision {
  FP32 = "fp32",      // 4 bytes per parameter
  FP16 = "fp16",      // 2 bytes per parameter
  INT8 = "int8",      // 1 byte per parameter
  INT4 = "int4"       // 0.5 bytes per parameter
}

interface ModelArchitecture {
  layers: number;               // Number of transformer layers
  hiddenSize: number;          // Hidden dimension size
  attentionHeads: number;      // Number of attention heads
  vocabularySize: number;      // Token vocabulary size
  maxSequenceLength: number;   // Maximum supported sequence length
}

interface VRAMRequirements {
  baseVRAM: number;           // Base model memory in MB
  kvCacheCoefficient: number; // KV-cache scaling factor
  activationMultiplier: number; // Activation memory multiplier
  overheadFactor: number;     // Additional overhead (typically 1.1-1.2)
}

interface PerformanceMetrics {
  gpuType: string;            // GPU model (e.g., "RTX 4090", "A100")
  tokensPerSecond: number;    // Inference speed
  batchSize: number;          // Optimal batch size
  powerConsumption: number;   // Watts during inference
}

interface ModelMetadata {
  releaseDate: string;        // ISO date string
  organization: string;       // Model creator
  license: string;           // Usage license
  tags: string[];            // Categorization tags
  benchmarks?: BenchmarkScore[];
}

interface BenchmarkScore {
  name: string;              // Benchmark name (e.g., "MMLU", "HellaSwag")
  score: number;             // Performance score
  unit: string;              // Score unit (e.g., "accuracy", "perplexity")
}
```

### Workload

Defines query characteristics for VRAM calculation.

```typescript
interface Workload {
  id: string;                 // Unique identifier
  name: string;               // Display name (e.g., "Chat", "RAG")
  description: string;        // User-friendly description
  inputTokens: number;        // Average input length
  outputTokens: number;       // Average output length
  category: WorkloadCategory;
  icon?: string;              // Icon name for UI
  examples: string[];         // Example use cases
}

enum WorkloadCategory {
  CHAT = "chat",
  RAG = "rag",
  CODING = "coding",
  CREATIVE = "creative",
  ANALYSIS = "analysis",
  CUSTOM = "custom"
}
```

### WorkloadSlot

UI configuration linking workload to percentage allocation.

```typescript
interface WorkloadSlot {
  id: string;                 // Unique slot identifier
  workload: Workload | null;  // Assigned workload (null if empty)
  percentage: number;         // Percentage allocation (0-100)
  isActive: boolean;          // Whether slot is in use
  order: number;              // Display order (1-5)
}

// Validation rules
const WORKLOAD_SLOT_CONSTRAINTS = {
  MAX_SLOTS: 5,
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
  TOTAL_PERCENTAGE: 100
} as const;
```

### Profile

Predefined workload configurations for common scenarios.

```typescript
interface Profile {
  id: string;                 // Unique identifier
  name: string;               // Profile name (e.g., "Customer Support")
  description: string;        // Use case description
  workloadDistribution: WorkloadDistribution[];
  isBuiltIn: boolean;         // System vs user-created
  tags: string[];             // Categorization
}

interface WorkloadDistribution {
  workloadId: string;         // Reference to Workload.id
  percentage: number;         // Allocation percentage
}

// Built-in profiles
const BUILT_IN_PROFILES: Profile[] = [
  {
    id: "customer-support",
    name: "Customer Support",
    description: "Balanced chat and knowledge base queries",
    workloadDistribution: [
      { workloadId: "chat-short", percentage: 60 },
      { workloadId: "rag-medium", percentage: 30 },
      { workloadId: "analysis-basic", percentage: 10 }
    ],
    isBuiltIn: true,
    tags: ["support", "business"]
  }
  // ... additional profiles
];
```

### SimulationPeriod

Configuration for time-based VRAM simulation.

```typescript
interface SimulationPeriod {
  duration: number;           // Simulation duration in seconds
  timeUnit: TimeUnit;         // Duration unit for display
  concurrentUsers: number;    // Number of simultaneous users
  requestPattern: RequestPattern;
  granularity: number;        // Calculation interval in seconds
}

enum TimeUnit {
  SECONDS = "seconds",
  MINUTES = "minutes",
  HOURS = "hours",
  DAYS = "days"
}

enum RequestPattern {
  UNIFORM = "uniform",        // Even distribution
  FRONT_LOADED = "front_loaded", // Most requests early
  BACK_LOADED = "back_loaded",   // Most requests late
  BELL_CURVE = "bell_curve"      // Normal distribution
}

// Validation constraints
const SIMULATION_CONSTRAINTS = {
  MIN_DURATION: 1,           // 1 second minimum
  MAX_DURATION: 86400,       // 24 hours maximum
  MIN_USERS: 1,
  MAX_USERS: 10000,
  MIN_GRANULARITY: 1,        // 1 second intervals
  MAX_GRANULARITY: 3600      // 1 hour intervals
} as const;
```

### VRAMUsagePoint

Time-stamped VRAM consumption data for visualization.

```typescript
interface VRAMUsagePoint {
  timestamp: number;          // Unix timestamp in seconds
  totalVRAM: number;         // Total VRAM usage in MB
  breakdown: VRAMBreakdown;   // Detailed breakdown by source
  activeRequests: ActiveRequest[];
}

interface VRAMBreakdown {
  baseModel: number;          // Static model memory
  kvCache: number;           // KV-cache memory
  activations: number;       // Activation memory
  overhead: number;          // System overhead
  workloadBreakdown: WorkloadVRAM[];
}

interface WorkloadVRAM {
  workloadId: string;        // Reference to workload
  vramUsage: number;         // VRAM used by this workload type
  requestCount: number;      // Number of active requests
  color: string;             // Display color for charts
}

interface ActiveRequest {
  requestId: string;         // Unique request identifier
  workloadId: string;        // Associated workload
  startTime: number;         // Request start timestamp
  estimatedEndTime: number;  // Estimated completion time
  vramConsumption: number;   // Memory used by this request
}
```

## Derived Types

### Application State

Complete application state structure for Context API.

```typescript
interface AppState {
  models: Model[];                    // Available models
  selectedModel: Model | null;        // Currently selected model
  workloads: Workload[];             // Available workload types
  profiles: Profile[];               // Available profiles
  workloadSlots: WorkloadSlot[];     // Current workload configuration
  simulation: SimulationConfig;      // Simulation parameters
  results: SimulationResults | null; // Calculation results
  ui: UIState;                       // UI state and preferences
}

interface SimulationConfig {
  period: SimulationPeriod;
  isValid: boolean;                  // Configuration validation status
  errors: ValidationError[];         // Validation error details
}

interface SimulationResults {
  maxVRAM: number;                   // Peak VRAM requirement
  averageVRAM: number;               // Average VRAM usage
  usagePoints: VRAMUsagePoint[];     // Time-series data
  recommendations: string[];         // GPU sizing recommendations
  warnings: string[];                // Performance warnings
  calculatedAt: number;              // Timestamp of calculation
}

interface UIState {
  loading: boolean;
  error: string | null;
  notifications: Notification[];
  preferences: UserPreferences;
}

interface UserPreferences {
  theme: "light" | "dark" | "auto";
  chartType: "area" | "bar";
  showTooltips: boolean;
  animationsEnabled: boolean;
  accessibilityMode: boolean;
}

interface ValidationError {
  field: string;                     // Field name with error
  message: string;                   // User-friendly error message
  severity: "error" | "warning";
}

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  timestamp: number;
  autoClose?: boolean;
}
```

## Calculation Formulas

### VRAM Calculation Engine

Core algorithms for memory estimation.

```typescript
interface VRAMCalculator {
  calculateBaseMemory(model: Model): number;
  calculateKVCache(model: Model, sequenceLength: number, batchSize: number): number;
  calculateActivations(model: Model, sequenceLength: number, batchSize: number): number;
  calculateOverhead(baseMemory: number, additionalMemory: number): number;
  simulateUsageOverTime(
    model: Model,
    workloadSlots: WorkloadSlot[],
    period: SimulationPeriod
  ): VRAMUsagePoint[];
}

// Implementation formulas (from research.md)
const VRAMFormulas = {
  baseMemory: (parameters: number, precision: ModelPrecision, overhead: number = 1.2) => {
    const bytesPerParam = getPrecisionBytes(precision);
    return parameters * bytesPerParam * overhead / (1024 * 1024); // Convert to MB
  },

  kvCache: (layers: number, hiddenSize: number, seqLen: number, batchSize: number, precision: ModelPrecision) => {
    const bytesPerParam = getPrecisionBytes(precision);
    return 2 * layers * hiddenSize * seqLen * batchSize * bytesPerParam / (1024 * 1024);
  },

  activations: (hiddenSize: number, seqLen: number, batchSize: number, precision: ModelPrecision) => {
    const bytesPerParam = getPrecisionBytes(precision);
    return hiddenSize * seqLen * batchSize * bytesPerParam * 4 / (1024 * 1024);
  }
};

function getPrecisionBytes(precision: ModelPrecision): number {
  switch (precision) {
    case ModelPrecision.FP32: return 4;
    case ModelPrecision.FP16: return 2;
    case ModelPrecision.INT8: return 1;
    case ModelPrecision.INT4: return 0.5;
  }
}
```

## Validation Rules

### Data Validation Schemas

Type-safe validation using Zod.

```typescript
import { z } from 'zod';

const ModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  parameters: z.number().positive(),
  precision: z.nativeEnum(ModelPrecision),
  architecture: z.object({
    layers: z.number().positive(),
    hiddenSize: z.number().positive(),
    attentionHeads: z.number().positive(),
    vocabularySize: z.number().positive(),
    maxSequenceLength: z.number().positive()
  }),
  vramRequirements: z.object({
    baseVRAM: z.number().positive(),
    kvCacheCoefficient: z.number().positive(),
    activationMultiplier: z.number().positive(),
    overheadFactor: z.number().min(1).max(2)
  }),
  performance: z.array(z.object({
    gpuType: z.string(),
    tokensPerSecond: z.number().positive(),
    batchSize: z.number().positive(),
    powerConsumption: z.number().positive()
  })),
  metadata: z.object({
    releaseDate: z.string().datetime(),
    organization: z.string(),
    license: z.string(),
    tags: z.array(z.string())
  })
});

const WorkloadSlotSchema = z.object({
  id: z.string(),
  workload: z.nullable(z.object({
    id: z.string(),
    name: z.string(),
    inputTokens: z.number().min(1),
    outputTokens: z.number().min(1)
  })),
  percentage: z.number().min(0).max(100),
  isActive: z.boolean(),
  order: z.number().min(1).max(5)
});

// Custom validation for workload slots
const validateWorkloadSlots = (slots: WorkloadSlot[]): ValidationError[] => {
  const errors: ValidationError[] = [];
  const activeSlots = slots.filter(slot => slot.isActive && slot.workload);
  const totalPercentage = activeSlots.reduce((sum, slot) => sum + slot.percentage, 0);
  
  if (totalPercentage !== 100 && activeSlots.length > 0) {
    errors.push({
      field: "workloadSlots",
      message: `Workload percentages must sum to 100% (currently ${totalPercentage}%)`,
      severity: "error"
    });
  }
  
  if (activeSlots.length === 0) {
    errors.push({
      field: "workloadSlots",
      message: "At least one workload must be configured",
      severity: "error"
    });
  }
  
  return errors;
};
```

## Relationships and Dependencies

### Entity Relationships

```text
Model (1) ←→ (1) SimulationConfig
WorkloadSlot (n) ←→ (1) Workload
Profile (1) ←→ (n) WorkloadDistribution
SimulationConfig (1) ←→ (n) VRAMUsagePoint
VRAMUsagePoint (1) ←→ (n) ActiveRequest
```

### Data Flow

1. **User selects Model** → Updates SimulationConfig
2. **User configures WorkloadSlots** → Validates percentage sum
3. **User sets SimulationPeriod** → Enables calculation
4. **System calculates VRAM** → Generates VRAMUsagePoints
5. **System renders charts** → Displays time-series visualization

---

## Implementation Notes

### Performance Considerations

- **Model loading**: Lazy load model details on selection
- **Calculation caching**: Memoize results for identical configurations
- **Chart rendering**: Debounce updates during parameter changes
- **Memory optimization**: Limit VRAMUsagePoint array size for long simulations

### Accessibility

- **Screen readers**: Comprehensive ARIA labels for all entities
- **Keyboard navigation**: Full keyboard access to all configurations
- **Color accessibility**: High contrast mode support
- **Text alternatives**: Data tables as fallback for charts

### Extensibility

- **New model types**: Interface-based design allows easy model additions
- **Custom workloads**: User-defined workload creation
- **Additional metrics**: Framework for new calculation parameters
- **Export formats**: Plugin architecture for result export

This data model provides a comprehensive, type-safe foundation for the VRAM Magic application while maintaining performance and accessibility requirements.
