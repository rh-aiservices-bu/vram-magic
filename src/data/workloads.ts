// VRAM Magic: Default Workload Definitions
// This file contains predefined workload profiles for common LLM use cases

import { Workload, WorkloadCategory } from '../types'

// ============================================================================
// Default Workload Definitions
// ============================================================================

export const DEFAULT_WORKLOADS: Workload[] = [
  // Chat Workloads
  {
    id: 'chat-simple',
    name: 'Simple Chat',
    description: 'Basic conversational interactions with short responses',
    inputTokens: 150,
    outputTokens: 100,
    category: WorkloadCategory.CHAT,
    icon: '💬',
    examples: [
      'How are you today?',
      "What's the weather like?",
      'Tell me a joke',
      'Quick question about...',
    ],
  },
  {
    id: 'chat-detailed',
    name: 'Detailed Chat',
    description: 'In-depth conversations requiring longer explanations',
    inputTokens: 300,
    outputTokens: 500,
    category: WorkloadCategory.CHAT,
    icon: '💭',
    examples: [
      'Explain quantum computing concepts',
      'Help me understand this complex topic',
      'Detailed discussion about...',
      'Walk me through this process',
    ],
  },
  {
    id: 'chat-customer-support',
    name: 'Customer Support',
    description: 'Customer service interactions with contextual responses',
    inputTokens: 250,
    outputTokens: 200,
    category: WorkloadCategory.CHAT,
    icon: '🛠️',
    examples: [
      'I need help with my order',
      'Technical support request',
      'Billing inquiry',
      'Product troubleshooting',
    ],
  },

  // RAG (Retrieval Augmented Generation) Workloads
  {
    id: 'rag-document-qa',
    name: 'Document Q&A',
    description: 'Question answering over large document collections',
    inputTokens: 2000,
    outputTokens: 400,
    category: WorkloadCategory.RAG,
    icon: '📄',
    examples: [
      'Find information in company handbook',
      'Search legal documents',
      'Query technical documentation',
      'Research paper analysis',
    ],
  },
  {
    id: 'rag-knowledge-base',
    name: 'Knowledge Base Search',
    description: 'Information retrieval from structured knowledge bases',
    inputTokens: 1500,
    outputTokens: 300,
    category: WorkloadCategory.RAG,
    icon: '🔍',
    examples: [
      'Product information lookup',
      'FAQ searches',
      'Policy and procedure queries',
      'Training material access',
    ],
  },
  {
    id: 'rag-research',
    name: 'Research Assistant',
    description: 'Complex research tasks with multiple source synthesis',
    inputTokens: 3000,
    outputTokens: 800,
    category: WorkloadCategory.RAG,
    icon: '🔬',
    examples: [
      'Literature review synthesis',
      'Market research compilation',
      'Competitive analysis',
      'Academic research assistance',
    ],
  },

  // Coding Workloads
  {
    id: 'coding-simple',
    name: 'Code Assistance',
    description: 'Basic coding help and simple function generation',
    inputTokens: 400,
    outputTokens: 300,
    category: WorkloadCategory.CODING,
    icon: '💻',
    examples: [
      'Write a simple function',
      'Debug this code snippet',
      'Explain this algorithm',
      'Code review feedback',
    ],
  },
  {
    id: 'coding-complex',
    name: 'Complex Development',
    description: 'Advanced programming tasks and large code generation',
    inputTokens: 800,
    outputTokens: 1200,
    category: WorkloadCategory.CODING,
    icon: '⚙️',
    examples: [
      'Design system architecture',
      'Implement complex algorithms',
      'Generate full modules',
      'Database schema design',
    ],
  },
  {
    id: 'coding-refactoring',
    name: 'Code Refactoring',
    description: 'Code optimization and refactoring tasks',
    inputTokens: 1000,
    outputTokens: 600,
    category: WorkloadCategory.CODING,
    icon: '🔧',
    examples: [
      'Optimize performance',
      'Improve code structure',
      'Apply design patterns',
      'Clean up technical debt',
    ],
  },

  // Creative Workloads
  {
    id: 'creative-writing',
    name: 'Creative Writing',
    description: 'Story generation and creative content creation',
    inputTokens: 200,
    outputTokens: 800,
    category: WorkloadCategory.CREATIVE,
    icon: '✍️',
    examples: [
      'Write a short story',
      'Create marketing copy',
      'Generate blog content',
      'Develop character descriptions',
    ],
  },
  {
    id: 'creative-brainstorming',
    name: 'Brainstorming',
    description: 'Idea generation and creative problem solving',
    inputTokens: 300,
    outputTokens: 600,
    category: WorkloadCategory.CREATIVE,
    icon: '💡',
    examples: [
      'Product name ideas',
      'Campaign concepts',
      'Solution brainstorming',
      'Creative alternatives',
    ],
  },
  {
    id: 'creative-content',
    name: 'Content Creation',
    description: 'Long-form content and editorial tasks',
    inputTokens: 500,
    outputTokens: 1500,
    category: WorkloadCategory.CREATIVE,
    icon: '📝',
    examples: [
      'Write detailed articles',
      'Create educational content',
      'Develop training materials',
      'Generate comprehensive guides',
    ],
  },

  // Analysis Workloads
  {
    id: 'analysis-data',
    name: 'Data Analysis',
    description: 'Statistical analysis and data interpretation',
    inputTokens: 1200,
    outputTokens: 700,
    category: WorkloadCategory.ANALYSIS,
    icon: '📊',
    examples: [
      'Analyze survey results',
      'Interpret business metrics',
      'Statistical trend analysis',
      'Performance data review',
    ],
  },
  {
    id: 'analysis-financial',
    name: 'Financial Analysis',
    description: 'Financial data processing and reporting',
    inputTokens: 800,
    outputTokens: 500,
    category: WorkloadCategory.ANALYSIS,
    icon: '💰',
    examples: [
      'Budget analysis',
      'Investment evaluation',
      'Cost-benefit analysis',
      'Financial forecasting',
    ],
  },
  {
    id: 'analysis-strategic',
    name: 'Strategic Analysis',
    description: 'Business strategy and market analysis',
    inputTokens: 1500,
    outputTokens: 1000,
    category: WorkloadCategory.ANALYSIS,
    icon: '🎯',
    examples: [
      'SWOT analysis',
      'Market opportunity assessment',
      'Competitive positioning',
      'Strategic planning support',
    ],
  },
]

