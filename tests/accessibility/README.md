# VRAM Magic Accessibility Tests

This directory contains comprehensive accessibility tests for the VRAM Magic application, ensuring WCAG 2.1 AA compliance across all components.

## Overview

The accessibility test suite provides thorough testing of:

- **Keyboard Navigation**: Tab order, focus management, and keyboard shortcuts
- **Screen Reader Support**: ARIA labels, live regions, and semantic HTML
- **Color Contrast**: WCAG AA compliance for all color combinations
- **Focus Management**: Visible focus indicators and logical focus flow
- **Form Accessibility**: Label associations, validation messages, and error handling
- **Interactive Elements**: Button states, tooltips, and user feedback

## Test Structure

### Core Files

- **`axe-setup.ts`**: Central configuration for axe-core and testing utilities
- **`index.test.ts`**: Test suite entry point and validation

### Component-Specific Tests

- **`ModelSelector.accessibility.test.tsx`**: Model selection dropdown accessibility
- **`WorkloadConfigurator.accessibility.test.tsx`**: Drag-drop interface with keyboard alternatives
- **`PercentageSlider.accessibility.test.tsx`**: Slider keyboard controls and ARIA support
- **`SimulationControls.accessibility.test.tsx`**: Form accessibility and validation
- **`VRAMChart.accessibility.test.tsx`**: Chart accessibility and data visualization
- **`ResultsSummary.accessibility.test.tsx`**: Results display and export functionality

### Cross-Component Tests

- **`ColorContrastAndFocus.accessibility.test.tsx`**: Comprehensive color contrast and focus management testing

## Testing Approach

### Axe-Core Integration

All tests use axe-core for automated accessibility testing:

```typescript
import { runAxeTest } from './axe-setup'

const { container } = renderWithAccessibility(<Component />)
await runAxeTest(container) // Automatically checks WCAG 2.1 AA rules
```

### Keyboard Navigation Testing

Each component is tested for complete keyboard accessibility:

```typescript
// Tab navigation
await user.tab()
expect(element).toHaveFocus()

// Arrow key navigation in dropdowns
await user.keyboard('{ArrowDown}')
await user.keyboard('{Enter}')

// Escape to close modals
await user.keyboard('{Escape}')
```

### Screen Reader Testing

Tests verify proper ARIA usage and screen reader announcements:

```typescript
// ARIA labels and descriptions
expect(element).toHaveAttribute('aria-label', 'Expected label')
expect(element).toHaveAttribute('aria-describedby', 'helper-text-id')

// Live region announcements
const announcements = getScreenReaderText(container)
expect(announcements).toContainEqual(expect.stringContaining('Expected announcement'))
```

### Focus Management

Tests ensure proper focus visibility and management:

```typescript
// Focus visibility
element.focus()
expect(element).toHaveFocus()
const computedStyle = window.getComputedStyle(element)
expect(computedStyle.visibility).not.toBe('hidden')

// Focus restoration after modal interactions
await user.keyboard('{Escape}')
expect(originalElement).toHaveFocus()
```

## Test Categories

### 1. Axe Core Compliance

- Automated WCAG 2.1 AA rule checking
- Color contrast validation
- Semantic HTML structure verification
- ARIA usage validation

### 2. Keyboard Navigation

- Tab order through all interactive elements
- Arrow key navigation in complex components
- Escape key handling for modal dismissal
- Enter/Space activation of buttons and controls

### 3. Screen Reader Support

- Proper ARIA labels and descriptions
- Live region announcements for dynamic content
- Semantic heading structure
- Form field associations

### 4. Focus Management

- Visible focus indicators on all interactive elements
- Logical focus order
- Focus trapping in modal dialogs
- Focus restoration after interactions

### 5. Form Accessibility

- Label associations with form controls
- Error message accessibility
- Validation feedback
- Helper text associations

### 6. Color and Visual Accessibility

- Color contrast ratio compliance
- No reliance on color alone for information
- Support for high contrast mode
- Reduced motion preferences

## Running Tests

### All Accessibility Tests

```bash
npm test -- tests/accessibility/
```

### Specific Component Tests

```bash
npm test -- tests/accessibility/ModelSelector.accessibility.test.tsx
npm test -- tests/accessibility/WorkloadConfigurator.accessibility.test.tsx
```

### Color Contrast Tests Only

```bash
npm test -- tests/accessibility/ColorContrastAndFocus.accessibility.test.tsx
```

### Watch Mode for Development

```bash
npm test -- tests/accessibility/ --watch
```

## Test Configuration

### Axe-Core Configuration

