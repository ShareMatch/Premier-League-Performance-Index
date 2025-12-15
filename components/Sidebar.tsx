import { League, Team } from '../types';
import React, { useState, useEffect, useRef } from 'react';
import { Home, Cloud, Globe, Trophy, Gamepad2, ChevronDown, ChevronRight, Menu, Sparkles } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeLeague: League;
  onLeagueChange: (league: League) => void;
  allAssets: Team[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, activeLeague, onLeagueChange, allAssets }) => {
  const [expandedItems, setExpandedItems] = useState<string[]>(['Sports', 'Football']);

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };



  const menuItems = [
    { icon: Home, label: 'Home', id: 'HOME', active: activeLeague === 'HOME' },
    {
      icon: Trophy,
      label: 'Sports',
      subItems: [
        {
          label: 'Football',
          subItems: [
            { label: 'England Premier League', id: 'EPL', active: activeLeague === 'EPL' },
            { label: 'Saudi Pro League', id: 'SPL', active: activeLeague === 'SPL' },
            { label: 'UEFA Champions League', id: 'UCL', active: activeLeague === 'UCL' },
            { label: 'FIFA World Cup', id: 'WC', active: activeLeague === 'WC' },
          ]
        },
        {
          label: 'Motorsport',
          subItems: [
            { label: 'Formula 1', id: 'F1', active: activeLeague === 'F1' }
          ]
        },
        {
          label: 'Basketball',
          subItems: [
            { label: 'NBA', id: 'NBA', active: activeLeague === 'NBA' }
          ]
        },
        {
          label: 'American Football',
          subItems: [
            { label: 'NFL', id: 'NFL', active: activeLeague === 'NFL' }
          ]
        },
        { label: 'Golf', badge: 'SOON' },
        {
          label: 'Cricket',
          subItems: [
            { label: 'T20 World Cup', id: 'T20', active: activeLeague === 'T20' }
          ]
        },
      ]
    },
    { icon: Gamepad2, label: 'E-Sports', badge: 'SOON' },

    {
      icon: Globe,
      label: 'Global Events',
      subItems: [
        { label: 'Eurovision', id: 'Eurovision', active: activeLeague === 'Eurovision' }
      ]
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {/* Overlay for mobile/tablet (below xl/1280px) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 xl:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Hidden below xl (1280px), visible on desktop */}
      <div className={`
        fixed xl:static inset-y-0 left-0 z-50
        w-64 xl:w-[clamp(12rem,18vw,16rem)] bg-[#0B1221] border-r border-gray-800 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
      `}>
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 mt-4">
          {menuItems.map((item) => (
            <div key={item.label}>
              <button
                onClick={() => item.subItems ? toggleExpand(item.label) : (item.id && onLeagueChange(item.id as any))}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${item.id === 'AI_ANALYTICS'
                    ? (item.active
                      ? 'bg-[#005430] text-white shadow-lg shadow-[#005430]/20 font-bold'
                      : 'text-white bg-[#005430] hover:bg-[#005430]/90 font-bold shadow-lg shadow-[#005430]/20')
                    : (item.active
                      ? 'bg-brand-emerald500/10 text-brand-emerald500'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200')
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-800 text-gray-500 rounded border border-gray-700">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.subItems && (
                  expandedItems.includes(item.label)
                    ? <ChevronDown className="w-4 h-4" />
                    : <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Level 1 Submenu */}
              {item.subItems && expandedItems.includes(item.label) && (
                <div className="ml-9 mt-1 space-y-1 border-l border-gray-800 pl-3">
                  {item.subItems.map((subItem) => (
                    <div key={subItem.label}>
                      <button
                        onClick={() => subItem.subItems ? toggleExpand(subItem.label) : (subItem.id && onLeagueChange(subItem.id as any))}
                        className={`
                          w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                          ${(subItem as any).badge
                            ? 'cursor-not-allowed opacity-60 text-gray-400'
                            : subItem.active
                              ? 'bg-brand-emerald500/10 text-brand-emerald500'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <span>{subItem.label}</span>
                          {(subItem as any).badge && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-800 text-gray-500 rounded border border-gray-700">
                              {(subItem as any).badge}
                            </span>
                          )}
                        </div>
                        {subItem.subItems && (
                          expandedItems.includes(subItem.label)
                            ? <ChevronDown className="w-3 h-3" />
                            : <ChevronRight className="w-3 h-3" />
                        )}
                      </button>

                      {/* Level 2 Submenu */}
                      {subItem.subItems && expandedItems.includes(subItem.label) && (
                        <div className="ml-3 mt-1 space-y-1 border-l border-gray-800 pl-3">
                          {subItem.subItems.map((deepItem) => (
                            <button
                              key={deepItem.label}
                              onClick={() => deepItem.id && onLeagueChange(deepItem.id as any)}
                              disabled={!!(deepItem as any).badge}
                              className={`
                                w-full text-left px-3 py-2 rounded-lg text-xs transition-colors block
                                ${deepItem.active
                                  ? 'bg-[#005430] text-white font-medium shadow-lg shadow-[#005430]/20'
                                  : (deepItem as any).badge
                                    ? 'text-gray-600 cursor-not-allowed'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
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
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
