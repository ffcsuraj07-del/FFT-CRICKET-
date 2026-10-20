import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Target,
  Award,
  ArrowUpDown,
  User,
  Medal,
  ChevronRight,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';

interface LeaderboardProps {
  onSelectPlayer: (id: number) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onSelectPlayer }) => {
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling' | 'fielding'>('batting');
  const [data, setData] = useState<{ batting: any[]; bowling: any[]; fielding: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sorting
  const [battingSort, setBattingSort] = useState<'runs' | 'average' | 'strikeRate' | 'highestScore'>('runs');
  const [bowlingSort, setBowlingSort] = useState<'wickets' | 'economy' | 'average'>('wickets');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/leaderboard');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 text-sm">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Calculating statistical leaderboards from match deliveries...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-300">
        <p className="text-red-400 mb-4">{error || 'Failed to load leaderboard.'}</p>
        <button
          onClick={fetchLeaderboard}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  // Sorted batting list
  const sortedBatting = [...data.batting].sort((a, b) => {
    if (battingSort === 'runs') return b.batting.runs - a.batting.runs;
    if (battingSort === 'average') return b.batting.average - a.batting.average;
    if (battingSort === 'strikeRate') return b.batting.strikeRate - a.batting.strikeRate;
    if (battingSort === 'highestScore') return b.batting.highestScore - a.batting.highestScore;
    return 0;
  });

  // Sorted bowling list
  const sortedBowling = [...data.bowling].sort((a, b) => {
    if (bowlingSort === 'wickets') return b.bowling.wickets - a.bowling.wickets;
    if (bowlingSort === 'economy') return a.bowling.economy - b.bowling.economy;
    if (bowlingSort === 'average') return a.bowling.average - b.bowling.average;
    return 0;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Trophy className="w-7 h-7 text-amber-400" />
          <span>Office Cricket Leaderboards</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Automatically calculated statistical rankings across batting, bowling & fielding
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('batting')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'batting'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Flame className="w-4 h-4 text-orange-400" />
          <span>Batting Leaders</span>
        </button>
        <button
          onClick={() => setActiveTab('bowling')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'bowling'
              ? 'bg-purple-700 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Target className="w-4 h-4 text-purple-300" />
          <span>Bowling Leaders</span>
        </button>
        <button
          onClick={() => setActiveTab('fielding')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'fielding'
              ? 'bg-blue-700 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-blue-300" />
          <span>Fielding Leaders</span>
        </button>
      </div>

      {/* BATTING TAB */}
      {activeTab === 'batting' && (
        <div className="space-y-4">
          {/* Quick sorting pills */}
          <div className="flex items-center gap-2 text-xs text-slate-400 overflow-x-auto pb-1">
            <span>Sort by:</span>
            {[
              { id: 'runs', label: 'Runs' },
              { id: 'average', label: 'Average' },
              { id: 'strikeRate', label: 'Strike Rate' },
              { id: 'highestScore', label: 'Highest Score' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setBattingSort(s.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  battingSort === s.id
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4 text-right">Matches</th>
                  <th className="py-3 px-4 text-right">Innings</th>
                  <th className="py-3 px-4 text-right font-bold text-emerald-400">Runs</th>
                  <th className="py-3 px-4 text-right">Highest</th>
                  <th className="py-3 px-4 text-right">Average</th>
                  <th className="py-3 px-4 text-right">Strike Rate</th>
                  <th className="py-3 px-4 text-right">4s / 6s</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {sortedBatting.map((p, idx) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPlayer(p.id)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-bold">
                      {idx === 0 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 inline-flex items-center justify-center text-xs font-black">
                          1
                        </span>
                      ) : idx === 1 ? (
                        <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 inline-flex items-center justify-center text-xs font-black">
                          2
                        </span>
                      ) : idx === 2 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-700 text-white inline-flex items-center justify-center text-xs font-black">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-500 font-semibold">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm hover:text-emerald-300 transition-colors">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {p.playerType} {p.department ? `• ${p.department}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">{p.batting.matches}</td>
                    <td className="py-3 px-4 text-right text-slate-400">{p.batting.innings}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-400 text-base">
                      {p.batting.runs}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-amber-400">
                      {p.batting.highestScore > 0 ? `${p.batting.highestScore}${p.batting.highestScoreNotOut ? '*' : ''}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300 font-medium">
                      {p.batting.average}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300 font-medium">
                      {p.batting.strikeRate}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {p.batting.fours} / {p.batting.sixes}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1">
                        Profile <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BOWLING TAB */}
      {activeTab === 'bowling' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 overflow-x-auto pb-1">
            <span>Sort by:</span>
            {[
              { id: 'wickets', label: 'Wickets' },
              { id: 'economy', label: 'Economy' },
              { id: 'average', label: 'Average' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setBowlingSort(s.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  bowlingSort === s.id
                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4 text-right">Matches</th>
                  <th className="py-3 px-4 text-right">Overs</th>
                  <th className="py-3 px-4 text-right font-bold text-purple-400">Wickets</th>
                  <th className="py-3 px-4 text-right">Runs Conceded</th>
                  <th className="py-3 px-4 text-right">Economy</th>
                  <th className="py-3 px-4 text-right">Average</th>
                  <th className="py-3 px-4 text-right">Best Bowling</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {sortedBowling.map((p, idx) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPlayer(p.id)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-bold">
                      {idx === 0 ? (
                        <span className="w-6 h-6 rounded-full bg-purple-500 text-white inline-flex items-center justify-center text-xs font-black">
                          1
                        </span>
                      ) : (
                        <span className="text-slate-500 font-semibold">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm hover:text-purple-300 transition-colors">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {p.playerType} {p.department ? `• ${p.department}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">{p.bowling.matches}</td>
                    <td className="py-3 px-4 text-right text-slate-400">{p.bowling.overs}</td>
                    <td className="py-3 px-4 text-right font-black text-purple-400 text-base">
                      {p.bowling.wickets}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">{p.bowling.runsConceded}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                      {p.bowling.economy}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">{p.bowling.average}</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-400">
                      {p.bowling.bestBowling}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1">
                        Profile <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FIELDING TAB */}
      {activeTab === 'fielding' && (
        <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4 text-right">Catches</th>
                <th className="py-3 px-4 text-right">Run Outs</th>
                <th className="py-3 px-4 text-right">Stumpings</th>
                <th className="py-3 px-4 text-right font-bold text-blue-400">Total Dismissals</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {data.fielding.map((p, idx) => (
                <tr
                  key={p.id}
                  onClick={() => onSelectPlayer(p.id)}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 text-center font-bold text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-white text-sm">{p.name}</div>
                    <div className="text-[11px] text-slate-400">{p.department}</div>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300 font-medium">
                    {p.fielding.catches}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300 font-medium">
                    {p.fielding.runOuts}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300 font-medium">
                    {p.fielding.stumpings}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-blue-400 text-base">
                    {p.totalDismissals}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-1">
                      Profile <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
