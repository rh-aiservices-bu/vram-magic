import React from 'react'
import { render } from '@testing-library/react'
import type { RenderOptions } from './exports'
import { TestWrapper } from './testUtils'

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  darkMode?: boolean
}

export const renderWithProviders = (ui: React.ReactElement, options: CustomRenderOptions = {}) => {
  const { darkMode, ...renderOptions } = options

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestWrapper darkMode={darkMode}>{children}</TestWrapper>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}
