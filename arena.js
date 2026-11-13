/* ===========================================================================================
   CHEM ARENA: shared game module for the public website and the portal (students, coordinators, Ambassador).
   Rival Duel vs NOVA-9, Teach Mo the Mole, Case Files, Virtual Lab. Works without sign-in; AI voices are optional extras.
   Usage:  ChemArena.mount(element, { ctx:'site'|'portal', role, name, userKey, getSb, ready, onLive, onClose })
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
const dayNum = ()=>{ const d = new Date(); return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate(); };
const reduceMotion = ()=> { try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };

// ----------------------------------------------------------------------------------- topics and questions
const TOPICS = [['quant','Quantitative Chemistry'],['bonding','Structure and Bonding'],['thermo','Thermodynamics'],['equil','Equilibrium'],['acidbase','Acids, Bases and Solubility'],['kinetics','Kinetics'],['electro','Electrochemistry'],['organic','Organic Reactivity'],['stereo','Stereochemistry and Aromaticity'],['spectro','Spectroscopy and Coordination']];
const MO_LABEL = { quant:'the mole and stoichiometry', bonding:'chemical bonding', thermo:'enthalpy and thermodynamics', equil:'chemical equilibrium', acidbase:'acids, bases and pH', kinetics:'reaction rates', electro:'electrochemistry', organic:'organic reactivity', stereo:'stereochemistry and aromaticity', spectro:'spectroscopy' };
const QB = [];
const Q = (t,q,o,a,e)=> QB.push({t,q,o,a,e});
Q('quant','How many moles are in 36 g of water? (Mr of H2O = 18)',['0.5 mol','2 mol','18 mol','648 mol'],1,'n = m ÷ M = 36 ÷ 18 = 2 mol.');
Q('quant','In 2H2 + O2 → 2H2O, how many moles of O2 react completely with 6 mol of H2?',['1 mol','3 mol','6 mol','12 mol'],1,'H2 : O2 is 2 : 1, so 6 mol H2 needs 3 mol O2.');
Q('quant','One mole of any substance contains how many particles?',['6.02 × 10²³','3.0 × 10⁸','1.6 × 10⁻¹⁹','9.8'],0,'That is Avogadro’s number, 6.022 × 10²³ per mole.');
Q('quant','What is the molar mass of CaCO3? (Ca = 40, C = 12, O = 16)',['68 g/mol','84 g/mol','100 g/mol','116 g/mol'],2,'40 + 12 + (3 × 16) = 100 g/mol.');
Q('bonding','Which compound is held together by ionic bonding?',['CO2','NaCl','CH4','H2O'],1,'In NaCl a metal gives an electron to a non-metal, forming Na⁺ and Cl⁻ ions.');
Q('bonding','What is the shape of a methane molecule, CH4?',['Linear','Trigonal planar','Tetrahedral','Octahedral'],2,'Four bonding pairs and no lone pairs repel into a tetrahedron (109.5°).');
Q('bonding','Which of these molecules is polar?',['CO2','CCl4','H2O','O2'],2,'H2O is bent, so its bond dipoles do not cancel. The others are symmetrical or non-polar.');
Q('bonding','Why does water boil at a much higher temperature than H2S?',['Water molecules are heavier','Water forms hydrogen bonds','Water has ionic bonds','Water has a double bond'],1,'Hydrogen bonds between water molecules take extra energy to break.');
Q('thermo','A reaction that releases heat to its surroundings is called',['endothermic','exothermic','isothermal','adiabatic'],1,'Exothermic reactions have a negative ΔH.');
Q('thermo','Hess’s law says the enthalpy change of a reaction',['depends on the route taken','is the same by any route','is always negative','needs a catalyst'],1,'Enthalpy is a state function, so only the start and end matter.');
Q('thermo','If ΔH < 0 and ΔS > 0, the reaction is',['never spontaneous','spontaneous at all temperatures','spontaneous only at low T','spontaneous only at high T'],1,'ΔG = ΔH − TΔS is negative at every temperature.');
Q('thermo','The standard enthalpy of formation of an element in its standard state is',['100 kJ/mol','1 kJ/mol','zero','always negative'],2,'By definition, forming an element from itself changes nothing.');
Q('equil','N2 + 3H2 ⇌ 2NH3 is exothermic. Raising the temperature will',['shift it to the right','shift it to the left','not shift it','lower the pressure'],1,'Heat favours the endothermic (reverse) direction, so the position shifts left.');
Q('equil','A catalyst added to a system at equilibrium',['changes the value of K','shifts it towards products','speeds up both directions equally','shifts it towards reactants'],2,'It reaches equilibrium faster but does not change K or the position.');
Q('equil','The equilibrium constant K for a reaction changes only with',['concentration','pressure','temperature','volume'],2,'Only a change in temperature changes K.');
Q('equil','At equilibrium the forward and reverse reaction rates are',['both zero','equal','forward is larger','reverse is larger'],1,'Equilibrium is dynamic: both reactions still happen at the same rate.');
Q('acidbase','What is the pH of 0.01 mol/L HCl (a strong acid)?',['1','2','7','12'],1,'pH = −log(0.01) = 2.');
Q('acidbase','A buffer solution is made from',['a strong acid and a strong base','a weak acid and its conjugate base','water and a salt','two strong acids'],1,'The pair neutralises small additions of acid or base.');
Q('acidbase','What is the conjugate base of NH4⁺?',['NH2⁻','NH3','NH4OH','H3O⁺'],1,'Remove one H⁺ from NH4⁺ and you get NH3.');
Q('acidbase','At 25 °C, [OH⁻] = 1 × 10⁻³ mol/L. What is the pH?',['3','11','10','4'],1,'pOH = 3, so pH = 14 − 3 = 11.');
Q('kinetics','A catalyst speeds up a reaction by',['raising the temperature','lowering the activation energy','changing ΔH','increasing concentrations'],1,'It offers a new route with a lower Ea and is not used up.');
Q('kinetics','A first-order reaction has a half-life that is',['doubling each time','constant','halving each time','dependent on the starting concentration'],1,'For first order, t½ = ln2 ÷ k, which never changes.');
Q('kinetics','Doubling [A] doubles the rate. The order in A is',['0','1','2','3'],1,'Rate ∝ [A]¹, so the reaction is first order in A.');
Q('kinetics','Heating speeds up reactions mainly because',['collisions become gentler','more molecules have energy ≥ Ea','Ea decreases','ΔH decreases'],1,'A bigger share of molecules can clear the energy barrier.');
Q('electro','Oxidation always happens at the',['cathode','anode','salt bridge','electrolyte'],1,'Remember: An Ox, Red Cat. Anode = oxidation.');
Q('electro','In a galvanic cell, electrons flow through the wire',['from cathode to anode','from anode to cathode','through the salt bridge','through the solution'],1,'They leave the anode (oxidation) and travel to the cathode (reduction).');
Q('electro','The standard electrode potential of the standard hydrogen electrode is',['+1.00 V','0.00 V','−1.00 V','+0.34 V'],1,'It is the reference, defined as exactly 0.00 V.');
Q('electro','How many moles of electrons deposit 1 mol of copper from Cu²⁺?',['1','2','3','0.5'],1,'Cu²⁺ + 2e⁻ → Cu.');
Q('organic','A nucleophile is a species that',['accepts an electron pair','donates an electron pair','is always positively charged','is a free radical'],1,'Nucleophiles are electron-pair donors that attack electron-poor centres.');
Q('organic','Which functional group does ethanol contain?',['Carbonyl','Hydroxyl','Carboxyl','Amine'],1,'Ethanol is CH3CH2OH: an –OH, or hydroxyl, group.');
Q('organic','An SN2 reaction at a chiral carbon gives',['retention of configuration','inversion of configuration','a racemic mixture only','no change in stereochemistry'],1,'The nucleophile attacks from the back, flipping the centre like an umbrella in the wind.');
Q('organic','According to Markovnikov’s rule, HBr adds to propene to give mainly',['1-bromopropane','2-bromopropane','propane','2-bromopropene'],1,'H goes to the carbon that already has more hydrogens, so Br ends up on the middle carbon.');
Q('stereo','A carbon bonded to four different groups is called a',['chiral centre','radical centre','carbocation','sp centre'],0,'Four different groups means the carbon is a stereocentre.');
Q('stereo','Enantiomers rotate plane-polarised light',['by the same amount in the same direction','by equal amounts in opposite directions','not at all','by different amounts'],1,'They are mirror images with equal and opposite rotation.');
Q('stereo','Which of these is aromatic?',['Cyclohexane','Benzene','Cyclohexene','Cyclobutadiene'],1,'Benzene is planar, cyclic and conjugated with 6 π electrons (4n + 2, n = 1).');
Q('stereo','A 50:50 mixture of two enantiomers is called',['a meso compound','a racemic mixture','a diastereomer pair','a tautomer'],1,'The rotations cancel, so a racemic mixture shows no optical activity.');
Q('spectro','A strong, broad IR peak near 3300 cm⁻¹ suggests',['C=O','O–H','C≡N','C–Cl'],1,'Hydrogen-bonded O–H stretches show up broad between 3200 and 3550 cm⁻¹.');
Q('spectro','In ¹H NMR, the number of signals tells you the number of',['hydrogen atoms','different hydrogen environments','carbon atoms','double bonds'],1,'Equivalent hydrogens give one signal; different environments give separate signals.');
Q('spectro','In a coordination complex, the number of donor atoms bonded to the metal is its',['oxidation state','coordination number','overall charge','atomic number'],1,'That count is the coordination number, for example 6 in an octahedral complex.');
Q('spectro','A strong IR peak near 1700 cm⁻¹ is typical of',['C=O','O–H','C–H','C≡C'],0,'The carbonyl stretch is one of the strongest, sharpest signals in IR.');

// ----------------------------------------------------------------------------------- NOVA-9's voice (pre-written, so the game never waits for the AI)
const TAUNT = {
  open:['Another challenger? I was just warming up. Literally. I overheat.','Welcome to the Arena. Try not to dissolve.','I have memorised the entire periodic table. Twice. Ready?'],
  pCorrect:['Hmph. Lucky. Even a stopped clock reacts twice a day.','Ow! That stung more than concentrated HCl.','Correct? I… allow it. This time.','Okay, you can read a periodic table. Cute.'],
  fast:['Whoa, that was fast. Did you add a catalyst?','Speedy! My circuits had not even finished loading.'],
  combo:['A streak?! Who gave you the cheat sheet?!','Stop! My visor is overheating!','That is a chain reaction I did not plan for!'],
  pWrong:['Wrong! Even a noble gas would have reacted better.','That answer had zero valence. Try again, brave soul.','Bzzt! Not even close, but I admire the confidence.','Ha! That one fizzled out.'],
  rWin:['Point to NOVA-9. Precision is my middle name.','Easy. I run on pure electrons and ego.'],
  bothWrong:['We both missed that one. We shall never speak of it.'],
  timeout:['Time! Even slow reactions have a half-life.'],
  low:['I am NOT losing to a human. My battery is just… low.','Critical damage? Impossible. I have a warranty!'],
  win:['Impossible! I demand a recount. And a better processor.','You win this round of the universe. I will be back, as reactive as ever.'],
  lose:['Victory is mine! Chemistry is my element. Rematch?','Better luck next time. I would go easy on you, but I do not know how.'],
  draw:['A draw? That is like an unbalanced equation. Unacceptable. Rematch!']
};

// ----------------------------------------------------------------------------------- characters (SVG)
function novaSvg(mood){
  const col = { idle:'#22E4FF', smug:'#22E4FF', hurt:'#FFC53D', angry:'#FF4D6D', laugh:'#FFC53D', shocked:'#FF3DCB' }[mood] || '#22E4FF';
  const eyes = {
    idle:`<circle cx="44" cy="58" r="6" fill="${col}"/><circle cx="76" cy="58" r="6" fill="${col}"/>`,
    smug:`<path d="M36 60 q8 -9 16 0 z" fill="${col}"/><path d="M68 60 q8 -9 16 0 z" fill="${col}"/><path d="M34 54 h20 M66 54 h20" stroke="#07101c" stroke-width="5"/>`,
    hurt:`<path d="M38 52 l12 12 M50 52 l-12 12 M70 52 l12 12 M82 52 l-12 12" stroke="${col}" stroke-width="4" stroke-linecap="round"/>`,
    angry:`<circle cx="44" cy="60" r="5" fill="${col}"/><circle cx="76" cy="60" r="5" fill="${col}"/><path d="M34 48 l20 8 M86 48 l-20 8" stroke="${col}" stroke-width="4" stroke-linecap="round"/>`,
    laugh:`<path d="M36 62 q8 -12 16 0 M68 62 q8 -12 16 0" stroke="${col}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    shocked:`<circle cx="44" cy="58" r="8" fill="none" stroke="${col}" stroke-width="3"/><circle cx="76" cy="58" r="8" fill="none" stroke="${col}" stroke-width="3"/><circle cx="44" cy="58" r="2.5" fill="${col}"/><circle cx="76" cy="58" r="2.5" fill="${col}"/>`
  }[mood] || '';
  const mouth = {
    idle:`<path d="M50 80 h20" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`,
    smug:`<path d="M48 80 q14 8 26 -4" stroke="${col}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    hurt:`<path d="M48 82 q4 -5 8 0 t8 0 t8 0" stroke="${col}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    angry:`<path d="M48 82 q12 -7 24 0" stroke="${col}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    laugh:`<path d="M46 76 q14 18 28 0 z" fill="${col}"/>`,
    shocked:`<ellipse cx="60" cy="82" rx="5" ry="6" fill="none" stroke="${col}" stroke-width="3"/>`
  }[mood] || '';
  return `<svg class="ca-nova-svg" viewBox="0 0 120 150" aria-hidden="true"><defs><linearGradient id="cnH" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a2a8f"/><stop offset="1" stop-color="#150d3d"/></linearGradient><radialGradient id="cnG"><stop offset="0" stop-color="${col}" stop-opacity=".9"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs>
  <circle cx="60" cy="10" r="12" fill="url(#cnG)"/><line x1="60" y1="24" x2="60" y2="14" stroke="${col}" stroke-width="3"/><circle cx="60" cy="10" r="4" fill="${col}"/>
  <rect x="14" y="24" width="92" height="76" rx="28" fill="url(#cnH)" stroke="${col}" stroke-width="3"/>
  <rect x="26" y="40" width="68" height="44" rx="16" fill="#07101c" stroke="${col}" stroke-opacity=".5" stroke-width="2"/>
  ${eyes}${mouth}
  <rect x="4" y="52" width="10" height="26" rx="5" fill="#2b1c70" stroke="${col}" stroke-width="2"/><rect x="106" y="52" width="10" height="26" rx="5" fill="#2b1c70" stroke="${col}" stroke-width="2"/>
  <path d="M34 104 h52 l8 34 h-68 z" fill="url(#cnH)" stroke="${col}" stroke-width="3"/><circle cx="60" cy="122" r="8" fill="${col}" fill-opacity=".85"/><text x="60" y="126" text-anchor="middle" font-size="11" font-weight="900" fill="#07101c" font-family="system-ui,Arial">9</text></svg>`;
}
function moSvg(mood){
  const eyes = {
    confused:`<circle cx="46" cy="58" r="5" fill="#2a1a10"/><circle cx="74" cy="58" r="5" fill="#2a1a10"/><path d="M38 46 q8 -6 16 0" stroke="#2a1a10" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M66 50 l16 -4" stroke="#2a1a10" stroke-width="3" stroke-linecap="round"/>`,
    thinking:`<circle cx="48" cy="54" r="5" fill="#2a1a10"/><circle cx="76" cy="54" r="5" fill="#2a1a10"/>`,
    aha:`<circle cx="46" cy="58" r="8" fill="#fff"/><circle cx="74" cy="58" r="8" fill="#fff"/><circle cx="47" cy="58" r="4" fill="#2a1a10"/><circle cx="75" cy="58" r="4" fill="#2a1a10"/>`,
    sad:`<circle cx="46" cy="60" r="5" fill="#2a1a10"/><circle cx="74" cy="60" r="5" fill="#2a1a10"/><path d="M38 50 l14 4 M82 50 l-14 4" stroke="#2a1a10" stroke-width="3" stroke-linecap="round"/>`
  }[mood] || '';
  const mouth = { confused:'<path d="M50 84 q5 -5 10 0 t10 0" stroke="#2a1a10" stroke-width="3" fill="none" stroke-linecap="round"/>', thinking:'<ellipse cx="60" cy="84" rx="4" ry="3" fill="#2a1a10"/>', aha:'<path d="M46 80 q14 20 28 0 z" fill="#7a1f2b"/>', sad:'<path d="M50 88 q10 -8 20 0" stroke="#2a1a10" stroke-width="3" fill="none" stroke-linecap="round"/>' }[mood] || '';
  const sparkle = mood==='aha' ? '<path d="M100 20 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z M16 30 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#FFC53D"/>' : '';
  return `<svg class="ca-mo-svg" viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="68" rx="44" ry="40" fill="#8B5E3C"/><ellipse cx="60" cy="82" rx="28" ry="24" fill="#C79A6B"/><circle cx="30" cy="34" r="12" fill="#8B5E3C"/><circle cx="90" cy="34" r="12" fill="#8B5E3C"/>
  ${eyes}<circle cx="46" cy="58" r="13" fill="none" stroke="#22E4FF" stroke-width="2.5"/><circle cx="74" cy="58" r="13" fill="none" stroke="#22E4FF" stroke-width="2.5"/><path d="M59 58 h2" stroke="#22E4FF" stroke-width="2.5"/>
  <ellipse cx="60" cy="72" rx="8" ry="6" fill="#F4A6B8"/>${mouth}<path d="M20 96 l-8 8 M26 100 l-6 10 M100 96 l8 8 M94 100 l6 10" stroke="#2a1a10" stroke-width="3" stroke-linecap="round"/>${sparkle}</svg>`;
}

// ----------------------------------------------------------------------------------- sound (tiny synth, off by default)
const SND = { on:false, ctx:null };
function beep(freq, dur, type, vol, slide){
  if(!SND.on) return;
  try{
    SND.ctx = SND.ctx || new (window.AudioContext || window.webkitAudioContext)();
    const c = SND.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.value = freq;
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), c.currentTime + dur);
    g.gain.value = vol || .06; g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  }catch(e){}
}
const sfx = { hit:()=>beep(520,.18,'square',.07,120), good:()=>{ beep(660,.12,'triangle',.08); setTimeout(()=>beep(990,.16,'triangle',.08),90); }, bad:()=>beep(180,.28,'sawtooth',.06,70), win:()=>[523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,.2,'triangle',.08),i*120)), tick:()=>beep(880,.05,'sine',.03) };
function speak(text, who){
  if(!SND.on || !window.speechSynthesis) return;
  try{ window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(text).replace(/[*_`#]/g,'')); u.pitch = who==='mo' ? 1.5 : .55; u.rate = who==='mo' ? 1.08 : 1.02; window.speechSynthesis.speak(u); }catch(e){}
}

// ----------------------------------------------------------------------------------- styles
const CSS = `
.ca{position:relative; min-height:640px; border-radius:22px; overflow:hidden; color:#EAF2FF; font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif; background:radial-gradient(120% 90% at 15% 0%,#2f1873 0%,#0b1030 46%,#050814 100%); isolation:isolate; text-align:left;}
.ca,.ca *{box-sizing:border-box;} .ca button{font-family:inherit; cursor:pointer;}
.ca-fx{position:absolute; inset:0; width:100%; height:100%; z-index:0; pointer-events:none;}
.ca-in{position:relative; z-index:1; max-width:660px; margin:0 auto; padding:16px 16px 30px;}
.ca-top{display:flex; align-items:center; gap:8px; margin-bottom:14px;} .ca-top .sp{flex:1;}
.ca-ib{background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.16); color:#EAF2FF; border-radius:12px; padding:8px 12px; font-size:14px; font-weight:700;} .ca-ib:hover{background:rgba(255,255,255,.16);}
.ca-xp{font-size:12.5px; font-weight:800; letter-spacing:.04em; padding:7px 12px; border-radius:999px; background:linear-gradient(90deg,rgba(34,228,255,.18),rgba(255,61,203,.18)); border:1px solid rgba(255,255,255,.18);}
.ca-logo{font-size:clamp(34px,9vw,54px); line-height:1; font-weight:900; letter-spacing:.02em; margin:6px 0 4px; background:linear-gradient(90deg,#22E4FF,#B07CFF 45%,#FF3DCB); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 0 18px rgba(176,124,255,.55)); font-style:italic;}
.ca-sub{margin:0 0 16px; color:#B9C6E8; font-size:15px; line-height:1.5;}
.ca-hero{display:flex; align-items:center; gap:14px; margin:6px 0 18px;} .ca-hero .ca-nova-wrap{width:96px; flex:none;}
.ca-say{position:relative; flex:1; background:rgba(255,255,255,.09); border:1px solid rgba(255,255,255,.18); border-radius:16px; padding:12px 14px; font-size:14.5px; line-height:1.5; backdrop-filter:blur(6px);}
.ca-say:before{content:''; position:absolute; left:-8px; top:20px; width:14px; height:14px; background:inherit; border-left:1px solid rgba(255,255,255,.18); border-bottom:1px solid rgba(255,255,255,.18); transform:rotate(45deg);}
.ca-say b{display:block; font-size:11px; letter-spacing:.14em; color:#22E4FF; margin-bottom:3px;}
.ca-tiles{display:grid; grid-template-columns:1fr 1fr; gap:12px;} @media(max-width:420px){ .ca-tiles{grid-template-columns:1fr;} }
.ca-tile{position:relative; text-align:left; border:1.5px solid color-mix(in srgb,var(--c) 70%,transparent); background:linear-gradient(160deg,color-mix(in srgb,var(--c) 22%,#0c1233),#0b1030 70%); border-radius:18px; padding:16px; color:#EAF2FF; min-height:132px; transition:transform .18s, box-shadow .18s; box-shadow:0 0 0 rgba(0,0,0,0);} .ca-tile:hover{transform:translateY(-3px); box-shadow:0 10px 34px color-mix(in srgb,var(--c) 45%,transparent);}
.ca-tile .ic{font-size:30px; filter:drop-shadow(0 0 10px var(--c));} .ca-tile h3{margin:8px 0 4px; font-size:17px; letter-spacing:.01em;} .ca-tile p{margin:0; font-size:12.5px; line-height:1.45; color:#C4CFEE;} .ca-tile .tag{position:absolute; top:12px; right:12px; font-size:10.5px; font-weight:800; letter-spacing:.08em; padding:3px 8px; border-radius:999px; background:var(--c); color:#07101c;}
.ca-tile.wide{grid-column:1/-1; min-height:0;}
.ca-btn{border:0; border-radius:14px; padding:14px 22px; font-size:16px; font-weight:900; letter-spacing:.02em; color:#07101c; background:linear-gradient(90deg,#22E4FF,#7CF7C4); box-shadow:0 0 24px rgba(34,228,255,.45); transition:transform .15s, box-shadow .15s;} .ca-btn:hover{transform:translateY(-2px); box-shadow:0 0 34px rgba(34,228,255,.7);} .ca-btn:disabled{opacity:.5; transform:none; box-shadow:none; cursor:default;}
.ca-btn.hot{background:linear-gradient(90deg,#FF3DCB,#FFC53D); box-shadow:0 0 24px rgba(255,61,203,.45);} .ca-btn.ghost{background:rgba(255,255,255,.08); color:#EAF2FF; border:1px solid rgba(255,255,255,.2); box-shadow:none;} .ca-btn.small{padding:10px 16px; font-size:14px; border-radius:12px;}
.ca-row{display:flex; flex-wrap:wrap; gap:10px; margin-top:14px;} .ca-h2{margin:4px 0 10px; font-size:22px; font-weight:900;} .ca-lab{margin:16px 0 8px; font-size:12px; font-weight:800; letter-spacing:.12em; color:#8FA2D8;}
.ca-chips{display:flex; flex-wrap:wrap; gap:8px;} .ca-chip{background:rgba(255,255,255,.07); border:1.5px solid rgba(255,255,255,.18); color:#EAF2FF; border-radius:999px; padding:9px 14px; font-size:13.5px; font-weight:700;} .ca-chip.on{background:linear-gradient(90deg,#22E4FF,#B07CFF); color:#07101c; border-color:transparent; box-shadow:0 0 16px rgba(34,228,255,.5);}
.ca-card{background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.16); border-radius:18px; padding:16px; backdrop-filter:blur(8px);}
/* duel */
.ca-fighter{display:flex; align-items:center; gap:12px;} .ca-fighter .ca-nova-wrap{width:88px; flex:none; animation:caBob 3s ease-in-out infinite;} .ca-fighter .who{flex:1; min-width:0;}
.ca-name{font-size:12px; font-weight:900; letter-spacing:.14em; display:flex; justify-content:space-between; margin-bottom:5px;}
.ca-hp{height:16px; border-radius:999px; background:rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.22); overflow:hidden; position:relative;} .ca-hp i{position:absolute; inset:0 auto 0 0; width:100%; border-radius:999px; background:linear-gradient(90deg,#3DFF9A,#22E4FF); box-shadow:0 0 14px rgba(61,255,154,.7); transition:width .5s cubic-bezier(.2,.9,.3,1);} .ca-hp.low i{background:linear-gradient(90deg,#FF4D6D,#FFC53D); box-shadow:0 0 14px rgba(255,77,109,.8);} .ca-hp.rv i{background:linear-gradient(90deg,#FF3DCB,#B07CFF); box-shadow:0 0 14px rgba(255,61,203,.7);}
.ca-avatar{width:60px; height:68px; flex:none; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:900; color:#07101c; clip-path:polygon(25% 3%,75% 3%,98% 50%,75% 97%,25% 97%,2% 50%); background:linear-gradient(160deg,#22E4FF,#B07CFF); filter:drop-shadow(0 0 10px rgba(34,228,255,.7));}
.ca-q{margin:14px 0 12px; font-size:clamp(17px,4.6vw,20px); line-height:1.45; font-weight:700;} .ca-qtag{font-size:11px; letter-spacing:.14em; font-weight:800; color:#22E4FF;}
.ca-timer{height:7px; border-radius:99px; background:rgba(255,255,255,.12); overflow:hidden; margin-top:10px;} .ca-timer i{display:block; height:100%; width:100%; background:linear-gradient(90deg,#FFC53D,#FF3DCB); transition:width .1s linear;}
.ca-opts{display:grid; gap:10px;} .ca-opt{display:flex; gap:12px; align-items:center; text-align:left; background:rgba(255,255,255,.08); border:1.5px solid rgba(255,255,255,.2); color:#EAF2FF; border-radius:14px; padding:13px 14px; font-size:15.5px; font-weight:600; transition:transform .12s, background .12s, border-color .12s;} .ca-opt:hover:not(:disabled){transform:translateX(4px); background:rgba(34,228,255,.14); border-color:#22E4FF;} .ca-opt b{flex:none; width:28px; height:28px; border-radius:9px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.14); font-size:13px;}
.ca-opt.right{background:rgba(61,255,154,.22); border-color:#3DFF9A; box-shadow:0 0 18px rgba(61,255,154,.45);} .ca-opt.wrong{background:rgba(255,77,109,.22); border-color:#FF4D6D; animation:caShake .35s;} .ca-opt:disabled{cursor:default;}
.ca-why{margin-top:12px; padding:12px 14px; border-radius:14px; background:rgba(34,228,255,.1); border:1px solid rgba(34,228,255,.35); font-size:14px; line-height:1.5;}
.ca-pill{display:inline-block; font-size:12px; font-weight:800; padding:4px 10px; border-radius:999px; background:rgba(255,255,255,.12); margin-right:6px;} .ca-pill.combo{background:linear-gradient(90deg,#FFC53D,#FF3DCB); color:#07101c;}
.ca-pop{position:absolute; z-index:5; font-weight:900; font-size:26px; pointer-events:none; text-shadow:0 0 14px currentColor; animation:caPop 1.1s ease-out forwards;}
.ca-big{font-size:clamp(40px,12vw,68px); font-weight:900; font-style:italic; text-align:center; margin:6px 0 2px; filter:drop-shadow(0 0 22px currentColor);}
.ca-stats{display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:14px 0;} .ca-stats div{background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.16); border-radius:14px; padding:12px 8px; text-align:center;} .ca-stats b{display:block; font-size:24px;} .ca-stats span{font-size:11px; letter-spacing:.1em; color:#9FB0DD;}
/* teach */
.ca-chat{display:flex; flex-direction:column; gap:10px; max-height:46vh; overflow:auto; padding:4px 2px 8px; scroll-behavior:smooth;}
.ca-msg{max-width:86%; padding:11px 14px; border-radius:18px; font-size:15px; line-height:1.5; animation:caIn .25s ease-out; white-space:pre-wrap; word-break:break-word;} .ca-msg.mo{align-self:flex-start; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.18); border-bottom-left-radius:5px;} .ca-msg.me{align-self:flex-end; background:linear-gradient(135deg,#22E4FF,#7C8CFF); color:#07101c; font-weight:600; border-bottom-right-radius:5px;} .ca-msg.dots span{display:inline-block; width:7px; height:7px; border-radius:50%; background:#B9C6E8; margin:0 2px; animation:caDot 1s infinite;} .ca-msg.dots span:nth-child(2){animation-delay:.15s;} .ca-msg.dots span:nth-child(3){animation-delay:.3s;}
.ca-meter{height:14px; border-radius:99px; background:rgba(0,0,0,.4); border:1px solid rgba(255,255,255,.22); overflow:hidden;} .ca-meter i{display:block; height:100%; width:0; background:linear-gradient(90deg,#FFC53D,#3DFF9A); box-shadow:0 0 14px rgba(255,197,61,.7); transition:width .7s cubic-bezier(.2,.9,.3,1);}
.ca-input{display:flex; gap:8px; align-items:flex-end; margin-top:10px;} .ca-input textarea{flex:1; min-height:48px; max-height:130px; resize:none; border-radius:14px; border:1.5px solid rgba(255,255,255,.25); background:rgba(0,0,0,.35); color:#fff; padding:12px 14px; font:inherit; font-size:15px; line-height:1.4;} .ca-input textarea:focus{outline:none; border-color:#22E4FF; box-shadow:0 0 14px rgba(34,228,255,.4);}
.ca-mic{width:48px; height:48px; border-radius:14px; border:1.5px solid rgba(255,255,255,.25); background:rgba(255,255,255,.08); color:#fff; font-size:20px;} .ca-mic.rec{background:#FF4D6D; border-color:#FF4D6D; animation:caPulse 1s infinite;}
.ca-mo-wrap{width:92px; flex:none; animation:caBob 3.4s ease-in-out infinite;}
/* case + lab */
.ca-scene{display:flex; gap:12px; align-items:flex-start;} .ca-face{width:58px; height:58px; flex:none; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:30px; background:linear-gradient(160deg,#2b1c70,#150d3d); border:2px solid #FFC53D; box-shadow:0 0 16px rgba(255,197,61,.5);}
.ca-clues{display:flex; flex-wrap:wrap; gap:8px; margin:12px 0 0;} .ca-clue{font-size:12.5px; font-weight:700; padding:6px 11px; border-radius:10px; background:rgba(255,197,61,.16); border:1px solid rgba(255,197,61,.5); color:#FFE3A1;}
.ca-shelf{display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin:12px 0;} .ca-rg{display:flex; align-items:center; gap:8px; background:rgba(255,255,255,.08); border:1.5px solid rgba(255,255,255,.2); color:#EAF2FF; border-radius:12px; padding:8px 12px; font-size:13.5px; font-weight:700;} .ca-rg:hover{background:rgba(255,255,255,.16);} .ca-rg i{width:14px; height:14px; border-radius:50%; background:var(--c); border:1px solid rgba(255,255,255,.5);}
.ca-beaker{position:relative; width:190px; height:230px; margin:6px auto 0;} .ca-beaker svg{position:absolute; inset:0; width:100%; height:100%; z-index:3; pointer-events:none;}
.ca-glass{position:absolute; left:22px; right:22px; top:26px; bottom:14px; overflow:hidden; border-radius:6px 6px 26px 26px; z-index:1;}
.ca-liq{position:absolute; left:0; right:0; bottom:0; height:0; background:var(--lq,#9ad); opacity:.82; transition:height .8s ease, background-color 1.4s ease; overflow:hidden;} .ca-liq:after{content:''; position:absolute; left:0; right:0; top:0; height:6px; background:rgba(255,255,255,.35);}
.ca-bub{position:absolute; bottom:-12px; border-radius:50%; border:2px solid rgba(255,255,255,.75); background:rgba(255,255,255,.18); animation:caRise var(--d,2.4s) linear forwards;} .ca-ppt{position:absolute; width:7px; height:7px; border-radius:50%; background:var(--pc); top:0; animation:caFall var(--d,2.2s) ease-in forwards;} .ca-layer{position:absolute; left:0; right:0; bottom:0; height:0; background:var(--pc); transition:height 2.5s ease; z-index:2;} .ca-foam{position:absolute; left:6px; right:6px; bottom:0; height:0; background:radial-gradient(circle at 30% 30%,#fff,#ffe6f6 60%,#ffd1ec); border-radius:40px 40px 10px 10px; z-index:2; transition:height 2.2s ease-out;}
.ca-flash{position:absolute; inset:0; background:radial-gradient(circle,rgba(255,255,255,.9),rgba(255,197,61,.2) 60%,transparent 70%); opacity:0; z-index:4; pointer-events:none;} .ca-flash.go{animation:caFlash .9s ease-out;}
.ca-heat{position:absolute; left:50%; top:-8px; width:60%; transform:translateX(-50%); display:flex; justify-content:space-around; z-index:4; pointer-events:none;} .ca-heat i{width:4px; height:30px; border-radius:4px; background:linear-gradient(transparent,rgba(255,150,80,.8)); animation:caHeat 1.6s ease-in-out infinite;} .ca-heat i:nth-child(2){animation-delay:.3s;} .ca-heat i:nth-child(3){animation-delay:.6s;}
.ca-log{margin-top:12px; min-height:92px;} .ca-eq{font-family:ui-monospace,Menlo,Consolas,monospace; font-size:14px; color:#7CF7C4; margin:6px 0;}
@keyframes caBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}} @keyframes caShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}} @keyframes caPop{0%{opacity:0; transform:translateY(8px) scale(.6)}15%{opacity:1; transform:translateY(0) scale(1.15)}100%{opacity:0; transform:translateY(-56px) scale(1)}}
@keyframes caIn{from{opacity:0; transform:translateY(8px)}to{opacity:1; transform:none}} @keyframes caDot{0%,80%,100%{transform:translateY(0); opacity:.5}40%{transform:translateY(-5px); opacity:1}} @keyframes caPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,77,109,.6)}50%{box-shadow:0 0 0 10px rgba(255,77,109,0)}}
@keyframes caRise{0%{transform:translateY(0) scale(.6); opacity:.9}100%{transform:translateY(-190px) scale(1); opacity:0}} @keyframes caFall{0%{transform:translateY(0); opacity:1}100%{transform:translateY(var(--fall,150px)); opacity:1}} @keyframes caFlash{0%{opacity:0}20%{opacity:1}100%{opacity:0}} @keyframes caHeat{0%,100%{transform:translateY(0) scaleY(.8); opacity:.2}50%{transform:translateY(-14px) scaleY(1.2); opacity:.9}}
.ca-shake{animation:caShake .4s;} .ca-flashred{animation:caRed .5s;} @keyframes caRed{0%,100%{box-shadow:inset 0 0 0 rgba(255,77,109,0)}40%{box-shadow:inset 0 0 90px rgba(255,77,109,.55)}}
.ca-ov{position:fixed; inset:0; z-index:3000; background:#050814; overflow:auto; padding:10px;} .ca-ov .ca{min-height:calc(100vh - 20px);}
@media (prefers-reduced-motion:reduce){ .ca *{animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important;} }
`;
function ensureCss(){ if(document.getElementById('caCss')) return; const s = document.createElement('style'); s.id = 'caCss'; s.textContent = CSS; document.head.appendChild(s); }

// ----------------------------------------------------------------------------------- background particles and bursts
function makeFx(canvas, host){
  const g = canvas.getContext('2d'); let W = 0, H = 0, dpr = 1, raf = 0, stars = [], hexes = [], sparks = [], beams = [], alive = true;
  const still = reduceMotion();
  function size(){ dpr = Math.min(2, window.devicePixelRatio || 1); W = host.clientWidth; H = host.clientHeight; canvas.width = W*dpr; canvas.height = H*dpr; g.setTransform(dpr,0,0,dpr,0,0);
    stars = Array.from({length: still ? 20 : 70}, ()=>({ x:Math.random()*W, y:Math.random()*H, r:rnd(.4,1.8), s:rnd(.05,.3), p:Math.random()*6 }));
    hexes = Array.from({length: still ? 3 : 9}, ()=>({ x:Math.random()*W, y:Math.random()*H, r:rnd(14,34), vx:rnd(-.15,.15), vy:rnd(-.25,-.05), rot:Math.random()*6, vr:rnd(-.004,.004), c:pick(['#22E4FF','#B07CFF','#FF3DCB','#3DFF9A']) })); }
  function hex(x,y,r,rot){ g.beginPath(); for(let i=0;i<6;i++){ const a = rot + i*Math.PI/3; g[i?'lineTo':'moveTo'](x + r*Math.cos(a), y + r*Math.sin(a)); } g.closePath(); }
  function frame(t){
    if(!alive) return; if(!host.isConnected){ alive = false; return; }
    if(document.hidden){ raf = requestAnimationFrame(frame); return; }
    if(host.clientWidth !== W || host.clientHeight !== H) size();
    g.clearRect(0,0,W,H);
    stars.forEach(s=>{ s.y += s.s; if(s.y > H) { s.y = -2; s.x = Math.random()*W; } g.globalAlpha = .35 + .35*Math.sin(t/700 + s.p); g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x,s.y,s.r,0,6.3); g.fill(); });
    hexes.forEach(h=>{ h.x += h.vx; h.y += h.vy; h.rot += h.vr; if(h.y < -50){ h.y = H + 50; h.x = Math.random()*W; } g.globalAlpha = .22; g.strokeStyle = h.c; g.lineWidth = 1.6; hex(h.x,h.y,h.r,h.rot); g.stroke(); });
    beams = beams.filter(b=> (b.t += .045) < 1); beams.forEach(b=>{ const x = b.x1 + (b.x2-b.x1)*b.t, y = b.y1 + (b.y2-b.y1)*b.t; g.globalAlpha = 1 - b.t*.3; g.fillStyle = b.c; g.shadowColor = b.c; g.shadowBlur = 22; g.beginPath(); g.arc(x,y,9 - b.t*3,0,6.3); g.fill(); g.shadowBlur = 0; if(b.t > .93) burst(b.x2,b.y2,b.c,16); });
    sparks = sparks.filter(p=> (p.life -= .02) > 0); sparks.forEach(p=>{ p.x += p.vx; p.y += p.vy; p.vy += .06; g.globalAlpha = Math.max(0,p.life); g.fillStyle = p.c; g.beginPath(); g.arc(p.x,p.y,p.r,0,6.3); g.fill(); });
    g.globalAlpha = 1; raf = requestAnimationFrame(frame);
  }
  function burst(x,y,c,n){ if(still) n = Math.min(n,6); for(let i=0;i<n;i++){ const a = Math.random()*6.3, v = rnd(1.5,5); sparks.push({ x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 1.5, r:rnd(1.5,3.6), c, life:rnd(.7,1.2) }); } }
  size(); raf = requestAnimationFrame(frame);
  return { burst, beam:(x1,y1,x2,y2,c)=> beams.push({ x1,y1,x2,y2,c,t:0 }), stop:()=>{ alive = false; cancelAnimationFrame(raf); } };
}

// ----------------------------------------------------------------------------------- shell: state, profile, helpers
let S = null;
const DEF = ()=> ({ xp:0, wins:0, plays:0, best:0, dstreak:0, dlast:0, labFound:[], cases:[], teach:0 });
function loadProf(o){ try{ const v = JSON.parse(localStorage.getItem('ichc_arena_' + String((o && o.userKey) || 'guest').slice(0,60)) || 'null'); if(v && typeof v==='object') return Object.assign(DEF(), v); }catch(e){} return DEF(); }
function saveProf(){ try{ localStorage.setItem('ichc_arena_' + String((S.opts && S.opts.userKey) || 'guest').slice(0,60), JSON.stringify(S.prof)); }catch(e){} }
const level = xp=> Math.floor(Math.sqrt(xp/60)) + 1;
function addXp(n){ const before = level(S.prof.xp); S.prof.xp += n; saveProf(); return level(S.prof.xp) > before; }
const sbOf = ()=> { try{ return S.opts.getSb ? S.opts.getSb() : null; }catch(e){ return null; } };
const sbReady = ()=> { try{ return !!(S.opts.ready ? S.opts.ready() : sbOf()); }catch(e){ return false; } };
async function ai(body, ms){
  const sb = sbOf(); if(!sb || !sb.functions || !sbReady()) return null;
  try{
    const r = await Promise.race([ sb.functions.invoke('game-ai', { body }), new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')), ms || 8000)) ]);
    if(r && r.data && !r.error && !r.data.error) return r.data;
  }catch(e){}
  return null;
}
function later(fn, ms){ const id = setTimeout(()=>{ S && fn(); }, ms); S.timers.push(id); return id; }
function clearTimers(){ if(!S) return; S.timers.forEach(t=>{ clearTimeout(t); clearInterval(t); }); S.timers = []; try{ window.speechSynthesis && window.speechSynthesis.cancel(); }catch(e){} stopMic(); }
function posOf(el){ const r = el.getBoundingClientRect(), b = S.root.getBoundingClientRect(); return { x:r.left - b.left + r.width/2, y:r.top - b.top + r.height/2 }; }
function pop(el, text, color){ if(!el) return; const p = posOf(el), d = document.createElement('div'); d.className = 'ca-pop'; d.style.cssText = `left:${p.x-24}px; top:${p.y-18}px; color:${color};`; d.textContent = text; S.root.appendChild(d); setTimeout(()=>d.remove(), 1200); }
function hit(el, color, n){ if(!el || !S.fx) return; const p = posOf(el); S.fx.burst(p.x, p.y, color, n || 26); }
function shakeEl(el){ if(!el) return; el.classList.remove('ca-shake'); void el.offsetWidth; el.classList.add('ca-shake'); }
const $ = (s)=> S.root.querySelector(s);

function topBar(back){
  const site = S.opts.ctx === 'site';
  const left = back ? `<button class="ca-ib" data-act="hub">← Arena</button>` : (site ? `<button class="ca-ib" data-act="close">✕ Close</button>` : '');
  return `<div class="ca-top">${left}<span class="sp"></span><span class="ca-xp">LV ${level(S.prof.xp)} · ${S.prof.xp} XP</span><button class="ca-ib" data-act="snd" aria-label="Sound">${SND.on ? '🔊' : '🔇'}</button></div>`;
}
function setInner(html){ S.inn.innerHTML = html; try{ S.root.scrollIntoView && S.opts.ctx !== 'site' && S.root.getBoundingClientRect().top < 0 && S.root.scrollIntoView({ block:'start', behavior:'smooth' }); }catch(e){} }
function go(screen, arg){ if(!S) return; clearTimers(); S.screen = screen; ({ hub:renderHub, duelSetup:renderDuelSetup, duel:()=>duelStart(arg), teachPick:renderTeachPick, teach:()=>teachStart(arg), caseIntro:renderCaseIntro, lab:renderLab })[screen](); }

// share helpers (text + picture)
function arenaUrl(){ const root = (S.opts.siteUrl || 'https://ichc-ghana.vercel.app/').replace(/[?#].*$/,'').replace(/\/?$/,'/'); return root + '#play'; }
async function copyText(t){ try{ await navigator.clipboard.writeText(t); return true; }catch(e){ return false; } }
function cardImage(d){
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const bg = g.createLinearGradient(0,0,W,H); bg.addColorStop(0,'#2f1873'); bg.addColorStop(.5,'#0b1030'); bg.addColorStop(1,'#050814'); g.fillStyle = bg; g.fillRect(0,0,W,H);
  g.globalAlpha = .2; g.lineWidth = 3; for(let i=0;i<14;i++){ const x = (i*173)%W, y = (i*311)%H, r = 40 + (i*29)%60; g.strokeStyle = ['#22E4FF','#B07CFF','#FF3DCB','#3DFF9A'][i%4]; g.beginPath(); for(let k=0;k<6;k++){ const a = k*Math.PI/3; g[k?'lineTo':'moveTo'](x + r*Math.cos(a), y + r*Math.sin(a)); } g.closePath(); g.stroke(); } g.globalAlpha = 1;
  g.textAlign = 'center'; g.fillStyle = '#22E4FF'; g.font = '800 34px system-ui,Arial'; g.fillText('CHEM ARENA  ·  CHEMISTRY COMPETITION PREP', W/2, 130);
  g.save(); g.shadowColor = d.color || '#FF3DCB'; g.shadowBlur = 40; g.fillStyle = d.color || '#FF3DCB'; g.font = 'italic 900 150px system-ui,Arial'; g.fillText(d.big, W/2, 470); g.restore();
  g.fillStyle = '#fff'; g.font = '800 62px system-ui,Arial'; g.fillText(d.title, W/2, 590);
  g.fillStyle = '#C4CFEE'; g.font = '500 40px system-ui,Arial'; (d.lines || []).forEach((t,i)=> g.fillText(t, W/2, 700 + i*62));
  rrect(g, 190, 1010, W-380, 130, 30); g.fillStyle = 'rgba(255,255,255,.1)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#fff'; g.font = '800 40px system-ui,Arial'; g.fillText('Think you can beat it?', W/2, 1070); g.fillStyle = '#7CF7C4'; g.font = '700 34px system-ui,Arial'; g.fillText(arenaUrl().replace(/^https?:\/\//,''), W/2, 1118);
  const st = ['#CE1126','#FCD116','#006B3F']; st.forEach((c,i)=>{ g.fillStyle = c; g.fillRect(i*W/3, H-24, W/3+1, 24); });
  return cv;
}
function rrect(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
async function shareCard(d, text, note){
  const cv = cardImage(d), blob = await new Promise(r=>cv.toBlob(r,'image/png'));
  try{ const f = new File([blob], 'chem-arena.png', { type:'image/png' }); if(navigator.canShare && navigator.canShare({ files:[f] })){ await navigator.share({ files:[f], text }); return; } }catch(e){ if(e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'chem-arena.png'; document.body.appendChild(a); a.click(); a.remove();
  const ok = await copyText(text); if(note) note(ok ? 'Picture saved and message copied. Post them together!' : 'Picture saved. Add your own message when you post it.');
}
async function inviteFriend(note){
  const r = S.opts.role, text = r==='coordinator' || r==='ambassador' ? `My students are training with chemistry games at Chemistry Competition Prep. Can you beat NOVA-9, the rival robot? Play free: ${arenaUrl()}` : `I am training in the Chem Arena. Can you beat NOVA-9, the rival robot, in a chemistry duel? Play free: ${arenaUrl()}`;
  try{ if(navigator.share){ await navigator.share({ text }); return; } }catch(e){ if(e && e.name === 'AbortError') return; }
  const ok = await copyText(text); if(note) note(ok ? 'Invite copied. Paste it in WhatsApp or anywhere you like.' : 'Copy this: ' + text);
}

// ----------------------------------------------------------------------------------- hub
function renderHub(){
  const p = S.prof, today = dayNum(), doneToday = p.dlast === today;
  const streak = p.dstreak > 0 && (p.dlast === today || p.dlast === yesterday()) ? p.dstreak : 0;
  const portal = S.opts.ctx === 'portal', coach = S.opts.role === 'coordinator' || S.opts.role === 'ambassador';
  const tile = (act, ic, h, t, c, tag)=> `<button class="ca-tile" style="--c:${c}" data-act="${act}">${tag ? `<span class="tag">${tag}</span>` : ''}<div class="ic">${ic}</div><h3>${h}</h3><p>${t}</p></button>`;
  setInner(`${topBar(false)}
  <div class="ca-logo">CHEM ARENA</div><p class="ca-sub">${coach ? 'Games for you and your students. Play, then share a challenge.' : 'Real chemistry. Real rivals. Zero boring.'}</p>
  <div class="ca-hero"><div class="ca-nova-wrap" id="hNova">${novaSvg('smug')}</div><div class="ca-say"><b>NOVA-9</b><span id="hSay">${esc(pick(TAUNT.open))}</span></div></div>
  <div class="ca-row" style="margin:-6px 0 16px;"><button class="ca-btn hot" data-act="daily" ${doneToday ? 'disabled' : ''}>${doneToday ? 'Daily challenge done ✓' : '🔥 Daily challenge'}</button><span class="ca-pill${streak > 1 ? ' combo' : ''}" style="align-self:center;">${streak > 0 ? streak + '-day streak' : 'Start a streak today'}</span></div>
  <div class="ca-tiles">
    ${tile('duelSetup','⚔️','Rival Duel','Outsmart NOVA-9 in an 8-round showdown. Taunts included.','#FF3DCB','HOT')}
    ${tile('teachPick','🧠','Teach Mo','Mo the Mole is lost. Explain it so well he finally gets it.','#22E4FF','AI')}
    ${tile('caseIntro','🕵️','Case Files','Crack “The Midnight Spill” using real chemistry clues.','#FFC53D','CASE 1')}
    ${tile('lab','🧪','Virtual Lab','Mix, pour, watch. No score, just reactions.','#3DFF9A','')}
    <button class="ca-tile wide" style="--c:#B07CFF" data-act="live"><div style="display:flex; gap:14px; align-items:center;"><div class="ic">📡</div><div><h3 style="margin:0 0 3px;">${portal ? 'Live Competition Night' : 'Live Nights'}</h3><p>${portal ? 'Join the timed mock rounds your Ambassador schedules.' : 'See when the next live competition night happens.'}</p></div></div></button>
    <button class="ca-tile wide" style="--c:#22E4FF" data-act="invite"><div style="display:flex; gap:14px; align-items:center;"><div class="ic">📣</div><div><h3 style="margin:0 0 3px;">${coach ? 'Challenge your students' : 'Challenge a friend'}</h3><p>${coach ? 'Send them a link to the Arena and see who beats NOVA-9.' : 'Send a friend the link and dare them to beat NOVA-9.'}</p></div></div></button>
  </div><div class="ca-lab" id="hNote" role="status" style="min-height:18px;"></div>`);
  later(()=>{ const s = $('#hSay'); if(s) s.textContent = pick(TAUNT.open); }, 7000);
}
function yesterday(){ const d = new Date(); d.setDate(d.getDate()-1); return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate(); }
function note(t){ const n = $('#hNote') || $('#dNote') || $('#tNote') || $('#lNote'); if(n) n.textContent = t; }

// ----------------------------------------------------------------------------------- Rival Duel
const LEVELS = { rookie:{ n:'Rookie', acc:.5, secs:25 }, pro:{ n:'Pro', acc:.68, secs:20 }, legend:{ n:'Legend', acc:.84, secs:15 } };
function renderDuelSetup(){
  const c = S.cfg = S.cfg || { focus:'', level:'pro' };
  const chips = [['','Mixed']].concat(TOPICS).map(t=>`<button class="ca-chip${c.focus===t[0] ? ' on' : ''}" data-act="focus" data-v="${t[0]}">${esc(t[1])}</button>`).join('');
  const lv = Object.keys(LEVELS).map(k=>`<button class="ca-chip${c.level===k ? ' on' : ''}" data-act="level" data-v="${k}">${LEVELS[k].n}</button>`).join('');
  setInner(`${topBar(true)}<div class="ca-hero"><div class="ca-nova-wrap">${novaSvg('angry')}</div><div class="ca-say"><b>NOVA-9</b>You dare challenge me? Choose your battlefield.</div></div>
  <div class="ca-lab">FOCUS</div><div class="ca-chips">${chips}</div><div class="ca-lab">DIFFICULTY</div><div class="ca-chips">${lv}</div>
  <div class="ca-row"><button class="ca-btn hot" data-act="fight">⚔️ Start duel</button></div><div class="ca-lab" id="dNote" role="status"></div>`);
}
function duelStart(arg){
  const cfg = Object.assign({ focus:'', level:'pro', daily:false }, (arg || S.cfg || {}));
  const r = cfg.daily ? mulberry(dayNum()) : null, L = LEVELS[cfg.level] || LEVELS.pro;
  let pool = cfg.focus ? shuffle(QB.filter(q=>q.t === cfg.focus), r).concat(shuffle(QB.filter(q=>q.t !== cfg.focus), r)) : shuffle(QB, r);
  const qs = pool.slice(0, 8).map(q=>{ const idx = shuffle([0,1,2,3], r); return { t:q.t, q:q.q, e:q.e, o:idx.map(i=>q.o[i]), a:idx.indexOf(q.a) }; });
  const name = (S.opts.name || 'YOU').split(/\s+/)[0].slice(0,12).toUpperCase();
  S.duel = { cfg, L, qs, i:0, hp:100, rhp:100, combo:0, bestCombo:0, correct:0, over:false, left:0, answered:true, name, lowSaid:false };
  setInner(`${topBar(true)}
  <div class="ca-fighter" id="dRival"><div class="ca-nova-wrap" id="dNova">${novaSvg('smug')}</div><div class="who"><div class="ca-name"><span>NOVA-9</span><span id="dRn">100</span></div><div class="ca-hp rv"><i id="dRb"></i></div></div></div>
  <div class="ca-say" id="dSay" style="margin:10px 0 12px 8px;"><b>NOVA-9</b><span id="dSayT">${esc(pick(TAUNT.open))}</span></div>
  <div class="ca-card" id="dCard"></div>
  <div class="ca-fighter" id="dMe" style="margin-top:14px;"><div class="ca-avatar" id="dAv">${esc(name.charAt(0) || 'Y')}</div><div class="who"><div class="ca-name"><span>${esc(name)}</span><span><span class="ca-pill combo" id="dCombo" style="display:none;"></span><span id="dMn">100</span></span></div><div class="ca-hp"><i id="dMb"></i></div></div></div>`);
  if(sbReady()) ai({ mode:'rival', event:'open' }, 3500).then(j=>{ if(j && j.line && S && S.duel && !S.duel.touched && !S.duel.over) dSay(j.line); });
  later(dRound, 1800);
}
function dSay(t){ const e = $('#dSayT'); if(e){ e.textContent = t; speak(t, 'nova'); } }
function dMood(m, ms){ const n = $('#dNova'); if(!n) return; n.innerHTML = novaSvg(m); if(m !== 'smug') later(()=>{ const x = $('#dNova'); if(x) x.innerHTML = novaSvg(S.duel && S.duel.rhp <= 30 ? 'angry' : 'smug'); }, ms || 1700); }
function dBars(){
  const D = S.duel, rb = $('#dRb'), mb = $('#dMb'); if(!rb) return;
  rb.style.width = Math.max(0, D.rhp) + '%'; mb.style.width = Math.max(0, D.hp) + '%'; $('#dRn').textContent = Math.max(0, Math.round(D.rhp)); $('#dMn').textContent = Math.max(0, Math.round(D.hp));
  mb.parentNode.classList.toggle('low', D.hp <= 30);
  const cb = $('#dCombo'); cb.style.display = D.combo >= 2 ? 'inline-block' : 'none'; cb.textContent = D.combo + 'x STREAK';
}
function dRound(){
  const D = S.duel; if(!D || D.over) return;
  if(D.i >= D.qs.length || D.hp <= 0 || D.rhp <= 0) return dEnd();
  const q = D.qs[D.i]; D.answered = false; D.left = D.L.secs; dBars();
  const topic = (TOPICS.find(t=>t[0] === q.t) || ['', ''])[1];
  $('#dCard').innerHTML = `<div class="ca-qtag">ROUND ${D.i+1} OF ${D.qs.length} · ${esc(topic.toUpperCase())}</div><div class="ca-q">${esc(q.q)}</div><div class="ca-opts">${q.o.map((o,i)=>`<button class="ca-opt" data-act="ans" data-i="${i}"><b>${'ABCD'[i]}</b><span>${esc(o)}</span></button>`).join('')}</div><div class="ca-timer"><i id="dTm"></i></div><div id="dWhy"></div>`;
  const tm = setInterval(()=>{ if(!S || !S.duel || D.answered){ clearInterval(tm); return; } D.left -= .1; const b = $('#dTm'); if(b) b.style.width = Math.max(0, D.left / D.L.secs * 100) + '%'; if(D.left <= 5 && Math.abs(D.left - Math.round(D.left)) < .06) sfx.tick(); if(D.left <= 0){ clearInterval(tm); dAnswer(-1); } }, 100);
  S.timers.push(tm);
}
function dAnswer(i){
  const D = S.duel; if(!D || D.answered || D.over) return; D.answered = true; D.touched = true;
  const q = D.qs[D.i], ok = i === q.a, timeout = i < 0, frac = clamp(D.left / D.L.secs, 0, 1);
  const rivalOk = Math.random() < D.L.acc;
  let said, mood = 'smug';
  const opts = S.root.querySelectorAll('.ca-opt'); opts.forEach((b,k)=>{ b.disabled = true; if(k === q.a) b.classList.add('right'); else if(k === i) b.classList.add('wrong'); });
  const rv = $('#dNova'), me = $('#dAv');
  if(ok){
    D.combo++; D.bestCombo = Math.max(D.bestCombo, D.combo); D.correct++;
    const dmg = Math.round(12 + 8*frac + Math.min(9, 3*(D.combo - 1))); D.rhp -= dmg; pop(rv, '-' + dmg, '#22E4FF'); hit(rv, '#22E4FF', 30); shakeEl(rv); sfx.good();
    if(S.fx){ const a = posOf(me), b = posOf(rv); S.fx.beam(a.x, a.y, b.x, b.y, '#22E4FF'); }
    mood = 'hurt'; said = D.combo >= 3 ? pick(TAUNT.combo) : frac > .7 ? pick(TAUNT.fast) : pick(TAUNT.pCorrect);
  } else { D.combo = 0; sfx.bad(); mood = 'laugh'; said = timeout ? pick(TAUNT.timeout) : pick(TAUNT.pWrong); }
  if(rivalOk){
    const dmg = Math.round(8 + Math.random()*6); D.hp -= dmg; setTimeout(()=>{ const m = $('#dMe'); if(!m) return; pop(me, '-' + dmg, '#FF4D6D'); hit(me, '#FF4D6D', 22); shakeEl(m); S.root.classList.add('ca-flashred'); setTimeout(()=>S.root.classList.remove('ca-flashred'), 520); sfx.hit(); if(S.fx){ const a = posOf(rv), b = posOf(me); S.fx.beam(a.x, a.y, b.x, b.y, '#FF4D6D'); } }, 380);
    if(!ok){ mood = 'laugh'; said = pick(TAUNT.rWin); }
  } else if(!ok){ said = pick(TAUNT.bothWrong); }
  if(D.rhp <= 30 && !D.lowSaid && D.rhp > 0){ D.lowSaid = true; said = pick(TAUNT.low); mood = 'angry'; }
  dBars(); dMood(mood); dSay(said);
  const last = D.i >= D.qs.length - 1 || D.hp <= 0 || D.rhp <= 0;
  $('#dWhy').innerHTML = `<div class="ca-why"><b>${ok ? 'Correct!' : timeout ? 'Out of time.' : 'Not quite.'}</b> ${esc(q.e)}</div><div class="ca-row"><button class="ca-btn" data-act="next">${last ? 'See the result' : 'Next round ▶'}</button></div>`;
}
function dEnd(){
  const D = S.duel; if(!D || D.over) return; D.over = true;
  const win = D.rhp <= 0 || (D.hp > 0 && D.rhp > 0 && D.hp > D.rhp), draw = !win && D.hp === D.rhp, lose = !win && !draw;
  const xp = D.correct * 10 + (win ? 30 : 0) + (D.cfg.daily ? 10 : 0), lvlUp = addXp(xp), P = S.prof;
  P.plays++; if(win) P.wins++; P.best = Math.max(P.best, Math.round(D.hp > 0 ? D.hp : 0)); if(D.cfg.daily){ P.dstreak = P.dlast === yesterday() ? P.dstreak + 1 : 1; P.dlast = dayNum(); } saveProf();
  const big = win ? 'VICTORY' : draw ? 'DRAW' : 'DEFEATED', col = win ? '#3DFF9A' : draw ? '#FFC53D' : '#FF4D6D';
  const line = win ? pick(TAUNT.win) : draw ? pick(TAUNT.draw) : pick(TAUNT.lose);
  if(win){ sfx.win(); if(S.fx){ const w = S.root.clientWidth; for(let k=0;k<6;k++) setTimeout(()=>{ S.fx && S.fx.burst(rnd(40,w-40), rnd(80,360), pick(['#22E4FF','#FF3DCB','#FFC53D','#3DFF9A']), 40); }, k*220); } }
  setInner(`${topBar(true)}<div class="ca-big" style="color:${col};">${big}</div>
  <div class="ca-hero"><div class="ca-nova-wrap">${novaSvg(win ? 'hurt' : draw ? 'shocked' : 'laugh')}</div><div class="ca-say"><b>NOVA-9</b><span id="eSay">${esc(line)}</span></div></div>
  <div class="ca-stats"><div><b>${D.correct}/${D.qs.length}</b><span>CORRECT</span></div><div><b>${Math.max(0, Math.round(D.hp))}</b><span>YOUR HP</span></div><div><b>${D.bestCombo}x</b><span>BEST STREAK</span></div></div>
  <p class="ca-sub" style="text-align:center;">+${xp} XP${lvlUp ? ' · LEVEL UP! You are now level ' + level(P.xp) : ''}${D.cfg.daily ? ' · Daily streak ' + P.dstreak + ' 🔥' : ''}</p>
  <div class="ca-row" style="justify-content:center;"><button class="ca-btn hot" data-act="again">⚔️ Rematch</button><button class="ca-btn" data-act="shareDuel">Share result</button><button class="ca-btn ghost" data-act="hub">Arena</button></div><div class="ca-lab" id="dNote" role="status" style="text-align:center;"></div>`);
  S.last = { win, draw, correct:D.correct, total:D.qs.length, hp:Math.max(0, Math.round(D.hp)), combo:D.bestCombo, daily:D.cfg.daily };
  if(sbReady()) ai({ mode:'rival', event: win ? 'verdict_win' : draw ? 'verdict_draw' : 'verdict_lose', stats:{ hp:Math.max(0, Math.round(D.hp)), correct:D.correct } }, 4500).then(j=>{ if(j && j.line){ const e = $('#eSay'); if(e){ e.textContent = j.line; speak(j.line, 'nova'); } } });
}

// ----------------------------------------------------------------------------------- Teach Mo
function renderTeachPick(){
  setInner(`${topBar(true)}<div class="ca-hero"><div class="ca-mo-wrap">${moSvg('confused')}</div><div class="ca-say"><b>MO THE MOLE</b>Help! I have a test tomorrow and I understood nothing. Pick something and teach me.</div></div>
  <div class="ca-lab">WHAT WILL YOU TEACH?</div><div class="ca-chips">${TOPICS.map(t=>`<button class="ca-chip" data-act="topic" data-v="${t[0]}">${esc(t[1])}</button>`).join('')}</div>
  <p class="ca-sub" style="margin-top:16px;">Explain in your own words, by typing or by voice. Mo asks questions until he truly gets it. The better you explain, the faster his understanding bar fills.</p><div class="ca-lab" id="tNote" role="status"></div>`);
}
function tAdd(who, text){ const c = $('#tChat'); if(!c) return null; const d = document.createElement('div'); d.className = 'ca-msg ' + who; d.textContent = text; c.appendChild(d); c.scrollTop = c.scrollHeight; return d; }
function tMood(m){ const w = $('#tMo'); if(w) w.innerHTML = moSvg(m); }
function teachStart(id){
  const label = MO_LABEL[id] || 'chemistry';
  S.teach = { id, label, msgs:[], und:0, turns:0, done:false, busy:false };
  setInner(`${topBar(true)}<div class="ca-hero" style="margin-bottom:10px;"><div class="ca-mo-wrap" id="tMo">${moSvg('confused')}</div><div style="flex:1; min-width:0;"><div class="ca-name"><span>MO UNDERSTANDS</span><span id="tPct">0%</span></div><div class="ca-meter"><i id="tBar"></i></div><div class="ca-sub" style="margin:8px 0 0; font-size:13px;">Topic: ${esc(label)}</div></div></div>
  <div class="ca-chat" id="tChat" aria-live="polite"></div>
  <div class="ca-input"><button class="ca-mic" id="tMic" data-act="mic" aria-label="Speak your explanation">🎤</button><textarea id="tIn" rows="2" maxlength="500" placeholder="Explain it to Mo in your own words…"></textarea><button class="ca-btn small" data-act="send">Send</button></div><div class="ca-lab" id="tNote" role="status" style="min-height:18px;"></div>`);
  const hello = `Hi! I tried to read about ${label} but I got totally lost. Can you explain it to me like I am 14?`;
  tAdd('mo', hello); speak(hello, 'mo');
  if(!sbReady()) note('Mo needs an internet connection to listen. Check your connection and come back.');
}
async function tSend(){
  const T = S.teach; if(!T || T.busy || T.done) return;
  const ta = $('#tIn'), text = ta ? ta.value.trim() : ''; if(!text) return;
  if(!sbReady()) return note('Mo cannot hear you without an internet connection.');
  T.busy = true; ta.value = ''; T.msgs.push({ role:'user', text }); tAdd('me', text); tMood('thinking');
  const dots = tAdd('mo', ''); dots.classList.add('dots'); dots.innerHTML = '<span></span><span></span><span></span>';
  const j = await ai({ mode:'teach', topic:T.id, messages:T.msgs.slice(-12) }, 16000);
  if(!S || S.teach !== T) return; dots.remove(); T.busy = false;
  if(!j){ T.msgs.pop(); const t2 = $('#tIn'); if(t2) t2.value = text; tMood('sad'); tAdd('mo', 'My brain buffered! Could you send that one more time?'); return; }
  T.msgs.push({ role:'bot', text:j.reply }); T.turns++; T.und = j.understanding; tAdd('mo', j.reply); speak(j.reply, 'mo');
  const bar = $('#tBar'), pct = $('#tPct'); if(bar) bar.style.width = T.und + '%'; if(pct) pct.textContent = T.und + '%';
  tMood(j.mistake ? 'confused' : j.done ? 'aha' : 'thinking'); sfx.good();
  if(j.done || T.turns >= 8) tFinish(!!j.done);
}
function tFinish(done){
  const T = S.teach; T.done = true; const xp = done ? 40 : 15, lvlUp = addXp(xp); S.prof.teach++; saveProf();
  if(done){ tMood('aha'); sfx.win(); if(S.fx){ const w = S.root.clientWidth; for(let k=0;k<5;k++) setTimeout(()=>S.fx && S.fx.burst(rnd(40,w-40), rnd(100,320), pick(['#FFC53D','#22E4FF','#3DFF9A']), 36), k*200); } }
  const box = document.createElement('div'); box.className = 'ca-card'; box.style.marginTop = '12px';
  box.innerHTML = `<b>${done ? 'Mo finally gets it!' : 'Good effort! Mo is nearly there.'}</b><div class="ca-sub" style="margin:6px 0 0;">${done ? 'Teaching is the best way to learn.' : 'Try again with a fresh explanation to fill his bar.'} +${xp} XP${lvlUp ? ' · LEVEL UP!' : ''}</div><div class="ca-row"><button class="ca-btn" data-act="shareTeach">Share this</button><button class="ca-btn ghost" data-act="teachPick">Teach another topic</button><button class="ca-btn ghost" data-act="hub">Arena</button></div>`;
  S.inn.appendChild(box); S.last = { label:T.label, und:T.und, done };
}

let micState = null;
async function toggleMic(){
  if(S.mic){ try{ S.mic.rec.stop(); }catch(e){} return; }
  if(!navigator.mediaDevices || !window.MediaRecorder) return note('Voice recording is not available here. Please type your explanation.');
  if(!sbReady()) return note('Voice needs an internet connection.');
  let stream; try{ stream = await navigator.mediaDevices.getUserMedia({ audio:true }); }catch(e){ return note('Please allow the microphone, then tap the mic again.'); }
  const mt = ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'].find(t=>window.MediaRecorder.isTypeSupported(t));
  const rec = mt ? new MediaRecorder(stream, { mimeType:mt }) : new MediaRecorder(stream), parts = [];
  S.mic = { rec, stream }; const mic = $('#tMic'); if(mic) mic.classList.add('rec'); note('Listening… tap the mic again when you finish.');
  rec.ondataavailable = e=>{ if(e.data.size) parts.push(e.data); };
  rec.onstop = async ()=>{
    stream.getTracks().forEach(t=>t.stop()); if(S) S.mic = null; const m2 = S && $('#tMic'); if(m2) m2.classList.remove('rec');
    const blob = new Blob(parts, { type: rec.mimeType || mt || 'audio/webm' });
    if(blob.size < 1500) return note('I could not hear anything. Try again.');
    note('Turning your voice into text…');
    try{
      const b64 = await new Promise((res,rej)=>{ const fr = new FileReader(); fr.onload = ()=>res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });
      const r = await sbOf().functions.invoke('voice-to-text', { body:{ audio:b64, mime:blob.type || 'audio/webm', lang:'en' } });
      if(r && r.data && r.data.text){ const ta = $('#tIn'); if(ta) ta.value = ((ta.value ? ta.value + ' ' : '') + r.data.text).trim(); note('Check the words, then press Send.'); } else note('No words found. Try again or type it.');
    }catch(e){ note('Your voice could not be turned into text. Please type it.'); }
  };
  rec.start();
}
function stopMic(){ if(S && S.mic){ try{ S.mic.rec.onstop = null; S.mic.rec.stop(); S.mic.stream.getTracks().forEach(t=>t.stop()); }catch(e){} S.mic = null; } }

// ----------------------------------------------------------------------------------- Case Files
const CASE = {
  title:'The Midnight Spill',
  intro:'Monday, 6:40 a.m. at a school science lab in Kumasi. Someone left a mess: a blue puddle under the bench, a white smear on the floor and a strip of grey metal by the sink. The headteacher wants answers before assembly. You are the lead investigator, and chemistry is your only witness.',
  scenes:[
    { face:'🧑‍🔬', who:'Kojo, lab technician', say:'I found the puddle at dawn. I dropped a few drops of sodium hydroxide into a sample of it, and a pale blue solid appeared. I have no idea what that means!', q:'What does a pale blue precipitate with NaOH tell you?', o:['Copper(II) ions are present','Sodium ions are present','Chloride ions are present','The solution is neutral'], a:0, clue:'Cu²⁺ in the spill', ok:'Yes! Copper(II) hydroxide is a pale blue solid, so the spill contains Cu²⁺.', bad:'Think about which metal ions make coloured hydroxide precipitates. Blue is the signature of one of them.' },
    { face:'👩‍🏫', who:'Dr. Ama, chemistry teacher', say:'I tested another sample with barium chloride solution and got a white precipitate. It did not dissolve when I added dilute hydrochloric acid.', q:'Which ion does that result show?', o:['Chloride, Cl⁻','Sulfate, SO₄²⁻','Carbonate, CO₃²⁻','Nitrate, NO₃⁻'], a:1, clue:'SO₄²⁻ in the spill', ok:'Correct! Barium sulfate is insoluble even in acid, which separates it from barium carbonate.', bad:'A white precipitate that survives acid cannot be a carbonate, because carbonates fizz and dissolve in acid.' },
    { face:'🧔', who:'Mr. Yaw, storekeeper', say:'So the spill holds both of those ions. In my store, exactly one bottle contains both. I only need you to say its name.', q:'Which compound contains the two ions you found?', o:['Sodium sulfate','Copper(II) chloride','Copper(II) sulfate','Zinc sulfate'], a:2, clue:'The chemical was CuSO₄', ok:'Copper(II) sulfate, CuSO₄: blue crystals that give a blue solution.', bad:'You need copper AND sulfate in the same compound. Check each option for both.' },
    { face:'🔍', who:'You, at the sink', say:'The grey metal strip is zinc. Its surface is crusted with a reddish-brown solid, and the blue colour of the puddle is fading around it.', q:'Why is the zinc coated in a reddish-brown solid?', o:['Zinc has rusted','Zinc displaced copper from the solution','Zinc reacted with the air','Zinc dissolved to form zinc oxide'], a:1, clue:'A zinc and copper(II) sulfate displacement demo', ok:'Zinc is more reactive than copper, so Zn + CuSO₄ → ZnSO₄ + Cu. The copper settles as a red-brown coating.', bad:'Zinc and copper(II) ions are both present. Which one is higher in the reactivity series?' }
  ],
  suspects:[
    { face:'🧑‍🔬', n:'Kojo', d:'Planned a magnesium and hydrochloric acid bubbling demo.', ok:false, why:'Magnesium and HCl give hydrogen bubbles and no copper. Your clues point somewhere else.' },
    { face:'👩‍🏫', n:'Dr. Ama', d:'Planned a reactivity-series demo with zinc and copper(II) sulfate.', ok:true, why:'' },
    { face:'🧔', n:'Mr. Yaw', d:'Was counting sodium chloride and silver nitrate for next week.', ok:false, why:'Silver nitrate and sodium chloride give white silver chloride, not a blue copper solution.' }
  ],
  ending:'Dr. Ama laughs with relief. She set up her zinc and copper(II) sulfate demo on Sunday night to save time, and the tray tipped over when the cleaner moved the bench. No harm done. The headteacher is delighted: every clue was chemistry, and you solved it before assembly.'
};
function renderCaseIntro(){
  S.kase = { i:0, clues:[], tries:0 };
  const done = S.prof.cases.indexOf('c1') >= 0;
  setInner(`${topBar(true)}<div class="ca-lab">CASE FILE 001${done ? ' · SOLVED ✓' : ''}</div><div class="ca-h2">${esc(CASE.title)}</div><div class="ca-card"><p style="margin:0; line-height:1.6;">${esc(CASE.intro)}</p></div>
  <div class="ca-row"><button class="ca-btn" data-act="caseNext">🕵️ ${done ? 'Replay the case' : 'Open the case'}</button><button class="ca-btn ghost" data-act="hub">Back</button></div>`);
}
function caseScene(){
  const K = S.kase, sc = CASE.scenes[K.i];
  if(!sc) return caseAccuse();
  setInner(`${topBar(true)}<div class="ca-lab">CLUE ${K.i+1} OF ${CASE.scenes.length}</div>
  <div class="ca-card"><div class="ca-scene"><div class="ca-face">${sc.face}</div><div><b>${esc(sc.who)}</b><p style="margin:6px 0 0; line-height:1.55;">${esc(sc.say)}</p></div></div></div>
  <div class="ca-q">${esc(sc.q)}</div><div class="ca-opts" id="kOpts">${sc.o.map((o,i)=>`<button class="ca-opt" data-act="caseOpt" data-i="${i}"><b>${'ABCD'[i]}</b><span>${esc(o)}</span></button>`).join('')}</div>
  <div id="kMsg"></div><div class="ca-clues">${K.clues.map(c=>`<span class="ca-clue">🔎 ${esc(c)}</span>`).join('')}</div>`);
}
function caseAnswer(i, btn){
  const K = S.kase, sc = CASE.scenes[K.i]; if(!sc || K.locked) return;
  if(i === sc.a){
    K.locked = true; K.clues.push(sc.clue); btn.classList.add('right'); sfx.good(); hit(btn, '#3DFF9A', 24); S.root.querySelectorAll('.ca-opt').forEach(b=>b.disabled = true);
    $('#kMsg').innerHTML = `<div class="ca-why"><b>Clue found.</b> ${esc(sc.ok)}</div><div class="ca-row"><button class="ca-btn" data-act="caseNext">${K.i === CASE.scenes.length - 1 ? 'Name the culprit ▶' : 'Next clue ▶'}</button></div>`;
  } else { btn.classList.add('wrong'); btn.disabled = true; sfx.bad(); K.tries++; $('#kMsg').innerHTML = `<div class="ca-why"><b>Not quite.</b> ${esc(sc.bad)}</div>`; }
}
function caseAccuse(){
  setInner(`${topBar(true)}<div class="ca-lab">THE ACCUSATION</div><div class="ca-h2">Who left the spill?</div><div class="ca-clues" style="margin:0 0 14px;">${S.kase.clues.map(c=>`<span class="ca-clue">🔎 ${esc(c)}</span>`).join('')}</div>
  <div class="ca-opts">${CASE.suspects.map((s,i)=>`<button class="ca-opt" data-act="accuse" data-i="${i}"><b>${s.face}</b><span><strong>${esc(s.n)}</strong><br><span style="font-weight:400; font-size:13.5px;">${esc(s.d)}</span></span></button>`).join('')}</div><div id="kMsg"></div>`);
}
function caseAccuseOne(i, btn){
  const s = CASE.suspects[i];
  if(!s.ok){ btn.classList.add('wrong'); btn.disabled = true; sfx.bad(); $('#kMsg').innerHTML = `<div class="ca-why"><b>Not them.</b> ${esc(s.why)}</div>`; return; }
  btn.classList.add('right'); sfx.win(); const first = S.prof.cases.indexOf('c1') < 0; if(first) S.prof.cases.push('c1'); const xp = first ? 60 : 10, lvlUp = addXp(xp); saveProf();
  if(S.fx){ const w = S.root.clientWidth; for(let k=0;k<5;k++) setTimeout(()=>S.fx && S.fx.burst(rnd(40,w-40), rnd(100,360), pick(['#FFC53D','#FF3DCB','#22E4FF']), 36), k*200); }
  S.last = { kase:true };
  setInner(`${topBar(true)}<div class="ca-big" style="color:#FFC53D;">CASE SOLVED</div><div class="ca-card"><div class="ca-scene"><div class="ca-face">👩‍🏫</div><div><b>Dr. Ama</b><p style="margin:6px 0 0; line-height:1.55;">${esc(CASE.ending)}</p></div></div></div>
  <p class="ca-sub" style="text-align:center; margin-top:12px;">+${xp} XP${lvlUp ? ' · LEVEL UP!' : ''}${S.kase.tries ? '' : ' · Flawless, no wrong guesses!'}</p><div class="ca-row" style="justify-content:center;"><button class="ca-btn" data-act="shareCase">Share this</button><button class="ca-btn ghost" data-act="hub">Arena</button></div><div class="ca-lab" id="lNote" role="status" style="text-align:center;"></div>`);
}

// ----------------------------------------------------------------------------------- Virtual Lab
const RG = {
  hcl:{ n:'Hydrochloric acid', f:'HCl', c:'#d9efff' }, naoh:{ n:'Sodium hydroxide', f:'NaOH', c:'#e8f1ff' }, agno3:{ n:'Silver nitrate', f:'AgNO₃', c:'#e9eaf4' }, nacl:{ n:'Sodium chloride', f:'NaCl', c:'#dfeaf5' },
  cuso4:{ n:'Copper(II) sulfate', f:'CuSO₄', c:'#2f8fff' }, pbno3:{ n:'Lead(II) nitrate', f:'Pb(NO₃)₂', c:'#e5eaf2' }, ki:{ n:'Potassium iodide', f:'KI', c:'#eef0f5' }, h2o2:{ n:'Hydrogen peroxide', f:'H₂O₂', c:'#e3f3ff' }, vin:{ n:'Vinegar', f:'CH₃COOH', c:'#f6e8c8' },
  mg:{ n:'Magnesium ribbon', f:'Mg', c:'#b9bcc4', s:1 }, zn:{ n:'Zinc granules', f:'Zn', c:'#a9b0b8', s:1 }, nahco3:{ n:'Baking soda', f:'NaHCO₃', c:'#f3f3f3', s:1 }, mno2:{ n:'Manganese dioxide', f:'MnO₂', c:'#3a3a3a', s:1 }
};
const RX = {
  'hcl+naoh':{ fx:'heat', after:'#e6f2ff', title:'Neutralisation', see:'Nothing changes colour, but the beaker warms up.', eq:'HCl + NaOH → NaCl + H₂O', why:'An acid and a base react to form a salt and water. Forming new bonds releases energy, so the reaction is exothermic.', tip:'Competition favourite: strong acid + strong base ends at pH 7 at the equivalence point.' },
  'agno3+nacl':{ fx:'ppt', pc:'#ffffff', after:'#e8eef6', title:'Silver chloride precipitate', see:'A thick white solid forms and sinks.', eq:'Ag⁺(aq) + Cl⁻(aq) → AgCl(s)', why:'Silver chloride is insoluble, so the two ions lock together as a solid. This is the classic test for chloride ions.', tip:'AgCl dissolves in dilute ammonia, which helps separate it from AgBr and AgI.' },
  'cuso4+naoh':{ fx:'ppt', pc:'#6fb7ff', after:'#cfe6ff', title:'Copper(II) hydroxide precipitate', see:'A pale blue solid appears and settles.', eq:'Cu²⁺(aq) + 2OH⁻(aq) → Cu(OH)₂(s)', why:'Copper(II) hydroxide is insoluble. Pale blue is the signature of copper(II).', tip:'Add excess ammonia instead and the solid dissolves into a deep blue complex ion.' },
  'hcl+mg':{ fx:'bubbles', n:36, after:'#e6f2ff', heat:1, title:'Metal and acid', see:'Fast fizzing. The magnesium shrinks and the beaker warms.', eq:'Mg + 2HCl → MgCl₂ + H₂', why:'Magnesium is more reactive than hydrogen, so it pushes hydrogen out of the acid as gas.', tip:'Test the gas: a lit splint gives a squeaky pop for hydrogen.' },
  'hcl+zn':{ fx:'bubbles', n:18, after:'#e6f2ff', title:'Zinc and acid', see:'Slower, steady bubbles form on the zinc.', eq:'Zn + 2HCl → ZnCl₂ + H₂', why:'Zinc is less reactive than magnesium, so the bubbling is gentler. Rate tells you about reactivity.', tip:'Compare Mg, Zn and Fe with acid to build the reactivity series.' },
  'cuso4+zn':{ fx:'fade', pc:'#b5532a', after:'#e3edf8', title:'Displacement', see:'The blue colour fades while a red-brown coating forms on the zinc.', eq:'Zn + CuSO₄ → ZnSO₄ + Cu', why:'Zinc is more reactive than copper, so zinc atoms give electrons to Cu²⁺ ions, and copper metal is deposited.', tip:'Reaction rule: a more reactive metal displaces a less reactive one from its salt.' },
  'cuso4+mg':{ fx:'fade', pc:'#b5532a', after:'#e3edf8', heat:1, title:'Displacement', see:'The blue fades, copper coats the magnesium and the beaker warms.', eq:'Mg + CuSO₄ → MgSO₄ + Cu', why:'Magnesium sits above copper in the reactivity series, so it displaces copper. Electrons move from Mg to Cu²⁺.', tip:'The bigger the reactivity gap, the more heat is released.' },
  'nahco3+vin':{ fx:'bubbles', n:46, foam:1, after:'#f6efe0', title:'Acid and carbonate', see:'Foaming fizz fills the beaker.', eq:'NaHCO₃ + CH₃COOH → CH₃COONa + H₂O + CO₂', why:'The weak acid reacts with hydrogencarbonate and releases carbon dioxide gas. The cold feeling is the reaction absorbing heat.', tip:'Bubbling CO₂ through limewater turns it milky: the test for carbon dioxide.' },
  'hcl+nahco3':{ fx:'bubbles', n:50, foam:1, after:'#e6f2ff', title:'Acid and carbonate', see:'Vigorous fizzing.', eq:'NaHCO₃ + HCl → NaCl + H₂O + CO₂', why:'A stronger acid releases CO₂ faster than vinegar does. Compare the speed with vinegar.', tip:'Stronger acid means faster reaction because more H⁺ is available.' },
  'ki+pbno3':{ fx:'ppt', pc:'#ffd400', after:'#fff6b8', spark:1, title:'Golden rain', see:'Bright yellow crystals fall like glitter.', eq:'Pb²⁺(aq) + 2I⁻(aq) → PbI₂(s)', why:'Lead(II) iodide is insoluble and bright yellow. It dissolves in hot water and re-crystallises as golden flakes on cooling.', tip:'Virtual only: lead compounds are toxic and are never handled without a teacher.' },
  'h2o2+mno2':{ fx:'foam', after:'#f0f0f0', heat:1, title:'Catalysed decomposition', see:'Oxygen gas bursts out as a thick foam.', eq:'2H₂O₂ → 2H₂O + O₂ (MnO₂ catalyst)', why:'Manganese dioxide lowers the activation energy so hydrogen peroxide breaks down quickly. The catalyst is not used up.', tip:'A glowing splint relights in oxygen: the test for O₂.' }
};
function renderLab(){
  S.lab = { a:null, b:null, busy:false };
  const found = S.prof.labFound.length, total = Object.keys(RX).length;
  setInner(`${topBar(true)}<div class="ca-lab" style="margin-top:0;">VIRTUAL LAB · ${found} OF ${total} REACTIONS DISCOVERED</div><div class="ca-sub" style="margin:0 0 4px;">Tap one chemical, then another, and watch what happens. Nothing here can hurt you.</div>
  <div class="ca-beaker"><div class="ca-glass" id="lGlass"><div class="ca-liq" id="lLiq"></div><div class="ca-layer" id="lLayer"></div><div class="ca-foam" id="lFoam"></div><div class="ca-heat" id="lHeat" style="display:none;"><i></i><i></i><i></i></div><div class="ca-flash" id="lFlash"></div></div>
  <svg viewBox="0 0 190 230" aria-hidden="true"><path d="M20 20 H170 M26 20 V196 Q26 218 48 218 H142 Q164 218 164 196 V20" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 60 V180" stroke="rgba(255,255,255,.35)" stroke-width="5" stroke-linecap="round"/><g stroke="rgba(255,255,255,.6)" stroke-width="2"><path d="M26 80 h12 M26 110 h12 M26 140 h12 M26 170 h12"/></g></svg></div>
  <div class="ca-shelf" id="lShelf">${Object.keys(RG).map(k=>`<button class="ca-rg" data-act="rg" data-v="${k}" style="--c:${RG[k].c}"><i></i>${esc(RG[k].f)}</button>`).join('')}</div>
  <div class="ca-row" style="justify-content:center; margin-top:0;"><button class="ca-btn ghost small" data-act="labReset">Empty the beaker</button></div>
  <div class="ca-card ca-log" id="lLog"><span style="color:#9FB0DD;">Pick your first chemical from the shelf.</span></div><div class="ca-lab" id="lNote" role="status"></div>`);
}
function labLog(html){ const l = $('#lLog'); if(l) l.innerHTML = html; }
function labAdd(id){
  const L = S.lab; if(!L || L.busy) return; const r = RG[id]; if(!r) return;
  if(L.b) return labLog('<b>The beaker is full.</b> Press “Empty the beaker” to start a new experiment.');
  if(L.a === id) return labLog('<b>Already in the beaker.</b> Try a different chemical for the second one.');
  const liq = $('#lLiq'), glass = $('#lGlass');
  if(!L.a){
    L.a = id;
    if(!r.s){ liq.style.setProperty('--lq', r.c); liq.style.height = '46%'; } else { liq.style.setProperty('--lq', '#d9efff'); liq.style.height = '30%'; }
    dropSolid(glass, r); sfx.tick(); labLog(`<b>${esc(r.n)}</b> (${r.f}) is in the beaker. Now add a second chemical.`); return;
  }
  L.b = id; L.busy = true;
  const first = RG[L.a];
  if(r.s && !first.s){ /* solid joins the liquid */ } else if(!r.s && first.s){ liq.style.setProperty('--lq', r.c); liq.style.height = '48%'; } else if(!r.s && !first.s){ liq.style.height = '60%'; }
  dropSolid(glass, r); sfx.tick();
  const key = [L.a, id].sort().join('+'), rx = RX[key];
  setTimeout(()=>{ L.busy = false; if(!S || S.lab !== L) return; rx ? labReact(rx, key, glass) : labLog(`<b>No visible reaction.</b> ${esc(first.n)} and ${esc(r.n)} sit together without a clear change. Some mixtures simply do not react, and that is a result too. Try another pair!`); }, 700);
}
function dropSolid(glass, r){ if(!r.s) return; for(let k=0;k<7;k++){ const d = document.createElement('div'); d.style.cssText = `position:absolute; bottom:${rnd(0,8)}px; left:${rnd(10,80)}%; width:${rnd(8,16)}px; height:${rnd(5,9)}px; background:${r.c}; border-radius:2px; z-index:2; transform:rotate(${rnd(-25,25)}deg);`; d.className = 'ca-solidbit'; glass.appendChild(d); } }
function labReact(rx, key, glass){
  const liq = $('#lLiq'), layer = $('#lLayer'), foam = $('#lFoam'), heat = $('#lHeat'), fl = $('#lFlash');
  liq.style.setProperty('--lq', rx.after);
  const bubbles = n=>{ for(let k=0;k<n;k++){ const b = document.createElement('div'), s = rnd(5,15); b.className = 'ca-bub'; b.style.cssText = `left:${rnd(6,88)}%; width:${s}px; height:${s}px; --d:${rnd(1.4,3)}s; animation-delay:${rnd(0,2.2)}s;`; glass.appendChild(b); setTimeout(()=>b.remove(), 5600); } };
  if(rx.fx === 'bubbles'){ bubbles(rx.n || 30); if(rx.foam){ foam.style.height = '70%'; setTimeout(()=>foam.style.height = '30%', 2600); } }
  if(rx.fx === 'ppt'){ for(let k=0;k<46;k++){ const p = document.createElement('div'); p.className = 'ca-ppt'; p.style.cssText = `left:${rnd(6,90)}%; --pc:${rx.pc}; --d:${rnd(1.2,2.6)}s; --fall:${rnd(120,170)}px; animation-delay:${rnd(0,1.2)}s; ${rx.spark ? 'box-shadow:0 0 6px #fff;' : ''}`; glass.appendChild(p); setTimeout(()=>p.remove(), 4200); } layer.style.setProperty('--pc', rx.pc); setTimeout(()=>layer.style.height = '20%', 1500); }
  if(rx.fx === 'fade'){ layer.style.setProperty('--pc', rx.pc); setTimeout(()=>layer.style.height = '13%', 400); bubbles(8); }
  if(rx.fx === 'foam'){ bubbles(26); foam.style.height = '108%'; fl.classList.add('go'); }
  if(rx.fx === 'heat' || rx.heat){ heat.style.display = 'flex'; setTimeout(()=>{ const h = $('#lHeat'); if(h) h.style.display = 'none'; }, 4200); }
  hit(glass, rx.pc || '#22E4FF', 22); sfx.good();
  const first = S.prof.labFound.indexOf(key) < 0; let bonus = '';
  if(first){ S.prof.labFound.push(key); addXp(5); bonus = ` <span class="ca-pill combo">NEW DISCOVERY +5 XP</span>`; saveProf(); }
  labLog(`<div><b>${esc(rx.title)}</b>${bonus}</div><div style="margin-top:6px;"><b>You see:</b> ${esc(rx.see)}</div><div class="ca-eq">${esc(rx.eq)}</div><div><b>Why:</b> ${esc(rx.why)}</div><div style="margin-top:6px; color:#FFE3A1;"><b>Competition tip:</b> ${esc(rx.tip)}</div>`);
  const total = Object.keys(RX).length, c = S.prof.labFound.length, hd = S.root.querySelector('.ca-lab'); if(hd) hd.textContent = `VIRTUAL LAB · ${c} OF ${total} REACTIONS DISCOVERED`;
}
function labReset(){
  if(!S.lab) return; S.lab = { a:null, b:null, busy:false };
  const g = $('#lGlass'); if(!g) return; g.querySelectorAll('.ca-bub,.ca-ppt,.ca-solidbit').forEach(n=>n.remove());
  const liq = $('#lLiq'); liq.style.height = '0'; $('#lLayer').style.height = '0'; $('#lFoam').style.height = '0'; $('#lHeat').style.display = 'none';
  labLog('<span style="color:#9FB0DD;">Beaker emptied. Pick your first chemical from the shelf.</span>');
}

// ----------------------------------------------------------------------------------- events + public API
function onClick(e){
  const b = e.target.closest ? e.target.closest('[data-act]') : null; if(!b || !S || !S.root.contains(b)) return;
  const a = b.dataset.act, v = b.dataset.v;
  switch(a){
    case 'hub': return go('hub');
    case 'close': return api.unmount(true);
    case 'snd': SND.on = !SND.on; b.textContent = SND.on ? '🔊' : '🔇'; if(SND.on) sfx.good(); else { try{ window.speechSynthesis && window.speechSynthesis.cancel(); }catch(x){} } return;
    case 'duelSetup': case 'teachPick': case 'caseIntro': case 'lab': return go(a);
    case 'daily': return go('duel', { focus:'', level:'pro', daily:true });
    case 'fight': return go('duel', S.cfg);
    case 'again': return go('duel', S.duel ? Object.assign({}, S.duel.cfg, { daily:false }) : S.cfg);
    case 'focus': S.cfg.focus = v; return renderDuelSetup();
    case 'level': S.cfg.level = v; return renderDuelSetup();
    case 'ans': return dAnswer(+b.dataset.i);
    case 'next': if(S.duel){ S.duel.i++; dRound(); } return;
    case 'shareDuel': { const L = S.last || {}; return shareCard({ big:L.win ? 'VICTORY' : L.draw ? 'DRAW' : 'REMATCH?', color:L.win ? '#3DFF9A' : L.draw ? '#FFC53D' : '#FF4D6D', title: L.win ? 'I beat NOVA-9 in a chemistry duel' : 'NOVA-9 and I are still fighting', lines:[`${L.correct} of ${L.total} correct`, `${L.hp} HP left`, `Best streak: ${L.combo}x`] }, L.win ? `I just beat NOVA-9 in the Chem Arena with ${L.hp} HP left! Can you? ${arenaUrl()}` : `NOVA-9 got me this time. Think you can beat the rival robot? ${arenaUrl()}`, note); }
    case 'live': if(S.opts.onLive) S.opts.onLive(); return;
    case 'invite': return inviteFriend(note);
    case 'topic': return go('teach', v);
    case 'send': return tSend();
    case 'mic': return toggleMic();
    case 'shareTeach': { const L = S.last || {}; return shareCard({ big:'MO GETS IT', color:'#22E4FF', title:'I taught Mo the Mole', lines:[L.label || 'chemistry', `Understanding: ${L.und || 0}%`] }, `I just taught Mo the Mole ${L.label || 'chemistry'} in the Chem Arena. Try it: ${arenaUrl()}`, note); }
    case 'caseNext': if(S.screen === 'caseIntro'){ S.screen = 'case'; S.kase.i = 0; } else S.kase.i++; S.kase.locked = false; return caseScene();
    case 'caseOpt': return caseAnswer(+b.dataset.i, b);
    case 'accuse': return caseAccuseOne(+b.dataset.i, b);
    case 'shareCase': return shareCard({ big:'CASE SOLVED', color:'#FFC53D', title:'I cracked “The Midnight Spill”', lines:['Solved with real chemistry clues', `${S.kase.clues.length} clues found`] }, `I just solved a chemistry mystery in the Chem Arena. Can you crack it? ${arenaUrl()}`, note);
    case 'rg': return labAdd(v);
    case 'labReset': return labReset();
  }
}
function onKey(e){ if(e.target && e.target.id === 'tIn' && e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); tSend(); } }

const api = {
  mount(el, opts){
    api.unmount(); ensureCss();
    const root = document.createElement('div'); root.className = 'ca'; root.innerHTML = '<canvas class="ca-fx"></canvas><div class="ca-in"></div>';
    el.innerHTML = ''; el.appendChild(root);
    S = { el, root, inn:root.querySelector('.ca-in'), opts:opts || {}, timers:[], cfg:{ focus:'', level:'pro' }, prof:loadProf(opts || {}) };
    S.fx = makeFx(root.querySelector('.ca-fx'), root);
    root.addEventListener('click', onClick); root.addEventListener('keydown', onKey);
    go('hub'); return api;
  },
  unmount(fromClose){
    if(!S) return; const o = S.opts, el = S.el, ov = S.overlay; clearTimers(); if(S.fx) S.fx.stop(); const closing = S; S = null;
    if(ov){ ov.remove(); document.documentElement.style.overflow = ''; } else if(el && closing.root.parentNode === el) el.innerHTML = '';
    if(fromClose && o.onClose) try{ o.onClose(); }catch(e){}
  },
  openOverlay(opts){
    opts = Object.assign({}, opts || {}, { ctx:'site' });
    const ov = document.createElement('div'); ov.className = 'ca-ov'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-label','Chem Arena'); document.body.appendChild(ov); document.documentElement.style.overflow = 'hidden';
    api.mount(ov, opts); S.overlay = ov;
    const esc1 = ev=>{ if(ev.key === 'Escape'){ document.removeEventListener('keydown', esc1); if(S && S.overlay === ov) api.unmount(true); } }; document.addEventListener('keydown', esc1);
    return api;
  },
  isOpen:()=> !!S,
  nova:(m)=> novaSvg(m || 'smug'),
  mo:(m)=> moSvg(m || 'confused')
};
window.ChemArena = api;
})();
