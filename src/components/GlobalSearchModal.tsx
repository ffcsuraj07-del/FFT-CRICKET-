import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Shield, Calendar, ArrowRight } from 'lucide-react';
import { Player, Team, Match } from '../types/cricket.ts';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  teams: Team[];
  matches: Match[];
  onSelectPlayer: (id: number) => void;
  onSelectTeam: (id: number) => void;
  onSelectMatch: (id: number) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  players,
  teams,
  matches,
  onSelectPlayer,
  onSelectTeam,
  onSelectMatch,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchedPlayers = q
    ? players.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.department && p.department.toLowerCase().includes(q)) ||
          (p.employeeId && p.employeeId.toLowerCase().includes(q)) ||
          p.playerType.toLowerCase().includes(q)
      )
    : [];

  const matchedTeams = q
    ? teams.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.shortName && t.shortName.toLowerCase().includes(q))
      )
    : [];

  const matchedMatches = q
    ? matches.filter(
        (m) =>
          (m.title && m.title.toLowerCase().includes(q)) ||
          (m.venue && m.venue.toLowerCase().includes(q)) ||
          (m.team1 && m.team1.name.toLowerCase().includes(q)) ||
          (m.team2 && m.team2.name.toLowerCase().includes(q))
      )
    : [];

  const totalResults = matchedPlayers.length + matchedTeams.length + matchedMatches.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="relative p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players, teams, or matches..."
            className="w-full bg-transparent text-white placeholder-slate-400 text-base focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-semibold bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-4 space-y-4">
          {!q ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              Type a name, team, department, or venue to find records.
            </div>
          ) : totalResults === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No results found for "<span className="text-white font-medium">{query}</span>"
            </div>
          ) : (
            <>
              {/* Players */}
              {matchedPlayers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Players ({matchedPlayers.length})
                  </h4>
                  <div className="space-y-1">
                    {matchedPlayers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectPlayer(p.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800 text-left transition-colors group"
                      >
                        <div>
                          <div className="font-semibold text-white group-hover:text-emerald-300 text-sm">
                            {p.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {p.playerType} {p.department ? `• ${p.department}` : ''} {p.jerseyNumber ? `• #${p.jerseyNumber}` : ''}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Teams */}
              {matchedTeams.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Teams ({matchedTeams.length})
                  </h4>
                  <div className="space-y-1">
                    {matchedTeams.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onSelectTeam(t.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800 text-left transition-colors group"
                      >
                        <div>
                          <div className="font-semibold text-white group-hover:text-blue-300 text-sm">
                            {t.name} ({t.shortName})
                          </div>
                          <div className="text-xs text-slate-400">
                            {t.memberCount || 0} players registered
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matches */}
              {matchedMatches.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Matches ({matchedMatches.length})
                  </h4>
                  <div className="space-y-1">
                    {matchedMatches.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          onSelectMatch(m.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800 text-left transition-colors group"
                      >
                        <div>
                          <div className="font-semibold text-white group-hover:text-amber-300 text-sm">
                            {m.title || `${m.team1?.name} vs ${m.team2?.name}`}
                          </div>
                          <div className="text-xs text-slate-400">
                            {m.date} • {m.venue} • <span className="capitalize">{m.status}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
