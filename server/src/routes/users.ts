import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.get("/profile", authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: {
      progress: true,
      achievements: { include: { achievement: true } },
      badges: { include: { badge: true } },
      certificates: true,
    },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

usersRouter.patch("/profile", authenticate, async (req: AuthRequest, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    avatarUrl: z.string().url().optional().nullable(),
    preferredLanguage: z.enum(["ASL", "BSL", "LSF", "TSL"]).optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
  });
  const data = schema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data,
  });
  res.json({ user });
});

usersRouter.post("/change-password", authenticate, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8),
  }).parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user?.passwordHash) return res.status(400).json({ error: "No password set" });

  const { comparePassword, hashPassword } = await import("../lib/password.js");
  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Current password incorrect" });

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  res.json({ message: "Password updated" });
});

usersRouter.get("/notifications", authenticate, async (req: AuthRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ notifications });
});

usersRouter.patch("/notifications/:id/read", authenticate, async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.userId },
    data: { read: true },
  });
  res.json({ ok: true });
});
