import { db } from './index.ts';
import {
  players,
  teams,
  teamPlayers,
  matches,
  matchSquads,
  innings,
  balls,
} from './schema.ts';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

// Types
export interface PlayerData {
  id: number;
  name: string;
  employeeId?: string | null;
  department?: string | null;
  designation?: string | null;
  jerseyNumber?: number | null;
  battingStyle: string;
  bowlingStyle: string;
  playerType: string;
  phone?: string | null;
  joiningDate?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  isDemo: boolean;
  createdAt: Date | null;
}

export interface PlayerCareerStats {
  batting: {
    matches: number;
    innings: number;
    runs: number;
    balls: number;
    highestScore: number;
    highestScoreNotOut: boolean;
    average: number;
    strikeRate: number;
    fours: number;
    sixes: number;
    fifties: number;
    hundreds: number;
    notOuts: number;
    dismissals: number;
  };
  bowling: {
    matches: number;
    overs: string;
    balls: number;
    runsConceded: number;
    wickets: number;
    economy: number;
    average: number;
    strikeRate: number;
    maidens: number;
    bestBowling: string;
    fourWickets: number;
    fiveWickets: number;
  };
  fielding: {
    catches: number;
    runOuts: number;
    stumpings: number;
  };
}

// ----------------------------------------------------
// PLAYERS
// ----------------------------------------------------
export async function getAllPlayers() {
  try {
    return await db.select().from(players).orderBy(players.name);
  } catch (error) {
    console.error('Error fetching players:', error);
    throw new Error('Failed to fetch players', { cause: error });
  }
}

export async function getPlayerById(id: number) {
  try {
    const list = await db.select().from(players).where(eq(players.id, id)).limit(1);
    return list[0] || null;
  } catch (error) {
    console.error('Error fetching player by id:', error);
    throw new Error('Failed to fetch player', { cause: error });
  }
}

export async function createPlayer(data: {
  name: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  jerseyNumber?: number;
  battingStyle?: string;
  bowlingStyle?: string;
  playerType?: string;
  phone?: string;
  joiningDate?: string;
  bio?: string;
  photoUrl?: string;
  isDemo?: boolean;
}) {
  try {
    const result = await db.insert(players).values({
      name: data.name,
      employeeId: data.employeeId || null,
      department: data.department || null,
      designation: data.designation || null,
      jerseyNumber: data.jerseyNumber || null,
      battingStyle: data.battingStyle || 'Right Hand',
      bowlingStyle: data.bowlingStyle || 'Right Arm Medium',
      playerType: data.playerType || 'All-Rounder',
      phone: data.phone || null,
      joiningDate: data.joiningDate || null,
      bio: data.bio || null,
      photoUrl: data.photoUrl || null,
      isDemo: data.isDemo || false,
    }).returning();
    return result[0];
  } catch (error) {
    console.error('Error creating player:', error);
    throw new Error('Failed to create player', { cause: error });
  }
}

export async function updatePlayer(id: number, data: Partial<PlayerData>) {
  try {
    const result = await db.update(players).set(data).where(eq(players.id, id)).returning();
    return result[0];
  } catch (error) {
    console.error('Error updating player:', error);
    throw new Error('Failed to update player', { cause: error });
  }
}

export async function deletePlayer(id: number) {
  try {
    // Delete team associations and match squads first
    await db.delete(teamPlayers).where(eq(teamPlayers.playerId, id));
    await db.delete(matchSquads).where(eq(matchSquads.playerId, id));
    await db.delete(players).where(eq(players.id, id));
    return { success: true };
  } catch (error) {
    console.error('Error deleting player:', error);
    throw new Error('Failed to delete player', { cause: error });
  }
}

// ----------------------------------------------------
// TEAMS
// ----------------------------------------------------
export async function getAllTeams() {
  try {
    const allTeams = await db.select().from(teams).orderBy(teams.name);
    const enriched = await Promise.all(
      allTeams.map(async (team) => {
        // Get player count
        const members = await db.select({
          id: players.id,
          name: players.name,
          jerseyNumber: players.jerseyNumber,
          playerType: players.playerType,
        })
        .from(teamPlayers)
        .innerJoin(players, eq(teamPlayers.playerId, players.id))
        .where(eq(teamPlayers.teamId, team.id));

        // Get captain and vice captain names
        let captain = null;
        let viceCaptain = null;
        if (team.captainId) {
          const cap = await db.select().from(players).where(eq(players.id, team.captainId)).limit(1);
          captain = cap[0] || null;
        }
        if (team.viceCaptainId) {
          const vc = await db.select().from(players).where(eq(players.id, team.viceCaptainId)).limit(1);
          viceCaptain = vc[0] || null;
        }

        // Get match statistics for this team
        const teamMatches = await db.select().from(matches).where(
          and(
            sql`(${matches.team1Id} = ${team.id} OR ${matches.team2Id} = ${team.id})`,
            eq(matches.status, 'completed')
          )
        );

        let wins = 0;
        let losses = 0;
        let ties = 0;
        let noResults = 0;

        teamMatches.forEach((m) => {
          if (m.winnerTeamId === team.id) {
            wins++;
          } else if (m.resultSummary && m.resultSummary.toLowerCase().includes('tie')) {
            ties++;
          } else if (m.resultSummary && m.resultSummary.toLowerCase().includes('no result')) {
            noResults++;
          } else if (m.winnerTeamId) {
            losses++;
          }
        });

        // Total runs and wickets scored by team
        const teamInnings = await db.select().from(innings).where(
          and(
            eq(innings.battingTeamId, team.id),
            eq(innings.isCompleted, true)
          )
        );
        const totalRuns = teamInnings.reduce((sum, inn) => sum + inn.totalRuns, 0);
        const totalWickets = teamInnings.reduce((sum, inn) => sum + inn.totalWickets, 0);

        return {
          ...team,
          captain,
          viceCaptain,
          members,
          memberCount: members.length,
          matchesPlayed: teamMatches.length,
          wins,
          losses,
          ties,
          noResults,
          totalRuns,
          totalWickets,
        };
      })
    );
    return enriched;
  } catch (error) {
    console.error('Error fetching teams:', error);
    throw new Error('Failed to fetch teams', { cause: error });
  }
}

export async function getTeamById(id: number) {
  try {
    const list = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
    if (!list[0]) return null;
    const team = list[0];

    // Get members
    const members = await db.select({
      id: players.id,
      name: players.name,
      jerseyNumber: players.jerseyNumber,
      playerType: players.playerType,
      battingStyle: players.battingStyle,
      bowlingStyle: players.bowlingStyle,
      department: players.department,
    })
    .from(teamPlayers)
    .innerJoin(players, eq(teamPlayers.playerId, players.id))
    .where(eq(teamPlayers.teamId, team.id));

    let captain = null;
    let viceCaptain = null;
    if (team.captainId) {
      const cap = await db.select().from(players).where(eq(players.id, team.captainId)).limit(1);
      captain = cap[0] || null;
    }
    if (team.viceCaptainId) {
      const vc = await db.select().from(players).where(eq(players.id, team.viceCaptainId)).limit(1);
      viceCaptain = vc[0] || null;
    }

    return {
      ...team,
      captain,
      viceCaptain,
      members,
    };
  } catch (error) {
    console.error('Error getting team by id:', error);
    throw new Error('Failed to get team', { cause: error });
  }
}

export async function createTeam(data: {
  name: string;
  shortName?: string;
  logoUrl?: string;
  color?: string;
  captainId?: number;
  viceCaptainId?: number;
  playerIds?: number[];
  isDemo?: boolean;
}) {
  try {
    const res = await db.insert(teams).values({
      name: data.name,
      shortName: data.shortName || data.name.substring(0, 3).toUpperCase(),
      logoUrl: data.logoUrl || null,
      color: data.color || '#166534',
      captainId: data.captainId || null,
      viceCaptainId: data.viceCaptainId || null,
      isDemo: data.isDemo || false,
    }).returning();

    const newTeam = res[0];

    if (data.playerIds && data.playerIds.length > 0) {
      const rows = data.playerIds.map((pId) => ({
        teamId: newTeam.id,
        playerId: pId,
      }));
      await db.insert(teamPlayers).values(rows);
    }

    return newTeam;
  } catch (error) {
    console.error('Error creating team:', error);
    throw new Error('Failed to create team', { cause: error });
  }
}

export async function updateTeam(
  id: number,
  data: {
    name?: string;
    shortName?: string;
    logoUrl?: string;
    color?: string;
    captainId?: number | null;
    viceCaptainId?: number | null;
    playerIds?: number[];
  }
) {
  try {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.shortName !== undefined) updateData.shortName = data.shortName;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.captainId !== undefined) updateData.captainId = data.captainId;
    if (data.viceCaptainId !== undefined) updateData.viceCaptainId = data.viceCaptainId;

    await db.update(teams).set(updateData).where(eq(teams.id, id));

    if (data.playerIds !== undefined) {
      await db.delete(teamPlayers).where(eq(teamPlayers.teamId, id));
      if (data.playerIds.length > 0) {
        const rows = data.playerIds.map((pId) => ({
          teamId: id,
          playerId: pId,
        }));
        await db.insert(teamPlayers).values(rows);
      }
    }

    return await getTeamById(id);
  } catch (error) {
    console.error('Error updating team:', error);
    throw new Error('Failed to update team', { cause: error });
  }
}

// ----------------------------------------------------
// MATCHES & SQUADS
// ----------------------------------------------------
export async function getAllMatches() {
  try {
    const list = await db.select().from(matches).orderBy(desc(matches.date), desc(matches.id));
    const enriched = await Promise.all(
      list.map(async (m) => {
        const t1 = await db.select().from(teams).where(eq(teams.id, m.team1Id)).limit(1);
        const t2 = await db.select().from(teams).where(eq(teams.id, m.team2Id)).limit(1);
        const innList = await db.select().from(innings).where(eq(innings.matchId, m.id)).orderBy(innings.inningsNumber);

        return {
          ...m,
          team1: t1[0] || null,
          team2: t2[0] || null,
          innings: innList,
        };
      })
    );
    return enriched;
  } catch (error) {
    console.error('Error fetching matches:', error);
    throw new Error('Failed to fetch matches', { cause: error });
  }
}

