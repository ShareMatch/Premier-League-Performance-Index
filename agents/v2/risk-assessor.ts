/**
 * Risk Assessor Agent
 * 
 * This agent analyzes features and assigns risk levels that determine
 * testing depth and priority:
 * 
 * - HIGH risk → Comprehensive testing (all paths, edge cases, security)
 * - MEDIUM risk → Standard coverage (happy path, main error cases)
 * - LOW risk → Basic smoke tests (happy path only)
 * 
 * Risk is assessed based on:
 * - Business impact (authentication, payments, data handling)
 * - Technical complexity (integrations, async operations)
 * - User experience impact (registration, onboarding)
 * - Historical bug density
 */

import * as dotenv from 'dotenv';
dotenv.config();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RiskFactor {
  factor: string;
  weight: number; // 0-1
  description: string;
}

export interface RiskAssessment {
  featureName: string;
  riskLevel: RiskLevel;
  score: number; // 0-100
  factors: RiskFactor[];
  reasoning: string;
  testingRecommendations: {
    scenarioCount: number;
    includeSecurityTests: boolean;
    includePerformanceTests: boolean;
    includeEdgeCases: boolean;
    includeNegativeTests: boolean;
    priorityOrder: number;
  };
}

// Predefined risk factors with weights
const RISK_FACTORS = {
  // Business Impact Factors
  AUTHENTICATION: { weight: 0.9, description: 'User authentication/authorization' },
  PAYMENT: { weight: 0.95, description: 'Financial transactions' },
  USER_DATA: { weight: 0.8, description: 'Personal data handling' },
  REGISTRATION: { weight: 0.85, description: 'User onboarding flow' },
  KYC: { weight: 0.9, description: 'Identity verification' },
  
  // Technical Complexity Factors
  EXTERNAL_API: { weight: 0.7, description: 'External API integration' },
  ASYNC_OPERATIONS: { weight: 0.6, description: 'Async/real-time operations' },
  FILE_UPLOAD: { weight: 0.65, description: 'File handling' },
  MULTI_STEP: { weight: 0.5, description: 'Multi-step workflow' },
  
  // UX Impact Factors
  CRITICAL_PATH: { weight: 0.8, description: 'Core user journey' },
  FIRST_IMPRESSION: { weight: 0.7, description: 'First-time user experience' },
  ACCESSIBILITY: { weight: 0.5, description: 'Accessibility features' },
  
  // Historical Factors
  HIGH_BUG_DENSITY: { weight: 0.8, description: 'Historically buggy area' },
  RECENT_CHANGES: { weight: 0.6, description: 'Recently modified code' },
};

/**
 * Call Groq API for risk analysis
 */
async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Risk Assessor Agent
 */
export class RiskAssessor {
  private assessmentCache: Map<string, RiskAssessment> = new Map();
  
  /**
   * Assess risk for a feature
   */
  async assessFeature(
    featureName: string,
    featureDescription: string,
    explorationData?: string
  ): Promise<RiskAssessment> {
    console.log(`\n🎯 [RiskAssessor] Analyzing: ${featureName}`);
    
    // Check cache first
    const cacheKey = `${featureName}::${featureDescription}`;
    if (this.assessmentCache.has(cacheKey)) {
      console.log('   [Cache hit] Using cached assessment');
      return this.assessmentCache.get(cacheKey)!;
    }
    
    // Perform keyword-based initial assessment
    const keywordFactors = this.analyzeKeywords(featureName, featureDescription);
    
    // Use LLM for deeper analysis
    const llmAnalysis = await this.llmAnalysis(featureName, featureDescription, explorationData);
    
    // Combine factors
    const allFactors = [...keywordFactors, ...llmAnalysis.factors];
    
    // Calculate overall score
    const score = this.calculateScore(allFactors);
    const riskLevel = this.scoreToLevel(score);
    
    // Generate testing recommendations based on risk
    const recommendations = this.generateRecommendations(riskLevel, allFactors);
    
    const assessment: RiskAssessment = {
      featureName,
      riskLevel,
      score,
      factors: allFactors,
      reasoning: llmAnalysis.reasoning,
      testingRecommendations: recommendations,
    };
    
    // Cache the result
    this.assessmentCache.set(cacheKey, assessment);
    
    console.log(`   Risk Level: ${riskLevel} (Score: ${score})`);
    console.log(`   Factors: ${allFactors.map(f => f.factor).join(', ')}`);
    
    return assessment;
  }
  
