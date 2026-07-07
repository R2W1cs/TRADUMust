export interface UserProgress {
  xp: number;
  level: number;
  lives: number;
  nextLifeRegenAt?: string | null;
  dailyStreak: number;
  longestStreak: number;
}

export interface ProgressResponse {
  progress: UserProgress | null;
  lessonProgress: Array<{ completed: boolean; lessonId: string; lesson?: { title: string } }>;
  achievements: Array<{ achievement: { title: string; icon: string; description: string } }>;
  badges: Array<{ badge: { title: string; icon: string } }>;
  certificates: Array<{ id: string; title: string; language: string; issuedAt: string }>;
}

export interface HistoryListResponse {
  items: Array<{
    id: string;
    inputText: string;
    outputText: string;
    signLanguage: string;
    createdAt: string;
    isFavorite: boolean;
  }>;
  total: number;
  page: number;
  pages: number;
}

export interface UnitWithLessons {
  id: string;
  title: string;
  orderIndex: number;
  lessons: Array<{ id: string; title: string; category: string; xpReward: number; progress?: Array<{ completed: boolean }> }>;
}

export interface MapUnit extends UnitWithLessons {
  lessons: Array<{
    id: string;
    title: string;
    category: string;
    xpReward: number;
    progress: Array<{ completed: boolean; score: number | null }>;
  }>;
}

export interface LessonExercise {
  id: string;
  type: string;
  question: string;
  instruction: string | null;
  options: string[];
  correctAnswer: string;
  xpReward?: number;
  sign?: { english: string; gloss: string | null; description?: string | null } | null;
}

export interface AdminAnalytics {
  users: { total: number; daily: number; monthly: number };
  translations: number;
  lessonCompletions: number;
  averageXp: number;
  datasets: number;
  activeModels: number;
  systemHealth: { status: string; uptime: number };
  popularLessons: Array<{ lessonId: string; _count: { lessonId: number } }>;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  preferredLanguage: string;
  theme: string;
  emailVerified: boolean;
  progress?: UserProgress | null;
  certificates?: Array<{ id: string; title: string; language: string; issuedAt: string }>;
}
