/**
 * News-Related Prompts
 * 
 * Prompts for fetch-news, generate-news-summary, prefetch-news
 */

/**
 * Prompt for fetching news articles via Google Search
 * 
 * Variables: {{searchQuery}}
 */
export const FETCH_NEWS_PROMPT = `You MUST use the Google Search tool to fetch live articles for: "{{searchQuery}}".
Do NOT use your internal knowledge. Only return information from the search results.

Find 5-8 recent news articles covering:
- Match results and performances
- Injuries and recovery updates
- Transfer news and rumors
- Contract negotiations
- Manager/coach statements
- Upcoming fixtures and predictions

RULES:
- Articles must be from the LAST 24 HOURS
- Use reputable sports sources (BBC Sport, Sky Sports, ESPN, The Athletic, Goal.com, etc.)
- NO betting/gambling content
- NO clickbait or low-quality sources

Strictly output a JSON ARRAY of 5 objects. format:
[
  {
    "headline": "Article Title",
    "source": "Publisher Name",
    "published_at": "ISO date string (must be recent)",
    "url": "https://link-to-article"
  }
]

Return ONLY the JSON array. No text before or after.`;

/**
 * Prompt for generating article summaries
 * 
 * Variables: {{headline}}, {{source}}, {{url}}
 */
export const GENERATE_SUMMARY_PROMPT = `Write a short, engaging 3-sentence summary for this news article:

Headline: "{{headline}}"
Source: {{source}}
URL: {{url}}

Rules:
- Keep it concise and informative
- Focus on what this means for fans and the sport
- Don't speculate too wildly
- Write in an engaging, professional sports journalism style`;
