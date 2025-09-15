# VRAM Magic: Quickstart Guide

## Development Setup

### Prerequisites

- **Node.js**: 18.0+ (recommended: 20.x LTS)
- **npm**: 9.0+ (or yarn 3.0+ / pnpm 8.0+)
- **Git**: For version control
- **VS Code**: Recommended editor with extensions:
  - TypeScript and JavaScript Language Features
  - ES7+ React/Redux/React-Native snippets
  - Auto Rename Tag
  - Prettier - Code formatter
  - ESLint

### Initial Setup

```bash
# Clone and navigate to project
git clone <repository-url>
cd vram-magic

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Project Structure Overview

```text
vram-magic/
├── src/
│   ├── components/           # React components
│   │   ├── ModelSelector/    # Model selection component
│   │   ├── WorkloadConfigurator/ # Drag-drop workload setup
│   │   ├── PercentageSlider/ # Custom slider component
│   │   ├── SimulationControls/ # Time/user configuration
│   │   ├── VRAMChart/        # Recharts visualization
│   │   └── ResultsSummary/   # Results display
│   ├── hooks/               # Custom React hooks
│   ├── services/            # Business logic
│   ├── types/               # TypeScript definitions
│   ├── utils/               # Utility functions
│   └── data/                # Static data and mocks
├── public/
│   └── models/              # JSON model database
├── tests/                   # Test suites
└── specs/                   # Feature documentation
```

## Development Workflow

### 1. Understanding the Application

VRAM Magic helps users calculate GPU memory requirements for LLM deployments through:

1. **Model Selection**: Choose from pre-configured LLM models
2. **Workload Configuration**: Define query types and their distribution
3. **Simulation Setup**: Configure time period, users, and request patterns
4. **VRAM Calculation**: Real-time calculation and visualization
5. **Results Analysis**: GPU sizing recommendations

### 2. Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run accessibility tests
npm run test:a11y

# Type checking
npm run type-check

# Linting
npm run lint
```

### 3. Key Development Commands

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Component development with Storybook
npm run storybook

# Format code
npm run format

# Fix linting issues
npm run lint:fix
```

## Core Concepts

### VRAM Calculation Engine

The application calculates VRAM usage using these components:

```typescript
// Base formula from research.md
Total VRAM = Model Memory + KV-Cache Memory + Activation Memory + Overhead

// Implementation in services/vramCalculator.ts
export const calculateVRAM = (
  model: Model,
  sequenceLength: number,
  batchSize: number
): number => {
  const baseMemory = calculateBaseMemory(model);
  const kvCache = calculateKVCache(model, sequenceLength, batchSize);
  const activations = calculateActivations(model, sequenceLength, batchSize);
  const overhead = calculateOverhead(baseMemory + kvCache + activations);
  
  return baseMemory + kvCache + activations + overhead;
};
```

### Component Architecture

Each component follows these patterns:

```typescript
// Component structure
interface ComponentProps {
  // Required props
  data: DataType;
  onChange: (value: DataType) => void;
  
  // Optional props
  disabled?: boolean;
  error?: string;
  className?: string;
}

// Implementation with hooks
export const Component: React.FC<ComponentProps> = ({
  data,
  onChange,
  disabled = false,
  error,
  className
}) => {
  const [localState, setLocalState] = useState(data);
  
  // Material UI components
  return (
    <Paper className={className}>
      {/* Component content */}
    </Paper>
  );
};
```

### State Management

Application state uses React Context API:

```typescript
// Context structure
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>({});

// Usage in components
const { state, dispatch } = useContext(AppContext);

// Actions
dispatch({
  type: 'SET_SELECTED_MODEL',
  payload: model
});
```

## Testing Strategy

### Unit Tests (Required)

Test individual components and functions:

```typescript
// Component test example
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelSelector } from './ModelSelector';

