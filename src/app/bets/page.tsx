import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BetForm } from "@/components/bet-form";
import { authOptions } from "@/lib/auth";
import { bettingDeadlineLabel, isBettingOpen } from "@/lib/deadline";
import prisma from "@/lib/prisma";
import { WORLD_CUP_2026_MATCHES } from "@/lib/matches";
import { getActualScore, mapResultsByMatchId } from "@/lib/results";
import { calculatePredictionPoints } from "@/lib/scoring";

export default async function BetsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/");
  }

  const bettingOpen = isBettingOpen();

  const saved = await prisma.prediction.findMany({
    where: { userId: session.user.id },
    select: { matchId: true, homeGoals: true, awayGoals: true },
  });
  const savedMatchIds = saved.map((p) => p.matchId);
  const officialResults = await prisma.matchResult.findMany({
    where: { matchId: { in: savedMatchIds } },
    select: { matchId: true, homeGoals: true, awayGoals: true },
  });
  const officialResultsByMatchId = mapResultsByMatchId(officialResults);

  const scored = saved
    .map((p) => {
      const actual = getActualScore(p.matchId, officialResultsByMatchId);
      if (!actual) {
        return null;
      }
      const points = calculatePredictionPoints(
        { homeGoals: p.homeGoals, awayGoals: p.awayGoals },
        actual,
      );
      return { ...p, points };
    })
    .filter((row): row is { matchId: string; homeGoals: number; awayGoals: number; points: number } => row !== null);

  const totalPoints = scored.reduce((sum, item) => sum + item.points, 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
          FIFA World Cup 2026
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Your score predictions
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Enter the full-time scores you already want to lock in and save as you go. You can update existing picks and
          add more any time until{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">{bettingDeadlineLabel()} (UTC)</span>.
        </p>
        {!bettingOpen ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            The betting window is closed. Your saved predictions are read-only.
          </p>
        ) : null}
      </header>

      <BetForm matches={WORLD_CUP_2026_MATCHES} bettingOpen={bettingOpen} initialPredictions={saved} />

      <section className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Scoring</h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          +1 correct winner/loser/draw, +1 correct goal difference, +1 exact score.
        </p>
        <p className="mt-3 font-medium text-zinc-900 dark:text-zinc-100">
          Total points: {totalPoints}{" "}
          <span className="text-zinc-500 dark:text-zinc-400">
            ({scored.length} settled prediction{scored.length === 1 ? "" : "s"})
          </span>
        </p>
      </section>

      <p className="text-xs text-zinc-500">
        Fixtures and team names are illustrative placeholders so the sheet is usable before the final schedule is wired
        in. Replace the list in <code className="font-mono">src/lib/matches.ts</code> with your official draw.
      </p>

      <p className="text-xs text-zinc-500">
        Official final scores are read from the database table <code className="font-mono">MatchResult</code>.
      </p>

      <Link href="/" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
        ← Back to home
      </Link>
    </div>
  );
}
