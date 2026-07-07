import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireMinRole, type AuthRequest } from "../middleware/auth.js";

export const datasetsRouter = Router();

datasetsRouter.get("/", authenticate, requireMinRole("ADMIN"), async (_req, res) => {
  const datasets = await prisma.dataset.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ datasets });
});

datasetsRouter.post("/", authenticate, requireMinRole("ADMIN"), async (req: AuthRequest, res) => {
  const schema = z.object({
    name: z.string(),
    description: z.string().optional(),
    language: z.enum(["ASL", "BSL", "LSF", "TSL"]),
    fileUrl: z.string().optional(),
    recordCount: z.number().default(0),
  });
  const data = schema.parse(req.body);
  const dataset = await prisma.dataset.create({ data: { ...data, status: "pending" } });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: "DATASET_CREATE",
      resource: dataset.id,
      details: { name: data.name },
    },
  });

  res.status(201).json({ dataset });
});

datasetsRouter.patch("/:id/approve", authenticate, requireMinRole("ADMIN"), async (req: AuthRequest, res) => {
  const dataset = await prisma.dataset.update({
    where: { id: req.params.id },
    data: { status: "approved", approvedBy: req.user!.userId },
  });
  res.json({ dataset });
});
