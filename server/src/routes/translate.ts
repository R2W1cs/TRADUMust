import { Router } from "express";
import { z } from "zod";
import { aiFetch } from "../lib/aiService.js";
import { optionalAuth, type AuthRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

export const translateRouter = Router();

translateRouter.post("/", optionalAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    text: z.string().min(1),
    sourceLang: z.string().default("en"),
    targetLang: z.string().default("en"),
    signLanguage: z.enum(["ASL", "BSL", "LSF", "TSL"]).optional(),
  });
  const data = schema.parse(req.body);

  try {
    const result = await aiFetch<{
      translated_text: string;
      cultural_note?: string;
      formality_level?: string;
    }>("/api/translate", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (req.user) {
      await prisma.translation.create({
        data: {
          userId: req.user.userId,
          inputText: data.text,
          outputText: result.translated_text,
          signLanguage: data.signLanguage || "ASL",
          metadata: { cultural_note: result.cultural_note },
        },
      });
    }

    res.json(result);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});
