/**
 * Intelligent Deep Explorer with LangGraph
 *
 * This agent uses LangGraph for intelligent decision-making during exploration:
 * - Decides which elements to interact with
 * - Learns patterns (close buttons, navigation triggers)
 * - Adapts exploration strategy based on context
 * - Tracks decisions in LangSmith for debugging
 * - Can skip specific modals (e.g., login/signup already tested)
 */

import { Page, Locator } from "@playwright/test";
import { StateGraph, END } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { MemorySaver } from "@langchain/langgraph";
import { traceable } from "langsmith/traceable";
import type { ExplorationResult, SelectorInfo } from "./knowledge-store";
import { KnowledgeStore, getKnowledgeStore } from "./knowledge-store";

export interface ExplorerOptions {
  maxDepth?: number;
  timeout?: number;
  /** Modal IDs to skip exploring (e.g., ['login-modal', 'signup-modal']) */
  skipModals?: string[];
}

export interface ElementDescriptor {
  selector: string;
  text: string;
  type:
    | "button"
    | "input"
    | "link"
    | "modal"
    | "dropdown"
    | "checkbox"
    | "select"
    | "unknown";
  attributes: Record<string, string>;
  isVisible: boolean;
  isEnabled: boolean;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  locator?: Locator;
}

export interface InteractionLog {
  element: ElementDescriptor;
  action: string;
  decision: DecisionResult;
  beforeState: string;
  afterState: string;
  apiCalls: string[];
  newElementsAppeared: ElementDescriptor[];
  timestamp: string;
}

export interface ExplorationState {
  url: string;
  exploredElements: Set<string>;
  interactionLogs: InteractionLog[];
  discoveredSelectors: Map<string, SelectorInfo>;
  modalStack: string[];
  currentContext: string;
  learnedPatterns: Map<string, Pattern>;
}

interface Pattern {
  type: "close_button" | "navigation_trigger" | "modal_opener" | "safe_action";
  confidence: number;
  examples: string[];
}

interface DecisionResult {
  shouldInteract: boolean;
  interactionType: "click" | "fill" | "skip" | "explore_deeper";
  reasoning: string;
  confidence: number;
  elementClassification:
    | "close_button"
    | "action_button"
    | "input"
    | "navigation"
    | "unknown";
}

interface GraphState {
  element: ElementDescriptor | null;
  context: {
    currentModal: string | null;
    exploredCount: number;
    depth: number;
    learnedPatterns: Map<string, Pattern>;
  };
  decision: DecisionResult | null;
  outcome: {
    success: boolean;
    modalOpened: boolean;
    urlChanged: boolean;
  } | null;
}

/**
 * Intelligent Deep Explorer with LangGraph decision-making
 */
export class IntelligentDeepExplorer {
  private page: Page;
  private state: ExplorationState;
  private knowledgeStore: KnowledgeStore | null = null;
  private llm: ChatGroq;
  private explorationGraph: StateGraph;
  private memory: MemorySaver;
  private apiCalls: string[] = [];
  private maxDepth: number;
  private currentScope: Locator | null = null;
  private sessionId: string;
  /** Modal IDs to skip (already tested or not relevant) */
  private skipModals: Set<string>;