  /**
   * Analyze keywords to identify risk factors
   */
  private analyzeKeywords(featureName: string, description: string): RiskFactor[] {
    const text = `${featureName} ${description}`.toLowerCase();
    const factors: RiskFactor[] = [];
    
    // Check for each risk factor keyword
    const keywordMap: Record<string, keyof typeof RISK_FACTORS> = {
      'login': 'AUTHENTICATION',
      'auth': 'AUTHENTICATION',
      'password': 'AUTHENTICATION',
      'signup': 'REGISTRATION',
      'register': 'REGISTRATION',
      'payment': 'PAYMENT',
      'checkout': 'PAYMENT',
      'buy': 'PAYMENT',
      'sell': 'PAYMENT',
      'kyc': 'KYC',
      'verification': 'KYC',
      'identity': 'KYC',
      'upload': 'FILE_UPLOAD',
      'file': 'FILE_UPLOAD',
      'document': 'FILE_UPLOAD',
      'api': 'EXTERNAL_API',
      'supabase': 'EXTERNAL_API',
      'sumsub': 'EXTERNAL_API',
      'step': 'MULTI_STEP',
      'wizard': 'MULTI_STEP',
      'otp': 'AUTHENTICATION',
      'email': 'USER_DATA',
      'phone': 'USER_DATA',
      'whatsapp': 'USER_DATA',
    };
    
    for (const [keyword, factorKey] of Object.entries(keywordMap)) {
      if (text.includes(keyword)) {
        const factorDef = RISK_FACTORS[factorKey];
        // Avoid duplicates
        if (!factors.find(f => f.factor === factorKey)) {
          factors.push({
            factor: factorKey,
            weight: factorDef.weight,
            description: factorDef.description,
          });
        }
      }
    }
    
    return factors;
  }
  
  /**
   * Use LLM for deeper risk analysis
   */
  private async llmAnalysis(
    featureName: string,
    description: string,
    explorationData?: string
  ): Promise<{ factors: RiskFactor[]; reasoning: string }> {
    const prompt = `You are a QA risk analyst. Analyze this feature for testing risk.

Feature: ${featureName}
Description: ${description}
${explorationData ? `Exploration Data: ${explorationData}` : ''}

Consider these risk dimensions:
1. Business Impact - What happens if this breaks in production?
2. Technical Complexity - How many moving parts, integrations, async ops?
3. User Experience - How critical is this for user satisfaction?
4. Security - Does this handle sensitive data or authentication?

Respond ONLY with valid JSON:
{
  "additionalFactors": [
    { "factor": "FACTOR_NAME", "weight": 0.7, "description": "Why this matters" }
  ],
  "reasoning": "Brief explanation of overall risk assessment"
}

Keep additionalFactors to 2-3 most important factors not covered by standard keywords.
Weights should be 0.0-1.0 where 1.0 is highest risk.`;

    try {
      const response = await callGroq(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          factors: parsed.additionalFactors || [],
          reasoning: parsed.reasoning || 'Unable to determine',
        };
      }
    } catch (e) {
      console.log('   [LLM] Analysis failed, using keyword-only assessment');
    }
    
