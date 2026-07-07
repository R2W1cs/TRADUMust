import { prisma } from "../lib/prisma.js";

const XP_PER_LEVEL = 500;

export const MAX_LIVES = 5;
export const LIFE_REGEN_MS = 5 * 60 * 60 * 1000;

export type LivesState = {
  lives: number;
  nextLifeRegenAt: Date | null;
  maxLives: number;
};

export async function syncLivesRegen(userId: string): Promise<LivesState> {
  let progress = await prisma.userProgress.findUnique({ where: { userId } });
  if (!progress) {
    return { lives: MAX_LIVES, nextLifeRegenAt: null, maxLives: MAX_LIVES };
  }

  let lives = progress.lives;
  let nextAt = progress.nextLifeRegenAt;

  if (lives >= MAX_LIVES) {
    if (nextAt) {
      await prisma.userProgress.update({
        where: { userId },
        data: { lives: MAX_LIVES, nextLifeRegenAt: null },
      });
    }
    return { lives: MAX_LIVES, nextLifeRegenAt: null, maxLives: MAX_LIVES };
  }

  const now = Date.now();
  if (nextAt) {
    while (lives < MAX_LIVES && nextAt && now >= nextAt.getTime()) {
      lives += 1;
      if (lives < MAX_LIVES) {
        nextAt = new Date(nextAt.getTime() + LIFE_REGEN_MS);
      } else {
        nextAt = null;
      }
    }
  } else if (lives < MAX_LIVES) {
    nextAt = new Date(now + LIFE_REGEN_MS);
  }

  const changed =
    lives !== progress.lives ||
    nextAt?.getTime() !== progress.nextLifeRegenAt?.getTime();

  if (changed) {
    progress = await prisma.userProgress.update({
      where: { userId },
      data: { lives, nextLifeRegenAt: nextAt },
    });
  }

  return { lives: progress.lives, nextLifeRegenAt: progress.nextLifeRegenAt, maxLives: MAX_LIVES };
}

export async function awardXp(userId: string, amount: number) {
  const progress = await prisma.userProgress.upsert({
    where: { userId },
    create: { userId, xp: amount, level: 1 },
    update: { xp: { increment: amount } },
  });

  const newLevel = Math.floor(progress.xp / XP_PER_LEVEL) + 1;
  if (newLevel > progress.level) {
    await prisma.userProgress.update({
      where: { userId },
      data: { level: newLevel },
    });
    await prisma.notification.create({
      data: {
        userId,
        type: "ACHIEVEMENT",
        title: "Level Up!",
        message: `You reached level ${newLevel}!`,
      },
    });
    return { xp: progress.xp + amount, level: newLevel, leveledUp: true };
  }

  return { xp: progress.xp + amount, level: progress.level, leveledUp: false };
}

export async function updateStreak(userId: string) {
  const progress = await prisma.userProgress.findUnique({ where: { userId } });
  if (!progress) return { dailyStreak: 0 };

  const now = new Date();
  const last = progress.lastActiveAt;
  let streak = progress.dailyStreak;

  if (!last) {
    streak = 1;
  } else {
    const daysDiff = Math.floor((now.getTime() - last.getTime()) / 86400000);
    if (daysDiff === 1) streak += 1;
    else if (daysDiff > 1) streak = 1;
  }

  const longestStreak = Math.max(streak, progress.longestStreak);
  await prisma.userProgress.update({
    where: { userId },
    data: { dailyStreak: streak, longestStreak, lastActiveAt: now },
  });

  if (streak > 0 && streak % 7 === 0) {
    await prisma.notification.create({
      data: {
        userId,
        type: "STREAK",
        title: `${streak}-Day Streak!`,
        message: "Keep signing every day to maintain your streak.",
      },
    });
  }

  return { dailyStreak: streak, longestStreak };
}

export async function loseLife(userId: string): Promise<LivesState> {
  const state = await syncLivesRegen(userId);
  if (state.lives <= 0) return state;

  const lives = state.lives - 1;
  let nextLifeRegenAt = state.nextLifeRegenAt;
  if (lives < MAX_LIVES && !nextLifeRegenAt) {
    nextLifeRegenAt = new Date(Date.now() + LIFE_REGEN_MS);
  }

  const progress = await prisma.userProgress.update({
    where: { userId },
    data: { lives, nextLifeRegenAt },
  });

  return {
    lives: progress.lives,
    nextLifeRegenAt: progress.nextLifeRegenAt,
    maxLives: MAX_LIVES,
  };
}

export async function refillLives(userId: string): Promise<LivesState> {
  await prisma.userProgress.update({
    where: { userId },
    data: { lives: MAX_LIVES, nextLifeRegenAt: null },
  });
  return { lives: MAX_LIVES, nextLifeRegenAt: null, maxLives: MAX_LIVES };
}
