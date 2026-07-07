import "../src/load-env.js";
import { PrismaClient, SignLanguageCode, ExerciseType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TSL_UNITS, TSL_SCENARIOS, type TslSignDef } from "./tsl-curriculum.js";

const prisma = new PrismaClient();

type SignDef = { gloss: string; english: string; description: string };

/** Real vocabulary grouped by lesson topic */
const LESSON_PLANS: { title: string; description: string; category: string; signs: SignDef[] }[] = [
  {
    title: "Basic greetings",
    description: "Hello, goodbye, and polite openers",
    category: "Greetings",
    signs: [
      { gloss: "HELLO", english: "Hello", description: "Open hand salute near forehead" },
      { gloss: "GOODBYE", english: "Goodbye", description: "Open hand wave side to side" },
      { gloss: "GOOD_MORNING", english: "Good morning", description: "Flat hand rises from opposite arm" },
      { gloss: "PLEASE", english: "Please", description: "Flat hand circles on chest" },
    ],
  },
  {
    title: "Politeness",
    description: "Thank you, sorry, and excuse me",
    category: "Greetings",
    signs: [
      { gloss: "THANK_YOU", english: "Thank you", description: "Fingers touch chin then move forward" },
      { gloss: "SORRY", english: "Sorry", description: "Fist circles on chest" },
      { gloss: "EXCUSE_ME", english: "Excuse me", description: "Flat hands brush past each other" },
      { gloss: "YOU_WELCOME", english: "You're welcome", description: "Open hand moves from chin outward" },
    ],
  },
  {
    title: "Yes & no",
    description: "Agree, disagree, and simple responses",
    category: "Conversation",
    signs: [
      { gloss: "YES", english: "Yes", description: "Fist nods like a head nod" },
      { gloss: "NO", english: "No", description: "Index and middle tap together twice" },
      { gloss: "MAYBE", english: "Maybe", description: "Palms up alternate side to side" },
      { gloss: "UNDERSTAND", english: "I understand", description: "Index finger flicks up from palm" },
    ],
  },
  {
    title: "Introductions",
    description: "Name and meeting people",
    category: "Conversation",
    signs: [
      { gloss: "MY_NAME", english: "My name is", description: "Index fingers tap at each hand" },
      { gloss: "NICE_MEET", english: "Nice to meet you", description: "Flat hands move toward each other" },
      { gloss: "HOW_ARE_YOU", english: "How are you?", description: "Open hands move forward curiously" },
      { gloss: "FINE", english: "I'm fine", description: "Flat hand moves forward from chest" },
    ],
  },
];

const UNITS = [
  { title: "Unit 1 — Foundations", description: "Start with everyday signs everyone uses", orderIndex: 1 },
  { title: "Unit 2 — Daily life", description: "Signs for home, food, and family", orderIndex: 2 },
];

const UNIT2_LESSONS = [
  {
    title: "Family",
    description: "Parents, siblings, and relatives",
    category: "Family",
    signs: [
      { gloss: "MOTHER", english: "Mother", description: "Open hand taps thumb on chin" },
      { gloss: "FATHER", english: "Father", description: "Open hand taps thumb on forehead" },
      { gloss: "SISTER", english: "Sister", description: "Index finger circles near cheek" },
      { gloss: "BROTHER", english: "Brother", description: "Index finger at forehead moves out" },
    ],
  },
  {
    title: "Food & drink",
    description: "Common food vocabulary",
    category: "Food",
    signs: [
      { gloss: "WATER", english: "Water", description: "W finger taps chin twice" },
      { gloss: "FOOD", english: "Food", description: "Fingers touch mouth then move down" },
      { gloss: "COFFEE", english: "Coffee", description: "Hands mimic grinding beans" },
      { gloss: "HUNGRY", english: "Hungry", description: "C hand moves down chest" },
    ],
  },
];

function pickDistractors(pool: string[], correct: string, count = 3): string[] {
  return pool.filter((w) => w !== correct).sort(() => Math.random() - 0.5).slice(0, count);
}

