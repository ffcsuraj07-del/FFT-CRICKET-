import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (links with Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  role: text('role').default('admin').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Players table
export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  employeeId: text('employee_id'),
  department: text('department'),
  designation: text('designation'),
  jerseyNumber: integer('jersey_number'),
  battingStyle: text('batting_style').notNull().default('Right Hand'),
  bowlingStyle: text('bowling_style').notNull().default('Right Arm Medium'),
  playerType: text('player_type').notNull().default('All-Rounder'),
  phone: text('phone'),
  joiningDate: text('joining_date'),
  bio: text('bio'),
  photoUrl: text('photo_url'),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Teams table
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name'),
  logoUrl: text('logo_url'),
  color: text('color').default('#166534'),
  captainId: integer('captain_id').references(() => players.id),
  viceCaptainId: integer('vice_captain_id').references(() => players.id),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Team Players link table
export const teamPlayers = pgTable('team_players', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  playerId: integer('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
});

// Matches table
export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  title: text('title'),
  matchType: text('match_type').notNull().default('T20'), // T10, T20, Custom
  matchFormat: text('match_format').notNull().default('Hard Ball'), // Hard Ball, Tennis Ball, Other
  totalOvers: integer('total_overs').notNull().default(20),
  venue: text('venue').notNull().default('FFC Cricket Ground'),
  date: text('date').notNull(),
  team1Id: integer('team1_id').notNull().references(() => teams.id),
  team2Id: integer('team2_id').notNull().references(() => teams.id),
  team1CaptainId: integer('team1_captain_id').references(() => players.id),
  team2CaptainId: integer('team2_captain_id').references(() => players.id),
  tossWinnerId: integer('toss_winner_id').references(() => teams.id),
  tossDecision: text('toss_decision'), // 'bat', 'bowl'
  status: text('status').notNull().default('upcoming'), // 'upcoming', 'live', 'innings_break', 'completed', 'paused'
  currentInnings: integer('current_innings').default(1).notNull(),
  winnerTeamId: integer('winner_team_id').references(() => teams.id),
  resultMargin: text('result_margin'),
  resultSummary: text('result_summary'),
  isDemo: boolean('is_demo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Match Squads table
export const matchSquads = pgTable('match_squads', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  teamId: integer('team_id').notNull().references(() => teams.id),
  playerId: integer('player_id').notNull().references(() => players.id),
  isCaptain: boolean('is_captain').default(false).notNull(),
  isViceCaptain: boolean('is_vice_captain').default(false).notNull(),
  isWicketKeeper: boolean('is_wicket_keeper').default(false).notNull(),
});

// Innings table
export const innings = pgTable('innings', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  inningsNumber: integer('innings_number').notNull(), // 1 or 2
  battingTeamId: integer('batting_team_id').notNull().references(() => teams.id),
  bowlingTeamId: integer('bowling_team_id').notNull().references(() => teams.id),
  totalRuns: integer('total_runs').notNull().default(0),
  totalWickets: integer('total_wickets').notNull().default(0),
  legalBalls: integer('legal_balls').notNull().default(0),
  totalExtras: integer('total_extras').notNull().default(0),
  wides: integer('wides').notNull().default(0),
  noBalls: integer('no_balls').notNull().default(0),
  byes: integer('byes').notNull().default(0),
  legByes: integer('leg_byes').notNull().default(0),
  isCompleted: boolean('is_completed').default(false).notNull(),
  currentStrikerId: integer('current_striker_id').references(() => players.id),
  currentNonStrikerId: integer('current_non_striker_id').references(() => players.id),
  currentBowlerId: integer('current_bowler_id').references(() => players.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Balls table
export const balls = pgTable('balls', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  inningsId: integer('innings_id').notNull().references(() => innings.id, { onDelete: 'cascade' }),
  overNumber: integer('over_number').notNull(), // 0, 1, 2...
  ballNumberInOver: integer('ball_number_in_over').notNull(),
  strikerId: integer('striker_id').notNull().references(() => players.id),
  nonStrikerId: integer('non_striker_id').notNull().references(() => players.id),
  bowlerId: integer('bowler_id').notNull().references(() => players.id),
  runsOffBat: integer('runs_off_bat').notNull().default(0),
  extraRuns: integer('extra_runs').notNull().default(0),
  extraType: text('extra_type').notNull().default('none'), // 'none', 'wide', 'no_ball', 'bye', 'leg_bye'
  isLegalDelivery: boolean('is_legal_delivery').notNull().default(true),
  isWicket: boolean('is_wicket').notNull().default(false),
  wicketType: text('wicket_type'), // 'bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'retired_hurt', 'other'
  dismissedPlayerId: integer('dismissed_player_id').references(() => players.id),
  fielderId: integer('fielder_id').references(() => players.id),
  commentary: text('commentary'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const playersRelations = relations(players, ({ many }) => ({
  teamPlayers: many(teamPlayers),
  matchSquads: many(matchSquads),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  captain: one(players, {
    fields: [teams.captainId],
    references: [players.id],
  }),
  viceCaptain: one(players, {
    fields: [teams.viceCaptainId],
    references: [players.id],
  }),
  teamPlayers: many(teamPlayers),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  team1: one(teams, {
    fields: [matches.team1Id],
    references: [teams.id],
  }),
  team2: one(teams, {
    fields: [matches.team2Id],
    references: [teams.id],
  }),
  winnerTeam: one(teams, {
    fields: [matches.winnerTeamId],
    references: [teams.id],
  }),
  innings: many(innings),
  squads: many(matchSquads),
}));

export const inningsRelations = relations(innings, ({ one, many }) => ({
  match: one(matches, {
    fields: [innings.matchId],
    references: [matches.id],
  }),
  battingTeam: one(teams, {
    fields: [innings.battingTeamId],
    references: [teams.id],
  }),
  bowlingTeam: one(teams, {
    fields: [innings.bowlingTeamId],
    references: [teams.id],
  }),
  striker: one(players, {
    fields: [innings.currentStrikerId],
    references: [players.id],
  }),
  nonStriker: one(players, {
    fields: [innings.currentNonStrikerId],
    references: [players.id],
  }),
  bowler: one(players, {
    fields: [innings.currentBowlerId],
    references: [players.id],
  }),
  balls: many(balls),
}));

export const ballsRelations = relations(balls, ({ one }) => ({
  innings: one(innings, {
    fields: [balls.inningsId],
    references: [innings.id],
  }),
  striker: one(players, {
    fields: [balls.strikerId],
    references: [players.id],
  }),
  nonStriker: one(players, {
    fields: [balls.nonStrikerId],
    references: [players.id],
  }),
  bowler: one(players, {
    fields: [balls.bowlerId],
    references: [players.id],
  }),
  dismissedPlayer: one(players, {
    fields: [balls.dismissedPlayerId],
    references: [players.id],
  }),
  fielder: one(players, {
    fields: [balls.fielderId],
    references: [players.id],
  }),
}));
