export type MatchScore = {
  homeGoals: number;
  awayGoals: number;
};

function outcome(score: MatchScore): "home" | "away" | "draw" {
  if (score.homeGoals > score.awayGoals) return "home";
  if (score.homeGoals < score.awayGoals) return "away";
  return "draw";
}

function goalDiff(score: MatchScore): number {
  return score.homeGoals - score.awayGoals;
}

/**
 * Scoring rules:
 * - +1 if winner/loser/draw is correct
 * - +1 if goal difference is correct (e.g. 4-2, 3-1, 2-0)
 * - +1 if exact score is correct
 * - otherwise 0
 */
export function calculatePredictionPoints(predicted: MatchScore, actual: MatchScore): number {
  if (outcome(predicted) !== outcome(actual)) {
    return 0;
  }

  let points = 1;

  if (goalDiff(predicted) === goalDiff(actual)) {
    points += 1;
  }

  if (predicted.homeGoals === actual.homeGoals && predicted.awayGoals === actual.awayGoals) {
    points += 1;
  }

  return points;
}
