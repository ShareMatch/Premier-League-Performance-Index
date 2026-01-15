import React, { useState, useMemo, useRef, useEffect } from "react";
import { Team, League } from "../types";
import {
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trophy,
  Flag,
  Activity,
  Zap,
} from "lucide-react";
import { FaCheck } from "react-icons/fa6";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface AllMarketsPageProps {
  teams: Team[];
  onNavigate: (league: League) => void;
  onViewAsset: (asset: Team) => void;
  onSelectOrder: (team: Team, type: "buy" | "sell") => void;
}

const CATEGORIES = [
  { id: "ALL", label: "All Index Tokens" },
  {
    id: "football",
    label: "Football",
    markets: [
      { id: "EPL", label: "Premier League" },
      { id: "SPL", label: "Saudi Pro League" },
      { id: "UCL", label: "Champions League" },
      { id: "FIFA", label: "FIFA World Cup" },
    ],
  },
  {
    id: "f1",
    label: "Motorsport",
    markets: [{ id: "F1", label: "Formula 1" }],
  },
  {
    id: "basketball",
    label: "Basketball",
    markets: [{ id: "NBA", label: "NBA" }],
  },
  {
    id: "american_football",
    label: "American Football",
    markets: [{ id: "NFL", label: "NFL" }],
  },
  {
    id: "cricket",
    label: "Cricket",
    markets: [{ id: "T20", label: "T20 World Cup" }],
  },
  {
    id: "global_events",
    label: "Global Events",
    markets: [{ id: "EUROVISION", label: "Eurovision" }],
  },
];

