// roadmap v3: the Chemistry Competition Prep roadmap (10 topic sections released on a shared calendar).
//   overview      (any member)       sections, dates, my progress, streak, XP and level (staff also get reported-question counts)
//   practice      (any member)       a set of questions for one section (mode 'daily' = Daily 5); answers are never sent
//   answer        (any member)       mark one answer, record the attempt, return the explanation
//   report        (any member)       flag a question as wrong (hidden from practice until reviewed) and push-notify the
//                                    student's coordinator, the question's owner and the ambassador
//   board         (any member)       this week's XP ranking for the member's group
//   q_add / q_list / q_set             (coordinator, ambassador)   author and review questions by hand
//   generate                           (coordinator, ambassador)   v3: writes AI DRAFTS and returns them. Nothing is saved.
//   q_post_batch                       (coordinator, ambassador)   v3: saves the drafts the staff member reviewed and kept
//   progress      (coordinator, ambassador)   per-student numbers for one section
//   schedule_set / schedule_shift       (ambassador)   release dates, daily reminder switch
// Secrets: GEMINI_API_KEY (for generate). For report pushes: ONESIGNAL_REST_API_KEY and AMBASSADOR_EXTERNAL_IDS
// (the same secrets send-push uses). Optional: ONESIGNAL_APP_ID, PORTAL_URL. Needs a signed-in user (verify_jwt).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AMB = 'edmondeddah999@gmail.com';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const SECTIONS = [
  { id: 'quant', title: 'Quantitative Chemistry', start: '2026-10-05', end: '2026-10-18', focus: 'moles and stoichiometry, limiting reagent and percentage yield, concentration and dilution, ideal gas equation and gas laws, empirical and molecular formulae, titration calculations, units and significant figures' },
  { id: 'bonding', title: 'Structure and Bonding', start: '2026-10-19', end: '2026-10-28', focus: 'atomic structure and periodic trends, electron configurations, ionic, covalent and metallic bonding, VSEPR shapes and hybridisation, bond polarity and intermolecular forces, basic molecular orbital ideas' },
  { id: 'thermo', title: 'Thermodynamics', start: '2026-10-29', end: '2026-11-07', focus: 'enthalpy changes and Hess\'s law, calorimetry, bond enthalpies, Born-Haber cycles, entropy, Gibbs free energy and spontaneity' },
  { id: 'equil', title: 'Equilibrium', start: '2026-11-08', end: '2026-11-17', focus: 'Kc and Kp, ICE tables, Le Chatelier\'s principle, heterogeneous equilibria, link between delta G and K, temperature dependence of K' },
  { id: 'acidbase', title: 'Acids, Bases and Solubility', start: '2026-11-18', end: '2026-11-27', focus: 'pH and pOH, strong and weak acids and bases, buffers, titration curves and indicators, Ksp and solubility, common-ion effect, salt hydrolysis' },
  { id: 'kinetics', title: 'Kinetics and Research Paper Prep', start: '2026-11-28', end: '2026-12-07', focus: 'rate laws and reaction order, integrated rate laws and half-life, Arrhenius equation, reaction mechanisms and rate-determining step, catalysis; plus reading experimental data, graphs, error analysis and the structure of a research paper' },
  { id: 'electro', title: 'Electrochemistry', start: '2026-12-08', end: '2026-12-17', focus: 'balancing redox reactions, galvanic and electrolytic cells, standard electrode potentials, Nernst equation, Faraday\'s laws of electrolysis, batteries and corrosion' },
  { id: 'organic', title: 'Organic Reactivity and Research Prep', start: '2026-12-18', end: '2026-12-27', focus: 'functional groups and IUPAC naming, substitution and elimination, addition reactions, carbonyl chemistry, reaction mechanisms and curly arrows, reagents and synthesis planning; plus experimental design and methodology in a research project' },
  { id: 'stereo', title: 'Stereochemistry and Aromaticity', start: '2026-12-28', end: '2027-01-06', focus: 'chirality, R/S and E/Z assignment, enantiomers and diastereomers, conformations, optical activity, aromaticity and Huckel\'s rule, electrophilic aromatic substitution and directing effects' },
  { id: 'spectro', title: 'Spectroscopy and Coordination Chemistry', start: '2027-01-07', end: '2027-01-16', focus: 'IR, NMR, mass spectrometry and UV-visible spectroscopy for structure determination; ligands, coordination numbers and geometries, crystal field theory, colour and magnetism of complexes, isomerism and naming of complexes' },
];
const TOPIC_IDS = SECTIONS.map((s) => s.id);
const TIERS = ['foundation', 'competition', 'olympiad'];
const PRACTICE_GOAL = 30; // distinct practice questions solved (on top of the coordinator set) to complete a section
const DAILY_GOAL = 5;
const LEVELS: [string, number][] = [['Bronze', 0], ['Silver', 300], ['Gold', 800], ['Platinum', 1500]];

function emailFrom(req: Request): string {
  try {
    const t = (req.headers.get('authorization') || '').replace(/^Bearer /i, '');
    const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return String(p.email || '').toLowerCase();
  } catch { return ''; }
}
async function who(email: string) {
  if (!email) return null;
  if (email === AMB) return { role: 'ambassador', id: 'ambassador', name: 'Ambassador', coordinatorId: null as string | null };
  const { data } = await admin.from('ichc_kv').select('key,value').in('key', ['roster:students', 'roster:coordinators']);
  for (const row of data || []) {
    const hit = (Array.isArray(row.value) ? row.value : []).find((e: any) => String(e.email || '').toLowerCase() === email);
    if (hit) return { role: row.key === 'roster:students' ? 'student' : 'coordinator', id: String(hit.id), name: String(hit.name || ''), coordinatorId: hit.coordinatorId || null };
  }
  return null;
}
type Me = NonNullable<Awaited<ReturnType<typeof who>>>;

