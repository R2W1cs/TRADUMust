import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireMinRole, type AuthRequest } from "../middleware/auth.js";

export const searchRouter = Router();

searchRouter.get("/", authenticate, async (req: AuthRequest, res) => {
  const q = (req.query.q as string)?.trim();
  if (!q || q.length < 2) return res.json({ results: [] });

  const isAdmin = req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN";

  const [lessons, history, signs] = await Promise.all([
    prisma.lesson.findMany({
      where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
      take: 10,
      select: { id: true, title: true, category: true },
    }),
    prisma.translation.findMany({
      where: {
        userId: req.user!.userId,
        OR: [{ inputText: { contains: q, mode: "insensitive" } }, { outputText: { contains: q, mode: "insensitive" } }],
      },
      take: 10,
      select: { id: true, inputText: true, outputText: true, createdAt: true },
    }),
    prisma.sign.findMany({
      where: { OR: [{ gloss: { contains: q, mode: "insensitive" } }, { english: { contains: q, mode: "insensitive" } }] },
      take: 10,
      select: { id: true, gloss: true, english: true },
    }),
  ]);

  let users: unknown[] = [];
  let datasets: unknown[] = [];
  let models: unknown[] = [];

  if (isAdmin) {
    [users, datasets, models] = await Promise.all([
      prisma.user.findMany({
        where: { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] },
        take: 5,
        select: { id: true, email: true, name: true, role: true },
      }),
      prisma.dataset.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        take: 5,
      }),
      prisma.aiModel.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        take: 5,
      }),
    ]);
  }

  res.json({
    results: {
      lessons,
      history,
      signs,
      ...(isAdmin ? { users, datasets, models } : {}),
    },
  });
});
