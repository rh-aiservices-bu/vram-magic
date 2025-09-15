# VRAM Magic User Guide

Welcome to VRAM Magic, the comprehensive GPU memory calculator for Large Language Model (LLM) deployments. This guide will help you understand how to use the application effectively to estimate VRAM requirements for your LLM workloads.

## Quick Start

1. **Select a Model**: Choose an LLM from the dropdown selector
2. **Configure Workloads**: Drag and drop workload types into slots and set percentages
3. **Set Simulation Parameters**: Configure duration, concurrent users, and request patterns
4. **Calculate**: Run the simulation to get VRAM estimates and GPU recommendations

## Understanding VRAM Magic

### What is VRAM?

Video Random Access Memory (VRAM) is the dedicated memory on your GPU that stores model weights, intermediate calculations, and cached data during LLM inference. Insufficient VRAM leads to:

- Out-of-memory errors
- Reduced batch sizes
- Slower inference speeds
- Model offloading to system RAM

### How VRAM Calculation Works

VRAM Magic uses the following formula to calculate memory requirements:

```
Total VRAM = Model Memory + KV-Cache Memory + Activation Memory + Overhead

Where:
- Model Memory = Parameters × Precision (bytes) × 1.2 (overhead factor)
- KV-Cache Memory = 2 × Layers × Hidden_Size × Sequence_Length × Batch_Size × Precision
- Activation Memory = Hidden_Size × Sequence_Length × Batch_Size × Precision × 4
- Overhead = 0.1 × (Model Memory + KV-Cache Memory)
```

## Component Guide

### ModelSelector

The ModelSelector allows you to choose from pre-configured LLM models or load custom configurations.

**Features:**

- Search by model name, organization, or tags
- View model specifications (parameters, architecture, performance)
- Filter by precision type (FP32, FP16, INT8, INT4)

**Tips:**

- Use the search function to quickly find specific models
- Hover over model cards to see detailed specifications
- Pay attention to the precision setting as it significantly affects VRAM usage

### WorkloadConfigurator

Configure your LLM usage patterns by assigning workload types to slots and setting percentage allocations.

**Available Workload Types:**

#### Chat Workloads 💬

- **Simple Chat**: Basic conversations (150 input / 100 output tokens)
- **Detailed Chat**: In-depth discussions (300 input / 500 output tokens)

#### RAG Workloads 📚

- **Simple RAG**: Basic document queries (800 input / 300 output tokens)
- **Complex RAG**: Multi-document analysis (2000 input / 800 output tokens)

#### Coding Workloads 💻

- **Simple Coding**: Code generation (200 input / 300 output tokens)
- **Complex Coding**: Large codebase analysis (1500 input / 1000 output tokens)

#### Creative Workloads ✍️

- **Creative Writing**: Story and content generation (500 input / 1200 output tokens)

#### Analysis Workloads 📊

- **Data Analysis**: Statistical analysis (1000 input / 600 output tokens)

**Usage Instructions:**

1. Drag workload types from the palette to the 5 available slots
2. Use percentage sliders to allocate usage distribution
3. Ensure total percentage equals 100%
4. Use profile presets for common configurations

**Preset Profiles:**

- **Chat Focused**: Optimized for conversational AI (60% simple chat, 40% detailed chat)
- **Balanced Workload**: Even distribution across use cases
- **Enterprise Suite**: Heavy RAG and analysis workloads

### SimulationControls

Configure the temporal and load parameters for your simulation.

**Time Configuration:**

- **Duration**: How long to simulate (1 minute to 7 days)
- **Time Unit**: Minutes, hours, or days
- **Granularity**: Time resolution for data points (seconds)

**Load Configuration:**

- **Concurrent Users**: Number of simultaneous users (1-1000)
- **Request Pattern**: How requests are distributed over time
  - **Steady**: Consistent request rate
  - **Burst**: Periodic traffic spikes
  - **Variable**: Realistic usage patterns with peaks and valleys

**Precision Settings:**

- **FP32**: Full precision (4 bytes per parameter)
- **FP16**: Half precision (2 bytes per parameter) - Recommended
- **INT8**: 8-bit quantization (1 byte per parameter)
- **INT4**: 4-bit quantization (0.5 bytes per parameter)

### VRAMChart

Interactive visualization of VRAM usage over time.

**Chart Types:**

- **Area Chart**: Shows VRAM usage trends with stacked breakdown
- **Bar Chart**: Discrete time periods with detailed breakdown

