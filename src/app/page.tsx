import { getServerSession } from "next-auth";
import Link from "next/link";
import { SignInButton } from "@/components/sign-in-button";
import { bettingDeadlineLabel, isBettingOpen } from "@/lib/deadline";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const bettingOpen = isBettingOpen();

  return (
    <div className="relative isolate flex min-h-full flex-1 flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_45%)]" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-16">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            Mondial Game
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            World Cup 2026 prediction pool
          </h1>
          <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Sign in with your Google account, fill in predicted scores for each group-stage match, and save your sheet
            before kickoff week.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Betting closes</dt>
              <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {bettingDeadlineLabel()} (UTC)
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</dt>
              <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {bettingOpen ? "Open for predictions" : "Closed"}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            {session ? (
              <>
                <Link
                  href="/bets"
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                >
                  Go to prediction sheet
                </Link>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Signed in as <span className="font-medium text-zinc-900 dark:text-zinc-100">{session.user?.email}</span>
                </p>
              </>
            ) : (
              <SignInButton />
            )}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-zinc-500">
          Authentication uses Google OAuth. You do not type your Google password into this app; Google handles sign-in
          and only shares your basic profile with this site.
        </p>
      </main>
    </div>
  );
}
