# VRAM Magic: Technical Research

## VRAM Calculation Methods for Transformer Models

### Decision: Multi-factor VRAM estimation with KV-Cache modeling

**Rationale**: VRAM consumption for LLMs consists of multiple components that scale differently:

- **Model weights**: Fixed per model (linear with parameter count)
- **KV-Cache**: Grows with sequence length and batch size
- **Activation memory**: Scales with hidden dimensions and sequence length
- **Gradient memory**: Only during training (not applicable for inference)

**Formula Implementation**:

```text
Total VRAM = Model Memory + KV-Cache Memory + Activation Memory + Overhead

Model Memory = Parameters × Precision (bytes) × 1.2 (overhead factor)
KV-Cache Memory = 2 × Layers × Hidden_Size × Sequence_Length × Batch_Size × Precision
Activation Memory = Hidden_Size × Sequence_Length × Batch_Size × Precision × 4
Overhead = 0.1 × (Model Memory + KV-Cache Memory) (10% safety margin)
```

**Alternatives considered**:

- Simple parameter-based estimation: Too inaccurate for production planning
- GPU-specific profiling: Too complex for web application
- Fixed ratios: Doesn't account for sequence length variations

## Accessible Drag-and-Drop Implementation

### Decision: React DnD with comprehensive fallback controls

**Rationale**: React DnD provides excellent accessibility when properly configured, with keyboard support and screen reader compatibility built-in.

**Implementation approach**:

- Primary: React DnD with keyboard navigation
- Fallback: Button-based controls for adding/removing workloads
- Screen reader: Live regions for announcing changes
- Keyboard: Arrow keys for reordering, Enter/Space for selection

**Alternatives considered**:

- @dnd-kit/core: Modern but less mature accessibility features
- Custom implementation: Too complex and error-prone
- Material UI's sortable lists: Limited customization options

## Time-Series Visualization Library

### Decision: Recharts for React integration and accessibility

**Rationale**: Recharts provides excellent React integration, built-in accessibility features, and stacked area charts perfect for VRAM visualization.

**Key features needed**:

- Stacked area charts with time axis
- Color customization for workload types
- Tooltip integration with detailed information
- Responsive design for mobile devices
- ARIA labels for screen readers

**Alternatives considered**:

- Chart.js: More features but harder React integration
- D3.js: Too complex for this use case
- Victory: Good accessibility but larger bundle size

## Material UI Theming Strategy

### Decision: Custom theme with professional color palette and animations

**Rationale**: Material UI's theming system allows complete customization while maintaining design consistency and accessibility standards.

**Theme specifications**:

- **Color palette**: Blue primary (tech/professional), orange accent (warnings/highlights)
- **Typography**: Roboto with clear hierarchy (h1-h6, body1-body2)
- **Spacing**: 8px base unit for consistent layout
- **Animations**: Subtle transitions (200ms) for state changes
- **Dark mode**: Full support with automatic contrast adjustments

**Professional appearance elements**:

- Elevation system for depth perception
- Consistent border radius (4px standard, 8px for cards)
- High contrast ratios for accessibility
- Smooth micro-interactions for user feedback

**Alternatives considered**:

- Ant Design: Less customization flexibility
- Custom CSS: Too much maintenance overhead
- Tailwind CSS: Doesn't integrate well with Material UI

## Performance Optimization Strategy

### Decision: Code splitting, memoization, and lazy loading

**Rationale**: Single-page applications need careful optimization to meet performance goals (<2s load, <100ms interactions).

**Optimization techniques**:

1. **Route-based code splitting**: Dynamic imports for major components
2. **Component memoization**: React.memo for expensive calculations
3. **Lazy loading**: Charts and visualizations loaded on demand
4. **Bundle analysis**: webpack-bundle-analyzer for optimization tracking
5. **Image optimization**: WebP format with fallbacks

**Specific implementations**:

- Workload calculations: useMemo for expensive VRAM computations
- Chart rendering: useCallback for event handlers
- Model loading: Lazy loading of JSON files
- Virtual scrolling: For large model lists (if needed)

**Alternatives considered**:

- Service workers: Complex for this application type
- SSR/SSG: Not needed for dynamic calculation tool
- Web workers: Overkill for current computation complexity

## State Management Approach

### Decision: React Context API with useReducer for complex state

**Rationale**: The application has moderate state complexity that doesn't justify external state management libraries.

**State structure**:

```typescript
interface AppState {
  selectedModel: Model | null;
  workloadSlots: WorkloadSlot[];
  simulationConfig: SimulationConfig;
  results: VRAMUsagePoint[];
  ui: UIState;
}
```

**Context organization**:

- ModelContext: Selected model and available models
- WorkloadContext: Workload configuration and validation
- SimulationContext: Simulation parameters and results
- UIContext: Loading states, errors, notifications

**Alternatives considered**:

- Redux Toolkit: Too complex for application size
- Zustand: Good option but Context API sufficient
- Local component state: Would cause prop drilling

## Testing Strategy Details

### Decision: Multi-layer testing with accessibility focus

**Rationale**: Comprehensive testing ensures reliability and accessibility compliance.

**Testing layers**:

1. **Unit tests**: Component behavior with React Testing Library
2. **Integration tests**: User workflows with realistic data
3. **Accessibility tests**: axe-core integration for WCAG compliance
4. **Visual regression**: Storybook with Chromatic (future enhancement)

**Specific test scenarios**:

- VRAM calculation accuracy with known model parameters
- Workload percentage validation and error handling
- Keyboard navigation through entire application
- Screen reader announcement verification
- Chart rendering with various data scenarios

**Tools and libraries**:

- Vitest: Fast unit test runner
- React Testing Library: User-centric testing approach
- @testing-library/jest-dom: Extended matchers
- axe-core: Accessibility rule checking
- Mock Service Worker: API mocking for tests

## Browser Compatibility and Progressive Enhancement

### Decision: Modern browsers with graceful degradation

**Rationale**: Target modern browsers while providing fallbacks for essential functionality.

**Browser support**:

- Chrome 90+ (ES2020 support)
- Firefox 88+ (full ES modules)
- Safari 14+ (iOS 14+)
- Edge 90+ (Chromium-based)

**Progressive enhancement**:

- Core functionality works without JavaScript (static calculations)
- Charts degrade to data tables
- Drag-and-drop falls back to button controls
- Animations can be disabled for motion sensitivity

**Polyfills and fallbacks**:

- CSS Grid fallback to Flexbox
- ResizeObserver polyfill for older browsers
- LocalStorage fallback to session-based state

---

## Research Validation

All technical decisions align with constitutional requirements:

- ✅ Single project structure maintained
- ✅ Direct framework usage without unnecessary abstractions
- ✅ Real dependencies identified for testing
- ✅ Performance targets defined and measurable
- ✅ Accessibility requirements addressed comprehensively

**Next Phase**: Proceed to data model design and contract generation.