/**
 * SignBridge — Extended Vocabulary (vocab-10k.js)
 *
 * Lazy-loaded by sign-mapper.js on first unknown word.
 * Maps ~8,000 high-frequency English words → existing SIGNS keys.
 * Loaded via chrome.runtime.getURL() — must be in web_accessible_resources.
 *
 * Strategy: Zipf's Law — 8,000 forms ≈ 85–90% of spoken English text.
 * Words already in WORD_TO_SIGN are not duplicated here.
 */
(function () {
  'use strict';
  var D = window.SignBridge = window.SignBridge || {};
  D.VOCAB_EXT = D.VOCAB_EXT || Object.create(null);
  var V = D.VOCAB_EXT;

  // ── Mental / Cognitive Verbs → THINK ────────────────────────────────────
  V['abstract']='THINK'; V['acknowledge']='THINK'; V['analyze']='THINK';
  V['assessing']='THINK'; V['assume']='THINK'; V['assumes']='THINK';
  V['believed']='THINK'; V['brainstorm']='THINK'; V['categorize']='THINK';
  V['classify']='THINK'; V['cognition']='THINK'; V['cognitive']='THINK';
  V['comprehended']='THINK'; V['conceptualize']='THINK'; V['conclude']='THINK';
  V['concludes']='THINK'; V['conjecture']='THINK'; V['contemplate']='THINK';
  V['contemplating']='THINK'; V['critique']='THINK'; V['critiquing']='THINK';
  V['deduce']='THINK'; V['deliberate']='THINK'; V['derive']='THINK';
  V['discern']='THINK'; V['distinguish']='THINK'; V['envision']='THINK';
  V['evaluate']='THINK'; V['evaluating']='THINK'; V['evaluate']='THINK';
  V['examine']='THINK'; V['examines']='THINK'; V['extrapolate']='THINK';
  V['figure out']='THINK'; V['formulate']='THINK'; V['generalize']='THINK';
  V['hypothesize']='THINK'; V['infer']='THINK'; V['infers']='THINK';
  V['insight']='THINK'; V['inspect']='THINK'; V['intellectual']='THINK';
  V['interpret']='THINK'; V['investigate']='THINK'; V['judge']='THINK';
  V['logical']='THINK'; V['mentally']='THINK'; V['mind']='THINK';
  V['muse']='THINK'; V['notice']='THINK'; V['perceive']='THINK';
  V['philosophical']='THINK'; V['ponder']='THINK'; V['predict']='THINK';
  V['presume']='THINK'; V['process']='THINK'; V['project']='THINK';
  V['propose']='THINK'; V['psychological']='THINK'; V['rationalize']='THINK';
  V['reason']='THINK'; V['reconsider']='THINK'; V['reflect']='THINK';
  V['rethink']='THINK'; V['sense']='THINK'; V['speculate']='THINK';
  V['suppose']='THINK'; V['surmise']='THINK'; V['suspect']='THINK';
  V['theorize']='THINK'; V['thought']='THINK'; V['thoughtful']='THINK';
  V['thoughtfully']='THINK'; V['visualize']='THINK'; V['weigh']='THINK';
  V['wondering']='THINK'; V['mental']='THINK'; V['mindset']='THINK';
  V['outlook']='THINK'; V['viewpoint']='THINK'; V['standpoint']='THINK';
  V['judgment']='THINK'; V['judgement']='THINK'; V['conclusion']='THINK';
  V['deduction']='THINK'; V['inference']='THINK'; V['rationale']='THINK';
  V['logic']='THINK'; V['reasoning']='THINK'; V['intuition']='THINK';
  V['instinct']='THINK'; V['perception']='THINK'; V['consciousness']='THINK';
  V['awareness']='THINK'; V['realization']='THINK'; V['recognition']='THINK';
  V['interpretation']='THINK'; V['evaluation']='THINK'; V['assessment']='THINK';

  // ── Knowledge / Understanding → KNOW ────────────────────────────────────
  V['abilities']='KNOW'; V['academically']='KNOW'; V['adept']='KNOW';
  V['background']='KNOW'; V['capable']='KNOW'; V['certainty']='KNOW';
  V['clarify']='KNOW'; V['clarity']='KNOW'; V['command']='KNOW';
  V['competent']='KNOW'; V['competency']='KNOW'; V['comprehension']='KNOW';
  V['consciousness']='KNOW'; V['credible']='KNOW'; V['credential']='KNOW';
  V['credentials']='KNOW'; V['database']='KNOW'; V['determined']='KNOW';
  V['discernment']='KNOW'; V['education']='KNOW'; V['encyclopedia']='KNOW';
  V['enlightened']='KNOW'; V['enlightenment']='KNOW'; V['established']='KNOW';
  V['evident']='KNOW'; V['experience']='KNOW'; V['experienced']='KNOW';
  V['expertise']='KNOW'; V['expert']='KNOW'; V['fluency']='KNOW';
  V['fluent']='KNOW'; V['foundation']='KNOW'; V['fundamental']='KNOW';
  V['grasp']='KNOW'; V['grounded']='KNOW'; V['guarantee']='KNOW';
  V['identification']='KNOW'; V['identify']='KNOW'; V['informed']='KNOW';
  V['intelligence']='KNOW'; V['intelligent']='KNOW'; V['knowledgeable']='KNOW';
  V['literate']='KNOW'; V['literacy']='KNOW'; V['master']='KNOW';
  V['mastery']='KNOW'; V['memorized']='KNOW'; V['noticed']='KNOW';
  V['objective']='KNOW'; V['observe']='KNOW'; V['perceiving']='KNOW';
  V['perceived']='KNOW'; V['proficiency']='KNOW'; V['proficient']='KNOW';
  V['proven']='KNOW'; V['qualified']='KNOW'; V['qualification']='KNOW';
  V['realized']='KNOW'; V['recognized']='KNOW'; V['reliable']='KNOW';
  V['skilled']='KNOW'; V['smart']='KNOW'; V['sophisticated']='KNOW';
  V['talent']='KNOW'; V['talented']='KNOW'; V['trained']='KNOW';
  V['verified']='KNOW'; V['wisdom']='KNOW'; V['wise']='KNOW';
  V['capable']='KNOW'; V['accurate']='KNOW'; V['consciously']='KNOW';
  V['fact']='KNOW'; V['factual']='KNOW'; V['detail']='KNOW';
  V['details']='KNOW'; V['specifics']='KNOW'; V['evidence']='KNOW';
  V['proof']='KNOW'; V['proven']='KNOW'; V['documented']='KNOW';
  V['verified']='KNOW'; V['confirmed']='KNOW'; V['established']='KNOW';
  V['reliable']='KNOW'; V['credible']='KNOW'; V['trustworthy']='KNOW';

  // ── Learning / Education → LEARN ────────────────────────────────────────
  V['absorb']='LEARN'; V['absorption']='LEARN'; V['achievement']='LEARN';
  V['acquired']='LEARN'; V['acquisition']='LEARN'; V['adapt']='LEARN';
  V['adapted']='LEARN'; V['adaptation']='LEARN'; V['apprentice']='LEARN';
  V['apprenticeship']='LEARN'; V['assimilate']='LEARN'; V['audit']='LEARN';
  V['certification']='LEARN'; V['cognitive learning']='LEARN';
  V['comprehend']='LEARN'; V['concentration']='LEARN'; V['curriculum']='LEARN';
  V['degree']='LEARN'; V['demonstrate']='LEARN'; V['development']='LEARN';
  V['diploma']='LEARN'; V['drill']='LEARN'; V['educated']='LEARN';
  V['educational']='LEARN'; V['elementary']='LEARN'; V['enroll']='LEARN';
  V['enrolled']='LEARN'; V['enrollment']='LEARN'; V['examine']='LEARN';
  V['exercise']='LEARN'; V['expose']='LEARN'; V['field study']='LEARN';
  V['graduate']='LEARN'; V['graduated']='LEARN'; V['graduation']='LEARN';
  V['growth']='LEARN'; V['immerse']='LEARN'; V['immersion']='LEARN';
  V['improve']='LEARN'; V['improving']='LEARN'; V['instruction']='LEARN';
  V['internalize']='LEARN'; V['internship']='LEARN'; V['introduction']='LEARN';
  V['literacy']='LEARN'; V['master']='LEARN'; V['mastered']='LEARN';
  V['module']='LEARN'; V['orientation']='LEARN'; V['practice']='LEARN';
  V['practiced']='LEARN'; V['practicum']='LEARN'; V['preparation']='LEARN';
  V['primary']='LEARN'; V['progression']='LEARN'; V['quiz']='LEARN';
  V['retain']='LEARN'; V['retention']='LEARN'; V['revision']='LEARN';
  V['schooling']='LEARN'; V['secondary']='LEARN'; V['self-study']='LEARN';
  V['seminar']='LEARN'; V['session']='LEARN'; V['skill-building']='LEARN';
  V['student']='LEARN'; V['studying']='LEARN'; V['syllabus']='LEARN';
  V['taught']='LEARN'; V['teaching']='LEARN'; V['theory']='LEARN';
  V['training']='LEARN'; V['tutorial']='LEARN'; V['unit']='LEARN';
  V['workshop']='LEARN'; V['coursework']='LEARN'; V['textbook']='LEARN';
  V['assignment']='LEARN'; V['lecture']='LEARN'; V['lesson']='LEARN';
  V['class']='LEARN'; V['undergraduate']='LEARN'; V['postgraduate']='LEARN';
  V['postdoc']='LEARN'; V['scholarship']='LEARN'; V['fellowship']='LEARN';

  // ── Study / Academic Work → STUDY ───────────────────────────────────────
  V['analysis']='STUDY'; V['annotate']='STUDY'; V['benchmark']='STUDY';
  V['calculation']='STUDY'; V['cite']='STUDY'; V['citation']='STUDY';
  V['compare']='STUDY'; V['comparison']='STUDY'; V['conduct']='STUDY';
  V['cross-reference']='STUDY'; V['data']='STUDY'; V['dataset']='STUDY';
  V['dedicate']='STUDY'; V['deliberate']='STUDY'; V['diligent']='STUDY';
  V['diligence']='STUDY'; V['dissertation']='STUDY'; V['essay']='STUDY';
  V['evaluate']='STUDY'; V['experiment']='STUDY'; V['experimentation']='STUDY';
  V['explore']='STUDY'; V['findings']='STUDY'; V['focus']='STUDY';
  V['focused']='STUDY'; V['formula']='STUDY'; V['framework']='STUDY';
  V['hypothesis']='STUDY'; V['implement']='STUDY'; V['inquiry']='STUDY';
  V['investigate']='STUDY'; V['investigation']='STUDY'; V['laboratory']='STUDY';
  V['lab']='STUDY'; V['literature review']='STUDY'; V['measure']='STUDY';
  V['methodology']='STUDY'; V['methods']='STUDY'; V['model']='STUDY';
  V['observe']='STUDY'; V['observation']='STUDY'; V['outline']='STUDY';
  V['paper']='STUDY'; V['peer review']='STUDY'; V['phenomenon']='STUDY';
  V['prepare']='STUDY'; V['problem solving']='STUDY'; V['procedure']='STUDY';
  V['protocol']='STUDY'; V['publication']='STUDY'; V['pursue']='STUDY';
  V['reference']='STUDY'; V['rehearse']='STUDY'; V['research']='STUDY';
  V['researcher']='STUDY'; V['result']='STUDY'; V['results']='STUDY';
  V['sample']='STUDY'; V['scientific']='STUDY'; V['simulation']='STUDY';
  V['solve']='STUDY'; V['solution']='STUDY'; V['source']='STUDY';
  V['statistical']='STUDY'; V['statistics']='STUDY'; V['survey']='STUDY';
  V['test case']='STUDY'; V['thesis']='STUDY'; V['trial']='STUDY';
  V['variable']='STUDY'; V['verify']='STUDY'; V['work on']='STUDY';

  // ── Writing / Documentation → WRITE ─────────────────────────────────────
  V['author']='WRITE'; V['authoring']='WRITE'; V['blog']='WRITE';
  V['caption']='WRITE'; V['communicate']='WRITE'; V['content']='WRITE';
  V['contribute']='WRITE'; V['copy']='WRITE'; V['correspond']='WRITE';
  V['correspondence']='WRITE'; V['create content']='WRITE'; V['describe']='WRITE';
  V['dictate']='WRITE'; V['encode']='WRITE'; V['format']='WRITE';
  V['formulate']='WRITE'; V['inscribe']='WRITE'; V['itemize']='WRITE';
  V['jot down']='WRITE'; V['journaling']='WRITE'; V['list']='WRITE';
  V['log']='WRITE'; V['narrate']='WRITE'; V['outline']='WRITE';
  V['paste']='WRITE'; V['pen']='WRITE'; V['post']='WRITE';
  V['print']='WRITE'; V['program']='WRITE'; V['proofread']='WRITE';
  V['publish']='WRITE'; V['register']='WRITE'; V['respond']='WRITE';
  V['scribe']='WRITE'; V['script']='WRITE'; V['sketch']='WRITE';
  V['structure']='WRITE'; V['submit']='WRITE'; V['summarize']='WRITE';
  V['transcribe']='WRITE'; V['typed']='WRITE'; V['update']='WRITE';
  V['code']='WRITE'; V['coding']='WRITE'; V['program']='WRITE';
  V['programming']='WRITE'; V['software']='WRITE'; V['algorithm']='WRITE';
  V['function']='WRITE'; V['variable']='WRITE'; V['syntax']='WRITE';
  V['debug']='WRITE'; V['debugging']='WRITE'; V['script']='WRITE';

  // ── Reading / Comprehension → READ ──────────────────────────────────────
  V['article']='READ'; V['biography']='READ'; V['booklet']='READ';
  V['chapter']='READ'; V['comprehend']='READ'; V['digest']='READ';
  V['encyclopedia']='READ'; V['fiction']='READ'; V['guide']='READ';
  V['handbook']='READ'; V['index']='READ'; V['information']='READ';
  V['interpret']='READ'; V['journal']='READ'; V['magazine']='READ';
  V['manual']='READ'; V['material']='READ'; V['newspaper']='READ';
  V['nonfiction']='READ'; V['notice']='READ'; V['novel']='READ';
  V['page']='READ'; V['pamphlet']='READ'; V['paragraph']='READ';
  V['parse']='READ'; V['passage']='READ'; V['peruse']='READ';
  V['poem']='READ'; V['poetry']='READ'; V['post']='READ';
  V['publication']='READ'; V['report']='READ'; V['sentence']='READ';
  V['sign']='READ'; V['story']='READ'; V['subscribe']='READ';
  V['subtitle']='READ'; V['summary']='READ'; V['text']='READ';
  V['title']='READ'; V['volume']='READ'; V['website']='READ';
  V['wiki']='READ'; V['word']='READ'; V['words']='READ';

  // ── Communicating / Speaking → SAY ──────────────────────────────────────
  V['address']='SAY'; V['advise']='SAY'; V['affirm']='SAY';
  V['alert']='SAY'; V['announce']='SAY'; V['argue']='SAY';
  V['articulate']='SAY'; V['assert']='SAY'; V['broadcast']='SAY';
  V['clarify']='SAY'; V['claim']='SAY'; V['comment']='SAY';
  V['confess']='SAY'; V['confirm']='SAY'; V['converse']='SAY';
  V['convey']='SAY'; V['declare']='SAY'; V['define']='SAY';
  V['disclose']='SAY'; V['discuss']='SAY'; V['elaborate']='SAY';
  V['emphasize']='SAY'; V['engage']='SAY'; V['explain']='SAY';
  V['express']='SAY'; V['inform']='SAY'; V['instruct']='SAY';
  V['introduce']='SAY'; V['narrate']='SAY'; V['notify']='SAY';
  V['phrase']='SAY'; V['present']='SAY'; V['proclaim']='SAY';
  V['pronounce']='SAY'; V['quote']='SAY'; V['reassure']='SAY';
  V['recommend']='SAY'; V['rephrase']='SAY'; V['repeat']='SAY';
  V['rethink']='SAY'; V['reveal']='SAY'; V['share']='SAY';
  V['specify']='SAY'; V['statement']='SAY'; V['stress']='SAY';
  V['suggest']='SAY'; V['utter']='SAY'; V['verbalize']='SAY';
  V['voice']='SAY'; V['warn']='SAY'; V['verbal']='SAY';
  V['vocalize']='SAY'; V['articulation']='SAY'; V['dialogue']='SAY';
  V['conversation']='SAY'; V['discourse']='SAY'; V['speech']='SAY';
  V['communication']='SAY'; V['message']='SAY'; V['messaging']='SAY';
  V['announcement']='SAY'; V['declaration']='SAY'; V['statement']='SAY';
  V['presentation']='SAY'; V['speech']='SAY'; V['lecture']='SAY';
  V['talk']='SAY'; V['talking']='SAY'; V['talked']='SAY';

  // ── Creating / Building → MAKE ──────────────────────────────────────────
  V['assemble']='MAKE'; V['assembled']='MAKE'; V['assembly']='MAKE';
  V['author']='MAKE'; V['blueprint']='MAKE'; V['compile']='MAKE';
  V['compose']='MAKE'; V['configure']='MAKE'; V['construct']='MAKE';
  V['construction']='MAKE'; V['customize']='MAKE'; V['engineer']='MAKE';
  V['engineering']='MAKE'; V['establish']='MAKE'; V['fabricate']='MAKE';
  V['forge']='MAKE'; V['formulate']='MAKE'; V['found']='MAKE';
  V['generate']='MAKE'; V['implement']='MAKE'; V['initiate']='MAKE';
  V['innovate']='MAKE'; V['innovation']='MAKE'; V['integrate']='MAKE';
  V['invent']='MAKE'; V['invention']='MAKE'; V['launch']='MAKE';
  V['manufacture']='MAKE'; V['manufacturing']='MAKE'; V['model']='MAKE';
  V['organize']='MAKE'; V['originate']='MAKE'; V['plan']='MAKE';
  V['prepare']='MAKE'; V['produce']='MAKE'; V['production']='MAKE';
  V['program']='MAKE'; V['prototype']='MAKE'; V['publish']='MAKE';
  V['set up']='MAKE'; V['structure']='MAKE'; V['synthesize']='MAKE';
  V['yield']='MAKE'; V['built']='MAKE'; V['rebuild']='MAKE';
  V['create']='MAKE'; V['creation']='MAKE'; V['creator']='MAKE';
  V['design']='MAKE'; V['designer']='MAKE'; V['developer']='MAKE';
  V['engineer']='MAKE'; V['inventor']='MAKE'; V['builder']='MAKE';

  // ── Physical Actions → MOVE ──────────────────────────────────────────────
  V['advance']='MOVE'; V['approach']='MOVE'; V['ascend']='MOVE';
  V['carry']='MOVE'; V['circulate']='MOVE'; V['commute']='MOVE';
  V['cross']='MOVE'; V['descend']='MOVE'; V['direct']='MOVE';
  V['distribute']='MOVE'; V['escape']='MOVE'; V['evacuate']='MOVE';
  V['exit']='MOVE'; V['flow']='MOVE'; V['fly']='MOVE';
  V['follow']='MOVE'; V['guide']='MOVE'; V['head']='MOVE';
  V['journey']='MOVE'; V['lead']='MOVE'; V['navigate']='MOVE';
  V['pace']='MOVE'; V['pass']='MOVE'; V['proceed']='MOVE';
  V['progress']='MOVE'; V['pursue']='MOVE'; V['reach']='MOVE';
  V['return']='MOVE'; V['route']='MOVE'; V['sail']='MOVE';
  V['slide']='MOVE'; V['soar']='MOVE'; V['step']='MOVE';
  V['turn']='MOVE'; V['wander']='MOVE'; V['migrate']='MOVE';
  V['traverse']='MOVE'; V['transit']='MOVE'; V['path']='MOVE';
  V['direction']='MOVE'; V['destination']='MOVE'; V['journey']='MOVE';
  V['voyage']='MOVE'; V['expedition']='MOVE'; V['trip']='MOVE';
  V['tour']='MOVE'; V['touring']='MOVE'; V['toured']='MOVE';
  V['aircraft']='MOVE'; V['flight']='MOVE'; V['flying']='MOVE';
  V['plane']='MOVE'; V['airplane']='MOVE'; V['airport']='MOVE';
  V['ship']='MOVE'; V['boat']='MOVE'; V['ferry']='MOVE';
  V['bicycle']='WALK'; V['bike']='WALK'; V['cycling']='WALK';
  V['cyclist']='WALK'; V['pedestrian']='WALK'; V['stride']='WALK';
  V['striding']='WALK'; V['trod']='WALK'; V['trekking']='WALK';
  V['trek']='WALK'; V['march']='WALK'; V['marching']='WALK';

  // ── Taking / Receiving → TAKE ─────────────────────────────────────────────
  V['accept']='TAKE'; V['accepted']='TAKE'; V['acceptance']='TAKE';
  V['achieve']='TAKE'; V['adopt']='TAKE'; V['borrow']='TAKE';
  V['capture']='TAKE'; V['claim']='TAKE'; V['claimed']='TAKE';
  V['collect']='TAKE'; V['download']='TAKE'; V['earn']='TAKE';
  V['earned']='TAKE'; V['earnings']='TAKE'; V['extract']='TAKE';
  V['gain']='TAKE'; V['gains']='TAKE'; V['harvest']='TAKE';
  V['import']='TAKE'; V['obtain']='TAKE'; V['obtained']='TAKE';
  V['recover']='TAKE'; V['reclaim']='TAKE'; V['retrieve']='TAKE';
  V['retrieved']='TAKE'; V['retrieval']='TAKE'; V['secure']='TAKE';
  V['secured']='TAKE'; V['select']='TAKE'; V['selected']='TAKE';
  V['win']='TAKE'; V['winning']='TAKE'; V['won']='TAKE';
  V['receipt']='TAKE'; V['reception']='TAKE'; V['intake']='TAKE';
  V['capture']='TAKE'; V['seized']='TAKE'; V['absorbed']='TAKE';

  // ── Giving / Providing → GIVE ─────────────────────────────────────────────
  V['allocate']='GIVE'; V['allocation']='GIVE'; V['assign']='GIVE';
  V['assigned']='GIVE'; V['assignment']='GIVE'; V['award']='GIVE';
  V['awarded']='GIVE'; V['contribute']='GIVE'; V['contribution']='GIVE';
  V['dedicate']='GIVE'; V['donate']='GIVE'; V['distribution']='GIVE';
  V['enable']='GIVE'; V['export']='GIVE'; V['extend']='GIVE';
  V['extension']='GIVE'; V['fund']='GIVE'; V['funding']='GIVE';
  V['grant']='GIVE'; V['introduce']='GIVE'; V['introduction']='GIVE';
  V['issue']='GIVE'; V['lend']='GIVE'; V['lending']='GIVE';
  V['offer']='GIVE'; V['offering']='GIVE'; V['permit']='GIVE';
  V['provision']='GIVE'; V['provide']='GIVE'; V['release']='GIVE';
  V['resource']='GIVE'; V['resources']='GIVE'; V['reward']='GIVE';
  V['rewarded']='GIVE'; V['supply']='GIVE'; V['supplied']='GIVE';
  V['yield']='GIVE'; V['generous']='GIVE'; V['generosity']='GIVE';
  V['contribution']='GIVE'; V['donation']='GIVE'; V['gift']='GIVE';
  V['gifts']='GIVE'; V['offering']='GIVE'; V['charity']='GIVE';
  V['charitable']='GIVE'; V['volunteer']='GIVE'; V['volunteering']='GIVE';

  // ── Sending / Transmitting → SEND ─────────────────────────────────────────
  V['broadcast']='SEND'; V['circulate']='SEND'; V['deploy']='SEND';
  V['dispatch']='SEND'; V['distribute']='SEND'; V['export']='SEND';
  V['forward']='SEND'; V['inject']='SEND'; V['input']='SEND';
  V['notify']='SEND'; V['output']='SEND'; V['push']='SEND';
  V['queue']='SEND'; V['relay']='SEND'; V['replicate']='SEND';
  V['route']='SEND'; V['ship']='SEND'; V['submit']='SEND';
  V['sync']='SEND'; V['synchronize']='SEND'; V['transmit']='SEND';
  V['transmission']='SEND'; V['upload']='SEND'; V['uploaded']='SEND';
  V['transport']='SEND'; V['delivery']='SEND'; V['shipping']='SEND';
  V['dispatch']='SEND'; V['notification']='SEND'; V['alert']='SEND';

  // ── Finding / Searching → FIND ────────────────────────────────────────────
  V['accomplish']='FIND'; V['acquire']='FIND'; V['achieve']='FIND';
  V['check']='FIND'; V['confirm']='FIND'; V['detect']='FIND';
  V['diagnose']='FIND'; V['diagnosis']='FIND'; V['exam']='FIND';
  V['extract']='FIND'; V['inspect']='FIND'; V['investigate']='FIND';
  V['locate']='FIND'; V['measure']='FIND'; V['observation']='FIND';
  V['pinpoint']='FIND'; V['probe']='FIND'; V['query']='FIND';
  V['recognize']='FIND'; V['research']='FIND'; V['resolve']='FIND';
  V['retrieve']='FIND'; V['scan']='FIND'; V['screen']='FIND';
  V['seek']='FIND'; V['sort']='FIND'; V['test']='FIND';
  V['trace']='FIND'; V['track']='FIND'; V['uncover']='FIND';
  V['investigation']='FIND'; V['inquiry']='FIND'; V['examination']='FIND';
  V['inspection']='FIND'; V['detection']='FIND'; V['discovery']='FIND';

  // ── Working / Operating → WORK ────────────────────────────────────────────
  V['accomplish']='WORK'; V['activate']='WORK'; V['administer']='WORK';
  V['administration']='WORK'; V['business']='WORK'; V['career']='WORK';
  V['collaborate']='WORK'; V['collaboration']='WORK'; V['compete']='WORK';
  V['coordinate']='WORK'; V['corporation']='WORK'; V['department']='WORK';
  V['deploy']='WORK'; V['direction']='WORK'; V['efficiency']='WORK';
  V['employee']='WORK'; V['employer']='WORK'; V['enterprise']='WORK';
  V['execute']='WORK'; V['fulfill']='WORK'; V['function']='WORK';
  V['handle']='WORK'; V['industry']='WORK'; V['initiative']='WORK';
  V['manage']='WORK'; V['manager']='WORK'; V['manufacture']='WORK';
  V['mission']='WORK'; V['monitor']='WORK'; V['objective']='WORK';
  V['operate']='WORK'; V['organization']='WORK'; V['oversee']='WORK';
  V['perform']='WORK'; V['performance']='WORK'; V['position']='WORK';
  V['professional']='WORK'; V['project']='WORK'; V['run']='WORK';
  V['serve']='WORK'; V['staff']='WORK'; V['strategy']='WORK';
  V['supervise']='WORK'; V['team']='WORK'; V['technology']='WORK';
  V['workforce']='WORK'; V['workplace']='WORK'; V['role']='WORK';
  V['responsibility']='WORK'; V['responsibilities']='WORK'; V['task']='WORK';
  V['assignment']='WORK'; V['project']='WORK'; V['deadline']='WORK';
  V['meeting']='WORK'; V['agenda']='WORK'; V['schedule']='WORK';

  // ── Helping / Supporting → HELP ───────────────────────────────────────────
  V['accommodate']='HELP'; V['advocate']='HELP'; V['back']='HELP';
  V['benefit']='HELP'; V['bolster']='HELP'; V['champion']='HELP';
  V['collaborate']='HELP'; V['defend']='HELP'; V['empower']='HELP';
  V['enable']='HELP'; V['encourage']='HELP'; V['endorses']='HELP';
  V['facilitate']='HELP'; V['guidance']='HELP'; V['improve']='HELP';
  V['mentor']='HELP'; V['nurture']='HELP'; V['promote']='HELP';
  V['protect']='HELP'; V['reinforce']='HELP'; V['remedy']='HELP';
  V['rescue']='HELP'; V['resolve']='HELP'; V['service']='HELP';
  V['simplify']='HELP'; V['solve']='HELP'; V['sponsor']='HELP';
  V['strengthen']='HELP'; V['uplift']='HELP'; V['welfare']='HELP';
  V['supporter']='HELP'; V['assistance']='HELP'; V['aid']='HELP';
  V['relief']='HELP'; V['intervention']='HELP'; V['care']='HELP';
  V['caretaker']='HELP'; V['caregiver']='HELP'; V['volunteer']='HELP';

  // ── Showing / Demonstrating → SHOW ────────────────────────────────────────
  V['appear']='SHOW'; V['clarify']='SHOW'; V['communicate']='SHOW';
  V['confirm']='SHOW'; V['convey']='SHOW'; V['demonstrate']='SHOW';
  V['display']='SHOW'; V['distribute']='SHOW'; V['exhibit']='SHOW';
  V['highlight']='SHOW'; V['illustrate']='SHOW'; V['indicate']='SHOW';
  V['introduce']='SHOW'; V['manifest']='SHOW'; V['present']='SHOW';
  V['project']='SHOW'; V['prove']='SHOW'; V['reveal']='SHOW';
  V['signify']='SHOW'; V['visualize']='SHOW'; V['expose']='SHOW';
  V['representation']='SHOW'; V['demonstration']='SHOW'; V['exhibition']='SHOW';
  V['illustration']='SHOW'; V['example']='SHOW'; V['sample']='SHOW';
  V['instance']='SHOW'; V['model']='SHOW'; V['prototype']='SHOW';

  // ── Teaching / Instructing → TEACH ────────────────────────────────────────
  V['coach']='TEACH'; V['counsel']='TEACH'; V['demonstrate']='TEACH';
  V['develop']='TEACH'; V['direct']='TEACH'; V['educate']='TEACH';
  V['facilitate']='TEACH'; V['guide']='TEACH'; V['inform']='TEACH';
  V['instructor']='TEACH'; V['instruct']='TEACH'; V['lecture']='TEACH';
  V['mentor']='TEACH'; V['motivate']='TEACH'; V['professor']='TEACH';
  V['teach']='TEACH'; V['trainer']='TEACH'; V['tutor']='TEACH';
  V['professor']='TEACH'; V['lecturer']='TEACH'; V['facilitator']='TEACH';
  V['educator']='TEACH'; V['curriculum']='TEACH'; V['pedagogy']='TEACH';
  V['pedagogical']='TEACH'; V['instructional']='TEACH'; V['academic']='TEACH';

  // ── Positive States → GOOD ────────────────────────────────────────────────
  V['acceptable']='GOOD'; V['admirable']='GOOD'; V['adequate']='GOOD';
  V['appropriate']='GOOD'; V['beneficial']='GOOD'; V['capable']='GOOD';
  V['competent']='GOOD'; V['decent']='GOOD'; V['desirable']='GOOD';
  V['effective']='GOOD'; V['efficient']='GOOD'; V['excellent']='GOOD';
  V['exceptional']='GOOD'; V['favorable']='GOOD'; V['fine']='GOOD';
  V['fitting']='GOOD'; V['genuine']='GOOD'; V['honest']='GOOD';
  V['ideal']='GOOD'; V['incredible']='GOOD'; V['magnificent']='GOOD';
  V['merit']='GOOD'; V['noble']='GOOD'; V['outstanding']='GOOD';
  V['perfect']='GOOD'; V['positive']='GOOD'; V['quality']='GOOD';
  V['reliable']='GOOD'; V['remarkable']='GOOD'; V['respectable']='GOOD';
  V['satisfactory']='GOOD'; V['skilled']='GOOD'; V['solid']='GOOD';
  V['sound']='GOOD'; V['superior']='GOOD'; V['superb']='GOOD';
  V['suitable']='GOOD'; V['trustworthy']='GOOD'; V['valid']='GOOD';
  V['valuable']='GOOD'; V['virtuous']='GOOD'; V['wonderful']='GOOD';
  V['worthy']='GOOD'; V['wholesome']='GOOD'; V['upstanding']='GOOD';
  V['ethical']='GOOD'; V['moral']='GOOD'; V['fair']='GOOD';
  V['just']='GOOD'; V['honest']='GOOD'; V['sincere']='GOOD';
  V['genuine']='GOOD'; V['authentic']='GOOD'; V['real']='GOOD';
  V['true']='GOOD'; V['legit']='GOOD'; V['legitimate']='GOOD';
  V['professional']='GOOD'; V['polished']='GOOD'; V['refined']='GOOD';
  V['eloquent']='GOOD'; V['articulate']='GOOD'; V['skillful']='GOOD';

  // ── Negative States → BAD ─────────────────────────────────────────────────
  V['abysmal']='BAD'; V['awful']='BAD'; V['broken']='BAD';
  V['corrupt']='BAD'; V['damaging']='BAD'; V['defective']='BAD';
  V['deficient']='BAD'; V['destructive']='BAD'; V['disastrous']='BAD';
  V['disgraceful']='BAD'; V['dysfunctional']='BAD'; V['evil']='BAD';
  V['faulty']='BAD'; V['flawed']='BAD'; V['harmful']='BAD';
  V['horrible']='BAD'; V['improper']='BAD'; V['inadequate']='BAD';
  V['inferior']='BAD'; V['irresponsible']='BAD'; V['lousy']='BAD';
  V['malicious']='BAD'; V['miserable']='BAD'; V['negative']='BAD';
  V['pathetic']='BAD'; V['poor']='BAD'; V['problematic']='BAD';
  V['shameful']='BAD'; V['terrible']='BAD'; V['toxic']='BAD';
  V['tragic']='BAD'; V['unacceptable']='BAD'; V['unethical']='BAD';
  V['unsafe']='BAD'; V['unsuitable']='BAD'; V['useless']='BAD';
  V['wicked']='BAD'; V['awful']='BAD'; V['dreadful']='BAD';
  V['horrific']='BAD'; V['catastrophic']='BAD'; V['devastating']='BAD';
  V['deplorable']='BAD'; V['reprehensible']='BAD'; V['inexcusable']='BAD';
  V['unethical']='BAD'; V['immoral']='BAD'; V['criminal']='BAD';
  V['illegal']='BAD'; V['unlawful']='BAD'; V['forbidden']='BAD';
  V['prohibited']='BAD'; V['banned']='BAD'; V['restricted']='BAD';

  // ── Big / Large → BIG ─────────────────────────────────────────────────────
  V['abundant']='BIG'; V['ample']='BIG'; V['capacious']='BIG';
  V['comprehensive']='BIG'; V['considerable']='BIG'; V['colossal']='BIG';
  V['dominant']='BIG'; V['elevated']='BIG'; V['expanded']='BIG';
  V['expansive']='BIG'; V['extensive']='BIG'; V['extra']='BIG';
  V['gigantic']='BIG'; V['grand']='BIG'; V['great']='BIG';
  V['immense']='BIG'; V['impressive']='BIG'; V['infinite']='BIG';
  V['intense']='BIG'; V['mighty']='BIG'; V['monumental']='BIG';
  V['overwhelming']='BIG'; V['plentiful']='BIG'; V['powerful']='BIG';
  V['prominent']='BIG'; V['remarkable']='BIG'; V['spacious']='BIG';
  V['spectacular']='BIG'; V['staggering']='BIG'; V['towering']='BIG';
  V['tremendous']='BIG'; V['widespread']='BIG'; V['worldwide']='BIG';
  V['global']='BIG'; V['universal']='BIG'; V['total']='BIG';
  V['complete']='BIG'; V['entire']='BIG'; V['whole']='BIG';
  V['maximum']='BIG'; V['maximal']='BIG'; V['ultimate']='BIG';
  V['top']='BIG'; V['peak']='BIG'; V['highest']='BIG';

  // ── Small / Little → SMALL ───────────────────────────────────────────────
  V['compact']='SMALL'; V['concise']='SMALL'; V['condensed']='SMALL';
  V['dim']='SMALL'; V['elementary']='SMALL'; V['few']='SMALL';
  V['finite']='SMALL'; V['minimal']='SMALL'; V['minimum']='SMALL';
  V['modest']='SMALL'; V['negligible']='SMALL'; V['particular']='SMALL';
  V['reduced']='SMALL'; V['restricted']='SMALL'; V['scarce']='SMALL';
  V['scarcely']='SMALL'; V['slim']='SMALL'; V['spare']='SMALL';
  V['sparse']='SMALL'; V['specific']='SMALL'; V['subtle']='SMALL';
  V['thin']='SMALL'; V['weak']='SMALL'; V['minor']='SMALL';
  V['micro']='SMALL'; V['nano']='SMALL'; V['micro']='SMALL';
  V['insufficient']='SMALL'; V['inadequate']='SMALL'; V['limited']='SMALL';
  V['constrained']='SMALL'; V['narrow']='SMALL'; V['tight']='SMALL';

  // ── Fast / Quick → FAST ───────────────────────────────────────────────────
  V['accelerate']='FAST'; V['aggressive']='FAST'; V['deadline']='FAST';
  V['dynamic']='FAST'; V['effective']='FAST'; V['efficient']='FAST';
  V['energetic']='FAST'; V['frequent']='FAST'; V['hasty']='FAST';
  V['hurry']='FAST'; V['hurried']='FAST'; V['intense']='FAST';
  V['nimble']='FAST'; V['proactive']='FAST'; V['rush']='FAST';
  V['rushing']='FAST'; V['rushed']='FAST'; V['sharp']='FAST';
  V['sudden']='FAST'; V['suddenly']='FAST'; V['surge']='FAST';
  V['urgent']='FAST'; V['urgency']='FAST'; V['velocity']='FAST';
  V['agile']='FAST'; V['responsive']='FAST'; V['reactive']='FAST';
  V['instantaneous']='FAST'; V['instaneously']='FAST'; V['snap']='FAST';
  V['zoom']='FAST'; V['dash']='FAST'; V['sprint']='FAST';
  V['race']='FAST'; V['racing']='FAST'; V['raced']='FAST';
  V['speed']='FAST'; V['speeding']='FAST'; V['acceleration']='FAST';

  // ── Slow / Gradual → SLOW ─────────────────────────────────────────────────
  V['careful']='SLOW'; V['cautious']='SLOW'; V['deliberate']='SLOW';
  V['gentle']='SLOW'; V['gradual']='SLOW'; V['gradual']='SLOW';
  V['incremental']='SLOW'; V['measured']='SLOW'; V['moderate']='SLOW';
  V['moderately']='SLOW'; V['moderate']='SLOW'; V['patient']='SLOW';
  V['patiently']='SLOW'; V['peaceful']='SLOW'; V['quietly']='SLOW';
  V['restrained']='SLOW'; V['smooth']='SLOW'; V['smoothly']='SLOW';
  V['steady']='SLOW'; V['steadily']='SLOW'; V['systematic']='SLOW';
  V['systematically']='SLOW'; V['thorough']='SLOW'; V['thoroughly']='SLOW';
  V['tranquil']='SLOW'; V['unhurried']='SLOW'; V['lazy']='SLOW';

  // ── Beautiful / Aesthetic → BEAUTIFUL ────────────────────────────────────
  V['aesthetic']='BEAUTIFUL'; V['appealing']='BEAUTIFUL'; V['artistic']='BEAUTIFUL';
  V['breathtaking']='BEAUTIFUL'; V['captivating']='BEAUTIFUL'; V['charming']='BEAUTIFUL';
  V['cute']='BEAUTIFUL'; V['dazzling']='BEAUTIFUL'; V['delightful']='BEAUTIFUL';
  V['divine']='BEAUTIFUL'; V['enchanting']='BEAUTIFUL'; V['exquisite']='BEAUTIFUL';
  V['fascinating']='BEAUTIFUL'; V['fine']='BEAUTIFUL'; V['glamorous']='BEAUTIFUL';
  V['glorious']='BEAUTIFUL'; V['graceful']='BEAUTIFUL'; V['inspiring']='BEAUTIFUL';
  V['luminous']='BEAUTIFUL'; V['majestic']='BEAUTIFUL'; V['marvelous']='BEAUTIFUL';
  V['phenomenal']='BEAUTIFUL'; V['picturesque']='BEAUTIFUL'; V['radiant']='BEAUTIFUL';
  V['refined']='BEAUTIFUL'; V['scenic']='BEAUTIFUL'; V['sensational']='BEAUTIFUL';
  V['serene']='BEAUTIFUL'; V['spectacular']='BEAUTIFUL'; V['splendid']='BEAUTIFUL';
  V['striking']='BEAUTIFUL'; V['stunning']='BEAUTIFUL'; V['sublime']='BEAUTIFUL';
  V['superb']='BEAUTIFUL'; V['vibrant']='BEAUTIFUL'; V['vivid']='BEAUTIFUL';
  V['wondrous']='BEAUTIFUL'; V['artful']='BEAUTIFUL'; V['decorative']='BEAUTIFUL';
  V['ornate']='BEAUTIFUL'; V['elaborate']='BEAUTIFUL'; V['intricate']='BEAUTIFUL';
  V['symmetrical']='BEAUTIFUL'; V['proportional']='BEAUTIFUL';

  // ── Important / Critical → IMPORTANT ─────────────────────────────────────
  V['central']='IMPORTANT'; V['chief']='IMPORTANT'; V['decisive']='IMPORTANT';
  V['dominant']='IMPORTANT'; V['eminent']='IMPORTANT'; V['essential']='IMPORTANT';
  V['foremost']='IMPORTANT'; V['foundational']='IMPORTANT'; V['indispensable']='IMPORTANT';
  V['integral']='IMPORTANT'; V['invaluable']='IMPORTANT'; V['irreplaceable']='IMPORTANT';
  V['leading']='IMPORTANT'; V['mandatory']='IMPORTANT'; V['notable']='IMPORTANT';
  V['outstanding']='IMPORTANT'; V['paramount']='IMPORTANT'; V['pivotal']='IMPORTANT';
  V['preeminent']='IMPORTANT'; V['pressing']='IMPORTANT'; V['primary']='IMPORTANT';
  V['required']='IMPORTANT'; V['seminal']='IMPORTANT'; V['strategic']='IMPORTANT';
  V['valuable']='IMPORTANT'; V['weighty']='IMPORTANT'; V['pressing']='IMPORTANT';
  V['compelling']='IMPORTANT'; V['relevant']='IMPORTANT'; V['critical']='IMPORTANT';
  V['crucial']='IMPORTANT'; V['imperative']='IMPORTANT'; V['obligatory']='IMPORTANT';

  // ── Correct / Accurate → CORRECT ─────────────────────────────────────────
  V['accurate']='CORRECT'; V['appropriate']='CORRECT'; V['certified']='CORRECT';
  V['confirmed']='CORRECT'; V['consistent']='CORRECT'; V['established']='CORRECT';
  V['exact']='CORRECT'; V['factual']='CORRECT'; V['flawless']='CORRECT';
  V['formal']='CORRECT'; V['genuine']='CORRECT'; V['ideal']='CORRECT';
  V['legal']='CORRECT'; V['legitimate']='CORRECT'; V['logically']='CORRECT';
  V['perfect']='CORRECT'; V['precise']='CORRECT'; V['proper']='CORRECT';
  V['proven']='CORRECT'; V['qualified']='CORRECT'; V['relevant']='CORRECT';
  V['rightful']='CORRECT'; V['satisfying']='CORRECT'; V['sound']='CORRECT';
  V['truthful']='CORRECT'; V['validated']='CORRECT'; V['verified']='CORRECT';
  V['valid']='CORRECT'; V['exact']='CORRECT'; V['definitive']='CORRECT';
  V['authoritative']='CORRECT'; V['official']='CORRECT'; V['standard']='CORRECT';
  V['normal']='CORRECT'; V['regular']='CORRECT'; V['typical']='CORRECT';
  V['conventional']='CORRECT'; V['orthodox']='CORRECT'; V['accepted']='CORRECT';

  // ── Wrong / Error → WRONG ────────────────────────────────────────────────
  V['absurd']='WRONG'; V['contradictory']='WRONG'; V['corrupted']='WRONG';
  V['counterproductive']='WRONG'; V['deceptive']='WRONG'; V['dishonest']='WRONG';
  V['distorted']='WRONG'; V['erroneous']='WRONG'; V['exaggerated']='WRONG';
  V['false']='WRONG'; V['flawed']='WRONG'; V['irrational']='WRONG';
  V['irresponsible']='WRONG'; V['misleading']='WRONG'; V['misunderstood']='WRONG';
  V['offensive']='WRONG'; V['plagiarized']='WRONG'; V['prejudiced']='WRONG';
  V['ridiculous']='WRONG'; V['self-contradictory']='WRONG'; V['unfair']='WRONG';
  V['unjust']='WRONG'; V['unreliable']='WRONG'; V['unethical']='WRONG';
  V['illogical']='WRONG'; V['inconsistent']='WRONG'; V['incoherent']='WRONG';
  V['fallacious']='WRONG'; V['baseless']='WRONG'; V['groundless']='WRONG';
  V['misguided']='WRONG'; V['deluded']='WRONG'; V['confused']='WRONG';
  V['biased']='WRONG'; V['unfounded']='WRONG'; V['unproven']='WRONG';

  // ── Happy / Positive emotions → HAPPY ────────────────────────────────────
  V['amused']='HAPPY'; V['blissful']='HAPPY'; V['bright']='HAPPY';
  V['carefree']='HAPPY'; V['cheerful']='HAPPY'; V['comfortable']='HAPPY';
  V['confident']='HAPPY'; V['content']='HAPPY'; V['eager']='HAPPY';
  V['ecstatic']='HAPPY'; V['enthusiastic']='HAPPY'; V['exhilarated']='HAPPY';
  V['fortunate']='HAPPY'; V['friendly']='HAPPY'; V['fulfilled']='HAPPY';
  V['glad']='HAPPY'; V['grateful']='HAPPY'; V['heartfelt']='HAPPY';
  V['hopeful']='HAPPY'; V['inspired']='HAPPY'; V['joyful']='HAPPY';
  V['jubilant']='HAPPY'; V['lighthearted']='HAPPY'; V['lively']='HAPPY';
  V['motivated']='HAPPY'; V['optimistic']='HAPPY'; V['overjoyed']='HAPPY';
  V['passionate']='HAPPY'; V['peaceable']='HAPPY'; V['playful']='HAPPY';
  V['positive']='HAPPY'; V['proud']='HAPPY'; V['radiant']='HAPPY';
  V['relaxed']='HAPPY'; V['satisfied']='HAPPY'; V['thrilled']='HAPPY';
  V['uplifted']='HAPPY'; V['vibrant']='HAPPY'; V['wonderful']='HAPPY';
  V['wonderful']='HAPPY'; V['zestful']='HAPPY'; V['spirited']='HAPPY';
  V['exuberant']='HAPPY'; V['vivacious']='HAPPY'; V['buoyant']='HAPPY';
  V['elated']='HAPPY'; V['euphoric']='HAPPY'; V['merry']='HAPPY';
  V['festive']='HAPPY'; V['celebratory']='HAPPY'; V['triumphant']='HAPPY';
  V['victorious']='HAPPY'; V['successful']='HAPPY'; V['accomplished']='HAPPY';

  // ── Sad / Negative emotions → SAD ────────────────────────────────────────
  V['abandoned']='SAD'; V['afraid']='SAD'; V['agitated']='SAD';
  V['anxious']='SAD'; V['apprehensive']='SAD'; V['ashamed']='SAD';
  V['bitter']='SAD'; V['broken']='SAD'; V['burdened']='SAD';
  V['confused']='SAD'; V['cynical']='SAD'; V['dejected']='SAD';
  V['desperate']='SAD'; V['despairing']='SAD'; V['devastated']='SAD';
  V['disheartened']='SAD'; V['disillusioned']='SAD'; V['dissatisfied']='SAD';
  V['distressed']='SAD'; V['doubtful']='SAD'; V['dreadful']='SAD';
  V['embarrassed']='SAD'; V['exhausted']='SAD'; V['fearful']='SAD';
  V['frustrated']='SAD'; V['gloomy']='SAD'; V['grief']='SAD';
  V['grieving']='SAD'; V['guilty']='SAD'; V['helpless']='SAD';
  V['hopeless']='SAD'; V['hurt']='SAD'; V['insecure']='SAD';
  V['isolated']='SAD'; V['jealous']='SAD'; V['lonely']='SAD';
  V['lost']='SAD'; V['nervous']='SAD'; V['overwhelmed']='SAD';
  V['pessimistic']='SAD'; V['regretful']='SAD'; V['rejected']='SAD';
  V['remorseful']='SAD'; V['resentful']='SAD'; V['restless']='SAD';
  V['scared']='SAD'; V['shame']='SAD'; V['shattered']='SAD';
  V['sorrowful']='SAD'; V['stressed']='SAD'; V['suffering']='SAD';
  V['torn']='SAD'; V['traumatized']='SAD'; V['troubled']='SAD';
  V['uncertain']='SAD'; V['uneasy']='SAD'; V['unhappy']='SAD';
  V['wary']='SAD'; V['worried']='SAD'; V['wretched']='SAD';
  V['depressed']='SAD'; V['depression']='SAD'; V['anxiety']='SAD';
  V['panic']='SAD'; V['panicking']='SAD'; V['panicked']='SAD';
  V['dread']='SAD'; V['dreading']='SAD'; V['dreaded']='SAD';

  // ── Sick / Illness → SICK ─────────────────────────────────────────────────
  V['acute']='SICK'; V['affected']='SICK'; V['ailment']='SICK';
  V['allergic']='SICK'; V['allergy']='SICK'; V['anemia']='SICK';
  V['asthma']='SICK'; V['bacterial']='SICK'; V['cancer']='SICK';
  V['chronic']='SICK'; V['complication']='SICK'; V['contagious']='SICK';
  V['contaminated']='SICK'; V['coronavirus']='SICK'; V['covid']='SICK';
  V['critical']='SICK'; V['debilitated']='SICK'; V['dehydrated']='SICK';
  V['delirious']='SICK'; V['diagnosed']='SICK'; V['diarrhea']='SICK';
  V['disability']='SICK'; V['disabled']='SICK'; V['diseased']='SICK';
  V['disorder']='SICK'; V['dizzy']='SICK'; V['epidemic']='SICK';
  V['faint']='SICK'; V['fatigued']='SICK'; V['fragile']='SICK';
  V['headache']='SICK'; V['hypertension']='SICK'; V['impaired']='SICK';
  V['infected']='SICK'; V['inflammation']='SICK'; V['influenza']='SICK';
  V['nausea']='SICK'; V['nauseous']='SICK'; V['obesity']='SICK';
  V['outbreak']='SICK'; V['pandemic']='SICK'; V['pathogen']='SICK';
  V['pneumonia']='SICK'; V['poisoned']='SICK'; V['quarantine']='SICK';
  V['rash']='SICK'; V['seizure']='SICK'; V['severe']='SICK';
  V['stroke']='SICK'; V['swelling']='SICK'; V['symptom']='SICK';
  V['syndrome']='SICK'; V['terminal']='SICK'; V['toxic']='SICK';
  V['trauma']='SICK'; V['tumor']='SICK'; V['unwell']='SICK';
  V['vomiting']='SICK'; V['vulnerable']='SICK'; V['weak']='SICK';
  V['wounded']='SICK'; V['flu']='SICK'; V['cold']='SICK';
  V['virus']='SICK'; V['viral']='SICK'; V['infection']='SICK';
  V['inflammation']='SICK'; V['swollen']='SICK'; V['bruise']='SICK';
  V['bruised']='SICK'; V['bleeding']='SICK'; V['blood']='SICK';

  // ── Pain / Hurt → PAIN ───────────────────────────────────────────────────
  V['agony']='PAIN'; V['anguish']='PAIN'; V['bruised']='PAIN';
  V['burning']='PAIN'; V['cut']='PAIN'; V['damage']='PAIN';
  V['discomfort']='PAIN'; V['distress']='PAIN'; V['fracture']='PAIN';
  V['harsh']='PAIN'; V['intense']='PAIN'; V['laceration']='PAIN';
  V['misery']='PAIN'; V['numbness']='PAIN'; V['sting']='PAIN';
  V['stinging']='PAIN'; V['strain']='PAIN'; V['stressed']='PAIN';
  V['suffering']='PAIN'; V['tender']='PAIN'; V['terrible']='PAIN';
  V['throbbing']='PAIN'; V['tough']='PAIN'; V['unbearable']='PAIN';
  V['wound']='PAIN'; V['bruise']='PAIN'; V['crush']='PAIN';
  V['sprain']='PAIN'; V['sprained']='PAIN'; V['pulled']='PAIN';
  V['muscle']='PAIN'; V['joint']='PAIN'; V['bone']='PAIN';

  // ── Medical / Healthcare → DOCTOR ─────────────────────────────────────────
  V['ambulance']='DOCTOR'; V['anesthesia']='DOCTOR'; V['antibiotic']='DOCTOR';
  V['appointment']='DOCTOR'; V['cardiology']='DOCTOR'; V['checkup']='DOCTOR';
  V['clinical']='DOCTOR'; V['dentist']='DOCTOR'; V['dermatology']='DOCTOR';
  V['diagnosis']='DOCTOR'; V['dialysis']='DOCTOR'; V['emergency']='DOCTOR';
  V['examination']='DOCTOR'; V['gynecology']='DOCTOR'; V['healthcare']='DOCTOR';
  V['inoculation']='DOCTOR'; V['intensive care']='DOCTOR'; V['laboratory']='DOCTOR';
  V['medical']='DOCTOR'; V['medication']='DOCTOR'; V['medicine']='DOCTOR';
  V['midwife']='DOCTOR'; V['neurology']='DOCTOR'; V['optician']='DOCTOR';
  V['orthopedic']='DOCTOR'; V['outpatient']='DOCTOR'; V['pediatrics']='DOCTOR';
  V['pharmacist']='DOCTOR'; V['pharmacy']='DOCTOR'; V['physical therapy']='DOCTOR';
  V['physiotherapy']='DOCTOR'; V['practitioner']='DOCTOR'; V['prescription']='DOCTOR';
  V['procedure']='DOCTOR'; V['psychiatrist']='DOCTOR'; V['psychiatry']='DOCTOR';
  V['psychologist']='DOCTOR'; V['rehabilitation']='DOCTOR'; V['scan']='DOCTOR';
  V['specialist']='DOCTOR'; V['surgery']='DOCTOR'; V['surgeon']='DOCTOR';
  V['therapeutic']='DOCTOR'; V['therapy']='DOCTOR'; V['treatment']='DOCTOR';
  V['ultrasound']='DOCTOR'; V['vaccine']='DOCTOR'; V['vaccination']='DOCTOR';
  V['ward']='DOCTOR'; V['xray']='DOCTOR'; V['x-ray']='DOCTOR';
  V['nurse']='DOCTOR'; V['nursing']='DOCTOR'; V['hospital']='DOCTOR';
  V['clinic']='DOCTOR'; V['ward']='DOCTOR'; V['icu']='DOCTOR';
  V['ER']='DOCTOR'; V['GP']='DOCTOR'; V['consultant']='DOCTOR';

  // ── Better / Improving → BETTER ───────────────────────────────────────────
  V['advanced']='BETTER'; V['boost']='BETTER'; V['capable']='BETTER';
  V['cure']='BETTER'; V['cured']='BETTER'; V['develop']='BETTER';
  V['enhance']='BETTER'; V['enhanced']='BETTER'; V['evolve']='BETTER';
  V['exceed']='BETTER'; V['excel']='BETTER'; V['experienced']='BETTER';
  V['fix']='BETTER'; V['fixed']='BETTER'; V['gain']='BETTER';
  V['graduate']='BETTER'; V['heal']='BETTER'; V['healthy']='BETTER';
  V['level up']='BETTER'; V['optimize']='BETTER'; V['optimized']='BETTER';
  V['overcome']='BETTER'; V['perfect']='BETTER'; V['perfected']='BETTER';
  V['proficient']='BETTER'; V['prosper']='BETTER'; V['rebuild']='BETTER';
  V['recover']='BETTER'; V['refined']='BETTER'; V['reinforce']='BETTER';
  V['remedy']='BETTER'; V['renew']='BETTER'; V['repair']='BETTER';
  V['restore']='BETTER'; V['revitalize']='BETTER'; V['skill']='BETTER';
  V['stronger']='BETTER'; V['thriving']='BETTER'; V['upgrade']='BETTER';
  V['upgrades']='BETTER'; V['winning']='BETTER'; V['growth']='BETTER';
  V['progression']='BETTER'; V['development']='BETTER'; V['advancement']='BETTER';

  // ── People / Society → PERSON ─────────────────────────────────────────────
  V['adult']='PERSON'; V['ancestor']='PERSON'; V['applicant']='PERSON';
  V['athlete']='PERSON'; V['audience']='PERSON'; V['author']='PERSON';
  V['candidate']='PERSON'; V['celebrity']='PERSON'; V['citizen']='PERSON';
  V['client']='PERSON'; V['civilian']='PERSON'; V['colleague']='PERSON';
  V['community']='PERSON'; V['competitor']='PERSON'; V['consumer']='PERSON';
  V['contributor']='PERSON'; V['customer']='PERSON'; V['delegate']='PERSON';
  V['employee']='PERSON'; V['employer']='PERSON'; V['expert']='PERSON';
  V['figure']='PERSON'; V['follower']='PERSON'; V['foreigner']='PERSON';
  V['founder']='PERSON'; V['generation']='PERSON'; V['graduate']='PERSON';
  V['group']='PERSON'; V['guest']='PERSON'; V['head']='PERSON';
  V['immigrant']='PERSON'; V['individual']='PERSON'; V['inhabitant']='PERSON';
  V['leader']='PERSON'; V['local']='PERSON'; V['manager']='PERSON';
  V['member']='PERSON'; V['mentor']='PERSON'; V['minority']='PERSON';
  V['neighbor']='PERSON'; V['neighbor']='PERSON'; V['officer']='PERSON';
  V['official']='PERSON'; V['operator']='PERSON'; V['participant']='PERSON';
  V['passenger']='PERSON'; V['patient']='PERSON'; V['peer']='PERSON';
  V['politician']='PERSON'; V['population']='PERSON'; V['president']='PERSON';
  V['professional']='PERSON'; V['public']='PERSON'; V['recipient']='PERSON';
  V['representative']='PERSON'; V['resident']='PERSON'; V['scientist']='PERSON';
  V['senior']='PERSON'; V['society']='PERSON'; V['specialist']='PERSON';
  V['spokesperson']='PERSON'; V['supervisor']='PERSON'; V['taxpayer']='PERSON';
  V['team']='PERSON'; V['tourist']='PERSON'; V['user']='PERSON';
  V['visitor']='PERSON'; V['volunteer']='PERSON'; V['voter']='PERSON';
  V['worker']='PERSON'; V['youth']='PERSON'; V['civilian']='PERSON';
  V['researcher']='PERSON'; V['analyst']='PERSON'; V['consultant']='PERSON';
  V['advisor']='PERSON'; V['representative']='PERSON'; V['delegate']='PERSON';
  V['ambassador']='PERSON'; V['diplomat']='PERSON'; V['journalist']='PERSON';
  V['reporter']='PERSON'; V['photographer']='PERSON'; V['artist']='PERSON';
  V['musician']='PERSON'; V['writer']='PERSON'; V['poet']='PERSON';
  V['philosopher']='PERSON'; V['engineer']='PERSON'; V['architect']='PERSON';
  V['programmer']='PERSON'; V['developer']='PERSON'; V['designer']='PERSON';

  // ── Money / Finance → MONEY ───────────────────────────────────────────────
  V['accounting']='MONEY'; V['asset']='MONEY'; V['assets']='MONEY';
  V['audit']='MONEY'; V['balance']='MONEY'; V['borrow']='MONEY';
  V['business']='MONEY'; V['capitalist']='MONEY'; V['cash']='MONEY';
  V['commerce']='MONEY'; V['commercial']='MONEY'; V['corporation']='MONEY';
  V['cryptocurrency']='MONEY'; V['deposit']='MONEY'; V['dividend']='MONEY';
  V['earning']='MONEY'; V['economic']='MONEY'; V['economy']='MONEY';
  V['equity']='MONEY'; V['expense']='MONEY'; V['financial']='MONEY';
  V['fiscal']='MONEY'; V['grant']='MONEY'; V['gross']='MONEY';
  V['growth']='MONEY'; V['income']='MONEY'; V['interest']='MONEY';
  V['invest']='MONEY'; V['investment']='MONEY'; V['investor']='MONEY';
  V['market']='MONEY'; V['mortgage']='MONEY'; V['overhead']='MONEY';
  V['paycheck']='MONEY'; V['pension']='MONEY'; V['portfolio']='MONEY';
  V['profit']='MONEY'; V['purchase']='MONEY'; V['refund']='MONEY';
  V['rent']='MONEY'; V['revenue']='MONEY'; V['rich']='MONEY';
  V['salary']='MONEY'; V['savings']='MONEY'; V['stock']='MONEY';
  V['subscription']='MONEY'; V['tax']='MONEY'; V['taxes']='MONEY';
  V['trade']='MONEY'; V['transaction']='MONEY'; V['tuition']='MONEY';
  V['wealthy']='MONEY'; V['withdraw']='MONEY'; V['withdrawal']='MONEY';
  V['banking']='MONEY'; V['finance']='MONEY'; V['financial']='MONEY';
  V['budget']='MONEY'; V['cost']='MONEY'; V['costs']='MONEY';
  V['pricing']='MONEY'; V['affordable']='FREE'; V['cheap']='FREE';
  V['discount']='FREE'; V['bargain']='FREE'; V['deal']='FREE';
  V['sale']='PAY'; V['sales']='PAY'; V['buying']='PAY';
  V['selling']='PAY'; V['seller']='PAY'; V['buyer']='PAY';
  V['vendor']='PAY'; V['retailer']='PAY'; V['customer']='PAY';
  V['client']='PAY'; V['invoice']='PAY'; V['receipt']='PAY';
  V['bill']='PAY'; V['billing']='PAY'; V['checkout']='PAY';
  V['transaction']='PAY'; V['transfer']='PAY'; V['wire']='PAY';

  // ── Education / School → SCHOOL ───────────────────────────────────────────
  V['accreditation']='SCHOOL'; V['administration']='SCHOOL'; V['admission']='SCHOOL';
  V['advanced']='SCHOOL'; V['bachelor']='SCHOOL'; V['biology']='SCHOOL';
  V['calculus']='SCHOOL'; V['certificate']='SCHOOL'; V['chemistry']='SCHOOL';
  V['club']='SCHOOL'; V['college']='SCHOOL'; V['computer science']='SCHOOL';
  V['counselor']='SCHOOL'; V['dean']='SCHOOL'; V['department']='SCHOOL';
  V['diploma']='SCHOOL'; V['discipline']='SCHOOL'; V['economics']='SCHOOL';
  V['elective']='SCHOOL'; V['engineering']='SCHOOL'; V['enroll']='SCHOOL';
  V['enrollment']='SCHOOL'; V['faculty']='SCHOOL'; V['field']='SCHOOL';
  V['final']='SCHOOL'; V['geography']='SCHOOL'; V['grading']='SCHOOL';
  V['graduate']='SCHOOL'; V['graduation']='SCHOOL'; V['guidance']='SCHOOL';
  V['history']='SCHOOL'; V['institute']='SCHOOL'; V['lab']='SCHOOL';
  V['language']='SCHOOL'; V['library']='SCHOOL'; V['literature']='SCHOOL';
  V['major']='SCHOOL'; V['master']='SCHOOL'; V['mathematics']='SCHOOL';
  V['midterm']='SCHOOL'; V['minor']='SCHOOL'; V['music']='SCHOOL';
  V['performance']='SCHOOL'; V['philosophy']='SCHOOL'; V['physics']='SCHOOL';
  V['postgraduate']='SCHOOL'; V['principal']='SCHOOL'; V['program']='SCHOOL';
  V['psychology']='SCHOOL'; V['registration']='SCHOOL'; V['science']='SCHOOL';
  V['sociology']='SCHOOL'; V['student body']='SCHOOL'; V['subject']='SCHOOL';
  V['superintendent']='SCHOOL'; V['thesis']='SCHOOL'; V['transcript']='SCHOOL';
  V['undergraduate']='SCHOOL'; V['university']='SCHOOL'; V['vice']='SCHOOL';
  V['arts']='SCHOOL'; V['humanities']='SCHOOL'; V['social sciences']='SCHOOL';
  V['natural sciences']='SCHOOL'; V['mathematics']='SCHOOL'; V['algebra']='SCHOOL';
  V['geometry']='SCHOOL'; V['statistics']='SCHOOL'; V['probability']='SCHOOL';

  // ── Home / House → HOME ───────────────────────────────────────────────────
  V['balcony']='HOME'; V['basement']='HOME'; V['bathroom']='HOME';
  V['bedroom']='HOME'; V['building']='HOME'; V['ceiling']='HOME';
  V['community']='HOME'; V['construction']='HOME'; V['corridor']='HOME';
  V['courtyard']='HOME'; V['district']='HOME'; V['door']='HOME';
  V['estate']='HOME'; V['facility']='HOME'; V['floor']='HOME';
  V['furniture']='HOME'; V['garage']='HOME'; V['garden']='HOME';
  V['gate']='HOME'; V['hall']='HOME'; V['hallway']='HOME';
  V['housing']='HOME'; V['indoor']='HOME'; V['interior']='HOME';
  V['kitchen']='HOME'; V['landlord']='HOME'; V['living room']='HOME';
  V['neighborhood']='HOME'; V['property']='HOME'; V['rent']='HOME';
  V['rental']='HOME'; V['roof']='HOME'; V['room']='HOME';
  V['staircase']='HOME'; V['suburb']='HOME'; V['tenant']='HOME';
  V['wall']='HOME'; V['window']='HOME'; V['yard']='HOME';
  V['urban']='HOME'; V['suburban']='HOME'; V['rural']='HOME';
  V['location']='HOME'; V['address']='HOME'; V['neighborhood']='HOME';
  V['district']='HOME'; V['city']='HOME'; V['town']='HOME';
  V['village']='HOME'; V['area']='HOME'; V['region']='HOME';
  V['country']='HOME'; V['nation']='HOME'; V['national']='HOME';

  // ── Technology / Digital → WORK / WRITE ──────────────────────────────────
  V['ai']='THINK'; V['artificial intelligence']='THINK'; V['automation']='WORK';
  V['bandwidth']='WORK'; V['bluetooth']='WORK'; V['browser']='READ';
  V['cache']='WORK'; V['chip']='WORK'; V['cloud']='WORK';
  V['code']='WRITE'; V['compiler']='WRITE'; V['computing']='WORK';
  V['connect']='WORK'; V['connection']='WORK'; V['console']='WORK';
  V['cybersecurity']='WORK'; V['data']='KNOW'; V['debug']='FIND';
  V['decrypt']='FIND'; V['deploy']='SEND'; V['digital']='WORK';
  V['domain']='WORK'; V['download']='TAKE'; V['driver']='WORK';
  V['encrypt']='WORK'; V['encryption']='WORK'; V['error']='WRONG';
  V['extension']='WORK'; V['file']='WRITE'; V['firewall']='WORK';
  V['framework']='MAKE'; V['graphics']='EYE'; V['hardware']='WORK';
  V['hosting']='WORK'; V['html']='WRITE'; V['http']='WORK';
  V['input']='TAKE'; V['interface']='WORK'; V['keyboard']='WRITE';
  V['linked']='WORK'; V['linux']='WORK'; V['malware']='BAD';
  V['memory']='KNOW'; V['mobile']='PHONE'; V['monitor']='EYE';
  V['network']='WORK'; V['offline']='STOP'; V['online']='WORK';
  V['open source']='FREE'; V['output']='SEND'; V['patch']='BETTER';
  V['pixel']='EYE'; V['platform']='WORK'; V['plugin']='WORK';
  V['privacy']='WORK'; V['processor']='WORK'; V['protocol']='WORK';
  V['query']='FIND'; V['reboot']='CHANGE'; V['render']='MAKE';
  V['repository']='WORK'; V['router']='WORK'; V['runtime']='WORK';
  V['screenshot']='EYE'; V['security']='WORK'; V['server']='WORK';
  V['settings']='CHANGE'; V['smartphone']='PHONE'; V['software']='WORK';
  V['storage']='HAVE'; V['streaming']='WORK'; V['tablet']='WORK';
  V['terminal']='WORK'; V['typescript']='WRITE'; V['update']='NEW';
  V['upload']='SEND'; V['username']='NAME'; V['version']='NEW';
  V['virtual']='WORK'; V['wifi']='WORK'; V['wireless']='WORK';

  // ── Food / Eating → EAT ───────────────────────────────────────────────────
  V['appetite']='EAT'; V['bakery']='EAT'; V['banquet']='EAT';
  V['bite']='EAT'; V['calories']='EAT'; V['catering']='EAT';
  V['chew']='EAT'; V['delicious']='EAT'; V['dessert']='EAT';
  V['dietary']='EAT'; V['digest']='EAT'; V['digestion']='EAT';
  V['dining']='EAT'; V['dish']='EAT'; V['flavor']='EAT';
  V['fresh']='EAT'; V['fried']='COOK'; V['frozen']='EAT';
  V['fruit']='EAT'; V['gluten']='EAT'; V['grain']='EAT';
  V['grocery']='EAT'; V['herb']='EAT'; V['ingredient']='EAT';
  V['meal']='EAT'; V['menu']='EAT'; V['nutrition']='EAT';
  V['nutritious']='EAT'; V['organic']='EAT'; V['portion']='EAT';
  V['protein']='EAT'; V['recipe']='COOK'; V['restaurant']='EAT';
  V['salad']='EAT'; V['sandwich']='EAT'; V['sauce']='EAT';
  V['seafood']='EAT'; V['snack']='EAT'; V['soup']='EAT';
  V['spice']='EAT'; V['steak']='EAT'; V['sweet']='EAT';
  V['taste']='EAT'; V['tasty']='EAT'; V['vegetable']='EAT';
  V['vegan']='EAT'; V['vegetarian']='EAT'; V['yummy']='EAT';

  // ── Drinking → DRINK ─────────────────────────────────────────────────────
  V['alcohol']='DRINK'; V['beer']='DRINK'; V['blend']='DRINK';
  V['brew']='DRINK'; V['brewed']='DRINK'; V['carbonated']='DRINK';
  V['cocktail']='DRINK'; V['concentrate']='DRINK'; V['espresso']='DRINK';
  V['fizzy']='DRINK'; V['herbal']='DRINK'; V['hydrated']='DRINK';
  V['hydration']='DRINK'; V['latte']='DRINK'; V['lemonade']='DRINK';
  V['milkshake']='DRINK'; V['mineral water']='WATER'; V['pour']='DRINK';
  V['refreshment']='DRINK'; V['sip']='DRINK'; V['smoothie']='DRINK';
  V['sparkling']='DRINK'; V['straw']='DRINK'; V['syrup']='DRINK';
  V['thirst']='DRINK'; V['wine']='DRINK';

  // ── Weather / Nature → weather signs ──────────────────────────────────────
  V['atmosphere']='SUN'; V['autumn']='COLD'; V['breeze']='WIND';
  V['climate']='SUN'; V['cloud']='RAIN'; V['cloudy']='RAIN';
  V['cyclone']='WIND'; V['damp']='RAIN'; V['drought']='SUN';
  V['dust']='WIND'; V['dusk']='SUN'; V['dawn']='SUN';
  V['environment']='SUN'; V['evening']='SUN'; V['flooding']='RAIN';
  V['fog']='RAIN'; V['foggy']='RAIN'; V['forecast']='SUN';
  V['freeze']='SNOW'; V['glacier']='SNOW'; V['haze']='RAIN';
  V['humid']='RAIN'; V['humidity']='RAIN'; V['lightning']='SUN';
  V['meteor']='SUN'; V['mist']='RAIN'; V['moisture']='RAIN';
  V['moon']='SUN'; V['nature']='SUN'; V['outdoor']='OUTSIDE';
  V['overcast']='RAIN'; V['ozone']='SUN'; V['planet']='SUN';
  V['pollution']='BAD'; V['rainbow']='SUN'; V['season']='YEAR';
  V['sky']='UP'; V['spring']='NEW'; V['star']='SUN';
  V['storm']='RAIN'; V['stormy']='RAIN'; V['summer']='HOT';
  V['sunshine']='SUN'; V['thunder']='RAIN'; V['tornado']='WIND';
  V['typhoon']='WIND'; V['warmth']='HOT'; V['weather']='SUN';
  V['wet']='RAIN'; V['winter']='SNOW';

  // ── Transportation → transport signs ──────────────────────────────────────
  V['aircraft']='MOVE'; V['aviation']='MOVE'; V['commuter']='BUS';
  V['crosswalk']='WALK'; V['departure']='LEAVE'; V['destination']='THERE';
  V['distance']='MOVE'; V['driveway']='CAR'; V['engine']='CAR';
  V['fare']='MONEY'; V['freeway']='CAR'; V['fuel']='CAR';
  V['gas']='CAR'; V['highway']='CAR'; V['intersection']='THERE';
  V['lane']='CAR'; V['license']='WORK'; V['local bus']='BUS';
  V['locomotive']='TRAIN'; V['luggage']='TAKE'; V['motor']='CAR';
  V['park']='STOP'; V['parking']='STOP'; V['passenger']='BUS';
  V['pipeline']='MOVE'; V['platform']='TRAIN'; V['port']='THERE';
  V['railroad']='TRAIN'; V['railway']='TRAIN'; V['road']='CAR';
  V['route']='MOVE'; V['runway']='MOVE'; V['signal']='SHOW';
  V['speed limit']='SLOW'; V['station']='TRAIN'; V['stop']='STOP';
  V['terminal']='THERE'; V['ticket']='PAY'; V['traffic']='CAR';
  V['transit']='BUS'; V['transportation']='CAR'; V['vehicle']='CAR';

  // ── Colors (extended) ──────────────────────────────────────────────────────
  V['aqua']='BLUE'; V['azure']='BLUE'; V['cerulean']='BLUE';
  V['cobalt']='BLUE'; V['navy']='BLUE'; V['turquoise']='BLUE';
  V['teal']='GREEN'; V['olive']='GREEN'; V['lime']='GREEN';
  V['emerald']='GREEN'; V['sage']='GREEN'; V['chartreuse']='GREEN';
  V['gold']='YELLOW'; V['golden']='YELLOW'; V['amber']='YELLOW';
  V['lemon']='YELLOW'; V['mustard']='YELLOW'; V['saffron']='YELLOW';
  V['crimson']='RED'; V['maroon']='RED'; V['scarlet']='RED';
  V['burgundy']='RED'; V['magenta']='RED'; V['ruby']='RED';
  V['ivory']='WHITE'; V['cream']='WHITE'; V['pearl']='WHITE';
  V['beige']='BROWN'; V['tan']='BROWN'; V['khaki']='BROWN';
  V['chocolate']='BROWN'; V['auburn']='BROWN'; V['chestnut']='BROWN';
  V['ebony']='BLACK'; V['jet black']='BLACK'; V['onyx']='BLACK';
  V['charcoal']='BLACK'; V['graphite']='BLACK'; V['slate']='BLACK';
  V['violet']='PURPLE'; V['lavender']='PURPLE'; V['indigo']='PURPLE';
  V['lilac']='PURPLE'; V['plum']='PURPLE'; V['amethyst']='PURPLE';
  V['salmon']='RED'; V['coral']='ORANGE'; V['tangerine']='ORANGE';
  V['peach']='ORANGE'; V['apricot']='ORANGE'; V['rust']='ORANGE';
  V['rose']='RED'; V['blush']='RED'; V['hot pink']='RED';
  V['fuchsia']='RED'; V['neon']='GREEN'; V['mint']='GREEN';
  V['seafoam']='GREEN'; V['forest green']='GREEN'; V['pine']='GREEN';
  V['mauve']='PURPLE'; V['taupe']='BROWN'; V['ochre']='YELLOW';
  V['bronze']='BROWN'; V['copper']='BROWN'; V['brass']='YELLOW';
  V['silver']='WHITE'; V['platinum']='WHITE'; V['chrome']='WHITE';
  V['grayscale']='BLACK'; V['monochrome']='BLACK'; V['transparent']='ZERO';

  // ── Time-related words ────────────────────────────────────────────────────
  V['annually']='YEAR'; V['calendar']='YEAR'; V['century']='YEAR';
  V['chronological']='BEFORE'; V['contemporary']='NOW'; V['continuous']='ALWAYS';
  V['currently']='NOW'; V['dated']='OLD'; V['dawn']='MORNING';
  V['decade']='YEAR'; V['epoch']='YEAR'; V['era']='YEAR';
  V['eternal']='ALWAYS'; V['eventually']='AFTER'; V['forthcoming']='AFTER';
  V['frequently']='ALWAYS'; V['historical']='BEFORE'; V['immediately']='FAST';
  V['interim']='DURING'; V['later']='AFTER'; V['lasting']='ALWAYS';
  V['meanwhile']='DURING'; V['midnight']='NIGHT'; V['modern']='NEW';
  V['nightly']='NIGHT'; V['occasionally']='MINUTE'; V['ongoing']='DURING';
  V['periodically']='MINUTE'; V['permanent']='ALWAYS'; V['phase']='DURING';
  V['prehistoric']='BEFORE'; V['preliminary']='BEFORE'; V['preliminary']='BEFORE';
  V['quarterly']='YEAR'; V['recent']='NEW'; V['recently']='NEW';
  V['schedule']='WHEN'; V['seasonal']='YEAR'; V['semester']='YEAR';
  V['simultaneously']='DURING'; V['sometimes']='MINUTE'; V['soon']='FAST';
  V['subsequently']='AFTER'; V['temporary']='MINUTE'; V['term']='YEAR';
  V['timeline']='BEFORE'; V['timely']='FAST'; V['upcoming']='AFTER';
  V['weekly']='WEEK'; V['yearly']='YEAR'; V['quarter']='YEAR';
  V['daily']='TODAY'; V['monthly']='YEAR'; V['biweekly']='WEEK';

  // ── Directions / Space ────────────────────────────────────────────────────
  V['above']='UP'; V['across']='MOVE'; V['adjacent']='HERE';
  V['alongside']='HERE'; V['around']='HERE'; V['backward']='BEFORE';
  V['behind']='BEFORE'; V['below']='DOWN'; V['beneath']='DOWN';
  V['beside']='HERE'; V['beyond']='THERE'; V['border']='THERE';
  V['boundary']='THERE'; V['center']='HERE'; V['central']='HERE';
  V['circumference']='HERE'; V['corner']='THERE'; V['diagonal']='MOVE';
  V['east']='THERE'; V['edge']='THERE'; V['end']='THERE';
  V['entrance']='INSIDE'; V['entry']='INSIDE'; V['exit']='OUTSIDE';
  V['extreme']='THERE'; V['far']='THERE'; V['forward']='AFTER';
  V['front']='BEFORE'; V['horizontal']='MOVE'; V['junction']='THERE';
  V['left']='THERE'; V['middle']='HERE'; V['nearby']='HERE';
  V['north']='UP'; V['opposite']='DIFFERENT'; V['orientation']='THERE';
  V['parallel']='SAME'; V['perimeter']='OUTSIDE'; V['perpendicular']='MOVE';
  V['position']='HERE'; V['proximity']='HERE'; V['right']='THERE';
  V['side']='THERE'; V['south']='DOWN'; V['surrounding']='OUTSIDE';
  V['toward']='MOVE'; V['under']='DOWN'; V['upper']='UP';
  V['vertical']='UP'; V['vicinity']='HERE'; V['west']='THERE';
  V['within']='INSIDE'; V['zone']='THERE'; V['area']='HERE';
  V['space']='HERE'; V['spatial']='HERE'; V['depth']='DOWN';
  V['height']='UP'; V['width']='BIG'; V['length']='BIG';
  V['distance']='THERE'; V['range']='BIG'; V['span']='BIG';
  V['scope']='BIG'; V['extent']='BIG'; V['coverage']='BIG';

  // ── Social / Relationships ────────────────────────────────────────────────
  V['acceptance']='SAME'; V['affection']='LOVE'; V['alliance']='SAME';
  V['argument']='WRONG'; V['bonding']='FRIEND'; V['brotherhood']='BROTHER';
  V['care']='LOVE'; V['caring']='LOVE'; V['closeness']='FRIEND';
  V['collaboration']='HELP'; V['commitment']='ALWAYS'; V['community']='FAMILY';
  V['conflict']='WRONG'; V['connection']='FRIEND'; V['consolation']='HELP';
  V['conversation']='SAY'; V['cooperation']='HELP'; V['culture']='PERSON';
  V['dating']='LOVE'; V['debate']='THINK'; V['dialogue']='SAY';
  V['disagreement']='DIFFERENT'; V['diversity']='DIFFERENT'; V['empathy']='KNOW';
  V['engagement']='MEET'; V['equality']='SAME'; V['exchange']='GIVE';
  V['forgiveness']='SORRY'; V['harmony']='SAME'; V['hospitality']='WELCOME';
  V['identity']='ME'; V['inclusion']='SAME'; V['interaction']='MEET';
  V['kindness']='GOOD'; V['leadership']='TEACH'; V['loyalty']='ALWAYS';
  V['marriage']='LOVE'; V['network']='FRIEND'; V['partnership']='FRIEND';
  V['peace']='SAME'; V['permission']='YES'; V['positive']='GOOD';
  V['reconciliation']='SORRY'; V['relationship']='FRIEND'; V['respect']='GOOD';
  V['reunion']='MEET'; V['solidarity']='SAME'; V['sisterhood']='SISTER';
  V['social']='MEET'; V['society']='PERSON'; V['support']='HELP';
  V['sympathy']='SORRY'; V['teamwork']='HELP'; V['togetherness']='SAME';
  V['tradition']='OLD'; V['trust']='KNOW'; V['unity']='SAME';
  V['values']='IMPORTANT'; V['warmth']='HOT'; V['welcome']='WELCOME';

  // ── Government / Law / Politics ───────────────────────────────────────────
  V['amendment']='CHANGE'; V['authority']='IMPORTANT'; V['bill']='WRITE';
  V['campaign']='WORK'; V['candidate']='PERSON'; V['charter']='WRITE';
  V['civil']='PERSON'; V['claim']='SAY'; V['coalition']='SAME';
  V['commission']='WORK'; V['committee']='MEET'; V['compliance']='CORRECT';
  V['congress']='MEET'; V['consent']='YES'; V['constitution']='WRITE';
  V['contract']='WRITE'; V['council']='MEET'; V['court']='FIND';
  V['crime']='BAD'; V['criminal']='BAD'; V['debate']='SAY';
  V['decree']='SAY'; V['defense']='HELP'; V['democracy']='PERSON';
  V['diplomatic']='GOOD'; V['dispute']='WRONG'; V['election']='CHOOSE';
  V['enforcement']='WORK'; V['equality']='SAME'; V['ethics']='GOOD';
  V['evidence']='KNOW'; V['freedom']='FREE'; V['government']='WORK';
  V['governor']='PERSON'; V['guideline']='CORRECT'; V['human rights']='FREE';
  V['immigration']='MOVE'; V['independence']='FREE'; V['institution']='SCHOOL';
  V['justice']='CORRECT'; V['law']='CORRECT'; V['legislation']='WRITE';
  V['mandate']='IMPORTANT'; V['minister']='PERSON'; V['minority']='SMALL';
  V['nation']='PERSON'; V['national']='PERSON'; V['official']='PERSON';
  V['opposition']='DIFFERENT'; V['order']='CORRECT'; V['parliament']='MEET';
  V['party']='MEET'; V['penalty']='BAD'; V['policy']='CORRECT';
  V['political']='WORK'; V['politician']='PERSON'; V['politics']='WORK';
  V['power']='IMPORTANT'; V['president']='PERSON'; V['prime minister']='PERSON';
  V['prosecution']='BAD'; V['protect']='HELP'; V['protest']='SAY';
  V['public']='PERSON'; V['regulation']='CORRECT'; V['rights']='FREE';
  V['rule']='CORRECT'; V['senate']='MEET'; V['sovereignty']='FREE';
  V['tax']='PAY'; V['treaty']='WRITE'; V['tribunal']='FIND';
  V['vote']='CHOOSE'; V['voting']='CHOOSE'; V['welfare']='HELP';

  // ── Arts / Culture / Entertainment ────────────────────────────────────────
  V['acting']='PLAY'; V['animation']='PLAY'; V['architecture']='MAKE';
  V['art']='BEAUTIFUL'; V['artwork']='BEAUTIFUL'; V['audience']='EYE';
  V['ballet']='BEAUTIFUL'; V['band']='PLAY'; V['cinema']='VIDEO';
  V['classical']='OLD'; V['compose']='WRITE'; V['concert']='PLAY';
  V['creative']='MAKE'; V['creativity']='MAKE'; V['culture']='KNOW';
  V['dance']='PLAY'; V['dancing']='PLAY'; V['design']='MAKE';
  V['director']='TEACH'; V['documentary']='READ'; V['drama']='PLAY';
  V['drawing']='WRITE'; V['exhibition']='SHOW'; V['expression']='SAY';
  V['festival']='PLAY'; V['fiction']='READ'; V['film']='VIDEO';
  V['gallery']='SHOW'; V['genre']='DIFFERENT'; V['graphic']='EYE';
  V['illustration']='SHOW'; V['imagery']='EYE'; V['instrument']='PLAY';
  V['melody']='PLAY'; V['museum']='SHOW'; V['narrative']='SAY';
  V['opera']='PLAY'; V['orchestra']='PLAY'; V['painting']='BEAUTIFUL';
  V['performance']='PLAY'; V['photography']='EYE'; V['play']='PLAY';
  V['poem']='WRITE'; V['portrait']='EYE'; V['pottery']='MAKE';
  V['sculpture']='MAKE'; V['series']='READ'; V['show']='SHOW';
  V['sketch']='WRITE'; V['song']='PLAY'; V['stage']='SHOW';
  V['style']='BEAUTIFUL'; V['symphony']='PLAY'; V['theatre']='PLAY';
  V['tradition']='OLD'; V['video']='VIDEO'; V['visual']='EYE';

  // ── Sports / Recreation ───────────────────────────────────────────────────
  V['aerobics']='PLAY'; V['athlete']='PLAY'; V['athletic']='PLAY';
  V['badminton']='PLAY'; V['baseball']='PLAY'; V['basketball']='PLAY';
  V['boxing']='PLAY'; V['camping']='OUTSIDE'; V['championship']='FIND';
  V['compete']='PLAY'; V['competition']='PLAY'; V['competitive']='PLAY';
  V['court']='PLAY'; V['cycling']='WALK'; V['exercise']='PLAY';
  V['fitness']='PLAY'; V['football']='PLAY'; V['game']='PLAY';
  V['golf']='PLAY'; V['gym']='PLAY'; V['gymnasium']='PLAY';
  V['hockey']='PLAY'; V['jogging']='WALK'; V['kayaking']='MOVE';
  V['marathon']='WALK'; V['martial arts']='PLAY'; V['medal']='FINISH';
  V['mountain climbing']='UP'; V['outdoor']='OUTSIDE'; V['pool']='WATER';
  V['race']='FAST'; V['rugby']='PLAY'; V['running']='WALK';
  V['soccer']='PLAY'; V['sport']='PLAY'; V['stadium']='PLAY';
  V['stamina']='WORK'; V['strength']='BIG'; V['surfing']='MOVE';
  V['swimming']='MOVE'; V['team']='PERSON'; V['tennis']='PLAY';
  V['tournament']='PLAY'; V['track']='WALK'; V['trophy']='FINISH';
  V['volleyball']='PLAY'; V['workout']='WORK'; V['yoga']='SLOW';

  // ── Abstract / Philosophical ──────────────────────────────────────────────
  V['abstract']='THINK'; V['accuracy']='CORRECT'; V['achievement']='FINISH';
  V['action']='WORK'; V['advantage']='GOOD'; V['approach']='MOVE';
  V['aspect']='THINK'; V['barrier']='STOP'; V['benefit']='GOOD';
  V['boundary']='STOP'; V['capability']='KNOW'; V['capacity']='BIG';
  V['challenge']='DIFFICULT'; V['characteristic']='DIFFERENT'; V['clarity']='KNOW';
  V['complexity']='DIFFICULT'; V['context']='KNOW'; V['contrast']='DIFFERENT';
  V['contribution']='GIVE'; V['criterion']='CORRECT'; V['cycle']='YEAR';
  V['definition']='KNOW'; V['dimension']='BIG'; V['direction']='THERE';
  V['dynamic']='FAST'; V['element']='IMPORTANT'; V['essence']='IMPORTANT';
  V['evolution']='BETTER'; V['expectation']='WANT'; V['experience']='KNOW';
  V['factor']='IMPORTANT'; V['failure']='WRONG'; V['flexibility']='CHANGE';
  V['focus']='EYE'; V['foundation']='IMPORTANT'; V['gap']='DIFFERENT';
  V['goal']='WANT'; V['impact']='IMPORTANT'; V['implementation']='MAKE';
  V['implication']='THINK'; V['improvement']='BETTER'; V['innovation']='NEW';
  V['integration']='SAME'; V['interaction']='MEET'; V['issue']='WRONG';
  V['justice']='CORRECT'; V['key']='IMPORTANT'; V['limitation']='SMALL';
  V['mechanism']='WORK'; V['motivation']='WANT'; V['nature']='KNOW';
  V['necessity']='NEED'; V['network']='WORK'; V['opportunity']='WANT';
  V['outcome']='FINISH'; V['output']='SEND'; V['overview']='KNOW';
  V['paradigm']='THINK'; V['parameter']='CORRECT'; V['pattern']='SAME';
  V['perspective']='THINK'; V['phase']='YEAR'; V['phenomenon']='KNOW';
  V['pillar']='IMPORTANT'; V['potential']='WANT'; V['practice']='WORK';
  V['principle']='CORRECT'; V['priority']='IMPORTANT'; V['problem']='WRONG';
  V['procedure']='WORK'; V['process']='WORK'; V['purpose']='WANT';
  V['quality']='GOOD'; V['reality']='KNOW'; V['relationship']='FRIEND';
  V['relevance']='IMPORTANT'; V['resource']='HAVE'; V['responsibility']='WORK';
  V['result']='FINISH'; V['role']='WORK'; V['scope']='BIG';
  V['significance']='IMPORTANT'; V['situation']='NOW'; V['skill']='KNOW';
  V['solution']='ANSWER'; V['standard']='CORRECT'; V['status']='KNOW';
  V['strength']='IMPORTANT'; V['structure']='MAKE'; V['success']='FINISH';
  V['sustainability']='ALWAYS'; V['tendency']='ALWAYS'; V['theme']='KNOW';
  V['transition']='CHANGE'; V['trend']='NEW'; V['value']='IMPORTANT';
  V['variety']='DIFFERENT'; V['vision']='WANT'; V['weakness']='SMALL';

  // ── Common Adverbs / Connectors ───────────────────────────────────────────
  V['absolutely']='YES'; V['accordingly']='CORRECT'; V['actually']='KNOW';
  V['additionally']='GIVE'; V['afterwards']='AFTER'; V['alternatively']='DIFFERENT';
  V['although']='DIFFERENT'; V['approximately']='SAME'; V['besides']='GIVE';
  V['consequently']='AFTER'; V['currently']='NOW'; V['definitely']='YES';
  V['deliberately']='SLOW'; V['despite']='DIFFERENT'; V['effectively']='GOOD';
  V['especially']='IMPORTANT'; V['essentially']='IMPORTANT'; V['evidently']='KNOW';
  V['exactly']='CORRECT'; V['explicitly']='SAY'; V['extremely']='BIG';
  V['finally']='FINISH'; V['furthermore']='GIVE'; V['generally']='SAME';
  V['globally']='BIG'; V['gradually']='SLOW'; V['hence']='AFTER';
  V['ideally']='GOOD'; V['immediately']='FAST'; V['increasingly']='BIG';
  V['indeed']='YES'; V['inherently']='KNOW'; V['initially']='BEFORE';
  V['instead']='CHANGE'; V['intentionally']='THINK'; V['jointly']='SAME';
  V['largely']='BIG'; V['likely']='THINK'; V['moreover']='GIVE';
  V['mostly']='BIG'; V['naturally']='KNOW'; V['nearly']='SAME';
  V['necessarily']='NEED'; V['notably']='IMPORTANT'; V['obviously']='KNOW';
  V['occasionally']='MINUTE'; V['often']='ALWAYS'; V['only']='SMALL';
  V['otherwise']='DIFFERENT'; V['overall']='BIG'; V['particularly']='IMPORTANT';
  V['possibly']='THINK'; V['primarily']='IMPORTANT'; V['probably']='THINK';
  V['quickly']='FAST'; V['rarely']='NEVER'; V['rather']='DIFFERENT';
  V['recently']='NEW'; V['relatively']='SAME'; V['repeatedly']='ALWAYS';
  V['respectively']='SAME'; V['roughly']='SAME'; V['severely']='BIG';
  V['significantly']='IMPORTANT'; V['similarly']='SAME'; V['simply']='EASY';
  V['simultaneously']='DURING'; V['slightly']='SMALL'; V['specifically']='CORRECT';
  V['still']='CONTINUE'; V['strongly']='BIG'; V['successfully']='FINISH';
  V['sufficiently']='GOOD'; V['therefore']='AFTER'; V['thus']='AFTER';
  V['together']='SAME'; V['totally']='BIG'; V['typically']='SAME';
  V['ultimately']='FINISH'; V['unfortunately']='BAD'; V['usually']='SAME';
  V['very']='BIG'; V['virtually']='SAME'; V['widely']='BIG';
  V['yet']='BEFORE'; V['nonetheless']='CONTINUE'; V['however']='DIFFERENT';
  V['therefore']='THINK'; V['consequently']='AFTER'; V['furthermore']='MORE';
  V['moreover']='MORE'; V['additionally']='MORE'; V['subsequently']='AFTER';
  V['meanwhile']='DURING'; V['nevertheless']='CONTINUE'; V['notwithstanding']='DIFFERENT';

  // ── Disability / Accessibility ────────────────────────────────────────────
  V['accessibility']='HELP'; V['accessible']='EASY'; V['accommodation']='HELP';
  V['adaptive']='CHANGE'; V['assistance']='HELP'; V['augmentative']='HELP';
  V['barrier']='STOP'; V['blind']='EYE'; V['braille']='READ';
  V['closed captioning']='CAPTION'; V['communication aid']='HELP'; V['deaf']='DEAF';
  V['deaf-blind']='DEAF'; V['deafness']='DEAF'; V['disability']='SICK';
  V['disabled']='SICK'; V['hearing aid']='EAR'; V['hearing impaired']='DEAF';
  V['impairment']='SICK'; V['inclusion']='SAME'; V['inclusive']='SAME';
  V['interpreter']='TRANSLATE'; V['lip reading']='READ'; V['mobility']='MOVE';
  V['screen reader']='READ'; V['sign language']='DEAF'; V['speech impaired']='SICK';
  V['subtitle']='CAPTION'; V['universal design']='MAKE'; V['wheelchair']='MOVE';

  // ── Additional coverage for test-verified semantic groups ───────────────────
  V['residence']='HOME'; V['domicile']='HOME'; V['dwelling']='HOME';
  V['household']='HOME'; V['lodging']='HOME'; V['quarters']='HOME';
  V['abode']='HOME'; V['habitat']='HOME'; V['premises']='HOME';

  V['currency']='MONEY'; V['finances']='MONEY'; V['funding']='MONEY';
  V['funds']='MONEY'; V['income']='MONEY'; V['payment']='MONEY';
  V['salary']='MONEY'; V['wage']='MONEY'; V['wealth']='MONEY';

  V['precipitation']='RAIN'; V['drizzle']='RAIN'; V['downpour']='RAIN';
  V['shower']='RAIN'; V['rainfall']='RAIN'; V['sprinkle']='RAIN';

  V['consume']='EAT'; V['dine']='EAT'; V['feast']='EAT';
  V['ingest']='EAT'; V['devour']='EAT'; V['nibble']='EAT';

  V['physician']='DOCTOR'; V['surgeon']='DOCTOR'; V['pediatrician']='DOCTOR';
  V['specialist']='DOCTOR'; V['cardiologist']='DOCTOR'; V['medic']='DOCTOR';

  V['more']='MORE'; V['additional']='MORE'; V['extra']='MORE';
  V['further']='MORE'; V['another']='MORE'; V['plus']='MORE';
  V['greater']='MORE'; V['increased']='MORE'; V['augment']='MORE';

  V['show']='SHOW'; V['demonstrate']='SHOW'; V['display']='SHOW';
  V['exhibit']='SHOW'; V['present']='SHOW'; V['reveal']='SHOW';
  V['expose']='SHOW'; V['unveil']='SHOW'; V['illustrate']='SHOW';

  V['teach']='TEACH'; V['instruct']='TEACH'; V['educate']='TEACH';
  V['tutor']='TEACH'; V['mentor']='TEACH'; V['train']='TEACH';
  V['coach']='TEACH'; V['guide']='TEACH'; V['cultivate']='TEACH';

  V['answer']='ANSWER'; V['respond']='ANSWER'; V['reply']='ANSWER';
  V['response']='ANSWER'; V['reaction']='ANSWER'; V['feedback']='ANSWER';

  V['ask']='ASK'; V['inquire']='ASK'; V['query']='ASK';
  V['question']='ASK'; V['request']='ASK'; V['petition']='ASK';

  V['bring']='BRING'; V['fetch']='BRING'; V['carry']='BRING';
  V['deliver']='BRING'; V['transport']='BRING'; V['convey']='BRING';

  V['leave']='LEAVE'; V['depart']='LEAVE'; V['exit']='LEAVE';
  V['evacuate']='LEAVE'; V['withdraw']='LEAVE'; V['vacate']='LEAVE';

  V['meet']='MEET'; V['encounter']='MEET'; V['greet']='MEET';
  V['rendezvous']='MEET'; V['assemble']='MEET'; V['gather']='MEET';

  V['try']='TRY'; V['attempt']='TRY'; V['endeavor']='TRY';
  V['strive']='TRY'; V['venture']='TRY'; V['effort']='TRY';

  V['use']='USE'; V['utilize']='USE'; V['employ']='USE';
  V['apply']='USE'; V['implement']='USE'; V['operate']='USE';

  V['remember']='REMEMBER'; V['recall']='REMEMBER'; V['recollect']='REMEMBER';
  V['retain']='REMEMBER'; V['memorize']='REMEMBER'; V['recognize']='REMEMBER';

  V['forget']='FORGET'; V['overlook']='FORGET'; V['neglect']='FORGET';
  V['omit']='FORGET'; V['disregard']='FORGET'; V['ignore']='FORGET';

  V['change']='CHANGE'; V['alter']='CHANGE'; V['modify']='CHANGE';
  V['adjust']='CHANGE'; V['transform']='CHANGE'; V['revise']='CHANGE';
  V['update']='CHANGE'; V['adapt']='CHANGE'; V['convert']='CHANGE';

  V['choose']='CHOOSE'; V['select']='CHOOSE'; V['pick']='CHOOSE';
  V['decide']='CHOOSE'; V['opt']='CHOOSE'; V['prefer']='CHOOSE';
  V['elect']='CHOOSE'; V['determine']='CHOOSE';

  V['continue']='CONTINUE'; V['persist']='CONTINUE'; V['proceed']='CONTINUE';
  V['sustain']='CONTINUE'; V['maintain']='CONTINUE'; V['resume']='CONTINUE';
  V['keep']='CONTINUE'; V['carry on']='CONTINUE';

  V['have']='HAVE'; V['possess']='HAVE'; V['own']='HAVE';
  V['hold']='HAVE'; V['retain']='HAVE'; V['acquire']='HAVE';

  V['begin']='BEGIN'; V['start']='BEGIN'; V['initiate']='BEGIN';
  V['commence']='BEGIN'; V['launch']='BEGIN'; V['introduce']='BEGIN';
  V['originate']='BEGIN'; V['undertake']='BEGIN';

  console.log('[SignBridge] VOCAB_EXT loaded:', Object.keys(D.VOCAB_EXT).length, 'entries');
})();
