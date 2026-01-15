/**
 * Groq-Powered LLM Agent for Agentic Testing
 * 
 * This agent uses Groq's LLama model to reason about:
 * - What actions to take on the page
 * - How to handle errors and edge cases
 * - When a test goal is achieved
 * 
 * The agent operates in a loop:
 * 1. Observe - Get current page state
 * 2. Think - Ask LLM what to do next
 * 3. Act - Execute the action
 * 4. Repeat until goal is achieved
 */
import { Page } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

// Types
interface AgentAction {
  type: 'click' | 'type' | 'navigate' | 'wait' | 'assert' | 'done' | 'error';
  selector?: string;
  text?: string;
  url?: string;
  message?: string;
  waitTime?: number;
}

interface AgentObservation {
  url: string;
  title: string;
  visibleText: string;
  formFields: string[];
  buttons: string[];
  modals: string[];
}

interface AgentContext {
  goal: string;
  history: { action: AgentAction; result: string }[];
  currentObservation: AgentObservation;
  testData: Record<string, string>;
}

// Groq API configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

/**
 * Call Groq API to get the next action
 */
async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.error('[Agent] GROQ_API_KEY not configured');
    throw new Error('GROQ_API_KEY not configured in .env');
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Agent] Groq API error:', errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error: any) {
    console.error('[Agent] Error calling Groq:', error.message);
    throw error;
  }
}

/**
 * Observe the current page state
 */
async function observePage(page: Page): Promise<AgentObservation> {
  const observation: AgentObservation = {
    url: page.url(),
    title: await page.title(),
    visibleText: '',
    formFields: [],
    buttons: [],
    modals: [],
  };

  try {
    // Get visible text (limited to avoid token overflow)
    observation.visibleText = await page.evaluate(() => {
      const body = document.body;
      const text = body?.innerText || '';
      return text.slice(0, 2000); // Limit to 2000 chars
    });

    // Get form fields
    observation.formFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
      return inputs.map(el => {
        const input = el as HTMLInputElement;
        return `${input.type || 'text'}[name="${input.name || ''}"][placeholder="${input.placeholder || ''}"]`;
      }).slice(0, 20);
    });

    // Get buttons
    observation.buttons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'));
      return buttons.map(el => {
        const btn = el as HTMLElement;
        return btn.innerText?.trim() || btn.getAttribute('aria-label') || 'unnamed';
      }).filter(t => t).slice(0, 15);
    });

    // Check for modals
    observation.modals = await page.evaluate(() => {
      const modals = Array.from(document.querySelectorAll('[data-testid*="modal"], [role="dialog"], .modal'));
      return modals.map(el => el.getAttribute('data-testid') || 'modal');
    });

  } catch (error: any) {
    console.warn('[Agent] Error observing page:', error.message);
  }

  return observation;
}

/**
 * Parse the LLM response into an action
 */
function parseAction(response: string): AgentAction {
  try {
    // Try to parse as JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed as AgentAction;
    }
  } catch {
    // If JSON parsing fails, try to extract action from text
  }

  // Default fallback
  if (response.toLowerCase().includes('done') || response.toLowerCase().includes('complete')) {
    return { type: 'done', message: 'Goal achieved' };
  }

  return { type: 'error', message: 'Could not parse action from LLM response' };
}

/**
 * Execute an action on the page
 */
async function executeAction(page: Page, action: AgentAction): Promise<string> {
  console.log(`[Agent] Executing: ${action.type}`, action);

  try {
    switch (action.type) {
      case 'click':
        if (!action.selector) {
          // Try to find button by text
          if (action.text) {
            await page.getByRole('button', { name: new RegExp(action.text, 'i') }).click();
            return `Clicked button: ${action.text}`;
          }
          return 'Error: No selector or text provided for click';
        }
        await page.click(action.selector);
        return `Clicked: ${action.selector}`;

      case 'type':
        if (!action.selector || !action.text) {
          return 'Error: Missing selector or text for type action';
        }
        await page.fill(action.selector, action.text);
        return `Typed "${action.text}" into ${action.selector}`;

      case 'navigate':
        if (!action.url) {
          return 'Error: No URL provided for navigate';
        }
        await page.goto(action.url);
        return `Navigated to: ${action.url}`;

      case 'wait':
        const waitTime = action.waitTime || 1000;
        await page.waitForTimeout(waitTime);
        return `Waited ${waitTime}ms`;

      case 'assert':
        // TODO: Implement assertions
        return 'Assertion not implemented';

      case 'done':
        return `Goal achieved: ${action.message}`;

      case 'error':
        return `Error: ${action.message}`;

      default:
        return `Unknown action type: ${action.type}`;
    }
  } catch (error: any) {
    return `Action failed: ${error.message}`;
  }
}

