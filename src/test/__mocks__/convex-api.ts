// Mock Convex API for testing
// This replaces @/convex/_generated/api in tests

export const api = {
  matches: {
    verifyCoachPin: 'matches:verifyCoachPin',
    getByPublicCode: 'matches:getByPublicCode',
    getForCoach: 'matches:getForCoach',
    listByTeam: 'matches:listByTeam',
    getPlayingTime: 'matches:getPlayingTime',
    getSuggestedSubstitutions: 'matches:getSuggestedSubstitutions',
  },
  admin: {
    getClubBySlug: 'admin:getClubBySlug',
    createClub: 'admin:createClub',
    createTeam: 'admin:createTeam',
    updateTeam: 'admin:updateTeam',
    deleteTeam: 'admin:deleteTeam',
    listTeamsByClub: 'admin:listTeamsByClub',
    createCoach: 'admin:createCoach',
    updateCoach: 'admin:updateCoach',
    deleteCoach: 'admin:deleteCoach',
    listCoaches: 'admin:listCoaches',
    createPlayer: 'admin:createPlayer',
    createPlayers: 'admin:createPlayers',
    updatePlayer: 'admin:updatePlayer',
    deletePlayer: 'admin:deletePlayer',
    listPlayersByTeam: 'admin:listPlayersByTeam',
  },
  teams: {
    getBySlug: 'teams:getBySlug',
    getSeasonStats: 'teams:getSeasonStats',
    getMatchHistory: 'teams:getMatchHistory',
  },
  seed: {
    init: 'seed:init',
    createSeedMatch: 'seed:createSeedMatch',
    addPlayerToMatch: 'seed:addPlayerToMatch',
  },
  matchActions: {
    addGoal: 'matchActions:addGoal',
    substitute: 'matchActions:substitute',
    removeLastGoal: 'matchActions:removeLastGoal',
    start: 'matchActions:start',
    nextQuarter: 'matchActions:nextQuarter',
    resumeFromHalftime: 'matchActions:resumeFromHalftime',
  },
};
