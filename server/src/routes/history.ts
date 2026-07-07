import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";

export const historyRouter = Router();

historyRouter.get("/", authenticate, async (req: AuthRequest, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const search = req.query.search as string | undefined;
  const favorite = req.query.favorite === "true";

  const where = {
    userId: req.user!.userId,
    ...(favorite ? { isFavorite: true } : {}),
    ...(search ? { OR: [{ inputText: { contains: search, mode: "insensitive" as const } }, { outputText: { contains: search, mode: "insensitive" as const } }] } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.translation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.translation.count({ where }),
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

historyRouter.patch("/:id/favorite", authenticate, async (req: AuthRequest, res) => {
  const item = await prisma.translation.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!item) return res.status(404).json({ error: "Not found" });

  const updated = await prisma.translation.update({
    where: { id: item.id },
    data: { isFavorite: !item.isFavorite },
  });
  res.json({ item: updated });
});

historyRouter.delete("/:id", authenticate, async (req: AuthRequest, res) => {
  const result = await prisma.translation.deleteMany({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!result.count) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

historyRouter.post("/export", authenticate, async (req: AuthRequest, res) => {
  const items = await prisma.translation.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
  });

  const lines = items.map((t) =>
    `[${t.createdAt.toISOString()}] ${t.signLanguage}\nInput: ${t.inputText}\nOutput: ${t.outputText || ""}\n---`
  );
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", "attachment; filename=tradumust-history.txt");
  res.send(lines.join("\n\n"));
});
