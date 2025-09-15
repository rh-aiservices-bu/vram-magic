// Export testing utilities that are not React components
export * from '@testing-library/react'
export { userEvent } from '@testing-library/user-event'
export { vi } from 'vitest'

// Re-export types and interfaces
import type { RenderOptions } from '@testing-library/react'
export type { RenderOptions }
