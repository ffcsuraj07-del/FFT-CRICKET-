import React, { useState } from 'react';
import {
  Calendar,
  Trophy,
  Play,
  ArrowRight,
  Filter,
  CheckCircle,
  Clock,
  Radio,
  X,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { Match, InningsScorecard } from '../types/cricket.ts';
import { apiFetch } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface MatchesProps {
  matches: Match[];
  onOpenScoring: (matchId: number) => void;
  onCreateMatch: () => void;
}

export const Matches: React.FC<MatchesProps> = ({
  matches,
  onOpenScoring,
  onCreateMatch,
}) => {
  const { isAdmin } = useAuth();
  const [filter, setFilter] = useState<'all' | 'live' | 'completed' | 'upcoming'>('all');
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [scorecardData, setScorecardData] = useState<any | null>(null);
  const [loadingScorecard, setLoadingScorecard] = useState(false);
  const [activeInningsTab, setActiveInningsTab] = useState<number>(1);

  const filteredMatches = matches.filter((m) => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  const handleOpenScorecard = async (matchId: number) => {
    setSelectedMatchId(matchId);
    setLoadingScorecard(true);
    setActiveInningsTab(1);
    try {
      const data = await apiFetch(`/api/matches/${matchId}/live`);
      setScorecardData(data);
    } catch (err) {
      console.error('Failed to load scorecard:', err);
    } finally {
      setLoadingScorecard(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Matches & Fixtures ({matches.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Official FFC match records, live scoring, and full box scorecards
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={onCreateMatch}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>+ Create Match</span>
          </button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'all', label: 'All Matches' },
          { id: 'live', label: 'Live Scoring' },
          { id: 'completed', label: 'Completed' },
          { id: 'upcoming', label: 'Upcoming' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filter === tab.id
                ? 'bg-emerald-700 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Matches Grid */}
      {filteredMatches.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
          No matches found for this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((m) => {
            const inn1 = m.innings?.find((i) => i.inningsNumber === 1);
            const inn2 = m.innings?.find((i) => i.inningsNumber === 2);
            const isLive = m.status === 'live';
            const isCompleted = m.status === 'completed';

            return (
              <div
                key={m.id}
                className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-xl flex flex-col justify-between"
              >
                <div>
                  {/* Top: Date & Format & Status */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-3 mb-3 border-b border-slate-800">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{m.date}</span>
                      <span>•</span>
                      <span>{m.matchType}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isLive
                          ? 'bg-red-600 text-white animate-pulse'
                          : isCompleted
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  {/* Title / Teams */}
                  <div className="space-y-3 mb-4">
                    {/* Team 1 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="font-bold text-white text-sm">{m.team1?.name}</span>
                      </div>
                      <div className="text-right">
                        {inn1 ? (
                          <span className="font-extrabold text-white text-sm">
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
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="font-bold text-white text-sm">{m.team2?.name}</span>
                      </div>
                      <div className="text-right">
                        {inn2 ? (
                          <span className="font-extrabold text-white text-sm">
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

                  {/* Venue and Result */}
                  <div className="text-xs text-slate-400 mb-4 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="font-semibold text-emerald-400">
                      {m.resultSummary || `${m.totalOvers} Overs • ${m.matchFormat}`}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">{m.venue}</div>
                  </div>
                </div>

                {/* Bottom Action buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenScorecard(m.id)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Full Scorecard</span>
                  </button>

                  {isAdmin ? (
                    <button
                      onClick={() => onOpenScoring(m.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                        isLive
                          ? 'bg-red-600 hover:bg-red-500 text-white shadow'
                          : isCompleted
                          ? 'bg-emerald-800/60 hover:bg-emerald-700 text-emerald-100'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isLive ? 'Live Scoring' : isCompleted ? 'Scoring Console' : 'Start Match'}</span>
                    </button>
                  ) : isLive ? (
                    <button
                      onClick={() => onOpenScoring(m.id)}
                      className="py-2 px-3 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow animate-pulse flex items-center justify-center gap-1.5"
                      title="Watch ball-by-ball live score"
                    >
                      <Radio className="w-3 h-3 text-white" />
                      <span>Watch Live</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL SCORECARD MODAL (Requirement #16) */}
      {selectedMatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl my-8 max-h-[90vh] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-extrabold text-white">Match Scorecard</h3>
                <p className="text-xs text-slate-400">
                  {scorecardData?.match?.title || `${scorecardData?.match?.team1?.name} vs ${scorecardData?.match?.team2?.name}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedMatchId(null)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1.5 rounded-lg bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            {loadingScorecard ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Loading official scorecard...
              </div>
            ) : scorecardData ? (
              <div className="space-y-6">
                {/* Result banner */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-900/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400 uppercase font-semibold">Match Result</div>
                    <div className="text-base font-extrabold text-emerald-400 mt-0.5">
                      {scorecardData.match?.resultSummary || 'Match in progress / scheduled'}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div>{scorecardData.match?.venue}</div>
                    <div>{scorecardData.match?.date}</div>
                  </div>
                </div>

                {/* Innings Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  {scorecardData.scorecards?.map((sc: InningsScorecard, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setActiveInningsTab(sc.innings.inningsNumber)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                        activeInningsTab === sc.innings.inningsNumber
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {sc.battingTeam?.name || `Innings ${sc.innings.inningsNumber}`}: {sc.innings.totalRuns}/{sc.innings.totalWickets} ({sc.overs} ov)
                    </button>
                  ))}
                </div>

                {/* Active Innings Scorecard View */}
                {(() => {
                  const currentSc: InningsScorecard = scorecardData.scorecards?.find(
                    (sc: any) => sc.innings.inningsNumber === activeInningsTab
                  );
                  if (!currentSc) {
                    return (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        This innings has not commenced yet.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-5">
                      {/* Batting Card Table */}
                      <div>
                        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                          Batting - {currentSc.battingTeam?.name}
                        </h4>
                        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                              <tr>
                                <th className="py-2.5 px-3">Batter</th>
                                <th className="py-2.5 px-3">Dismissal</th>
                                <th className="py-2.5 px-3 text-right">R</th>
                                <th className="py-2.5 px-3 text-right">B</th>
                                <th className="py-2.5 px-3 text-right">4s</th>
                                <th className="py-2.5 px-3 text-right">6s</th>
                                <th className="py-2.5 px-3 text-right">SR</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80 text-slate-200">
                              {currentSc.batting.map((b) => (
                                <tr key={b.playerId} className="hover:bg-slate-900/40">
                                  <td className="py-2 px-3 font-semibold text-white">
                                    {b.name} {!b.isOut ? '*' : ''}
                                  </td>
                                  <td className="py-2 px-3 text-slate-400 text-[11px]">
                                    {b.dismissalText}
                                  </td>
                                  <td className="py-2 px-3 text-right font-extrabold text-white">
                                    {b.runs}
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-400">{b.balls}</td>
                                  <td className="py-2 px-3 text-right text-slate-400">{b.fours}</td>
                                  <td className="py-2 px-3 text-right text-slate-400">{b.sixes}</td>
                                  <td className="py-2 px-3 text-right font-medium text-emerald-400">
                                    {b.strikeRate}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Extras summary */}
                        <div className="flex items-center justify-between text-xs text-slate-400 mt-2 px-2">
                          <span>
                            Extras: <strong>{currentSc.extras?.total || 0}</strong> (wd {currentSc.extras?.wides || 0}, nb {currentSc.extras?.noBalls || 0}, b {currentSc.extras?.byes || 0}, lb {currentSc.extras?.legByes || 0})
                          </span>
                          <span className="font-bold text-white">
                            Total: {currentSc.innings.totalRuns}/{currentSc.innings.totalWickets} ({currentSc.overs} Overs)
                          </span>
                        </div>
                      </div>

                      {/* Bowling Card Table */}
                      <div>
                        <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                          Bowling - {currentSc.bowlingTeam?.name}
                        </h4>
                        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                              <tr>
                                <th className="py-2.5 px-3">Bowler</th>
                                <th className="py-2.5 px-3 text-right">O</th>
                                <th className="py-2.5 px-3 text-right">M</th>
                                <th className="py-2.5 px-3 text-right">R</th>
                                <th className="py-2.5 px-3 text-right">W</th>
                                <th className="py-2.5 px-3 text-right">ECO</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80 text-slate-200">
                              {currentSc.bowling.map((bw) => (
                                <tr key={bw.playerId} className="hover:bg-slate-900/40">
                                  <td className="py-2 px-3 font-semibold text-white">{bw.name}</td>
                                  <td className="py-2 px-3 text-right text-slate-400">{bw.overs}</td>
                                  <td className="py-2 px-3 text-right text-slate-400">{bw.maidens}</td>
                                  <td className="py-2 px-3 text-right text-slate-400">{bw.runsConceded}</td>
                                  <td className="py-2 px-3 text-right font-extrabold text-purple-400">{bw.wickets}</td>
                                  <td className="py-2 px-3 text-right text-slate-400">{bw.economy}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Fall of Wickets */}
                      {currentSc.fallOfWickets && currentSc.fallOfWickets.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Fall of Wickets
                          </h4>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {currentSc.fallOfWickets.map((f, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300"
                              >
                                <strong>{f.score}/{f.wicketNumber}</strong> ({f.playerName}, {f.over} ov)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
