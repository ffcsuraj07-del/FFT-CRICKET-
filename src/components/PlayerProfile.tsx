import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  User,
  Shield,
  Briefcase,
  Calendar,
  Flame,
  Target,
  Trophy,
  Award,
  Zap,
  Phone,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Player, PlayerStats, PlayerMatchRecord } from '../types/cricket.ts';
import { apiFetch } from '../lib/api.ts';

interface PlayerProfileProps {
  playerId: number;
  onBack: () => void;
  onSelectMatch: (matchId: number) => void;
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({
  playerId,
  onBack,
  onSelectMatch,
}) => {
  const [player, setPlayer] = useState<(Player & { careerStats: PlayerStats; matchHistory: PlayerMatchRecord[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [playerId]);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/api/players/${playerId}`);
      setPlayer(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load player profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 text-sm">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading player profile and career statistics...
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-300">
        <p className="text-red-400 mb-4">{error || 'Player profile not found.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
        >
          Back to Players
        </button>
      </div>
    );
  }

  const { careerStats, matchHistory } = player;
  const batting = careerStats.batting;
  const bowling = careerStats.bowling;
  const fielding = careerStats.fielding;

  return (
    <div className="space-y-6 pb-16">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Squad</span>
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950/70 to-slate-900 border border-emerald-800/60 shadow-xl text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Avatar / Photo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-emerald-700 to-green-500 border-2 border-emerald-400/40 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-emerald-950/50">
              {player.name.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {player.name}
                </h1>
                {player.jerseyNumber && (
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-800 text-emerald-200 font-extrabold text-xs border border-emerald-700">
                    #{player.jerseyNumber}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="font-semibold text-emerald-400">{player.playerType}</span>
                <span>•</span>
                <span>{player.battingStyle}</span>
                <span>•</span>
                <span>{player.bowlingStyle}</span>
              </div>

              {(player.department || player.designation) && (
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {player.designation ? `${player.designation}` : ''}
                    {player.designation && player.department ? ' - ' : ''}
                    {player.department}
                  </span>
                  {player.employeeId && (
                    <span className="text-slate-500">({player.employeeId})</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick summary badges */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">Matches</div>
              <div className="text-xl font-bold text-white mt-0.5">{batting.matches}</div>
            </div>
            <div className="text-center border-x border-slate-800 px-3">
              <div className="text-xs text-slate-400 uppercase font-semibold">Runs</div>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">{batting.runs}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase font-semibold">Wickets</div>
              <div className="text-xl font-bold text-purple-400 mt-0.5">{bowling.wickets}</div>
            </div>
          </div>
        </div>

        {player.bio && (
          <p className="mt-6 pt-4 border-t border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed italic">
            "{player.bio}"
          </p>
        )}
      </div>

      {/* Career Statistics (Requirement #6 & #20) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batting Career Stats */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" /> Career Batting
              </h3>
              <span className="text-xs text-slate-400 font-medium">Accumulated from ball data</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Innings</div>
                <div className="text-lg font-bold text-white mt-0.5">{batting.innings}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Runs</div>
                <div className="text-lg font-extrabold text-emerald-400 mt-0.5">{batting.runs}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Balls</div>
                <div className="text-lg font-bold text-white mt-0.5">{batting.balls}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Highest</div>
                <div className="text-lg font-extrabold text-amber-400 mt-0.5">
                  {batting.highestScore > 0 ? `${batting.highestScore}${batting.highestScoreNotOut ? '*' : ''}` : '-'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Average</div>
                <div className="text-lg font-bold text-white mt-0.5">{batting.average}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Strike Rate</div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">{batting.strikeRate}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">4s / 6s</div>
                <div className="text-lg font-bold text-white mt-0.5">{batting.fours} / {batting.sixes}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">50s / 100s</div>
                <div className="text-lg font-bold text-white mt-0.5">{batting.fifties} / {batting.hundreds}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Not Outs</div>
                <div className="text-lg font-bold text-white mt-0.5">{batting.notOuts}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Dismissals</div>
                <div className="text-lg font-bold text-white mt-0.5">{batting.dismissals}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bowling Career Stats */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" /> Career Bowling
              </h3>
              <span className="text-xs text-slate-400 font-medium">Accumulated from ball data</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Overs</div>
                <div className="text-lg font-bold text-white mt-0.5">{bowling.overs}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Balls</div>
                <div className="text-lg font-bold text-white mt-0.5">{bowling.balls}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Wickets</div>
                <div className="text-lg font-extrabold text-purple-400 mt-0.5">{bowling.wickets}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Runs Conc.</div>
                <div className="text-lg font-bold text-white mt-0.5">{bowling.runsConceded}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Economy</div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">{bowling.economy}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Average</div>
                <div className="text-lg font-bold text-white mt-0.5">{bowling.average}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Strike Rate</div>
                <div className="text-lg font-bold text-white mt-0.5">{bowling.strikeRate}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Best Bowling</div>
                <div className="text-lg font-extrabold text-rose-400 mt-0.5">{bowling.bestBowling}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Maidens</div>
                <div className="text-lg font-bold text-white mt-0.5">{bowling.maidens}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">4W / 5W</div>
                <div className="text-lg font-bold text-white mt-0.5">{bowling.fourWickets} / {bowling.fiveWickets}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fielding Stats */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-emerald-400" /> Career Fielding
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-xs text-slate-400 uppercase font-semibold">Catches</div>
            <div className="text-xl font-bold text-white mt-1">{fielding.catches}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-xs text-slate-400 uppercase font-semibold">Run Outs</div>
            <div className="text-xl font-bold text-white mt-1">{fielding.runOuts}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-xs text-slate-400 uppercase font-semibold">Stumpings</div>
            <div className="text-xl font-bold text-white mt-1">{fielding.stumpings}</div>
          </div>
        </div>
      </div>

      {/* Match History Table (Requirement #19) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" /> Player Match History
          </h3>
          <span className="text-xs text-slate-400">{matchHistory.length} matches recorded</span>
        </div>

        {matchHistory.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
            No match appearances recorded yet for this player.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Match / Opponent</th>
                  <th className="py-3 px-4">Batting</th>
                  <th className="py-3 px-4">Bowling</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {matchHistory.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-medium">
                      {m.date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">vs {m.opponent}</div>
                      <div className="text-[11px] text-slate-400">{m.myTeam} • {m.venue}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {m.batting.batted ? (
                        <div>
                          <span className="font-bold text-emerald-400 text-sm">
                            {m.batting.runs}{m.batting.isNotOut ? '*' : ''}
                          </span>{' '}
                          <span className="text-slate-400">({m.batting.balls} balls)</span>
                          <div className="text-[10px] text-slate-500">
                            4s: {m.batting.fours} • 6s: {m.batting.sixes}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">Did not bat</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {m.bowling.bowled ? (
                        <div>
                          <span className="font-bold text-purple-400 text-sm">
                            {m.bowling.wickets}/{m.bowling.runs}
                          </span>{' '}
                          <span className="text-slate-400">({m.bowling.overs} ov)</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">Did not bowl</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          m.result === 'Won'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : m.result === 'Lost'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {m.result}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectMatch(m.matchId)}
                        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        Scorecard <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
