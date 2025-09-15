# Implementation Plan: VRAM Magic

**Branch**: `001-develop-vram-magic` | **Date**: 2025-09-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-develop-vram-magic/spec.md`

## Execution Flow (/plan command scope)

```text
1. Load feature spec from Input path
   → ✓ Loaded successfully - 15 functional requirements identified
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✓ Project Type: web application (frontend only)
   → ✓ Structure Decision: Option 1 (Single project) with modern React setup
3. Evaluate Constitution Check section below
   → ✓ No violations identified - React component architecture aligns
   → ✓ Progress Tracking: Initial Constitution Check PASS
4. Execute Phase 0 → research.md
   → ✓ Technical research completed - VRAM formulas, libraries, performance strategy
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✓ Design artifacts generated - Complete TypeScript interfaces, validation schemas, development guide
6. Re-evaluate Constitution Check section
   → ✓ No new violations - design follows constitutional principles
   → ✓ Progress Tracking: Post-Design Constitution Check PASS
7. Plan Phase 2 → Task generation approach described
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

VRAM Magic is a web application for calculating and visualizing VRAM requirements for LLM deployments. Built with React 18+, TypeScript 5+, Material UI, and Vite, it provides an intuitive drag-and-drop interface for configuring workloads, real-time VRAM simulation, and professional time-based visualizations. The application emphasizes accessibility, performance, and user experience with self-explanatory UI and comprehensive help systems.

## Technical Context

**Language/Version**: TypeScript 5+ (strict mode enabled)
**Primary Dependencies**: React 18+, Material UI 5+, Vite 5+, Vitest, Chart.js/Recharts
**Storage**: JSON files for model database, localStorage for user preferences
**Testing**: Vitest (unit), React Testing Library (integration), axe-core (accessibility)
**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+)
**Project Type**: web - single frontend application with static JSON data
**Performance Goals**: <2s initial load, <100ms interaction response, <1MB gzipped bundle
**Constraints**: WCAG 2.1 AA compliance, offline-capable, responsive design
**Scale/Scope**: Single-page application with 5-10 main components, ~50 model configurations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:

- Projects: 1 (frontend React app) ✓
- Using framework directly? Yes - React/MUI without wrapper classes ✓
- Single data model? Yes - unified TypeScript interfaces ✓
- Avoiding patterns? Yes - direct component composition, no unnecessary abstractions ✓

**Architecture**:

- EVERY feature as library? Yes - calculation engine, visualization utils ✓
- Libraries listed: vram-calculator, workload-manager, chart-utils
- CLI per library: N/A - web application
- Library docs: N/A - component documentation in Storybook

**Testing (NON-NEGOTIABLE)**:

- RED-GREEN-Refactor cycle enforced? Yes - failing tests first ✓
- Git commits show tests before implementation? Yes - commit strategy defined ✓
- Order: Contract→Integration→E2E→Unit strictly followed? Yes ✓
- Real dependencies used? Yes - actual JSON files, real DOM testing ✓
- Integration tests for: component interactions, calculation workflows ✓
- FORBIDDEN: Implementation before test, skipping RED phase ✓

**Observability**:

- Structured logging included? Yes - console logging with context ✓
- Frontend logs → backend? N/A - frontend-only application
- Error context sufficient? Yes - error boundaries with stack traces ✓

**Versioning**:

- Version number assigned? 0.1.0 (MAJOR.MINOR.BUILD) ✓
- BUILD increments on every change? Yes - automated via package.json ✓
- Breaking changes handled? Yes - semantic versioning strategy ✓

## Project Structure

### Documentation (this feature)

```text
specs/001-develop-vram-magic/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```text
# Option 1: Single project (SELECTED)
src/
├── components/          # React components
│   ├── ModelSelector/
│   ├── WorkloadConfigurator/
│   ├── PercentageSlider/
│   ├── SimulationControls/
│   ├── VRAMChart/
│   └── ResultsSummary/
├── hooks/              # Custom React hooks
├── services/           # Business logic and calculations
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── data/               # Static data and mock models
└── styles/             # Global styles and theme

tests/
├── unit/               # Component unit tests
├── integration/        # User flow tests
└── accessibility/      # a11y compliance tests

