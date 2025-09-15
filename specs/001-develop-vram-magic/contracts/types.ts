// VRAM Magic: TypeScript Interface Contracts
// This file contains all type definitions for the application

// ============================================================================
// Core Entity Types
// ============================================================================

export enum ModelPrecision {
  FP32 = "fp32",
  FP16 = "fp16", 
  INT8 = "int8",
  INT4 = "int4"
}

export interface ModelArchitecture {
  layers: number;
  hiddenSize: number;
  attentionHeads: number;
  vocabularySize: number;
  maxSequenceLength: number;
}

export interface VRAMRequirements {
  baseVRAM: number;
  kvCacheCoefficient: number;
  activationMultiplier: number;
  overheadFactor: number;
}

export interface PerformanceMetrics {
  gpuType: string;
  tokensPerSecond: number;
  batchSize: number;
  powerConsumption: number;
}

export interface BenchmarkScore {
  name: string;
  score: number;
  unit: string;
}

export interface ModelMetadata {
  releaseDate: string;
  organization: string;
  license: string;
  tags: string[];
  benchmarks?: BenchmarkScore[];
}

export interface Model {
  id: string;
  name: string;
  description: string;
  parameters: number;
  precision: ModelPrecision;
  architecture: ModelArchitecture;
  vramRequirements: VRAMRequirements;
  performance: PerformanceMetrics[];
  metadata: ModelMetadata;
}

// ============================================================================
// Workload Types
// ============================================================================

export enum WorkloadCategory {
  CHAT = "chat",
  RAG = "rag", 
  CODING = "coding",
  CREATIVE = "creative",
  ANALYSIS = "analysis",
  CUSTOM = "custom"
}

export interface Workload {
  id: string;
  name: string;
  description: string;
  inputTokens: number;
  outputTokens: number;
  category: WorkloadCategory;
  icon?: string;
  examples: string[];
}

export interface WorkloadSlot {
  id: string;
  workload: Workload | null;
  percentage: number;
  isActive: boolean;
  order: number;
}

export interface WorkloadDistribution {
  workloadId: string;
  percentage: number;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  workloadDistribution: WorkloadDistribution[];
  isBuiltIn: boolean;
  tags: string[];
}

// ============================================================================
// Simulation Types
// ============================================================================

export enum TimeUnit {
  SECONDS = "seconds",
  MINUTES = "minutes", 
  HOURS = "hours",
  DAYS = "days"
}

export enum RequestPattern {
  UNIFORM = "uniform",
  FRONT_LOADED = "front_loaded",
  BACK_LOADED = "back_loaded", 
  BELL_CURVE = "bell_curve"
}

export interface SimulationPeriod {
  duration: number;
  timeUnit: TimeUnit;
  concurrentUsers: number;
  requestPattern: RequestPattern;
  granularity: number;
}

export interface ActiveRequest {
  requestId: string;
  workloadId: string;
  startTime: number;
  estimatedEndTime: number;
  vramConsumption: number;
}

export interface WorkloadVRAM {
  workloadId: string;
  vramUsage: number;
  requestCount: number;
  color: string;
}

export interface VRAMBreakdown {
  baseModel: number;
  kvCache: number;
  activations: number;
  overhead: number;
  workloadBreakdown: WorkloadVRAM[];
}

export interface VRAMUsagePoint {
  timestamp: number;
  totalVRAM: number;
  breakdown: VRAMBreakdown;
  activeRequests: ActiveRequest[];
}

// ============================================================================
// Application State Types
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface SimulationConfig {
  period: SimulationPeriod;
  isValid: boolean;
  errors: ValidationError[];
}

export interface SimulationResults {
  maxVRAM: number;
  averageVRAM: number;
  usagePoints: VRAMUsagePoint[];
  recommendations: string[];
  warnings: string[];
  calculatedAt: number;
}

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  timestamp: number;
  autoClose?: boolean;
}

export interface UserPreferences {
  theme: "light" | "dark" | "auto";
  chartType: "area" | "bar";
  showTooltips: boolean;
  animationsEnabled: boolean;
  accessibilityMode: boolean;
}

export interface UIState {
  loading: boolean;
  error: string | null;
  notifications: Notification[];
  preferences: UserPreferences;
}

