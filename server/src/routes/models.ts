import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireMinRole } from "../middleware/auth.js";

export const modelsRouter = Router();

modelsRouter.get("/", authenticate, requireMinRole("ADMIN"), async (_req, res) => {
  const models = await prisma.aiModel.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ models });
});

modelsRouter.post("/", authenticate, requireMinRole("SUPER_ADMIN"), async (req, res) => {
  const schema = z.object({
    name: z.string(),
    type: z.string(),
    version: z.string(),
    language: z.enum(["ASL", "BSL", "LSF", "TSL"]).optional(),
    accuracy: z.number().optional(),
    config: z.record(z.unknown()).optional(),
  });
  const data = schema.parse(req.body);
  const model = await prisma.aiModel.create({ data });
  res.status(201).json({ model });
});

modelsRouter.patch("/:id/activate", authenticate, requireMinRole("SUPER_ADMIN"), async (req, res) => {
  const model = await prisma.aiModel.findUnique({ where: { id: req.params.id } });
  if (!model) return res.status(404).json({ error: "Model not found" });

  if (model.language) {
    await prisma.aiModel.updateMany({
      where: { type: model.type, language: model.language, isActive: true },
      data: { isActive: false },
    });
  }

  const updated = await prisma.aiModel.update({
    where: { id: model.id },
    data: { isActive: true },
  });
  res.json({ model: updated });
});
