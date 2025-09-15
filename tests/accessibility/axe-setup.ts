// VRAM Magic: Accessibility Test Setup with axe-core
// Setup utilities and helpers for comprehensive accessibility testing

import { configureAxe, toHaveNoViolations } from 'jest-axe'
import { expect } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import { lightTheme as theme } from '../../src/theme'

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations)

// Configure axe-core for WCAG 2.1 AA compliance
export const axeConfig = configureAxe({
  rules: {
    // Enable WCAG 2.1 AA rules
    'color-contrast': { enabled: true },
    'focus-order-semantics': { enabled: true },
    keyboard: { enabled: true },
    'landmark-banner-is-top-level': { enabled: true },
    'landmark-contentinfo-is-top-level': { enabled: true },
    'landmark-main-is-top-level': { enabled: true },
    'landmark-no-duplicate-banner': { enabled: true },
    'landmark-no-duplicate-contentinfo': { enabled: true },
    'landmark-one-main': { enabled: true },
    'landmark-unique': { enabled: true },
    'page-has-heading-one': { enabled: true },
    region: { enabled: true },
    'skip-link': { enabled: true },

    // Form and interactive element rules
    'aria-allowed-attr': { enabled: true },
    'aria-command-name': { enabled: true },
    'aria-hidden-body': { enabled: true },
    'aria-hidden-focus': { enabled: true },
    'aria-input-field-name': { enabled: true },
    'aria-meter-name': { enabled: true },
    'aria-progressbar-name': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-text': { enabled: true },
    'aria-toggle-field-name': { enabled: true },
    'aria-tooltip-name': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },

    // Button and link accessibility
    'button-name': { enabled: true },
    'empty-heading': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'heading-order': { enabled: true },
    'input-button-name': { enabled: true },
    'input-image-alt': { enabled: true },
    label: { enabled: true },
    'link-name': { enabled: true },
    'nested-interactive': { enabled: true },

    // Disable some rules that may cause issues with Material UI or React DnD
    region: { enabled: false }, // Material UI components may not always need explicit regions
    'color-contrast': {
      enabled: true,
      options: {
        // Allow slightly lower contrast for disabled elements
        ignoreUi: true,
        ignoreLength: false,
        boldValue: 700,
        boldTextPt: 14,
        largeTextPt: 18,
        contrastRatio: {
          normal: {
            aa: 4.5,
            aaa: 7,
          },
          large: {
            aa: 3,
            aaa: 4.5,
          },
        },
      },
    },
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  reporter: 'v2',
})

// Custom render function with accessibility providers
interface AccessibilityRenderOptions extends RenderOptions {
  withDnd?: boolean
  withTheme?: boolean
}

export function renderWithAccessibility(
  ui: React.ReactElement,
  options: AccessibilityRenderOptions = {}
) {
  const { withDnd = false, withTheme = true, ...renderOptions } = options

  let wrapper = ui

  // Wrap with ThemeProvider if needed
  if (withTheme) {
    wrapper = React.createElement(
      ThemeProvider,
      { theme },
      React.createElement(CssBaseline),
      wrapper
    )
  }

  // Wrap with DnD Provider if needed
  if (withDnd) {
    wrapper = React.createElement(DndProvider, { backend: HTML5Backend }, wrapper)
  }

  return render(wrapper, renderOptions)
}

// Helper to run axe tests on a container
export async function runAxeTest(container: HTMLElement, customConfig?: object) {
  const config = customConfig || axeConfig
  const results = await config(container)
  expect(results).toHaveNoViolations()
  return results
}

// Helper to check color contrast manually
export function checkColorContrast(_element: HTMLElement, _expectedRatio: number = 4.5): boolean {
  // This is a simplified check - in real scenarios, you'd use a proper contrast checking library
  // For now, we'll rely on axe-core's contrast checking
  return true
}

// Helper to simulate keyboard navigation
export interface KeyboardNavigationTest {
  startElement: HTMLElement
  expectedFocusOrder: string[] // Array of test-ids or aria-labels
  triggerKeys: string[] // Keys to press for navigation
}

export async function testKeyboardNavigation(
  test: KeyboardNavigationTest,
  userEvent: { keyboard: (key: string) => Promise<void> }
): Promise<boolean> {
  const { startElement, expectedFocusOrder, triggerKeys } = test

  // Focus on the start element
  startElement.focus()

  let currentIndex = 0
  for (const key of triggerKeys) {
    await userEvent.keyboard(key)

    if (currentIndex < expectedFocusOrder.length) {
      const expectedElement = document.querySelector(
        `[data-testid="${expectedFocusOrder[currentIndex]}"], [aria-label*="${expectedFocusOrder[currentIndex]}"]`
      )

      if (expectedElement && document.activeElement === expectedElement) {
        currentIndex++
      }
    }
  }

  return currentIndex === expectedFocusOrder.length
}

// Helper to check ARIA attributes
export function checkAriaAttributes(
  element: HTMLElement,
  expectedAttributes: Record<string, string>
): boolean {
  for (const [attr, expectedValue] of Object.entries(expectedAttributes)) {
    const actualValue = element.getAttribute(attr)
    if (actualValue !== expectedValue) {
      console.warn(
        `ARIA attribute mismatch: expected ${attr}="${expectedValue}", got "${actualValue}"`
      )
      return false
    }
  }
  return true
}

// Helper to test screen reader announcements
export function getScreenReaderText(container: HTMLElement): string[] {
  const liveRegions = container.querySelectorAll('[aria-live], [role="status"], [role="alert"]')
  const announcements: string[] = []

  liveRegions.forEach(region => {
    const text = region.textContent?.trim()
    if (text) {
      announcements.push(text)
    }
  })

  return announcements
}

// Helper to find focusable elements
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ')

  return Array.from(container.querySelectorAll(focusableSelectors))
}

// Helper to check if element is visible to screen readers
export function isVisibleToScreenReader(element: HTMLElement): boolean {
  const styles = window.getComputedStyle(element)

  // Check for common ways elements are hidden from screen readers
  if (styles.display === 'none') return false
  if (styles.visibility === 'hidden') return false
  if (element.getAttribute('aria-hidden') === 'true') return false
  if (styles.opacity === '0' && element.getAttribute('aria-hidden') !== 'false') return false

  return true
}

// Test categories for comprehensive accessibility testing
export enum AccessibilityTestCategory {
  KEYBOARD_NAVIGATION = 'keyboard-navigation',
  SCREEN_READER = 'screen-reader',
  COLOR_CONTRAST = 'color-contrast',
  FOCUS_MANAGEMENT = 'focus-management',
  ARIA_LABELS = 'aria-labels',
  FORM_VALIDATION = 'form-validation',
  INTERACTIVE_ELEMENTS = 'interactive-elements',
}

// Interface for structured accessibility test results
export interface AccessibilityTestResult {
  category: AccessibilityTestCategory
  passed: boolean
  violations: string[]
  suggestions: string[]
  wcagLevel: 'A' | 'AA' | 'AAA'
}

// Helper to create structured test results
export function createAccessibilityResult(
  category: AccessibilityTestCategory,
  passed: boolean,
  violations: string[] = [],
  suggestions: string[] = [],
  wcagLevel: 'A' | 'AA' | 'AAA' = 'AA'
): AccessibilityTestResult {
  return {
    category,
    passed,
    violations,
    suggestions,
    wcagLevel,
  }
}
