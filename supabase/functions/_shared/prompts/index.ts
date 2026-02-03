/**
 * Centralized Prompts & Configurations
 * 
 * All AI prompts and configurations in one place.
 * Edge Functions import from here.
 * 
 * To update a prompt:
 * 1. Edit this file
 * 2. Deploy: `supabase functions deploy`
 * 
 * Benefits:
 * - Type-safe with TypeScript
 * - Version controlled with Git
 * - Zero latency (no DB calls)
 * - IDE autocomplete
 */

// Re-export everything
export * from "./news.ts";
export * from "./analysis.ts";
export * from "./chatbot.ts";
export * from "./facts.ts";
export * from "./configs.ts";
export * from "./utils.ts";
