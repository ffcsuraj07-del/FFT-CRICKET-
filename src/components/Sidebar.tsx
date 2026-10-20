import React from 'react';
import {
  LayoutDashboard,
  Users,
  Shield,
  Calendar,
  Radio,
  Trophy,
  PlusCircle,
  X,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  hasLiveMatch?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  hasLiveMatch,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'teams', label: 'Teams', icon: Shield },
    { id: 'matches', label: 'Matches', icon: Calendar },
    {
      id: 'scoring',
      label: 'Live Scoring',
      icon: Radio,
      badge: hasLiveMatch ? 'LIVE' : undefined,
      badgeColor: 'bg-red-600 text-white animate-pulse',
    },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Mobile close button */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800 lg:hidden">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Navigation</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Create Match button */}
          <div className="mb-4">
            <button
              onClick={() => handleNavClick('create-match')}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'create-match'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-600 hover:to-green-600 text-white shadow'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Match</span>
            </button>
          </div>

          {/* Nav links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-800/90 text-white font-semibold shadow-sm border border-emerald-600/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info in sidebar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/50">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Office Cricket League</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Automatic career stats calculation from ball-by-ball match data.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
