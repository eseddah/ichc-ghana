// application-received: sends the "we received your application" confirmation email to someone who just
// applied on the public form. Applicants have no login, so this function is public (no JWT) and instead checks
// that the application really exists (same id + email, submitted in the last 15 minutes) before sending
// anything, and sends at most once per application.
// Secrets: BREVO_API_KEY, EMAIL_FROM, EMAIL_FROM_NAME (optional) - the same ones send-email uses.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const key = Deno.env.get('BREVO_API_KEY'), from = Deno.env.get('EMAIL_FROM');
  if (!key || !from) return json({ error: 'not_configured' }, 503);
  let b: any; try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const id = String(b?.id || ''), email = String(b?.email || '').trim().toLowerCase();
  if (!id || !email) return json({ error: 'bad_request' }, 400);

  const { data: row } = await admin.from('ichc_kv').select('value').eq('key', 'applications:list').maybeSingle();
  const app = (Array.isArray(row?.value) ? row!.value : []).find((a: any) => a && a.id === id && String(a.email || '').toLowerCase() === email);
  if (!app || !app.submittedAt || Date.now() - new Date(app.submittedAt).getTime() > 15 * 60 * 1000) return json({ error: 'not_found' }, 404);

  const { data: logRow } = await admin.from('ichc_kv').select('value').eq('key', 'email:log').maybeSingle();
  if ((Array.isArray(logRow?.value) ? logRow!.value : []).some((e: any) => e && e.kind === 'application' && e.recipientId === id && e.status === 'sent')) return json({ ok: true, duplicate: true });

  const first = esc(String(app.name || '').trim().split(/\s+/)[0] || 'there');
  const subject = 'We received your application';
  const html = `<div style="background:#F6F4EE;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;"><table role="presentation" width="100%" style="max-width:600px;margin:0 auto;border-collapse:collapse;"><tr><td style="background:#0A1826;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;"><div style="font-size:12px;letter-spacing:.12em;color:#E39A3B;font-weight:bold;">CHEMISTRY COMPETITION PREP</div></td></tr><tr><td style="background:#E39A3B;height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr><tr><td style="background:#fff;padding:24px;color:#1F2933;font-size:15px;line-height:1.6;border-radius:0 0 12px 12px;"><p style="margin:0 0 6px;">Hi ${first},</p><h2 style="margin:0 0 14px;font-size:20px;color:#0A1826;">Your application has been received</h2><p style="margin:0 0 14px;">Thank you for applying to Chemistry Competition Prep. We have your application and it will be reviewed soon.</p><p style="margin:0 0 6px;"><b>What happens next</b></p><ol style="margin:0 0 14px;padding-left:20px;"><li>Your application is reviewed.</li><li>If you are accepted, we email you and your student portal is switched on. Sign in with this same email address (${esc(email)}).</li><li>You confirm your place, watch a short orientation video, and meet your coordinator. The official WhatsApp group invitation comes during this onboarding.</li></ol><p style="margin:0;color:#5B6670;font-size:13px;">There is nothing else you need to do for now. Please keep an eye on your inbox, and check your spam folder just in case.</p></td></tr></table></div>`;
  const text = `Hi ${String(app.name || '').split(' ')[0] || 'there'},\n\nThank you for applying to Chemistry Competition Prep. We have received your application and it will be reviewed soon.\n\nIf you are accepted, we will email you and switch on your student portal. Sign in with this same email address (${email}). Then confirm your place, watch a short orientation video and meet your coordinator. The official WhatsApp group invitation comes during onboarding.\n\nThere is nothing else you need to do for now.`;

  const base = { id: crypto.randomUUID(), to: email, name: app.name || null, subject, message: text.slice(0, 1500), author: null, kind: 'application', recipientId: id, recipientRole: 'applicant', studentCoordinatorId: null, hash: id, ts: Date.now() };
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sender: { name: Deno.env.get('EMAIL_FROM_NAME') || 'Chemistry Competition Prep', email: from }, to: [{ email, name: app.name || undefined }], subject, htmlContent: html, textContent: text }),
    });
    const txt = await res.text();
    if (!res.ok) {
      console.error('Brevo', res.status, txt.slice(0, 300));
      let detail = txt.slice(0, 200); try { detail = JSON.parse(txt).message || detail; } catch { /* keep */ }
      await admin.rpc('append_kv_item', { p_key: 'email:log', p_item: { ...base, status: 'failed', detail } });
      return json({ error: 'send_failed', detail }, 502);
    }
    await admin.rpc('append_kv_item', { p_key: 'email:log', p_item: { ...base, status: 'sent', detail: 'Accepted by Brevo' } });
    return json({ ok: true });
  } catch (e) {
    await admin.rpc('append_kv_item', { p_key: 'email:log', p_item: { ...base, status: 'failed', detail: 'Network error: ' + String(e) } });
    return json({ error: 'send_failed' }, 502);
  }
});
