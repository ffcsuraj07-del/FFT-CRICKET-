import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { Players } from './components/Players.tsx';
import { PlayerProfile } from './components/PlayerProfile.tsx';
import { Teams } from './components/Teams.tsx';
import { CreateMatch } from './components/CreateMatch.tsx';
import { LiveScoring } from './components/LiveScoring.tsx';
import { Matches } from './components/Matches.tsx';
import { Leaderboard } from './components/Leaderboard.tsx';
import { GlobalSearchModal } from './components/GlobalSearchModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { Player, Team, Match } from './types/cricket.ts';
import { apiFetch } from './lib/api.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

  // App data state
  const [overview, setOverview] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // UI Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [ovData, plData, tmData, mtData] = await Promise.all([
        apiFetch('/api/dashboard'),
        apiFetch('/api/players'),
        apiFetch('/api/teams'),
        apiFetch('/api/matches'),
      ]);
      setOverview(ovData);
      setPlayers(plData);
      setTeams(tmData);
      setMatches(mtData);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Find if there is an active live match
  const liveMatch = matches.find((m) => m.status === 'live');

  // Navigation handlers
  const handleSelectPlayer = (id: number) => {
    if (id === -1) {
      setActiveTab('players');
    } else {
      setSelectedPlayerId(id);
      setActiveTab('player-profile');
    }
  };

  const handleSelectMatch = (id: number) => {
    if (id === -1) {
      setActiveTab('matches');
    } else {
      setSelectedMatchId(id);
      setActiveTab('matches');
    }
  };

  const handleOpenScoring = (matchId: number) => {
    setSelectedMatchId(matchId);
    setActiveTab('scoring');
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
        {/* Top Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'scoring' && !selectedMatchId) {
              const liveOrUpcoming = matches.find((m) => m.status === 'live') || matches[0];
              if (liveOrUpcoming) setSelectedMatchId(liveOrUpcoming.id);
            }
          }}
          openSearch={() => setIsSearchOpen(true)}
          openSettings={() => setIsSettingsOpen(true)}
          openCreateMatch={() => setActiveTab('create-match')}
          hasLiveMatch={!!liveMatch}
          onLiveMatchClick={() => liveMatch && handleOpenScoring(liveMatch.id)}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <div className="flex flex-1">
          {/* Sidebar */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              if (tab === 'scoring' && !selectedMatchId) {
                const liveOrUpcoming = matches.find((m) => m.status === 'live') || matches[0];
                if (liveOrUpcoming) setSelectedMatchId(liveOrUpcoming.id);
              }
            }}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            hasLiveMatch={!!liveMatch}
          />

          {/* Main Content Area */}
          <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {loading && !overview ? (
              <div className="py-32 text-center text-slate-400">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm font-medium">Initializing FFC Cricket Engine & Cloud SQL...</p>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <Dashboard
                    overview={overview}
                    players={players}
                    onSelectPlayer={handleSelectPlayer}
                    onSelectMatch={handleSelectMatch}
                    onStartMatch={() => setActiveTab('create-match')}
                    onAddPlayer={() => setActiveTab('players')}
                    onOpenScoring={handleOpenScoring}
                  />
                )}

                {activeTab === 'players' && (
                  <Players
                    players={players}
                    onSelectPlayer={handleSelectPlayer}
                    onRefreshPlayers={fetchAllData}
                  />
                )}

                {activeTab === 'player-profile' && selectedPlayerId && (
                  <PlayerProfile
                    playerId={selectedPlayerId}
                    onBack={() => setActiveTab('players')}
                    onSelectMatch={handleSelectMatch}
                  />
                )}

                {activeTab === 'teams' && (
                  <Teams
                    teams={teams}
                    players={players}
                    onRefreshTeams={fetchAllData}
                    onSelectPlayer={handleSelectPlayer}
                  />
                )}

                {activeTab === 'create-match' && (
                  <CreateMatch
                    teams={teams}
                    players={players}
                    onMatchCreated={(newMatchId) => {
                      fetchAllData();
                      handleOpenScoring(newMatchId);
                    }}
                    onCancel={() => setActiveTab('matches')}
                  />
                )}

                {activeTab === 'scoring' && (
                  selectedMatchId ? (
                    <LiveScoring
                      matchId={selectedMatchId}
                      onViewScorecard={(mId) => {
                        setSelectedMatchId(mId);
                        setActiveTab('matches');
                      }}
                      onBackToMatches={() => setActiveTab('matches')}
                    />
                  ) : (
                    <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl">
                      <p className="text-slate-400 text-sm mb-4">No match selected for scoring.</p>
                      <button
                        onClick={() => setActiveTab('matches')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                      >
                        Browse Matches
                      </button>
                    </div>
                  )
                )}

                {activeTab === 'matches' && (
                  <Matches
                    matches={matches}
                    onOpenScoring={handleOpenScoring}
                    onCreateMatch={() => setActiveTab('create-match')}
                  />
                )}

                {activeTab === 'leaderboard' && (
                  <Leaderboard onSelectPlayer={handleSelectPlayer} />
                )}
              </>
            )}
          </main>
        </div>

        {/* Global Search Modal (Requirement #22) */}
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          players={players}
          teams={teams}
          matches={matches}
          onSelectPlayer={handleSelectPlayer}
          onSelectTeam={(tId) => setActiveTab('teams')}
          onSelectMatch={handleSelectMatch}
        />

        {/* Settings Modal (Requirement #32 Demo Data) */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onRefreshData={fetchAllData}
        />
      </div>
    </AuthProvider>
  );
}
