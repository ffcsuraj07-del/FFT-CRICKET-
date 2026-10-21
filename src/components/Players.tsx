import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  ArrowRight,
  Shield,
  Briefcase,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Player } from '../types/cricket.ts';
import { apiFetch } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface PlayersProps {
  players: Player[];
  onSelectPlayer: (id: number) => void;
  onRefreshPlayers: () => void;
}

export const Players: React.FC<PlayersProps> = ({
  players,
  onSelectPlayer,
  onRefreshPlayers,
}) => {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerToDelete, setPlayerToDelete] = useState<{ id: number; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    department: '',
    designation: '',
    jerseyNumber: '',
    battingStyle: 'Right Hand',
    bowlingStyle: 'Right Arm Medium',
    playerType: 'All-Rounder',
    phone: '',
    joiningDate: '',
    bio: '',
    photoUrl: '',
  });

  const roles = ['All', 'Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'];

  const filteredPlayers = players.filter((p) => {
    const matchesRole = selectedRole === 'All' || p.playerType === selectedRole;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.department && p.department.toLowerCase().includes(search.toLowerCase())) ||
      (p.employeeId && p.employeeId.toLowerCase().includes(search.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const openCreateModal = () => {
    if (!isAdmin) return;
    setEditingPlayer(null);
    setFormData({
      name: '',
      employeeId: '',
      department: '',
      designation: '',
      jerseyNumber: '',
      battingStyle: 'Right Hand',
      bowlingStyle: 'Right Arm Medium',
      playerType: 'All-Rounder',
      phone: '',
      joiningDate: '',
      bio: '',
      photoUrl: '',
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Player, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPlayer(p);
    setFormData({
      name: p.name,
      employeeId: p.employeeId || '',
      department: p.department || '',
      designation: p.designation || '',
      jerseyNumber: p.jerseyNumber ? String(p.jerseyNumber) : '',
      battingStyle: p.battingStyle || 'Right Hand',
      bowlingStyle: p.bowlingStyle || 'Right Arm Medium',
      playerType: p.playerType || 'All-Rounder',
      phone: p.phone || '',
      joiningDate: p.joiningDate || '',
      bio: p.bio || '',
      photoUrl: p.photoUrl || '',
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const confirmDeletePlayer = async () => {
    if (!isAdmin || !playerToDelete) return;
    setLoading(true);
    try {
      await apiFetch(`/api/players/${playerToDelete.id}`, { method: 'DELETE' });
      setPlayerToDelete(null);
      onRefreshPlayers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete player');
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMessage('Admin privileges required to save player.');
      return;
    }
    if (!formData.name.trim()) {
      setErrorMessage('Full Name is required');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const payload = {
        name: formData.name.trim(),
        employeeId: formData.employeeId.trim() || undefined,
        department: formData.department.trim() || undefined,
        designation: formData.designation.trim() || undefined,
        jerseyNumber: formData.jerseyNumber ? Number(formData.jerseyNumber) : undefined,
        battingStyle: formData.battingStyle,
        bowlingStyle: formData.bowlingStyle,
        playerType: formData.playerType,
        phone: formData.phone.trim() || undefined,
        joiningDate: formData.joiningDate.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        photoUrl: formData.photoUrl.trim() || undefined,
      };

      if (editingPlayer) {
        await apiFetch(`/api/players/${editingPlayer.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/players', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      onRefreshPlayers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save player');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Player Squad ({players.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage official office cricket profiles and squad rosters
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Player</span>
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by player name, department, employee ID..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedRole === r
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Player Grid */}
      {filteredPlayers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
          No players match your search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlayers.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectPlayer(p.id)}
              className="group cursor-pointer p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-700/70 hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-green-600 flex items-center justify-center text-white font-extrabold text-lg border border-emerald-400/30 shadow-inner">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="font-semibold text-emerald-400">{p.playerType}</span>
                        {p.employeeId && <span>• {p.employeeId}</span>}
                      </div>
                    </div>
                  </div>
                  {p.jerseyNumber && (
                    <span className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 font-extrabold text-xs flex items-center justify-center">
                      #{p.jerseyNumber}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1.5 mb-4 text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Batting:</span>
                    <span className="font-medium text-slate-200">{p.battingStyle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Bowling:</span>
                    <span className="font-medium text-slate-200">{p.bowlingStyle}</span>
                  </div>
                  {p.department && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Dept:</span>
                      <span className="font-medium text-slate-200">{p.department}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1">
                  View Career Stats <ArrowRight className="w-3.5 h-3.5" />
                </span>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => openEditModal(p, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit player"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayerToDelete({ id: p.id, name: p.name });
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="Delete player"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {playerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 rounded-xl bg-red-950/80 border border-red-800/80">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Delete Player</h4>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-white">{playerToDelete.name}</span> from the database?
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={confirmDeletePlayer}
                disabled={loading}
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
              >
                {loading ? 'Deleting...' : 'Delete Player'}
              </button>
              <button
                onClick={() => setPlayerToDelete(null)}
                disabled={loading}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Player Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-900/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingPlayer ? 'Edit Player Profile' : 'Add New FFC Player'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Register an office team member for matches & career tracking
                  </p>
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Suraj Kumar"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Employee ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="e.g. FFC-101"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Jersey Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jersey Number
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={formData.jerseyNumber}
                    onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                    placeholder="e.g. 18"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Technical Support / Engineering"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Lead Software Engineer"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Player Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Player Type
                  </label>
                  <select
                    value={formData.playerType}
                    onChange={(e) => setFormData({ ...formData, playerType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Wicket Keeper">Wicket Keeper</option>
                  </select>
                </div>

                {/* Batting Style */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Batting Style
                  </label>
                  <select
                    value={formData.battingStyle}
                    onChange={(e) => setFormData({ ...formData, battingStyle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Right Hand">Right Hand</option>
                    <option value="Left Hand">Left Hand</option>
                  </select>
                </div>

                {/* Bowling Style */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bowling Style
                  </label>
                  <select
                    value={formData.bowlingStyle}
                    onChange={(e) => setFormData({ ...formData, bowlingStyle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Right Arm Fast">Right Arm Fast</option>
                    <option value="Right Arm Medium">Right Arm Medium</option>
                    <option value="Right Arm Spin">Right Arm Spin</option>
                    <option value="Left Arm Fast">Left Arm Fast</option>
                    <option value="Left Arm Medium">Left Arm Medium</option>
                    <option value="Left Arm Spin">Left Arm Spin</option>
                    <option value="None">None</option>
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Joining Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Joining Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Short Bio */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Short Bio (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Brief notes about playing style, strengths, or achievements..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
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
                  {loading ? 'Saving...' : editingPlayer ? 'Update Player' : 'Register Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
