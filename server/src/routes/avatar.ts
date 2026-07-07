import { Router } from "express";
import { z } from "zod";
import { aiFetch } from "../lib/aiService.js";
import { optionalAuth, type AuthRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

export const avatarRouter = Router();

avatarRouter.post("/translate", optionalAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    text: z.string().min(1).max(2000),
    signLanguage: z.enum(["ASL", "BSL", "LSF", "TSL"]).default("ASL"),
    speed: z.number().min(0.5).max(2).optional(),
  });
  const data = schema.parse(req.body);

  try {
    const result = await aiFetch<{
      gloss: string[];
      word_sequence: { word: string; animation_key: string; duration: number }[];
      metadata: Record<string, unknown>;
    }>("/api/text-to-sign", {
      method: "POST",
      body: JSON.stringify({
        text: data.text,
        sign_language: data.signLanguage,
      }),
    });

    if (req.user) {
      await prisma.translation.create({
        data: {
          userId: req.user.userId,
          inputText: data.text,
          outputText: result.gloss?.join(" ") || "",
          signLanguage: data.signLanguage,
          gloss: result.gloss,
          metadata: result.metadata,
        },
      });
    }

    res.json({
      gloss: result.gloss,
      wordSequence: result.word_sequence,
      signLanguage: data.signLanguage,
      metadata: result.metadata,
    });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

avatarRouter.get("/animations/:language", async (req, res) => {
  const lang = z.enum(["ASL", "BSL", "LSF", "TSL"]).parse(req.params.language.toUpperCase());
  const animations = await prisma.animation.findMany({
    where: { signLanguage: { code: lang } },
    take: 100,
  });
  res.json({ animations });
});
