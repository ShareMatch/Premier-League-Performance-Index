{ label: 'F1', badge: 'SOON' },
      ]
    },
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
        <div className="w-8 h-8 bg-[#3AA189] rounded flex items-center justify-center">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <span className="text-xl font-bold text-white">PL Index</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        {menuItems.map((item) => (
          <div key={item.label}>
            <button
              onClick={() => item.subItems && toggleExpand(item.label)}
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
                          ${subItem.badge ? 'cursor-not-allowed opacity-60' : 'hover:text-gray-200'}
                          text-gray-400
                        `}
                    >
                      <div className="flex items-center gap-2">
                        <span>{subItem.label}</span>
                        {subItem.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-800 text-gray-500 rounded border border-gray-700">
                            {subItem.badge}
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
                            disabled={!!deepItem.badge}
                            className={`
                                w-full text-left px-3 py-2 rounded-lg text-xs transition-colors block
                                ${deepItem.active
                                ? 'bg-[#3AA189] text-white font-medium shadow-lg shadow-[#3AA189]/20'
                                : deepItem.badge
                                  ? 'text-gray-600 cursor-not-allowed'
                                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                              }
                              `}
                          >
                            <div className="flex items-center justify-between">
                              <span>{deepItem.label}</span>
                              {deepItem.badge && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gray-800 text-gray-600 rounded border border-gray-700">
                                  {deepItem.badge}
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