/** Scenario-style prompts — varied, lesson-scoped, not copy-paste boilerplate */
const SIGN_SCENARIOS: Record<string, string> = {
  HELLO: "A new neighbor signs this when they meet you.",
  GOODBYE: "Your friend signs this before walking away.",
  GOOD_MORNING: "At the start of the day, someone signs this greeting.",
  PLEASE: "They are making a polite request.",
  THANK_YOU: "They sign this right after you help them.",
  SORRY: "They regret something and sign this.",
  EXCUSE_ME: "They sign this to get your attention politely.",
  YOU_WELCOME: "You did a favor — they sign this in reply.",
  YES: "They confirm what you asked.",
  NO: "They refuse or disagree.",
  MAYBE: "They are uncertain.",
  UNDERSTAND: "They signal that your explanation made sense.",
  MY_NAME: "They tap their hands to introduce themselves.",
  NICE_MEET: "First handshake moment — they sign this.",
  HOW_ARE_YOU: "They check in on how you feel.",
  FINE: "They answer that everything is okay.",
  MOTHER: "Thumb on the chin — which family member?",
  FATHER: "Thumb on the forehead — which family member?",
  SISTER: "Which sibling does this sign describe?",
  BROTHER: "Which sibling does this sign describe?",
  WATER: "Which drink are they referring to?",
  FOOD: "Which general word fits this sign?",
  COFFEE: "Which warm drink is this?",
  HUNGRY: "They sign how their stomach feels.",
};

function buildExercise(
  type: ExerciseType,
  sign: SignDef,
  lessonPool: string[],
  langCode: SignLanguageCode,
  orderIndex: number,
  lessonTitle: string,
  signIndex: number
) {
  const lang = langCode;
  const distractors = pickDistractors(lessonPool, sign.english);
  const mcOptions = [sign.english, ...distractors].sort(() => Math.random() - 0.5);
  const scenario = SIGN_SCENARIOS[sign.gloss] ?? `From "${lessonTitle}" — what does this sign mean?`;

  const base = {
    type,
    correctAnswer: sign.english,
    orderIndex,
    xpReward: 10,
  };

  switch (type) {
    case "WATCH_AVATAR":
      return {
        ...base,
        question: sign.description,
        instruction: `New sign: "${sign.english}"`,
      };
    case "MULTIPLE_CHOICE":
      return {
        ...base,
        question: `Which English meaning matches the sign shown?`,
        instruction: `Multiple choice`,
        options: mcOptions,
      };
    case "MATCH_SIGN":
      return {
        ...base,
        question: `Pick the English word that matches the sign shown.`,
        instruction: `Match the signer to the correct word`,
        options: mcOptions,
      };
    case "FILL_BLANK":
      return {
        ...base,
        question: `Type the English meaning of the sign you see.`,
        instruction: `What word or phrase does this ${lang} sign represent?`,
        options: [],
      };
    case "CAMERA_CHALLENGE":
      return {
        ...base,
        question: sign.description,
        instruction: `Sign "${sign.english}" in ${lang}`,
        options: [],
      };
    default:
      return {
        ...base,
        question: scenario,
        instruction: sign.description,
        options: mcOptions,
      };
  }
}

/** One practice type per sign — avoids 3 identical MC rounds for the same word */
const PRACTICE_BY_INDEX: ExerciseType[] = ["MULTIPLE_CHOICE", "FILL_BLANK", "MATCH_SIGN"];

function buildTslExercise(
  type: ExerciseType,
  sign: TslSignDef,
  lessonPool: string[],
  orderIndex: number,
  lessonTitle: string,
  signIndex: number
) {
  const distractors = pickDistractors(lessonPool, sign.english);
  const mcOptions = [sign.english, ...distractors].sort(() => Math.random() - 0.5);
  const scenario = TSL_SCENARIOS[sign.gloss] ?? `From "${lessonTitle}" — what does this TSL sign mean?`;

  const base = {
    type,
    correctAnswer: sign.english,
    orderIndex,
    xpReward: 10,
  };

  switch (type) {
    case "WATCH_AVATAR":
      return {
        ...base,
        question: sign.description,
        instruction: `Watch: ${sign.english} (${sign.gloss})`,
      };
    case "MULTIPLE_CHOICE":
      return {
        ...base,
        question: `Which English meaning matches this Tunisian sign?`,
        instruction: scenario,
        options: mcOptions,
      };
    case "MATCH_SIGN":
      return {
        ...base,
        question: `Pick the English word for this Tunisian sign.`,
        instruction: scenario,
        options: mcOptions,
      };
    case "FILL_BLANK":
      return {
        ...base,
        question: `Type the English meaning of the Tunisian sign shown.`,
        instruction: `What does this TSL sign mean?`,
        options: [],
      };
    case "CAMERA_CHALLENGE":
      return {
        ...base,
        correctAnswer: sign.gloss,
        question: sign.description,
        instruction: `Perform the sign for "${sign.english}" (${sign.gloss})`,
        options: [],
      };
    default:
      return { ...base, question: scenario, instruction: sign.description, options: mcOptions };
  }
}

