// Supabase Edge Function: send-push
// Sends a web push (OneSignal) to the ambassador when a student requests an exam retake.
// The recipient is fixed on the server, so callers cannot push to anyone else.
//
// Secrets to set (Supabase > Edge Functions > Secrets):
//   ONESIGNAL_REST_API_KEY      your OneSignal REST API key
//   AMBASSADOR_EXTERNAL_IDS     the ambassador's portal id, e.g. amb-yourname@gmail.com (lowercase). Comma-separate for several.
// Optional: ONESIGNAL_APP_ID (defaults to the portal's app id), PORTAL_URL (opened when the notification is tapped)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const APP_ID = Deno.env.get("ONESIGNAL_APP_ID") ?? "c711029f-212c-4c50-8498-ea78aecbb153";
const API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
const RECIPIENTS = (Deno.env.get("AMBASSADOR_EXTERNAL_IDS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const PORTAL_URL = Deno.env.get("PORTAL_URL");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const clip = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!API_KEY || !RECIPIENTS.length) return json({ error: "Push is not configured" }, 500);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  if (body.kind !== "retake_request") return json({ error: "Unsupported kind" }, 400);

  const student = clip(body.studentName, 60) || "A student";
  const exam = clip(body.examTitle, 80) || "an exam";
  const reason = clip(body.reason, 140);

  const res = await fetch("https://api.onesignal.com/notifications?c=push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Key ${API_KEY}` },
    body: JSON.stringify({
      app_id: APP_ID,
      target_channel: "push",
      include_aliases: { external_id: RECIPIENTS },
      headings: { en: "Retake request" },
      contents: { en: `${student} asked to retake ${exam}.${reason ? " " + reason : ""}` },
      ...(PORTAL_URL ? { url: PORTAL_URL } : {}),
    }),
  });
  const out = await res.text();
  return json({ ok: res.ok, status: res.status, detail: res.ok ? undefined : out.slice(0, 300) }, res.ok ? 200 : 502);
});
