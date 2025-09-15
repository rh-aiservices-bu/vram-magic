// VRAM Magic: Component Barrel Export
// Centralized export point for all application components

export { ModelSelector } from './ModelSelector'
export { default as WorkloadConfigurator } from './WorkloadConfigurator'
export { PercentageSlider } from './PercentageSlider'
export { SimulationControls } from './SimulationControls'
export { VRAMChart } from './VRAMChart'
export { ResultsSummary } from './ResultsSummary'

export type {
  ModelSelectorProps,
  WorkloadConfiguratorProps,
  PercentageSliderProps,
  SimulationControlsProps,
  VRAMChartProps,
  ResultsSummaryProps,
} from '../types'
