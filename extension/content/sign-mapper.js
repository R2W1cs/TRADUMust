/**
 * SignBridge — Sign Mapper
 *
 * Converts transcribed text into an ordered sequence of sign configurations
 * that the AvatarRenderer can animate.
 *
 * ── ASL Grammar Notes ────────────────────────────────────────────────────────
 *
 * ASL (American Sign Language) has its own grammar distinct from English:
 *
 *  1. Topic–Comment structure: The topic comes FIRST.
 *     English: "I don't understand the homework."
 *     ASL:     HOMEWORK, ME UNDERSTAND NOT
 *
 *  2. Time expressions move to the BEGINNING of a sentence.
 *     English: "I will study tomorrow."
 *     ASL:     TOMORROW ME STUDY
 *
 *  3. WH-questions (who/what/where/when/why/how) end with the WH-word AND
 *     use furrowed eyebrows as a non-manual marker throughout.
 *
 *  4. Yes/No questions use raised eyebrows + forward head tilt.
 *
 *  5. Negation: NOT / CAN'T / DON'T typically follows the verb.
 *
 *  6. Articles (a, an, the) and most auxiliary verbs (is, are, was) are dropped.
 *
 * This mapper applies a simplified rule-based version of these grammar
 * adaptations. It is NOT a full ASL translator — it is an accessibility aid
 * that helps Deaf users follow spoken content by showing representative signs.
 *
 * ── Sign Coordinate System ───────────────────────────────────────────────────
 *
 * Reuses the EXACT coordinate system from Signer2D.tsx (Phase 1):
 *   ViewBox: 0 0 360 240
 *   Right shoulder (SH_R): { x: 270, y: 90 }
 *   Left  shoulder (SH_L): { x:  90, y: 90 }
 *   Rest right: elbow { x:290, y:150 }, wrist { x:295, y:210 }
 *   Rest left:  elbow { x: 70, y:150 }, wrist { x: 65, y:210 }
 *
 * This ensures the avatar looks identical to the Phase 1 web app.
 */

