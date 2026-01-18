/**
 * Intelligent Deep Explorer with Causal Discovery Engine
 *
 * This agent uses:
 * - Active experimentation to discover cause-effect relationships
 * - Pattern learning across all flows (login, signup, KYC, etc.)
 * - Zero manual configuration (no component manifests)
 * - Self-learning through interaction outcomes
 * - LangGraph for complex decision-making (fallback only)
 */

import { Page, Locator } from "@playwright/test";
import { StateGraph, END } from "@langchain/langgraph";
// import { ChatGroq } from "@langchain/groq";
import { MemorySaver } from "@langchain/langgraph";
import { traceable } from "langsmith/traceable";
import type { ExplorationResult, SelectorInfo } from "./knowledge-store";
import { KnowledgeStore, getKnowledgeStore } from "./knowledge-store";

export interface ExplorerOptions {
  maxDepth?: number;
  timeout?: number;
  /** Modal IDs to skip exploring (e.g., ['login-modal', 'signup-modal']) */
  skipModals?: string[];
  /** Texts or selectors to explicitly block from clicking */
  blockedElements?: string[];
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
  value?: string;
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
  formFlow?: {
    type: "multi_step_form";
    steps: Array<{
      stepNumber: number;
      inputs: string[];
      submitButton: string;
      timestamp: string;
    }>;
    totalSteps: number;
  } | null;
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

interface UIState {
  visibleInputs: number;
  visibleButtons: number;
  enabledButtons: number;
  modalCount: number;
  url: string;
  timestamp: number;
}

interface Change {
  type:
  | "new_inputs_appeared"
  | "buttons_enabled"
  | "modal_opened"
  | "navigation";
  delta?: number;
  interpretation: string;
  from?: string;
  to?: string;
}

interface CausalRule {
  pattern: string;
  cause: string;
  solution: string;
  confidence: number;
  examples: Array<{ buttonSelector: string; inputSelectors: string[] }>;
}

/**
 * Intelligent Deep Explorer with LangGraph decision-making
 */
export class Explorer {
  private page: Page;
  private state: ExplorationState;
  private knowledgeStore: KnowledgeStore | null = null;
  private explorationGraph: StateGraph;
  private memory: MemorySaver;
  private maxDepth: number;
  private currentScope: Locator | null = null;
  private sessionId: string;
  /** Modal IDs to skip (already tested or not relevant) */
  private skipModals: Set<string>;
  /** Texts or selectors to explicitly block */
  private blockedElements: Set<string>;
  /** URLs that contain forms (login, signup, etc.) - only these get form-specific behavior */
  private static FORM_URL_PATTERNS = [
    /action\?login/i,
    /action\?signup/i,
    /login/i,
    /signup/i,
    /register/i,
    /auth/i,
    /kyc/i,
    /onboarding/i,
    /account\/create/i,
    /verify/i,
  ];

  constructor(page: Page, options?: ExplorerOptions) {
    this.page = page;
    this.maxDepth = options?.maxDepth || 5;
    this.sessionId = `exploration-${Date.now()}`;
    // Default: skip login/signup modals when exploring home page
    this.skipModals = new Set(options?.skipModals || []);
    this.blockedElements = new Set((options?.blockedElements || []).map(s => s.toLowerCase()));

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

    // Node 1: Make decision (now rule-based)
    graph.addNode("analyze_element", async (state: GraphState) => {
      if (!state.element) return state;
      const decision = await this.makeIntelligentDecision(
        state.element,
        state.context
      );
      return { ...state, decision };
    });

    // Node 2: Execute
    graph.addNode("execute_action", async (state: GraphState) => {
      if (!state.decision?.shouldInteract || !state.element) return state;
      const outcome = await this.executeInteraction(
        state.element,
        state.decision
      );
      return { ...state, outcome };
    });

    // Node 3: Learn (keep for pattern storage)
    graph.addNode("learn_pattern", async (state: GraphState) => {
      if (!state.outcome || !state.element || !state.decision) return state;
      const updatedPatterns = await this.learnFromOutcome(
        state.element,
        state.decision,
        state.outcome,
        state.context.learnedPatterns
      );
      return {
        ...state,
        context: { ...state.context, learnedPatterns: updatedPatterns },
      };
    });

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
      // Safety check
      if (this.page.isClosed()) {
        return {
          shouldInteract: false,
          interactionType: "skip",
          reasoning: "Page closed",
          confidence: 1.0,
          elementClassification: "unknown",
        };
      }

      // Probe runtime state (keep this - it's useful)
      const runtimeInfo = await this.probeElement(element);

      // If button is disabled, check if filling prerequisites would enable it
      if (element.type === "button" && !runtimeInfo.isEnabled) {
        const wouldEnableAfterFills = await this.testFillSequence();
        if (wouldEnableAfterFills) {
          return {
            shouldInteract: true,
            interactionType: "explore_deeper",
            reasoning: "Button disabled - filling prerequisites first",
            confidence: 0.9,
            elementClassification: "action_button",
          };
        }
      }

      // 1. Check learned causal rules FIRST
      const learnedRule = await this.checkCausalRules(element, context);
      if (learnedRule) {
        console.log(`   🧠 Applying learned rule: ${learnedRule.reasoning}`);
        return learnedRule;
      }

      // 2. Use pattern matching (no LLM)
      const patternMatch = this.checkLearnedPatterns(
        element,
        context.learnedPatterns
      );
      if (patternMatch) {
        return patternMatch;
      }

      // 3. Fallback: rule-based decision (NO LLM)
      return this.makeRuleBasedDecision(element, context);
    },
    { name: "make_decision", tags: ["exploration", "decision"] }
  );