export async function getMatchById(id: number) {
  try {
    const list = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    if (!list[0]) return null;
    const match = list[0];

    const t1 = await db.select().from(teams).where(eq(teams.id, match.team1Id)).limit(1);
    const t2 = await db.select().from(teams).where(eq(teams.id, match.team2Id)).limit(1);

    const squadRecords = await db.select({
      id: matchSquads.id,
      matchId: matchSquads.matchId,
      teamId: matchSquads.teamId,
      playerId: matchSquads.playerId,
      isCaptain: matchSquads.isCaptain,
      isViceCaptain: matchSquads.isViceCaptain,
      isWicketKeeper: matchSquads.isWicketKeeper,
      name: players.name,
      jerseyNumber: players.jerseyNumber,
      battingStyle: players.battingStyle,
      bowlingStyle: players.bowlingStyle,
      playerType: players.playerType,
    })
    .from(matchSquads)
    .innerJoin(players, eq(matchSquads.playerId, players.id))
    .where(eq(matchSquads.matchId, match.id));

    const innList = await db.select().from(innings).where(eq(innings.matchId, match.id)).orderBy(innings.inningsNumber);

    return {
      ...match,
      team1: t1[0] || null,
      team2: t2[0] || null,
      squads: squadRecords,
      innings: innList,
    };
  } catch (error) {
    console.error('Error fetching match by id:', error);
    throw new Error('Failed to fetch match', { cause: error });
  }
}

export async function createMatch(data: {
  title?: string;
  matchType: string;
  matchFormat: string;
  totalOvers: number;
  venue: string;
  date: string;
  team1Id: number;
  team2Id: number;
  team1CaptainId?: number;
  team2CaptainId?: number;
  team1Squad: number[]; // Player IDs
  team2Squad: number[]; // Player IDs
  tossWinnerId?: number;
  tossDecision?: string;
  isDemo?: boolean;
}) {
  try {
    if (data.team1Id === data.team2Id) {
      throw new Error('Team 1 and Team 2 cannot be the same');
    }

    const res = await db.insert(matches).values({
      title: data.title || '',
      matchType: data.matchType || 'T20',
      matchFormat: data.matchFormat || 'Hard Ball',
      totalOvers: Number(data.totalOvers) || 20,
      venue: data.venue || 'FFC Cricket Ground',
      date: data.date,
      team1Id: data.team1Id,
      team2Id: data.team2Id,
      team1CaptainId: data.team1CaptainId || null,
      team2CaptainId: data.team2CaptainId || null,
      tossWinnerId: data.tossWinnerId || null,
      tossDecision: data.tossDecision || null,
      status: 'upcoming',
      isDemo: data.isDemo || false,
    }).returning();

    const newMatch = res[0];

    // Insert squad records
    const squadInserts: any[] = [];
    data.team1Squad.forEach((pId) => {
      squadInserts.push({
        matchId: newMatch.id,
        teamId: data.team1Id,
        playerId: pId,
        isCaptain: pId === data.team1CaptainId,
      });
    });
    data.team2Squad.forEach((pId) => {
      squadInserts.push({
        matchId: newMatch.id,
        teamId: data.team2Id,
        playerId: pId,
        isCaptain: pId === data.team2CaptainId,
      });
    });

    if (squadInserts.length > 0) {
      await db.insert(matchSquads).values(squadInserts);
    }

    return await getMatchById(newMatch.id);
  } catch (error: any) {
    console.error('Error creating match:', error);
    throw new Error(error.message || 'Failed to create match', { cause: error });
  }
}

// ----------------------------------------------------
// LIVE SCORING ENGINE
// ----------------------------------------------------
export async function startMatch(matchId: number, options: {
  tossWinnerId: number;
  tossDecision: 'bat' | 'bowl';
  strikerId: number;
  nonStrikerId: number;
  bowlerId: number;
}) {
  try {
    const match = await getMatchById(matchId);
    if (!match) throw new Error('Match not found');

    const battingTeamId =
      options.tossDecision === 'bat'
        ? options.tossWinnerId
        : options.tossWinnerId === match.team1Id
        ? match.team2Id
        : match.team1Id;

    const bowlingTeamId = battingTeamId === match.team1Id ? match.team2Id : match.team1Id;

    // Create 1st Innings
    const innRes = await db.insert(innings).values({
      matchId,
      inningsNumber: 1,
      battingTeamId,
      bowlingTeamId,
      totalRuns: 0,
      totalWickets: 0,
      legalBalls: 0,
      totalExtras: 0,
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      isCompleted: false,
      currentStrikerId: options.strikerId,
      currentNonStrikerId: options.nonStrikerId,
      currentBowlerId: options.bowlerId,
    }).returning();

    // Update match status to live
    await db.update(matches).set({
      status: 'live',
      currentInnings: 1,
      tossWinnerId: options.tossWinnerId,
      tossDecision: options.tossDecision,
    }).where(eq(matches.id, matchId));

    return {
      matchId,
      innings: innRes[0],
    };
  } catch (error) {
    console.error('Error starting match:', error);
    throw new Error('Failed to start match', { cause: error });
  }
}

export async function getLiveScoreData(matchId: number) {
  try {
    const match = await getMatchById(matchId);
    if (!match) return null;

    const currentInnList = await db.select().from(innings).where(
      and(eq(innings.matchId, matchId), eq(innings.inningsNumber, match.currentInnings))
    ).limit(1);

    const currentInn = currentInnList[0] || null;
    let recentBalls: any[] = [];
    let allInningsBalls: any[] = [];

    if (currentInn) {
      allInningsBalls = await db.select().from(balls).where(
        eq(balls.inningsId, currentInn.id)
      ).orderBy(balls.id);

      // Current over balls (balls belonging to the active overNumber)
      const currentOverNum = Math.floor(currentInn.legalBalls / 6);
      recentBalls = allInningsBalls.filter((b) => b.overNumber === currentOverNum);
    }

    // Also get detailed scorecard data for both innings
    const allInnings = await db.select().from(innings).where(eq(innings.matchId, matchId)).orderBy(innings.inningsNumber);
    const scorecards = await Promise.all(
      allInnings.map(async (inn) => {
        return await calculateInningsScorecard(inn.id);
      })
    );

    return {
      match,
      currentInnings: currentInn,
      recentBalls,
      scorecards,
    };
  } catch (error) {
    console.error('Error getting live score data:', error);
    throw new Error('Failed to get live score data', { cause: error });
  }
}

export async function recordBall(data: {
  matchId: number;
  inningsId: number;
  strikerId: number;
  nonStrikerId: number;
  bowlerId: number;
  runsOffBat: number;
  extraRuns: number;
  extraType: 'none' | 'wide' | 'no_ball' | 'bye' | 'leg_bye';
  isWicket: boolean;
  wicketType?: string;
  dismissedPlayerId?: number;
  fielderId?: number;
  newStrikerId?: number;
  newBowlerId?: number;
}) {
  try {
    const innList = await db.select().from(innings).where(eq(innings.id, data.inningsId)).limit(1);
    if (!innList[0]) throw new Error('Innings not found');
    const inn = innList[0];

    const match = await getMatchById(data.matchId);
    if (!match) throw new Error('Match not found');

    const isWide = data.extraType === 'wide';
    const isNoBall = data.extraType === 'no_ball';
    const isLegal = !isWide && !isNoBall;

    // Calculate over number and ball number in over before this ball
    const legalBallsSoFar = inn.legalBalls;
    const overNumber = Math.floor(legalBallsSoFar / 6);
    const ballNumberInOver = (legalBallsSoFar % 6) + (isLegal ? 1 : 0);

    // Total runs for delivery
    const deliveryRuns = data.runsOffBat + data.extraRuns;

    // Insert ball
    await db.insert(balls).values({
      matchId: data.matchId,
      inningsId: data.inningsId,
      overNumber,
      ballNumberInOver: isLegal ? (legalBallsSoFar % 6) + 1 : (legalBallsSoFar % 6),
      strikerId: data.strikerId,
      nonStrikerId: data.nonStrikerId,
      bowlerId: data.bowlerId,
      runsOffBat: data.runsOffBat,
      extraRuns: data.extraRuns,
      extraType: data.extraType,
      isLegalDelivery: isLegal,
      isWicket: data.isWicket,
      wicketType: data.isWicket ? data.wicketType : null,
      dismissedPlayerId: data.isWicket ? (data.dismissedPlayerId || data.strikerId) : null,
      fielderId: data.isWicket ? (data.fielderId || null) : null,
      commentary: generateCommentary({
        runsOffBat: data.runsOffBat,
        extraRuns: data.extraRuns,
        extraType: data.extraType,
        isWicket: data.isWicket,
        wicketType: data.wicketType,
      }),
    });

    // Recalculate full innings totals and strikers from all deliveries
    await recalculateInningsState(data.inningsId, {
      newStrikerId: data.newStrikerId,
      newBowlerId: data.newBowlerId,
      justDismissedPlayerId: data.isWicket ? (data.dismissedPlayerId || data.strikerId) : undefined,
    });

    // Check if match completed or innings ended
    await checkMatchStatusAfterBall(data.matchId, data.inningsId);

    return await getLiveScoreData(data.matchId);
  } catch (error) {
    console.error('Error recording ball:', error);
    throw new Error('Failed to record ball', { cause: error });
  }
}

export async function undoLastBall(matchId: number, inningsId: number) {
  try {
    // Find the last recorded ball
    const lastBallList = await db.select().from(balls)
      .where(eq(balls.inningsId, inningsId))
      .orderBy(desc(balls.id))
      .limit(1);

    if (lastBallList.length === 0) {
      throw new Error('No balls to undo in this innings');
    }

    const lastBall = lastBallList[0];
    await db.delete(balls).where(eq(balls.id, lastBall.id));

    // Reset match completed status if it was completed by that ball
    await db.update(matches).set({
      status: 'live',
      winnerTeamId: null,
      resultMargin: null,
      resultSummary: null,
    }).where(eq(matches.id, matchId));

    await db.update(innings).set({
      isCompleted: false,
    }).where(eq(innings.id, inningsId));

    // Recalculate innings
    await recalculateInningsState(inningsId);

    return await getLiveScoreData(matchId);
  } catch (error) {
    console.error('Error undoing last ball:', error);
    throw new Error('Failed to undo ball', { cause: error });
  }
}

export async function editBall(ballId: number, updates: {
  runsOffBat: number;
  extraRuns: number;
  extraType: 'none' | 'wide' | 'no_ball' | 'bye' | 'leg_bye';
  isWicket: boolean;
  wicketType?: string;
  dismissedPlayerId?: number;
  fielderId?: number;
}) {
  try {
    const ballList = await db.select().from(balls).where(eq(balls.id, ballId)).limit(1);
    if (!ballList[0]) throw new Error('Ball not found');
    const ball = ballList[0];

    const isLegal = updates.extraType !== 'wide' && updates.extraType !== 'no_ball';

    await db.update(balls).set({
      runsOffBat: updates.runsOffBat,
      extraRuns: updates.extraRuns,
      extraType: updates.extraType,
      isLegalDelivery: isLegal,
      isWicket: updates.isWicket,
      wicketType: updates.isWicket ? updates.wicketType : null,
      dismissedPlayerId: updates.isWicket ? (updates.dismissedPlayerId || ball.strikerId) : null,
      fielderId: updates.isWicket ? (updates.fielderId || null) : null,
      commentary: generateCommentary(updates),
    }).where(eq(balls.id, ballId));

    await recalculateInningsState(ball.inningsId);
    await checkMatchStatusAfterBall(ball.matchId, ball.inningsId);

    return await getLiveScoreData(ball.matchId);
  } catch (error) {
    console.error('Error editing ball:', error);
    throw new Error('Failed to edit ball', { cause: error });
  }
}

