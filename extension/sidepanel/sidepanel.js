/**
 * SignBridge — Side Panel JS
 *
 * Manages three panel tabs:
 *  1. Live   — real-time sign stream from the active tab
 *  2. Browse — searchable sign dictionary with cultural context
 *  3. Phrasebook — user-saved signs (stored in chrome.storage.sync)
 *
 * Data flow:
 *   Background SW → "SIGNS_UPDATED" message → update Live tab
 *   User clicks sign chip → "PREVIEW_SIGN" message → content script previews
 */

'use strict';

// ── Sign dictionary (subset mirrored from sign-mapper.js) ─────────────────────
// The side panel doesn't run content scripts, so we need a copy of the
// sign info here. In a built extension, this would be imported as a module.
// We load the data by injecting sign-mapper into the page and reading it back,
// OR we define a minimal metadata-only version here.
//
// For the side panel we only need: key, gloss, description, culturalNote, category
// (not the arm/hand animation data). We embed a flat JSON representation.

const SIGN_META = {
  HELLO:          { gloss:'HELLO',         description:'Open flat hand sweeps outward from forehead', culturalNote:'HELLO in ASL is a relaxed military salute. Eye contact during greetings is essential — looking away is considered rude, not shy.', category:'greetings' },
  HI:             { gloss:'HI',            description:'Casual open-hand wave', culturalNote:'HI is a more casual, informal version of HELLO, often used between friends in the Deaf community.', category:'greetings' },
  GOODBYE:        { gloss:'GOODBYE',       description:'Open hand waves side to side', culturalNote:'In Deaf social settings, farewells are often extended — leaving quickly without a proper goodbye is considered impolite.', category:'greetings' },
  GOOD_MORNING:   { gloss:'GOOD MORNING',  description:'GOOD + MORNING combined', culturalNote:'Time-of-day greetings in ASL combine two signs. MORNING shows the sun rising over the horizon.', category:'greetings' },
  GOOD_NIGHT:     { gloss:'GOOD NIGHT',    description:'Flat fingers drop onto non-dominant forearm', culturalNote:'NIGHT depicts the sun setting below the horizon. Natural, iconic signs are deeply characteristic of ASL.', category:'greetings' },
  NICE_TO_MEET_YOU:{ gloss:'NICE-MEET-YOU', description:'NICE + MEET combined', culturalNote:'Meeting another Deaf person ("Deaf meet") is often celebrated. The Deaf community is tight-knit worldwide.', category:'greetings' },
  THANK_YOU:      { gloss:'THANK YOU',     description:'Flat hand from chin, moves forward and down', culturalNote:'THANK YOU mimics blowing a kiss of gratitude. One of the most commonly learned signs.', category:'politeness' },
  PLEASE:         { gloss:'PLEASE',        description:'Flat hand circles on chest', culturalNote:'PLEASE and THANK YOU share similar base movements — both emphasize warmth, core to Deaf culture.', category:'politeness' },
  SORRY:          { gloss:'SORRY',         description:'Closed fist circles on chest', culturalNote:'SORRY uses a fist (showing sincerity/pain); PLEASE uses an open hand. Context and facial expression distinguish them.', category:'politeness' },
  EXCUSE_ME:      { gloss:'EXCUSE ME',     description:'Fingertips brush across non-dominant palm', culturalNote:'Tapping someone on the shoulder is the Deaf equivalent of "excuse me" to get attention.', category:'politeness' },
  YES:            { gloss:'YES',           description:'Fist bobs up and down like a nodding head', culturalNote:'YES mimics a nodding head with the fist. A strong YES uses larger movement — size adds emphasis in ASL.', category:'responses' },
  NO:             { gloss:'NO',            description:'Index and middle snap down onto thumb twice', culturalNote:'NO combines a head shake (universal) with a finger-snap motion. Non-manual markers reinforce meaning in ASL.', category:'responses' },
  OK:             { gloss:'OK',            description:'OK handshape — circle of thumb and index finger', culturalNote:'OK is a borrowing from English gesture. ASL uses many context-specific signs for "fine," "good," or "alright."', category:'responses' },
  I_UNDERSTAND:   { gloss:'UNDERSTAND',    description:'Index finger flicks up near the temple', culturalNote:'UNDERSTAND shows comprehension "lighting up" in the mind — a light bulb turning on, made visual.', category:'responses' },
  I_DONT_UNDERSTAND: { gloss:"DON'T UNDERSTAND", description:'UNDERSTAND + NOT: flick then shake head', culturalNote:'Expressing confusion is respected in Deaf culture. Asking for clarification shows engagement, not weakness.', category:'responses' },
  WHAT:           { gloss:'WHAT',          description:'Index brushes across non-dominant palm', culturalNote:'WH-questions in ASL always end with the question word. Eyebrows are furrowed throughout the entire question.', category:'questions' },
  WHEN:           { gloss:'WHEN',          description:'Index circles, then taps non-dominant index finger', culturalNote:'WHEN combines a circular motion (time) with pointing to meet at a specific moment.', category:'questions' },
  WHERE:          { gloss:'WHERE',         description:'Index finger waggles side to side', culturalNote:'WHERE shakes the index as if searching a space. ASL is spatially rich — locations are established in signing space.', category:'questions' },
  WHO:            { gloss:'WHO',           description:'Index circles near the chin', culturalNote:'In ASL storytelling, characters are "placed" in signing space and referred to by pointing to that location.', category:'questions' },
  WHY:            { gloss:'WHY',           description:'Claw hand pulls away from forehead', culturalNote:'WHY extracts something from the mind. This visual metaphor reflects ASL\'s rich iconic nature.', category:'questions' },
  HOW:            { gloss:'HOW',           description:'Both claw hands roll knuckles upward', culturalNote:'HOW rolls hands as if turning something over — exploring the manner or method of something.', category:'questions' },
  HELP:           { gloss:'HELP',          description:'Thumb-up fist sits on flat palm and lifts upward', culturalNote:'HELP shows one hand literally lifting another. Community interdependence is foundational in Deaf culture.', category:'verbs' },
  LEARN:          { gloss:'LEARN',         description:'Claw lifts knowledge from palm to forehead', culturalNote:'LEARN depicts picking up knowledge and placing it in your mind — "iconicity" is the hallmark of ASL.', category:'academic' },
  STUDY:          { gloss:'STUDY',         description:'Wiggling fingers point toward non-dominant palm', culturalNote:'STUDY shows mental activity directed at material — the wiggling fingers represent the brain working.', category:'academic' },
  TEST:           { gloss:'TEST',          description:'Both index fingers curve downward like question marks', culturalNote:'TEST shows two question marks — the questioning nature of a test. Visual creativity is characteristic of ASL.', category:'academic' },
  STUDENT:        { gloss:'STUDENT',       description:'LEARN from palm, then PERSON suffix', culturalNote:'STUDENT = LEARN + PERSON. Deaf students have historically fought for equal access to education.', category:'academic' },
  TEACHER:        { gloss:'TEACHER',       description:'Both hands project knowledge outward, then PERSON', culturalNote:'Teachers at residential Deaf schools are pillars of ASL preservation. Many are deeply respected cultural figures.', category:'academic' },
  CLASS:          { gloss:'CLASS',         description:'Both C-hands arc around forming a group circle', culturalNote:'CLASS shows a group gathered together. Many group-related signs use this arc motion.', category:'academic' },
  NOW:            { gloss:'NOW',           description:'Both flat hands drop down simultaneously', culturalNote:'NOW grounds time in the present. The ASL timeline runs front-to-back: past behind, future ahead.', category:'time' },
  TODAY:          { gloss:'TODAY',         description:'NOW + DAY: hands drop, then arc like the sun', culturalNote:'TODAY = NOW + DAY. The ASL time line runs front-to-back through the body.', category:'time' },
  TOMORROW:       { gloss:'TOMORROW',      description:'Thumb moves forward from the cheek', culturalNote:'TOMORROW moves forward — into the future on the ASL timeline. Far future uses a larger forward arc.', category:'time' },
  YESTERDAY:      { gloss:'YESTERDAY',     description:'Thumb arcs backward past the cheek', culturalNote:'YESTERDAY moves backward — into the past. LONG-AGO sweeps far behind the shoulder.', category:'time' },
  HAPPY:          { gloss:'HAPPY',         description:'Flat hand circles upward at chest (joy rising)', culturalNote:'HAPPY brushes upward repeatedly, showing joy bubbling up. Facial expression is crucial in ASL.', category:'emotions' },
  SAD:            { gloss:'SAD',           description:'Both flat hands slide down the face (tears falling)', culturalNote:'SAD shows hands sliding down the face like tears. Emotional expression in ASL is amplified and explicit.', category:'emotions' },
  LOVE:           { gloss:'LOVE',          description:'Fists crossed over the heart', culturalNote:'LOVE crosses both fists over the heart. Deaf couples often develop unique personal "name signs" for each other.', category:'verbs' },
  UNDERSTAND:     { gloss:'UNDERSTAND',    description:'Index finger flicks up from near the temple', culturalNote:'UNDERSTAND shows an "aha moment" made visual — a light switch turning on in the mind.', category:'verbs' },
  ME:             { gloss:'ME / I',        description:'Index points to self (chest)', culturalNote:'ASL pronouns are directional — YOU points at the other person, HE/SHE points where a referent was established.', category:'pronouns' },
  YOU:            { gloss:'YOU',           description:'Index points directly at the other person', culturalNote:'Pointing directly at someone is natural and necessary in ASL — there is no separate HE/SHE. Context establishes reference.', category:'pronouns' },
  DEAF:           { gloss:'DEAF',          description:'Index taps ear, then corner of mouth', culturalNote:'"Deaf" (capital D) = rich linguistic cultural identity. Lowercase "deaf" = audiological hearing loss only. The distinction matters deeply.', category:'pronouns' },
  VIDEO:          { gloss:'VIDEO',         description:'V-hand moves outward (projection/stream)', culturalNote:'Video Relay Services (VRS) allow Deaf people to make phone calls via interpreters over video — a legal right in many countries.', category:'technology' },
  CAPTION:        { gloss:'CAPTION',       description:'Index traces text lines on non-dominant palm', culturalNote:'Closed captions have been required by US law since 1990 (ADA). Real-time captions are a legal accessibility right.', category:'technology' },
  TRANSLATE:      { gloss:'TRANSLATE',     description:'Both hands rotate around each other (language bridge)', culturalNote:'Sign language interpreters are called "terps" in the Deaf community. Certified interpreters follow strict professional codes.', category:'technology' },
  INTERNET:       { gloss:'INTERNET',      description:'Both claw hands roll around each other (web/network)', culturalNote:'The internet gave Deaf people unprecedented access. Online Deaf communities span countries and languages worldwide.', category:'technology' },
  IMPORTANT:      { gloss:'IMPORTANT',     description:'Both thumb-ups move upward to face height', culturalNote:'Signers often mouth "important" simultaneously, using mouthing (an English-borrowed non-manual marker) for emphasis.', category:'descriptors' },
  GOOD:           { gloss:'GOOD',          description:'Flat hand from chin, moves down and out', culturalNote:'Positive emotions in ASL: mouth smiling and body open. Negative emotions contract the body and face.', category:'descriptors' },
  BAD:            { gloss:'BAD',           description:'Fingertips at lips, hand flips downward', culturalNote:'BAD flips the GOOD hand downward — rejecting what is bad, pushing it away from the face and body.', category:'descriptors' },
  NAME:           { gloss:'NAME',          description:'H-hands tap together twice', culturalNote:'In Deaf culture, everyone gets a "name sign" — a unique personal sign given by the Deaf community, not self-assigned.', category:'pronouns' },
  FRIEND:         { gloss:'FRIEND',        description:'Hooked index fingers interlock and swap', culturalNote:'FRIEND interlocks both index fingers — two people linking together. Deaf friendships are often built quickly and deeply.', category:'pronouns' },
  FINISH:         { gloss:'FINISH',        description:'Both flat hands flip outward (completion)', culturalNote:'FINISH/DONE flips both hands as if releasing something completed. Can also mean "already" or signal a closed topic.', category:'verbs' },
  STOP:           { gloss:'STOP',          description:'Right flat hand chops down onto left palm', culturalNote:'STOP is sharp and decisive. In Deaf space, clapping, table-stomping, or waving get attention to stop.', category:'verbs' },
  ONE:   { gloss:'ONE',   description:'Index finger raised', culturalNote:'ASL numbers 1-5 look like counting on fingers. Numbers are signed palm-facing out.', category:'numbers' },
  TWO:   { gloss:'TWO',   description:'Index and middle raised (V-shape)', culturalNote:'TWO uses the same V-handshape as SEE and VICTORY — context distinguishes them.', category:'numbers' },
  FIVE:  { gloss:'FIVE',  description:'All five fingers spread open', culturalNote:'FIVE is an open hand — the most natural counting position.', category:'numbers' },

  // ── Phase 2: Actions ─────────────────────────────────────────────────────
  MAKE:  { gloss:'MAKE',  description:'Two fists roll over each other (creating/shaping)', culturalNote:'MAKE covers CREATE, BUILD, and PRODUCE. One sign, broad semantic field.', category:'actions' },
  TAKE:  { gloss:'TAKE',  description:'Claw hand grabs and pulls inward', culturalNote:'TAKE is directional — toward the taker. Movement encodes grammar in ASL.', category:'actions' },
  GIVE:  { gloss:'GIVE',  description:'Flat hand extends forward from chest', culturalNote:'GIVE is directional — signed toward the recipient. Spatial grammar at work.', category:'actions' },
  SAY:   { gloss:'SAY',   description:'Index finger at mouth moves forward', culturalNote:'SAY, TELL, and MENTION all begin near the mouth — the seat of language.', category:'actions' },
  WRITE: { gloss:'WRITE', description:'A-hand scribbles across non-dominant palm', culturalNote:'WRITE depicts the physical act. Written English is a second language for many Deaf people.', category:'actions' },
  READ:  { gloss:'READ',  description:'V-hand scans down non-dominant palm (eyes reading)', culturalNote:'READ shows eyes scanning a page. Deaf readers are often avid readers — print bridges two worlds.', category:'actions' },
  PLAY:  { gloss:'PLAY',  description:'Both Y-hands shake loosely', culturalNote:'PLAY uses the Y-handshape (thumb + pinky). Sports, games, and music each have specific signs.', category:'actions' },
  WORK:  { gloss:'WORK',  description:'Dominant fist taps back of non-dominant fist', culturalNote:'WORK shows persistent, rhythmic effort. JOB and WORK share the same sign.', category:'actions' },
  MOVE:  { gloss:'MOVE',  description:'Both flat hands shift forward together', culturalNote:'MOVE is directional — signed toward where something is going.', category:'actions' },
  OPEN:  { gloss:'OPEN',  description:'Both flat hands rotate open (like opening a book)', culturalNote:'OPEN adapts to doors, books, and windows via context and classifiers.', category:'actions' },
  FIND:  { gloss:'FIND',  description:'OK-hand lifts upward (picking something out)', culturalNote:'FIND and DISCOVER share a sign — the "aha" moment of discovery.', category:'actions' },
  SEND:  { gloss:'SEND',  description:'Flat hand flicks forward from wrist', culturalNote:'SEND emphasizes the release — also used for emails and digital messages.', category:'actions' },

  // ── Phase 2: Adjectives ───────────────────────────────────────────────────
  BIG:       { gloss:'BIG',       description:'Both L-hands spread apart horizontally', culturalNote:'BIG is iconic — wider spread = bigger size. Iconicity is a hallmark of ASL.', category:'adjectives' },
  SMALL:     { gloss:'SMALL',     description:'Both flat hands press close together', culturalNote:'SMALL compresses the space — smaller gap = smaller thing. Highly spatial.', category:'adjectives' },
  NEW:       { gloss:'NEW',       description:'Dominant hand brushes upward across non-dominant palm', culturalNote:'NEW sweeps away the old to reveal the new. Also means FRESH and RECENT.', category:'adjectives' },
  OLD:       { gloss:'OLD',       description:'Fist at chin drags downward (long beard)', culturalNote:'OLD depicts a long beard — universal symbol of age. Also ANCIENT and LONG-AGO.', category:'adjectives' },
  FAST:      { gloss:'FAST',      description:'Thumbs flick forward rapidly (trigger snap)', culturalNote:'FAST is signed fast for very fast — speed of motion conveys intensity.', category:'adjectives' },
  SLOW:      { gloss:'SLOW',      description:'Dominant hand glides slowly up non-dominant arm', culturalNote:'SLOW drags itself along — the motion itself embodies the meaning.', category:'adjectives' },
  BEAUTIFUL: { gloss:'BEAUTIFUL', description:'Flat hand circles around face, then closes', culturalNote:'BEAUTIFUL encompasses the whole face. Also PRETTY and LOVELY.', category:'adjectives' },
  HOT:       { gloss:'HOT',       description:'Claw at mouth twists outward (spitting out heat)', culturalNote:'HOT depicts removing hot food from the mouth. WARM is a softer version.', category:'adjectives' },
  COLD:      { gloss:'COLD',      description:'Both fists at shoulders shake (shivering)', culturalNote:'COLD mimics shivering — the body becomes the sign.', category:'adjectives' },
  IMPORTANT: { gloss:'IMPORTANT', description:'Both A-hands rise and face each other (heavy weight)', culturalNote:'IMPORTANT shows great weight being lifted. Also SIGNIFICANT and CRUCIAL.', category:'adjectives' },
  CORRECT:   { gloss:'CORRECT',   description:'Index fingers align and tap (two things matching)', culturalNote:'CORRECT/RIGHT shows two things aligning perfectly. Also ACCURATE and EXACT.', category:'adjectives' },
  WRONG:     { gloss:'WRONG',     description:'Y-hand (horns) taps chin (twisted/wrong)', culturalNote:'WRONG taps the chin with the Y-handshape. Also MISTAKE and ERROR.', category:'adjectives' },

  // ── Phase 2: Colors ───────────────────────────────────────────────────────
  RED:    { gloss:'RED',    description:'Index brushes downward on lips (red lips)', culturalNote:'RED is iconic — referencing the red of lips. Color signs are often iconic or initialized.', category:'colors' },
  BLUE:   { gloss:'BLUE',   description:'B-hand shakes at shoulder level', culturalNote:'BLUE is initialized with B-handshape. Initialized signs reflect English contact with ASL.', category:'colors' },
  GREEN:  { gloss:'GREEN',  description:'G-hand (L-shape) shakes', culturalNote:'GREEN uses a G-handshape. Color vocabulary expanded with English influence on ASL.', category:'colors' },
  YELLOW: { gloss:'YELLOW', description:'Y-hand shakes (initialized)', culturalNote:'YELLOW uses the Y-handshape — same as ILY. Context clarifies meaning.', category:'colors' },
  WHITE:  { gloss:'WHITE',  description:'Flat hand at chest pulls outward then closes', culturalNote:'WHITE is iconic — like pulling a white shirt. One of the few non-initialized color signs.', category:'colors' },
  BLACK:  { gloss:'BLACK',  description:'Index finger crosses forehead (dark eyebrow)', culturalNote:'BLACK draws across the forehead. One of the first color signs typically learned.', category:'colors' },
  ORANGE: { gloss:'ORANGE', description:'C-hand at chin squeezes (squeezing an orange)', culturalNote:'ORANGE is iconic — squeezing an orange. Fruits that name colors inspire iconic signs.', category:'colors' },
  PURPLE: { gloss:'PURPLE', description:'P-hand (V-shape) shakes', culturalNote:'PURPLE uses a P-handshape. Initialized signs reflect English-ASL contact history.', category:'colors' },
  BROWN:  { gloss:'BROWN',  description:'B-hand slides down cheek', culturalNote:'BROWN uses B-handshape on the cheek. Color signs learned together build vocabulary efficiently.', category:'colors' },

  // ── Phase 2: Family ───────────────────────────────────────────────────────
  MOTHER:   { gloss:'MOTHER',   description:'Thumb of open hand taps chin twice', culturalNote:'Feminine signs in ASL are at the chin (mom, sister, daughter, aunt). Male signs are at the forehead.', category:'family' },
  FATHER:   { gloss:'FATHER',   description:'Thumb of open hand taps forehead twice', culturalNote:'Male signs in ASL are at the forehead (dad, brother, son, uncle). A consistent, elegant system.', category:'family' },
  SISTER:   { gloss:'SISTER',   description:'L-hand from chin slides to meet other L-hand', culturalNote:'SISTER = feminine chin marker + SAME (they are siblings). Family signs combine gender + relationship.', category:'family' },
  BROTHER:  { gloss:'BROTHER',  description:'L-hand from forehead slides to meet other L-hand', culturalNote:'BROTHER = masculine forehead marker + SAME. In Deaf families, signs are taught early.', category:'family' },
  BABY:     { gloss:'BABY',     description:'Both arms cradle and rock an invisible baby', culturalNote:'BABY is one of the most iconic signs in ASL — the rocking motion is universally understood.', category:'family' },
  FAMILY:   { gloss:'FAMILY',   description:'Both F-hands circle outward and meet', culturalNote:'FAMILY encircles all members — the circular motion shows inclusion. Deaf families are celebrated.', category:'family' },
  PERSON:   { gloss:'PERSON',   description:'Both flat hands move downward parallel (person marker)', culturalNote:'PERSON is a grammatical suffix in ASL: TEACH+PERSON = TEACHER. Mirrors English "-er."', category:'family' },
  FRIEND:   { gloss:'FRIEND',   description:'Hooked index fingers interlock and swap', culturalNote:'FRIEND links index fingers — two people connected. Deaf friendships formed at schools run deep.', category:'family' },
  CHILDREN: { gloss:'CHILDREN', description:'Flat hand pats downward at different heights', culturalNote:'CHILDREN pats heads at varying heights — iconic. Reduplication often marks plurality in ASL.', category:'family' },

  // ── Phase 2: Food ─────────────────────────────────────────────────────────
  EAT:    { gloss:'EAT',    description:'Flat hand taps mouth (bringing food to mouth)', culturalNote:'EAT taps the mouth — universally understood. Also used for FOOD and MEAL.', category:'food' },
  DRINK:  { gloss:'DRINK',  description:'C-hand (cup) tilts toward mouth', culturalNote:'DRINK mimics holding a cup — another iconic, universally understood sign.', category:'food' },
  HUNGRY: { gloss:'HUNGRY', description:'C-hand at throat moves downward (empty feeling)', culturalNote:'HUNGRY traces where food would travel. Also used for CRAVE and DESIRE.', category:'food' },
  WATER:  { gloss:'WATER',  description:'W-hand (3 fingers) taps chin twice', culturalNote:'WATER uses the W-handshape tapping the chin. Hydration is important in Deaf athletic communities.', category:'food' },
  COOK:   { gloss:'COOK',   description:'Dominant hand flips on non-dominant palm', culturalNote:'COOK shows flipping food in a pan. Communal meals are important Deaf social occasions.', category:'food' },

  // ── Phase 2: Body ─────────────────────────────────────────────────────────
  HEAD: { gloss:'HEAD', description:'Flat hand taps side of head', culturalNote:'Body-part signs are iconic — the hand touches the body part. Easy to learn, high retention.', category:'body' },
  HAND: { gloss:'HAND', description:'Dominant hand brushes across non-dominant hand', culturalNote:'"In the hands" describes how ASL lives. Hands are respected tools of communication.', category:'body' },
  EYE:  { gloss:'EYE',  description:'Index finger points to eye', culturalNote:'Eye contact is a form of respect in ASL. Looking away while signing is considered rude.', category:'body' },
  EAR:  { gloss:'EAR',  description:'Index finger points to ear', culturalNote:'EAR is used in "hearing person" contexts. HEARING (ability) also touches the mouth.', category:'body' },
  NOSE: { gloss:'NOSE', description:'Index finger taps tip of nose', culturalNote:'Body-part signs are typically taught first to children learning ASL.', category:'body' },

  // ── Phase 2: Health ───────────────────────────────────────────────────────
  SICK:   { gloss:'SICK',   description:'Claw-hand middle fingers tap head and stomach', culturalNote:'SICK uses the "feeling" middle finger on head + stomach — the body feels bad throughout.', category:'health' },
  PAIN:   { gloss:'PAIN',   description:'Both index fingers jab toward each other', culturalNote:'PAIN/HURT shows two sharp objects meeting. Location changes show WHERE it hurts.', category:'health' },
  DOCTOR: { gloss:'DOCTOR', description:'D/V-hand taps non-dominant wrist (checking pulse)', culturalNote:'Finding a signing doctor is a key Deaf healthcare accessibility need.', category:'health' },
  BETTER: { gloss:'BETTER', description:'Fist at mouth rises upward (getting better)', culturalNote:'BETTER and IMPROVE share the same upward root. Expressing health status clearly is crucial.', category:'health' },

  // ── Phase 2: Directions ───────────────────────────────────────────────────
  UP:      { gloss:'UP',      description:'Index finger points straight up', culturalNote:'UP is directional. ASL uses 3D space to express location, direction, and movement simultaneously.', category:'directions' },
  DOWN:    { gloss:'DOWN',    description:'Index finger points straight down', culturalNote:'DOWN points downward. Directional signs combine with verbs: GO-DOWN, FALL-DOWN.', category:'directions' },
  HERE:    { gloss:'HERE',    description:'Both flat hands circle downward in place', culturalNote:'HERE defines the immediate signing space. Spatial reference is fundamental to ASL grammar.', category:'directions' },
  THERE:   { gloss:'THERE',   description:'Index finger extends outward', culturalNote:'THERE points to an established location. Once set, pointing to it functions like a pronoun.', category:'directions' },
  INSIDE:  { gloss:'INSIDE',  description:'Flat hand enters C-hand (going inside)', culturalNote:'INSIDE/INTO shows something entering a container. Spatial prepositions are 3D in ASL.', category:'directions' },
  OUTSIDE: { gloss:'OUTSIDE', description:'Flat hand exits C-hand (coming out)', culturalNote:'OUTSIDE exits the container — reverse of INSIDE. Classifier handshapes express complex space.', category:'directions' },

  // ── Phase 2: Extended Time ────────────────────────────────────────────────
  HOUR:    { gloss:'HOUR',    description:'Index traces full circle on non-dominant palm (clock hand)', culturalNote:'HOUR shows one full revolution of the minute hand. ASL makes time iconically concrete.', category:'time' },
  MINUTE:  { gloss:'MINUTE',  description:'Index makes a slight arc on non-dominant palm', culturalNote:'MINUTE shows a small movement of the clock hand. Scalar modification is natural in ASL.', category:'time' },
  YEAR:    { gloss:'YEAR',    description:'One fist circles around the other (one orbit = 1 year)', culturalNote:'YEAR shows the Earth orbiting the sun — an astronomical metaphor in the sign itself.', category:'time' },
  ALWAYS:  { gloss:'ALWAYS',  description:'Index circles continuously (ongoing/forever)', culturalNote:'ALWAYS and FOREVER share the same circular motion. Duration is shown by how long you sign.', category:'time' },
  NEVER:   { gloss:'NEVER',   description:'Flat hand arcs sharply downward (cutting off time)', culturalNote:'NEVER cuts the timeline decisively. Combined with head shake, it strongly negates.', category:'time' },
  BEFORE:  { gloss:'BEFORE',  description:'Flat hand behind shoulder (back in time)', culturalNote:'Time in ASL is a physical timeline — past is behind the body, future is ahead.', category:'time' },
  AFTER:   { gloss:'AFTER',   description:'Flat hand arcs forward from wrist (ahead in time)', culturalNote:'AFTER pushes forward on the timeline. LONG-AGO sweeps far back behind the shoulder.', category:'time' },
  DURING:  { gloss:'DURING',  description:'Both index fingers move forward in parallel', culturalNote:'DURING shows two parallel events — concurrent actions on the timeline.', category:'time' },

  // ── Phase 2: Days ─────────────────────────────────────────────────────────
  MONDAY:    { gloss:'MONDAY',    description:'M-hand circles', culturalNote:'Day signs are initialized — MONDAY uses M, TUESDAY uses T, etc.', category:'time' },
  TUESDAY:   { gloss:'TUESDAY',   description:'T-hand circles', culturalNote:'Initialized day signs reflect English contact with ASL, common in American schools.', category:'time' },
  WEDNESDAY: { gloss:'WEDNESDAY', description:'W-hand circles', culturalNote:'WEDNESDAY uses the W-handshape. Regional variations exist across the US.', category:'time' },
  THURSDAY:  { gloss:'THURSDAY',  description:'H-hand circles', culturalNote:'THURSDAY uses H-handshape. Some signers use a TH combination instead.', category:'time' },
  FRIDAY:    { gloss:'FRIDAY',    description:'F-hand circles', culturalNote:'FRIDAY uses F-handshape. In Deaf schools, Fridays meant trips to the wider community.', category:'time' },
  SATURDAY:  { gloss:'SATURDAY',  description:'S-hand circles', culturalNote:'SATURDAY uses S-handshape. Weekends = Deaf clubs, sports, and social gatherings.', category:'time' },
  SUNDAY:    { gloss:'SUNDAY',    description:'Both flat hands circle outward (the sun)', culturalNote:'SUNDAY uses both hands — representing the sun. Deaf churches are important gathering places.', category:'time' },

  // ── Phase 2: Weather ──────────────────────────────────────────────────────
  RAIN: { gloss:'RAIN', description:'Both claw-hands wiggle downward (raindrops)', culturalNote:'RAIN is iconic — wiggling fingers depict falling rain. Weather signs are often cross-linguistically understood.', category:'weather' },
  SUN:  { gloss:'SUN',  description:'Index draws a circle in the sky, then hand opens (rays)', culturalNote:'SUN draws the circle then spreads fingers for rays — beautiful iconicity.', category:'weather' },
  WIND: { gloss:'WIND', description:'Both flat hands sway like blowing wind', culturalNote:'WIND shows air moving. Facial expression shows wind intensity.', category:'weather' },
  SNOW: { gloss:'SNOW', description:'Both open hands flutter downward (snowflakes)', culturalNote:'SNOW flutters gently downward. WINTER adds a shivering motion.', category:'weather' },

  // ── Phase 2: Transport ────────────────────────────────────────────────────
  CAR:    { gloss:'CAR',    description:'Both fists steer an imaginary steering wheel', culturalNote:'CAR mimes steering — iconic and understood by Deaf and hearing alike.', category:'transport' },
  WALK:   { gloss:'WALK',   description:'Both flat hands alternate in a walking motion (feet)', culturalNote:'WALK alternates like walking feet. Direction shows where you are walking.', category:'transport' },
  BUS:    { gloss:'BUS',    description:'B-hands move forward (bus driving)', culturalNote:'BUS uses B-handshapes. Visual alerts on buses are a Deaf accessibility need.', category:'transport' },
  TRAIN:  { gloss:'TRAIN',  description:'V-hands slide forward on each other (tracks)', culturalNote:'TRAIN shows two sets of fingers as tracks. Deaf travelers prefer train\'s visual environment.', category:'transport' },
  HOME:   { gloss:'HOME',   description:'Flat hand taps cheek then near ear (eat + sleep = home)', culturalNote:'HOME = EAT + SLEEP. A beautiful metaphoric compound. The school dorm was Deaf social life.', category:'transport' },
  SCHOOL: { gloss:'SCHOOL', description:'Dominant hand claps on non-dominant palm twice', culturalNote:'SCHOOL claps — the teacher getting attention. Deaf residential schools preserved ASL.', category:'education' },

  // ── Phase 2: Money ────────────────────────────────────────────────────────
  MONEY:     { gloss:'MONEY',     description:'Back of dominant hand taps non-dominant palm', culturalNote:'MONEY shows a bill being tapped — very iconic. Financial equity is a Deaf advocacy topic.', category:'money' },
  PAY:       { gloss:'PAY',       description:'Index on palm pushes forward (handing over payment)', culturalNote:'PAY is directional — signed toward who is being paid. Directionality prevents misunderstanding.', category:'money' },
  FREE:      { gloss:'FREE',      description:'Both F-hands cross at wrists then open outward', culturalNote:'FREE/FREEDOM opens crossed wrists — liberation. Also means "no cost."', category:'money' },
  EXPENSIVE: { gloss:'EXPENSIVE', description:'Money sign then throw away (throwing money away)', culturalNote:'EXPENSIVE throws money away — elegant metaphor. CHEAP uses a different motion.', category:'money' },

  // ── Phase 2: Numbers extended ─────────────────────────────────────────────
  FOUR:  { gloss:'FOUR',  description:'Four fingers extended (all except thumb)', culturalNote:'Numbers 6-9 touch the thumb to other fingers — systematic and efficient.', category:'numbers' },
  SIX:   { gloss:'SIX',   description:'Thumb touches pinky (6)', culturalNote:'SIX touches thumb to pinky. Numbers incorporate into signs: ONE-WEEK, THREE-MONTHS.', category:'numbers' },
  SEVEN: { gloss:'SEVEN', description:'Thumb touches ring finger (7)', culturalNote:'SEVEN touches thumb to ring finger. Essential for dates, prices, and addresses.', category:'numbers' },
  EIGHT: { gloss:'EIGHT', description:'Thumb touches middle finger (8)', culturalNote:'EIGHT touches thumb to middle finger. Number handshapes are incorporated into compound signs.', category:'numbers' },
  NINE:  { gloss:'NINE',  description:'Thumb touches bent index finger (9)', culturalNote:'NINE touches thumb to bent index. ASL numbers are one of the most systematic vocabulary areas.', category:'numbers' },
  ZERO:  { gloss:'ZERO',  description:'O-hand (all fingers meet thumb = 0)', culturalNote:'ZERO uses the O-handshape — also used for NOTHING and NONE.', category:'numbers' },
};

