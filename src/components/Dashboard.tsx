import React from 'react';
import {
  Users,
  Trophy,
  Flame,
  Target,
  Shield,
  ArrowRight,
  TrendingUp,
  Award,
  Zap,
  Play,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Player, Match } from '../types/cricket.ts';

interface DashboardProps {
  overview: any;
  players: Player[];
  onSelectPlayer: (id: number) => void;
  onSelectMatch: (id: number) => void;
  onStartMatch: () => void;
  onAddPlayer: () => void;
  onOpenScoring: (matchId: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  overview,
  players,
  onSelectPlayer,
  onSelectMatch,
  onStartMatch,
  onAddPlayer,
  onOpenScoring,
}) => {
  const totals = overview?.totals || {
    totalPlayers: 0,
    totalMatches: 0,
    totalRuns: 0,
    totalWickets: 0,
    totalTeams: 0,
  };

  const topRunScorer = overview?.topRunScorer;
  const topWicketTaker = overview?.topWicketTaker;
  const highestScore = overview?.highestIndividualScore;
  const bestBowling = overview?.bestBowling;
  const recentMatches: Match[] = overview?.recentMatches || [];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Welcome & Quick Action Bar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-green-900 to-slate-900 border border-emerald-800/80 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-600/50 text-emerald-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Official FFC Office Cricket Hub</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Welcome to <span className="text-emerald-400">FFC Cricket</span>
            </h1>
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              Track matches, record ball-by-ball deliveries on mobile, and let player career statistics accumulate automatically.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onStartMatch}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 hover:shadow-xl transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>New Match</span>
            </button>
            <button
              onClick={onAddPlayer}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-100 font-semibold text-sm border border-emerald-700/60 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>+ Add Player</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative circles */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-16 w-64 h-64 bg-green-400/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Players */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-emerald-800/60 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Players</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {totals.totalPlayers}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Registered</div>
          </div>
        </div>

        {/* Total Matches */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-emerald-800/60 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Matches</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {totals.totalMatches}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {totals.totalCompletedMatches || 0} completed
            </div>
          </div>
        </div>

        {/* Total Runs */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-emerald-800/60 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Runs</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {Number(totals.totalRuns).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Scored by team</div>
          </div>
        </div>

        {/* Total Wickets */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-emerald-800/60 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Wickets</span>
            <Target className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {totals.totalWickets}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Balls captured</div>
          </div>
        </div>

        {/* Total Teams */}
        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-emerald-800/60 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Teams</span>
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {totals.totalTeams}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Active squads</div>
          </div>
        </div>
      </div>

      {/* Top Performers Spotlight */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Top Run Scorer */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/60 border border-emerald-900/60 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-300" /> Top Run Scorer
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-200">
                Orange Cap
              </span>
            </div>
            {topRunScorer ? (
              <div>
                <div className="text-xl font-extrabold text-white">{topRunScorer.name}</div>
                <div className="text-3xl font-black text-emerald-400 mt-1">
                  {topRunScorer.runs} <span className="text-sm font-semibold text-slate-400">Runs</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span>Avg: <strong className="text-slate-200">{topRunScorer.average}</strong></span>
                  <span>SR: <strong className="text-slate-200">{topRunScorer.strikeRate}</strong></span>
                  <span>Matches: <strong className="text-slate-200">{topRunScorer.matches}</strong></span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-3">No match data recorded yet.</div>
            )}
          </div>
        </div>

        {/* Top Wicket Taker */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-purple-950/60 border border-purple-900/60 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4 text-purple-300" /> Top Wicket Taker
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/80 text-purple-200">
                Purple Cap
              </span>
            </div>
            {topWicketTaker ? (
              <div>
                <div className="text-xl font-extrabold text-white">{topWicketTaker.name}</div>
                <div className="text-3xl font-black text-purple-400 mt-1">
                  {topWicketTaker.wickets} <span className="text-sm font-semibold text-slate-400">Wickets</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span>Eco: <strong className="text-slate-200">{topWicketTaker.economy}</strong></span>
                  <span>Best: <strong className="text-slate-200">{topWicketTaker.bestBowling}</strong></span>
                  <span>Matches: <strong className="text-slate-200">{topWicketTaker.matches}</strong></span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-3">No bowling data recorded yet.</div>
            )}
          </div>
        </div>

        {/* Highest Individual Score */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-amber-950/60 border border-amber-900/60 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-300" /> Highest Score
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-900/80 text-amber-200">
                Record
              </span>
            </div>
            {highestScore && highestScore.score > 0 ? (
              <div>
                <div className="text-xl font-extrabold text-white">{highestScore.name}</div>
                <div className="text-3xl font-black text-amber-400 mt-1">
                  {highestScore.score}{highestScore.isNotOut ? '*' : ''}{' '}
                  <span className="text-sm font-semibold text-slate-400">Runs</span>
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  {highestScore.department || 'FFC Player'}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-3">No scores recorded yet.</div>
            )}
          </div>
        </div>

        {/* Best Bowling Figure */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-rose-950/60 border border-rose-900/60 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-rose-300" /> Best Bowling
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-900/80 text-rose-200">
                Spell
              </span>
            </div>
            {bestBowling && bestBowling.figures ? (
              <div>
                <div className="text-xl font-extrabold text-white">{bestBowling.name}</div>
                <div className="text-3xl font-black text-rose-400 mt-1">
                  {bestBowling.figures}{' '}
                  <span className="text-sm font-semibold text-slate-400">Figures</span>
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  {bestBowling.department || 'FFC Bowler'}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-3">No wickets recorded yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Matches Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Recent Matches</h2>
            <p className="text-xs text-slate-400">Latest scorecards and match results</p>
          </div>
          <button
            onClick={() => onSelectMatch(-1)}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            View All Matches <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentMatches.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
            No matches scheduled or played yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentMatches.map((m) => {
              const inn1 = m.innings?.find((i) => i.inningsNumber === 1);
              const inn2 = m.innings?.find((i) => i.inningsNumber === 2);
              const isLive = m.status === 'live';

              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMatch(m.id)}
                  className="cursor-pointer p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-700/70 hover:shadow-lg transition-all group flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Date & Status */}
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-3 pb-2.5 border-b border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{m.date}</span>
                      </div>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                          isLive
                            ? 'bg-red-600 text-white animate-pulse'
                            : m.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    {/* Teams & Scores */}
                    <div className="space-y-2.5 mb-4">
                      {/* Team 1 */}
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-white text-sm flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span>{m.team1?.name || 'Team 1'}</span>
                        </div>
                        <div className="text-right">
                          {inn1 ? (
                            <span className="font-bold text-white text-sm">
                              {inn1.totalRuns}/{inn1.totalWickets}{' '}
                              <span className="text-xs font-normal text-slate-400">
                                ({Math.floor(inn1.legalBalls / 6)}.{inn1.legalBalls % 6} ov)
                              </span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">-</span>
                          )}
                        </div>
                      </div>

                      {/* Team 2 */}
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-white text-sm flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          <span>{m.team2?.name || 'Team 2'}</span>
                        </div>
                        <div className="text-right">
                          {inn2 ? (
                            <span className="font-bold text-white text-sm">
                              {inn2.totalRuns}/{inn2.totalWickets}{' '}
                              <span className="text-xs font-normal text-slate-400">
                                ({Math.floor(inn2.legalBalls / 6)}.{inn2.legalBalls % 6} ov)
                              </span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Result & Action */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="text-xs font-medium text-emerald-400 line-clamp-1">
                      {m.resultSummary || `${m.matchType} • ${m.venue}`}
                    </div>
                    {isLive ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenScoring(m.id);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-600 text-white hover:bg-red-500 flex items-center gap-1 shadow"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Score Live</span>
                      </button>
                    ) : (
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Featured Player Cards Section (Requirement #26) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Team Squad</h2>
            <p className="text-xs text-slate-400">Player profiles and career statistics</p>
          </div>
          <button
            onClick={() => onSelectPlayer(-1)}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            All Players <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {players.slice(0, 8).map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-800/70 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header: Photo / Avatar + Jersey */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-green-600 flex items-center justify-center text-white font-bold text-lg border border-emerald-400/30 shadow-inner">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">
                        {p.name}
                      </h4>
                      <p className="text-xs text-slate-400">{p.playerType}</p>
                    </div>
                  </div>
                  {p.jerseyNumber && (
                    <span className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 font-extrabold text-xs flex items-center justify-center">
                      #{p.jerseyNumber}
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400 mb-4 line-clamp-1">
                  {p.battingStyle} • {p.bowlingStyle}
                </div>
              </div>

              <button
                onClick={() => onSelectPlayer(p.id)}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-emerald-700/80 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <span>View Full Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
