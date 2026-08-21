# Making the "not a robot" check actually stop bots

There are two files:
- **apply.html** — the updated application page. Instead of saving straight
  to the database, it now sends the form + captcha token to a small server
  function.
- **submit-application/index.ts** — that server function. It checks the
  token with Google, and only saves the application if the check passes.

You need to install `index.ts` on Supabase (it's not a normal webpage file —
it's a small program that runs on Supabase's servers). Here's how, using
Supabase's free command-line tool.

## 1. Get reCAPTCHA keys
Go to https://www.google.com/recaptcha/admin, register a new site, choose
**reCAPTCHA v2 → "I'm not a robot" Checkbox**. Add your domain. You'll get
two keys:
- **Site key** — goes in `apply.html` (public, safe to show)
- **Secret key** — goes only on the server, never in `apply.html`

## 2. Install the Supabase CLI
```
npm install -g supabase
```

## 3. Log in and link your project
```
supabase login
supabase link --project-ref ggbfzfzbquywzuxkoufp
```
(That project ref is from your existing Supabase URL:
`https://ggbfzfzbquywzuxkoufp.supabase.co`)

## 4. Set your secret key on Supabase (not in any file)
```
supabase secrets set RECAPTCHA_SECRET_KEY=your_secret_key_here
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically —
you don't set those yourself.

## 5. Deploy the function
Put `index.ts` in a folder called `supabase/functions/submit-application/`
in your project, then run:
```
supabase functions deploy submit-application
```
This prints a URL like:
```
https://ggbfzfzbquywzuxkoufp.supabase.co/functions/v1/submit-application
```

## 6. Update apply.html
Open `apply.html` and fill in the two placeholders:
- `data-sitekey="PASTE_RECAPTCHA_SITE_KEY_HERE"` → your **site key**
- `SUBMIT_APPLICATION_URL = "PASTE_YOUR_EDGE_FUNCTION_URL_HERE"` → the URL
  from step 5

## 7. (Important) Lock the database so this can't be skipped
Right now, your database's public key (the "anon key" in the Supabase
config) can still be used to write directly, bypassing all of this — same
problem as before, just for the direct database call instead of the
webpage. In your Supabase dashboard → **Authentication → Policies** (or
**Table Editor → ichc_kv → RLS**), restrict the `ichc_kv` table so the
public anon key can no longer `INSERT`/`UPDATE` the row where
`key = 'applications:list'`. Only your new server function — using the
service role key — should be able to write it. I can write the exact
policy for you if you'd like; I don't have access to your Supabase project
to do it myself.

---
**Bottom line:** without step 7, someone could still skip the whole page
and write straight to the database like before. Step 7 is what actually
closes that door.
