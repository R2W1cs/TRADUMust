import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { hashPassword, comparePassword } from "../lib/password.js";
import { signToken } from "../lib/jwt.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";

import { syncLivesRegen } from "../services/gamification.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await hashPassword(password);
  const verifyToken = crypto.randomBytes(32).toString("hex");

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      verifyToken,
      progress: { create: {} },
    },
  });

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.status(201).json({
    token,
    user: sanitizeUser(user),
    message: "Registration successful. Please verify your email.",
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user?.passwordHash) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await comparePassword(parsed.data.password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.json({ token, user: sanitizeUser(user) });
});

authRouter.get("/me", authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { progress: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const livesState = await syncLivesRegen(user.id);
  const progress = user.progress
    ? { ...user.progress, lives: livesState.lives, nextLifeRegenAt: livesState.nextLifeRegenAt }
    : null;

  res.json({ user: sanitizeUser(user), progress });
});

authRouter.post("/forgot-password", async (req, res) => {
  const email = z.string().email().parse(req.body.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry: new Date(Date.now() + 3600000),
      },
    });
  }
  res.json({ message: "If that email exists, a reset link has been sent." });
});

authRouter.post("/reset-password", async (req, res) => {
  const schema = z.object({ token: z.string(), password: z.string().min(8) });
  const { token, password } = schema.parse(req.body);
  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
  });
  if (!user) return res.status(400).json({ error: "Invalid or expired reset token" });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      resetToken: null,
      resetTokenExpiry: null,
    },
  });
  res.json({ message: "Password reset successful" });
});

authRouter.post("/verify-email", async (req, res) => {
  const token = z.string().parse(req.body.token);
  const user = await prisma.user.findFirst({ where: { verifyToken: token } });
  if (!user) return res.status(400).json({ error: "Invalid verification token" });
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null },
  });
  res.json({ message: "Email verified" });
});

authRouter.post("/oauth/google", async (req, res) => {
  const { googleId, email, name } = z.object({
    googleId: z.string(),
    email: z.string().email(),
    name: z.string(),
  }).parse(req.body);

  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
    include: { progress: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        googleId,
        email,
        name,
        emailVerified: true,
        progress: { create: {} },
      },
      include: { progress: true },
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId, emailVerified: true },
      include: { progress: true },
    });
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.json({ token, user: sanitizeUser(user) });
});

authRouter.post("/oauth/github", async (req, res) => {
  const { githubId, email, name } = z.object({
    githubId: z.string(),
    email: z.string().email(),
    name: z.string(),
  }).parse(req.body);

  let user = await prisma.user.findFirst({
    where: { OR: [{ githubId }, { email }] },
    include: { progress: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        githubId,
        email,
        name,
        emailVerified: true,
        progress: { create: {} },
      },
      include: { progress: true },
    });
  } else if (!user.githubId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { githubId, emailVerified: true },
      include: { progress: true },
    });
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.json({ token, user: sanitizeUser(user) });
});

function sanitizeUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  preferredLanguage: string;
  theme: string;
  emailVerified: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    preferredLanguage: user.preferredLanguage,
    theme: user.theme,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}
