/**
 * App Explorer Agent
 *
 * This explorer is designed for SPA apps like yours (React + Vite).
 * Instead of navigating to fake routes, it:
 * - Stays on the page and clicks on interactive elements
 * - Opens modals, dropdowns, and navigation menus
 * - Tries to interact with Buy/Sell buttons, cards, etc.
 * - Captures API calls and console logs during interactions
 */
import { Page, Route } from '@playwright/test';

export interface ElementInfo {
  type: 'button' | 'link' | 'card' | 'input' | 'modal';
  text: string;
  selector: string;
  interacted: boolean;
  result?: string;
}

export interface InteractionResult {
  element: string;
  action: string;
  success: boolean;
  resultingState?: string;
  apiCalls?: string[];
  error?: string;
}

export interface ApiCall {
  method: string;
  url: string;
  status?: number;
  requestBody?: any;
  timestamp: Date;
}

export interface ConsoleMessage {
  type: string;
  text: string;
  timestamp: Date;
}

export interface ExplorationResult {
  interactions: InteractionResult[];
  apiCalls: ApiCall[];
  consoleLogs: ConsoleMessage[];
  elementsFound: ElementInfo[];
  modalsOpened: string[];
  errors: string[];
}

export class AppExplorer {
  private page: Page;
  private baseUrl: string;
  private apiCalls: ApiCall[] = [];
  private consoleLogs: ConsoleMessage[] = [];
  private interactions: InteractionResult[] = [];
  private elementsFound: ElementInfo[] = [];
  private modalsOpened: Set<string> = new Set();
  private interactedElements: Set<string> = new Set();

  constructor(page: Page, baseUrl: string = 'http://localhost:3000') {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  /**
   * Start monitoring network requests and console logs
   */
  async startMonitoring(): Promise<void> {
    console.log('[Explorer] Starting monitoring...');
    
    await this.page.route('**/*', async (route: Route) => {
      const request = route.request();
      const url = request.url();
      
      if (url.includes('/rest/') || url.includes('/functions/') || url.includes('/api/')) {
        const apiCall: ApiCall = {
          method: request.method(),
          url: url,
          timestamp: new Date(),
        };
        try {
          apiCall.requestBody = request.postDataJSON();
        } catch {}
        this.apiCalls.push(apiCall);
        
        // Only log important API calls
        const shortUrl = url.split('?')[0].split('/').slice(-2).join('/');
        console.log(`  [API] ${apiCall.method} .../${shortUrl}`);
      }
      await route.continue();
    });

    this.page.on('console', (msg) => {
      this.consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date(),
      });
      if (msg.type() === 'error') {
        console.log(`  [Console Error] ${msg.text().substring(0, 100)}`);
      }
    });

