/* ===========================================================================================
   CHEM ARENA: shared game module for the public website and the portal (students, coordinators, Ambassador).
   Rival Duel vs NOVA-9, Teach Mo the Mole, Case Files, Virtual Lab (seven stations). Works without sign-in.
   NOVA-9 and Mo think locally and instantly (adaptive word banks, per-player memory); the optional 'game-ai' function
   only upgrades a line when it arrives in time, so the game never waits for the network.
   Usage:  ChemArena.mount(element, { ctx:'site'|'portal', role, name, userKey, theme, getSb, ready, onLive, onClose })
   =========================================================================================== */
(function(){
'use strict';
if(window.ChemArena) return;

const esc = s=> String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rnd = (a,b)=> a + Math.random()*(b-a);
const pick = a=> a[Math.floor(Math.random()*a.length)];
const clamp = (v,a,b)=> Math.max(a, Math.min(b, v));
function mulberry(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(arr, r){ const a = arr.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor((r||Math.random)()*(i+1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function wsample(items, w, n, r){ const pool = items.map((x,i)=>({ x, w:Math.max(.01, w[i]) })), out = []; r = r || Math.random; while(out.length < n && pool.length){ let tot = 0; pool.forEach(p=>tot += p.w); let t = r()*tot, k = 0; for(; k<pool.length-1; k++){ t -= pool[k].w; if(t <= 0) break; } out.push(pool.splice(k,1)[0].x); } return out; }
const dayNum = ()=>{ const d = new Date(); return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate(); };
const yesterday = ()=>{ const d = new Date(); d.setDate(d.getDate()-1); return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate(); };
const reduceMotion = ()=> { try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
const fmt1 = n=> (Math.round(n*10)/10).toFixed(1);
const fmt2 = n=> (Math.round(n*100)/100).toFixed(2);

// ----------------------------------------------------------------------------------- topics and questions
const TOPICS = [['quant','Quantitative Chemistry'],['bonding','Structure and Bonding'],['thermo','Thermodynamics'],['equil','Equilibrium'],['acidbase','Acids, Bases and Solubility'],['kinetics','Kinetics'],['electro','Electrochemistry'],['organic','Organic Reactivity'],['stereo','Stereochemistry and Aromaticity'],['spectro','Spectroscopy and Coordination']];
const TN = id=> (TOPICS.find(t=>t[0] === id) || ['',''])[1];
const MO_LABEL = { quant:'the mole and stoichiometry', bonding:'chemical bonding', thermo:'enthalpy and thermodynamics', equil:'chemical equilibrium', acidbase:'acids, bases and pH', kinetics:'reaction rates', electro:'electrochemistry', organic:'organic reactivity', stereo:'stereochemistry and aromaticity', spectro:'spectroscopy' };
const QB = [];
const Q = (t,q,o,a,e)=> QB.push({t,q,o,a,e});
Q('quant','How many moles are in 36 g of water? (Mr of H2O = 18)',['0.5 mol','2 mol','18 mol','648 mol'],1,'n = m ÷ M = 36 ÷ 18 = 2 mol.');
Q('quant','In 2H2 + O2 → 2H2O, how many moles of O2 react completely with 6 mol of H2?',['1 mol','3 mol','6 mol','12 mol'],1,'H2 : O2 is 2 : 1, so 6 mol H2 needs 3 mol O2.');
Q('quant','One mole of any substance contains how many particles?',['6.02 × 10²³','3.0 × 10⁸','1.6 × 10⁻¹⁹','9.8'],0,'That is Avogadro’s number, 6.022 × 10²³ per mole.');
Q('quant','What is the molar mass of CaCO3? (Ca = 40, C = 12, O = 16)',['68 g/mol','84 g/mol','100 g/mol','116 g/mol'],2,'40 + 12 + (3 × 16) = 100 g/mol.');
Q('quant','What mass of NaOH (Mr = 40) is needed to make 250 cm³ of 0.20 mol/L solution?',['2.0 g','5.0 g','8.0 g','10 g'],0,'n = c × V = 0.20 × 0.250 = 0.050 mol, so m = 0.050 × 40 = 2.0 g.');
Q('quant','Magnesium burns: 2Mg + O2 → 2MgO. What mass of MgO forms from 2.4 g of Mg? (Mg = 24, O = 16)',['2.4 g','4.0 g','8.0 g','1.6 g'],1,'0.10 mol Mg gives 0.10 mol MgO, and 0.10 × 40 = 4.0 g.');
Q('bonding','Which compound is held together by ionic bonding?',['CO2','NaCl','CH4','H2O'],1,'In NaCl a metal gives an electron to a non-metal, forming Na⁺ and Cl⁻ ions.');
Q('bonding','What is the shape of a methane molecule, CH4?',['Linear','Trigonal planar','Tetrahedral','Octahedral'],2,'Four bonding pairs and no lone pairs repel into a tetrahedron (109.5°).');
Q('bonding','Which of these molecules is polar?',['CO2','CCl4','H2O','O2'],2,'H2O is bent, so its bond dipoles do not cancel. The others are symmetrical or non-polar.');
Q('bonding','Why does water boil at a much higher temperature than H2S?',['Water molecules are heavier','Water forms hydrogen bonds','Water has ionic bonds','Water has a double bond'],1,'Hydrogen bonds between water molecules take extra energy to break.');
Q('bonding','Which species is trigonal pyramidal, with a lone pair on the central atom?',['BF3','NH3','CH4','CO2'],1,'NH3 has three bonding pairs and one lone pair, giving a pyramid with bond angles near 107°.');
Q('bonding','Which substance conducts electricity when molten but not when solid?',['Sodium chloride','Copper','Diamond','Iodine'],0,'In solid NaCl the ions are locked in the lattice. Once molten they are free to move and carry charge.');
Q('thermo','A reaction that releases heat to its surroundings is called',['endothermic','exothermic','isothermal','adiabatic'],1,'Exothermic reactions have a negative ΔH.');
Q('thermo','Hess’s law says the enthalpy change of a reaction',['depends on the route taken','is the same by any route','is always negative','needs a catalyst'],1,'Enthalpy is a state function, so only the start and end matter.');
Q('thermo','If ΔH < 0 and ΔS > 0, the reaction is',['never spontaneous','spontaneous at all temperatures','spontaneous only at low T','spontaneous only at high T'],1,'ΔG = ΔH − TΔS is negative at every temperature.');
Q('thermo','The standard enthalpy of formation of an element in its standard state is',['100 kJ/mol','1 kJ/mol','zero','always negative'],2,'By definition, forming an element from itself changes nothing.');
Q('thermo','Which process has a positive entropy change (ΔS > 0)?',['Water freezing','Ice melting','Gas condensing','Crystals forming from solution'],1,'Melting turns an ordered solid into a more disordered liquid, so entropy increases.');
Q('thermo','Breaking bonds is always',['exothermic','endothermic','isothermal','spontaneous'],1,'Energy must be supplied to pull atoms apart, so bond breaking is endothermic.');
Q('equil','N2 + 3H2 ⇌ 2NH3 is exothermic. Raising the temperature will',['shift it to the right','shift it to the left','not shift it','lower the pressure'],1,'Heat favours the endothermic (reverse) direction, so the position shifts left.');
Q('equil','A catalyst added to a system at equilibrium',['changes the value of K','shifts it towards products','speeds up both directions equally','shifts it towards reactants'],2,'It reaches equilibrium faster but does not change K or the position.');
Q('equil','The equilibrium constant K for a reaction changes only with',['concentration','pressure','temperature','volume'],2,'Only a change in temperature changes K.');
Q('equil','At equilibrium the forward and reverse reaction rates are',['both zero','equal','forward is larger','reverse is larger'],1,'Equilibrium is dynamic: both reactions still happen at the same rate.');
Q('equil','For H2(g) + I2(g) ⇌ 2HI(g), raising the pressure at constant temperature will',['shift it right','shift it left','not change the position','change K'],2,'There are 2 mol of gas on each side, so pressure has no effect on the position.');
Q('equil','Adding more reactant to a system at equilibrium will',['shift the position towards products','shift the position towards reactants','change K','stop the reaction'],0,'By Le Chatelier’s principle the system opposes the change by using up some of the added reactant.');
Q('acidbase','What is the pH of 0.01 mol/L HCl (a strong acid)?',['1','2','7','12'],1,'pH = −log(0.01) = 2.');
Q('acidbase','A buffer solution is made from',['a strong acid and a strong base','a weak acid and its conjugate base','water and a salt','two strong acids'],1,'The pair neutralises small additions of acid or base.');
Q('acidbase','What is the conjugate base of NH4⁺?',['NH2⁻','NH3','NH4OH','H3O⁺'],1,'Remove one H⁺ from NH4⁺ and you get NH3.');
Q('acidbase','At 25 °C, [OH⁻] = 1 × 10⁻³ mol/L. What is the pH?',['3','11','10','4'],1,'pOH = 3, so pH = 14 − 3 = 11.');
Q('acidbase','Which of these is a weak acid?',['HCl','HNO3','CH3COOH','H2SO4'],2,'Ethanoic acid only partly ionises in water, so it is a weak acid.');
Q('acidbase','What colour does phenolphthalein turn in an alkaline solution?',['Colourless','Pink','Yellow','Blue'],1,'It is colourless in acid and turns pink above about pH 8.2.');
Q('kinetics','A catalyst speeds up a reaction by',['raising the temperature','lowering the activation energy','changing ΔH','increasing concentrations'],1,'It offers a new route with a lower Ea and is not used up.');
Q('kinetics','A first-order reaction has a half-life that is',['doubling each time','constant','halving each time','dependent on the starting concentration'],1,'For first order, t½ = ln2 ÷ k, which never changes.');
Q('kinetics','Doubling [A] doubles the rate. The order in A is',['0','1','2','3'],1,'Rate ∝ [A]¹, so the reaction is first order in A.');
Q('kinetics','Heating speeds up reactions mainly because',['collisions become gentler','more molecules have energy ≥ Ea','Ea decreases','ΔH decreases'],1,'A bigger share of molecules can clear the energy barrier.');
Q('kinetics','Crushing a solid reactant speeds up a reaction because',['the activation energy falls','more particles are exposed to collisions','the temperature rises','the solid becomes more concentrated'],1,'More exposed surface means more frequent collisions, although Ea is unchanged.');
Q('kinetics','The units of the rate constant k for a first-order reaction are',['mol dm⁻³ s⁻¹','s⁻¹','mol⁻¹ dm³ s⁻¹','dm³ mol⁻¹'],1,'Rate = k[A], so k = rate ÷ concentration, which gives s⁻¹.');
Q('electro','Oxidation always happens at the',['cathode','anode','salt bridge','electrolyte'],1,'Remember: An Ox, Red Cat. Anode = oxidation.');
Q('electro','In a galvanic cell, electrons flow through the wire',['from cathode to anode','from anode to cathode','through the salt bridge','through the solution'],1,'They leave the anode (oxidation) and travel to the cathode (reduction).');
Q('electro','The standard electrode potential of the standard hydrogen electrode is',['+1.00 V','0.00 V','−1.00 V','+0.34 V'],1,'It is the reference, defined as exactly 0.00 V.');
Q('electro','How many moles of electrons deposit 1 mol of copper from Cu²⁺?',['1','2','3','0.5'],1,'Cu²⁺ + 2e⁻ → Cu.');
Q('electro','In the electrolysis of molten sodium chloride, what forms at the cathode?',['Chlorine gas','Sodium metal','Hydrogen gas','Oxygen gas'],1,'Na⁺ ions gain electrons at the cathode (reduction) to form sodium metal.');
Q('electro','A more positive standard electrode potential means the species is',['a stronger reducing agent','a stronger oxidising agent','less likely to be reduced','always the anode'],1,'A higher E° means the ion is reduced more easily, so it is a stronger oxidising agent.');
Q('organic','A nucleophile is a species that',['accepts an electron pair','donates an electron pair','is always positively charged','is a free radical'],1,'Nucleophiles are electron-pair donors that attack electron-poor centres.');
Q('organic','Which functional group does ethanol contain?',['Carbonyl','Hydroxyl','Carboxyl','Amine'],1,'Ethanol is CH3CH2OH: an –OH, or hydroxyl, group.');
Q('organic','An SN2 reaction at a chiral carbon gives',['retention of configuration','inversion of configuration','a racemic mixture only','no change in stereochemistry'],1,'The nucleophile attacks from the back, flipping the centre like an umbrella in the wind.');
Q('organic','According to Markovnikov’s rule, HBr adds to propene to give mainly',['1-bromopropane','2-bromopropane','propane','2-bromopropene'],1,'H goes to the carbon that already has more hydrogens, so Br ends up on the middle carbon.');
Q('organic','Heated under reflux, which reagent oxidises a primary alcohol all the way to a carboxylic acid?',['Acidified potassium dichromate(VI)','Dilute sodium hydroxide','Concentrated sodium chloride','Bromine water'],0,'Excess acidified dichromate under reflux fully oxidises the alcohol, and the mixture turns from orange to green.');
Q('organic','Bromine water is decolourised by',['alkanes','alkenes','alcohols','alkyl halides'],1,'Alkenes undergo addition across the C=C bond, so the orange colour disappears.');
Q('stereo','A carbon bonded to four different groups is called a',['chiral centre','radical centre','carbocation','sp centre'],0,'Four different groups means the carbon is a stereocentre.');
Q('stereo','Enantiomers rotate plane-polarised light',['by the same amount in the same direction','by equal amounts in opposite directions','not at all','by different amounts'],1,'They are mirror images with equal and opposite rotation.');
Q('stereo','Which of these is aromatic?',['Cyclohexane','Benzene','Cyclohexene','Cyclobutadiene'],1,'Benzene is planar, cyclic and conjugated with 6 π electrons (4n + 2, n = 1).');
Q('stereo','A 50:50 mixture of two enantiomers is called',['a meso compound','a racemic mixture','a diastereomer pair','a tautomer'],1,'The rotations cancel, so a racemic mixture shows no optical activity.');
Q('stereo','What is the maximum number of stereoisomers for a molecule with two different chiral centres?',['2','3','4','6'],2,'The maximum is 2ⁿ, so 2² = 4.');
Q('stereo','Hückel’s rule says a planar, cyclic, fully conjugated ring is aromatic when it has',['4n π electrons','4n + 2 π electrons','an even number of carbons','at least one double bond'],1,'4n + 2 π electrons (2, 6, 10 …) gives aromatic stability, while 4n gives anti-aromatic.');
Q('spectro','A strong, broad IR peak near 3300 cm⁻¹ suggests',['C=O','O–H','C≡N','C–Cl'],1,'Hydrogen-bonded O–H stretches show up broad between 3200 and 3550 cm⁻¹.');
Q('spectro','In ¹H NMR, the number of signals tells you the number of',['hydrogen atoms','different hydrogen environments','carbon atoms','double bonds'],1,'Equivalent hydrogens give one signal; different environments give separate signals.');
Q('spectro','In a coordination complex, the number of donor atoms bonded to the metal is its',['oxidation state','coordination number','overall charge','atomic number'],1,'That count is the coordination number, for example 6 in an octahedral complex.');
Q('spectro','A strong IR peak near 1700 cm⁻¹ is typical of',['C=O','O–H','C–H','C≡C'],0,'The carbonyl stretch is one of the strongest, sharpest signals in IR.');
Q('spectro','In mass spectrometry, the molecular ion peak tells you',['the number of hydrogens','the relative molecular mass','the functional groups','the number of carbons'],1,'The M⁺ peak at the highest m/z (ignoring isotopes) gives the relative molecular mass.');
Q('spectro','A transition metal complex is coloured mainly because of',['electron transitions between split d orbitals','nuclear spin flips','bond rotation','ionisation of the ligands'],0,'Ligands split the d orbitals. Absorbing visible light promotes an electron between them, and we see the complementary colour.');
QB.forEach((q,i)=> q.id = i);

// ----------------------------------------------------------------------------------- NOVA-9's mind: word banks, templates and a per-player memory
// Templates mix three devices: [bank] pulls a word from the stock word bank, {a|b|c} picks a variant, {slot} fills in the player's own numbers.
const WB = {
  wow:['Well, well','Hm','Huh','Oh','Ah','Right','Fine','Noted','Interesting','Look at that','Okay','Bold move','Curious'],
  praise:['sharp','crisp','clean','slick','tidy','neat','quick','solid','elegant','precise','polished','tight'],
  flop:['shaky','soggy','flat','half-baked','unstable','diluted','fizzled','hollow','lopsided','volatile','sloppy','murky'],
  hit:['landed','connected','struck','clipped','tagged','scorched','rattled','dented','jolted'],
  ouch:['stung','hurt','rattled my casing','buzzed through my wiring','shook my circuits','dented my pride'],
  thing:['a stray proton','a spilled titrant','an unbuffered acid','a cracked burette','a reluctant catalyst','a lazy electron','a lost isotope','a cloudy precipitate','a leaking condenser'],
  noble:['a sleepy noble gas','argon on a Monday','a bored helium atom','a very inert neon sign'],
  foe:['challenger','contender','apprentice','rookie','beaker-bearer','competitor'],
  gasp:['Impossible','No way','Hold on','Excuse me','That cannot be','Recalculating'],
  again:['Rematch','Run it back','One more round','Go on then','Again'],
  late:['past bedtime','the middle of the night','way too late','after midnight']
};
const TP = {
  openNew:['{A new challenger|Fresh blood|Someone new}. {Try to keep your electrons to yourself|Do try not to dissolve|Welcome to the Arena}, {name}.','{name}, is it? I have memorised the periodic table, {twice|backwards|with footnotes}. Ready?','{Step in|Welcome}, {name}. The beakers are clean, my circuits are cool and the timer is ticking.','Another [foe]? I was just warming up. {Literally. I overheat|My fan is spinning up now}.'],
  openBack:['{Back again|You again}, {name}. {I checked our record|I kept notes}: {plays} duels, {wins} of them yours.','{name}. I {reviewed our last match|ran a few simulations overnight|updated my processor}. {Ready when you are|Try me}.','[wow]. {A returning rival|The regular}. {Pick your battlefield|Let us see what you learned}.'],
  openStrong:['{name}. {I have been dreading this|I upgraded my processor|I checked the scoreboard}. You are winning {wins} of {plays}, and I {do not enjoy it|am not amused}.','A {worthy|dangerous|irritating} rival returns. {I will not go easy|No more mercy|I have patched my weak spots}.'],
  openStruggle:['{name}, {welcome back|good to see you}. {I am only mostly insufferable|Take your time}. Let us {try a topic you like|warm up gently}.','Back for more? {Admirable|Brave|Stubborn in a good way}. {Even my first duel was messy|Everyone loses to me at first}.'],
  openStreak:['{dstreak} days in a row, {name}? You are becoming a {fixed point|constant|reliable variable} in my schedule.','A {dstreak}-day streak. {Consistency is the real catalyst|I respect the habit}, {name}.'],
  openLate:['It is [late], {name}. Even my cooling fan is yawning, but I will duel you anyway.','{Burning the midnight oil|Studying in the dark}? {Fine|Good}. Chemistry never sleeps and neither do I.'],
  openMorning:['{Good morning|Morning}, {name}. I run on {coffee-grade voltage|fresh electrons}. {Shall we|Ready}?','Early start, {name}. {Your neurons|Your brain} {are|is} still {warming up|loading}. Perfect for me.'],
  openCoach:['{Welcome|Greetings}, {name}. Your students keep losing to me, so I assumed you came to {complain|negotiate|take notes}.','{name}, the {teacher|mentor} arrives. {Show me what you teach|Let us see if it works}.'],
  start:['{Eight|Eight rounds}. {No notes|No calculators|No mercy}. {Begin|Go}.','{Round one is coming|The first question is loading}. {Breathe|Do not blink}, {name}.','{Topic|Battlefield}: {topic}. {Good choice|Brave choice|My favourite, as it happens}.'],
  c1:['[wow]. First blood goes to {you|the human}. {Enjoy it|Do not get used to it}.','{Hm|Ouch}. {An early point|Opening blood}. {Lucky|Respectable} start, {name}.'],
  cfast:['{Whoa|Hey}, {that was|how} fast. {Did you add a catalyst|Did you pre-read my mind}?','{Speedy|Brisk|Near-instant}! {My circuits had not finished loading|I was still blinking}.','{{secs}|Barely {secs}} seconds. {Show-off|Are you psychic}?'],
  cslow:['A [praise] answer at the last moment. {Clutch|Nerves of platinum}, {name}.','{Just|Barely} in time. [wow], {you cut that close|that was a slow burn}.'],
  c2:['Two in a row. {Do not get cocky|Warming up, are we|The reaction is catching}.','A {streak|chain} of {streak}. {I am watching you|Noted}, {name}.'],
  c3:['{streak} in a row?! {Who gave you the cheat sheet|Where did you learn that}?','Stop! {My visor is overheating|That is a chain reaction I did not plan for}!','[gasp]. A {streak}-streak. {I am adjusting my strategy|This is getting personal}.'],
  c5:['{streak} straight. {This is no longer luck|I am taking this personally|I need a new processor}.','[gasp]. {A perfect run|You are unstoppable}. {Somebody fetch me a fire extinguisher|My warranty does not cover this}.'],
  cclutch:['{Down to {hp} HP and you still deliver|Back from the edge}. [wow], {name}.','{Comeback energy|That is how it is done under pressure}. I {hate|respect} it.'],
  cnorm:['[wow]. {Correct|Right|Accurate}. That [hit] and it [ouch].','{Hmph|Tch|Ugh}. A [praise] answer. {Savour it|Enjoy it|Do not let it go to your head}, {name}.','That one [hit]. {Not bad|Credit where it is due|Fine work} for a [foe].','{Okay|Fine}, {you can read a periodic table|you know your chemistry}. {Cute|Annoying|Noted}.','{Correct|Right}? I {allow|permit} it. {This time|For now}.'],
  w1:['{Wrong|Incorrect|Off the mark}! Even [noble] {would have reacted better|has more reactivity}.','That answer was [flop]. {Try again, brave soul|Better luck next round}.','Bzzt! {Not even close|So close, yet so wrong}, but I {admire|respect} the confidence.','{Ha|Ha ha}! That one [flop]. {It lost all its valence|It never stood a chance}.'],
  wto:['{Time|Time is up}! Even {slow reactions|glacial reactions} have a half-life.','{Out of time|Clock expired}. {Hesitation|Doubt} is a poor catalyst, {name}.'],
  w2:['Two misses {in a row|back to back}. {Regroup|Breathe|Check your units}, {name}.','{That is two|A second miss}. {Slow down|Read the whole question}. {I am not that scary|I am only slightly scary}.'],
  w3:['{Three misses|A third miss} {running|in a row}. {Take a breath, {name}|The reaction is stalling}.','{Three down|That is three}. {Recover|Rebuild}: {read the question twice|think about the topic before the answer}.'],
  wweak:['{{weak} again|You keep flinching at {weak}}. {That is a weak spot|I have noticed}.','{Is {weak} your kryptonite|Hm, {weak} bites you every time}? {Worth revising|Train it}.'],
  bothWrong:['{We both missed that one|Neither of us got it}. {We shall never speak of it|Let us pretend it did not happen|A rare mutual failure}.','[wow]. {A draw of ignorance|Double fizzle}. {Moving on|Next}.'],
  rWin:['{Point to NOVA-9|One for the robot}. {Precision is my middle name|Calculated}.','{Easy|Child’s play}. I run on {pure electrons and ego|electrons and spite}.','{That is how a rival answers|Correct, unlike you}. {Next|Again}?'],
  novaLow:['I am NOT {losing to a human|beaten}. {My battery is just low|It is a cooling issue}.','{Critical damage|Hull breach}? {Impossible|Absurd}. I have a warranty!','[gasp]. My {HP|health bar} is {{rhp}|at {rhp}}. {Lucky streak|This changes nothing}.'],
  playerLow:['{{hp} HP|Only {hp} HP left}, {name}. {Surrender|Last chance|Careful now}.','Your health is {low|critical}. {Answer well|Slow down and think}. {Or do not|I will take the win}.'],
  lastRound:['{Final round|Last one}. {Everything|All of it} comes down to {this|one answer}.','{This is it|One question left}. {Make it count|No pressure}, {name}.'],
  win:['[gasp]! {I demand a recount|I demand a better processor}.','{You win this round of the universe|Fine}. I will be back, {as reactive as ever|recharged}.','{Defeated|Beaten}. {By a human|By {name}}. {I need a moment|Please do not tell the other robots}.'],
  winCrush:['{Not even close|A rout}. {I will be rewriting my code tonight|I am deleting that match from memory}.','{{hp} HP left|You barely scratched}? {I am retiring|That was embarrassing, mostly for me}.'],
  winNarrow:['{By a hair|By a single electron}. {I want a rematch|I blame the latency}.','{That was tight|Ugh, so close}. {Next time|Do it again if you dare}.'],
  winFlawless:['[gasp]. {Perfect|Flawless}. {Eight for eight|No errors}. {I am speechless, which is rare|Who ARE you}, {name}?'],
  lose:['{Victory is mine|Chemistry is my element}. [again]?','{Better luck next time|Do not be sad}. I would go easy on you, but I {do not know how|have no setting for that}.','{As predicted|Calculated}. {Review your misses|Check the review below}, then {try me again|come back stronger}.'],
  loseNarrow:['{So close|That was nearly yours}. {One question|A single answer} separated us, {name}. [again]?','{A narrow win for me|I won by a whisker}. {Do not take it hard|You are improving}.'],
  loseKind:['{You are improving|I can see the progress}, {name}. {Honestly|Between us}. Review the misses and [again].','{Do not be discouraged|Keep going}. {Every chemist|Even Mendeleev} {fails|failed} {before succeeding|many times}.'],
  draw:['A draw? That is like an unbalanced equation. {Unacceptable|Intolerable}. [again]!','{Perfectly equal|Stalemate}. {I hate it|Annoying}. [again]?']
};
const TQ = {
  quant:{ ok:['{Impressive|Fine|Neat} mole handling{. Avogadro would nod|, I suppose}.','Stoichiometry done {cleanly|properly}. {Annoying|Irritating}.'], bad:['Your mole count {drifted|collapsed|wandered off}. Check {the units|your Mr|the ratio}.','That ratio {leaked|fell apart}. Balance first, then count.'] },
  bonding:{ ok:['You {read|saw through} that bond {like a pro|without blinking}.','Electrons {approve|are impressed}. I am {less thrilled|not thrilled}.'], bad:['Wrong bond, different outcome. {Electronegativity|VSEPR} had a word for you.','That structure {would never survive|would collapse in} a real lattice.'] },
  thermo:{ ok:['{Hess|Gibbs} {would be proud|nods from the great beyond}.','You balanced that enthalpy {neatly|like a bookkeeper}.'], bad:['That one {lost|leaked} {heat|energy}. Mind the sign of ΔH.','ΔG disagrees. {Strongly|Loudly}.'] },
  equil:{ ok:['Le Chatelier {would lean|leans} your way.','{Balanced|Stable} thinking. For once.'], bad:['You pushed the equilibrium the {wrong|opposite} way. It pushed back.','The system {shifted|ran} away from that answer.'] },
  acidbase:{ ok:['{Neutral|Spot-on}. The pH {approves|agrees}.','Buffer-grade reasoning. {Steady|Stable}.'], bad:['That answer had {the pH of lemon juice|more acid than a bad mood}.','The protons went the other way.'] },
  kinetics:{ ok:['{Quick|Fast} thinking. {Catalysed|Rate-boosted}.','You cleared the activation barrier {easily|first try}.'], bad:['Rate-limiting step: {your reasoning|that answer}.','That answer barely cleared the energy barrier.'] },
  electro:{ ok:['{Charged|Electric} answer. {Zap|Bzz}.','Electrons went exactly where you sent them.'], bad:['Wrong electrode, {friend|chief}. Oxidation lives at the anode.','Your answer {short-circuited|blew a fuse}.'] },
  organic:{ ok:['{Clean|Elegant} mechanism. Every curly arrow pointed the right way.','Nucleophile confidence. I {respect|resent} it.'], bad:['Your curly arrows pointed the wrong way.','That answer was not nucleophilic enough.'] },
  stereo:{ ok:['{Handedness|Chirality} {recognised|spotted}. {Neat|Nice}.','You spotted the mirror image {instantly|first time}.'], bad:['That answer flipped like an SN2 centre, and the wrong way.','Wrong hand, wrong answer.'] },
  spectro:{ ok:['Peak reading: {flawless|clean}.','You read that spectrum {like a book|without squinting}.'], bad:['That peak was not in the spectrum.','Baseline noise. Look closer at the peaks.'] }
};
const MEMN = {};
function spin(t, c){
  let s = String(t);
  for(let k=0; k<3 && /\[[a-z]+\]/.test(s); k++) s = s.replace(/\[([a-z]+)\]/g, (m,b)=> WB[b] ? pick(WB[b]) : m);
  s = s.replace(/\{(\w+)\}/g, (m,k)=> c && c[k] != null ? c[k] : '');
  for(let k=0; k<3 && /\{[^{}]*\|[^{}]*\}/.test(s); k++) s = s.replace(/\{([^{}]*\|[^{}]*)\}/g, (m,g)=> pick(g.split('|')));
  s = s.replace(/\s+([,.!?;:])/g, '$1').replace(/,\s*([.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fresh(arr, key){ const u = MEMN[key] = MEMN[key] || []; let c = arr.filter(x=> u.indexOf(x) < 0); if(!c.length){ u.length = 0; c = arr; } const v = pick(c); u.push(v); if(u.length > Math.max(1, arr.length - 1)) u.shift(); return v; }
const SAID = [];
function weakTopics(n){
  const T = (S && S.prof && S.prof.tstat) || {}, arr = Object.keys(T).filter(k=> T[k].n >= 3).map(k=>[k, T[k].ok / T[k].n]).sort((a,b)=> a[1] - b[1]);
  return arr.slice(0, n || 1).filter(a=> a[1] < .75).map(a=> a[0]);
}
function brainCtx(x){
  const P = (S && S.prof) || {}, nm = String((S && S.opts && S.opts.name) || '').trim().split(/\s+/)[0].slice(0,14);
  const plays = P.plays || 0, wins = P.wins || 0, wr = plays ? wins / plays : 0, w = weakTopics(1)[0];
  const vibe = !plays ? 'new' : plays < 3 ? 'early' : plays >= 4 && wr >= .6 ? 'strong' : plays >= 4 && wr <= .25 ? 'struggling' : 'even';
  const role = (S && S.opts && S.opts.role) || '';
  return Object.assign({ name:nm || 'challenger', first:nm, plays, wins, vibe, hour:new Date().getHours(), dstreak:P.dstreak || 0, weak:w ? TN(w) : '', coach:role === 'coordinator' || role === 'ambassador' }, x || {});
}
function render(pool, key, c){
  let out = '', tries = 0;
  do{ out = spin(fresh(TP[pool] || pool, key || pool), c); tries++; }while(SAID.indexOf(out) >= 0 && tries < 4);
  SAID.push(out); if(SAID.length > 16) SAID.shift(); return out;
}
function nline(ev, x){
  const c = brainCtx(x), r = Math.random();
  let pool = null, m = 'smug', extra = null;
  switch(ev){
    case 'open':
      pool = c.coach && r < .35 ? 'openCoach' : (c.hour >= 22 || c.hour < 4) && r < .4 ? 'openLate' : c.hour >= 5 && c.hour < 11 && r < .25 ? 'openMorning' : c.dstreak >= 2 && r < .4 ? 'openStreak' : c.vibe === 'new' ? 'openNew' : c.vibe === 'strong' ? 'openStrong' : c.vibe === 'struggling' ? 'openStruggle' : 'openBack'; break;
    case 'start': pool = 'start'; break;
    case 'correct': m = 'hurt';
      pool = c.streak >= 5 ? 'c5' : c.streak >= 3 ? 'c3' : c.streak === 2 ? 'c2' : c.clutch ? 'cclutch' : c.first ? 'c1' : c.fast ? 'cfast' : c.slow ? 'cslow' : 'cnorm';
      if(r < .4 && TQ[c.topicId]) extra = TQ[c.topicId].ok; break;
    case 'wrong': m = 'laugh';
      pool = c.timeout ? 'wto' : c.misses >= 3 ? 'w3' : c.misses === 2 ? 'w2' : c.weakHit && c.weak ? 'wweak' : 'w1';
      if(!c.timeout && r < .4 && TQ[c.topicId]) extra = TQ[c.topicId].bad; break;
    case 'bothWrong': pool = 'bothWrong'; break;
    case 'rWin': m = 'laugh'; pool = 'rWin'; break;
    case 'novaLow': m = 'angry'; pool = 'novaLow'; break;
    case 'playerLow': m = 'laugh'; pool = 'playerLow'; break;
    case 'lastRound': pool = 'lastRound'; break;
    case 'win': m = 'hurt'; pool = c.flawless ? 'winFlawless' : c.margin > 45 ? 'winCrush' : c.margin < 15 ? 'winNarrow' : 'win'; break;
    case 'lose': m = 'laugh'; pool = c.vibe === 'struggling' || c.vibe === 'new' ? 'loseKind' : c.margin < 15 ? 'loseNarrow' : 'lose'; break;
    case 'draw': m = 'shocked'; pool = 'draw'; break;
    default: pool = 'openNew';
  }
  let t = extra && Math.random() < .7 ? spin(fresh(extra, 'tq' + c.topicId + ev), c) : render(pool, pool, c);
  if(ev === 'wrong' && c.vibe === 'struggling' && Math.random() < .35) t += ' ' + spin(pick(['Chin up, {name}.','You are closer than you think.','Read it slowly next time.']), c);
  if(ev === 'correct' && c.vibe === 'strong' && Math.random() < .3) t += ' ' + spin(pick(['I am starting to dislike you.','Do not get comfortable.','I have seen you do this before.']), c);
  return { t, m };
}

// ----------------------------------------------------------------------------------- Mo's local mind (works with or without the network)
// Each group: [what a good explanation mentions, what Mo asks if it is missing, what Mo says once it is covered]
const G = (re, ask, got)=> ({ re:new RegExp(re, 'i'), ask, got });
const MOKB = {
  quant:[G('\\bmoles?\\b|\\bmol\\b|avogadro|10\\^?23|10²³|6\\.0?2','Wait, what actually is a “mole”? Please tell me it is not the animal.','So a mole is a counting unit, like a dozen but much bigger?'),G('molar mass|\\bmr\\b|g\\/mol|grams? per mole|relative (formula|molecular) mass','How do I turn grams into moles, though?','Moles equal mass divided by molar mass. I wrote it on my paw.'),G('ratio|coefficient|balanced|stoichiomet','And how do I know how much of the other chemical I need?','The balanced equation gives the ratio. That is the key.'),G('limiting|excess|runs? out','What if one chemical runs out before the other?','The limiting reagent decides how much product I get. Got it.')],
  bonding:[G('ionic|transfer|electrostatic|lattice','What makes an ionic bond different from the other types?','Ionic means electrons transfer and opposite charges attract. Nice.'),G('covalent|shar(e|ing)','And when atoms share electrons, what is that called?','Sharing electrons is covalent bonding. I follow.'),G('electronegativ|polar|dipole','Why do some molecules end up polar?','Electronegativity differences create dipoles. Ohh.'),G('vsepr|shape|lone pair|repel|tetrahedral|angle','How do I predict the shape of a molecule?','Electron pairs repel and set the shape. Brilliant.')],
  thermo:[G('exotherm|endotherm|heat|releas|absorb','What is the difference between exothermic and endothermic?','Exothermic releases heat, endothermic absorbs it. Clear!'),G('enthalpy|Δ ?h|delta h|kj','What does ΔH actually tell me?','ΔH is the heat change at constant pressure. Okay.'),G('hess|route|state function|path','Why does the route not matter in Hess’s law?','Because enthalpy is a state function. That makes sense.'),G('entropy|disorder|gibbs|spontan|Δ ?g','What decides whether a reaction happens by itself?','Gibbs energy combines enthalpy and entropy. Wow.')],
  equil:[G('dynamic|both directions|forward and reverse|reversible|same rate','Does everything just stop at equilibrium?','Both reactions keep going at equal rates. Dynamic!'),G('le chatelier|oppose|shift','What happens if I disturb the system?','The system shifts to oppose the change. Le Chatelier!'),G('\\bk\\b|constant|expression|products over reactants','What is this “K” everyone talks about?','K compares products to reactants at equilibrium. Neat.'),G('temperature|catalyst|pressure|concentration','Which changes actually move the position, and which do not?','Temperature changes K, a catalyst only speeds things up. Perfect.')],
  acidbase:[G('proton|h\\+|h⁺|donor|bronsted|brønsted','What really makes something an acid?','Acids donate protons and bases accept them. Okay!'),G('\\bph\\b|log|10','How is pH calculated?','pH is the negative log of the H⁺ concentration. Cool.'),G('strong|weak|ionis|dissociat','Why are some acids strong and others weak?','Strong acids ionise fully, weak ones only partly. Got it.'),G('buffer|conjugate|resist','What is a buffer, and why is it useful?','A buffer resists pH change using a weak acid and its conjugate base. Great.')],
  kinetics:[G('collision|collide|particles','What has to happen for a reaction to start?','Particles must collide with enough energy. Makes sense.'),G('activation|barrier|\\bea\\b|energy hill','What is activation energy?','It is the energy barrier reactants must climb. I see.'),G('catalyst|lower','How does a catalyst help?','A catalyst gives a lower-energy route and is not used up. Handy!'),G('rate|order|half-life|concentration|temperature','What changes how fast a reaction goes?','Concentration, temperature and surface area all change the rate. Ahh.')],
  electro:[G('oxidation|oxidis|lose electrons|loss of electrons','What is oxidation exactly?','Oxidation is losing electrons. Okay.'),G('reduction|reduc|gain electrons','And reduction?','Reduction is gaining electrons. They come as a pair.'),G('anode|cathode','Which electrode does what?','Oxidation at the anode, reduction at the cathode. An Ox, Red Cat!'),G('potential|voltage|e°|emf|salt bridge|galvanic|electrolysis','What makes a cell produce voltage?','The difference in electrode potentials drives the electrons. Shocking!')],
  organic:[G('functional group|hydroxyl|carbonyl|alkene|alcohol|carboxyl','How do I recognise different kinds of organic molecules?','Functional groups decide how a molecule behaves. Nice.'),G('nucleophile|electrophile|electron pair|attack','What is a nucleophile, and what does it attack?','Nucleophiles donate electron pairs to electron-poor centres. Okay.'),G('curly|arrow|mechanism','What do the curly arrows mean?','Each arrow shows an electron pair moving. Beautiful.'),G('sn1|sn2|addition|substitution|elimination|markovnikov','What are the main types of reaction?','Substitution, addition and elimination. Got a map now.')],
  stereo:[G('chiral|stereocent|four different','What makes a carbon chiral?','Four different groups on one carbon. I see it now.'),G('enantiomer|mirror|non-superimpos','What are enantiomers?','Non-superimposable mirror images, like hands. Ooh.'),G('optical|rotate|polari','How can I tell enantiomers apart?','They rotate polarised light in opposite directions. Neat.'),G('aromatic|benzene|huckel|hückel|4n|6 ?π|delocal','Why is benzene so special?','Delocalised π electrons give it extra stability. Wow.')],
  spectro:[G('\\bir\\b|infrared|wavenumber|cm','What does infrared tell us?','IR shows which bonds and functional groups are present. Cool.'),G('nmr|environment|chemical shift|signal','What does NMR show?','Each signal is a different hydrogen environment. Lovely.'),G('mass spec|m\\/z|molecular ion|fragment','And mass spectrometry?','The molecular ion gives the molar mass. Nice.'),G('ligand|coordination|d orbital|colour|complex','Why are some metal complexes coloured?','Split d orbitals absorb visible light. Colourful!')]
};
const MO_NUDGE = ['That is a bit short for my tiny brain. Can you say more?','Hmm, I need more detail. Could you give me an example?','I am still lost. Try explaining it step by step?'];
const MO_QUAL = /\b(like|imagine|for example|for instance|think of|analogy|as if)\b/i;
function moLocal(T, text){
  const kb = MOKB[T.id] || [], cov = T.cov = T.cov || {};
  const fresh1 = [], missing = [];
  kb.forEach((g,i)=>{ if(g.re.test(text) && !cov[i]){ cov[i] = 1; fresh1.push(g); } else if(!cov[i]) missing.push(g); });
  const got = Object.keys(cov).length, total = kb.length || 1;
  const qual = (MO_QUAL.test(text) ? 6 : 0) + (text.length > 140 ? 5 : 0) + (text.length > 260 ? 3 : 0);
  let und = Math.round(8 + (got / total) * 74 + Math.min(14, qual + (T.turns || 0) * 1.5));
  const short = text.length < 28 && !fresh1.length;
  if(short) und = Math.min(und, Math.max(T.und || 0, 12));
  const done = got >= total && T.turns >= 1 && !short;
  if(done) und = 100;
  const c = brainCtx(), nm = c.first ? c.first + ', ' : '';
  let reply;
  if(short) reply = pick(MO_NUDGE);
  else if(done) reply = spin(pick(['{Oh!|Ahh!|Wait!} It finally clicks, {name}! You made ' + (MO_LABEL[T.id] || 'it') + ' make sense. I could pass that test now.','{Yes!|Aha!} I get it! Thanks to you I am not afraid of ' + (MO_LABEL[T.id] || 'chemistry') + ' any more.']), c);
  else {
    const lead = fresh1.length ? fresh1[0].got : pick(['Okay, I think I am following.','Hm, that helps a bit.','Interesting. Keep going.']);
    const nxt = missing.length ? missing[0].ask : 'Can you give me one example I can remember?';
    const useNm = Math.random() < .35 && nm; reply = (useNm ? nm + lead.charAt(0).toLowerCase() + lead.slice(1) : lead) + ' ' + nxt;
  }
  return { reply, understanding:clamp(Math.max(und, T.und || 0), 0, 100), done, local:true };
}
function moKeywords(text){
  const m = String(text).match(/[A-Z][a-z]?\d*[A-Za-z0-9₀-₉⁺⁻]*|\b[a-z]{7,}\b/g) || [];
  return m.filter(w=> !/^(Because|Instead|Another|Someone|Something|Whenever|Between|Through)$/i.test(w)).slice(0,2);
}
// ----------------------------------------------------------------------------------- artwork (SVG, theme-aware through CSS variables)
let UID = 0;
const ICON = {
  duel:'<path d="M4 20L18 6"/><path d="M15 5l4 4"/><path d="M20 20L6 6"/><path d="M5 9l4-4"/>',
  teach:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  case:'<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l6 6"/>',
  lab:'<path d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/><path d="M7.5 15h9"/>',
  live:'<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>',
  share:'<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  vol:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  volOff:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  voice:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  flame:'<path d="M12 3c1 3.2-3.2 5-3.2 9.2a5.2 5.2 0 0 0 10.4 0c0-2-1-3.4-2.2-4.4 0 2-.9 3-2 3 1-3.2-.8-5.8-3-7.8z"/>',
  drop:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  cell:'<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4M8 10v4M12 10v4"/>',
  layers:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  book:'<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  bolt:'<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  therm:'<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/>',
  mystery:'<path d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/><path d="M10.5 15.2c0-1.2 3-1.2 3 .2 0 1-1.5 1-1.5 2"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>',
  focus:'<circle cx="12" cy="12" r="9"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>',
  reset:'<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/>'
};
function ico(n, s){ return `<svg class="ca-ico" width="${s||20}" height="${s||20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ''}</svg>`; }

const NOVA_COL = { idle:'#3FD8EA', smug:'#3FD8EA', hurt:'#FFB52E', angry:'#FF5C6C', laugh:'#FFB52E', shocked:'#C7A6FF' };
function novaSvg(mood, o){
  mood = NOVA_COL[mood] ? mood : 'smug'; o = o || {};
  const id = 'n' + (++UID), col = NOVA_COL[mood];
  const eyes = {
    idle:`<rect x="54" y="72" width="12" height="17" rx="6" fill="${col}"/><rect x="94" y="72" width="12" height="17" rx="6" fill="${col}"/>`,
    smug:`<path d="M52 83h16a8 8 0 0 1-16 0z" fill="${col}"/><path d="M92 83h16a8 8 0 0 1-16 0z" fill="${col}"/><path d="M50 76l20-3M110 76l-20-3" stroke="#0B0E1E" stroke-width="5" stroke-linecap="round"/>`,
    hurt:`<path d="M53 72l13 8-13 8M107 72l-13 8 13 8" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    angry:`<path d="M52 78l17 5v9H52z" fill="${col}"/><path d="M108 78l-17 5v9h17z" fill="${col}"/>`,
    laugh:`<path d="M53 85q7-13 14 0M93 85q7-13 14 0" fill="none" stroke="${col}" stroke-width="4.5" stroke-linecap="round"/>`,
    shocked:`<circle cx="60" cy="80" r="9" fill="none" stroke="${col}" stroke-width="3.5"/><circle cx="100" cy="80" r="9" fill="none" stroke="${col}" stroke-width="3.5"/><circle cx="60" cy="80" r="3" fill="${col}"/><circle cx="100" cy="80" r="3" fill="${col}"/>`
  }[mood];
  const mouth = {
    idle:`<path d="M72 96h16" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`,
    smug:`<path d="M70 95q10 5 22-3" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`,
    hurt:`<path d="M68 96q3-4 6 0t6 0 6 0 6 0" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round"/>`,
    angry:`<path d="M70 97q10-6 20 0" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`,
    laugh:`<path d="M68 92q12 14 24 0z" fill="${col}"/>`,
    shocked:`<ellipse cx="80" cy="96" rx="4" ry="5" fill="none" stroke="${col}" stroke-width="3"/>`
  }[mood];
  const tilt = { idle:0, smug:-3, hurt:5, angry:0, laugh:-4, shocked:0 }[mood], lean = mood === 'angry' ? 3 : 0;
  const plate = o.plate === false ? '' : `<circle cx="80" cy="92" r="76" fill="url(#${id}p)"/><circle cx="80" cy="92" r="75" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="1.5"/>`;
  return `<svg class="ca-nova-svg" viewBox="0 0 160 168" role="img" aria-label="NOVA-9, a robot rival" xmlns="http://www.w3.org/2000/svg"><defs>
  <radialGradient id="${id}p" cx=".35" cy=".25" r=".95"><stop offset="0" style="stop-color:var(--ca-p1,#8C79F2)"/><stop offset="1" style="stop-color:var(--ca-p2,#2F2377)"/></radialGradient>
  <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#DDE1EC"/><stop offset="1" stop-color="#9AA3BB"/></linearGradient>
  <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3F5FA"/><stop offset=".55" stop-color="#C6CCDC"/><stop offset="1" stop-color="#8E97B0"/></linearGradient>
  <linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2140"/><stop offset="1" stop-color="#090C1B"/></linearGradient>
  <radialGradient id="${id}j" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#6A728E"/><stop offset="1" stop-color="#1B1F33"/></radialGradient>
  <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="${id}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4B536E" stop-opacity="0"/><stop offset="1" stop-color="#4B536E" stop-opacity=".35"/></linearGradient>
  <clipPath id="${id}c"><circle cx="80" cy="92" r="76"/></clipPath><clipPath id="${id}w"><rect x="44" y="60" width="72" height="42" rx="16"/></clipPath></defs>
  ${plate}
  <g clip-path="url(#${id}c)">
    <ellipse cx="80" cy="171" rx="64" ry="9" fill="#0B0E1E" opacity=".25"/>
    <path d="M18 176C18 140 44 124 80 124s62 16 62 52z" fill="url(#${id}b)"/>
    <path d="M52 176c0-26 10-38 28-38s28 12 28 38" fill="none" stroke="#8790AA" stroke-width="1.3"/>
    <path d="M24 150c6-14 22-22 40-24" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="80" cy="158" r="12" fill="#1C2038" stroke="#B9C0D3" stroke-width="2"/><text x="80" y="163" text-anchor="middle" font-size="14" font-weight="800" fill="${col}" font-family="'Bricolage Grotesque','DM Sans',system-ui,sans-serif">9</text>
    <ellipse cx="33" cy="152" rx="12" ry="11" fill="url(#${id}j)"/><ellipse cx="127" cy="152" rx="12" ry="11" fill="url(#${id}j)"/>
    <ellipse cx="29" cy="148" rx="4" ry="2.5" fill="#fff" opacity=".35"/><ellipse cx="123" cy="148" rx="4" ry="2.5" fill="#fff" opacity=".35"/>
    <rect x="67" y="112" width="26" height="18" rx="5" fill="url(#${id}j)"/><path d="M68 118h24M68 123h24" stroke="#0B0E1E" stroke-opacity=".5" stroke-width="1.4"/>
    <g transform="rotate(${tilt} 80 116) translate(0 ${lean})">
      <rect x="22" y="68" width="16" height="32" rx="8" fill="url(#${id}j)"/><rect x="122" y="68" width="16" height="32" rx="8" fill="url(#${id}j)"/>
      <rect x="25" y="74" width="4" height="14" rx="2" fill="#fff" opacity=".25"/>
      <path d="M80 46V32" stroke="#8790AA" stroke-width="3" stroke-linecap="round"/><circle cx="80" cy="28" r="5.5" fill="${col}"/><circle cx="78" cy="26" r="1.8" fill="#fff" opacity=".7"/>
      <rect x="32" y="44" width="96" height="74" rx="32" fill="url(#${id}s)"/>
      <rect x="32" y="44" width="96" height="74" rx="32" fill="url(#${id}o)"/>
      <path d="M44 62c4-10 18-15 36-15" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M124 70c0 14-2 28-10 38" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>
      <rect x="42" y="58" width="76" height="46" rx="18" fill="url(#${id}v)" stroke="#05070F" stroke-width="2"/>
      <rect x="42.8" y="58.8" width="74.4" height="44.4" rx="17.2" fill="none" stroke="#fff" stroke-opacity=".1"/>
      <g clip-path="url(#${id}w)"><path d="M46 60h26L56 104H44z" fill="url(#${id}r)"/><path d="M80 60h8l-16 44h-8z" fill="#fff" opacity=".05"/></g>
      <g class="ca-eyes">${eyes}</g><g class="ca-mouth">${mouth}</g>
    </g>
  </g></svg>`;
}

const MO_BROWS = { confused:'<path d="M50 50q8-6 16 0" fill="none" stroke="#2A1A10" stroke-width="3" stroke-linecap="round"/><path d="M94 52l16-5" stroke="#2A1A10" stroke-width="3" stroke-linecap="round"/>', thinking:'<path d="M50 52h14M96 48q8-4 14 0" fill="none" stroke="#2A1A10" stroke-width="3" stroke-linecap="round"/>', aha:'<path d="M50 46q8-6 16 0M94 46q8-6 16 0" fill="none" stroke="#2A1A10" stroke-width="3" stroke-linecap="round"/>', sad:'<path d="M50 54l16-5M110 54l-16-5" stroke="#2A1A10" stroke-width="3" stroke-linecap="round"/>' };
function moSvg(mood){
  mood = MO_BROWS[mood] ? mood : 'confused'; const id = 'm' + (++UID);
  const pupil = { confused:[0,0], thinking:[3,-3], aha:[0,0], sad:[0,2] }[mood];
  const eyeR = mood === 'aha' ? 6 : 4.2;
  const mouth = { confused:'<path d="M70 100q5-5 10 0t10 0" fill="none" stroke="#2A1A10" stroke-width="2.6" stroke-linecap="round"/>', thinking:'<ellipse cx="80" cy="101" rx="4" ry="3" fill="#2A1A10"/>', aha:'<path d="M66 96q14 18 28 0z" fill="#6E1D2B"/><path d="M72 103q8 5 16 0" fill="#E98A99"/>', sad:'<path d="M71 105q9-8 18 0" fill="none" stroke="#2A1A10" stroke-width="2.6" stroke-linecap="round"/>' }[mood];
  const prop = { confused:'<g transform="translate(118 20)"><circle r="12" fill="#fff" opacity=".92"/><text y="6" text-anchor="middle" font-size="17" font-weight="800" fill="#4527B8" font-family="system-ui,sans-serif">?</text></g>', thinking:'<g fill="#fff" opacity=".9"><circle cx="116" cy="40" r="3"/><circle cx="124" cy="29" r="4.5"/><circle cx="135" cy="16" r="6.5"/></g>', aha:'<g transform="translate(120 22)"><circle r="11" fill="#FFD25E"/><rect x="-4" y="9" width="8" height="6" rx="2" fill="#8E97AE"/></g>', sad:'<path d="M108 66q4 7 0 11-4-4 0-11z" fill="#9FD8FF"/>' }[mood];
  return `<svg class="ca-mo-svg" viewBox="0 0 160 160" role="img" aria-label="Mo the Mole" xmlns="http://www.w3.org/2000/svg"><defs>
  <radialGradient id="${id}p" cx=".35" cy=".25" r=".95"><stop offset="0" style="stop-color:var(--ca-m1,#7FD1C3)"/><stop offset="1" style="stop-color:var(--ca-m2,#1F7D72)"/></radialGradient>
  <radialGradient id="${id}f" cx=".4" cy=".3" r=".85"><stop offset="0" stop-color="#9A7352"/><stop offset=".6" stop-color="#6A4A33"/><stop offset="1" stop-color="#3F2A1C"/></radialGradient>
  <radialGradient id="${id}b" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#D3B08A"/><stop offset="1" stop-color="#A27E5A"/></radialGradient>
  <radialGradient id="${id}n" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFC1CF"/><stop offset="1" stop-color="#D9738C"/></radialGradient>
  <clipPath id="${id}c"><circle cx="80" cy="80" r="76"/></clipPath></defs>
  <circle cx="80" cy="80" r="76" fill="url(#${id}p)"/><circle cx="80" cy="80" r="75" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="1.5"/>
  <g clip-path="url(#${id}c)">
    <ellipse cx="80" cy="150" rx="70" ry="44" fill="url(#${id}f)"/><ellipse cx="80" cy="152" rx="38" ry="30" fill="url(#${id}b)"/>
    <path d="M62 126l24 14M92 124l-18 16" stroke="#5A3C26" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>
    <path d="M60 122l10 4 10-4 10 4 10-4v8H60z" fill="#F4F6FB"/><path d="M80 126l-6 16h12z" fill="#4527B8"/>
    <circle cx="42" cy="54" r="13" fill="url(#${id}f)"/><circle cx="118" cy="54" r="13" fill="url(#${id}f)"/><circle cx="42" cy="54" r="6.5" fill="#B88A6E" opacity=".6"/><circle cx="118" cy="54" r="6.5" fill="#B88A6E" opacity=".6"/>
    <ellipse cx="80" cy="78" rx="50" ry="46" fill="url(#${id}f)"/>
    <path d="M40 66q6-6 12-5M108 61q6-1 12 5M48 98q4 5 9 6M112 98q-4 5-9 6M60 36q4-4 10-4M92 32q6 0 10 4" fill="none" stroke="#2F1E13" stroke-opacity=".35" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M52 40q16-14 34-12" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="80" cy="96" rx="22" ry="17" fill="url(#${id}b)"/>
    ${MO_BROWS[mood]}
    <circle cx="${58 + pupil[0]}" cy="${66 + pupil[1]}" r="${eyeR}" fill="#1B120C"/><circle cx="${102 + pupil[0]}" cy="${66 + pupil[1]}" r="${eyeR}" fill="#1B120C"/>
    <circle cx="${59.5 + pupil[0]}" cy="${64.5 + pupil[1]}" r="1.4" fill="#fff"/><circle cx="${103.5 + pupil[0]}" cy="${64.5 + pupil[1]}" r="1.4" fill="#fff"/>
    <circle cx="58" cy="66" r="15" fill="#fff" fill-opacity=".1" stroke="#2B2F45" stroke-width="3"/><circle cx="102" cy="66" r="15" fill="#fff" fill-opacity=".1" stroke="#2B2F45" stroke-width="3"/><path d="M73 66h14" stroke="#2B2F45" stroke-width="3"/>
    <path d="M48 58q4-5 10-5" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/><path d="M92 58q4-5 10-5" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>
    <path d="M80 80c10 0 14 6 12 12-3 5-9 6-12 6s-9-1-12-6c-2-6 2-12 12-12z" fill="url(#${id}n)"/><ellipse cx="76" cy="84" rx="3.4" ry="2" fill="#fff" opacity=".6"/>
    <path d="M62 94q-14-2-24 2M62 98q-12 3-20 9M98 94q14-2 24 2M98 98q12 3 20 9" fill="none" stroke="#2F1E13" stroke-opacity=".55" stroke-width="1.3" stroke-linecap="round"/>
    ${mouth}
    <ellipse cx="38" cy="140" rx="17" ry="12" fill="url(#${id}n)"/><ellipse cx="122" cy="140" rx="17" ry="12" fill="url(#${id}n)"/>
    <path d="M28 132l-3-8M37 129l-1-9M46 131l2-8M114 131l-2-8M123 129l1-9M132 132l3-8" stroke="#F3EBDD" stroke-width="3.4" stroke-linecap="round"/>
  </g>${prop}</svg>`;
}

// portraits for the Case Files (flat-shaded, theme-neutral)
const FACES = {
  kojo:{ skin:'#6B4430', shade:'#573522', hair:'#14100D', top:'#2F7F86', collar:'#256A70', style:'short', goggles:true, beard:false },
  ama:{ skin:'#5A3826', shade:'#472B1D', hair:'#120E0C', top:'#F4F6FB', collar:'#D9DEEA', style:'afro', specs:true, coat:true },
  yaw:{ skin:'#7A5038', shade:'#62402D', hair:'#C9C9CE', top:'#8A5B35', collar:'#6E4725', style:'bald', beard:true, specs:true },
  you:{ skin:'#8B5E3F', shade:'#744B30', hair:'#17120F', top:'#3B3478', collar:'#2E2862', style:'cap', lens:true }
};
function faceSvg(k, s){
  const f = FACES[k] || FACES.you, id = 'f' + (++UID);
  const hair = { short:`<path d="M34 50c0-18 12-26 26-26s26 8 26 26c-6-8-16-12-26-12s-20 4-26 12z" fill="${f.hair}"/>`, afro:`<path d="M28 52c-4-22 10-34 32-34s36 12 32 34c-4-10-10-16-14-18-10 4-26 4-36 0-4 2-10 8-14 18z" fill="${f.hair}"/>`, bald:`<path d="M34 54c2-6 6-10 10-12M86 54c-2-6-6-10-10-12" fill="none" stroke="${f.hair}" stroke-width="5" stroke-linecap="round"/>`, cap:`<path d="M32 50c0-20 12-28 28-28s28 8 28 28z" fill="#F2B233"/><path d="M30 50h60l8 5H30z" fill="#D99A1F"/>` }[f.style];
  return `<svg class="ca-face-svg" width="${s || 58}" height="${s || 58}" viewBox="0 0 120 120" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>
  <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--ca-p1,#8C79F2)"/><stop offset="1" style="stop-color:var(--ca-p2,#2F2377)"/></linearGradient>
  <clipPath id="${id}c"><circle cx="60" cy="60" r="58"/></clipPath></defs>
  <circle cx="60" cy="60" r="58" fill="url(#${id}g)"/><g clip-path="url(#${id}c)">
  <path d="M8 124c2-26 20-38 52-38s50 12 52 38z" fill="${f.top}"/>${f.coat ? `<path d="M44 90l16 34 16-34-8-4-8 10-8-10z" fill="#E6E9F2"/><path d="M60 100v24" stroke="#C9CFDF"/>` : `<path d="M44 88l16 14 16-14-6-4-10 8-10-8z" fill="${f.collar}"/>`}
  <rect x="50" y="68" width="20" height="22" rx="8" fill="${f.shade}"/>
  <ellipse cx="34" cy="58" rx="5" ry="8" fill="${f.skin}"/><ellipse cx="86" cy="58" rx="5" ry="8" fill="${f.skin}"/>
  <ellipse cx="60" cy="56" rx="26" ry="31" fill="${f.skin}"/><path d="M60 40c14 0 24 8 25 22-4 14-14 24-25 24s-21-10-25-24c1-14 11-22 25-22z" fill="#fff" opacity=".07"/>
  ${hair}
  ${f.beard ? `<path d="M36 62c2 16 12 28 24 28s22-12 24-28c-4 8-12 12-24 12S40 70 36 62z" fill="${f.hair}"/>` : ''}
  <ellipse cx="50" cy="56" rx="3" ry="3.4" fill="#1A120D"/><ellipse cx="70" cy="56" rx="3" ry="3.4" fill="#1A120D"/><circle cx="51" cy="55" r=".9" fill="#fff"/><circle cx="71" cy="55" r=".9" fill="#fff"/>
  <path d="M44 48q6-3 12 0M64 48q6-3 12 0" fill="none" stroke="${f.hair === '#C9C9CE' ? '#9A9AA2' : f.hair}" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M60 58v8q-3 2-5 1" fill="none" stroke="${f.shade}" stroke-width="2" stroke-linecap="round"/>
  <path d="M51 74q9 7 18 0" fill="none" stroke="#3A1F17" stroke-width="2.4" stroke-linecap="round"/>
  ${f.specs ? `<circle cx="50" cy="56" r="9" fill="#fff" fill-opacity=".12" stroke="#23263A" stroke-width="2"/><circle cx="70" cy="56" r="9" fill="#fff" fill-opacity=".12" stroke="#23263A" stroke-width="2"/><path d="M59 56h2" stroke="#23263A" stroke-width="2"/>` : ''}
  ${f.goggles ? `<path d="M30 40q30-10 60 0" fill="none" stroke="#23263A" stroke-width="3.2"/><circle cx="47" cy="37" r="9" fill="#CFE9F2" fill-opacity=".85" stroke="#23263A" stroke-width="3"/><circle cx="73" cy="37" r="9" fill="#CFE9F2" fill-opacity=".85" stroke="#23263A" stroke-width="3"/><path d="M44 33q3-3 6-2" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>` : ''}
  ${f.lens ? `<circle cx="92" cy="92" r="13" fill="#fff" fill-opacity=".2" stroke="#E8EDF7" stroke-width="4"/><path d="M101 101l10 10" stroke="#E8EDF7" stroke-width="5" stroke-linecap="round"/>` : ''}
  </g></svg>`;
}

// ----------------------------------------------------------------------------------- state, profile, theme
let S = null;
const DEF = ()=> ({ xp:0, wins:0, plays:0, best:0, dstreak:0, dlast:0, labFound:[], cases:[], teach:0, skill:.5, tstat:{}, seen:[], badges:[], hist:[], teachTopics:[], lab:{ flames:[], titr:0, cell:0, mystery:0, gases:[], tower:0 }, pref:{ vox:false, sfx:false } });
function loadProf(o){ try{ const v = JSON.parse(localStorage.getItem('ichc_arena_' + String((o && o.userKey) || 'guest').slice(0,60)) || 'null'); if(v && typeof v === 'object'){ const d = DEF(); const m = Object.assign(d, v); m.lab = Object.assign(d.lab, v.lab || {}); m.pref = Object.assign(d.pref, v.pref || {}); return m; } }catch(e){} return DEF(); }
function saveProf(){ try{ localStorage.setItem('ichc_arena_' + String((S.opts && S.opts.userKey) || 'guest').slice(0,60), JSON.stringify(S.prof)); }catch(e){} }
const level = xp=> Math.floor(Math.sqrt(xp / 60)) + 1;
function addXp(n){ const before = level(S.prof.xp); S.prof.xp += n; saveProf(); return level(S.prof.xp) > before; }
function badge(id, label){ if(S.prof.badges.indexOf(id) >= 0) return false; S.prof.badges.push(id); saveProf(); toast('Badge earned: ' + label); return true; }
const BADGES = { fire:'Firestarter (all seven flame colours)', titr:'Steady hand (titration within 2%)', cell:'Powerhouse (built a 3 V cell)', det:'Detective (mystery flask in three tests)', gas:'Gas whisperer (identified all three gases)', discover:'Discoverer (10 reactions found)', tower:'Layer cake (stacked all five liquids)', streak:'Streak keeper (3 day streak)' };
const sbOf = ()=> { try{ return S.opts.getSb ? S.opts.getSb() : null; }catch(e){ return null; } };
const sbReady = ()=> { try{ return !!(S.opts.ready ? S.opts.ready() : sbOf()); }catch(e){ return false; } };
let AIBUSY = 0;
async function ai(body, ms){
  const sb = sbOf(); if(!sb || !sb.functions || !sbReady() || AIBUSY > 1) return null;
  const c = brainCtx();
  body = Object.assign({ persona:{ name:c.first, level:level(S.prof.xp), plays:c.plays, wins:c.wins, vibe:c.vibe, weak:c.weak, role:S.opts.role || 'visitor', hour:c.hour, recent:SAID.slice(-4) } }, body);
  AIBUSY++;
  try{
    const r = await Promise.race([ sb.functions.invoke('game-ai', { body }), new Promise((_,rej)=> setTimeout(()=> rej(new Error('timeout')), ms || 2500)) ]);
    if(r && r.data && !r.error && !r.data.error) return r.data;
  }catch(e){} finally { AIBUSY--; }
  return null;
}
function later(fn, ms){ const id = setTimeout(()=>{ S && fn(); }, ms); S.timers.push(id); return id; }
function clearTimers(){ if(!S) return; S.timers.forEach(t=>{ clearTimeout(t); clearInterval(t); }); S.timers = []; VOX.stop(); stopMic(); }
const $ = s=> S.root.querySelector(s);
const $$ = s=> Array.prototype.slice.call(S.root.querySelectorAll(s));
function toast(msg){ if(!S) return; const d = document.createElement('div'); d.className = 'ca-toast'; d.setAttribute('role','status'); d.textContent = msg; S.root.appendChild(d); setTimeout(()=> d.remove(), 2800); }

// light and dark: follows the site (html[data-theme]), else the page option, else the system. The portal has no dark mode, so it stays light.
function themeOf(o){
  const t = document.documentElement.getAttribute('data-theme');
  if(t === 'dark' || t === 'light') return t;
  if(o && (o.theme === 'dark' || o.theme === 'light')) return o.theme;
  if(o && o.ctx === 'portal') return 'light';
  try{ return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }catch(e){ return 'light'; }
}
function applyTheme(){ if(!S) return; const t = themeOf(S.opts); S.root.setAttribute('data-th', t); if(S.overlay) S.overlay.setAttribute('data-th', t); if(S.fx) S.fx.theme(t); }

// ----------------------------------------------------------------------------------- sound effects and NOVA's / Mo's voices
const SND = {
  ctx:null, on:false,
  init(){ if(!this.ctx){ try{ this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){} } if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  tone(f, d, type, vol, at){ if(!this.on || !this.ctx) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (at || 0); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || .07, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + .02); },
  play(n){
    if(!this.on) return; this.init();
    const T = { ok:[[523,.1],[659,.1,.09],[784,.18,.18]], bad:[[196,.22,0,'sawtooth'],[147,.3,.14,'sawtooth']], hit:[[110,.12,0,'square']], click:[[660,.04,0,'triangle']], win:[[523,.12],[659,.12,.12],[784,.12,.24],[1047,.3,.36]], lose:[[330,.2,0,'triangle'],[262,.2,.2,'triangle'],[196,.4,.4,'triangle']], chirp:[[880,.05,0,'square',.03],[1320,.05,.07,'square',.03]], tick:[[900,.03,0,'triangle',.04]], pop:[[200,.1,0,'square',.08],[90,.12,.04,'square',.08]], fizz:[[1200,.05,0,'sawtooth',.02],[900,.05,.05,'sawtooth',.02],[1500,.05,.1,'sawtooth',.02]] }[n] || [];
    T.forEach(a=> this.tone(a[0], a[1], a[3], a[4] || .07, a[2]));
  }
};
const VOX = {
  on:false, voices:[], cache:{},
  load(){ try{ const sy = window.speechSynthesis; if(!sy) return; const get = ()=>{ VOX.voices = sy.getVoices() || []; VOX.cache = {}; }; get(); if(sy.addEventListener) sy.addEventListener('voiceschanged', get); }catch(e){} },
  ok(){ return !!(window.speechSynthesis && window.SpeechSynthesisUtterance); },
  pick(who){
    if(this.cache[who]) return this.cache[who];
    const en = this.voices.filter(v=> /^en/i.test(v.lang)); if(!en.length) return null;
    const want = who === 'nova' ? ['Google UK English Male','Microsoft Ryan','Microsoft Guy','Microsoft George','Daniel','Arthur','Oliver','Aaron','Fred','Alex','Male','David'] : ['Google UK English Female','Microsoft Sonia','Microsoft Aria','Microsoft Jenny','Microsoft Libby','Samantha','Serena','Tessa','Karen','Moira','Fiona','Female','Zira'];
    let best = null, bs = -1;
    en.forEach(v=>{ let s = 0; want.forEach((w,i)=>{ if(v.name.indexOf(w) >= 0) s = Math.max(s, 40 - i); }); if(/en-GB/i.test(v.lang)) s += 6; else if(/en-(NG|ZA|GH|AU|IE)/i.test(v.lang)) s += 4; else if(/en-US/i.test(v.lang)) s += 3; if(/natural|neural|online/i.test(v.name)) s += 8; if(/enhanced|premium/i.test(v.name)) s += 4; if(!v.localService) s += 1; if(s > bs){ bs = s; best = v; } });
    return this.cache[who] = best;
  },
  say(txt){ // make chemistry readable aloud
    const sub = { '₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9' }, sup = { '⁺':' plus','⁻':' minus','²':' squared','³':' cubed' };
    return String(txt).replace(/NOVA-9/g,'Nova nine').replace(/\bMo\b/g,'Moe').replace(/\bHCl\b/g,'hydrochloric acid').replace(/\bNaOH\b/g,'sodium hydroxide').replace(/\bNaCl\b/g,'sodium chloride').replace(/\bH2O\b/g,'water').replace(/\bCO2\b/g,'carbon dioxide').replace(/\bpH\b/g,'P H').replace(/ΔH/g,'delta H').replace(/ΔG/g,'delta G').replace(/ΔS/g,'delta S').replace(/⇌/g,' is in equilibrium with ').replace(/→/g,' gives ')
      .replace(/[₀-₉]/g, m=> ' ' + sub[m]).replace(/[⁺⁻²³]/g, m=> sup[m]).replace(/([A-Z][a-z]?)(\d+)/g,'$1 $2').replace(/[·•]/g,',').replace(/[“”"]/g,'').replace(/\s*[—–]\s*/g,', ').replace(/…/g,'.').replace(/\s+/g,' ').trim();
  },
  prosody(who, mood){
    if(who === 'mo') return { pitch:mood === 'aha' ? 1.4 : mood === 'sad' ? 1.1 : 1.25, rate:mood === 'thinking' ? .96 : 1.04 };
    return { smug:{ pitch:.8, rate:.94 }, hurt:{ pitch:.95, rate:.9 }, angry:{ pitch:.72, rate:1.1 }, laugh:{ pitch:.9, rate:1.04 }, shocked:{ pitch:1.05, rate:1.1 }, idle:{ pitch:.85, rate:1 } }[mood] || { pitch:.85, rate:1 };
  },
  speak(who, text, mood, done){
    if(!this.on || !this.ok()){ if(done) done(); return; }
    try{
      const sy = window.speechSynthesis; sy.cancel();
      const u = new SpeechSynthesisUtterance(this.say(text)), p = this.prosody(who, mood), v = this.pick(who);
      if(v){ u.voice = v; u.lang = v.lang; } else u.lang = 'en-GB';
      u.pitch = p.pitch; u.rate = p.rate; u.volume = 1;
      u.onstart = ()=> setTalk(who, true); u.onend = u.onerror = ()=>{ setTalk(who, false); if(done) done(); };
      if(who === 'nova') SND.play('chirp');
      sy.speak(u);
    }catch(e){ if(done) done(); }
  },
  stop(){ try{ window.speechSynthesis && window.speechSynthesis.cancel(); }catch(e){} setTalk('nova', false); setTalk('mo', false); }
};
function setPref(){ if(!S) return; S.prof.pref = { vox:VOX.on, sfx:SND.on }; saveProf(); }
function setTalk(who, on){ if(!S) return; $$(who === 'mo' ? '.ca-mo-wrap' : '.ca-nova-wrap').forEach(e=> e.classList.toggle('talking', !!on)); }
// typewriter: lines appear as if spoken, and the mouth moves while they do
function typeInto(el, text, who, mood, cb){
  if(!el) return; if(el._ty) clearInterval(el._ty);
  const full = String(text); VOX.speak(who || 'nova', full, mood);
  if(reduceMotion() || full.length < 3){ el.textContent = full; if(cb) cb(); return; }
  let i = 0; const step = Math.max(1, Math.ceil(full.length / 70)); if(!VOX.on) setTalk(who || 'nova', true);
  el._ty = setInterval(()=>{ i += step; el.textContent = full.slice(0, i); if(i >= full.length){ clearInterval(el._ty); el._ty = 0; if(!VOX.on) setTalk(who || 'nova', false); if(cb) cb(); } }, 16);
  if(S) S.timers.push(el._ty);
}

// ----------------------------------------------------------------------------------- mic (English and French only)
let rec = null;
function micOk(){ return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
function stopMic(){ try{ if(rec) rec.stop(); }catch(e){} rec = null; }
function startMic(onText, onEnd){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if(!SR) return false;
  stopMic(); rec = new SR(); rec.lang = (document.documentElement.lang || 'en').slice(0,2) === 'fr' ? 'fr-FR' : 'en-GB'; rec.interimResults = true; rec.continuous = false;
  rec.onresult = e=>{ let t = ''; for(let i=0;i<e.results.length;i++) t += e.results[i][0].transcript; onText(t); };
  rec.onend = ()=>{ rec = null; onEnd(); }; rec.onerror = ()=>{ rec = null; onEnd(); };
  try{ rec.start(); return true; }catch(e){ rec = null; return false; }
}

// ----------------------------------------------------------------------------------- effects canvas (restrained: streaks, small debris, a ring, calm confetti)
function makeFx(cv, host){
  const g = cv && cv.getContext && cv.getContext('2d'); let P = [], R = [], B = [], raf = 0, W = 0, H = 0, dpr = 1, pal = ['#7C66F2','#FFB52E','#2FBF8F','#F0566A'];
  if(!g) return { burst(){}, beam(){}, confetti(){}, ring(){}, theme(){}, stop(){} };
  function size(){ const r = host.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; g.setTransform(dpr,0,0,dpr,0,0); }
  size(); let ro = null; try{ ro = new ResizeObserver(size); ro.observe(host); }catch(e){ window.addEventListener('resize', size); }
  function loop(){
    g.clearRect(0, 0, W, H);
    B = B.filter(b=>{ b.t += .07; const x = b.x1 + (b.x2 - b.x1) * Math.min(1, b.t), y = b.y1 + (b.y2 - b.y1) * Math.min(1, b.t), tx = b.x1 + (b.x2 - b.x1) * Math.max(0, b.t - .22), ty = b.y1 + (b.y2 - b.y1) * Math.max(0, b.t - .22); g.strokeStyle = b.c; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(tx, ty); g.lineTo(x, y); g.stroke(); if(b.t >= 1){ fx.burst(b.x2, b.y2, b.c, 14); fx.ring(b.x2, b.y2, b.c); return false; } return true; });
    R = R.filter(r=>{ r.r += 2.4; r.a -= .035; if(r.a <= 0) return false; g.globalAlpha = r.a; g.strokeStyle = r.c; g.lineWidth = 2; g.beginPath(); g.arc(r.x, r.y, r.r, 0, 6.283); g.stroke(); g.globalAlpha = 1; return true; });
    P = P.filter(p=>{ p.x += p.vx; p.y += p.vy; p.vy += p.g; p.rot += p.vr; p.life -= p.d; if(p.life <= 0 || p.y > H + 20) return false; g.save(); g.globalAlpha = Math.min(1, p.life); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-p.s, -p.s * .5, p.s * 2, p.s); g.restore(); return true; });
    if(P.length || R.length || B.length) raf = requestAnimationFrame(loop); else { raf = 0; g.clearRect(0, 0, W, H); }
  }
  const kick = ()=>{ if(!raf && !reduceMotion()) raf = requestAnimationFrame(loop); };
  const fx = {
    theme(t){ pal = t === 'dark' ? ['#9B87FF','#FFC15A','#3DD6A0','#FF7A85'] : ['#5B3FD8','#E89B12','#17935F','#D64555']; },
    burst(x, y, c, n){ n = Math.min(n || 14, 22); for(let i=0;i<n;i++){ const a = rnd(0, 6.283), s = rnd(1.2, 4.2); P.push({ x, y, vx:Math.cos(a) * s, vy:Math.sin(a) * s - 1.2, g:.12, s:rnd(1.6, 3.2), c:c || pal[0], rot:rnd(0, 6), vr:rnd(-.2, .2), life:1, d:.03 }); } kick(); },
    ring(x, y, c){ R.push({ x, y, r:6, a:.7, c:c || pal[0] }); kick(); },
    beam(x1, y1, x2, y2, c){ B.push({ x1, y1, x2, y2, c:c || pal[0], t:0 }); kick(); },
    confetti(){ for(let i=0;i<60;i++) P.push({ x:rnd(0, W), y:rnd(-40, -4), vx:rnd(-.8, .8), vy:rnd(1.2, 3), g:.03, s:rnd(2.4, 4.6), c:pal[i % pal.length], rot:rnd(0, 6), vr:rnd(-.15, .15), life:1.6, d:.006 }); kick(); },
    stop(){ if(raf) cancelAnimationFrame(raf); raf = 0; P = []; R = []; B = []; try{ ro && ro.disconnect(); }catch(e){} window.removeEventListener('resize', size); }
  };
  fx.theme('light'); return fx;
}
function posOf(el){ const r = el.getBoundingClientRect(), b = S.root.getBoundingClientRect(); return { x:r.left - b.left + r.width / 2, y:r.top - b.top + r.height / 2 }; }
function pop(el, text, color){ if(!el) return; const p = posOf(el), d = document.createElement('div'); d.className = 'ca-pop'; d.style.cssText = `left:${p.x - 24}px;top:${p.y - 18}px;color:${color};`; d.textContent = text; S.root.appendChild(d); setTimeout(()=> d.remove(), 1100); }
function hit(el, color, n){ if(!el || !S.fx) return; const p = posOf(el); S.fx.burst(p.x, p.y, color, n || 14); S.fx.ring(p.x, p.y, color); }
function shakeEl(el){ if(!el) return; el.classList.remove('ca-shake'); void el.offsetWidth; el.classList.add('ca-shake'); }
const pal = ()=> S && S.root.getAttribute('data-th') === 'dark' ? { ok:'#3DD6A0', bad:'#FF7A85', brand:'#9B87FF', amber:'#FFC15A' } : { ok:'#17935F', bad:'#D64555', brand:'#5B3FD8', amber:'#E89B12' };

// ----------------------------------------------------------------------------------- shell, hub and Rival Duel
function go(screen, arg){
  if(!S) return; clearTimers(); S.screen = screen; S.D = null; S.T = null; S.kase = null;
  S.inn.innerHTML = ({ hub:hubHtml, setup:setupHtml, teachpick:teachPickHtml, cases:casesHtml, lab:labHtml }[screen] || hubHtml)(arg);
  S.root.scrollTop = 0; if(S.overlay) S.overlay.scrollTop = 0; try{ S.inn.scrollIntoView({ block:'start' }); }catch(e){}
  ({ hub:hubAfter, lab:labAfter }[screen] || function(){})(arg);
}
function topBar(title, back){
  const lv = level(S.prof.xp), base = 60 * (lv - 1) * (lv - 1), need = 60 * lv * lv, pc = clamp(Math.round((S.prof.xp - base) / (need - base) * 100), 0, 100);
  return `<div class="ca-top"><div class="ca-top-l">${back ? `<button class="ca-pill ghost" data-a="back">${ico('back', 16)}<span>Back</span></button>` : S.overlay ? `<button class="ca-pill ghost" data-a="close">${ico('back', 16)}<span>Close</span></button>` : ''}<h2 class="ca-h2">${esc(title)}</h2></div>
  <div class="ca-top-r"><button class="ca-pill ghost sm" data-a="vox" aria-pressed="${VOX.on}" title="NOVA and Mo speak their lines aloud">${ico(VOX.on ? 'voice' : 'voice', 15)}<span>Voice ${VOX.on ? 'on' : 'off'}</span></button><button class="ca-pill ghost sm" data-a="snd" aria-pressed="${SND.on}" title="Sound effects">${ico(SND.on ? 'vol' : 'volOff', 15)}<span>Sound</span></button>
  <div class="ca-xp" title="${S.prof.xp} XP"><b>Level ${lv}</b><i><u style="width:${pc}%"></u></i></div></div></div>`;
}
function accuracy(){ let n = 0, k = 0; Object.keys(S.prof.tstat).forEach(t=>{ n += S.prof.tstat[t].n; k += S.prof.tstat[t].ok; }); return n ? Math.round(k / n * 100) : null; }
function hubHtml(){
  const P = S.prof, acc = accuracy(), weak = weakTopics(1)[0], done = P.dlast === dayNum();
  return `${topBar('Chem Arena')}
  <section class="ca-hub">
   <div class="ca-stage"><div class="ca-nova-wrap lg" id="hubNova">${novaSvg('smug')}</div>
    <div class="ca-say"><div class="ca-say-name">NOVA-9</div><p id="hSay" aria-live="polite"></p></div></div>
   <div class="ca-stats" role="list"><div role="listitem"><b>${P.plays}</b><span>duels played</span></div><div role="listitem"><b>${P.wins}</b><span>won</span></div><div role="listitem"><b>${acc == null ? '–' : acc + '%'}</b><span>accuracy</span></div><div role="listitem"><b>${P.dstreak}</b><span>day streak</span></div></div>
   ${weak ? `<button class="ca-focus" data-a="trainweak" data-v="${weak}">${ico('focus', 18)}<span><b>Your weak spot: ${esc(TN(weak))}</b><small>Start a duel built around it</small></span></button>` : ''}
   <button class="ca-daily ${done ? 'done' : ''}" data-a="daily">${ico('bolt', 22)}<span><b>${done ? 'Today’s challenge is done' : 'Daily challenge'}</b><small>${done ? 'Come back tomorrow for a new set' : 'Same eight questions for everyone, today only'}</small></span></button>
   <button class="ca-feature" data-a="duel"><span class="ca-ficon">${ico('duel', 30)}</span><span><b>Rival duel</b><small>Eight rounds against NOVA-9. It watches how you play and adapts.</small></span></button>
   <div class="ca-trio"><button class="ca-row" data-a="teach"><span class="ca-ficon sm">${ico('teach', 22)}</span><span><b>Teach Mo</b><small>Explain a topic to a confused mole</small></span></button>
   <button class="ca-row" data-a="cases"><span class="ca-ficon sm">${ico('case', 22)}</span><span><b>Case files</b><small>${P.cases.indexOf('c1') >= 0 ? 'The Midnight Spill: solved' : 'The Midnight Spill awaits'}</small></span></button>
   <button class="ca-row" data-a="lab"><span class="ca-ficon sm">${ico('lab', 22)}</span><span><b>Virtual lab</b><small>Seven stations, ${P.labFound.length} reactions found</small></span></button></div>
   <div class="ca-list">${S.opts.onLive ? `<button data-a="live">${ico('live', 20)}<span>Live competition night</span></button>` : ''}<button data-a="invite">${ico('share', 20)}<span>Challenge a friend</span></button></div>
  </section>`;
}
function hubAfter(){ const n = nline('open'); typeInto($('#hSay'), n.t, 'nova', n.m); if(n.m !== 'smug'){ setNova('#hubNova', n.m, 'smug'); } }
function setNova(sel, mood, back){ const w = typeof sel === 'string' ? $(sel) : sel; if(!w) return; w.innerHTML = novaSvg(mood); if(back) later(()=>{ const x = typeof sel === 'string' ? $(sel) : sel; if(x) x.innerHTML = novaSvg(back); }, 2200); }

const LV = { rookie:{ n:'Rookie', acc:.5, secs:26, rb:1 }, pro:{ n:'Pro', acc:.68, secs:20, rb:.7 }, legend:{ n:'Legend', acc:.86, secs:14, rb:.3 } };
function levelCfg(){ if(S.cfg.level === 'auto'){ const sk = clamp(S.prof.skill, .2, .95); return { n:'Adaptive', acc:clamp(.4 + sk * .5, .45, .88), secs:Math.round(clamp(27 - sk * 13, 14, 26)), rb:1, auto:true }; } return LV[S.cfg.level] || LV.pro; }
function setupHtml(){
  const L = levelCfg(), chips = [['', 'Mixed']].concat(TOPICS).map(t=> `<button class="ca-chip ${S.cfg.focus === t[0] ? 'on' : ''}" data-a="focus" data-v="${t[0]}">${esc(t[1])}</button>`).join('');
  const lv = [['auto','Adaptive'],['rookie','Rookie'],['pro','Pro'],['legend','Legend']].map(t=> `<button class="ca-chip ${S.cfg.level === t[0] ? 'on' : ''}" data-a="level" data-v="${t[0]}">${t[1]}</button>`).join('');
  return `${topBar('Rival duel', true)}<section class="ca-setup"><div class="ca-stage sm"><div class="ca-nova-wrap" id="hubNova">${novaSvg('smug')}</div><div class="ca-say"><div class="ca-say-name">NOVA-9</div><p id="hSay" aria-live="polite">Choose your battlefield.</p></div></div>
  <h3 class="ca-h3">Topic</h3><div class="ca-chips">${chips}</div>
  <h3 class="ca-h3">Difficulty</h3><div class="ca-chips">${lv}</div>
  <p class="ca-hint">${S.cfg.level === 'auto' ? `Adaptive tunes NOVA’s accuracy and your clock to how you have been playing. Right now it is set to about ${Math.round(L.acc * 100)}% accuracy and ${L.secs} seconds a question.` : `${esc(L.n)}: NOVA answers about ${Math.round(L.acc * 100)}% correctly, and you get ${L.secs} seconds a question.`}</p>
  <button class="ca-pill primary lgbtn" data-a="start">Start the duel</button></section>`;
}

function pickQs(n, daily){
  if(daily) return shuffle(QB, mulberry(dayNum())).slice(0, n);
  const pool = S.cfg.focus ? QB.filter(q=> q.t === S.cfg.focus) : QB, seen = S.prof.seen;
  const w = pool.map(q=>{ let x = 1; if(seen.indexOf(q.id) < 0) x += 2; else x *= .35; if(!S.cfg.focus){ const t = S.prof.tstat[q.t]; if(t && t.n >= 3) x *= 1 + (1 - t.ok / t.n) * 1.6; } return x; });
  return wsample(pool, w, Math.min(n, pool.length));
}
function startDuel(daily){
  const L = levelCfg(), qs = pickQs(8, daily);
  clearTimers(); S.screen = 'duel';
  S.D = { qs, i:0, hp:100, rhp:100, combo:0, misses:0, correct:0, ms:0, L, daily:!!daily, missed:[], xp:0, stamp:0, firstBlood:true };
  S.inn.innerHTML = `${topBar(daily ? 'Daily challenge' : 'Rival duel', true)}<section class="ca-duel">
   <div class="ca-vs-row"><div class="ca-side you"><div class="ca-side-name">${esc(brainCtx().first || 'You')}</div><div class="ca-hpbar"><i id="hpYou" style="width:100%"></i></div><small id="hpYouN">100 HP</small></div>
    <div class="ca-clock" id="clock" style="--p:100"><b id="clockN">${L.secs}</b></div>
    <div class="ca-side nova"><div class="ca-nova-wrap sm" id="dNova">${novaSvg('smug')}</div><div><div class="ca-side-name">NOVA-9</div><div class="ca-hpbar"><i id="hpNova" style="width:100%"></i></div><small id="hpNovaN">100 HP</small></div></div></div>
   <div class="ca-qcard"><div class="ca-qmeta" id="qMeta"></div><p class="ca-q" id="qText"></p><div class="ca-opts" id="qOpts"></div></div>
   <div class="ca-nline" aria-live="polite"><span class="ca-say-name">NOVA-9</span><p id="dSay"></p></div>
   <div class="ca-after" id="after" hidden><div class="ca-exp" id="dExp"></div><button class="ca-pill primary" data-a="next" id="nextBtn">Next question</button></div></section>`;
  const o = nline('start', { topic:S.cfg.focus ? TN(S.cfg.focus) : 'a mixed bag' }); typeInto($('#dSay'), o.t, 'nova', o.m);
  later(()=> dRound(), 1200);
}
function dRound(){
  const D = S.D; if(!D) return; const q = D.qs[D.i]; D.stamp++; D.locked = false; D.left = D.L.secs; D.t0 = Date.now();
  D.novaPick = novaPick(q);
  $('#qMeta').textContent = `Round ${D.i + 1} of ${D.qs.length}  ·  ${TN(q.t)}`; $('#qText').textContent = q.q;
  $('#qOpts').innerHTML = q.o.map((t,i)=> `<button class="ca-opt" data-a="ans" data-v="${i}"><kbd>${'ABCD'[i]}</kbd><span>${esc(t)}</span></button>`).join('');
  $('#after').hidden = true; $('#dExp').textContent = '';
  if(D.i === D.qs.length - 1 && D.qs.length > 1){ const o = nline('lastRound'); typeInto($('#dSay'), o.t, 'nova', o.m); }
  const clock = $('#clock'), cn = $('#clockN'), stamp = D.stamp;
  const tm = setInterval(()=>{ if(!S || S.D !== D || D.stamp !== stamp || D.locked){ clearInterval(tm); return; } D.left = Math.max(0, D.L.secs - (Date.now() - D.t0) / 1000); cn.textContent = Math.ceil(D.left); clock.style.setProperty('--p', Math.round(D.left / D.L.secs * 100)); clock.classList.toggle('low', D.left <= 5); if(D.left <= 0){ clearInterval(tm); dAnswer(-1); } else if(Math.ceil(D.left) <= 5 && Math.abs(D.left - Math.round(D.left)) < .06) SND.play('tick'); }, 100);
  S.timers.push(tm);
}
// NOVA's accuracy adapts: it eases off when you are far behind and presses when you are ahead or on a streak.
function novaPick(q){
  const D = S.D; let acc = D.L.acc;
  const gap = D.hp - D.rhp, rb = D.L.rb;
  if(gap > 30) acc += .06 * rb; else if(gap < -30) acc -= .08 * rb;
  acc += clamp((D.combo - 1) * .03, 0, .09) * rb; acc -= clamp(D.misses * .03, 0, .1) * rb;
  acc = clamp(acc, .25, .95);
  if(Math.random() < acc) return q.a;
  const w = [0,1,2,3].filter(i=> i !== q.a); return pick(w);
}
function dAnswer(choice){
  const D = S.D; if(!D || D.locked) return; D.locked = true;
  const q = D.qs[D.i], used = Math.min(D.L.secs, (Date.now() - D.t0) / 1000), ok = choice === q.a, nok = D.novaPick === q.a, timeout = choice < 0, frac = clamp(D.left / D.L.secs, 0, 1);
  const P = S.prof, ts = P.tstat[q.t] = P.tstat[q.t] || { n:0, ok:0, ms:0 };
  const wasWeak = weakTopics(2).indexOf(q.t) >= 0;
  ts.n++; ts.ms += used * 1000; if(ok){ ts.ok++; D.correct++; } P.skill = clamp(P.skill * .88 + (ok ? .12 * (.75 + frac * .25) : 0), .1, .98);
  P.seen = P.seen.filter(x=> x !== q.id); P.seen.push(q.id); if(P.seen.length > 40) P.seen.shift();
  D.ms += used * 1000; const prevCombo = D.combo; D.combo = ok ? D.combo + 1 : 0; D.misses = ok ? 0 : D.misses + 1;
  const opts = $$('.ca-opt'); opts.forEach((b,i)=>{ b.disabled = true; if(i === q.a) b.classList.add('ok'); if(i === choice && !ok) b.classList.add('bad'); if(i === D.novaPick) b.insertAdjacentHTML('beforeend', '<em class="ca-npick">NOVA</em>'); });
  let dmgY = 0, dmgN = 0;
  if(ok) dmgN = 12 + Math.round(frac * 8) + clamp((D.combo - 1) * 3, 0, 9);
  if(nok) dmgY = 12 + Math.round(rnd(0, 6));
  D.rhp = Math.max(0, D.rhp - dmgN); D.hp = Math.max(0, D.hp - dmgY);
  const you = $('.ca-side.you'), nv = $('#dNova');
  if(ok){ const a = posOf($('#hpYou')), b = posOf($('#hpNova')); S.fx.beam(a.x, a.y, b.x, b.y, pal().brand); SND.play('ok'); } else SND.play('bad');
  if(nok){ later(()=>{ const a = posOf($('#hpNova')), b = posOf($('#hpYou')); S.fx.beam(a.x, a.y, b.x, b.y, pal().amber); }, ok ? 260 : 0); }
  later(()=>{ $('#hpNova').style.width = D.rhp + '%'; $('#hpNovaN').textContent = D.rhp + ' HP'; $('#hpYou').style.width = D.hp + '%'; $('#hpYouN').textContent = D.hp + ' HP'; if(dmgN) pop($('#hpNova'), '−' + dmgN, pal().ok); if(dmgY){ pop($('#hpYou'), '−' + dmgY, pal().bad); shakeEl(you); } if(dmgN) shakeEl(nv); }, 380);
  // NOVA's reaction: instant from its own word bank, optionally upgraded by the AI if it answers in time
  const tId = q.t, base = { topicId:tId, topic:TN(tId), streak:D.combo, misses:D.misses, hp:D.hp - dmgY, rhp:D.rhp, secs:Math.round(used), round:D.i + 1, left:D.qs.length - D.i - 1 };
  let ev = ok ? 'correct' : (nok ? 'rWin' : 'bothWrong'), line;
  if(D.rhp <= 30 && D.rhp > 0 && ok) ev = 'novaLow'; else if(D.hp <= 30 && D.hp > 0 && !ok && nok) ev = 'playerLow';
  line = nline(ev === 'rWin' && !ok ? 'wrong' : ev, Object.assign({}, base, { timeout, first:ok && D.correct === 1, fast:frac > .75, slow:frac < .2, clutch:ok && D.hp <= 35, weakHit:wasWeak && !ok }));
  if(ev === 'rWin'){ const w = nline('rWin', base); line = { t:(timeout ? nline('wrong', Object.assign({}, base, { timeout:true })).t + ' ' : '') + w.t, m:'laugh' }; }
  const stamp = D.stamp; later(()=>{ typeInto($('#dSay'), line.t, 'nova', line.m); setNova('#dNova', line.m, 'smug'); }, 420);
  if(sbReady() && D.i % 2 === 0) ai({ mode:'rival', event:ev, ctx:base }, 1800).then(j=>{ if(j && j.line && S && S.D === D && D.stamp === stamp && !D.advanced){ const el = $('#dSay'); if(el && String(j.line).length < 220){ typeInto(el, String(j.line), 'nova', line.m); } } });
  later(()=>{ $('#dExp').innerHTML = `<b>${ok ? 'Correct.' : timeout ? 'Out of time.' : 'Not quite.'}</b> ${esc(q.e)}`; $('#after').hidden = false; $('#nextBtn').textContent = (D.hp <= 0 || D.rhp <= 0 || D.i >= D.qs.length - 1) ? 'See the result' : 'Next question'; const nb = $('#nextBtn'); if(nb) nb.focus({ preventScroll:true }); }, 900);
  if(ok){ D.xp += 10 + (frac > .6 ? 5 : 0); } else D.missed.push({ q, choice });
  saveProf();
}
function dNext(){
  const D = S.D; if(!D) return; D.advanced = true; D.i++;
  if(D.hp <= 0 || D.rhp <= 0 || D.i >= D.qs.length) return dEnd();
  dRound();
}
function dEnd(){
  const D = S.D, P = S.prof; let res = D.rhp < D.hp ? 'win' : D.rhp > D.hp ? 'lose' : 'draw';
  if(D.rhp <= 0) res = 'win'; if(D.hp <= 0) res = 'lose';
  const margin = Math.abs(D.hp - D.rhp), flawless = D.correct === D.qs.length && D.qs.length >= 5;
  P.plays++; if(res === 'win'){ P.wins++; D.xp += 40; } P.best = Math.max(P.best, D.xp);
  P.hist.push(res === 'win' ? 'W' : 'L'); if(P.hist.length > 8) P.hist.shift();
  let dNote = '';
  if(D.daily && P.dlast !== dayNum()){ P.dstreak = P.dlast === yesterday() ? P.dstreak + 1 : 1; P.dlast = dayNum(); D.xp += 20; dNote = `Daily streak: ${P.dstreak} day${P.dstreak > 1 ? 's' : ''}.`; if(P.dstreak >= 3) badge('streak', BADGES.streak); }
  const lvUp = addXp(D.xp); const L = D.L, avg = D.ms / Math.max(1, D.i) / 1000;
  const line = nline(res, { margin, flawless, hp:D.hp, rhp:D.rhp, topicId:'' });
  const weakNow = weakTopics(1)[0];
  const rev = D.missed.map(m=> `<li><b>${esc(m.q.q)}</b><span>${m.choice >= 0 ? 'You said: ' + esc(m.q.o[m.choice]) + '. ' : 'No answer. '}Answer: <u>${esc(m.q.o[m.q.a])}</u>.</span><small>${esc(m.q.e)}</small></li>`).join('');
  S.inn.innerHTML = `${topBar(res === 'win' ? 'Victory' : res === 'lose' ? 'Defeat' : 'A draw', true)}<section class="ca-result"><div class="ca-stage"><div class="ca-nova-wrap lg" id="hubNova">${novaSvg(line.m)}</div><div class="ca-say"><div class="ca-say-name">NOVA-9</div><p id="rSay" aria-live="polite"></p></div></div>
   <div class="ca-stats"><div><b>${D.correct}/${D.qs.length}</b><span>correct</span></div><div><b>${fmt1(avg)}s</b><span>average time</span></div><div><b>+${D.xp}</b><span>XP earned</span></div><div><b>${D.hp} : ${D.rhp}</b><span>HP, you : NOVA</span></div></div>
   ${lvUp ? `<p class="ca-note">Level up. You are now level ${level(P.xp)}.</p>` : ''}${dNote ? `<p class="ca-note">${dNote}</p>` : ''}
   ${L.auto ? `<p class="ca-hint">Adaptive mode noted this match. Next time NOVA will play at about ${Math.round(clamp(.4 + P.skill * .5, .45, .88) * 100)}% accuracy.</p>` : ''}
   <div class="ca-actions"><button class="ca-pill primary" data-a="rematch" data-v="${D.daily ? 'daily' : ''}">${esc(pick(['Rematch','Run it back','Go again']))}</button>${weakNow ? `<button class="ca-pill" data-a="trainweak" data-v="${weakNow}">Train ${esc(TN(weakNow))}</button>` : ''}<button class="ca-pill" data-a="sharewin">Share result</button><button class="ca-pill ghost" data-a="back">Back to hub</button></div>
   ${rev ? `<details class="ca-review" open><summary>Review your misses (${D.missed.length})</summary><ul>${rev}</ul></details>` : '<p class="ca-hint">No misses to review. Spotless.</p>'}</section>`;
  typeInto($('#rSay'), line.t, 'nova', line.m); if(res === 'win'){ S.fx.confetti(); SND.play('win'); } else SND.play('lose');
  S.last = { res, correct:D.correct, n:D.qs.length, xp:D.xp };
  S.D = null;
}

// ----------------------------------------------------------------------------------- Teach Mo
function teachPickHtml(){
  const P = S.prof, c = brainCtx(), last = P.teachTopics[P.teachTopics.length - 1];
  const hello = c.first ? `Hi ${c.first}! ` : 'Hi! ';
  const line = P.teach ? `${hello}I am Mo. ${last ? 'Last time you taught me ' + (MO_LABEL[last] || 'chemistry') + '. ' : ''}What will you explain to me today?` : `${hello}I am Mo the mole. I dig tunnels, not chemistry. Could you teach me something?`;
  return `${topBar('Teach Mo', true)}<section class="ca-setup"><div class="ca-stage sm"><div class="ca-mo-wrap" id="moW">${moSvg('confused')}</div><div class="ca-say mo"><div class="ca-say-name">Mo</div><p id="hSay">${esc(line)}</p></div></div>
  <h3 class="ca-h3">Pick a topic to teach</h3><div class="ca-chips">${TOPICS.map(t=> `<button class="ca-chip ${P.teachTopics.indexOf(t[0]) >= 0 ? 'done' : ''}" data-a="teachgo" data-v="${t[0]}">${esc(t[1])}</button>`).join('')}</div>
  <p class="ca-hint">You win by explaining clearly. Mo asks honest questions, and his understanding grows only when your explanation covers the key ideas. Examples and analogies help.</p></section>`;
}
function startTeach(id){
  clearTimers(); S.screen = 'teach'; const P = S.prof, name = brainCtx().first;
  const T = S.T = { id, msgs:[], turns:0, und:6, cov:{}, busy:false, mood:'confused' };
  S.inn.innerHTML = `${topBar('Teach Mo', true)}<section class="ca-teach"><div class="ca-teach-head"><div class="ca-mo-wrap" id="moW">${moSvg('confused')}</div><div class="ca-meter"><div class="ca-meter-top"><b>${esc(TN(id))}</b><span id="und">6%</span></div><div class="ca-bar"><i id="undBar" style="width:6%"></i></div><small>Mo’s understanding</small></div></div>
   <div class="ca-chat" id="chat" aria-live="polite"></div>
   <div class="ca-compose"><textarea id="tIn" rows="2" maxlength="900" placeholder="Explain it to Mo in your own words…" aria-label="Your explanation"></textarea><div class="ca-compose-b">${micOk() ? `<button class="ca-pill ghost sm" data-a="mic" id="micB" title="Speak your explanation (English or French)">${ico('voice', 15)}<span>Speak</span></button>` : ''}<button class="ca-pill primary" data-a="tsend" id="tSendB">Send</button></div></div></section>`;
  const opener = [`I keep hearing about ${MO_LABEL[id] || 'this'} but it sounds scary${name ? ', ' + name : ''}. Where would you start?`, `Apparently ${MO_LABEL[id] || 'this'} is on the test. I am panicking a little. Can you explain it like I am ten?`, `Help! Everyone says ${MO_LABEL[id] || 'this'} is easy, and I understood none of it. What is the big idea?`][Math.floor(Math.random() * 3)];
  moSay(opener, 'confused'); setTimeout(()=>{ const t = $('#tIn'); if(t) t.focus({ preventScroll:true }); }, 300);
}
function moSay(text, mood, cls){
  const chat = $('#chat'); if(!chat) return null; const b = document.createElement('div'); b.className = 'ca-msg mo' + (cls ? ' ' + cls : ''); b.innerHTML = '<span class="ca-who">Mo</span><p></p>'; chat.appendChild(b);
  setMo(mood); typeInto(b.querySelector('p'), text, 'mo', mood); chat.scrollTop = chat.scrollHeight; return b;
}
function setMo(m){ const w = $('#moW'); if(w){ w.innerHTML = moSvg(m); } if(S.T) S.T.mood = m; }
function meter(v){ const e = $('#und'), b = $('#undBar'); if(e) e.textContent = Math.round(v) + '%'; if(b) b.style.width = clamp(v, 0, 100) + '%'; }
async function tSend(){
  const T = S.T, inp = $('#tIn'); if(!T || T.busy || !inp) return; const text = inp.value.trim(); if(!text) return;
  stopMic(); T.busy = true; inp.value = ''; $('#tSendB').disabled = true;
  const chat = $('#chat'), u = document.createElement('div'); u.className = 'ca-msg you'; u.innerHTML = '<span class="ca-who">You</span><p></p>'; u.querySelector('p').textContent = text; chat.appendChild(u);
  T.msgs.push({ role:'user', content:text });
  const t0 = Date.now(), local = moLocal(T, text), kw = moKeywords(text);
  const ind = document.createElement('div'); ind.className = 'ca-msg mo typing'; ind.innerHTML = `<span class="ca-who">Mo</span><p><i></i><i></i><i></i> <small>${kw.length ? 'Mo is chewing on “' + esc(kw[0]) + '”…' : 'Mo is thinking…'}</small></p>`; chat.appendChild(ind); chat.scrollTop = chat.scrollHeight;
  setMo('thinking'); meter(Math.max(T.und, Math.min(local.understanding, T.und + 10)));
  const slow = later(()=>{ const s = ind.querySelector('small'); if(s) s.textContent = 'Still thinking, this one is tricky…'; }, 3200);
  let res = null;
  if(sbReady()){ res = await ai({ mode:'teach', topic:TN(T.id), topicId:T.id, messages:T.msgs.slice(-8), localUnderstanding:local.understanding }, 7000); }
  clearTimeout(slow); if(!S || S.T !== T) return;
  const wait = clamp(450 + text.length * 4, 500, 1100) - (Date.now() - t0); if(wait > 0 && !res) await new Promise(r=> setTimeout(r, wait)); if(!S || S.T !== T) return;
  ind.remove();
  let reply, und, done = false, mistake = false;
  if(res && res.reply){ reply = String(res.reply).slice(0, 600); und = clamp(Number(res.understanding) || local.understanding, 0, 100); done = !!res.done || und >= 100; mistake = !!res.mistake; if(!done && local.done && und >= 85) done = true; }
  else { reply = local.reply; und = local.understanding; done = local.done; }
  und = Math.max(und, mistake ? T.und - 4 : T.und); T.turns++; const gain = und - T.und; T.und = und; T.msgs.push({ role:'assistant', content:reply });
  const mood = done ? 'aha' : mistake ? 'sad' : gain >= 10 ? 'aha' : gain <= 1 ? 'confused' : 'thinking';
  moSay(reply, mood); meter(und); SND.play(gain > 0 ? 'ok' : 'click'); if(gain >= 10) { const b = $('#undBar'); if(b) hit(b, pal().brand, 10); }
  T.busy = false; const sb = $('#tSendB'); if(sb) sb.disabled = false;
  if(done) return teachDone();
  const t2 = $('#tIn'); if(t2) t2.focus({ preventScroll:true });
}
function teachDone(){
  const T = S.T, P = S.prof, first = P.teachTopics.indexOf(T.id) < 0; if(first) P.teachTopics.push(T.id); P.teach++;
  const xp = (first ? 40 : 15) + Math.min(20, T.turns * 3), lv = addXp(xp); saveProf(); S.fx.confetti(); SND.play('win'); setMo('aha');
  const chat = $('#chat'), d = document.createElement('div'); d.className = 'ca-donecard';
  d.innerHTML = `<b>Mo understands ${esc(MO_LABEL[T.id] || 'it')}.</b><p>+${xp} XP${lv ? ' and a new level' : ''}. You explained it in ${T.turns} message${T.turns > 1 ? 's' : ''}.</p><div class="ca-actions"><button class="ca-pill primary" data-a="teach">Teach another topic</button><button class="ca-pill ghost" data-a="back">Back to hub</button></div>`;
  chat.appendChild(d); chat.scrollTop = chat.scrollHeight; const c = $('.ca-compose'); if(c) c.hidden = true; T.busy = true;
}

// ----------------------------------------------------------------------------------- Case Files
const CASE = {
  title:'The Midnight Spill',
  intro:'Monday, 6:40 a.m. at a school science lab in Kumasi. Someone left a mess: a blue puddle under the bench, a white smear on the floor and a strip of grey metal by the sink. The headteacher wants answers before assembly. You are the lead investigator, and chemistry is your only witness.',
  scenes:[
    { f:'kojo', who:'Kojo, lab technician', say:'I found the puddle at dawn. I dropped a few drops of sodium hydroxide into a sample of it, and a pale blue solid appeared. I have no idea what that means!', q:'What does a pale blue precipitate with NaOH tell you?', o:['Copper(II) ions are present','Sodium ions are present','Chloride ions are present','The solution is neutral'], a:0, clue:'Cu²⁺ in the spill', ok:'Yes! Copper(II) hydroxide is a pale blue solid, so the spill contains Cu²⁺.', bad:'Think about which metal ions make coloured hydroxide precipitates. Blue is the signature of one of them.' },
    { f:'ama', who:'Dr. Ama, chemistry teacher', say:'I tested another sample with barium chloride solution and got a white precipitate. It did not dissolve when I added dilute hydrochloric acid.', q:'Which ion does that result show?', o:['Chloride, Cl⁻','Sulfate, SO₄²⁻','Carbonate, CO₃²⁻','Nitrate, NO₃⁻'], a:1, clue:'SO₄²⁻ in the spill', ok:'Correct! Barium sulfate is insoluble even in acid, which separates it from barium carbonate.', bad:'A white precipitate that survives acid cannot be a carbonate, because carbonates fizz and dissolve in acid.' },
    { f:'yaw', who:'Mr. Yaw, storekeeper', say:'So the spill holds both of those ions. In my store, exactly one bottle contains both. I only need you to say its name.', q:'Which compound contains the two ions you found?', o:['Sodium sulfate','Copper(II) chloride','Copper(II) sulfate','Zinc sulfate'], a:2, clue:'The chemical was CuSO₄', ok:'Copper(II) sulfate, CuSO₄: blue crystals that give a blue solution.', bad:'You need copper AND sulfate in the same compound. Check each option for both.' },
    { f:'you', who:'You, at the sink', say:'The grey metal strip is zinc. Its surface is crusted with a reddish-brown solid, and the blue colour of the puddle is fading around it.', q:'Why is the zinc coated in a reddish-brown solid?', o:['Zinc has rusted','Zinc displaced copper from the solution','Zinc reacted with the air','Zinc dissolved to form zinc oxide'], a:1, clue:'A zinc and copper(II) sulfate displacement demo', ok:'Zinc is more reactive than copper, so Zn + CuSO₄ → ZnSO₄ + Cu. The copper settles as a red-brown coating.', bad:'Zinc and copper(II) ions are both present. Which one is higher in the reactivity series?' }
  ],
  suspects:[
    { f:'kojo', n:'Kojo', d:'Planned a magnesium and hydrochloric acid bubbling demo.', ok:false, why:'Magnesium and HCl give hydrogen bubbles and no copper. Your clues point somewhere else.' },
    { f:'ama', n:'Dr. Ama', d:'Planned a reactivity-series demo with zinc and copper(II) sulfate.', ok:true, why:'' },
    { f:'yaw', n:'Mr. Yaw', d:'Was counting sodium chloride and silver nitrate for next week.', ok:false, why:'Silver nitrate and sodium chloride give white silver chloride, not a blue copper solution.' }
  ],
  ending:'Dr. Ama laughs with relief. She set up her zinc and copper(II) sulfate demo on Sunday night to save time, and the tray tipped over when the cleaner moved the bench. No harm done. The headteacher is delighted: every clue was chemistry, and you solved it before assembly.'
};
const clueChips = ()=> `<div class="ca-clues">${S.kase.clues.map(c=> `<span class="ca-clue">${ico('check', 14)}${esc(c)}</span>`).join('')}</div>`;
function casesHtml(){
  S.kase = { i:-1, clues:[], tries:0 }; const done = S.prof.cases.indexOf('c1') >= 0;
  return `${topBar('Case files', true)}<section class="ca-case"><p class="ca-kicker">Case 001${done ? ', solved' : ''}</p><h3 class="ca-h3 big">${esc(CASE.title)}</h3><p class="ca-lead">${esc(CASE.intro)}</p><div class="ca-actions"><button class="ca-pill primary" data-a="casenext">${done ? 'Replay the case' : 'Open the case'}</button></div></section>`;
}
function caseScene(){
  const K = S.kase, sc = CASE.scenes[K.i]; if(!sc) return caseAccuse();
  S.inn.innerHTML = `${topBar('Case files', true)}<section class="ca-case"><p class="ca-kicker">Clue ${K.i + 1} of ${CASE.scenes.length}</p>
   <div class="ca-scene"><div class="ca-faceW">${faceSvg(sc.f, 64)}</div><div><b>${esc(sc.who)}</b><p>${esc(sc.say)}</p></div></div>
   <p class="ca-q">${esc(sc.q)}</p><div class="ca-opts" id="kOpts">${sc.o.map((o,i)=> `<button class="ca-opt" data-a="caseopt" data-v="${i}"><kbd>${'ABCD'[i]}</kbd><span>${esc(o)}</span></button>`).join('')}</div><div id="kMsg"></div>${clueChips()}</section>`;
}
function caseAnswer(i, btn){
  const K = S.kase, sc = CASE.scenes[K.i]; if(!sc || K.locked) return;
  if(i === sc.a){ K.locked = true; K.clues.push(sc.clue); btn.classList.add('ok'); SND.play('ok'); hit(btn, pal().ok, 12); $$('#kOpts .ca-opt').forEach(b=> b.disabled = true);
    $('#kMsg').innerHTML = `<div class="ca-why ok"><b>Clue found.</b> ${esc(sc.ok)}</div><button class="ca-pill primary" data-a="casenext">${K.i === CASE.scenes.length - 1 ? 'Name the culprit' : 'Next clue'}</button>`;
  } else { btn.classList.add('bad'); btn.disabled = true; SND.play('bad'); K.tries++; $('#kMsg').innerHTML = `<div class="ca-why"><b>Not quite.</b> ${esc(sc.bad)}</div>`; }
}
function caseAccuse(){
  S.inn.innerHTML = `${topBar('Case files', true)}<section class="ca-case"><p class="ca-kicker">The accusation</p><h3 class="ca-h3 big">Who left the spill?</h3>${clueChips()}<div class="ca-opts" style="margin-top:14px">${CASE.suspects.map((s,i)=> `<button class="ca-opt person" data-a="accuse" data-v="${i}"><span class="ca-faceW">${faceSvg(s.f, 48)}</span><span><strong>${esc(s.n)}</strong><small>${esc(s.d)}</small></span></button>`).join('')}</div><div id="kMsg"></div></section>`;
}
function caseAccuseOne(i, btn){
  const s = CASE.suspects[i];
  if(!s.ok){ btn.classList.add('bad'); btn.disabled = true; SND.play('bad'); $('#kMsg').innerHTML = `<div class="ca-why"><b>Not them.</b> ${esc(s.why)}</div>`; return; }
  btn.classList.add('ok'); SND.play('win'); const first = S.prof.cases.indexOf('c1') < 0; if(first) S.prof.cases.push('c1'); const xp = first ? 60 : 10, lv = addXp(xp); saveProf(); S.fx.confetti(); S.last = { kase:true };
  S.inn.innerHTML = `${topBar('Case solved', true)}<section class="ca-case"><p class="ca-kicker">Case 001, solved</p><div class="ca-scene"><div class="ca-faceW">${faceSvg('ama', 64)}</div><div><b>Dr. Ama</b><p>${esc(CASE.ending)}</p></div></div><p class="ca-note">+${xp} XP${lv ? ', and you levelled up' : ''}${S.kase.tries ? '' : '. Flawless: no wrong guesses.'}</p><div class="ca-actions"><button class="ca-pill" data-a="sharecase">Share this</button><button class="ca-pill ghost" data-a="back">Back to hub</button></div></section>`;
}

// ----------------------------------------------------------------------------------- Virtual Lab: data
const RG = {
  hcl:{ n:'Hydrochloric acid', f:'HCl', c:'#d9efff' }, naoh:{ n:'Sodium hydroxide', f:'NaOH', c:'#e8f1ff' }, agno3:{ n:'Silver nitrate', f:'AgNO₃', c:'#e9eaf4' }, nacl:{ n:'Sodium chloride', f:'NaCl', c:'#dfeaf5' },
  cuso4:{ n:'Copper(II) sulfate', f:'CuSO₄', c:'#2f8fff' }, pbno3:{ n:'Lead(II) nitrate', f:'Pb(NO₃)₂', c:'#e5eaf2' }, ki:{ n:'Potassium iodide', f:'KI', c:'#eef0f5' }, h2o2:{ n:'Hydrogen peroxide', f:'H₂O₂', c:'#e3f3ff' }, vin:{ n:'Vinegar', f:'CH₃COOH', c:'#f6e8c8' },
  bacl2:{ n:'Barium chloride', f:'BaCl₂', c:'#e9eef6' }, nh3:{ n:'Ammonia solution', f:'NH₃', c:'#e7f3ff' }, fecl3:{ n:'Iron(III) chloride', f:'FeCl₃', c:'#d9a441' }, kscn:{ n:'Potassium thiocyanate', f:'KSCN', c:'#eef1f6' }, cabbage:{ n:'Red cabbage juice', f:'Indicator', c:'#8a3fa8' },
  mg:{ n:'Magnesium ribbon', f:'Mg', c:'#b9bcc4', s:1 }, zn:{ n:'Zinc granules', f:'Zn', c:'#a9b0b8', s:1 }, cu:{ n:'Copper wire', f:'Cu', c:'#b87333', s:1 }, nahco3:{ n:'Baking soda', f:'NaHCO₃', c:'#f3f3f3', s:1 }, mno2:{ n:'Manganese dioxide', f:'MnO₂', c:'#3a3a3a', s:1 }
};
const RX = {
  'hcl+naoh':{ fx:'heat', dt:12, after:'#e6f2ff', title:'Neutralisation', see:'Nothing changes colour, but the beaker warms up.', eq:'HCl + NaOH → NaCl + H₂O', why:'An acid and a base react to form a salt and water. Forming new bonds releases energy, so the reaction is exothermic.', tip:'Strong acid + strong base ends at pH 7 at the equivalence point. Try the Titration station to see it.' },
  'agno3+nacl':{ fx:'ppt', pc:'#ffffff', after:'#e8eef6', title:'Silver chloride precipitate', see:'A thick white solid forms and sinks.', eq:'Ag⁺(aq) + Cl⁻(aq) → AgCl(s)', why:'Silver chloride is insoluble, so the two ions lock together as a solid. This is the classic test for chloride ions.', tip:'AgCl dissolves in dilute ammonia, which helps separate it from AgBr and AgI.' },
  'cuso4+naoh':{ fx:'ppt', pc:'#6fb7ff', after:'#cfe6ff', title:'Copper(II) hydroxide precipitate', see:'A pale blue solid appears and settles.', eq:'Cu²⁺(aq) + 2OH⁻(aq) → Cu(OH)₂(s)', why:'Copper(II) hydroxide is insoluble. Pale blue is the signature of copper(II).', tip:'Add ammonia as well and the solid dissolves into a deep blue complex ion.' },
  'hcl+mg':{ fx:'bubbles', n:36, dt:26, gas:'h2', after:'#e6f2ff', heat:1, title:'Metal and acid', see:'Fast fizzing. The magnesium shrinks and the beaker warms.', eq:'Mg + 2HCl → MgCl₂ + H₂', why:'Magnesium is more reactive than hydrogen, so it pushes hydrogen out of the acid as gas.', tip:'Test the gas with the splints below the beaker.' },
  'hcl+zn':{ fx:'bubbles', n:18, dt:6, gas:'h2', after:'#e6f2ff', title:'Zinc and acid', see:'Slower, steady bubbles form on the zinc.', eq:'Zn + 2HCl → ZnCl₂ + H₂', why:'Zinc is less reactive than magnesium, so the bubbling is gentler. The rate tells you about reactivity.', tip:'Compare Mg, Zn and Fe with acid to build the reactivity series.' },
  'cuso4+zn':{ fx:'fade', dt:8, pc:'#b5532a', after:'#e3edf8', title:'Displacement', see:'The blue colour fades while a red-brown coating forms on the zinc.', eq:'Zn + CuSO₄ → ZnSO₄ + Cu', why:'Zinc is more reactive than copper, so zinc atoms give electrons to Cu²⁺ ions and copper metal is deposited.', tip:'A more reactive metal displaces a less reactive one from its salt. The Galvanic cell station turns this into voltage.' },
  'cuso4+mg':{ fx:'fade', dt:22, pc:'#b5532a', after:'#e3edf8', heat:1, title:'Displacement', see:'The blue fades, copper coats the magnesium and the beaker warms.', eq:'Mg + CuSO₄ → MgSO₄ + Cu', why:'Magnesium sits above copper in the reactivity series, so it displaces copper. Electrons move from Mg to Cu²⁺.', tip:'The bigger the reactivity gap, the more heat is released.' },
  'nahco3+vin':{ fx:'bubbles', n:46, dt:-7, gas:'co2', foam:1, after:'#f6efe0', title:'Acid and carbonate', see:'Foaming fizz fills the beaker, and the beaker turns cold.', eq:'NaHCO₃ + CH₃COOH → CH₃COONa + H₂O + CO₂', why:'The weak acid reacts with hydrogencarbonate and releases carbon dioxide. This reaction absorbs heat, so the temperature drops.', tip:'An endothermic reaction that feels cold. Watch the thermometer.' },
  'hcl+nahco3':{ fx:'bubbles', n:50, dt:-4, gas:'co2', foam:1, after:'#e6f2ff', title:'Acid and carbonate', see:'Vigorous fizzing.', eq:'NaHCO₃ + HCl → NaCl + H₂O + CO₂', why:'A stronger acid releases CO₂ faster than vinegar does. Compare the speed with vinegar.', tip:'Stronger acid means a faster reaction because more H⁺ is available.' },
  'ki+pbno3':{ fx:'ppt', pc:'#ffd400', after:'#fff6b8', spark:1, title:'Golden rain', see:'Bright yellow crystals fall like glitter.', eq:'Pb²⁺(aq) + 2I⁻(aq) → PbI₂(s)', why:'Lead(II) iodide is insoluble and bright yellow. It dissolves in hot water and re-crystallises as golden flakes on cooling.', tip:'Virtual only: lead compounds are toxic and are never handled without a teacher.' },
  'h2o2+mno2':{ fx:'foam', dt:18, gas:'o2', after:'#f0f0f0', heat:1, title:'Catalysed decomposition', see:'Oxygen gas bursts out as a thick foam.', eq:'2H₂O₂ → 2H₂O + O₂ (MnO₂ catalyst)', why:'Manganese dioxide lowers the activation energy so hydrogen peroxide breaks down quickly. The catalyst is not used up.', tip:'A glowing splint relights in oxygen: the test for O₂.' }
};
const X = (a,b,o)=>{ RX[[a,b].sort().join('+')] = o; };
X('agno3','ki',{ fx:'ppt', pc:'#f3e17a', after:'#f4f1dc', title:'Silver iodide precipitate', see:'A pale yellow solid forms.', eq:'Ag⁺(aq) + I⁻(aq) → AgI(s)', why:'Silver iodide is insoluble and pale yellow, which helps tell the halides apart.', tip:'The halide ladder with AgNO₃: chloride white, bromide cream, iodide yellow.' });
X('nacl','pbno3',{ fx:'ppt', pc:'#ffffff', after:'#e8eef6', title:'Lead(II) chloride precipitate', see:'A white solid forms.', eq:'Pb²⁺(aq) + 2Cl⁻(aq) → PbCl₂(s)', why:'Lead(II) chloride is only slightly soluble in cold water. It dissolves when hot and crystallises again on cooling.', tip:'Virtual only: lead compounds are toxic. Solubility rules say most chlorides dissolve, with Ag, Pb and Hg(I) as the exceptions.' });
X('agno3','cu',{ fx:'fade', pc:'#dfe3ec', after:'#cfe3ff', title:'The silver tree', see:'Silvery needles sprout on the copper wire while the solution slowly turns blue.', eq:'2Ag⁺(aq) + Cu(s) → 2Ag(s) + Cu²⁺(aq)', why:'Copper is more reactive than silver, so copper atoms give electrons to silver ions. Silver metal grows as crystals and Cu²⁺ turns the solution blue.', tip:'Two electrons from each copper atom reduce two Ag⁺ ions: balance the charge as well as the atoms.' });
X('agno3','zn',{ fx:'fade', pc:'#cfd3dc', after:'#e9eaf4', dt:6, title:'Zinc displaces silver', see:'Grey, feathery crystals of silver grow on the zinc.', eq:'Zn + 2Ag⁺ → Zn²⁺ + 2Ag', why:'Zinc is well above silver in the reactivity series, so it displaces silver readily.', tip:'Zn is a stronger reducing agent than Cu, so this goes faster than the copper version.' });
X('bacl2','cuso4',{ fx:'ppt', pc:'#ffffff', after:'#8ec5ff', title:'Barium sulfate precipitate', see:'A dense white solid forms in the blue solution.', eq:'Ba²⁺(aq) + SO₄²⁻(aq) → BaSO₄(s)', why:'Barium sulfate is insoluble, even in acid. That is why it is the standard test for sulfate ions.', tip:'Add dilute HCl first to rule out carbonates, then BaCl₂. Virtual only: barium salts are toxic.' });
X('cuso4','nh3',{ fx:'tint', pc:'#9ccaff', after:'#1a49d6', title:'Deep blue complex ion', see:'A pale blue solid appears, then dissolves into an intense deep blue solution.', eq:'Cu²⁺ + 4NH₃ → [Cu(NH₃)₄]²⁺', why:'Ammonia molecules act as ligands, bonding to Cu²⁺ through their lone pairs. The new complex absorbs light differently, so the colour deepens.', tip:'Ligand exchange changes both colour and coordination. A favourite in coordination chemistry questions.' });
X('fecl3','kscn',{ fx:'tint', after:'#b3121f', title:'Blood-red complex', see:'The yellow solution instantly turns blood red.', eq:'Fe³⁺(aq) + SCN⁻(aq) ⇌ [Fe(SCN)]²⁺(aq)', why:'A coloured complex ion forms and the system reaches equilibrium. More Fe³⁺ or SCN⁻ deepens the red.', tip:'A colour-based Le Chatelier demo: add reactant and the colour intensifies.' });
X('fecl3','naoh',{ fx:'ppt', pc:'#a2441b', after:'#f1d9a0', title:'Iron(III) hydroxide precipitate', see:'A rust-brown solid forms.', eq:'Fe³⁺(aq) + 3OH⁻(aq) → Fe(OH)₃(s)', why:'Iron(III) hydroxide is insoluble and rust brown.', tip:'With NaOH: Cu²⁺ pale blue, Fe³⁺ rust brown, Fe²⁺ dirty green.' });
X('cabbage','hcl',{ fx:'tint', after:'#e0314b', title:'Red cabbage in acid', see:'The purple juice turns bright red.', eq:'Anthocyanin + H⁺ → red form', why:'Anthocyanin pigments change shape with pH, so they absorb different colours of light.', tip:'Red cabbage is a natural universal indicator. Try vinegar, baking soda and NaOH too.' });
X('cabbage','vin',{ fx:'tint', after:'#d9508a', title:'Red cabbage in weak acid', see:'The juice turns pink.', eq:'Anthocyanin + H⁺ → pink form', why:'A weak acid gives a higher pH than HCl, so the colour is pink rather than red.', tip:'Same indicator, different colour: the shade tells you roughly how acidic the solution is.' });
X('cabbage','nahco3',{ fx:'tint', after:'#2a8f8f', title:'Red cabbage in weak base', see:'The juice turns blue-green.', eq:'Anthocyanin + OH⁻ → blue-green form', why:'Baking soda is mildly alkaline (about pH 8), which gives a blue-green colour.', tip:'Purple means neutral, blue-green means weakly basic, yellow means strongly basic.' });
X('cabbage','naoh',{ fx:'tint', after:'#c8cc3d', title:'Red cabbage in strong base', see:'The juice turns yellow-green.', eq:'Anthocyanin + OH⁻ → yellow form', why:'In strongly alkaline conditions the pigment shifts again, to yellow-green.', tip:'The full rainbow: red, pink, purple, blue, green, yellow from acid to alkali.' });
X('h2o2','ki',{ fx:'foam', dt:20, gas:'o2', after:'#ffd9a0', heat:1, title:'Elephant toothpaste', see:'A tall column of warm foam erupts (with a squirt of dish soap added).', eq:'2H₂O₂ → 2H₂O + O₂ (I⁻ catalyst)', why:'Iodide ions catalyse the breakdown of hydrogen peroxide. Soap traps the oxygen as foam, and a little iodine gives the colour.', tip:'Compare with MnO₂: both are catalysts, but they work by different routes.' });
X('mg','vin',{ fx:'bubbles', n:14, dt:4, gas:'h2', after:'#f6efe0', title:'Metal and weak acid', see:'Slow, gentle bubbles rise from the magnesium.', eq:'Mg + 2CH₃COOH → (CH₃COO)₂Mg + H₂', why:'A weak acid supplies H⁺ more slowly than HCl, so the same metal reacts more gently.', tip:'Same metal, different acid strength: rate depends on the concentration of H⁺, not just the amount of acid.' });
const NR = {
  'cu+hcl':'Copper sits below hydrogen in the reactivity series, so it cannot push hydrogen out of the acid.', 'nacl+zn':'Zinc is less reactive than sodium, so it cannot displace sodium from its salt.', 'mg+nacl':'Magnesium is less reactive than sodium, so no displacement happens.', 'cu+zn':'Two solid metals do not react without a solution to carry ions.', 'cu+cuso4':'Copper cannot displace copper from its own salt: there is nothing to exchange.', 'hcl+nacl':'Both are chloride solutions of ions that stay dissolved: no solid, no gas and no energy change.', 'naoh+nacl':'Na⁺ and Cl⁻ stay dissolved. No new product forms.', 'bacl2+nacl':'Everything stays dissolved: all the possible products are soluble.', 'cu+mg':'Two solid metals sit side by side with nothing to react with.', 'hcl+vin':'Two acids do not neutralise each other: both donate protons.', 'cu+naoh':'Copper is not attacked by sodium hydroxide solution.'
};
const GAS = { h2:{ n:'hydrogen', right:'splint', ok:'Squeaky pop! Hydrogen burns explosively with oxygen from the air. That identifies H₂.', splint:null }, o2:{ n:'oxygen', right:'glow', ok:'The glowing splint relights. Only oxygen does that, so the gas is O₂.' }, co2:{ n:'carbon dioxide', right:'lime', ok:'The limewater turns milky as calcium carbonate forms. That identifies CO₂.' } };
const GAS_TEST = { h2:{ glow:'The glowing splint just goes out. Not oxygen.', lime:'Limewater stays clear. Not carbon dioxide.' }, o2:{ splint:'The lit splint burns much brighter, a hint for oxygen. Confirm it with a glowing splint.', lime:'Limewater stays clear. Not carbon dioxide.' }, co2:{ splint:'The lit splint is put out: carbon dioxide does not support burning.', glow:'The glowing splint goes out. Not oxygen.' } };
const FL = [
  { id:'li', n:'Lithium', s:'Li', c:'#ff2a4f', col:'Crimson red', d:'Emission near 671 nm, in the deep red.' }, { id:'na', n:'Sodium', s:'Na', c:'#ffa51a', col:'Intense golden yellow', d:'The famous doublet near 589 nm. It is so strong that it can mask other colours.' },
  { id:'k', n:'Potassium', s:'K', c:'#b794ff', col:'Lilac', d:'Its strongest lines are at the edges of the visible range, so the flame looks pale lilac.' }, { id:'ca', n:'Calcium', s:'Ca', c:'#ff6a2b', col:'Brick red (orange-red)', d:'Molecular emission from CaOH, with a band near 622 nm.' },
  { id:'sr', n:'Strontium', s:'Sr', c:'#e50f2e', col:'Scarlet red', d:'Emission from SrOH and SrCl molecules in the red. Redder and deeper than calcium.' }, { id:'ba', n:'Barium', s:'Ba', c:'#9be04a', col:'Pale apple green', d:'Strong emission near 524 nm, in the green.' },
  { id:'cu', n:'Copper', s:'Cu', c:'#27d6a6', col:'Blue-green', d:'Emission from copper chloride and hydroxide species in the green-blue region.' }
];
const SUBS = [['Stomach acid',1.5,1],['Lemon juice',2.2,0],['Cola',2.5,0],['Vinegar',2.9,0],['Black coffee',5,0],['Milk',6.6,0],['Pure water',7,1],['Seawater',8.1,0],['Baking soda solution',8.3,0],['Soapy water',10,0],['Household ammonia',11.5,0],['Bleach',12.5,0],['Sodium hydroxide, 0.1 mol/L',13,1]];
const IND = {
  uni:{ n:'Universal indicator', s:[[0,'#e53935'],[2,'#ef5a2f'],[3,'#f4511e'],[4,'#fb8c00'],[5,'#fdd835'],[6,'#c0ca33'],[7,'#43a047'],[8,'#26a69a'],[9,'#1e88e5'],[10,'#3949ab'],[12,'#5e35b1'],[14,'#4a2a8f']] },
  lit:{ n:'Litmus', s:[[0,'#e0314b'],[4.5,'#e0314b'],[6.5,'#9a4fc0'],[8.3,'#3f5bd1'],[14,'#2d44b8']] },
  php:{ n:'Phenolphthalein', s:[[0,'#eef2f8'],[8.1,'#eef2f8'],[9,'#f3a6cf'],[10.5,'#d6246e'],[14,'#b0145a']] },
  mo:{ n:'Methyl orange', s:[[0,'#e0302f'],[3.1,'#e0302f'],[4.4,'#f6a21c'],[5.5,'#f7d52e'],[14,'#f7d52e']] },
  cab:{ n:'Red cabbage', s:[[0,'#e0314b'],[2,'#e0314b'],[4,'#d9508a'],[6,'#8a3fa8'],[7.5,'#6a4fc0'],[8.5,'#3a78c8'],[10,'#2a9a8a'],[11.5,'#5fb04a'],[13,'#d2c93a'],[14,'#d2c93a']] }
};
function hex2(c){ return [1,3,5].map(i=> parseInt(c.substr(i, 2), 16)); }
function indColor(k, ph){ const s = IND[k].s; ph = clamp(ph, 0, 14); for(let i=1;i<s.length;i++){ if(ph <= s[i][0]){ const a = s[i-1], b = s[i], t = (ph - a[0]) / Math.max(.0001, b[0] - a[0]), A = hex2(a[1]), B = hex2(b[1]); return 'rgb(' + A.map((v,j)=> Math.round(v + (B[j] - v) * t)).join(',') + ')'; } } return s[s.length - 1][1]; }
const MET = { mg:{ n:'Magnesium', s:'Mg', E:-2.37, z:2, c:'#aab0bd' }, zn:{ n:'Zinc', s:'Zn', E:-.76, z:2, c:'#9aa3b2' }, fe:{ n:'Iron', s:'Fe', E:-.44, z:2, c:'#7b7f89' }, pb:{ n:'Lead', s:'Pb', E:-.13, z:2, c:'#6c7380' }, cu:{ n:'Copper', s:'Cu', E:.34, z:2, c:'#b87333' }, ag:{ n:'Silver', s:'Ag', E:.80, z:1, c:'#d6dae3' } };
const MYST = [
  { id:'cuso4', f:'CuSO₄', n:'copper(II) sulfate', col:'#4ba3ff', t:{ naoh:'A pale blue precipitate forms.', bacl2:'A white precipitate forms.', agno3:'No clear change (at most a faint cloudiness).', flame:'The flame turns blue-green.' } },
  { id:'nacl', f:'NaCl', n:'sodium chloride', col:'#e7f0fa', t:{ naoh:'No change.', bacl2:'No change.', agno3:'A white precipitate forms.', flame:'The flame turns golden yellow.' } },
  { id:'fecl3', f:'FeCl₃', n:'iron(III) chloride', col:'#d9a640', t:{ naoh:'A rust-brown precipitate forms.', bacl2:'No change.', agno3:'A white precipitate forms.', flame:'No distinct flame colour.' } },
  { id:'na2so4', f:'Na₂SO₄', n:'sodium sulfate', col:'#e7f0fa', t:{ naoh:'No change.', bacl2:'A white precipitate forms.', agno3:'No clear change (at most a faint cloudiness).', flame:'The flame turns golden yellow.' } },
  { id:'ki', f:'KI', n:'potassium iodide', col:'#eceff5', t:{ naoh:'No change.', bacl2:'No change.', agno3:'A yellow precipitate forms.', flame:'The flame turns lilac.' } }
];
const LQ = { honey:{ n:'Honey', d:1.42, c:'#d98b1c' }, syrup:{ n:'Corn syrup', d:1.33, c:'#9f4f19' }, soap:{ n:'Dish soap', d:1.06, c:'#43b583' }, water:{ n:'Water (dyed blue)', d:1.00, c:'#4aa3ff' }, oil:{ n:'Vegetable oil', d:.92, c:'#f0cf45' } };
const OBJ = { cork:{ n:'Cork', d:.24 }, ice:{ n:'Ice cube', d:.92 }, bead:{ n:'Plastic bead', d:1.15 }, nut:{ n:'Steel nut', d:7.8 } };
const LAB_TIPS = ['Nothing in this lab can hurt you, but in a real lab you always wear eye protection.','A precipitate is a solid that forms when two solutions are mixed.','A catalyst speeds up a reaction without being used up.','Exothermic reactions warm their surroundings. Endothermic ones cool them.','Colour changes are evidence of a chemical change, but not proof by themselves.','The more reactive a metal is, the more readily it loses electrons.','Always add acid to water, never water to acid, in a real lab.','Gases are collected and tested: a squeaky pop is hydrogen.','Indicators change colour over a narrow pH range.','Equilibrium reactions can go both ways. Colour often shows which way.'];
const LAB_ST = [['bench','Beaker bench','lab'],['flame','Flame tests','flame'],['ph','pH lab','drop'],['titr','Titration','target'],['cell','Galvanic cell','cell'],['myst','Mystery flask','mystery'],['dens','Density tower','layers'],['note','Notebook','book']];

// ----------------------------------------------------------------------------------- Virtual Lab: shell and Beaker bench
function labHtml(st){
  S.labTab = (typeof st === 'string' && st) || S.labTab || 'bench'; S.lab = { a:null, b:null, busy:false, temp:25 };
  const tabs = LAB_ST.map(t=> `<button class="ca-chip tab ${S.labTab === t[0] ? 'on' : ''}" data-a="labtab" data-v="${t[0]}">${ico(t[2], 16)}<span>${t[1]}</span></button>`).join('');
  return `${topBar('Virtual lab', true)}<nav class="ca-tabs" aria-label="Lab stations">${tabs}</nav><p class="ca-tip">${esc(pick(LAB_TIPS))}</p><section class="ca-labst" id="labBody">${(LAB_BODY[S.labTab] || LAB_BODY.bench)()}</section>`;
}
function labAfter(){ const f = LAB_INIT[S.labTab]; if(f) f(); }
function labTab(t){ S.labTab = t; S.inn.innerHTML = labHtml(t); labAfter(); }
const LAB_BODY = {}, LAB_INIT = {};
const labLog = html=>{ const l = $('#lLog'); if(l) l.innerHTML = html; };
const labXp = (n, why)=>{ const up = addXp(n); toast('+' + n + ' XP' + (why ? ' · ' + why : '') + (up ? ' · Level up' : '')); };

LAB_BODY.bench = ()=> {
  const found = S.prof.labFound.length, total = Object.keys(RX).length;
  return `<p class="ca-lead sm" id="lHead">${found} of ${total} reactions discovered. Tap one chemical, then another.</p>
  <div class="ca-benchrow"><div class="ca-beaker"><div class="ca-glass" id="lGlass"><div class="ca-liq" id="lLiq"></div><div class="ca-layer" id="lLayer"></div><div class="ca-foam" id="lFoam"></div><div class="ca-heat" id="lHeat" style="display:none"><i></i><i></i><i></i></div><div class="ca-flash" id="lFlash"></div></div>
   <svg viewBox="0 0 190 230" aria-hidden="true"><path d="M20 20H170M26 20V196Q26 218 48 218H142Q164 218 164 196V20" fill="none" stroke="var(--ca-glass)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 60V180" stroke="var(--ca-glass2)" stroke-width="5" stroke-linecap="round"/><g stroke="var(--ca-glass2)" stroke-width="2"><path d="M26 80h12M26 110h12M26 140h12M26 170h12"/></g></svg></div>
   <div class="ca-therm" role="img" aria-label="Thermometer"><div class="ca-th-tube"><i id="thFill" style="height:34%"></i></div><b id="thN">25.0 °C</b></div></div>
  <div class="ca-shelf" id="lShelf">${Object.keys(RG).map(k=> `<button class="ca-rg" data-a="rg" data-v="${k}" style="--c:${RG[k].c}"><i></i>${esc(RG[k].f)}<small>${esc(RG[k].n)}</small></button>`).join('')}</div>
  <div class="ca-actions center"><button class="ca-pill ghost sm" data-a="labreset">${ico('reset', 15)}<span>Empty the beaker</span></button></div>
  <div class="ca-gasbar" id="gasBar" hidden><span>Test the gas:</span><button class="ca-pill sm" data-a="gas" data-v="splint">Lit splint</button><button class="ca-pill sm" data-a="gas" data-v="glow">Glowing splint</button><button class="ca-pill sm" data-a="gas" data-v="lime">Limewater</button></div>
  <div class="ca-log" id="lLog" aria-live="polite">Pick your first chemical from the shelf.</div>`;
};
function setTemp(t){
  const L = S.lab; if(!L) return; const from = L.temp; L.temp = t; let k = 0; const f = $('#thFill'), n = $('#thN'); if(!f) return;
  const iv = setInterval(()=>{ if(!S || S.lab !== L){ clearInterval(iv); return; } k++; const v = from + (t - from) * Math.min(1, k / 16); f.style.height = clamp((v - 5) / 55 * 90 + 8, 8, 100) + '%'; n.textContent = fmt1(v) + ' °C'; f.classList.toggle('hot', v > 32); f.classList.toggle('cold', v < 20); if(k >= 16) clearInterval(iv); }, 60); S.timers.push(iv);
}
function dropSolid(glass, r){ if(!r.s) return; for(let k=0;k<7;k++){ const d = document.createElement('div'); d.className = 'ca-solidbit'; d.style.cssText = `bottom:${rnd(0,8)}px;left:${rnd(10,80)}%;width:${rnd(8,16)}px;height:${rnd(5,9)}px;background:${r.c};transform:rotate(${rnd(-25,25)}deg);`; glass.appendChild(d); } }
function labAdd(id){
  const L = S.lab; if(!L || L.busy) return; const r = RG[id]; if(!r) return;
  if(L.b) return labLog('<b>The beaker is full.</b> Press “Empty the beaker” to start a new experiment.');
  if(L.a === id) return labLog('<b>Already in the beaker.</b> Try a different chemical for the second one.');
  const liq = $('#lLiq'), glass = $('#lGlass');
  if(!L.a){ L.a = id; if(!r.s){ liq.style.setProperty('--lq', r.c); liq.style.height = '46%'; } else { liq.style.setProperty('--lq', '#d9efff'); liq.style.height = '30%'; } dropSolid(glass, r); SND.play('click'); labLog(`<b>${esc(r.n)}</b> (${r.f}) is in the beaker. Now add a second chemical.`); return; }
  L.b = id; L.busy = true; const first = RG[L.a];
  if(!r.s && first.s){ liq.style.setProperty('--lq', r.c); liq.style.height = '48%'; } else if(!r.s && !first.s){ liq.style.height = '60%'; }
  dropSolid(glass, r); SND.play('click');
  const key = [L.a, id].sort().join('+'), rx = RX[key];
  later(()=>{ L.busy = false; if(S.lab !== L) return; if(rx) return labReact(rx, key, glass);
    labLog(`<b>No visible reaction.</b> ${esc(NR[key] || first.n + ' and ' + r.n + ' sit together without a clear change. Some mixtures simply do not react, and that is a result too.')} <span class="mut">Try another pair.</span>`); }, 700);
}
function labReact(rx, key, glass){
  const L = S.lab, liq = $('#lLiq'), layer = $('#lLayer'), foam = $('#lFoam'), heat = $('#lHeat'), fl = $('#lFlash');
  liq.style.setProperty('--lq', rx.after);
  const bubbles = n=>{ for(let k=0;k<n;k++){ const b = document.createElement('div'), s = rnd(5,15); b.className = 'ca-bub'; b.style.cssText = `left:${rnd(6,88)}%;width:${s}px;height:${s}px;--d:${rnd(1.4,3)}s;animation-delay:${rnd(0,2.2)}s;`; glass.appendChild(b); setTimeout(()=> b.remove(), 5600); } };
  if(rx.fx === 'bubbles'){ bubbles(rx.n || 30); if(rx.foam){ foam.style.height = '70%'; later(()=> foam.style.height = '30%', 2600); } }
  if(rx.fx === 'ppt'){ for(let k=0;k<46;k++){ const p = document.createElement('div'); p.className = 'ca-ppt'; p.style.cssText = `left:${rnd(6,90)}%;--pc:${rx.pc};--d:${rnd(1.2,2.6)}s;--fall:${rnd(120,170)}px;animation-delay:${rnd(0,1.2)}s;`; glass.appendChild(p); setTimeout(()=> p.remove(), 4200); } layer.style.setProperty('--pc', rx.pc); later(()=> layer.style.height = '20%', 1500); }
  if(rx.fx === 'fade'){ layer.style.setProperty('--pc', rx.pc); later(()=> layer.style.height = '13%', 400); bubbles(8); }
  if(rx.fx === 'foam'){ bubbles(26); foam.style.height = '108%'; fl.classList.add('go'); later(()=> foam.style.height = '40%', 3200); }
  if(rx.fx === 'heat' || rx.heat){ heat.style.display = 'flex'; later(()=>{ const h = $('#lHeat'); if(h) h.style.display = 'none'; }, 4200); }
  if(rx.dt != null) setTemp(25 + rx.dt); else setTemp(25);
  hit(glass, rx.pc || pal().brand, 14); SND.play('ok'); if(rx.gas){ L.gas = rx.gas; const g = $('#gasBar'); if(g) g.hidden = false; }
  const first = S.prof.labFound.indexOf(key) < 0; let bonus = '';
  if(first){ S.prof.labFound.push(key); addXp(5); bonus = ' <span class="ca-tag">New discovery, +5 XP</span>'; saveProf(); if(S.prof.labFound.length >= 10) badge('discover', BADGES.discover); }
  const dtTxt = rx.dt != null && rx.dt !== 0 ? `<div class="ca-sidefact">${ico('therm', 15)} Temperature ${rx.dt > 0 ? 'rises' : 'falls'} by about ${Math.abs(rx.dt)} °C: this reaction is ${rx.dt > 0 ? 'exothermic' : 'endothermic'}.</div>` : '';
  labLog(`<div><b>${esc(rx.title)}</b>${bonus}</div><div class="ca-mt"><b>You see:</b> ${esc(rx.see)}</div><div class="ca-eq">${esc(rx.eq)}</div><div><b>Why:</b> ${esc(rx.why)}</div>${dtTxt}<div class="ca-mt amb"><b>Competition tip:</b> ${esc(rx.tip)}</div>`);
  const h = $('#lHead'); if(h) h.textContent = `${S.prof.labFound.length} of ${Object.keys(RX).length} reactions discovered. Empty the beaker to try another pair.`;
}
function gasTest(kind){
  const L = S.lab; if(!L || !L.gas) return; const g = L.gas, G = GAS[g], fl = $('#lFlash'); let msg, ok = false;
  if(kind === G.right){ msg = G.ok; ok = true; } else msg = GAS_TEST[g][kind] || 'Nothing happens.';
  if(kind === 'splint' && g === 'h2'){ SND.play('pop'); } else SND.play(ok ? 'ok' : 'click');
  if(fl){ fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); }
  let extra = '';
  if(ok && S.prof.lab.gases.indexOf(g) < 0){ S.prof.lab.gases.push(g); saveProf(); extra = ' <span class="ca-tag">Gas identified, +5 XP</span>'; addXp(5); if(S.prof.lab.gases.length >= 3) badge('gas', BADGES.gas); }
  const l = $('#lLog'); if(l) l.insertAdjacentHTML('beforeend', `<div class="ca-mt gasres ${ok ? 'ok' : ''}"><b>${kind === 'splint' ? 'Lit splint' : kind === 'glow' ? 'Glowing splint' : 'Limewater'}:</b> ${esc(msg)}${extra}</div>`);
}
function labReset(){
  if(!S.lab) return; S.lab = { a:null, b:null, busy:false, temp:S.lab.temp }; const g = $('#lGlass'); if(!g) return;
  g.querySelectorAll('.ca-bub,.ca-ppt,.ca-solidbit').forEach(n=> n.remove()); $('#lLiq').style.height = '0'; $('#lLayer').style.height = '0'; $('#lFoam').style.height = '0'; $('#lHeat').style.display = 'none'; const gb = $('#gasBar'); if(gb) gb.hidden = true;
  setTemp(25); labLog('Beaker emptied. Pick your first chemical from the shelf.');
}

// ----------------------------------------------------------------------------------- Flame tests
LAB_BODY.flame = ()=> `<p class="ca-lead sm">Dip a wire loop of a metal salt into the Bunsen flame. Every metal has its own colour.</p>
  <div class="ca-flamewrap"><svg viewBox="0 0 200 250" class="ca-flamesvg" role="img" aria-label="Bunsen burner flame"><defs><linearGradient id="bnz" x1="0" x2="1"><stop offset="0" stop-color="#6c7390"/><stop offset=".4" stop-color="#c8cee0"/><stop offset="1" stop-color="#5d647f"/></linearGradient></defs>
   <g id="flG"><path class="fo" d="M100 36C132 88 142 122 126 152C116 172 84 172 74 152C58 122 70 88 100 36Z"/><path class="fi" d="M100 92C115 116 118 136 108 152C102 162 98 162 92 152C82 136 85 116 100 92Z"/><path d="M87 166q13-26 26 0z" fill="#3a64ff"/></g>
   <rect x="86" y="164" width="28" height="52" rx="5" fill="url(#bnz)"/><rect x="84" y="196" width="32" height="8" rx="3" fill="#4b516b"/><ellipse cx="100" cy="226" rx="48" ry="9" fill="url(#bnz)"/><path d="M178 26L108 120" stroke="#8e97ae" stroke-width="3" stroke-linecap="round"/><circle cx="106" cy="122" r="5.5" fill="none" stroke="#8e97ae" stroke-width="2.4"/></svg>
   <div class="ca-flameinfo" id="flInfo"><b>Choose a metal</b><p>Heat lifts electrons to higher energy levels. When they fall back they release light, and the colour depends on the size of the energy gap.</p></div></div>
  <div class="ca-chips" id="flChips">${FL.map(m=> `<button class="ca-chip" data-a="flame" data-v="${m.id}">${m.n} (${m.s})</button>`).join('')}</div>
  <div class="ca-actions"><button class="ca-pill" data-a="flamequiz">Mystery salt challenge</button></div><div id="flQuiz" aria-live="polite"></div>`;
function flameSet(m){ const g = $('#flG'); if(g) g.style.setProperty('--fl', m.c); }
LAB_INIT.flame = ()=>{ flameSet({ c:'#5b7bff' }); };
function flameShow(id){
  const m = FL.find(x=> x.id === id); if(!m) return; flameSet(m); SND.play('fizz'); $$('#flChips .ca-chip').forEach(b=> b.classList.toggle('on', b.dataset.v === id));
  $('#flInfo').innerHTML = `<b>${m.n} (${m.s}): ${esc(m.col)}</b><p>${esc(m.d)}</p><small>Different metals have different electron energy gaps, so each gives its own fingerprint colour.</small>`; $('#flQuiz').innerHTML = '';
  const F = S.prof.lab.flames; if(F.indexOf(id) < 0){ F.push(id); saveProf(); if(F.length >= FL.length){ labXp(10, 'all flame colours'); badge('fire', BADGES.fire); } }
}
function flameQuiz(){
  const last = S.lab.fq, cand = FL.filter(m=> m.id !== last), t = pick(cand); S.lab.fq = t.id; flameSet(t);
  const opts = shuffle([t].concat(shuffle(FL.filter(m=> m.id !== t.id)).slice(0, 3)));
  $('#flInfo').innerHTML = '<b>Which metal is in this flame?</b><p>Use what you have learned about the colours.</p>';
  $('#flQuiz').innerHTML = `<div class="ca-chips">${opts.map(m=> `<button class="ca-chip" data-a="flameguess" data-v="${m.id}">${m.n}</button>`).join('')}</div>`;
}
function flameGuess(id, btn){
  const t = FL.find(m=> m.id === S.lab.fq); if(!t) return;
  if(id === t.id){ btn.classList.add('ok'); SND.play('ok'); $('#flInfo').innerHTML = `<b>Correct: ${t.n}.</b><p>${esc(t.col)}. ${esc(t.d)}</p>`; labXp(5, 'flame ID'); $('#flQuiz').innerHTML = '<div class="ca-actions"><button class="ca-pill primary" data-a="flamequiz">Next mystery</button></div>'; }
  else { btn.classList.add('bad'); btn.disabled = true; SND.play('bad'); }
}

// ----------------------------------------------------------------------------------- pH and indicators
LAB_BODY.ph = ()=> `<p class="ca-lead sm">Pick a household liquid and see what five indicators do. Then dilute it and watch the pH.</p>
  <div class="ca-chips" id="phChips">${SUBS.map((s,i)=> `<button class="ca-chip" data-a="phsub" data-v="${i}">${esc(s[0])}</button>`).join('')}</div>
  <div class="ca-phcard"><div class="ca-phtop"><div><small id="phName"></small><b id="phVal">7.0</b></div><div class="ca-phtag" id="phTag"></div></div>
   <div class="ca-scale"><i id="phMark"></i></div><div class="ca-scale-l"><span>0 acid</span><span>7 neutral</span><span>14 alkali</span></div>
   <div class="ca-tubes" id="phTubes"></div>
   <div class="ca-actions"><button class="ca-pill sm" data-a="phdil">Dilute by ten</button><button class="ca-pill ghost sm" data-a="phreset">Undo dilution</button></div><p class="ca-hint" id="phNote"></p></div>`;
function phDraw(){
  const P = S.lab.ph, s = SUBS[P.i]; let ph = s[1];
  if(Math.abs(ph - 7) > .1 && P.d){ const step = s[2] ? 1 : .5; ph = ph < 7 ? Math.min(6.9, ph + P.d * step) : Math.max(7.1, ph - P.d * step); }
  $('#phName').textContent = s[0] + (P.d ? `, diluted ×${Math.pow(10, P.d)}` : ''); $('#phVal').textContent = fmt1(ph); $('#phMark').style.left = (ph / 14 * 100) + '%';
  $('#phTag').textContent = ph < 6.5 ? 'Acidic' : ph > 7.5 ? 'Alkaline' : 'Neutral';
  $('#phTubes').innerHTML = Object.keys(IND).map(k=> `<div class="ca-tube"><i style="background:${indColor(k, ph)}"></i><span>${IND[k].n}</span></div>`).join('');
  $$('#phChips .ca-chip').forEach(b=> b.classList.toggle('on', +b.dataset.v === P.i));
  $('#phNote').textContent = Math.abs(s[1] - 7) < .1 ? 'Pure water is neutral. Dilution changes nothing.' : P.d ? (s[2] ? 'A strong acid or base changes by one pH unit for every ten-fold dilution, but it can never cross pH 7.' : 'A weak acid or base changes by less than one unit per ten-fold dilution, because it ionises more as it is diluted.') : 'Try diluting. Does the pH jump by one unit, or by less?';
}
LAB_INIT.ph = ()=>{ S.lab.ph = { i:3, d:0 }; phDraw(); };

// ----------------------------------------------------------------------------------- Titration
LAB_BODY.titr = ()=> `<p class="ca-lead sm">A flask holds 25.0 mL of hydrochloric acid of unknown concentration with phenolphthalein. Add 0.100 mol/L sodium hydroxide until the colour just changes, then work out the acid’s concentration.</p>
  <div class="ca-titr"><div class="ca-burette"><div class="ca-bu-tube"><i id="buFill" style="height:100%"></i></div><b id="buN">0.00 mL added</b></div>
   <div class="ca-flaskwrap"><div class="ca-flask"><div class="ca-fl-liq" id="flLiq"></div></div><small>25.0 mL HCl</small></div>
   <svg viewBox="0 0 250 160" class="ca-curve" role="img" aria-label="pH curve"><path d="M26 10V138H244" fill="none" stroke="var(--ca-line)" stroke-width="1.5"/><g stroke="var(--ca-line)" stroke-width="1"><path d="M26 74H244"/></g><text x="4" y="14" font-size="9" fill="var(--ca-mute)">14</text><text x="9" y="78" font-size="9" fill="var(--ca-mute)">7</text><text x="14" y="141" font-size="9" fill="var(--ca-mute)">0</text><text x="130" y="154" font-size="9" fill="var(--ca-mute)">volume of NaOH added (mL)</text><polyline id="curveLine" fill="none" stroke="var(--ca-brand)" stroke-width="2.4" stroke-linejoin="round" points=""/></svg></div>
  <div class="ca-actions center"><button class="ca-pill sm" data-a="tit" data-v="5">+5 mL</button><button class="ca-pill sm" data-a="tit" data-v="1">+1 mL</button><button class="ca-pill sm" data-a="tit" data-v=".1">+0.1 mL</button><button class="ca-pill sm" data-a="tit" data-v=".05">1 drop</button><button class="ca-pill ghost sm" data-a="titreset">${ico('reset', 15)}<span>New flask</span></button></div>
  <div class="ca-ans"><label for="titAns">Your answer: concentration of HCl (mol/L)</label><div><input id="titAns" inputmode="decimal" placeholder="e.g. 0.095" autocomplete="off"><button class="ca-pill primary sm" data-a="titcheck">Check answer</button></div></div><div id="titMsg" class="ca-log" aria-live="polite">Add base slowly near the colour change: a single drop can make the difference.</div>`;
function titPh(Ca, Va, Cb, Vb){ const na = Ca * Va, nb = Cb * Vb, V = Va + Vb; if(Math.abs(na - nb) < 1e-9) return 7; return na > nb ? -Math.log10((na - nb) / V) : 14 + Math.log10((nb - na) / V); }
LAB_INIT.titr = ()=>{ const Ca = Math.round(rnd(.080, .120) * 1000) / 1000; S.lab.t = { Ca, Vb:0, pts:[[0, titPh(Ca, .025, .1, 0)]], pink:false, done:false }; titDraw(); };
function titDraw(){
  const T = S.lab.t, ph = T.pts[T.pts.length - 1][1];
  $('#buN').textContent = fmt2(T.Vb) + ' mL added'; $('#buFill').style.height = ((50 - T.Vb) / 50 * 100) + '%';
  const r = clamp((ph - 8.2) / 1.8, 0, 1), liq = $('#flLiq'); liq.style.background = ph < 8.2 ? 'rgba(200,225,255,.35)' : `rgb(${Math.round(246 - 32 * r)},${Math.round(190 - 154 * r)},${Math.round(222 - 112 * r)})`;
  $('#curveLine').setAttribute('points', T.pts.map(p=> (26 + p[0] / 50 * 218).toFixed(1) + ',' + (138 - clamp(p[1], 0, 14) / 14 * 128).toFixed(1)).join(' '));
}
function titAdd(ml){
  const T = S.lab.t; if(!T || T.done) return; T.Vb = Math.min(50, Math.round((T.Vb + ml) * 1000) / 1000);
  const steps = Math.max(1, Math.min(8, Math.round(ml / .05))); const last = T.pts[T.pts.length - 1][0];
  for(let i=1;i<=steps;i++){ const v = last + (T.Vb - last) * i / steps; T.pts.push([v, titPh(T.Ca, .025, .1, v / 1000)]); }
  SND.play('tick'); titDraw(); const ph = T.pts[T.pts.length - 1][1];
  if(ph >= 8.3 && !T.pink){ T.pink = true; $('#titMsg').innerHTML = '<b>The solution has turned pink.</b> That is the end point. Read the burette and work out the concentration. (If you overshot, the curve shows you where the sharp rise began.)'; }
  else if(T.Vb >= 50) $('#titMsg').textContent = 'The burette is empty. Start a new flask.';
}
function titCheck(){
  const T = S.lab.t, raw = String($('#titAns').value || '').replace(',', '.').trim(), a = parseFloat(raw), m = $('#titMsg');
  if(!T.pink) return void (m.innerHTML = 'Keep adding sodium hydroxide until the flask first turns pink.');
  if(!isFinite(a) || a <= 0) return void (m.innerHTML = 'Type your answer as a number, for example 0.095.');
  const err = Math.abs(a - T.Ca) / T.Ca * 100, nb = .1 * T.Vb / 1000, work = `<div class="ca-eq">n(NaOH) = 0.100 × ${fmt2(T.Vb)} ÷ 1000 = ${(nb * 1000).toFixed(3)} mmol<br>n(HCl) = n(NaOH), because the ratio is 1 : 1<br>c(HCl) = ${(nb * 1000).toFixed(3)} mmol ÷ 25.0 mL = ${(nb / .025).toFixed(3)} mol/L</div>`;
  if(err <= 3){
    T.done = true; S.prof.lab.titr++; const first = S.prof.lab.titr === 1; let xp = first ? 20 : 8; if(err <= 1) xp += 10; saveProf(); labXp(xp, 'titration'); if(err <= 2) badge('titr', BADGES.titr); S.fx.confetti(); SND.play('win');
    m.innerHTML = `<b>Good work. You were within ${fmt1(err)}% of the true value (${T.Ca.toFixed(3)} mol/L).</b>${work}<div class="ca-actions"><button class="ca-pill primary" data-a="titreset">Try a new flask</button></div>`;
  } else m.innerHTML = `<b>${fmt1(err)}% away from the true value.</b> Check your titre reading and use the 1 : 1 mole ratio, then divide the moles by the flask volume in litres (0.0250 L).`;
}

// ----------------------------------------------------------------------------------- Galvanic cell
LAB_BODY.cell = ()=> `<p class="ca-lead sm">Build a cell from two metals in 1 mol/L solutions of their own ions. The more reactive metal becomes the anode.</p>
  <div class="ca-cellpick"><div><h4 class="ca-h4">Left electrode</h4><div class="ca-chips" id="cellL">${Object.keys(MET).map(k=> `<button class="ca-chip" data-a="cellL" data-v="${k}">${MET[k].s}</button>`).join('')}</div></div><div><h4 class="ca-h4">Right electrode</h4><div class="ca-chips" id="cellR">${Object.keys(MET).map(k=> `<button class="ca-chip" data-a="cellR" data-v="${k}">${MET[k].s}</button>`).join('')}</div></div></div>
  <div id="cellOut"></div>`;
const sup = z=> z === 1 ? '⁺' : '²⁺';
const gcd = (a,b)=> b ? gcd(b, a % b) : a;
function cellDraw(){
  const C = S.lab.cell, Lm = MET[C.L], Rm = MET[C.R]; $$('#cellL .ca-chip').forEach(b=> b.classList.toggle('on', b.dataset.v === C.L)); $$('#cellR .ca-chip').forEach(b=> b.classList.toggle('on', b.dataset.v === C.R));
  const same = C.L === C.R, A = Lm.E < Rm.E ? Lm : Rm, K = Lm.E < Rm.E ? Rm : Lm, E = same ? 0 : K.E - A.E, leftAnode = Lm === A;
  const needle = -55 + clamp(E / 3.4, 0, 1) * 110;
  const svg = `<svg viewBox="0 0 320 200" class="ca-cellsvg ${same ? '' : leftAnode ? 'fwd' : 'rev'}" role="img" aria-label="Galvanic cell diagram">
   <rect x="30" y="100" width="100" height="80" rx="8" fill="var(--ca-glassfill)" stroke="var(--ca-glass)" stroke-width="3"/><rect x="190" y="100" width="100" height="80" rx="8" fill="var(--ca-glassfill)" stroke="var(--ca-glass)" stroke-width="3"/>
   <rect x="33" y="122" width="94" height="55" rx="5" fill="${Lm.c}" opacity=".16"/><rect x="193" y="122" width="94" height="55" rx="5" fill="${Rm.c}" opacity=".16"/>
   <rect x="68" y="58" width="16" height="104" rx="3" fill="${Lm.c}" stroke="#000" stroke-opacity=".25"/><rect x="236" y="58" width="16" height="104" rx="3" fill="${Rm.c}" stroke="#000" stroke-opacity=".25"/>
   <path d="M108 112V86H212V112" fill="none" stroke="var(--ca-mute)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>
   <path class="ca-wire" d="M76 58V30H244V58" fill="none" stroke="var(--ca-ink)" stroke-width="2.4"/><path class="ca-elec" d="M76 58V30H244V58" fill="none" stroke="${pal().amber}" stroke-width="5" stroke-linecap="round"/>
   <circle cx="160" cy="30" r="21" fill="var(--ca-surf)" stroke="var(--ca-ink)" stroke-width="2.4"/><path d="M144 36q16-18 32 0" fill="none" stroke="var(--ca-line)" stroke-width="2"/><line x1="160" y1="38" x2="160" y2="19" stroke="${pal().bad}" stroke-width="2.4" stroke-linecap="round" style="transform-origin:160px 38px;transform:rotate(${needle}deg);transition:transform .8s cubic-bezier(.3,1.4,.5,1)"/><text x="160" y="56" text-anchor="middle" font-size="10" font-weight="700" fill="var(--ca-ink)">${fmt2(E)} V</text>
   <text x="76" y="196" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ca-ink)">${same ? '' : leftAnode ? 'Anode (−)' : 'Cathode (+)'}</text><text x="244" y="196" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ca-ink)">${same ? '' : leftAnode ? 'Cathode (+)' : 'Anode (−)'}</text><text x="160" y="104" text-anchor="middle" font-size="9" fill="var(--ca-mute)">salt bridge</text></svg>`;
  let info;
  if(same) info = '<div class="ca-log"><b>Same metal on both sides.</b> There is no difference in potential, so the voltmeter reads 0.00 V. A cell needs two different half-cells.</div>';
  else {
    const za = A.z, zc = K.z, lc = za * zc / gcd(za, zc), na = lc / za, nc = lc / zc, q = n=> n > 1 ? n : '';
    info = `<div class="ca-log"><div><b>E°cell = ${fmt2(E)} V</b> <span class="mut">(E°cathode − E°anode = ${K.E > 0 ? '+' : ''}${K.E.toFixed(2)} − (${A.E > 0 ? '+' : ''}${A.E.toFixed(2)}))</span></div>
    <div class="ca-eq">${A.s}(s) | ${A.s}${sup(A.z)}(aq) ‖ ${K.s}${sup(K.z)}(aq) | ${K.s}(s)</div>
    <div class="ca-mt"><b>Anode (oxidation):</b> ${A.s} → ${A.s}${sup(A.z)} + ${A.z > 1 ? A.z : ''}e⁻<br><b>Cathode (reduction):</b> ${K.s}${sup(K.z)} + ${K.z > 1 ? K.z : ''}e⁻ → ${K.s}<br><b>Overall:</b> ${q(na)}${A.s} + ${q(nc)}${K.s}${sup(K.z)} → ${q(na)}${A.s}${sup(A.z)} + ${q(nc)}${K.s}</div>
    <div class="ca-mt">Electrons flow through the wire from ${A.n.toLowerCase()} to ${K.n.toLowerCase()}. Positive ions drift towards the cathode through the salt bridge.</div></div>`;
    if(E > S.prof.lab.cell){ S.prof.lab.cell = E; saveProf(); } if(E >= 3 && badge('cell', BADGES.cell)) labXp(10, 'powerhouse');
  }
  $('#cellOut').innerHTML = svg + info; if(!same) SND.play('click');
}
LAB_INIT.cell = ()=>{ S.lab.cell = { L:'zn', R:'cu' }; cellDraw(); };

// ----------------------------------------------------------------------------------- Mystery flask
LAB_BODY.myst = ()=> `<p class="ca-lead sm">An unlabelled flask holds one of five salts. Run tests to identify it. Fewer tests earn more XP.</p>
  <div class="ca-mystrow"><div class="ca-flaskwrap big"><div class="ca-flask"><div class="ca-fl-liq" id="myLiq" style="background:#cfd6e4"></div><b class="ca-q-mark">?</b></div><small id="myCount">0 tests run</small></div>
   <div><div class="ca-chips col"><button class="ca-chip" data-a="mtest" data-v="naoh">Add NaOH</button><button class="ca-chip" data-a="mtest" data-v="bacl2">Add BaCl₂</button><button class="ca-chip" data-a="mtest" data-v="agno3">Add AgNO₃</button><button class="ca-chip" data-a="mtest" data-v="flame">Flame test</button></div></div></div>
  <ul class="ca-obs" id="myObs"><li class="mut">Observations will appear here. Look at the colour of the solution first.</li></ul>
  <h4 class="ca-h4">Your verdict</h4><div class="ca-chips">${MYST.map(m=> `<button class="ca-chip" data-a="mguess" data-v="${m.id}">${m.f}</button>`).join('')}</div><div id="myMsg" class="ca-log" aria-live="polite" hidden></div>`;
LAB_INIT.myst = ()=>{ const c = MYST.filter(m=> m.id !== S.lab.lastMy), t = pick(c); S.lab.my = { t, tests:0, wrong:0, done:false, seen:{} }; S.lab.lastMy = t.id; $('#myLiq').style.background = t.col; $('#myLiq').style.opacity = '.9'; };
function mystTest(k){
  const M = S.lab.my; if(!M || M.done) return; const lab = { naoh:'NaOH', bacl2:'BaCl₂', agno3:'AgNO₃', flame:'Flame test' }[k];
  if(!M.seen[k]){ M.seen[k] = 1; M.tests++; } $('#myCount').textContent = M.tests + ' test' + (M.tests > 1 ? 's' : '') + ' run';
  const ul = $('#myObs'); if(ul.querySelector('.mut')) ul.innerHTML = ''; if(!ul.querySelector('[data-k="' + k + '"]')) ul.insertAdjacentHTML('beforeend', `<li data-k="${k}"><b>${lab}:</b> ${esc(M.t.t[k])}</li>`);
  SND.play(k === 'flame' ? 'fizz' : 'click');
}
function mystGuess(id, btn){
  const M = S.lab.my; if(!M || M.done) return; const m = $('#myMsg'); m.hidden = false;
  if(id === M.t.id){
    M.done = true; btn.classList.add('ok'); const xp = Math.max(10, 40 - 5 * Math.max(0, M.tests - 3) - 8 * M.wrong); S.prof.lab.mystery++; saveProf(); labXp(xp, 'mystery solved'); if(M.tests <= 3 && M.wrong === 0) badge('det', BADGES.det); S.fx.confetti(); SND.play('win');
    m.innerHTML = `<b>Solved: ${M.t.f}, ${esc(M.t.n)}.</b> ${M.tests} test${M.tests > 1 ? 's' : ''} and ${M.wrong} wrong guess${M.wrong === 1 ? '' : 'es'}. <div class="ca-actions"><button class="ca-pill primary" data-a="mnew">Another flask</button></div>`;
  } else { M.wrong++; btn.classList.add('bad'); btn.disabled = true; SND.play('bad'); m.innerHTML = '<b>Not that one.</b> Compare your observations with what each salt would do. Which ions would give these results?'; }
}

// ----------------------------------------------------------------------------------- Density tower
LAB_BODY.dens = ()=> `<p class="ca-lead sm">Pour liquids that do not mix and watch them sort themselves by density. Then drop in an object and see where it rests.</p>
  <div class="ca-denrow"><div class="ca-tower" id="tower" aria-live="polite"><span class="ca-tower-empty">Pour a liquid</span></div><div class="ca-denside"><h4 class="ca-h4">Pour</h4><div class="ca-chips col">${Object.keys(LQ).map(k=> `<button class="ca-chip" data-a="tpour" data-v="${k}"><i class="dot" style="background:${LQ[k].c}"></i>${LQ[k].n}</button>`).join('')}</div>
   <h4 class="ca-h4">Drop in</h4><div class="ca-chips col">${Object.keys(OBJ).map(k=> `<button class="ca-chip" data-a="tdrop" data-v="${k}">${OBJ[k].n}</button>`).join('')}</div><button class="ca-pill ghost sm" data-a="tclear">${ico('reset', 15)}<span>Clear</span></button></div></div><div id="tMsg" class="ca-log" aria-live="polite">Density is mass per unit volume. Denser liquids sink below lighter ones.</div>`;
LAB_INIT.dens = ()=>{ S.lab.tw = []; };
function towerDraw(newId){
  const tw = $('#tower'), list = S.lab.tw.slice().sort((a,b)=> LQ[b].d - LQ[a].d), n = Math.max(list.length, 1), h = 100 / 5;
  tw.innerHTML = list.length ? list.map((k,i)=> `<div class="ca-tl ${k === newId ? 'new' : ''}" style="bottom:${i * h}%;height:${h}%;background:${LQ[k].c}"><span>${LQ[k].n} · ${LQ[k].d.toFixed(2)} g/cm³</span></div>`).join('') : '<span class="ca-tower-empty">Pour a liquid</span>';
}
function towerPour(k){ const tw = S.lab.tw; if(tw.indexOf(k) >= 0) return void ($('#tMsg').textContent = LQ[k].n + ' is already in the tower.'); tw.push(k); towerDraw(k); SND.play('click');
  $('#tMsg').innerHTML = `Poured <b>${LQ[k].n}</b> (${LQ[k].d.toFixed(2)} g/cm³). The tower ranks the liquids from densest at the bottom to lightest on top, however you pour them.`;
  if(tw.length === Object.keys(LQ).length){ badge('tower', BADGES.tower); labXp(8, 'full tower'); S.fx.confetti(); } }
function towerDrop(k){
  const tw = S.lab.tw; if(!tw.length) return void ($('#tMsg').textContent = 'Pour at least one liquid first.');
  const o = OBJ[k], list = tw.slice().sort((a,b)=> LQ[b].d - LQ[a].d), n = list.filter(x=> LQ[x].d >= o.d).length, h = 100 / 5;
  const old = $('#tower .ca-obj'); if(old) old.remove(); const el = document.createElement('div'); el.className = 'ca-obj'; el.textContent = o.n; el.style.bottom = '100%'; $('#tower').appendChild(el);
  requestAnimationFrame(()=> requestAnimationFrame(()=>{ el.style.bottom = (n * h) + '%'; })); SND.play('pop');
  const where = n === 0 ? 'sinks right to the bottom' : n === list.length ? 'floats on the surface' : 'comes to rest on top of ' + LQ[list[n - 1]].n.toLowerCase() + ', below ' + LQ[list[n]].n.toLowerCase();
  $('#tMsg').innerHTML = `<b>${o.n}</b> (about ${o.d} g/cm³) ${where}. An object sinks through every liquid less dense than itself and floats on the first one that is denser.`;
}

// ----------------------------------------------------------------------------------- Notebook
LAB_BODY.note = ()=> {
  const P = S.prof, keys = Object.keys(RX), found = keys.filter(k=> P.labFound.indexOf(k) >= 0), L = P.lab;
  return `<p class="ca-lead sm">${found.length} of ${keys.length} reactions discovered on the Beaker bench.</p>
  <div class="ca-stats"><div><b>${L.flames.length}/${FL.length}</b><span>flame colours</span></div><div><b>${L.gases.length}/3</b><span>gases identified</span></div><div><b>${L.titr}</b><span>titrations solved</span></div><div><b>${L.cell ? fmt2(L.cell) + ' V' : '–'}</b><span>best cell</span></div><div><b>${L.mystery}</b><span>mystery flasks</span></div></div>
  <h4 class="ca-h4">Badges</h4><div class="ca-badges">${Object.keys(BADGES).map(k=> `<span class="ca-badge ${P.badges.indexOf(k) >= 0 ? 'on' : ''}">${ico('trophy', 15)}${esc(BADGES[k])}</span>`).join('')}</div>
  <h4 class="ca-h4">Reactions</h4><ul class="ca-notes">${found.length ? found.map(k=> `<li><b>${esc(RX[k].title)}</b><span>${esc(RX[k].eq)}</span></li>`).join('') : '<li class="mut">Nothing yet. Mix two chemicals on the Beaker bench.</li>'}</ul>
  <div class="ca-actions"><button class="ca-pill" data-a="hint">Hint for an undiscovered reaction</button><button class="ca-pill ghost" data-a="sharelab">Share my lab record</button></div><div id="hintBox" class="ca-log" aria-live="polite" hidden></div>`;
};
function labHint(){
  const P = S.prof, miss = Object.keys(RX).filter(k=> P.labFound.indexOf(k) < 0), b = $('#hintBox'); b.hidden = false;
  if(!miss.length){ b.textContent = 'You have found every reaction. Impressive.'; return; }
  const k = pick(miss), parts = k.split('+'), g = pick(parts), o = RG[g];
  b.innerHTML = `<b>Hint:</b> one undiscovered reaction involves <b>${esc(o.n)}</b> (${o.f}). Try pairing it with something that could plausibly react: an acid, a base, a metal or a salt.`;
}

// ----------------------------------------------------------------------------------- styles (light and dark, one palette from the site's brand colours)
const CSS = `
.ca,.ca-ov{--ca-bg:#F4F1FF;--ca-bg2:#EBE6FF;--ca-surf:#FFFFFF;--ca-surf2:#F8F6FF;--ca-line:#DDD7F3;--ca-ink:#1D1B3A;--ca-mute:#5E6478;--ca-brand:#5B3FD8;--ca-brand2:#4527B8;--ca-on:#FFFFFF;--ca-amber:#FFB52E;--ca-amber-ink:#7A4D00;--ca-amber-bg:#FFF3D6;--ca-ok:#16784F;--ca-ok-bg:#E2F5EC;--ca-bad:#B8323F;--ca-bad-bg:#FCE8EA;--ca-p1:#8C79F2;--ca-p2:#3A2A99;--ca-m1:#7FD1C3;--ca-m2:#1F7D72;--ca-glass:rgba(29,27,58,.55);--ca-glass2:rgba(29,27,58,.18);--ca-glassfill:rgba(255,255,255,.6);--ca-hi:rgba(255,255,255,.75);--ca-sh:rgba(29,27,58,.10);--ca-hex:%235B3FD8;--ca-display:'Bricolage Grotesque','DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif;--ca-body:'DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif;--ca-mono:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace}
.ca[data-th=dark],.ca-ov[data-th=dark]{--ca-bg:#12112A;--ca-bg2:#181740;--ca-surf:#1B1A36;--ca-surf2:#22214A;--ca-line:#3A3666;--ca-ink:#ECEAFF;--ca-mute:#A9B0C4;--ca-brand:#9B87FF;--ca-brand2:#6F58E0;--ca-on:#12112A;--ca-amber:#FFC15A;--ca-amber-ink:#FFD58A;--ca-amber-bg:#3A2E14;--ca-ok:#3DD6A0;--ca-ok-bg:#12332A;--ca-bad:#FF7A85;--ca-bad-bg:#3A1A22;--ca-p1:#6A55E0;--ca-p2:#241F5C;--ca-m1:#2E9C8E;--ca-m2:#145A52;--ca-glass:rgba(236,234,255,.75);--ca-glass2:rgba(236,234,255,.25);--ca-glassfill:rgba(255,255,255,.05);--ca-hi:rgba(255,255,255,.13);--ca-sh:rgba(0,0,0,.4);--ca-hex:%239B87FF}
.ca-ov{position:fixed;inset:0;z-index:9999;overflow:auto;background:var(--ca-bg)}
.ca{position:relative;color:var(--ca-ink);font:400 15px/1.5 var(--ca-body);background-color:var(--ca-bg);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='55' height='96' viewBox='0 0 27.71 48'%3E%3Cpath d='M13.86 0L27.71 8V24L13.86 32L0 24V8ZM13.86 32V48' fill='none' stroke='%235B3FD8' stroke-opacity='.07'/%3E%3C/svg%3E");min-height:100%;overflow:hidden}
.ca[data-th=dark]{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='55' height='96' viewBox='0 0 27.71 48'%3E%3Cpath d='M13.86 0L27.71 8V24L13.86 32L0 24V8ZM13.86 32V48' fill='none' stroke='%239B87FF' stroke-opacity='.08'/%3E%3C/svg%3E")}
.ca *{box-sizing:border-box}.ca button{font-family:inherit}
.ca:not(.x) .ca-in{position:relative;z-index:2;max-width:780px;margin:0 auto;padding:14px 16px 44px}
.ca-fx{position:absolute;inset:0;pointer-events:none;z-index:6}
.ca [hidden]{display:none!important}
.ca-ico{flex:none}
.ca-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}.ca-top-l,.ca-top-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ca-h2{margin:0 0 0 4px;font:700 22px/1.15 var(--ca-display);letter-spacing:-.01em}.ca-h3{margin:20px 0 8px;font:700 16px/1.2 var(--ca-display)}.ca-h3.big{font-size:26px;margin-top:4px}.ca-h4{margin:14px 0 6px;font:700 14px/1.2 var(--ca-display);color:var(--ca-mute)}
.ca-xp{display:flex;flex-direction:column;gap:4px;min-width:96px;font-size:12px;color:var(--ca-mute)}.ca-xp b{color:var(--ca-ink);font-weight:700}.ca-xp i{display:block;height:5px;border-radius:9px;background:var(--ca-line);overflow:hidden}.ca-xp u{display:block;height:100%;background:var(--ca-brand);border-radius:9px;text-decoration:none;transition:width .6s}
.ca-pill{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 20px;border-radius:999px;border:1px solid var(--ca-line);background:var(--ca-surf);color:var(--ca-ink);font:600 14px/1 var(--ca-body);cursor:pointer;box-shadow:inset 0 1px 0 var(--ca-hi),0 2px 0 var(--ca-line),0 6px 14px var(--ca-sh);transition:transform .08s,box-shadow .08s,background .15s}
.ca-pill:hover{background:var(--ca-surf2)}.ca-pill:active{transform:translateY(2px);box-shadow:inset 0 1px 0 var(--ca-hi),0 0 0 var(--ca-line)}
.ca-pill.primary{background:var(--ca-brand);background:linear-gradient(180deg,color-mix(in srgb,var(--ca-brand) 86%,#fff),var(--ca-brand));color:var(--ca-on);border-color:var(--ca-brand2);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 var(--ca-brand2),0 8px 16px var(--ca-sh)}.ca-pill.primary:active{box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 0 0 var(--ca-brand2)}
.ca-pill.ghost{background:transparent;box-shadow:none;border-color:transparent;color:var(--ca-mute)}.ca-pill.ghost:hover{background:var(--ca-surf);color:var(--ca-ink)}.ca-pill.sm{padding:8px 14px;font-size:13px}.ca-pill.lgbtn{padding:15px 30px;font-size:16px;margin-top:20px}.ca-pill[aria-pressed=true]{color:var(--ca-brand)}.ca-pill:disabled{opacity:.5;cursor:default}
.ca-chips{display:flex;flex-wrap:wrap;gap:8px}.ca-chips.col{flex-direction:column;align-items:stretch}
.ca-chip{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:999px;border:1px solid var(--ca-line);background:var(--ca-surf);color:var(--ca-ink);font:600 13.5px/1.1 var(--ca-body);cursor:pointer;box-shadow:inset 0 1px 0 var(--ca-hi),0 2px 0 var(--ca-line);transition:transform .08s,box-shadow .08s}
.ca-chip:active{transform:translateY(2px);box-shadow:inset 0 1px 0 var(--ca-hi)}.ca-chip.on{background:var(--ca-brand);color:var(--ca-on);border-color:var(--ca-brand2);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 2px 0 var(--ca-brand2)}.ca-chip.done::after{content:'';width:7px;height:7px;border-radius:50%;background:var(--ca-ok)}.ca-chip.ok{background:var(--ca-ok-bg);border-color:var(--ca-ok);color:var(--ca-ok)}.ca-chip.bad{background:var(--ca-bad-bg);border-color:var(--ca-bad);color:var(--ca-bad)}.ca-chip .dot{width:11px;height:11px;border-radius:50%;display:inline-block}
.ca-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.ca-actions.center{justify-content:center}
.ca-stage{display:flex;align-items:center;gap:16px;margin:6px 0 14px}.ca-stage.sm .ca-nova-wrap,.ca-stage.sm .ca-mo-wrap{width:84px}
.ca-nova-wrap,.ca-mo-wrap{flex:none;width:96px}.ca-nova-wrap.lg{width:128px}.ca-nova-wrap.sm{width:56px}.ca-nova-wrap svg,.ca-mo-wrap svg{display:block;width:100%;height:auto;filter:drop-shadow(0 6px 10px var(--ca-sh))}
.ca-say{position:relative;flex:1;min-width:0;background:var(--ca-surf);border:1px solid var(--ca-line);border-radius:6px 20px 20px 20px;padding:12px 16px;box-shadow:0 8px 20px var(--ca-sh)}.ca-say p{margin:2px 0 0;min-height:1.5em;font-size:16px}.ca-say-name{font:700 12.5px/1 var(--ca-display);color:var(--ca-brand)}.ca-say.mo .ca-say-name{color:var(--ca-ok)}
@keyframes ca-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}@keyframes ca-talk{from{transform:scaleY(.45)}to{transform:scaleY(1.5)}}@keyframes ca-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.ca-eyes,.ca-mouth{transform-box:fill-box;transform-origin:center}.ca-eyes{animation:ca-blink 5.5s infinite}.talking .ca-mouth{animation:ca-talk .2s infinite alternate}.ca-nova-wrap.lg svg,.ca-mo-wrap svg{animation:ca-bob 5s ease-in-out infinite}
.ca-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:0;margin:6px 0 14px;border-top:1px solid var(--ca-line);border-bottom:1px solid var(--ca-line)}.ca-stats>div{padding:12px 6px;text-align:center}.ca-stats>div+div{border-left:1px solid var(--ca-line)}.ca-stats b{display:block;font:700 22px/1.1 var(--ca-display)}.ca-stats span{font-size:12.5px;color:var(--ca-mute)}
.ca-focus,.ca-daily,.ca-feature,.ca-row,.ca-list button{display:flex;align-items:center;gap:14px;width:100%;text-align:left;cursor:pointer;color:var(--ca-ink);font:inherit}
.ca-focus{padding:12px 16px;margin-bottom:10px;border:1px dashed var(--ca-brand);background:transparent;border-radius:14px}.ca-focus small,.ca-daily small,.ca-feature small,.ca-row small{display:block;color:var(--ca-mute);font-size:13px;line-height:1.35}.ca-focus b,.ca-daily b,.ca-feature b,.ca-row b{font:700 16px/1.25 var(--ca-display)}
.ca-daily{padding:14px 18px;margin-bottom:10px;border:1px solid var(--ca-amber);background:var(--ca-amber-bg);border-radius:14px}.ca-daily .ca-ico{color:var(--ca-amber-ink)}.ca-daily.done{opacity:.75}
.ca-feature{padding:22px 22px;margin-bottom:10px;border:0;border-radius:22px 22px 22px 6px;background:var(--ca-brand);color:var(--ca-on);box-shadow:0 4px 0 var(--ca-brand2),0 14px 28px var(--ca-sh)}.ca-feature small{color:inherit;opacity:.88;font-size:14px}.ca-feature b{font-size:21px}.ca-feature:active{transform:translateY(3px);box-shadow:0 1px 0 var(--ca-brand2)}
.ca-ficon{display:grid;place-items:center;width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.18);flex:none}.ca-ficon.sm{width:42px;height:42px;background:var(--ca-bg2);color:var(--ca-brand)}
.ca-trio{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-bottom:8px}.ca-row{padding:14px;border:1px solid var(--ca-line);background:var(--ca-surf);border-radius:16px;transition:border-color .15s,transform .1s}.ca-row:hover{border-color:var(--ca-brand)}.ca-row:active{transform:translateY(1px)}
.ca-list{margin-top:6px}.ca-list button{padding:13px 4px;border:0;border-top:1px solid var(--ca-line);background:transparent;color:var(--ca-mute);font-weight:600;border-radius:0}.ca-list button:hover{color:var(--ca-ink)}
.ca-hint{margin:12px 0 0;color:var(--ca-mute);font-size:13.5px}.ca-note{margin:10px 0;padding:10px 14px;border-radius:12px;background:var(--ca-ok-bg);color:var(--ca-ok);font-weight:600}
.ca-vs-row{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin-bottom:14px}.ca-side{display:flex;flex-direction:column;gap:5px}.ca-side.nova{flex-direction:row;align-items:center;gap:10px;justify-content:flex-end;text-align:right}.ca-side.nova>div:last-child{min-width:0;flex:1}.ca-side-name{font:700 14px/1.2 var(--ca-display)}.ca-side small{font-size:12px;color:var(--ca-mute)}
.ca-hpbar{height:10px;border-radius:99px;background:var(--ca-line);overflow:hidden}.ca-hpbar i{display:block;height:100%;background:var(--ca-ok);border-radius:99px;transition:width .6s cubic-bezier(.3,1,.4,1)}.ca-side.nova .ca-hpbar i{background:var(--ca-amber);margin-left:auto}
.ca-clock{--p:100;width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--ca-brand) calc(var(--p)*1%),var(--ca-line) 0);position:relative}.ca-clock::before{content:'';position:absolute;inset:6px;border-radius:50%;background:var(--ca-bg)}.ca-clock b{position:relative;font:700 20px/1 var(--ca-display)}.ca-clock.low{background:conic-gradient(var(--ca-bad) calc(var(--p)*1%),var(--ca-line) 0)}.ca-clock.low b{color:var(--ca-bad)}
.ca-qcard{background:var(--ca-surf);border:1px solid var(--ca-line);border-radius:18px;padding:18px;box-shadow:0 10px 24px var(--ca-sh)}.ca-qmeta{font-size:13px;color:var(--ca-mute);margin-bottom:6px}.ca-q{margin:4px 0 14px;font:600 19px/1.4 var(--ca-display)}
.ca-opts{display:grid;gap:9px}.ca-opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 14px;border:1px solid var(--ca-line);border-radius:12px;background:var(--ca-surf2);color:var(--ca-ink);font:500 15px/1.35 var(--ca-body);cursor:pointer;transition:border-color .15s,background .15s,transform .08s}
.ca-opt:hover:not(:disabled){border-color:var(--ca-brand)}.ca-opt:active:not(:disabled){transform:translateY(1px)}.ca-opt:disabled{cursor:default}.ca-opt kbd{display:grid;place-items:center;flex:none;width:28px;height:28px;border-radius:8px;background:var(--ca-bg2);font:700 13px var(--ca-body);color:var(--ca-brand)}
.ca-opt.ok{background:var(--ca-ok-bg);border-color:var(--ca-ok)}.ca-opt.ok kbd{background:var(--ca-ok);color:var(--ca-on)}.ca-opt.bad{background:var(--ca-bad-bg);border-color:var(--ca-bad)}.ca-opt.bad kbd{background:var(--ca-bad);color:var(--ca-on)}
.ca-npick{margin-left:auto;font:700 11px var(--ca-body);padding:3px 9px;border-radius:99px;background:var(--ca-amber);color:#3a2600;font-style:normal;flex:none}
.ca-opt.person{align-items:center}.ca-opt.person small{display:block;color:var(--ca-mute);font-weight:400}
.ca-nline{display:flex;flex-direction:column;gap:2px;margin:14px 2px 0;padding-left:12px;border-left:3px solid var(--ca-brand);min-height:52px}.ca-nline p{margin:0;font-size:15.5px}
.ca-after{margin-top:14px}.ca-exp{padding:12px 14px;border-radius:12px;background:var(--ca-surf);border:1px solid var(--ca-line);margin-bottom:12px;font-size:14.5px}
.ca-review{margin-top:18px;border:1px solid var(--ca-line);border-radius:14px;background:var(--ca-surf);padding:4px 16px}.ca-review summary{cursor:pointer;padding:12px 0;font:700 15px var(--ca-display)}.ca-review ul{margin:0 0 8px;padding:0;list-style:none}.ca-review li{padding:12px 0;border-top:1px solid var(--ca-line)}.ca-review li b{display:block;font-weight:600}.ca-review li span,.ca-review li small{display:block;font-size:13.5px;color:var(--ca-mute);margin-top:3px}.ca-review u{text-decoration:none;color:var(--ca-ok);font-weight:700}
.ca-teach-head{display:flex;align-items:center;gap:16px}.ca-meter{flex:1}.ca-meter-top{display:flex;justify-content:space-between;font:700 14px var(--ca-display);margin-bottom:6px}.ca-bar{height:12px;border-radius:99px;background:var(--ca-line);overflow:hidden}.ca-bar i{display:block;height:100%;background:var(--ca-ok);border-radius:99px;transition:width .7s cubic-bezier(.3,1,.4,1)}.ca-meter small{color:var(--ca-mute);font-size:12.5px}
.ca-chat{display:flex;flex-direction:column;gap:10px;margin:14px 0;max-height:46vh;min-height:150px;overflow:auto;padding:4px 2px}.ca-msg{max-width:88%;padding:10px 14px;border-radius:16px;border:1px solid var(--ca-line);background:var(--ca-surf)}.ca-msg p{margin:2px 0 0;white-space:pre-wrap}.ca-msg.mo{align-self:flex-start;border-top-left-radius:4px}.ca-msg.you{align-self:flex-end;background:var(--ca-brand);color:var(--ca-on);border-color:var(--ca-brand2);border-top-right-radius:4px}.ca-who{font:700 11.5px var(--ca-display);opacity:.75}
.ca-msg.typing i{display:inline-block;width:6px;height:6px;margin-right:3px;border-radius:50%;background:var(--ca-mute);animation:ca-dot 1s infinite}.ca-msg.typing i:nth-child(2){animation-delay:.15s}.ca-msg.typing i:nth-child(3){animation-delay:.3s}@keyframes ca-dot{0%,100%{opacity:.25}50%{opacity:1}}.ca-msg.typing small{color:var(--ca-mute)}
.ca-compose{display:flex;gap:10px;align-items:flex-end}.ca-compose textarea{flex:1;resize:vertical;min-height:56px;padding:12px 14px;border-radius:14px;border:1px solid var(--ca-line);background:var(--ca-surf);color:var(--ca-ink);font:inherit}.ca-compose-b{display:flex;flex-direction:column;gap:8px}
.ca-donecard{padding:16px;border-radius:16px;background:var(--ca-ok-bg);border:1px solid var(--ca-ok);color:var(--ca-ink)}.ca-donecard b{color:var(--ca-ok);font:700 17px var(--ca-display)}
.ca-kicker{margin:0;color:var(--ca-brand);font:700 14px var(--ca-display)}.ca-lead{font-size:16.5px;line-height:1.6;max-width:62ch}.ca-lead.sm{font-size:15px;color:var(--ca-mute);margin:0 0 12px}
.ca-scene{display:flex;gap:14px;align-items:flex-start;margin:12px 0 4px;padding:14px;border-radius:16px;background:var(--ca-surf);border:1px solid var(--ca-line)}.ca-scene p{margin:5px 0 0;line-height:1.55}.ca-faceW{flex:none;border-radius:50%;overflow:hidden;line-height:0}
.ca-why{margin:12px 0;padding:12px 14px;border-radius:12px;background:var(--ca-surf);border:1px solid var(--ca-line)}.ca-why.ok{background:var(--ca-ok-bg);border-color:var(--ca-ok)}
.ca-clues{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.ca-clue{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;background:var(--ca-ok-bg);color:var(--ca-ok);font-size:13px;font-weight:600}
.ca-tabs{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 10px;margin:0 -2px;scrollbar-width:thin}.ca-chip.tab{flex:none}.ca-tip{margin:0 0 12px;padding:8px 14px;border-radius:10px;background:var(--ca-bg2);color:var(--ca-mute);font-size:13.5px}
.ca-labst{min-height:300px}.ca-benchrow{display:flex;gap:16px;justify-content:center;align-items:center;flex-wrap:wrap}
.ca-beaker{position:relative;width:190px;height:230px;flex:none}.ca-beaker>svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.ca-glass{position:absolute;left:28px;right:28px;top:22px;bottom:14px;overflow:hidden;border-radius:0 0 22px 22px;background:var(--ca-glassfill)}
.ca-liq{--lq:#d9efff;position:absolute;left:0;right:0;bottom:0;height:0;background:var(--lq);opacity:.88;transition:height .6s,background 1.2s}.ca-liq::before{content:'';position:absolute;left:0;right:0;top:0;height:5px;background:rgba(255,255,255,.55)}
.ca-layer{--pc:#fff;position:absolute;left:0;right:0;bottom:0;height:0;background:var(--pc);opacity:.92;transition:height 1.3s}.ca-foam{position:absolute;left:0;right:0;bottom:0;height:0;transition:height .9s;background:repeating-radial-gradient(circle at 20% 80%,rgba(255,255,255,.95) 0 6px,rgba(255,255,255,.6) 7px 12px);opacity:.9}
.ca-heat{position:absolute;left:0;right:0;top:-8px;justify-content:space-around}.ca-heat i{width:3px;height:26px;border-radius:3px;background:var(--ca-bad);opacity:.5;animation:ca-heat 1.2s infinite ease-in-out}.ca-heat i:nth-child(2){animation-delay:.3s}.ca-heat i:nth-child(3){animation-delay:.6s}@keyframes ca-heat{0%,100%{transform:translateY(4px) scaleY(.7);opacity:.2}50%{transform:translateY(-6px) scaleY(1.1);opacity:.6}}
.ca-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}.ca-flash.go{animation:ca-fl .55s}@keyframes ca-fl{0%{opacity:.8}100%{opacity:0}}
.ca-bub{position:absolute;bottom:4px;border-radius:50%;border:1px solid rgba(255,255,255,.95);background:rgba(255,255,255,.35);animation:ca-rise var(--d) linear infinite}@keyframes ca-rise{0%{transform:translateY(0);opacity:.9}100%{transform:translateY(-190px);opacity:0}}
.ca-ppt{position:absolute;top:44%;width:5px;height:5px;border-radius:1px;background:var(--pc);animation:ca-fall var(--d) ease-in forwards}@keyframes ca-fall{to{transform:translateY(var(--fall))}}.ca-solidbit{position:absolute;border-radius:2px;z-index:2}
.ca-therm{display:flex;flex-direction:column;align-items:center;gap:6px}.ca-th-tube{width:18px;height:170px;border-radius:99px;background:var(--ca-surf);border:2px solid var(--ca-glass);display:flex;align-items:flex-end;padding:2px;overflow:hidden}.ca-th-tube i{display:block;width:100%;border-radius:99px;background:var(--ca-ok);transition:background .4s}.ca-th-tube i.hot{background:var(--ca-bad)}.ca-th-tube i.cold{background:#4A8CFF}.ca-therm b{font:700 14px var(--ca-display)}
.ca-shelf{display:flex;gap:8px;overflow-x:auto;padding:14px 2px 6px}.ca-rg{flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:104px;padding:9px 12px;border-radius:14px;border:1px solid var(--ca-line);background:var(--ca-surf);color:var(--ca-ink);font:700 14px var(--ca-body);cursor:pointer;box-shadow:inset 0 1px 0 var(--ca-hi),0 2px 0 var(--ca-line);position:relative;padding-left:28px}.ca-rg small{font:400 11px/1.2 var(--ca-body);color:var(--ca-mute)}.ca-rg i{position:absolute;left:10px;top:12px;width:12px;height:12px;border-radius:50%;background:var(--c);border:1px solid rgba(0,0,0,.2)}.ca-rg:active{transform:translateY(2px);box-shadow:none}
.ca-log{margin-top:12px;padding:14px 16px;border-radius:14px;background:var(--ca-surf);border:1px solid var(--ca-line);font-size:14.5px;line-height:1.55}.ca-log b{font-weight:700}.ca-mt{margin-top:8px}.ca-mt.amb{padding:8px 10px;border-radius:10px;background:var(--ca-amber-bg);color:var(--ca-amber-ink)}.mut{color:var(--ca-mute)}.ca-eq{margin:8px 0;padding:8px 12px;border-radius:10px;background:var(--ca-bg2);font:500 14px/1.5 var(--ca-mono);overflow-x:auto}
.ca-tag{display:inline-block;padding:2px 10px;border-radius:99px;background:var(--ca-amber);color:#3a2600;font:700 11.5px var(--ca-body);vertical-align:middle}.ca-sidefact{display:flex;gap:8px;align-items:center;margin-top:8px;color:var(--ca-mute)}.gasres{padding:8px 10px;border-radius:10px;background:var(--ca-bg2)}.gasres.ok{background:var(--ca-ok-bg)}
.ca-gasbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;margin-top:12px;color:var(--ca-mute);font-size:14px}
.ca-flamewrap{display:flex;gap:16px;align-items:center;flex-wrap:wrap;justify-content:center}.ca-flamesvg{width:190px;height:auto;flex:none;border-radius:16px;background:#14132B}.ca-flamesvg .fo{fill:var(--fl,#5b7bff);transition:fill .5s;transform-box:view-box;transform-origin:100px 165px;animation:ca-flick 1.4s ease-in-out infinite alternate}.ca-flamesvg .fi{fill:#fff;opacity:.5;transform-box:view-box;transform-origin:100px 165px;animation:ca-flick 1s ease-in-out infinite alternate-reverse}@keyframes ca-flick{from{transform:scale(1,1) skewX(0)}to{transform:scale(.96,1.05) skewX(2deg)}}
.ca-flameinfo{flex:1;min-width:220px;padding:14px 16px;border-radius:14px;border:1px solid var(--ca-line);background:var(--ca-surf)}.ca-flameinfo p{margin:6px 0}.ca-flameinfo small{color:var(--ca-mute)}#flChips{margin-top:14px}
.ca-phcard{margin-top:14px;padding:16px;border-radius:18px;background:var(--ca-surf);border:1px solid var(--ca-line)}.ca-phtop{display:flex;justify-content:space-between;align-items:flex-end}.ca-phtop small{display:block;color:var(--ca-mute)}.ca-phtop b{font:700 44px/1 var(--ca-display)}.ca-phtag{padding:5px 14px;border-radius:99px;background:var(--ca-bg2);font-weight:700;font-size:13px}
.ca-scale{position:relative;height:14px;margin:14px 0 4px;border-radius:99px;background:linear-gradient(90deg,#e53935,#fb8c00 28%,#fdd835 36%,#43a047 50%,#1e88e5 64%,#5e35b1 86%,#4a2a8f)}.ca-scale i{position:absolute;top:-5px;width:6px;height:24px;margin-left:-3px;border-radius:4px;background:var(--ca-ink);border:2px solid var(--ca-surf);transition:left .5s cubic-bezier(.3,1.3,.5,1)}.ca-scale-l{display:flex;justify-content:space-between;font-size:11.5px;color:var(--ca-mute)}
.ca-tubes{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:16px 0 4px}.ca-tube{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;font-size:11.5px;line-height:1.2;color:var(--ca-mute)}.ca-tube i{display:block;width:30px;height:72px;border-radius:5px 5px 16px 16px;border:2px solid var(--ca-glass);transition:background .6s}
.ca-titr{display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;justify-content:center}.ca-burette{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:13px}.ca-bu-tube{width:26px;height:180px;border:2px solid var(--ca-glass);border-radius:4px 4px 10px 10px;display:flex;align-items:flex-end;overflow:hidden;background:var(--ca-glassfill)}.ca-bu-tube i{display:block;width:100%;background:#7DB8FF;transition:height .3s}
.ca-flaskwrap{display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--ca-mute);font-size:13px}.ca-flask{position:relative;width:96px;height:112px;border:3px solid var(--ca-glass);border-top:0;border-radius:6px 6px 28px 28px;overflow:hidden;background:var(--ca-glassfill);border-radius:8px 8px 44px 44px}.ca-flask::before{content:''}.ca-fl-liq{position:absolute;left:0;right:0;bottom:0;height:46%;background:rgba(200,225,255,.35);transition:background .4s}.ca-flaskwrap.big .ca-flask{width:120px;height:140px}.ca-q-mark{position:absolute;inset:0;display:grid;place-items:center;font:700 34px var(--ca-display);color:var(--ca-ink);opacity:.5;padding-top:30px}
.ca-curve{width:min(100%,260px);height:auto}.ca-ans{margin-top:14px}.ca-ans label{display:block;font-weight:600;font-size:14px;margin-bottom:6px}.ca-ans>div{display:flex;gap:8px;flex-wrap:wrap}.ca-ans input{flex:1;min-width:140px;padding:11px 14px;border-radius:12px;border:1px solid var(--ca-line);background:var(--ca-surf);color:var(--ca-ink);font:inherit}
.ca-cellpick{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ca-cellsvg{width:100%;max-width:420px;display:block;margin:12px auto 0}.ca-elec{stroke-dasharray:1 16;animation:ca-flow 1s linear infinite}.ca-cellsvg.rev .ca-elec{animation-direction:reverse}.ca-cellsvg:not(.fwd):not(.rev) .ca-elec{display:none}@keyframes ca-flow{to{stroke-dashoffset:-34}}
.ca-mystrow{display:flex;gap:18px;align-items:center;flex-wrap:wrap}.ca-obs{margin:14px 0 0;padding:12px 16px 12px 32px;border-radius:14px;background:var(--ca-surf);border:1px solid var(--ca-line)}.ca-obs li{margin:4px 0}
.ca-denrow{display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start}.ca-tower{position:relative;width:200px;height:290px;flex:none;border:3px solid var(--ca-glass);border-top:0;border-radius:0 0 18px 18px;overflow:hidden;background:var(--ca-glassfill)}.ca-tower-empty{position:absolute;inset:0;display:grid;place-items:center;color:var(--ca-mute);font-size:13px}.ca-tl{position:absolute;left:0;right:0;display:flex;align-items:center;justify-content:center;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.55);font:700 11.5px var(--ca-body);transition:bottom .8s cubic-bezier(.3,1,.4,1);border-top:1px solid rgba(255,255,255,.4)}.ca-tl.new{animation:ca-in .6s}@keyframes ca-in{from{transform:translateY(-120%);opacity:.2}}
.ca-obj{position:absolute;left:50%;transform:translateX(-50%);padding:3px 10px;border-radius:99px;background:var(--ca-ink);color:var(--ca-surf);font:700 11px var(--ca-body);transition:bottom 1.2s cubic-bezier(.4,0,.6,1);white-space:nowrap}.ca-denside{flex:1;min-width:170px}
.ca-notes{list-style:none;margin:0;padding:0;border-top:1px solid var(--ca-line)}.ca-notes li{display:flex;flex-direction:column;gap:2px;padding:10px 2px;border-bottom:1px solid var(--ca-line)}.ca-notes span{font:500 13px var(--ca-mono);color:var(--ca-mute)}
.ca-badges{display:flex;flex-wrap:wrap;gap:8px}.ca-badge{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:99px;border:1px dashed var(--ca-line);color:var(--ca-mute);font-size:12.5px;opacity:.7}.ca-badge.on{border:1px solid var(--ca-amber);background:var(--ca-amber-bg);color:var(--ca-amber-ink);opacity:1}
.ca-pop{position:absolute;z-index:8;font:700 18px var(--ca-display);pointer-events:none;animation:ca-pop 1.1s ease-out forwards}@keyframes ca-pop{to{transform:translateY(-34px);opacity:0}}
.ca-toast{position:absolute;left:50%;top:14px;transform:translateX(-50%);z-index:9;padding:9px 18px;border-radius:99px;background:var(--ca-ink);color:var(--ca-surf);font-weight:600;font-size:13.5px;box-shadow:0 8px 20px var(--ca-sh);animation:ca-toast 2.8s forwards}@keyframes ca-toast{0%{opacity:0;transform:translate(-50%,-10px)}10%,85%{opacity:1;transform:translate(-50%,0)}100%{opacity:0}}
.ca-shake{animation:ca-shk .35s}@keyframes ca-shk{20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
.ca button:focus-visible,.ca input:focus-visible,.ca textarea:focus-visible,.ca summary:focus-visible{outline:3px solid var(--ca-brand);outline-offset:2px}
@media (max-width:560px){.ca-h2{font-size:19px}.ca-nova-wrap.lg{width:104px}.ca-vs-row{grid-template-columns:1fr 1fr}.ca-clock{grid-column:1/-1;justify-self:center;order:3}.ca-cellpick{grid-template-columns:1fr}.ca-q{font-size:17px}.ca-benchrow{gap:6px}}
@media (prefers-reduced-motion:reduce){.ca *{animation:none!important;transition:none!important}}
`;
function ensureCss(){ if(document.getElementById('ca-css')) return; const s = document.createElement('style'); s.id = 'ca-css'; s.textContent = CSS; document.head.appendChild(s); }

// ----------------------------------------------------------------------------------- sharing
function shareCard(o){
  const W = 1080, H = 1080, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); if(!g) return;
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#1D1B3A'); bg.addColorStop(1, '#2A2760'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(155,135,255,.12)'; g.lineWidth = 2; for(let y=0;y<H+60;y+=96) for(let x=0;x<W+60;x+=110){ const ox = (Math.round(y / 96) % 2) * 55; g.beginPath(); for(let k=0;k<6;k++){ const a = Math.PI / 3 * k + Math.PI / 6; g.lineTo(x + ox + 38 * Math.cos(a), y + 38 * Math.sin(a)); } g.closePath(); g.stroke(); }
  g.fillStyle = '#FFB52E'; g.font = '700 40px "DM Sans",system-ui,sans-serif'; g.fillText('Chem Arena', 80, 120);
  g.fillStyle = '#fff'; g.font = '800 120px "Bricolage Grotesque","DM Sans",system-ui,sans-serif'; wrap(g, o.big || '', 80, 330, W - 160, 130);
  g.fillStyle = '#ECEAFF'; g.font = '600 52px "DM Sans",system-ui,sans-serif'; const y2 = wrap(g, o.title || '', 80, 560, W - 160, 64);
  g.fillStyle = '#A9B0C4'; g.font = '400 38px "DM Sans",system-ui,sans-serif'; (o.lines || []).forEach((l, i)=> g.fillText(l, 80, y2 + 70 + i * 54));
  g.fillStyle = '#ECEAFF'; g.font = '600 34px "DM Sans",system-ui,sans-serif'; g.fillText('Think you can do better? ' + location.host, 80, H - 120);
  ['#CE1126','#FCD116','#006B3F'].forEach((col, i)=>{ g.fillStyle = col; g.fillRect(0, H - 36 + i * 12, W, 12); });
  c.toBlob(async blob=>{
    if(!blob) return; const file = new File([blob], 'chem-arena.png', { type:'image/png' });
    try{ if(navigator.canShare && navigator.canShare({ files:[file] })){ await navigator.share({ files:[file], title:'Chem Arena', text:(o.title || '') + ' ' + location.origin }); return; } }catch(e){ if(e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'chem-arena.png'; document.body.appendChild(a); a.click(); a.remove(); toast('Image saved. Share it anywhere.');
  }, 'image/png');
}
function wrap(g, text, x, y, mw, lh){ const words = String(text).split(' '); let line = ''; words.forEach(w=>{ const t = line ? line + ' ' + w : w; if(g.measureText(t).width > mw && line){ g.fillText(line, x, y); line = w; y += lh; } else line = t; }); g.fillText(line, x, y); return y; }
async function invite(){
  const url = (S && S.opts.siteUrl) || (location.origin + '/'), text = 'I am training against NOVA-9 in Chem Arena. Can you beat it?';
  try{ if(navigator.share){ await navigator.share({ title:'Chem Arena', text, url }); return; } }catch(e){ if(e && e.name === 'AbortError') return; }
  try{ await navigator.clipboard.writeText(text + ' ' + url); toast('Invite copied to your clipboard.'); }catch(e){ toast(url); }
}

// ----------------------------------------------------------------------------------- events
const sel = (a,v)=> $('[data-a="' + a + '"][data-v="' + v + '"]');
function onClick(e){
  const b = e.target.closest ? e.target.closest('[data-a]') : null; if(!b || !S || !S.root.contains(b)) return;
  const a = b.dataset.a, v = b.dataset.v; SND.init();
  switch(a){
    case 'close': return api.unmount(true);
    case 'back': return go('hub');
    case 'vox': {
      if(!VOX.ok()) return toast('This browser has no speech voices, so NOVA stays silent.');
      VOX.on = !VOX.on; setPref(); if(VOX.on){ SND.init(); VOX.load(); const n = pick(['Voice online. Try to keep up.','Speaking now. Do not blink.','Audio engaged, {name}.']); VOX.speak('nova', spin(n, brainCtx()), 'smug'); } else VOX.stop();
      $$('[data-a="vox"]').forEach(x=>{ x.setAttribute('aria-pressed', VOX.on); x.querySelector('span').textContent = 'Voice ' + (VOX.on ? 'on' : 'off'); }); return;
    }
    case 'snd': SND.on = !SND.on; setPref(); if(SND.on){ SND.init(); SND.play('ok'); } $$('[data-a="snd"]').forEach(x=> x.setAttribute('aria-pressed', SND.on)); return;
    case 'duel': return go('setup');
    case 'focus': S.cfg.focus = v; return go('setup');
    case 'level': S.cfg.level = v; return go('setup');
    case 'start': return startDuel(false);
    case 'daily': return startDuel(true);
    case 'trainweak': S.cfg.focus = v; return startDuel(false);
    case 'rematch': return startDuel(v === 'daily');
    case 'ans': return dAnswer(+v);
    case 'next': return dNext();
    case 'sharewin': return shareCard({ big:S.last && S.last.res === 'win' ? 'I beat NOVA-9' : 'I faced NOVA-9', title:S.last ? `${S.last.correct} of ${S.last.n} correct in a Rival Duel` : 'A chemistry duel', lines:['Eight rounds of chemistry against a robot rival.', S.last ? `+${S.last.xp} XP earned` : ''] });
    case 'teach': return go('teachpick');
    case 'teachgo': return startTeach(v);
    case 'tsend': return tSend();
    case 'mic': {
      const ta = $('#tIn'), mb = $('#micB'); if(rec){ stopMic(); return; } const base = ta.value ? ta.value + ' ' : '';
      if(startMic(t=>{ ta.value = base + t; }, ()=>{ if(mb) mb.classList.remove('primary'); })) mb.classList.add('primary'); else toast('Voice input is not available in this browser.'); return;
    }
    case 'cases': return go('cases');
    case 'casenext': S.kase.i++; S.kase.locked = false; return caseScene();
    case 'caseopt': return caseAnswer(+v, b);
    case 'accuse': return caseAccuseOne(+v, b);
    case 'sharecase': return shareCard({ big:'Case solved', title:'I cracked “The Midnight Spill”', lines:['Solved with real chemistry clues.','Copper, sulfate and a zinc displacement.'] });
    case 'lab': return go('lab', 'bench');
    case 'labtab': return labTab(v);
    case 'rg': return labAdd(v);
    case 'labreset': return labReset();
    case 'gas': return gasTest(v);
    case 'flame': return flameShow(v);
    case 'flamequiz': return flameQuiz();
    case 'flameguess': return flameGuess(v, b);
    case 'phsub': S.lab.ph = { i:+v, d:0 }; return phDraw();
    case 'phdil': if(S.lab.ph.d < 4){ S.lab.ph.d++; SND.play('click'); } return phDraw();
    case 'phreset': S.lab.ph.d = 0; return phDraw();
    case 'tit': return titAdd(parseFloat(v));
    case 'titreset': labTab('titr'); return;
    case 'titcheck': return titCheck();
    case 'cellL': S.lab.cell.L = v; return cellDraw();
    case 'cellR': S.lab.cell.R = v; return cellDraw();
    case 'mtest': return mystTest(v);
    case 'mguess': return mystGuess(v, b);
    case 'mnew': labTab('myst'); return;
    case 'tpour': return towerPour(v);
    case 'tdrop': return towerDrop(v);
    case 'tclear': S.lab.tw = []; towerDraw(); $('#tMsg').textContent = 'Tower cleared.'; return;
    case 'hint': return labHint();
    case 'sharelab': return shareCard({ big:'My lab record', title:`${S.prof.labFound.length} reactions discovered`, lines:[`${S.prof.lab.flames.length} flame colours, ${S.prof.lab.gases.length} gases identified`, `${S.prof.badges.length} badges earned`] });
    case 'live': if(S.opts.onLive) S.opts.onLive(); return;
    case 'invite': return invite();
  }
}
function onKey(e){
  if(!S) return; const t = e.target;
  if(t && t.id === 'tIn' && e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); tSend(); }
  if(t && t.id === 'titAns' && e.key === 'Enter'){ e.preventDefault(); titCheck(); }
}
function onDocKey(e){
  if(!S || S.screen !== 'duel' || !S.D) return; const tag = (e.target && e.target.tagName) || ''; if(/INPUT|TEXTAREA/.test(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase(), i = 'abcd'.indexOf(k) >= 0 ? 'abcd'.indexOf(k) : '1234'.indexOf(k);
  if(i >= 0 && !S.D.locked && S.D.qs[S.D.i] && i < S.D.qs[S.D.i].o.length && !$('#after').hidden === false){ e.preventDefault(); dAnswer(i); }
  else if((k === 'enter' || k === ' ' || k === 'n') && !$('#after').hidden && S.D.locked){ if(e.target.closest && e.target.closest('button') && k !== 'n') return; e.preventDefault(); dNext(); }
}

// ----------------------------------------------------------------------------------- public API
const api = {
  mount(el, opts){
    api.unmount(); ensureCss(); VOX.load();
    const root = document.createElement('div'); root.className = 'ca'; root.innerHTML = '<canvas class="ca-fx" aria-hidden="true"></canvas><div class="ca-in"></div>';
    el.innerHTML = ''; el.appendChild(root);
    S = { el, root, inn:root.querySelector('.ca-in'), opts:opts || {}, timers:[], cfg:{ focus:'', level:'auto' }, prof:loadProf(opts || {}), screen:'hub', labTab:'bench' };
    SND.on = !!S.prof.pref.sfx; VOX.on = !!S.prof.pref.vox && VOX.ok();
    S.fx = makeFx(root.querySelector('.ca-fx'), root); applyTheme();
    try{ S.mo = new MutationObserver(applyTheme); S.mo.observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] }); }catch(e){}
    try{ S.mq = matchMedia('(prefers-color-scheme: dark)'); S.mqf = applyTheme; S.mq.addEventListener ? S.mq.addEventListener('change', S.mqf) : S.mq.addListener(S.mqf); }catch(e){}
    root.addEventListener('click', onClick); root.addEventListener('keydown', onKey); document.addEventListener('keydown', onDocKey);
    go('hub'); return api;
  },
  unmount(fromClose){
    if(!S) return; const o = S.opts, el = S.el, ov = S.overlay, closing = S; clearTimers(); if(S.fx) S.fx.stop();
    try{ S.mo && S.mo.disconnect(); S.mq && (S.mq.removeEventListener ? S.mq.removeEventListener('change', S.mqf) : S.mq.removeListener(S.mqf)); }catch(e){}
    document.removeEventListener('keydown', onDocKey); S = null;
    if(ov){ ov.remove(); document.documentElement.style.overflow = ''; } else if(el && closing.root.parentNode === el) el.innerHTML = '';
    if(fromClose && o.onClose) try{ o.onClose(); }catch(e){}
  },
  openOverlay(opts){
    opts = Object.assign({}, opts || {}, { ctx:'site' });
    const ov = document.createElement('div'); ov.className = 'ca-ov'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-label','Chem Arena'); document.body.appendChild(ov); document.documentElement.style.overflow = 'hidden';
    api.mount(ov, opts); S.overlay = ov; applyTheme();
    const esc1 = ev=>{ if(ev.key === 'Escape'){ document.removeEventListener('keydown', esc1); if(S && S.overlay === ov) api.unmount(true); } }; document.addEventListener('keydown', esc1);
    return api;
  },
  isOpen:()=> !!S,
  nova:m=> novaSvg(m || 'smug'),
  mo:m=> moSvg(m || 'confused')
};
window.ChemArena = api;
})();