const clip = (t: unknown, n: number) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const clipKeep = (t: unknown, n: number) => String(t ?? '').replace(/\r/g, '').trim().slice(0, n);
const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z'));
const todayStr = () => new Date().toISOString().slice(0, 10);
const shiftDate = (s: string, days: number) => new Date(Date.parse(s + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
function parseNum(v: unknown): number {
  const s = String(v ?? '').trim().replace(/,/g, '').replace(/[x×]\s*10\s*\^?\s*(-?\d+)/i, 'e$1');
  const m = s.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/i);
  return m ? parseFloat(m[0]) : NaN;
}
function shuffle<T>(a: T[]): T[] { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

// ---- web push (OneSignal). Same app and secrets as the send-push function. A failed push never fails the request. ----
const OS_APP = Deno.env.get('ONESIGNAL_APP_ID') ?? 'c711029f-212c-4c50-8498-ea78aecbb153';
const OS_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');
const PORTAL_URL = Deno.env.get('PORTAL_URL');
const AMB_IDS = (() => { const l = (Deno.env.get('AMBASSADOR_EXTERNAL_IDS') ?? '').split(',').map((s) => s.trim()).filter(Boolean); return l.length ? l : ['amb-' + AMB]; })();
async function pushTo(ids: string[], heading: string, text: string): Promise<void> {
  const to = [...new Set(ids.filter(Boolean))];
  if (!OS_KEY || !to.length) { console.error('push skipped', !OS_KEY ? 'no ONESIGNAL_REST_API_KEY' : 'no recipients'); return; }
  const res = await fetch('https://api.onesignal.com/notifications?c=push', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Key ${OS_KEY}` },
    body: JSON.stringify({ app_id: OS_APP, target_channel: 'push', include_aliases: { external_id: to }, headings: { en: heading }, contents: { en: text }, ...(PORTAL_URL ? { url: PORTAL_URL } : {}) }),
  });
  if (!res.ok) console.error('push failed', res.status, (await res.text()).slice(0, 200));
}

// ---- schedule (stored in ichc_kv under roadmap:schedule; seeded from the defaults above the first time it is read) ----
async function getSchedule(): Promise<any> {
  const { data } = await admin.from('ichc_kv').select('value').eq('key', 'roadmap:schedule').maybeSingle();
  let v: any = data?.value;
  const ok = v && Array.isArray(v.sections) && v.sections.length === SECTIONS.length && SECTIONS.every((s, i) => v.sections[i].id === s.id && isDate(v.sections[i].start) && isDate(v.sections[i].end));
  if (!ok) {
    v = { sections: SECTIONS.map((s) => ({ id: s.id, title: s.title, start: s.start, end: s.end })), remindersOn: false, updated: Date.now() };
    await admin.from('ichc_kv').upsert({ key: 'roadmap:schedule', value: v }, { onConflict: 'key' });
  }
  return v;
}
async function saveSchedule(v: any) { v.updated = Date.now(); await admin.from('ichc_kv').upsert({ key: 'roadmap:schedule', value: v }, { onConflict: 'key' }); }
const isReleased = (sched: any, topic: string) => { const s = sched.sections.find((x: any) => x.id === topic); return !!s && todayStr() >= s.start; };

// ---- Gemini (same approach as exam-ai) ----
// v3: waits out a short per-minute 429 once per model before moving on, and keeps a trail of what every model said
// (model:status) so a failure can be shown to the person instead of a vague "busy" message.
let mcache: { t: number; models: string[] } | null = null;
async function modelChain(key: string): Promise<string[]> {
  let found: string[] = [];
  if (mcache && Date.now() - mcache.t < 6 * 3600 * 1000) found = mcache.models;
  else {
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
      if (res.ok) {
        const d = await res.json();
        const names: string[] = (d.models || []).filter((m: any) => (m.supportedGenerationMethods || []).includes('generateContent'))
          .map((m: any) => String(m.name).replace(/^models\//, '')).filter((n: string) => /^gemini-\d+(\.\d+)?-flash(-lite)?$/.test(n));
        const ver = (n: string) => parseFloat((n.match(/^gemini-(\d+(?:\.\d+)?)/) || [])[1] || '0');
        const full = names.filter((n) => !n.endsWith('-lite')).sort((a, b) => ver(b) - ver(a));
        const lite = names.filter((n) => n.endsWith('-lite')).sort((a, b) => ver(b) - ver(a));
        found = [...full.slice(0, 3), ...lite.slice(0, 1)];
        mcache = { t: Date.now(), models: found };
      } else console.error('model list failed', res.status);
    } catch (e) { console.error('model list error', String(e)); }
  }
  const chain = [Deno.env.get('GEMINI_MODEL'), ...found, 'gemini-flash-latest'].filter(Boolean) as string[];
  return chain.filter((m, i) => chain.indexOf(m) === i);
}
function salvage(t: string): any {
  const i = t.indexOf('['); if (i < 0) return null;
  const out: any[] = []; let depth = 0, start = -1, inStr = false, esc = false;
  for (let k = i + 1; k < t.length; k++) {
    const c = t[k];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') { if (depth === 0) start = k; depth++; }
    else if (c === '}') { depth--; if (depth === 0 && start >= 0) { try { out.push(JSON.parse(t.slice(start, k + 1))); } catch { /* skip */ } start = -1; } }
  }
  return out.length ? { questions: out } : null;
}
const trail: string[] = []; // per-request trail; reset at the start of each request
async function gemini(prompt: string, maxTokens = 9000, temperature = 0.7): Promise<any> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('not_configured');
  const started = Date.now();
  const finals: number[] = [];
  for (const model of await modelChain(key)) {
    let last = 0, thinkCfg = true, waited = false;
    for (let a = 0; a < 3; a++) {
      if (Date.now() - started > 100000) { trail.push('timeout'); throw new Error('timeout'); }
      try {
        const gen: Record<string, unknown> = { temperature, maxOutputTokens: maxTokens, responseMimeType: 'application/json' };
        if (model.includes('2.5')) gen.thinkingConfig = { thinkingBudget: model.includes('lite') ? 0 : 1024 };
        else if (thinkCfg) gen.thinkingConfig = { thinkingLevel: 'low' };
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: gen }),
        });
        last = res.status;
        if (res.ok) {
          const d = await res.json();
          const txt = (d?.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || '').join('').trim();
          const clean = txt.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
          try { return JSON.parse(clean); } catch { const sv = salvage(clean); if (sv) return sv; trail.push(`${model}:badjson`); last = 0; break; }
        }
        const full = await res.text(), errText = full.slice(0, 200);
        console.error('Gemini', model, res.status, errText.slice(0, 160));
        trail.push(`${model}:${res.status}${/quota|exhaust|billing|per.?day/i.test(full) ? ':quota' : ''}`);
        if (res.status === 400 && thinkCfg && /think/i.test(errText) && !model.includes('2.5')) { thinkCfg = false; a--; continue; }
        if (res.status === 429) {
          // a short per-minute limit clears in seconds: wait once and retry the same model before giving up on it
          const ra = parseFloat((full.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/) || [])[1] || '0');
          if (!waited && ra > 0 && ra <= 12 && Date.now() - started + ra * 1000 < 90000) { waited = true; await sleep(ra * 1000 + 300); a--; continue; }
          break;
        }
        if ([500, 502, 503, 504].includes(res.status) && a < 2) { await sleep(700 * (a + 1)); continue; }
        break;
      } catch (e) { console.error('Gemini fetch', String(e)); trail.push(`${model}:fetch`); last = 0; break; }
    }
    finals.push(last);
  }
  throw new Error(finals.length && finals.every((s) => s === 429) ? 'quota' : 'unavailable');
}

const TIER_TEXT: Record<string, string> = {
  foundation: 'Foundation: strong school-level (WASSCE A1 standard), one or two steps, tests the core idea cleanly',
  competition: 'Competition: International Chemistry Competition (IChC) regional/national round style, multi-step reasoning, needs insight rather than recall',
  olympiad: 'Olympiad: hard, IChC final / early Chemistry Olympiad style, several linked ideas, careful quantitative reasoning',
};
const RULES = 'Plain text only (no LaTeX, no markdown). Write formulas like H2SO4, Ca(OH)2, 10^-3, x10^-5. Every question must be original, unambiguous and self-contained, with every number needed given (use Ar: H 1.0, C 12.0, N 14.0, O 16.0, Na 23.0, Mg 24.3, Al 27.0, S 32.1, Cl 35.5, K 39.1, Ca 40.1, Fe 55.8, Cu 63.5, Zn 65.4, Ag 107.9; R = 8.314 J/mol/K; F = 96485 C/mol; NA = 6.022x10^23). Compute every answer carefully and double-check it. Keep each "explanation" under 45 words and show the key step. Never reveal the answer in the question text.';

function sectionOf(id: string) { return SECTIONS.find((s) => s.id === id)!; }

async function genMcq(topic: string, tier: string, n: number, focus: string): Promise<any[]> {
  const sec = sectionOf(topic);
  const out = await gemini(`Write exactly ${n} multiple-choice chemistry questions (4 options, exactly one correct) for the roadmap section "${sec.title}". Syllabus focus: ${sec.focus}.${focus ? ' Extra emphasis requested by the coordinator: ' + focus + '.' : ''}\nDifficulty: ${TIER_TEXT[tier]}.\n${RULES} Make the wrong options plausible (typical mistakes). Spread the questions across different subtopics.\nReturn ONLY JSON: {"questions":[{"text":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}]}. "answer" is the 0-based index of the correct option; vary it.`, 9000);
  return (Array.isArray(out?.questions) ? out.questions : []).filter((q: any) => q && q.text && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4).map((q: any) => ({ qtype: 'mcq', text: clip(q.text, 900), options: q.options.map((o: any) => clip(o, 220)), answer: q.answer, explanation: clip(q.explanation, 500) }));
}
async function genNum(topic: string, tier: string, n: number, focus: string): Promise<any[]> {
  const sec = sectionOf(topic);
  const out = await gemini(`Write exactly ${n} numerical-answer chemistry questions for the roadmap section "${sec.title}". Syllabus focus: ${sec.focus}.${focus ? ' Extra emphasis requested by the coordinator: ' + focus + '.' : ''}\nDifficulty: ${TIER_TEXT[tier]}.\n${RULES} Each question has ONE final numerical answer and states the unit to answer in and any rounding. Prefer answers that are not trivially round.\nReturn ONLY JSON: {"questions":[{"text":"... (state the unit to answer in)","answer":1.23,"tolerance":0.02,"unit":"mol","explanation":"..."}]}. "tolerance" is the allowed relative error (0.01 to 0.05).`, 9000);
  return (Array.isArray(out?.questions) ? out.questions : []).filter((q: any) => q && q.text && Number.isFinite(parseNum(q.answer))).map((q: any) => ({ qtype: 'num', text: clip(q.text, 900), answer: parseNum(q.answer), tolerance: Math.min(Math.max(Number(q.tolerance) || 0.02, 0.005), 0.05), unit: clip(q.unit, 20), explanation: clip(q.explanation, 500) }));
}
// Second opinion: a separate call solves each question blind. v3: a question the second solve DISAGREES with is dropped;
// if the second solve could not run at all, the questions are kept but marked "not double-checked" for the reviewer.
async function verify(qs: any[]): Promise<{ ok: any[]; skipped: boolean }> {
  if (!qs.length) return { ok: [], skipped: false };
  const list = qs.map((q, i) => ({ n: i, type: q.qtype, text: q.text, options: q.qtype === 'mcq' ? q.options : undefined, unit: q.qtype === 'num' ? q.unit : undefined }));
  let out: any;
  try {
    out = await gemini(`Solve each of these chemistry questions independently and carefully (work it out, do not guess). Plain text only.\n${JSON.stringify(list)}\nReturn ONLY JSON: {"questions":[{"n":0,"answer":0}]}. For type "mcq" give the 0-based index of the correct option; for type "num" give the final number only (no unit). Use Ar: H 1.0, C 12.0, N 14.0, O 16.0, Na 23.0, Mg 24.3, Al 27.0, S 32.1, Cl 35.5, K 39.1, Ca 40.1, Fe 55.8, Cu 63.5, Zn 65.4, Ag 107.9; R = 8.314; F = 96485; NA = 6.022e23.`, 9000, 0.1);
  } catch (e) { console.error('verify failed', String(e)); return { ok: qs.map((q) => ({ ...q, verified: false })), skipped: true }; }
  const got = new Map<number, any>(); for (const r of (Array.isArray(out?.questions) ? out.questions : [])) if (r && Number.isInteger(r.n)) got.set(r.n, r.answer);
  const ok = qs.filter((q, i) => {
    if (!got.has(i)) return false;
    if (q.qtype === 'mcq') return Number(got.get(i)) === q.answer;
    const g = parseNum(got.get(i)); return Number.isFinite(g) && Math.abs(g - q.answer) <= Math.max(Math.min(q.tolerance * 1.5, 0.05) * Math.abs(q.answer), 1e-9);
  }).map((q) => ({ ...q, verified: true }));
  return { ok, skipped: false };
}

// ---- helpers ----
const calls = new Map<string, number[]>();
function limited(key: string, max: number, windowMs = 3600000): boolean {
  const now = Date.now(), arr = (calls.get(key) || []).filter((t) => now - t < windowMs); arr.push(now); calls.set(key, arr); return arr.length > max;
}
function visibleFilter(q: any, me: Me) {
  // Ambassador and AI questions (no coordinator) are shared by everyone; a coordinator's own go to their group.
  const coord = me.role === 'student' ? me.coordinatorId : me.role === 'coordinator' ? me.id : null;
  return coord ? q.or(`coordinator_id.is.null,coordinator_id.eq.${coord}`) : q.is('coordinator_id', null);
}
async function streakInfo(email: string) {
  const since = new Date(Date.now() - 70 * 86400000).toISOString();
  const { data } = await admin.from('roadmap_attempts').select('created_at').eq('user_email', email).gte('created_at', since).order('created_at', { ascending: false }).limit(5000);
  const days = new Set<string>(); let todayCount = 0; const t = todayStr();
  for (const r of data || []) { const d = String(r.created_at).slice(0, 10); days.add(d); if (d === t) todayCount++; }
  let d = days.has(t) ? t : shiftDate(t, -1), streak = 0;
  while (days.has(d) && streak < 400) { streak++; d = shiftDate(d, -1); }
  return { streak, todayCount };
}
function pctOf(reqSolved: number, reqTotal: number, solved: number) {
  const practice = Math.max(0, solved - reqSolved), goal = reqTotal + PRACTICE_GOAL;
  const done = Math.min(reqSolved, reqTotal) + Math.min(PRACTICE_GOAL, practice);
  return { pct: Math.round((100 * done) / goal), complete: reqSolved >= reqTotal && practice >= PRACTICE_GOAL };
}
function publicQ(r: any) {
  return { id: r.id, type: r.qtype, tier: r.tier, source: r.source, required: r.required, text: r.body, unit: r.unit || undefined,
    options: r.qtype === 'mcq' ? shuffle((r.options || []).map((t: string, i: number) => ({ i, t }))) : undefined };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  trail.length = 0;
  const email = emailFrom(req), me = await who(email);
  if (!me) return json({ error: 'not_member' }, 403);
  let body: any; try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const action = body?.action;
  const staff = me.role !== 'student';
  const coordKey = me.role === 'student' ? me.coordinatorId : me.role === 'coordinator' ? me.id : null;

  try {
    const sched = await getSchedule();

    if (action === 'overview') {
      const { data: st } = await admin.rpc('roadmap_stats', { p_email: email, p_coord: coordKey });
      const byTopic = new Map<string, any>((st || []).map((r: any) => [r.topic, r]));
      const { streak, todayCount } = await streakInfo(email);
      const today = todayStr();
      const sections = sched.sections.map((s: any) => {
        const meta = sectionOf(s.id), r = byTopic.get(s.id) || {};
        const solved = Number(r.solved || 0), reqSolved = Number(r.req_solved || 0), reqTotal = Number(r.req_total || 0);
        const att = Number(r.attempts || 0), right = Number(r.right_attempts || 0), p = pctOf(reqSolved, reqTotal, solved);
        const state = today < s.start ? 'locked' : today > s.end ? 'past' : 'current';
        return { id: s.id, title: meta.title, focus: meta.focus, start: s.start, end: s.end, state, open: staff || state !== 'locked',
          total: Number(r.total || 0), reqTotal, solved, reqSolved, attempts: att, accuracy: att ? Math.round((100 * right) / att) : null, pct: p.pct, complete: p.complete };
      });
      const xp = 10 * sections.reduce((a: number, s: any) => a + s.solved, 0);
      let li = 0; LEVELS.forEach((l, k) => { if (xp >= l[1]) li = k; });
      const nxt = LEVELS[li + 1];
      const level = { name: LEVELS[li][0], next: nxt ? nxt[0] : null, toGo: nxt ? nxt[1] - xp : 0, pct: nxt ? Math.round(((xp - LEVELS[li][1]) / (nxt[1] - LEVELS[li][1])) * 100) : 100 };
      const out: any = { me: { role: me.role, name: me.name }, today, dailyGoal: DAILY_GOAL, todayCount, streak, practiceGoal: PRACTICE_GOAL, xp, level, sections };
      if (staff) {
        // How many students have finished each section (for the ambassador's decision to extend a section).
        const { data: rs } = await admin.from('ichc_kv').select('value').eq('key', 'roster:students').maybeSingle();
        let roster: any[] = Array.isArray(rs?.value) ? rs!.value : [];
        if (me.role === 'coordinator') roster = roster.filter((s: any) => s.coordinatorId === me.id);
        const { data: us } = await admin.rpc('roadmap_user_stats');
        const { data: rc } = await admin.rpc('roadmap_req_counts');
        const reqFor = (topic: string, coord: string | null) => (rc || []).filter((r: any) => r.topic === topic && (r.coordinator_id === null || r.coordinator_id === coord)).reduce((a: number, r: any) => a + Number(r.n), 0);
        out.cohort = {};
        for (const s of sched.sections) {
          let done = 0, active = 0;
          for (const stu of roster) {
            const r = (us || []).find((x: any) => x.user_id === String(stu.id) && x.topic === s.id);
            if (r) active++;
            const p = pctOf(Number(r?.req_solved || 0), reqFor(s.id, stu.coordinatorId || null), Number(r?.solved || 0));
            if (p.complete) done++;
          }
          out.cohort[s.id] = { students: roster.length, active, complete: done };
        }
        out.remindersOn = !!sched.remindersOn;
        // v3: questions students have reported and nobody has reviewed yet, per section (a coordinator sees their own group's)
        let fq = admin.from('roadmap_questions').select('topic').eq('status', 'flagged').limit(2000);
        if (me.role === 'coordinator') fq = fq.or(`coordinator_id.is.null,coordinator_id.eq.${me.id}`);
        const { data: fl } = await fq;
        out.flaggedByTopic = {};
        for (const r of fl || []) out.flaggedByTopic[r.topic] = (out.flaggedByTopic[r.topic] || 0) + 1;
      }
      return json(out);
    }

    if (action === 'practice') {
      const topic = String(body.topic || '');
      if (!TOPIC_IDS.includes(topic)) return json({ error: 'bad_topic' }, 400);
      if (!staff && !isReleased(sched, topic)) return json({ error: 'locked' }, 423);
      let mode = ['coordinator', 'feed', 'mixed', 'daily'].includes(body.mode) ? body.mode : 'mixed';
      const n = Math.min(Math.max(parseInt(body.n) || (mode === 'daily' ? 5 : 10), 1), 20);
      if (mode === 'daily') mode = 'mixed';
      // everything this person has already answered in this section
      const { data: att } = await admin.from('roadmap_attempts').select('question_id,correct').eq('user_email', email).eq('topic', topic).limit(5000);
      const solved = new Set<string>(), tried = new Set<string>();
      for (const a of att || []) { tried.add(a.question_id); if (a.correct) solved.add(a.question_id); }
      const pool: any[] = [];
      for (let from = 0; from < 4000; from += 1000) {
        const { data } = await visibleFilter(admin.from('roadmap_questions').select('id,source,required,coordinator_id,tier').eq('topic', topic).eq('status', 'approved'), me).range(from, from + 999);
        pool.push(...(data || [])); if (!data || data.length < 1000) break;
      }
      const isSet = (q: any) => q.required || q.source === 'coordinator';
      let cand = pool.filter((q) => !solved.has(q.id));
      if (mode === 'coordinator') cand = cand.filter(isSet); else if (mode === 'feed') cand = cand.filter((q) => !isSet(q));
      const wrongFirst = shuffle(cand.filter((q) => tried.has(q.id)));
      const fresh = shuffle(cand.filter((q) => !tried.has(q.id)));
      let picked: any[];
      if (mode === 'mixed') {
        const sets = shuffle(fresh.filter(isSet)).sort((a, b) => Number(b.required) - Number(a.required));
        const feed = fresh.filter((q) => !isSet(q));
        picked = [...wrongFirst.slice(0, 2), ...sets.slice(0, Math.ceil(n / 2)), ...feed];
        picked = [...new Map(picked.map((q) => [q.id, q])).values()];
        if (picked.length < n) picked.push(...sets.slice(Math.ceil(n / 2)), ...wrongFirst.slice(2));
      } else picked = [...wrongFirst.slice(0, 2), ...fresh, ...wrongFirst.slice(2)];
      picked = [...new Map(picked.map((q) => [q.id, q])).values()].slice(0, n);
      let review = false;
      if (picked.length < n && !picked.length) { // nothing new left: offer a revision set from what was already solved
        const again = shuffle(pool.filter((q) => mode === 'coordinator' ? isSet(q) : mode === 'feed' ? !isSet(q) : true)).slice(0, n);
        if (again.length) { picked = again; review = true; }
      }
      if (!picked.length) return json({ questions: [], empty: true, solvedAll: pool.length > 0 && cand.length === 0 });
      const { data: rows } = await admin.from('roadmap_questions').select('id,qtype,tier,source,required,body,options,unit').in('id', picked.map((q) => q.id));
      const byId = new Map((rows || []).map((r: any) => [r.id, r]));
      return json({ review, questions: picked.map((q) => byId.get(q.id)).filter(Boolean).map(publicQ) });
    }

    if (action === 'answer') {
      if (limited('ans:' + email, 900)) return json({ error: 'rate_limited' }, 429);
      const { data: q } = await admin.from('roadmap_questions').select('*').eq('id', String(body.questionId || '')).maybeSingle();
      if (!q || q.status === 'rejected') return json({ error: 'not_found' }, 404);
      if (!staff && !isReleased(sched, q.topic)) return json({ error: 'locked' }, 423);
      let ok = false, shown: string;
      if (q.qtype === 'mcq') {
        const g = Number(body.given); ok = Number.isInteger(g) && g === q.answer_index; shown = String((q.options || [])[q.answer_index] ?? '');
      } else {
        const g = parseNum(body.given); ok = Number.isFinite(g) && Math.abs(g - Number(q.answer_num)) <= Math.max(Number(q.tolerance) * Math.abs(Number(q.answer_num)), 1e-9);
        shown = String(Number(q.answer_num)) + (q.unit ? ' ' + q.unit : '');
      }
      await admin.from('roadmap_attempts').insert({ user_email: email, user_id: me.id, coordinator_id: coordKey, question_id: q.id, topic: q.topic, correct: ok });
      const { streak, todayCount } = await streakInfo(email);
      return json({ correct: ok, answer: shown, explanation: q.explanation || '', streak, todayCount });
    }

    if (action === 'report') {
      if (limited('rep:' + email, 60)) return json({ error: 'rate_limited' }, 429);
      const { data: q } = await admin.from('roadmap_questions').select('id,flags,status,topic,body,coordinator_id').eq('id', String(body.questionId || '')).maybeSingle();
      if (!q) return json({ error: 'not_found' }, 404);
      await admin.from('roadmap_questions').update({ flags: (q.flags || 0) + 1, status: q.status === 'approved' ? 'flagged' : q.status }).eq('id', q.id);
      // v3: tell the people who can fix it. The same student reporting the same question again within 10 minutes does not buzz anyone twice.
      const first = !limited('repq:' + email + ':' + q.id, 1, 600000);
      if (first) {
        const ids = [...AMB_IDS];
        if (me.coordinatorId) ids.push(String(me.coordinatorId));
        if (q.coordinator_id) ids.push(String(q.coordinator_id));
        const secTitle = SECTIONS.find((s) => s.id === q.topic)?.title || 'practice';
        const p = pushTo(ids, 'Question reported', `${me.name || 'A student'} reported a ${secTitle} question: "${clip(q.body, 90)}"`).catch((e) => console.error('push error', String(e)));
        try { (globalThis as any).EdgeRuntime.waitUntil(p); } catch { await p; }
      }
      return json({ ok: true });
    }

    if (action === 'board') {
      const wk = new Date(); wk.setUTCDate(wk.getUTCDate() - ((wk.getUTCDay() + 6) % 7));
      const since = wk.toISOString().slice(0, 10) + 'T00:00:00Z';
      let q = admin.from('roadmap_attempts').select('user_id,coordinator_id,question_id').eq('correct', true).gte('created_at', since).limit(20000);
      if (me.role === 'student') q = me.coordinatorId ? q.eq('coordinator_id', me.coordinatorId) : q.eq('user_id', me.id);
      else if (me.role === 'coordinator') q = q.eq('coordinator_id', me.id);
      const { data } = await q;
      const per = new Map<string, Set<string>>();
      for (const r of data || []) { if (!per.has(r.user_id)) per.set(r.user_id, new Set()); per.get(r.user_id)!.add(r.question_id); }
      const { data: rs } = await admin.from('ichc_kv').select('value').eq('key', 'roster:students').maybeSingle();
      let roster: any[] = Array.isArray(rs?.value) ? rs!.value : [];
      if (me.role === 'student') roster = me.coordinatorId ? roster.filter((s: any) => s.coordinatorId === me.coordinatorId) : roster.filter((s: any) => String(s.id) === me.id);
      else if (me.role === 'coordinator') roster = roster.filter((s: any) => s.coordinatorId === me.id);
      const rows = roster.map((s: any) => ({ id: String(s.id), name: me.role === 'student' ? String(s.name || 'Student').split(' ')[0] : String(s.name || 'Student'), xp: 10 * (per.get(String(s.id))?.size || 0), me: String(s.id) === me.id }))
        .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name)).slice(0, 15);
      return json({ weekStart: since.slice(0, 10), rows });
    }

    // ---- staff only from here ----
    if (['q_add', 'q_list', 'q_set', 'generate', 'q_post_batch', 'progress', 'schedule_set', 'schedule_shift'].includes(action) && !staff) return json({ error: 'forbidden' }, 403);

    if (action === 'q_add') {
      const topic = String(body.topic || ''); if (!TOPIC_IDS.includes(topic)) return json({ error: 'bad_topic' }, 400);
      const tier = TIERS.includes(body.tier) ? body.tier : 'competition', text = clipKeep(body.text, 1500);
      if (!text) return json({ error: 'bad_request' }, 400);
      const row: any = { topic, tier, source: 'coordinator', coordinator_id: me.role === 'coordinator' ? me.id : null, body: text, explanation: clipKeep(body.explanation, 800) || null, required: !!body.required, created_by: email, status: 'approved' };
      if (body.type === 'num') {
        const a = parseNum(body.answer); if (!Number.isFinite(a)) return json({ error: 'bad_answer' }, 400);
        Object.assign(row, { qtype: 'num', answer_num: a, tolerance: Math.min(Math.max(Number(body.tolerance) || 0.02, 0.005), 0.1), unit: clip(body.unit, 20) || null });
      } else {
        const opts = (Array.isArray(body.options) ? body.options : []).map((o: unknown) => clip(o, 250)).filter(Boolean);
        const idx = Number(body.answerIndex);
        if (opts.length < 2 || opts.length > 6 || !Number.isInteger(idx) || idx < 0 || idx >= opts.length) return json({ error: 'bad_options' }, 400);
        Object.assign(row, { qtype: 'mcq', options: opts, answer_index: idx });
      }
      const { data, error } = await admin.from('roadmap_questions').insert(row).select('id').single();
      if (error) { console.error(error); return json({ error: 'unavailable' }, 502); }
      return json({ ok: true, id: data.id });
    }

    if (action === 'q_list') {
      const topic = String(body.topic || ''); if (!TOPIC_IDS.includes(topic)) return json({ error: 'bad_topic' }, 400);
      const limit = Math.min(Math.max(parseInt(body.limit) || 60, 1), 200), offset = Math.max(parseInt(body.offset) || 0, 0);
      let q = admin.from('roadmap_questions').select('id,tier,source,coordinator_id,qtype,body,options,answer_index,answer_num,tolerance,unit,explanation,required,status,flags,created_at', { count: 'exact' }).eq('topic', topic).neq('status', 'rejected');
      if (me.role === 'coordinator') q = q.or(`coordinator_id.is.null,coordinator_id.eq.${me.id}`);
      if (body.filter === 'flagged') q = q.eq('status', 'flagged'); else if (body.filter === 'mine') q = q.eq('created_by', email); else if (body.filter === 'ai') q = q.eq('source', 'ai'); else if (body.filter === 'set') q = q.eq('required', true);
      const { data, count } = await q.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      const { count: flagged } = await (me.role === 'coordinator' ? admin.from('roadmap_questions').select('id', { count: 'exact', head: true }).eq('topic', topic).eq('status', 'flagged').or(`coordinator_id.is.null,coordinator_id.eq.${me.id}`) : admin.from('roadmap_questions').select('id', { count: 'exact', head: true }).eq('topic', topic).eq('status', 'flagged'));
      return json({ total: count || 0, flagged: flagged || 0, questions: (data || []).map((r: any) => ({ ...r, mine: r.coordinator_id === me.id || (me.role === 'ambassador' && r.coordinator_id === null && r.source === 'coordinator') || (r.source === 'ai' && r.coordinator_id === me.id) })) });
    }

    if (action === 'q_set') {
      const { data: q } = await admin.from('roadmap_questions').select('id,coordinator_id,source,created_by').eq('id', String(body.id || '')).maybeSingle();
      if (!q) return json({ error: 'not_found' }, 404);
      if (me.role === 'coordinator' && q.coordinator_id !== null && q.coordinator_id !== me.id) return json({ error: 'forbidden' }, 403);
      const op = body.op;
      if (op === 'approve') await admin.from('roadmap_questions').update({ status: 'approved', flags: 0 }).eq('id', q.id);
      else if (op === 'reject') await admin.from('roadmap_questions').update({ status: 'rejected' }).eq('id', q.id);
      else if (op === 'delete') {
        if (me.role === 'coordinator' && q.created_by !== email) return json({ error: 'forbidden' }, 403);
        await admin.from('roadmap_questions').delete().eq('id', q.id);
      } else if (op === 'required') {
        if (me.role === 'coordinator' && q.created_by !== email) return json({ error: 'forbidden' }, 403);
        await admin.from('roadmap_questions').update({ required: !!body.value }).eq('id', q.id);
      } else return json({ error: 'bad_op' }, 400);
      return json({ ok: true });
    }

    // v3: writes drafts only. Nothing is saved until the reviewer posts the ones they keep (q_post_batch).
    if (action === 'generate') {
      const topic = String(body.topic || ''); if (!TOPIC_IDS.includes(topic)) return json({ error: 'bad_topic' }, 400);
      if (limited('gen:' + email, 12)) return json({ error: 'rate_limited' }, 429);
      const tier = TIERS.includes(body.tier) ? body.tier : 'competition', focus = clip(body.focus, 200);
      const want = Math.min(Math.max(parseInt(body.count) || 10, 4), 20);
      const nMcq = Math.ceil(want * 0.6), nNum = want - nMcq;
      const [m, nm] = await Promise.all([genMcq(topic, tier, nMcq, focus).catch((e) => { console.error('mcq gen', String(e)); return []; }), genNum(topic, tier, nNum, focus).catch((e) => { console.error('num gen', String(e)); return []; })]);
      const drafted = [...m, ...nm];
      if (!drafted.length) { const e: any = new Error(trail.some((t) => /:429/.test(t)) && trail.every((t) => /:429/.test(t)) ? 'quota' : 'unavailable'); throw e; }
      const [vm, vn] = await Promise.all([verify(m), verify(nm)]);
      const good = [...vm.ok, ...vn.ok];
      // skip near-duplicates of what is already in this section
      const { data: have } = await admin.from('roadmap_questions').select('body').eq('topic', topic).order('created_at', { ascending: false }).limit(600);
      const seen = new Set((have || []).map((r: any) => String(r.body).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 70)));
      const fresh = good.filter((q) => { const k = q.text.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 70); if (seen.has(k)) return false; seen.add(k); return true; });
      const drafts = fresh.map((q) => q.qtype === 'mcq'
        ? { type: 'mcq', text: q.text, options: q.options, answerIndex: q.answer, explanation: q.explanation || '', verified: !!q.verified }
        : { type: 'num', text: q.text, answer: q.answer, tolerance: q.tolerance, unit: q.unit || '', explanation: q.explanation || '', verified: !!q.verified });
      return json({ drafts, drafted: drafted.length, dropped: drafted.length - drafts.length, verifySkipped: vm.skipped || vn.skipped, tier, topic });
    }

    // v3: save the drafts the reviewer kept (after any edits). Saved as AI practice questions, owned by whoever reviewed them.
    if (action === 'q_post_batch') {
      const topic = String(body.topic || ''); if (!TOPIC_IDS.includes(topic)) return json({ error: 'bad_topic' }, 400);
      const tier = TIERS.includes(body.tier) ? body.tier : 'competition', required = !!body.required;
      const list: any[] = Array.isArray(body.questions) ? body.questions.slice(0, 20) : [];
      const rows: any[] = []; let skipped = 0;
      for (const it of list) {
        const text = clipKeep(it?.text, 1500);
        if (!text) { skipped++; continue; }
        const row: any = { topic, tier, source: 'ai', coordinator_id: me.role === 'coordinator' ? me.id : null, body: text, explanation: clipKeep(it.explanation, 800) || null, required, created_by: email, status: 'approved' };
        if (it.type === 'num') {
          const a = parseNum(it.answer); if (!Number.isFinite(a)) { skipped++; continue; }
          Object.assign(row, { qtype: 'num', answer_num: a, tolerance: Math.min(Math.max(Number(it.tolerance) || 0.02, 0.005), 0.1), unit: clip(it.unit, 20) || null });
        } else {
          const opts = (Array.isArray(it.options) ? it.options : []).map((o: unknown) => clip(o, 250)).filter(Boolean);
          const idx = Number(it.answerIndex);
          if (opts.length < 2 || opts.length > 6 || !Number.isInteger(idx) || idx < 0 || idx >= opts.length) { skipped++; continue; }
          Object.assign(row, { qtype: 'mcq', options: opts, answer_index: idx });
        }
        rows.push(row);
      }
      if (!rows.length) return json({ error: 'bad_request' }, 400);
      const { error } = await admin.from('roadmap_questions').insert(rows);
      if (error) { console.error(error); return json({ error: 'unavailable' }, 502); }
      return json({ ok: true, added: rows.length, skipped });
    }

    if (action === 'progress') {
      const topic = String(body.topic || ''); if (!TOPIC_IDS.includes(topic)) return json({ error: 'bad_topic' }, 400);
      const { data: rs } = await admin.from('ichc_kv').select('value').eq('key', 'roster:students').maybeSingle();
      let roster: any[] = Array.isArray(rs?.value) ? rs!.value : [];
      if (me.role === 'coordinator') roster = roster.filter((s: any) => s.coordinatorId === me.id);
      const { data: us } = await admin.rpc('roadmap_user_stats');
      const { data: rc } = await admin.rpc('roadmap_req_counts');
      const reqFor = (coord: string | null) => (rc || []).filter((r: any) => r.topic === topic && (r.coordinator_id === null || r.coordinator_id === coord)).reduce((a: number, r: any) => a + Number(r.n), 0);
      const rows = roster.map((stu: any) => {
        const r = (us || []).find((x: any) => x.user_id === String(stu.id) && x.topic === topic) || {};
        const reqTotal = reqFor(stu.coordinatorId || null), solved = Number(r.solved || 0), reqSolved = Number(r.req_solved || 0), att = Number(r.attempts || 0);
        const p = pctOf(reqSolved, reqTotal, solved);
        return { id: String(stu.id), name: stu.name || '', coordinatorId: stu.coordinatorId || null, solved, reqSolved, reqTotal, attempts: att, accuracy: att ? Math.round((100 * Number(r.right_attempts || 0)) / att) : null, lastAt: r.last_at || null, pct: p.pct, complete: p.complete };
      }).sort((a, b) => a.pct - b.pct || String(a.name).localeCompare(String(b.name)));
      return json({ topic, rows });
    }

    if (action === 'schedule_set') {
      if (me.role !== 'ambassador') return json({ error: 'forbidden' }, 403);
      const incoming: any[] = Array.isArray(body.sections) ? body.sections : [];
      if (incoming.length) {
        const next = sched.sections.map((s: any) => { const i = incoming.find((x: any) => x.id === s.id); return i ? { ...s, start: i.start, end: i.end } : s; });
        for (let k = 0; k < next.length; k++) {
          if (!isDate(next[k].start) || !isDate(next[k].end) || next[k].end < next[k].start) return json({ error: 'bad_dates', detail: next[k].id }, 400);
          if (k && next[k].start <= next[k - 1].start) return json({ error: 'bad_order', detail: next[k].id }, 400);
        }
        sched.sections = next;
      }
      if (typeof body.remindersOn === 'boolean') sched.remindersOn = body.remindersOn;
      await saveSchedule(sched);
      return json({ ok: true });
    }

    if (action === 'schedule_shift') {
      if (me.role !== 'ambassador') return json({ error: 'forbidden' }, 403);
      const days = Math.min(Math.max(parseInt(body.days) || 0, -30), 60), at = sched.sections.findIndex((s: any) => s.id === body.fromId);
      if (at < 0 || !days) return json({ error: 'bad_request' }, 400);
      sched.sections = sched.sections.map((s: any, k: number) => k < at ? s : k === at ? { ...s, end: shiftDate(s.end, days) } : { ...s, start: shiftDate(s.start, days), end: shiftDate(s.end, days) });
      await saveSchedule(sched);
      return json({ ok: true });
    }

    return json({ error: 'bad_action' }, 400);
  } catch (e) {
    console.error('roadmap', String(e), trail.join(' '));
    const m = String(e), detail = trail.slice(-6).join(' ');
    if (m.includes('quota')) return json({ error: 'quota', detail }, 429);
    return json({ error: m.includes('not_configured') ? 'not_configured' : 'unavailable', detail }, 502);
  }
});
