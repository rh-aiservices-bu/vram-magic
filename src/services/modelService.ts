// VRAM Magic: Model Service
// Loads and manages model configurations from JSON files

import type { Model } from '../types'
import { ModelSchema } from '../utils/validation'

/**
 * Service for loading and managing model configurations
 */
export class ModelService {
  private models: Map<string, Model> = new Map()
  private loaded: boolean = false
  private loadingPromise: Promise<void> | null = null

  /**
   * Load all models from the public/models/ directory
   * @returns Promise that resolves when all models are loaded
   */
  public async loadModels(): Promise<void> {
    if (this.loaded) {
      return
    }

    if (this.loadingPromise) {
      return this.loadingPromise
    }

    this.loadingPromise = this._loadModelsInternal()
    return this.loadingPromise
  }

  private async _loadModelsInternal(): Promise<void> {
    try {
      // List of known model files (in a real app, this could be dynamic)
      const modelFiles = [
        'llama-2-7b.json',
        'gpt-3.5-turbo.json',
        'claude-3-sonnet.json',
        'gpt-4.json',
        'claude-3-opus.json',
        'claude-3-haiku.json',
        'mistral-7b.json',
        'falcon-40b.json',
        'vicuna-13b.json',
        'alpaca-7b.json',
        'dolly-12b.json',
        'codegen-16b.json',
        'bloom-176b.json',
      ]

      const loadPromises = modelFiles.map(filename => this.loadModelFile(filename))
      await Promise.allSettled(loadPromises)

      this.loaded = true
    } catch (error) {
      console.error('Failed to load models:', error)
      throw new Error('Failed to load model configurations')
    }
  }

  /**
   * Load a single model file and validate it
   * @param filename - Model filename in public/models/
   * @returns Promise that resolves to the loaded model or null if failed
   */
  private async loadModelFile(filename: string): Promise<Model | null> {
    try {
      const response = await fetch(`/models/${filename}`)
      if (!response.ok) {
        console.warn(`Failed to load model file: ${filename} (${response.status})`)
        return null
      }

      const modelData = await response.json()

      // Validate using Zod schema
      const parseResult = ModelSchema.safeParse(modelData)

      if (!parseResult.success) {
        console.error(`Invalid model data in ${filename}:`, parseResult.error.errors)
        return null
      }

      const model = parseResult.data
      this.models.set(model.id, model)
      console.log(`Loaded model: ${model.name} (${model.id})`)
      return model
    } catch (error) {
      console.error(`Error loading model file ${filename}:`, error)
      return null
    }
  }

  /**
   * Get all loaded models
   * @returns Array of all loaded models
   */
  public async getAllModels(): Promise<Model[]> {
    await this.loadModels()
    return Array.from(this.models.values())
  }

  /**
   * Get a specific model by ID
   * @param modelId - Model identifier
   * @returns Model if found, null otherwise
   */
  public async getModelById(modelId: string): Promise<Model | null> {
    await this.loadModels()
    return this.models.get(modelId) || null
  }

  /**
   * Get models by parameter count range
   * @param minParams - Minimum parameter count
   * @param maxParams - Maximum parameter count
   * @returns Array of models within the parameter range
   */
  public async getModelsByParameterRange(minParams: number, maxParams: number): Promise<Model[]> {
    await this.loadModels()
    return Array.from(this.models.values()).filter(
      model => model.parameters >= minParams && model.parameters <= maxParams
    )
  }

  /**
   * Get models that fit within a VRAM constraint
   * @param maxVRAMGB - Maximum VRAM in GB
   * @returns Array of models that fit within the constraint
   */
  public async getModelsByVRAMConstraint(maxVRAMGB: number): Promise<Model[]> {
    await this.loadModels()
    const maxVRAMMB = maxVRAMGB * 1024

    return Array.from(this.models.values()).filter(
      model => model.vramRequirements.baseVRAM <= maxVRAMMB
    )
  }

