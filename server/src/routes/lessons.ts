import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, optionalAuth, type AuthRequest } from "../middleware/auth.js";
import { awardXp, updateStreak, loseLife, syncLivesRegen } from "../services/gamification.js";

export const lessonsRouter = Router();

lessonsRouter.get("/languages", async (_req, res) => {
  const languages = await prisma.signLanguage.findMany({
    where: { isActive: true },
    include: { _count: { select: { units: true } } },
  });
  res.json({ languages });
});

lessonsRouter.get("/units/:language", async (req, res) => {
  const code = z.enum(["ASL", "BSL", "LSF", "TSL"]).parse(req.params.language.toUpperCase());
  const units = await prisma.unit.findMany({
    where: { signLanguage: { code } },
    orderBy: { orderIndex: "asc" },
    include: {
      lessons: { orderBy: { orderIndex: "asc" }, select: { id: true, title: true, category: true, xpReward: true } },
    },
  });
  res.json({ units });
});

lessonsRouter.get("/:lessonId", optionalAuth, async (req: AuthRequest, res) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: req.params.lessonId },
    include: {
      exercises: { orderBy: { orderIndex: "asc" }, include: { sign: true } },
      unit: { include: { signLanguage: true } },
    },
  });
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  let progress = null;
  if (req.user) {
    progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: req.user.userId, lessonId: lesson.id } },
    });
  }

  res.json({ lesson, progress });
});

lessonsRouter.post("/:lessonId/complete", authenticate, async (req: AuthRequest, res) => {
  const schema = z.object({
    score: z.number().min(0).transform((n) => Math.min(100, Math.round(n))),
  });
  const { score } = schema.parse(req.body);
  const lessonId = req.params.lessonId;
  const userId = req.user!.userId;

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  const xpEarned = Math.round(lesson.xpReward * (score / 100));
  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, completed: true, score, xpEarned, completedAt: new Date() },
    update: { completed: true, score, xpEarned, completedAt: new Date() },
  });

  const xpResult = await awardXp(userId, xpEarned);
  const streak = await updateStreak(userId);

  res.json({ progress, xp: xpResult, streak });
});

lessonsRouter.post("/:lessonId/exercise/:exerciseId/submit", authenticate, async (req: AuthRequest, res) => {
  const schema = z.object({ answer: z.string() });
  const { answer } = schema.parse(req.body);

  const exercise = await prisma.exercise.findUnique({ where: { id: req.params.exerciseId } });
  if (!exercise) return res.status(404).json({ error: "Exercise not found" });

  const correct = answer.trim().toLowerCase() === exercise.correctAnswer.trim().toLowerCase();
  let xp = 0;
  let livesState = await syncLivesRegen(req.user!.userId);

  if (correct) {
    xp = await awardXp(req.user!.userId, exercise.xpReward);
  } else {
    livesState = await loseLife(req.user!.userId);
  }

  res.json({
    correct,
    correctAnswer: exercise.correctAnswer,
    xp,
    assessment: exercise.instruction,
    lives: livesState.lives,
    nextLifeRegenAt: livesState.nextLifeRegenAt,
    maxLives: livesState.maxLives,
  });
});
