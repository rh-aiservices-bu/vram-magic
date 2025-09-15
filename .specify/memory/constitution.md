# VRAM Magic Constitution

## Core Principles

### I. Component-First Architecture
All UI functionality must be built as reusable React components; Components must be self-contained with clear props interfaces; Each component must have a single responsibility and be independently testable

### II. Type Safety (NON-NEGOTIABLE)
TypeScript strict mode must be enabled; All props, state, and function signatures must be explicitly typed; No `any` types allowed without explicit justification and approval

### III. Build Optimization
Bundle size must be monitored and optimized; Code splitting must be implemented for routes; Assets must be optimized for production deployment

### IV. Testing Standards
All components must have unit tests; Critical user flows must have integration tests; Accessibility compliance must be tested

### V. Accessibility First
WCAG 2.1 AA compliance is mandatory; Semantic HTML must be used; Keyboard navigation must be fully supported; Screen reader compatibility required

## Technology Stack

- React 18+ with functional components and hooks
- TypeScript 5+ with strict configuration
- Vite for build tooling and development server
- Vitest for unit testing
- ESLint and Prettier for code quality
- Modern CSS (CSS Modules or styled-components)

## Development Workflow

### Build Requirements
- `npm run build` must succeed without warnings
- `npm run type-check` must pass
- `npm run lint` must pass
- `npm run test` must achieve 80%+ coverage

### Code Standards
- All files must be formatted with Prettier
- ESLint rules must be followed
- Git commits must follow conventional commit format
- Branch protection requires PR reviews

## Governance

This constitution supersedes all other development practices; Changes require team approval and documentation; All deployments must pass build pipeline validation

**Version**: 1.0.0 | **Ratified**: 2025-09-15 | **Last Amended**: 2025-09-15