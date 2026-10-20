import React from 'react';
import {
  Trophy,
  Search,
  PlusCircle,
  Play,
  LogIn,
  LogOut,
  User as UserIcon,
  Database,
  Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openSearch: () => void;
  openSettings: () => void;
  openCreateMatch: () => void;
  hasLiveMatch?: boolean;
  onLiveMatchClick?: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  setActiveTab,
  openSearch,
  openSettings,
  openCreateMatch,
  hasLiveMatch,
  onLiveMatchClick,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const { user, signIn, logOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-emerald-950 border-b border-emerald-800/80 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900 focus:outline-none"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center text-white shadow-inner font-bold text-xl tracking-wider border border-emerald-400/30 group-hover:scale-105 transition-transform">
                <Trophy className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                    FFC Cricket
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-800 text-emerald-200 border border-emerald-700">
                    Office Team
                  </span>
                </div>
                <span className="text-xs text-emerald-400 font-medium">Future Face Cricket</span>
              </div>
            </button>
          </div>

          {/* Quick Actions & Live Indicator */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live match alert banner if any match is currently in progress */}
            {hasLiveMatch && (
              <button
                onClick={onLiveMatchClick}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 hover:bg-red-600 text-white text-xs font-semibold animate-pulse shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Live Match in Progress</span>
              </button>
            )}

            {/* Global Search Button */}
            <button
              onClick={openSearch}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 hover:text-white border border-emerald-800 text-sm font-medium transition-colors"
              title="Search players, teams, matches"
            >
              <Search className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Search...</span>
            </button>

            {/* Quick Match Creator */}
            <button
              onClick={openCreateMatch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-sm transition-all hover:shadow"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">New Match</span>
            </button>

            {/* Demo & Data Settings */}
            <button
              onClick={openSettings}
              className="p-2 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900 border border-emerald-800/60 transition-colors"
              title="Demo Data & System Settings"
            >
              <Database className="w-4 h-4" />
            </button>

            {/* Auth Button */}
            {user ? (
              <div className="flex items-center gap-2 pl-1 border-l border-emerald-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Admin'}
                    className="w-8 h-8 rounded-full border border-emerald-400 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center text-xs font-bold text-emerald-200 border border-emerald-700">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <button
                  onClick={logOut}
                  className="p-1.5 text-emerald-300 hover:text-red-300 hover:bg-emerald-900 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={signIn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 text-xs font-semibold border border-emerald-700 transition-colors"
                title="Google Sign-In for Admin controls"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