export async function switchStriker(inningsId: number) {
  try {
    const innList = await db.select().from(innings).where(eq(innings.id, inningsId)).limit(1);
    if (!innList[0]) throw new Error('Innings not found');
    const inn = innList[0];

    const currentStriker = inn.currentStrikerId;
    const currentNonStriker = inn.currentNonStrikerId;

    await db.update(innings).set({
      currentStrikerId: currentNonStriker,
      currentNonStrikerId: currentStriker,
    }).where(eq(innings.id, inningsId));

    return await getLiveScoreData(inn.matchId);
  } catch (error) {
    console.error('Error switching striker:', error);
    throw new Error('Failed to switch striker', { cause: error });
  }
}

export async function changeBowler(inningsId: number, newBowlerId: number) {
  try {
    const innList = await db.select().from(innings).where(eq(innings.id, inningsId)).limit(1);
    if (!innList[0]) throw new Error('Innings not found');
    const inn = innList[0];

    await db.update(innings).set({
      currentBowlerId: newBowlerId,
    }).where(eq(innings.id, inningsId));

    return await getLiveScoreData(inn.matchId);
  } catch (error) {
    console.error('Error changing bowler:', error);
    throw new Error('Failed to change bowler', { cause: error });
  }
}

export async function setBatter(inningsId: number, options: { strikerId?: number; nonStrikerId?: number }) {
  try {
    const innList = await db.select().from(innings).where(eq(innings.id, inningsId)).limit(1);
    if (!innList[0]) throw new Error('Innings not found');
    const inn = innList[0];

    const updateData: any = {};
    if (options.strikerId !== undefined) updateData.currentStrikerId = options.strikerId;
    if (options.nonStrikerId !== undefined) updateData.currentNonStrikerId = options.nonStrikerId;

    await db.update(innings).set(updateData).where(eq(innings.id, inningsId));
    return await getLiveScoreData(inn.matchId);
  } catch (error) {
    console.error('Error setting batter:', error);
    throw new Error('Failed to set batter', { cause: error });
  }
}

export async function endInnings(matchId: number, inningsNumber: number, nextOptions?: {
  strikerId: number;
  nonStrikerId: number;
  bowlerId: number;
}) {
  try {
    const match = await getMatchById(matchId);
    if (!match) throw new Error('Match not found');

    const currentInnList = await db.select().from(innings).where(
      and(eq(innings.matchId, matchId), eq(innings.inningsNumber, inningsNumber))
    ).limit(1);

    if (currentInnList[0]) {
      await db.update(innings).set({ isCompleted: true }).where(eq(innings.id, currentInnList[0].id));
    }

    if (inningsNumber === 1) {
      // Transition to innings 2 or innings break
      const firstInn = currentInnList[0];
      const battingTeamId = firstInn.bowlingTeamId;
      const bowlingTeamId = firstInn.battingTeamId;

      if (nextOptions) {
        // Start 2nd innings immediately
        await db.insert(innings).values({
          matchId,
          inningsNumber: 2,
          battingTeamId,
          bowlingTeamId,
          totalRuns: 0,
          totalWickets: 0,
          legalBalls: 0,
          totalExtras: 0,
          wides: 0,
          noBalls: 0,
          byes: 0,
          legByes: 0,
          isCompleted: false,
          currentStrikerId: nextOptions.strikerId,
          currentNonStrikerId: nextOptions.nonStrikerId,
          currentBowlerId: nextOptions.bowlerId,
        });

        await db.update(matches).set({
          status: 'live',
          currentInnings: 2,
        }).where(eq(matches.id, matchId));
      } else {
        await db.update(matches).set({
          status: 'innings_break',
          currentInnings: 2,
        }).where(eq(matches.id, matchId));
      }
    } else {
      // 2nd innings ended -> Final match result
      await completeMatchCalculation(matchId);
    }

    return await getLiveScoreData(matchId);
  } catch (error) {
    console.error('Error ending innings:', error);
    throw new Error('Failed to end innings', { cause: error });
  }
}

export async function startSecondInnings(matchId: number, options: {
  strikerId: number;
  nonStrikerId: number;
  bowlerId: number;
}) {
  return endInnings(matchId, 1, options);
}

// ----------------------------------------------------
// INTERNAL RECALCULATION & LOGIC
// ----------------------------------------------------
async function recalculateInningsState(inningsId: number, hints?: {
  newStrikerId?: number;
  newBowlerId?: number;
  justDismissedPlayerId?: number;
}) {
  const innList = await db.select().from(innings).where(eq(innings.id, inningsId)).limit(1);
  if (!innList[0]) return;
  const inn = innList[0];

  const allBalls = await db.select().from(balls).where(eq(balls.inningsId, inningsId)).orderBy(balls.id);

  let totalRuns = 0;
  let totalWickets = 0;
  let legalBalls = 0;
  let totalExtras = 0;
  let wides = 0;
  let noBalls = 0;
  let byes = 0;
  let legByes = 0;

  // Track striker and non-striker
  let strikerId = inn.currentStrikerId;
  let nonStrikerId = inn.currentNonStrikerId;
  let bowlerId = inn.currentBowlerId;

  if (allBalls.length > 0) {
    // Replay from initial configuration
    const firstBall = allBalls[0];
    strikerId = firstBall.strikerId;
    nonStrikerId = firstBall.nonStrikerId;
    bowlerId = firstBall.bowlerId;

    for (let i = 0; i < allBalls.length; i++) {
      const b = allBalls[i];
      const deliveryRuns = b.runsOffBat + b.extraRuns;
      totalRuns += deliveryRuns;

      if (b.extraType === 'wide') {
        wides += b.extraRuns;
        totalExtras += b.extraRuns;
      } else if (b.extraType === 'no_ball') {
        noBalls += b.extraRuns;
        totalExtras += b.extraRuns;
      } else if (b.extraType === 'bye') {
        byes += b.extraRuns;
        totalExtras += b.extraRuns;
      } else if (b.extraType === 'leg_bye') {
        legByes += b.extraRuns;
        totalExtras += b.extraRuns;
      }

      if (b.isLegalDelivery) {
        legalBalls++;
      }

      if (b.isWicket) {
        totalWickets++;
      }

      // Check strike rotation for this ball
      strikerId = b.strikerId;
      nonStrikerId = b.nonStrikerId;
      bowlerId = b.bowlerId;

      // Strike rotation rules:
      // Odd runs off bat or odd byes/leg-byes swap ends
      const runsToRotate = (b.extraType === 'bye' || b.extraType === 'leg_bye')
        ? b.extraRuns
        : b.runsOffBat;

      if (runsToRotate % 2 !== 0) {
        const temp = strikerId;
        strikerId = nonStrikerId;
        nonStrikerId = temp;
      }

      // If wicket fell on this ball
      if (b.isWicket) {
        const dismissed = b.dismissedPlayerId || b.strikerId;
        if (i === allBalls.length - 1 && hints?.newStrikerId) {
          if (dismissed === strikerId) {
            strikerId = hints.newStrikerId;
          } else {
            nonStrikerId = hints.newStrikerId;
          }
        }
      }

      // End of over rotation
      if (b.isLegalDelivery && (legalBalls % 6 === 0)) {
        const temp = strikerId;
        strikerId = nonStrikerId;
        nonStrikerId = temp;
        if (i === allBalls.length - 1 && hints?.newBowlerId) {
          bowlerId = hints.newBowlerId;
        }
      }
    }
  }

  if (hints?.newStrikerId && (!strikerId || strikerId === hints.justDismissedPlayerId)) {
    strikerId = hints.newStrikerId;
  }
  if (hints?.newBowlerId) {
    bowlerId = hints.newBowlerId;
  }

  await db.update(innings).set({
    totalRuns,
    totalWickets,
    legalBalls,
    totalExtras,
    wides,
    noBalls,
    byes,
    legByes,
    currentStrikerId: strikerId,
    currentNonStrikerId: nonStrikerId,
    currentBowlerId: bowlerId,
  }).where(eq(innings.id, inningsId));
}

async function checkMatchStatusAfterBall(matchId: number, inningsId: number) {
  const match = await getMatchById(matchId);
  if (!match) return;

  const allInnings = await db.select().from(innings).where(eq(innings.matchId, matchId)).orderBy(innings.inningsNumber);
  const currentInn = allInnings.find((i) => i.id === inningsId);
  if (!currentInn) return;

  const squads = await db.select().from(matchSquads).where(
    and(eq(matchSquads.matchId, matchId), eq(matchSquads.teamId, currentInn.battingTeamId))
  );

  const battingSquadSize = Math.max(squads.length, 11);
  const maxWickets = battingSquadSize - 1;
  const maxLegalBalls = match.totalOvers * 6;

  const isAllOut = currentInn.totalWickets >= maxWickets;
  const isOversFinished = currentInn.legalBalls >= maxLegalBalls;

  if (match.currentInnings === 1) {
    if (isAllOut || isOversFinished) {
      await db.update(innings).set({ isCompleted: true }).where(eq(innings.id, currentInn.id));
      await db.update(matches).set({ status: 'innings_break' }).where(eq(matches.id, matchId));
    }
  } else if (match.currentInnings === 2) {
    const firstInn = allInnings.find((i) => i.inningsNumber === 1);
    if (!firstInn) return;

    const target = firstInn.totalRuns + 1;
    const chasedDown = currentInn.totalRuns >= target;

    if (chasedDown || isAllOut || isOversFinished) {
      await db.update(innings).set({ isCompleted: true }).where(eq(innings.id, currentInn.id));
      await completeMatchCalculation(matchId);
    }
  }
}

