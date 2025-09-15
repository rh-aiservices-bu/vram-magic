// VRAM Magic: Demo Workload Profiles
// Pre-configured workload combinations for common scenarios

import { WorkloadSlot, Workload, WorkloadCategory } from '../types'
import { DEFAULT_WORKLOADS } from './workloads'

// ============================================================================
// Demo Profile Types
// ============================================================================

export interface DemoProfile {
  id: string
  name: string
  description: string
  category: string
  icon: string
  workloadSlots: WorkloadSlot[]
  tags: string[]
  useCase: string
  targetAudience: string[]
  estimatedVRAM: {
    min: number
    max: number
    typical: number
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getWorkloadById(id: string): Workload | null {
  return DEFAULT_WORKLOADS.find(w => w.id === id) || null
}

function createWorkloadSlot(
  workloadId: string,
  percentage: number,
  order: number,
  isActive: boolean = true
): WorkloadSlot {
  return {
    id: `slot-${order}`,
    workload: getWorkloadById(workloadId),
    percentage,
    isActive,
    order,
  }
}

// ============================================================================
// Demo Profile Definitions
// ============================================================================

export const DEMO_PROFILES: DemoProfile[] = [
  // Customer Support Scenarios
  {
    id: 'customer-support-basic',
    name: 'Basic Customer Support',
    description: 'Standard customer service with mixed chat and knowledge base queries',
    category: 'Customer Support',
    icon: '🎧',
    workloadSlots: [
      createWorkloadSlot('chat-customer-support', 60, 1),
      createWorkloadSlot('rag-knowledge-base', 25, 2),
      createWorkloadSlot('chat-simple', 15, 3),
      createWorkloadSlot('', 0, 4, false),
      createWorkloadSlot('', 0, 5, false),
    ],
    tags: ['customer-service', 'support', 'chat', 'knowledge-base'],
    useCase: 'Customer support teams handling inquiries with access to company knowledge base',
    targetAudience: ['Customer Support Teams', 'Help Desk', 'Technical Support'],
    estimatedVRAM: { min: 8000, max: 15000, typical: 12000 },
  },

  {
    id: 'customer-support-enterprise',
    name: 'Enterprise Customer Support',
    description:
      'Advanced support with document search, detailed analysis, and escalation handling',
    category: 'Customer Support',
    icon: '🏢',
    workloadSlots: [
      createWorkloadSlot('chat-customer-support', 40, 1),
      createWorkloadSlot('rag-document-qa', 30, 2),
      createWorkloadSlot('analysis-data', 20, 3),
      createWorkloadSlot('chat-detailed', 10, 4),
      createWorkloadSlot('', 0, 5, false),
    ],
    tags: ['enterprise', 'advanced-support', 'documentation', 'analysis'],
    useCase: 'Enterprise support with complex technical documentation and data analysis needs',
    targetAudience: ['Enterprise Support', 'Technical Account Managers', 'Solution Engineers'],
    estimatedVRAM: { min: 18000, max: 35000, typical: 25000 },
  },

  // Development & Coding Scenarios
  {
    id: 'coding-assistant-basic',
    name: 'Basic Coding Assistant',
    description: 'Code assistance with simple functions, debugging, and explanations',
    category: 'Development',
    icon: '💻',
    workloadSlots: [
      createWorkloadSlot('coding-simple', 70, 1),
      createWorkloadSlot('chat-detailed', 20, 2),
      createWorkloadSlot('rag-document-qa', 10, 3),
      createWorkloadSlot('', 0, 4, false),
      createWorkloadSlot('', 0, 5, false),
    ],
    tags: ['coding', 'development', 'debugging', 'assistance'],
    useCase: 'Individual developers needing code assistance and explanations',
    targetAudience: ['Junior Developers', 'Students', 'Individual Contributors'],
    estimatedVRAM: { min: 12000, max: 22000, typical: 16000 },
  },

  {
    id: 'coding-assistant-advanced',
    name: 'Advanced Development Team',
    description: 'Complex development with architecture design, refactoring, and code reviews',
    category: 'Development',
    icon: '⚙️',
    workloadSlots: [
      createWorkloadSlot('coding-complex', 50, 1),
      createWorkloadSlot('coding-refactoring', 30, 2),
      createWorkloadSlot('coding-simple', 15, 3),
      createWorkloadSlot('rag-document-qa', 5, 4),
      createWorkloadSlot('', 0, 5, false),
    ],
    tags: ['advanced-coding', 'architecture', 'refactoring', 'team-development'],
    useCase: 'Development teams working on complex systems and architecture',
    targetAudience: ['Senior Developers', 'Tech Leads', 'Software Architects'],
    estimatedVRAM: { min: 25000, max: 45000, typical: 32000 },
  },

  // Content Creation Scenarios
  {
    id: 'content-creator-basic',
    name: 'Basic Content Creation',
    description: 'Writing assistance for blogs, marketing copy, and creative content',
    category: 'Content Creation',
    icon: '✍️',
    workloadSlots: [
      createWorkloadSlot('creative-writing', 50, 1),
      createWorkloadSlot('creative-brainstorming', 30, 2),
      createWorkloadSlot('chat-detailed', 20, 3),
      createWorkloadSlot('', 0, 4, false),
      createWorkloadSlot('', 0, 5, false),
    ],
    tags: ['content-creation', 'writing', 'marketing', 'creativity'],
    useCase: 'Content creators and marketers producing written content',
    targetAudience: ['Content Marketers', 'Bloggers', 'Copywriters'],
    estimatedVRAM: { min: 10000, max: 20000, typical: 14000 },
  },

  {
    id: 'content-creator-enterprise',
    name: 'Enterprise Content Production',
    description: 'Large-scale content creation with research, analysis, and long-form content',
    category: 'Content Creation',
    icon: '📝',
    workloadSlots: [
      createWorkloadSlot('creative-content', 40, 1),
      createWorkloadSlot('rag-research', 25, 2),
      createWorkloadSlot('creative-writing', 20, 3),
      createWorkloadSlot('analysis-strategic', 10, 4),
      createWorkloadSlot('creative-brainstorming', 5, 5),
    ],
    tags: ['enterprise-content', 'research', 'long-form', 'strategic'],
    useCase: 'Large organizations producing comprehensive content with research backing',
    targetAudience: ['Content Teams', 'Marketing Departments', 'Publications'],
    estimatedVRAM: { min: 30000, max: 55000, typical: 40000 },
  },

  // Research & Analysis Scenarios
  {
    id: 'research-academic',
    name: 'Academic Research',
    description: 'Literature review, research synthesis, and academic writing support',
    category: 'Research',
    icon: '🔬',
    workloadSlots: [
      createWorkloadSlot('rag-research', 60, 1),
      createWorkloadSlot('analysis-data', 25, 2),
      createWorkloadSlot('creative-content', 10, 3),
      createWorkloadSlot('chat-detailed', 5, 4),
      createWorkloadSlot('', 0, 5, false),
    ],
    tags: ['academic', 'research', 'literature-review', 'analysis'],
    useCase: 'Researchers and academics conducting literature reviews and analysis',
    targetAudience: ['Researchers', 'Graduate Students', 'Academic Institutions'],
    estimatedVRAM: { min: 25000, max: 45000, typical: 35000 },
  },

  {
    id: 'business-intelligence',
    name: 'Business Intelligence',
    description: 'Market research, competitive analysis, and strategic planning support',
    category: 'Business',
    icon: '📊',
    workloadSlots: [
      createWorkloadSlot('analysis-strategic', 40, 1),
      createWorkloadSlot('analysis-financial', 30, 2),
      createWorkloadSlot('rag-research', 20, 3),
      createWorkloadSlot('analysis-data', 10, 4),
      createWorkloadSlot('', 0, 5, false),
    ],
    tags: ['business-intelligence', 'strategy', 'analysis', 'competitive'],
    useCase: 'Business analysts and strategists conducting market and competitive analysis',
    targetAudience: ['Business Analysts', 'Strategy Teams', 'Management Consultants'],
    estimatedVRAM: { min: 20000, max: 40000, typical: 28000 },
  },

  // Mixed Use Cases
  {
    id: 'general-purpose-light',
    name: 'General Purpose (Light)',
    description: 'Balanced workload for general business use with light resource requirements',
    category: 'General Purpose',
    icon: '⚡',
    workloadSlots: [
      createWorkloadSlot('chat-simple', 40, 1),
      createWorkloadSlot('chat-detailed', 25, 2),
      createWorkloadSlot('creative-writing', 20, 3),
      createWorkloadSlot('coding-simple', 10, 4),
      createWorkloadSlot('rag-knowledge-base', 5, 5),
    ],
    tags: ['general-purpose', 'light', 'balanced', 'cost-effective'],
    useCase: 'Small teams or individuals with diverse, light AI assistance needs',
    targetAudience: ['Small Teams', 'Startups', 'Individual Users'],
    estimatedVRAM: { min: 8000, max: 16000, typical: 12000 },
  },

  {
    id: 'general-purpose-heavy',
    name: 'General Purpose (Heavy)',
    description: 'Comprehensive workload covering all major use cases with high performance',
    category: 'General Purpose',
    icon: '🚀',
    workloadSlots: [
      createWorkloadSlot('rag-document-qa', 30, 1),
      createWorkloadSlot('coding-complex', 25, 2),
      createWorkloadSlot('analysis-strategic', 20, 3),
      createWorkloadSlot('creative-content', 15, 4),
      createWorkloadSlot('chat-customer-support', 10, 5),
    ],
    tags: ['general-purpose', 'heavy', 'comprehensive', 'high-performance'],
    useCase: 'Large organizations with diverse, high-intensity AI workloads',
    targetAudience: ['Large Enterprises', 'Consulting Firms', 'Research Organizations'],
    estimatedVRAM: { min: 35000, max: 65000, typical: 45000 },
  },

  // Specialized Industry Scenarios
  {
    id: 'legal-assistant',
    name: 'Legal Document Assistant',
    description: 'Legal document analysis, contract review, and regulatory research',
    category: 'Legal',
    icon: '⚖️',
    workloadSlots: [
      createWorkloadSlot('rag-document-qa', 50, 1),
      createWorkloadSlot('analysis-data', 30, 2),
      createWorkloadSlot('creative-content', 15, 3),
      createWorkloadSlot('chat-detailed', 5, 4),
      createWorkloadSlot('', 0, 5, false),
    ],
    tags: ['legal', 'document-analysis', 'contracts', 'regulatory'],
    useCase: 'Legal professionals analyzing documents and conducting legal research',
    targetAudience: ['Law Firms', 'Legal Departments', 'Compliance Teams'],
    estimatedVRAM: { min: 22000, max: 42000, typical: 30000 },
  },

  {
    id: 'medical-research',
    name: 'Medical Research Assistant',
    description: 'Medical literature review, case analysis, and research synthesis',
    category: 'Healthcare',
    icon: '🏥',
    workloadSlots: [
      createWorkloadSlot('rag-research', 50, 1),
      createWorkloadSlot('analysis-data', 25, 2),
      createWorkloadSlot('rag-document-qa', 20, 3),
      createWorkloadSlot('creative-content', 5, 4),
      createWorkloadSlot('', 0, 5, false),
    ],
    tags: ['medical', 'healthcare', 'research', 'literature-review'],
    useCase: 'Medical researchers and healthcare professionals conducting evidence-based research',
    targetAudience: ['Medical Researchers', 'Healthcare Professionals', 'Pharmaceutical Companies'],
    estimatedVRAM: { min: 28000, max: 50000, typical: 38000 },
  },

  {
    id: 'financial-analyst',
    name: 'Financial Analysis Platform',
    description: 'Financial modeling, market analysis, and investment research',
    category: 'Finance',
    icon: '💰',
    workloadSlots: [
      createWorkloadSlot('analysis-financial', 50, 1),
      createWorkloadSlot('analysis-data', 30, 2),
      createWorkloadSlot('rag-research', 15, 3),
      createWorkloadSlot('analysis-strategic', 5, 4),
      createWorkloadSlot('', 0, 5, false),
    ],
    tags: ['finance', 'financial-modeling', 'investment', 'market-analysis'],
    useCase:
      'Financial analysts and investment professionals conducting market and investment analysis',
    targetAudience: ['Financial Analysts', 'Investment Banks', 'Hedge Funds'],
    estimatedVRAM: { min: 18000, max: 35000, typical: 25000 },
  },
]

// ============================================================================
// Profile Categories
// ============================================================================

export const PROFILE_CATEGORIES = {
  'Customer Support': {
    label: 'Customer Support',
    description: 'Support and service scenarios with chat and knowledge access',
    color: '#2196F3',
    icon: '🎧',
  },
  Development: {
    label: 'Software Development',
    description: 'Coding assistance and development team workflows',
    color: '#FF9800',
    icon: '💻',
  },
  'Content Creation': {
    label: 'Content Creation',
    description: 'Writing, marketing, and creative content production',
    color: '#E91E63',
    icon: '✍️',
  },
  Research: {
    label: 'Research & Analysis',
    description: 'Academic and business research with data analysis',
    color: '#9C27B0',
    icon: '🔬',
  },
  Business: {
    label: 'Business Intelligence',
    description: 'Strategic planning and business analysis workflows',
    color: '#4CAF50',
    icon: '📊',
  },
  'General Purpose': {
    label: 'General Purpose',
    description: 'Mixed workloads for diverse organizational needs',
    color: '#607D8B',
    icon: '⚡',
  },
  Legal: {
    label: 'Legal Services',
    description: 'Legal document analysis and regulatory research',
    color: '#795548',
    icon: '⚖️',
  },
  Healthcare: {
    label: 'Healthcare & Medical',
    description: 'Medical research and healthcare analysis workflows',
    color: '#009688',
    icon: '🏥',
  },
  Finance: {
    label: 'Financial Services',
    description: 'Financial modeling and investment analysis',
    color: '#3F51B5',
    icon: '💰',
  },
} as const

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all profiles for a specific category
 */
export function getProfilesByCategory(category: string): DemoProfile[] {
  return DEMO_PROFILES.filter(profile => profile.category === category)
}

/**
 * Get profile by ID
 */
export function getProfileById(id: string): DemoProfile | undefined {
  return DEMO_PROFILES.find(profile => profile.id === id)
}

/**
 * Get all available profile categories
 */
export function getAllProfileCategories(): string[] {
  return Object.keys(PROFILE_CATEGORIES)
}

/**
 * Get category information
 */
export function getProfileCategoryInfo(category: string) {
  return PROFILE_CATEGORIES[category as keyof typeof PROFILE_CATEGORIES]
}

/**
 * Search profiles by tags or name
 */
export function searchProfiles(query: string): DemoProfile[] {
  const lowercaseQuery = query.toLowerCase()
  return DEMO_PROFILES.filter(
    profile =>
      profile.name.toLowerCase().includes(lowercaseQuery) ||
      profile.description.toLowerCase().includes(lowercaseQuery) ||
      profile.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      profile.useCase.toLowerCase().includes(lowercaseQuery)
  )
}

/**
 * Get profiles by VRAM range
 */
export function getProfilesByVRAMRange(minVRAM: number, maxVRAM: number): DemoProfile[] {
  return DEMO_PROFILES.filter(
    profile => profile.estimatedVRAM.typical >= minVRAM && profile.estimatedVRAM.typical <= maxVRAM
  )
}

/**
 * Get profiles suitable for target audience
 */
export function getProfilesByAudience(audience: string): DemoProfile[] {
  return DEMO_PROFILES.filter(profile =>
    profile.targetAudience.some(target => target.toLowerCase().includes(audience.toLowerCase()))
  )
}

/**
 * Get recommended profiles based on workload preferences
 */
export function getRecommendedProfiles(preferredCategories: WorkloadCategory[]): DemoProfile[] {
  return DEMO_PROFILES.filter(profile => {
    const profileWorkloadCategories = profile.workloadSlots
      .filter(slot => slot.workload && slot.isActive)
      .map(slot => slot.workload!.category)

    return preferredCategories.some(category => profileWorkloadCategories.includes(category))
  }).sort((a, b) => {
    // Sort by estimated typical VRAM (ascending)
    return a.estimatedVRAM.typical - b.estimatedVRAM.typical
  })
}

/**
 * Validate profile workload slots
 */
export function validateProfile(profile: DemoProfile): string[] {
  const errors: string[] = []

  const totalPercentage = profile.workloadSlots
    .filter(slot => slot.isActive)
    .reduce((sum, slot) => sum + slot.percentage, 0)

  if (Math.abs(totalPercentage - 100) > 0.1) {
    errors.push(`Profile "${profile.name}" percentages sum to ${totalPercentage}%, not 100%`)
  }

  const activeSlots = profile.workloadSlots.filter(slot => slot.isActive)
  if (activeSlots.length === 0) {
    errors.push(`Profile "${profile.name}" has no active workload slots`)
  }

  profile.workloadSlots.forEach((slot, index) => {
    if (slot.isActive && !slot.workload) {
      errors.push(`Profile "${profile.name}" slot ${index} is active but has no workload assigned`)
    }
  })

  return errors
}

// ============================================================================
// Export Defaults
// ============================================================================

export default DEMO_PROFILES
