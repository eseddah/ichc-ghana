// submit-application v13: receives the public application, checks the reCAPTCHA (when it is set up), the pause switch
// and the deadline, validates and cleans every field, then saves it. Public (no JWT), because applicants have no account.
// A { ping: true } request returns only yes/no status flags (no secrets); { ping: true, verifyTest: true } also asks Google
// whether the secret key is accepted. When someone who was invited from the interest list submits the full form, their
// placeholder entry is removed.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const AGES = ['14-17', '18-21', '21-24'];
const clip = (t: unknown, n: number) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const clipKeep = (t: unknown, n: number) => String(t ?? '').replace(/\r/g, '').trim().slice(0, n);
const list = (v: unknown, max: number, len: number) => (Array.isArray(v) ? v : []).map((x) => clip(x, len)).filter(Boolean).slice(0, max);

const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < 3600000); arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 8;
}
async function verifyCaptcha(secret: string, token: string) {
  const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
  });
  return await r.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  let body: any; try { body = await req.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const { data: set } = await admin.from('ichc_kv').select('value').eq('key', 'settings:notify').maybeSingle();
  const dl = set?.value?.applicationDeadline ? new Date(set.value.applicationDeadline).getTime() : NaN;
  const secret = Deno.env.get('RECAPTCHA_SECRET_KEY');

  if (body?.ping) {
    const out: Record<string, unknown> = { ok: true, recaptchaSecretSet: !!secret, recaptchaSiteKeySet: !!set?.value?.recaptchaSiteKey, paused: !!set?.value?.applicationsClosed, deadlineSet: Number.isFinite(dl), deadlinePassed: Number.isFinite(dl) && Date.now() > dl };
    if (body.verifyTest && secret) { try { const v = await verifyCaptcha(secret, 'test'); out.googleErrorCodes = v['error-codes'] || []; } catch (e) { out.googleErrorCodes = ['network: ' + String(e)]; } }
    return json(out);
  }

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (limited(ip)) return json({ error: 'Too many applications from this connection. Please try again later.' }, 429);
  const a = body?.application; if (!a) return json({ error: 'Missing application.' }, 400);

  if (set?.value?.applicationsClosed) return json({ error: 'Applications are paused right now. Please check back soon.' }, 403);
  if (Number.isFinite(dl) && Date.now() > dl) return json({ error: 'Applications have closed.' }, 403);

  if (secret) {
    const token = String(body?.recaptchaToken || '');
    if (!token) return json({ error: 'Please tick "I\'m not a robot" before submitting.' }, 400);
    const v = await verifyCaptcha(secret, token);
    if (!v.success) {
      const codes: string[] = v['error-codes'] || [];
      console.error('recaptcha failed', JSON.stringify(codes));
      if (codes.includes('invalid-input-secret') || codes.includes('missing-input-secret')) return json({ error: 'The reCAPTCHA secret key on the server is not valid. Please tell the programme team.' }, 500);
      return json({ error: 'The robot check failed. Please tick the box again and resubmit.' }, 400);
    }
  }

  const email = clip(a.email, 200).toLowerCase(), name = clip(a.name, 120), phone = clip(a.phone, 30);
  if (name.length < 3) return json({ error: 'Please enter your full name.' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Please enter a valid email address.' }, 400);
  if (phone.replace(/\D/g, '').length < 9) return json({ error: 'Please enter a valid phone number.' }, 400);
  if (!AGES.includes(String(a.ageRange))) return json({ error: 'Please choose your age range.' }, 400);
  if (clipKeep(a.message, 3000).length < 40) return json({ error: 'Please write a few sentences about why you want to join.' }, 400);
  if (!(a.commitments && a.commitments.attend && a.commitments.communicate && a.commitments.activities)) return json({ error: 'Please agree to all three commitments.' }, 400);

  const av = a.availability || {};
  const entry = {
    id: crypto.randomUUID(), token: crypto.randomUUID(), name, email, phone, notifySms: !!a.notifySms,
    school: clip(a.school, 150), region: clip(a.region, 100), ageRange: String(a.ageRange), howHeard: clip(a.howHeard, 200),
    level: clip(a.level, 60), chemLevel: clip(a.chemLevel, 80), background: clipKeep(a.background, 1500),
    competition: clip(a.competition, 80), competitionDetails: clip(a.competitionDetails, 300), interests: list(a.interests, 12, 60),
    message: clipKeep(a.message, 3000), availability: { days: list(av.days, 7, 10), times: list(av.times, 3, 12), hours: clip(av.hours, 30) },
    commitments: { attend: true, communicate: true, activities: true }, stage: 'Applied',
    date: new Date().toISOString().slice(0, 10), submittedAt: new Date().toISOString(),
  };
  const { error } = await admin.rpc('append_kv_item', { p_key: 'applications:list', p_item: entry });
  if (error) { console.error('save failed', error); return json({ error: 'Something went wrong saving your application. Please try again.' }, 500); }

  try {
    const { data: row } = await admin.from('ichc_kv').select('value').eq('key', 'applications:list').maybeSingle();
    const cur: any[] = Array.isArray(row?.value) ? row!.value : [];
    const cleaned = cur.filter((e) => !(e && e.stage === 'Invited' && String(e.email || '').toLowerCase() === email));
    if (cleaned.length !== cur.length) await admin.from('ichc_kv').update({ value: cleaned }).eq('key', 'applications:list');
  } catch (e) { console.error('invite cleanup skipped', String(e)); }
  return json({ ok: true, id: entry.id, token: entry.token });
});
