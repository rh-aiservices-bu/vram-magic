import { createContext, ReactNode, useMemo, useCallback, useEffect, useState } from 'react'
import type { UserPreferences, Notification, UIContextValue, ThemeConfig } from '../types/contexts'
import { useAppContext } from '../hooks/useAppContext'
import { actionCreators } from './appActions'

const UIContext = createContext<UIContextValue | undefined>(undefined)

// ============================================================================
// Provider Component
// ============================================================================

interface UIProviderProps {
  children: ReactNode
}

function UIProvider({ children }: UIProviderProps) {
  const { state, dispatch } = useAppContext()
  const { ui } = state

  // Track system theme preference with state to control updates
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  // Listen for system theme changes only when in auto mode
  useEffect(() => {
    if (ui.preferences.theme === 'auto' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = (e: MediaQueryListEvent) => {
        setSystemPrefersDark(e.matches)
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [ui.preferences.theme])

  // Determine if dark mode should be active - memoized
  const isDarkMode = useMemo(() => {
    if (ui.preferences.theme === 'auto') {
      return systemPrefersDark
    }
    return ui.preferences.theme === 'dark'
  }, [ui.preferences.theme, systemPrefersDark])

  // Theme configuration - memoized
  const theme: ThemeConfig = useMemo(
    () => ({
      mode: ui.preferences.theme,
      primaryColor: isDarkMode ? '#90caf9' : '#1976d2',
      secondaryColor: isDarkMode ? '#f48fb1' : '#dc004e',
    }),
    [ui.preferences.theme, isDarkMode]
  )

  // Action implementations - memoized to prevent recreation on every render
  const setLoading = useCallback(
    (loading: boolean) => {
      dispatch(actionCreators.setLoading(loading))
    },
    [dispatch]
  )

  const setError = useCallback(
    (error: string | null) => {
      dispatch(actionCreators.setError(error))
    },
    [dispatch]
  )

  const clearError = useCallback(() => {
    dispatch(actionCreators.setError(null))
  }, [dispatch])

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp'>) => {
      const fullNotification: Notification = {
        ...notification,
        id: `notification-${crypto.randomUUID()}`,
        timestamp: Date.now(),
      }
      dispatch(actionCreators.addNotification(fullNotification))
    },
    [dispatch]
  )

  const removeNotification = useCallback(
    (id: string) => {
      dispatch(actionCreators.removeNotification(id))
    },
    [dispatch]
  )

  const clearNotifications = useCallback(() => {
    dispatch(actionCreators.clearNotifications())
  }, [dispatch])

  const updatePreferences = useCallback(
    (preferences: Partial<UserPreferences>) => {
      dispatch(actionCreators.updatePreferences(preferences))
    },
    [dispatch]
  )

  const toggleTheme = useCallback(() => {
    const newTheme = isDarkMode ? 'light' : 'dark'
    updatePreferences({ theme: newTheme })
  }, [isDarkMode, updatePreferences])

  const setTheme = useCallback(
    (theme: 'light' | 'dark' | 'auto') => {
      updatePreferences({ theme })
    },
    [updatePreferences]
  )

  const setChartType = useCallback(
    (chartType: 'area' | 'bar') => {
      updatePreferences({ chartType })
    },
    [updatePreferences]
  )

  const toggleTooltips = useCallback(() => {
    updatePreferences({ showTooltips: !ui.preferences.showTooltips })
  }, [updatePreferences, ui.preferences.showTooltips])

  const toggleAnimations = useCallback(() => {
    updatePreferences({ animationsEnabled: !ui.preferences.animationsEnabled })
  }, [updatePreferences, ui.preferences.animationsEnabled])

  const toggleAccessibilityMode = useCallback(() => {
    updatePreferences({ accessibilityMode: !ui.preferences.accessibilityMode })

    // Show confirmation
    addNotification({
      type: 'info',
      message: `Accessibility mode ${!ui.preferences.accessibilityMode ? 'enabled' : 'disabled'}`,
      autoClose: true,
    })
  }, [updatePreferences, ui.preferences.accessibilityMode, addNotification])

  // Convenience methods for common notifications
  const showSuccess = useCallback(
    (message: string, autoClose: boolean = true) => {
      addNotification({
        type: 'success',
        message,
        autoClose,
      })
    },
    [addNotification]
  )

  const showError = useCallback(
    (message: string, autoClose: boolean = false) => {
      addNotification({
        type: 'error',
        message,
        autoClose,
      })
    },
    [addNotification]
  )

  const showWarning = useCallback(
    (message: string, autoClose: boolean = true) => {
      addNotification({
        type: 'warning',
        message,
        autoClose,
      })
    },
    [addNotification]
  )

  const showInfo = useCallback(
    (message: string, autoClose: boolean = true) => {
      addNotification({
        type: 'info',
        message,
        autoClose,
      })
    },
    [addNotification]
  )

  const value: UIContextValue = useMemo(
    () => ({
      // State
      isLoading: ui.loading,
      error: ui.error,
      notifications: ui.notifications,
      preferences: ui.preferences,

      // Theme
      theme,
      isDarkMode,

      // Actions
      setLoading,
      setError,
      clearError,
      addNotification,
      removeNotification,
      clearNotifications,
      updatePreferences,
      toggleTheme,
      setTheme,
      setChartType,
      toggleTooltips,
      toggleAnimations,
      toggleAccessibilityMode,
      showSuccess,
      showError,
      showWarning,
      showInfo,
    }),
    [
      ui.loading,
      ui.error,
      ui.preferences,
      theme,
      isDarkMode,
      setLoading,
      setError,
      clearError,
      addNotification,
      removeNotification,
      clearNotifications,
      updatePreferences,
      toggleTheme,
      setTheme,
      setChartType,
      toggleTooltips,
      toggleAnimations,
      toggleAccessibilityMode,
      showSuccess,
      showError,
      showWarning,
      showInfo,
    ]
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

// ============================================================================
// Hook
// ============================================================================

export { UIProvider, UIContext }