The test suite is configured for WCAG 2.1 AA compliance:

- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Focus Management**: All interactive elements must be focusable
- **ARIA Usage**: Proper ARIA labels, roles, and properties
- **Semantic HTML**: Appropriate use of headings, lists, and landmarks

### Custom Testing Utilities

- **`renderWithAccessibility`**: Renders components with proper theme and providers
- **`runAxeTest`**: Executes axe-core tests with project configuration
- **`getFocusableElements`**: Finds all keyboard-focusable elements
- **`getScreenReaderText`**: Extracts text from live regions and ARIA labels
- **`testKeyboardNavigation`**: Automated keyboard navigation testing

## Accessibility Standards

### WCAG 2.1 AA Compliance

All components must meet WCAG 2.1 Level AA standards:

- **Perceivable**: Information is presented in ways users can perceive
- **Operable**: UI components are operable by all users
- **Understandable**: Information and UI operation are understandable
- **Robust**: Content is robust enough for various assistive technologies

### Keyboard Support

All interactive elements support keyboard operation:

- **Tab Navigation**: Sequential keyboard navigation through all controls
- **Arrow Key Navigation**: Within composite controls like dropdowns and sliders
- **Enter/Space**: Activation of buttons and selection of options
- **Escape**: Dismissal of modal dialogs and menus

### Screen Reader Support

Full compatibility with screen reading software:

- **Semantic Structure**: Proper heading hierarchy and landmarks
- **ARIA Labels**: Descriptive labels for all interactive elements
- **Live Regions**: Dynamic content announcements
- **State Changes**: Notifications when component state changes

## Common Accessibility Patterns

### Dropdown/Combobox (ModelSelector)

```typescript
<input
  role="combobox"
  aria-expanded={isOpen}
  aria-haspopup="listbox"
  aria-describedby="helper-text"
  aria-label="Select model for VRAM calculation"
/>
<ul role="listbox" aria-label="Available models list">
  <li role="option" aria-label="Model description">
    Model Name
  </li>
</ul>
```

### Drag and Drop with Keyboard Alternative (WorkloadConfigurator)

```typescript
// Keyboard mode toggle
<Switch
  checked={keyboardMode}
  onChange={setKeyboardMode}
/>
{keyboardMode && (
  <Alert>
    Keyboard mode: Use Tab to navigate, Enter/Space to add workloads
  </Alert>
)}

// Drag-droppable items with keyboard support
<Card
  role="button"
  tabIndex={0}
  onKeyDown={handleKeyDown}
  aria-label="Drag to slot or press Enter to add"
/>
```

### Slider with ARIA Support (PercentageSlider)

```typescript
<Slider
  aria-labelledby="slider-label"
  aria-describedby="helper-text"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={value}
  aria-valuetext={`${value}%`}
/>
<div aria-live="polite" aria-atomic="true">
  {value}% selected, {remaining}% remaining
</div>
```

### Chart Accessibility (VRAMChart)

```typescript
<div
  role="img"
  aria-label="VRAM usage chart with 5 data points"
  tabIndex={0}
  onKeyDown={handleKeyDown}
>
  <ResponsiveContainer>
    {/* Chart content */}
  </ResponsiveContainer>

  {/* Screen reader data table alternative */}
  <div aria-live="polite" className="sr-only">
    Chart contains 5 time points showing VRAM usage breakdown...
  </div>
</div>
```

## Troubleshooting

### Common Test Failures

1. **Color Contrast Failures**
   - Check theme colors meet WCAG AA standards
   - Verify disabled states have sufficient contrast
   - Test both light and dark themes

2. **Missing ARIA Labels**
   - Add descriptive aria-label attributes
   - Associate form controls with labels
   - Provide aria-describedby for additional context

3. **Focus Management Issues**
   - Ensure all interactive elements are focusable
   - Verify focus indicators are visible
   - Test focus restoration after modal interactions

4. **Keyboard Navigation Problems**
   - Check tab order is logical
   - Verify arrow keys work in complex controls
   - Test Escape key handling

### Debugging Tips

- Use browser dev tools accessibility inspector
- Test with actual screen readers when possible
- Verify keyboard-only navigation works completely
- Check color contrast with browser tools or online checkers

## Continuous Integration

These accessibility tests are designed to run in CI/CD pipelines:

- Fast execution with automated axe-core checking
- Comprehensive coverage of all interactive elements
- Clear failure messages for quick debugging
- Parallel test execution support

The test suite ensures that accessibility is maintained as the application evolves, preventing regression and ensuring all users can effectively use the VRAM Magic application.
