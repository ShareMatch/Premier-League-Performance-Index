import React, { useState, useEffect, useMemo } from "react";
import { League, Team } from "../types";
import {
  Home,
  Cloud,
  Globe,
  Trophy,
  Gamepad2,
  ChevronDown,
  ChevronRight,
  Menu,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { fetchMarketHierarchy } from "../lib/api";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeLeague: League;
  onLeagueChange: (league: League) => void;
  allAssets: Team[];
  onHelpCenterClick?: () => void;
  onHowItWorksClick?: () => void;
  onViewAsset?: (asset: Team) => void;
  isLoggedIn?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  activeLeague,
  onLeagueChange,
  allAssets,
  onHelpCenterClick,
  onHowItWorksClick,
  onViewAsset,
  isLoggedIn = false,
}) => {
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "Sports",
    "Football",
  ]);
  const [marketHierarchy, setMarketHierarchy] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchMarketHierarchy()
      .then((data) => {
        if (mounted) {
          setMarketHierarchy(data || []);
        }
      })
      .catch((error) => {
        console.error("Failed to load market hierarchy", error);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const activeMarkets = useMemo(() => {
    const map = new Map<string, { label: string; token: string }>();
    marketHierarchy.forEach((group) => {
      const subGroups = group?.market_sub_groups || [];
      subGroups.forEach((sub) => {
        const markets = sub?.markets || [];
        markets.forEach((market: any) => {
          if (market?.status === "active" && market?.market_token) {
            map.set(market.market_token.toUpperCase(), {
              label: market.name || market.market_token,
              token: market.market_token.toUpperCase(),
            });
          }
        });
      });
    });
    return map;
  }, [marketHierarchy]);

  const lookupLabel = (token: string, fallback: string) => {
    const entry = activeMarkets.get(token);
    return entry?.label || fallback;
  };

  const createSubItems = (tokens: string[], fallbackLabelMap: Record<string, string>) =>
    tokens.reduce<any[]>((acc, token) => {
      if (!activeMarkets.has(token)) return acc;
      acc.push({
        label: lookupLabel(token, fallbackLabelMap[token] || token),
        id: token,
        active: activeLeague === token,
      });
      return acc;
    }, []);

  const footballOrder = ["EPL", "SPL", "UCL", "WC", "ISL"];
  const motorsportOrder = ["F1"];
  const basketballOrder = ["NBA"];
  const americanFootballOrder = ["NFL"];
  const cricketOrder = ["T20"];
  const globalEventsOrder = ["EUROVISION"];

  const labelMap: Record<string, string> = {
    EPL: "England Premier League",
    SPL: "Saudi Pro League",
    UCL: "UEFA Champions League",
    WC: "FIFA World Cup",
    ISL: "Indonesia Super League",
    F1: "Formula 1",
    NBA: "NBA",
    NFL: "NFL",
    T20: "T20 World Cup",
    EUROVISION: "Eurovision",
  };

  const footballItems = useMemo(() => createSubItems(footballOrder, labelMap), [activeLeague, activeMarkets]);
  const motorsportItems = useMemo(() => createSubItems(motorsportOrder, labelMap), [activeLeague, activeMarkets]);
  const basketballItems = useMemo(() => createSubItems(basketballOrder, labelMap), [activeLeague, activeMarkets]);
  const americanFootballItems = useMemo(() => createSubItems(americanFootballOrder, labelMap), [activeLeague, activeMarkets]);
  const cricketItems = useMemo(() => createSubItems(cricketOrder, labelMap), [activeLeague, activeMarkets]);
  const globalEventsItems = useMemo(() => createSubItems(globalEventsOrder, labelMap), [activeLeague, activeMarkets]);

  const menuItems: any[] = [
    {
      icon: Home,
      label: "Home",
      id: "HOME",
      active: activeLeague === "HOME",
      testId: "sidebar-home",
    },
    {
      icon: Trophy,
      label: "Sports",
      subItems: [
        {
          label: "Football",
          subItems: footballItems,
        },
        {
          label: "Motorsport",
          subItems: motorsportItems,
        },
        {
          label: "Basketball",
          subItems: basketballItems,
        },
        {
          label: "American Football",
          subItems: americanFootballItems,
        },
        { label: "Golf", badge: "SOON" },
        {
          label: "Cricket",
          subItems: cricketItems,
        },
      ],
    },
    { icon: Gamepad2, label: "E-Sports" },

    {
        icon: Globe,
        label: "Global Events",
        subItems: [
          ...globalEventsItems,
          { label: "Oscars", badge: "SOON" },
          { label: "Golden Globes", badge: "SOON" },
        ],
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {/* Overlay for mobile/tablet (below lg/1024px) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Hidden below lg (1024px), visible on desktop */}
      <div
        data-testid="sidebar"
        className={`
        fixed lg:static top-14 lg:top-0 bottom-0 left-0 z-40
        w-[clamp(14rem,20vw,16rem)] bg-[#0B1221] border-r border-gray-800 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >

        <nav className="flex-1 overflow-y-auto px-[clamp(0.5rem,1.5vw,1rem)] py-[clamp(0.25rem,1vh,0.5rem)] space-y-[clamp(0.125rem,0.5vh,0.25rem)] mt-[clamp(0.5rem,2vh,1rem)] lg:mt-0 flex flex-col">
          <div className="flex-1 space-y-[clamp(0.125rem,0.5vh,0.25rem)]">
            {menuItems.map((item) => (
              <div key={item.label}>
                {item.subItems ? (
                  <button
                    onClick={() => toggleExpand(item.label)}
                    data-testid={`sidebar-expand-${item.label
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                    className={`
                    w-full flex items-center justify-between px-[clamp(0.5rem,1vw,0.75rem)] py-[clamp(0.35rem,0.8vh,0.5rem)] rounded-lg text-[clamp(0.75rem,0.9vw,0.85rem)] font-medium transition-colors
                    ${item.id === "AI_ANALYTICS"
                        ? item.active
                          ? "bg-[#005430] text-white shadow-lg shadow-[#005430]/20 font-bold"
                          : "text-white bg-[#005430] hover:bg-[#005430]/90 font-bold shadow-lg shadow-[#005430]/20"
                        : item.active
                          ? "bg-brand-emerald500/10 text-brand-emerald500"
                          : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                      }
                  `}
                  >
                    <div className="flex items-center gap-[clamp(0.5rem,1vw,0.75rem)]">
                      <item.icon className="w-[clamp(1rem,1.2vw,1.25rem)] h-[clamp(1rem,1.2vw,1.25rem)]" />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-800 text-gray-500 rounded border border-gray-700">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {expandedItems.includes(item.label) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                ) : !item.id ? (
                  <button
                    onClick={(e) => e.preventDefault()}
                    className="w-full flex items-center justify-between px-[clamp(0.5rem,1vw,0.75rem)] py-[clamp(0.35rem,0.8vh,0.5rem)] rounded-lg text-[clamp(0.75rem,0.9vw,0.85rem)] font-medium transition-colors text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                  >
                    <div className="flex items-center gap-[clamp(0.5rem,1vw,0.75rem)]">
                      <item.icon className="w-[clamp(1rem,1.2vw,1.25rem)] h-[clamp(1rem,1.2vw,1.25rem)]" />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-800 text-gray-500 rounded border border-gray-700">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                ) : (
                  <Link
                    to={
                      item.id === "HOME"
                        ? "/"
                        : item.id === "ALL_MARKETS"
                          ? "/markets"
                          : item.id === "NEW_MARKETS"
                            ? "/new-markets"
                            : item.id === "AI_ANALYTICS"
                              ? "/ai-analytics"
                              : `/market/${item.id}`
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      item.id && onLeagueChange(item.id as any);
                    }}
                    className={`
                    w-full flex items-center justify-between px-[clamp(0.5rem,1vw,0.75rem)] py-[clamp(0.35rem,0.8vh,0.5rem)] rounded-lg text-[clamp(0.75rem,0.9vw,0.85rem)] font-medium transition-colors
                    ${item.id === "AI_ANALYTICS"
                        ? item.active
                          ? "bg-[#005430] text-white shadow-lg shadow-[#005430]/20 font-bold"
                          : "text-white bg-[#005430] hover:bg-[#005430]/90 font-bold shadow-lg shadow-[#005430]/20"
                        : item.active
                          ? "bg-brand-emerald500/10 text-brand-emerald500"
                          : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                      }
                  `}
                    data-testid={item.testId}
                  >
                    <div className="flex items-center gap-[clamp(0.5rem,1vw,0.75rem)]">
                      <item.icon className="w-[clamp(1rem,1.2vw,1.25rem)] h-[clamp(1rem,1.2vw,1.25rem)]" />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </Link>
                )}

                {/* Level 1 Submenu */}
                {item.subItems && expandedItems.includes(item.label) && (
                  <div className="ml-[clamp(1.5rem,2.5vw,2.25rem)] mt-[clamp(0.125rem,0.2vh,0.25rem)] space-y-[clamp(0.125rem,0.2vh,0.25rem)] border-l border-gray-800 pl-[clamp(0.5rem,1vw,0.75rem)]">
                    {item.subItems.map((subItem: any) => (
                      <div key={subItem.label}>
                        {subItem.subItems ? (
                          <button
                            onClick={() => toggleExpand(subItem.label)}
                            className={`
                            w-full flex items-center justify-between px-[clamp(0.5rem,1vw,0.75rem)] py-[clamp(0.25rem,0.5vh,0.4rem)] rounded-lg text-[clamp(0.7rem,0.85vw,0.8rem)] transition-colors
                            ${(subItem as any).active
                                ? "bg-[#005430] text-white font-medium shadow-lg shadow-[#005430]/20"
                                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                              }
                          `}
                          >
                            <div className="flex items-center gap-[clamp(0.25rem,0.5vw,0.5rem)]">
                              <span className="whitespace-nowrap">
                                {subItem.label}
                              </span>
                            </div>
                            {expandedItems.includes(subItem.label) ? (
                              <ChevronDown className="w-[clamp(0.6rem,0.8vw,0.75rem)] h-[clamp(0.6rem,0.8vw,0.75rem)]" />
                            ) : (
                              <ChevronRight className="w-[clamp(0.6rem,0.8vw,0.75rem)] h-[clamp(0.6rem,0.8vw,0.75rem)]" />
                            )}
                          </button>
                        ) : (
                          <Link
                            to={
                              (subItem as any).asset
                                ? `/asset/${(subItem as any).asset.name.toLowerCase().replace(/\s+/g, '-')}`
                                : `/market/${(subItem as any).id}`
                            }
                            onClick={(e) => {
                              e.preventDefault();
                              if ((subItem as any).badge || (subItem as any).disabled) {
                                return;
                              }

                              if ((subItem as any).asset) {
                                onViewAsset?.((subItem as any).asset);
                                setIsOpen(false);
                                return;
                              }

                              onLeagueChange((subItem as any).id);
                              setIsOpen(false);
                            }}
                            className={`
                            w-full flex items-center justify-between px-[clamp(0.5rem,1vw,0.75rem)] py-[clamp(0.25rem,0.5vh,0.4rem)] rounded-lg text-[clamp(0.7rem,0.85vw,0.8rem)] transition-colors
                            ${(subItem as any).badge || (subItem as any).disabled
                                ? "cursor-not-allowed opacity-60 text-gray-400"
                                : (subItem as any).active
                                  ? "bg-[#005430] text-white font-medium shadow-lg shadow-[#005430]/20"
                                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                              }
                          `}
                          >
                            <div className="flex items-center gap-[clamp(0.25rem,0.5vw,0.5rem)]">
                              <span className="whitespace-nowrap">
                                {subItem.label}
                              </span>
                              {(subItem as any).badge && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-800 text-gray-500 rounded border border-gray-700">
                                  {(subItem as any).badge}
                                </span>
                              )}
                            </div>
                          </Link>
                        )}

                        {/* Level 2 Submenu */}
                        {subItem.subItems &&
                          expandedItems.includes(subItem.label) && (
                            <div className="ml-[clamp(0.5rem,1vw,0.75rem)] mt-[clamp(0.125rem,0.2vh,0.25rem)] space-y-[clamp(0.125rem,0.2vh,0.25rem)] border-l border-gray-800 pl-[clamp(0.5rem,1vw,0.75rem)]">
                              {subItem.subItems.map((deepItem: any) => (
                                <Link
                                  key={deepItem.label}
                                  to={`/market/${deepItem.id}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if ((deepItem as any).badge) {
                                      return;
                                    }
                                    onLeagueChange(deepItem.id as any);
                                  }}
                                  className={`
                                w-full text-left px-[clamp(0.5rem,1vw,0.75rem)] py-[clamp(0.25rem,0.4vh,0.35rem)] rounded-lg text-[clamp(0.65rem,0.75vw,0.75rem)] transition-colors block
                                ${deepItem.active
                                      ? "bg-[#005430] text-white font-medium shadow-lg shadow-[#005430]/20"
                                      : (deepItem as any).badge
                                        ? "text-gray-600 cursor-not-allowed"
                                        : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                                    }
                              `}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{deepItem.label}</span>
                                    {(deepItem as any).badge && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gray-800 text-gray-600 rounded border border-gray-700">
                                        {(deepItem as any).badge}
                                      </span>
                                    )}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Help Center / How It Works Button - Always at bottom */}
          {!isLoggedIn && onHelpCenterClick && (
            <div className="pt-[clamp(0.25rem,1vh,0.75rem)] mt-auto border-t border-gray-800">
              <button
                onClick={onHelpCenterClick}
                className="w-full flex items-center gap-[clamp(0.5rem,1vw,0.75rem)] px-[clamp(0.5rem,1vw,0.75rem)] py-[clamp(0.35rem,1vh,0.75rem)] rounded-lg text-[clamp(0.75rem,0.9vw,0.85rem)] font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
                data-testid="sidebar-help-center"
              >
                <HelpCircle className="w-[clamp(1rem,1.2vw,1.25rem)] h-[clamp(1rem,1.2vw,1.25rem)]" />
                <span>Help Center</span>
              </button>
            </div>
          )}

          {isLoggedIn && onHowItWorksClick && (
            <div className="pt-[clamp(0.25rem,1vh,0.75rem)] mt-auto border-t border-gray-800">
              <button
                onClick={onHowItWorksClick}
                className="w-full flex items-center justify-center gap-[clamp(0.5rem,1vw,0.75rem)] px-[clamp(0.5rem,1vw,0.75rem)] py-[clamp(0.35rem,1vh,0.75rem)] rounded-lg text-[clamp(0.75rem,0.9vw,0.85rem)] font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
                data-testid="sidebar-how-it-works"
              >
                <span>how it works ?</span>
              </button>
            </div>
          )}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