async function completeMatchCalculation(matchId: number) {
  const match = await getMatchById(matchId);
  if (!match) return;

  const innList = await db.select().from(innings).where(eq(innings.matchId, matchId)).orderBy(innings.inningsNumber);
  if (innList.length < 2) return;

  const inn1 = innList[0];
  const inn2 = innList[1];

  let winnerTeamId: number | null = null;
  let resultMargin = '';
  let resultSummary = '';

  const team1 = await db.select().from(teams).where(eq(teams.id, inn1.battingTeamId)).limit(1);
  const team2 = await db.select().from(teams).where(eq(teams.id, inn2.battingTeamId)).limit(1);

  const t1Name = team1[0]?.name || 'Team 1';
  const t2Name = team2[0]?.name || 'Team 2';

  if (inn2.totalRuns > inn1.totalRuns) {
    // 2nd batting team won
    winnerTeamId = inn2.battingTeamId;
    const squads = await db.select().from(matchSquads).where(
      and(eq(matchSquads.matchId, matchId), eq(matchSquads.teamId, inn2.battingTeamId))
    );
    const maxW = Math.max(squads.length, 11) - 1;
    const wicketsLeft = maxW - inn2.totalWickets;
    resultMargin = `${wicketsLeft} wicket${wicketsLeft === 1 ? '' : 's'}`;
    resultSummary = `${t2Name} won by ${resultMargin}`;
  } else if (inn1.totalRuns > inn2.totalRuns) {
    // 1st batting team won
    winnerTeamId = inn1.battingTeamId;
    const runsMargin = inn1.totalRuns - inn2.totalRuns;
    resultMargin = `${runsMargin} run${runsMargin === 1 ? '' : 's'}`;
    resultSummary = `${t1Name} won by ${resultMargin}`;
  } else {
    // Tie
    winnerTeamId = null;
    resultMargin = 'Match Tied';
    resultSummary = `Match Tied (${t1Name} ${inn1.totalRuns}/${inn1.totalWickets} vs ${t2Name} ${inn2.totalRuns}/${inn2.totalWickets})`;
  }

  await db.update(matches).set({
    status: 'completed',
    winnerTeamId,
    resultMargin,
    resultSummary,
  }).where(eq(matches.id, matchId));
}

function generateCommentary(ball: {
  runsOffBat: number;
  extraRuns: number;
  extraType: string;
  isWicket: boolean;
  wicketType?: string;
}): string {
  if (ball.isWicket) {
    return `WICKET! ${ball.wicketType ? ball.wicketType.toUpperCase() : 'OUT'}`;
  }
  if (ball.extraType === 'wide') {
    return `Wide delivery, +${ball.extraRuns} extra run${ball.extraRuns > 1 ? 's' : ''}`;
  }
  if (ball.extraType === 'no_ball') {
    return `No ball called! +${ball.extraRuns} extra run${ball.extraRuns > 1 ? 's' : ''}`;
  }
  if (ball.extraType === 'bye') {
    return `${ball.extraRuns} bye${ball.extraRuns > 1 ? 's' : ''}`;
  }
  if (ball.extraType === 'leg_bye') {
    return `${ball.extraRuns} leg bye${ball.extraRuns > 1 ? 's' : ''}`;
  }
  if (ball.runsOffBat === 6) return 'SIX! Maximum over the boundary!';
  if (ball.runsOffBat === 4) return 'FOUR! Crisp shot finds the fence!';
  if (ball.runsOffBat === 0) return 'Dot ball, solid defense.';
  return `${ball.runsOffBat} run${ball.runsOffBat > 1 ? 's' : ''} taken.`;
}

// ----------------------------------------------------
// SCORECARD GENERATION
// ----------------------------------------------------
export async function calculateInningsScorecard(inningsId: number) {
  const innList = await db.select().from(innings).where(eq(innings.id, inningsId)).limit(1);
  if (!innList[0]) return null;
  const inn = innList[0];

  const match = await getMatchById(inn.matchId);
  const battingTeam = await db.select().from(teams).where(eq(teams.id, inn.battingTeamId)).limit(1);
  const bowlingTeam = await db.select().from(teams).where(eq(teams.id, inn.bowlingTeamId)).limit(1);

  const allBalls = await db.select().from(balls).where(eq(balls.inningsId, inningsId)).orderBy(balls.id);

  // Group by batter
  const battersMap = new Map<number, {
    playerId: number;
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    isOut: boolean;
    dismissalText: string;
    bowlerName?: string;
    fielderName?: string;
  }>();

  // Group by bowler
  const bowlersMap = new Map<number, {
    playerId: number;
    name: string;
    legalBalls: number;
    runsConceded: number;
    wickets: number;
    maidens: number;
    wides: number;
    noBalls: number;
    overBreakdown: Map<number, number>; // overNumber -> runs in that over
  }>();

  // Fall of wickets
  const fallOfWickets: {
    wicketNumber: number;
    score: number;
    over: string;
    playerName: string;
  }[] = [];

  // Fetch player details cache
  const playerIds = new Set<number>();
  allBalls.forEach((b) => {
    playerIds.add(b.strikerId);
    playerIds.add(b.nonStrikerId);
    playerIds.add(b.bowlerId);
    if (b.dismissedPlayerId) playerIds.add(b.dismissedPlayerId);
    if (b.fielderId) playerIds.add(b.fielderId);
  });

  // Also include current striker/non-striker
  if (inn.currentStrikerId) playerIds.add(inn.currentStrikerId);
  if (inn.currentNonStrikerId) playerIds.add(inn.currentNonStrikerId);
  if (inn.currentBowlerId) playerIds.add(inn.currentBowlerId);

  const playerDetailsList = playerIds.size > 0
    ? await db.select().from(players).where(inArray(players.id, Array.from(playerIds)))
    : [];

  const playerNames = new Map<number, string>();
  playerDetailsList.forEach((p) => playerNames.set(p.id, p.name));

  // Ensure current strikers are in batting list even before facing a ball
  if (inn.currentStrikerId) {
    battersMap.set(inn.currentStrikerId, {
      playerId: inn.currentStrikerId,
      name: playerNames.get(inn.currentStrikerId) || 'Striker',
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      dismissalText: 'not out',
    });
  }
  if (inn.currentNonStrikerId) {
    battersMap.set(inn.currentNonStrikerId, {
      playerId: inn.currentNonStrikerId,
      name: playerNames.get(inn.currentNonStrikerId) || 'Non-Striker',
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      dismissalText: 'not out',
    });
  }

  let runningScore = 0;
  let runningWickets = 0;
  let runningLegalBalls = 0;

  for (const b of allBalls) {
    runningScore += (b.runsOffBat + b.extraRuns);
    if (b.isLegalDelivery) runningLegalBalls++;

    // Batter stats
    if (!battersMap.has(b.strikerId)) {
      battersMap.set(b.strikerId, {
        playerId: b.strikerId,
        name: playerNames.get(b.strikerId) || `Player #${b.strikerId}`,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
        dismissalText: 'not out',
      });
    }

    const batter = battersMap.get(b.strikerId)!;
    batter.runs += b.runsOffBat;
    if (b.extraType !== 'wide') {
      batter.balls += 1; // Wide does not count as ball faced
    }
    if (b.runsOffBat === 4) batter.fours += 1;
    if (b.runsOffBat === 6) batter.sixes += 1;

    // Bowler stats
    if (!bowlersMap.has(b.bowlerId)) {
      bowlersMap.set(b.bowlerId, {
        playerId: b.bowlerId,
        name: playerNames.get(b.bowlerId) || `Bowler #${b.bowlerId}`,
        legalBalls: 0,
        runsConceded: 0,
        wickets: 0,
        maidens: 0,
        wides: 0,
        noBalls: 0,
        overBreakdown: new Map(),
      });
    }

    const bowler = bowlersMap.get(b.bowlerId)!;
    if (b.isLegalDelivery) {
      bowler.legalBalls += 1;
    }
    // Runs charged to bowler: bat runs + wide/no-ball extras (byes and leg byes not charged)
    let bowlerChargedRuns = b.runsOffBat;
    if (b.extraType === 'wide' || b.extraType === 'no_ball') {
      bowlerChargedRuns += b.extraRuns;
      if (b.extraType === 'wide') bowler.wides += b.extraRuns;
      if (b.extraType === 'no_ball') bowler.noBalls += b.extraRuns;
    }
    bowler.runsConceded += bowlerChargedRuns;

    const currentOverRuns = (bowler.overBreakdown.get(b.overNumber) || 0) + bowlerChargedRuns;
    bowler.overBreakdown.set(b.overNumber, currentOverRuns);

    // Wicket handling
    if (b.isWicket) {
      runningWickets++;
      const dismissedId = b.dismissedPlayerId || b.strikerId;
      const dismissedBatter = battersMap.get(dismissedId);
      const bName = playerNames.get(b.bowlerId) || '';
      const fName = b.fielderId ? playerNames.get(b.fielderId) || '' : '';

      let text = 'out';
      if (b.wicketType === 'bowled') text = `b ${bName}`;
      else if (b.wicketType === 'caught') text = fName ? `c ${fName} b ${bName}` : `c & b ${bName}`;
      else if (b.wicketType === 'lbw') text = `lbw b ${bName}`;
      else if (b.wicketType === 'run_out') text = fName ? `run out (${fName})` : 'run out';
      else if (b.wicketType === 'stumped') text = fName ? `st ${fName} b ${bName}` : `st b ${bName}`;
      else if (b.wicketType === 'hit_wicket') text = `hit wicket b ${bName}`;
      else if (b.wicketType) text = `${b.wicketType}`;

      if (dismissedBatter) {
        dismissedBatter.isOut = true;
        dismissedBatter.dismissalText = text;
      }

      // Credited to bowler unless run out or retired hurt
      if (b.wicketType !== 'run_out' && b.wicketType !== 'retired_hurt') {
        bowler.wickets += 1;
      }

      fallOfWickets.push({
        wicketNumber: runningWickets,
        score: runningScore,
        over: `${Math.floor((runningLegalBalls - 1) / 6)}.${(runningLegalBalls - 1) % 6 + 1}`,
        playerName: playerNames.get(dismissedId) || 'Batter',
      });
    }
  }

  // Calculate maidens for bowlers
  bowlersMap.forEach((bowler) => {
    // If an over had 6 legal balls bowled by this bowler and 0 runs conceded
    let maidenCount = 0;
    bowler.overBreakdown.forEach((runs, overNum) => {
      const legalInThisOver = allBalls.filter((b) => b.bowlerId === bowler.playerId && b.overNumber === overNum && b.isLegalDelivery).length;
      if (legalInThisOver === 6 && runs === 0) {
        maidenCount++;
      }
    });
    bowler.maidens = maidenCount;
  });

  const battingStats = Array.from(battersMap.values()).map((b) => ({
    ...b,
    strikeRate: b.balls > 0 ? Number(((b.runs / b.balls) * 100).toFixed(2)) : 0,
  }));

  const bowlingStats = Array.from(bowlersMap.values()).map((b) => {
    const oversFloat = Math.floor(b.legalBalls / 6) + (b.legalBalls % 6) / 10;
    const oversText = `${Math.floor(b.legalBalls / 6)}.${b.legalBalls % 6}`;
    const economy = b.legalBalls > 0 ? Number(((b.runsConceded / (b.legalBalls / 6))).toFixed(2)) : 0;
    return {
      playerId: b.playerId,
      name: b.name,
      overs: oversText,
      legalBalls: b.legalBalls,
      maidens: b.maidens,
      runsConceded: b.runsConceded,
      wickets: b.wickets,
      economy,
      wides: b.wides,
      noBalls: b.noBalls,
    };
  });

  return {
    innings: inn,
    battingTeam: battingTeam[0] || null,
    bowlingTeam: bowlingTeam[0] || null,
    overs: `${Math.floor(inn.legalBalls / 6)}.${inn.legalBalls % 6}`,
    batting: battingStats,
    bowling: bowlingStats,
    fallOfWickets,
    extras: {
      total: inn.totalExtras,
      wides: inn.wides,
      noBalls: inn.noBalls,
      byes: inn.byes,
      legByes: inn.legByes,
    },
  };
}