async function seedTslCourse() {
  const lang = await prisma.signLanguage.upsert({
    where: { code: "TSL" },
    update: { name: "Tunisian Sign Language", nativeName: "لغة الإشارة التونسية", region: "Tunisia", isActive: true },
    create: {
      code: "TSL" as SignLanguageCode,
      name: "Tunisian Sign Language",
      nativeName: "لغة الإشارة التونسية",
      region: "Tunisia",
      isActive: true,
    },
  });

  const allTslSigns = TSL_UNITS.flatMap((u) => u.lessons.flatMap((l) => l.signs));
  const signIdMap = new Map<string, string>();

  for (const def of allTslSigns) {
    const sign = await prisma.sign.create({
      data: {
        signLanguageId: lang.id,
        gloss: def.gloss,
        english: def.english,
        description: def.description,
        animationKey: def.imageKey,
      },
    });
    signIdMap.set(def.gloss, sign.id);
  }

  for (const unitData of TSL_UNITS) {
    const unit = await prisma.unit.create({
      data: {
        title: unitData.title,
        description: unitData.description,
        orderIndex: unitData.orderIndex,
        signLanguageId: lang.id,
        xpReward: 120,
      },
    });

    for (let i = 0; i < unitData.lessons.length; i++) {
      const plan = unitData.lessons[i];
      const lesson = await prisma.lesson.create({
        data: {
          unitId: unit.id,
          title: plan.title,
          description: plan.description,
          category: plan.category,
          orderIndex: i + 1,
          xpReward: 30 + i * 5,
        },
      });

      const lessonPool = plan.signs.map((s) => s.english);
      let order = 1;

      for (let si = 0; si < plan.signs.length; si++) {
        const signDef = plan.signs[si];
        const signId = signIdMap.get(signDef.gloss)!;

        const watch = buildTslExercise("WATCH_AVATAR", signDef, lessonPool, order++, plan.title, si);
        await prisma.exercise.create({
          data: {
            lessonId: lesson.id,
            type: watch.type,
            question: watch.question,
            instruction: watch.instruction,
            correctAnswer: watch.correctAnswer,
            signId,
            orderIndex: watch.orderIndex,
            xpReward: watch.xpReward,
          },
        });

        const practiceType = PRACTICE_BY_INDEX[si % PRACTICE_BY_INDEX.length];
        const practice = buildTslExercise(practiceType, signDef, lessonPool, order++, plan.title, si);
        await prisma.exercise.create({
          data: {
            lessonId: lesson.id,
            type: practice.type,
            question: practice.question,
            instruction: practice.instruction,
            options: practice.options?.length ? practice.options : undefined,
            correctAnswer: practice.correctAnswer,
            signId,
            orderIndex: practice.orderIndex,
            xpReward: practice.xpReward,
          },
        });
      }

      for (let ri = 0; ri < Math.min(2, plan.signs.length); ri++) {
        const signDef = plan.signs[ri];
        const signId = signIdMap.get(signDef.gloss)!;
        const recap = buildTslExercise("MULTIPLE_CHOICE", signDef, lessonPool, order++, plan.title, ri);
        await prisma.exercise.create({
          data: {
            lessonId: lesson.id,
            type: recap.type,
            question: `Which English meaning matches the Tunisian sign shown?`,
            instruction: recap.instruction,
            options: recap.options?.length ? recap.options : undefined,
            correctAnswer: recap.correctAnswer,
            signId,
            orderIndex: recap.orderIndex,
            xpReward: 12,
          },
        });
      }

      const challengeSign = plan.signs[plan.signs.length - 1];
      const cam = buildTslExercise("CAMERA_CHALLENGE", challengeSign, lessonPool, order++);
      await prisma.exercise.create({
        data: {
          lessonId: lesson.id,
          type: cam.type,
          question: cam.question,
          instruction: cam.instruction,
          correctAnswer: cam.correctAnswer,
          signId: signIdMap.get(challengeSign.gloss)!,
          orderIndex: cam.orderIndex,
          xpReward: 15,
        },
      });

      await prisma.quiz.create({
        data: {
          lessonId: lesson.id,
          title: `${plan.title} — review`,
          passingScore: 70,
          xpReward: 30,
          questions: {
            create: plan.signs.map((s, idx) => ({
              question: `Which English meaning matches this TSL sign?`,
              options: pickDistractors(lessonPool, s.english, 3).concat(s.english).sort(() => Math.random() - 0.5),
              correctAnswer: s.english,
              orderIndex: idx + 1,
            })),
          },
        },
      });
    }
  }

  await prisma.dataset.upsert({
    where: { id: "tsl-first-dataset" },
    update: { recordCount: allTslSigns.length, status: "approved" },
    create: {
      id: "tsl-first-dataset",
      name: "First Tunisian Sign Language Dataset",
      description: "Community-collected TSL image dataset — growing sign by sign",
      language: "TSL",
      fileUrl: "data/tsl-dataset-raw",
      status: "approved",
      recordCount: allTslSigns.length,
    },
  });

  console.log(`  TSL course: ${TSL_UNITS.length} units, ${allTslSigns.length} signs`);
}

