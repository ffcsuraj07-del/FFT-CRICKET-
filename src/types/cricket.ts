export interface Player {
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
  isDemo?: boolean;
}

export interface PlayerStats {
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

export interface PlayerMatchRecord {
  matchId: number;
  date: string;
  venue: string;
  myTeam: string;
  opponent: string;
  batting: {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    isNotOut: boolean;
    batted: boolean;
  };
  bowling: {
    overs: string;
    runs: number;
    wickets: number;
    bowled: boolean;
  };
  result: string;
  summary: string;
}

export interface Team {
  id: number;
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  color?: string | null;
  captainId?: number | null;
  viceCaptainId?: number | null;
  captain?: Player | null;
  viceCaptain?: Player | null;
  members?: Player[];
  memberCount?: number;
  matchesPlayed?: number;
  wins?: number;
  losses?: number;
  ties?: number;
  noResults?: number;
  totalRuns?: number;
  totalWickets?: number;
  isDemo?: boolean;
}

export interface MatchSquadMember {
  id: number;
  matchId: number;
  teamId: number;
  playerId: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isWicketKeeper: boolean;
  name: string;
  jerseyNumber?: number;
  battingStyle?: string;
  bowlingStyle?: string;
  playerType?: string;
}

export interface Match {
  id: number;
  title?: string | null;
  matchType: string;
  matchFormat: string;
  totalOvers: number;
  venue: string;
  date: string;
  team1Id: number;
  team2Id: number;
  team1?: Team | null;
  team2?: Team | null;
  team1CaptainId?: number | null;
  team2CaptainId?: number | null;
  tossWinnerId?: number | null;
  tossDecision?: string | null;
  status: 'upcoming' | 'live' | 'innings_break' | 'completed' | 'paused';
  currentInnings: number;
  winnerTeamId?: number | null;
  resultMargin?: string | null;
  resultSummary?: string | null;
  squads?: MatchSquadMember[];
  innings?: Innings[];
  isDemo?: boolean;
}

export interface Innings {
  id: number;
  matchId: number;
  inningsNumber: number;
  battingTeamId: number;
  bowlingTeamId: number;
  totalRuns: number;
  totalWickets: number;
  legalBalls: number;
  totalExtras: number;
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  isCompleted: boolean;
  currentStrikerId?: number | null;
  currentNonStrikerId?: number | null;
  currentBowlerId?: number | null;
}

export interface Ball {
  id: number;
  matchId: number;
  inningsId: number;
  overNumber: number;
  ballNumberInOver: number;
  strikerId: number;
  nonStrikerId: number;
  bowlerId: number;
  runsOffBat: number;
  extraRuns: number;
  extraType: string;
  isLegalDelivery: boolean;
  isWicket: boolean;
  wicketType?: string | null;
  dismissedPlayerId?: number | null;
  fielderId?: number | null;
  commentary?: string | null;
  createdAt?: string;
}

export interface InningsScorecard {
  innings: Innings;
  battingTeam: Team;
  bowlingTeam: Team;
  overs: string;
  batting: {
    playerId: number;
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    isOut: boolean;
    dismissalText: string;
    strikeRate: number;
  }[];
  bowling: {
    playerId: number;
    name: string;
    overs: string;
    legalBalls: number;
    maidens: number;
    runsConceded: number;
    wickets: number;
    economy: number;
    wides: number;
    noBalls: number;
  }[];
  fallOfWickets: {
    wicketNumber: number;
    score: number;
    over: string;
    playerName: string;
  }[];
  extras: {
    total: number;
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
}