  /**
   * Pure rule-based decision (NO LLM)
   */
  private makeRuleBasedDecision(
    element: ElementDescriptor,
    context: GraphState["context"]
  ): DecisionResult {
    const text = element.text.toLowerCase().trim();

    // RULE: Inputs on form pages → always fill
    if (element.type === "input" && this.isInFormContext()) {
      return {
        shouldInteract: true,
        interactionType: "fill",
        reasoning: "Input field in form context",
        confidence: 0.95,
        elementClassification: "input",
      };
    }

    // RULE: Inputs on non-form pages → skip (usually search boxes)
    if (element.type === "input" && !this.isInFormContext()) {
      return {
        shouldInteract: false,
        interactionType: "skip",
        reasoning: "Input on non-form page",
        confidence: 0.9,
        elementClassification: "input",
      };
    }

    // RULE: Submit buttons → only if enabled
    if (this.isContinueButton(element)) {
      return {
        shouldInteract: element.isEnabled,
        interactionType: element.isEnabled ? "click" : "skip",
        reasoning: element.isEnabled
          ? "Submit button ready"
          : "Submit button disabled",
        confidence: 0.95,
        elementClassification: "action_button",
      };
    }

    // RULE: Date pickers / dropdowns → complete selection
    if (this.isDatePickerTrigger(element) || this.isDropdownTrigger(element)) {
      return {
        shouldInteract: true,
        interactionType: "click",
        reasoning: "Dropdown/picker trigger",
        confidence: 0.9,
        elementClassification: "action_button",
      };
    }

    // RULE: Close buttons → skip
    if (this.isCloseButton(element)) {
      return {
        shouldInteract: false,
        interactionType: "skip",
        reasoning: "Close button - preserving context",
        confidence: 0.95,
        elementClassification: "close_button",
      };
    }

    // RULE: Disabled buttons → skip
    if (element.type === "button" && !element.isEnabled) {
      return {
        shouldInteract: false,
        interactionType: "skip",
        reasoning: "Button is disabled",
        confidence: 0.95,
        elementClassification: "action_button",
      };
    }

    // RULE: Buttons on feature pages → click to explore
    if (element.type === "button" && !this.isInFormContext()) {
      return {
        shouldInteract: true,
        interactionType: "click",
        reasoning: "Feature exploration button",
        confidence: 0.85,
        elementClassification: "action_button",
      };
    }

    // RULE: Links → click (but track navigation)
    if (element.type === "link") {
      return {
        shouldInteract: true,
        interactionType: "click",
        reasoning: "Navigation link",
        confidence: 0.8,
        elementClassification: "navigation",
      };
    }

    // Default: skip unknown elements
    return {
      shouldInteract: false,
      interactionType: "skip",
      reasoning: "No matching rule",
      confidence: 0.5,
      elementClassification: "unknown",
    };
  }

  /**
   * Helper: detect close buttons
   */
  private isCloseButton(element: ElementDescriptor): boolean {
    const text = element.text.toLowerCase();
    const selector = element.selector.toLowerCase();
    const ariaLabel = (element.attributes["aria-label"] || "").toLowerCase();

    return (
      text === "×" ||
      text === "✕" ||
      text === "close" ||
      ariaLabel.includes("close") ||
      selector.includes("close") ||
      selector.includes("dismiss")
    );
  }

  private async checkCausalRules(
    element: ElementDescriptor,
    context: GraphState["context"]
  ): Promise<DecisionResult | null> {
    // GUARD: Only apply form-related causal rules on form URLs or form modals
    if (!this.isInFormContext()) {
      return null;
    }

    const scope = this.currentScope || this.page.locator("body");

    // If this is a disabled button that looks like a form submit
    if (element.type === "button" && !element.isEnabled) {
      const text = element.text.toLowerCase();

      // Only apply rules to buttons that look like form submits
      // Skip "coming soon" type buttons
      const isSubmitLike =
        /continue|submit|create|sign up|register|next|proceed|save|confirm/i.test(
          text
        );
      const isComingSoon = /soon|coming|unavailable/i.test(text);

      if (isSubmitLike && !isComingSoon) {
        // Check if we learned this pattern before
        const rule =
          (await this.knowledgeStore?.query(
            "disabled_submit_button empty_required_inputs",
            "test_pattern",
            1
          )) ?? [];

        if (rule.length > 0) {
          return {
            shouldInteract: true,
            interactionType: "explore_deeper",
            reasoning:
              "Applying learned rule: Fill empty inputs to enable button",
            confidence: 0.95,
            elementClassification: "action_button",
          };
        }
      }
    }

    // If this is an empty input in a form with disabled submit-like button
    if (element.type === "input" && !element.value) {
      // Check for disabled submit buttons (not "coming soon" buttons)
      const disabledSubmitCount = await scope
        .locator('button[type="submit"]:disabled')
        .count();
      const disabledContinueCount = await scope
        .locator("button:disabled")
        .filter({ hasText: /continue|submit|next|create|save/i })
        .count();
      const hasDisabledSubmit =
        disabledSubmitCount > 0 || disabledContinueCount > 0;

      if (hasDisabledSubmit) {
        return {
          shouldInteract: true,
          interactionType: "fill",
          reasoning: "Input is empty and submit is disabled - likely required",
          confidence: 0.9,
          elementClassification: "input",
        };
      }
    }

    return null;
  }

  private async probeElement(element: ElementDescriptor): Promise<{
    isEnabled: boolean;
    computedStyle: any;
    ariaDisabled: boolean;
  }> {
    try {
      if (this.page.isClosed()) return { isEnabled: false, computedStyle: "", ariaDisabled: true };

      const locator =
        element.locator || this.page.locator(element.selector).first();

      const info = await locator.evaluate(
        (el: HTMLElement) => ({
          isEnabled: !el.hasAttribute("disabled"),
          computedStyle: window
            .getComputedStyle(el)
            .getPropertyValue("pointer-events"),
          ariaDisabled: el.getAttribute("aria-disabled") === "true",
        }),
        null,
        { timeout: 2000 }
      );

      return info;
    } catch (e) {
      console.error(`Probe failed: ${e.message}`);
      // Optionally: throw e; for critical paths
      return { isEnabled: false, computedStyle: "", ariaDisabled: true };
    }
  }

  private async testFillSequence(): Promise<boolean> {
    try {
      // Safety check: ensure page is still valid
      if (this.page.isClosed()) {
        return false;
      }

      const scope = this.currentScope || this.page.locator("body");
      const emptyInputs = await scope
        .locator("input:visible[required]:not([value])")
        .all();
      if (emptyInputs.length === 0) return false;

      // Temporarily fill
      const originalValues: string[] = [];
      for (const input of emptyInputs) {
        const value = await input.inputValue().catch(() => "");
        originalValues.push(value);
        await input.fill("test").catch(() => { });
      }

      // Check if button enabled (assume checking a specific button or general)
      const isEnabled = (await scope.locator("button:disabled").count()) === 0;

      // Rollback
      for (let i = 0; i < emptyInputs.length; i++) {
        await emptyInputs[i].fill(originalValues[i]).catch(() => { });
      }

      return isEnabled;
    } catch (e: any) {
      // Page likely closed or navigated
      console.log(
        `   ⚠️ testFillSequence failed: ${e.message?.substring(0, 50)}`
      );
      return false;
    }
  }

  /**
   * Check if element matches any learned patterns
   */
  // Track filled inputs to know when form is ready for Continue
  private filledInputsCount = 0;
  private expectedInputsInForm = 0;