public/
├── models/             # JSON model database
└── assets/             # Static assets
```

**Structure Decision**: Option 1 - Single React application with modular component architecture

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - Research VRAM calculation formulas for LLMs
   - Investigate KVCache memory consumption patterns
   - Compare chart libraries (Chart.js vs Recharts vs D3)
   - Evaluate drag-and-drop libraries for accessibility
   - Research Material UI theming for professional appearance

2. **Generate and dispatch research agents**:
   - Task: "Research VRAM calculation methods for transformer models"
   - Task: "Find best practices for accessible drag-and-drop in React"
   - Task: "Compare visualization libraries for time-series data"
   - Task: "Research Material UI advanced theming and animations"
   - Task: "Investigate performance optimization for React apps"

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Model: LLM specifications with VRAM parameters
   - Workload: Query type definitions with token counts
   - WorkloadSlot: UI configuration linking workload to percentage
   - Profile: Predefined workload collections
   - SimulationPeriod: Time-bound simulation parameters
   - VRAMUsagePoint: Time-stamped VRAM consumption data

2. **Generate API contracts** from functional requirements:
   - TypeScript interfaces for all entities
   - JSON schemas for model database files
   - Component prop interfaces with strict typing
   - Validation schemas using Zod

3. **Generate contract tests** from contracts:
   - TypeScript compilation tests
   - JSON schema validation tests
   - Component prop validation tests
   - Tests must fail initially (no implementation)

4. **Extract test scenarios** from user stories:
   - Model selection → calculation workflow
   - Workload configuration → percentage validation
   - Simulation execution → visualization rendering
   - Accessibility → keyboard navigation

5. **Update agent file incrementally**:
   - Create CLAUDE.md with project context
   - Include tech stack, component structure
   - Add VRAM calculation domain knowledge
   - Keep under 150 lines for efficiency

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Task Derivation Matrix
*Clear mapping from requirements to implementation files for task generation*

### Functional Requirements → Implementation Tasks

| FR ID | Requirement | Primary File | Supporting Files | Reference |
|-------|-------------|--------------|------------------|-----------|
| FR-001 | Load model specs from JSON | `src/services/modelService.ts` | `contracts/model-schema.json` | data-model.md L287 |
| FR-002 | Model selection UI | `src/components/ModelSelector/` | `contracts/types.ts` L10-63 | quickstart.md L256 |
| FR-003 | Predefined workload types | `src/data/workloads.ts` | `contracts/types.ts` L70-88 | data-model.md L70 |
| FR-004 | Drag-drop workload config | `src/components/WorkloadConfigurator/` | React DnD integration | research.md L33 |
| FR-005 | Percentage sliders | `src/components/PercentageSlider/` | `contracts/validation.ts` L336 | quickstart.md L285 |
| FR-006 | Remaining percentage display | Integrated in WorkloadConfigurator | Validation logic | data-model.md L104 |
| FR-007 | Predefined profiles | `src/data/profiles.ts` | `contracts/types.ts` L116-144 | data-model.md L116 |
| FR-008 | Simulation controls | `src/components/SimulationControls/` | `contracts/types.ts` L152-182 | quickstart.md L313 |
| FR-009 | KVCache calculation | `src/services/vramCalculator.ts` | Formula implementation | research.md L20 |
| FR-010 | VRAM simulation | `src/services/vramCalculator.ts` | `simulateUsageOverTime()` | data-model.md L296 |
| FR-011 | Max VRAM determination | `src/services/vramCalculator.ts` | Result processing | data-model.md L250 |
| FR-012 | Time-based visualization | `src/components/VRAMChart/` | Recharts integration | research.md L52 |
| FR-013 | Color coding by workload | `src/utils/chartUtils.ts` | Color palette | research.md L78 |
| FR-014 | Max VRAM prominence | `src/components/ResultsSummary/` | Material UI display | quickstart.md L364 |
| FR-015 | Percentage validation | `src/utils/validation.ts` | Zod schemas | contracts/validation.ts L398 |

### Component Dependency Graph

```
Types (contracts/types.ts) → All Components
  ↓
