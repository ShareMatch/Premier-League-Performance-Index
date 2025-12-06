import React, { useState } from 'react';
import { Home, Cloud, Globe, Trophy, Gamepad2, ChevronDown, ChevronRight, Menu, Search, Sparkles } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeLeague: 'EPL' | 'UCL' | 'WC' | 'SPL' | 'F1' | 'NBA' | 'NFL' | 'HOME' | 'AI_ANALYTICS';
  onLeagueChange: (league: 'EPL' | 'UCL' | 'WC' | 'SPL' | 'F1' | 'NBA' | 'NFL' | 'HOME' | 'AI_ANALYTICS') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, activeLeague, onLeagueChange }) => {
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
          label: 'F1',
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
        { label: 'Cricket', badge: 'SOON' },
      ]
    },
    { icon: Gamepad2, label: 'E-Sports', badge: 'SOON' },
    { icon: Cloud, label: 'Climate', badge: 'SOON' },
    { icon: Globe, label: 'Global Events', badge: 'SOON' },
    { icon: Sparkles, label: 'AI Analytics Engine', id: 'AI_ANALYTICS', active: activeLeague === 'AI_ANALYTICS' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-[#0B1221] border-r border-gray-800 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center gap-3">
          <img
            src="/logos/white_icon_on_green.jpeg"
            alt="ShareMatch"
            className="w-8 h-8 rounded object-cover"
          />
          <span className="text-xl font-bold text-white">
            {activeLeague === 'HOME' ? 'ShareMatch' :
              activeLeague === 'EPL' ? 'PL Index' :
                activeLeague === 'SPL' ? 'SPL Index' :
                  activeLeague === 'UCL' ? 'UCL Index' :
                    activeLeague === 'WC' ? 'WC Index' :
                      activeLeague === 'F1' ? 'F1 Index' : 'ShareMatch'}
          </span>
        </div>

        {/* Search Bar */}
        <div className="px-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs focus:outline-none focus:border-[#3AA189] text-gray-300 placeholder-gray-600 transition-colors"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {menuItems.map((item) => (
            <div key={item.label}>
              <button
                onClick={() => item.subItems ? toggleExpand(item.label) : (item.id && onLeagueChange(item.id as any))}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${item.active ? 'bg-[#3AA189]/10 text-[#3AA189]' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}
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
                        onClick={() => subItem.subItems && toggleExpand(subItem.label)}
                        className={`
                          w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                          ${(subItem as any).badge ? 'cursor-not-allowed opacity-60' : 'hover:text-gray-200'}
                          text-gray-400
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
                                  ? 'bg-[#3AA189] text-white font-medium shadow-lg shadow-[#3AA189]/20'
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
