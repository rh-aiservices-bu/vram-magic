// VRAM Magic: Demo Scenarios
// Realistic use case scenarios with complete configurations

import { SimulationConfig, TimeUnit, RequestPattern, ModelPrecision } from '../types'

// ============================================================================
// Demo Scenario Types
// ============================================================================

export interface DemoScenario {
  id: string
  name: string
  description: string
  category: string
  icon: string

  // Configuration
  model: string // Model ID reference
  profile: string // Profile ID reference
  simulation: SimulationConfig

  // Metadata
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  industry: string[]
  teamSize: string
  budget: 'low' | 'medium' | 'high' | 'enterprise'

  // Story & Context
  story: string
  objectives: string[]
  expectedOutcomes: string[]
  considerations: string[]

  // Results Preview
  estimatedResults: {
    maxVRAM: number
    avgVRAM: number
    peakConcurrency: number
    costPerHour: number
    recommendedGPU: string[]
  }
}

// ============================================================================
// Demo Scenario Definitions
// ============================================================================

export const DEMO_SCENARIOS: DemoScenario[] = [
  // Beginner Scenarios
  {
    id: 'startup-mvp',
    name: 'Startup MVP Development',
    description: 'Small startup building their first AI-powered product with limited resources',
    category: 'Startup',
    icon: '🚀',
    model: 'llama-2-7b',
    profile: 'coding-assistant-basic',
    simulation: {
      period: {
        duration: 8,
        timeUnit: TimeUnit.HOURS,
        concurrentUsers: 5,
        requestPattern: RequestPattern.UNIFORM,
        granularity: 300, // 5 minutes
        durationSeconds: 28800, // 8 hours * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    tags: ['startup', 'mvp', 'development', 'budget-conscious'],
    difficulty: 'beginner',
    industry: ['Technology', 'Software'],
    teamSize: '2-5 people',
    budget: 'low',
    story: `TechStart Inc. is a 3-person startup developing an AI coding assistant. They need to validate their MVP with early users while keeping costs minimal. The team includes 2 developers and 1 designer who occasionally need code assistance.`,
    objectives: [
      'Test MVP functionality with real users',
      'Keep infrastructure costs under $200/month',
      'Support 5 concurrent developers during business hours',
      'Maintain response times under 3 seconds',
    ],
    expectedOutcomes: [
      'Successful MVP validation with 5-10 beta users',
      'Clear understanding of resource requirements for scaling',
      'Cost-effective proof of concept for investors',
      'Performance benchmarks for future optimization',
    ],
    considerations: [
      'Limited budget requires efficient resource usage',
      'Single GPU setup to minimize complexity',
      'Focus on business hours to reduce costs',
      'Monitor usage patterns for scaling decisions',
    ],
    estimatedResults: {
      maxVRAM: 18500,
      avgVRAM: 12000,
      peakConcurrency: 5,
      costPerHour: 0.25,
      recommendedGPU: ['RTX 4090', 'RTX 3090'],
    },
  },

  {
    id: 'small-business-support',
    name: 'Small Business Customer Support',
    description: 'Local business implementing AI customer support to handle growing inquiries',
    category: 'Customer Support',
    icon: '🏪',
    model: 'claude-3-haiku',
    profile: 'customer-support-basic',
    simulation: {
      period: {
        duration: 12,
        timeUnit: TimeUnit.HOURS,
        concurrentUsers: 8,
        requestPattern: RequestPattern.BELL_CURVE,
        granularity: 300,
        durationSeconds: 43200, // 12 hours * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    tags: ['small-business', 'customer-support', 'local', 'growing'],
    difficulty: 'beginner',
    industry: ['Retail', 'E-commerce', 'Services'],
    teamSize: '10-25 people',
    budget: 'medium',
    story: `GreenThumb Gardens, a local plant nursery with online sales, is experiencing 300% growth in customer inquiries. They need AI assistance to handle basic questions about plant care, orders, and policies while their human team focuses on complex issues.`,
    objectives: [
      'Handle 70% of routine customer inquiries automatically',
      'Reduce average response time from 4 hours to 15 minutes',
      'Support business operations 12 hours/day',
      'Integrate with existing knowledge base of 500+ plant care guides',
    ],
    expectedOutcomes: [
      'Significant reduction in human agent workload',
      'Improved customer satisfaction scores',
      'Faster resolution of common inquiries',
      'Data insights on customer needs and pain points',
    ],
    considerations: [
      'Seasonal peaks during spring planting season',
      'Mix of simple and knowledge-intensive queries',
      'Need for plant care expertise in responses',
      'Integration with inventory and order systems',
    ],
    estimatedResults: {
      maxVRAM: 22000,
      avgVRAM: 14500,
      peakConcurrency: 8,
      costPerHour: 0.35,
      recommendedGPU: ['RTX 4090', 'A100'],
    },
  },

  // Intermediate Scenarios
  {
    id: 'content-agency-production',
    name: 'Content Agency Production',
    description: 'Digital marketing agency scaling content production with AI assistance',
    category: 'Content Creation',
    icon: '📝',
    model: 'gpt-3.5-turbo',
    profile: 'content-creator-basic',
    simulation: {
      period: {
        duration: 10,
        timeUnit: TimeUnit.HOURS,
        concurrentUsers: 15,
        requestPattern: RequestPattern.UNIFORM,
        granularity: 300,
        durationSeconds: 36000, // 10 hours * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    tags: ['content-agency', 'marketing', 'production', 'scaling'],
    difficulty: 'intermediate',
    industry: ['Marketing', 'Advertising', 'Media'],
    teamSize: '20-50 people',
    budget: 'medium',
    story: `CreativeFlow Agency manages content for 25 clients across various industries. Their team of writers, designers, and strategists needs AI assistance to brainstorm ideas, draft content, and maintain consistent quality while meeting aggressive deadlines.`,
    objectives: [
      'Increase content production capacity by 40%',
      'Maintain quality standards across all client work',
      'Support 15 concurrent writers during peak hours',
      'Generate 200+ pieces of content per week',
    ],
    expectedOutcomes: [
      'Faster initial drafts and ideation processes',
      'More time for strategic and creative work',
      'Consistent brand voice across client content',
      'Ability to take on 30% more clients without hiring',
    ],
    considerations: [
      'Multiple brand voices and industry expertise required',
      'Deadline-driven work with irregular peaks',
      'Quality control and brand consistency crucial',
      'Copyright and originality concerns',
    ],
    estimatedResults: {
      maxVRAM: 28000,
      avgVRAM: 18500,
      peakConcurrency: 15,
      costPerHour: 0.65,
      recommendedGPU: ['A100', 'RTX 4090 x2'],
    },
  },

  {
    id: 'tech-company-development',
    name: 'Tech Company Development Team',
    description: 'Mid-size technology company enhancing developer productivity',
    category: 'Development',
    icon: '⚙️',
    model: 'codegen-16b',
    profile: 'coding-assistant-advanced',
    simulation: {
      period: {
        duration: 9,
        timeUnit: TimeUnit.HOURS,
        concurrentUsers: 25,
        requestPattern: RequestPattern.FRONT_LOADED,
        granularity: 300,
        durationSeconds: 32400, // 9 hours * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    tags: ['tech-company', 'development', 'productivity', 'advanced'],
    difficulty: 'intermediate',
    industry: ['Technology', 'Software', 'SaaS'],
    teamSize: '50-150 people',
    budget: 'high',
    story: `CloudSync Technologies has 25 developers working on a complex microservices platform. They need advanced AI assistance for code generation, refactoring legacy systems, architectural decisions, and onboarding new team members.`,
    objectives: [
      'Reduce code review time by 50%',
      'Accelerate onboarding of new developers',
      'Improve code quality and consistency',
      'Support complex architectural decisions',
    ],
    expectedOutcomes: [
      'Faster feature development and deployment',
      'Improved code documentation and comments',
      'More efficient debugging and troubleshooting',
      'Better knowledge sharing across the team',
    ],
    considerations: [
      'Complex codebase with multiple languages and frameworks',
      'High-performance requirements for real-time assistance',
      'Security and intellectual property protection',
      'Integration with existing development tools',
    ],
    estimatedResults: {
      maxVRAM: 45000,
      avgVRAM: 32000,
      peakConcurrency: 25,
      costPerHour: 1.2,
      recommendedGPU: ['A100 x2', 'H100'],
    },
  },

  // Advanced Scenarios
  {
    id: 'enterprise-research-platform',
    name: 'Enterprise Research Platform',
    description: 'Fortune 500 company implementing AI research assistant for multiple departments',
    category: 'Research',
    icon: '🔬',
    model: 'claude-3-opus',
    profile: 'research-academic',
    simulation: {
      period: {
        duration: 24,
        timeUnit: TimeUnit.HOURS,
        concurrentUsers: 50,
        requestPattern: RequestPattern.UNIFORM,
        granularity: 600, // 10 minutes for longer duration
        durationSeconds: 86400, // 24 hours * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    tags: ['enterprise', 'research', 'fortune-500', 'global'],
    difficulty: 'advanced',
    industry: ['Pharmaceutical', 'Technology', 'Consulting'],
    teamSize: '500+ people',
    budget: 'enterprise',
    story: `GlobalPharm Industries needs a comprehensive AI research platform for their R&D, market research, and competitive intelligence teams across 15 countries. The system must handle complex queries, synthesize information from thousands of documents, and support 24/7 operations.`,
    objectives: [
      'Support 50+ researchers across global time zones',
      'Process and analyze 10,000+ research documents monthly',
      'Provide real-time competitive intelligence',
      'Accelerate drug discovery and market analysis processes',
    ],
    expectedOutcomes: [
      'Reduced research time from weeks to days',
      'Comprehensive competitive intelligence reports',
      'Accelerated decision-making processes',
      'Improved collaboration across global teams',
    ],
    considerations: [
      'Global 24/7 operations across multiple time zones',
      'Extremely large document corpus (100GB+)',
      'Stringent compliance and security requirements',
      'High-availability and disaster recovery needs',
    ],
    estimatedResults: {
      maxVRAM: 120000,
      avgVRAM: 85000,
      peakConcurrency: 50,
      costPerHour: 8.5,
      recommendedGPU: ['H100 x4', 'A100 x6'],
    },
  },

  {
    id: 'financial-trading-platform',
    name: 'Financial Trading Platform',
    description: 'Investment bank deploying AI for market analysis and trading support',
    category: 'Finance',
    icon: '💹',
    model: 'gpt-4',
    profile: 'financial-analyst',
    simulation: {
      period: {
        duration: 16,
        timeUnit: TimeUnit.HOURS,
        concurrentUsers: 80,
        requestPattern: RequestPattern.BELL_CURVE,
        granularity: 300,
        durationSeconds: 57600, // 16 hours * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    tags: ['finance', 'trading', 'investment-bank', 'real-time'],
    difficulty: 'advanced',
    industry: ['Financial Services', 'Investment Banking', 'Trading'],
    teamSize: '200-500 people',
    budget: 'enterprise',
    story: `MegaBank Securities needs real-time AI analysis for their trading floor with 80+ analysts and traders. The system must process market data, news sentiment, and provide instant analysis during volatile market conditions with sub-second response times.`,
    objectives: [
      'Provide sub-second analysis during market hours',
      'Support 80+ concurrent traders and analysts',
      'Process real-time market data and news feeds',
      'Generate automated trading signals and risk assessments',
    ],
    expectedOutcomes: [
      'Faster market opportunity identification',
      'Improved risk management and compliance',
      'Enhanced trading decision support',
      'Automated generation of client reports',
    ],
    considerations: [
      'Ultra-low latency requirements (<100ms)',
      'Extreme volatility during market events',
      'Regulatory compliance and audit trails',
      'Mission-critical uptime requirements (99.99%)',
    ],
    estimatedResults: {
      maxVRAM: 180000,
      avgVRAM: 95000,
      peakConcurrency: 80,
      costPerHour: 12.75,
      recommendedGPU: ['H100 x6', 'A100 x8'],
    },
  },

  {
    id: 'government-intelligence',
    name: 'Government Intelligence Analysis',
    description: 'Government agency implementing AI for intelligence analysis and reporting',
    category: 'Government',
    icon: '🏛️',
    model: 'claude-3-opus',
    profile: 'general-purpose-heavy',
    simulation: {
      period: {
        duration: 24,
        timeUnit: TimeUnit.HOURS,
        concurrentUsers: 35,
        requestPattern: RequestPattern.UNIFORM,
        granularity: 600,
        durationSeconds: 86400, // 24 hours * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    tags: ['government', 'intelligence', 'security', 'classified'],
    difficulty: 'advanced',
    industry: ['Government', 'Defense', 'Intelligence'],
    teamSize: '100-300 people',
    budget: 'enterprise',
    story: `The National Intelligence Agency requires AI assistance for analyzing vast amounts of intelligence data, generating briefings, and supporting decision-makers. The system must handle classified information with the highest security standards while providing 24/7 availability.`,
    objectives: [
      'Process and analyze intelligence data 24/7',
      'Support 35+ analysts across multiple shifts',
      'Generate comprehensive briefings and reports',
      'Maintain highest security and classification standards',
    ],
    expectedOutcomes: [
      'Faster intelligence processing and analysis',
      'Comprehensive threat assessments',
      'Automated report generation and summaries',
      'Enhanced situational awareness and decision support',
    ],
    considerations: [
      'Maximum security and air-gapped deployment',
      'Classified data handling requirements',
      'Redundancy and high availability needs',
      'Strict access controls and audit logging',
    ],
    estimatedResults: {
      maxVRAM: 150000,
      avgVRAM: 78000,
      peakConcurrency: 35,
      costPerHour: 15.2,
      recommendedGPU: ['H100 x5', 'A100 x7'],
    },
  },

  // Specialized Industry Scenarios
  {
    id: 'legal-firm-platform',
    name: 'Legal Firm Document Platform',
    description: 'Large law firm implementing AI for contract analysis and legal research',
    category: 'Legal',
    icon: '⚖️',
    model: 'claude-3-sonnet',
    profile: 'legal-assistant',
    simulation: {
      period: {
        duration: 12,
        timeUnit: TimeUnit.HOURS,
        concurrentUsers: 40,
        requestPattern: RequestPattern.BELL_CURVE,
        granularity: 300,
        durationSeconds: 43200, // 12 hours * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    tags: ['legal', 'law-firm', 'contracts', 'research'],
    difficulty: 'advanced',
    industry: ['Legal Services', 'Law Firms'],
    teamSize: '100-300 people',
    budget: 'high',
    story: `Prestige & Associates, a 150-lawyer firm, needs AI assistance for contract review, legal research, and document analysis. They handle complex M&A transactions, intellectual property cases, and regulatory compliance matters requiring comprehensive document analysis.`,
    objectives: [
      'Reduce contract review time by 60%',
      'Support 40+ lawyers during business hours',
      'Analyze thousands of legal documents monthly',
      'Ensure accuracy and regulatory compliance',
    ],
    expectedOutcomes: [
      'Faster contract turnaround times',
      'More thorough legal research and analysis',
      'Reduced billable hours for routine tasks',
      'Improved client service and satisfaction',
    ],
    considerations: [
      'Attorney-client privilege and confidentiality',
      'Complex legal document structures and terminology',
      'High accuracy requirements for legal analysis',
      'Integration with legal research databases',
    ],
    estimatedResults: {
      maxVRAM: 95000,
      avgVRAM: 58000,
      peakConcurrency: 40,
      costPerHour: 4.8,
      recommendedGPU: ['A100 x3', 'H100 x2'],
    },
  },

  {
    id: 'healthcare-research-hub',
    name: 'Healthcare Research Hub',
    description: 'Medical research institution implementing AI for clinical research and analysis',
    category: 'Healthcare',
    icon: '🏥',
    model: 'claude-3-opus',
    profile: 'medical-research',
    simulation: {
      period: {
        duration: 18,
        timeUnit: TimeUnit.HOURS,
        concurrentUsers: 30,
        requestPattern: RequestPattern.UNIFORM,
        granularity: 300,
        durationSeconds: 64800, // 18 hours * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    tags: ['healthcare', 'medical-research', 'clinical', 'academic'],
    difficulty: 'advanced',
    industry: ['Healthcare', 'Medical Research', 'Pharmaceuticals'],
    teamSize: '50-150 people',
    budget: 'high',
    story: `Metropolitan Medical Research Institute conducts clinical trials and medical research across multiple specialties. Their researchers need AI assistance for literature reviews, data analysis, and hypothesis generation while maintaining the highest standards for medical accuracy.`,
    objectives: [
      'Accelerate literature review processes',
      'Support 30+ medical researchers',
      'Analyze clinical trial data and medical literature',
      'Maintain medical accuracy and evidence-based outputs',
    ],
    expectedOutcomes: [
      'Faster identification of relevant research papers',
      'More comprehensive literature reviews',
      'Enhanced hypothesis generation and testing',
      'Improved research collaboration and knowledge sharing',
    ],
    considerations: [
      'Medical accuracy and evidence-based requirements',
      'HIPAA compliance and patient data protection',
      'Complex medical terminology and concepts',
      'Integration with medical databases and journals',
    ],
    estimatedResults: {
      maxVRAM: 110000,
      avgVRAM: 72000,
      peakConcurrency: 30,
      costPerHour: 6.2,
      recommendedGPU: ['H100 x3', 'A100 x4'],
    },
  },
]

// ============================================================================
// Scenario Categories
// ============================================================================

export const SCENARIO_CATEGORIES = {
  Startup: {
    label: 'Startup & SMB',
    description: 'Small teams with limited budgets exploring AI implementation',
    color: '#FF5722',
    icon: '🚀',
    budgetRange: 'low-medium',
    teamSizeRange: '2-25',
  },
  'Customer Support': {
    label: 'Customer Support',
    description: 'Customer service and support automation scenarios',
    color: '#2196F3',
    icon: '🎧',
    budgetRange: 'low-high',
    teamSizeRange: '5-100',
  },
  'Content Creation': {
    label: 'Content & Marketing',
    description: 'Content production and marketing automation',
    color: '#E91E63',
    icon: '📝',
    budgetRange: 'medium-high',
    teamSizeRange: '10-100',
  },
  Development: {
    label: 'Software Development',
    description: 'Developer productivity and code assistance',
    color: '#FF9800',
    icon: '⚙️',
    budgetRange: 'medium-enterprise',
    teamSizeRange: '5-500',
  },
  Research: {
    label: 'Research & Analysis',
    description: 'Academic and business research scenarios',
    color: '#9C27B0',
    icon: '🔬',
    budgetRange: 'high-enterprise',
    teamSizeRange: '20-500',
  },
  Finance: {
    label: 'Financial Services',
    description: 'Financial analysis and trading support',
    color: '#3F51B5',
    icon: '💹',
    budgetRange: 'enterprise',
    teamSizeRange: '50-500',
  },
  Government: {
    label: 'Government & Defense',
    description: 'Government and intelligence applications',
    color: '#607D8B',
    icon: '🏛️',
    budgetRange: 'enterprise',
    teamSizeRange: '50-1000',
  },
  Legal: {
    label: 'Legal Services',
    description: 'Legal document analysis and research',
    color: '#795548',
    icon: '⚖️',
    budgetRange: 'high-enterprise',
    teamSizeRange: '20-300',
  },
  Healthcare: {
    label: 'Healthcare & Medical',
    description: 'Medical research and healthcare analysis',
    color: '#009688',
    icon: '🏥',
    budgetRange: 'high-enterprise',
    teamSizeRange: '30-200',
  },
} as const

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get scenarios by category
 */
export function getScenariosByCategory(category: string): DemoScenario[] {
  return DEMO_SCENARIOS.filter(scenario => scenario.category === category)
}

/**
 * Get scenarios by difficulty
 */
export function getScenariosByDifficulty(
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): DemoScenario[] {
  return DEMO_SCENARIOS.filter(scenario => scenario.difficulty === difficulty)
}

/**
 * Get scenarios by budget range
 */
export function getScenariosByBudget(
  budget: 'low' | 'medium' | 'high' | 'enterprise'
): DemoScenario[] {
  return DEMO_SCENARIOS.filter(scenario => scenario.budget === budget)
}

/**
 * Get scenario by ID
 */
export function getScenarioById(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find(scenario => scenario.id === id)
}

/**
 * Search scenarios
 */
export function searchScenarios(query: string): DemoScenario[] {
  const lowercaseQuery = query.toLowerCase()
  return DEMO_SCENARIOS.filter(
    scenario =>
      scenario.name.toLowerCase().includes(lowercaseQuery) ||
      scenario.description.toLowerCase().includes(lowercaseQuery) ||
      scenario.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      scenario.story.toLowerCase().includes(lowercaseQuery)
  )
}

/**
 * Get scenarios by industry
 */
export function getScenariosByIndustry(industry: string): DemoScenario[] {
  return DEMO_SCENARIOS.filter(scenario =>
    scenario.industry.some(ind => ind.toLowerCase().includes(industry.toLowerCase()))
  )
}

/**
 * Get scenarios by team size
 */
export function getScenariosByTeamSize(teamSize: string): DemoScenario[] {
  return DEMO_SCENARIOS.filter(scenario => scenario.teamSize === teamSize)
}

/**
 * Get recommended scenarios based on user preferences
 */
export function getRecommendedScenarios(
  budget: string,
  teamSize: string,
  industry?: string
): DemoScenario[] {
  let scenarios = DEMO_SCENARIOS

  // Filter by budget
  if (budget !== 'any') {
    scenarios = scenarios.filter(scenario => scenario.budget === budget)
  }

  // Filter by team size (simplified matching)
  if (teamSize !== 'any') {
    scenarios = scenarios.filter(scenario => scenario.teamSize.includes(teamSize))
  }

  // Filter by industry if specified
  if (industry && industry !== 'any') {
    scenarios = scenarios.filter(scenario =>
      scenario.industry.some(ind => ind.toLowerCase().includes(industry.toLowerCase()))
    )
  }

  // Sort by difficulty (beginner first)
  return scenarios.sort((a, b) => {
    const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 }
    return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
  })
}

// ============================================================================
// Export Defaults
// ============================================================================

export default DEMO_SCENARIOS
