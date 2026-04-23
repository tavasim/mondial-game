export type WorldCupMatch = {
  id: string;
  group: string;
  round: 1 | 2 | 3;
  home: string;
  away: string;
  /** ISO kickoff for display and sorting (illustrative schedule). */
  kickoff: string;
};

const GROUP_KEYS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;

/** 48 illustrative participants (replace with your final draw if needed). */
const TEAMS = [
  "Argentina",
  "Australia",
  "Belgium",
  "Brazil",
  "Canada",
  "Colombia",
  "Croatia",
  "Denmark",
  "Ecuador",
  "Egypt",
  "England",
  "France",
  "Germany",
  "Ghana",
  "Iran",
  "Japan",
  "Mexico",
  "Morocco",
  "Netherlands",
  "Nigeria",
  "Norway",
  "Paraguay",
  "Poland",
  "Portugal",
  "Qatar",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "South Africa",
  "South Korea",
  "Spain",
  "Switzerland",
  "Tunisia",
  "United States",
  "Uruguay",
  "Wales",
  "Algeria",
  "Austria",
  "Bosnia and Herzegovina",
  "Czechia",
  "Jamaica",
  "New Zealand",
  "Panama",
  "Romania",
  "Scotland",
  "Ukraine",
  "Turkey",
  "Ivory Coast",
] as const;

function groupPairings(teams: readonly [string, string, string, string]): [string, string][] {
  const [t0, t1, t2, t3] = teams;
  return [
    [t0, t3],
    [t1, t2],
    [t0, t2],
    [t1, t3],
    [t0, t1],
    [t2, t3],
  ];
}

function buildGroups(): Record<string, readonly [string, string, string, string]> {
  const out: Record<string, readonly [string, string, string, string]> = {};
  for (let g = 0; g < 12; g += 1) {
    const key = GROUP_KEYS[g];
    const start = g * 4;
    out[key] = [
      TEAMS[start],
      TEAMS[start + 1],
      TEAMS[start + 2],
      TEAMS[start + 3],
    ] as const;
  }
  return out;
}

const groups = buildGroups();

function buildMatches(): WorldCupMatch[] {
  const matches: WorldCupMatch[] = [];
  const base = Date.parse("2026-06-11T00:00:00.000Z");
  let slot = 0;

  for (const group of GROUP_KEYS) {
    const pairings = groupPairings(groups[group]);
    pairings.forEach((pair, idx) => {
      const round = (idx < 2 ? 1 : idx < 4 ? 2 : 3) as 1 | 2 | 3;
      const kickoff = new Date(base + slot * 45 * 60 * 1000).toISOString();
      slot += 1;
      matches.push({
        id: `WC2026-${group}-R${round}-M${idx + 1}`,
        group,
        round,
        home: pair[0],
        away: pair[1],
        kickoff,
      });
    });
  }

  return matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

export const WORLD_CUP_2026_MATCHES: WorldCupMatch[] = buildMatches();

export function getMatchById(id: string): WorldCupMatch | undefined {
  return WORLD_CUP_2026_MATCHES.find((m) => m.id === id);
}
