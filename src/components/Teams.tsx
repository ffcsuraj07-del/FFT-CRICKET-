import React, { useState } from 'react';
import {
  Shield,
  Plus,
  Users,
  Trophy,
  Award,
  ChevronRight,
  Flame,
  Target,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Team, Player } from '../types/cricket.ts';
import { apiFetch } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface TeamsProps {
  teams: Team[];
  players: Player[];
  onRefreshTeams: () => void;
  onSelectPlayer: (id: number) => void;
}

export const Teams: React.FC<TeamsProps> = ({
  teams,
  players,
  onRefreshTeams,
  onSelectPlayer,
}) => {
  const { isAdmin } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [color, setColor] = useState('#15803d');
  const [captainId, setCaptainId] = useState<string>('');
  const [viceCaptainId, setViceCaptainId] = useState<string>('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);

  const colors = [
    { label: 'FFC Green', value: '#15803d' },
    { label: 'Ocean Blue', value: '#0369a1' },
    { label: 'Royal Purple', value: '#7e22ce' },
    { label: 'Crimson Red', value: '#b91c1c' },
    { label: 'Amber Gold', value: '#b45309' },
    { label: 'Slate Gray', value: '#334155' },
  ];

  const openCreateModal = () => {
    if (!isAdmin) return;
    setName('');
    setShortName('');
    setColor('#15803d');
    setCaptainId('');
    setViceCaptainId('');
    setSelectedPlayerIds([]);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const togglePlayerSelect = (pId: number) => {
    if (selectedPlayerIds.includes(pId)) {
      setSelectedPlayerIds(selectedPlayerIds.filter((id) => id !== pId));
      if (Number(captainId) === pId) setCaptainId('');
      if (Number(viceCaptainId) === pId) setViceCaptainId('');
    } else {
      setSelectedPlayerIds([...selectedPlayerIds, pId]);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMessage('Administrator privileges required to create team.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Team Name is required');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      await apiFetch('/api/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          shortName: shortName.trim() || undefined,
          color,
          captainId: captainId ? Number(captainId) : undefined,
          viceCaptainId: viceCaptainId ? Number(viceCaptainId) : undefined,
          playerIds: selectedPlayerIds,
        }),
      });

      setIsModalOpen(false);
      onRefreshTeams();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Teams & Rosters ({teams.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Create squads, assign captains, and view match head-to-head records
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Team</span>
          </button>
        )}
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.map((t) => {
          const winRate =
            t.matchesPlayed && t.matchesPlayed > 0
              ? Math.round(((t.wins || 0) / t.matchesPlayed) * 100)
              : 0;

          return (
            <div
              key={t.id}
              className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-xl flex flex-col justify-between"
            >
              <div>
                {/* Team Top Card */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-800 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg border border-white/20"
                      style={{ backgroundColor: t.color || '#15803d' }}
                    >
                      {t.shortName || t.name.substring(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-lg">{t.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-semibold text-slate-300">
                          {t.shortName || 'FFC'}
                        </span>
                        <span>•</span>
                        <span>{t.members?.length || t.memberCount || 0} players</span>
                      </div>
                    </div>
                  </div>

                  {t.isDemo && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                      Demo Squad
                    </span>
                  )}
                </div>

                {/* Captain & Vice Captain */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-400" /> Captain
                    </div>
                    <div className="font-bold text-white text-sm mt-1 truncate">
                      {t.captain?.name || 'Not assigned'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-blue-400" /> Vice Captain
                    </div>
                    <div className="font-bold text-white text-sm mt-1 truncate">
                      {t.viceCaptain?.name || 'Not assigned'}
                    </div>
                  </div>
                </div>

                {/* Team Record KPIs */}
                <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-2xl bg-slate-950/80 border border-slate-800 mb-5">
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-semibold">Played</div>
                    <div className="text-base font-bold text-white mt-0.5">{t.matchesPlayed || 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-emerald-400 font-semibold">Won</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">{t.wins || 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-rose-400 font-semibold">Lost</div>
                    <div className="text-base font-bold text-rose-400 mt-0.5">{t.losses || 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-semibold">Win %</div>
                    <div className="text-base font-bold text-amber-400 mt-0.5">{winRate}%</div>
                  </div>
                </div>

                {/* Squad Members Pills */}
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" /> Squad Members ({t.members?.length || 0})
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {t.members && t.members.length > 0 ? (
                      t.members.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => onSelectPlayer(m.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-slate-700/60 transition-colors flex items-center gap-1"
                        >
                          <span>{m.name}</span>
                          {m.id === t.captainId && (
                            <span className="text-[9px] font-bold text-amber-400">(C)</span>
                          )}
                          {m.id === t.viceCaptainId && (
                            <span className="text-[9px] font-bold text-blue-400">(VC)</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">No players assigned yet.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Team Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-900/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Create New Team</h3>
                  <p className="text-xs text-slate-400">Assemble an office squad with captain & players</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded-md hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl mb-4 text-xs flex items-center gap-2 bg-red-950/80 text-red-300 border border-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Team Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Team Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. FFC Warriors / FFC Avengers"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Short Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Short Name (Badge)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value.toUpperCase())}
                    placeholder="e.g. WAR / STR"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 uppercase"
                  />
                </div>

                {/* Color theme */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Team Jersey Color
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {colors.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setColor(c.value)}
                        className={`w-7 h-7 rounded-lg border transition-transform ${
                          color === c.value ? 'scale-110 border-white ring-2 ring-emerald-500' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Select squad members */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Assign Squad Players ({selectedPlayerIds.length} selected)</span>
                  <span className="text-[11px] text-slate-500 font-normal">Click to toggle</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                  {players.map((p) => {
                    const isSelected = selectedPlayerIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePlayerSelect(p.id)}
                        className={`p-2 rounded-lg text-left text-xs transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-950/80 border border-emerald-700 text-white font-semibold'
                            : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Captain & Vice Captain (from selected players) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Team Captain
                  </label>
                  <select
                    value={captainId}
                    onChange={(e) => setCaptainId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Captain...</option>
                    {players
                      .filter((p) => selectedPlayerIds.length === 0 || selectedPlayerIds.includes(p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (#{p.jerseyNumber || '-'})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Vice Captain
                  </label>
                  <select
                    value={viceCaptainId}
                    onChange={(e) => setViceCaptainId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Vice Captain...</option>
                    {players
                      .filter(
                        (p) =>
                          (selectedPlayerIds.length === 0 || selectedPlayerIds.includes(p.id)) &&
                          p.id !== Number(captainId)
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (#{p.jerseyNumber || '-'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl shadow transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
