// api/generate-exam.js
//
// Deploy this on Vercel (or any host that runs Node serverless functions) alongside
// or separately from your portal.html. It keeps your Anthropic API key on the server,
// never in the browser — the portal only ever talks to this endpoint.
//
// Set up:
//   1. Create a new Vercel project (or add this file to an existing one) with this
//      exact path: api/generate-exam.js
//   2. In the Vercel dashboard: Settings → Environment Variables → add
//      ANTHROPIC_API_KEY = <your real Anthropic API key>
//   3. Deploy. Your endpoint will be something like:
//      https://your-project.vercel.app/api/generate-exam
//   4. Paste that URL into the portal's Settings tab → "Exam generation" webhook field.

export default async function handler(req, res) {
  // Allow the portal (hosted on a different domain) to call this endpoint.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set on the server.' });
    return;
  }

  const { subject, difficulty, timeLimitMin } = req.body || {};
  if (!subject) {
    res.status(400).json({ error: 'subject is required' });
    return;
  }

  const prompt = `Write one real, exam-style chemistry problem (or a short set of closely related sub-questions) suitable for a timed ${timeLimitMin || 60}-minute session, at "${difficulty || 'Intermediate'}" difficulty, on the topic: "${subject}".

This is for students preparing for the International Chemistry Competition (IChC), so it should be rigorous and match the style of real competition problems — clear numbered parts, precise wording, and (where relevant) numeric data needed to solve it.

Output ONLY the exam content itself — the question text a student would see. Do not include an answer key, do not include commentary about the question, and do not include any preamble like "Here is a question". Start directly with the problem.`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error', anthropicRes.status, errText);
      res.status(502).json({ error: 'Claude API request failed' });
      return;
    }

    const data = await anthropicRes.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');
    const content = textBlock ? textBlock.text.trim() : '';

    if (!content) {
      res.status(502).json({ error: 'No content returned' });
      return;
    }

    res.status(200).json({ content });
  } catch (err) {
    console.error('generate-exam handler failed', err);
    res.status(500).json({ error: 'Unexpected server error' });
  }
}