(function () {
  'use strict';

  window.SignBridge = window.SignBridge || {};

  // ─── Shared arm rest positions ────────────────────────────────────────────
  const REST_R = { elbow: { x: 290, y: 150 }, wrist: { x: 295, y: 210 } };
  const REST_L = { elbow: { x:  70, y: 150 }, wrist: { x:  65, y: 210 } };

  // ─── Full sign dictionary ─────────────────────────────────────────────────
  // Each entry extends the SignConfig shape used by Signer2D.tsx and adds:
  //   category     — for side-panel grouping
  //   description  — concise sign description for the hint tooltip
  //   culturalNote — educational context shown in the side panel
  const SIGNS = {

    // ──────────────────────────────── Greetings ──────────────────────────────

    HELLO: {
      right: { elbow: { x: 255, y: 85 }, wrist: { x: 220, y: 58 } },
      rHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-wave',
      category: 'greetings',
      description: 'Open flat hand sweeps outward from forehead',
      culturalNote: 'HELLO in ASL is a relaxed military salute. In Deaf culture, eye contact is essential during greetings — looking away is considered rude, not shy.',
    },
    HI: {
      right: { elbow: { x: 258, y: 90 }, wrist: { x: 225, y: 65 } },
      rHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-wave',
      category: 'greetings',
      description: 'Casual open-hand wave',
      culturalNote: 'HI is a more casual, informal version of HELLO, often used between friends in the Deaf community.',
    },
    GOODBYE: {
      right: { elbow: { x: 255, y: 95 }, wrist: { x: 228, y: 68 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-wave',
      category: 'greetings',
      description: 'Open hand waves side to side',
      culturalNote: 'In Deaf social settings, farewells are often extended and elaborate — leaving quickly without a proper goodbye is considered impolite.',
    },
    GOOD_MORNING: {
      right: { elbow: { x: 248, y: 115 }, wrist: { x: 222, y: 105 } },
      rHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-push',
      category: 'greetings',
      description: 'GOOD + MORNING: flat hand from chin, then arm rises',
      culturalNote: 'Time-of-day greetings in ASL combine two separate signs. MORNING shows the sun rising over the horizon.',
    },
    GOOD_NIGHT: {
      right: { elbow: { x: 248, y: 100 }, wrist: { x: 228, y: 88 } },
      left:  { elbow: { x: 102, y: 115 }, wrist: { x: 120, y: 130 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL',
      category: 'greetings',
      description: 'Flat fingers drop onto non-dominant forearm',
      culturalNote: 'NIGHT in ASL depicts the sun setting — dominant hand arches downward over the non-dominant forearm like the horizon.',
    },
    NICE_TO_MEET_YOU: {
      right: { elbow: { x: 258, y: 92 }, wrist: { x: 244, y: 78 } },
      left:  { elbow: { x: 102, y: 92 }, wrist: { x: 116, y: 78 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-tap',
      category: 'greetings',
      description: 'NICE + MEET: palms meet and brush together',
      culturalNote: 'Physical touch during introductions is common in Deaf culture. Meeting another Deaf person ("Deaf meet") is often celebrated.',
    },
    SEE_YOU_LATER: {
      right: { elbow: { x: 250, y: 102 }, wrist: { x: 230, y: 86 } },
      rHand: 'V', expression: 'HAPPY', rMotion: 'motion-push',
      category: 'greetings',
      description: 'V-hand at eyes, then points forward',
      culturalNote: 'SEE + LATER conveys "I\'ll see you again." In Deaf culture, parting phrases often include warmth and anticipation of future contact.',
    },
    WELCOME: {
      right: { elbow: { x: 255, y: 108 }, wrist: { x: 232, y: 92 } },
      rHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-pull',
      category: 'greetings',
      description: 'Flat hand sweeps inward toward body',
      culturalNote: 'WELCOME in ASL literally means "come in." Deaf schools and Deaf clubs are known for exceptionally welcoming, inclusive atmospheres.',
    },

    // ──────────────────────────────── Politeness ─────────────────────────────

    THANK_YOU: {
      right: { elbow: { x: 250, y: 115 }, wrist: { x: 222, y: 105 } },
      rHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-push',
      category: 'politeness',
      description: 'Flat hand from chin, moves forward and down',
      culturalNote: 'THANK YOU mimics blowing a kiss of gratitude. It is one of the most commonly learned signs and represents the warmth of Deaf culture.',
    },
    PLEASE: {
      right: { elbow: { x: 242, y: 115 }, wrist: { x: 218, y: 128 } },
      rHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-circle',
      category: 'politeness',
      description: 'Flat hand circles on chest',
      culturalNote: 'PLEASE and THANK YOU share a similar base movement — both emphasize gratitude and politeness, core values in the Deaf community.',
    },
    SORRY: {
      right: { elbow: { x: 245, y: 112 }, wrist: { x: 220, y: 122 } },
      rHand: 'FIST', expression: 'NEGATIVE', rMotion: 'motion-circle',
      category: 'politeness',
      description: 'Closed fist circles on chest',
      culturalNote: 'SORRY and PLEASE look similar — SORRY uses a fist (showing sincerity/pain), PLEASE uses an open hand. Context and facial expression distinguish them.',
    },
    EXCUSE_ME: {
      right: { elbow: { x: 255, y: 118 }, wrist: { x: 238, y: 108 } },
      left:  { elbow: { x: 105, y: 118 }, wrist: { x: 122, y: 108 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'politeness',
      description: 'Fingertips brush across non-dominant palm',
      culturalNote: 'EXCUSE ME in ASL shows wiping the slate clean. Tapping someone on the shoulder is the Deaf equivalent of saying "excuse me" to get attention.',
    },
    YOU_RE_WELCOME: {
      right: { elbow: { x: 255, y: 108 }, wrist: { x: 232, y: 92 } },
      rHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-push',
      category: 'politeness',
      description: 'Flat hand moves outward from chest',
      culturalNote: 'YOU\'RE WELCOME is sometimes signed as simply "WELCOME" — inviting the other person in. Generosity is a hallmark of Deaf community culture.',
    },

    // ──────────────────────────────── Responses ───────────────────────────────

    YES: {
      right: { elbow: { x: 265, y: 105 }, wrist: { x: 268, y: 72 } },
      rHand: 'FIST', expression: 'NEUTRAL', rMotion: 'motion-nod',
      category: 'responses',
      description: 'Fist bobs up and down like a nodding head',
      culturalNote: 'YES in ASL mimics a nodding head with the fist. A strong YES might be emphasized by larger movement or a head nod, adding layers of meaning.',
    },
    NO: {
      right: { elbow: { x: 250, y: 108 }, wrist: { x: 226, y: 90 } },
      rHand: 'POINT', expression: 'NEGATIVE', rMotion: 'motion-shake',
      category: 'responses',
      description: 'Index and middle snap down onto thumb twice',
      culturalNote: 'NO in ASL combines a head shake (a universal gesture) with the finger-snap movement. Non-manual markers like head shaking reinforce meaning in ASL.',
    },
    OK: {
      right: { elbow: { x: 255, y: 108 }, wrist: { x: 235, y: 95 } },
      rHand: 'OK', expression: 'HAPPY',
      category: 'responses',
      description: 'OK handshape — circle of thumb and index finger',
      culturalNote: 'OK is a borrowing from English gesture. ASL often uses context-specific signs for "fine," "good," or "alright" depending on the degree of agreement.',
    },
    I_UNDERSTAND: {
      right: { elbow: { x: 250, y: 98 }, wrist: { x: 230, y: 82 } },
      rHand: 'POINT', expression: 'HAPPY', rMotion: 'motion-flick',
      category: 'responses',
      description: 'Index finger flicks up near the temple',
      culturalNote: 'UNDERSTAND literally depicts a light bulb turning on above the head. In the Deaf community, this sign is often accompanied by a bright facial expression to show genuine understanding.',
    },
    I_DONT_UNDERSTAND: {
      right: { elbow: { x: 250, y: 98 }, wrist: { x: 230, y: 82 } },
      rHand: 'POINT', expression: 'NEGATIVE', rMotion: 'motion-shake',
      category: 'responses',
      description: 'UNDERSTAND + NOT: flick, then shake head',
      culturalNote: 'Expressing confusion is important and respected in Deaf culture. Asking for clarification shows engagement, not weakness. Never pretend to understand.',
    },
    REPEAT_PLEASE: {
      right: { elbow: { x: 255, y: 108 }, wrist: { x: 232, y: 92 } },
      rHand: 'POINT', expression: 'QUESTION', rMotion: 'motion-circle',
      category: 'responses',
      description: 'Index finger circles, then PLEASE motion',
      culturalNote: 'Asking someone to repeat themselves is completely normal in Deaf and hearing interactions. Clarity is always prioritized over speed in ASL conversation.',
    },

    // ──────────────────────────────── Questions ───────────────────────────────

    WHAT: {
      right: { elbow: { x: 250, y: 118 }, wrist: { x: 226, y: 100 } },
      rHand: 'FLAT', expression: 'WH_QUESTION', rMotion: 'motion-shake',
      category: 'questions',
      description: 'Index brushes across non-dominant palm',
      culturalNote: 'WH-questions in ASL always end with the question word, unlike English where it begins the sentence. Eyebrows are furrowed throughout the entire question.',
    },
    WHEN: {
      right: { elbow: { x: 255, y: 108 }, wrist: { x: 232, y: 92 } },
      rHand: 'POINT', expression: 'WH_QUESTION',
      category: 'questions',
      description: 'Index circles, then taps non-dominant index finger',
      culturalNote: 'WHEN combines a circular motion (representing time) with pointing to meet at a specific moment. Time is a rich concept in ASL with many nuanced signs.',
    },
    WHERE: {
      right: { elbow: { x: 282, y: 100 }, wrist: { x: 308, y: 80 } },
      rHand: 'POINT', expression: 'WH_QUESTION', rMotion: 'motion-shake',
      category: 'questions',
      description: 'Index finger waggles side to side',
      culturalNote: 'WHERE shakes the index finger as if searching a space. ASL uses spatial grammar — locations are established in the signing space and referenced throughout conversation.',
    },
    WHO: {
      right: { elbow: { x: 248, y: 98 }, wrist: { x: 228, y: 82 } },
      rHand: 'POINT', expression: 'WH_QUESTION', rMotion: 'motion-circle',
      category: 'questions',
      description: 'Index circles near the chin',
      culturalNote: 'WHO circles near the mouth, the seat of identity and speech. In ASL storytelling, characters are "placed" in the signing space and referred to by pointing to that location.',
    },
    WHY: {
      right: { elbow: { x: 248, y: 98 }, wrist: { x: 228, y: 82 } },
      rHand: 'CLAW', expression: 'WH_QUESTION', rMotion: 'motion-pull',
      category: 'questions',
      description: 'Claw hand pulls away from forehead',
      culturalNote: 'WHY extracts something from the mind — pulling meaning out. This visual metaphor reflects ASL\'s rich iconic nature, where signs often visually represent their meaning.',
    },
    HOW: {
      right: { elbow: { x: 248, y: 105 }, wrist: { x: 228, y: 92 } },
      left:  { elbow: { x: 112, y: 105 }, wrist: { x: 132, y: 92 } },
      rHand: 'CLAW', lHand: 'CLAW', expression: 'WH_QUESTION',
      rMotion: 'motion-roll', lMotion: 'motion-roll',
      category: 'questions',
      description: 'Both claw hands roll knuckles upward',
      culturalNote: 'HOW rolls the hands as if turning something over to examine it from all sides — a beautiful visual metaphor for exploring the manner or method of something.',
    },
    DO_YOU_UNDERSTAND: {
      right: { elbow: { x: 250, y: 98 }, wrist: { x: 230, y: 82 } },
      rHand: 'POINT', expression: 'QUESTION', rMotion: 'motion-flick',
      category: 'questions',
      description: 'UNDERSTAND with raised eyebrows (Y/N question)',
      culturalNote: 'In ASL, yes/no questions are marked by raised eyebrows, not rising intonation. The signer may also lean their head forward slightly to show they are asking.',
    },
    CAN_YOU_HELP: {
      right: { elbow: { x: 248, y: 105 }, wrist: { x: 228, y: 92 } },
      left:  { elbow: { x: 105, y: 112 }, wrist: { x: 128, y: 100 } },
      rHand: 'THUMB_UP', lHand: 'FLAT', expression: 'QUESTION',
      rMotion: 'motion-lift',
      category: 'questions',
      description: 'HELP + raised eyebrows (asking)',
      culturalNote: 'Asking for help is straightforward and encouraged in Deaf culture. Mutual assistance is central to Deaf community values.',
    },
    COULD_YOU_REPEAT: {
      right: { elbow: { x: 255, y: 108 }, wrist: { x: 232, y: 92 } },
      rHand: 'POINT', expression: 'QUESTION', rMotion: 'motion-circle',
      category: 'questions',
      description: 'Index circles (AGAIN/REPEAT) + raised eyebrows',
      culturalNote: 'Asking for repetition is never rude in ASL. Clear communication is always the priority. In Deaf culture, communication access is a right, not a favor.',
    },

    // ──────────────────────────────── Academic ────────────────────────────────

    STUDENT: {
      right: { elbow: { x: 248, y: 110 }, wrist: { x: 228, y: 96 } },
      left:  { elbow: { x: 105, y: 105 }, wrist: { x: 128, y: 92 } },
      rHand: 'CLAW', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-lift',
      category: 'academic',
      description: 'LEARN from palm, then PERSON suffix',
      culturalNote: 'STUDENT = LEARN + PERSON. Many ASL signs for roles add the PERSON marker. Deaf students have historically fought for equal access to education — the Deaf Education movement is rich with history.',
    },
    TEACHER: {
      right: { elbow: { x: 248, y: 105 }, wrist: { x: 228, y: 92 } },
      left:  { elbow: { x: 112, y: 105 }, wrist: { x: 132, y: 92 } },
      rHand: 'CLAW', lHand: 'CLAW', expression: 'NEUTRAL',
      rMotion: 'motion-push', lMotion: 'motion-push',
      category: 'academic',
      description: 'Both hands project knowledge outward, then PERSON',
      culturalNote: 'Teachers at residential Deaf schools have been pillars of ASL preservation for generations. Many Deaf teachers are deeply respected cultural figures.',
    },
    CLASS: {
      right: { elbow: { x: 258, y: 92 }, wrist: { x: 244, y: 78 } },
      left:  { elbow: { x: 102, y: 92 }, wrist: { x: 116, y: 78 } },
      rHand: 'C', lHand: 'C', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'academic',
      description: 'Both C-hands arc around, forming a group circle',
      culturalNote: 'CLASS shows a group of people gathered together. In ASL, many group-related signs use this arc motion to represent collective membership.',
    },
    LEARN: {
      right: { elbow: { x: 248, y: 110 }, wrist: { x: 228, y: 96 } },
      left:  { elbow: { x: 105, y: 105 }, wrist: { x: 128, y: 92 } },
      rHand: 'CLAW', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-lift',
      category: 'academic',
      description: 'Claw lifts knowledge from palm to forehead',
      culturalNote: 'LEARN literally depicts picking up knowledge and placing it in your mind. This iconic quality — signs that visually represent their meaning — is called "iconicity" in sign language linguistics.',
    },
    STUDY: {
      right: { elbow: { x: 255, y: 108 }, wrist: { x: 235, y: 95 } },
      left:  { elbow: { x: 108, y: 115 }, wrist: { x: 125, y: 108 } },
      rHand: 'POINT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-wiggle',
      category: 'academic',
      description: 'Wiggling fingers point toward non-dominant palm',
      culturalNote: 'STUDY shows mental activity directed at material — the wiggling fingers represent the brain working. Deaf students often study in Deaf study groups where ASL is the language of instruction.',
    },
    HOMEWORK: {
      right: { elbow: { x: 248, y: 105 }, wrist: { x: 228, y: 92 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'academic',
      description: 'HOME + WORK: cheek tap, then alternating fists',
      culturalNote: 'ASL often creates compound signs by combining two existing signs, much like compound words in English. HOMEWORK = HOME + WORK.',
    },
    TEST: {
      right: { elbow: { x: 255, y: 108 }, wrist: { x: 232, y: 92 } },
      left:  { elbow: { x: 105, y: 108 }, wrist: { x: 128, y: 92 } },
      rHand: 'POINT', lHand: 'POINT', expression: 'NEUTRAL',
      rMotion: 'motion-push', lMotion: 'motion-push',
      category: 'academic',
      description: 'Both index fingers curve downward like question marks',
      culturalNote: 'TEST shows two question marks — representing the questioning nature of a test. This visual creativity is characteristic of ASL\'s linguistic richness.',
    },
    EXAM: {
      right: { elbow: { x: 255, y: 108 }, wrist: { x: 232, y: 92 } },
      left:  { elbow: { x: 105, y: 108 }, wrist: { x: 128, y: 92 } },
      rHand: 'POINT', lHand: 'POINT', expression: 'NEUTRAL',
      rMotion: 'motion-push', lMotion: 'motion-push',
      category: 'academic',
      description: 'Similar to TEST — bent index fingers move down',
      culturalNote: 'TEST and EXAM are often used interchangeably. Context makes the severity clear. Deaf students at universities often request sign language interpreters for exams.',
    },
    LECTURE: {
      right: { elbow: { x: 255, y: 100 }, wrist: { x: 232, y: 86 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'academic',
      description: 'Flat hand moves forward repeatedly (TEACH + formal)',
      culturalNote: 'Accessing lectures in sign language has historically been a challenge. Video relay services, remote interpreters, and AI captioning are transforming access for Deaf students globally.',
    },
    ASSIGNMENT: {
      right: { elbow: { x: 248, y: 110 }, wrist: { x: 228, y: 96 } },
      left:  { elbow: { x: 105, y: 105 }, wrist: { x: 128, y: 92 } },
      rHand: 'CLAW', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-lift',
      category: 'academic',
      description: 'GIVE + WORK combined motion',
      culturalNote: 'ASSIGNMENT derives from "giving work." In Deaf education, assignments are often posted visually — on boards or screens — since verbal announcements are inaccessible.',
    },
    GRADE: {
      right: { elbow: { x: 255, y: 112 }, wrist: { x: 232, y: 98 } },
      rHand: 'L', expression: 'NEUTRAL',
      category: 'academic',
      description: 'L-shape traces a letter in the air (grading)',
      culturalNote: 'GRADE can also be signed as EVALUATE. Deaf students in mainstreamed schools often face grading challenges without proper interpreter support — something SignBridge helps address.',
    },
    UNIVERSITY: {
      right: { elbow: { x: 258, y: 92 }, wrist: { x: 244, y: 78 } },
      left:  { elbow: { x: 102, y: 92 }, wrist: { x: 116, y: 78 } },
      rHand: 'C', lHand: 'C', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'academic',
      description: 'SCHOOL + large arc indicating prestige/scale',
      culturalNote: 'Gallaudet University (Washington D.C.) is the world\'s only university designed for Deaf students. It was founded in 1864 and is a cultural heartbeat of the global Deaf community.',
    },
    QUESTION: {
      right: { elbow: { x: 255, y: 108 }, wrist: { x: 232, y: 92 } },
      rHand: 'POINT', expression: 'WH_QUESTION', rMotion: 'motion-circle',
      category: 'academic',
      description: 'Index finger traces a question mark in the air',
      culturalNote: 'In classroom settings, Deaf students traditionally raise their hand and wave it to get the teacher\'s attention — visual field awareness is always on in Deaf space.',
    },
    BOOK: {
      right: { elbow: { x: 258, y: 105 }, wrist: { x: 244, y: 92 } },
      left:  { elbow: { x: 102, y: 105 }, wrist: { x: 116, y: 92 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL',
      category: 'academic',
      description: 'Two flat hands open like a book',
      culturalNote: 'BOOK is one of the most iconic ASL signs — hands open like pages. The importance of visual literacy in Deaf education means books and visual media are highly valued.',
    },
    DEADLINE: {
      right: { elbow: { x: 282, y: 115 }, wrist: { x: 308, y: 96 } },
      rHand: 'POINT', expression: 'EMPHATIC', rMotion: 'motion-tap',
      category: 'academic',
      description: 'Point to wrist (TIME) then emphatic downward slash',
      culturalNote: 'DEADLINE combines TIME with a cutting motion, showing time being "cut off." Visual urgency in ASL is conveyed through movement speed and facial expression — a fast motion means urgency.',
    },

    // ──────────────────────────────── Time ────────────────────────────────────

    NOW: {
      right: { elbow: { x: 248, y: 118 }, wrist: { x: 228, y: 132 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 132, y: 132 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL',
      category: 'time',
      description: 'Both flat hands drop down simultaneously',
      culturalNote: 'NOW grounds time in the present moment — hands drop straight down, as if planting the concept in the present space. Time in ASL flows along a timeline in front of the signer.',
    },
    TODAY: {
      right: { elbow: { x: 248, y: 118 }, wrist: { x: 228, y: 132 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 132, y: 132 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL',
      category: 'time',
      description: 'NOW + DAY: hands drop, then arc like the sun',
      culturalNote: 'TODAY = NOW + DAY in ASL. The ASL time line runs front-to-back through the body: past is behind, future is ahead, present is near the body.',
    },
    TOMORROW: {
      right: { elbow: { x: 255, y: 90 }, wrist: { x: 235, y: 75 } },
      rHand: 'THUMB_UP', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'time',
      description: 'Thumb moves forward from the cheek',
      culturalNote: 'TOMORROW moves forward from the face — into the future on the ASL timeline. Far future uses a larger forward movement or multiple repetitions.',
    },
    YESTERDAY: {
      right: { elbow: { x: 255, y: 90 }, wrist: { x: 235, y: 75 } },
      rHand: 'THUMB_UP', expression: 'NEUTRAL', rMotion: 'motion-pull',
      category: 'time',
      description: 'Thumb arcs backward past the cheek',
      culturalNote: 'YESTERDAY moves backward — into the past on the ASL timeline. The thumb marks a single step back; LONG-AGO would sweep far behind the shoulder.',
    },
    LATER: {
      right: { elbow: { x: 265, y: 108 }, wrist: { x: 280, y: 88 } },
      rHand: 'L', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'time',
      description: 'L-shape rotates forward from vertical',
      culturalNote: 'LATER uses an L-handshape (initial letter), then tips forward into future space. Initialized signs that use a letter handshape are called "initialized signs" in ASL linguistics.',
    },
    SOON: {
      right: { elbow: { x: 265, y: 105 }, wrist: { x: 248, y: 92 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'time',
      description: 'Flat hand briefly moves forward',
      culturalNote: 'SOON shows a small forward movement — not far into the future. In ASL, the SIZE and SPEED of movement adds meaning: a tiny fast movement = very soon.',
    },
    MORNING: {
      right: { elbow: { x: 248, y: 118 }, wrist: { x: 228, y: 132 } },
      left:  { elbow: { x: 100, y: 140 }, wrist: { x: 120, y: 150 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-lift',
      category: 'time',
      description: 'Right arm rises like the sun over the left forearm horizon',
      culturalNote: 'MORNING shows the sun (right hand) rising over the horizon (left arm). This visual poetry — depicting natural phenomena — is deeply characteristic of ASL.',
    },
    NIGHT: {
      right: { elbow: { x: 248, y: 115 }, wrist: { x: 228, y: 132 } },
      left:  { elbow: { x: 100, y: 118 }, wrist: { x: 120, y: 128 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL',
      category: 'time',
      description: 'Dominant hand arcs down over the non-dominant forearm',
      culturalNote: 'NIGHT shows the sun (right hand) setting below the horizon (left arm). Natural, iconic signs like these make ASL deeply visual and poetic.',
    },
    WEEK: {
      right: { elbow: { x: 258, y: 112 }, wrist: { x: 244, y: 92 } },
      left:  { elbow: { x: 102, y: 112 }, wrist: { x: 116, y: 92 } },
      rHand: 'POINT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'time',
      description: 'Index slides across non-dominant palm',
      culturalNote: 'ONE-WEEK slides the index across the palm (7 days). Adding number handshapes makes TWO-WEEKS, THREE-WEEKS, etc. — a compact, efficient system.',
    },

    // ──────────────────────────────── Common verbs ────────────────────────────

    HELP: {
      right: { elbow: { x: 248, y: 105 }, wrist: { x: 228, y: 92 } },
      left:  { elbow: { x: 105, y: 112 }, wrist: { x: 128, y: 100 } },
      rHand: 'THUMB_UP', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-lift',
      category: 'verbs',
      description: 'Thumb-up fist sits on flat palm and lifts upward',
      culturalNote: 'HELP shows one hand literally lifting another — mutual support made visual. Community interdependence is a foundational value in Deaf culture.',
    },
    GO: {
      right: { elbow: { x: 282, y: 82 }, wrist: { x: 312, y: 62 } },
      rHand: 'POINT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'verbs',
      description: 'Index arcs outward-forward',
      culturalNote: 'GO in ASL points in the direction of movement. ASL is spatially rich — where you point and how you move through space carries grammatical meaning.',
    },
    COME: {
      right: { elbow: { x: 282, y: 82 }, wrist: { x: 312, y: 62 } },
      rHand: 'POINT', expression: 'NEUTRAL', rMotion: 'motion-pull',
      category: 'verbs',
      description: 'Bent index draws toward the body',
      culturalNote: 'GO and COME are directional verbs in ASL — the movement direction IS the grammatical meaning. This is called "spatial verb agreement."',
    },
    SEE: {
      right: { elbow: { x: 250, y: 102 }, wrist: { x: 230, y: 86 } },
      rHand: 'V', expression: 'NEUTRAL',
      category: 'verbs',
      description: 'V-shape at the eyes moves forward',
      culturalNote: 'SEE uses the V-handshape from the eyes — depicting sight lines extending outward. Vision is paramount in Deaf culture; maintaining eye contact is respectful and communicative.',
    },
    KNOW: {
      right: { elbow: { x: 250, y: 102 }, wrist: { x: 230, y: 86 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'verbs',
      description: 'Flat fingertips tap the temple',
      culturalNote: 'KNOW touches the mind where knowledge lives. DON\'T KNOW shakes the hand away from the temple. THINK taps once; KNOW taps firmly.',
    },
    UNDERSTAND: {
      right: { elbow: { x: 250, y: 98 }, wrist: { x: 230, y: 82 } },
      rHand: 'POINT', expression: 'NEUTRAL', rMotion: 'motion-flick',
      category: 'verbs',
      description: 'Index finger flicks up from near the temple',
      culturalNote: 'UNDERSTAND shows comprehension "lighting up" in the mind. The sudden upward flick mimics a light switch being turned on — an "aha moment" made visual.',
    },
    WANT: {
      right: { elbow: { x: 248, y: 105 }, wrist: { x: 228, y: 92 } },
      left:  { elbow: { x: 112, y: 105 }, wrist: { x: 132, y: 92 } },
      rHand: 'CLAW', lHand: 'CLAW', expression: 'NEUTRAL',
      rMotion: 'motion-pull', lMotion: 'motion-pull',
      category: 'verbs',
      description: 'Both claws pull toward the body (desire)',
      culturalNote: 'WANT pulls both hands toward the body, showing desire drawing something close. The intensity of facial expression and hand tension communicates how much something is wanted.',
    },
    NEED: {
      right: { elbow: { x: 282, y: 90 }, wrist: { x: 308, y: 70 } },
      rHand: 'POINT', expression: 'WH_QUESTION', rMotion: 'motion-nod',
      category: 'verbs',
      description: 'Bent index bends downward twice (compulsion)',
      culturalNote: 'NEED bends down twice, showing something pressing — a need pressing down. The motion conveys a sense of requirement or necessity.',
    },
    LIKE: {
      right: { elbow: { x: 248, y: 115 }, wrist: { x: 225, y: 105 } },
      rHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-push',
      category: 'verbs',
      description: 'Middle finger and thumb pinch at chest, pull forward',
      culturalNote: 'LIKE (enjoy) uses a gesture of pulling something pleasant from the heart. LOVE uses a stronger, more emphatic gesture to show deeper feeling.',
    },
    LOVE: {
      right: { elbow: { x: 242, y: 112 }, wrist: { x: 220, y: 122 } },
      left:  { elbow: { x: 118, y: 112 }, wrist: { x: 140, y: 122 } },
      rHand: 'FIST', lHand: 'FIST', expression: 'HAPPY',
      category: 'verbs',
      description: 'Fists crossed over the heart',
      culturalNote: 'LOVE in ASL crosses both fists over the heart — a universal human gesture of affection, adopted into the language. Deaf couples often develop unique personal signs called "name signs" for each other.',
    },
    WAIT: {
      right: { elbow: { x: 258, y: 115 }, wrist: { x: 244, y: 128 } },
      left:  { elbow: { x: 102, y: 115 }, wrist: { x: 116, y: 128 } },
      rHand: 'CLAW', lHand: 'CLAW', expression: 'NEUTRAL',
      rMotion: 'motion-wiggle', lMotion: 'motion-wiggle',
      category: 'verbs',
      description: 'Both claws wiggle palms-up (suspension)',
      culturalNote: 'WAIT shows tension being held — fingers wiggling as if suspended in anticipation. Facial expression transforms WAIT into PLEASE WAIT (polite) or JUST WAIT (warning).',
    },
    START: {
      right: { elbow: { x: 258, y: 108 }, wrist: { x: 244, y: 92 } },
      left:  { elbow: { x: 102, y: 108 }, wrist: { x: 116, y: 92 } },
      rHand: 'POINT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'verbs',
      description: 'Index twists into non-dominant flat palm (turning ignition)',
      culturalNote: 'START/BEGIN depicts the turning of a key — starting something in motion. This iconic quality makes ASL signs memorable and intuitive for visual learners.',
    },
    STOP: {
      right: { elbow: { x: 255, y: 108 }, wrist: { x: 235, y: 95 } },
      left:  { elbow: { x: 108, y: 108 }, wrist: { x: 125, y: 95 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'EMPHATIC',
      category: 'verbs',
      description: 'Right flat hand chops down onto left palm',
      culturalNote: 'STOP is sharp and decisive — the chopping motion cuts action off. In a Deaf space, clapping, table-stomping, or waving in the visual field are all ways to get attention to stop.',
    },
    FINISH: {
      right: { elbow: { x: 258, y: 108 }, wrist: { x: 244, y: 92 } },
      left:  { elbow: { x: 102, y: 108 }, wrist: { x: 116, y: 92 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL',
      rMotion: 'motion-flip', lMotion: 'motion-flip',
      category: 'verbs',
      description: 'Both flat hands flip outward (completion)',
      culturalNote: 'FINISH/DONE flips both hands as if releasing something completed. It can also mean "already" or signal that a topic is closed.',
    },
    THINK: {
      right: { elbow: { x: 250, y: 102 }, wrist: { x: 230, y: 86 } },
      rHand: 'POINT', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'verbs',
      description: 'Index circles at the temple (cognition)',
      culturalNote: 'THINK circles at the temple, depicting the circular nature of thought. BELIEVE = THINK + GRASP, showing thought becoming conviction.',
    },

    // ──────────────────────────────── Emotions ────────────────────────────────

    HAPPY: {
      right: { elbow: { x: 242, y: 112 }, wrist: { x: 220, y: 122 } },
      rHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-circle',
      category: 'emotions',
      description: 'Flat hand circles upward at chest (joy rising)',
      culturalNote: 'HAPPY brushes upward repeatedly, showing joy bubbling up from the heart. Facial expression is crucial — the same handshape with a neutral face means something different entirely.',
    },
    SAD: {
      right: { elbow: { x: 248, y: 105 }, wrist: { x: 230, y: 92 } },
      left:  { elbow: { x: 112, y: 105 }, wrist: { x: 132, y: 92 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEGATIVE',
      rMotion: 'motion-pull', lMotion: 'motion-pull',
      category: 'emotions',
      description: 'Both flat hands slide down the face (tears falling)',
      culturalNote: 'SAD shows hands sliding down the face like tears. Emotional expression in ASL is amplified and explicit — facial grammar is not optional, it changes meaning.',
    },
    TIRED: {
      right: { elbow: { x: 242, y: 112 }, wrist: { x: 220, y: 122 } },
      left:  { elbow: { x: 118, y: 112 }, wrist: { x: 140, y: 122 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEGATIVE',
      category: 'emotions',
      description: 'Both hands drop from chest outward (energy draining)',
      culturalNote: 'TIRED shows energy draining from the body. In Deaf-interpreter contexts, interpreters must also communicate fatigue — requesting interpreter breaks is standard professional practice.',
    },
    EXCITED: {
      right: { elbow: { x: 242, y: 112 }, wrist: { x: 220, y: 125 } },
      left:  { elbow: { x: 118, y: 112 }, wrist: { x: 140, y: 125 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'HAPPY',
      rMotion: 'motion-circle', lMotion: 'motion-circle',
      category: 'emotions',
      description: 'Alternating hands circle upward at chest (rising excitement)',
      culturalNote: 'EXCITED uses alternating upward circles — energy going up and up. Adding a big, open mouth and wide eyes amplifies the excitement further through non-manual markers.',
    },
    IMPORTANT: {
      right: { elbow: { x: 258, y: 92 }, wrist: { x: 244, y: 78 } },
      left:  { elbow: { x: 102, y: 92 }, wrist: { x: 116, y: 78 } },
      rHand: 'THUMB_UP', lHand: 'THUMB_UP', expression: 'EMPHATIC',
      rMotion: 'motion-lift', lMotion: 'motion-lift',
      category: 'descriptors',
      description: 'Both thumb-ups move upward to face height (elevated importance)',
      culturalNote: 'IMPORTANT shows something being lifted to prominence. Signers often mouth "important" simultaneously, using mouthing (a non-manual marker borrowed from English) for emphasis.',
    },

    // ──────────────────────────────── People / Pronouns ───────────────────────

    ME: {
      right: { elbow: { x: 265, y: 112 }, wrist: { x: 265, y: 135 } },
      rHand: 'POINT', expression: 'NEUTRAL',
      category: 'pronouns',
      description: 'Index points to self (chest)',
      culturalNote: 'I/ME is simply pointing to yourself. ASL pronouns are directional — YOU points to the other person, HE/SHE/IT points to where the person was "established" in the signing space.',
    },
    YOU: {
      right: { elbow: { x: 282, y: 82 }, wrist: { x: 312, y: 62 } },
      rHand: 'POINT', expression: 'NEUTRAL',
      category: 'pronouns',
      description: 'Index points directly at the other person',
      culturalNote: 'YOU points directly at the person — something that might feel rude in some hearing cultures but is completely natural and necessary in ASL. There is no separate HE/SHE — context and pointing establish gender-neutral reference.',
    },
    NAME: {
      right: { elbow: { x: 258, y: 92 }, wrist: { x: 244, y: 78 } },
      left:  { elbow: { x: 102, y: 92 }, wrist: { x: 116, y: 78 } },
      rHand: 'V', lHand: 'V', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'pronouns',
      description: 'H-hands tap together twice',
      culturalNote: 'NAME (MY-NAME-IS) is often one of the first signs people learn. In Deaf culture, everyone gets a "name sign" — a unique personal sign given by the Deaf community, not self-assigned.',
    },
    FRIEND: {
      right: { elbow: { x: 258, y: 92 }, wrist: { x: 244, y: 78 } },
      left:  { elbow: { x: 102, y: 92 }, wrist: { x: 116, y: 78 } },
      rHand: 'POINT', lHand: 'POINT', expression: 'HAPPY',
      rMotion: 'motion-roll', lMotion: 'motion-roll',
      category: 'pronouns',
      description: 'Hooked index fingers interlock and swap',
      culturalNote: 'FRIEND interlocks both index fingers — two people linking together. Deaf friendships are often built quickly and deeply, especially within the residential school system.',
    },
    DEAF: {
      right: { elbow: { x: 255, y: 90 }, wrist: { x: 235, y: 75 } },
      rHand: 'POINT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'pronouns',
      description: 'Index taps ear, then corner of mouth',
      culturalNote: '"Deaf" (capital D) refers to cultural Deaf identity — part of a rich linguistic community with history, literature, and art. Lowercase "deaf" refers only to audiological hearing loss. The distinction matters deeply.',
    },
    HEARING: {
      right: { elbow: { x: 250, y: 102 }, wrist: { x: 230, y: 88 } },
      rHand: 'POINT', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'pronouns',
      description: 'Index circles at the mouth (speaking)',
      culturalNote: 'HEARING refers to hearing people. CODA (Child of Deaf Adult) are hearing people who grow up in Deaf households, often native ASL users. They hold a unique bridge position between Deaf and Hearing worlds.',
    },

    // ──────────────────────────────── Technology ─────────────────────────────

    VIDEO: {
      right: { elbow: { x: 255, y: 108 }, wrist: { x: 232, y: 92 } },
      rHand: 'V', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'technology',
      description: 'V-hand moves outward (projection/stream)',
      culturalNote: 'Video technology is transformative for Deaf communities. Video Relay Services (VRS) allow Deaf people to make phone calls via a sign language interpreter over video — a legal requirement in many countries.',
    },
    COMPUTER: {
      right: { elbow: { x: 255, y: 105 }, wrist: { x: 232, y: 92 } },
      left:  { elbow: { x: 105, y: 115 }, wrist: { x: 128, y: 108 } },
      rHand: 'C', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'technology',
      description: 'C-shape circles near non-dominant forearm',
      culturalNote: 'Computers and internet access revolutionized Deaf communication. TTY (text telephone) and email were early equalizers. Now video calling and AI captioning continue this access revolution.',
    },
    INTERNET: {
      right: { elbow: { x: 255, y: 100 }, wrist: { x: 232, y: 86 } },
      left:  { elbow: { x: 105, y: 100 }, wrist: { x: 128, y: 86 } },
      rHand: 'CLAW', lHand: 'CLAW', expression: 'NEUTRAL',
      rMotion: 'motion-roll', lMotion: 'motion-roll',
      category: 'technology',
      description: 'Both claw hands roll around each other (web/network)',
      culturalNote: 'The internet gave Deaf people unprecedented access to information and each other. Online Deaf communities span countries and languages, connecting signing communities worldwide.',
    },
    PHONE: {
      right: { elbow: { x: 255, y: 90 }, wrist: { x: 235, y: 75 } },
      rHand: 'ILY', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'technology',
      description: 'Y-handshape (ILY) at the ear (old handset shape)',
      culturalNote: 'The phone sign mimics an old telephone handset. Modern TTY devices and video relay have transformed how Deaf people use phones. The first TTY was invented in 1964 by a Deaf scientist.',
    },
    CAPTION: {
      right: { elbow: { x: 258, y: 108 }, wrist: { x: 244, y: 92 } },
      left:  { elbow: { x: 102, y: 108 }, wrist: { x: 116, y: 92 } },
      rHand: 'POINT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'technology',
      description: 'Index traces text lines on non-dominant palm',
      culturalNote: 'Closed captions (CC) have been required by US law since 1990 (ADA) and 1996 (Telecommunications Act). Real-time captions at events and on TV are a legal accessibility right.',
    },
    TRANSLATE: {
      right: { elbow: { x: 258, y: 105 }, wrist: { x: 244, y: 90 } },
      left:  { elbow: { x: 102, y: 105 }, wrist: { x: 116, y: 90 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL',
      rMotion: 'motion-roll', lMotion: 'motion-roll',
      category: 'technology',
      description: 'Both hands rotate around each other (language bridge)',
      culturalNote: 'Sign language interpreters are called "terps" in the Deaf community. Certified interpreters (CDIs and NIC-certified) follow a strict Code of Professional Conduct emphasizing confidentiality and accuracy.',
    },
    MUTE: {
      right: { elbow: { x: 255, y: 100 }, wrist: { x: 235, y: 88 } },
      rHand: 'FIST', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'technology',
      description: 'Fist taps closed lips (silence)',
      culturalNote: 'MUTE is borrowed from English; in Deaf culture, being "muted" on a video call has no real equivalent challenge — visual communication continues regardless of audio state.',
    },

    // ──────────────────────────────── Descriptors ─────────────────────────────

    GOOD: {
      right: { elbow: { x: 248, y: 115 }, wrist: { x: 222, y: 105 } },
      rHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-push',
      category: 'descriptors',
      description: 'Flat hand from chin, moves down and out',
      culturalNote: 'GOOD and BAD are essential evaluative signs. In ASL, positive emotions are shown with mouth smiling and body open; negative emotions contract the body and face.',
    },
    BAD: {
      right: { elbow: { x: 248, y: 85 }, wrist: { x: 222, y: 98 } },
      rHand: 'FLAT', expression: 'NEGATIVE', rMotion: 'motion-flip',
      category: 'descriptors',
      description: 'Fingertips at lips, hand flips downward',
      culturalNote: 'BAD flips the GOOD hand downward — rejecting what is bad, pushing it away from the face and body. This spatial movement is full of semantic meaning.',
    },
    DIFFERENT: {
      right: { elbow: { x: 258, y: 108 }, wrist: { x: 244, y: 92 } },
      left:  { elbow: { x: 102, y: 108 }, wrist: { x: 116, y: 92 } },
      rHand: 'POINT', lHand: 'POINT', expression: 'NEUTRAL',
      rMotion: 'motion-shake', lMotion: 'motion-shake',
      category: 'descriptors',
      description: 'Both indexes cross then separate (divergence)',
      culturalNote: 'DIFFERENT shows two things moving apart. SAME/ALIKE shows them moving in parallel. These spatial metaphors encode relational meaning that is elegant and precise.',
    },
    SAME: {
      right: { elbow: { x: 258, y: 108 }, wrist: { x: 244, y: 92 } },
      left:  { elbow: { x: 102, y: 108 }, wrist: { x: 116, y: 92 } },
      rHand: 'POINT', lHand: 'POINT', expression: 'NEUTRAL',
      category: 'descriptors',
      description: 'Both indexes move forward together in parallel',
      culturalNote: 'SAME moves both hands forward together — parallel paths. This sign is also used to mean "me too" in casual Deaf conversation.',
    },
    DIFFICULT: {
      right: { elbow: { x: 258, y: 100 }, wrist: { x: 244, y: 86 } },
      left:  { elbow: { x: 102, y: 100 }, wrist: { x: 116, y: 86 } },
      rHand: 'CLAW', lHand: 'CLAW', expression: 'NEGATIVE',
      rMotion: 'motion-roll', lMotion: 'motion-roll',
      category: 'descriptors',
      description: 'Both claws alternately knock against each other',
      culturalNote: 'DIFFICULT uses a "bumping" motion — obstacles blocking the path forward. The intensity of facial expression scales the difficulty: furrowed brows = hard; contorted face = extremely hard.',
    },
    EASY: {
      right: { elbow: { x: 258, y: 108 }, wrist: { x: 244, y: 128 } },
      left:  { elbow: { x: 102, y: 108 }, wrist: { x: 116, y: 128 } },
      rHand: 'CLAW', lHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-lift',
      category: 'descriptors',
      description: 'Claw lightly brushes up non-dominant hand fingers (sliding off easily)',
      culturalNote: 'EASY shows the dominant hand gliding off the non-dominant hand — smooth, no resistance. A relaxed, slightly smiling face signals genuine ease.',
    },

    // ──────────────────────────────── Numbers ────────────────────────────────

    ONE:   { right: { elbow: { x: 265, y: 105 }, wrist: { x: 265, y: 75 } }, rHand: 'POINT', expression: 'NEUTRAL', category: 'numbers', description: 'Index finger raised', culturalNote: 'ASL number signs are one-handed and are partly transparent (1-5 look like counting on fingers). Numbers are signed palm-facing out.' },
    TWO:   { right: { elbow: { x: 265, y: 105 }, wrist: { x: 265, y: 75 } }, rHand: 'V', expression: 'NEUTRAL', category: 'numbers', description: 'Index and middle raised (V-shape)', culturalNote: 'TWO uses the same V-handshape as SEE and VICTORY/PEACE — context distinguishes them. Numbers in ASL can be incorporated into other signs for efficiency.' },
    THREE: { right: { elbow: { x: 265, y: 105 }, wrist: { x: 265, y: 75 } }, rHand: 'V', expression: 'NEUTRAL', category: 'numbers', description: 'Index, middle, ring fingers raised', culturalNote: 'THREE raises three fingers. Number incorporation means you can sign "3 days," "3 weeks" by combining the number with the time sign directly.' },
    FIVE:  { right: { elbow: { x: 265, y: 105 }, wrist: { x: 265, y: 75 } }, rHand: 'FLAT', expression: 'NEUTRAL', category: 'numbers', description: 'All five fingers spread open', culturalNote: 'FIVE is an open hand — the most natural counting position. In Deaf children, number signs often emerge early as some of the first signed vocabulary.' },
    TEN:   { right: { elbow: { x: 265, y: 105 }, wrist: { x: 265, y: 75 } }, rHand: 'THUMB_UP', expression: 'NEUTRAL', rMotion: 'motion-shake', category: 'numbers', description: 'Thumb-up shakes (10)', culturalNote: 'TEN shakes a thumb-up handshape. For numbers 11-19, ASL uses unique handshapes. Numbers in ASL are an entire subsystem with specific handshapes for each value.' },

    // ──────────────────────────────── Fallback tags ──────────────────────────

    __TIME: {
      right: { elbow: { x: 282, y: 115 }, wrist: { x: 308, y: 96 } },
      rHand: 'POINT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'fallback', description: 'Pointing to wrist (time concept)',
      culturalNote: 'Time signs in ASL anchor to a timeline in front of the body. Past is behind the shoulder; future is ahead.',
    },
    __ACTION: {
      right: { elbow: { x: 272, y: 125 }, wrist: { x: 295, y: 105 } },
      rHand: 'FIST', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'fallback', description: 'Generic action / verb movement',
      culturalNote: 'When a specific sign is unavailable, fingerspelling the word is the correct approach in real ASL. This avatar falls back to a generic motion and shows fingerspelling.',
    },
    __OBJECT: {
      right: { elbow: { x: 248, y: 105 }, wrist: { x: 228, y: 92 } },
      left:  { elbow: { x: 112, y: 105 }, wrist: { x: 132, y: 92 } },
      rHand: 'C', lHand: 'C', expression: 'NEUTRAL',
      category: 'fallback', description: 'Generic noun / object shape',
      culturalNote: 'Many noun signs in ASL are derived from their verb form but repeated twice. For example, SIT (once) vs. CHAIR (twice).',
    },
    __SUBJECT: {
      right: { elbow: { x: 282, y: 122 }, wrist: { x: 308, y: 102 } },
      rHand: 'POINT', expression: 'NEUTRAL',
      category: 'fallback', description: 'Generic person / subject reference',
      culturalNote: 'Pronouns in ASL are spatial. Establishing a "referent" in signing space creates a grammatical pronoun for that conversation.',
    },
    __MODIFIER: {
      right: { elbow: { x: 255, y: 132 }, wrist: { x: 232, y: 122 } },
      rHand: 'OK', expression: 'NEUTRAL',
      category: 'fallback', description: 'Generic descriptive / modifier sign',
      culturalNote: 'ASL adjectives typically precede the noun they modify, or follow it in topic-comment constructions.',
    },

    // ──────────────────────────────── Missing core signs ────────────────────

    ANSWER: {
      right: { elbow: { x: 258, y: 112 }, wrist: { x: 240, y: 95 } },
      rHand: 'POINT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'communication', description: 'Index finger moves forward from chin',
      culturalNote: 'ANSWER is produced from near the chin, moving the index forward — signaling a response coming from the signer.',
    },
    ASK: {
      right: { elbow: { x: 255, y: 108 }, wrist: { x: 235, y: 90 } },
      rHand: 'POINT', expression: 'WH_QUESTION', rMotion: 'motion-nod',
      category: 'communication', description: 'Index points and nods toward the person being asked',
      culturalNote: 'ASK in ASL uses directed movement — the hand aims toward the person you are addressing, showing both the question and its recipient.',
    },
    BEGIN: {
      right: { elbow: { x: 260, y: 118 }, wrist: { x: 245, y: 108 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 127, y: 108 } },
      rHand: 'POINT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'actions', description: 'Index finger inserts between two fingers of flat hand and twists',
      culturalNote: 'BEGIN/START uses a twisting movement to signal something being set in motion for the first time.',
    },
    BRING: {
      right: { elbow: { x: 250, y: 122 }, wrist: { x: 235, y: 112 } },
      left:  { elbow: { x: 120, y: 122 }, wrist: { x: 135, y: 112 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-pull',
      category: 'actions', description: 'Both flat hands move toward the body together',
      culturalNote: 'BRING is spatially directed — you move from the source location toward your body or a recipient, making the path of movement clear.',
    },
    CALL: {
      right: { elbow: { x: 255, y: 88 }, wrist: { x: 228, y: 68 } },
      rHand: 'ILY', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'communication', description: 'ILY hand held near ear like a phone handset',
      culturalNote: 'CALL (phone) mimics holding a handset. In Deaf culture, video relay services (VRS) and video calling are often called "video phone" — a significant technology.',
    },
    CHANGE: {
      right: { elbow: { x: 260, y: 120 }, wrist: { x: 248, y: 110 } },
      left:  { elbow: { x: 108, y: 120 }, wrist: { x: 120, y: 110 } },
      rHand: 'FIST', lHand: 'FIST', expression: 'NEUTRAL', rMotion: 'motion-roll',
      category: 'actions', description: 'Two fists switch positions (one over the other)',
      culturalNote: 'CHANGE shows a switch in position — both hands trade places, representing transformation or substitution.',
    },
    CHOOSE: {
      right: { elbow: { x: 265, y: 118 }, wrist: { x: 255, y: 103 } },
      rHand: 'V', expression: 'NEUTRAL', rMotion: 'motion-flick',
      category: 'actions', description: 'V hand pinches downward as if selecting from options',
      culturalNote: 'CHOOSE/SELECT uses the V (victory) hand to "pluck" one item from several — a vivid spatial metaphor for selection.',
    },
    CONTINUE: {
      right: { elbow: { x: 255, y: 118 }, wrist: { x: 238, y: 103 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 128, y: 103 } },
      rHand: 'THUMB_UP', lHand: 'THUMB_UP', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'actions', description: 'Both thumbs-up hands push forward together',
      culturalNote: 'CONTINUE/KEEP-ON shows sustained forward motion — an unbroken path indicating an action that persists.',
    },
    FORGET: {
      right: { elbow: { x: 255, y: 85 }, wrist: { x: 228, y: 68 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-flick',
      category: 'mental', description: 'Flat hand wipes across forehead then flicks away',
      culturalNote: 'FORGET wipes the mind clean — a powerful visual metaphor for a memory disappearing. Related to REMEMBER, which does the opposite motion.',
    },
    HAVE: {
      right: { elbow: { x: 250, y: 122 }, wrist: { x: 230, y: 132 } },
      left:  { elbow: { x: 118, y: 122 }, wrist: { x: 138, y: 132 } },
      rHand: 'FIST', lHand: 'FIST', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'actions', description: 'Bent hands tap against chest',
      culturalNote: 'HAVE taps the fists to the chest — ownership is literally held close to the body. Related to GOT and OWN.',
    },
    LEAVE: {
      right: { elbow: { x: 260, y: 118 }, wrist: { x: 248, y: 108 } },
      left:  { elbow: { x: 110, y: 118 }, wrist: { x: 122, y: 108 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'actions', description: 'Both hands push outward and apart to the side',
      culturalNote: 'LEAVE/DEPART shows the body\'s space being vacated — hands move away from center, creating the spatial concept of departure.',
    },
    MEET: {
      right: { elbow: { x: 258, y: 118 }, wrist: { x: 245, y: 108 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 125, y: 108 } },
      rHand: 'POINT', lHand: 'POINT', expression: 'HAPPY', rMotion: 'motion-push',
      category: 'social', description: 'Both index fingers come together from opposite sides',
      culturalNote: 'MEET shows two people coming together — index fingers representing individuals approaching each other. NICE TO MEET YOU is a common compound.',
    },
    REMEMBER: {
      right: { elbow: { x: 255, y: 88 }, wrist: { x: 230, y: 72 } },
      rHand: 'THUMB_UP', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'mental', description: 'Thumb touches forehead then taps onto left thumb',
      culturalNote: 'REMEMBER moves from the forehead (mind) downward — the memory being retrieved and held. Opposite motion to FORGET.',
    },
    SHOW: {
      right: { elbow: { x: 260, y: 118 }, wrist: { x: 248, y: 103 } },
      left:  { elbow: { x: 108, y: 118 }, wrist: { x: 120, y: 103 } },
      rHand: 'POINT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'communication', description: 'Index on flat palm, both hands move forward together',
      culturalNote: 'SHOW places the finger on the palm, then presents it outward — literally placing something before the viewer\'s eyes.',
    },
    TEACH: {
      right: { elbow: { x: 255, y: 90 }, wrist: { x: 230, y: 75 } },
      left:  { elbow: { x: 112, y: 90 }, wrist: { x: 135, y: 75 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'education', description: 'Both bent hands push outward from the head',
      culturalNote: 'TEACH shows knowledge moving from the mind outward — information being transferred from teacher to student.',
    },
    TRY: {
      right: { elbow: { x: 258, y: 118 }, wrist: { x: 242, y: 108 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 128, y: 108 } },
      rHand: 'FIST', lHand: 'FIST', expression: 'NEUTRAL', rMotion: 'motion-roll',
      category: 'actions', description: 'Both fists push forward with effort',
      culturalNote: 'TRY shows effort through tense forward movement — the physical exertion visible in the motion. ATTEMPT uses the same sign.',
    },
    USE: {
      right: { elbow: { x: 262, y: 118 }, wrist: { x: 248, y: 108 } },
      rHand: 'V', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'actions', description: 'U-shaped hand circles (utility/function)',
      culturalNote: 'USE shows a tool being operated — circular motion representing ongoing function or application.',
    },

    // ──────────────────────────────── Actions ────────────────────────────────

    MAKE: {
      right: { elbow: { x: 268, y: 118 }, wrist: { x: 248, y: 102 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 132, y: 102 } },
      rHand: 'FIST', lHand: 'FIST', expression: 'NEUTRAL', rMotion: 'motion-roll',
      category: 'actions', description: 'Two fists roll over each other (shaping/creating)',
      culturalNote: 'MAKE shows the hands shaping something. It also means CREATE and BUILD in many contexts — one sign covering a broad semantic field.',
    },
    TAKE: {
      right: { elbow: { x: 272, y: 128 }, wrist: { x: 298, y: 118 } },
      rHand: 'CLAW', expression: 'NEUTRAL', rMotion: 'motion-pull',
      category: 'actions', description: 'Claw hand grabs and pulls inward',
      culturalNote: 'TAKE shows grasping an object. The direction of movement changes meaning — taking FROM someone vs. taking TO a place uses the same handshape in different directions.',
    },
    GIVE: {
      right: { elbow: { x: 268, y: 118 }, wrist: { x: 248, y: 102 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'actions', description: 'Flat hand extends forward from chest (offering)',
      culturalNote: 'GIVE is directional — sign it toward the recipient. This directionality is a key feature of ASL spatial grammar that makes it highly efficient.',
    },
    SAY: {
      right: { elbow: { x: 255, y: 108 }, wrist: { x: 235, y: 96 } },
      rHand: 'POINT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'actions', description: 'Index finger at mouth moves forward (words coming out)',
      culturalNote: 'SAY, TELL, and MENTION are similar — all involve the index near the mouth. Directionality changes who is talking to whom.',
    },
    WRITE: {
      right: { elbow: { x: 268, y: 122 }, wrist: { x: 250, y: 138 } },
      left:  { elbow: { x: 112, y: 122 }, wrist: { x: 130, y: 138 } },
      rHand: 'A', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-wiggle',
      category: 'actions', description: 'A-hand scribbles across non-dominant palm',
      culturalNote: 'WRITE depicts the physical act of writing. In Deaf education, literacy is highly valued as a bridge between ASL and the written world.',
    },
    READ: {
      right: { elbow: { x: 268, y: 122 }, wrist: { x: 250, y: 138 } },
      left:  { elbow: { x: 112, y: 122 }, wrist: { x: 130, y: 138 } },
      rHand: 'V', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-wiggle',
      category: 'actions', description: 'V-hand scans down non-dominant palm (eyes reading a page)',
      culturalNote: 'READ shows the eyes scanning a page. Deaf readers are often avid readers, as print is a primary language access tool alongside ASL.',
    },
    PLAY: {
      right: { elbow: { x: 275, y: 118 }, wrist: { x: 296, y: 105 } },
      left:  { elbow: { x: 105, y: 118 }, wrist: { x:  84, y: 105 } },
      rHand: 'ILY', lHand: 'ILY', expression: 'HAPPY', rMotion: 'motion-shake',
      category: 'actions', description: 'Both Y-hands shake loosely (play/recreation)',
      culturalNote: 'PLAY uses the Y-handshape (thumb and pinky extended), shaken loosely. Games, sports, and music each have their own specific signs too.',
    },
    WORK: {
      right: { elbow: { x: 270, y: 120 }, wrist: { x: 252, y: 108 } },
      left:  { elbow: { x: 110, y: 128 }, wrist: { x: 132, y: 118 } },
      rHand: 'FIST', lHand: 'FIST', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'actions', description: 'Dominant fist taps the back of non-dominant fist',
      culturalNote: 'WORK shows persistent effort — the knocking motion represents rhythmic labor. WORK and JOB use the same sign in ASL.',
    },
    MOVE: {
      right: { elbow: { x: 268, y: 118 }, wrist: { x: 282, y: 102 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x:  98, y: 102 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'actions', description: 'Both flat hands shift position forward',
      culturalNote: 'MOVE is directional — signed toward where something is moving. ASL uses space to communicate both location and direction simultaneously.',
    },
    OPEN: {
      right: { elbow: { x: 268, y: 118 }, wrist: { x: 255, y: 100 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 125, y: 100 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-flip',
      category: 'actions', description: 'Both flat hands rotate open (like opening a book)',
      culturalNote: 'OPEN covers doors, books, windows — the base sign adapted to context. Classifiers in ASL can depict exactly how something opens.',
    },
    CLOSE_ACTION: {
      right: { elbow: { x: 268, y: 118 }, wrist: { x: 255, y: 100 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 125, y: 100 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'actions', description: 'Both flat hands close together',
      culturalNote: 'CLOSE (shut) is the reverse of OPEN — hands come together. Context distinguishes closing a door, book, meeting, or conversation.',
    },
    FIND: {
      right: { elbow: { x: 272, y: 128 }, wrist: { x: 258, y: 112 } },
      rHand: 'OK', expression: 'NEUTRAL', rMotion: 'motion-lift',
      category: 'actions', description: 'F/OK-hand lifts up as if picking something out',
      culturalNote: 'FIND and DISCOVER share a sign — the fingers pick an item from the air. It captures the "aha" moment of discovery.',
    },
    SEND: {
      right: { elbow: { x: 268, y: 118 }, wrist: { x: 248, y: 102 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-flick',
      category: 'actions', description: 'Flat hand flicks forward from wrist (releasing/sending)',
      culturalNote: 'SEND is similar to GIVE but with a flick — emphasizing the release. Also used for sending emails and messages in modern signing.',
    },

    // ──────────────────────────────── Adjectives ─────────────────────────────

    BIG: {
      right: { elbow: { x: 300, y: 112 }, wrist: { x: 328, y: 100 } },
      left:  { elbow: { x:  60, y: 112 }, wrist: { x:  32, y: 100 } },
      rHand: 'L', lHand: 'L', expression: 'EMPHATIC', rMotion: 'motion-push',
      category: 'adjectives', description: 'Both L-hands spread apart horizontally (large size)',
      culturalNote: 'BIG is iconic — the wider the hands spread, the bigger the size. ASL frequently uses iconicity: signs that visually resemble what they mean.',
    },
    SMALL: {
      right: { elbow: { x: 252, y: 112 }, wrist: { x: 240, y: 100 } },
      left:  { elbow: { x: 108, y: 112 }, wrist: { x: 120, y: 100 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL',
      category: 'adjectives', description: 'Both flat hands press close together (minimal gap)',
      culturalNote: 'SMALL/LITTLE uses a compressed gesture. Size adjectives in ASL are highly iconic — larger space = bigger thing, smaller space = smaller thing.',
    },
    NEW: {
      right: { elbow: { x: 268, y: 128 }, wrist: { x: 250, y: 145 } },
      left:  { elbow: { x: 112, y: 128 }, wrist: { x: 130, y: 145 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'adjectives', description: 'Dominant hand brushes upward across non-dominant palm',
      culturalNote: 'NEW literally sweeps away the old to reveal the new. The same sign is used for FRESH and RECENT.',
    },
    OLD: {
      right: { elbow: { x: 255, y: 105 }, wrist: { x: 238, y: 120 } },
      rHand: 'FIST', expression: 'NEUTRAL', rMotion: 'motion-pull',
      category: 'adjectives', description: 'Fist at chin drags downward (pulling a long beard)',
      culturalNote: 'OLD depicts a long beard — a universal symbol of age. The same root sign is used for ANCIENT and LONG-AGO with varied movement.',
    },
    FAST: {
      right: { elbow: { x: 272, y: 120 }, wrist: { x: 295, y: 108 } },
      left:  { elbow: { x: 108, y: 120 }, wrist: { x:  85, y: 108 } },
      rHand: 'POINT', lHand: 'POINT', expression: 'EMPHATIC', rMotion: 'motion-flick',
      category: 'adjectives', description: 'Thumbs flick forward rapidly (like a trigger snap)',
      culturalNote: 'FAST, QUICK, and RAPID are the same sign. The speed of the motion itself conveys intensity — signed fast for very fast.',
    },
    SLOW: {
      right: { elbow: { x: 270, y: 130 }, wrist: { x: 260, y: 148 } },
      left:  { elbow: { x: 110, y: 118 }, wrist: { x: 130, y: 108 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL',
      category: 'adjectives', description: 'Dominant hand glides slowly up non-dominant arm',
      culturalNote: 'SLOW is shown by dragging the dominant hand up the back of the non-dominant hand — literally slowing down the motion itself.',
    },
    BEAUTIFUL: {
      right: { elbow: { x: 255, y: 92 }, wrist: { x: 238, y: 75 } },
      rHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-circle',
      category: 'adjectives', description: 'Flat hand circles around face, then closes',
      culturalNote: 'BEAUTIFUL encompasses the whole face — the sign appreciates the whole person. Also used for PRETTY and LOVELY.',
    },
    HOT: {
      right: { elbow: { x: 252, y: 108 }, wrist: { x: 234, y: 94 } },
      rHand: 'CLAW', expression: 'NEUTRAL', rMotion: 'motion-pull',
      category: 'adjectives', description: 'Claw at mouth twists outward (spitting out heat)',
      culturalNote: 'HOT depicts removing hot food from the mouth. For weather HOT applies equally. WARM is a softer version with less twist.',
    },
    COLD: {
      right: { elbow: { x: 278, y: 118 }, wrist: { x: 295, y: 108 } },
      left:  { elbow: { x: 102, y: 118 }, wrist: { x:  85, y: 108 } },
      rHand: 'FIST', lHand: 'FIST', expression: 'NEUTRAL', rMotion: 'motion-shake',
      category: 'adjectives', description: 'Both fists at shoulders shake (shivering from cold)',
      culturalNote: 'COLD mimics shivering. WINTER uses a similar motion. The body becomes the sign — a universal, iconic representation.',
    },
    IMPORTANT: {
      right: { elbow: { x: 268, y: 120 }, wrist: { x: 252, y: 106 } },
      left:  { elbow: { x: 112, y: 120 }, wrist: { x: 128, y: 106 } },
      rHand: 'A', lHand: 'A', expression: 'EMPHATIC', rMotion: 'motion-lift',
      category: 'adjectives', description: 'Both A-hands rise and face each other (heavy weight)',
      culturalNote: 'IMPORTANT shows something of great weight being lifted. Also used for SIGNIFICANT, ESSENTIAL, and CRITICAL.',
    },
    CORRECT: {
      right: { elbow: { x: 268, y: 118 }, wrist: { x: 252, y: 104 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 128, y: 132 } },
      rHand: 'POINT', lHand: 'POINT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'adjectives', description: 'Index fingers align and tap (two things matching)',
      culturalNote: 'CORRECT/RIGHT shows two things aligning perfectly. Also used for ACCURATE and EXACT.',
    },
    WRONG: {
      right: { elbow: { x: 250, y: 118 }, wrist: { x: 228, y: 128 } },
      rHand: 'HORNS', expression: 'NEGATIVE',
      category: 'adjectives', description: 'Y-hand (horns) taps chin (twisted/wrong)',
      culturalNote: 'WRONG taps the chin with the Y-handshape. Also means MISTAKE and ERROR — one of the most useful signs for classroom settings.',
    },
    HAPPY: {
      right: { elbow: { x: 258, y: 118 }, wrist: { x: 238, y: 128 } },
      rHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-lift',
      category: 'adjectives', description: 'Flat hand brushes upward on chest (happiness rising)',
      culturalNote: 'HAPPY uses upward brushing on the chest — happiness rising from the heart. EXCITED is similar but uses alternating hands.',
    },
    SAD: {
      right: { elbow: { x: 255, y: 95 }, wrist: { x: 238, y: 110 } },
      left:  { elbow: { x: 105, y: 95 }, wrist: { x: 122, y: 110 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEGATIVE', rMotion: 'motion-pull',
      category: 'adjectives', description: 'Both flat hands drop down face (tears falling)',
      culturalNote: 'SAD shows the face falling — like a frown in motion. In Deaf storytelling, emotional expression is amplified through facial grammar.',
    },

    // ──────────────────────────────── Colors ─────────────────────────────────

    RED: {
      right: { elbow: { x: 252, y: 108 }, wrist: { x: 235, y: 96 } },
      rHand: 'POINT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'colors', description: 'Index brushes downward on lips (red lips)',
      culturalNote: 'RED is iconic — referencing red lips. Color signs in ASL are often initialized or iconic.',
    },
    BLUE: {
      right: { elbow: { x: 278, y: 112 }, wrist: { x: 298, y: 98 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-shake',
      category: 'colors', description: 'B-hand (flat) shakes at shoulder level',
      culturalNote: 'BLUE is initialized with the B-handshape and shaken. Many color signs are initialized — a reflection of English contact with ASL.',
    },
    GREEN: {
      right: { elbow: { x: 278, y: 112 }, wrist: { x: 298, y: 98 } },
      rHand: 'L', expression: 'NEUTRAL', rMotion: 'motion-shake',
      category: 'colors', description: 'G-hand (L-shape) shakes',
      culturalNote: 'GREEN uses a G-handshape. Color vocabulary expanded in ASL with English influence, though older signs were more iconic.',
    },
    YELLOW: {
      right: { elbow: { x: 278, y: 112 }, wrist: { x: 298, y: 98 } },
      rHand: 'ILY', expression: 'NEUTRAL', rMotion: 'motion-shake',
      category: 'colors', description: 'Y-hand shakes (initialized with Y)',
      culturalNote: 'YELLOW uses the Y-handshape. Context always clarifies meaning when a handshape is shared across signs.',
    },
    WHITE: {
      right: { elbow: { x: 258, y: 118 }, wrist: { x: 240, y: 130 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-pull',
      category: 'colors', description: 'Flat hand at chest pulls outward then closes',
      culturalNote: 'WHITE is iconic — pulling something from the chest like a white shirt. One of the few color signs that is not initialized.',
    },
    BLACK: {
      right: { elbow: { x: 255, y: 88 }, wrist: { x: 235, y: 72 } },
      rHand: 'POINT', expression: 'NEUTRAL',
      category: 'colors', description: 'Index finger crosses forehead (dark eyebrow)',
      culturalNote: 'BLACK draws across the forehead like a dark eyebrow. One of the earliest color signs learned, alongside RED and WHITE.',
    },
    ORANGE: {
      right: { elbow: { x: 252, y: 108 }, wrist: { x: 234, y: 96 } },
      rHand: 'C', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'colors', description: 'C-hand at chin squeezes (like squeezing an orange)',
      culturalNote: 'ORANGE is iconic — squeezing an orange for its juice/color. Fruits that name colors often inspire iconic color signs.',
    },
    PURPLE: {
      right: { elbow: { x: 278, y: 112 }, wrist: { x: 298, y: 98 } },
      rHand: 'V', expression: 'NEUTRAL', rMotion: 'motion-shake',
      category: 'colors', description: 'P-hand (V-shape) shakes (initialized with P)',
      culturalNote: 'PURPLE uses a P-handshape (similar to V). Initialized color signs reflect English influence on ASL vocabulary development.',
    },
    BROWN: {
      right: { elbow: { x: 258, y: 102 }, wrist: { x: 240, y: 85 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-pull',
      category: 'colors', description: 'B-hand slides down cheek',
      culturalNote: 'BROWN uses the B-handshape slid down the cheek. Learning color signs together builds associative vocabulary efficiently.',
    },

    // ──────────────────────────────── Family ─────────────────────────────────

    MOTHER: {
      right: { elbow: { x: 252, y: 108 }, wrist: { x: 235, y: 98 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'family', description: 'Thumb of open hand taps chin twice',
      culturalNote: 'MOTHER taps the chin — feminine gender markers in ASL are at the chin (mom, sister, daughter, aunt). FATHER and male signs are at the forehead.',
    },
    FATHER: {
      right: { elbow: { x: 255, y: 88 }, wrist: { x: 238, y: 70 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'family', description: 'Thumb of open hand taps forehead twice',
      culturalNote: 'FATHER taps the forehead — male gender markers in ASL are at the forehead (dad, brother, son, uncle). The spatial gender system is elegant and consistent.',
    },
    SISTER: {
      right: { elbow: { x: 252, y: 108 }, wrist: { x: 235, y: 98 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 130, y: 108 } },
      rHand: 'L', lHand: 'L', expression: 'NEUTRAL', rMotion: 'motion-pull',
      category: 'family', description: 'L-hand from chin slides down to meet non-dominant L-hand',
      culturalNote: 'SISTER combines the feminine chin marker + SAME (they are the same family). Many family signs logically combine gender + relationship signs.',
    },
    BROTHER: {
      right: { elbow: { x: 255, y: 88 }, wrist: { x: 238, y: 72 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 130, y: 108 } },
      rHand: 'L', lHand: 'L', expression: 'NEUTRAL', rMotion: 'motion-pull',
      category: 'family', description: 'L-hand from forehead slides down to meet non-dominant L-hand',
      culturalNote: 'BROTHER combines the masculine forehead marker + SAME. In Deaf families, family signs are taught early as foundational vocabulary.',
    },
    BABY: {
      right: { elbow: { x: 268, y: 128 }, wrist: { x: 248, y: 148 } },
      left:  { elbow: { x: 112, y: 128 }, wrist: { x: 132, y: 148 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-nod',
      category: 'family', description: 'Both arms cradle and rock an invisible baby',
      culturalNote: 'BABY is one of the most iconic signs in ASL. The rocking motion is universal — showing cross-cultural overlap in representing infants.',
    },
    FAMILY: {
      right: { elbow: { x: 272, y: 112 }, wrist: { x: 294, y: 98 } },
      left:  { elbow: { x: 108, y: 112 }, wrist: { x:  86, y: 98 } },
      rHand: 'OK', lHand: 'OK', expression: 'HAPPY', rMotion: 'motion-circle',
      category: 'family', description: 'Both F-hands circle outward and meet (encircling the group)',
      culturalNote: 'FAMILY encircles all members — the circular motion shows inclusion. Deaf families with generational ASL are called "Deaf families" with pride.',
    },
    PERSON: {
      right: { elbow: { x: 272, y: 115 }, wrist: { x: 272, y: 148 } },
      left:  { elbow: { x: 108, y: 115 }, wrist: { x: 108, y: 148 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL',
      category: 'family', description: 'Both flat hands move downward parallel (person marker)',
      culturalNote: 'PERSON is a grammatical tool in ASL — added after action signs to create agent nouns. TEACH+PERSON = TEACHER. This mirrors the English "-er" suffix.',
    },
    FRIEND: {
      right: { elbow: { x: 268, y: 118 }, wrist: { x: 255, y: 108 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 125, y: 108 } },
      rHand: 'POINT', lHand: 'POINT', expression: 'HAPPY', rMotion: 'motion-flip',
      category: 'family', description: 'Hooked index fingers link and switch places (friendship bond)',
      culturalNote: 'FRIEND links index fingers — two people connected. The Deaf community is known for strong, lifelong friendships often formed at residential schools.',
    },
    CHILDREN: {
      right: { elbow: { x: 268, y: 130 }, wrist: { x: 260, y: 148 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'family', description: 'Flat hand pats downward at different heights (varying heights of children)',
      culturalNote: 'CHILDREN shows patting heads at different heights — beautiful iconicity. CHILD (singular) is one pat. Reduplication often marks plurality in ASL.',
    },

    // ──────────────────────────────── Food & Drink ───────────────────────────

    EAT: {
      right: { elbow: { x: 252, y: 108 }, wrist: { x: 236, y: 96 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'food', description: 'Flat hand taps mouth (bringing food to mouth)',
      culturalNote: 'EAT taps the mouth — one of the most universally understood signs. Also used for FOOD and MEAL in many contexts.',
    },
    DRINK: {
      right: { elbow: { x: 252, y: 108 }, wrist: { x: 236, y: 92 } },
      rHand: 'C', expression: 'NEUTRAL', rMotion: 'motion-lift',
      category: 'food', description: 'C-hand (cup shape) tilts toward mouth',
      culturalNote: 'DRINK mimics holding a cup — another iconic, universally understandable sign. The C-hand is one of the most versatile in ASL.',
    },
    HUNGRY: {
      right: { elbow: { x: 255, y: 112 }, wrist: { x: 240, y: 130 } },
      rHand: 'C', expression: 'NEGATIVE', rMotion: 'motion-pull',
      category: 'food', description: 'C-hand at throat/chest moves downward (empty feeling)',
      culturalNote: 'HUNGRY traces the path food would travel — from throat to stomach. Also used for CRAVE and DESIRE with a different facial expression.',
    },
    WATER: {
      right: { elbow: { x: 252, y: 108 }, wrist: { x: 234, y: 96 } },
      rHand: 'V', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'food', description: 'W-hand (three fingers) taps chin twice',
      culturalNote: 'WATER uses a W-handshape (3 fingers extended) tapping the chin. Hydration and water access are important topics in Deaf athletic communities.',
    },
    COOK: {
      right: { elbow: { x: 268, y: 122 }, wrist: { x: 252, y: 138 } },
      left:  { elbow: { x: 112, y: 122 }, wrist: { x: 128, y: 138 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-flip',
      category: 'food', description: 'Dominant hand flips on non-dominant palm (flipping food)',
      culturalNote: 'COOK shows flipping food in a pan. Communal meals at Deaf clubs and events are important social occasions in Deaf culture.',
    },

    // ──────────────────────────────── Body ───────────────────────────────────

    HEAD: {
      right: { elbow: { x: 252, y: 92 }, wrist: { x: 238, y: 76 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'body', description: 'Flat hand taps side of head',
      culturalNote: 'Body-part signs in ASL are iconic — the hand touches the body part. This makes them immediately learnable and memorable.',
    },
    HAND: {
      right: { elbow: { x: 268, y: 130 }, wrist: { x: 250, y: 145 } },
      left:  { elbow: { x: 112, y: 130 }, wrist: { x: 128, y: 145 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'body', description: 'Dominant hand brushes across non-dominant hand',
      culturalNote: 'HAND is both a noun and a concept central to Deaf culture — "in the hands" describes how ASL lives. Hands are respected tools of communication.',
    },
    EYE: {
      right: { elbow: { x: 252, y: 96 }, wrist: { x: 236, y: 80 } },
      rHand: 'POINT', expression: 'NEUTRAL',
      category: 'body', description: 'Index finger points to eye',
      culturalNote: 'Eye contact is a form of respect in ASL conversation. Looking away while signing is rude — the opposite of hearing culture norms in many contexts.',
    },
    EAR: {
      right: { elbow: { x: 272, y: 102 }, wrist: { x: 295, y: 88 } },
      rHand: 'POINT', expression: 'NEUTRAL',
      category: 'body', description: 'Index finger points to ear',
      culturalNote: 'EAR is used in contexts like "hearing person" or discussing hearing loss. HEARING (ability) also touches the mouth to show sound coming from the mouth.',
    },
    NOSE: {
      right: { elbow: { x: 252, y: 98 }, wrist: { x: 238, y: 85 } },
      rHand: 'POINT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'body', description: 'Index finger taps tip of nose',
      culturalNote: 'Body part signs are typically taught first to children learning ASL — immediate, concrete vocabulary with high visual retention.',
    },

    // ──────────────────────────────── Health ─────────────────────────────────

    SICK: {
      right: { elbow: { x: 252, y: 92 }, wrist: { x: 238, y: 76 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 128, y: 132 } },
      rHand: 'CLAW', lHand: 'CLAW', expression: 'NEGATIVE', rMotion: 'motion-tap',
      category: 'health', description: 'Middle fingers of claw-hands tap head and stomach',
      culturalNote: 'SICK uses the middle finger (the "feeling" finger in ASL) touching head and stomach — showing the body feels bad throughout.',
    },
    PAIN: {
      right: { elbow: { x: 268, y: 118 }, wrist: { x: 258, y: 106 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 122, y: 106 } },
      rHand: 'POINT', lHand: 'POINT', expression: 'NEGATIVE', rMotion: 'motion-tap',
      category: 'health', description: 'Both index fingers jab toward each other (sharp pain)',
      culturalNote: 'PAIN/HURT shows two sharp objects meeting. Location can be changed to show WHERE it hurts — spatial grammar makes this very expressive.',
    },
    DOCTOR: {
      right: { elbow: { x: 268, y: 128 }, wrist: { x: 260, y: 148 } },
      left:  { elbow: { x: 112, y: 128 }, wrist: { x: 120, y: 148 } },
      rHand: 'V', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'health', description: 'D/V-hand taps non-dominant wrist (checking pulse)',
      culturalNote: 'DOCTOR checks the pulse at the wrist. Finding a signing doctor or interpreter for medical appointments is a key accessibility need in Deaf healthcare.',
    },
    BETTER: {
      right: { elbow: { x: 252, y: 108 }, wrist: { x: 238, y: 96 } },
      rHand: 'FIST', expression: 'HAPPY', rMotion: 'motion-lift',
      category: 'health', description: 'Fist at mouth rises upward (getting better/improving)',
      culturalNote: 'BETTER and IMPROVE share the same root — something moving upward. In Deaf medical contexts, being able to express health status clearly is crucial.',
    },
    HELP: {
      right: { elbow: { x: 268, y: 125 }, wrist: { x: 255, y: 112 } },
      left:  { elbow: { x: 112, y: 130 }, wrist: { x: 125, y: 148 } },
      rHand: 'THUMB_UP', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-lift',
      category: 'health', description: 'Thumb-up rests on flat palm, both rise together',
      culturalNote: 'HELP lifts one hand with another — literally helping something rise. The Deaf community has a strong tradition of mutual aid and community support.',
    },

    // ──────────────────────────────── Directions ─────────────────────────────

    UP: {
      right: { elbow: { x: 265, y: 105 }, wrist: { x: 265, y: 68 } },
      rHand: 'POINT', expression: 'NEUTRAL', rMotion: 'motion-lift',
      category: 'directions', description: 'Index finger points straight up',
      culturalNote: 'UP is directional — pointing upward. ASL uses three-dimensional space to express location, direction, and movement simultaneously.',
    },
    DOWN: {
      right: { elbow: { x: 265, y: 145 }, wrist: { x: 265, y: 178 } },
      rHand: 'POINT', expression: 'NEUTRAL',
      category: 'directions', description: 'Index finger points straight down',
      culturalNote: 'DOWN points downward. Directional signs in ASL combine with verbs — GO-DOWN, FALL-DOWN — by moving the sign in the indicated direction.',
    },
    HERE: {
      right: { elbow: { x: 265, y: 135 }, wrist: { x: 265, y: 158 } },
      left:  { elbow: { x: 115, y: 135 }, wrist: { x: 115, y: 158 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'directions', description: 'Both flat hands circle downward in place',
      culturalNote: 'HERE shows the immediate location — both hands circle to define the space. Spatial reference is fundamental to ASL grammar.',
    },
    THERE: {
      right: { elbow: { x: 270, y: 118 }, wrist: { x: 295, y: 105 } },
      rHand: 'POINT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'directions', description: 'Index finger extends and points outward',
      culturalNote: 'THERE is directional — points to an established location in signing space. Once a referent is placed, pointing to it functions like a pronoun.',
    },
    INSIDE: {
      right: { elbow: { x: 258, y: 118 }, wrist: { x: 248, y: 132 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 122, y: 125 } },
      rHand: 'FLAT', lHand: 'C', expression: 'NEUTRAL', rMotion: 'motion-pull',
      category: 'directions', description: 'Flat hand enters C-hand (going inside a container)',
      culturalNote: 'INSIDE/INTO shows something entering a container. Spatial prepositions in ASL are depicted three-dimensionally rather than through separate words.',
    },
    OUTSIDE: {
      right: { elbow: { x: 258, y: 118 }, wrist: { x: 260, y: 102 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 122, y: 125 } },
      rHand: 'FLAT', lHand: 'C', expression: 'NEUTRAL', rMotion: 'motion-lift',
      category: 'directions', description: 'Flat hand exits C-hand (coming out)',
      culturalNote: 'OUTSIDE exits a container — the reverse of INSIDE. ASL expresses complex spatial relationships through classifier handshapes.',
    },

    // ──────────────────────────────── Extended Time ───────────────────────────

    HOUR: {
      right: { elbow: { x: 268, y: 122 }, wrist: { x: 255, y: 138 } },
      left:  { elbow: { x: 112, y: 122 }, wrist: { x: 125, y: 138 } },
      rHand: 'POINT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'time', description: 'Index traces a full circle on non-dominant palm (clock hand)',
      culturalNote: 'HOUR shows the minute hand making one full revolution. ASL often represents time iconically — making duration concrete and visual.',
    },
    MINUTE: {
      right: { elbow: { x: 268, y: 122 }, wrist: { x: 255, y: 138 } },
      left:  { elbow: { x: 112, y: 122 }, wrist: { x: 125, y: 138 } },
      rHand: 'POINT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-flick',
      category: 'time', description: 'Index makes a slight arc on non-dominant palm',
      culturalNote: 'MINUTE shows a small movement of the clock hand. For "a few minutes," the arc is larger — scalar modification is natural in ASL.',
    },
    YEAR: {
      right: { elbow: { x: 268, y: 122 }, wrist: { x: 255, y: 110 } },
      left:  { elbow: { x: 112, y: 122 }, wrist: { x: 125, y: 110 } },
      rHand: 'FIST', lHand: 'FIST', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'time', description: 'One fist circles around the other (one orbit = 1 year)',
      culturalNote: 'YEAR shows the Earth orbiting the sun — an astronomical metaphor built into the sign itself.',
    },
    ALWAYS: {
      right: { elbow: { x: 272, y: 118 }, wrist: { x: 296, y: 105 } },
      rHand: 'POINT', expression: 'EMPHATIC', rMotion: 'motion-circle',
      category: 'time', description: 'Index circles continuously (ongoing forever)',
      culturalNote: 'ALWAYS and FOREVER share the same circular motion. Duration is shown by how long the sign continues — a natural temporal metaphor.',
    },
    NEVER: {
      right: { elbow: { x: 268, y: 118 }, wrist: { x: 255, y: 105 } },
      rHand: 'FLAT', expression: 'NEGATIVE', rMotion: 'motion-flip',
      category: 'time', description: 'Flat hand arcs sharply downward (cutting off the timeline)',
      culturalNote: 'NEVER makes a sharp downward arc — a decisive cut to the timeline. Combined with head shake, it strongly negates any future possibility.',
    },
    BEFORE: {
      right: { elbow: { x: 278, y: 112 }, wrist: { x: 298, y: 100 } },
      rHand: 'FLAT', expression: 'NEUTRAL',
      category: 'time', description: 'Flat hand behind shoulder (reaching back in time)',
      culturalNote: 'Time in ASL is a physical timeline — past is behind the body, present at the torso, future in front. BEFORE reaches back in time.',
    },
    AFTER: {
      right: { elbow: { x: 268, y: 112 }, wrist: { x: 248, y: 98 } },
      rHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'time', description: 'Flat hand arcs forward from wrist (ahead in time)',
      culturalNote: 'AFTER pushes forward on the timeline. The timeline metaphor in ASL is so robust that LONG-AGO sweeps far back.',
    },
    DURING: {
      right: { elbow: { x: 268, y: 118 }, wrist: { x: 252, y: 105 } },
      left:  { elbow: { x: 112, y: 118 }, wrist: { x: 128, y: 105 } },
      rHand: 'POINT', lHand: 'POINT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'time', description: 'Both index fingers move forward in parallel (concurrent time)',
      culturalNote: 'DURING shows two things happening simultaneously — parallel movement depicts concurrent actions or overlapping time frames.',
    },

    // ──────────────────────────────── Days ───────────────────────────────────

    MONDAY: {
      right: { elbow: { x: 275, y: 112 }, wrist: { x: 298, y: 100 } },
      rHand: 'FIST', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'time', description: 'M-hand circles (initialized day sign)',
      culturalNote: 'Day signs are initialized — MONDAY uses M-handshape, TUESDAY uses T, etc. Initialized signs reflect English contact and are common in American schools.',
    },
    TUESDAY: {
      right: { elbow: { x: 275, y: 112 }, wrist: { x: 298, y: 100 } },
      rHand: 'FIST', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'time', description: 'T-hand circles (initialized day sign)',
      culturalNote: 'TUESDAY uses the T-handshape. Context, location, and non-manual markers help distinguish days with similar handshapes.',
    },
    WEDNESDAY: {
      right: { elbow: { x: 275, y: 112 }, wrist: { x: 298, y: 100 } },
      rHand: 'V', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'time', description: 'W-hand circles (initialized day sign)',
      culturalNote: 'WEDNESDAY uses the W-handshape. In Deaf residential schools, days of the week structure scheduling of classes and events.',
    },
    THURSDAY: {
      right: { elbow: { x: 275, y: 112 }, wrist: { x: 298, y: 100 } },
      rHand: 'HORNS', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'time', description: 'H-hand circles (initialized day sign)',
      culturalNote: 'THURSDAY uses the H-handshape. Some signers use a TH combination — regional variation in day signs is common across the US.',
    },
    FRIDAY: {
      right: { elbow: { x: 275, y: 112 }, wrist: { x: 298, y: 100 } },
      rHand: 'OK', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'time', description: 'F-hand circles (initialized day sign)',
      culturalNote: 'FRIDAY uses the F-handshape. In Deaf schools, Fridays meant town trips — going to shops and community centers to interact with the wider world.',
    },
    SATURDAY: {
      right: { elbow: { x: 275, y: 112 }, wrist: { x: 298, y: 100 } },
      rHand: 'A', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'time', description: 'S-hand circles (initialized day sign)',
      culturalNote: 'SATURDAY uses the S-handshape. Weekends are special in Deaf culture — Deaf clubs, sports events, and social gatherings traditionally occur on Saturdays.',
    },
    SUNDAY: {
      right: { elbow: { x: 278, y: 112 }, wrist: { x: 300, y: 100 } },
      left:  { elbow: { x: 102, y: 112 }, wrist: { x:  80, y: 100 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-circle',
      category: 'time', description: 'Both flat hands circle outward (the sun / day of rest)',
      culturalNote: 'SUNDAY uses both hands in outward circles — representing the sun. Many Deaf churches exist as important community gathering places.',
    },

    // ──────────────────────────────── Weather ────────────────────────────────

    RAIN: {
      right: { elbow: { x: 275, y: 88 }, wrist: { x: 285, y: 115 } },
      left:  { elbow: { x: 105, y: 88 }, wrist: { x:  95, y: 115 } },
      rHand: 'CLAW', lHand: 'CLAW', expression: 'NEUTRAL', rMotion: 'motion-wiggle',
      category: 'weather', description: 'Both claw-hands wiggle downward (raindrops falling)',
      culturalNote: 'RAIN is iconic — the wiggling fingers depict rain falling. Weather signs are often iconic and immediately understandable across sign languages.',
    },
    SUN: {
      right: { elbow: { x: 265, y: 105 }, wrist: { x: 268, y: 72 } },
      rHand: 'POINT', expression: 'HAPPY', rMotion: 'motion-circle',
      category: 'weather', description: 'Index draws a circle in the sky (sun), then hand opens (rays)',
      culturalNote: 'SUN draws the circle of the sun then spreads fingers for rays. SUNSHINE extends into WARM when the open hand faces down.',
    },
    WIND: {
      right: { elbow: { x: 278, y: 112 }, wrist: { x: 300, y: 100 } },
      left:  { elbow: { x: 102, y: 112 }, wrist: { x:  80, y: 100 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-wave',
      category: 'weather', description: 'Both flat hands sway like blowing wind',
      culturalNote: 'WIND shows air moving — the waving motion captures direction and intensity. Facial expression shows strong vs. light wind.',
    },
    SNOW: {
      right: { elbow: { x: 275, y: 88 }, wrist: { x: 285, y: 115 } },
      left:  { elbow: { x: 105, y: 88 }, wrist: { x:  95, y: 115 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-wiggle',
      category: 'weather', description: 'Both open hands flutter downward (snowflakes)',
      culturalNote: 'SNOW flutters fingers downward gently. WINTER adds a shivering motion. Many weather concepts share base handshapes with different movement.',
    },

    // ──────────────────────────────── Transport ───────────────────────────────

    CAR: {
      right: { elbow: { x: 278, y: 122 }, wrist: { x: 298, y: 112 } },
      left:  { elbow: { x: 102, y: 122 }, wrist: { x:  82, y: 112 } },
      rHand: 'FIST', lHand: 'FIST', expression: 'NEUTRAL', rMotion: 'motion-roll',
      category: 'transport', description: 'Both fists steer an imaginary steering wheel',
      culturalNote: 'CAR mimes steering — an iconic sign understood by both Deaf and hearing people. Vehicle classifiers show size, speed, and direction simultaneously.',
    },
    WALK: {
      right: { elbow: { x: 265, y: 140 }, wrist: { x: 255, y: 165 } },
      left:  { elbow: { x: 115, y: 140 }, wrist: { x: 125, y: 155 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'transport', description: 'Both flat hands alternate in a walking motion (feet)',
      culturalNote: 'WALK alternates flat hands like walking feet. Direction can be changed to show where the walking is going — spatial grammar in action.',
    },
    BUS: {
      right: { elbow: { x: 278, y: 118 }, wrist: { x: 300, y: 108 } },
      left:  { elbow: { x: 102, y: 118 }, wrist: { x:  80, y: 108 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'transport', description: 'B-hands move forward (bus driving forward)',
      culturalNote: 'BUS uses B-handshapes moving forward. Public transport accessibility for Deaf users requires visual alerts and display boards.',
    },
    TRAIN: {
      right: { elbow: { x: 268, y: 128 }, wrist: { x: 252, y: 142 } },
      left:  { elbow: { x: 112, y: 128 }, wrist: { x: 128, y: 142 } },
      rHand: 'V', lHand: 'V', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'transport', description: 'V-hands slide forward on each other (train on tracks)',
      culturalNote: 'TRAIN shows two sets of fingers representing train tracks. The Deaf community often prefers train travel due to its visual, text-based environment.',
    },
    HOME: {
      right: { elbow: { x: 252, y: 108 }, wrist: { x: 238, y: 96 } },
      rHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-tap',
      category: 'transport', description: 'Flat hand taps cheek then near ear (eat + sleep = home)',
      culturalNote: 'HOME combines EAT + SLEEP — where you eat and sleep. A beautiful metaphoric compound. The Deaf school dorm was historically the center of Deaf social life.',
    },
    SCHOOL: {
      right: { elbow: { x: 268, y: 128 }, wrist: { x: 252, y: 145 } },
      left:  { elbow: { x: 112, y: 128 }, wrist: { x: 128, y: 145 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'education', description: 'Dominant hand claps on non-dominant palm twice',
      culturalNote: 'SCHOOL claps the hands — the teacher getting the class\'s attention. Deaf residential schools were foundational to Deaf community identity and ASL preservation.',
    },

    // ──────────────────────────────── Money ──────────────────────────────────

    MONEY: {
      right: { elbow: { x: 268, y: 128 }, wrist: { x: 252, y: 145 } },
      left:  { elbow: { x: 112, y: 128 }, wrist: { x: 128, y: 145 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'money', description: 'Back of dominant hand taps non-dominant palm (paper money)',
      culturalNote: 'MONEY shows a bill being tapped — very iconic. Financial literacy and equitable pay are important advocacy topics in Deaf professional communities.',
    },
    PAY: {
      right: { elbow: { x: 268, y: 128 }, wrist: { x: 252, y: 145 } },
      left:  { elbow: { x: 112, y: 128 }, wrist: { x: 128, y: 145 } },
      rHand: 'POINT', lHand: 'FLAT', expression: 'NEUTRAL', rMotion: 'motion-push',
      category: 'money', description: 'Index on palm pushes forward (handing over payment)',
      culturalNote: 'PAY is directional — sign toward the person being paid. Clear directional signing in ASL avoids financial misunderstandings.',
    },
    FREE: {
      right: { elbow: { x: 278, y: 118 }, wrist: { x: 295, y: 105 } },
      left:  { elbow: { x: 102, y: 118 }, wrist: { x:  85, y: 105 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'HAPPY', rMotion: 'motion-flip',
      category: 'money', description: 'Both F-hands cross at wrists then open outward (liberation)',
      culturalNote: 'FREE/FREEDOM opens crossed wrists outward — liberation. Both "no cost" and "freedom" use this sign. Deaf advocacy often centers on linguistic freedom.',
    },
    EXPENSIVE: {
      right: { elbow: { x: 268, y: 128 }, wrist: { x: 252, y: 145 } },
      left:  { elbow: { x: 112, y: 128 }, wrist: { x: 128, y: 145 } },
      rHand: 'FLAT', lHand: 'FLAT', expression: 'EMPHATIC', rMotion: 'motion-pull',
      category: 'money', description: 'Money sign then throw away (throwing away money)',
      culturalNote: 'EXPENSIVE mimics throwing money away — an elegant way to show cost. CHEAP is a different motion; COST and PRICE have their own initialized signs.',
    },

    MORE: {
      right: { elbow: { x: 255, y: 122 }, wrist: { x: 240, y: 112 } },
      left:  { elbow: { x: 112, y: 122 }, wrist: { x: 127, y: 112 } },
      rHand: 'OK', lHand: 'OK', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'quantifiers', description: 'Both O-hands tap fingertips together',
      culturalNote: 'MORE brings both hands together repeatedly — fingertips touching to show addition or increase. Frequently used in requests.',
    },

    // ──────────────────────────────── Numbers (extended) ─────────────────────

    FOUR: {
      right: { elbow: { x: 265, y: 105 }, wrist: { x: 265, y: 72 } },
      rHand: 'CLAW', expression: 'NEUTRAL',
      category: 'numbers', description: 'Four fingers extended (all except thumb)',
      culturalNote: 'Number signs 1-5 are straightforward. Numbers 6-9 touch the thumb to other fingers. ASL numbers are one of the most systematic parts of the vocabulary.',
    },
    SIX: {
      right: { elbow: { x: 265, y: 105 }, wrist: { x: 265, y: 72 } },
      rHand: 'ILY', expression: 'NEUTRAL',
      category: 'numbers', description: 'Thumb touches pinky (6)',
      culturalNote: 'SIX touches thumb to pinky. Numbers 6-10 combine base count with thumb contact — efficient and systematic.',
    },
    SEVEN: {
      right: { elbow: { x: 265, y: 105 }, wrist: { x: 265, y: 72 } },
      rHand: 'HORNS', expression: 'NEUTRAL',
      category: 'numbers', description: 'Thumb touches ring finger (7)',
      culturalNote: 'SEVEN touches thumb to ring finger. Number signs are essential for dates, prices, addresses — high-frequency in daily communication.',
    },
    EIGHT: {
      right: { elbow: { x: 265, y: 105 }, wrist: { x: 265, y: 72 } },
      rHand: 'OK', expression: 'NEUTRAL',
      category: 'numbers', description: 'Thumb touches middle finger (8)',
      culturalNote: 'EIGHT touches thumb to middle finger. Number handshapes are often incorporated directly into signs — ONE-WEEK, TWO-MONTHS, etc.',
    },
    NINE: {
      right: { elbow: { x: 265, y: 105 }, wrist: { x: 265, y: 72 } },
      rHand: 'OK', expression: 'NEUTRAL', rMotion: 'motion-tap',
      category: 'numbers', description: 'Thumb touches bent index finger (9)',
      culturalNote: 'NINE touches thumb to bent index. Incorporating numbers into signs (ONE-HOUR, THREE-DAYS) is a productive morphological process in ASL.',
    },
    ZERO: {
      right: { elbow: { x: 265, y: 105 }, wrist: { x: 265, y: 72 } },
      rHand: 'O', expression: 'NEUTRAL',
      category: 'numbers', description: 'O-hand (all fingers meet thumb = 0)',
      culturalNote: 'ZERO uses the O-handshape — a circle representing nothing. Also used for NOTHING and NONE in many contexts.',
    },
  };

  // ─── Fingerspelling table ─────────────────────────────────────────────────
  // Maps each letter to a handshape + arm position for fingerspelling.
  // Uses simplified arm position (hand held at face height, right side).
  const FACE_POS = { elbow: { x: 258, y: 88 }, wrist: { x: 244, y: 68 } };
  const FINGERSPELL_HANDS = {
    A:'A', B:'FLAT', C:'C', D:'POINT', E:'CLAW', F:'OK',
    G:'L', H:'V', I:'ILY', J:'ILY', K:'V', L:'L',
    M:'FIST', N:'FIST', O:'O', P:'L', Q:'L', R:'V',
    S:'A', T:'FIST', U:'V', V:'V', W:'V', X:'POINT',
    Y:'ILY', Z:'POINT',
  };

  // ─── Synonym / phrase → sign key mapping ─────────────────────────────────
  // Lower-case keys. Multi-word phrases are checked before single words.
  const WORD_TO_SIGN = {
    // Greetings
    'hello': 'HELLO', 'hi': 'HELLO', 'hey': 'HELLO', 'howdy': 'HELLO', 'greetings': 'HELLO',
    'goodbye': 'GOODBYE', 'bye': 'GOODBYE', 'farewell': 'GOODBYE', 'see ya': 'GOODBYE',
    'good morning': 'GOOD_MORNING', 'morning': 'MORNING',
    'good night': 'GOOD_NIGHT', 'goodnight': 'GOOD_NIGHT', 'night': 'NIGHT',
    'nice to meet you': 'NICE_TO_MEET_YOU', 'nice meeting you': 'NICE_TO_MEET_YOU',
    'see you later': 'SEE_YOU_LATER', 'see you': 'SEE_YOU_LATER',
    'welcome': 'WELCOME',

    // Politeness
    'thank you': 'THANK_YOU', 'thanks': 'THANK_YOU', 'thank': 'THANK_YOU',
    'please': 'PLEASE',
    'sorry': 'SORRY', 'apologize': 'SORRY', 'apologies': 'SORRY', 'pardon': 'SORRY',
    "excuse me": 'EXCUSE_ME', 'excuse': 'EXCUSE_ME',
    "you're welcome": 'YOU_RE_WELCOME', 'youre welcome': 'YOU_RE_WELCOME', 'no problem': 'YOU_RE_WELCOME',

    // Responses
    'yes': 'YES', 'yeah': 'YES', 'yep': 'YES', 'correct': 'YES', 'right': 'YES',
    'no': 'NO', 'nope': 'NO', 'nah': 'NO',
    'ok': 'OK', 'okay': 'OK', 'alright': 'OK', 'sure': 'OK', 'fine': 'OK',
    'i understand': 'I_UNDERSTAND', 'understood': 'I_UNDERSTAND', 'got it': 'I_UNDERSTAND',
    "i don't understand": 'I_DONT_UNDERSTAND', 'i dont understand': 'I_DONT_UNDERSTAND',
    'repeat': 'REPEAT_PLEASE', 'again': 'REPEAT_PLEASE', 'say that again': 'REPEAT_PLEASE',
    'could you repeat': 'COULD_YOU_REPEAT', 'could you repeat that': 'COULD_YOU_REPEAT',

    // Questions
    'what': 'WHAT', 'when': 'WHEN', 'where': 'WHERE', 'who': 'WHO',
    'why': 'WHY', 'how': 'HOW', 'which': 'WHAT',
    'do you understand': 'DO_YOU_UNDERSTAND', 'do you understand me': 'DO_YOU_UNDERSTAND',
    'can you help': 'CAN_YOU_HELP', 'can you help me': 'CAN_YOU_HELP',
    'do you need help': 'CAN_YOU_HELP',

    // Academic
    'student': 'STUDENT', 'students': 'STUDENT',
    'teacher': 'TEACHER', 'professor': 'TEACHER', 'instructor': 'TEACHER', 'lecturer': 'TEACHER',
    'class': 'CLASS', 'course': 'CLASS', 'classes': 'CLASS',
    'learn': 'LEARN', 'learning': 'LEARN', 'learned': 'LEARN',
    'study': 'STUDY', 'studying': 'STUDY',
    'homework': 'HOMEWORK', 'assignment': 'ASSIGNMENT', 'task': 'ASSIGNMENT',
    'test': 'TEST', 'quiz': 'TEST', 'exam': 'EXAM', 'midterm': 'EXAM', 'final': 'EXAM',
    'lecture': 'LECTURE', 'presentation': 'LECTURE',
    'grade': 'GRADE', 'grades': 'GRADE', 'mark': 'GRADE',
    'university': 'UNIVERSITY', 'college': 'UNIVERSITY', 'school': 'UNIVERSITY',
    'question': 'QUESTION', 'questions': 'QUESTION',
    'book': 'BOOK', 'textbook': 'BOOK', 'reading': 'BOOK',
    'deadline': 'DEADLINE', 'due': 'DEADLINE', 'due date': 'DEADLINE',

    // Time
    'now': 'NOW', 'currently': 'NOW', 'right now': 'NOW',
    'today': 'TODAY', 'this day': 'TODAY',
    'tomorrow': 'TOMORROW', 'next day': 'TOMORROW',
    'yesterday': 'YESTERDAY', 'last day': 'YESTERDAY',
    'later': 'LATER', 'afterwards': 'LATER',
    'soon': 'SOON', 'shortly': 'SOON',
    'morning': 'MORNING', 'tonight': 'NIGHT', 'evening': 'NIGHT', 'afternoon': 'NOW',
    'week': 'WEEK', 'weeks': 'WEEK', 'next week': 'WEEK',

    // Verbs
    'help': 'HELP', 'assist': 'HELP', 'support': 'HELP',
    'go': 'GO', 'going': 'GO', 'leave': 'GO', 'depart': 'GO',
    'come': 'COME', 'coming': 'COME', 'arrive': 'COME',
    'see': 'SEE', 'look': 'SEE', 'watch': 'SEE', 'observe': 'SEE',
    'know': 'KNOW', 'knew': 'KNOW', 'aware': 'KNOW',
    'understand': 'UNDERSTAND', 'comprehend': 'UNDERSTAND',
    'want': 'WANT', 'wish': 'WANT', 'desire': 'WANT',
    'need': 'NEED', 'require': 'NEED', 'necessary': 'NEED', 'must': 'NEED',
    'like': 'LIKE', 'enjoy': 'LIKE', 'love': 'LOVE', 'adore': 'LOVE',
    'wait': 'WAIT', 'hold on': 'WAIT', 'one moment': 'WAIT',
    'start': 'START', 'begin': 'START', 'open': 'START',
    'stop': 'STOP', 'halt': 'STOP', 'pause': 'STOP', 'wait': 'WAIT',
    'finish': 'FINISH', 'done': 'FINISH', 'complete': 'FINISH', 'end': 'FINISH',
    'think': 'THINK', 'believe': 'THINK', 'feel': 'THINK',

    // Emotions
    'happy': 'HAPPY', 'glad': 'HAPPY', 'joyful': 'HAPPY', 'great': 'HAPPY',
    'sad': 'SAD', 'unhappy': 'SAD', 'upset': 'SAD',
    'tired': 'TIRED', 'exhausted': 'TIRED', 'sleepy': 'TIRED',
    'excited': 'EXCITED', 'enthusiasm': 'EXCITED', 'enthusiastic': 'EXCITED',
    'important': 'IMPORTANT', 'critical': 'IMPORTANT', 'essential': 'IMPORTANT', 'key': 'IMPORTANT',

    // People / Pronouns
    'i': 'ME', 'me': 'ME', 'my': 'ME', 'myself': 'ME',
    'you': 'YOU', 'your': 'YOU', 'yourself': 'YOU',
    'name': 'NAME', 'called': 'NAME', 'my name': 'NAME',
    'friend': 'FRIEND', 'friends': 'FRIEND', 'buddy': 'FRIEND', 'colleague': 'FRIEND',
    'deaf': 'DEAF',
    'hearing': 'HEARING',

    // Technology
    'video': 'VIDEO', 'stream': 'VIDEO', 'record': 'VIDEO',
    'computer': 'COMPUTER', 'laptop': 'COMPUTER', 'pc': 'COMPUTER',
    'internet': 'INTERNET', 'online': 'INTERNET', 'web': 'INTERNET',
    'phone': 'PHONE', 'mobile': 'PHONE', 'call': 'PHONE',
    'caption': 'CAPTION', 'captions': 'CAPTION', 'subtitle': 'CAPTION', 'subtitles': 'CAPTION',
    'translate': 'TRANSLATE', 'translation': 'TRANSLATE', 'interpreter': 'TRANSLATE',
    'mute': 'MUTE', 'silent': 'MUTE', 'quiet': 'MUTE',

    // Descriptors
    'good': 'GOOD', 'great': 'GOOD', 'excellent': 'GOOD', 'nice': 'GOOD',
    'bad': 'BAD', 'wrong': 'BAD', 'incorrect': 'BAD',
    'different': 'DIFFERENT', 'other': 'DIFFERENT', 'various': 'DIFFERENT',
    'same': 'SAME', 'similar': 'SAME', 'equal': 'SAME',
    'difficult': 'DIFFICULT', 'hard': 'DIFFICULT', 'challenging': 'DIFFICULT', 'tough': 'DIFFICULT',
    'easy': 'EASY', 'simple': 'EASY', 'straightforward': 'EASY',

    // Numbers
    'one': 'ONE', '1': 'ONE', 'first': 'ONE',
    'two': 'TWO', '2': 'TWO', 'second': 'TWO',
    'three': 'THREE', '3': 'THREE', 'third': 'THREE',
    'five': 'FIVE', '5': 'FIVE',
    'ten': 'TEN', '10': 'TEN',

    // ── Numbers extended ──────────────────────────────────────────────────────
    'four': 'FOUR', '4': 'FOUR', 'fourth': 'FOUR',
    'six': 'SIX', '6': 'SIX', 'sixth': 'SIX',
    'seven': 'SEVEN', '7': 'SEVEN', 'seventh': 'SEVEN',
    'eight': 'EIGHT', '8': 'EIGHT', 'eighth': 'EIGHT',
    'nine': 'NINE', '9': 'NINE', 'ninth': 'NINE',
    'zero': 'ZERO', '0': 'ZERO', 'none': 'ZERO', 'null': 'ZERO', 'nothing': 'ZERO',

    // ── Actions ───────────────────────────────────────────────────────────────
    'make': 'MAKE', 'making': 'MAKE', 'made': 'MAKE', 'create': 'MAKE',
    'creating': 'MAKE', 'created': 'MAKE', 'build': 'MAKE', 'building': 'MAKE',
    'built': 'MAKE', 'construct': 'MAKE', 'constructing': 'MAKE', 'produce': 'MAKE',
    'producing': 'MAKE', 'manufacture': 'MAKE', 'form': 'MAKE', 'forming': 'MAKE',
    'formed': 'MAKE', 'craft': 'MAKE', 'crafting': 'MAKE', 'design': 'MAKE',
    'designing': 'MAKE', 'designed': 'MAKE', 'develop': 'MAKE', 'developing': 'MAKE',
    'developed': 'MAKE', 'generate': 'MAKE', 'generating': 'MAKE', 'establish': 'MAKE',

    'take': 'TAKE', 'taking': 'TAKE', 'took': 'TAKE', 'taken': 'TAKE',
    'grab': 'TAKE', 'grabbing': 'TAKE', 'grabbed': 'TAKE', 'seize': 'TAKE',
    'seizing': 'TAKE', 'pick up': 'TAKE', 'pickup': 'TAKE', 'obtain': 'TAKE',
    'obtaining': 'TAKE', 'obtained': 'TAKE', 'receive': 'TAKE', 'receiving': 'TAKE',
    'received': 'TAKE', 'collect': 'TAKE', 'collecting': 'TAKE', 'collected': 'TAKE',
    'gather': 'TAKE', 'gathering': 'TAKE', 'gathered': 'TAKE', 'acquire': 'TAKE',
    'acquiring': 'TAKE', 'acquired': 'TAKE', 'fetch': 'TAKE', 'fetching': 'TAKE',

    'give': 'GIVE', 'giving': 'GIVE', 'gave': 'GIVE', 'given': 'GIVE',
    'offer': 'GIVE', 'offering': 'GIVE', 'offered': 'GIVE', 'provide': 'GIVE',
    'providing': 'GIVE', 'provided': 'GIVE', 'donate': 'GIVE', 'donating': 'GIVE',
    'donated': 'GIVE', 'deliver': 'GIVE', 'delivering': 'GIVE', 'delivered': 'GIVE',
    'hand': 'GIVE', 'handing': 'GIVE', 'handed': 'GIVE', 'present': 'GIVE',
    'presenting': 'GIVE', 'presented': 'GIVE', 'supply': 'GIVE', 'supplying': 'GIVE',
    'supplied': 'GIVE', 'grant': 'GIVE', 'granting': 'GIVE', 'granted': 'GIVE',

    'say': 'SAY', 'saying': 'SAY', 'said': 'SAY', 'tell': 'SAY',
    'telling': 'SAY', 'told': 'SAY', 'speak': 'SAY', 'speaking': 'SAY',
    'spoke': 'SAY', 'spoken': 'SAY', 'express': 'SAY', 'expressing': 'SAY',
    'mention': 'SAY', 'mentioning': 'SAY', 'mentioned': 'SAY', 'state': 'SAY',
    'stating': 'SAY', 'stated': 'SAY', 'announce': 'SAY', 'announcing': 'SAY',
    'announced': 'SAY', 'declare': 'SAY', 'declaring': 'SAY', 'declared': 'SAY',
    'describe': 'SAY', 'describing': 'SAY', 'described': 'SAY', 'explain': 'SAY',
    'explaining': 'SAY', 'explained': 'SAY', 'discuss': 'SAY', 'discussing': 'SAY',
    'discussed': 'SAY', 'report': 'SAY', 'reporting': 'SAY', 'reported': 'SAY',
    'claim': 'SAY', 'claiming': 'SAY', 'claimed': 'SAY', 'note': 'SAY',
    'noting': 'SAY', 'noted': 'SAY', 'comment': 'SAY', 'commenting': 'SAY',

    'write': 'WRITE', 'writing': 'WRITE', 'wrote': 'WRITE', 'written': 'WRITE',
    'type': 'WRITE', 'typing': 'WRITE', 'typed': 'WRITE', 'compose': 'WRITE',
    'composing': 'WRITE', 'composed': 'WRITE', 'draft': 'WRITE', 'drafting': 'WRITE',
    'drafted': 'WRITE', 'record': 'WRITE', 'recording': 'WRITE', 'recorded': 'WRITE',
    'jot': 'WRITE', 'jotting': 'WRITE', 'script': 'WRITE', 'scripting': 'WRITE',
    'document': 'WRITE', 'documenting': 'WRITE', 'documented': 'WRITE',
    'journal': 'WRITE', 'journaling': 'WRITE', 'journaled': 'WRITE',
    'essay': 'WRITE', 'essays': 'WRITE', 'paragraph': 'WRITE', 'paragraphs': 'WRITE',
    'sentence': 'WRITE', 'sentences': 'WRITE', 'thesis': 'WRITE', 'paper': 'WRITE',
    'papers': 'WRITE', 'chapter': 'WRITE', 'chapters': 'WRITE', 'article': 'WRITE',
    'articles': 'WRITE', 'text': 'WRITE', 'texts': 'WRITE', 'message': 'WRITE',
    'messages': 'WRITE', 'email': 'WRITE', 'emails': 'WRITE', 'letter': 'WRITE',
    'letters': 'WRITE', 'notes': 'WRITE', 'report': 'WRITE', 'reports': 'WRITE',

    'read': 'READ', 'reading': 'READ', 'reads': 'READ',
    'skim': 'READ', 'skimming': 'READ', 'skimmed': 'READ',
    'scan': 'READ', 'scanning': 'READ', 'scanned': 'READ',
    'browse': 'READ', 'browsing': 'READ', 'browsed': 'READ',
    'review': 'READ', 'reviewing': 'READ', 'reviewed': 'READ',
    'book': 'READ', 'books': 'READ', 'textbook': 'READ', 'textbooks': 'READ',
    'passage': 'READ', 'passages': 'READ', 'publication': 'READ',
    'publications': 'READ', 'literature': 'READ', 'journal': 'READ',
    'journals': 'READ',

    'play': 'PLAY', 'playing': 'PLAY', 'played': 'PLAY', 'plays': 'PLAY',
    'game': 'PLAY', 'games': 'PLAY', 'sport': 'PLAY', 'sports': 'PLAY',
    'recreation': 'PLAY', 'recreational': 'PLAY', 'entertainment': 'PLAY',
    'entertain': 'PLAY', 'entertaining': 'PLAY', 'fun': 'PLAY', 'leisure': 'PLAY',
    'hobby': 'PLAY', 'hobbies': 'PLAY', 'compete': 'PLAY', 'competing': 'PLAY',
    'competition': 'PLAY', 'match': 'PLAY', 'tournament': 'PLAY',

    'work': 'WORK', 'working': 'WORK', 'worked': 'WORK', 'works': 'WORK',
    'job': 'WORK', 'jobs': 'WORK', 'employment': 'WORK', 'employed': 'WORK',
    'labor': 'WORK', 'laboring': 'WORK', 'task': 'WORK', 'tasks': 'WORK',
    'effort': 'WORK', 'efforts': 'WORK', 'career': 'WORK', 'profession': 'WORK',
    'vocation': 'WORK', 'duty': 'WORK', 'duties': 'WORK', 'occupation': 'WORK',
    'trade': 'WORK', 'profession': 'WORK', 'operate': 'WORK', 'operating': 'WORK',
    'function': 'WORK', 'functioning': 'WORK', 'perform': 'WORK', 'performing': 'WORK',
    'performed': 'WORK', 'execute': 'WORK', 'executing': 'WORK', 'executed': 'WORK',

    'move': 'MOVE', 'moving': 'MOVE', 'moved': 'MOVE', 'moves': 'MOVE',
    'transfer': 'MOVE', 'transferring': 'MOVE', 'transferred': 'MOVE',
    'shift': 'MOVE', 'shifting': 'MOVE', 'shifted': 'MOVE',
    'travel': 'MOVE', 'traveling': 'MOVE', 'traveled': 'MOVE',
    'relocate': 'MOVE', 'relocating': 'MOVE', 'relocated': 'MOVE',
    'migrate': 'MOVE', 'migrating': 'MOVE', 'migrated': 'MOVE',
    'transport': 'MOVE', 'transporting': 'MOVE', 'transported': 'MOVE',
    'displace': 'MOVE', 'displacing': 'MOVE', 'displaced': 'MOVE',

    'open': 'OPEN', 'opening': 'OPEN', 'opened': 'OPEN', 'opens': 'OPEN',
    'unlock': 'OPEN', 'unlocking': 'OPEN', 'unlocked': 'OPEN',
    'access': 'OPEN', 'accessing': 'OPEN', 'accessed': 'OPEN',
    'launch': 'OPEN', 'launching': 'OPEN', 'launched': 'OPEN',
    'activate': 'OPEN', 'activating': 'OPEN', 'activated': 'OPEN',

    'close': 'CLOSE_ACTION', 'closing': 'CLOSE_ACTION', 'closed': 'CLOSE_ACTION',
    'shut': 'CLOSE_ACTION', 'shutting': 'CLOSE_ACTION',
    'lock': 'CLOSE_ACTION', 'locking': 'CLOSE_ACTION', 'locked': 'CLOSE_ACTION',
    'seal': 'CLOSE_ACTION', 'sealing': 'CLOSE_ACTION', 'sealed': 'CLOSE_ACTION',

    'find': 'FIND', 'finding': 'FIND', 'found': 'FIND', 'finds': 'FIND',
    'discover': 'FIND', 'discovering': 'FIND', 'discovered': 'FIND',
    'locate': 'FIND', 'locating': 'FIND', 'located': 'FIND',
    'search': 'FIND', 'searching': 'FIND', 'searched': 'FIND',
    'detect': 'FIND', 'detecting': 'FIND', 'detected': 'FIND',
    'identify': 'FIND', 'identifying': 'FIND', 'identified': 'FIND',
    'uncover': 'FIND', 'uncovering': 'FIND', 'uncovered': 'FIND',
    'spot': 'FIND', 'spotting': 'FIND', 'spotted': 'FIND',

    'send': 'SEND', 'sending': 'SEND', 'sent': 'SEND', 'sends': 'SEND',
    'transmit': 'SEND', 'transmitting': 'SEND', 'transmitted': 'SEND',
    'forward': 'SEND', 'forwarding': 'SEND', 'forwarded': 'SEND',
    'post': 'SEND', 'posting': 'SEND', 'posted': 'SEND',
    'submit': 'SEND', 'submitting': 'SEND', 'submitted': 'SEND',
    'upload': 'SEND', 'uploading': 'SEND', 'uploaded': 'SEND',
    'share': 'SEND', 'sharing': 'SEND', 'shared': 'SEND',
    'publish': 'SEND', 'publishing': 'SEND', 'published': 'SEND',

    // ── Adjectives ────────────────────────────────────────────────────────────
    'big': 'BIG', 'bigger': 'BIG', 'biggest': 'BIG', 'large': 'BIG',
    'larger': 'BIG', 'largest': 'BIG', 'huge': 'BIG', 'enormous': 'BIG',
    'giant': 'BIG', 'massive': 'BIG', 'vast': 'BIG', 'wide': 'BIG',
    'broad': 'BIG', 'grand': 'BIG', 'substantial': 'BIG', 'immense': 'BIG',
    'tremendous': 'BIG', 'gigantic': 'BIG', 'extensive': 'BIG', 'major': 'BIG',

    'small': 'SMALL', 'smaller': 'SMALL', 'smallest': 'SMALL', 'little': 'SMALL',
    'tiny': 'SMALL', 'miniature': 'SMALL', 'minor': 'SMALL', 'slight': 'SMALL',
    'narrow': 'SMALL', 'limited': 'SMALL', 'compact': 'SMALL', 'brief': 'SMALL',
    'minimal': 'SMALL', 'microscopic': 'SMALL', 'petite': 'SMALL', 'short': 'SMALL',

    'new': 'NEW', 'newest': 'NEW', 'novel': 'NEW', 'recent': 'NEW',
    'latest': 'NEW', 'modern': 'NEW', 'fresh': 'NEW', 'current': 'NEW',
    'contemporary': 'NEW', 'updated': 'NEW', 'upgraded': 'NEW', 'innovative': 'NEW',
    'emerging': 'NEW', 'revolutionary': 'NEW', 'cutting-edge': 'NEW',

    'old': 'OLD', 'older': 'OLD', 'oldest': 'OLD', 'ancient': 'OLD',
    'aged': 'OLD', 'elderly': 'OLD', 'antique': 'OLD', 'vintage': 'OLD',
    'outdated': 'OLD', 'archaic': 'OLD', 'former': 'OLD', 'previous': 'OLD',
    'prior': 'OLD', 'historical': 'OLD', 'classic': 'OLD', 'traditional': 'OLD',
    'obsolete': 'OLD', 'dated': 'OLD',

    'fast': 'FAST', 'faster': 'FAST', 'fastest': 'FAST', 'quick': 'FAST',
    'quicker': 'FAST', 'quickest': 'FAST', 'quickly': 'FAST', 'rapid': 'FAST',
    'rapidly': 'FAST', 'swift': 'FAST', 'swiftly': 'FAST', 'speedy': 'FAST',
    'immediate': 'FAST', 'instantly': 'FAST', 'prompt': 'FAST', 'promptly': 'FAST',
    'hasty': 'FAST', 'brisk': 'FAST', 'efficient': 'FAST', 'immediately': 'FAST',

    'slow': 'SLOW', 'slower': 'SLOW', 'slowest': 'SLOW', 'slowly': 'SLOW',
    'gradual': 'SLOW', 'gradually': 'SLOW', 'leisurely': 'SLOW',
    'unhurried': 'SLOW', 'deliberate': 'SLOW', 'deliberate': 'SLOW',
    'careful': 'SLOW', 'carefully': 'SLOW', 'steady': 'SLOW', 'steadily': 'SLOW',
    'cautious': 'SLOW', 'cautiously': 'SLOW',

    'beautiful': 'BEAUTIFUL', 'prettier': 'BEAUTIFUL', 'prettiest': 'BEAUTIFUL',
    'pretty': 'BEAUTIFUL', 'lovely': 'BEAUTIFUL', 'gorgeous': 'BEAUTIFUL',
    'attractive': 'BEAUTIFUL', 'stunning': 'BEAUTIFUL', 'elegant': 'BEAUTIFUL',
    'handsome': 'BEAUTIFUL', 'magnificent': 'BEAUTIFUL', 'wonderful': 'BEAUTIFUL',
    'splendid': 'BEAUTIFUL', 'glorious': 'BEAUTIFUL', 'charming': 'BEAUTIFUL',
    'graceful': 'BEAUTIFUL', 'radiant': 'BEAUTIFUL', 'exquisite': 'BEAUTIFUL',

    'hot': 'HOT', 'hotter': 'HOT', 'hottest': 'HOT', 'warm': 'HOT',
    'warmer': 'HOT', 'warmest': 'HOT', 'heat': 'HOT', 'heated': 'HOT',
    'burning': 'HOT', 'boiling': 'HOT', 'steaming': 'HOT', 'tropical': 'HOT',
    'summer': 'HOT', 'blazing': 'HOT', 'scorching': 'HOT', 'sweltering': 'HOT',

    'cold': 'COLD', 'colder': 'COLD', 'coldest': 'COLD', 'cool': 'COLD',
    'cooler': 'COLD', 'coolest': 'COLD', 'icy': 'COLD', 'frozen': 'COLD',
    'freezing': 'COLD', 'chilly': 'COLD', 'frigid': 'COLD', 'frosty': 'COLD',
    'arctic': 'COLD', 'bitter': 'COLD',

    'important': 'IMPORTANT', 'critical': 'IMPORTANT', 'essential': 'IMPORTANT',
    'vital': 'IMPORTANT', 'crucial': 'IMPORTANT', 'key': 'IMPORTANT',
    'significant': 'IMPORTANT', 'necessary': 'IMPORTANT', 'priority': 'IMPORTANT',
    'urgent': 'IMPORTANT', 'fundamental': 'IMPORTANT', 'primary': 'IMPORTANT',
    'central': 'IMPORTANT', 'core': 'IMPORTANT', 'main': 'IMPORTANT',
    'principal': 'IMPORTANT', 'paramount': 'IMPORTANT', 'indispensable': 'IMPORTANT',

    'correct': 'CORRECT', 'right': 'CORRECT', 'accurate': 'CORRECT',
    'exact': 'CORRECT', 'precise': 'CORRECT', 'true': 'CORRECT',
    'proper': 'CORRECT', 'valid': 'CORRECT', 'appropriate': 'CORRECT',
    'suitable': 'CORRECT', 'perfect': 'CORRECT', 'ideal': 'CORRECT',

    'wrong': 'WRONG', 'incorrect': 'WRONG', 'inaccurate': 'WRONG',
    'mistaken': 'WRONG', 'false': 'WRONG', 'error': 'WRONG', 'mistake': 'WRONG',
    'fault': 'WRONG', 'invalid': 'WRONG', 'inappropriate': 'WRONG',
    'improper': 'WRONG', 'flawed': 'WRONG', 'erroneous': 'WRONG',

    'happy': 'HAPPY', 'happier': 'HAPPY', 'happiest': 'HAPPY', 'joyful': 'HAPPY',
    'joyous': 'HAPPY', 'pleased': 'HAPPY', 'delighted': 'HAPPY', 'glad': 'HAPPY',
    'cheerful': 'HAPPY', 'content': 'HAPPY', 'excited': 'HAPPY', 'thrilled': 'HAPPY',
    'elated': 'HAPPY', 'ecstatic': 'HAPPY', 'overjoyed': 'HAPPY', 'blissful': 'HAPPY',
    'jubilant': 'HAPPY', 'upbeat': 'HAPPY', 'enthusiastic': 'HAPPY',

    'sad': 'SAD', 'sadder': 'SAD', 'saddest': 'SAD', 'unhappy': 'SAD',
    'upset': 'SAD', 'sorrowful': 'SAD', 'depressed': 'SAD', 'disappointed': 'SAD',
    'gloomy': 'SAD', 'miserable': 'SAD', 'heartbroken': 'SAD', 'dejected': 'SAD',
    'downcast': 'SAD', 'melancholy': 'SAD', 'grief': 'SAD', 'grieving': 'SAD',
    'distressed': 'SAD', 'troubled': 'SAD',

    // ── Colors ────────────────────────────────────────────────────────────────
    'red': 'RED', 'crimson': 'RED', 'scarlet': 'RED', 'maroon': 'RED',
    'ruby': 'RED', 'cherry': 'RED', 'rose': 'RED',

    'blue': 'BLUE', 'navy': 'BLUE', 'indigo': 'BLUE', 'cobalt': 'BLUE',
    'azure': 'BLUE', 'sapphire': 'BLUE', 'royal blue': 'BLUE',

    'green': 'GREEN', 'lime': 'GREEN', 'olive': 'GREEN', 'emerald': 'GREEN',
    'forest': 'GREEN', 'jade': 'GREEN', 'mint': 'GREEN',

    'yellow': 'YELLOW', 'gold': 'YELLOW', 'golden': 'YELLOW', 'amber': 'YELLOW',
    'lemon': 'YELLOW', 'cream': 'YELLOW',

    'white': 'WHITE', 'ivory': 'WHITE', 'snow': 'WHITE', 'pale': 'WHITE',
    'silver': 'WHITE', 'platinum': 'WHITE',

    'black': 'BLACK', 'dark': 'BLACK', 'ebony': 'BLACK', 'jet': 'BLACK',
    'onyx': 'BLACK', 'charcoal': 'BLACK',

    'orange': 'ORANGE', 'tangerine': 'ORANGE', 'coral': 'ORANGE', 'peach': 'ORANGE',

    'purple': 'PURPLE', 'violet': 'PURPLE', 'lavender': 'PURPLE',
    'magenta': 'PURPLE', 'lilac': 'PURPLE', 'mauve': 'PURPLE',

    'brown': 'BROWN', 'tan': 'BROWN', 'beige': 'BROWN', 'khaki': 'BROWN',
    'chocolate': 'BROWN', 'mocha': 'BROWN', 'caramel': 'BROWN',

    'pink': 'RED',

    'color': 'RED', 'colour': 'RED', 'colored': 'RED', 'coloured': 'RED',

    // ── Family ────────────────────────────────────────────────────────────────
    'mother': 'MOTHER', 'mom': 'MOTHER', 'mommy': 'MOTHER', 'mama': 'MOTHER',
    'mum': 'MOTHER', 'ma': 'MOTHER',

    'father': 'FATHER', 'dad': 'FATHER', 'daddy': 'FATHER', 'papa': 'FATHER',
    'pop': 'FATHER', 'pa': 'FATHER',

    'sister': 'SISTER', 'sis': 'SISTER',

    'brother': 'BROTHER', 'bro': 'BROTHER',

    'baby': 'BABY', 'babies': 'BABY', 'infant': 'BABY', 'newborn': 'BABY',
    'toddler': 'BABY',

    'family': 'FAMILY', 'families': 'FAMILY', 'household': 'FAMILY',
    'relatives': 'FAMILY', 'relations': 'FAMILY', 'kin': 'FAMILY',
    'kinship': 'FAMILY', 'ancestry': 'FAMILY',

    'person': 'PERSON', 'people': 'PERSON', 'individual': 'PERSON',
    'human': 'PERSON', 'someone': 'PERSON', 'somebody': 'PERSON',
    'anyone': 'PERSON', 'everybody': 'PERSON', 'everyone': 'PERSON',
    'citizen': 'PERSON', 'member': 'PERSON', 'participant': 'PERSON',
    'user': 'PERSON', 'student': 'PERSON', 'students': 'PERSON',
    'teacher': 'PERSON', 'teachers': 'PERSON', 'professor': 'PERSON',
    'professors': 'PERSON', 'instructor': 'PERSON', 'speaker': 'PERSON',

    'friend': 'FRIEND', 'friends': 'FRIEND', 'buddy': 'FRIEND', 'pal': 'FRIEND',
    'companion': 'FRIEND', 'colleague': 'FRIEND', 'mate': 'FRIEND',
    'partner': 'FRIEND', 'associate': 'FRIEND', 'acquaintance': 'FRIEND',
    'classmate': 'FRIEND', 'classmates': 'FRIEND', 'teammate': 'FRIEND',

    'children': 'CHILDREN', 'child': 'CHILDREN', 'kid': 'CHILDREN',
    'kids': 'CHILDREN', 'youth': 'CHILDREN', 'young': 'CHILDREN',
    'youngster': 'CHILDREN', 'teenager': 'CHILDREN', 'teen': 'CHILDREN',

    // ── Food & Drink ──────────────────────────────────────────────────────────
    'eat': 'EAT', 'eating': 'EAT', 'ate': 'EAT', 'eaten': 'EAT',
    'meal': 'EAT', 'meals': 'EAT', 'food': 'EAT', 'foods': 'EAT',
    'dine': 'EAT', 'dining': 'EAT', 'dined': 'EAT', 'snack': 'EAT',
    'snacking': 'EAT', 'snacked': 'EAT', 'consume': 'EAT', 'consuming': 'EAT',
    'consumed': 'EAT', 'breakfast': 'EAT', 'lunch': 'EAT', 'dinner': 'EAT',
    'feast': 'EAT', 'chew': 'EAT', 'chewing': 'EAT', 'bite': 'EAT',
    'taste': 'EAT', 'tasting': 'EAT', 'tasted': 'EAT', 'nutrition': 'EAT',
    'diet': 'EAT', 'cuisine': 'EAT', 'restaurant': 'EAT', 'cafeteria': 'EAT',

    'drink': 'DRINK', 'drinking': 'DRINK', 'drank': 'DRINK', 'drunk': 'DRINK',
    'sip': 'DRINK', 'sipping': 'DRINK', 'sipped': 'DRINK', 'swallow': 'DRINK',
    'swallowing': 'DRINK', 'swallowed': 'DRINK', 'beverage': 'DRINK',
    'beverages': 'DRINK', 'juice': 'DRINK', 'coffee': 'DRINK', 'tea': 'DRINK',
    'soda': 'DRINK', 'milk': 'DRINK', 'smoothie': 'DRINK',

    'hungry': 'HUNGRY', 'hunger': 'HUNGRY', 'starving': 'HUNGRY',
    'starved': 'HUNGRY', 'appetite': 'HUNGRY', 'craving': 'HUNGRY',
    'crave': 'HUNGRY', 'thirsty': 'HUNGRY', 'thirst': 'HUNGRY',
    'famished': 'HUNGRY', 'desire': 'HUNGRY',

    'water': 'WATER', 'liquid': 'WATER', 'fluid': 'WATER', 'aqua': 'WATER',
    'hydrate': 'WATER', 'hydration': 'WATER',

    'cook': 'COOK', 'cooking': 'COOK', 'cooked': 'COOK', 'cooks': 'COOK',
    'bake': 'COOK', 'baking': 'COOK', 'baked': 'COOK', 'prepare': 'COOK',
    'preparing': 'COOK', 'prepared': 'COOK', 'kitchen': 'COOK', 'chef': 'COOK',
    'recipe': 'COOK', 'recipes': 'COOK', 'fry': 'COOK', 'frying': 'COOK',
    'grill': 'COOK', 'grilling': 'COOK', 'roast': 'COOK', 'roasting': 'COOK',

    // ── Body ──────────────────────────────────────────────────────────────────
    'head': 'HEAD', 'heads': 'HEAD', 'skull': 'HEAD', 'scalp': 'HEAD',
    'brain': 'HEAD', 'forehead': 'HEAD', 'temple': 'HEAD', 'crown': 'HEAD',
    'face': 'HEAD', 'facial': 'HEAD', 'mind': 'HEAD',

    'hand': 'HAND', 'hands': 'HAND', 'palm': 'HAND', 'palms': 'HAND',
    'finger': 'HAND', 'fingers': 'HAND', 'thumb': 'HAND', 'wrist': 'HAND',
    'fist': 'HAND',

    'eye': 'EYE', 'eyes': 'EYE', 'sight': 'EYE', 'vision': 'EYE',
    'visual': 'EYE', 'stare': 'EYE', 'gaze': 'EYE', 'glance': 'EYE',
    'look': 'EYE', 'looking': 'EYE', 'looked': 'EYE', 'watch': 'EYE',
    'watching': 'EYE', 'watched': 'EYE', 'observe': 'EYE', 'observing': 'EYE',

    'ear': 'EAR', 'ears': 'EAR', 'auditory': 'EAR', 'hearing': 'EAR',
    'listen': 'EAR', 'listening': 'EAR', 'listened': 'EAR', 'sound': 'EAR',
    'audio': 'EAR',

    'nose': 'NOSE', 'noses': 'NOSE', 'smell': 'NOSE', 'smelling': 'NOSE',
    'sniff': 'NOSE', 'sniffing': 'NOSE', 'scent': 'NOSE', 'aroma': 'NOSE',

    // ── Health ────────────────────────────────────────────────────────────────
    'sick': 'SICK', 'sicker': 'SICK', 'ill': 'SICK', 'illness': 'SICK',
    'disease': 'SICK', 'unwell': 'SICK', 'unhealthy': 'SICK', 'fever': 'SICK',
    'infection': 'SICK', 'infected': 'SICK', 'symptom': 'SICK', 'symptoms': 'SICK',
    'condition': 'SICK', 'diagnosis': 'SICK', 'disorder': 'SICK', 'virus': 'SICK',
    'bacterial': 'SICK', 'nausea': 'SICK', 'nauseous': 'SICK', 'vomit': 'SICK',

    'pain': 'PAIN', 'painful': 'PAIN', 'hurt': 'PAIN', 'hurting': 'PAIN',
    'hurts': 'PAIN', 'ache': 'PAIN', 'aching': 'PAIN', 'aches': 'PAIN',
    'sore': 'PAIN', 'soreness': 'PAIN', 'injury': 'PAIN', 'injured': 'PAIN',
    'wound': 'PAIN', 'wounded': 'PAIN', 'damage': 'PAIN', 'damaged': 'PAIN',
    'broken': 'PAIN', 'sprain': 'PAIN', 'sprained': 'PAIN', 'fracture': 'PAIN',

    'doctor': 'DOCTOR', 'doctors': 'DOCTOR', 'physician': 'DOCTOR',
    'physicians': 'DOCTOR', 'medical': 'DOCTOR', 'medicine': 'DOCTOR',
    'nurse': 'DOCTOR', 'nurses': 'DOCTOR', 'hospital': 'DOCTOR',
    'clinic': 'DOCTOR', 'healthcare': 'DOCTOR', 'treatment': 'DOCTOR',
    'therapist': 'DOCTOR', 'therapy': 'DOCTOR', 'surgery': 'DOCTOR',
    'prescription': 'DOCTOR', 'medication': 'DOCTOR',

    'better': 'BETTER', 'improve': 'BETTER', 'improving': 'BETTER',
    'improved': 'BETTER', 'recover': 'BETTER', 'recovering': 'BETTER',
    'recovered': 'BETTER', 'heal': 'BETTER', 'healing': 'BETTER',
    'healed': 'BETTER', 'progress': 'BETTER', 'progressing': 'BETTER',
    'wellness': 'BETTER', 'recovery': 'BETTER', 'restoration': 'BETTER',
    'enhanced': 'BETTER', 'upgrade': 'BETTER',

    'help': 'HELP', 'helping': 'HELP', 'helped': 'HELP', 'helps': 'HELP',
    'assist': 'HELP', 'assisting': 'HELP', 'assisted': 'HELP',
    'assistance': 'HELP', 'support': 'HELP', 'supporting': 'HELP',
    'supported': 'HELP', 'aid': 'HELP', 'aiding': 'HELP', 'aided': 'HELP',
    'cooperate': 'HELP', 'cooperating': 'HELP', 'cooperation': 'HELP',
    'collaborate': 'HELP', 'collaborating': 'HELP', 'collaboration': 'HELP',
    'contribute': 'HELP', 'contributing': 'HELP', 'contributed': 'HELP',
    'rescue': 'HELP', 'rescuing': 'HELP', 'rescued': 'HELP',

    // ── Directions ────────────────────────────────────────────────────────────
    'up': 'UP', 'upper': 'UP', 'above': 'UP', 'over': 'UP', 'high': 'UP',
    'higher': 'UP', 'highest': 'UP', 'upward': 'UP', 'upwards': 'UP',
    'upstairs': 'UP', 'raise': 'UP', 'raised': 'UP', 'top': 'UP',
    'overhead': 'UP', 'ascend': 'UP', 'ascending': 'UP',

    'down': 'DOWN', 'below': 'DOWN', 'lower': 'DOWN', 'beneath': 'DOWN',
    'under': 'DOWN', 'underneath': 'DOWN', 'downward': 'DOWN',
    'downwards': 'DOWN', 'downstairs': 'DOWN', 'bottom': 'DOWN',
    'descend': 'DOWN', 'descending': 'DOWN',

    'here': 'HERE', 'this place': 'HERE', 'nearby': 'HERE', 'close by': 'HERE',
    'present': 'HERE', 'local': 'HERE',

    'there': 'THERE', 'that place': 'THERE', 'over there': 'THERE',
    'yonder': 'THERE', 'elsewhere': 'THERE', 'away': 'THERE',

    'inside': 'INSIDE', 'within': 'INSIDE', 'interior': 'INSIDE',
    'inner': 'INSIDE', 'indoor': 'INSIDE', 'indoors': 'INSIDE',
    'into': 'INSIDE', 'internal': 'INSIDE',

    'outside': 'OUTSIDE', 'exterior': 'OUTSIDE', 'outer': 'OUTSIDE',
    'outdoor': 'OUTSIDE', 'outdoors': 'OUTSIDE', 'out': 'OUTSIDE',
    'external': 'OUTSIDE',

    // ── Extended Time ─────────────────────────────────────────────────────────
    'hour': 'HOUR', 'hours': 'HOUR', 'hourly': 'HOUR',

    'minute': 'MINUTE', 'minutes': 'MINUTE', 'moment': 'MINUTE',
    'moments': 'MINUTE', 'second': 'MINUTE', 'seconds': 'MINUTE',
    'instant': 'MINUTE', 'briefly': 'MINUTE',

    'year': 'YEAR', 'years': 'YEAR', 'annual': 'YEAR', 'annually': 'YEAR',
    'yearly': 'YEAR', 'decade': 'YEAR', 'century': 'YEAR',

    'always': 'ALWAYS', 'every time': 'ALWAYS', 'constantly': 'ALWAYS',
    'continually': 'ALWAYS', 'forever': 'ALWAYS', 'perpetually': 'ALWAYS',
    'regularly': 'ALWAYS', 'routinely': 'ALWAYS', 'consistently': 'ALWAYS',
    'eternally': 'ALWAYS', 'continuous': 'ALWAYS', 'nonstop': 'ALWAYS',
    'throughout': 'ALWAYS',

    'never': 'NEVER', 'not ever': 'NEVER', 'at no time': 'NEVER',
    'not once': 'NEVER', 'refuse': 'NEVER',

    'before': 'BEFORE', 'prior to': 'BEFORE', 'previously': 'BEFORE',
    'earlier': 'BEFORE', 'ago': 'BEFORE', 'past': 'BEFORE',
    'preceding': 'BEFORE', 'formerly': 'BEFORE', 'already': 'BEFORE',
    'previously': 'BEFORE', 'once': 'BEFORE', 'previously': 'BEFORE',

    'after': 'AFTER', 'afterward': 'AFTER', 'afterwards': 'AFTER',
    'following': 'AFTER', 'subsequent': 'AFTER', 'thereafter': 'AFTER',
    'eventually': 'AFTER', 'ultimately': 'AFTER',

    'during': 'DURING', 'while': 'DURING', 'throughout': 'DURING',
    'amid': 'DURING', 'amidst': 'DURING', 'simultaneously': 'DURING',
    'at the same time': 'DURING', 'meanwhile': 'DURING', 'concurrently': 'DURING',

    // ── Days ──────────────────────────────────────────────────────────────────
    'monday': 'MONDAY', 'mon': 'MONDAY',
    'tuesday': 'TUESDAY', 'tue': 'TUESDAY', 'tues': 'TUESDAY',
    'wednesday': 'WEDNESDAY', 'wed': 'WEDNESDAY',
    'thursday': 'THURSDAY', 'thu': 'THURSDAY', 'thurs': 'THURSDAY',
    'friday': 'FRIDAY', 'fri': 'FRIDAY',
    'saturday': 'SATURDAY', 'sat': 'SATURDAY', 'weekend': 'SATURDAY',
    'sunday': 'SUNDAY', 'sun': 'SUNDAY',

    // ── Weather ───────────────────────────────────────────────────────────────
    'rain': 'RAIN', 'raining': 'RAIN', 'rained': 'RAIN', 'rainy': 'RAIN',
    'rainfall': 'RAIN', 'shower': 'RAIN', 'showers': 'RAIN', 'drizzle': 'RAIN',
    'downpour': 'RAIN', 'storm': 'RAIN', 'stormy': 'RAIN', 'thunderstorm': 'RAIN',
    'precipitation': 'RAIN', 'flood': 'RAIN', 'flooding': 'RAIN',

    'sun': 'SUN', 'sunny': 'SUN', 'sunshine': 'SUN', 'sunlight': 'SUN',
    'solar': 'SUN', 'bright': 'SUN', 'daylight': 'SUN', 'light': 'SUN',
    'clear': 'SUN', 'cloudless': 'SUN',

    'wind': 'WIND', 'windy': 'WIND', 'breeze': 'WIND', 'breezy': 'WIND',
    'gust': 'WIND', 'gusty': 'WIND', 'airflow': 'WIND', 'draft': 'WIND',
    'hurricane': 'WIND', 'tornado': 'WIND', 'typhoon': 'WIND',

    'snow': 'SNOW', 'snowy': 'SNOW', 'snowfall': 'SNOW', 'snowing': 'SNOW',
    'blizzard': 'SNOW', 'ice': 'SNOW', 'icy': 'SNOW', 'frost': 'SNOW',
    'frosty': 'SNOW', 'sleet': 'SNOW', 'hail': 'SNOW', 'winter': 'SNOW',
    'wintry': 'SNOW',

    'weather': 'SUN', 'climate': 'SUN', 'temperature': 'HOT',
    'forecast': 'SUN', 'atmosphere': 'SUN', 'humidity': 'RAIN',

    // ── Transport ─────────────────────────────────────────────────────────────
    'car': 'CAR', 'cars': 'CAR', 'vehicle': 'CAR', 'vehicles': 'CAR',
    'automobile': 'CAR', 'drive': 'CAR', 'driving': 'CAR', 'drove': 'CAR',
    'driven': 'CAR', 'auto': 'CAR', 'truck': 'CAR', 'trucks': 'CAR',
    'van': 'CAR', 'suv': 'CAR', 'motorcycle': 'CAR', 'taxi': 'CAR',
    'ride': 'CAR', 'riding': 'CAR', 'rode': 'CAR', 'transport': 'CAR',

    'walk': 'WALK', 'walking': 'WALK', 'walked': 'WALK', 'walks': 'WALK',
    'stroll': 'WALK', 'strolling': 'WALK', 'strolled': 'WALK',
    'hike': 'WALK', 'hiking': 'WALK', 'hiked': 'WALK',
    'step': 'WALK', 'steps': 'WALK', 'pace': 'WALK', 'march': 'WALK',
    'marching': 'WALK', 'jog': 'WALK', 'jogging': 'WALK', 'run': 'WALK',
    'running': 'WALK', 'sprint': 'WALK', 'sprinting': 'WALK',

    'bus': 'BUS', 'buses': 'BUS', 'transit': 'BUS', 'public transit': 'BUS',
    'shuttle': 'BUS', 'coach': 'BUS', 'commute': 'BUS', 'commuting': 'BUS',
    'commuted': 'BUS',

    'train': 'TRAIN', 'trains': 'TRAIN', 'subway': 'TRAIN', 'metro': 'TRAIN',
    'rail': 'TRAIN', 'railway': 'TRAIN', 'tram': 'TRAIN',

    'home': 'HOME', 'house': 'HOME', 'apartment': 'HOME', 'residence': 'HOME',
    'live': 'HOME', 'living': 'HOME', 'lived': 'HOME', 'dwelling': 'HOME',
    'address': 'HOME', 'flat': 'HOME', 'condo': 'HOME', 'dorm': 'HOME',
    'dormitory': 'HOME',

    'school': 'SCHOOL', 'schools': 'SCHOOL', 'college': 'SCHOOL',
    'university': 'SCHOOL', 'campus': 'SCHOOL', 'academy': 'SCHOOL',
    'institution': 'SCHOOL', 'classroom': 'SCHOOL', 'class': 'SCHOOL',
    'classes': 'SCHOOL', 'course': 'SCHOOL', 'courses': 'SCHOOL',
    'semester': 'SCHOOL', 'curriculum': 'SCHOOL', 'education': 'SCHOOL',
    'educational': 'SCHOOL', 'academic': 'SCHOOL', 'academics': 'SCHOOL',
    'study hall': 'SCHOOL', 'lecture hall': 'SCHOOL', 'lecture': 'SCHOOL',
    'lectures': 'SCHOOL', 'lesson': 'SCHOOL', 'lessons': 'SCHOOL',
    'subject': 'SCHOOL', 'subjects': 'SCHOOL', 'topic': 'SCHOOL',
    'topics': 'SCHOOL', 'syllabus': 'SCHOOL', 'degree': 'SCHOOL',
    'diploma': 'SCHOOL', 'certificate': 'SCHOOL', 'grade': 'SCHOOL',
    'grades': 'SCHOOL', 'exam': 'SCHOOL', 'exams': 'SCHOOL',
    'test': 'SCHOOL', 'tests': 'SCHOOL', 'quiz': 'SCHOOL', 'quizzes': 'SCHOOL',
    'assignment': 'SCHOOL', 'assignments': 'SCHOOL', 'homework': 'SCHOOL',
    'exercise': 'SCHOOL', 'exercises': 'SCHOOL',

    // ── Money ─────────────────────────────────────────────────────────────────
    'money': 'MONEY', 'cash': 'MONEY', 'currency': 'MONEY', 'funds': 'MONEY',
    'finances': 'MONEY', 'financial': 'MONEY', 'capital': 'MONEY',
    'budget': 'MONEY', 'cost': 'MONEY', 'costs': 'MONEY', 'price': 'MONEY',
    'prices': 'MONEY', 'charge': 'MONEY', 'charges': 'MONEY', 'fee': 'MONEY',
    'fees': 'MONEY', 'rate': 'MONEY', 'rates': 'MONEY', 'amount': 'MONEY',
    'amounts': 'MONEY', 'bill': 'MONEY', 'bills': 'MONEY', 'dollar': 'MONEY',
    'dollars': 'MONEY', 'euro': 'MONEY', 'pound': 'MONEY', 'coin': 'MONEY',
    'coins': 'MONEY', 'wallet': 'MONEY', 'bank': 'MONEY', 'banking': 'MONEY',
    'account': 'MONEY', 'savings': 'MONEY', 'salary': 'MONEY', 'wage': 'MONEY',
    'wages': 'MONEY', 'income': 'MONEY', 'revenue': 'MONEY', 'profit': 'MONEY',
    'loss': 'MONEY', 'debt': 'MONEY', 'loan': 'MONEY', 'credit': 'MONEY',

    'pay': 'PAY', 'paying': 'PAY', 'paid': 'PAY', 'pays': 'PAY',
    'payment': 'PAY', 'payments': 'PAY', 'purchase': 'PAY', 'purchasing': 'PAY',
    'purchased': 'PAY', 'buy': 'PAY', 'buying': 'PAY', 'bought': 'PAY',
    'spend': 'PAY', 'spending': 'PAY', 'spent': 'PAY', 'invest': 'PAY',
    'investing': 'PAY', 'invested': 'PAY', 'investment': 'PAY',
    'fund': 'PAY', 'funding': 'PAY', 'funded': 'PAY',

    'free': 'FREE', 'freedom': 'FREE', 'liberty': 'FREE', 'liberation': 'FREE',
    'release': 'FREE', 'releasing': 'FREE', 'released': 'FREE',
    'complimentary': 'FREE', 'no cost': 'FREE', 'at no charge': 'FREE',
    'independent': 'FREE', 'independence': 'FREE',

    'expensive': 'EXPENSIVE', 'costly': 'EXPENSIVE', 'pricey': 'EXPENSIVE',
    'high-priced': 'EXPENSIVE', 'unaffordable': 'EXPENSIVE',
    'overpriced': 'EXPENSIVE', 'luxury': 'EXPENSIVE', 'premium': 'EXPENSIVE',
    'dear': 'EXPENSIVE',

    // ── Existing signs — expanded synonyms ───────────────────────────────────

    // Greetings — more synonyms
    'howdy': 'HELLO', 'salutation': 'HELLO', 'greeting': 'HELLO',
    'hiya': 'HELLO', 'sup': 'HELLO', "what's up": 'HELLO',

    // Emotions (existing LOVE, etc.)
    'love': 'LOVE', 'loving': 'LOVE', 'loved': 'LOVE', 'loves': 'LOVE',
    'adore': 'LOVE', 'adoring': 'LOVE', 'cherish': 'LOVE', 'cherishing': 'LOVE',
    'affection': 'LOVE', 'affectionate': 'LOVE', 'devoted': 'LOVE',
    'devotion': 'LOVE', 'passion': 'LOVE', 'passionate': 'LOVE',
    'romance': 'LOVE', 'romantic': 'LOVE', 'care': 'LOVE', 'caring': 'LOVE',
    'cared': 'LOVE', 'treasure': 'LOVE', 'treasuring': 'LOVE',

    // Learning (LEARN, KNOW, THINK existing)
    'learn': 'LEARN', 'learning': 'LEARN', 'learned': 'LEARN', 'learns': 'LEARN',
    'study': 'STUDY', 'studying': 'STUDY', 'studied': 'STUDY', 'studies': 'STUDY',
    'know': 'KNOW', 'knowing': 'KNOW', 'knew': 'KNOW', 'known': 'KNOW',
    'knows': 'KNOW', 'knowledge': 'KNOW', 'knowledgeable': 'KNOW',
    'aware': 'KNOW', 'awareness': 'KNOW', 'familiar': 'KNOW', 'skill': 'KNOW',
    'skills': 'KNOW', 'ability': 'KNOW', 'abilities': 'KNOW', 'expertise': 'KNOW',
    'competent': 'KNOW', 'competence': 'KNOW', 'understand': 'KNOW',
    'understanding': 'KNOW', 'understood': 'KNOW', 'comprehend': 'KNOW',
    'comprehension': 'KNOW', 'grasp': 'KNOW', 'grasping': 'KNOW',

    'think': 'THINK', 'thinking': 'THINK', 'thought': 'THINK', 'thinks': 'THINK',
    'idea': 'THINK', 'ideas': 'THINK', 'concept': 'THINK', 'concepts': 'THINK',
    'opinion': 'THINK', 'opinions': 'THINK', 'belief': 'THINK', 'beliefs': 'THINK',
    'perspective': 'THINK', 'consider': 'THINK', 'considering': 'THINK',
    'considered': 'THINK', 'analyze': 'THINK', 'analyzing': 'THINK',
    'analysis': 'THINK', 'reflect': 'THINK', 'reflecting': 'THINK',
    'reflection': 'THINK', 'wonder': 'THINK', 'wondering': 'THINK',
    'reason': 'THINK', 'reasoning': 'THINK', 'assume': 'THINK',
    'assuming': 'THINK', 'assumption': 'THINK', 'hypothesis': 'THINK',
    'theory': 'THINK', 'theoretical': 'THINK', 'imagine': 'THINK',
    'imagining': 'THINK', 'imagination': 'THINK', 'creative': 'THINK',
    'creativity': 'THINK', 'brainstorm': 'THINK', 'brainstorming': 'THINK',

    // Wanting/needing
    'want': 'WANT', 'wanting': 'WANT', 'wanted': 'WANT', 'wants': 'WANT',
    'wish': 'WANT', 'wishing': 'WANT', 'wished': 'WANT', 'hope': 'WANT',
    'hoping': 'WANT', 'hoped': 'WANT', 'aim': 'WANT', 'aiming': 'WANT',
    'goal': 'WANT', 'goals': 'WANT', 'aspire': 'WANT', 'aspiring': 'WANT',
    'aspiration': 'WANT', 'dream': 'WANT', 'dreaming': 'WANT', 'dreamed': 'WANT',
    'intend': 'WANT', 'intending': 'WANT', 'intention': 'WANT',
    'plan': 'WANT', 'planning': 'WANT', 'planned': 'WANT',

    'need': 'NEED', 'needing': 'NEED', 'needed': 'NEED', 'needs': 'NEED',
    'require': 'NEED', 'requiring': 'NEED', 'required': 'NEED',
    'requires': 'NEED', 'demand': 'NEED', 'demanding': 'NEED',
    'demanded': 'NEED', 'request': 'NEED', 'requesting': 'NEED',
    'requested': 'NEED', 'essential': 'NEED', 'must': 'NEED',

    // Communication
    'call': 'CALL', 'calling': 'CALL', 'called': 'CALL', 'calls': 'CALL',
    'phone': 'CALL', 'phoning': 'CALL', 'contact': 'CALL', 'contacting': 'CALL',
    'contacted': 'CALL', 'reach': 'CALL', 'reaching': 'CALL', 'dial': 'CALL',
    'text': 'CALL', 'texting': 'CALL', 'textted': 'CALL', 'chat': 'CALL',
    'chatting': 'CALL', 'chatted': 'CALL', 'notify': 'CALL', 'notifying': 'CALL',
    'notification': 'CALL', 'alert': 'CALL', 'alerting': 'CALL',
    'communicate': 'CALL', 'communicating': 'CALL', 'communication': 'CALL',

    'ask': 'ASK', 'asking': 'ASK', 'asked': 'ASK', 'asks': 'ASK',
    'question': 'ASK', 'questioning': 'ASK', 'questioned': 'ASK',
    'inquire': 'ASK', 'inquiring': 'ASK', 'inquiry': 'ASK',
    'query': 'ASK', 'querying': 'ASK', 'interview': 'ASK',
    'surveying': 'ASK', 'survey': 'ASK', 'poll': 'ASK', 'polling': 'ASK',

    'answer': 'ANSWER', 'answering': 'ANSWER', 'answered': 'ANSWER',
    'answers': 'ANSWER', 'respond': 'ANSWER', 'responding': 'ANSWER',
    'responded': 'ANSWER', 'response': 'ANSWER', 'reply': 'ANSWER',
    'replying': 'ANSWER', 'replied': 'ANSWER', 'solution': 'ANSWER',
    'solve': 'ANSWER', 'solving': 'ANSWER', 'solved': 'ANSWER',
    'result': 'ANSWER', 'results': 'ANSWER', 'outcome': 'ANSWER',
    'conclusion': 'ANSWER', 'conclude': 'ANSWER',

    // Meeting/gathering
    'meet': 'MEET', 'meeting': 'MEET', 'met': 'MEET', 'meets': 'MEET',
    'encounter': 'MEET', 'encountering': 'MEET', 'encountered': 'MEET',
    'join': 'MEET', 'joining': 'MEET', 'joined': 'MEET', 'attend': 'MEET',
    'attending': 'MEET', 'attended': 'MEET', 'attendance': 'MEET',
    'participate': 'MEET', 'participating': 'MEET', 'participation': 'MEET',
    'conference': 'MEET', 'seminar': 'MEET', 'workshop': 'MEET',

    // Technology
    'computer': 'WORK', 'computers': 'WORK', 'laptop': 'WORK', 'technology': 'WORK',
    'tech': 'WORK', 'software': 'WRITE', 'program': 'WRITE',
    'programming': 'WRITE', 'code': 'WRITE', 'coding': 'WRITE',
    'algorithm': 'THINK', 'system': 'WORK', 'systems': 'WORK',
    'digital': 'WORK', 'online': 'WORK', 'internet': 'WORK',
    'network': 'WORK', 'database': 'WORK', 'application': 'WORK',
    'app': 'WORK', 'apps': 'WORK', 'device': 'WORK', 'devices': 'WORK',
    'screen': 'EYE', 'display': 'EYE', 'monitor': 'EYE',
    'keyboard': 'WRITE', 'mouse': 'WORK', 'click': 'WORK', 'clicking': 'WORK',
    'download': 'TAKE', 'downloading': 'TAKE', 'install': 'MAKE',
    'installing': 'MAKE', 'update': 'NEW', 'updating': 'NEW', 'updated': 'NEW',

    // Science/academic
    'science': 'THINK', 'scientific': 'THINK', 'research': 'FIND',
    'researching': 'FIND', 'researched': 'FIND', 'experiment': 'FIND',
    'experimenting': 'FIND', 'experimented': 'FIND', 'data': 'KNOW',
    'information': 'KNOW', 'fact': 'KNOW', 'facts': 'KNOW',
    'evidence': 'KNOW', 'proof': 'KNOW', 'study': 'FIND', 'studies': 'FIND',
    'methodology': 'THINK', 'method': 'THINK', 'methods': 'THINK',
    'approach': 'THINK', 'strategy': 'THINK', 'strategies': 'THINK',
    'process': 'WORK', 'processes': 'WORK', 'procedure': 'WORK',
    'procedures': 'WORK', 'protocol': 'WORK',

    // Verbs of motion / continuation
    'begin': 'BEGIN', 'beginning': 'BEGIN', 'began': 'BEGIN', 'begun': 'BEGIN',
    'start': 'BEGIN', 'starting': 'BEGIN', 'started': 'BEGIN',
    'initiate': 'BEGIN', 'initiating': 'BEGIN', 'initiated': 'BEGIN',
    'launch': 'BEGIN', 'launching': 'BEGIN', 'launched': 'BEGIN',
    'commence': 'BEGIN', 'commencing': 'BEGIN', 'commenced': 'BEGIN',

    'finish': 'FINISH', 'finishing': 'FINISH', 'finished': 'FINISH',
    'complete': 'FINISH', 'completing': 'FINISH', 'completed': 'FINISH',
    'finalize': 'FINISH', 'finalizing': 'FINISH', 'finalized': 'FINISH',
    'accomplish': 'FINISH', 'accomplishing': 'FINISH', 'accomplished': 'FINISH',
    'achieve': 'FINISH', 'achieving': 'FINISH', 'achieved': 'FINISH',
    'done': 'FINISH', 'over': 'FINISH', 'through': 'FINISH', 'end': 'FINISH',
    'ending': 'FINISH', 'ended': 'FINISH', 'conclude': 'FINISH',
    'concluding': 'FINISH', 'concluded': 'FINISH',

    'stop': 'STOP', 'stopping': 'STOP', 'stopped': 'STOP', 'stops': 'STOP',
    'halt': 'STOP', 'halting': 'STOP', 'halted': 'STOP', 'cease': 'STOP',
    'ceasing': 'STOP', 'ceased': 'STOP', 'quit': 'STOP', 'quitting': 'STOP',
    'pause': 'STOP', 'pausing': 'STOP', 'paused': 'STOP', 'freeze': 'STOP',
    'freezing': 'STOP', 'froze': 'STOP', 'block': 'STOP', 'blocking': 'STOP',
    'prevent': 'STOP', 'preventing': 'STOP', 'prevented': 'STOP',

    'continue': 'CONTINUE', 'continuing': 'CONTINUE', 'continued': 'CONTINUE',
    'proceeds': 'CONTINUE', 'proceed': 'CONTINUE', 'proceeding': 'CONTINUE',
    'keep': 'CONTINUE', 'keeping': 'CONTINUE', 'kept': 'CONTINUE',
    'maintain': 'CONTINUE', 'maintaining': 'CONTINUE', 'maintained': 'CONTINUE',
    'sustain': 'CONTINUE', 'sustaining': 'CONTINUE', 'sustained': 'CONTINUE',
    'persist': 'CONTINUE', 'persisting': 'CONTINUE', 'persisted': 'CONTINUE',
    'carry on': 'CONTINUE',

    'try': 'TRY', 'trying': 'TRY', 'tried': 'TRY', 'tries': 'TRY',
    'attempt': 'TRY', 'attempting': 'TRY', 'attempted': 'TRY',
    'attempts': 'TRY', 'effort': 'TRY', 'efforts': 'TRY',
    'endeavor': 'TRY', 'endeavoring': 'TRY', 'strive': 'TRY',
    'striving': 'TRY', 'strived': 'TRY', 'seek': 'TRY', 'seeking': 'TRY',
    'sought': 'TRY',

    'change': 'CHANGE', 'changing': 'CHANGE', 'changed': 'CHANGE',
    'changes': 'CHANGE', 'modify': 'CHANGE', 'modifying': 'CHANGE',
    'modified': 'CHANGE', 'alter': 'CHANGE', 'altering': 'CHANGE',
    'altered': 'CHANGE', 'revise': 'CHANGE', 'revising': 'CHANGE',
    'revised': 'CHANGE', 'adjust': 'CHANGE', 'adjusting': 'CHANGE',
    'adjusted': 'CHANGE', 'edit': 'CHANGE', 'editing': 'CHANGE',
    'edited': 'CHANGE', 'transform': 'CHANGE', 'transforming': 'CHANGE',
    'transformed': 'CHANGE', 'transformation': 'CHANGE', 'switch': 'CHANGE',
    'switching': 'CHANGE', 'switched': 'CHANGE', 'convert': 'CHANGE',
    'converting': 'CHANGE', 'converted': 'CHANGE',

    'choose': 'CHOOSE', 'choosing': 'CHOOSE', 'chose': 'CHOOSE',
    'chosen': 'CHOOSE', 'choose': 'CHOOSE', 'select': 'CHOOSE',
    'selecting': 'CHOOSE', 'selected': 'CHOOSE', 'pick': 'CHOOSE',
    'picking': 'CHOOSE', 'picked': 'CHOOSE', 'decide': 'CHOOSE',
    'deciding': 'CHOOSE', 'decided': 'CHOOSE', 'decision': 'CHOOSE',
    'prefer': 'CHOOSE', 'preferring': 'CHOOSE', 'preferred': 'CHOOSE',
    'preference': 'CHOOSE', 'opt': 'CHOOSE', 'opting': 'CHOOSE',
    'option': 'CHOOSE', 'options': 'CHOOSE', 'alternative': 'CHOOSE',

    'wait': 'WAIT', 'waiting': 'WAIT', 'waited': 'WAIT', 'waits': 'WAIT',
    'hold on': 'WAIT', 'delay': 'WAIT', 'delaying': 'WAIT', 'delayed': 'WAIT',
    'patience': 'WAIT', 'patient': 'WAIT', 'patience': 'WAIT',

    'bring': 'BRING', 'bringing': 'BRING', 'brought': 'BRING', 'brings': 'BRING',
    'carry': 'BRING', 'carrying': 'BRING', 'carried': 'BRING', 'carries': 'BRING',

    'leave': 'LEAVE', 'leaving': 'LEAVE', 'left': 'LEAVE', 'leaves': 'LEAVE',
    'depart': 'LEAVE', 'departing': 'LEAVE', 'departed': 'LEAVE',
    'departure': 'LEAVE', 'exit': 'LEAVE', 'exiting': 'LEAVE',
    'exited': 'LEAVE', 'go away': 'LEAVE', 'withdraw': 'LEAVE',

    'remember': 'REMEMBER', 'remembering': 'REMEMBER', 'remembered': 'REMEMBER',
    'recall': 'REMEMBER', 'recalling': 'REMEMBER', 'recalled': 'REMEMBER',
    'memorize': 'REMEMBER', 'memorizing': 'REMEMBER', 'memory': 'REMEMBER',
    'recollect': 'REMEMBER', 'retain': 'REMEMBER', 'retaining': 'REMEMBER',

    'forget': 'FORGET', 'forgetting': 'FORGET', 'forgot': 'FORGET',
    'forgotten': 'FORGET', 'forgets': 'FORGET', 'lose track': 'FORGET',
    'overlook': 'FORGET', 'miss': 'FORGET', 'misplace': 'FORGET',

    'like': 'LIKE', 'liking': 'LIKE', 'liked': 'LIKE', 'likes': 'LIKE',
    'enjoy': 'LIKE', 'enjoying': 'LIKE', 'enjoyed': 'LIKE', 'enjoys': 'LIKE',
    'appreciate': 'LIKE', 'appreciating': 'LIKE', 'appreciated': 'LIKE',
    'favor': 'LIKE', 'favorable': 'LIKE', 'pleasure': 'LIKE',
    'pleasant': 'LIKE', 'satisfying': 'LIKE', 'satisfied': 'LIKE',

    'teach': 'TEACH', 'teaching': 'TEACH', 'taught': 'TEACH', 'teaches': 'TEACH',
    'instruct': 'TEACH', 'instructing': 'TEACH', 'instructed': 'TEACH',
    'train': 'TEACH', 'training': 'TEACH', 'trained': 'TEACH',
    'tutor': 'TEACH', 'tutoring': 'TEACH', 'tutored': 'TEACH',
    'coach': 'TEACH', 'coaching': 'TEACH', 'coached': 'TEACH',
    'educate': 'TEACH', 'educating': 'TEACH', 'educated': 'TEACH',
    'guide': 'TEACH', 'guiding': 'TEACH', 'guided': 'TEACH',
    'mentor': 'TEACH', 'mentoring': 'TEACH', 'mentored': 'TEACH',

    'show': 'SHOW', 'showing': 'SHOW', 'showed': 'SHOW', 'shown': 'SHOW',
    'shows': 'SHOW', 'demonstrate': 'SHOW', 'demonstrating': 'SHOW',
    'demonstrated': 'SHOW', 'demonstrate': 'SHOW', 'display': 'SHOW',
    'displaying': 'SHOW', 'displayed': 'SHOW', 'exhibit': 'SHOW',
    'exhibiting': 'SHOW', 'revealed': 'SHOW', 'reveal': 'SHOW',
    'illustrate': 'SHOW', 'illustrating': 'SHOW', 'illustrated': 'SHOW',
    'indicate': 'SHOW', 'indicating': 'SHOW', 'indicated': 'SHOW',
    'point out': 'SHOW', 'highlight': 'SHOW', 'highlighting': 'SHOW',

    'use': 'USE', 'using': 'USE', 'used': 'USE', 'uses': 'USE',
    'utilize': 'USE', 'utilizing': 'USE', 'utilized': 'USE',
    'employ': 'USE', 'employing': 'USE', 'employed': 'USE',
    'apply': 'USE', 'applying': 'USE', 'applied': 'USE', 'applies': 'USE',
    'implement': 'USE', 'implementing': 'USE', 'implemented': 'USE',
    'adopt': 'USE', 'adopting': 'USE', 'adopted': 'USE',

    'have': 'HAVE', 'having': 'HAVE', 'had': 'HAVE', 'has': 'HAVE',
    'own': 'HAVE', 'owning': 'HAVE', 'owned': 'HAVE', 'owns': 'HAVE',
    'possess': 'HAVE', 'possessing': 'HAVE', 'possessed': 'HAVE',
    'hold': 'HAVE', 'holding': 'HAVE', 'holds': 'HAVE', 'held': 'HAVE',
    'keep': 'HAVE', 'keeping': 'HAVE',

    // Existence / state
    'become': 'CHANGE', 'becoming': 'CHANGE', 'became': 'CHANGE',
    'grow': 'BETTER', 'growing': 'BETTER', 'grew': 'BETTER', 'grown': 'BETTER',
    'increase': 'BIG', 'increasing': 'BIG', 'increased': 'BIG',
    'decrease': 'SMALL', 'decreasing': 'SMALL', 'decreased': 'SMALL',
    'expand': 'BIG', 'expanding': 'BIG', 'expanded': 'BIG',
    'reduce': 'SMALL', 'reducing': 'SMALL', 'reduced': 'SMALL',
    'add': 'GIVE', 'adding': 'GIVE', 'added': 'GIVE',
    'remove': 'TAKE', 'removing': 'TAKE', 'removed': 'TAKE',
    'delete': 'TAKE', 'deleting': 'TAKE', 'deleted': 'TAKE',
    'include': 'GIVE', 'including': 'GIVE', 'included': 'GIVE',
    'exclude': 'TAKE', 'excluding': 'TAKE', 'excluded': 'TAKE',
    'connect': 'FRIEND', 'connecting': 'FRIEND', 'connected': 'FRIEND',
    'connect': 'FRIEND', 'link': 'FRIEND', 'linking': 'FRIEND', 'linked': 'FRIEND',
    'separate': 'DIFFERENT', 'separating': 'DIFFERENT', 'separated': 'DIFFERENT',
    'combine': 'SAME', 'combining': 'SAME', 'combined': 'SAME',
    'compare': 'SAME', 'comparing': 'SAME', 'compared': 'SAME',
    'match': 'SAME', 'matching': 'SAME', 'matched': 'SAME',

    // Attention / perception
    'notice': 'EYE', 'noticing': 'EYE', 'noticed': 'EYE',
    'see': 'EYE', 'seeing': 'EYE', 'saw': 'EYE', 'seen': 'EYE', 'sees': 'EYE',
    'view': 'EYE', 'viewing': 'EYE', 'viewed': 'EYE', 'views': 'EYE',
    'witness': 'EYE', 'witnessing': 'EYE', 'witnessed': 'EYE',
    'examine': 'EYE', 'examining': 'EYE', 'examined': 'EYE',
    'inspect': 'EYE', 'inspecting': 'EYE', 'inspected': 'EYE',
    'attention': 'EYE', 'focus': 'EYE', 'focusing': 'EYE', 'focused': 'EYE',
    'concentrate': 'EYE', 'concentrating': 'EYE', 'concentrated': 'EYE',
    'concentration': 'EYE',

    // Places
    'place': 'THERE', 'places': 'THERE', 'location': 'THERE', 'locations': 'THERE',
    'area': 'THERE', 'areas': 'THERE', 'region': 'THERE', 'regions': 'THERE',
    'country': 'THERE', 'countries': 'THERE', 'city': 'THERE', 'cities': 'THERE',
    'town': 'THERE', 'towns': 'THERE', 'village': 'THERE', 'street': 'THERE',
    'building': 'THERE', 'buildings': 'THERE', 'room': 'INSIDE', 'rooms': 'INSIDE',
    'office': 'WORK', 'library': 'READ', 'store': 'MONEY', 'shop': 'MONEY',
    'market': 'MONEY', 'park': 'PLAY',

    // Abstract / academic
    'concept': 'THINK', 'concepts': 'THINK', 'principle': 'THINK',
    'principles': 'THINK', 'rule': 'CORRECT', 'rules': 'CORRECT',
    'law': 'CORRECT', 'laws': 'CORRECT', 'policy': 'CORRECT',
    'policies': 'CORRECT', 'standard': 'CORRECT', 'standards': 'CORRECT',
    'value': 'IMPORTANT', 'values': 'IMPORTANT', 'meaning': 'KNOW',
    'context': 'KNOW', 'example': 'SHOW', 'examples': 'SHOW',
    'problem': 'WRONG', 'problems': 'WRONG', 'issue': 'WRONG', 'issues': 'WRONG',
    'challenge': 'DIFFICULT', 'challenges': 'DIFFICULT',
    'opportunity': 'WANT', 'opportunities': 'WANT',
    'success': 'FINISH', 'successful': 'FINISH', 'achieve': 'FINISH',
    'failure': 'WRONG', 'fail': 'WRONG', 'failing': 'WRONG', 'failed': 'WRONG',

    // Additional common words
    'go': 'GO', 'going': 'GO', 'went': 'GO', 'gone': 'GO', 'goes': 'GO',
    'come': 'COME', 'coming': 'COME', 'came': 'COME', 'comes': 'COME',
    'return': 'COME', 'returning': 'COME', 'returned': 'COME',
    'follow': 'COME', 'following': 'COME', 'followed': 'COME',

    'put': 'MOVE', 'putting': 'MOVE', 'place': 'MOVE',
    'set': 'MOVE', 'setting': 'MOVE', 'position': 'MOVE',
    'arrange': 'MOVE', 'arranging': 'MOVE', 'arranged': 'MOVE',
    'organize': 'MOVE', 'organizing': 'MOVE', 'organized': 'MOVE',
    'order': 'MOVE', 'ordering': 'MOVE', 'ordered': 'MOVE',
    'sort': 'MOVE', 'sorting': 'MOVE', 'sorted': 'MOVE',

    'check': 'FIND', 'checking': 'FIND', 'checked': 'FIND', 'checks': 'FIND',
    'verify': 'FIND', 'verifying': 'FIND', 'verified': 'FIND',
    'confirm': 'FIND', 'confirming': 'FIND', 'confirmed': 'FIND',
    'test': 'FIND', 'testing': 'FIND', 'tested': 'FIND',
    'evaluate': 'FIND', 'evaluating': 'FIND', 'evaluated': 'FIND',
    'measure': 'FIND', 'measuring': 'FIND', 'measured': 'FIND',

    'enter': 'INSIDE', 'entering': 'INSIDE', 'entered': 'INSIDE',
    'go in': 'INSIDE', 'come in': 'INSIDE', 'arrive': 'INSIDE',
    'arriving': 'INSIDE', 'arrived': 'INSIDE', 'arrival': 'INSIDE',

    'return': 'BEFORE', 'lack': 'ZERO', 'lacking': 'ZERO', 'absent': 'ZERO',
    'absence': 'ZERO', 'empty': 'ZERO', 'blank': 'ZERO', 'void': 'ZERO',
  };

  // ─── NLP helpers (IIFE scope) ─────────────────────────────────────────────

  /** Strip comparative/superlative suffixes before stemming. */
  function _sbStripComp(w) {
    if (w.length > 6 && w.endsWith('est')) return w.slice(0, -3);
    if (w.length > 5 && w.endsWith('er'))  return w.slice(0, -2);
    return w;
  }

  /**
   * Porter Stemmer (full 5-step algorithm).
   * Returns lowercase stem for English word w (already lowercase).
   */
  function _sbStem(w) {
    if (w.length < 3) return w;
    // helpers
    function cons(i) {
      const c = w[i];
      if (c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u') return false;
      if (c === 'y') return i === 0 ? true : !cons(i - 1);
      return true;
    }
    function m() { // measure (number of VC sequences)
      let n = 0, i = 0, len = w.length;
      while (i < len && cons(i)) i++;
      while (i < len) {
        while (i < len && !cons(i)) i++;
        n++;
        while (i < len && cons(i)) i++;
      }
      return n;
    }
    function hasVowel(stem) {
      const old = w; w = stem;
      let r = false;
      for (let i = 0; i < stem.length; i++) if (!cons(i)) { r = true; break; }
      w = old; return r;
    }
    function endsDoubleC() {
      return w.length >= 2 && w[w.length-1] === w[w.length-2] && cons(w.length-1);
    }
    function cvc(i) {
      if (i < 2) return false;
      return cons(i) && !cons(i-1) && cons(i-2) && w[i] !== 'w' && w[i] !== 'x' && w[i] !== 'y';
    }
    // Step 1a
    if (w.endsWith('sses'))      w = w.slice(0, -2);
    else if (w.endsWith('ies')) w = w.slice(0, -2);
    else if (w.endsWith('ss'))  { /* no change */ }
    else if (w.endsWith('s'))   w = w.slice(0, -1);
    // Step 1b
    let step1b2 = false;
    if (w.endsWith('eed')) {
      const stem = w.slice(0, -3); const oldW = w; w = stem;
      if (m() > 0) w = stem + 'ee'; else w = oldW;
    } else if (w.endsWith('ed')) {
      const stem = w.slice(0, -2);
      if (hasVowel(stem)) { w = stem; step1b2 = true; }
    } else if (w.endsWith('ing')) {
      const stem = w.slice(0, -3);
      if (hasVowel(stem)) { w = stem; step1b2 = true; }
    }
    if (step1b2) {
      if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) w += 'e';
      else if (endsDoubleC() && !w.endsWith('l') && !w.endsWith('s') && !w.endsWith('z')) w = w.slice(0,-1);
      else if (m() === 1 && cvc(w.length-1)) w += 'e';
    }
    // Step 1c
    if (w.endsWith('y') && hasVowel(w.slice(0,-1))) w = w.slice(0,-1) + 'i';
    // Step 2
    const step2 = [
      ['ational','ate'],['tional','tion'],['enci','ence'],['anci','ance'],
      ['izer','ize'],['abli','able'],['alli','al'],['entli','ent'],
      ['eli','e'],['ousli','ous'],['ization','ize'],['ation','ate'],
      ['ator','ate'],['alism','al'],['iveness','ive'],['fulness','ful'],
      ['ousness','ous'],['aliti','al'],['iviti','ive'],['biliti','ble'],
    ];
    for (const [suf, rep] of step2) {
      if (w.endsWith(suf)) {
        const stem = w.slice(0, -suf.length);
        const oldW = w; w = stem;
        if (m() > 0) { w = stem + rep; break; } else { w = oldW; }
      }
    }
    // Step 3
    const step3 = [
      ['icate','ic'],['ative',''],['alize','al'],['iciti','ic'],
      ['ical','ic'],['ful',''],['ness',''],
    ];
    for (const [suf, rep] of step3) {
      if (w.endsWith(suf)) {
        const stem = w.slice(0, -suf.length);
        const oldW = w; w = stem;
        if (m() > 0) { w = stem + rep; break; } else { w = oldW; }
      }
    }
    // Step 4
    const step4 = [
      'al','ance','ence','er','ic','able','ible','ant','ement',
      'ment','ent','ion','ou','ism','ate','iti','ous','ive','ize',
    ];
    for (const suf of step4) {
      if (w.endsWith(suf)) {
        const stem = w.slice(0, -suf.length);
        const oldW = w; w = stem;
        if (suf === 'ion') {
          if (m() > 1 && (stem.endsWith('s') || stem.endsWith('t'))) break;
          w = oldW;
        } else if (m() > 1) break;
        else w = oldW;
      }
    }
    // Step 5a
    if (w.endsWith('e')) {
      const stem = w.slice(0,-1);
      const oldW = w; w = stem;
      if (m() > 1) { /* keep stem */ }
      else if (m() === 1 && !cvc(stem.length-1)) { /* keep stem */ }
      else w = oldW;
    }
    // Step 5b
    if (m() > 1 && endsDoubleC() && w.endsWith('l')) w = w.slice(0,-1);
    return w;
  }

  /**
   * Detect part-of-speech from suffix rules.
   * Returns 'ADV' | 'ADJ' | 'VERB' | 'NOUN' | 'UNKNOWN'
   */
  function _sbPOS(w) {
    if (w.endsWith('ly')) return 'ADV';
    if (/(?:ful|less|ous|ive|al|ary|ic|able|ible|ant|ish|ent|ent)$/.test(w)) return 'ADJ';
    if (/(?:ing|ify|ize|ise|ate)$/.test(w)) return 'VERB';
    if (/(?:ed)$/.test(w) && w.length > 4) return 'VERB';
    if (/(?:tion|sion|ment|ness|ity|age|ance|ence|er|or|ist|ian|ism|ship)$/.test(w)) return 'NOUN';
    return 'UNKNOWN';
  }

  // ─── Pre-built stemmed index (O(1) lookup at runtime) ────────────────────
  const STEMMED_INDEX = Object.create(null);
  (function buildStemmedIndex() {
    for (const key of Object.keys(WORD_TO_SIGN)) {
      const s = _sbStem(_sbStripComp(key));
      if (!STEMMED_INDEX[s]) STEMMED_INDEX[s] = key;
    }
  })();

  // ─── Words to SKIP (function words, fillers, punctuation-like tokens) ─────
  const SKIP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'so', 'yet',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
    'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would',
    'shall', 'should', 'may', 'might', 'can', 'could',
    'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from',
    'up', 'about', 'into', 'through', 'during', 'before', 'after',
    'that', 'this', 'these', 'those', 'it', 'its',
    'um', 'uh', 'er', 'like', 'well', 'so', 'actually', 'basically',
  ]);

  // ─── Time-marking words (moved to front in ASL grammar) ──────────────────
  const TIME_WORDS = new Set([
    'today', 'tomorrow', 'yesterday', 'now', 'later', 'soon',
    'morning', 'afternoon', 'evening', 'night', 'tonight',
    'week', 'month', 'year', 'next', 'last',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
  ]);

  // ─── Question words ───────────────────────────────────────────────────────
  const WH_WORDS = new Set(['what', 'when', 'where', 'who', 'why', 'how', 'which']);

  // ─── Public API ───────────────────────────────────────────────────────────
  window.SignBridge.SignMapper = {

    SIGNS,
    WORD_TO_SIGN,
    FINGERSPELL_HANDS,
    REST_R,
    REST_L,
    FACE_POS,

    /**
     * Main entry point: convert a chunk of caption text into a sign sequence.
     * @param {string} text - raw caption or speech text
     * @returns {Array<SignConfig>} ordered sign configs for the avatar to render
     */
    textToSigns(text) {
      if (!text || typeof text !== 'string') return [];
      const words = this._normalizeAndTokenize(text);
      if (words.length === 0) return [];

      // Detect sentence type for non-manual markers
      const isWHQuestion = words.some(w => WH_WORDS.has(w));
      const isYNQuestion = text.trim().endsWith('?') && !isWHQuestion;

      // Apply ASL grammar reordering
      const reordered = this._applyAslGrammar(words, isWHQuestion, isYNQuestion);

      // Map each word/phrase to a sign config
      const signs = [];
      let i = 0;
      while (i < reordered.length) {
        // Try 3-word phrase first, then 2-word, then single
        let matched = false;
        for (let len = 3; len >= 1; len--) {
          if (i + len > reordered.length) continue;
          const phrase = reordered.slice(i, i + len).join(' ');
          const signKey = WORD_TO_SIGN[phrase];
          if (signKey && SIGNS[signKey]) {
            const cfg = { ...SIGNS[signKey] };
            // Overlay question expression for non-manual markers
            if (isWHQuestion) cfg.expression = 'WH_QUESTION';
            else if (isYNQuestion) cfg.expression = 'QUESTION';
            cfg._word = phrase;
            cfg._key = signKey;
            signs.push(cfg);
            i += len;
            matched = true;
            break;
          }
        }
        if (!matched) {
          const word = reordered[i];
          if (word && word.length > 0 && !SKIP_WORDS.has(word)) {
            const expression = isWHQuestion ? 'WH_QUESTION' : isYNQuestion ? 'QUESTION' : 'NEUTRAL';

            // Step 2: stemmed lookup
            const stemmed = _sbStem(_sbStripComp(word));
            const stemKey = STEMMED_INDEX[stemmed];
            if (stemKey && SIGNS[WORD_TO_SIGN[stemKey]]) {
              const cfg = { ...SIGNS[WORD_TO_SIGN[stemKey]] };
              if (isWHQuestion) cfg.expression = 'WH_QUESTION';
              else if (isYNQuestion) cfg.expression = 'QUESTION';
              cfg._word = word;
              cfg._key = WORD_TO_SIGN[stemKey];
              signs.push(cfg);
            } else {
              // Step 3: extended vocab (lazy-loaded vocab-10k.json)
              this._loadExtVocab();
              const extVocab = this._extVocab;
              const extKey = extVocab && (extVocab[word] || extVocab[stemmed]);
              if (extKey && SIGNS[extKey]) {
                const cfg = { ...SIGNS[extKey] };
                if (isWHQuestion) cfg.expression = 'WH_QUESTION';
                else if (isYNQuestion) cfg.expression = 'QUESTION';
                cfg._word = word;
                cfg._key = extKey;
                signs.push(cfg);
              } else {
                // Step 4 + 5: POS-based fallback → fingerspell
                signs.push(...this._selectFallbackSign(word, expression));
              }
            }
          }
          i++;
        }
      }

      return signs;
    },

    /**
     * Returns the educational info for a given sign key.
     */
    getSignInfo(key) {
      return SIGNS[key] || null;
    },

    /**
     * Returns all signs for a given category.
     */
    getCategory(category) {
      return Object.entries(SIGNS)
        .filter(([, v]) => v.category === category)
        .map(([key, v]) => ({ key, ...v }));
    },

    /** List all available categories. */
    getCategories() {
      return [...new Set(Object.values(SIGNS).map(s => s.category).filter(Boolean))];
    },

    // ── Private helpers ────────────────────────────────────────────────────

    _normalizeAndTokenize(text) {
      return text
        .toLowerCase()
        .replace(/[.,!?;:"""''()\[\]{}]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(w => w.length > 0 && !SKIP_WORDS.has(w));
    },

    /**
     * Apply simplified ASL grammar rules:
     * 1. Move time words to front
     * 2. Move WH-question word to end
     */
    _applyAslGrammar(words, isWHQuestion, isYNQuestion) {
      const timeWords = words.filter(w => TIME_WORDS.has(w));
      const whWords   = words.filter(w => WH_WORDS.has(w));
      const rest      = words.filter(w => !TIME_WORDS.has(w) && !WH_WORDS.has(w));

      // ASL order: [TIME] [TOPIC/COMMENT] [WH-WORD]
      const reordered = [
        ...timeWords,
        ...rest,
        ...(isWHQuestion ? whWords : []), // WH-word moves to end
      ];

      return reordered;
    },

    // ── Extended vocab lazy loader ──────────────────────────────────────────
    _extVocabLoaded: false,
    _extVocabLoading: false,

    _loadExtVocab() {
      if (this._extVocabLoaded || this._extVocabLoading) return;

      // Defensive check for non-browser/test environments
      if (typeof fetch === 'undefined' || typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
        console.warn('[SignBridge] Extended vocab loading skipped: environment not supported (expected in unit tests).');
        this._extVocab = {}; 
        this._extVocabLoaded = true;
        return;
      }

      this._extVocabLoading = true;
      const url = chrome.runtime.getURL('content/vocab-10k.json');
      fetch(url)
        .then(r => r.json())
        .then(data => {
          this._extVocab = data;
          this._extVocabLoaded = true;
          this._extVocabLoading = false;
        })
        .catch(err => {
          console.error('[SignBridge] Failed to load extended vocab:', err);
          this._extVocabLoading = false;
          this._extVocab = {}; // Fallback to empty to avoid repeated fails
        });
    },

    /**
     * POS-based semantic fallback.
     * Returns an array of sign configs (one category sign OR fingerspelling).
     */
    _selectFallbackSign(word, expression) {
      const pos = _sbPOS(word);

      // Person-role nouns → __SUBJECT
      if (pos === 'NOUN' && /(?:er|or|ist|ian|man|woman|person)$/.test(word)) {
        const cfg = SIGNS['__SUBJECT'];
        if (cfg) return [{ ...cfg, expression, _word: word, _key: '__SUBJECT' }];
      }
      // Time-concept nouns → __TIME
      if (pos === 'NOUN' && /(?:time|day|week|month|year|age|era|hour|minute|second|season)$/.test(word)) {
        const cfg = SIGNS['__TIME'];
        if (cfg) return [{ ...cfg, expression, _word: word, _key: '__TIME' }];
      }
      // Adverbs / adjectives → __MODIFIER
      if (pos === 'ADV' || pos === 'ADJ') {
        const cfg = SIGNS['__MODIFIER'];
        if (cfg) return [{ ...cfg, expression, _word: word, _key: '__MODIFIER' }];
      }
      // Verbs → __ACTION
      if (pos === 'VERB') {
        const cfg = SIGNS['__ACTION'];
        if (cfg) return [{ ...cfg, expression, _word: word, _key: '__ACTION' }];
      }
      // General nouns → __OBJECT
      if (pos === 'NOUN') {
        const cfg = SIGNS['__OBJECT'];
        if (cfg) return [{ ...cfg, expression, _word: word, _key: '__OBJECT' }];
      }
      // Final fallback: fingerspell
      return this._fingerspell(word, expression);
    },

    /**
     * Generate fingerspelling sign configs for a word.
     * Each letter becomes a separate sign frame.
     */
    _fingerspell(word, expression = 'NEUTRAL') {
      const upper = word.toUpperCase();
      return upper.split('').map(letter => {
        const handKey = FINGERSPELL_HANDS[letter] || 'FLAT';
        return {
          right: { ...FACE_POS },
          rHand: handKey,
          expression,
          category: 'fingerspelling',
          description: `Fingerspell: ${letter}`,
          culturalNote: `"${letter}" in the ASL manual alphabet. Fingerspelling is used for proper nouns, new words, and words without an established sign.`,
          _word: letter,
          _key: `FS_${letter}`,
          _isFingerspell: true,
        };
      });
    },
  };

})();
