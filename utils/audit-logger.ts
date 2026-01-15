/**
 * Audit Logger
 * 
 * Records all agent actions and decisions for traceability.
 * This is the "Flight Recorder" that captures proof of what happened.
 */

import * as fs from 'fs';
import * as path from 'path';

interface AuditEntry {
  timestamp: string;
  type: 'action' | 'observation' | 'decision' | 'result';
  component: string;
  message: string;
  data?: any;
}

class AuditLogger {
  private entries: AuditEntry[] = [];
  private testName: string = 'unknown';
  private outputDir: string = 'audit-reports';

  constructor() {
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  setTestName(name: string) {
    this.testName = name;
    this.entries = [];
  }

  log(type: AuditEntry['type'], component: string, message: string, data?: any) {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      type,
      component,
      message,
      data
    };
    
    this.entries.push(entry);
    
    // Also log to console for visibility
    const emoji = {
      action: '🔧',
      observation: '👁️',
      decision: '🧠',
      result: '✅'
    }[type];
    
    console.log(`${emoji} [${type.toUpperCase()}] ${component}: ${message}`);
  }

  action(component: string, message: string, data?: any) {
    this.log('action', component, message, data);
  }

  observation(component: string, message: string, data?: any) {
    this.log('observation', component, message, data);
  }

  decision(component: string, message: string, data?: any) {
    this.log('decision', component, message, data);
  }

  result(component: string, message: string, data?: any) {
    this.log('result', component, message, data);
  }

  /**
   * Save the audit log to a JSON file
   */
  save() {
    const filename = `${this.testName.replace(/\s+/g, '-')}-${Date.now()}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    const report = {
      testName: this.testName,
      generatedAt: new Date().toISOString(),
      totalEntries: this.entries.length,
      entries: this.entries
    };

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`📋 Audit log saved to: ${filepath}`);
    
    return filepath;
  }

  /**
   * Get a summary of the audit
   */
  getSummary() {
    const actions = this.entries.filter(e => e.type === 'action').length;
    const observations = this.entries.filter(e => e.type === 'observation').length;
    const decisions = this.entries.filter(e => e.type === 'decision').length;
    const results = this.entries.filter(e => e.type === 'result').length;

    return {
      testName: this.testName,
      totalEntries: this.entries.length,
      breakdown: { actions, observations, decisions, results }
    };
  }
}

// Export a singleton instance
export const auditLogger = new AuditLogger();

