// Supabase Edge Function: submit-application
//
// What this does:
//   1. Receives the applicant's form data + their reCAPTCHA token.
//   2. Asks Google "was this token really solved by a human?" — this check
//      happens here, on Supabase's server, so it CANNOT be skipped by
//      someone bypassing your webpage's JavaScript.
//   3. Only if Google says yes, writes the application into your database
//      using the SERVICE ROLE key (a powerful key that only lives here on
//      the server, never in the browser).
//
// Your webpage (apply.html) no longer writes to the database directly —
// it calls this function instead.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const { recaptchaToken, application } = body || {};
  if (!recaptchaToken) return json({ error: "Missing reCAPTCHA token." }, 400);
  if (!application) return json({ error: "Missing application data." }, 400);

  // --- 1. Verify the token with Google (this is the part a browser can't fake) ---
  const secret = Deno.env.get("RECAPTCHA_SECRET_KEY");
  if (!secret) return json({ error: "Server misconfigured: RECAPTCHA_SECRET_KEY not set." }, 500);

  const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(recaptchaToken)}`,
  });
  const verifyData = await verifyRes.json();
  if (!verifyData.success) {
    return json({ error: "reCAPTCHA verification failed. Please try again." }, 400);
  }

  // --- 2. Basic validation of the fields (same checks the page already did) ---
  const { name, email, phone, notifySms, school, region, ageRange, howHeard, message } = application;
  if (!name || typeof name !== "string") return json({ error: "Name is required." }, 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Valid email is required." }, 400);
  if (!phone || typeof phone !== "string") return json({ error: "Phone number is required." }, 400);
  if (!ageRange || typeof ageRange !== "string") return json({ error: "Age range is required." }, 400);
  if (!message || typeof message !== "string") return json({ error: "Message is required." }, 400);

  // --- 3. Write to the database using the SERVICE ROLE key (server-side only) ---
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data, error: readErr } = await supabase
      .from("ichc_kv")
      .select("value")
      .eq("key", "applications:list")
      .maybeSingle();
    if (readErr) throw readErr;

    const list = (data && data.value) || [];
    list.push({
      id: crypto.randomUUID(),
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      notifySms: !!notifySms,
      school: school ? String(school).trim() : "",
      region: region ? String(region) : "",
      ageRange,
      howHeard: howHeard ? String(howHeard) : "",
      message: String(message).trim(),
      date: new Date().toISOString().slice(0, 10),
    });

    const { error: writeErr } = await supabase
      .from("ichc_kv")
      .upsert({ key: "applications:list", value: list });
    if (writeErr) throw writeErr;

    return json({ ok: true });
  } catch (e) {
    console.error("submit-application error:", e);
    return json({ error: "Something went wrong saving your application. Please try again." }, 500);
  }
});
