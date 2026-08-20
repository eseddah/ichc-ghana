# Deploying the "Generate with Claude" webhook

This makes the "Generate a draft with Claude" button on the Exams tab actually work,
without ever putting your Anthropic API key inside the portal page itself.

## What you need
- A free Vercel account (https://vercel.com)
- An Anthropic API key (from https://console.anthropic.com — separate from your
  claude.ai login; this is billed API usage, not a Claude Pro subscription)

## Steps

1. **Get an Anthropic API key**, if you don't have one: console.anthropic.com →
   Settings → API Keys → Create Key. Copy it somewhere safe — you'll paste it once
   into Vercel and never need it in the portal file.

2. **Create a new folder** on your computer, e.g. `ichc-ai-proxy`, and put
   `api/generate-exam.js` (the file I made) inside it at exactly that path:
   ```
   ichc-ai-proxy/
     api/
       generate-exam.js
   ```

3. **Deploy it to Vercel.** Easiest way if you don't already use Git/GitHub:
   - Install the Vercel CLI: `npm install -g vercel`
   - In that folder, run: `vercel`
   - Follow the prompts (log in, accept defaults) — it'll give you a live URL like
     `https://ichc-ai-proxy.vercel.app`

   (If you're comfortable with GitHub instead: push the folder to a new repo, then
   "Import Project" on vercel.com and point it at that repo — same result.)

4. **Add your API key as an environment variable** (don't skip this — without it the
   function will run but return an error):
   - Vercel dashboard → your project → Settings → Environment Variables
   - Name: `ANTHROPIC_API_KEY`
   - Value: the key you copied in step 1
   - Save, then redeploy (Vercel dashboard → Deployments → ⋯ → Redeploy) so the
     variable takes effect.

5. **Copy your endpoint URL.** It'll be:
   ```
   https://<your-project-name>.vercel.app/api/generate-exam
   ```

6. **Paste it into the portal.** Sign in as Ambassador → Settings → "Exam generation"
   section → Webhook URL → paste → Save connections.

That's it — the "Generate a draft with Claude" button on the Exams tab will now call
this endpoint, which calls Claude with your key on the server side, and returns a
draft into the exam content box for the coordinator to review and edit before posting.

## Cost note
Each generation is a normal Anthropic API call, billed to whatever account owns that
API key — a few cents per generated draft, not free, but generally very low unless
generation is used very heavily.
