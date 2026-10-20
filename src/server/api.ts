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
import {
  getOrCreateUser,
  getUserByEmail,
  getUserByIdentifier,
  countAdminsWithPassword,
  setupInitialAdminAccount,
  createAdminAccount,
} from '../db/users.ts';
import { requireAdminAuth, optionalAuth, type AuthRequest } from '../middleware/auth.ts';
import { hashPassword, verifyPassword, generateAdminToken } from '../lib/auth-utils.ts';

export const apiRouter = Router();

// ----------------------------------------------------
// AUTHENTICATION ENDPOINTS
// ----------------------------------------------------

/**
 * Check authentication status and whether initial admin setup is required
 */
apiRouter.get('/auth/status', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const adminCount = await countAdminsWithPassword();
    const isInitialSetupNeeded = adminCount === 0;

    if (req.adminUser) {
      return res.json({
        isAuthenticated: true,
        isAdmin: true,
        isInitialSetupNeeded,
        user: {
          uid: req.adminUser.uid,
          email: req.adminUser.email,
          role: req.adminUser.role,
          displayName: req.adminUser.displayName,
        },
      });
    }

    res.json({
      isAuthenticated: false,
      isAdmin: false,
      isInitialSetupNeeded,
      user: null,
    });
  } catch (error: any) {
    console.error('Failed to get auth status:', error);
    res.status(500).json({ error: error.message || 'Failed to get auth status' });
  }
});

/**
 * Admin Login via Email and Password
 */
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    const identifier = String(email).trim();
    const user = await getUserByIdentifier(identifier);

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    const isValid = verifyPassword(String(password), user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Account does not possess administrator privileges' });
    }

    const token = generateAdminToken({
      uid: user.uid,
      email: user.email,
      role: user.role,
      displayName: user.displayName || undefined,
    });

    res.json({
      token,
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      },
    });
  } catch (error: any) {
    console.error('Login failed:', error);
    res.status(500).json({ error: error.message || 'Authentication error' });
  }
});

/**
 * One-time Initial Admin Account Setup
 * Permitted ONLY when zero admin accounts currently have a password set.
 */
apiRouter.post('/auth/setup-admin', async (req: Request, res: Response) => {
  try {
    const existingAdmins = await countAdminsWithPassword();
    if (existingAdmins > 0) {
      return res.status(403).json({
        error: 'Forbidden: Initial admin account is already configured. Please log in.',
      });
    }

    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const pwdHash = hashPassword(String(password));
    const admin = await setupInitialAdminAccount(
      String(email).trim().toLowerCase(),
      pwdHash,
      displayName ? String(displayName).trim() : undefined
    );

    const token = generateAdminToken({
      uid: admin.uid,
      email: admin.email,
      role: admin.role,
      displayName: admin.displayName || undefined,
    });

    res.status(201).json({
      message: 'Admin account initialized successfully',
      token,
      user: {
        uid: admin.uid,
        email: admin.email,
        role: admin.role,
        displayName: admin.displayName,
      },
    });
  } catch (error: any) {
    console.error('Initial admin setup failed:', error);
    res.status(500).json({ error: error.message || 'Failed to setup admin account' });
  }
});

/**
 * Create additional admin account (Protected by requireAdminAuth)
 */
apiRouter.post('/auth/create-admin', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const pwdHash = hashPassword(String(password));
    const newAdmin = await createAdminAccount(
      String(email).trim().toLowerCase(),
      pwdHash,
      displayName ? String(displayName).trim() : undefined
    );

    res.status(201).json({
      message: 'Admin account created successfully',
      user: {
        uid: newAdmin.uid,
        email: newAdmin.email,
        role: newAdmin.role,
        displayName: newAdmin.displayName,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create admin user' });
  }
});

/**
 * Firebase OAuth Sync Endpoint (For Google Sign-In)
 */
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

// ----------------------------------------------------
// PUBLIC READ-ONLY ENDPOINTS (Accessible to all visitors)
// ----------------------------------------------------

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

// Players (Public List & Profile)
apiRouter.get('/players', async (_req: Request, res: Response) => {
  try {
    const data = await getAllPlayers();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get players' });
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

// Teams (Public List & Details)
apiRouter.get('/teams', async (_req: Request, res: Response) => {
  try {
    const data = await getAllTeams();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get teams' });
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

// Matches (Public List, Scorecard & Live Score Spectator View)
apiRouter.get('/matches', async (_req: Request, res: Response) => {
  try {
    const data = await getAllMatches();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get matches' });
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

// Leaderboard (Public)
apiRouter.get('/leaderboard', async (_req: Request, res: Response) => {
  try {
    const data = await getLeaderboards();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get leaderboard' });
  }
});

// ----------------------------------------------------
// PROTECTED ADMIN ENDPOINTS (Require valid Admin Auth)
// ----------------------------------------------------

// Player Management
apiRouter.post('/players', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const newPlayer = await createPlayer(req.body);
    res.status(201).json(newPlayer);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create player' });
  }
});

apiRouter.put('/players/:id', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updated = await updatePlayer(id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update player' });
  }
});

apiRouter.delete('/players/:id', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = await deletePlayer(id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete player' });
  }
});

// Team Management
apiRouter.post('/teams', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const newTeam = await createTeam(req.body);
    res.status(201).json(newTeam);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create team' });
  }
});

apiRouter.put('/teams/:id', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updated = await updateTeam(id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update team' });
  }
});

// Match Creation & Lifecycle Management
apiRouter.post('/matches', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const newMatch = await createMatch(req.body);
    res.status(201).json(newMatch);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create match' });
  }
});

apiRouter.post('/matches/:id/start', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = await startMatch(id, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to start match' });
  }
});

// Live Scoring & Delivery Controls
apiRouter.post('/scoring/ball', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const updatedScore = await recordBall(req.body);
    res.json(updatedScore);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record ball' });
  }
});

apiRouter.post('/scoring/undo', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { matchId, inningsId } = req.body;
    const updatedScore = await undoLastBall(Number(matchId), Number(inningsId));
    res.json(updatedScore);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to undo ball' });
  }
});

apiRouter.put('/scoring/ball/:id', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const ballId = Number(req.params.id);
    const updatedScore = await editBall(ballId, req.body);
    res.json(updatedScore);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to edit ball' });
  }
});

apiRouter.post('/scoring/switch-striker', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { inningsId } = req.body;
    const updatedScore = await switchStriker(Number(inningsId));
    res.json(updatedScore);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to switch striker' });
  }
});

apiRouter.post('/scoring/change-bowler', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { inningsId, bowlerId } = req.body;
    const updatedScore = await changeBowler(Number(inningsId), Number(bowlerId));
    res.json(updatedScore);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to change bowler' });
  }
});

apiRouter.post('/scoring/set-batter', requireAdminAuth, async (req: AuthRequest, res: Response) => {
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

apiRouter.post('/matches/:id/end-innings', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const matchId = Number(req.params.id);
    const { inningsNumber, nextOptions } = req.body;
    const updatedScore = await endInnings(matchId, Number(inningsNumber), nextOptions);
    res.json(updatedScore);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to end innings' });
  }
});

apiRouter.post('/matches/:id/start-second-innings', requireAdminAuth, async (req: AuthRequest, res: Response) => {
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

// Demo Operations (Admin only)
apiRouter.post('/demo/seed', requireAdminAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await seedDemoData();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to seed demo data' });
  }
});

apiRouter.post('/demo/clear', requireAdminAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await clearDemoData();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to clear demo data' });
  }
});