async function clearCourseContent() {
  await prisma.quizAttempt.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.sign.deleteMany();
}

async function main() {
  console.log("Seeding TRADUMUST database...");

  const adminHash = await bcrypt.hash("Admin123!", 12);
  const userHash = await bcrypt.hash("User12345!", 12);

  await prisma.user.upsert({
    where: { email: "admin@tradumust.com" },
    update: {},
    create: {
      email: "admin@tradumust.com",
      passwordHash: adminHash,
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
      emailVerified: true,
      progress: { create: { xp: 1000, level: 3 } },
    },
  });

  await prisma.user.upsert({
    where: { email: "demo@tradumust.com" },
    update: {},
    create: {
      email: "demo@tradumust.com",
      passwordHash: userHash,
      name: "Demo User",
      role: Role.USER,
      emailVerified: true,
      progress: { create: { xp: 250, level: 1, dailyStreak: 3 } },
    },
  });

  await clearCourseContent();

  const languages: { code: SignLanguageCode; name: string; nativeName: string; region: string }[] = [
    { code: "ASL", name: "American Sign Language", nativeName: "ASL", region: "United States" },
    { code: "BSL", name: "British Sign Language", nativeName: "BSL", region: "United Kingdom" },
    { code: "LSF", name: "French Sign Language", nativeName: "Langue des Signes Française", region: "France" },
  ];

  const allSignDefs = [...LESSON_PLANS, ...UNIT2_LESSONS].flatMap((l) => l.signs);

  for (const lang of languages) {
    const signLanguage = await prisma.signLanguage.upsert({
      where: { code: lang.code },
      update: {},
      create: lang,
    });

    const signIdMap = new Map<string, string>();
    for (const def of allSignDefs) {
      const sign = await prisma.sign.create({
        data: {
          signLanguageId: signLanguage.id,
          gloss: def.gloss,
          english: def.english,
          description: def.description,
          animationKey: def.gloss.toLowerCase(),
        },
      });
      signIdMap.set(def.gloss, sign.id);
    }

    for (const unitData of UNITS) {
      const unit = await prisma.unit.create({
        data: { ...unitData, signLanguageId: signLanguage.id, xpReward: 100 },
      });

      const lessons = unitData.orderIndex === 1 ? LESSON_PLANS : UNIT2_LESSONS;

      for (let i = 0; i < lessons.length; i++) {
        const plan = lessons[i];
        const lesson = await prisma.lesson.create({
          data: {
            unitId: unit.id,
            title: plan.title,
            description: plan.description,
            category: plan.category,
            orderIndex: i + 1,
            xpReward: 25 + i * 5,
          },
        });

        const lessonPool = plan.signs.map((s) => s.english);

        let order = 1;
        for (let si = 0; si < plan.signs.length; si++) {
          const signDef = plan.signs[si];
          const signId = signIdMap.get(signDef.gloss)!;

          // Intro: watch the sign
          const watch = buildExercise("WATCH_AVATAR", signDef, lessonPool, lang.code, order++, plan.title, si);
          await prisma.exercise.create({
            data: {
              lessonId: lesson.id,
              type: watch.type,
              question: watch.question,
              instruction: watch.instruction,
              correctAnswer: watch.correctAnswer,
              signId,
              orderIndex: watch.orderIndex,
              xpReward: watch.xpReward,
            },
          });

          // One varied practice round per sign (not all 3 types)
          const practiceType = PRACTICE_BY_INDEX[si % PRACTICE_BY_INDEX.length];
          const practice = buildExercise(practiceType, signDef, lessonPool, lang.code, order++, plan.title, si);
          await prisma.exercise.create({
            data: {
              lessonId: lesson.id,
              type: practice.type,
              question: practice.question,
              instruction: practice.instruction,
              options: practice.options?.length ? practice.options : undefined,
              correctAnswer: practice.correctAnswer,
              signId,
              orderIndex: practice.orderIndex,
              xpReward: practice.xpReward,
            },
          });
        }

        // Lesson recap: mixed multiple choice from lesson vocabulary
        for (let ri = 0; ri < Math.min(2, plan.signs.length); ri++) {
          const signDef = plan.signs[ri];
          const signId = signIdMap.get(signDef.gloss)!;
          const recap = buildExercise("MULTIPLE_CHOICE", signDef, lessonPool, lang.code, order++, plan.title, ri);
          await prisma.exercise.create({
            data: {
              lessonId: lesson.id,
              type: recap.type,
              question: `Which English meaning matches the sign shown?`,
              instruction: recap.instruction,
              options: recap.options?.length ? recap.options : undefined,
              correctAnswer: recap.correctAnswer,
              signId,
              orderIndex: recap.orderIndex,
              xpReward: 12,
            },
          });
        }

        // One signing challenge at the end of the lesson
        const challengeSign = plan.signs[plan.signs.length - 1];
        const cam = buildExercise("CAMERA_CHALLENGE", challengeSign, lessonPool, lang.code, order++);
        await prisma.exercise.create({
          data: {
            lessonId: lesson.id,
            type: cam.type,
            question: cam.question,
            instruction: cam.instruction,
            correctAnswer: cam.correctAnswer,
            signId: signIdMap.get(challengeSign.gloss)!,
            orderIndex: cam.orderIndex,
            xpReward: 15,
          },
        });

        await prisma.quiz.create({
          data: {
            lessonId: lesson.id,
            title: `${plan.title} — review`,
            passingScore: 70,
            xpReward: 30,
            questions: {
              create: plan.signs.map((s, idx) => ({
                question: `Which English meaning matches this ${lang.code} sign?`,
                options: pickDistractors(lessonPool, s.english, 3).concat(s.english).sort(() => Math.random() - 0.5),
                correctAnswer: s.english,
                orderIndex: idx + 1,
              })),
            },
          },
        });
      }
    }
  }

  await seedTslCourse();

  const achievements = [
    { key: "first_lesson", title: "First Steps", description: "Complete your first lesson", icon: "🎯", xpReward: 50 },
    { key: "streak_7", title: "Week Warrior", description: "Maintain a 7-day streak", icon: "🔥", xpReward: 100 },
    { key: "streak_30", title: "Monthly Master", description: "30-day learning streak", icon: "⭐", xpReward: 500 },
    { key: "xp_1000", title: "Rising Star", description: "Earn 1000 XP", icon: "🌟", xpReward: 100 },
    { key: "translator", title: "Bridge Builder", description: "Complete 10 translations", icon: "🌉", xpReward: 75 },
  ];

  for (const a of achievements) {
    await prisma.achievement.upsert({ where: { key: a.key }, update: {}, create: a });
  }

  const badges = [
    { key: "asl_bronze", title: "ASL Explorer", description: "Complete 5 ASL lessons", icon: "🥉", tier: "bronze" },
    { key: "bsl_bronze", title: "BSL Explorer", description: "Complete 5 BSL lessons", icon: "🥉", tier: "bronze" },
    { key: "lsf_bronze", title: "LSF Explorer", description: "Complete 5 LSF lessons", icon: "🥉", tier: "bronze" },
    { key: "tsl_bronze", title: "TSL Explorer", description: "Complete 5 TSL lessons", icon: "🥉", tier: "bronze" },
    { key: "polyglot", title: "Sign Polyglot", description: "Learn all four languages", icon: "🏆", tier: "gold" },
  ];

  for (const b of badges) {
    await prisma.badge.upsert({ where: { key: b.key }, update: {}, create: b });
  }

  await prisma.aiModel.upsert({
    where: { id: "default-tsl-classifier" },
    update: { accuracy: 0.94, version: "1.0.0" },
    create: {
      id: "default-tsl-classifier",
      name: "TSL Image Classifier",
      type: "sign_recognition",
      version: "1.0.0",
      language: "TSL",
      accuracy: 0.94,
      isActive: true,
      config: { model: "sklearn", input_dim: 462, dataset: "tsl-first-dataset" },
    },
  });

  await prisma.aiModel.upsert({
    where: { id: "default-asl-classifier" },
    update: {},
    create: {
      id: "default-asl-classifier",
      name: "ASL BiLSTM Classifier",
      type: "sign_recognition",
      version: "2.0.0",
      language: "ASL",
      accuracy: 0.87,
      isActive: true,
      config: { model: "SignBiLSTM", input_dim: 231 },
    },
  });

  console.log("Seed complete — real sign-language lessons loaded.");
  console.log("  Admin: admin@tradumust.com / Admin123!");
  console.log("  Demo:  demo@tradumust.com / User12345!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
