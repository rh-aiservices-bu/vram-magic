# VRAM Magic Developer Guide

This guide covers setup, development workflows, architecture, and contribution guidelines for the VRAM Magic project.

## Table of Contents

- [Quick Setup](#quick-setup)
- [Project Architecture](#project-architecture)
- [Development Workflow](#development-workflow)
- [Component Development](#component-development)
- [Testing Strategy](#testing-strategy)
- [Performance Optimization](#performance-optimization)
- [Contribution Guidelines](#contribution-guidelines)
- [Deployment](#deployment)

## Quick Setup

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ or **yarn** 1.22+
- **Git** for version control
- **Modern browser** with ES2020 support

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/vram-magic.git
cd vram-magic

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Start Storybook
npm run storybook
```

### Development Commands

```bash
# Development
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run storybook        # Start Storybook (http://localhost:6006)

# Testing
npm test                 # Run all tests with Vitest
npm run test:ui          # Run tests with UI
npm run type-check       # TypeScript type checking

# Build
npm run build            # Production build
npm run preview          # Preview production build
npm run build:analyze    # Build with bundle analysis

# Code Quality
npm run lint             # ESLint checking
npm run lint:fix         # Fix ESLint issues
npm run format           # Prettier formatting

# Performance
npm run perf-check       # Performance benchmarks
npm run size-check       # Bundle size analysis
```

## Project Architecture

### Technology Stack

- **Frontend Framework**: React 18+ with TypeScript 5+
- **Build Tool**: Vite 5+ for fast development and optimized builds
- **UI Framework**: Material UI 5+ for consistent, accessible components
- **Charts**: Recharts for interactive data visualization
- **Drag & Drop**: React DnD for workload configuration
- **Validation**: Zod for type-safe data validation
- **Testing**: Vitest + React Testing Library + axe-core
- **Documentation**: Storybook for component documentation

### Directory Structure

```
vram-magic/
├── public/
│   ├── models/                 # Model JSON files
│   └── ...
├── src/
│   ├── components/             # React components
│   │   ├── ModelSelector/
│   │   │   ├── ModelSelector.tsx
│   │   │   ├── ModelSelector.test.tsx
│   │   │   ├── ModelSelector.stories.tsx
│   │   │   └── index.ts
│   │   ├── WorkloadConfigurator/
│   │   ├── PercentageSlider/
│   │   ├── SimulationControls/
│   │   ├── VRAMChart/
│   │   ├── ResultsSummary/
│   │   ├── Layout/
│   │   └── UI/
│   ├── contexts/               # React Context providers
│   │   ├── AppContext.tsx
│   │   ├── ModelContext.tsx
│   │   ├── WorkloadContext.tsx
│   │   └── SimulationContext.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── useVRAMCalculation.ts
│   │   ├── useWorkloadValidation.ts
│   │   └── useModelLoader.ts
│   ├── services/               # Business logic
│   │   ├── vramCalculator.ts
│   │   ├── modelService.ts
│   │   ├── chartUtils.ts
│   │   └── errorHandling.ts
│   ├── types/                  # TypeScript definitions
│   │   └── index.ts
│   ├── utils/                  # Helper functions
│   │   ├── validation.ts
│   │   └── formatting.ts
│   ├── data/                   # Static data and constants
│   │   └── workloads.ts
│   ├── styles/                 # Theming and styles
│   │   └── theme.ts
│   └── App.tsx
├── tests/                      # Test utilities and fixtures
├── docs/                       # Documentation
├── .storybook/                 # Storybook configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

### Core Architecture Patterns

#### Component Structure

Every component follows this pattern:

```
ComponentName/
├── ComponentName.tsx       # Main component implementation
├── ComponentName.test.tsx  # Unit tests
├── ComponentName.stories.tsx # Storybook stories
├── README.md              # Component documentation (optional)
└── index.ts               # Export barrel
```

#### Context Pattern

Global state management using React Context + useReducer:

```typescript
// Context definition
interface AppState {
  selectedModel: Model | null;
  workloadSlots: WorkloadSlot[];
  simulationConfig: SimulationConfig;
  results: SimulationResults | null;
}

// Provider component
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};
```

#### Service Layer Pattern

Business logic separated from UI components:

```typescript
// VRAM calculation service
export class VRAMCalculator {
  calculateModelMemory(parameters: number, precision: ModelPrecision): number {
    const precisionBytes = PRECISION_BYTES[precision]
    return parameters * precisionBytes * 1.2 // 20% overhead
  }

  calculateKVCache(config: KVCacheConfig): number {
    return (
      2 *
      config.layers *
      config.hiddenSize *
      config.sequenceLength *
      config.batchSize *
      config.precisionBytes
    )
  }
}
```

#### Hook Pattern

Custom hooks for reusable logic:

```typescript
export const useVRAMCalculation = (model: Model, workloads: WorkloadSlot[]) => {
  const [results, setResults] = useState<SimulationResults | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const calculate = useCallback(
    async (config: SimulationConfig) => {
      setIsCalculating(true)
      try {
        const calculator = new VRAMCalculator()
        const results = await calculator.simulate(model, workloads, config)
        setResults(results)
      } finally {
        setIsCalculating(false)
      }
    },
    [model, workloads]
  )

  return { results, isCalculating, calculate }
}
```

## Development Workflow

### Feature Development

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/new-feature
   ```

2. **Write Tests First (TDD)**

   ```bash
   # Create failing tests
   npm test -- --watch ComponentName
   ```

3. **Implement Component**

   ```typescript
   // Follow TypeScript strict mode
   // Use Material UI components
   // Implement accessibility features
   ```

4. **Create Storybook Stories**

   ```typescript
   export default {
     title: 'Components/ComponentName',
     component: ComponentName,
     tags: ['autodocs'],
   }
   ```

5. **Run Quality Checks**
   ```bash
   npm run type-check
   npm run lint
   npm test
   ```

### Code Style Guidelines

#### TypeScript

- Use strict mode configuration
- Prefer interfaces over types for object shapes
- Use enums for related constants
- Avoid `any` type - use `unknown` if needed
- Use proper generics for reusable components

```typescript
// Good
interface ComponentProps {
  data: DataItem[]
  onSelect: (item: DataItem) => void
  variant?: 'primary' | 'secondary'
}

// Avoid
interface ComponentProps {
  data: any
  onSelect: any
  variant?: string
}
```

#### React Components

- Use function components with hooks
- Implement proper prop types with TypeScript
- Use React.memo for performance optimization
- Follow Material UI theming patterns

```typescript
interface Props {
  title: string;
  items: Item[];
  onItemClick?: (item: Item) => void;
}

export const Component: React.FC<Props> = React.memo(({
  title,
  items,
  onItemClick
}) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">{title}</Typography>
      {/* Component content */}
    </Paper>
  );
});

Component.displayName = 'Component';
```

#### Material UI Integration

- Use `sx` prop for styling
- Follow Material Design guidelines
- Implement proper theming
- Ensure accessibility compliance

```typescript
const StyledComponent = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}))
```

## Component Development

### Creating New Components

1. **Generate Component Structure**

   ```bash
   mkdir src/components/NewComponent
   cd src/components/NewComponent
   ```

2. **Component Template**

   ```typescript
   import React from 'react';
   import { Box, Typography } from '@mui/material';
   import { styled } from '@mui/material/styles';

   interface NewComponentProps {
     title: string;
     data: DataItem[];
     onAction?: (item: DataItem) => void;
     disabled?: boolean;
   }

   const StyledContainer = styled(Box)(({ theme }) => ({
     padding: theme.spacing(2),
   }));

   export const NewComponent: React.FC<NewComponentProps> = ({
     title,
     data,
     onAction,
     disabled = false
   }) => {
     return (
       <StyledContainer>
         <Typography variant="h6">{title}</Typography>
         {/* Component implementation */}
       </StyledContainer>
     );
   };
   ```

3. **Test Template**

   ```typescript
   import { render, screen } from '@testing-library/react';
   import { ThemeProvider } from '@mui/material';
   import { theme } from '../../styles/theme';
   import { NewComponent } from './NewComponent';

   const renderWithTheme = (component: React.ReactElement) => {
     return render(
       <ThemeProvider theme={theme}>
         {component}
       </ThemeProvider>
     );
   };

   describe('NewComponent', () => {
     it('renders title correctly', () => {
       renderWithTheme(
         <NewComponent title="Test Title" data={[]} />
       );
       expect(screen.getByText('Test Title')).toBeInTheDocument();
     });
   });
   ```

4. **Story Template**

   ```typescript
   import type { Meta, StoryObj } from '@storybook/react'
   import { NewComponent } from './NewComponent'

   const meta: Meta<typeof NewComponent> = {
     title: 'Components/NewComponent',
     component: NewComponent,
     parameters: {
       docs: {
         description: {
           component: 'Component description for documentation',
         },
       },
     },
     tags: ['autodocs'],
   }

   export default meta
   type Story = StoryObj<typeof meta>

   export const Default: Story = {
     args: {
       title: 'Example Title',
       data: [],
     },
   }
   ```

### Accessibility Requirements

All components must meet WCAG 2.1 AA standards:

- **Keyboard Navigation**: Full functionality via keyboard
- **Screen Reader Support**: Proper ARIA labels and roles
- **Color Contrast**: Minimum 4.5:1 contrast ratio
- **Focus Management**: Visible focus indicators
- **Semantic HTML**: Proper heading hierarchy and landmarks

```typescript
// Accessibility example
<Autocomplete
  options={models}
  getOptionLabel={(option) => option.name}
  renderInput={(params) => (
    <TextField
      {...params}
      label="Select Model"
      aria-describedby="model-help-text"
      inputProps={{
        ...params.inputProps,
        'aria-label': 'Search and select LLM model'
      }}
    />
  )}
  aria-label="Model selection"
/>
```

## Testing Strategy

### Test Types

#### Unit Tests

- Test individual component behavior
- Mock external dependencies
- Focus on user interactions

```typescript
import userEvent from '@testing-library/user-event';

test('calls onModelSelect when model is chosen', async () => {
  const user = userEvent.setup();
  const mockOnSelect = jest.fn();

  render(
    <ModelSelector
      models={mockModels}
      onModelSelect={mockOnSelect}
    />
  );

  await user.click(screen.getByRole('combobox'));
  await user.click(screen.getByText('Llama 2 7B'));

  expect(mockOnSelect).toHaveBeenCalledWith(mockModels[0]);
});
```

#### Integration Tests

- Test component interactions
- Validate complete workflows
- Test context providers

```typescript
test('complete workflow: model selection to results', async () => {
  render(
    <AppProvider>
      <App />
    </AppProvider>
  );

  // Select model
  await user.click(screen.getByLabelText(/select model/i));
  await user.click(screen.getByText('Llama 2 7B'));

  // Configure workloads
  await user.click(screen.getByText('Simple Chat'));
  await user.type(screen.getByLabelText(/percentage/i), '50');

  // Run simulation
  await user.click(screen.getByText('Calculate VRAM'));

  // Verify results
  await waitFor(() => {
    expect(screen.getByText(/maximum vram/i)).toBeInTheDocument();
  });
});
```

#### Accessibility Tests

- Automated accessibility testing
- Keyboard navigation validation
- Screen reader compatibility

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('component has no accessibility violations', async () => {
  const { container } = render(<ModelSelector models={mockModels} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Test Data Management

Use factories for consistent test data:

```typescript
// tests/factories/modelFactory.ts
export const createMockModel = (overrides?: Partial<Model>): Model => ({
  id: 'test-model',
  name: 'Test Model',
  parameters: 7000000000,
  precision: 'fp16',
  architecture: {
    layers: 32,
    hiddenSize: 4096,
    attentionHeads: 32,
    vocabularySize: 32000,
    maxSequenceLength: 4096,
  },
  ...overrides,
})
```

## Performance Optimization

### Bundle Optimization

- **Code Splitting**: Lazy load routes and heavy components
- **Tree Shaking**: Remove unused code
- **Bundle Analysis**: Monitor bundle size

```typescript
// Lazy loading
const VRAMChart = React.lazy(() => import('./VRAMChart'));

// Usage
<Suspense fallback={<CircularProgress />}>
  <VRAMChart data={usageData} />
</Suspense>
```

### React Optimization

- **React.memo**: Prevent unnecessary re-renders
- **useMemo**: Memoize expensive calculations
- **useCallback**: Stabilize function references

```typescript
const ExpensiveComponent = React.memo<Props>(({ data, onSelect }) => {
  const processedData = useMemo(() => {
    return data.map(item => processItem(item));
  }, [data]);

  const handleSelect = useCallback((item: DataItem) => {
    onSelect(item);
  }, [onSelect]);

  return <div>{/* Component content */}</div>;
});
```

### VRAM Calculation Optimization

- **Web Workers**: Move heavy calculations off main thread
- **Incremental Updates**: Update results as they become available
- **Caching**: Cache calculation results

```typescript
// Web Worker usage
const worker = new Worker('/vram-calculator-worker.js')

const calculateVRAM = async (config: SimulationConfig): Promise<SimulationResults> => {
  return new Promise(resolve => {
    worker.postMessage(config)
    worker.onmessage = event => {
      resolve(event.data)
    }
  })
}
```

## Contribution Guidelines

### Git Workflow

1. **Branch Naming**
   - `feature/description` - New features
   - `fix/description` - Bug fixes
   - `refactor/description` - Code refactoring
   - `docs/description` - Documentation updates

2. **Commit Messages**
   Follow conventional commits format:

   ```
   type(scope): description

   feat(components): add ModelSelector component
   fix(calculator): correct VRAM formula for KV cache
   docs(readme): update installation instructions
   test(integration): add workload configuration tests
   ```

3. **Pull Request Process**
   - Create descriptive PR title and description
   - Link related issues
   - Include screenshots for UI changes
   - Ensure all checks pass
   - Request review from maintainers

### Code Review Checklist

- [ ] TypeScript strict mode compliance
- [ ] Comprehensive test coverage
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Performance considerations
- [ ] Proper error handling
- [ ] Documentation updates
- [ ] Storybook stories for new components

### Release Process

1. **Version Bump**

   ```bash
   npm version patch|minor|major
   ```

2. **Build and Test**

   ```bash
   npm run build
   npm test
   npm run type-check
   ```

3. **Documentation**

   ```bash
   npm run build-storybook
   npm run docs:generate
   ```

4. **Tag and Push**
   ```bash
   git push origin main --tags
   ```

## Deployment

### Production Build

```bash
# Create optimized production build
npm run build

# Preview build locally
npm run preview

# Analyze bundle size
npm run build:analyze
```

### Environment Configuration

```typescript
// Environment variables
interface Config {
  API_BASE_URL: string
  MODEL_CDN_URL: string
  ANALYTICS_ID?: string
}

const config: Config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  MODEL_CDN_URL: import.meta.env.VITE_MODEL_CDN_URL || '/models',
  ANALYTICS_ID: import.meta.env.VITE_ANALYTICS_ID,
}
```

### Docker Deployment

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Performance Monitoring

- **Core Web Vitals**: LCP, FID, CLS monitoring
- **Bundle Size**: Track bundle size changes
- **Error Tracking**: Monitor runtime errors
- **User Analytics**: Track feature usage

## Debugging

### Development Tools

- **React Developer Tools**: Component inspection
- **Redux DevTools**: State management debugging
- **Vite DevTools**: Build process inspection

### Common Issues

1. **TypeScript Errors**

   ```bash
   npm run type-check
   ```

2. **Test Failures**

   ```bash
   npm test -- --reporter=verbose
   ```

3. **Build Issues**

   ```bash
   npm run build -- --debug
   ```

4. **Performance Issues**
   ```bash
   npm run perf-check
   ```

## Getting Help

- **Documentation**: Check `docs/` directory
- **Storybook**: Interactive component examples
- **Issues**: GitHub issue tracker
- **Discussions**: GitHub discussions for questions

## Advanced Topics

### Custom Model Integration

See [Model Schema Documentation](./model-schema.md) for adding custom models.

### Plugin Development

See [Plugin API Documentation](./plugin-api.md) for extending functionality.

### Theming Customization

See [Theming Guide](./theming.md) for custom theme development.
