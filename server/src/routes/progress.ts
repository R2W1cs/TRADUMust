import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { syncLivesRegen } from "../services/gamification.js";

export const progressRouter = Router();

progressRouter.get("/", authenticate, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const livesState = await syncLivesRegen(userId);

  const [rawProgress, lessonProgress, achievements, badges, certificates] = await Promise.all([
    prisma.userProgress.findUnique({ where: { userId } }),
    prisma.lessonProgress.findMany({
      where: { userId },
      include: { lesson: { select: { title: true, category: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    }),
    prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
    }),
    prisma.certificate.findMany({ where: { userId } }),
  ]);

  const progress = rawProgress
    ? { ...rawProgress, lives: livesState.lives, nextLifeRegenAt: livesState.nextLifeRegenAt }
    : null;

  res.json({ progress, lessonProgress, achievements, badges, certificates });
});

progressRouter.get("/leaderboard", async (req, res) => {
  const period = (req.query.period as string) || "weekly";
  const entries = await prisma.leaderboardEntry.findMany({
    where: { period },
    orderBy: { xp: "desc" },
    take: 50,
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });
  res.json({ entries, period });
});

progressRouter.get("/map/:language", authenticate, async (req: AuthRequest, res) => {
  const code = req.params.language.toUpperCase() as "ASL" | "BSL" | "LSF" | "TSL";
  const units = await prisma.unit.findMany({
    where: { signLanguage: { code } },
    orderBy: { orderIndex: "asc" },
    include: {
      lessons: {
        orderBy: { orderIndex: "asc" },
        include: {
          progress: { where: { userId: req.user!.userId } },
        },
      },
    },
  });
  res.json({ units });
});
