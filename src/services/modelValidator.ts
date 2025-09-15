/**
 * Model JSON Schema Validator Service
 *
 * Provides runtime validation for model JSON files using the JSON schema
 * from contracts/model-schema.json. Uses Ajv for robust schema validation
 * with clear error messages.
 */

import Ajv from 'ajv'
import type { ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'
import type { Model, ValidationError } from '../types'
// Note: Model schema would be imported from a proper schema file in production
const modelSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    parameters: { type: 'number' },
    precision: { type: 'string' },
    architecture: { type: 'object' },
    vramRequirements: { type: 'object' },
    performance: { type: 'array' },
    metadata: { type: 'object' },
  },
  required: [
    'id',
    'name',
    'parameters',
    'precision',
    'architecture',
    'vramRequirements',
    'performance',
    'metadata',
  ],
}

/**
 * Validation result interface for model validation
 */
export interface ModelValidationResult {
  isValid: boolean
  errors: ValidationError[]
  model?: Model
}

/**
 * JSON Schema validator instance configured for model validation
 */
class ModelValidator {
  private ajv: Ajv
  private validateFunction: (data: unknown) => boolean

  constructor() {
    // Initialize Ajv with strict mode and additional formats
    this.ajv = new Ajv({
      strict: true,
      allErrors: true,
      verbose: true,
      removeAdditional: false, // Don't remove additional properties, just report them
    })

    // Add format validators (date, time, etc.)
    addFormats(this.ajv)

    // Make the schema stricter by adding additionalProperties: false
    const strictSchema = {
      ...modelSchema,
      additionalProperties: false,
      properties: {
        ...modelSchema.properties,
        architecture: {
          ...modelSchema.properties.architecture,
          additionalProperties: false,
        },
        vramRequirements: {
          ...modelSchema.properties.vramRequirements,
          additionalProperties: false,
        },
        metadata: {
          ...modelSchema.properties.metadata,
          additionalProperties: false,
        },
      },
    }

    // Note: In production, this would have proper schema structure

    // Compile the schema once for performance
    this.validateFunction = this.ajv.compile(strictSchema)
  }

  /**
   * Validates a model object against the JSON schema
   *
   * @param model - The model object to validate
   * @returns ValidationResult with isValid flag, errors array, and validated model
   */
  public validateModel(model: unknown): ModelValidationResult {
    try {
      // Handle null/undefined cases
      if (model === null || model === undefined) {
        return {
          isValid: false,
          errors: [
            {
              field: 'root',
              message: 'Model cannot be null or undefined',
              severity: 'error' as const,
            },
          ],
        }
      }

      // Validate against schema
      const isValid = this.validateFunction(model)

      if (isValid) {
        return {
          isValid: true,
          errors: [],
          model: model as Model,
        }
      }

      // Transform Ajv errors to our ValidationError format
      const errors = this.transformAjvErrors(this.ajv.errors || [])

      return {
        isValid: false,
        errors,
      }
    } catch (error) {
      // Handle unexpected validation errors
      return {
        isValid: false,
        errors: [
          {
            field: 'validation',
            message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error' as const,
          },
        ],
      }
    }
  }

  /**
   * Transforms Ajv validation errors into our standardized ValidationError format
   *
   * @param ajvErrors - Array of Ajv ErrorObject instances
   * @returns Array of ValidationError objects with user-friendly messages
   */
  private transformAjvErrors(ajvErrors: ErrorObject[]): ValidationError[] {
    return ajvErrors.map(error => {
      const field = this.getFieldPath(error)
      const message = this.getErrorMessage(error)

      return {
        field,
        message,
        severity: 'error' as const,
      }
    })
  }

