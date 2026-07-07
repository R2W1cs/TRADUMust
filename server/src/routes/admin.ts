import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireMinRole, requireRole, type AuthRequest } from "../middleware/auth.js";
import { hashPassword } from "../lib/password.js";

export const adminRouter = Router();
adminRouter.use(authenticate, requireMinRole("ADMIN"));

adminRouter.get("/analytics", async (_req, res) => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  const [
    totalUsers,
    dailyUsers,
    monthlyUsers,
    totalTranslations,
    lessonCompletions,
    avgXp,
    datasets,
    models,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { updatedAt: { gte: dayAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.translation.count(),
    prisma.lessonProgress.count({ where: { completed: true } }),
    prisma.userProgress.aggregate({ _avg: { xp: true } }),
    prisma.dataset.count(),
    prisma.aiModel.count({ where: { isActive: true } }),
  ]);

  const popularLessons = await prisma.lessonProgress.groupBy({
    by: ["lessonId"],
    _count: { lessonId: true },
    orderBy: { _count: { lessonId: "desc" } },
    take: 5,
  });

  res.json({
    users: { total: totalUsers, daily: dailyUsers, monthly: monthlyUsers },
    translations: totalTranslations,
    lessonCompletions,
    averageXp: Math.round(avgXp._avg.xp || 0),
    datasets,
    activeModels: models,
    popularLessons,
    systemHealth: { status: "healthy", uptime: process.uptime() },
  });
});

adminRouter.get("/users", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = 20;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, name: true, role: true, createdAt: true, emailVerified: true,
        progress: { select: { xp: true, level: true, lives: true, dailyStreak: true } },
      },
    }),
    prisma.user.count(),
  ]);
  res.json({ users, total, page });
});

adminRouter.patch("/users/:id/role", requireRole("SUPER_ADMIN"), async (req, res) => {
  const role = z.enum(["USER", "ADMIN", "SUPER_ADMIN"]).parse(req.body.role);
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
  });
  res.json({ user });
});

adminRouter.post("/users", requireRole("SUPER_ADMIN"), async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string(),
    role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]).default("ADMIN"),
  });
  const data = schema.parse(req.body);
  const user = await prisma.user.create({
    data: {
      ...data,
      passwordHash: await hashPassword(data.password),
      emailVerified: true,
      progress: { create: {} },
    },
  });
  res.status(201).json({ user });
});

adminRouter.get("/lessons", async (_req, res) => {
  const lessons = await prisma.lesson.findMany({
    include: { unit: { include: { signLanguage: true } }, _count: { select: { exercises: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ lessons });
});

adminRouter.post("/lessons", async (req, res) => {
  const schema = z.object({
    unitId: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.string(),
    orderIndex: z.number(),
    xpReward: z.number().default(20),
  });
  const data = schema.parse(req.body);
  const lesson = await prisma.lesson.create({ data });
  res.status(201).json({ lesson });
});

adminRouter.get("/audit-logs", async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true, name: true } } },
  });
  res.json({ logs });
});

adminRouter.get("/settings", requireRole("SUPER_ADMIN"), async (_req, res) => {
  const settings = await prisma.systemSetting.findMany();
  res.json({ settings });
});

adminRouter.put("/settings/:key", requireRole("SUPER_ADMIN"), async (req, res) => {
  const value = req.body.value;
  const setting = await prisma.systemSetting.upsert({
    where: { key: req.params.key },
    create: { key: req.params.key, value },
    update: { value },
  });
  res.json({ setting });
});