// ── State ─────────────────────────────────────────────────────────────────────
let currentSignKey    = null;
let liveSignsHistory  = [];
const MAX_HISTORY = 12;

// ── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.sp-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.sp-tab').forEach(t => {
      t.classList.toggle('sp-tab--active', t === tab);
      t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
    });
    document.querySelectorAll('.sp-panel').forEach(panel => {
      const isActive = panel.id === `tab-${target}`;
      panel.classList.toggle('sp-panel--active', isActive);
      panel.hidden = !isActive;
    });
    if (target === 'browse') populateBrowseGrid();
    if (target === 'phrasebook') loadPhrasebook();
  });
});

// ── Live tab ──────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SIGNS_UPDATED') {
    updateLiveTab(message.signs || []);
  }
});

function updateLiveTab(signs) {
  if (signs.length === 0) return;

  // Update live indicator
  document.getElementById('live-indicator').className = 'sp-dot sp-dot--active';
  document.getElementById('live-status-text').textContent = 'Receiving signs';
  document.getElementById('live-empty').style.display = 'none';

  // Update caption box with the raw words
  const words = signs.map(s => s.word || s.gloss || '').filter(Boolean).join(' ');
  document.getElementById('caption-box').textContent = words;

  // Update sign chips
  liveSignsHistory = [...signs, ...liveSignsHistory].slice(0, MAX_HISTORY);
  renderLiveChips();

  // Auto-expand the first new sign's detail
  if (signs[0] && signs[0].key) {
    showSignDetail(signs[0].key);
  }
}