describe('ModelSelector', () => {
  it('should display available models', () => {
    render(<ModelSelector models={mockModels} onModelSelect={jest.fn()} />);
    expect(screen.getByText('Llama 2 7B')).toBeInTheDocument();
  });
  
  it('should call onModelSelect when model is selected', () => {
    const onSelect = jest.fn();
    render(<ModelSelector models={mockModels} onModelSelect={onSelect} />);
    
    fireEvent.click(screen.getByText('Llama 2 7B'));
    expect(onSelect).toHaveBeenCalledWith(mockModels[0]);
  });
});
```

### Integration Tests

Test complete user workflows:

```typescript
describe('VRAM Calculation Workflow', () => {
  it('should calculate VRAM from model selection to results', async () => {
    render(<App />);
    
    // Select model
    fireEvent.click(screen.getByTestId('model-selector'));
    fireEvent.click(screen.getByText('Llama 2 7B'));
    
    // Configure workloads
    // ... workload setup steps
    
    // Run simulation
    fireEvent.click(screen.getByText('Calculate VRAM'));
    
    // Verify results
    await waitFor(() => {
      expect(screen.getByText(/Maximum VRAM:/)).toBeInTheDocument();
    });
  });
});
```

### Accessibility Tests

Ensure WCAG 2.1 AA compliance:

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

## User Stories Implementation

### Story 1: Model Selection and Basic Calculation

```typescript
// User journey: Select model → See VRAM estimate
const ModelSelectionStory = () => {
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [estimate, setEstimate] = useState<number>(0);
  
  useEffect(() => {
    if (selectedModel) {
      const basicEstimate = calculateBaseMemory(selectedModel);
      setEstimate(basicEstimate);
    }
  }, [selectedModel]);
  
  return (
    <Box>
      <ModelSelector 
        models={availableModels}
        selectedModel={selectedModel}
        onModelSelect={setSelectedModel}
      />
      {estimate > 0 && (
        <Alert severity="info">
          Estimated base VRAM: {estimate.toFixed(0)} MB
        </Alert>
      )}
    </Box>
  );
};
```

### Story 2: Workload Configuration

```typescript
// User journey: Configure workloads → Validate percentages → Enable calculation
const WorkloadConfigurationStory = () => {
  const [workloadSlots, setWorkloadSlots] = useState<WorkloadSlot[]>(
    createEmptySlots(5)
  );
  
  const validationErrors = validateWorkloadSlots(workloadSlots);
  const isValid = !hasErrors(validationErrors);
  
  return (
    <Box>
      <WorkloadConfigurator
        workloads={availableWorkloads}
        workloadSlots={workloadSlots}
        onSlotsChange={setWorkloadSlots}
        errors={validationErrors}
      />
      <Button 
        disabled={!isValid}
        onClick={handleCalculate}
      >
        Calculate VRAM
      </Button>
    </Box>
  );
};
```

### Story 3: Simulation and Visualization

```typescript
// User journey: Run simulation → View time-based results → Analyze patterns
const SimulationStory = () => {
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const handleSimulation = async () => {
    setIsCalculating(true);
    try {
      const simulationResults = await runVRAMSimulation(
        selectedModel!,
        workloadSlots,
        simulationPeriod
      );
      setResults(simulationResults);
    } finally {
      setIsCalculating(false);
    }
  };
  
  return (
    <Box>
      <SimulationControls
        config={simulationConfig}
        onChange={setSimulationConfig}
        onCalculate={handleSimulation}
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
          />
        </>
      )}
    </Box>
  );
};
```

## Performance Guidelines

### Component Optimization

```typescript
// Memoize expensive calculations
const expensiveCalculation = useMemo(() => {
  return calculateVRAMUsageOverTime(model, workloads, period);
}, [model, workloads, period]);

// Memoize components with stable props
const MemoizedChart = React.memo(VRAMChart, (prevProps, nextProps) => {
  return (
    prevProps.data.length === nextProps.data.length &&
    prevProps.maxVRAM === nextProps.maxVRAM
  );
});

// Debounce user input
const debouncedPercentageChange = useDebounce(
  (value: number) => onChange(value),
  300
);
```

### Bundle Optimization

```typescript
// Lazy load heavy components
const VRAMChart = lazy(() => import('./VRAMChart'));
const ModelDetails = lazy(() => import('./ModelDetails'));

// Use Suspense for loading states
<Suspense fallback={<CircularProgress />}>
  <VRAMChart data={chartData} />
</Suspense>
```

## Accessibility Implementation

### Keyboard Navigation

```typescript
// Handle keyboard events
const handleKeyDown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault();
      moveWorkloadUp(selectedIndex);
      break;
    case 'ArrowDown':
      event.preventDefault();
      moveWorkloadDown(selectedIndex);
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      toggleWorkloadSelection(selectedIndex);
      break;
  }
};
```

### Screen Reader Support

```typescript
// ARIA labels and live regions
<Box
  role="region"
  aria-label="VRAM calculation results"
  aria-live="polite"
>
  <Typography id="max-vram-label">
    Maximum VRAM Required
  </Typography>
  <Typography 
    variant="h4"
    aria-labelledby="max-vram-label"
  >
    {maxVRAM.toFixed(0)} MB
  </Typography>
</Box>
```

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass (`npm test`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Bundle size is optimized (`npm run build`)
- [ ] Accessibility audit passes (`npm run test:a11y`)
- [ ] Performance metrics meet targets
- [ ] All user stories are implemented and tested
- [ ] Error boundaries handle edge cases
- [ ] Loading states are implemented
- [ ] Responsive design works on mobile devices

## Troubleshooting

### Common Issues

**Build failures**: Check TypeScript errors and missing dependencies
**Test failures**: Verify mock data matches expected interfaces
**Performance issues**: Use React DevTools Profiler to identify bottlenecks
**Accessibility violations**: Run axe-core and fix reported issues

### Debug Tools

```bash
# Bundle analysis
npm run build
npm run analyze

# Performance profiling
npm run dev
# Open React DevTools → Profiler

# Accessibility testing
npm run test:a11y
# Or use browser extensions: axe DevTools, WAVE
```

This quickstart guide provides everything needed to begin development on VRAM Magic, from initial setup through production deployment.
