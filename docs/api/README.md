# VRAM Magic API Documentation

This document provides comprehensive API documentation for VRAM Magic components, services, and utilities.

## Table of Contents

- [Component APIs](#component-apis)
- [Service APIs](#service-apis)
- [Hook APIs](#hook-apis)
- [Type Definitions](#type-definitions)
- [Utility Functions](#utility-functions)
- [Context APIs](#context-apis)

## Component APIs

### ModelSelector

**Import:** `import { ModelSelector } from '@/components/ModelSelector'`

#### Props

```typescript
interface ModelSelectorProps {
  models: Model[]
  selectedModel: Model | null
  onModelSelect: (model: Model) => void
  disabled?: boolean
  error?: string
}
```

| Prop            | Type                     | Required | Description                     |
| --------------- | ------------------------ | -------- | ------------------------------- |
| `models`        | `Model[]`                | Yes      | Array of available models       |
| `selectedModel` | `Model \| null`          | Yes      | Currently selected model        |
| `onModelSelect` | `(model: Model) => void` | Yes      | Callback when model is selected |
| `disabled`      | `boolean`                | No       | Disable the selector            |
| `error`         | `string`                 | No       | Error message to display        |

#### Example Usage

```typescript
const [selectedModel, setSelectedModel] = useState<Model | null>(null);

<ModelSelector
  models={availableModels}
  selectedModel={selectedModel}
  onModelSelect={setSelectedModel}
  disabled={isLoading}
  error={loadError}
/>
```

### WorkloadConfigurator

**Import:** `import { WorkloadConfigurator } from '@/components/WorkloadConfigurator'`

#### Props

```typescript
interface WorkloadConfiguratorProps {
  workloads: Workload[]
  workloadSlots: WorkloadSlot[]
  onSlotsChange: (slots: WorkloadSlot[]) => void
  onProfileSelect: (profile: Profile) => void
  profiles: Profile[]
  disabled?: boolean
  errors: ValidationError[]
}
```

#### Example Usage

```typescript
const [workloadSlots, setWorkloadSlots] = useState<WorkloadSlot[]>(initialSlots);

<WorkloadConfigurator
  workloads={availableWorkloads}
  workloadSlots={workloadSlots}
  onSlotsChange={setWorkloadSlots}
  onProfileSelect={(profile) => setWorkloadSlots(profile.workloadSlots)}
  profiles={savedProfiles}
  errors={validationErrors}
/>
```

### PercentageSlider

**Import:** `import { PercentageSlider } from '@/components/PercentageSlider'`

#### Props

```typescript
interface PercentageSliderProps {
  value: number
  onChange: (value: number) => void
  remaining: number
  label: string
  disabled?: boolean
  error?: string
}
```

#### Example Usage

```typescript
<PercentageSlider
  value={percentage}
  onChange={setPercentage}
  remaining={remainingPercentage}
  label="Chat Workload"
  error={percentage > remainingPercentage ? 'Exceeds remaining' : undefined}
/>
```

### SimulationControls

**Import:** `import { SimulationControls } from '@/components/SimulationControls'`

#### Props

```typescript
interface SimulationControlsProps {
  config: SimulationConfig
  onChange: (config: SimulationConfig) => void
  onCalculate: () => void
  isCalculating: boolean
  disabled?: boolean
}
```

#### Example Usage

```typescript
<SimulationControls
  config={simulationConfig}
  onChange={setSimulationConfig}
  onCalculate={runCalculation}
  isCalculating={isCalculating}
  disabled={!isConfigValid}
/>
```

### VRAMChart

**Import:** `import { VRAMChart } from '@/components/VRAMChart'`

#### Props

```typescript
interface VRAMChartProps {
  data: VRAMUsagePoint[]
  maxVRAM: number
  chartType: 'area' | 'bar'
  showTooltips: boolean
  height?: number
  onPointClick?: (point: VRAMUsagePoint) => void
}
```

#### Example Usage

```typescript
<VRAMChart
  data={usagePoints}
  maxVRAM={results.maxVRAM}
  chartType="area"
  showTooltips={true}
  height={400}
  onPointClick={(point) => console.log('Clicked:', point)}
/>
```

### ResultsSummary

**Import:** `import { ResultsSummary } from '@/components/ResultsSummary'`

#### Props

```typescript
interface ResultsSummaryProps {
  results: SimulationResults | null
  model: Model | null
  onExport?: (format: 'json' | 'csv' | 'png') => void
  loading?: boolean
}
```

#### Example Usage

```typescript
<ResultsSummary
  results={simulationResults}
  model={selectedModel}
  onExport={handleExport}
  loading={isCalculating}
/>
```

## Service APIs

### VRAMCalculator

**Import:** `import { VRAMCalculator } from '@/services/vramCalculator'`

#### Methods

```typescript
class VRAMCalculator {
  calculateModelMemory(parameters: number, precision: ModelPrecision): number
  calculateKVCache(config: KVCacheConfig): number
  calculateActivations(config: ActivationConfig): number
  calculateOverhead(baseMemory: number, kvCache: number): number
  calculateTotalVRAM(model: Model, workloads: WorkloadSlot[], config: SimulationConfig): number
  simulate(
    model: Model,
    workloads: WorkloadSlot[],
    config: SimulationConfig
  ): Promise<SimulationResults>
}
```

#### Example Usage

```typescript
const calculator = new VRAMCalculator()

// Calculate individual components
const modelMemory = calculator.calculateModelMemory(7000000000, 'fp16')
const kvCache = calculator.calculateKVCache({
  layers: 32,
  hiddenSize: 4096,
  sequenceLength: 2048,
  batchSize: 1,
  precisionBytes: 2,
})

// Run full simulation
const results = await calculator.simulate(model, workloadSlots, config)
```

### ModelService

**Import:** `import { ModelService } from '@/services/modelService'`

#### Methods

```typescript
class ModelService {
  loadModel(modelId: string): Promise<Model>
  loadModels(modelIds: string[]): Promise<Model[]>
  validateModel(model: unknown): model is Model
  searchModels(query: string, models: Model[]): Model[]
  filterByPrecision(models: Model[], precision: ModelPrecision): Model[]
  sortByParameters(models: Model[], ascending?: boolean): Model[]
}
```

#### Example Usage

```typescript
const modelService = new ModelService()

// Load single model
const model = await modelService.loadModel('llama-2-7b')

// Search and filter
const searchResults = modelService.searchModels('llama', allModels)
const fp16Models = modelService.filterByPrecision(allModels, 'fp16')
```

### ChartUtils

**Import:** `import { ChartUtils } from '@/services/chartUtils'`

#### Methods

```typescript
class ChartUtils {
  formatVRAMData(points: VRAMUsagePoint[]): ChartDataPoint[]
  generateChartConfig(type: 'area' | 'bar'): ChartConfig
  exportToCSV(data: VRAMUsagePoint[]): string
  exportToPNG(chartElement: HTMLElement): Promise<Blob>
  calculateYAxisDomain(data: VRAMUsagePoint[]): [number, number]
}
```

## Hook APIs

### useVRAMCalculation

**Import:** `import { useVRAMCalculation } from '@/hooks/useVRAMCalculation'`

```typescript
interface UseVRAMCalculationReturn {
  results: SimulationResults | null
  isCalculating: boolean
  error: string | null
  calculate: (config: SimulationConfig) => Promise<void>
  clearResults: () => void
}

function useVRAMCalculation(
  model: Model | null,
  workloadSlots: WorkloadSlot[]
): UseVRAMCalculationReturn
```

#### Example Usage

```typescript
const { results, isCalculating, calculate, error } = useVRAMCalculation(
  selectedModel,
  workloadSlots
)

const handleCalculate = () => {
  calculate(simulationConfig)
}
```

### useWorkloadValidation

**Import:** `import { useWorkloadValidation } from '@/hooks/useWorkloadValidation'`

```typescript
interface UseWorkloadValidationReturn {
  errors: ValidationError[]
  isValid: boolean
  totalPercentage: number
  remainingPercentage: number
  validateSlots: (slots: WorkloadSlot[]) => ValidationError[]
}

function useWorkloadValidation(workloadSlots: WorkloadSlot[]): UseWorkloadValidationReturn
```

### useModelLoader

**Import:** `import { useModelLoader } from '@/hooks/useModelLoader'`

```typescript
interface UseModelLoaderReturn {
  models: Model[]
  isLoading: boolean
  error: string | null
  reload: () => Promise<void>
  preloadModel: (modelId: string) => Promise<void>
}

function useModelLoader(): UseModelLoaderReturn
```

## Type Definitions

### Core Types

```typescript
// Model related types
interface Model {
  id: string
  name: string
  description: string
  parameters: number
  precision: ModelPrecision
  architecture: ModelArchitecture
  vramRequirements: VRAMRequirements
  performance: PerformanceMetrics[]
  metadata: ModelMetadata
}

interface ModelArchitecture {
  layers: number
  hiddenSize: number
  attentionHeads: number
  vocabularySize: number
  maxSequenceLength: number
}

interface VRAMRequirements {
  baseVRAM: number
  kvCacheCoefficient: number
  activationMultiplier: number
  overheadFactor: number
}

// Workload related types
interface Workload {
  id: string
  name: string
  description: string
  inputTokens: number
  outputTokens: number
  category: WorkloadCategory
  icon: string
  examples: string[]
}

interface WorkloadSlot {
  workload: Workload | null
  percentage: number
  isActive: boolean
}

// Simulation related types
interface SimulationConfig {
  period: SimulationPeriod
  isValid: boolean
  errors: ValidationError[]
}

interface SimulationPeriod {
  duration: number
  timeUnit: TimeUnit
  concurrentUsers: number
  requestPattern: RequestPattern
  granularity: number
  durationSeconds: number
  precision: ModelPrecision
}

interface SimulationResults {
  maxVRAM: number
  averageVRAM: number
  usagePoints: VRAMUsagePoint[]
  recommendations: string[]
  warnings: string[]
  calculatedAt: number
}

interface VRAMUsagePoint {
  timestamp: number
  totalVRAM: number
  breakdown: VRAMBreakdown
  activeRequests: ActiveRequest[]
}
```

### Enums

```typescript
enum ModelPrecision {
  FP32 = 'fp32',
  FP16 = 'fp16',
  INT8 = 'int8',
  INT4 = 'int4',
}

enum WorkloadCategory {
  CHAT = 'chat',
  RAG = 'rag',
  CODING = 'coding',
  CREATIVE = 'creative',
  ANALYSIS = 'analysis',
  CUSTOM = 'custom',
}

enum TimeUnit {
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
}

enum RequestPattern {
  STEADY = 'steady',
  BURST = 'burst',
  VARIABLE = 'variable',
}
```

### Validation Types

```typescript
interface ValidationError {
  field: string
  message: string
  type: 'validation' | 'constraint' | 'format'
}

interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}
```

## Utility Functions

### Validation Utilities

**Import:** `import { validation } from '@/utils/validation'`

```typescript
// Model validation
function validateModel(model: unknown): ValidationResult
function validateModelArray(models: unknown[]): ValidationResult

// Workload validation
function validateWorkloadSlots(slots: WorkloadSlot[]): ValidationResult
function validateWorkloadPercentages(slots: WorkloadSlot[]): ValidationResult

// Simulation validation
function validateSimulationConfig(config: SimulationConfig): ValidationResult
function validateSimulationPeriod(period: SimulationPeriod): ValidationResult
```

### Formatting Utilities

**Import:** `import { formatting } from '@/utils/formatting'`

```typescript
// VRAM formatting
function formatVRAM(bytes: number): string // "13.5 GB"
function formatVRAMCompact(bytes: number): string // "13.5G"

// Number formatting
function formatPercentage(value: number): string // "45.2%"
function formatNumber(value: number, decimals?: number): string

// Time formatting
function formatDuration(seconds: number): string // "2h 30m"
function formatTimestamp(timestamp: number): string

// Token formatting
function formatTokenCount(count: number): string // "1.2K tokens"
```

### Calculation Utilities

**Import:** `import { calculations } from '@/utils/calculations'`

```typescript
// VRAM calculations
function calculateModelSize(parameters: number, precision: ModelPrecision): number
function calculateKVCacheSize(config: KVCacheConfig): number
function calculateSequenceLength(inputTokens: number, outputTokens: number): number

// Percentage utilities
function distributePercentages(count: number): number[]
function normalizePercentages(percentages: number[]): number[]
function calculateRemaining(used: number[]): number
```

## Context APIs

### AppContext

**Import:** `import { useAppContext } from '@/contexts/AppContext'`

```typescript
interface AppState {
  selectedModel: Model | null
  workloadSlots: WorkloadSlot[]
  simulationConfig: SimulationConfig
  results: SimulationResults | null
  isCalculating: boolean
  error: string | null
}

interface AppActions {
  setSelectedModel: (model: Model | null) => void
  updateWorkloadSlots: (slots: WorkloadSlot[]) => void
  updateSimulationConfig: (config: SimulationConfig) => void
  setResults: (results: SimulationResults | null) => void
  setCalculating: (calculating: boolean) => void
  setError: (error: string | null) => void
}

// Usage
const { state, actions } = useAppContext()
```

### ModelContext

**Import:** `import { useModelContext } from '@/contexts/ModelContext'`

```typescript
interface ModelContextValue {
  models: Model[]
  isLoading: boolean
  error: string | null
  loadModel: (modelId: string) => Promise<Model>
  searchModels: (query: string) => Model[]
  filterModels: (filter: ModelFilter) => Model[]
}
```

### WorkloadContext

**Import:** `import { useWorkloadContext } from '@/contexts/WorkloadContext'`

```typescript
interface WorkloadContextValue {
  workloads: Workload[]
  profiles: Profile[]
  currentSlots: WorkloadSlot[]
  validationErrors: ValidationError[]
  updateSlots: (slots: WorkloadSlot[]) => void
  applyProfile: (profile: Profile) => void
  saveProfile: (name: string, description: string) => void
}
```

## Error Handling

### Error Types

```typescript
class VRAMCalculationError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'VRAMCalculationError'
  }
}

class ModelValidationError extends Error {
  constructor(
    message: string,
    public field: string
  ) {
    super(message)
    this.name = 'ModelValidationError'
  }
}

class NetworkError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'NetworkError'
  }
}
```

### Error Boundaries

```typescript
interface ErrorBoundaryProps {
  fallback?: React.ComponentType<{ error: Error }>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  children: React.ReactNode
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps> {
  // Implementation details...
}
```

## Constants

### VRAM Constants

```typescript
export const PRECISION_BYTES = {
  fp32: 4,
  fp16: 2,
  int8: 1,
  int4: 0.5,
} as const

export const GPU_MEMORY_SIZES = {
  'RTX 4090': 24576,
  'RTX 3090': 24576,
  A100: 40960,
  H100: 81920,
} as const
```

### Validation Constants

```typescript
export const WORKLOAD_SLOT_CONSTRAINTS = {
  MAX_SLOTS: 5,
  TOTAL_PERCENTAGE: 100,
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
} as const

export const SIMULATION_CONSTRAINTS = {
  MIN_DURATION: 1,
  MAX_DURATION: 86400,
  MIN_USERS: 1,
  MAX_USERS: 10000,
  MIN_GRANULARITY: 1,
  MAX_GRANULARITY: 3600,
} as const
```

## Migration Guide

### Version Compatibility

- **v1.0.x**: Initial release
- **v1.1.x**: Added WorkloadConfigurator drag-and-drop
- **v1.2.x**: Enhanced VRAM calculation algorithms

### Breaking Changes

#### v1.1.0

- `ModelSelector.onSelect` renamed to `onModelSelect`
- `WorkloadSlot.active` renamed to `isActive`

#### v1.2.0

- VRAM calculation results format changed
- Added `calculatedAt` timestamp to `SimulationResults`

### Upgrade Instructions

```typescript
// v1.0.x
<ModelSelector onSelect={handleSelect} />

// v1.1.x+
<ModelSelector onModelSelect={handleSelect} />
```

## Examples

### Complete Integration Example

```typescript
import React, { useState } from 'react';
import {
  ModelSelector,
  WorkloadConfigurator,
  SimulationControls,
  VRAMChart,
  ResultsSummary
} from '@/components';
import { useVRAMCalculation, useModelLoader } from '@/hooks';

export const VRAMCalculatorApp: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [workloadSlots, setWorkloadSlots] = useState<WorkloadSlot[]>(initialSlots);
  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig>(defaultConfig);

  const { models, isLoading } = useModelLoader();
  const { results, isCalculating, calculate } = useVRAMCalculation(
    selectedModel,
    workloadSlots
  );

  const handleCalculate = () => {
    if (selectedModel && simulationConfig.isValid) {
      calculate(simulationConfig);
    }
  };

  return (
    <div>
      <ModelSelector
        models={models}
        selectedModel={selectedModel}
        onModelSelect={setSelectedModel}
        disabled={isLoading}
      />

      <WorkloadConfigurator
        workloads={defaultWorkloads}
        workloadSlots={workloadSlots}
        onSlotsChange={setWorkloadSlots}
        profiles={savedProfiles}
        errors={[]}
      />

      <SimulationControls
        config={simulationConfig}
        onChange={setSimulationConfig}
        onCalculate={handleCalculate}
        isCalculating={isCalculating}
      />

      {results && (
        <>
          <VRAMChart
            data={results.usagePoints}
            maxVRAM={results.maxVRAM}
            chartType="area"
            showTooltips={true}
          />

          <ResultsSummary
            results={results}
            model={selectedModel}
            onExport={handleExport}
          />
        </>
      )}
    </div>
  );
};
```
