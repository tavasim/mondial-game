"use client";

import { signOut, useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import type { WorldCupMatch } from "@/lib/matches";

type Props = {
  matches: WorldCupMatch[];
  bettingOpen: boolean;
  initialPredictions: { matchId: string; homeGoals: number; awayGoals: number }[];
};

type ScoreMap = Record<string, { home: string; away: string }>;

function mergeScores(
  matches: WorldCupMatch[],
  initial: { matchId: string; homeGoals: number; awayGoals: number }[],
): ScoreMap {
  const next: ScoreMap = Object.fromEntries(matches.map((m) => [m.id, { home: "", away: "" }]));
  for (const p of initial) {
    if (next[p.matchId]) {
      next[p.matchId] = { home: String(p.homeGoals), away: String(p.awayGoals) };
    }
  }
  return next;
}

export function BetForm({ matches, bettingOpen, initialPredictions }: Props) {
  const { data: session, status } = useSession();
  const [scores, setScores] = useState<ScoreMap>(() => mergeScores(matches, initialPredictions));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filledCount = useMemo(() => {
    return matches.filter((m) => {
      const s = scores[m.id];
      return s && s.home !== "" && s.away !== "";
    }).length;
  }, [matches, scores]);

  const onChange = (id: string, side: "home" | "away", value: string) => {
    if (!/^\d*$/.test(value)) return;
    setScores((prev) => ({
      ...prev,
      [id]: {
        home: side === "home" ? value : prev[id]?.home ?? "",
        away: side === "away" ? value : prev[id]?.away ?? "",
      },
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!bettingOpen) {
      setError("Betting is closed.");
      return;
    }
    const predictions: { matchId: string; homeGoals: number; awayGoals: number }[] = [];
    for (const m of matches) {
      const s = scores[m.id];
      const homeRaw = s?.home ?? "";
      const awayRaw = s?.away ?? "";
      const bothEmpty = homeRaw === "" && awayRaw === "";
      if (bothEmpty) {
        continue;
      }
      if (homeRaw === "" || awayRaw === "") {
        setError(`Please fill both scores for ${m.home} vs ${m.away}, or leave both empty.`);
        return;
      }
      const homeGoals = Number.parseInt(homeRaw, 10);
      const awayGoals = Number.parseInt(awayRaw, 10);
      if (
        !Number.isFinite(homeGoals) ||
        !Number.isFinite(awayGoals) ||
        homeGoals < 0 ||
        awayGoals < 0 ||
        homeGoals > 20 ||
        awayGoals > 20
      ) {
        setError("Scores must be integers between 0 and 20.");
        return;
      }
      predictions.push({
        matchId: m.id,
        homeGoals,
        awayGoals,
      });
    }
    setSaving(true);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictions }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Save failed");
      }
      setMessage(
        predictions.length > 0
          ? `Saved ${predictions.length} prediction${predictions.length === 1 ? "" : "s"}.`
          : "No scores entered yet. You can keep adding picks and save any time before the deadline.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return <p className="text-sm text-zinc-500">Loading your sheet…</p>;
  }

  if (status !== "authenticated") {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Sign in with Google to enter your predictions.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          Signed in as <span className="font-medium text-zinc-900 dark:text-zinc-100">{session.user.email}</span>
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <span>
            {filledCount}/{matches.length} matches filled
          </span>
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/" })}
            className="text-xs font-semibold uppercase tracking-wide text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-zinc-100 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2">Group</th>
              <th className="px-3 py-2">Fixture</th>
              <th className="px-3 py-2">Kickoff (UTC)</th>
              <th className="px-3 py-2 text-center">Home</th>
              <th className="w-8 px-1 py-2 text-center text-zinc-400">&nbsp;</th>
              <th className="px-3 py-2 text-center">Away</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {matches.map((m) => (
              <tr key={m.id} className="bg-white dark:bg-zinc-950">
                <td className="px-3 py-2 font-mono text-xs text-zinc-500">{m.group}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                    {m.home} vs {m.away}
                  </div>
                  <div className="text-xs text-zinc-500">Round {m.round}</div>
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500 whitespace-nowrap">
                  {new Date(m.kickoff).toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-2 py-2">
                  <input
                    inputMode="numeric"
                    disabled={!bettingOpen}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-center font-mono text-sm outline-none ring-emerald-500/40 focus:ring-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                    value={scores[m.id]?.home ?? ""}
                    onChange={(e) => onChange(m.id, "home", e.target.value)}
                    aria-label={`${m.home} goals`}
                  />
                </td>
                <td className="px-1 py-2 text-center text-zinc-400">–</td>
                <td className="px-2 py-2">
                  <input
                    inputMode="numeric"
                    disabled={!bettingOpen}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-center font-mono text-sm outline-none ring-emerald-500/40 focus:ring-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                    value={scores[m.id]?.away ?? ""}
                    onChange={(e) => onChange(m.id, "away", e.target.value)}
                    aria-label={`${m.away} goals`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!bettingOpen || saving}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save predictions"}
        </button>
        {!bettingOpen ? (
          <span className="text-sm text-zinc-500">Betting window has ended.</span>
        ) : null}
      </div>
    </form>
  );
}
