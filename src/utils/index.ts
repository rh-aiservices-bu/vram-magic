// Barrel export for utility functions
export * from './validation'
export * from './chartUtils'
export * from './performance'

// Note: stateUtils.ts contains legacy utility functions that are not currently used
// The main app uses AppContext with its own reducer instead of stateReducer
// These exports have been commented out to prevent accidental usage
// export {
//   createInitialState,
//   stateReducer,
//   persistState,
//   loadPersistedState,
//   hasErrors as hasStateErrors,
//   isReadyForSimulation,
//   getTotalWorkloadPercentage,
//   getValidationErrors,
//   isLoading,
//   getAllErrors,
//   StateActionType,
//   actionCreators,
// } from './stateUtils'
