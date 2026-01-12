/**
 * Knowledge Store for Agentic Testing (RAG-based)
 * 
 * Uses Chroma Cloud to store and retrieve:
 * - Exploration results (elements found, interactions performed)
 * - Test patterns (from reference tests)
 * - Selector registry (known good selectors)
 * - Error patterns (common failures and fixes)
 * 
 * This enables context-aware test generation where agents can
 * retrieve relevant context based on semantic similarity.
 */

import * as dotenv from 'dotenv';
dotenv.config();

const CHROMA_API_KEY = process.env.CHROMA_API_KEY;
const CHROMA_TENANT = process.env.CHROMA_TENANT || '0c2c7310-6d65-40d7-8924-d9cced8221dc';
const CHROMA_DATABASE = process.env.CHROMA_DATABASE || 'Prod';
const CHROMA_COLLECTION = 'sharematch_testing';
const CHROMA_API_BASE = 'https://api.trychroma.com/api/v2';

const HF_TOKEN = process.env.HF_TOKEN;
const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

// Types for stored knowledge
export interface ExplorationResult {
  type: 'exploration';
  url: string;
  elementType: string;
  selector: string;
  text: string;
  parentContext: string;
  interactions: string[];
  apiCalls: string[];
  timestamp: string;
}

export interface TestPattern {
  type: 'test_pattern';
  featureName: string;
  testName: string;
  steps: string[];
  assertions: string[];
  selectors: string[];
  sourceFile: string;
}

export interface SelectorInfo {
  type: 'selector';
  selector: string;
  elementType: string;
  description: string;
  reliability: number; // 0-1 score
  lastVerified: string;
  alternatives: string[];
}

export interface ErrorPattern {
  type: 'error_pattern';
  errorMessage: string;
  cause: string;
  fix: string;
  occurrences: number;
}

type KnowledgeItem = ExplorationResult | TestPattern | SelectorInfo | ErrorPattern;

/**
 * Generate embedding using HuggingFace Inference API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  if (!HF_TOKEN) {
    throw new Error('HF_TOKEN not configured in .env');
  }

  const apiUrl = `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}/pipeline/feature-extraction`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: text,
      options: { wait_for_model: true, use_cache: true },
    }),
  });

  if (response.status === 503) {
    // Model loading, wait and retry
    console.log('[KnowledgeStore] Model loading, waiting...');
    await new Promise(r => setTimeout(r, 20000));
    return generateEmbedding(text);
  }

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.status}`);
  }

  const result = await response.json();
  
  if (Array.isArray(result)) {
    if (Array.isArray(result[0])) {
      // Nested list - take mean pooling
      const embedding = result.reduce((acc: number[], row: number[]) => {
        return acc.map((val, i) => val + row[i]);
      }, new Array(result[0].length).fill(0));
      return embedding.map((val: number) => val / result.length);
    }
    return result;
  }
  
  throw new Error('Unexpected embedding response format');
}

/**
 * Get Chroma API headers
 */
function getHeaders(): Record<string, string> {
  if (!CHROMA_API_KEY) {
    throw new Error('CHROMA_API_KEY not configured');
  }
  return {
    'Content-Type': 'application/json',
    'X-Chroma-Token': CHROMA_API_KEY,
  };
}

/**
 * Get or create the testing collection
 */
async function getOrCreateCollection(): Promise<string> {
  const getUrl = `${CHROMA_API_BASE}/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections/${CHROMA_COLLECTION}`;
  
  const getResponse = await fetch(getUrl, { headers: getHeaders() });
  
  if (getResponse.ok) {
    const data = await getResponse.json();
    return data.id;
  }
  
  if (getResponse.status === 404) {
    // Create collection
    const createUrl = `${CHROMA_API_BASE}/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        name: CHROMA_COLLECTION,
        metadata: { description: 'ShareMatch Testing Knowledge Base' },
      }),
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create collection: ${createResponse.status}`);
    }
    
    const data = await createResponse.json();
    console.log(`[KnowledgeStore] Created collection: ${CHROMA_COLLECTION}`);
    return data.id;
  }
  
  throw new Error(`Failed to get collection: ${getResponse.status}`);
}

