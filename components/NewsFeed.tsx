import React, { useState, useEffect } from "react";
import { Newspaper, X, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

interface NewsItem {
  id: string; // Changed to string for UUID
  headline: string;
  source: string;
  published_at: string;
  url?: string;
}

const HARAM_KEYWORDS = [
  "gambling",
  "betting",
  "wager",
  "wagers",
  "stake",
  "stakes",
  "odds",
  "bookie",
  "bookmaker",
  "picks",
  "action",
  "parlay",
  "teaser",
  "prop bet",
  "prop bets",
  "spread",
  "spreads",
  "over/under",
  "o/u",
  "payout",
  "risk-free",
  "vegas",
  "las vegas",
  "promo code",
  "promocode",
  "deposit match",
  "bonus",
  "bonuses",
  "free bet",
  "freebets",
  "sign-up offer",
  "welcome offer",
  "welcome bonus",
  "offer code",
  "credit",
  "credits",
  "guaranteed winnings",
  "cash back",
  "daily fantasy",
  "dfs",
  "draftkings",
  "fanduel",
  "sleeper",
  "casino",
  "poker",
  "slot",
  "slots",
  "roulette",
  "blackjack",
  "lotto",
  "lottery",
  "moneyline",
  "wine",
  "beer",
  "alcohol",
];

const isHaram = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return HARAM_KEYWORDS.some((keyword) => {
    // For multi-word phrases or terms with special chars, use simple inclusion
    if (
      keyword.includes(" ") ||
      keyword.includes("/") ||
      keyword.includes("-")
    ) {
      return lowerText.includes(keyword);
    }
    // For single words, use word boundary to avoid false positives (e.g. 'line' in 'online')
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    return regex.test(lowerText);
  });
};

interface NewsFeedProps {
  topic?: string;
  showHeader?: boolean;
  className?: string;
}

