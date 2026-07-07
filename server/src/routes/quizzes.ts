import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { awardXp } from "../services/gamification.js";

export const quizzesRouter = Router();

quizzesRouter.get("/lesson/:lessonId", async (req, res) => {
  const quizzes = await prisma.quiz.findMany({
    where: { lessonId: req.params.lessonId },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  res.json({ quizzes });
});

quizzesRouter.post("/:quizId/submit", authenticate, async (req: AuthRequest, res) => {
  const schema = z.object({
    answers: z.record(z.string()),
  });
  const { answers } = schema.parse(req.body);

  const quiz = await prisma.quiz.findUnique({
    where: { id: req.params.quizId },
    include: { questions: true },
  });
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });

  let correct = 0;
  for (const q of quiz.questions) {
    if (answers[q.id]?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
      correct++;
    }
  }

  const score = Math.round((correct / quiz.questions.length) * 100);
  const passed = score >= quiz.passingScore;
  const xpEarned = passed ? quiz.xpReward : Math.round(quiz.xpReward * 0.3);

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: req.user!.userId,
      quizId: quiz.id,
      score,
      passed,
      xpEarned,
    },
  });

  const xp = await awardXp(req.user!.userId, xpEarned);
  res.json({ attempt, score, passed, xp });
});