// ----------------------------------------------------
// CAREER STATISTICS (SOURCE OF TRUTH: COMPLETED MATCHES & DELIVERIES)
// ----------------------------------------------------
export async function getPlayerCareerStats(playerId: number): Promise<PlayerCareerStats> {
  try {
    // 1. All matches played by player (where in squad or played)
    const squadMatches = await db.select({
      matchId: matchSquads.matchId,
    })
    .from(matchSquads)
    .innerJoin(matches, eq(matchSquads.matchId, matches.id))
    .where(and(eq(matchSquads.playerId, playerId), eq(matches.status, 'completed')));

    const distinctMatchIds = new Set(squadMatches.map((m) => m.matchId));

    // Also include completed matches where player faced ball or bowled
    const playedBalls = await db.select({
      matchId: balls.matchId,
    })
    .from(balls)
    .innerJoin(matches, eq(balls.matchId, matches.id))
    .where(
      and(
        sql`(${balls.strikerId} = ${playerId} OR ${balls.bowlerId} = ${playerId})`,
        eq(matches.status, 'completed')
      )
    );
    playedBalls.forEach((b) => distinctMatchIds.add(b.matchId));

    const totalMatches = distinctMatchIds.size;

    // 2. Batting career stats
    // Fetch all balls where player was striker in completed matches
    const strikerBalls = await db.select({
      id: balls.id,
      matchId: balls.matchId,
      inningsId: balls.inningsId,
      runsOffBat: balls.runsOffBat,
      extraType: balls.extraType,
    })
    .from(balls)
    .innerJoin(matches, eq(balls.matchId, matches.id))
    .where(
      and(
        eq(balls.strikerId, playerId),
        eq(matches.status, 'completed')
      )
    );

    let totalRuns = 0;
    let totalBallsFaced = 0;
    let fours = 0;
    let sixes = 0;

    // Group runs by innings to find highest score, 50s, 100s
    const runsPerInnings = new Map<number, number>();

    strikerBalls.forEach((b) => {
      totalRuns += b.runsOffBat;
      if (b.extraType !== 'wide') {
        totalBallsFaced += 1;
      }
      if (b.runsOffBat === 4) fours++;
      if (b.runsOffBat === 6) sixes++;

      runsPerInnings.set(b.inningsId, (runsPerInnings.get(b.inningsId) || 0) + b.runsOffBat);
    });

    // Dismissals in completed matches
    const dismissalsList = await db.select({
      id: balls.id,
      inningsId: balls.inningsId,
    })
    .from(balls)
    .innerJoin(matches, eq(balls.matchId, matches.id))
    .where(
      and(
        eq(balls.isWicket, true),
        eq(balls.dismissedPlayerId, playerId),
        eq(matches.status, 'completed')
      )
    );

    const dismissedInningsIds = new Set(dismissalsList.map((d) => d.inningsId));
    const totalDismissals = dismissalsList.length;

    // Distinct innings where batted
    const totalInningsBatted = runsPerInnings.size;
    const notOuts = Math.max(0, totalInningsBatted - dismissedInningsIds.size);

    let highestScore = 0;
    let highestScoreNotOut = false;
    let fifties = 0;
    let hundreds = 0;

    runsPerInnings.forEach((score, innId) => {
      const isNotOut = !dismissedInningsIds.has(innId);
      if (score > highestScore) {
        highestScore = score;
        highestScoreNotOut = isNotOut;
      }
      if (score >= 100) hundreds++;
      else if (score >= 50) fifties++;
    });

    const battingAvg = totalDismissals > 0
      ? Number((totalRuns / totalDismissals).toFixed(2))
      : totalRuns;

    const battingSR = totalBallsFaced > 0
      ? Number(((totalRuns / totalBallsFaced) * 100).toFixed(2))
      : 0;

    // 3. Bowling career stats
    const bowlerBalls = await db.select({
      id: balls.id,
      inningsId: balls.inningsId,
      overNumber: balls.overNumber,
      runsOffBat: balls.runsOffBat,
      extraRuns: balls.extraRuns,
      extraType: balls.extraType,
      isLegalDelivery: balls.isLegalDelivery,
      isWicket: balls.isWicket,
      wicketType: balls.wicketType,
    })
    .from(balls)
    .innerJoin(matches, eq(balls.matchId, matches.id))
    .where(
      and(
        eq(balls.bowlerId, playerId),
        eq(matches.status, 'completed')
      )
    );

    let bowlingBalls = 0;
    let runsConceded = 0;
    let wickets = 0;

    // Performance per innings to find best bowling, 4W, 5W, maidens
    const bowlingPerInnings = new Map<number, {
      wickets: number;
      runs: number;
      oversMap: Map<number, { legal: number; runs: number }>;
    }>();

    bowlerBalls.forEach((b) => {
      if (b.isLegalDelivery) bowlingBalls++;

      let charged = b.runsOffBat;
      if (b.extraType === 'wide' || b.extraType === 'no_ball') {
        charged += b.extraRuns;
      }
      runsConceded += charged;

      let isBowlerWicket = false;
      if (b.isWicket && b.wicketType !== 'run_out' && b.wicketType !== 'retired_hurt') {
        wickets++;
        isBowlerWicket = true;
      }

      if (!bowlingPerInnings.has(b.inningsId)) {
        bowlingPerInnings.set(b.inningsId, { wickets: 0, runs: 0, oversMap: new Map() });
      }
      const innData = bowlingPerInnings.get(b.inningsId)!;
      if (isBowlerWicket) innData.wickets++;
      innData.runs += charged;

      if (!innData.oversMap.has(b.overNumber)) {
        innData.oversMap.set(b.overNumber, { legal: 0, runs: 0 });
      }
      const overData = innData.oversMap.get(b.overNumber)!;
      if (b.isLegalDelivery) overData.legal++;
      overData.runs += charged;
    });

    let maidens = 0;
    let fourWickets = 0;
    let fiveWickets = 0;
    let bestBowlingW = 0;
    let bestBowlingR = 9999;
    let bestBowlingStr = '-';

    bowlingPerInnings.forEach((stat) => {
      if (stat.wickets >= 5) fiveWickets++;
      else if (stat.wickets === 4) fourWickets++;

      if (
        stat.wickets > bestBowlingW ||
        (stat.wickets === bestBowlingW && stat.runs < bestBowlingR && stat.wickets > 0)
      ) {
        bestBowlingW = stat.wickets;
        bestBowlingR = stat.runs;
        bestBowlingStr = `${stat.wickets}/${stat.runs}`;
      }

      stat.oversMap.forEach((o) => {
        if (o.legal === 6 && o.runs === 0) maidens++;
      });
    });

    const bowlingAvg = wickets > 0 ? Number((runsConceded / wickets).toFixed(2)) : 0;
    const bowlingSR = wickets > 0 ? Number((bowlingBalls / wickets).toFixed(2)) : 0;
    const economy = bowlingBalls > 0 ? Number((runsConceded / (bowlingBalls / 6)).toFixed(2)) : 0;
    const oversStr = `${Math.floor(bowlingBalls / 6)}.${bowlingBalls % 6}`;

    // 4. Fielding stats
    const fieldingEvents = await db.select({
      wicketType: balls.wicketType,
    })
    .from(balls)
    .innerJoin(matches, eq(balls.matchId, matches.id))
    .where(
      and(
        eq(balls.isWicket, true),
        eq(balls.fielderId, playerId),
        eq(matches.status, 'completed')
      )
    );

    let catches = 0;
    let runOuts = 0;
    let stumpings = 0;

    fieldingEvents.forEach((f) => {
      if (f.wicketType === 'caught') catches++;
      else if (f.wicketType === 'run_out') runOuts++;
      else if (f.wicketType === 'stumped') stumpings++;
    });

    return {
      batting: {
        matches: totalMatches,
        innings: totalInningsBatted,
        runs: totalRuns,
        balls: totalBallsFaced,
        highestScore,
        highestScoreNotOut,
        average: battingAvg,
        strikeRate: battingSR,
        fours,
        sixes,
        fifties,
        hundreds,
        notOuts,
        dismissals: totalDismissals,
      },
      bowling: {
        matches: totalMatches,
        overs: oversStr,
        balls: bowlingBalls,
        runsConceded,
        wickets,
        economy,
        average: bowlingAvg,
        strikeRate: bowlingSR,
        maidens,
        bestBowling: bestBowlingStr,
        fourWickets,
        fiveWickets,
      },
      fielding: {
        catches,
        runOuts,
        stumpings,
      },
    };
  } catch (error) {
    console.error(`Error calculating career stats for player ${playerId}:`, error);
    throw new Error('Failed to calculate player career stats', { cause: error });
  }
}

