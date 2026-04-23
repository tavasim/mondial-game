/** Bets close at end of 10 June 2026 UTC (before the opening match). */
export const BETTING_DEADLINE_ISO = "2026-06-10T23:59:59.999Z";

export function isBettingOpen(now: Date = new Date()): boolean {
  return now.getTime() <= Date.parse(BETTING_DEADLINE_ISO);
}

export function bettingDeadlineLabel(): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(BETTING_DEADLINE_ISO));
}
