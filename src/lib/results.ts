import type { MatchScore } from "@/lib/scoring";

export function getActualScore(
  matchId: string,
  byMatchId: Record<string, MatchScore>,
): MatchScore | undefined {
  return byMatchId[matchId];
}

export function mapResultsByMatchId(
  results: { matchId: string; homeGoals: number; awayGoals: number }[],
): Record<string, MatchScore> {
  return Object.fromEntries(
    results.map((r) => [r.matchId, { homeGoals: r.homeGoals, awayGoals: r.awayGoals }]),
  );
}