**VRAM Components:**

- **Base Model**: Static memory for model weights
- **KV Cache**: Dynamic memory for attention caching
- **Activations**: Memory for intermediate calculations
- **Overhead**: System and framework overhead

**Interaction:**

- Hover over data points for detailed breakdown
- Click points to see active requests at that time
- Use zoom and pan for detailed analysis

### ResultsSummary

Comprehensive results display with actionable recommendations.

**Key Metrics:**

- **Maximum VRAM**: Peak memory usage during simulation
- **Average VRAM**: Mean memory usage across simulation period
- **GPU Recommendations**: Suitable GPU options ranked by compatibility
- **Warnings**: Critical alerts about capacity constraints

**GPU Recommendations:**
Results include specific GPU models with their VRAM capacities:

- **Consumer GPUs**: RTX 4090 (24GB), RTX 3090 (24GB), etc.
- **Professional GPUs**: RTX 6000 Ada (48GB), A6000 (48GB), etc.
- **Enterprise GPUs**: A100 (40GB/80GB), H100 (80GB), etc.

**Export Options:**

- **JSON**: Raw simulation data for further analysis
- **CSV**: Tabular data for spreadsheet import
- **PNG**: Chart image for presentations

## Best Practices

### Model Selection

- Start with smaller models for proof-of-concept
- Consider quantized versions (FP16/INT8) to reduce VRAM usage
- Match model capabilities to your specific use case

### Workload Configuration

- Be realistic about token counts - measure actual usage if possible
- Account for peak usage scenarios, not just averages
- Consider future scaling when setting percentages

### Simulation Settings

- Use longer durations for production planning
- Test burst patterns to identify capacity bottlenecks
- Include safety margin in concurrent user estimates

### GPU Selection

- Choose GPUs with 20-30% headroom above peak usage
- Consider memory bandwidth for large models
- Factor in power consumption and cooling requirements

## Troubleshooting

### Common Issues

**"Total percentage exceeds 100%"**

- Adjust workload percentages to sum to exactly 100%
- Remove unnecessary workload slots
- Use the percentage validation indicators

**"Model not found"**

- Check internet connection for model loading
- Verify model file format and schema
- Try refreshing the browser

**"Calculation timeout"**

- Reduce simulation duration or granularity
- Lower concurrent user count
- Switch to a smaller model for testing

**"GPU recommendations show insufficient VRAM"**

- Consider model quantization (FP16 instead of FP32)
- Reduce workload complexity or concurrent users
- Look into enterprise GPU options

### Performance Tips

- Use FP16 precision for most workloads (2x memory savings)
- Optimize token counts based on actual usage patterns
- Consider batch size limitations when interpreting results
- Test with burst patterns to identify peak requirements

## Advanced Features

### Custom Models

You can add custom models by creating JSON files in the `public/models/` directory following the schema:

```json
{
  "id": "custom-model",
  "name": "Custom Model",
  "description": "Your custom model description",
  "parameters": 7000000000,
  "precision": "fp16",
  "architecture": {
    "layers": 32,
    "hiddenSize": 4096,
    "attentionHeads": 32,
    "vocabularySize": 32000,
    "maxSequenceLength": 4096
  },
  "vramRequirements": {
    "baseVRAM": 13500,
    "kvCacheCoefficient": 1.2,
    "activationMultiplier": 1.5,
    "overheadFactor": 1.15
  }
}
```

### Workload Profiles

Create custom workload profiles by saving specific configurations and sharing them with your team.

### Batch Analysis

For multiple model comparisons, run simulations with identical parameters across different models.

## Getting Help

- **Component Documentation**: Use Storybook for interactive component examples
- **Developer Guide**: See `docs/developer-guide/` for technical details
- **Performance Guide**: See `docs/performance-guide/` for optimization tips
- **API Reference**: See `docs/api/` for programmatic usage

## Keyboard Navigation

VRAM Magic is fully accessible via keyboard:

- **Tab**: Navigate between components
- **Enter/Space**: Activate buttons and select options
- **Arrow Keys**: Navigate within components
- **Escape**: Close modals and dropdowns
- **Ctrl+Enter**: Run calculation (when simulation controls are focused)

## Mobile Usage

While optimized for desktop use, VRAM Magic includes mobile-responsive features:

- Touch-friendly interfaces
- Swipe gestures for chart navigation
- Responsive layouts for smaller screens
- Touch alternative for drag-and-drop operations
