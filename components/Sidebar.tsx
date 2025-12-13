import { League, Team } from '../types';
import React, { useState, useEffect, useRef } from 'react';
import { Home, Cloud, Globe, Trophy, Gamepad2, ChevronDown, ChevronRight, Menu, Search, Sparkles, Mic, X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeLeague: League;
  onLeagueChange: (league: League) => void;
  allAssets: Team[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, activeLeague, onLeagueChange, allAssets }) => {
  const [expandedItems, setExpandedItems] = useState<string[]>(['Sports', 'Football']);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Team[]>([]);
  const [isListening, setIsListening] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  // Search Logic
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = allAssets.filter(asset =>
      asset.name.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to 10 results

    setSearchResults(results);
  }, [searchQuery, allAssets]);

  const handleSearchResultClick = (asset: Team) => {
    if (asset.market) {
      onLeagueChange(asset.market as League);
      setSearchQuery('');
      setSearchResults([]);
      setIsOpen(false); // Close mobile menu if open
    }
  };

  // Voice Search Logic
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice search is not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    };

    recognition.start();
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
    { icon: Sparkles, label: 'AI Analytics Engine', id: 'AI_ANALYTICS', active: activeLeague === 'AI_ANALYTICS', className: 'text-brand-emerald500 font-bold bg-brand-emerald500/10' },
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
        w-[clamp(12rem,18vw,16rem)] bg-[#0B1221] border-r border-gray-800 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center gap-3">
          <img
            src="/logo-wordmark-green.svg"
            alt="ShareMatch"
            className="w-full h-auto rounded-lg shadow-lg shadow-brand/10"
          />
        </div>

        {/* Search Bar */}
        <div className="px-4 mb-4 relative z-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isListening ? "Listening..." : "Search..."}
              className={`w-full pl-9 pr-8 py-2 bg-gray-900 border ${isListening ? 'border-brand-emerald500 animate-pulse' : 'border-gray-800'} rounded-lg text-xs focus:outline-none focus:border-[#005430] text-gray-300 placeholder-gray-600 transition-colors`}
            />

            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={startListening}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${isListening ? 'text-brand-emerald500' : 'text-gray-400 hover:text-white'}`}
              >
                <Mic className="h-4 w-4" />
              </button>
            )}

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar z-50">
                {searchResults.map(asset => (
                  <button
                    key={asset.id}
                    onClick={() => handleSearchResultClick(asset)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-800 border-b border-gray-800 last:border-0 transition-colors flex items-center justify-between group"
                  >
                    <span className="text-sm text-gray-200 group-hover:text-white font-medium truncate">{asset.name}</span>
                    {asset.market && (
                      <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 group-hover:border-gray-600">
                        {asset.market}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {/* No Results State */}
            {searchQuery.length > 1 && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 text-center z-50">
                <p className="text-xs text-gray-500">No results found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
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