function renderLiveChips() {
  const container = document.getElementById('live-signs');
  container.innerHTML = liveSignsHistory.map(s => {
    const isFinger = s.key?.startsWith('FS_');
    const cls = `sp-sign-chip ${s.key === currentSignKey ? 'sp-sign-chip--active' : ''} ${isFinger ? 'sp-sign-chip--fs' : ''}`;
    return `<button class="${cls}" data-key="${s.key || ''}" title="${s.description || s.word || ''}">${(s.word || s.gloss || '').toUpperCase()}</button>`;
  }).join('');

  container.querySelectorAll('.sp-sign-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.key;
      if (key) previewSign(key);
    });
  });
}

function showSignDetail(key) {
  const meta = SIGN_META[key];
  if (!meta) return;

  currentSignKey = key;
  document.getElementById('sign-detail').style.display = 'block';
  document.getElementById('detail-gloss').textContent    = meta.gloss;
  document.getElementById('detail-desc').textContent     = meta.description;
  document.getElementById('detail-cultural-text').textContent = meta.culturalNote;
  document.getElementById('detail-category').textContent = `Category: ${meta.category}`;

  const saveBtn = document.getElementById('btn-save-sign');
  saveBtn.dataset.key = key;
  saveBtn.onclick = () => saveToPhrasebook(key);
}

