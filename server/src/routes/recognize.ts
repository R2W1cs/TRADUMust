import { Router } from "express";
import { z } from "zod";
import { aiFetch } from "../lib/aiService.js";
import { optionalAuth, type AuthRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

export const recognizeRouter = Router();

recognizeRouter.post("/classify", optionalAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    landmarks: z.array(z.number()),
    signLanguage: z.enum(["ASL", "BSL", "LSF", "TSL"]).default("ASL"),
  });
  const data = schema.parse(req.body);

  try {
    const result = await aiFetch<{
      sign: string;
      confidence: number;
      gloss?: string;
    }>("/api/sign/classify", {
      method: "POST",
      body: JSON.stringify({
        landmarks: data.landmarks,
        sign_language: data.signLanguage,
      }),
    });

    if (req.user && result.sign) {
      await prisma.translation.create({
        data: {
          userId: req.user.userId,
          inputText: result.sign,
          outputText: result.gloss || result.sign,
          signLanguage: data.signLanguage,
          confidence: result.confidence,
        },
      });
    }

    res.json(result);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

recognizeRouter.post("/extract-landmarks", async (req, res) => {
  try {
    const result = await aiFetch("/api/sign/extract-landmarks", {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

recognizeRouter.post("/save", optionalAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    text: z.string(),
    signLanguage: z.enum(["ASL", "BSL", "LSF", "TSL"]),
    confidence: z.number().optional(),
  });
  const data = schema.parse(req.body);

  if (req.user) {
    const entry = await prisma.translation.create({
      data: {
        userId: req.user.userId,
        inputText: data.text,
        outputText: data.text,
        signLanguage: data.signLanguage,
        confidence: data.confidence,
      },
    });
    return res.json({ entry });
  }
  res.json({ saved: false });
});
