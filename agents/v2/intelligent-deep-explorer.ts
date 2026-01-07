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
      // Detect if we're in a form context
      const isInFormContext = context.currentModal?.includes('signup') || 
                               context.currentModal?.includes('login') ||
                               context.currentModal?.includes('form');
      
      const prompt = `You are an expert at web UI exploration testing a ${isInFormContext ? 'FORM/SIGNUP' : 'web'} flow.

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

PRIORITIES (in order):
1. INPUT FIELDS (text, email, password) - these are PRIMARY for forms, use "fill" action
2. SUBMIT/CONTINUE buttons - click these to progress the form flow
3. SKIP auxiliary UI elements like:
   - Date picker day buttons (1-31)
   - Calendar navigation arrows
   - Dropdown option items
   - Close/X buttons (they break context)

Goal: Explore the MAIN form flow:
- Fill input fields to test validation
- Click submit/continue to test form progression
- DON'T get stuck on auxiliary elements like calendars
- DON'T close modals prematurely

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
  // Track filled inputs to know when form is ready for Continue
  private filledInputsCount = 0;
  private expectedInputsInForm = 0;

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
    
    // FAST PATH: Input fields in forms should always be filled
    if (element.type === 'input') {
      this.filledInputsCount++;
      return {
        shouldInteract: true,
        interactionType: "fill",
        reasoning: "Input field - fill with test data",
        confidence: 0.95,
        elementClassification: "input",
      };
    }
    
    // FAST PATH: Date picker and dropdown triggers should complete selection
    if (this.isDatePickerTrigger(element) || this.isDropdownTrigger(element)) {
      return {
        shouldInteract: true,
        interactionType: "click",
        reasoning: "Dropdown/picker trigger - will complete selection",
        confidence: 0.9,
        elementClassification: "action_button",
      };
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
            // SPECIAL CASE: Date picker trigger - complete the selection
            if (this.isDatePickerTrigger(element)) {
              await this.completeDropdownSelection(locator, element, 'date');
              return { success: true, modalOpened: false, urlChanged: false };
            }
            
            // SPECIAL CASE: Country/dropdown trigger - complete the selection
            if (this.isDropdownTrigger(element)) {
              await this.completeDropdownSelection(locator, element, 'dropdown');
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
                console.log(`      📋 Form progressed: ${beforeElements.inputCount} → ${afterElements.inputCount} inputs`);
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
      text.includes('date of birth') ||
      text.includes('select date') ||
      text.includes('dob') ||
      text.includes('birthday') ||
      selector.includes('date') ||
      selector.includes('dob') ||
      attrs.includes('date') ||
      attrs.includes('calendar')
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
      text.includes('select country') ||
      text.includes('select region') ||
      text.includes('select state') ||
      text.includes('choose') ||
      selector.includes('country') ||
      selector.includes('dropdown') ||
      attrs.includes('listbox') ||
      attrs.includes('combobox')
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
    return (
      text === 'continue' ||
      text === 'submit' ||
      text === 'next' ||
      text === 'next step' ||
      text === 'create account' ||
      text === 'sign up' ||
      text === 'register' ||
      text === 'save changes' ||
      text === 'save'
    );
  }

  /**
   * Count form elements (to detect step changes)
   */
  private async countFormElements(): Promise<{ inputCount: number; buttonCount: number }> {
    try {
      const scopeLocator = this.currentScope || this.page.locator("body");
      const inputCount = await scopeLocator.locator('input:visible').count();
      const buttonCount = await scopeLocator.locator('button:visible').count();
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
    type: 'date' | 'dropdown'
  ): Promise<void> {
    try {
      // Click to open the dropdown/picker
      await locator.click({ timeout: 3000 });
      await this.page.waitForTimeout(500);

      if (type === 'date') {
        // For date pickers: select a valid date (e.g., 15th of current displayed month)
        // First try to find a day button that's selectable (not disabled, in current month)
        const dayButton = this.page.locator('button:has-text("15"):not([disabled])').first();
        if (await dayButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await dayButton.click();
          console.log(`      ✅ Selected date: 15`);
        } else {
          // Fallback: click any visible day button
          const anyDay = this.page.locator('button').filter({ hasText: /^([1-9]|[12][0-9]|3[01])$/ }).first();
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
        const uaeOption = this.page.locator('div').filter({ hasText: /United Arab Emirates|UAE/i }).first();
        if (await uaeOption.isVisible({ timeout: 500 }).catch(() => false)) {
          await uaeOption.click();
          console.log(`      ✅ Selected country: United Arab Emirates`);
          await this.page.waitForTimeout(300);
          return;
        }
        
        // Try clicking div elements with country-like text (inside dropdown container)
        // Look for divs with flag images (country options have img tags)
        const countryDivs = this.page.locator('div.overflow-y-auto div:has(img)');
        const firstCountry = countryDivs.first();
        if (await firstCountry.isVisible({ timeout: 500 }).catch(() => false)) {
          const countryText = await firstCountry.textContent().catch(() => '');
          await firstCountry.click();
          console.log(`      ✅ Selected country: ${countryText?.trim().substring(0, 25)}`);
          await this.page.waitForTimeout(300);
          return;
        }
        
        // Try standard dropdown option selectors
        const optionSelectors = [
          '[role="option"]',
          '[role="listitem"]',
          'li[data-value]',
          '.dropdown-item',
          '[data-testid*="option"]',
        ];
        
        for (const optSel of optionSelectors) {
          const option = this.page.locator(optSel).first();
          if (await option.isVisible({ timeout: 300 }).catch(() => false)) {
            const optionText = await option.textContent().catch(() => '');
            await option.click();
            console.log(`      ✅ Selected dropdown option: ${optionText?.substring(0, 20)}`);
            await this.page.waitForTimeout(300);
            return;
          }
        }
        
        // Last fallback: click any clickable item in the dropdown area
        const anyClickable = this.page.locator('.max-h-32 > div, .max-h-48 > div').first();
        if (await anyClickable.isVisible({ timeout: 300 }).catch(() => false)) {
          const text = await anyClickable.textContent().catch(() => '');
          await anyClickable.click();
          console.log(`      ✅ Selected: ${text?.trim().substring(0, 25)}`);
        } else {
          console.log(`      ⚠️ Could not find any dropdown option to select`);
        }
        
        await this.page.waitForTimeout(300);
      }
    } catch (e: any) {
      console.log(`      ⚠️ Could not complete ${type} selection: ${e.message?.substring(0, 50)}`);
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
        } else if (modalId && this.state.modalStack.includes(modalId)) {
          // FORM STEP CHANGE: Same modal but content changed (e.g., Step 1 → Step 2)
          // Re-explore the same modal context to discover new elements
          
          // Count how many steps we've already explored in this modal (max 3 steps)
          const stepsInModal = this.state.modalStack.filter(m => m.startsWith(modalId)).length;
          const MAX_FORM_STEPS = 3;
          
          if (stepsInModal < MAX_FORM_STEPS) {
            console.log(`${indent}   📋 Form step change detected in ${modalId} - re-exploring (step ${stepsInModal + 1}/${MAX_FORM_STEPS})`);
            
            // Create a step-specific context to avoid infinite loops
            const stepContext = `${modalId}-step-${stepsInModal + 1}`;
            this.state.modalStack.push(stepContext);
            this.state.currentContext = `modal:${stepContext}`;
            await this.exploreCurrentContext(depth + 1);
            this.state.modalStack.pop();
            this.state.currentContext =
              this.state.modalStack.length > 0
                ? `modal:${
                    this.state.modalStack[this.state.modalStack.length - 1]
                  }`
                : "root";
          } else {
            console.log(`${indent}   ⚠️ Max form steps (${MAX_FORM_STEPS}) reached for ${modalId} - stopping`);
          }
        }
      }
    }

    console.log(
      `${indent}   ✅ Context complete: ${elements.length} elements processed`
    );
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

    // Strategy 5: Detect dropdown menus (for sub-menus after clicking)
    for (const selector of dropdownSelectors) {
      try {
        const dropdown = this.page.locator(selector).first();
        if (await dropdown.isVisible({ timeout: 300 })) {
          console.log(`   📂 Found dropdown (${selector})`);
          return dropdown;
        }
      } catch {}
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
              const isVisible = style.display !== "none" && 
                               style.visibility !== "hidden" &&
                               el.offsetWidth > 100 && 
                               el.offsetHeight > 50;
              
              const hasMenuClasses = /dropdown|popover|menu|submenu|flyout/i.test(classes);
              const isPositioned = (style.position === "absolute" || style.position === "fixed") &&
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
    } catch {}

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
      if (selector.includes('calendar') || 
          selector.includes('date') || 
          selector.includes('day') ||
          selector.includes('picker') ||
          attrs.includes('calendar') ||
          attrs.includes('date')) {
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
    if (text === '' && (selector.includes('prev') || selector.includes('next') || 
        selector.includes('arrow') || selector.includes('chevron'))) {
      // These are likely calendar navigation - we can skip them or explore once
      return false; // Let the LLM decide on these
    }
    
    // Skip month/year buttons in date pickers
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                    'july', 'august', 'september', 'october', 'november', 'december',
                    'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    if (months.some(m => text === m)) {
      return true; // Skip individual month buttons in date pickers
    }
    
    // Skip year buttons (1900-2100)
    const yearNum = parseInt(text, 10);
    if (!isNaN(yearNum) && yearNum >= 1900 && yearNum <= 2100 && text === String(yearNum)) {
      return true;
    }
    
    // Skip date display buttons (e.g., "15 Jan 2000", "21 Dec 1995")
    if (/^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}$/i.test(text)) {
      return true;
    }
    
    // Skip country name display buttons (already selected country)
    // Common country patterns
    const countryPatterns = [
      'united arab emirates', 'uae', 'saudi arabia', 'united states', 'united kingdom',
      'canada', 'australia', 'india', 'pakistan', 'germany', 'france', 'spain', 'italy',
      'netherlands', 'belgium', 'switzerland', 'austria', 'sweden', 'norway', 'denmark',
      'finland', 'poland', 'portugal', 'ireland', 'new zealand', 'singapore', 'malaysia',
      'indonesia', 'philippines', 'thailand', 'vietnam', 'japan', 'south korea', 'china',
      'brazil', 'mexico', 'argentina', 'chile', 'colombia', 'peru', 'egypt', 'morocco',
      'south africa', 'nigeria', 'kenya', 'qatar', 'kuwait', 'bahrain', 'oman'
    ];
    if (countryPatterns.some(c => text === c)) {
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
      } catch {}
    }

    try {
      const selector = await locator.evaluate((el) => {
        const tagName = el.tagName.toLowerCase();
        
        // For buttons, prefer text-based selectors (most stable)
        if (tagName === 'button' || el.getAttribute('type') === 'button') {
          const text = el.textContent?.trim().slice(0, 40);
          if (text) {
            return `button:has-text("${text.replace(/"/g, '\\"')}")`;
          }
        }
        
        // For inputs, try to find identifying attributes
        if (tagName === 'input') {
          const type = el.getAttribute('type') || 'text';
          const placeholder = el.getAttribute('placeholder');
          if (placeholder) {
            return `input[placeholder="${placeholder.replace(/"/g, '\\"')}"]`;
          }
          return `input[type="${type}"]`;
        }
        
        // For links, use href or text
        if (tagName === 'a') {
          const text = el.textContent?.trim().slice(0, 30);
          if (text) {
            return `a:has-text("${text.replace(/"/g, '\\"')}")`;
          }
          const href = el.getAttribute('href');
          if (href && href !== '#') {
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
            return !/^(bg-|text-|p-|m-|w-|h-|flex|grid|absolute|relative|fixed|top-|left-|right-|bottom-|z-|rounded|border|shadow|transition|hover:|focus:|active:)/.test(cls)
              && !/[:\.\[\]\/]/.test(cls);
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
export function createIntelligentDeepExplorer(
  page: Page,
  options?: ExplorerOptions
): IntelligentDeepExplorer {
  return new IntelligentDeepExplorer(page, options);
}

export default IntelligentDeepExplorer;
