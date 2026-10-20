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
  Lock,
  LogOut,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

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
  const { isAdmin, adminUser, user, logOut } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'teams', label: 'Teams', icon: Shield },
    { id: 'matches', label: 'Matches', icon: Calendar },
    {
      id: 'scoring',
      label: isAdmin ? 'Live Scoring' : 'Live Match View',
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

          {/* Quick Create Match button — ADMIN ONLY */}
          {isAdmin && (
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
          )}

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
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
          {isAdmin ? (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-white truncate">
                    {adminUser?.displayName || adminUser?.email || 'Admin'}
                  </div>
                  <div className="text-[10px] text-emerald-300">Admin Mode Active</div>
                </div>
              </div>
              <button
                onClick={async () => {
                  await logOut();
                  setActiveTab('dashboard');
                }}
                className="p-1 text-slate-400 hover:text-red-400 rounded-md"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs font-semibold">
                <Eye className="w-3.5 h-3.5" />
                <span>Public Viewer Mode</span>
              </div>
              <button
                onClick={() => handleNavClick('admin-login')}
                className="w-full py-1.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition-colors"
              >
                <Lock className="w-3 h-3 text-amber-300" />
                <span>Admin Login</span>
              </button>
            </div>
          )}

          <div className="text-[11px] text-slate-500 text-center">
            FFC Cricket • Future Face Cricket
          </div>
        </div>
      </aside>
    </>
  );
};