document.getElementById('btn-save-sign')?.addEventListener('click', async function() {
  await saveToPhrasebook(this.dataset.key);
});

async function saveToPhrasebook(key) {
  const meta = SIGN_META[key];
  if (!meta) return;
  const { savedPhrases = [] } = await storageGet('savedPhrases');
  const entry = { key, gloss: meta.gloss, note: meta.description, savedAt: Date.now() };
  const updated = [entry, ...savedPhrases.filter(p => p.key !== key)].slice(0, 200);
  await chrome.storage.sync.set({ savedPhrases: updated });

  const btn = document.getElementById('btn-save-sign');
  if (btn) {
    btn.textContent = '✓ Saved';
    btn.classList.add('saved');
    showCelebration(); // Elite Sandbox Polish
    setTimeout(() => {
      btn.textContent = '⭐ Save';
      btn.classList.remove('saved');
    }, 2000);
  }
}

function showCelebration() {
  const root = document.getElementById('tab-live');
  const colors = ['#818cf8', '#7dd3fc', '#34d399', '#fbbf24'];
  
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'sp-confetti';
    p.style.left = Math.random() * 100 + '%';
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';
    root.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

// ── Browse tab ────────────────────────────────────────────────────────────────
let browsePopulated = false;

function populateBrowseGrid(filter = '', category = '') {
  const grid = document.getElementById('browse-grid');
  const lower = filter.toLowerCase();

  const entries = Object.entries(SIGN_META).filter(([key, meta]) => {
    if (key.startsWith('__')) return false;
    if (category && meta.category !== category) return false;
    if (lower && !meta.gloss.toLowerCase().includes(lower) &&
                 !meta.description.toLowerCase().includes(lower) &&
                 !key.toLowerCase().includes(lower)) return false;
    return true;
  });

  if (entries.length === 0) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:12px;padding:8px">No signs match your search.</p>';
    return;
  }

  grid.innerHTML = entries.map(([key, meta]) => `
    <div class="sp-browse-card" data-key="${key}" tabindex="0" role="button" aria-label="Preview sign: ${meta.gloss}">
      <div class="sp-bc-gloss">${meta.gloss}</div>
      <div class="sp-bc-desc">${meta.description}</div>
      <div class="sp-bc-cat">${meta.category}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.sp-browse-card').forEach(card => {
    const handleClick = () => {
      const key = card.dataset.key;
      previewSign(key);
      showSignDetail(key);
      // Switch to Live tab to show the detail
      document.querySelector('[data-tab="live"]').click();
    };
    card.addEventListener('click', handleClick);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handleClick(); });
  });

  browsePopulated = true;
}

document.getElementById('browse-search').addEventListener('input', (e) => {
  populateBrowseGrid(e.target.value, document.getElementById('browse-category').value);
});
document.getElementById('browse-category').addEventListener('change', (e) => {
  populateBrowseGrid(document.getElementById('browse-search').value, e.target.value);
});

// ── Phrasebook tab ────────────────────────────────────────────────────────────
async function loadPhrasebook() {
  const { savedPhrases = [] } = await storageGet('savedPhrases');
  const list = document.getElementById('pb-list');
  const empty = document.getElementById('pb-empty');

  if (savedPhrases.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = savedPhrases.map(p => `
    <div class="sp-pb-item" data-key="${p.key}">
      <div class="sp-pb-gloss">${p.gloss}</div>
      <div class="sp-pb-note">${p.note || ''}</div>
      <button class="sp-pb-del" data-key="${p.key}" title="Remove from phrasebook" aria-label="Remove ${p.gloss}">×</button>
    </div>
  `).join('');

  list.querySelectorAll('.sp-pb-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('sp-pb-del')) return;
      previewSign(item.dataset.key);
    });
  });

  list.querySelectorAll('.sp-pb-del').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const key = btn.dataset.key;
      const { savedPhrases: current = [] } = await storageGet('savedPhrases');
      await chrome.storage.sync.set({ savedPhrases: current.filter(p => p.key !== key) });
      loadPhrasebook();
    });
  });
}

// ── Preview a sign in the active tab's avatar ─────────────────────────────────
async function previewSign(key) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'PREVIEW_SIGN', key }).catch(() => {});
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function storageGet(keys) {
  return new Promise(resolve => chrome.storage.sync.get(keys, resolve));
}

// ── Boot ──────────────────────────────────────────────────────────────────────
// Query initial status from the active tab
(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const status = await new Promise((res, rej) => {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' }, r => {
        if (chrome.runtime.lastError) rej(chrome.runtime.lastError);
        else res(r);
      });
    });
    if (status?.strategy) {
      const strategies = { dom: 'Platform captions', speech: 'Microphone (Web Speech)', none: '—' };
      document.getElementById('live-strategy').textContent = strategies[status.strategy] || '';
    }
  } catch { /* not on a supported page */ }
})();