// ----------------------------------------------------
// PLAYER MATCH HISTORY
// ----------------------------------------------------
export async function getPlayerMatchHistory(playerId: number) {
  try {
    // Get all matches where player participated
    const matchSquadEntries = await db.select({
      matchId: matchSquads.matchId,
      teamId: matchSquads.teamId,
    })
    .from(matchSquads)
    .where(eq(matchSquads.playerId, playerId));

    const matchIds = Array.from(new Set(matchSquadEntries.map((e) => e.matchId)));
    if (matchIds.length === 0) return [];

    const matchList = await db.select().from(matches)
      .where(inArray(matches.id, matchIds))
      .orderBy(desc(matches.date), desc(matches.id));

    const history = await Promise.all(
      matchList.map(async (m) => {
        const t1 = await db.select().from(teams).where(eq(teams.id, m.team1Id)).limit(1);
        const t2 = await db.select().from(teams).where(eq(teams.id, m.team2Id)).limit(1);

        const mySquad = matchSquadEntries.find((e) => e.matchId === m.id);
        const myTeam = mySquad?.teamId === m.team1Id ? t1[0] : t2[0];
        const opponentTeam = mySquad?.teamId === m.team1Id ? t2[0] : t1[0];

        // Player's batting in this match
        const battingBalls = await db.select().from(balls).where(
          and(eq(balls.matchId, m.id), eq(balls.strikerId, playerId))
        );
        let runsScored = 0;
        let ballsFaced = 0;
        let fours = 0;
        let sixes = 0;

        battingBalls.forEach((b) => {
          runsScored += b.runsOffBat;
          if (b.extraType !== 'wide') ballsFaced++;
          if (b.runsOffBat === 4) fours++;
          if (b.runsOffBat === 6) sixes++;
        });

        const dismissed = await db.select().from(balls).where(
          and(eq(balls.matchId, m.id), eq(balls.isWicket, true), eq(balls.dismissedPlayerId, playerId))
        ).limit(1);
        const isNotOut = dismissed.length === 0 && (runsScored > 0 || ballsFaced > 0);

        // Player's bowling in this match
        const bowlingDeliveries = await db.select().from(balls).where(
          and(eq(balls.matchId, m.id), eq(balls.bowlerId, playerId))
        );

        let legalBalls = 0;
        let runsConceded = 0;
        let wickets = 0;

        bowlingDeliveries.forEach((b) => {
          if (b.isLegalDelivery) legalBalls++;
          let charged = b.runsOffBat;
          if (b.extraType === 'wide' || b.extraType === 'no_ball') charged += b.extraRuns;
          runsConceded += charged;
          if (b.isWicket && b.wicketType !== 'run_out' && b.wicketType !== 'retired_hurt') {
            wickets++;
          }
        });

        let result = 'Upcoming';
        if (m.status === 'completed') {
          if (m.winnerTeamId === myTeam?.id) result = 'Won';
          else if (m.winnerTeamId) result = 'Lost';
          else result = 'Tied';
        } else if (m.status === 'live') {
          result = 'Live';
        }

        return {
          matchId: m.id,
          date: m.date,
          venue: m.venue,
          myTeam: myTeam?.name || 'My Team',
          opponent: opponentTeam?.name || 'Opponent',
          batting: {
            runs: runsScored,
            balls: ballsFaced,
            fours,
            sixes,
            isNotOut,
            batted: ballsFaced > 0 || runsScored > 0 || dismissed.length > 0,
          },
          bowling: {
            overs: `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`,
            runs: runsConceded,
            wickets,
            bowled: legalBalls > 0,
          },
          result,
          summary: m.resultSummary || `${m.matchType} Match`,
        };
      })
    );

    return history;
  } catch (error) {
    console.error(`Error fetching match history for player ${playerId}:`, error);
    throw new Error('Failed to fetch player match history', { cause: error });
  }
}

// ----------------------------------------------------
// LEADERBOARDS & DASHBOARD STATS
// ----------------------------------------------------
export async function getLeaderboards() {
  try {
    const allPlayersList = await db.select().from(players);
    const playerStatsList = await Promise.all(
      allPlayersList.map(async (p) => {
        const stats = await getPlayerCareerStats(p.id);
        return {
          id: p.id,
          name: p.name,
          department: p.department,
          jerseyNumber: p.jerseyNumber,
          photoUrl: p.photoUrl,
          playerType: p.playerType,
          ...stats,
        };
      })
    );

    // Batting rankings (sorted by runs, then average, then SR)
    const battingLeaderboard = [...playerStatsList]
      .filter((p) => p.batting.innings > 0 || p.batting.runs > 0)
      .sort((a, b) => b.batting.runs - a.batting.runs || b.batting.average - a.batting.average);

    // Bowling rankings (sorted by wickets, then economy)
    const bowlingLeaderboard = [...playerStatsList]
      .filter((p) => p.bowling.balls > 0 || p.bowling.wickets > 0)
      .sort((a, b) => b.bowling.wickets - a.bowling.wickets || a.bowling.economy - b.bowling.economy);

    // Fielding rankings
    const fieldingLeaderboard = [...playerStatsList]
      .map((p) => ({
        ...p,
        totalDismissals: p.fielding.catches + p.fielding.runOuts + p.fielding.stumpings,
      }))
      .filter((p) => p.totalDismissals > 0)
      .sort((a, b) => b.totalDismissals - a.totalDismissals);

    return {
      batting: battingLeaderboard,
      bowling: bowlingLeaderboard,
      fielding: fieldingLeaderboard,
    };
  } catch (error) {
    console.error('Error calculating leaderboards:', error);
    throw new Error('Failed to calculate leaderboards', { cause: error });
  }
}

export async function getDashboardOverview() {
  try {
    const [playersCountRes] = await db.select({ count: sql<number>`count(*)` }).from(players);
    const [matchesCountRes] = await db.select({ count: sql<number>`count(*)` }).from(matches);
    const [teamsCountRes] = await db.select({ count: sql<number>`count(*)` }).from(teams);

    // Total runs and wickets across completed matches
    const completedMatches = await db.select().from(matches).where(eq(matches.status, 'completed'));
    const completedMatchIds = completedMatches.map((m) => m.id);

    let totalRuns = 0;
    let totalWickets = 0;

    if (completedMatchIds.length > 0) {
      const [runsWicketsRes] = await db.select({
        totalRuns: sql<number>`coalesce(sum(${balls.runsOffBat} + ${balls.extraRuns}), 0)`,
        totalWickets: sql<number>`coalesce(sum(case when ${balls.isWicket} then 1 else 0 end), 0)`,
      })
      .from(balls)
      .where(inArray(balls.matchId, completedMatchIds));

      totalRuns = Number(runsWicketsRes?.totalRuns || 0);
      totalWickets = Number(runsWicketsRes?.totalWickets || 0);
    }

    // Recent Matches
    const recentMatches = await db.select().from(matches)
      .orderBy(desc(matches.date), desc(matches.id))
      .limit(5);

    const enrichedRecentMatches = await Promise.all(
      recentMatches.map(async (m) => {
        const t1 = await db.select().from(teams).where(eq(teams.id, m.team1Id)).limit(1);
        const t2 = await db.select().from(teams).where(eq(teams.id, m.team2Id)).limit(1);
        const inn = await db.select().from(innings).where(eq(innings.matchId, m.id)).orderBy(innings.inningsNumber);
        return {
          ...m,
          team1: t1[0] || null,
          team2: t2[0] || null,
          innings: inn,
        };
      })
    );

    // Top performers
    const leaderboards = await getLeaderboards();
    const topRunScorer = leaderboards.batting[0] || null;
    const topWicketTaker = leaderboards.bowling[0] || null;

    // Highest individual score
    let highestScorePlayer: any = null;
    let maxScore = -1;
    leaderboards.batting.forEach((p) => {
      if (p.batting.highestScore > maxScore) {
        maxScore = p.batting.highestScore;
        highestScorePlayer = {
          name: p.name,
          score: p.batting.highestScore,
          isNotOut: p.batting.highestScoreNotOut,
          department: p.department,
        };
      }
    });

    // Best bowling figures
    let bestBowlingPlayer: any = null;
    let maxW = 0;
    leaderboards.bowling.forEach((p) => {
      if (p.bowling.bestBowling && p.bowling.bestBowling !== '-') {
        const [w] = p.bowling.bestBowling.split('/').map(Number);
        if (w >= maxW) {
          maxW = w;
          bestBowlingPlayer = {
            name: p.name,
            figures: p.bowling.bestBowling,
            department: p.department,
          };
        }
      }
    });

    return {
      totals: {
        totalPlayers: Number(playersCountRes?.count || 0),
        totalMatches: Number(matchesCountRes?.count || 0),
        totalCompletedMatches: completedMatches.length,
        totalTeams: Number(teamsCountRes?.count || 0),
        totalRuns,
        totalWickets,
      },
      topRunScorer: topRunScorer ? {
        name: topRunScorer.name,
        runs: topRunScorer.batting.runs,
        matches: topRunScorer.batting.matches,
        average: topRunScorer.batting.average,
        strikeRate: topRunScorer.batting.strikeRate,
      } : null,
      topWicketTaker: topWicketTaker ? {
        name: topWicketTaker.name,
        wickets: topWicketTaker.bowling.wickets,
        matches: topWicketTaker.bowling.matches,
        economy: topWicketTaker.bowling.economy,
        bestBowling: topWicketTaker.bowling.bestBowling,
      } : null,
      highestIndividualScore: highestScorePlayer,
      bestBowling: bestBowlingPlayer,
      recentMatches: enrichedRecentMatches,
    };
  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    throw new Error('Failed to get dashboard overview', { cause: error });
  }
}

