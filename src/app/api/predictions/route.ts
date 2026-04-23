import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isBettingOpen } from "@/lib/deadline";
import prisma from "@/lib/prisma";
import { WORLD_CUP_2026_MATCHES } from "@/lib/matches";

const validIds = new Set(WORLD_CUP_2026_MATCHES.map((m) => m.id));

type Body = {
  predictions?: { matchId: string; homeGoals: number; awayGoals: number }[];
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.prediction.findMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    predictions: rows.map((r) => ({
      matchId: r.matchId,
      homeGoals: r.homeGoals,
      awayGoals: r.awayGoals,
    })),
    bettingOpen: isBettingOpen(),
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isBettingOpen()) {
    return NextResponse.json({ error: "Betting is closed" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.predictions)) {
    return NextResponse.json({ error: "predictions must be an array" }, { status: 400 });
  }

  for (const p of body.predictions) {
    if (!p || typeof p.matchId !== "string") {
      return NextResponse.json({ error: "Invalid prediction entry" }, { status: 400 });
    }
    if (!validIds.has(p.matchId)) {
      return NextResponse.json({ error: `Unknown match: ${p.matchId}` }, { status: 400 });
    }
    if (
      !Number.isInteger(p.homeGoals) ||
      !Number.isInteger(p.awayGoals) ||
      p.homeGoals < 0 ||
      p.awayGoals < 0 ||
      p.homeGoals > 20 ||
      p.awayGoals > 20
    ) {
      return NextResponse.json({ error: "Scores must be integers between 0 and 20" }, { status: 400 });
    }
  }

  await prisma.$transaction(
    body.predictions.map((p) =>
      prisma.prediction.upsert({
        where: {
          userId_matchId: { userId: session.user.id, matchId: p.matchId },
        },
        create: {
          userId: session.user.id,
          matchId: p.matchId,
          homeGoals: p.homeGoals,
          awayGoals: p.awayGoals,
        },
        update: {
          homeGoals: p.homeGoals,
          awayGoals: p.awayGoals,
        },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