const AllMarketsPage: React.FC<AllMarketsPageProps> = ({
  teams,
  onNavigate,
  onViewAsset,
  onSelectOrder,
}) => {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [activeFilters, setActiveFilters] = useState<string[]>(["ALL"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const [pageCache, setPageCache] = useState<Record<number, Team[]>>({});
  const [isDragging, setIsDragging] = useState(false);


  const ITEMS_PER_PAGE = 10;

  const handleSelectMarket = (
    categoryId: string,
    filterId: string,
    isFromDropdown = false
  ) => {
    setActiveCategory(categoryId);

    if (filterId === "ALL") {
      setActiveFilters(["ALL"]);
    } else {
      setActiveFilters((prev) => {
        // If we were in ALL, start a new list
        const current = prev.filter((f) => f !== "ALL");
        const exists = current.includes(filterId);

        let next;
        if (exists) {
          next = current.filter((f) => f !== filterId);
        } else {
          next = [...current, filterId];
        }

        return next.length === 0 ? ["ALL"] : next;
      });
    }

    setCurrentPage(1);
  };

  const filteredTeams = useMemo(() => {
    // 1. Global visibility filters (Hide settled, closed, or effectively hidden assets)
    let result = teams.filter((t) => {
      // Basic settled/closed checks
      if (t.is_settled) return false;
      if (t.season_stage === "settled" || t.season_stage === "closed")
        return false;

      // Price-based visibility (settled system usually sets prices to $100 or $0.1)
      // We still show them if they aren't explicitly settled, but here we can be more strict if needed.
      // However, usually offer > 0 is fine. The user specifically mentioned $100 and $0.1 as settled.
      if (t.offer === 100 || t.offer === 0.1) return false;

      return true;
    });

    // 2. Category / Sub-market filtering
    if (!activeFilters.includes("ALL")) {
      // If specific markets are selected, they take priority
      result = result.filter((t) => {
        const marketMatch = activeFilters.includes(t.market || "");
        const fifaMatch =
          activeFilters.includes("FIFA") &&
          (t.market === "WC" || t.market === "FIFA");
        return marketMatch || fifaMatch;
      });
    } else if (activeCategory !== "ALL") {
      // Otherwise, if a category is selected and filters are at "ALL", filter by category
      result = result.filter((t) => t.category === activeCategory);
    }

    // 4. Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.team?.toLowerCase().includes(query) ||
          t.market?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [teams, activeCategory, activeFilters, searchQuery]);

  // Compute which categories actually have active teams to display in the filter bar
  const visibleCategories = useMemo(() => {
    // Check which categories have at least one active team
    const activeTeams = teams.filter((t) => {
      if (t.is_settled) return false;
      if (t.season_stage === "settled" || t.season_stage === "closed")
        return false;
      if (t.offer === 100 || t.offer === 0.1) return false;
      return true;
    });

    const activeCatIds = new Set(activeTeams.map((t) => t.category));

    return CATEGORIES.filter((cat) => {
      if (cat.id === "ALL") return true; // Always show "All"
      return activeCatIds.has(cat.id as any);
    });
  }, [teams]);

  // Initial loading simulation
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Clear cache and reset to page 1 when search or filters change
  useEffect(() => {
    setPageCache({});
    setCurrentPage(1);
  }, [activeCategory, activeFilters, searchQuery]);


  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsDragging(true);

      // cancel previous timer
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // start a new timer to reset dragging after 50ms
      scrollTimeoutRef.current = setTimeout(() => {
        setIsDragging(false);
        scrollTimeoutRef.current = null;
      }, 50);
    };

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);




  // Pagination loading and caching logic
  useEffect(() => {
    // If page is already in cache, don't show loading
    if (pageCache[currentPage]) {
      setIsLoading(false);
      return;
    }



    // Otherwise, simulate a fetch/load for the new page
    setIsLoading(true);
    const timer = setTimeout(() => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const pageData = filteredTeams.slice(start, start + ITEMS_PER_PAGE);

      setPageCache((prev) => ({ ...prev, [currentPage]: pageData }));
      setIsLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [currentPage, filteredTeams, pageCache]);

  const totalPages = Math.ceil(filteredTeams.length / ITEMS_PER_PAGE);

  const displayedTeams = useMemo(() => {
    return pageCache[currentPage] || [];
  }, [pageCache, currentPage]);

  const handlePageChange = (page: number) => {
    if (page === currentPage) return;
    setCurrentPage(page);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5; // Adjust as needed

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first, last, current, and surrounding
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900 z-10 gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate("HOME")}
            className="p-1 rounded-full hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="text-xl font-bold font-sans whitespace-nowrap">
            Index Tokens
          </h1>
        </div>

        {/* Search Bar - Moved to Header */}
        <div className="relative flex-1 max-w-[200px] sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border-none rounded-xl py-2 pl-9 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-brand-primary/50"
          />
        </div>
      </div>

      <div className="p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-[73px] z-10">
        <div
          ref={scrollContainerRef}
          className={`flex items-center gap-2 pb-1 scrollbar-hide select-none
        ${openDropdown ? "overflow-x-hidden touch-none" : "overflow-x-auto touch-pan-x"}`}
          onPointerDown={(e) => {
            pointerStartRef.current = { x: e.clientX, y: e.clientY };
            setIsDragging(false);
          }}
          onPointerMove={(e) => {
            if (!pointerStartRef.current) return;
            const dx = Math.abs(e.clientX - pointerStartRef.current.x);
            const dy = Math.abs(e.clientY - pointerStartRef.current.y);
            if (dx > 10 || dy > 10) {
              setIsDragging(true);
            }
          }}
          onPointerUp={() => {
            pointerStartRef.current = null;
            setTimeout(() => setIsDragging(false), 100);
          }}
          onPointerCancel={() => {
            pointerStartRef.current = null;
            setIsDragging(false);
          }}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 touch-pan-x select-none"
        >
          {visibleCategories.map((cat) => {
            const hasMarkets = cat.markets && cat.markets.length > 0;
            const isActive = activeCategory === cat.id;

            const pillButton = (
              <button
                onClick={() => !hasMarkets && handleSelectMarket("ALL", "ALL")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0 ${isActive
                  ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20"
                  : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300"
                  }`}
              >
                <span>{cat.label}</span>
                {hasMarkets &&
                  (openDropdown === cat.id ? (
                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  ))}
              </button>
            );

            if (!hasMarkets) return <div key={cat.id}>{pillButton}</div>;

            return (
              <DropdownMenu.Root
                key={cat.id}
                onOpenChange={(open) => {
                  if (isDragging && open) return;
                  setOpenDropdown(open ? cat.id : null);
                  setIsDragging(false);
                }}
                open={openDropdown === cat.id}
              >
                <DropdownMenu.Trigger asChild>
                  <div
                    className={isDragging ? "pointer-events-none" : "cursor-pointer"}
                  >
                    {pillButton}
                  </div>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="z-50 min-w-[180px] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-top"
                    sideOffset={8}
                    align="start"
                  >
                    <DropdownMenu.Item
                      className="flex items-center px-3 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl cursor-pointer transition-colors outline-none"
                      onClick={() => handleSelectMarket(cat.id, "ALL")}
                    >
                      All {cat.label}
                    </DropdownMenu.Item>
                    <div className="h-px bg-gray-800/50 my-1 mx-2" />
                    {cat.markets!.map((m) => {
                      const isSelected = activeFilters.includes(m.id);
                      return (
                        <DropdownMenu.CheckboxItem
                          key={m.id}
                          className={`flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl cursor-pointer transition-colors outline-none mb-0.5 ${isSelected
                            ? "bg-brand-primary text-white"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                          checked={isSelected}
                          onSelect={(e) => {
                            e.preventDefault(); // Keep dropdown open for multi-select
                            handleSelectMarket(cat.id, m.id, true);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {m.label}
                          </div>
                          {isSelected && (
                            <FaCheck className="w-3 h-3 text-white" />
                          )}
                        </DropdownMenu.CheckboxItem>
                      );
                    })}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            );
          })}
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-3">
          {isLoading ? (
            // Skeleton Loading State
            Array.from({ length: ITEMS_PER_PAGE }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-800/20 border border-gray-700/30 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-800/50" />
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-32 bg-gray-800/50 rounded-md" />
                    <div className="h-3 w-16 bg-gray-800/50 rounded-md" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="h-4 w-16 bg-gray-800/50 rounded-md" />
                  <div className="h-3 w-10 bg-gray-800/50 rounded-md" />
                </div>
              </div>
            ))
          ) : filteredTeams.length > 0 ? (
            displayedTeams.map((team) => {
              // Placeholder logic for visual variations
              const isPositive = Math.random() > 0.4;
              const changePercent = (Math.random() * 8).toFixed(2);

              return (
                <div
                  key={team.id}
                  onClick={() => onViewAsset(team)}
                  className="group flex items-center justify-between p-3 rounded-xl bg-gray-800/40 border border-gray-700/50 hover:border-brand-primary/50 cursor-pointer backdrop-blur-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    {/* Logo */}
                    <div className="w-12 h-12 rounded-xl bg-gray-900/50 p-2 flex items-center justify-center border border-gray-700/50 group-hover:border-brand-primary/30 transition-colors">
                      {team.logo_url ? (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-sm font-bold text-gray-500">
                          {team.name.substring(0, 2)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-200 text-[clamp(0.75rem,2.5vw,0.875rem)] group-hover:text-brand-primary transition-colors leading-tight">
                        {team.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider bg-gray-800 px-1.5 py-0.5 rounded">
                          {team.market || "MKT"}
                        </span>
                        {team.category && (
                          <span className="text-[10px] text-gray-500 lowercase">
                            {team.category.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Pricing (Ticker Style) - Responsive with clamp */}
                  <div className="flex items-center gap-[clamp(0.4rem,1.5vw,1rem)] ml-1">
                    {/* Sell Section */}
                    <div className="flex items-center gap-[clamp(0.15rem,0.5vw,0.375rem)] w-[clamp(68px,15vw,130px)] justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectOrder) onSelectOrder(team, "sell");
                        }}
                        className="bg-red-900/30 hover:bg-red-900/50 text-red-400 text-[clamp(0.55rem,0.85vw,0.75rem)] font-bold px-[clamp(0.25rem,0.6vw,0.625rem)] py-[clamp(0.125rem,0.3vw,0.375rem)] rounded transition-all uppercase tracking-wider shrink-0"
                      >
                        Sell
                      </button>
                      <span className="text-[clamp(0.7rem,1.15vw,0.875rem)] font-bold text-gray-200 min-w-[clamp(35px,8vw,70px)] text-right">
                        ${team.bid.toFixed(2)}
                      </span>
                    </div>

                    {/* Buy Section */}
                    <div className="flex items-center gap-[clamp(0.15rem,0.5vw,0.375rem)] w-[clamp(68px,15vw,130px)] justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectOrder) onSelectOrder(team, "buy");
                        }}
                        className="bg-[#005430] hover:bg-[#006035] text-white text-[clamp(0.55rem,0.85vw,0.75rem)] font-bold px-[clamp(0.25rem,0.6vw,0.625rem)] py-[clamp(0.125rem,0.3vw,0.375rem)] rounded transition-all shadow-sm uppercase tracking-wider shrink-0"
                      >
                        Buy
                      </button>
                      <span className="text-[clamp(0.7rem,1.15vw,0.875rem)] font-bold text-gray-200 min-w-[clamp(35px,8vw,70px)] text-right">
                        ${team.offer.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-gray-500">
              <Filter className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p>No markets found matching your filters.</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredTeams.length > ITEMS_PER_PAGE && (
          <div className="flex justify-center py-6">
            <div className="bg-gray-800/80 rounded-full p-1.5 flex items-center gap-1 backdrop-blur-sm border border-gray-700/50 shadow-lg shadow-black/20">
              {/* Prev Button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${currentPage === 1
                  ? "text-gray-600 cursor-not-allowed"
                  : "text-brand-primary hover:bg-gray-700/50"
                  }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1 mx-2">
                {getPageNumbers().map((page, idx) => (
                  <React.Fragment key={idx}>
                    {page === "..." ? (
                      <span className="text-gray-500 text-xs px-1">...</span>
                    ) : (
                      <button
                        onClick={() => handlePageChange(page as number)}
                        disabled={isLoading}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${currentPage === page
                          ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/25 scale-105"
                          : "text-gray-400 hover:bg-white/10 hover:text-gray-200"
                          }`}
                      >
                        {page}
                      </button>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${currentPage === totalPages
                  ? "text-gray-600 cursor-not-allowed"
                  : "text-brand-primary hover:bg-gray-700/50"
                  }`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllMarketsPage;