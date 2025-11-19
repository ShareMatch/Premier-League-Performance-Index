import React, { useState } from 'react';
import { 
  Home, 
  Building2, 
  CloudRain, 
  Vote, 
  Trophy, 
  ChevronDown, 
  ChevronRight,
  Activity
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

type NavItem = {
  id: string;
  label: string;
  icon?: React.ElementType;
  comingSoon?: boolean;
  children?: NavItem[];
  active?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'companies', label: 'Companies', icon: Building2, comingSoon: true },
  { id: 'climate', label: 'Climate', icon: CloudRain, comingSoon: true },
  { id: 'politics', label: 'Politics', icon: Vote, comingSoon: true },
  { 
    id: 'sports', 
    label: 'Sports', 
    icon: Trophy,
    children: [
      { 
        id: 'football', 
        label: 'Football',
        children: [
          { id: 'epl', label: 'England Premier League', active: true },
          { id: 'spl', label: 'Saudi Premier League', comingSoon: true },
          { id: 'ucl', label: 'UEFA Champions League', comingSoon: true },
          { id: 'wc', label: 'FIFA World Cup', comingSoon: true },
        ]
      },
      { id: 'golf', label: 'Golf', comingSoon: true },
      { id: 'cricket', label: 'Cricket', comingSoon: true },
      { id: 'f1', label: 'F1', comingSoon: true },
    ]
  },
];

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['sports', 'football']));

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const Icon = item.icon;

    return (
      <div key={item.id} className="w-full">
        <div 
          className={`
            flex items-center justify-between p-3 cursor-pointer transition-colors
            ${item.active ? 'bg-[#3AA189] text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}
            ${item.comingSoon ? 'opacity-50 cursor-not-allowed' : ''}
            ${depth > 0 ? 'pl-' + (depth * 4 + 3) : ''}
          `}
          onClick={() => !item.comingSoon && hasChildren && toggleExpand(item.id)}
          style={{ paddingLeft: `${depth * 1 + 0.75}rem` }}
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon size={20} />}
            <span className="font-medium text-sm">{item.label}</span>
            {item.comingSoon && (
              <span className="text-[10px] uppercase tracking-wider bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                Soon
              </span>
            )}
          </div>
          {hasChildren && !item.comingSoon && (
            <div className="text-gray-500">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="bg-gray-900/50">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-gray-900 border-r border-gray-800 h-screen overflow-y-auto flex-shrink-0 w-64 ${className}`}>
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-2 text-[#3AA189]">
          <Activity size={24} />
          <h1 className="font-bold text-lg tracking-tight text-white">PL Index</h1>
        </div>
      </div>
      <nav className="py-4">
        {NAV_ITEMS.map(item => renderNavItem(item))}
      </nav>
    </div>
  );
};

export default Sidebar;