  private checkLearnedPatterns(
    element: ElementDescriptor,
    patterns: Map<string, Pattern>
  ): DecisionResult | null {
    // Check skip modals FIRST
    const skipModalMatch = this.wouldOpenSkippedModal(element);
    if (skipModalMatch) {
      return {
        shouldInteract: false,
        interactionType: "skip",
        reasoning: `Skipping: Would open ${skipModalMatch}`,
        confidence: 1.0,
        elementClassification: "action_button",
      };
    }

    // Check blocked elements (explicit user overrides)
    if (this.isBlockedElement(element)) {
      return {
        shouldInteract: false,
        interactionType: "skip",
        reasoning: `Skipping: Element is explicitly blocked`,
        confidence: 1.0,
        elementClassification: "action_button",
      };
    }

    // Date picker days (1-31) → skip individual days
    if (this.isDatePickerDayButton(element)) {
      return {
        shouldInteract: false,
        interactionType: "skip",
        reasoning: "Date picker day button - handled by trigger",
        confidence: 1.0,
        elementClassification: "action_button",
      };
    }

    // Noise buttons (month names, years, country names) → skip
    if (this.isNoiseButton(element)) {
      return {
        shouldInteract: false,
        interactionType: "skip",
        reasoning: "Noise button (calendar navigation, etc.)",
        confidence: 0.95,
        elementClassification: "action_button",
      };
    }

    // Form inputs → fill (only on form pages)
    if (element.type === "input" && this.isInFormContext()) {
      return {
        shouldInteract: true,
        interactionType: "fill",
        reasoning: "Input in form context",
        confidence: 0.95,
        elementClassification: "input",
      };
    }

    // Non-form inputs → skip
    if (element.type === "input" && !this.isInFormContext()) {
      return {
        shouldInteract: false,
        interactionType: "skip",
        reasoning: "Input outside form context",
        confidence: 0.9,
        elementClassification: "input",
      };
    }

    // Date/dropdown triggers → complete selection
    if (
      this.isInFormContext() &&
      (this.isDatePickerTrigger(element) || this.isDropdownTrigger(element))
    ) {
      return {
        shouldInteract: true,
        interactionType: "click",
        reasoning: "Form dropdown/picker trigger",
        confidence: 0.9,
        elementClassification: "action_button",
      };
    }

    // Feature page buttons → click
    if (
      !this.isInFormContext() &&
      element.type === "button" &&
      element.isEnabled
    ) {
      return {
        shouldInteract: true,
        interactionType: "click",
        reasoning: "Feature exploration button",
        confidence: 0.85,
        elementClassification: "action_button",
      };
    }

    // Check stored patterns (close buttons, navigation)
    const closePattern = patterns.get("close_button");
    if (closePattern && closePattern.confidence > 0.8) {
      const isCloseButton =
        element.text.includes("×") ||
        element.text.includes("✕") ||
        element.attributes["aria-label"]?.toLowerCase().includes("close") ||
        closePattern.examples.some((ex) => element.selector.includes(ex));

      if (isCloseButton) {
        return {
          shouldInteract: false,
          interactionType: "skip",
          reasoning: "Learned close button pattern",
          confidence: closePattern.confidence,
          elementClassification: "close_button",
        };
      }
    }

    return null; // No pattern match - use rule-based decision
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
   * Check if element matches any blocked patterns
   */
  private isBlockedElement(element: ElementDescriptor): boolean {
    if (this.blockedElements.size === 0) return false;

    const text = element.text.toLowerCase();
    const selector = element.selector.toLowerCase();
    const ariaLabel = (element.attributes["aria-label"] || "").toLowerCase();

    for (const blocked of this.blockedElements) {
      if (
        text === blocked ||
        text.includes(blocked) ||
        ariaLabel === blocked ||
        ariaLabel.includes(blocked) ||
        selector.includes(blocked)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if current URL is a form URL (login, signup, KYC, etc.)
   * Only form URLs get form-specific behavior like input filling and submit detection
   */
  private isFormUrl(): boolean {
    const currentUrl = this.page.url();
    return Explorer.FORM_URL_PATTERNS.some((pattern) =>
      pattern.test(currentUrl)
    );
  }

  /**
   * Check if we're in a modal that's a form (login-modal, signup-modal, etc.)
   */
  private isFormModal(): boolean {
    const currentModal =
      this.state.modalStack[this.state.modalStack.length - 1] || "";
    return /login|signup|register|auth|kyc|verify/i.test(currentModal);
  }

  /**
   * Determine if current context is a form context (either form URL or form modal)
   */
  private isInFormContext(): boolean {
    return this.isFormUrl() || this.isFormModal();
  }

  private async detectFormContext(scope: Locator): Promise<boolean> {
    // Only detect form context on form URLs or form modals
    if (!this.isInFormContext()) {
      return false;
    }

    try {
      const formExists = (await scope.locator("form").count()) > 0;
      const inputCount = await scope.locator("input:visible").count();
      const submitButtonCount = await scope
        .locator('button[type="submit"]')
        .count();
      const continueButtonCount = await scope
        .locator("button")
        .filter({ hasText: /continue|submit|next/i })
        .count();
      const submitButton = submitButtonCount > 0 || continueButtonCount > 0;

      return formExists || (inputCount >= 2 && submitButton);
    } catch {
      return false;
    }
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
            // SPECIAL CASE: Date picker trigger - complete the selection
            if (this.isDatePickerTrigger(element)) {
              await this.completeDropdownSelection(locator, element, "date");
              return { success: true, modalOpened: false, urlChanged: false };
            }

            // SPECIAL CASE: Country/dropdown trigger - complete the selection
            if (this.isDropdownTrigger(element)) {
              await this.completeDropdownSelection(
                locator,
                element,
                "dropdown"
              );
              return { success: true, modalOpened: false, urlChanged: false };
            }

            // SPECIAL CASE: Continue/Submit button - check if form content changes (step progression)
            if (this.isContinueButton(element)) {
              const beforeElements = await this.countFormElements();
              await locator.click({ timeout: 3000 });
              await this.page.waitForTimeout(1500);
              const afterElements = await this.countFormElements();

              // If form content changed (new inputs appeared), trigger re-exploration
              if (afterElements.inputCount !== beforeElements.inputCount) {
                console.log(
                  `      📋 Form progressed: ${beforeElements.inputCount} → ${afterElements.inputCount} inputs`
                );
                return { success: true, modalOpened: true, urlChanged: false }; // Treat as "new modal" to trigger re-exploration
              }
              return { success: true, modalOpened: false, urlChanged: false };
            }

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
   * Detect if a button is a date picker trigger
   */
  private isDatePickerTrigger(element: ElementDescriptor): boolean {
    const text = element.text.toLowerCase();
    const selector = element.selector.toLowerCase();
    const attrs = JSON.stringify(element.attributes).toLowerCase();

    return (
      text.includes("date of birth") ||
      text.includes("select date") ||
      text.includes("dob") ||
      text.includes("birthday") ||
      selector.includes("date") ||
      selector.includes("dob") ||
      attrs.includes("date") ||
      attrs.includes("calendar")
    );
  }

  /**
   * Detect if a button is a dropdown trigger (country, etc.)
   */
  private isDropdownTrigger(element: ElementDescriptor): boolean {
    const text = element.text.toLowerCase();
    const selector = element.selector.toLowerCase();
    const attrs = JSON.stringify(element.attributes).toLowerCase();

    return (
      text.includes("select country") ||
      text.includes("select region") ||
      text.includes("select state") ||
      text.includes("choose") ||
      selector.includes("country") ||
      selector.includes("dropdown") ||
      attrs.includes("listbox") ||
      attrs.includes("combobox")
    );
  }

  /**
   * Detect if a button is a Continue/Submit button
   * MUST have explicit text - empty buttons are NOT Continue buttons
   */
  private isContinueButton(element: ElementDescriptor): boolean {
    const text = element.text.toLowerCase().trim();

    // MUST have text to be a Continue button - empty buttons are NOT submit buttons
    if (!text || text.length < 2) {
      return false;
    }

    // Must match specific continue/submit patterns
    return /continue|submit|next|proceed|go|create account|sign up|register|save/i.test(
      text
    );
  }

  /**
   * Count form elements (to detect step changes)
   */
  private async countFormElements(): Promise<{
    inputCount: number;
    buttonCount: number;
  }> {
    try {
      const scopeLocator = this.currentScope || this.page.locator("body");
      const inputCount = await scopeLocator.locator("input:visible").count();
      const buttonCount = await scopeLocator.locator("button:visible").count();
      return { inputCount, buttonCount };
    } catch {
      return { inputCount: 0, buttonCount: 0 };
    }
  }

  /**
   * Complete a dropdown or date picker selection (instead of just exploring it)
   */
  private async completeDropdownSelection(
    locator: Locator,
    element: ElementDescriptor,
    type: "date" | "dropdown"
  ): Promise<void> {
    try {
      // Click to open the dropdown/picker
      await locator.click({ timeout: 3000 });
      await this.page.waitForTimeout(500);

      if (type === "date") {
        // For date pickers: select a valid date (e.g., 15th of current displayed month)
        // First try to find a day button that's selectable (not disabled, in current month)
        const dayButton = this.page
          .locator('button:has-text("15"):not([disabled])')
          .first();
        if (await dayButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await dayButton.click();
          console.log(`      ✅ Selected date: 15`);
        } else {
          // Fallback: click any visible day button
          const anyDay = this.page
            .locator("button")
            .filter({ hasText: /^([1-9]|[12][0-9]|3[01])$/ })
            .first();
          if (await anyDay.isVisible({ timeout: 1000 }).catch(() => false)) {
            await anyDay.click();
            console.log(`      ✅ Selected a date`);
          }
        }
        await this.page.waitForTimeout(300);
      } else {
        // For country dropdowns: look for specific country (UAE) or first available
        // The SignUpModal uses <div> elements with country names, not buttons

        // First, try to select UAE specifically
        const uaeOption = this.page
          .locator("div")
          .filter({ hasText: /United Arab Emirates|UAE/i })
          .first();
        if (await uaeOption.isVisible({ timeout: 500 }).catch(() => false)) {
          await uaeOption.click();
          console.log(`      ✅ Selected country: United Arab Emirates`);
          await this.page.waitForTimeout(300);
          return;
        }

        // Try clicking div elements with country-like text (inside dropdown container)
        // Look for divs with flag images (country options have img tags)
        const countryDivs = this.page.locator(
          "div.overflow-y-auto div:has(img)"
        );
        const firstCountry = countryDivs.first();
        if (await firstCountry.isVisible({ timeout: 500 }).catch(() => false)) {
          const countryText = await firstCountry.textContent().catch(() => "");
          await firstCountry.click();
          console.log(
            `      ✅ Selected country: ${countryText?.trim().substring(0, 25)}`
          );
          await this.page.waitForTimeout(300);
          return;
        }

        // Try standard dropdown option selectors
        const optionSelectors = [
          '[role="option"]',
          '[role="listitem"]',
          "li[data-value]",
          ".dropdown-item",
          '[data-testid*="option"]',
        ];

        for (const optSel of optionSelectors) {
          const option = this.page.locator(optSel).first();
          if (await option.isVisible({ timeout: 300 }).catch(() => false)) {
            const optionText = await option.textContent().catch(() => "");
            await option.click();
            console.log(
              `      ✅ Selected dropdown option: ${optionText?.substring(
                0,
                20
              )}`
            );
            await this.page.waitForTimeout(300);
            return;
          }
        }

        // Last fallback: click any clickable item in the dropdown area
        const anyClickable = this.page
          .locator(".max-h-32 > div, .max-h-48 > div")
          .first();
        if (await anyClickable.isVisible({ timeout: 300 }).catch(() => false)) {
          const text = await anyClickable.textContent().catch(() => "");
          await anyClickable.click();
          console.log(`      ✅ Selected: ${text?.trim().substring(0, 25)}`);
        } else {
          console.log(`      ⚠️ Could not find any dropdown option to select`);
        }

        await this.page.waitForTimeout(300);
      }
    } catch (e: any) {
      console.log(
        `      ⚠️ Could not complete ${type} selection: ${e.message?.substring(
          0,
          50
        )}`
      );
    }
  }

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
  async explore(
    url: string,
    skipInitialNav: boolean = false
  ): Promise<ExplorationState> {
    console.log(`\n🔍 [IntelligentExplorer] Starting exploration: ${url}`);
    console.log(`   Using LangGraph for intelligent decision-making`);
    console.log(`   Max depth: ${this.maxDepth}\n`);

    if (!this.knowledgeStore) {
      this.knowledgeStore = await getKnowledgeStore();
    }

    if (!skipInitialNav) {
      await this.page.goto(url, { waitUntil: "networkidle" });
    } else {
      console.log("   ⏭️  Skipping initial navigation (already authenticated)");
      // Just navigate to the target URL
      await this.page.goto(url, { waitUntil: "networkidle" });
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
    console.log(`   Patterns learned: ${this.state.learnedPatterns.size}`);

    // NEW: Log form flow if it was a multi-step form
    if (this.formSteps.length > 0) {
      console.log(`\n📋 DISCOVERED FORM FLOW:`);
      console.log(`   Type: Multi-step form (${this.formSteps.length} steps)`);
      this.formSteps.forEach((step) => {
        console.log(
          `   Step ${step.stepNumber}: ${step.inputs.length} inputs → "${step.submitButton}"`
        );
      });
    }

    // Return enhanced state with form flow info
    return {
      ...this.state,
      formFlow:
        this.formSteps.length > 0
          ? {
            type: "multi_step_form",
            steps: this.formSteps,
            totalSteps: this.formSteps.length,
          }
          : null,
    };
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

    // 🔥 NEW: Detect if we're in a form context
    this.currentScope = await this.getInteractiveScope();
    if (!this.currentScope) {
      console.log(`${indent}   ⚠️ No valid scope, stopping`);
      return;
    }
    const isForm = await this.detectFormContext(this.currentScope);

    if (isForm) {
      console.log(`${indent}   📋 Form detected - using sequential strategy`);
      return await this.exploreFormSequentially(depth);
    }

    this.currentScope = await this.getInteractiveScope();
    if (!this.currentScope) {
      console.log(`${indent}   ⚠️ No valid scope, stopping`);
      return;
    }

    // 🔥 NEW: First, discover causal relationships
    await this.discoverCausalRelationships(this.currentScope);

    // Then proceed with normal exploration (now informed by learned rules)
    const elements = await this.discoverInteractiveElements();
    console.log(`${indent}   Found ${elements.length} elements`);

    // Store the original URL to detect navigation
    const originalUrl = this.page.url();

    for (const element of elements) {
      // Safety check: stop if page closed
      if (this.page.isClosed()) {
        console.log(`${indent}   ⚠️ Page closed, stopping element iteration`);
        break;
      }

      const elementKey = `${element.selector}::${element.text}`;
      if (this.state.exploredElements.has(elementKey)) {
        continue;
      }

      this.state.exploredElements.add(elementKey);

      // Safety check: verify element is still connected
      const isConnected = await element.locator?.count().then(c => c > 0).catch(() => false) ||
        await this.page.locator(element.selector).count().then(c => c > 0).catch(() => false);

      if (!isConnected) {
        console.log(`${indent}   ⚠️ Element no longer connected, skipping`);
        continue;
      }

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
        `${indent}   ${element.type}: "${element.text.substring(0, 30)}" → ${result.decision?.interactionType
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

      // If we are in a modal context and it just closed, stop processing remaining elements
      if (this.state.currentContext.startsWith('modal:') && !result.outcome?.modalOpened && result.decision?.interactionType !== 'skip') {
        // Check if modal actually closed
        const modalStillExists = await this.currentScope?.count().then(c => c > 0).catch(() => false);
        if (!modalStillExists) {
          console.log(`${indent}   🚫 Modal closed by action, stopping element iteration`);
          break;
        }
      }

      // Handle navigation - if URL changed, explore the new page then go back
      if (result.outcome?.urlChanged) {
        const newUrl = this.page.url();
        console.log(
          `${indent}   🔗 Navigation detected: ${originalUrl} → ${newUrl}`
        );

        // Log this as a discovered navigation
        this.state.interactionLogs.push({
          element,
          action: "navigate",
          decision: result.decision!,
          beforeState: originalUrl,
          afterState: newUrl,
          apiCalls: [],
          newElementsAppeared: [],
          timestamp: new Date().toISOString(),
        });

        // Explore the new page at deeper depth (optional - limited to prevent infinite loops)
        if (depth < this.maxDepth - 2) {
          console.log(`${indent}   📍 Exploring navigated page: ${newUrl}`);
          this.state.currentContext = `page:${newUrl}`;
          await this.exploreCurrentContext(depth + 1);
        }

        // Navigate back to continue exploring other elements
        console.log(`${indent}   ⬅️  Navigating back to: ${originalUrl}`);
        try {
          await this.page.goto(originalUrl, {
            waitUntil: "networkidle",
            timeout: 10000,
          });
          await this.page.waitForTimeout(1000);
          this.state.currentContext =
            depth === 0
              ? "root"
              : `modal:${this.state.modalStack[this.state.modalStack.length - 1] ||
              "root"
              }`;
        } catch (e: any) {
          console.log(
            `${indent}   ⚠️ Could not navigate back: ${e.message?.substring(
              0,
              50
            )}`
          );
          // If we can't go back, stop exploring this level
          break;
        }
        continue; // Continue to next element after navigating back
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
              ? `modal:${this.state.modalStack[this.state.modalStack.length - 1]
              }`
              : "root";
        } else if (modalId && this.state.modalStack.includes(modalId)) {
          // FORM STEP CHANGE: Same modal but content changed (e.g., Step 1 → Step 2)
          // Re-explore the same modal context to discover new elements

          // Count how many steps we've already explored in this modal (max 3 steps)
          const stepsInModal = this.state.modalStack.filter((m) =>
            m.startsWith(modalId)
          ).length;
          const MAX_FORM_STEPS = 3;

          if (stepsInModal < MAX_FORM_STEPS) {
            console.log(
              `${indent}   📋 Form step change detected in ${modalId} - re-exploring (step ${stepsInModal + 1
              }/${MAX_FORM_STEPS})`
            );

            // Create a step-specific context to avoid infinite loops
            const stepContext = `${modalId}-step-${stepsInModal + 1}`;
            this.state.modalStack.push(stepContext);
            this.state.currentContext = `modal:${stepContext}`;
            await this.exploreCurrentContext(depth + 1);
            this.state.modalStack.pop();
            this.state.currentContext =
              this.state.modalStack.length > 0
                ? `modal:${this.state.modalStack[this.state.modalStack.length - 1]
                }`
                : "root";
          } else {
            console.log(
              `${indent}   ⚠️ Max form steps (${MAX_FORM_STEPS}) reached for ${modalId} - stopping`
            );
          }
        }
      }
    }

    console.log(
      `${indent}   ✅ Context complete: ${elements.length} elements processed`
    );
  }

  private async discoverCausalRelationships(scope: Locator): Promise<void> {
    // GUARD: Only run causal discovery on form pages (login, signup, KYC, etc.)
    if (!this.isInFormContext()) {
      return;
    }

    // Find disabled buttons that LOOK like form submit buttons
    // (not "coming soon" or feature toggle buttons)
    const allDisabledButtons = await scope.locator("button:disabled").all();

    const submitLikeButtons: typeof allDisabledButtons = [];
    for (const button of allDisabledButtons) {
      const text = ((await button.textContent()) || "").toLowerCase().trim();
      const type = await button.getAttribute("type");

      // Only consider buttons that look like form submits:
      // - Has type="submit"
      // - Has submit-like text (continue, submit, create, sign up, next, etc.)
      // - NOT buttons with "soon", "coming", "disabled" in text (feature toggles)
      const isSubmitType = type === "submit";
      const hasSubmitText =
        /continue|submit|create|sign up|register|next|proceed|save|confirm/i.test(
          text
        );
      const isComingSoon = /soon|coming|unavailable|disabled/i.test(text);

      if ((isSubmitType || hasSubmitText) && !isComingSoon) {
        submitLikeButtons.push(button);
      }
    }

    if (submitLikeButtons.length === 0) {
      // No form-submit-like disabled buttons found
      return;
    }

    for (const button of submitLikeButtons) {
      const buttonText = (await button.textContent()) || "button";
      console.log(
        `   🔬 Experimenting: Why is "${buttonText
          .trim()
          .substring(0, 30)}" disabled?`
      );

      // Hypothesis: Empty inputs might be the cause
      const emptyInputs = await scope
        .locator('input:visible:not([type="hidden"])')
        .filter({ has: this.page.locator(":not([value])") })
        .all();

      // Alternative: check for inputs with empty value
      const inputsToFill: typeof emptyInputs = [];
      for (const input of await scope
        .locator('input:visible:not([type="hidden"])')
        .all()) {
        const value = await input.inputValue().catch(() => "");
        if (!value.trim()) {
          inputsToFill.push(input);
        }
      }

      if (inputsToFill.length > 0) {
        console.log(
          `      Found ${inputsToFill.length} empty inputs - testing if filling enables button`
        );

        // Fill them
        for (const input of inputsToFill) {
          const descriptor = await this.createElementDescriptor(input, "input");
          if (descriptor) {
            await this.executeInteraction(descriptor, {
              shouldInteract: true,
              interactionType: "fill",
              reasoning: "Testing causal relationship",
              confidence: 1.0,
              elementClassification: "input",
            });
          }
        }

        // Check if button is now enabled
        const isNowEnabled = await button.isEnabled().catch(() => false);

        if (isNowEnabled) {
          console.log(
            `      ✅ LEARNED: Filling inputs enables this button type`
          );

          // Rollback fills
          for (const input of inputsToFill) {
            await input.clear();
          }

          // Store this pattern
          await this.storeCausalRule({
            pattern: "disabled_submit_button",
            cause: "empty_required_inputs",
            solution: "fill_all_inputs",
            confidence: 1.0,
            examples: [
              {
                buttonSelector: await this.generateSelector(button, {}),
                inputSelectors: await Promise.all(
                  inputsToFill.map((i) => this.generateSelector(i, {}))
                ),
              },
            ],
          });
        } else {
          // Rollback even if it didn't work
          for (const input of inputsToFill) {
            await input.clear().catch(() => { });
          }
        }
      }
    }
  }

  /**
   * Store learned causal rules in knowledge store
   */
  private async storeCausalRule(rule: CausalRule): Promise<void> {
    if (!this.knowledgeStore) return;

    await this.knowledgeStore.storePattern({
      type: "test_pattern",
      featureName: "causal_rules",
      testName: rule.pattern,
      steps: [rule.cause, rule.solution],
      assertions: [`Expect ${rule.pattern} to be resolved`],
      selectors: rule.examples.flatMap((e) => [
        e.buttonSelector,
        ...e.inputSelectors,
      ]),
      sourceFile: "self_discovered",
    });
  }

  /**
   * Track form steps explicitly
   */
  private formSteps: Array<{
    stepNumber: number;
    inputs: string[];
    submitButton: string;
    timestamp: string;
  }> = [];

  private async exploreFormSequentially(depth: number): Promise<void> {
    const scope = this.currentScope || this.page.locator("body");
    const stepNumber = this.formSteps.length + 1;

    console.log(`   📋 FORM STEP ${stepNumber}`);

    // Capture BEFORE state
    const beforeState = await this.captureFormState();

    // Step 1: Fill ALL visible inputs
    const inputs = await scope
      .locator('input:visible:not([type="hidden"])')
      .all();
    const filledInputs: string[] = [];

    console.log(`   📝 Filling ${inputs.length} inputs`);
    for (const input of inputs) {
      const descriptor = await this.createElementDescriptor(input, "input");
      if (!descriptor) continue;

      const testValue = this.getTestValueForInput(
        descriptor.attributes["type"] || "text",
        descriptor
      );

      try {
        await input.fill(testValue);
        filledInputs.push(descriptor.attributes["name"] || descriptor.selector);
        console.log(
          `      ✅ Filled: ${descriptor.attributes["name"] || "input"}`
        );
        await this.page.waitForTimeout(200);
      } catch (e: any) {
        console.log(`      ⚠️ Could not fill: ${e.message?.substring(0, 30)}`);
      }
    }

    // Step 2: Handle special controls
    await this.handleSpecialInputs(scope);

    // Step 3: Find and click submit button
    const submitButton = scope
      .locator('button[type="submit"]')
      .or(
        scope
          .locator("button")
          .filter({ hasText: /continue|submit|next|create/i })
      )
      .first();

    const isEnabled = await submitButton.isEnabled().catch(() => false);

    if (!isEnabled) {
      console.log(
        `   ⚠️ Submit button still disabled - stopping at step ${stepNumber}`
      );
      return;
    }

    const submitText = await submitButton.textContent().catch(() => "Submit");
    console.log(`   🚀 Clicking: "${submitText?.trim()}"`);

    // Record this step BEFORE clicking
    this.formSteps.push({
      stepNumber,
      inputs: filledInputs,
      submitButton: submitText?.trim() || "Submit",
      timestamp: new Date().toISOString(),
    });

    // Click submit
    await submitButton.click().catch(() => { });
    await this.page.waitForTimeout(1500);

    // Capture AFTER state
    const afterState = await this.captureFormState();

    // DETECT PROGRESSION
    const didProgress = this.didFormProgress(beforeState, afterState);

    if (didProgress) {
      console.log(
        `   ✅ Form progressed: Step ${stepNumber} → Step ${stepNumber + 1}`
      );
      console.log(
        `      Inputs: ${beforeState.inputCount} → ${afterState.inputCount}`
      );

      // Recurse to explore next step (with depth limit)
      if (stepNumber < 5) {
        // Max 5 steps
        return await this.exploreFormSequentially(depth + 1);
      } else {
        console.log(`   ⚠️ Max steps reached (5)`);
      }
    } else {
      console.log(`   ✅ Form completed at step ${stepNumber}`);
    }
  }

  /**
   * Capture form state for comparison
   */
  private async captureFormState() {
    const scope = this.currentScope || this.page.locator("body");
    return {
      inputCount: await scope.locator("input:visible").count(),
      buttonCount: await scope.locator("button:visible").count(),
      url: this.page.url(),
      timestamp: Date.now(),
    };
  }

  /**
   * Detect if form progressed to next step
   */
  private didFormProgress(before: any, after: any): boolean {
    // New inputs appeared = new step
    if (after.inputCount > before.inputCount) {
      return true;
    }

    // URL changed = navigation to new page
    if (after.url !== before.url) {
      return true;
    }

    // Different input count = content changed
    if (after.inputCount !== before.inputCount && after.inputCount > 0) {
      return true;
    }

    return false;
  }

  private async handleSpecialInputs(scope: Locator): Promise<void> {
    // Date pickers
    const dateTriggers = await scope
      .locator("button")
      .filter({ hasText: /date|dob|birth/i })
      .all();
    for (const trigger of dateTriggers) {
      if (await trigger.isVisible()) {
        await trigger.click();
        await this.page.waitForTimeout(500);

        // Select 15th of current month
        const dayButton = this.page
          .locator("button:not([disabled])")
          .filter({ hasText: "15" })
          .first();
        if (await dayButton.isVisible().catch(() => false)) {
          await dayButton.click();
          console.log(`      ✅ Selected date: 15`);
        }
      }
    }

    // Country dropdowns
    const countryTriggers = await scope
      .locator("button")
      .filter({ hasText: /country|residence/i })
      .all();
    for (const trigger of countryTriggers) {
      if (await trigger.isVisible()) {
        await trigger.click();
        await this.page.waitForTimeout(500);

        // Select first country
        const firstCountry = this.page
          .locator('div[role="option"], li[data-value]')
          .first();
        if (await firstCountry.isVisible().catch(() => false)) {
          await firstCountry.click();
          console.log(`      ✅ Selected country`);
        }
      }
    }
  }

  /**
   * Get interactive scope - automatically detects modals, dropdowns, or uses page body
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

    // Strategy 1b: Detect dropdown menus (often appear after clicking buttons)
    const dropdownSelectors = [
      '[role="menu"]', // ARIA menu
      '[role="listbox"]', // ARIA listbox/dropdown
      '[role="tooltip"]', // Tooltips
      '[data-state="open"]', // Radix/Headless UI pattern
      '[data-open="true"]', // Common open state
    ];

    for (const selector of ariaModalSelectors) {
      try {
        const modal = this.page.locator(selector).first();
        if (await modal.isVisible({ timeout: 500 })) {
          console.log(`   📦 Found modal (ARIA): ${selector}`);
          return modal;
        }
      } catch { }
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
    } catch { }

    // Strategy 5: Detect dropdown menus (for sub-menus after clicking)
    for (const selector of dropdownSelectors) {
      try {
        const dropdown = this.page.locator(selector).first();
        if (await dropdown.isVisible({ timeout: 300 })) {
          console.log(`   📂 Found dropdown (${selector})`);
          return dropdown;
        }
      } catch { }
    }

    // Strategy 6: Detect visible popover/menu content by class patterns
    try {
      const popoverElements = await this.page
        .locator("div")
        .evaluateAll((elements) => {
          return elements
            .filter((el) => {
              const classes = el.className || "";
              const style = window.getComputedStyle(el);

              // Look for elements that:
              // - Are visible and have reasonable size
              // - Have popover/menu-like class patterns
              // - Are positioned absolutely/fixed with high z-index
              const isVisible =
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                el.offsetWidth > 100 &&
                el.offsetHeight > 50;

              const hasMenuClasses =
                /dropdown|popover|menu|submenu|flyout/i.test(classes);
              const isPositioned =
                (style.position === "absolute" || style.position === "fixed") &&
                parseInt(style.zIndex, 10) > 10;

              return isVisible && (hasMenuClasses || isPositioned);
            })
            .map((el) => ({
              testId: el.getAttribute("data-testid"),
              id: el.id,
              className: el.className?.split(" ").slice(0, 2).join("."),
            }))[0];
        });

      if (popoverElements) {
        const sel = popoverElements.testId
          ? `[data-testid="${popoverElements.testId}"]`
          : popoverElements.id
            ? `#${popoverElements.id}`
            : popoverElements.className
              ? `.${popoverElements.className}`
              : null;

        if (sel) {
          const element = this.page.locator(sel).first();
          if (await element.isVisible({ timeout: 300 })) {
            console.log(`   📂 Found popover/menu: ${sel}`);
            return element;
          }
        }
      }
    } catch { }

    // Fallback: Use body if no modal/dropdown detected
    console.log("   📦 No modal/dropdown detected, using body scope");
    return this.page.locator("body");
  }

  /**
   * Discover interactive elements (buttons, inputs, links, etc.)
   */
  private async discoverInteractiveElements(): Promise<ElementDescriptor[]> {
    const inputElements: ElementDescriptor[] = [];
    const buttonElements: ElementDescriptor[] = [];
    const linkElements: ElementDescriptor[] = [];
    const scopeLocator = this.currentScope || this.page.locator("body");

    // PRIORITY 1: Inputs (text, email, password, etc.) - these are the main form elements
    const inputs = await scopeLocator
      .locator('input:not([type="hidden"]):not([type="submit"]), textarea')
      .all();
    for (const input of inputs) {
      const descriptor = await this.createElementDescriptor(input, "input");
      if (descriptor?.isVisible) {
        inputElements.push(descriptor);
        await this.storeSelector(descriptor);
      }
    }

    // PRIORITY 2: Buttons (but filter out date picker and numeric patterns)
    const buttons = await scopeLocator
      .locator('button, [role="button"], input[type="submit"]')
      .all();
    for (const btn of buttons) {
      const descriptor = await this.createElementDescriptor(btn, "button");
      if (descriptor?.isVisible) {
        // Filter out date picker day buttons (numeric 1-31)
        if (this.isDatePickerDayButton(descriptor)) {
          continue; // Skip individual day buttons
        }
        // Filter out other noise patterns
        if (this.isNoiseButton(descriptor)) {
          continue;
        }
        buttonElements.push(descriptor);
        await this.storeSelector(descriptor);
      }
    }

    // PRIORITY 3: Links
    const links = await scopeLocator.locator("a[href]").all();
    for (const link of links) {
      const descriptor = await this.createElementDescriptor(link, "link");
      if (descriptor?.isVisible) {
        linkElements.push(descriptor);
        await this.storeSelector(descriptor);
      }
    }

    // Return elements in priority order: inputs first, then buttons, then links
    // This ensures form fields are explored before auxiliary buttons
    return [...inputElements, ...buttonElements, ...linkElements];
  }

  /**
   * Detect if a button is a date picker day button (1-31 pattern)
   */
  private isDatePickerDayButton(element: ElementDescriptor): boolean {
    const text = element.text.trim();

    // Check if text is a number 1-31 (day of month)
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 1 && num <= 31 && text === String(num)) {
      // Additional check: look for date picker context in selector
      const selector = element.selector.toLowerCase();
      const attrs = JSON.stringify(element.attributes).toLowerCase();

      // If it's in a calendar/date context, skip it
      if (
        selector.includes("calendar") ||
        selector.includes("date") ||
        selector.includes("day") ||
        selector.includes("picker") ||
        attrs.includes("calendar") ||
        attrs.includes("date")
      ) {
        return true;
      }

      // Even without explicit context, single digit buttons 1-31 are likely calendar days
      // if we're in a modal context
      if (this.state.modalStack.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect noise buttons that shouldn't be explored individually
   */
  private isNoiseButton(element: ElementDescriptor): boolean {
    const text = element.text.trim().toLowerCase();
    const selector = element.selector.toLowerCase();

    // Skip navigation arrows in date pickers
    if (
      text === "" &&
      (selector.includes("prev") ||
        selector.includes("next") ||
        selector.includes("arrow") ||
        selector.includes("chevron"))
    ) {
      // These are likely calendar navigation - we can skip them or explore once
      return false; // Let the LLM decide on these
    }

    // Skip month/year buttons in date pickers
    const months = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
      "jan",
      "feb",
      "mar",
      "apr",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];
    if (months.some((m) => text === m)) {
      return true; // Skip individual month buttons in date pickers
    }

    // Skip year buttons (1900-2100)
    const yearNum = parseInt(text, 10);
    if (
      !isNaN(yearNum) &&
      yearNum >= 1900 &&
      yearNum <= 2100 &&
      text === String(yearNum)
    ) {
      return true;
    }

    // Skip date display buttons (e.g., "15 Jan 2000", "21 Dec 1995")
    if (
      /^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}$/i.test(
        text
      )
    ) {
      return true;
    }

    // Skip country name display buttons (already selected country)
    // Common country patterns
    const countryPatterns = [
      "united arab emirates",
      "uae",
      "saudi arabia",
      "united states",
      "united kingdom",
      "canada",
      "australia",
      "india",
      "pakistan",
      "germany",
      "france",
      "spain",
      "italy",
      "netherlands",
      "belgium",
      "switzerland",
      "austria",
      "sweden",
      "norway",
      "denmark",
      "finland",
      "poland",
      "portugal",
      "ireland",
      "new zealand",
      "singapore",
      "malaysia",
      "indonesia",
      "philippines",
      "thailand",
      "vietnam",
      "japan",
      "south korea",
      "china",
      "brazil",
      "mexico",
      "argentina",
      "chile",
      "colombia",
      "peru",
      "egypt",
      "morocco",
      "south africa",
      "nigeria",
      "kenya",
      "qatar",
      "kuwait",
      "bahrain",
      "oman",
    ];
    if (countryPatterns.some((c) => text === c)) {
      return true;
    }

    return false;
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
      const value =
        type === "input"
          ? await locator.inputValue().catch(() => "")
          : undefined;
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

      const meaningfulText =
        text.trim() ||
        attributes["aria-label"] ||
        attributes["placeholder"] ||
        attributes["title"] ||
        attributes["alt"] ||
        attributes["data-testid"] ||
        attributes["id"] ||
        "unlabeled";

      return {
        selector,
        text: meaningfulText.substring(0, 100),
        type,
        attributes,
        isVisible,
        isEnabled,
        boundingBox,
        locator,
        value,
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate selector - prioritize stable, role-based, and text-based selectors
   * Avoids brittle Tailwind class selectors
   */
  private async generateSelector(
    locator: Locator,
    attrs: Record<string, string>
  ): Promise<string> {
    // Priority 1: Explicit test IDs (most stable)
    if (attrs["data-testid"]) return `[data-testid="${attrs["data-testid"]}"]`;

    // Priority 2: ID (stable if exists)
    if (attrs["id"]) return `#${attrs["id"]}`;

    // Priority 3: Name attribute (common for form inputs)
    if (attrs["name"]) return `[name="${attrs["name"]}"]`;

    // Priority 4: ARIA label (accessible and stable)
    if (attrs["aria-label"]) {
      const label = attrs["aria-label"].replace(/"/g, '\\"');
      return `[aria-label="${label}"]`;
    }

    // Priority 5: Placeholder for inputs (stable for form fields)
    if (attrs["placeholder"]) {
      const placeholder = attrs["placeholder"].replace(/"/g, '\\"');
      return `[placeholder="${placeholder}"]`;
    }

    // Priority 6: Role-based selectors with text
    if (attrs["role"]) {
      const role = attrs["role"];
      try {
        const text = await locator.textContent().catch(() => "");
        const cleanText = text?.trim().slice(0, 30).replace(/"/g, '\\"');
        if (cleanText) {
          return `[role="${role}"]:has-text("${cleanText}")`;
        }
        return `[role="${role}"]`;
      } catch { }
    }

    try {
      const selector = await locator.evaluate((el) => {
        const tagName = el.tagName.toLowerCase();

        // For buttons, prefer text-based selectors (most stable)
        if (tagName === "button" || el.getAttribute("type") === "button") {
          const text = el.textContent?.trim().slice(0, 40);
          if (text) {
            return `button:has-text("${text.replace(/"/g, '\\"')}")`;
          }
        }

        // For inputs, try to find identifying attributes
        if (tagName === "input") {
          const type = el.getAttribute("type") || "text";
          const placeholder = el.getAttribute("placeholder");
          if (placeholder) {
            return `input[placeholder="${placeholder.replace(/"/g, '\\"')}"]`;
          }
          return `input[type="${type}"]`;
        }

        // For links, use href or text
        if (tagName === "a") {
          const text = el.textContent?.trim().slice(0, 30);
          if (text) {
            return `a:has-text("${text.replace(/"/g, '\\"')}")`;
          }
          const href = el.getAttribute("href");
          if (href && href !== "#") {
            return `a[href="${href.replace(/"/g, '\\"')}"]`;
          }
        }

        // Generic fallback: tag + visible text (avoiding Tailwind classes)
        const text = el.textContent?.trim().slice(0, 30);
        if (text) {
          return `${tagName}:has-text("${text.replace(/"/g, '\\"')}")`;
        }

        // Last resort: only use non-Tailwind classes
        const safeClasses = Array.from(el.classList)
          .filter((cls) => {
            // Filter out Tailwind utility classes
            return (
              !/^(bg-|text-|p-|m-|w-|h-|flex|grid|absolute|relative|fixed|top-|left-|right-|bottom-|z-|rounded|border|shadow|transition|hover:|focus:|active:)/.test(
                cls
              ) && !/[:\.\[\]\/]/.test(cls)
            );
          })
          .slice(0, 2);

        if (safeClasses.length > 0) {
          return `${tagName}.${safeClasses.join(".")}`;
        }

        return tagName;
      });
      return selector;
    } catch {
      return "unknown";
    }
  }

  /**
   * Detect new modal or dropdown that appeared after an interaction
   */
  private async detectNewModal(): Promise<string | null> {
    // Check for modals first
    const modalSelectors = [
      '[role="dialog"]',
      '[data-testid*="modal"]',
      '[aria-modal="true"]',
    ];

    for (const selector of modalSelectors) {
      const modal = this.page.locator(selector).first();
      if (await modal.isVisible().catch(() => false)) {
        const testId =
          (await modal.getAttribute("data-testid").catch(() => null)) ||
          selector;
        return testId;
      }
    }

    // Also check for dropdowns/menus (may appear after clicking menu items)
    const dropdownSelectors = [
      '[role="menu"]',
      '[role="listbox"]',
      '[data-state="open"]',
    ];

    for (const selector of dropdownSelectors) {
      const dropdown = this.page.locator(selector).first();
      if (await dropdown.isVisible().catch(() => false)) {
        const testId =
          (await dropdown.getAttribute("data-testid").catch(() => null)) ||
          (await dropdown.getAttribute("id").catch(() => null)) ||
          `dropdown:${selector}`;
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
export function createExplorer(
  page: Page,
  options?: ExplorerOptions
): Explorer {
  return new Explorer(page, options);
}

export default Explorer;