    return { factors: [], reasoning: 'Keyword-based assessment only' };
  }
  
  /**
   * Calculate overall risk score
   */
  private calculateScore(factors: RiskFactor[]): number {
    if (factors.length === 0) return 30; // Default low risk
    
    // Weighted average with boost for multiple factors
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    const avgWeight = totalWeight / factors.length;
    
    // Factor count bonus (more factors = higher risk)
    const countBonus = Math.min(factors.length * 5, 20);
    
    // Calculate score (0-100)
    const baseScore = avgWeight * 80;
    const finalScore = Math.min(100, baseScore + countBonus);
    
    return Math.round(finalScore);
  }
  
  /**
   * Convert score to risk level
   */
  private scoreToLevel(score: number): RiskLevel {
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }
  
  /**
   * Generate testing recommendations based on risk
   */
  private generateRecommendations(
    level: RiskLevel,
    factors: RiskFactor[]
  ): RiskAssessment['testingRecommendations'] {
    const hasSecurityFactor = factors.some(f => 
      ['AUTHENTICATION', 'PAYMENT', 'KYC', 'USER_DATA'].includes(f.factor)
    );
    
    const hasComplexityFactor = factors.some(f =>
      ['EXTERNAL_API', 'ASYNC_OPERATIONS', 'MULTI_STEP'].includes(f.factor)
    );
    
    switch (level) {
      case 'HIGH':
        return {
          scenarioCount: 8,
          includeSecurityTests: true,
          includePerformanceTests: hasComplexityFactor,
          includeEdgeCases: true,
          includeNegativeTests: true,
          priorityOrder: 1,
        };
      
      case 'MEDIUM':
        return {
          scenarioCount: 5,
          includeSecurityTests: hasSecurityFactor,
          includePerformanceTests: false,
          includeEdgeCases: true,
          includeNegativeTests: true,
          priorityOrder: 2,
        };
      
      case 'LOW':
        return {
          scenarioCount: 2,
          includeSecurityTests: false,
          includePerformanceTests: false,
          includeEdgeCases: false,
          includeNegativeTests: false,
          priorityOrder: 3,
        };
    }
  }
  
  /**
   * Assess multiple features and return sorted by priority
   */
  async assessMultipleFeatures(
    features: Array<{ name: string; description: string; explorationData?: string }>
  ): Promise<RiskAssessment[]> {
    console.log(`\n🎯 [RiskAssessor] Analyzing ${features.length} features...`);
    
    const assessments: RiskAssessment[] = [];
    
    for (const feature of features) {
      const assessment = await this.assessFeature(
        feature.name,
        feature.description,
        feature.explorationData
      );
      assessments.push(assessment);
      
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // Sort by priority (HIGH first, then by score)
    assessments.sort((a, b) => {
      if (a.riskLevel !== b.riskLevel) {
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return order[a.riskLevel] - order[b.riskLevel];
      }
      return b.score - a.score;
    });
    
    console.log('\n📊 Risk Assessment Summary:');
    for (const a of assessments) {
      const icon = a.riskLevel === 'HIGH' ? '🔴' : a.riskLevel === 'MEDIUM' ? '🟡' : '🟢';
      console.log(`   ${icon} ${a.featureName}: ${a.riskLevel} (${a.score})`);
    }
    
    return assessments;
  }
  
  /**
   * Get a formatted report of all assessments
   */
  getReport(assessments: RiskAssessment[]): string {
    let report = `# Risk Assessment Report
Generated: ${new Date().toISOString()}

## Summary
- Total Features: ${assessments.length}
- HIGH Risk: ${assessments.filter(a => a.riskLevel === 'HIGH').length}
- MEDIUM Risk: ${assessments.filter(a => a.riskLevel === 'MEDIUM').length}
- LOW Risk: ${assessments.filter(a => a.riskLevel === 'LOW').length}

## Detailed Assessments

`;
    
    for (const a of assessments) {
      const icon = a.riskLevel === 'HIGH' ? '🔴' : a.riskLevel === 'MEDIUM' ? '🟡' : '🟢';
      
      report += `### ${icon} ${a.featureName}
**Risk Level:** ${a.riskLevel} (Score: ${a.score}/100)

**Risk Factors:**
${a.factors.map(f => `- ${f.factor}: ${f.description} (weight: ${f.weight})`).join('\n')}

**Reasoning:** ${a.reasoning}

**Testing Recommendations:**
- Scenario Count: ${a.testingRecommendations.scenarioCount}
- Security Tests: ${a.testingRecommendations.includeSecurityTests ? 'Yes' : 'No'}
- Edge Cases: ${a.testingRecommendations.includeEdgeCases ? 'Yes' : 'No'}
- Negative Tests: ${a.testingRecommendations.includeNegativeTests ? 'Yes' : 'No'}
- Priority Order: ${a.testingRecommendations.priorityOrder}

---

`;
    }
    
    return report;
  }
}

/**
 * Create a risk assessor instance
 */
export function createRiskAssessor(): RiskAssessor {
  return new RiskAssessor();
}

export default RiskAssessor;