export interface AppState {
  models: Model[];
  selectedModel: Model | null;
  workloads: Workload[];
  profiles: Profile[];
  workloadSlots: WorkloadSlot[];
  simulation: SimulationConfig;
  results: SimulationResults | null;
  ui: UIState;
}

// ============================================================================
// Component Prop Types
// ============================================================================

export interface ModelSelectorProps {
  models: Model[];
  selectedModel: Model | null;
  onModelSelect: (model: Model) => void;
  disabled?: boolean;
  error?: string;
}

export interface WorkloadConfiguratorProps {
  workloads: Workload[];
  workloadSlots: WorkloadSlot[];
  onSlotsChange: (slots: WorkloadSlot[]) => void;
  onProfileSelect: (profile: Profile) => void;
  profiles: Profile[];
  disabled?: boolean;
  errors: ValidationError[];
}

export interface PercentageSliderProps {
  value: number;
  onChange: (value: number) => void;
  remaining: number;
  label: string;
  disabled?: boolean;
  error?: string;
}

export interface SimulationControlsProps {
  config: SimulationConfig;
  onChange: (config: SimulationConfig) => void;
  onCalculate: () => void;
  isCalculating: boolean;
  disabled?: boolean;
}

export interface VRAMChartProps {
  data: VRAMUsagePoint[];
  maxVRAM: number;
  chartType: "area" | "bar";
  showTooltips: boolean;
  height?: number;
  onPointClick?: (point: VRAMUsagePoint) => void;
}

export interface ResultsSummaryProps {
  results: SimulationResults | null;
  model: Model | null;
  onExport?: (format: "json" | "csv" | "png") => void;
  loading?: boolean;
}

// ============================================================================
// Service Interface Types  
// ============================================================================

export interface VRAMCalculator {
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

export interface ModelService {
  loadModels(): Promise<Model[]>;
  getModelById(id: string): Promise<Model | null>;
  validateModel(model: Partial<Model>): ValidationError[];
}

export interface WorkloadService {
  getDefaultWorkloads(): Workload[];
  createCustomWorkload(workload: Omit<Workload, 'id'>): Workload;
  validateWorkload(workload: Partial<Workload>): ValidationError[];
}

export interface ProfileService {
  getBuiltInProfiles(): Profile[];
  createProfile(profile: Omit<Profile, 'id' | 'isBuiltIn'>): Profile;
  validateProfile(profile: Partial<Profile>): ValidationError[];
}

// ============================================================================
// Constants
// ============================================================================

export const WORKLOAD_SLOT_CONSTRAINTS = {
  MAX_SLOTS: 5,
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
  TOTAL_PERCENTAGE: 100
} as const;

export const SIMULATION_CONSTRAINTS = {
  MIN_DURATION: 1,
  MAX_DURATION: 86400,
  MIN_USERS: 1,
  MAX_USERS: 10000,
  MIN_GRANULARITY: 1,
  MAX_GRANULARITY: 3600
} as const;

export const PRECISION_BYTES = {
  [ModelPrecision.FP32]: 4,
  [ModelPrecision.FP16]: 2,
  [ModelPrecision.INT8]: 1,
  [ModelPrecision.INT4]: 0.5
} as const;

// ============================================================================
// Type Guards
// ============================================================================

export function isModel(obj: any): obj is Model {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string';
}

export function isWorkload(obj: any): obj is Workload {
  return obj && typeof obj.id === 'string' && typeof obj.inputTokens === 'number';
}

export function isValidWorkloadSlots(slots: WorkloadSlot[]): boolean {
  const activeSlots = slots.filter(slot => slot.isActive && slot.workload);
  const totalPercentage = activeSlots.reduce((sum, slot) => sum + slot.percentage, 0);
  return totalPercentage === 100 && activeSlots.length > 0;
}

// ============================================================================
// Utility Types
// ============================================================================

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type ChartDataPoint = {
  timestamp: number;
  [workloadId: string]: number;
};

export type ExportFormat = "json" | "csv" | "png";

export type ThemeMode = "light" | "dark" | "auto";

export type NotificationType = "success" | "error" | "warning" | "info";