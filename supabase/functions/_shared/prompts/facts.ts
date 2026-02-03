/**
 * Fun Facts Prompts
 * 
 * Prompts for did-you-know and on-this-day
 */

/**
 * Did You Know Prompt
 * 
 * Variables: {{assetName}}, {{contextClause}}
 */
export const DID_YOU_KNOW_PROMPT = `Write a single, short, fascinating "Did You Know?" fact about {{assetName}} {{contextClause}}.
Rules:
1. It must be ONE sentence.
2. It must be interesting or obscure.
3. Focus on records, history, stats, or unique traits in their sport.
4. STRICTLY AVOID: politics, war, religion, or sensitive geopolitical topics.
5. If the asset is a country/team in a specific competition (e.g. Eurovision), focus ONLY on that competition.
Start directly with the fact.`;

/**
 * On This Day Prompt
 * 
 * Variables: {{assetName}}, {{dateString}}, {{contextClause}}
 */
export const ON_THIS_DAY_PROMPT = `Write a short "On This Day" ({{dateString}}) historical fact about {{assetName}} {{contextClause}}.
Rules:
1. It MUST be historically accurate for TODAY'S DATE ({{dateString}}).
2. If no specific event happened on this exact date for {{assetName}}, find a significant event from this WEEK in history.
3. Keep it to one interesting sentence.
4. STRICTLY AVOID: politics, war, religion.
5. Focus on wins, records, signings, or legendary moments.
Start directly with the fact.`;

/**
 * Default fallback fact when API fails
 */
export const DEFAULT_DID_YOU_KNOW = "Did you know? ShareMatch provides real-time tokenised trading for sports assets.";

/**
 * Default fallback for On This Day
 */
export const DEFAULT_ON_THIS_DAY = "On this day, ShareMatch users are exploring sports performance data.";