// ----------------------------------------------------
// DEMO DATA SEEDER & MANAGEMENT
// ----------------------------------------------------
export async function seedDemoData() {
  try {
    // Check if demo players already exist
    const existingDemo = await db.select().from(players).where(eq(players.isDemo, true)).limit(1);
    if (existingDemo.length > 0) {
      return { message: 'Demo data already exists' };
    }

    // 1. Create 10 demo players
    const demoPlayerInputs = [
      {
        name: 'Suraj Kumar',
        employeeId: 'FFC-101',
        department: 'Engineering',
        designation: 'Lead Architect',
        jerseyNumber: 18,
        battingStyle: 'Right Hand',
        bowlingStyle: 'Right Arm Medium',
        playerType: 'All-Rounder',
        phone: '+91 98765 43210',
        joiningDate: '2023-01-15',
        bio: 'Aggressive top-order batter and reliable death-overs bowler.',
        isDemo: true,
      },
      {
        name: 'Rahul Sharma',
        employeeId: 'FFC-102',
        department: 'Product',
        designation: 'Product Manager',
        jerseyNumber: 7,
        battingStyle: 'Right Hand',
        bowlingStyle: 'Right Arm Spin',
        playerType: 'Batsman',
        phone: '+91 98765 43211',
        joiningDate: '2023-03-20',
        bio: 'Dependable opening batter with solid technique and temperament.',
        isDemo: true,
      },
      {
        name: 'Amit Patel',
        employeeId: 'FFC-103',
        department: 'Operations',
        designation: 'Operations Specialist',
        jerseyNumber: 99,
        battingStyle: 'Right Hand',
        bowlingStyle: 'Right Arm Fast',
        playerType: 'Bowler',
        phone: '+91 98765 43212',
        joiningDate: '2023-05-10',
        bio: 'Express pace bowler known for deadly yorkers and early breakthroughs.',
        isDemo: true,
      },
      {
        name: 'Vikram Singh',
        employeeId: 'FFC-104',
        department: 'Engineering',
        designation: 'Backend Developer',
        jerseyNumber: 45,
        battingStyle: 'Right Hand',
        bowlingStyle: 'Right Arm Spin',
        playerType: 'All-Rounder',
        phone: '+91 98765 43213',
        joiningDate: '2023-07-01',
        bio: 'Middle-order finisher and handy off-spin bowler in middle overs.',
        isDemo: true,
      },
      {
        name: 'Rohan Deshmukh',
        employeeId: 'FFC-105',
        department: 'Design',
        designation: 'UI/UX Designer',
        jerseyNumber: 12,
        battingStyle: 'Left Hand',
        bowlingStyle: 'Left Arm Fast',
        playerType: 'Bowler',
        phone: '+91 98765 43214',
        joiningDate: '2023-08-15',
        bio: 'Left-arm swing bowler with tricky inswingers and lower-order hitting.',
        isDemo: true,
      },
      {
        name: 'Karthik Raja',
        employeeId: 'FFC-106',
        department: 'Quality Assurance',
        designation: 'QA Lead',
        jerseyNumber: 1,
        battingStyle: 'Right Hand',
        bowlingStyle: 'None',
        playerType: 'Wicket Keeper',
        phone: '+91 98765 43215',
        joiningDate: '2023-09-01',
        bio: 'Acrobatic wicket keeper with lightning stumpings and clean striking.',
        isDemo: true,
      },
      {
        name: 'Manish Verma',
        employeeId: 'FFC-107',
        department: 'Engineering',
        designation: 'Frontend Engineer',
        jerseyNumber: 33,
        battingStyle: 'Left Hand',
        bowlingStyle: 'Left Arm Spin',
        playerType: 'Batsman',
        phone: '+91 98765 43216',
        joiningDate: '2024-01-10',
        bio: 'Elegant left-handed stroke player with an array of cover drives.',
        isDemo: true,
      },
      {
        name: 'Deepak Joshi',
        employeeId: 'FFC-108',
        department: 'Finance',
        designation: 'Financial Analyst',
        jerseyNumber: 24,
        battingStyle: 'Right Hand',
        bowlingStyle: 'Right Arm Medium',
        playerType: 'Bowler',
        phone: '+91 98765 43217',
        joiningDate: '2024-02-15',
        bio: 'Accurate medium pacer who relies on line, length, and cutter variations.',
        isDemo: true,
      },
      {
        name: 'Suresh Raina',
        employeeId: 'FFC-109',
        department: 'HR & People',
        designation: 'HR Partner',
        jerseyNumber: 3,
        battingStyle: 'Left Hand',
        bowlingStyle: 'Right Arm Spin',
        playerType: 'All-Rounder',
        phone: '+91 98765 43218',
        joiningDate: '2024-03-01',
        bio: 'High energy team motivator, gun fielder inside the circle.',
        isDemo: true,
      },
      {
        name: 'Nitin Gupta',
        employeeId: 'FFC-110',
        department: 'Marketing',
        designation: 'Growth Marketer',
        jerseyNumber: 10,
        battingStyle: 'Right Hand',
        bowlingStyle: 'None',
        playerType: 'Batsman',
        phone: '+91 98765 43219',
        joiningDate: '2024-04-10',
        bio: 'Hard-hitting power hitter capable of clearing boundaries at will.',
        isDemo: true,
      },
    ];

    const insertedPlayers = await db.insert(players).values(demoPlayerInputs).returning();

    // 2. Create 2 demo teams
    const team1Res = await db.insert(teams).values({
      name: 'FFC Warriors',
      shortName: 'FFC-W',
      color: '#15803d', // Green
      captainId: insertedPlayers[0].id, // Suraj
      viceCaptainId: insertedPlayers[1].id, // Rahul
      isDemo: true,
    }).returning();
    const team1 = team1Res[0];

    const team2Res = await db.insert(teams).values({
      name: 'FFC Strikers',
      shortName: 'FFC-S',
      color: '#0369a1', // Blue
      captainId: insertedPlayers[2].id, // Amit
      viceCaptainId: insertedPlayers[3].id, // Vikram
      isDemo: true,
    }).returning();
    const team2 = team2Res[0];

    // Link players to teams (5 each)
    const t1Players = insertedPlayers.slice(0, 5);
    const t2Players = insertedPlayers.slice(5, 10);

    await db.insert(teamPlayers).values([
      ...t1Players.map((p) => ({ teamId: team1.id, playerId: p.id })),
      ...t2Players.map((p) => ({ teamId: team2.id, playerId: p.id })),
    ]);

    // 3. Create 3 demo matches
    // Match 1: Completed T10 thriller
    const m1Res = await db.insert(matches).values({
      title: 'FFC Championship Match 1',
      matchType: 'T10',
      matchFormat: 'Tennis Ball',
      totalOvers: 5,
      venue: 'FFC Turf Ground, Bengaluru',
      date: '2026-09-20',
      team1Id: team1.id,
      team2Id: team2.id,
      team1CaptainId: insertedPlayers[0].id,
      team2CaptainId: insertedPlayers[2].id,
      tossWinnerId: team1.id,
      tossDecision: 'bat',
      status: 'completed',
      currentInnings: 2,
      winnerTeamId: team1.id,
      resultMargin: '18 runs',
      resultSummary: 'FFC Warriors won by 18 runs',
      isDemo: true,
    }).returning();
    const match1 = m1Res[0];

    // Squads for match 1
    await db.insert(matchSquads).values([
      ...t1Players.map((p) => ({ matchId: match1.id, teamId: team1.id, playerId: p.id })),
      ...t2Players.map((p) => ({ matchId: match1.id, teamId: team2.id, playerId: p.id })),
    ]);

    // Innings 1 for Match 1: FFC Warriors scored 54/2 in 5 overs
    const inn1Res = await db.insert(innings).values({
      matchId: match1.id,
      inningsNumber: 1,
      battingTeamId: team1.id,
      bowlingTeamId: team2.id,
      totalRuns: 54,
      totalWickets: 2,
      legalBalls: 30,
      totalExtras: 3,
      wides: 2,
      noBalls: 1,
      isCompleted: true,
      currentStrikerId: insertedPlayers[0].id,
      currentNonStrikerId: insertedPlayers[1].id,
      currentBowlerId: insertedPlayers[5].id,
    }).returning();
    const inn1 = inn1Res[0];

    // Generate realistic ball data for Innings 1
    const pSuraj = insertedPlayers[0];
    const pRahul = insertedPlayers[1];
    const pAmitBowler = insertedPlayers[6]; // Deepak
    const pRohanBowler = insertedPlayers[7]; // Suresh

    const ballsInn1 = [
      // Over 0
      { overNumber: 0, ballNumberInOver: 1, strikerId: pSuraj.id, nonStrikerId: pRahul.id, bowlerId: pAmitBowler.id, runsOffBat: 4, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 0, ballNumberInOver: 2, strikerId: pSuraj.id, nonStrikerId: pRahul.id, bowlerId: pAmitBowler.id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 0, ballNumberInOver: 3, strikerId: pRahul.id, nonStrikerId: pSuraj.id, bowlerId: pAmitBowler.id, runsOffBat: 0, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 0, ballNumberInOver: 4, strikerId: pRahul.id, nonStrikerId: pSuraj.id, bowlerId: pAmitBowler.id, runsOffBat: 2, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 0, ballNumberInOver: 5, strikerId: pRahul.id, nonStrikerId: pSuraj.id, bowlerId: pAmitBowler.id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 0, ballNumberInOver: 6, strikerId: pSuraj.id, nonStrikerId: pRahul.id, bowlerId: pAmitBowler.id, runsOffBat: 6, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      // Over 1
      { overNumber: 1, ballNumberInOver: 1, strikerId: pRahul.id, nonStrikerId: pSuraj.id, bowlerId: pRohanBowler.id, runsOffBat: 0, extraRuns: 1, extraType: 'wide', isLegalDelivery: false, isWicket: false },
      { overNumber: 1, ballNumberInOver: 1, strikerId: pRahul.id, nonStrikerId: pSuraj.id, bowlerId: pRohanBowler.id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 1, ballNumberInOver: 2, strikerId: pSuraj.id, nonStrikerId: pRahul.id, bowlerId: pRohanBowler.id, runsOffBat: 4, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 1, ballNumberInOver: 3, strikerId: pSuraj.id, nonStrikerId: pRahul.id, bowlerId: pRohanBowler.id, runsOffBat: 0, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: true, wicketType: 'caught', dismissedPlayerId: pSuraj.id, fielderId: insertedPlayers[5].id },
      { overNumber: 1, ballNumberInOver: 4, strikerId: insertedPlayers[3].id, nonStrikerId: pRahul.id, bowlerId: pRohanBowler.id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 1, ballNumberInOver: 5, strikerId: pRahul.id, nonStrikerId: insertedPlayers[3].id, bowlerId: pRohanBowler.id, runsOffBat: 4, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 1, ballNumberInOver: 6, strikerId: pRahul.id, nonStrikerId: insertedPlayers[3].id, bowlerId: pRohanBowler.id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      // Over 2 to 4 summarized into legal deliveries
      { overNumber: 2, ballNumberInOver: 1, strikerId: pRahul.id, nonStrikerId: insertedPlayers[3].id, bowlerId: pAmitBowler.id, runsOffBat: 6, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 2, ballNumberInOver: 2, strikerId: pRahul.id, nonStrikerId: insertedPlayers[3].id, bowlerId: pAmitBowler.id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 2, ballNumberInOver: 3, strikerId: insertedPlayers[3].id, nonStrikerId: pRahul.id, bowlerId: pAmitBowler.id, runsOffBat: 2, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 2, ballNumberInOver: 4, strikerId: insertedPlayers[3].id, nonStrikerId: pRahul.id, bowlerId: pAmitBowler.id, runsOffBat: 0, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: true, wicketType: 'bowled', dismissedPlayerId: insertedPlayers[3].id },
      { overNumber: 2, ballNumberInOver: 5, strikerId: insertedPlayers[4].id, nonStrikerId: pRahul.id, bowlerId: pAmitBowler.id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 2, ballNumberInOver: 6, strikerId: pRahul.id, nonStrikerId: insertedPlayers[4].id, bowlerId: pAmitBowler.id, runsOffBat: 2, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      // Over 3
      { overNumber: 3, ballNumberInOver: 1, strikerId: insertedPlayers[4].id, nonStrikerId: pRahul.id, bowlerId: pRohanBowler.id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 3, ballNumberInOver: 2, strikerId: pRahul.id, nonStrikerId: insertedPlayers[4].id, bowlerId: pRohanBowler.id, runsOffBat: 4, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 3, ballNumberInOver: 3, strikerId: pRahul.id, nonStrikerId: insertedPlayers[4].id, bowlerId: pRohanBowler.id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 3, ballNumberInOver: 4, strikerId: insertedPlayers[4].id, nonStrikerId: pRahul.id, bowlerId: pRohanBowler.id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 3, ballNumberInOver: 5, strikerId: pRahul.id, nonStrikerId: insertedPlayers[4].id, bowlerId: pRohanBowler.id, runsOffBat: 2, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 3, ballNumberInOver: 6, strikerId: pRahul.id, nonStrikerId: insertedPlayers[4].id, bowlerId: pRohanBowler.id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      // Over 4
      { overNumber: 4, ballNumberInOver: 1, strikerId: pRahul.id, nonStrikerId: insertedPlayers[4].id, bowlerId: pAmitBowler.id, runsOffBat: 0, extraRuns: 1, extraType: 'no_ball', isLegalDelivery: false, isWicket: false },
      { overNumber: 4, ballNumberInOver: 1, strikerId: pRahul.id, nonStrikerId: insertedPlayers[4].id, bowlerId: pAmitBowler.id, runsOffBat: 0, extraRuns: 1, extraType: 'wide', isLegalDelivery: false, isWicket: false },
      { overNumber: 4, ballNumberInOver: 1, strikerId: pRahul.id, nonStrikerId: insertedPlayers[4].id, bowlerId: pAmitBowler.id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 4, ballNumberInOver: 2, strikerId: insertedPlayers[4].id, nonStrikerId: pRahul.id, bowlerId: pAmitBowler.id, runsOffBat: 2, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 4, ballNumberInOver: 3, strikerId: insertedPlayers[4].id, nonStrikerId: pRahul.id, bowlerId: pAmitBowler.id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 4, ballNumberInOver: 4, strikerId: pRahul.id, nonStrikerId: insertedPlayers[4].id, bowlerId: pAmitBowler.id, runsOffBat: 0, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 4, ballNumberInOver: 5, strikerId: pRahul.id, nonStrikerId: insertedPlayers[4].id, bowlerId: pAmitBowler.id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 4, ballNumberInOver: 6, strikerId: insertedPlayers[4].id, nonStrikerId: pRahul.id, bowlerId: pAmitBowler.id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
    ];

    await db.insert(balls).values(
      ballsInn1.map((b) => ({
        ...b,
        matchId: match1.id,
        inningsId: inn1.id,
        commentary: generateCommentary(b),
      }))
    );

    // Innings 2 for Match 1: FFC Strikers managed 36/4 in 5 overs
    const inn2Res = await db.insert(innings).values({
      matchId: match1.id,
      inningsNumber: 2,
      battingTeamId: team2.id,
      bowlingTeamId: team1.id,
      totalRuns: 36,
      totalWickets: 4,
      legalBalls: 30,
      totalExtras: 2,
      wides: 2,
      noBalls: 0,
      isCompleted: true,
      currentStrikerId: insertedPlayers[5].id,
      currentNonStrikerId: insertedPlayers[6].id,
      currentBowlerId: insertedPlayers[0].id,
    }).returning();
    const inn2 = inn2Res[0];

    const ballsInn2 = [
      // Suraj bowls Over 0 (takes 2 wickets for 4 runs!)
      { overNumber: 0, ballNumberInOver: 1, strikerId: insertedPlayers[5].id, nonStrikerId: insertedPlayers[6].id, bowlerId: insertedPlayers[0].id, runsOffBat: 0, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: true, wicketType: 'bowled', dismissedPlayerId: insertedPlayers[5].id },
      { overNumber: 0, ballNumberInOver: 2, strikerId: insertedPlayers[7].id, nonStrikerId: insertedPlayers[6].id, bowlerId: insertedPlayers[0].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 0, ballNumberInOver: 3, strikerId: insertedPlayers[6].id, nonStrikerId: insertedPlayers[7].id, bowlerId: insertedPlayers[0].id, runsOffBat: 0, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 0, ballNumberInOver: 4, strikerId: insertedPlayers[6].id, nonStrikerId: insertedPlayers[7].id, bowlerId: insertedPlayers[0].id, runsOffBat: 0, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: true, wicketType: 'lbw', dismissedPlayerId: insertedPlayers[6].id },
      { overNumber: 0, ballNumberInOver: 5, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[7].id, bowlerId: insertedPlayers[0].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 0, ballNumberInOver: 6, strikerId: insertedPlayers[7].id, nonStrikerId: insertedPlayers[8].id, bowlerId: insertedPlayers[0].id, runsOffBat: 2, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      // Other overs
      { overNumber: 1, ballNumberInOver: 1, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[7].id, bowlerId: insertedPlayers[2].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 1, ballNumberInOver: 2, strikerId: insertedPlayers[7].id, nonStrikerId: insertedPlayers[8].id, bowlerId: insertedPlayers[2].id, runsOffBat: 4, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 1, ballNumberInOver: 3, strikerId: insertedPlayers[7].id, nonStrikerId: insertedPlayers[8].id, bowlerId: insertedPlayers[2].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 1, ballNumberInOver: 4, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[7].id, bowlerId: insertedPlayers[2].id, runsOffBat: 0, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 1, ballNumberInOver: 5, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[7].id, bowlerId: insertedPlayers[2].id, runsOffBat: 2, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 1, ballNumberInOver: 6, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[7].id, bowlerId: insertedPlayers[2].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      // Over 2 (Rohan bowling)
      { overNumber: 2, ballNumberInOver: 1, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[7].id, bowlerId: insertedPlayers[4].id, runsOffBat: 0, extraRuns: 1, extraType: 'wide', isLegalDelivery: false, isWicket: false },
      { overNumber: 2, ballNumberInOver: 1, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[7].id, bowlerId: insertedPlayers[4].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 2, ballNumberInOver: 2, strikerId: insertedPlayers[7].id, nonStrikerId: insertedPlayers[8].id, bowlerId: insertedPlayers[4].id, runsOffBat: 0, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: true, wicketType: 'caught', dismissedPlayerId: insertedPlayers[7].id, fielderId: insertedPlayers[0].id },
      { overNumber: 2, ballNumberInOver: 3, strikerId: insertedPlayers[9].id, nonStrikerId: insertedPlayers[8].id, bowlerId: insertedPlayers[4].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 2, ballNumberInOver: 4, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[9].id, bowlerId: insertedPlayers[4].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 2, ballNumberInOver: 5, strikerId: insertedPlayers[9].id, nonStrikerId: insertedPlayers[8].id, bowlerId: insertedPlayers[4].id, runsOffBat: 2, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 2, ballNumberInOver: 6, strikerId: insertedPlayers[9].id, nonStrikerId: insertedPlayers[8].id, bowlerId: insertedPlayers[4].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      // Over 3 (Suraj bowls again, 1 more wicket)
      { overNumber: 3, ballNumberInOver: 1, strikerId: insertedPlayers[9].id, nonStrikerId: insertedPlayers[8].id, bowlerId: insertedPlayers[0].id, runsOffBat: 0, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: true, wicketType: 'bowled', dismissedPlayerId: insertedPlayers[9].id },
      { overNumber: 3, ballNumberInOver: 2, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[9].id, bowlerId: insertedPlayers[0].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 3, ballNumberInOver: 3, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[9].id, bowlerId: insertedPlayers[0].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 3, ballNumberInOver: 4, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[9].id, bowlerId: insertedPlayers[0].id, runsOffBat: 2, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 3, ballNumberInOver: 5, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[9].id, bowlerId: insertedPlayers[0].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 3, ballNumberInOver: 6, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[9].id, bowlerId: insertedPlayers[0].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      // Over 4 (Final over)
      { overNumber: 4, ballNumberInOver: 1, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[9].id, bowlerId: insertedPlayers[3].id, runsOffBat: 0, extraRuns: 1, extraType: 'wide', isLegalDelivery: false, isWicket: false },
      { overNumber: 4, ballNumberInOver: 1, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[9].id, bowlerId: insertedPlayers[3].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 4, ballNumberInOver: 2, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[9].id, bowlerId: insertedPlayers[3].id, runsOffBat: 4, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 4, ballNumberInOver: 3, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[9].id, bowlerId: insertedPlayers[3].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 4, ballNumberInOver: 4, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[9].id, bowlerId: insertedPlayers[3].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 4, ballNumberInOver: 5, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[9].id, bowlerId: insertedPlayers[3].id, runsOffBat: 2, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
      { overNumber: 4, ballNumberInOver: 6, strikerId: insertedPlayers[8].id, nonStrikerId: insertedPlayers[9].id, bowlerId: insertedPlayers[3].id, runsOffBat: 1, extraRuns: 0, extraType: 'none', isLegalDelivery: true, isWicket: false },
    ];

    await db.insert(balls).values(
      ballsInn2.map((b) => ({
        ...b,
        matchId: match1.id,
        inningsId: inn2.id,
        commentary: generateCommentary(b),
      }))
    );

    // Match 2: Another completed match
    const m2Res = await db.insert(matches).values({
      title: 'FFC Weekend Cup Match 2',
      matchType: 'T10',
      matchFormat: 'Hard Ball',
      totalOvers: 5,
      venue: 'FFC Cricket Ground, Bengaluru',
      date: '2026-09-27',
      team1Id: team2.id,
      team2Id: team1.id,
      team1CaptainId: insertedPlayers[2].id,
      team2CaptainId: insertedPlayers[0].id,
      tossWinnerId: team2.id,
      tossDecision: 'bat',
      status: 'completed',
      currentInnings: 2,
      winnerTeamId: team1.id,
      resultMargin: '4 wickets',
      resultSummary: 'FFC Warriors won by 4 wickets',
      isDemo: true,
    }).returning();
    const match2 = m2Res[0];

    await db.insert(matchSquads).values([
      ...t2Players.map((p) => ({ matchId: match2.id, teamId: team2.id, playerId: p.id })),
      ...t1Players.map((p) => ({ matchId: match2.id, teamId: team1.id, playerId: p.id })),
    ]);

    // Match 3: An upcoming / ready-to-score match
    const m3Res = await db.insert(matches).values({
      title: 'FFC Inter-Department Derby',
      matchType: 'T20',
      matchFormat: 'Tennis Ball',
      totalOvers: 10,
      venue: 'FFC Arena',
      date: '2026-10-03',
      team1Id: team1.id,
      team2Id: team2.id,
      team1CaptainId: insertedPlayers[0].id,
      team2CaptainId: insertedPlayers[2].id,
      status: 'upcoming',
      isDemo: true,
    }).returning();
    const match3 = m3Res[0];

    await db.insert(matchSquads).values([
      ...t1Players.map((p) => ({ matchId: match3.id, teamId: team1.id, playerId: p.id })),
      ...t2Players.map((p) => ({ matchId: match3.id, teamId: team2.id, playerId: p.id })),
    ]);

    return {
      message: 'Demo data seeded successfully',
      playersCount: insertedPlayers.length,
      teamsCount: 2,
      matchesCount: 3,
    };
  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw new Error('Failed to seed demo data', { cause: error });
  }
}

export async function clearDemoData() {
  try {
    const demoMatches = await db.select().from(matches).where(eq(matches.isDemo, true));
    for (const m of demoMatches) {
      await db.delete(balls).where(eq(balls.matchId, m.id));
      await db.delete(innings).where(eq(innings.matchId, m.id));
      await db.delete(matchSquads).where(eq(matchSquads.matchId, m.id));
      await db.delete(matches).where(eq(matches.id, m.id));
    }

    const demoTeams = await db.select().from(teams).where(eq(teams.isDemo, true));
    for (const t of demoTeams) {
      await db.delete(teamPlayers).where(eq(teamPlayers.teamId, t.id));
      await db.delete(teams).where(eq(teams.id, t.id));
    }

    await db.delete(players).where(eq(players.isDemo, true));

    return { message: 'Demo data cleared successfully' };
  } catch (error) {
    console.error('Error clearing demo data:', error);
    throw new Error('Failed to clear demo data', { cause: error });
  }
}