// ============================================================================
// Workload Category Definitions
// ============================================================================

export const WORKLOAD_CATEGORIES = {
  [WorkloadCategory.CHAT]: {
    label: 'Chat & Conversation',
    description: 'Interactive conversational workloads with back-and-forth dialogue',
    color: '#2196F3',
    averageInputTokens: 250,
    averageOutputTokens: 250,
    characteristics: ['Interactive', 'Real-time', 'Context-aware', 'Conversational'],
  },
  [WorkloadCategory.RAG]: {
    label: 'Retrieval Augmented Generation',
    description: 'Document search and knowledge retrieval with context injection',
    color: '#4CAF50',
    averageInputTokens: 2000,
    averageOutputTokens: 500,
    characteristics: ['Context-heavy', 'Search-based', 'Factual', 'Document-focused'],
  },
  [WorkloadCategory.CODING]: {
    label: 'Code Generation & Review',
    description: 'Programming assistance, code generation, and technical tasks',
    color: '#FF9800',
    averageInputTokens: 600,
    averageOutputTokens: 700,
    characteristics: ['Technical', 'Structured', 'Logic-based', 'Iterative'],
  },
  [WorkloadCategory.CREATIVE]: {
    label: 'Creative Content',
    description: 'Creative writing, brainstorming, and content generation',
    color: '#E91E63',
    averageInputTokens: 350,
    averageOutputTokens: 900,
    characteristics: ['Creative', 'Open-ended', 'Expressive', 'Variable-length'],
  },
  [WorkloadCategory.ANALYSIS]: {
    label: 'Data & Business Analysis',
    description: 'Analytical tasks, data interpretation, and business insights',
    color: '#9C27B0',
    averageInputTokens: 1200,
    averageOutputTokens: 750,
    characteristics: ['Analytical', 'Data-driven', 'Structured', 'Detailed'],
  },
  [WorkloadCategory.CUSTOM]: {
    label: 'Custom Workload',
    description: 'User-defined workload with custom token counts and settings',
    color: '#607D8B',
    averageInputTokens: 500,
    averageOutputTokens: 500,
    characteristics: ['Configurable', 'User-defined', 'Flexible', 'Adaptable'],
  },
} as const

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all workloads for a specific category
 */
export function getWorkloadsByCategory(category: WorkloadCategory): Workload[] {
  return DEFAULT_WORKLOADS.filter(workload => workload.category === category)
}

/**
 * Get workload by ID
 */
export function getWorkloadById(id: string): Workload | undefined {
  return DEFAULT_WORKLOADS.find(workload => workload.id === id)
}

/**
 * Get category information
 */
export function getCategoryInfo(category: WorkloadCategory) {
  return WORKLOAD_CATEGORIES[category]
}

/**
 * Get all available categories
 */
export function getAllCategories(): WorkloadCategory[] {
  return Object.values(WorkloadCategory)
}

/**
 * Create a custom workload template
 */
export function createCustomWorkloadTemplate(): Omit<Workload, 'id'> {
  return {
    name: 'Custom Workload',
    description: 'User-defined workload configuration',
    inputTokens: 500,
    outputTokens: 500,
    category: WorkloadCategory.CUSTOM,
    icon: '⚙️',
    examples: ['Custom use case examples...'],
  }
}

/**
 * Validate token counts for realistic usage
 */
export function validateTokenCounts(inputTokens: number, outputTokens: number): string[] {
  const errors: string[] = []

  if (inputTokens < 1 || inputTokens > 8000) {
    errors.push('Input tokens should be between 1 and 8000')
  }

  if (outputTokens < 1 || outputTokens > 4000) {
    errors.push('Output tokens should be between 1 and 4000')
  }

  if (inputTokens + outputTokens > 10000) {
    errors.push('Total tokens (input + output) should not exceed 10000')
  }

  return errors
}

/**
 * Get workloads with token counts in a specific range
 */
export function getWorkloadsByTokenRange(
  minTokens: number,
  maxTokens: number,
  includeInput: boolean = true,
  includeOutput: boolean = true
): Workload[] {
  return DEFAULT_WORKLOADS.filter(workload => {
    const totalTokens =
      (includeInput ? workload.inputTokens : 0) + (includeOutput ? workload.outputTokens : 0)
    return totalTokens >= minTokens && totalTokens <= maxTokens
  })
}

// ============================================================================
// Export Defaults
// ============================================================================

export { WorkloadCategory }
export default DEFAULT_WORKLOADS
