// send-email: sends branded announcement emails through Brevo (free plan: 300 emails/day) and logs every
// result to the 'email:log' list so failed emails can be resent from the portal.
// Secrets: BREVO_API_KEY (required), EMAIL_FROM (required: a sender address verified in Brevo),
//          EMAIL_FROM_NAME (optional, default "Chemistry Competition Prep").
// Only the Ambassador and coordinators may send. Needs a signed-in user (verify_jwt).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AMB = 'edmondeddah999@gmail.com';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function emailFrom(req: Request): string {
  try {
    const t = (req.headers.get('authorization') || '').replace(/^Bearer /i, '');
    const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return String(p.email || '').toLowerCase();
  } catch { return ''; }
}
async function senderRole(email: string): Promise<string | null> {
  if (!email) return null;
  if (email === AMB) return 'ambassador';
  const { data } = await admin.from('ichc_kv').select('value').eq('key', 'roster:coordinators').maybeSingle();
  return (Array.isArray(data?.value) ? data!.value : []).some((e: any) => String(e.email || '').toLowerCase() === email) ? 'coordinator' : null;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function paragraphs(text: string): string {
  return text.split(/\n{2,}/).map((p) => '<p style="margin:0 0 14px;">' + esc(p).replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#14506A;">$1</a>') + '</p>').join('');
}
function render(name: string, subject: string, message: string, author: string): string {
  const first = esc((name || '').trim().split(/\s+/)[0] || 'there');
  return `<div style="background:#F6F4EE;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;"><table role="presentation" width="100%" style="max-width:600px;margin:0 auto;border-collapse:collapse;"><tr><td style="background:#0A1826;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;"><div style="font-size:12px;letter-spacing:.12em;color:#E39A3B;font-weight:bold;">CHEMISTRY COMPETITION PREP</div></td></tr><tr><td style="background:#E39A3B;height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr><tr><td style="background:#fff;padding:24px;color:#1F2933;font-size:15px;line-height:1.6;"><p style="margin:0 0 6px;">Hi ${first},</p><h2 style="margin:0 0 16px;font-size:20px;color:#0A1826;">${esc(subject)}</h2>${paragraphs(message)}<p style="margin:18px 0 0;color:#5B6670;font-size:13px;">${author ? 'From ' + esc(author) + '<br>' : ''}Chemistry Competition Prep</p></td></tr><tr><td style="background:#fff;padding:0 24px 18px;border-radius:0 0 12px 12px;color:#8A949E;font-size:11.5px;">You are receiving this because you are part of the Chemistry Competition Prep programme. You can turn email updates off in your portal profile.</td></tr></table></div>`;
}
async function shortHash(s: string): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
}

const sent = new Map<string, number[]>();
async function log(entry: Record<string, unknown>) {
  try { await admin.rpc('append_kv_item', { p_key: 'email:log', p_item: entry }); } catch (e) { console.error('email log failed', String(e)); }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const sender = emailFrom(req), role = await senderRole(sender);
  if (!role) return json({ error: 'forbidden' }, 403);
  const key = Deno.env.get('BREVO_API_KEY'), from = Deno.env.get('EMAIL_FROM');
  if (!key || !from) return json({ error: 'not_configured' }, 503);

  const now = Date.now(), arr = (sent.get(sender) || []).filter((t) => now - t < 3600000); arr.push(now); sent.set(sender, arr);
  if (arr.length > 300) return json({ error: 'rate_limited' }, 429);

  let b: any; try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const to = String(b?.to || '').trim().toLowerCase(), name = String(b?.name || '').slice(0, 80);
  const subject = String(b?.subject || '').replace(/\s+/g, ' ').trim().slice(0, 150), message = String(b?.message || '').replace(/\r/g, '').trim().slice(0, 3000);
  const author = String(b?.author || '').slice(0, 80);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) || !subject || !message) return json({ error: 'bad_request' }, 400);

  const hash = await shortHash(to + '|' + subject + '|' + message);
  try {
    const { data: row } = await admin.from('ichc_kv').select('value').eq('key', 'email:log').maybeSingle();
    if (((row && row.value) || []).some((e: any) => e && e.hash === hash && Date.now() - e.ts < 60000 && e.status !== 'failed'))
      return json({ ok: true, duplicate: true });
  } catch { /* send anyway */ }

  const base = { id: crypto.randomUUID(), to, name: name || null, subject, message: message.slice(0, 1500), author: author || null, kind: String(b?.kind || '').slice(0, 20) || null, recipientId: b?.recipientId || null, recipientRole: b?.recipientRole || null, studentCoordinatorId: b?.studentCoordinatorId || null, hash, ts: Date.now() };
  try {
    const replyTo = String(b?.replyTo || '').trim();
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: Deno.env.get('EMAIL_FROM_NAME') || 'Chemistry Competition Prep', email: from },
        to: [{ email: to, name: name || undefined }], subject,
        htmlContent: render(name, subject, message, author), textContent: message,
        ...(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(replyTo) ? { replyTo: { email: replyTo, name: author || undefined } } : {}),
      }),
    });
    const txt = await res.text();
    if (!res.ok) {
      console.error('Brevo', res.status, txt.slice(0, 300));
      let detail = txt.slice(0, 200); try { detail = JSON.parse(txt).message || detail; } catch { /* keep text */ }
      await log({ ...base, status: 'failed', detail });
      return json({ error: 'send_failed', status: res.status, detail }, 502);
    }
    let id = ''; try { id = JSON.parse(txt).messageId || ''; } catch { /* ignore */ }
    await log({ ...base, status: 'sent', detail: 'Accepted by Brevo', providerMessageId: id });
    return json({ ok: true });
  } catch (e) {
    await log({ ...base, status: 'failed', detail: 'Network error: ' + String(e) });
    return json({ error: 'send_failed', detail: String(e) }, 502);
  }
});