    this.page.on('pageerror', (error) => {
      console.log(`  [Page Error] ${error.message}`);
    });
  }

  /**
   * Catalog all interactive elements on the current page
   */
  async catalogElements(): Promise<void> {
    console.log('[Explorer] Cataloging page elements...');

    // Find navigation buttons (Sports, E-Sports, etc.)
    const navButtons = await this.page.locator('nav button').all();
    for (const btn of navButtons) {
      const text = await btn.textContent().catch(() => '') || '';
      if (text.trim()) {
        this.elementsFound.push({
          type: 'button',
          text: text.trim().substring(0, 50),
          selector: `nav button:has-text("${text.trim().substring(0, 20)}")`,
          interacted: false
        });
      }
    }

    // Find Buy/Sell buttons
    const buyButtons = await this.page.locator('button:has-text("Buy")').all();
    for (let i = 0; i < Math.min(buyButtons.length, 5); i++) {
      this.elementsFound.push({
        type: 'button',
        text: 'Buy button',
        selector: `button:has-text("Buy") >> nth=${i}`,
        interacted: false
      });
    }

    // Find clickable cards (teams/assets)
    const cards = await this.page.locator('[cursor=pointer]').all();
    console.log(`  Found ${cards.length} clickable elements`);
    
    // Find Join Now / Log In buttons
    const authButtons = await this.page.locator('button:has-text("Join Now"), button:has-text("Log In")').all();
    for (const btn of authButtons) {
      const text = await btn.textContent().catch(() => '') || '';
      this.elementsFound.push({
        type: 'button',
        text: text.trim(),
        selector: `button:has-text("${text.trim()}")`,
        interacted: false
      });
    }

    console.log(`  Cataloged ${this.elementsFound.length} key elements`);
  }

  /**
   * Click on a navigation category (Sports dropdown, etc.)
   */
  async exploreNavigation(): Promise<void> {
    console.log('[Explorer] Exploring navigation menus...');

    // Click on Sports to open dropdown
    const sportsButton = this.page.locator('button:has-text("Sports")').first();
    if (await sportsButton.isVisible().catch(() => false)) {
      console.log('  - Opening Sports dropdown...');
      await sportsButton.click();
      await this.page.waitForTimeout(500);
      
      // Check what sub-items appeared
      const subItems = await this.page.locator('button:has-text("Football"), button:has-text("Basketball"), button:has-text("Motorsport")').all();
      console.log(`    Found ${subItems.length} sport categories`);

      // Click on Football
      const footballBtn = this.page.locator('button:has-text("Football")').first();
      if (await footballBtn.isVisible().catch(() => false)) {
        console.log('  - Clicking Football...');
        await footballBtn.click();
        await this.page.waitForTimeout(500);
        
        // Check for leagues
        const leagues = await this.page.locator('button:has-text("Premier League"), button:has-text("Champions League")').all();
        console.log(`    Found ${leagues.length} leagues`);

        // Click Premier League
        const eplBtn = this.page.locator('button:has-text("Premier League")').first();
        if (await eplBtn.isVisible().catch(() => false)) {
          console.log('  - Clicking Premier League...');
          const apiCountBefore = this.apiCalls.length;
          await eplBtn.click();
          await this.page.waitForTimeout(2000);
          const apiCountAfter = this.apiCalls.length;
          
          this.interactions.push({
            element: 'Premier League button',
            action: 'click',
            success: true,
            resultingState: await this.page.title(),
            apiCalls: this.apiCalls.slice(apiCountBefore).map(a => `${a.method} ${a.url.split('/').pop()?.substring(0, 30)}`)
          });
        }
      }
    }
  }

  /**
   * Try to interact with asset cards (teams)
   */
  async exploreAssetCards(): Promise<void> {
    console.log('[Explorer] Exploring asset cards...');

    // Find team cards in the scrolling ticker
    const teamCards = await this.page.locator('img[alt="West Ham"], img[alt="Real Madrid"], img[alt="Arsenal"]').all();
    console.log(`  Found ${teamCards.length} team cards`);

    if (teamCards.length > 0) {
      // Click on first visible team card
      const firstCard = teamCards[0];
      const parent = this.page.locator('[cursor=pointer]').filter({ has: firstCard }).first();
      
      if (await parent.isVisible().catch(() => false)) {
        console.log('  - Clicking on team card...');
        const apiCountBefore = this.apiCalls.length;
        await parent.click();
        await this.page.waitForTimeout(2000);
        
        // Check what happened - modal? new page?
        const pageContent = await this.page.content();
        const hasModal = pageContent.includes('login-modal') || pageContent.includes('signup-modal');
        
        this.interactions.push({
          element: 'Team card',
          action: 'click',
          success: true,
          resultingState: hasModal ? 'Auth modal appeared' : 'Content changed',
          apiCalls: this.apiCalls.slice(apiCountBefore).map(a => `${a.method} ${a.url.split('/').pop()?.substring(0, 30)}`)
        });
      }
    }
  }

  /**
   * Try to click Buy/Sell buttons (will likely trigger auth modal)
   */
  async exploreBuySell(): Promise<void> {
    console.log('[Explorer] Testing Buy/Sell buttons...');

    // Find a Buy button in the Trending Markets section
    const buyButton = this.page.locator('button:has-text("Buy")').first();
    
    if (await buyButton.isVisible().catch(() => false)) {
      console.log('  - Clicking Buy button...');
      const apiCountBefore = this.apiCalls.length;
      await buyButton.click();
      await this.page.waitForTimeout(2000);
      
      // Check if auth modal appeared
      const loginModal = this.page.getByTestId('login-modal');
      const signupModal = this.page.getByTestId('signup-modal');
      
      let result = 'Unknown';
      if (await loginModal.isVisible().catch(() => false)) {
        result = 'Login modal appeared';
        this.modalsOpened.add('login-modal');
        console.log('    → Login modal appeared!');
        // Close it
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      } else if (await signupModal.isVisible().catch(() => false)) {
        result = 'Signup modal appeared';
        this.modalsOpened.add('signup-modal');
        console.log('    → Signup modal appeared!');
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      }

      this.interactions.push({
        element: 'Buy button',
        action: 'click',
        success: true,
        resultingState: result,
        apiCalls: this.apiCalls.slice(apiCountBefore).map(a => `${a.method} ${a.url.split('/').pop()?.substring(0, 30)}`)
      });
    }
  }

  /**
   * Open and explore auth modals
   */
  async exploreAuthModals(): Promise<void> {
    console.log('[Explorer] Exploring auth modals...');

    // Click Join Now button
    const joinButton = this.page.locator('button:has-text("Join Now")').first();
    if (await joinButton.isVisible().catch(() => false)) {
      console.log('  - Opening Signup modal...');
      await joinButton.click();
      await this.page.waitForTimeout(1000);
      
      const signupModal = this.page.getByTestId('signup-modal');
      if (await signupModal.isVisible().catch(() => false)) {
        this.modalsOpened.add('signup-modal');
        
        // Catalog form fields
        const inputs = await signupModal.locator('input').all();
        console.log(`    Found ${inputs.length} input fields`);
        
        // Check for steps
        const continueBtn = signupModal.locator('button:has-text("Continue")');
        const createBtn = signupModal.locator('button:has-text("Create Account")');
        console.log(`    Has Continue button: ${await continueBtn.isVisible().catch(() => false)}`);
        console.log(`    Has Create Account button: ${await createBtn.isVisible().catch(() => false)}`);
        
        this.interactions.push({
          element: 'Signup modal',
          action: 'open',
          success: true,
          resultingState: `Found ${inputs.length} inputs, multi-step form`
        });
        
        // Close it
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      }
    }

    // Click Log In button
    const loginButton = this.page.locator('button:has-text("Log In")').first();
    if (await loginButton.isVisible().catch(() => false)) {
      console.log('  - Opening Login modal...');
      await loginButton.click();
      await this.page.waitForTimeout(1000);
      
      const loginModal = this.page.getByTestId('login-modal');
      if (await loginModal.isVisible().catch(() => false)) {
        this.modalsOpened.add('login-modal');
        
        const inputs = await loginModal.locator('input').all();
        console.log(`    Found ${inputs.length} input fields`);
        
        this.interactions.push({
          element: 'Login modal',
          action: 'open',
          success: true,
          resultingState: `Found ${inputs.length} inputs`
        });
        
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      }
    }
  }

  /**
   * Explore the AI Chat button
   */
  async exploreAIChat(): Promise<void> {
    console.log('[Explorer] Checking AI Chat...');
    
    const aiButton = this.page.locator('button:has-text("Open AI Chat")');
    if (await aiButton.isVisible().catch(() => false)) {
      console.log('  - Found AI Chat button');
      this.elementsFound.push({
        type: 'button',
        text: 'Open AI Chat',
        selector: 'button:has-text("Open AI Chat")',
        interacted: false
      });
    }
  }

  /**
   * Main crawl function - explores the SPA by interacting with elements
   */
  async crawl(maxInteractions: number = 15): Promise<ExplorationResult> {
    console.log('[Explorer] Starting SPA exploration...');
    console.log('');
    
    await this.startMonitoring();
    
    // Go to home page
    console.log('[Step 1] Loading home page...');
    await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(2000);
    
    // Catalog elements
    console.log('');
    await this.catalogElements();
    
    // Explore navigation
    console.log('');
    await this.exploreNavigation();
    
    // Explore asset cards
    console.log('');
    await this.exploreAssetCards();
    
    // Try Buy/Sell (will trigger auth)
    console.log('');
    await this.exploreBuySell();
    
    // Explore auth modals
    console.log('');
    await this.exploreAuthModals();
    
    // Check AI Chat
    console.log('');
    await this.exploreAIChat();
    
    return this.getResults();
  }

  /**
   * Explore pages visible after login
   */
  async exploreAuthenticated(): Promise<void> {
    console.log('[Explorer] Exploring authenticated features...');
    
    // After login, check Portfolio section
    const portfolioBtn = this.page.locator('button:has-text("Portfolio")').first();
    if (await portfolioBtn.isVisible().catch(() => false)) {
      console.log('  - Found Portfolio button');
      await portfolioBtn.click();
      await this.page.waitForTimeout(1000);
      
      this.interactions.push({
        element: 'Portfolio tab',
        action: 'click',
        success: true,
        resultingState: 'Portfolio view'
      });
    }
    
    // Check History tab
    const historyBtn = this.page.locator('button:has-text("History")').first();
    if (await historyBtn.isVisible().catch(() => false)) {
      console.log('  - Found History button');
      await historyBtn.click();
      await this.page.waitForTimeout(1000);
      
      this.interactions.push({
        element: 'History tab',
        action: 'click',
        success: true,
        resultingState: 'History view'
      });
    }
    
    // Try Buy button again (should work when logged in)
    const buyButton = this.page.locator('button:has-text("Buy")').first();
    if (await buyButton.isVisible().catch(() => false)) {
      console.log('  - Testing Buy button when logged in...');
      const apiCountBefore = this.apiCalls.length;
      await buyButton.click();
      await this.page.waitForTimeout(2000);
      
      // Check what happened
      const currentUrl = this.page.url();
      
      this.interactions.push({
        element: 'Buy button (authenticated)',
        action: 'click',
        success: true,
        resultingState: currentUrl.includes('?') ? 'Query params changed' : 'Page updated',
        apiCalls: this.apiCalls.slice(apiCountBefore).map(a => `${a.method} ${a.url.split('/').pop()?.substring(0, 30)}`)
      });
    }
  }

  getResults(): ExplorationResult {
    return {
      interactions: this.interactions,
      apiCalls: this.apiCalls,
      consoleLogs: this.consoleLogs,
      elementsFound: this.elementsFound,
      modalsOpened: Array.from(this.modalsOpened),
      errors: this.consoleLogs.filter(l => l.type === 'error').map(l => l.text),
    };
  }

  generateReport(): string {
    const results = this.getResults();
    
    let report = `# ShareMatch App Exploration Report
Generated: ${new Date().toISOString()}

## Summary
- Interactions performed: ${results.interactions.length}
- API calls captured: ${results.apiCalls.length}
- Console logs: ${results.consoleLogs.length}
- Errors found: ${results.errors.length}
- Modals opened: ${results.modalsOpened.join(', ') || 'None'}

## Interactions Performed

| Element | Action | Result |
|---------|--------|--------|
${results.interactions.map(i => 
  `| ${i.element} | ${i.action} | ${i.resultingState || 'OK'} |`
).join('\n')}

## Elements Found
${results.elementsFound.map(e => `- **${e.type}**: ${e.text}`).join('\n')}

## API Endpoints Called
${[...new Set(results.apiCalls.map(a => {
  const urlPath = new URL(a.url).pathname;
  return `- \`${a.method}\` ${urlPath}`;
}))].slice(0, 20).join('\n')}

## Console Errors
${results.errors.length > 0 
  ? results.errors.slice(0, 10).map(e => `- ${e.substring(0, 100)}`).join('\n')
  : 'No errors found!'}

## Test Recommendations

Based on exploration, the following tests should be created:

1. **Unauthenticated User Tests**
   - Clicking Buy/Sell should show login modal
   - Clicking asset cards should show login modal
   - Sign up modal opens and has correct fields
   - Login modal opens and has correct fields

2. **Navigation Tests**
   - Sports dropdown opens and shows categories
   - Football → Premier League navigation works
   - All sport categories are accessible

3. **Authenticated User Tests**
   - Portfolio tab shows user positions
   - History tab shows transaction history
   - Buy/Sell flow works after login
   - AI Chat feature opens

4. **API Integration Tests**
   - Assets endpoint returns data
   - Market index endpoints work
   - News endpoints work
`;

    return report;
  }
}

/**
 * Create an explorer instance
 */
export function createExplorer(page: Page, baseUrl?: string): AppExplorer {
  return new AppExplorer(page, baseUrl);
}
