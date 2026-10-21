import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  ArrowRightLeft,
  UserCheck,
  AlertTriangle,
  Trophy,
  CheckCircle,
  HelpCircle,
  Edit3,
  Pause,
  ChevronRight,
  Shield,
  Clock,
  Sparkles,
  Award,
} from 'lucide-react';
import { Match, Innings, Ball, Player, InningsScorecard } from '../types/cricket.ts';
import { apiFetch } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface LiveScoringProps {
  matchId: number;
  onViewScorecard: (matchId: number) => void;
  onBackToMatches: () => void;
}

export const LiveScoring: React.FC<LiveScoringProps> = ({
  matchId,
  onViewScorecard,
  onBackToMatches,
}) => {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<{
    match: Match;
    currentInnings: Innings | null;
    recentBalls: Ball[];
    scorecards: InningsScorecard[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [isBowlerModalOpen, setIsBowlerModalOpen] = useState(false);
  const [isNewBatterModalOpen, setIsNewBatterModalOpen] = useState(false);
  const [isExtrasModalOpen, setIsExtrasModalOpen] = useState(false);
  const [selectedExtraType, setSelectedExtraType] = useState<'bye' | 'leg_bye' | 'wide' | 'no_ball'>('bye');
  const [extraRunsInput, setExtraRunsInput] = useState(1);
  const [editingBall, setEditingBall] = useState<Ball | null>(null);

  // Wicket Form State
  const [wicketBatterId, setWicketBatterId] = useState<number | null>(null);
  const [wicketType, setWicketType] = useState('bowled');
  const [wicketFielderId, setWicketFielderId] = useState<string>('');
  const [nextBatterId, setNextBatterId] = useState<string>('');

  // Start Match / Toss Setup Form (if match is upcoming)
  const [tossWinnerId, setTossWinnerId] = useState<string>('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');
  const [openingStrikerId, setOpeningStrikerId] = useState<string>('');
  const [openingNonStrikerId, setOpeningNonStrikerId] = useState<string>('');
  const [openingBowlerId, setOpeningBowlerId] = useState<string>('');

  // 2nd innings start form
  const [inn2StrikerId, setInn2StrikerId] = useState<string>('');
  const [inn2NonStrikerId, setInn2NonStrikerId] = useState<string>('');
  const [inn2BowlerId, setInn2BowlerId] = useState<string>('');

  useEffect(() => {
    fetchLiveData();

    // Auto-polling interval: fetch latest live score updates without UI jitter
    const pollInterval = setInterval(() => {
      apiFetch(`/api/matches/${matchId}/live`)
        .then((res) => {
          if (res) {
            setData(res);
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [matchId]);

  const fetchLiveData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(`/api/matches/${matchId}/live`);
      setData(res);

      // Pre-fill toss winner default if upcoming
      if (res.match.status === 'upcoming') {
        setTossWinnerId(String(res.match.team1Id));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch match scoring data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 text-sm">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading match scoring console...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-300">
        <p className="text-red-400 mb-4">{error || 'Match not found.'}</p>
        <button
          onClick={onBackToMatches}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
        >
          Back to Matches
        </button>
      </div>
    );
  }

  const { match, currentInnings, recentBalls, scorecards } = data;
  const team1Squad = match.squads?.filter((s) => s.teamId === match.team1Id) || [];
  const team2Squad = match.squads?.filter((s) => s.teamId === match.team2Id) || [];

  // Active Scorecard for current innings
  const activeScorecard = scorecards.find((sc) => sc?.innings?.id === currentInnings?.id);
  const inn1Scorecard = scorecards.find((sc) => sc?.innings?.inningsNumber === 1);

  // Batting and Bowling squads for active innings
  const battingSquad =
    currentInnings?.battingTeamId === match.team1Id ? team1Squad : team2Squad;
  const bowlingSquad =
    currentInnings?.bowlingTeamId === match.team1Id ? team1Squad : team2Squad;

  // Active players on the pitch
  const striker = activeScorecard?.batting.find(
    (b) => b.playerId === currentInnings?.currentStrikerId
  );
  const nonStriker = activeScorecard?.batting.find(
    (b) => b.playerId === currentInnings?.currentNonStrikerId
  );
  const bowler = activeScorecard?.bowling.find(
    (b) => b.playerId === currentInnings?.currentBowlerId
  );

  // Available batters who haven't batted yet
  const dismissedOrBattingIds = new Set(
    activeScorecard?.batting.map((b) => b.playerId) || []
  );
  const availableNextBatters = battingSquad.filter(
    (s) => !dismissedOrBattingIds.has(s.playerId)
  );

  // ----------------------------------------------------
  // SCORING ACTIONS
  // ----------------------------------------------------
  const handleScoreDelivery = async (runsOffBat: number) => {
    if (!currentInnings || !currentInnings.currentStrikerId || !currentInnings.currentNonStrikerId || !currentInnings.currentBowlerId) {
      alert('Please ensure both batters and bowler are selected.');
      return;
    }

    setActionLoading(true);
    try {
      const updated = await apiFetch('/api/scoring/ball', {
        method: 'POST',
        body: JSON.stringify({
          matchId: match.id,
          inningsId: currentInnings.id,
          strikerId: currentInnings.currentStrikerId,
          nonStrikerId: currentInnings.currentNonStrikerId,
          bowlerId: currentInnings.currentBowlerId,
          runsOffBat,
          extraRuns: 0,
          extraType: 'none',
          isWicket: false,
        }),
      });
      setData(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to record ball');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScoreWide = async () => {
    if (!currentInnings) return;
    setActionLoading(true);
    try {
      const updated = await apiFetch('/api/scoring/ball', {
        method: 'POST',
        body: JSON.stringify({
          matchId: match.id,
          inningsId: currentInnings.id,
          strikerId: currentInnings.currentStrikerId,
          nonStrikerId: currentInnings.currentNonStrikerId,
          bowlerId: currentInnings.currentBowlerId,
          runsOffBat: 0,
          extraRuns: 1,
          extraType: 'wide',
          isWicket: false,
        }),
      });
      setData(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to record wide');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScoreNoBall = async () => {
    if (!currentInnings) return;
    setActionLoading(true);
    try {
      const updated = await apiFetch('/api/scoring/ball', {
        method: 'POST',
        body: JSON.stringify({
          matchId: match.id,
          inningsId: currentInnings.id,
          strikerId: currentInnings.currentStrikerId,
          nonStrikerId: currentInnings.currentNonStrikerId,
          bowlerId: currentInnings.currentBowlerId,
          runsOffBat: 0,
          extraRuns: 1,
          extraType: 'no_ball',
          isWicket: false,
        }),
      });
      setData(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to record no ball');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScoreCustomExtra = async () => {
    if (!currentInnings) return;
    setActionLoading(true);
    try {
      const isLegal = selectedExtraType === 'bye' || selectedExtraType === 'leg_bye';
      const updated = await apiFetch('/api/scoring/ball', {
        method: 'POST',
        body: JSON.stringify({
          matchId: match.id,
          inningsId: currentInnings.id,
          strikerId: currentInnings.currentStrikerId,
          nonStrikerId: currentInnings.currentNonStrikerId,
          bowlerId: currentInnings.currentBowlerId,
          runsOffBat: 0,
          extraRuns: Number(extraRunsInput),
          extraType: selectedExtraType,
          isWicket: false,
        }),
      });
      setData(updated);
      setIsExtrasModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to record extra');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInnings) return;

    const dismissedId = wicketBatterId || currentInnings.currentStrikerId;
    if (!dismissedId) {
      alert('Please select the dismissed batter');
      return;
    }

    setActionLoading(true);
    try {
      const updated = await apiFetch('/api/scoring/ball', {
        method: 'POST',
        body: JSON.stringify({
          matchId: match.id,
          inningsId: currentInnings.id,
          strikerId: currentInnings.currentStrikerId,
          nonStrikerId: currentInnings.currentNonStrikerId,
          bowlerId: currentInnings.currentBowlerId,
          runsOffBat: 0,
          extraRuns: 0,
          extraType: 'none',
          isWicket: true,
          wicketType,
          dismissedPlayerId: dismissedId,
          fielderId: wicketFielderId ? Number(wicketFielderId) : undefined,
          newStrikerId: nextBatterId ? Number(nextBatterId) : undefined,
        }),
      });
      setData(updated);
      setIsWicketModalOpen(false);
      setNextBatterId('');
    } catch (err: any) {
      alert(err.message || 'Failed to record wicket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUndoLastBall = async () => {
    if (!currentInnings) return;
    setActionLoading(true);
    try {
      const updated = await apiFetch('/api/scoring/undo', {
        method: 'POST',
        body: JSON.stringify({
          matchId: match.id,
          inningsId: currentInnings.id,
        }),
      });
      setData(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to undo delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSwitchStriker = async () => {
    if (!currentInnings) return;
    setActionLoading(true);
    try {
      const updated = await apiFetch('/api/scoring/switch-striker', {
        method: 'POST',
        body: JSON.stringify({ inningsId: currentInnings.id }),
      });
      setData(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to switch striker');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeBowler = async (newBowlerId: number) => {
    if (!currentInnings) return;
    setActionLoading(true);
    try {
      const updated = await apiFetch('/api/scoring/change-bowler', {
        method: 'POST',
        body: JSON.stringify({
          inningsId: currentInnings.id,
          bowlerId: newBowlerId,
        }),
      });
      setData(updated);
      setIsBowlerModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to change bowler');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetBatter = async (newBatterId: number, isStriker: boolean) => {
    if (!currentInnings) return;
    setActionLoading(true);
    try {
      const updated = await apiFetch('/api/scoring/set-batter', {
        method: 'POST',
        body: JSON.stringify({
          inningsId: currentInnings.id,
          ...(isStriker ? { strikerId: newBatterId } : { nonStrikerId: newBatterId }),
        }),
      });
      setData(updated);
      setIsNewBatterModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to set batter');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openingStrikerId || !openingNonStrikerId || !openingBowlerId) {
      alert('Please select opening striker, non-striker, and opening bowler.');
      return;
    }
    if (openingStrikerId === openingNonStrikerId) {
      alert('Striker and non-striker cannot be the same player.');
      return;
    }

    setActionLoading(true);
    try {
      await apiFetch(`/api/matches/${match.id}/start`, {
        method: 'POST',
        body: JSON.stringify({
          tossWinnerId: Number(tossWinnerId),
          tossDecision,
          strikerId: Number(openingStrikerId),
          nonStrikerId: Number(openingNonStrikerId),
          bowlerId: Number(openingBowlerId),
        }),
      });
      await fetchLiveData();
    } catch (err: any) {
      alert(err.message || 'Failed to start match');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartSecondInnings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inn2StrikerId || !inn2NonStrikerId || !inn2BowlerId) {
      alert('Please select opening striker, non-striker, and opening bowler for 2nd innings.');
      return;
    }

    setActionLoading(true);
    try {
      const updated = await apiFetch(`/api/matches/${match.id}/start-second-innings`, {
        method: 'POST',
        body: JSON.stringify({
          strikerId: Number(inn2StrikerId),
          nonStrikerId: Number(inn2NonStrikerId),
          bowlerId: Number(inn2BowlerId),
        }),
      });
      setData(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to start 2nd innings');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndInningsManually = async () => {
    if (!currentInnings) return;
    setActionLoading(true);
    try {
      const updated = await apiFetch(`/api/matches/${match.id}/end-innings`, {
        method: 'POST',
        body: JSON.stringify({
          inningsNumber: currentInnings.inningsNumber,
        }),
      });
      setData(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to end innings');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // UPCOMING MATCH SPECTATOR PREVIEW (PUBLIC VIEWER)
  // ----------------------------------------------------
  if (match.status === 'upcoming' && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span>Match Scheduled</span>
          </div>
          <button
            onClick={onBackToMatches}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 transition-colors"
          >
            ← Back to Matches
          </button>
        </div>

        <div className="text-center py-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-300 mx-auto mb-3">
            <Trophy className="w-6 h-6 text-amber-300" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {match.team1?.name} <span className="text-emerald-400 text-xl font-normal">vs</span> {match.team2?.name}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-400 font-semibold mt-1">
            {match.matchType} • {match.totalOvers} Overs • {match.matchFormat}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Venue: {match.venue} • Scheduled Date: {match.date}
          </p>
        </div>

        {/* Public spectator status banner */}
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-center">
          <div className="flex items-center justify-center gap-2 text-emerald-300 font-bold text-sm mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Live Spectator Ready</span>
          </div>
          <p className="text-xs text-slate-300 max-w-lg mx-auto">
            This fixture has not started yet. Once the team admins conduct the toss and open the first innings, live scores and delivery commentary will automatically stream here.
          </p>
        </div>

        {/* Squad previews */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>{match.team1?.name} Squad</span>
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {team1Squad.map((p) => (
                <div key={p.id} className="text-xs text-slate-300 py-1 border-b border-slate-900 flex justify-between">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-[10px] text-slate-500">{p.playerType}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>{match.team2?.name} Squad</span>
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {team2Squad.map((p) => (
                <div key={p.id} className="text-xs text-slate-300 py-1 border-b border-slate-900 flex justify-between">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-[10px] text-slate-500">{p.playerType}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // UPCOMING MATCH TOSS SETUP SCREEN (ADMIN ONLY)
  // ----------------------------------------------------
  if (match.status === 'upcoming') {
    const tossWinner = teamsMatch(match, Number(tossWinnerId));
    const battingTeamId =
      tossDecision === 'bat'
        ? Number(tossWinnerId)
        : Number(tossWinnerId) === match.team1Id
        ? match.team2Id
        : match.team1Id;

    const openingBattersSquad =
      battingTeamId === match.team1Id ? team1Squad : team2Squad;
    const openingBowlersSquad =
      battingTeamId === match.team1Id ? team2Squad : team1Squad;

    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-semibold mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            <span>Match Ready to Start</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            {match.team1?.name} vs {match.team2?.name}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {match.matchType} • {match.totalOvers} Overs • {match.venue}
          </p>
        </div>

        <form onSubmit={handleStartMatch} className="space-y-5">
          {/* Toss */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Toss Decision
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Toss Winner
                </label>
                <select
                  value={tossWinnerId}
                  onChange={(e) => setTossWinnerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value={match.team1Id}>{match.team1?.name}</option>
                  <option value={match.team2Id}>{match.team2?.name}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Elected To
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTossDecision('bat')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                      tossDecision === 'bat'
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Bat First
                  </button>
                  <button
                    type="button"
                    onClick={() => setTossDecision('bowl')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                      tossDecision === 'bowl'
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Bowl First
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Openers selection */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Opening Players (1st Innings)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Striker */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Opening Striker (Batting)
                </label>
                <select
                  required
                  value={openingStrikerId}
                  onChange={(e) => setOpeningStrikerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Striker...</option>
                  {openingBattersSquad.map((s) => (
                    <option key={s.playerId} value={s.playerId} disabled={String(s.playerId) === openingNonStrikerId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Non-Striker */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Non-Striker (Batting)
                </label>
                <select
                  required
                  value={openingNonStrikerId}
                  onChange={(e) => setOpeningNonStrikerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Non-Striker...</option>
                  {openingBattersSquad.map((s) => (
                    <option key={s.playerId} value={s.playerId} disabled={String(s.playerId) === openingStrikerId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opening Bowler */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Opening Bowler
                </label>
                <select
                  required
                  value={openingBowlerId}
                  onChange={(e) => setOpeningBowlerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Bowler...</option>
                  {openingBowlersSquad.map((s) => (
                    <option key={s.playerId} value={s.playerId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{actionLoading ? 'Initializing match...' : 'Start Match & Begin Scoring'}</span>
          </button>
        </form>
      </div>
    );
  }

  // ----------------------------------------------------
  // INNINGS BREAK (PUBLIC SPECTATOR VIEW)
  // ----------------------------------------------------
  if (match.status === 'innings_break' && !isAdmin) {
    const inn1 = inn1Scorecard?.innings;
    const target = (inn1?.totalRuns || 0) + 1;
    const battingTeamName =
      inn1?.battingTeamId === match.team1Id ? match.team2?.name : match.team1?.name;

    return (
      <div className="max-w-xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-6 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 border border-amber-800 text-amber-300 text-xs font-bold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5" /> Innings Break
        </div>
        <h2 className="text-2xl font-extrabold text-white">1st Innings Completed</h2>
        <div className="text-3xl font-black text-emerald-400">
          Target: {target} Runs
        </div>
        <p className="text-xs text-slate-400">
          {battingTeamName} needs {target} runs in {match.totalOvers} overs to win
        </p>
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
          Waiting for 2nd innings to commence. Live scores will resume automatically.
        </div>
        <button
          onClick={onBackToMatches}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
        >
          ← Back to Matches
        </button>
      </div>
    );
  }

  // ----------------------------------------------------
  // INNINGS BREAK / START 2ND INNINGS SCREEN (ADMIN ONLY)
  // ----------------------------------------------------
  if (match.status === 'innings_break') {
    const inn1 = inn1Scorecard?.innings;
    const target = (inn1?.totalRuns || 0) + 1;
    const secondBattingSquad =
      inn1?.battingTeamId === match.team1Id ? team2Squad : team1Squad;
    const secondBowlingSquad =
      inn1?.battingTeamId === match.team1Id ? team1Squad : team2Squad;

    const battingTeamName =
      inn1?.battingTeamId === match.team1Id ? match.team2?.name : match.team1?.name;

    return (
      <div className="max-w-xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 border border-amber-800 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" /> Innings Break
          </div>
          <h2 className="text-2xl font-extrabold text-white">1st Innings Completed</h2>
          <div className="text-3xl font-black text-emerald-400">
            Target: {target} Runs
          </div>
          <p className="text-xs text-slate-400">
            {battingTeamName} needs {target} runs in {match.totalOvers} overs to win
          </p>
        </div>

        <form onSubmit={handleStartSecondInnings} className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Opening Players (2nd Innings)
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Opening Striker ({battingTeamName})
                </label>
                <select
                  required
                  value={inn2StrikerId}
                  onChange={(e) => setInn2StrikerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Striker...</option>
                  {secondBattingSquad.map((s) => (
                    <option key={s.playerId} value={s.playerId} disabled={String(s.playerId) === inn2NonStrikerId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Non-Striker ({battingTeamName})
                </label>
                <select
                  required
                  value={inn2NonStrikerId}
                  onChange={(e) => setInn2NonStrikerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Non-Striker...</option>
                  {secondBattingSquad.map((s) => (
                    <option key={s.playerId} value={s.playerId} disabled={String(s.playerId) === inn2StrikerId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Opening Bowler
                </label>
                <select
                  required
                  value={inn2BowlerId}
                  onChange={(e) => setInn2BowlerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Opening Bowler...</option>
                  {secondBowlingSquad.map((s) => (
                    <option key={s.playerId} value={s.playerId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{actionLoading ? 'Starting 2nd Innings...' : 'Start 2nd Innings'}</span>
          </button>
        </form>
      </div>
    );
  }

  // ----------------------------------------------------
  // MATCH COMPLETED ANNOUNCEMENT BANNER
  // ----------------------------------------------------
  const isMatchCompleted = match.status === 'completed';

  // Calculations for display
  const currentOversFloat = currentInnings
    ? `${Math.floor(currentInnings.legalBalls / 6)}.${currentInnings.legalBalls % 6}`
    : '0.0';

  const crr =
    currentInnings && currentInnings.legalBalls > 0
      ? ((currentInnings.totalRuns / (currentInnings.legalBalls / 6))).toFixed(2)
      : '0.00';

  let rrr = '-';
  let runsNeeded = 0;
  let ballsRemaining = 0;

  if (currentInnings?.inningsNumber === 2 && inn1Scorecard?.innings) {
    const target = inn1Scorecard.innings.totalRuns + 1;
    runsNeeded = Math.max(0, target - currentInnings.totalRuns);
    ballsRemaining = Math.max(0, match.totalOvers * 6 - currentInnings.legalBalls);
    if (ballsRemaining > 0) {
      rrr = ((runsNeeded / (ballsRemaining / 6))).toFixed(2);
    }
  }

  const battingTeamName =
    currentInnings?.battingTeamId === match.team1Id ? match.team1?.name : match.team2?.name;
  const bowlingTeamName =
    currentInnings?.bowlingTeamId === match.team1Id ? match.team1?.name : match.team2?.name;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-20">
      {/* Top Banner & Result Announcement */}
      {isMatchCompleted && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950 via-green-900 to-emerald-950 border border-emerald-600 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-300">
                Match Completed
              </span>
              <h2 className="text-xl font-extrabold text-white">
                {match.resultSummary || 'Match Concluded'}
              </h2>
            </div>
          </div>
          <button
            onClick={() => onViewScorecard(match.id)}
            className="px-4 py-2.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-100 font-bold text-xs shadow transition-colors flex items-center justify-center gap-1.5"
          >
            <span>View Full Scorecard</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Score Board Header Card */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950/60 to-slate-900 border border-emerald-800/80 shadow-2xl text-white">
        <div className="flex items-start justify-between pb-3 mb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">
                {battingTeamName}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                Innings {currentInnings?.inningsNumber || 1} of 2
              </span>
            </div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-white mt-1">
              {currentInnings?.totalRuns || 0}
              <span className="text-emerald-400">/</span>
              {currentInnings?.totalWickets || 0}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium">Overs</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {currentOversFloat}{' '}
              <span className="text-xs font-normal text-slate-400">/ {match.totalOvers}</span>
            </div>
            <div className="text-xs text-emerald-400 font-semibold mt-1">
              CRR: {crr}
            </div>
          </div>
        </div>

        {/* 2nd innings chase equation */}
        {currentInnings?.inningsNumber === 2 && !isMatchCompleted && (
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between text-slate-300 mb-3">
            <span>
              Target: <strong className="text-white font-bold">{inn1Scorecard?.innings.totalRuns! + 1}</strong>
            </span>
            <span className="text-amber-400 font-semibold">
              Need {runsNeeded} runs from {ballsRemaining} balls
            </span>
            <span>
              RRR: <strong className="text-white font-bold">{rrr}</strong>
            </span>
          </div>
        )}

        {/* Recent Balls in Current Over (Requirement #15) */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-xs text-slate-400 font-semibold uppercase mr-1">Over:</span>
            {recentBalls.length === 0 ? (
              <span className="text-xs text-slate-500 italic">No balls yet in this over</span>
            ) : (
              recentBalls.map((b) => {
                let badgeColor = 'bg-slate-800 text-slate-200 border-slate-700';
                let label = String(b.runsOffBat);

                if (b.isWicket) {
                  badgeColor = 'bg-red-600 text-white border-red-500 font-extrabold';
                  label = 'W';
                } else if (b.runsOffBat === 6) {
                  badgeColor = 'bg-purple-600 text-white border-purple-500 font-extrabold';
                  label = '6';
                } else if (b.runsOffBat === 4) {
                  badgeColor = 'bg-blue-600 text-white border-blue-500 font-extrabold';
                  label = '4';
                } else if (b.extraType === 'wide') {
                  badgeColor = 'bg-amber-600 text-white border-amber-500';
                  label = `${b.extraRuns}Wd`;
                } else if (b.extraType === 'no_ball') {
                  badgeColor = 'bg-orange-600 text-white border-orange-500';
                  label = `${b.extraRuns}Nb`;
                }

                return isAdmin ? (
                  <button
                    key={b.id}
                    onClick={() => setEditingBall(b)}
                    title="Click to inspect or edit this delivery"
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border text-xs font-bold flex items-center justify-center shadow transition-transform hover:scale-110 ${badgeColor}`}
                  >
                    {label}
                  </button>
                ) : (
                  <div
                    key={b.id}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border text-xs font-bold flex items-center justify-center shadow ${badgeColor}`}
                  >
                    {label}
                  </div>
                );
              })
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleUndoLastBall}
                disabled={actionLoading || isMatchCompleted || !currentInnings || (currentInnings.legalBalls === 0 && currentInnings.totalRuns === 0)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 transition-colors"
                title="Undo last delivery"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Undo Ball</span>
              </button>

              <button
                onClick={handleSwitchStriker}
                disabled={actionLoading || isMatchCompleted}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                title="Manually rotate striker"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Swap Strike</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Crease Active Players: Batters & Bowler Card (Requirement #10) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Batters */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider pb-2 border-b border-slate-800">
            <span>Current Batters</span>
            <span className="text-[10px] text-slate-400 font-normal">R (B) • 4s • 6s • SR</span>
          </div>

          {/* Striker */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-600/60 text-white">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <div className="font-extrabold text-sm text-white flex items-center gap-1">
                  <span>{striker?.name || 'Select Striker'}</span>
                  <span className="text-[10px] font-bold text-amber-300">*</span>
                </div>
                <div className="text-[10px] text-emerald-300 font-medium uppercase">Striker</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-black text-emerald-400 text-base">
                {striker?.runs || 0}{' '}
                <span className="text-xs text-slate-400 font-normal">({striker?.balls || 0})</span>
              </div>
              <div className="text-[10px] text-slate-400">
                4s: {striker?.fours || 0} • 6s: {striker?.sixes || 0} • SR: {striker?.strikeRate || 0}
              </div>
            </div>
          </div>

          {/* Non-Striker */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              <div>
                <div className="font-bold text-sm text-white">
                  {nonStriker?.name || 'Select Non-Striker'}
                </div>
                <div className="text-[10px] text-slate-400 uppercase">Non-Striker</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-white text-base">
                {nonStriker?.runs || 0}{' '}
                <span className="text-xs text-slate-400 font-normal">({nonStriker?.balls || 0})</span>
              </div>
              <div className="text-[10px] text-slate-400">
                4s: {nonStriker?.fours || 0} • 6s: {nonStriker?.sixes || 0} • SR: {nonStriker?.strikeRate || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Bowler Card */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-purple-400 uppercase tracking-wider pb-2 border-b border-slate-800">
              <span>Current Bowler</span>
              {isAdmin && !isMatchCompleted && (
                <button
                  onClick={() => setIsBowlerModalOpen(true)}
                  className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  Change Bowler
                </button>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/40 border border-purple-900/60 text-white mt-2">
              <div>
                <div className="font-extrabold text-sm text-white">{bowler?.name || 'Select Bowler'}</div>
                <div className="text-[10px] text-purple-300 mt-0.5">
                  Figures: {bowler?.overs || '0.0'} - {bowler?.maidens || 0} - {bowler?.runsConceded || 0} - {bowler?.wickets || 0}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Economy</div>
                <div className="font-bold text-purple-300 text-sm">{bowler?.economy || '0.00'}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <span>Bowling for: <strong className="text-slate-200">{bowlingTeamName}</strong></span>
            {currentInnings && (
              <span>Over #{Math.floor(currentInnings.legalBalls / 6) + 1}</span>
            )}
          </div>
        </div>
      </div>

      {/* Primary Mobile-First Scoring Buttons (ADMIN ONLY) / Spectator View (PUBLIC) */}
      {!isMatchCompleted ? (
        isAdmin ? (
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Scoring Controls (Tap to Record)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEndInningsManually}
                  className="text-[11px] font-semibold text-slate-400 hover:text-white"
                >
                  End Innings
                </button>
              </div>
            </div>

            {/* Runs Row (Large mobile-friendly buttons) */}
            <div className="grid grid-cols-6 gap-2 sm:gap-3">
              {[0, 1, 2, 3, 4, 6].map((run) => {
                let style = 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700';
                if (run === 4) style = 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-lg font-black';
                if (run === 6) style = 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-lg font-black';

                return (
                  <button
                    key={run}
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleScoreDelivery(run)}
                    className={`h-16 sm:h-20 rounded-2xl border text-xl sm:text-2xl font-extrabold flex flex-col items-center justify-center active:scale-95 transition-all shadow-md ${style}`}
                  >
                    <span>{run}</span>
                    <span className="text-[10px] font-semibold opacity-75">
                      {run === 0 ? 'Dot' : run === 4 ? 'Boundary' : run === 6 ? 'Maximum' : 'Runs'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Extras and Wicket Row */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-3">
              {/* Wide */}
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleScoreWide}
                className="h-12 sm:h-14 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-700/80 text-amber-200 text-xs font-bold flex flex-col items-center justify-center active:scale-95 transition-all"
              >
                <span>WIDE</span>
                <span className="text-[9px] text-amber-400 font-normal">+1 Extra</span>
              </button>

              {/* No Ball */}
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleScoreNoBall}
                className="h-12 sm:h-14 rounded-xl bg-orange-950/80 hover:bg-orange-900 border border-orange-700/80 text-orange-200 text-xs font-bold flex flex-col items-center justify-center active:scale-95 transition-all"
              >
                <span>NO BALL</span>
                <span className="text-[9px] text-orange-400 font-normal">+1 Extra</span>
              </button>

              {/* Bye / Leg Bye */}
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setSelectedExtraType('bye');
                  setIsExtrasModalOpen(true);
                }}
                className="h-12 sm:h-14 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex flex-col items-center justify-center active:scale-95 transition-all"
              >
                <span>BYE / LB</span>
                <span className="text-[9px] text-slate-400 font-normal">Custom Extra</span>
              </button>

              {/* BIG WICKET BUTTON (Cricket red accent) */}
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setWicketBatterId(currentInnings?.currentStrikerId || null);
                  setIsWicketModalOpen(true);
                }}
                className="col-span-1 sm:col-span-2 h-12 sm:h-14 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 border border-red-400 text-white font-black text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/40 active:scale-95 transition-all"
              >
                <span>WICKET!</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-emerald-900/60 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <span className="font-bold text-sm text-white">Live Spectator Feed Active</span>
                <p className="text-slate-400 text-xs mt-0.5">Ball-by-ball deliveries and scorecards refresh automatically as the match proceeds.</p>
              </div>
            </div>
            <div className="text-emerald-300 text-xs font-semibold bg-emerald-950/80 px-3.5 py-1.5 rounded-xl border border-emerald-800 whitespace-nowrap">
              Auto-updating • Read Only
            </div>
          </div>
        )
      ) : (
        <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-300 space-y-4">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-xl font-bold text-white">This match has concluded.</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            All career statistics for batting, bowling, and fielding have automatically updated.
          </p>
          <button
            onClick={() => onViewScorecard(match.id)}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-colors"
          >
            Open Complete Scorecard
          </button>
        </div>
      )}

      {/* WICKET MODAL (Requirement #13) */}
      {isWicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <h3 className="font-extrabold text-base text-red-400">Record Wicket Dismissal</h3>
              </div>
              <button
                onClick={() => setIsWicketModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWicketSubmit} className="space-y-4">
              {/* Dismissed Player */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Dismissed Batter
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWicketBatterId(currentInnings?.currentStrikerId || null)}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      wicketBatterId === currentInnings?.currentStrikerId
                        ? 'bg-red-950 border-red-600 text-red-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Striker ({striker?.name || 'Striker'})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWicketBatterId(currentInnings?.currentNonStrikerId || null)}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      wicketBatterId === currentInnings?.currentNonStrikerId
                        ? 'bg-red-950 border-red-600 text-red-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Non-Striker ({nonStriker?.name || 'Non-Striker'})
                  </button>
                </div>
              </div>

              {/* Wicket Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Dismissal Type
                </label>
                <select
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="bowled">Bowled</option>
                  <option value="caught">Caught</option>
                  <option value="lbw">LBW</option>
                  <option value="run_out">Run Out</option>
                  <option value="stumped">Stumped</option>
                  <option value="hit_wicket">Hit Wicket</option>
                  <option value="retired_hurt">Retired Hurt</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Fielder (if caught, run out, stumped) */}
              {(wicketType === 'caught' || wicketType === 'run_out' || wicketType === 'stumped') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Fielder / Catcher
                  </label>
                  <select
                    value={wicketFielderId}
                    onChange={(e) => setWicketFielderId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="">Select Fielder...</option>
                    {bowlingSquad.map((s) => (
                      <option key={s.playerId} value={s.playerId}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Next Batter */}
              {availableNextBatters.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Next Incoming Batter
                  </label>
                  <select
                    value={nextBatterId}
                    onChange={(e) => setNextBatterId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Next Batter...</option>
                    {availableNextBatters.map((s) => (
                      <option key={s.playerId} value={s.playerId}>
                        {s.name} ({s.playerType || 'Player'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWicketModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow"
                >
                  Confirm Wicket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE BOWLER MODAL */}
      {isBowlerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-base text-purple-400">Select New Bowler</h3>
              <button
                onClick={() => setIsBowlerModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {bowlingSquad.map((s) => (
                <button
                  key={s.playerId}
                  onClick={() => handleChangeBowler(s.playerId)}
                  className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold transition-colors flex items-center justify-between ${
                    s.playerId === currentInnings?.currentBowlerId
                      ? 'bg-purple-950 border border-purple-600 text-purple-200'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <span>{s.name}</span>
                  <span className="text-[10px] text-slate-400">{s.bowlingStyle || 'Bowler'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EXTRAS MODAL */}
      {isExtrasModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-base text-amber-400">Record Byes / Leg Byes</h3>
              <button
                onClick={() => setIsExtrasModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Extra Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedExtraType('bye')}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      selectedExtraType === 'bye'
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Bye (B)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedExtraType('leg_bye')}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      selectedExtraType === 'leg_bye'
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Leg Bye (LB)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Runs Scored</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setExtraRunsInput(r)}
                      className={`py-2 text-xs font-bold rounded-xl border ${
                        extraRunsInput === r
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {r} Run{r > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleScoreCustomExtra}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow"
              >
                Save Extra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BALL MODAL (Requirement #29) */}
      {editingBall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-base text-emerald-400">Edit Previous Delivery</h3>
              <button
                onClick={() => setEditingBall(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Runs Off Bat</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 4, 6].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditingBall({ ...editingBall, runsOffBat: r })}
                      className={`py-2 text-xs font-bold rounded-xl border ${
                        editingBall.runsOffBat === r
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    const updated = await apiFetch(`/api/scoring/ball/${editingBall.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({
                        runsOffBat: editingBall.runsOffBat,
                        extraRuns: editingBall.extraRuns,
                        extraType: editingBall.extraType,
                        isWicket: editingBall.isWicket,
                      }),
                    });
                    setData(updated);
                    setEditingBall(null);
                  } catch (err: any) {
                    alert(err.message || 'Failed to edit ball');
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow"
              >
                Save Changes & Recalculate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function teamsMatch(match: Match, id: number) {
  return match.team1Id === id ? match.team1 : match.team2;
}