/**
 * Knowledge Store class for agentic testing
 */
export class KnowledgeStore {
  private collectionId: string | null = null;
  
  /**
   * Initialize the store
   */
  async init(): Promise<void> {
    this.collectionId = await getOrCreateCollection();
    console.log(`[KnowledgeStore] Initialized with collection: ${this.collectionId}`);
  }
  
  /**
   * Store exploration results
   */
  async storeExploration(exploration: ExplorationResult): Promise<void> {
    const content = `
      URL: ${exploration.url}
      Element: ${exploration.elementType} - "${exploration.text}"
      Selector: ${exploration.selector}
      Parent: ${exploration.parentContext}
      Interactions: ${exploration.interactions.join(', ')}
    `.trim();
    
    const id = `exploration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.addDocument(content, exploration, id);
  }
  
  /**
   * Store test patterns from reference tests
   */
  async storeTestPattern(pattern: TestPattern): Promise<void> {
    const content = `
      Feature: ${pattern.featureName}
      Test: ${pattern.testName}
      Steps: ${pattern.steps.join(' → ')}
      Assertions: ${pattern.assertions.join(', ')}
      Selectors: ${pattern.selectors.join(', ')}
    `.trim();
    
    const id = `pattern_${pattern.featureName}_${pattern.testName}`.replace(/\s+/g, '_').toLowerCase();
    
    await this.addDocument(content, pattern, id);
  }
  
  /**
   * Store selector information
   */
  async storeSelector(selector: SelectorInfo): Promise<void> {
    const content = `
      Selector: ${selector.selector}
      Type: ${selector.elementType}
      Description: ${selector.description}
      Alternatives: ${selector.alternatives.join(', ')}
    `.trim();
    
    const id = `selector_${selector.selector.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    await this.addDocument(content, selector, id);
  }
  
  /**
   * Store error patterns
   */
  async storeErrorPattern(error: ErrorPattern): Promise<void> {
    const content = `
      Error: ${error.errorMessage}
      Cause: ${error.cause}
      Fix: ${error.fix}
    `.trim();
    
    const id = `error_${error.errorMessage.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}`;
    
    await this.addDocument(content, error, id);
  }

  /**
   * Store test patterns from reference tests
   */
  async storePattern(pattern: TestPattern): Promise<void> {
    const content = `
      Feature: ${pattern.featureName}
      Test: ${pattern.testName}
      Steps: ${pattern.steps.join(' → ')}
      Assertions: ${pattern.assertions.join(', ')}
      Selectors: ${pattern.selectors.join(', ')}
      Source: ${pattern.sourceFile}
    `.trim();
    
    const id = `pattern_${pattern.featureName.replace(/[^a-zA-Z0-9]/g, '_')}_${pattern.testName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    await this.addDocument(content, pattern, id);
  }
  
  /**
   * Add a document to the store
   */
  private async addDocument(content: string, metadata: KnowledgeItem, id: string): Promise<void> {
    if (!this.collectionId) {
      await this.init();
    }
    
    const embedding = await generateEmbedding(content);
    
    const url = `${CHROMA_API_BASE}/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections/${this.collectionId}/add`;
    
    // Flatten metadata - Chroma only supports scalar values (string, number, boolean)
    // Arrays and objects must be serialized to JSON strings
    const flattenedMetadata: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (Array.isArray(value)) {
        flattenedMetadata[key] = JSON.stringify(value);
      } else if (typeof value === 'object' && value !== null) {
        flattenedMetadata[key] = JSON.stringify(value);
      } else if (value !== undefined && value !== null) {
        flattenedMetadata[key] = value as string | number | boolean;
      }
    }
    
    const payload = {
      ids: [id],
      documents: [content],
      embeddings: [embedding],
      metadatas: [flattenedMetadata],
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'no body');
      console.error(`[KnowledgeStore] Failed to add document: ${response.status} - ${errorBody}`);
    }
  }
  
  /**
   * Query for relevant context
   */
  async query(queryText: string, type?: string, limit: number = 5): Promise<KnowledgeItem[]> {
    if (!this.collectionId) {
      await this.init();
    }
    
    const embedding = await generateEmbedding(queryText);
    
    const url = `${CHROMA_API_BASE}/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections/${this.collectionId}/query`;
    
    const payload: any = {
      query_embeddings: [embedding],
      n_results: limit,
      include: ['documents', 'metadatas', 'distances'],
    };
    
    // Filter by type if specified
    if (type) {
      payload.where = { type: { $eq: type } };
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      console.error(`[KnowledgeStore] Query failed: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    // Extract metadatas from response and unflatten serialized arrays
    const rawMetadatas = data.metadatas?.[0] || [];
    const metadatas = rawMetadatas.map((meta: Record<string, unknown>) => {
      const unflattened: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(meta)) {
        if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
          try {
            unflattened[key] = JSON.parse(value);
          } catch {
            unflattened[key] = value;
          }
        } else {
          unflattened[key] = value;
        }
      }
      return unflattened;
    });
    return metadatas as KnowledgeItem[];
  }
  
  /**
   * Get all explorations for a specific URL
   */
  async getExplorationsForUrl(url: string): Promise<ExplorationResult[]> {
    const results = await this.query(`URL: ${url}`, 'exploration', 20);
    return results.filter(r => r.type === 'exploration') as ExplorationResult[];
  }
  
  /**
   * Get test patterns for a feature
   */
  async getTestPatternsForFeature(featureName: string): Promise<TestPattern[]> {
    const results = await this.query(`Feature: ${featureName}`, 'test_pattern', 10);
    return results.filter(r => r.type === 'test_pattern') as TestPattern[];
  }
  
  /**
   * Get selector alternatives
   */
  async getSelectorAlternatives(selector: string): Promise<SelectorInfo[]> {
    const results = await this.query(`Selector: ${selector}`, 'selector', 5);
    return results.filter(r => r.type === 'selector') as SelectorInfo[];
  }
  
  /**
   * Get error fixes
   */
  async getErrorFixes(errorMessage: string): Promise<ErrorPattern[]> {
    const results = await this.query(`Error: ${errorMessage}`, 'error_pattern', 5);
    return results.filter(r => r.type === 'error_pattern') as ErrorPattern[];
  }
  
  /**
   * Clear all documents
   */
  async clear(): Promise<void> {
    if (!this.collectionId) {
      await this.init();
    }
    
    // Get all IDs
    const getUrl = `${CHROMA_API_BASE}/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections/${this.collectionId}/get`;
    const getResponse = await fetch(getUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ include: [] }),
    });
    
    if (!getResponse.ok) return;
    
    const data = await getResponse.json();
    const ids = data.ids || [];
    
    if (ids.length === 0) return;
    
    // Delete all
    const deleteUrl = `${CHROMA_API_BASE}/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections/${this.collectionId}/delete`;
    await fetch(deleteUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ids }),
    });
    
    console.log(`[KnowledgeStore] Cleared ${ids.length} documents`);
  }
  
  /**
   * Get document count
   */
  async getCount(): Promise<number> {
    if (!this.collectionId) {
      await this.init();
    }
    
    const url = `${CHROMA_API_BASE}/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}/collections/${this.collectionId}/count`;
    const response = await fetch(url, { headers: getHeaders() });
    
    if (response.ok) {
      return await response.json();
    }
    return 0;
  }
}

// Singleton instance
let storeInstance: KnowledgeStore | null = null;

export async function getKnowledgeStore(): Promise<KnowledgeStore> {
  if (!storeInstance) {
    storeInstance = new KnowledgeStore();
    await storeInstance.init();
  }
  return storeInstance;
}

export default KnowledgeStore;

