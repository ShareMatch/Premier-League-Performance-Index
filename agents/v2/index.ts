/**
 * Agentic Testing System v2 - Enhanced with LangGraph
 *
 * A multi-agent system for automated test generation with intelligent exploration.
 *
 * NEW: LangGraph Integration
 * - Intelligent decision-making during exploration
 * - Pattern learning (close buttons, navigation triggers)
 * - LangSmith tracing for debugging
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                   AGENTIC TEST SYSTEM v2 + LANGGRAPH            │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  PERCEPTION LAYER                                               │
 * │    └── Explorer: LangGraph-powered exploration   │
 * │                                                                 │
 * │  COGNITIVE LAYER                                                │
 * │    ├── RiskAssessor: Classifies features by business impact     │
 * │    └── TestPlanner: Creates test scenarios (NOT code)           │
 * │                                                                 │
 * │  ACTION LAYER                                                   │
 * │    ├── CodeGenerator: Generates Playwright test code            │
 * │    ├── QualityEvaluator: Scores generated tests                 │
 * │    └── SelfHealer: Fixes broken selectors                       │
 * │                                                                 │
 * │  KNOWLEDGE BASE (Chroma Cloud)                                  │
 * │    └── KnowledgeStore: Stores explorations, patterns, errors    │
 * │                                                                 │
 * │  OBSERVABILITY (LangSmith)                                      │
 * │    └── Traces all LLM decisions for debugging                   │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   import { createOrchestrator } from './agents/v2';
 *   const orchestrator = createOrchestrator(page);
 *   await orchestrator.run('/?action=login', 'Login Flow');
 */

// Knowledge Layer
export { KnowledgeStore, getKnowledgeStore } from "./knowledge-store";
export type {
  ExplorationResult,
  TestPattern,
  SelectorInfo,
  ErrorPattern,
} from "./knowledge-store";

// Perception Layer - Intelligent LangGraph-powered explorer
export { Explorer, createExplorer } from "./explorer";

// Backward-compatible alias
export { createExplorer as createDeepExplorer } from "./explorer";

export type {
  ElementDescriptor,
  InteractionLog,
  ExplorationState,
} from "./explorer";

// Cognitive Layer
export { RiskAssessor, createRiskAssessor } from "./risk-assessor";
export type { RiskLevel, RiskAssessment, RiskFactor } from "./risk-assessor";

export { TestPlanner, createTestPlanner } from "./test-planner";
export type {
  TestPlan,
  TestScenario,
  TestStep,
  TestAssertion,
} from "./test-planner";

// Action Layer
export { CodeGenerator, createCodeGenerator } from "./code-generator";
export type { GeneratedTest } from "./code-generator";

export { QualityEvaluator, createQualityEvaluator } from "./quality-evaluator";
export type { QualityReport, QualityCriteria } from "./quality-evaluator";

export { SelfHealer, createSelfHealer } from "./self-healer";
export type {
  FailureType,
  TestFailure,
  HealingResult,
  HealingReport,
} from "./self-healer";

// Orchestrator - Intelligent version with LangGraph explorer
export {
  IntelligentOrchestrator,
  createIntelligentOrchestrator,
} from "./orchestrator";

// Backward-compatible aliases
export {
  IntelligentOrchestrator as TestOrchestrator,
  createIntelligentOrchestrator as createOrchestrator,
} from "./orchestrator";

export type {
  OrchestratorConfig,
  OrchestratorResult,
  FullRunResult,
} from "./orchestrator";

// Default export: the orchestrator factory
export { createIntelligentOrchestrator as default } from "./orchestrator";
