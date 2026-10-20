import React, { useState } from 'react';
import {
  Calendar,
  Shield,
  Users,
  MapPin,
  Play,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
} from 'lucide-react';
import { Team, Player } from '../types/cricket.ts';
import { apiFetch } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Lock } from 'lucide-react';

interface CreateMatchProps {
  teams: Team[];
  players: Player[];
  onMatchCreated: (matchId: number) => void;
  onCancel: () => void;
  onNavigateLogin?: () => void;
}

export const CreateMatch: React.FC<CreateMatchProps> = ({
  teams,
  players,
  onMatchCreated,
  onCancel,
  onNavigateLogin,
}) => {
  const { isAdmin } = useAuth();
  const [matchType, setMatchType] = useState('T20');
  const [matchFormat, setMatchFormat] = useState('Hard Ball');
  const [totalOvers, setTotalOvers] = useState(20);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [venue, setVenue] = useState('FFC Cricket Ground, Bengaluru');
  const [title, setTitle] = useState('');

  const [team1Id, setTeam1Id] = useState<string>(teams[0]?.id ? String(teams[0].id) : '');
  const [team2Id, setTeam2Id] = useState<string>(teams[1]?.id ? String(teams[1].id) : '');

  const [team1Squad, setTeam1Squad] = useState<number[]>([]);
  const [team2Squad, setTeam2Squad] = useState<number[]>([]);

  const [team1CaptainId, setTeam1CaptainId] = useState<string>('');
  const [team2CaptainId, setTeam2CaptainId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Update squad defaults whenever team selection changes
  React.useEffect(() => {
    if (team1Id) {
      const t1 = teams.find((t) => t.id === Number(team1Id));
      if (t1?.members && t1.members.length > 0) {
        setTeam1Squad(t1.members.map((m) => m.id));
        if (t1.captainId) setTeam1CaptainId(String(t1.captainId));
      } else {
        setTeam1Squad(players.slice(0, 5).map((p) => p.id));
      }
    }
  }, [team1Id, teams, players]);

  React.useEffect(() => {
    if (team2Id) {
      const t2 = teams.find((t) => t.id === Number(team2Id));
      if (t2?.members && t2.members.length > 0) {
        setTeam2Squad(t2.members.map((m) => m.id));
        if (t2.captainId) setTeam2CaptainId(String(t2.captainId));
      } else {
        setTeam2Squad(players.slice(5, 10).map((p) => p.id));
      }
    }
  }, [team2Id, teams, players]);

  const handleMatchTypeChange = (type: string) => {
    setMatchType(type);
    if (type === 'T10') setTotalOvers(10);
    else if (type === 'T20') setTotalOvers(20);
    else if (type === 'T5') setTotalOvers(5);
  };

  const togglePlayerInSquad = (team: 1 | 2, playerId: number) => {
    if (team === 1) {
      if (team1Squad.includes(playerId)) {
        setTeam1Squad(team1Squad.filter((id) => id !== playerId));
      } else {
        setTeam1Squad([...team1Squad, playerId]);
      }
    } else {
      if (team2Squad.includes(playerId)) {
        setTeam2Squad(team2Squad.filter((id) => id !== playerId));
      } else {
        setTeam2Squad([...team2Squad, playerId]);
      }
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!team1Id || !team2Id) {
      setErrorMessage('Please select both Team 1 and Team 2');
      return;
    }

    if (team1Id === team2Id) {
      setErrorMessage('Team 1 and Team 2 must be different teams');
      return;
    }

    if (team1Squad.length < 2 || team2Squad.length < 2) {
      setErrorMessage('Each team must have at least 2 players in the match squad');
      return;
    }

    setLoading(true);

    try {
      const t1 = teams.find((t) => t.id === Number(team1Id));
      const t2 = teams.find((t) => t.id === Number(team2Id));
      const autoTitle = title.trim() || `${t1?.name || 'Team 1'} vs ${t2?.name || 'Team 2'}`;

      const res = await apiFetch('/api/matches', {
        method: 'POST',
        body: JSON.stringify({
          title: autoTitle,
          matchType,
          matchFormat,
          totalOvers: Number(totalOvers),
          venue: venue.trim() || 'FFC Cricket Ground',
          date,
          team1Id: Number(team1Id),
          team2Id: Number(team2Id),
          team1CaptainId: team1CaptainId ? Number(team1CaptainId) : undefined,
          team2CaptainId: team2CaptainId ? Number(team2CaptainId) : undefined,
          team1Squad,
          team2Squad,
        }),
      });

      onMatchCreated(res.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-950/80 border border-amber-800 text-amber-400 mx-auto flex items-center justify-center">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white">Administrator Access Required</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Creating and scheduling matches requires administrator credentials. Public viewers can browse fixtures, full scorecards, and watch live ball-by-ball matches.
        </p>
        <div className="pt-2 flex flex-col gap-2">
          {onNavigateLogin && (
            <button
              onClick={onNavigateLogin}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow"
            >
              Sign In as Administrator
            </button>
          )}
          <button
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
          >
            Return to Matches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Create New Cricket Match
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Configure overs, select playing squads, and prepare for live ball scoring
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-950/80 text-red-300 border border-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleCreateMatch} className="space-y-6">
        {/* Match Settings Card */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" /> Match Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Match Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Match Type
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {['T10', 'T20', 'Custom'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleMatchTypeChange(type)}
                    className={`py-2 px-1 text-xs font-bold rounded-xl transition-colors ${
                      matchType === type
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Overs */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Overs per Innings
              </label>
              <input
                type="number"
                min="1"
                max="50"
                required
                value={totalOvers}
                onChange={(e) => setTotalOvers(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Match Format */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Match Ball / Format
              </label>
              <select
                value={matchFormat}
                onChange={(e) => setMatchFormat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Hard Ball">Hard Ball (Leather)</option>
                <option value="Tennis Ball">Tennis Ball</option>
                <option value="Other">Other / Box Cricket</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Venue */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Venue
              </label>
              <input
                type="text"
                required
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. FFC Turf Ground, Bengaluru"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Teams and Squad Selection Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team 1 Squad */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <h3 className="font-bold text-white text-base">Team 1</h3>
              </div>
              <span className="text-xs font-bold text-emerald-400">
                {team1Squad.length} Players Selected
              </span>
            </div>

            {/* Team 1 Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Team 1</label>
              <select
                value={team1Id}
                onChange={(e) => setTeam1Id(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id} disabled={String(t.id) === team2Id}>
                    {t.name} ({t.shortName})
                  </option>
                ))}
              </select>
            </div>

            {/* Captain 1 */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Match Captain</label>
              <select
                value={team1CaptainId}
                onChange={(e) => setTeam1CaptainId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select Captain...</option>
                {players
                  .filter((p) => team1Squad.includes(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Team 1 Playing Squad */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Playing XI / Match Squad</span>
                <span className="text-[11px] text-slate-500">Toggle squad members</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                {players.map((p) => {
                  const isSelected = team1Squad.includes(p.id);
                  const isOpponent = team2Squad.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isOpponent}
                      onClick={() => togglePlayerInSquad(1, p.id)}
                      className={`p-2 rounded-lg text-left text-xs transition-colors flex items-center justify-between ${
                        isOpponent
                          ? 'opacity-30 cursor-not-allowed bg-slate-900 text-slate-500'
                          : isSelected
                          ? 'bg-emerald-950/80 border border-emerald-700 text-white font-semibold'
                          : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {isSelected && <span className="text-emerald-400 font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Team 2 Squad */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <h3 className="font-bold text-white text-base">Team 2</h3>
              </div>
              <span className="text-xs font-bold text-blue-400">
                {team2Squad.length} Players Selected
              </span>
            </div>

            {/* Team 2 Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Team 2</label>
              <select
                value={team2Id}
                onChange={(e) => setTeam2Id(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id} disabled={String(t.id) === team1Id}>
                    {t.name} ({t.shortName})
                  </option>
                ))}
              </select>
            </div>

            {/* Captain 2 */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Match Captain</label>
              <select
                value={team2CaptainId}
                onChange={(e) => setTeam2CaptainId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select Captain...</option>
                {players
                  .filter((p) => team2Squad.includes(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Team 2 Playing Squad */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Playing XI / Match Squad</span>
                <span className="text-[11px] text-slate-500">Toggle squad members</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                {players.map((p) => {
                  const isSelected = team2Squad.includes(p.id);
                  const isOpponent = team1Squad.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isOpponent}
                      onClick={() => togglePlayerInSquad(2, p.id)}
                      className={`p-2 rounded-lg text-left text-xs transition-colors flex items-center justify-between ${
                        isOpponent
                          ? 'opacity-30 cursor-not-allowed bg-slate-900 text-slate-500'
                          : isSelected
                          ? 'bg-blue-950/80 border border-blue-700 text-white font-semibold'
                          : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {isSelected && <span className="text-blue-400 font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 rounded-xl shadow-lg transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{loading ? 'Creating...' : 'Create & Proceed to Match'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