  /**
   * Search models by name or description
   * @param query - Search query
   * @returns Array of matching models
   */
  public async searchModels(query: string): Promise<Model[]> {
    await this.loadModels()
    const lowercaseQuery = query.toLowerCase()

    return Array.from(this.models.values()).filter(
      model =>
        model.name.toLowerCase().includes(lowercaseQuery) ||
        model.description.toLowerCase().includes(lowercaseQuery) ||
        model.metadata.organization.toLowerCase().includes(lowercaseQuery) ||
        model.metadata.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    )
  }

  /**
   * Get models by organization
   * @param organization - Organization name
   * @returns Array of models from the organization
   */
  public async getModelsByOrganization(organization: string): Promise<Model[]> {
    await this.loadModels()
    const lowercaseOrg = organization.toLowerCase()

    return Array.from(this.models.values()).filter(
      model => model.metadata.organization.toLowerCase() === lowercaseOrg
    )
  }

  /**
   * Get model statistics
   * @returns Statistics about loaded models
   */
  public async getModelStatistics(): Promise<{
    totalModels: number
    organizations: string[]
    parameterRanges: {
      smallest: number
      largest: number
      average: number
    }
    vramRanges: {
      smallest: number
      largest: number
      average: number
    }
  }> {
    await this.loadModels()
    const models = Array.from(this.models.values())

    if (models.length === 0) {
      return {
        totalModels: 0,
        organizations: [],
        parameterRanges: { smallest: 0, largest: 0, average: 0 },
        vramRanges: { smallest: 0, largest: 0, average: 0 },
      }
    }

    const parameters = models.map(m => m.parameters)
    const vramRequirements = models.map(m => m.vramRequirements.baseVRAM)
    const organizations = [...new Set(models.map(m => m.metadata.organization))]

    return {
      totalModels: models.length,
      organizations,
      parameterRanges: {
        smallest: Math.min(...parameters),
        largest: Math.max(...parameters),
        average: Math.floor(parameters.reduce((sum, p) => sum + p, 0) / parameters.length),
      },
      vramRanges: {
        smallest: Math.min(...vramRequirements),
        largest: Math.max(...vramRequirements),
        average: Math.floor(
          vramRequirements.reduce((sum, v) => sum + v, 0) / vramRequirements.length
        ),
      },
    }
  }

  /**
   * Reload models from disk (useful for development)
   * @returns Promise that resolves when models are reloaded
   */
  public async reloadModels(): Promise<void> {
    this.models.clear()
    this.loaded = false
    this.loadingPromise = null
    await this.loadModels()
  }

  /**
   * Check if a model exists
   * @param modelId - Model identifier
   * @returns True if model exists, false otherwise
   */
  public async hasModel(modelId: string): Promise<boolean> {
    await this.loadModels()
    return this.models.has(modelId)
  }

  /**
   * Get the number of loaded models
   * @returns Number of loaded models
   */
  public async getModelCount(): Promise<number> {
    await this.loadModels()
    return this.models.size
  }
}

// Singleton instance for application use
export const modelService = new ModelService()

// Convenience functions that use the singleton
export const getAllModels = () => modelService.getAllModels()
export const getModelById = (modelId: string) => modelService.getModelById(modelId)
export const getModelsByParameterRange = (minParams: number, maxParams: number) =>
  modelService.getModelsByParameterRange(minParams, maxParams)
export const getModelsByVRAMConstraint = (maxVRAMGB: number) =>
  modelService.getModelsByVRAMConstraint(maxVRAMGB)
export const searchModels = (query: string) => modelService.searchModels(query)
export const getModelsByOrganization = (organization: string) =>
  modelService.getModelsByOrganization(organization)
export const getModelStatistics = () => modelService.getModelStatistics()
export const reloadModels = () => modelService.reloadModels()
export const hasModel = (modelId: string) => modelService.hasModel(modelId)
export const getModelCount = () => modelService.getModelCount()
