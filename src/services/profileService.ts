// VRAM Magic: Profile Management Service
// CRUD operations for workload profiles with localStorage persistence

import type { WorkloadSlot } from '../types'
import { DEMO_PROFILES } from '../data/demo-profiles'
import type { DemoProfile } from '../data/demo-profiles'

// ============================================================================
// Profile Service Types
// ============================================================================

export interface WorkloadProfile {
  id: string
  name: string
  description: string
  category: string
  workloadSlots: WorkloadSlot[]
  tags: string[]
  useCase: string
  targetAudience: string[]
  createdAt: Date
  updatedAt: Date
  isCustom: boolean // true for user-created profiles
}

export interface ProfileServiceResult<T = WorkloadProfile[]> {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// Profile Service Implementation
// ============================================================================

export class ProfileService {
  private readonly STORAGE_KEY = 'vram-magic-profiles'
  private readonly VERSION_KEY = 'vram-magic-profiles-version'
  private readonly CURRENT_VERSION = '1.0.0'

  /**
   * Load all profiles from localStorage with fallback to demo profiles
   * @returns Array of all profiles (demo + custom)
   */
  loadProfiles(): ProfileServiceResult<WorkloadProfile[]> {
    try {
      // Check version compatibility
      const storedVersion = localStorage.getItem(this.VERSION_KEY)
      if (storedVersion && storedVersion !== this.CURRENT_VERSION) {
        console.warn(`Profile version mismatch: ${storedVersion} vs ${this.CURRENT_VERSION}`)
        // Could implement migration logic here if needed
      }

      const stored = localStorage.getItem(this.STORAGE_KEY)
      const customProfiles: WorkloadProfile[] = stored ? JSON.parse(stored) : []

      // Convert demo profiles to WorkloadProfile format
      const demoProfiles: WorkloadProfile[] = DEMO_PROFILES.map(this.convertDemoToProfile)

      // Combine demo and custom profiles
      const allProfiles = [...demoProfiles, ...customProfiles]

      return {
        success: true,
        data: allProfiles,
      }
    } catch (error) {
      console.error('Failed to load profiles:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error loading profiles',
        data: DEMO_PROFILES.map(this.convertDemoToProfile), // Fallback to demo profiles
      }
    }
  }

  /**
   * Save a new profile or update existing one
   * @param profile - Profile to save
   * @returns Success result with saved profile
   */
  saveProfile(
    profile: Omit<WorkloadProfile, 'createdAt' | 'updatedAt'>
  ): ProfileServiceResult<WorkloadProfile> {
    try {
      const now = new Date()
      const customProfiles = this.loadCustomProfiles()

      // Check if profile exists
      const existingIndex = customProfiles.findIndex(p => p.id === profile.id)

      const fullProfile: WorkloadProfile = {
        ...profile,
        createdAt: existingIndex >= 0 ? customProfiles[existingIndex].createdAt : now,
        updatedAt: now,
        isCustom: true,
      }

      if (existingIndex >= 0) {
        // Update existing profile
        customProfiles[existingIndex] = fullProfile
      } else {
        // Add new profile
        customProfiles.push(fullProfile)
      }

      // Save to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(customProfiles))
      localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION)

      return {
        success: true,
        data: fullProfile,
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving profile',
      }
    }
  }

  /**
   * Delete a profile by ID (only custom profiles can be deleted)
   * @param id - Profile ID to delete
   * @returns Success result
   */
  deleteProfile(id: string): ProfileServiceResult<boolean> {
    try {
      const customProfiles = this.loadCustomProfiles()
      const profileIndex = customProfiles.findIndex(p => p.id === id)

      if (profileIndex === -1) {
        return {
          success: false,
          error: 'Profile not found or cannot be deleted',
        }
      }

      // Check if it's a demo profile (shouldn't be deletable)
      if (!customProfiles[profileIndex].isCustom) {
        return {
          success: false,
          error: 'Demo profiles cannot be deleted',
        }
      }

      // Remove the profile
      customProfiles.splice(profileIndex, 1)

      // Save updated list
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(customProfiles))

      return {
        success: true,
        data: true,
      }
    } catch (error) {
      console.error('Failed to delete profile:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error deleting profile',
      }
    }
  }

  /**
   * Duplicate a profile with a new ID and name
   * @param sourceId - ID of profile to duplicate
   * @param newName - Name for the duplicated profile
   * @returns Success result with new profile
   */
  duplicateProfile(sourceId: string, newName: string): ProfileServiceResult<WorkloadProfile> {
    try {
      const allProfiles = this.loadProfiles()
      if (!allProfiles.success || !allProfiles.data) {
        return {
          success: false,
          error: 'Failed to load profiles for duplication',
        }
      }

      const sourceProfile = allProfiles.data.find(p => p.id === sourceId)
      if (!sourceProfile) {
        return {
          success: false,
          error: 'Source profile not found',
        }
      }

      // Create new profile with unique ID
      const newId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const duplicatedProfile: Omit<WorkloadProfile, 'createdAt' | 'updatedAt'> = {
        ...sourceProfile,
        id: newId,
        name: newName,
        description: `Copy of ${sourceProfile.name}`,
        category: 'custom',
        isCustom: true,
      }

      return this.saveProfile(duplicatedProfile)
    } catch (error) {
      console.error('Failed to duplicate profile:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error duplicating profile',
      }
    }
  }

  /**
   * Get a specific profile by ID
   * @param id - Profile ID
   * @returns Profile or null if not found
   */
  getProfileById(id: string): WorkloadProfile | null {
    const result = this.loadProfiles()
    if (!result.success || !result.data) {
      return null
    }

    return result.data.find(p => p.id === id) || null
  }

  /**
   * Clear all custom profiles (keep demo profiles)
   * @returns Success result
   */
  clearCustomProfiles(): ProfileServiceResult<boolean> {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      localStorage.removeItem(this.VERSION_KEY)

      return {
        success: true,
        data: true,
      }
    } catch (error) {
      console.error('Failed to clear profiles:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error clearing profiles',
      }
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Load only custom profiles from localStorage
   * @returns Array of custom profiles
   */
  private loadCustomProfiles(): WorkloadProfile[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load custom profiles:', error)
      return []
    }
  }

  /**
   * Convert DemoProfile to WorkloadProfile format
   * @param demo - Demo profile to convert
   * @returns Converted WorkloadProfile
   */
  private convertDemoToProfile(demo: DemoProfile): WorkloadProfile {
    return {
      id: demo.id,
      name: demo.name,
      description: demo.description,
      category: demo.category,
      workloadSlots: demo.workloadSlots,
      tags: demo.tags,
      useCase: demo.useCase,
      targetAudience: demo.targetAudience,
      createdAt: new Date('2025-01-01'), // Demo profiles have fixed date
      updatedAt: new Date('2025-01-01'),
      isCustom: false,
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const profileService = new ProfileService()
export default profileService