const NewsFeed: React.FC<NewsFeedProps> = ({
  topic = "Global",
  showHeader = true,
  className = "",
}) => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const getTitle = (topic: string) => {
    return `ShareMatch News Wire`;
  };

  const title = getTitle(topic);
  const promptContext =
    topic === "F1"
      ? "Formula 1"
      : topic === "NBA"
        ? "Basketball"
        : topic === "NFL"
          ? "American Football"
          : topic === "Eurovision"
            ? "Eurovision Song Contest"
            : "Football";

  const fetchNews = async () => {
    setLoading(true);
    try {
      // Determine if this is an asset-level topic (like "team:Arsenal:EPL")
      const isAssetLevel = topic.startsWith("team:");

      // For asset-level topics, also fetch from the parent index to get more news faster
      let parentIndexTopic: string | null = null;
      let assetName: string | null = null;

      if (isAssetLevel) {
        const parts = topic.split(":");
        assetName = parts[1] || null;
        parentIndexTopic = parts[2] || null;
      }

      // 1. Fetch existing news from DB
      // For asset pages, fetch from BOTH the specific topic AND the parent index
      let allData: any[] = [];

      if (isAssetLevel && parentIndexTopic) {
        // Fetch from parent index (faster, already cached)
        const { data: indexData, error: indexError } = await supabase
          .from("news_articles")
          .select("*")
          .eq("topic", parentIndexTopic)
          .order("published_at", { ascending: false })
          .limit(40);

        if (!indexError && indexData) {
          allData = [...indexData];
        }

        // Also fetch from specific asset topic (may have dedicated news)
        const { data: assetData, error: assetError } = await supabase
          .from("news_articles")
          .select("*")
          .eq("topic", topic)
          .order("published_at", { ascending: false })
          .limit(10);

        allData = assetData || [];

        // console.log("[NewsFeed] Total combined news:", allData.length);
      } else {
        // For index-level topics, just fetch directly
        const { data, error } = await supabase
          .from("news_articles")
          .select("*")
          .eq("topic", topic)
          .order("published_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        allData = data || [];
      }

      const isRelevantToAsset = (
        text: string,
        assetNameParam: string,
      ): boolean => {
        const lowerText = text.toLowerCase();
        const lowerAsset = assetNameParam.toLowerCase().trim();

        // Extract significant words from team name
        const commonPrefixes = new Set([
          "the",
          "al",
          "fc",
          "cf",
          "ac",
          "as",
          "sc",
          "rc",
          "cd",
          "ud",
          "ca",
          "club",
          "sporting",
          "athletic",
          "real",
          "inter",
        ]);

        const assetWords = lowerAsset
          .split(/\s+/)
          .filter((w) => w.length > 2 && !commonPrefixes.has(w));

        if (assetWords.length === 0) return false;

        // METHOD 1: Check for full team name match
        if (lowerText.includes(lowerAsset)) {
          return true;
        }

        // METHOD 2: Check for hyphenated version (Al Hilal -> Al-Hilal)
        const hyphenated = lowerAsset.replace(/\s+/g, "-");
        if (lowerText.includes(hyphenated)) {
          return true;
        }

        // METHOD 3: Check for name without prefix (FC Barcelona -> Barcelona)
        const withoutPrefix = lowerAsset
          .replace(
            /^(al|fc|cf|ac|as|sc|rc|cd|ud|ca|club|sporting|athletic|real|inter)\s+/i,
            "",
          )
          .trim();
        if (withoutPrefix.length > 2 && lowerText.includes(withoutPrefix)) {
          return true;
        }

        // METHOD 4: Check for ANY significant word match with word boundaries
        // This catches partial matches like "Jaguars" from "Jacksonville Jaguars"
        let hasMatchingWord = false;
        for (const word of assetWords) {
          const wordRegex = new RegExp(`\\b${word}\\b`, "i");
          if (wordRegex.test(lowerText)) {
            hasMatchingWord = true;
            break;
          }
        }

        if (!hasMatchingWord) {
          return false; // No match at all
        }

        // At this point, we have a word match. Now check if it's a FALSE POSITIVE.
        // Example: "Patriots beat Jaguars" should show on Jaguars page
        // Example: "Patriots sign new QB" should NOT show on Jaguars page

        // NEGATIVE CHECK: Look for unrelated team context
        // If multiple different team names appear and ours is just mentioned casually,
        // it might not be relevant

        // Get list of potential other team mentions (common team name patterns)
        // This is a heuristic - looking for capital words that might be team names
        const capitalWordsRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;
        const capitalWords = text.match(capitalWordsRegex) || [];

        // Count how many times words from our team appear vs other potential teams
        let ourTeamMentions = 0;
        for (const word of assetWords) {
          const wordRegex = new RegExp(`\\b${word}\\b`, "gi");
          const matches = text.match(wordRegex);
          ourTeamMentions += matches ? matches.length : 0;
        }

        // If our team is mentioned at least once, consider it relevant
        // This handles both "Patriots vs Jaguars" AND "Jaguars vs Patriots"
        if (ourTeamMentions > 0) {
          return true;
        }

        return false;
      };

      if (allData.length > 0) {
        // Filter for Sharia compliance AND Relevance
        const filteredData = allData.filter((item) => {
          const fullText = item.headline + " " + (item.source || "");
          const lowerText = fullText.toLowerCase();

          // 1. Must NOT contain Haram content
          if (isHaram(lowerText)) {
            // console.log(`[Filter] ❌ Haram: "${item.headline}"`);
            return false;
          }

          // 2. For asset-level topics, check relevance
          if (isAssetLevel && assetName) {
            const isRelevant = isRelevantToAsset(fullText, assetName);

            if (!isRelevant) {
              // console.log(
              //   `[Filter] ❌ Not relevant to ${assetName}: "${item.headline}"`,
              // );
              return false;
            } else {
              // console.log(
              //   `[Filter] ✅ Relevant to ${assetName}: "${item.headline}"`,
              // );
            }
          }

          return true;
        });

        // Sort by published_at descending
        filteredData.sort(
          (a, b) =>
            new Date(b.published_at).getTime() -
            new Date(a.published_at).getTime(),
        );

        // console.log("[NewsFeed] Filtering results:", {
        //   assetName,
        //   topic,
        //   parentIndexTopic,
        //   totalFetched: allData.length,
        //   afterHaramFilter: allData.filter(
        //     (item) =>
        //       !isHaram(
        //         (item.headline + " " + (item.source || "")).toLowerCase(),
        //       ),
        //   ).length,
        //   afterRelevanceFilter: filteredData.length,
        //   topHeadlines: filteredData.slice(0, 5).map((item) => item.headline),
        // });

        setNewsItems(filteredData.slice(0, 10));
      }

      // 2. Check if update is needed (Lazy Update)
      // Check freshness for both index and asset-level topics
      const { data: updateData } = await supabase
        .from("news_updates")
        .select("last_updated_at")
        .eq("topic", topic)
        .single();

      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const lastUpdated = updateData?.last_updated_at
        ? new Date(updateData.last_updated_at)
        : null;

      // For asset-level topics: trigger fetch if no cached news for this specific asset
      // For index-level topics: trigger if stale (fallback for pre-fetch job)
      if (isAssetLevel) {
        // Only fetch if we haven't fetched for this asset before (or it's stale)
        if (!lastUpdated || lastUpdated < sixHoursAgo) {
          // console.log(
          //   "[NewsFeed] Triggering on-demand fetch for asset:",
          //   assetName,
          // );
          // Fire and forget - don't await (shows fallback news immediately while fetching)
          triggerUpdate();
        }
      } else {
        // Index-level: trigger if stale
        if (!lastUpdated || lastUpdated < sixHoursAgo) {
          triggerUpdate();
        }
      }
    } catch (err) {
      // console.error("Error fetching news:", err);
      setError("Failed to load news.");
    } finally {
      setLoading(false);
    }
  };

  const triggerUpdate = async () => {
    setIsUpdating(true);
    try {
      // console.log("[NewsFeed] Triggering fetch-news for:", topic);

      const { data, error } = await supabase.functions.invoke("fetch-news", {
        body: {
          topic,
        },
      });

      if (error) throw error;

      // console.log("[NewsFeed] fetch-news result:", data);

      if (!data?.error) {
        // Refetch news (will get from both parent index and asset-specific)
        // Re-run the full fetch logic to properly merge and filter
        await fetchNews();
      } else if (data?.error || data?.dbStatus === "empty") {
        // console.log("[NewsFeed] No news found for:", topic);
        setDebugMessage(JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      // console.error("Error updating news:", err);
      setDebugMessage(`Client Error: ${err.message || JSON.stringify(err)}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // DEBUG STATE
  const [debugMessage, setDebugMessage] = useState<string>("");

  useEffect(() => {
    fetchNews();
  }, [topic]);

  const handleNewsClick = async (item: NewsItem) => {
    setSelectedNews(item);
    setSummary("");
    setLoading(true); // Re-use loading state for modal or create separate one?
    // Let's create a local loading state for the modal to avoid hiding the feed
    // Actually, let's just use a separate state variable for summary loading
  };

  // Separate loading state for summary
  const [summaryLoading, setSummaryLoading] = useState(false);

  const generateSummary = async (item: NewsItem) => {
    setSummaryLoading(true);
    try {
      // Call Edge Function to generate summary (API key is stored server-side)
      const { data, error } = await supabase.functions.invoke(
        "generate-news-summary",
        {
          body: {
            headline: item.headline,
            source: item.source,
            url: item.url,
          },
        },
      );

      if (error) {
        // console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to generate summary");
      }

      if (data?.error) {
        // console.error("Summary generation error:", data.error);
        setSummary(data.error);
      } else if (data?.summary) {
        setSummary(data.summary);
      } else {
        setSummary("Summary could not be generated at this time.");
      }
    } catch (err: any) {
      // console.error("Summary generation error:", err?.message || err);

      // Provide helpful error message
      const errorMessage = err?.message?.toLowerCase() || "";
      if (errorMessage.includes("quota") || errorMessage.includes("rate")) {
        setSummary("Too many requests. Please try again in a moment.");
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("fetch")
      ) {
        setSummary("Network error. Please check your connection.");
      } else {
        setSummary("Failed to generate summary. Please try again.");
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  // Trigger summary generation when modal opens
  useEffect(() => {
    if (selectedNews) {
      generateSummary(selectedNews);
    }
  }, [selectedNews]);

  const closeModal = () => {
    setSelectedNews(null);
    setSummary("");
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <>
      <div
        data-testid="news-feed"
        className={`bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col ${className || "h-48 sm:h-50 md:h-48 lg:h-60 xl:h-60"}`}
      >
        {showHeader && (
          <div className="p-2 sm:p-3 border-b border-gray-700 bg-gray-800/50 flex items-center gap-1.5 sm:gap-2">
            <Newspaper className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white flex-shrink-0" />
            <h3 className="font-bold text-gray-200 text-xs sm:text-sm truncate flex-1">
              {title}
            </h3>
            {isUpdating && (
              <RefreshCw className="w-3 h-3 text-gray-400 animate-spin flex-shrink-0" />
            )}
            <span className="text-[8px] sm:text-[10px] bg-red-500/20 text-red-400 px-1 sm:px-1.5 py-0.5 rounded animate-pulse flex-shrink-0">
              LIVE
            </span>
          </div>
        )}
        <div className="flex-1 overflow-hidden relative group">
          <div className="absolute inset-0 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-4 scrollbar-hide">
            {loading && newsItems.length === 0 ? (
              <div className="text-center text-gray-500 text-xs sm:text-sm py-4">
                Loading news...
              </div>
            ) : newsItems.length === 0 ? (
              <div className="text-center text-gray-500 text-xs sm:text-sm py-4 flex flex-col gap-2">
                <span>No news available.</span>
                {debugMessage && (
                  <pre className="text-[10px] text-left bg-black/50 p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap font-mono text-red-300">
                    DEBUG: {debugMessage}
                  </pre>
                )}
              </div>
            ) : (
              newsItems.map((item) => (
                <div
                  key={item.id}
                  className="border-b border-gray-700/50 last:border-0 pb-2 sm:pb-3 last:pb-0 cursor-pointer group/item"
                  onClick={() => handleNewsClick(item)}
                >
                  <p className="text-xs sm:text-sm font-medium text-gray-300 group-hover/item:text-white transition-colors line-clamp-2">
                    {item.headline}
                  </p>
                  <div className="flex justify-between mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-500">
                    <span className="truncate max-w-[50%]">{item.source}</span>
                    <span className="flex-shrink-0">
                      {formatTime(item.published_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Summary Modal - Responsive */}
      {selectedNews && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
          data-testid="news-summary-modal-overlay"
        >
          <div
            className="max-w-[92vw] sm:max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto scrollbar-hide"
            style={{
              borderRadius: "12px",
              background: "rgba(4, 34, 34, 0.60)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
            }}
            data-testid="news-summary-modal"
          >
            {/* Header - Compact on mobile */}
            <div
              className="px-2.5 sm:px-5 py-2 sm:py-4 flex justify-between items-center sticky top-0 z-10"
              style={{
                background: "#021A1A",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <h3 className="font-bold text-white flex items-center gap-1 sm:gap-2 text-[11px] sm:text-base">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-[#005430] flex-shrink-0" />
                AI News Summary
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                data-testid="news-summary-close-button"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Content - Compact on mobile */}
            <div className="p-2.5 sm:p-6">
              <h4 className="font-bold text-[11px] sm:text-lg text-white mb-2 sm:mb-4 leading-tight">
                {selectedNews.headline}
              </h4>

              {summaryLoading ? (
                <div className="space-y-1.5 sm:space-y-3 animate-pulse">
                  <div className="h-2 bg-white/10 rounded w-full"></div>
                  <div className="h-2 bg-white/10 rounded w-5/6"></div>
                  <div className="h-2 bg-white/10 rounded w-4/5"></div>
                </div>
              ) : (
                <p className="text-gray-200 text-[10px] sm:text-sm leading-relaxed">
                  {summary}
                </p>
              )}

              <div className="mt-3 sm:mt-6 pt-2 sm:pt-4 border-t border-white/10 flex justify-end">
                <span className="text-[9px] sm:text-xs text-gray-400">
                  Powered by Google Gemini
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NewsFeed;
