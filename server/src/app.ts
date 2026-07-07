import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { avatarRouter } from "./routes/avatar.js";
import { translateRouter } from "./routes/translate.js";
import { recognizeRouter } from "./routes/recognize.js";
import { lessonsRouter } from "./routes/lessons.js";
import { quizzesRouter } from "./routes/quizzes.js";
import { progressRouter } from "./routes/progress.js";
import { historyRouter } from "./routes/history.js";
import { adminRouter } from "./routes/admin.js";
import { datasetsRouter } from "./routes/datasets.js";
import { modelsRouter } from "./routes/models.js";
import { searchRouter } from "./routes/search.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:1234",
    "http://localhost:3000",
    "http://127.0.0.1:1234",
  ],
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "tradumust-api", version: "1.0.0" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/avatar", avatarRouter);
app.use("/api/translate", translateRouter);
app.use("/api/recognize", recognizeRouter);
app.use("/api/lessons", lessonsRouter);
app.use("/api/quizzes", quizzesRouter);
app.use("/api/progress", progressRouter);
app.use("/api/history", historyRouter);
app.use("/api/admin", adminRouter);
app.use("/api/datasets", datasetsRouter);
app.use("/api/models", modelsRouter);
app.use("/api/search", searchRouter);

app.use(errorHandler);