  constructor(page: Page, options?: ExplorerOptions) {
    this.page = page;
    this.maxDepth = options?.maxDepth || 5;
    this.sessionId = `exploration-${Date.now()}`;
    // Default: skip login/signup modals when exploring home page
    this.skipModals = new Set(options?.skipModals || []);

    // Initialize LLM with Groq (fast and efficient for decisions)
    this.llm = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1, // Low for consistent decisions
      apiKey: process.env.GROQ_API_KEY,
    });

    // Initialize memory for pattern learning
    this.memory = new MemorySaver();

    this.state = {
      url: "",
      exploredElements: new Set(),
      interactionLogs: [],
      discoveredSelectors: new Map(),
      modalStack: [],
      currentContext: "root",
      learnedPatterns: new Map(),
    };

    // Setup LangGraph
    this.explorationGraph = this.setupGraph();
  }

  /**
   * Setup the LangGraph decision-making graph
   */
  private setupGraph(): StateGraph {
    const graph = new StateGraph<GraphState>({
      channels: {
        element: { value: (x: any, y: any) => y ?? x },
        context: { value: (x: any, y: any) => ({ ...x, ...y }) },
        decision: { value: (x: any, y: any) => y ?? x },
        outcome: { value: (x: any, y: any) => y ?? x },
      },
    });

    // Node 1: Analyze element and make decision
    graph.addNode("analyze_element", async (state: GraphState) => {
      if (!state.element) {
        return state;
      }

      const decision = await this.makeIntelligentDecision(
        state.element,
        state.context
      );

      return { ...state, decision };
    });

    // Node 2: Execute action based on decision
    graph.addNode("execute_action", async (state: GraphState) => {
      if (!state.decision?.shouldInteract || !state.element) {
        return state;
      }

      const outcome = await this.executeInteraction(
        state.element,
        state.decision
      );

      return { ...state, outcome };
    });

    // Node 3: Learn from outcome
    graph.addNode("learn_pattern", async (state: GraphState) => {
      if (!state.outcome || !state.element || !state.decision) {
        return state;
      }

      const updatedPatterns = await this.learnFromOutcome(
        state.element,
        state.decision,
        state.outcome,
        state.context.learnedPatterns
      );

      return {
        ...state,
        context: {
          ...state.context,
          learnedPatterns: updatedPatterns,
        },
      };
    });

    // Define the flow
    graph.addEdge("analyze_element", "execute_action");
    graph.addEdge("execute_action", "learn_pattern");
    graph.addEdge("learn_pattern", END);

    graph.setEntryPoint("analyze_element");

    return graph.compile({ checkpointer: this.memory });
  }

  /**
   * Make intelligent decision about element interaction
   * (Tracked in LangSmith)
   */
  private makeIntelligentDecision = traceable(
    async (
      element: ElementDescriptor,
      context: GraphState["context"]
    ): Promise<DecisionResult> => {
      // Fast path: Check learned patterns first (no LLM call)
      const patternMatch = this.checkLearnedPatterns(
        element,
        context.learnedPatterns
      );
      if (patternMatch) {
        return patternMatch;
      }

      // Slow path: Ask LLM for ambiguous cases
      const prompt = `You are an expert at web UI exploration. Analyze this element and decide the best action.

Element Details:
- Type: ${element.type}
- Text: "${element.text}"
- Selector: ${element.selector}
- Attributes: ${JSON.stringify(element.attributes)}
- Context: ${
        context.currentModal
          ? `Inside modal: ${context.currentModal}`
          : "Page root"
      }

Current Situation:
- Elements explored: ${context.exploredCount}
- Exploration depth: ${context.depth}
- Known patterns: ${
        Array.from(context.learnedPatterns.keys()).join(", ") || "none"
      }

Goal: Explore all interactive elements WITHOUT:
- Closing modals prematurely (preserve context)
- Navigating away from the page
- Causing destructive actions

Respond with ONLY valid JSON (no markdown):
{
  "shouldInteract": true|false,
  "interactionType": "click"|"fill"|"skip"|"explore_deeper",
  "reasoning": "Brief explanation (1 sentence)",
  "confidence": 0.0-1.0,
  "elementClassification": "close_button"|"action_button"|"input"|"navigation"|"unknown"
}`;

      try {
        const response = await this.llm.invoke(prompt);
        const content = response.content as string;

        // Extract JSON from response (handle markdown if present)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e: any) {
        console.log(`   [LLM Decision] Failed: ${e.message.substring(0, 50)}`);
      }

      // Fallback: Conservative decision
      return {
        shouldInteract: false,
        interactionType: "skip",
        reasoning: "Unable to analyze, skipping for safety",
        confidence: 0.3,
        elementClassification: "unknown",
      };
    },
    { name: "make_decision", tags: ["exploration", "decision"] }
  );

  /**
   * Check if element matches any learned patterns
   */
  private checkLearnedPatterns(
    element: ElementDescriptor,
    patterns: Map<string, Pattern>
  ): DecisionResult | null {
    // FIRST: Check if this element would open a skipped modal (login/signup)
    const skipModalMatch = this.wouldOpenSkippedModal(element);
    if (skipModalMatch) {
      return {
        shouldInteract: false,
        interactionType: "skip",
        reasoning: `Skipping: Would open ${skipModalMatch} (already tested)`,
        confidence: 1.0,
        elementClassification: "action_button",
      };
    }

    // Check close button pattern
    const closePattern = patterns.get("close_button");
    if (closePattern && closePattern.confidence > 0.8) {
      const isCloseButton =
        element.text.includes("×") ||
        element.text.includes("✕") ||
        element.attributes["aria-label"]?.toLowerCase().includes("close") ||
        element.selector.includes("top-6.right-6") ||
        closePattern.examples.some((ex) => element.selector.includes(ex));

      if (isCloseButton) {
        return {
          shouldInteract: false,
          interactionType: "skip",
          reasoning: "Learned pattern: This closes modals",
          confidence: closePattern.confidence,
          elementClassification: "close_button",
        };
      }
    }

    // Check navigation trigger pattern
    const navPattern = patterns.get("navigation_trigger");
    if (navPattern && navPattern.confidence > 0.7) {
      const isNavTrigger =
        element.type === "link" &&
        (element.attributes["href"]?.startsWith("http") ||
          navPattern.examples.some((ex) => element.selector.includes(ex)));

      if (isNavTrigger) {
        return {
          shouldInteract: false,
          interactionType: "skip",
          reasoning: "Learned pattern: This navigates away",
          confidence: navPattern.confidence,
          elementClassification: "navigation",
        };
      }
    }

    return null; // No pattern match - use LLM
  }

  /**
   * Check if clicking this element would open a modal we want to skip
   * (e.g., login/signup buttons when those flows are already tested)
   */
  private wouldOpenSkippedModal(element: ElementDescriptor): string | null {
    if (this.skipModals.size === 0) return null;

    const text = element.text.toLowerCase();
    const selector = element.selector.toLowerCase();
    const ariaLabel = (element.attributes["aria-label"] || "").toLowerCase();
    const dataTestId = element.attributes["data-testid"] || "";

    // Check for login-related triggers
    if (this.skipModals.has("login-modal") || this.skipModals.has("login")) {
      const isLoginTrigger =
        text === "log in" ||
        text === "login" ||
        text === "sign in" ||
        ariaLabel.includes("login") ||
        ariaLabel.includes("log in") ||
        ariaLabel.includes("sign in") ||
        dataTestId.includes("login") ||
        selector.includes("login");

      if (isLoginTrigger) {
        return "login-modal";
      }
    }

    // Check for signup-related triggers
    if (this.skipModals.has("signup-modal") || this.skipModals.has("signup")) {
      const isSignupTrigger =
        text === "sign up" ||
        text === "signup" ||
        text === "join now" ||
        text === "register" ||
        text === "create account" ||
        ariaLabel.includes("signup") ||
        ariaLabel.includes("sign up") ||
        ariaLabel.includes("register") ||
        dataTestId.includes("signup") ||
        selector.includes("signup");

      if (isSignupTrigger) {
        return "signup-modal";
      }
    }

    return null;
  }

  /**
   * Execute interaction based on decision
   */
  private executeInteraction = traceable(
    async (
      element: ElementDescriptor,
      decision: DecisionResult
    ): Promise<GraphState["outcome"]> => {
      const locator =
        element.locator || this.page.locator(element.selector).first();
      const beforeUrl = this.page.url();
      const beforeModalCount = this.state.modalStack.length;

      try {
        switch (decision.interactionType) {
          case "click":
            await locator.click({ timeout: 3000 });
            await this.page.waitForTimeout(1000);
            break;

          case "fill":
            // Fill with test data based on input type
            const inputType = element.attributes["type"] || "text";
            const testValue = this.getTestValueForInput(inputType, element);
            await locator.fill(testValue);
            await this.page.waitForTimeout(500);
            // Filling inputs doesn't open modals
            return { success: true, modalOpened: false, urlChanged: false };

          default:
            return { success: false, modalOpened: false, urlChanged: false };
        }

        const afterUrl = this.page.url();

        // Check if a NEW modal appeared (not just detecting the existing one)
        const newModalId = await this.detectNewModal();
        const modalOpened =
          newModalId !== null &&
          !this.state.modalStack.includes(newModalId) &&
          this.state.modalStack.length === beforeModalCount;

        return {
          success: true,
          modalOpened,
          urlChanged: afterUrl !== beforeUrl,
        };
      } catch (e: any) {
        return { success: false, modalOpened: false, urlChanged: false };
      }
    },
    { name: "execute_interaction", tags: ["exploration", "action"] }
  );

  /**
   * Get appropriate test value for input type
   */
  private getTestValueForInput(
    inputType: string,
    element: ElementDescriptor
  ): string {
    const placeholder = element.attributes["placeholder"] || "";
    const name = element.attributes["name"] || "";
    const id = element.attributes["id"] || "";

    if (
      inputType === "email" ||
      name.includes("email") ||
      id.includes("email")
    ) {
      return "test@example.com";
    }
    if (
      inputType === "password" ||
      name.includes("password") ||
      id.includes("password")
    ) {
      return "TestPassword123!";
    }
    if (inputType === "tel" || name.includes("phone") || id.includes("phone")) {
      return "+1234567890";
    }
    if (placeholder.toLowerCase().includes("name")) {
      return "Test User";
    }
    return "test input";
  }

  /**
   * Learn patterns from interaction outcomes
   */
  private learnFromOutcome = traceable(
    async (
      element: ElementDescriptor,
      decision: DecisionResult,
      outcome: GraphState["outcome"],
      currentPatterns: Map<string, Pattern>
    ): Promise<Map<string, Pattern>> => {
      const newPatterns = new Map(currentPatterns);

      // If action closed modal, learn close button pattern
      if (
        outcome.urlChanged &&
        decision.elementClassification === "close_button"
      ) {
        const pattern = newPatterns.get("close_button") || {
          type: "close_button" as const,
          confidence: 0.5,
          examples: [],
        };

        pattern.confidence = Math.min(0.95, pattern.confidence + 0.1);
        pattern.examples.push(element.selector);
        newPatterns.set("close_button", pattern);

        console.log(
          `   [Learning] Close button pattern confidence: ${pattern.confidence.toFixed(
            2
          )}`
        );
      }

      // If action navigated away, learn navigation pattern
      if (outcome.urlChanged && !outcome.modalOpened) {
        const pattern = newPatterns.get("navigation_trigger") || {
          type: "navigation_trigger" as const,
          confidence: 0.5,
          examples: [],
        };

        pattern.confidence = Math.min(0.9, pattern.confidence + 0.1);
        pattern.examples.push(element.selector);
        newPatterns.set("navigation_trigger", pattern);

        console.log(
          `   [Learning] Navigation trigger pattern confidence: ${pattern.confidence.toFixed(
            2
          )}`
        );
      }

      // Store patterns in knowledge store for persistence
      if (this.knowledgeStore) {
        for (const [type, pattern] of newPatterns) {
          await this.knowledgeStore.storeSelector({
            type: "selector",
            selector: `pattern:${type}`,
            elementType: type,
            description: `Learned pattern with ${pattern.confidence} confidence`,
            reliability: pattern.confidence,
            lastVerified: new Date().toISOString(),
            alternatives: pattern.examples,
          });
        }
      }

      return newPatterns;
    },
    { name: "learn_pattern", tags: ["exploration", "learning"] }
  );

  /**
   * Main exploration entry point
   */
  async explore(url: string): Promise<ExplorationState> {
    console.log(`\n🔍 [IntelligentExplorer] Starting exploration: ${url}`);
    console.log(`   Using LangGraph for intelligent decision-making`);
    console.log(`   Max depth: ${this.maxDepth}\n`);

    if (!this.knowledgeStore) {
      this.knowledgeStore = await getKnowledgeStore();
    }

    await this.page.goto(url, { waitUntil: "networkidle" });

    // ✅ Smart wait: Wait for EITHER a modal OR content to stabilize
    console.log("   ⏳ Waiting for page to stabilize...");

    try {
      // Wait for any of these conditions (whichever happens first):
      await Promise.race([
        // 1. A modal appears
        this.page
          .locator('[role="dialog"]')
          .first()
          .waitFor({ state: "visible", timeout: 3000 }),
        this.page
          .locator('[aria-modal="true"]')
          .first()
          .waitFor({ state: "visible", timeout: 3000 }),
        this.page
          .locator('[data-testid*="modal"]')
          .first()
          .waitFor({ state: "visible", timeout: 3000 }),
        // 2. Or just wait 2 seconds as fallback
        this.page.waitForTimeout(2000),
      ]);
      console.log("   ✅ Page stabilized");
    } catch {
      // If all fail, just continue (2 second timeout will win)
      console.log("   ⚠️ No modal detected, continuing anyway");
    }

    this.state.url = this.page.url();
    this.state.currentContext = "root";

    // Start recursive exploration
    await this.exploreCurrentContext(0);

    console.log(`\n✅ [IntelligentExplorer] Exploration complete!`);
    console.log(`   Elements explored: ${this.state.exploredElements.size}`);
    console.log(
      `   Patterns learned: ${this.state.learnedPatterns.size} (${Array.from(
        this.state.learnedPatterns.keys()
      ).join(", ")})`
    );

    return this.state;
  }

  /**
   * Recursively explore context with intelligent decisions
   */
  private async exploreCurrentContext(depth: number): Promise<void> {
    // Safety check: ensure page is still valid
    if (this.page.isClosed()) {
      console.log("   ⚠️ Page is closed, stopping exploration");
      return;
    }

    if (depth >= this.maxDepth) {
      console.log(`   [Depth ${depth}] Max depth reached`);
      return;
    }

    const indent = "  ".repeat(depth);
    console.log(
      `${indent}📂 Context: ${this.state.currentContext} (depth ${depth})`
    );

    this.currentScope = await this.getInteractiveScope();
    if (!this.currentScope) {
      console.log(`${indent}   ⚠️ No valid scope, stopping`);
      return;
    }

    const elements = await this.discoverInteractiveElements();
    console.log(`${indent}   Found ${elements.length} elements`);

    for (const element of elements) {
      const elementKey = `${element.selector}::${element.text}`;
      if (this.state.exploredElements.has(elementKey)) {
        continue;
      }

      this.state.exploredElements.add(elementKey);

      // Use LangGraph to make decision
      const result = await this.explorationGraph.invoke(
        {
          element,
          context: {
            currentModal:
              this.state.modalStack[this.state.modalStack.length - 1] || null,
            exploredCount: this.state.exploredElements.size,
            depth,
            learnedPatterns: this.state.learnedPatterns,
          },
          decision: null,
          outcome: null,
        },
        {
          configurable: {
            thread_id: this.sessionId,
          },
        }
      );

      // Log decision
      console.log(
        `${indent}   ${element.type}: "${element.text.substring(0, 30)}" → ${
          result.decision?.interactionType
        } (${result.decision?.reasoning})`
      );

      // Store interaction log
      this.state.interactionLogs.push({
        element,
        action: result.decision?.interactionType || "skip",
        decision: result.decision!,
        beforeState: "",
        afterState: "",
        apiCalls: [],
        newElementsAppeared: [],
        timestamp: new Date().toISOString(),
      });

      // Update learned patterns
      if (result.context.learnedPatterns) {
        this.state.learnedPatterns = result.context.learnedPatterns;
      }

      // Handle modal exploration - only if it's a NEW modal and not in skip list
      if (result.outcome?.modalOpened) {
        const modalId = await this.detectNewModal();

        // Check if this modal should be skipped
        const shouldSkipModal = modalId && this.shouldSkipModal(modalId);

        if (shouldSkipModal) {
          console.log(
            `${indent}   ⏭️  Skipping modal: ${modalId} (already tested)`
          );
          // Close the modal without exploring
          await this.closeCurrentModal();
        } else if (modalId && !this.state.modalStack.includes(modalId)) {
          // Only recurse if it's a genuinely new modal (not already in stack)
          this.state.modalStack.push(modalId);
          this.state.currentContext = `modal:${modalId}`;
          await this.exploreCurrentContext(depth + 1);
          await this.closeCurrentModal();
          this.state.modalStack.pop();
          this.state.currentContext =
            this.state.modalStack.length > 0
              ? `modal:${
                  this.state.modalStack[this.state.modalStack.length - 1]
                }`
              : "root";
        }
      }
    }

    console.log(
      `${indent}   ✅ Context complete: ${elements.length} elements processed`
    );
  }

  /**
   * Get interactive scope - automatically detects modals or uses page body
   * Uses generic detection patterns instead of hardcoded selectors
   */
  private async getInteractiveScope(): Promise<Locator | null> {
    const currentUrl = this.page.url();

    // Only check for about:blank
    if (currentUrl === "about:blank") {
      console.log("   ⚠️ Page is about:blank");
      return null;
    }

    // ✅ GENERIC MODAL DETECTION - finds ANY modal using common patterns

    // Strategy 1: Find by ARIA attributes (most reliable)
    const ariaModalSelectors = [
      '[role="dialog"][aria-modal="true"]', // Standard ARIA dialog
      '[role="dialog"]', // Dialog without aria-modal
      '[aria-modal="true"]', // aria-modal without role
    ];

    for (const selector of ariaModalSelectors) {
      try {
        const modal = this.page.locator(selector).first();
        if (await modal.isVisible({ timeout: 500 })) {
          console.log(`   📦 Found modal (ARIA): ${selector}`);
          return modal;
        }
      } catch {}
    }

    // Strategy 2: Find by common z-index patterns (overlays)
    // Modals typically have high z-index and fixed/absolute position
    try {
      const highZIndexElements = await this.page
        .locator("div")
        .evaluateAll((elements) => {
          return elements
            .map((el) => {
              const style = window.getComputedStyle(el);
              const zIndex = parseInt(style.zIndex, 10);
              const position = style.position;

              // Look for elements with:
              // - High z-index (50+)
              // - Fixed or absolute positioning
              // - Visible (not display:none)
              if (
                !isNaN(zIndex) &&
                zIndex >= 50 &&
                (position === "fixed" || position === "absolute") &&
                style.display !== "none" &&
                el.offsetWidth > 200 && // Reasonably sized
                el.offsetHeight > 200
              ) {
                return {
                  element: el,
                  zIndex,
                  selector:
                    el.getAttribute("data-testid") ||
                    el.id ||
                    el.className.split(" ").slice(0, 2).join("."),
                };
              }
              return null;
            })
            .filter(Boolean)
            .sort((a, b) => b!.zIndex - a!.zIndex)[0]; // Highest z-index first
        });

      if (highZIndexElements) {
        const selector = highZIndexElements.selector;
        if (selector) {
          const modal = this.page
            .locator(`[data-testid="${selector}"]`)
            .or(this.page.locator(`#${selector}`))
            .or(this.page.locator(`.${selector.split(".").join(".")}`))
            .first();

          if (await modal.isVisible({ timeout: 500 })) {
            console.log(`   📦 Found modal (z-index): ${selector}`);
            return modal;
          }
        }
      }
    } catch (e) {
      console.log(
        "   ⚠️ z-index detection failed:",
        (e as Error).message.substring(0, 50)
      );
    }

    // Strategy 3: Find by backdrop pattern
    // Many modals have a backdrop div with specific characteristics
    try {
      const backdropModal = await this.page
        .locator("div")
        .evaluateAll((elements) => {
          for (const el of elements) {
            const style = window.getComputedStyle(el);

            // Look for backdrop patterns:
            // - Fixed position
            // - Covers viewport (top/left: 0, width/height: 100%)
            // - Semi-transparent background
            if (
              style.position === "fixed" &&
              style.top === "0px" &&
              style.left === "0px" &&
              (style.width === "100vw" ||
                style.width === "100%" ||
                el.offsetWidth === window.innerWidth) &&
              (style.backgroundColor.includes("rgba") || style.opacity !== "1")
            ) {
              // The modal content is likely a child or sibling
              const nextSibling = el.nextElementSibling;
              const firstChild = el.firstElementChild;

              const candidate = nextSibling || firstChild;
              if (candidate && candidate instanceof HTMLElement) {
                const candidateStyle = window.getComputedStyle(candidate);
                if (
                  candidateStyle.position === "fixed" ||
                  candidateStyle.position === "absolute"
                ) {
                  return (
                    candidate.getAttribute("data-testid") ||
                    candidate.id ||
                    candidate.className.split(" ").slice(0, 2).join(".")
                  );
                }
              }
            }
          }
          return null;
        });

      if (backdropModal) {
        const modal = this.page
          .locator(`[data-testid="${backdropModal}"]`)
          .or(this.page.locator(`#${backdropModal}`))
          .or(this.page.locator(`.${backdropModal.split(".").join(".")}`))
          .first();

        if (await modal.isVisible({ timeout: 500 })) {
          console.log(`   📦 Found modal (backdrop): ${backdropModal}`);
          return modal;
        }
      }
    } catch (e) {
      console.log(
        "   ⚠️ Backdrop detection failed:",
        (e as Error).message.substring(0, 50)
      );
    }

    // Strategy 4: Find by data-testid pattern matching
    // Look for any element with "modal" in its data-testid
    try {
      const testIdModals = await this.page
        .locator("[data-testid]")
        .evaluateAll((elements) => {
          return elements
            .filter((el) => {
              const testId = el.getAttribute("data-testid") || "";
              return (
                testId.toLowerCase().includes("modal") ||
                testId.toLowerCase().includes("dialog") ||
                testId.toLowerCase().includes("overlay")
              );
            })
            .map((el) => el.getAttribute("data-testid"));
        });

      for (const testId of testIdModals) {
        if (!testId) continue;
        const modal = this.page.locator(`[data-testid="${testId}"]`).first();
        if (await modal.isVisible({ timeout: 500 })) {
          console.log(`   📦 Found modal (data-testid pattern): ${testId}`);
          return modal;
        }
      }
    } catch {}

    // Fallback: Use body if no modal detected
    console.log("   📦 No modal detected, using body scope");
    return this.page.locator("body");
  }

  /**
   * Discover interactive elements (buttons, inputs, links, etc.)
   */
  private async discoverInteractiveElements(): Promise<ElementDescriptor[]> {
    const elements: ElementDescriptor[] = [];
    const scopeLocator = this.currentScope || this.page.locator("body");

    // Buttons
    const buttons = await scopeLocator
      .locator('button, [role="button"], input[type="submit"]')
      .all();
    for (const btn of buttons) {
      const descriptor = await this.createElementDescriptor(btn, "button");
      if (descriptor?.isVisible) {
        elements.push(descriptor);
        // Store selector
        await this.storeSelector(descriptor);
      }
    }

    // Inputs (text, email, password, etc.)
    const inputs = await scopeLocator
      .locator('input:not([type="hidden"]):not([type="submit"]), textarea')
      .all();
    for (const input of inputs) {
      const descriptor = await this.createElementDescriptor(input, "input");
      if (descriptor?.isVisible) {
        elements.push(descriptor);
        // Store selector
        await this.storeSelector(descriptor);
      }
    }

    // Links
    const links = await scopeLocator.locator("a[href]").all();
    for (const link of links) {
      const descriptor = await this.createElementDescriptor(link, "link");
      if (descriptor?.isVisible) {
        elements.push(descriptor);
        await this.storeSelector(descriptor);
      }
    }

    return elements;
  }

  /**
   * Store selector in discovered selectors map
   */
  private async storeSelector(element: ElementDescriptor): Promise<void> {
    const selectorInfo: SelectorInfo = {
      type: "selector",
      selector: element.selector,
      elementType: element.type,
      description:
        element.text ||
        element.attributes["aria-label"] ||
        element.attributes["placeholder"] ||
        "",
      reliability: 1.0,
      lastVerified: new Date().toISOString(),
      alternatives: [],
    };

    this.state.discoveredSelectors.set(element.selector, selectorInfo);

    // Also store in knowledge base
    if (this.knowledgeStore) {
      await this.knowledgeStore.storeSelector(selectorInfo);
    }
  }

  /**
   * Create element descriptor
   */
  private async createElementDescriptor(
    locator: Locator,
    type: ElementDescriptor["type"]
  ): Promise<ElementDescriptor | null> {
    try {
      const isVisible = await locator.isVisible().catch(() => false);
      const isEnabled = await locator.isEnabled().catch(() => true);
      const text = (await locator.textContent().catch(() => "")) || "";
      const boundingBox = await locator.boundingBox().catch(() => null);

      const attributes = await locator
        .evaluate((el) => {
          const attrs: Record<string, string> = {};
          for (const attr of el.attributes) {
            attrs[attr.name] = attr.value;
          }
          return attrs;
        })
        .catch(() => ({}));

      const selector = await this.generateSelector(locator, attributes);

      return {
        selector,
        text: text.trim().substring(0, 100),
        type,
        attributes,
        isVisible,
        isEnabled,
        boundingBox,
        locator,
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate selector
   */
  private async generateSelector(
    locator: Locator,
    attrs: Record<string, string>
  ): Promise<string> {
    if (attrs["data-testid"]) return `[data-testid="${attrs["data-testid"]}"]`;
    if (attrs["id"]) return `#${attrs["id"]}`;
    if (attrs["name"]) return `[name="${attrs["name"]}"]`;

    try {
      const selector = await locator.evaluate((el) => {
        const tagName = el.tagName.toLowerCase();
        const safeClasses = Array.from(el.classList)
          .filter((cls) => !/[:\.\[\]\/]/.test(cls))
          .slice(0, 2);
        if (safeClasses.length === 0) {
          const text = el.textContent?.trim().slice(0, 30);
          if (text)
            return `${tagName}:has-text("${text.replace(/"/g, '\\"')}")`;
          return tagName;
        }
        return `${tagName}.${safeClasses.join(".")}`;
      });
      return selector;
    } catch {
      return "unknown";
    }
  }

  /**
   * Detect new modal
   */
  private async detectNewModal(): Promise<string | null> {
    const modalSelectors = ['[role="dialog"]', '[data-testid*="modal"]'];

    for (const selector of modalSelectors) {
      const modal = this.page.locator(selector).first();
      if (await modal.isVisible().catch(() => false)) {
        const testId =
          (await modal.getAttribute("data-testid").catch(() => null)) ||
          selector;
        return testId;
      }
    }

    return null;
  }

  /**
   * Check if a modal should be skipped based on its ID
   */
  private shouldSkipModal(modalId: string): boolean {
    // Direct match
    if (this.skipModals.has(modalId)) {
      return true;
    }

    // Partial match (e.g., 'login' matches 'login-modal')
    for (const skipId of this.skipModals) {
      if (modalId.includes(skipId) || skipId.includes(modalId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Close current modal (with safety checks)
   */
  private async closeCurrentModal(): Promise<void> {
    try {
      // Check if page is still usable
      if (this.page.isClosed()) {
        console.log("   ⚠️ Page is closed, skipping modal close");
        return;
      }
      await this.page.keyboard.press("Escape");
      await this.page.waitForTimeout(500);
    } catch (e: any) {
      // Ignore errors if page was closed
      console.log(
        `   ⚠️ Could not close modal: ${e.message?.substring(0, 50)}`
      );
    }
  }

  /**
   * Initialize
   */
  async init(): Promise<void> {
    this.knowledgeStore = await getKnowledgeStore();
    console.log("[IntelligentExplorer] Initialized with LangGraph + LangSmith");
  }
}

/**
 * Create intelligent explorer instance
 */
export function createIntelligentDeepExplorer(
  page: Page,
  options?: ExplorerOptions
): IntelligentDeepExplorer {
  return new IntelligentDeepExplorer(page, options);
}

export default IntelligentDeepExplorer;
