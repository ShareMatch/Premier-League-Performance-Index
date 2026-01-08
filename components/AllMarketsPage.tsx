import React, { useState, useMemo, useRef, useEffect } from "react";
import { Team, League } from "../types";
import { ArrowUpRight, ArrowDownRight, Search, Filter, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

interface AllMarketsPageProps {
    teams: Team[];
    onNavigate: (league: League) => void;
    onViewAsset: (asset: Team) => void;
}

const MARKET_FILTERS = [
    { id: "ALL", label: "All Markets" },
    { id: "EPL", label: "Premier League" },
    { id: "SPL", label: "Saudi Pro League" },
    { id: "UCL", label: "Champions League" },
    { id: "FIFA", label: "FIFA World Cup" },
    { id: "ISL", label: "Indonesia Super League" },
    { id: "F1", label: "Formula 1" },
    { id: "NBA", label: "NBA" },
    { id: "NFL", label: "NFL" },
    { id: "T20", label: "T20 World Cup" },
];

const AllMarketsPage: React.FC<AllMarketsPageProps> = ({
    teams,
    onNavigate,
    onViewAsset,
}) => {
    const [activeFilter, setActiveFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const ITEMS_PER_PAGE = 10;

    const handleFilterClick = (filterId: string, e: React.MouseEvent<HTMLButtonElement>) => {
        setActiveFilter(filterId);
        setCurrentPage(1);
        e.currentTarget.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest"
        });
    };

    const filteredTeams = useMemo(() => {
        let result = teams;

        if (activeFilter !== "ALL") {
            if (activeFilter === "FIFA") {
                result = result.filter(t => t.market === "WC" || t.market === "FIFA");
            } else {
                result = result.filter((t) => t.market === activeFilter);
            }
        }

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
    }, [teams, activeFilter, searchQuery]);

    // Initial loading simulation
    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 600);
        return () => clearTimeout(timer);
    }, []);

    // Reset to page 1 when search changes
    useMemo(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const totalPages = Math.ceil(filteredTeams.length / ITEMS_PER_PAGE);

    const displayedTeams = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTeams.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTeams, currentPage]);

    const handlePageChange = (page: number) => {
        if (page === currentPage) return;
        setIsLoading(true);
        // Simulate loading delay for "structure loading" feel
        setTimeout(() => {
            setCurrentPage(page);
            setIsLoading(false);
            // Optional: scroll to top of list
        }, 500);
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
                    <h1 className="text-xl font-bold font-sans whitespace-nowrap">All Index Tokens</h1>
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

            {/* Filters */}
            <div className="p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm z-10">
                {/* Filter Pills */}
                <div
                    ref={scrollContainerRef}
                    className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1"
                >
                    {MARKET_FILTERS.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={(e) => handleFilterClick(filter.id, e)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0 ${activeFilter === filter.id
                                ? "bg-brand-primary text-white border-brand-primary"
                                : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300"
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-3">
                    {isLoading ? (
                        // Skeleton Loading State
                        Array.from({ length: ITEMS_PER_PAGE }).map((_, idx) => (
                            <div key={`skeleton-${idx}`} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/20 border border-gray-700/30 animate-pulse">
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
                                        <div>
                                            <h3 className="font-bold text-gray-200 text-sm group-hover:text-brand-primary transition-colors">
                                                {team.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider bg-gray-800 px-1.5 py-0.5 rounded">
                                                    {team.market || "MKT"}
                                                </span>
                                                {team.category && (
                                                    <span className="text-[10px] text-gray-500 lowercase">
                                                        {team.category.replace('_', ' ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Buy/Sell & Arrow - Aligned with Widget */}
                                    <div className="flex items-center gap-3">
                                        {/* Sell (Bid) */}
                                        <div className="w-16 text-right">
                                            <span className="text-sm font-semibold text-red-400">
                                                ${team.bid.toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Buy (Offer) */}
                                        <div className="w-16 flex justify-end">
                                            <span className="bg-[#005430] text-white px-2 py-1 rounded text-sm font-bold shadow-sm shadow-black/20 group-hover:bg-[#006035] transition-colors min-w-[54px] text-center">
                                                ${team.offer.toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Arrow Indicator */}
                                        <div className={`flex items-center justify-center w-6 h-6 rounded-full bg-gray-800/50 border border-gray-700/50 flex-shrink-0 ${isPositive ? "text-green-500" : "text-red-500"}`}>
                                            {isPositive ? (
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                            ) : (
                                                <ArrowDownRight className="w-3.5 h-3.5" />
                                            )}
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
