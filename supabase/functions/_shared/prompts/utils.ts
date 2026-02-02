/**
 * Prompt Utilities
 * 
 * Helper functions for working with prompts
 */

import { TOPIC_SEARCH_MAP, LEAGUE_DISPLAY_NAMES } from "./configs.ts";

/**
 * Interpolate variables into a prompt template
 * 
 * @param template - The prompt template with {{variable}} placeholders
 * @param variables - Object with variable values
 * @returns The interpolated prompt string
 * 
 * @example
 * const prompt = interpolate(
 *   "Search for {{searchQuery}} in {{league}}",
 *   { searchQuery: "transfer news", league: "EPL" }
 * );
 * // Result: "Search for transfer news in EPL"
 */
export function interpolate(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, String(value));
  }
  
  return result;
}

/**
 * Get search query for a topic
 */
export function getTopicSearchQuery(topic: string): string {
  return TOPIC_SEARCH_MAP[topic] || "Sports news";
}

/**
 * Get display name for a league code
 */
export function getLeagueDisplayName(leagueCode: string): string {
  return LEAGUE_DISPLAY_NAMES[leagueCode] || leagueCode;
}

/**
 * Build search query for team-specific news
 */
export function buildTeamSearchQuery(teamName: string, leagueCode: string): string {
  const leagueName = getLeagueDisplayName(leagueCode);
  return `"${teamName}" in "${leagueName}"`;
}

/**
 * Get context clause for fact prompts
 */
export function getContextClause(market?: string, type: 'did-you-know' | 'on-this-day' = 'did-you-know'): string {
  if (type === 'did-you-know') {
    return market 
      ? `specifically within the context of ${market} (Sport/League)` 
      : 'in the context of sports and performance';
  } else {
    return market ? `specifically for ${market}` : 'in sports history';
  }
}

/**
 * Get formatted date string for On This Day prompt
 */
export function getTodayDateString(): string {
  const today = new Date();
  return today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}