/**
 * Build the prompt for the LLM
 */
function buildPrompt(context: AgentContext): string {
  const recentHistory = context.history.slice(-5).map((h, i) => 
    `${i + 1}. Action: ${JSON.stringify(h.action)} → Result: ${h.result}`
  ).join('\n');

  return `You are a test automation agent. Your goal is: "${context.goal}"

## Current Page State
- URL: ${context.currentObservation.url}
- Title: ${context.currentObservation.title}
- Visible Modals: ${context.currentObservation.modals.join(', ') || 'None'}
- Buttons visible: ${context.currentObservation.buttons.join(', ') || 'None'}
- Form fields: ${context.currentObservation.formFields.slice(0, 10).join(', ') || 'None'}

## Test Data Available
${Object.entries(context.testData).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Recent Actions
${recentHistory || 'No actions yet'}

## Page Content (truncated)
${context.currentObservation.visibleText.slice(0, 1000)}

## Instructions
Based on the current state, decide the next action to achieve the goal.
Respond with a JSON object:
{
  "type": "click" | "type" | "navigate" | "wait" | "done" | "error",
  "selector": "CSS selector or null",
  "text": "text to type or button text",
  "url": "URL to navigate to",
  "message": "explanation",
  "waitTime": 1000
}

If the goal is achieved, use type "done".
If you're stuck, use type "error" with an explanation.

IMPORTANT: For form fields, use placeholders to find them. Example selectors:
- input[placeholder*="email" i]
- input[placeholder*="password" i]
- button:has-text("Log In")

Your response (JSON only):`;
}

/**
 * Main Agent Class
 */
export class GroqAgent {
  private page: Page;
  private maxSteps: number;
  private testData: Record<string, string>;

  constructor(page: Page, options?: { maxSteps?: number; testData?: Record<string, string> }) {
    this.page = page;
    this.maxSteps = options?.maxSteps || 20;
    this.testData = options?.testData || {};
  }

  /**
   * Run the agent to achieve a goal
   */
  async achieve(goal: string): Promise<{ success: boolean; message: string; steps: number }> {
    console.log(`\n🤖 [Agent] Starting goal: "${goal}"`);
    
    const context: AgentContext = {
      goal,
      history: [],
      currentObservation: await observePage(this.page),
      testData: this.testData,
    };

    for (let step = 0; step < this.maxSteps; step++) {
      console.log(`\n📍 [Agent] Step ${step + 1}/${this.maxSteps}`);

      // Build prompt and get LLM response
      const prompt = buildPrompt(context);
      let response: string;
      
      try {
        response = await callGroq(prompt);
        console.log(`🧠 [Agent] LLM response: ${response.slice(0, 200)}...`);
      } catch (error: any) {
        return { success: false, message: `LLM error: ${error.message}`, steps: step + 1 };
      }

      // Parse action
      const action = parseAction(response);

      // Check if done
      if (action.type === 'done') {
        console.log(`✅ [Agent] Goal achieved: ${action.message}`);
        return { success: true, message: action.message || 'Goal achieved', steps: step + 1 };
      }

      if (action.type === 'error') {
        console.log(`❌ [Agent] Error: ${action.message}`);
        return { success: false, message: action.message || 'Agent error', steps: step + 1 };
      }

      // Execute action
      const result = await executeAction(this.page, action);
      console.log(`⚡ [Agent] Result: ${result}`);

      // Update history
      context.history.push({ action, result });

      // Wait a bit for page to update
      await this.page.waitForTimeout(500);

      // Re-observe page
      context.currentObservation = await observePage(this.page);
    }

    return { success: false, message: 'Max steps reached', steps: this.maxSteps };
  }

  /**
   * Add test data (like email, password, OTP)
   */
  setTestData(key: string, value: string): void {
    this.testData[key] = value;
  }
}

/**
 * Factory function to create an agent
 */
export function createAgent(page: Page, testData?: Record<string, string>): GroqAgent {
  return new GroqAgent(page, { testData });
}