Services Layer:
  ├── modelService.ts (FR-001) → ModelSelector
  ├── vramCalculator.ts (FR-009,010,011) → SimulationControls, VRAMChart, ResultsSummary  
  └── validationService.ts (FR-015) → All input components
  ↓
UI Components (can be built in parallel [P]):
  ├── ModelSelector [P] → depends on modelService
  ├── WorkloadConfigurator [P] → depends on validationService
  ├── PercentageSlider [P] → depends on validationService
  ├── SimulationControls [P] → depends on vramCalculator
  ├── VRAMChart [P] → depends on vramCalculator
  └── ResultsSummary [P] → depends on vramCalculator
  ↓
App Integration → State management → Final assembly
```

### Calculation Engine Task Breakdown

Based on research.md formulas and data-model.md implementation:

1. **Base Memory Calculation** (research.md L19)
   - Task: Implement `calculateBaseMemory(model: Model): number`
   - Formula: `Parameters × Precision × 1.2`
   - File: `src/services/vramCalculator.ts`

2. **KV-Cache Calculation** (research.md L20)
   - Task: Implement `calculateKVCache(model, seqLen, batchSize): number`
   - Formula: `2 × Layers × Hidden_Size × Sequence_Length × Batch_Size × Precision`
   - File: `src/services/vramCalculator.ts`

3. **Activation Memory** (research.md L21)
   - Task: Implement `calculateActivations(model, seqLen, batchSize): number`
   - Formula: `Hidden_Size × Sequence_Length × Batch_Size × Precision × 4`
   - File: `src/services/vramCalculator.ts`

4. **Time-based Simulation** (data-model.md L296)
   - Task: Implement `simulateUsageOverTime(model, slots, period): VRAMUsagePoint[]`
   - Logic: Request distribution + concurrent user modeling
   - File: `src/services/vramCalculator.ts`

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

- Load `/templates/tasks-template.md` as base
- Use Task Derivation Matrix above to generate specific tasks
- Each matrix row → test + implementation task pair
- Component tasks marked [P] for parallel execution
- Service tasks sequential due to shared calculator engine

**Ordering Strategy**:
1. **Setup Tasks**: Project init, dependencies, TypeScript config
2. **Contract Tasks [P]**: Type definitions, validation schemas, JSON schemas  
3. **Service Tests**: Calculator tests (must fail first - TDD)
4. **Service Implementation**: Sequential calculator methods
5. **Component Tests [P]**: All component tests in parallel
6. **Component Implementation [P]**: All components in parallel
7. **Integration Tasks**: State management, routing, final assembly
8. **Polish Tasks [P]**: Accessibility, performance, documentation

**Task File Mapping**:
```
T001-T005: Setup (package.json, tsconfig.json, vite.config.ts)
T006-T010: Contracts (contracts/ → src/types/)
T011-T015: Service tests (tests/unit/vramCalculator.test.ts)
T016-T020: Service implementation (src/services/vramCalculator.ts)
T021-T026: Component tests [P] (tests/unit/components/)
T027-T032: Component implementation [P] (src/components/)
T033-T036: Integration (src/contexts/, src/App.tsx)
T037-T040: Polish [P] (accessibility, performance, docs)
```

**Estimated Output**: 40-45 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Implementation Checklist
*Traceable verification points linking design to implementation*

### Core Services Implementation
- [ ] **VRAM Calculator Service** (`src/services/vramCalculator.ts`)
  - [ ] Base memory formula (research.md L19): `Parameters × Precision × 1.2` 
  - [ ] KV-cache formula (research.md L20): `2 × Layers × Hidden_Size × Seq_Len × Batch × Precision`
  - [ ] Activation formula (research.md L21): `Hidden_Size × Seq_Len × Batch × Precision × 4`
  - [ ] Simulation algorithm (data-model.md L296): `simulateUsageOverTime()` implementation
  - [ ] Precision bytes mapping (contracts/types.ts L289-294): FP32=4, FP16=2, INT8=1, INT4=0.5

- [ ] **Model Service** (`src/services/modelService.ts`)
  - [ ] JSON loader conforming to contracts/model-schema.json
  - [ ] Model validation using contracts/validation.ts L336-394
  - [ ] Type compliance with contracts/types.ts L10-63

- [ ] **Validation Service** (`src/utils/validation.ts`)
  - [ ] Workload slot validation (contracts/validation.ts L398-436)
  - [ ] Percentage sum validation: total must equal 100%
  - [ ] Simulation period validation (data-model.md L177-181)

### Component Implementation Verification
- [ ] **ModelSelector** (`src/components/ModelSelector/`)
  - [ ] Props interface matches contracts/types.ts L233-239
  - [ ] Autocomplete using Material UI per research.md L72
  - [ ] Accessibility labels per quickstart.md L441-443

- [ ] **WorkloadConfigurator** (`src/components/WorkloadConfigurator/`)
  - [ ] Drag-drop using React DnD (research.md L33-42)
  - [ ] Props interface matches contracts/types.ts L241-250
  - [ ] Keyboard navigation fallback (research.md L39-42)
  - [ ] 5-slot constraint enforcement (data-model.md L104-108)

- [ ] **PercentageSlider** (`src/components/PercentageSlider/`)
  - [ ] Props interface matches contracts/types.ts L252-260
  - [ ] Remaining percentage display (FR-006)
  - [ ] Material UI Slider component (research.md L72)
  - [ ] Real-time validation feedback

- [ ] **SimulationControls** (`src/components/SimulationControls/`)
  - [ ] Props interface matches contracts/types.ts L262-268
  - [ ] Time unit conversion (data-model.md L157-162)
  - [ ] Request pattern selection (data-model.md L163-168)
  - [ ] Constraint validation (data-model.md L173-181)

- [ ] **VRAMChart** (`src/components/VRAMChart/`)
  - [ ] Props interface matches contracts/types.ts L270-278
  - [ ] Recharts stacked area implementation (research.md L52-62)
  - [ ] Color coding by workload type (FR-013)
  - [ ] Accessibility: ARIA labels and keyboard navigation

- [ ] **ResultsSummary** (`src/components/ResultsSummary/`)
  - [ ] Props interface matches contracts/types.ts L280-286
  - [ ] Prominent max VRAM display (FR-014)
  - [ ] GPU recommendations generation
  - [ ] Export functionality (JSON, CSV, PNG)

### State Management Verification
- [ ] **React Context Setup** (research.md L132-154)
  - [ ] AppState interface implementation (data-model.md L226-234)
  - [ ] Context organization: Model, Workload, Simulation, UI
  - [ ] Reducer pattern for complex state updates

### Testing Implementation
- [ ] **Unit Tests** (quickstart.md L256-280)
  - [ ] Calculator service tests with known inputs/outputs
  - [ ] Component prop validation tests
  - [ ] Validation function tests

- [ ] **Integration Tests** (quickstart.md L282-299)
  - [ ] Complete user workflows: model → workload → simulation → results
  - [ ] State management integration tests
  - [ ] Error boundary testing

- [ ] **Accessibility Tests** (quickstart.md L301-312)
  - [ ] axe-core integration for WCAG 2.1 AA compliance
  - [ ] Keyboard navigation testing
  - [ ] Screen reader compatibility verification

### Performance & Polish
- [ ] **Performance Optimization** (research.md L99-122)
  - [ ] useMemo for expensive calculations (research.md L113)
  - [ ] React.memo for component memoization (research.md L106)
  - [ ] Lazy loading for charts (research.md L107)
  - [ ] Bundle size analysis and optimization

- [ ] **Material UI Theming** (research.md L72-95)
  - [ ] Professional color palette: blue primary, orange accent
  - [ ] Typography hierarchy with Roboto font
  - [ ] Consistent spacing (8px base unit)
  - [ ] Dark mode support with automatic contrast

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (React components, calculation engine, testing)
**Phase 5**: Validation (test suite, accessibility audit, performance metrics)

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

No violations identified - project follows constitutional principles:

- Single React application with component-based architecture
- Direct framework usage without unnecessary abstractions
- Test-driven development with real dependencies
- Type-safe implementation with strict TypeScript

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Based on Constitution v1.0.0 - See `/memory/constitution.md`*