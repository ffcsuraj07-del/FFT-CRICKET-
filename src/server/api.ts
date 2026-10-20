import { Router, type Request, type Response } from 'express';
import {
  getAllPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  getAllMatches,
  getMatchById,
  createMatch,
  startMatch,
  getLiveScoreData,
  recordBall,
  undoLastBall,
  editBall,
  switchStriker,
  changeBowler,
  setBatter,
  endInnings,
  startSecondInnings,
  getPlayerCareerStats,
  getPlayerMatchHistory,
  getLeaderboards,
  getDashboardOverview,
  seedDemoData,
  clearDemoData,
} from '../db/cricket.ts';
import { getOrCreateUser } from '../db/users.ts';
import { optionalAuth, type AuthRequest } from '../middleware/auth.ts';

export const apiRouter = Router();

// Dashboard overview
apiRouter.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const data = await getDashboardOverview();
    res.json(data);
  } catch (error: any) {
    console.error('Failed to get dashboard data:', error);
    res.status(500).json({ error: error.message || 'Failed to get dashboard data' });
  }
});

// Players
apiRouter.get('/players', async (_req: Request, res: Response) => {
  try {
    const data = await getAllPlayers();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get players' });
  }
});

apiRouter.post('/players', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const newPlayer = await createPlayer(req.body);
    res.status(201).json(newPlayer);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create player' });
  }
});

apiRouter.get('/players/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const player = await getPlayerById(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    const careerStats = await getPlayerCareerStats(id);
    const matchHistory = await getPlayerMatchHistory(id);

    res.json({
      ...player,
      careerStats,
      matchHistory,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get player profile' });
  }
});

apiRouter.put('/players/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updated = await updatePlayer(id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update player' });
  }
});

apiRouter.delete('/players/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = await deletePlayer(id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete player' });
  }
});

// Teams
apiRouter.get('/teams', async (_req: Request, res: Response) => {
  try {
    const data = await getAllTeams();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get teams' });
  }
});

apiRouter.post('/teams', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const newTeam = await createTeam(req.body);
    res.status(201).json(newTeam);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create team' });
  }
});

apiRouter.get('/teams/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const team = await getTeamById(id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get team' });
  }
});

apiRouter.put('/teams/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updated = await updateTeam(id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update team' });
  }
});

// Matches
apiRouter.get('/matches', async (_req: Request, res: Response) => {
  try {
    const data = await getAllMatches();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get matches' });
  }
});

apiRouter.post('/matches', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const newMatch = await createMatch(req.body);
    res.status(201).json(newMatch);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create match' });
  }
});

apiRouter.get('/matches/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const match = await getMatchById(id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get match' });
  }
});

apiRouter.post('/matches/:id/start', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = await startMatch(id, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to start match' });
  }
});

// Live Scoring
apiRouter.get('/matches/:id/live', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = await getLiveScoreData(id);
    if (!data) return res.status(404).json({ error: 'Match live data not found' });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get live score data' });
  }
});

apiRouter.post('/scoring/ball', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const updatedScore = await recordBall(req.body);
    res.json(updatedScore);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record ball' });
  }
});

apiRouter.post('/scoring/undo', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { matchId, inningsId } = req.body;
    const updatedScore = await undoLastBall(Number(matchId), Number(inningsId));
    res.json(updatedScore);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to undo ball' });
  }
});

apiRouter.put('/scoring/ball/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const ballId = Number(req.params.id);
    const updatedScore = await editBall(ballId, req.body);
    res.json(updatedScore);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to edit ball' });
  }
});

apiRouter.post('/scoring/switch-striker', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { inningsId } = req.body;
    const updatedScore = await switchStriker(Number(inningsId));
    res.json(updatedScore);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to switch striker' });
  }
});

apiRouter.post('/scoring/change-bowler', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { inningsId, bowlerId } = req.body;
    const updatedScore = await changeBowler(Number(inningsId), Number(bowlerId));
    res.json(updatedScore);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to change bowler' });
  }
});

apiRouter.post('/scoring/set-batter', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { inningsId, strikerId, nonStrikerId } = req.body;
    const updatedScore = await setBatter(Number(inningsId), {
      strikerId: strikerId ? Number(strikerId) : undefined,
      nonStrikerId: nonStrikerId ? Number(nonStrikerId) : undefined,
    });
    res.json(updatedScore);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to set batter' });
  }
});

apiRouter.post('/matches/:id/end-innings', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const matchId = Number(req.params.id);
    const { inningsNumber, nextOptions } = req.body;
    const updatedScore = await endInnings(matchId, Number(inningsNumber), nextOptions);
    res.json(updatedScore);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to end innings' });
  }
});

apiRouter.post('/matches/:id/start-second-innings', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const matchId = Number(req.params.id);
    const { strikerId, nonStrikerId, bowlerId } = req.body;
    const updatedScore = await startSecondInnings(matchId, {
      strikerId: Number(strikerId),
      nonStrikerId: Number(nonStrikerId),
      bowlerId: Number(bowlerId),
    });
    res.json(updatedScore);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to start 2nd innings' });
  }
});

// Leaderboard
apiRouter.get('/leaderboard', async (_req: Request, res: Response) => {
  try {
    const data = await getLeaderboards();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get leaderboard' });
  }
});

// Demo Data Seeder & Clear
apiRouter.post('/demo/seed', async (_req: Request, res: Response) => {
  try {
    const result = await seedDemoData();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to seed demo data' });
  }
});

apiRouter.post('/demo/clear', async (_req: Request, res: Response) => {
  try {
    const result = await clearDemoData();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to clear demo data' });
  }
});

// Auth sync
apiRouter.post('/auth/sync', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { uid, email, displayName, photoUrl } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: 'UID and email required' });
    }
    const user = await getOrCreateUser(uid, email, displayName, photoUrl);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to sync user' });
  }
});