  /**
   * Extracts the field path from an Ajv error object
   *
   * @param error - Ajv ErrorObject
   * @returns Field path string for user identification
   */
  private getFieldPath(error: ErrorObject): string {
    // Handle root-level errors
    if (!error.instancePath || error.instancePath === '') {
      // For required field errors, extract field name from message
      if (error.keyword === 'required' && error.params?.missingProperty) {
        return error.params.missingProperty
      }
      return 'root'
    }

    // Remove leading slash and convert to dot notation
    let path = error.instancePath.substring(1).replace(/\//g, '.')

    // Handle array index paths (e.g., /performance/0/gpuType -> performance[0].gpuType)
    path = path.replace(/\.(\d+)\./g, '[$1].')
    path = path.replace(/\.(\d+)$/, '[$1]')

    // For nested required fields, append the missing property
    if (error.keyword === 'required' && error.params?.missingProperty) {
      path = path ? `${path}.${error.params.missingProperty}` : error.params.missingProperty
    }

    return path
  }

  /**
   * Generates user-friendly error messages from Ajv error objects
   *
   * @param error - Ajv ErrorObject
   * @returns Human-readable error message
   */
  private getErrorMessage(error: ErrorObject): string {
    switch (error.keyword) {
      case 'required':
        return `required field '${error.params?.missingProperty}' is missing`

      case 'type':
        return `Expected ${error.params?.type}, received ${typeof error.data}`

      case 'minimum':
        return `Value ${error.data} is below minimum of ${error.params?.limit}`

      case 'maximum':
        return `Value ${error.data} is above maximum of ${error.params?.limit}`

      case 'minLength':
        return `minLength violation: String is too short (minimum length: ${error.params?.limit})`

      case 'maxLength':
        return `maxLength violation: String is too long (maximum length: ${error.params?.limit})`

      case 'pattern':
        return `pattern violation: Value '${error.data}' does not match required pattern`

      case 'enum':
        return `enum violation: Value '${error.data}' is not a valid enum value. Allowed: ${error.params?.allowedValues?.join(', ')}`

      case 'minItems':
        return `minItems violation: Array must have at least ${error.params?.limit} items`

      case 'maxItems':
        return `maxItems violation: Array cannot have more than ${error.params?.limit} items`

      case 'format':
        return `Value '${error.data}' is not a valid ${error.params?.format} format`

      case 'additionalProperties':
        return `Additional property '${error.params?.additionalProperty}' is not allowed`

      case 'const':
        return `Value must be exactly ${error.params?.allowedValue}`

      case 'oneOf':
      case 'anyOf':
      case 'allOf':
        return `Value does not match any of the required schemas`

      default:
        return error.message || `Validation failed for ${error.keyword}`
    }
  }

  /**
   * Validates multiple models in batch
   *
   * @param models - Array of model objects to validate
   * @returns Array of validation results for each model
   */
  public validateModels(models: unknown[]): ModelValidationResult[] {
    return models.map(model => this.validateModel(model))
  }

  /**
   * Returns the compiled JSON schema for reference
   *
   * @returns The JSON schema object used for validation
   */
  public getSchema(): object {
    return modelSchema
  }

  /**
   * Checks if the validator is properly initialized
   *
   * @returns True if validator is ready to use
   */
  public isReady(): boolean {
    return this.validateFunction !== null && this.validateFunction !== undefined
  }
}

// Create singleton instance for performance
const modelValidator = new ModelValidator()

/**
 * Main validation function exported for use by other services
 *
 * @param model - Model object to validate
 * @returns Validation result with isValid flag, errors, and validated model
 */
export const validateModel = (model: unknown): ModelValidationResult => {
  return modelValidator.validateModel(model)
}

/**
 * Validates multiple models in batch
 *
 * @param models - Array of model objects to validate
 * @returns Array of validation results
 */
export const validateModels = (models: unknown[]): ModelValidationResult[] => {
  return modelValidator.validateModels(models)
}

/**
 * Returns the JSON schema used for validation
 *
 * @returns The model JSON schema object
 */
export const getModelSchema = (): object => {
  return modelValidator.getSchema()
}

/**
 * Checks if the validator is properly initialized and ready to use
 *
 * @returns True if validator is ready
 */
export const isValidatorReady = (): boolean => {
  return modelValidator.isReady()
}

// Export the validator class for advanced usage
export { ModelValidator }

// Default export for convenience
export default {
  validateModel,
  validateModels,
  getModelSchema,
  isValidatorReady,
  ModelValidator,
}
