/* Chemistry Series admin screens, shared by portal.html (ambassador) and series-manager.html.
   Every call goes through Supabase with the signed-in user's session; RLS decides what works. */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const ERR = {
    active_exists: 'There is already an active Series Manager. Use Reassign instead.',
    no_active: 'There is no active Series Manager.',
    not_in_roster: 'That person is not on the roster.',
    same_person: 'That person already holds the role.',
    'not allowed': 'You are not allowed to do that.',
    'invalid:email': 'Enter a valid email address.',
    'invalid:full_name': 'Enter the full name.',
    'invalid:whatsapp': 'Check the WhatsApp number.'
  };
  const msg = e => ERR[(e && e.message) || ''] || ((e && e.message) || 'Something went wrong.');
  const when = iso => iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Africa/Accra', dateStyle: 'medium', timeStyle: 'short' }) + ' (Ghana time)' : 'not set';
  const toInput = iso => iso ? new Date(iso).toISOString().slice(0, 16) : '';   // Africa/Accra is UTC+0 all year
  const fromInput = v => v ? new Date(v + ':00Z').toISOString() : null;
  const $ = (root, s) => root.querySelector(s);
  const INTENT = { attend: 'Attend', suggest: 'Suggest a topic', speak: 'Speak' };
  const STATUS = ['new', 'shortlisted', 'contacted', 'confirmed', 'declined'];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const note = (root, t, bad) => { const n = $(root, '[data-note]'); if (n) { n.textContent = t; n.style.color = bad ? '#B42318' : ''; } };

  // ---------------------------------------------------------------- open / deadline
  async function windowCard(root, sb) {
    const { data: s, error } = await sb.from('series_settings').select('*').eq('id', 1).maybeSingle();
    if (error || !s) { root.innerHTML = '<div class="card"><p class="note">Could not load the sign-up window.</p></div>'; return; }
    const state = s.status === 'open' ? 'Open now (manual)' : s.status === 'closed' ? 'Closed now (manual)' :
      (!s.open_at || Date.now() < new Date(s.open_at)) ? 'Not open yet' : (s.deadline && Date.now() > new Date(s.deadline)) ? 'Closed (deadline passed)' : 'Open (by dates)';
    root.innerHTML = `<div class="card" style="margin-bottom:18px;"><h3 style="margin:0 0 4px;">Sign-up window</h3>
      <p class="note" style="margin:0 0 12px;"><b>${esc(state)}.</b> Opens: ${esc(when(s.open_at))}. Deadline: ${esc(when(s.deadline))}.</p>
      <div style="display:flex;flex-wrap:wrap;gap:12px;">
        <label style="flex:1;min-width:210px;">Opens (Ghana time)<input type="datetime-local" data-open value="${toInput(s.open_at)}" style="width:100%;"></label>
        <label style="flex:1;min-width:210px;">Deadline (Ghana time)<input type="datetime-local" data-dead value="${toInput(s.deadline)}" style="width:100%;"></label></div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
        <button class="btn amber small" type="button" data-act="dates">Save dates and follow them</button>
        <button class="btn teal small" type="button" data-act="open">Open now</button>
        <button class="btn ghost small" type="button" data-act="close">Close now</button></div>
      <p class="note" data-note style="margin:10px 0 0;"></p></div>`;
    root.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', async () => {
      const a = b.dataset.act; let patch;
      if (a === 'open') patch = { status: 'open' };
      else if (a === 'close') patch = { status: 'closed' };
      else patch = { status: 'auto', open_at: fromInput($(root, '[data-open]').value), deadline: fromInput($(root, '[data-dead]').value) };
      if (patch.open_at && patch.deadline && patch.deadline <= patch.open_at) return note(root, 'The deadline must be after the opening time.', true);
      const { error } = await sb.from('series_settings').update(patch).eq('id', 1);
      if (error) return note(root, error.message, true);
      windowCard(root, sb);
    }));
  }

  // ---------------------------------------------------------------- form content (ambassador only)
  async function contentCard(root, sb) {
    const { data: c, error } = await sb.from('series_form_content').select('*').eq('id', 1).maybeSingle();
    if (error || !c) { root.innerHTML = '<div class="card"><p class="note">Could not load the form content.</p></div>'; return; }
    const k = c.content, T = [['heading', 'Heading'], ['intro', 'Intro paragraph'], ['note', 'Bold note line']];
    const pair = (g, l) => `<label style="display:block;margin-top:10px;">${l}<input data-p="${g}" value="${esc(g.split('.').reduce((o, x) => (o || {})[x], k))}" style="width:100%;"></label>`;
    const adv = { steps: k.steps, buttons: k.buttons, fields: k.fields, options: k.options, branches: k.branches, review: k.review };
    root.innerHTML = `<div class="card" style="margin-bottom:18px;"><h3 style="margin:0 0 4px;">Sign-up form content</h3>
      <p class="note" style="margin:0 0 8px;">Only you can edit this. Changes show on the public page straight away.</p>
      ${T.map(([g, l]) => pair(g, l)).join('')}
      ${pair('thankyou.title', 'Thank-you title')}${pair('thankyou.text', 'Thank-you text')}
      ${pair('not_open.title', '"Opens soon" title')}${pair('not_open.text', '"Opens soon" text')}
      ${pair('closed.title', '"Closed" title')}${pair('closed.text', '"Closed" text')}
      <details style="margin-top:12px;"><summary><b>Field labels, options and branch questions</b></summary>
        <p class="note">Edit the wording only. Keep the structure and every "value" exactly as it is, apart from the month and time options, which you can change freely.</p>
        <textarea data-adv rows="14" style="width:100%;font-family:monospace;font-size:12.5px;">${esc(JSON.stringify(adv, null, 2))}</textarea></details>
      <div style="margin-top:12px;"><b>Hero image</b> <span class="note">${c.hero_path ? 'custom image in use' : 'default pattern in use'}</span><br>
        <input type="file" accept="image/jpeg,image/png,image/webp" data-hero>
        ${c.hero_path ? '<button class="btn ghost small" type="button" data-hero-clear>Use the default pattern</button>' : ''}</div>
      <div style="margin-top:12px;"><button class="btn amber small" type="button" data-save>Save content</button></div>
      <p class="note" data-note style="margin:10px 0 0;"></p></div>`;
    $(root, '[data-save]').addEventListener('click', async () => {
      let next = JSON.parse(JSON.stringify(k));
      try { Object.assign(next, JSON.parse($(root, '[data-adv]').value)); } catch (e) { return note(root, 'The advanced box is not valid JSON: ' + e.message, true); }
      root.querySelectorAll('[data-p]').forEach(i => { const p = i.dataset.p.split('.'); let o = next; while (p.length > 1) { const x = p.shift(); o[x] = o[x] || {}; o = o[x]; } o[p[0]] = i.value.trim(); });
      const patch = { content: next };
      const f = $(root, '[data-hero]').files[0];
      if (f) {
        if (f.size > 3145728) return note(root, 'The image is over 3 MB.', true);
        const path = 'hero/' + Date.now() + '.' + (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4);
        const up = await sb.storage.from('series-assets').upload(path, f, { contentType: f.type });
        if (up.error) return note(root, up.error.message, true);
        patch.hero_path = path;
      }
      const { error } = await sb.from('series_form_content').update(patch).eq('id', 1);
      if (error) return note(root, error.message, true);
      contentCard(root, sb);
    });
    const cl = $(root, '[data-hero-clear]');
    if (cl) cl.addEventListener('click', async () => { await sb.from('series_form_content').update({ hero_path: null }).eq('id', 1); contentCard(root, sb); });
  }

  // ---------------------------------------------------------------- responses dashboard
  const detail = r => r.intent === 'attend' ? [r.attend_session, r.topic && 'Topic: ' + r.topic, r.topic_reason && 'Why: ' + r.topic_reason, r.attend_reminder && 'reminder by ' + r.attend_reminder, r.attend_question && 'Q: ' + r.attend_question]
    : r.intent === 'suggest' ? [r.topic, r.topic_reason]
    : [r.speak_title, r.speak_field, r.speak_track === 'other' && r.speak_track_other ? 'Other: ' + r.speak_track_other : r.speak_track, r.speak_month, r.speak_bio, r.speak_link];
  async function responses(root, sb) {
    root.innerHTML = '<div class="card"><p class="note">Loading responses…</p></div>';
    const [rows, sum] = await Promise.all([
      sb.from('series_signups').select('*').order('created_at', { ascending: false }).limit(5000),
      sb.rpc('series_summary')]);
    if (rows.error || sum.error) { root.innerHTML = '<div class="card"><p class="note">Could not load responses: ' + esc((rows.error || sum.error).message) + '</p></div>'; return; }
    const all = rows.data, S = sum.data, st = { tab: 'all', q: '', status: '' };
    const tally = (o, empty) => Object.keys(o || {}).length ? Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li>${esc(k)}: <b>${v}</b></li>`).join('') : `<li class="note">${empty}</li>`;
    const topics = (S.top_topics || []).length ? S.top_topics.map(t => `<li>${esc(t.topic)}: <b>${t.count}</b></li>`).join('') : '<li class="note">No topics yet</li>';
    const box = (t, b) => `<div class="card" style="flex:1;min-width:200px;"><b>${t}</b><ul style="margin:8px 0 0 18px;padding:0;font-size:13.5px;">${b}</ul></div>`;
    root.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
        ${box('Total sign-ups', `<li style="list-style:none;margin-left:-18px;font-size:28px;font-weight:700;">${S.total}</li>` + Object.entries(S.by_intent || {}).map(([k, v]) => `<li>${esc(INTENT[k] || k)}: <b>${v}</b></li>`).join(''))}
        ${box('Most suggested topics', topics)}
        ${box('Sign-ups by country', tally(S.by_country, 'No countries yet'))}
        ${box('Best day and time', tally(S.best_times, 'No answers yet'))}
        ${box('Speaker offers by track', tally(S.speakers_by_track, 'No speaker offers yet'))}</div>
      <div class="card"><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;" data-tabs>
          ${[['all', 'All'], ['attend', 'Attend'], ['suggest', 'Suggest a topic'], ['speak', 'Speak']].map(([k, l]) => `<button class="btn ghost small" type="button" data-tab="${k}">${l}</button>`).join('')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <input type="search" data-q placeholder="Search name, email, school, topic" style="flex:1;min-width:200px;">
          <select data-st><option value="">All statuses</option>${STATUS.map(s => `<option value="${s}">${cap(s)}</option>`).join('')}</select>
          <button class="btn amber small" type="button" data-csv>Export CSV</button></div>
        <p class="note" data-count></p><div data-list style="overflow-x:auto;"></div></div>`;
    const view = () => {
      const q = st.q.toLowerCase();
      const L = all.filter(r => (st.tab === 'all' || r.intent === st.tab) && (!st.status || r.status === st.status) &&
        (!q || [r.full_name, r.email, r.institution, r.country, r.city, r.topic, r.speak_title, r.speak_field].some(x => (x || '').toLowerCase().includes(q))));
      root.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === st.tab));
      $(root, '[data-count]').textContent = L.length + ' shown';
      $(root, '[data-list]').innerHTML = L.length ? `<table style="width:100%;border-collapse:collapse;font-size:13.5px;"><thead><tr style="text-align:left;"><th>Person</th><th>Joining as</th><th>Details</th><th>Best times</th><th>Status</th></tr></thead><tbody>` +
        L.map(r => `<tr style="vertical-align:top;border-top:1px solid #DDD8C9;"><td style="padding:8px 8px 8px 0;"><b>${esc(r.full_name)}</b><br>${esc(r.email)}${r.whatsapp ? '<br>' + esc(r.whatsapp) : ''}<br><span class="note">${esc(r.institution)} · ${esc(r.role === 'other' && r.role_other ? 'other: ' + r.role_other : r.role)}</span>${r.country ? '<br><span class="note">' + esc([r.city, r.country].filter(Boolean).join(', ')) + '</span>' : ''}</td>
          <td>${esc(INTENT[r.intent])}<br><span class="note">${esc(when(r.created_at))}</span></td><td style="max-width:280px;">${detail(r).filter(Boolean).map(esc).join('<br>')}</td>
          <td>${esc((r.best_times || []).join(', '))}</td>
          <td><select data-id="${r.id}">${STATUS.map(s => `<option value="${s}"${r.status === s ? ' selected' : ''}>${cap(s)}</option>`).join('')}</select></td></tr>`).join('') + '</tbody></table>'
        : '<p class="note">Nothing matches.</p>';
      root.querySelectorAll('select[data-id]').forEach(s => s.addEventListener('change', async () => {
        const { error } = await sb.from('series_signups').update({ status: s.value }).eq('id', s.dataset.id);
        if (error) { alert(error.message); return responses(root, sb); }
        const r = all.find(x => x.id === s.dataset.id); if (r) r.status = s.value;
      }));
    };
    root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { st.tab = b.dataset.tab; view(); }));
    $(root, '[data-q]').addEventListener('input', e => { st.q = e.target.value; view(); });
    $(root, '[data-st]').addEventListener('change', e => { st.status = e.target.value; view(); });
    $(root, '[data-csv]').addEventListener('click', () => {
      const cols = ['created_at', 'intent', 'status', 'full_name', 'email', 'whatsapp', 'country', 'city', 'timezone', 'institution', 'role', 'role_other', 'best_times', 'attend_session', 'attend_question', 'attend_reminder', 'topic', 'topic_reason', 'speak_field', 'speak_title', 'speak_track', 'speak_track_other', 'speak_bio', 'speak_link', 'speak_month'];
      const cell = v => { let t = Array.isArray(v) ? v.join('; ') : String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };
      const L = all.filter(r => (st.tab === 'all' || r.intent === st.tab) && (!st.status || r.status === st.status));
      const csv = '\ufeff' + cols.join(',') + '\n' + L.map(r => cols.map(c => cell(r[c])).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'chemistry-series-' + st.tab + '-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    });
    view();
  }

  // ---------------------------------------------------------------- Series Manager role (ambassador only)
  async function managerCard(root, sb, ppl) {
    const [a, l] = await Promise.all([
      sb.from('series_manager').select('*').eq('status', 'active').maybeSingle(),
      sb.from('series_manager_log').select('*').order('at', { ascending: false }).limit(30)]);
    const cur = a.data, log = l.data || [];
    const list = src => (src === 'coordinator' ? ppl.coordinators : ppl.students || []).filter(p => p && p.email).sort((x, y) => String(x.name).localeCompare(String(y.name)));
    root.innerHTML = `<div class="card" style="margin-bottom:14px;">
      ${cur ? `<p style="margin:0;"><b>${esc(cur.full_name)}</b> is the Series Manager.<br><span class="note">${esc(cur.email)}${cur.whatsapp ? ' · ' + esc(cur.whatsapp) : ''} · since ${esc(when(cur.assigned_at))}</span></p>`
            : '<p style="margin:0;" class="note">No one holds this role right now.</p>'}
      <p class="note" style="margin:10px 0;">The Series Manager signs in at <b>series-manager.html</b> with a code sent to their email, and sees only the Chemistry Series responses. Access ends the moment you end or reassign the role.</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
        <select data-src><option value="coordinator">Existing coordinator</option><option value="student">Existing student</option><option value="new">New person</option></select>
        <select data-who style="max-width:260px;"></select></div>
      <div data-new style="display:none;flex-wrap:wrap;gap:8px;margin-top:8px;">
        <input data-n placeholder="Full name" style="flex:1;min-width:160px;"><input data-e type="email" placeholder="Email" style="flex:1;min-width:180px;"><input data-w type="tel" placeholder="WhatsApp number" style="flex:1;min-width:150px;"></div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
        <button class="btn amber small" type="button" data-go>${cur ? 'Reassign to this person' : 'Assign the role'}</button>
        ${cur ? '<button class="btn ghost small" type="button" data-end>End the role</button>' : ''}</div>
      <p class="note" data-note style="margin:10px 0 0;"></p></div>
      <div class="card"><b>History</b>${log.length ? '<ul style="margin:8px 0 0 18px;padding:0;font-size:13.5px;">' + log.map(x => `<li>${esc({ assign: 'Assigned', reassign: 'Reassigned to', terminate: 'Ended' }[x.action])}: <b>${esc(x.person_name || x.person_email)}</b> (${esc(x.person_email)}) by ${esc(x.by_email)}, ${esc(when(x.at))}${x.details && x.details.reason ? ' · ' + esc(x.details.reason) : ''}</li>`).join('') + '</ul>' : '<p class="note" style="margin:6px 0 0;">Nothing yet.</p>'}</div>`;
    const src = $(root, '[data-src]'), who = $(root, '[data-who]'), nw = $(root, '[data-new]');
    const fill = () => {
      const isNew = src.value === 'new'; nw.style.display = isNew ? 'flex' : 'none'; who.style.display = isNew ? 'none' : '';
      who.innerHTML = '<option value="">Choose…</option>' + list(src.value).map((p, i) => `<option value="${i}">${esc(p.name)} (${esc(p.email)})</option>`).join('');
    };
    src.addEventListener('change', fill); fill();
    $(root, '[data-go]').addEventListener('click', async () => {
      let p;
      if (src.value === 'new') p = { n: $(root, '[data-n]').value, e: $(root, '[data-e]').value, w: $(root, '[data-w]').value, ref: null };
      else { const x = list(src.value)[who.value]; if (!x) return note(root, 'Choose a person first.', true); p = { n: x.name, e: x.email, w: x.phone || x.whatsapp || '', ref: x.id }; }
      if (cur && !confirm('This removes ' + cur.full_name + "'s access immediately. Continue?")) return;
      const { error } = await sb.rpc(cur ? 'series_manager_reassign' : 'series_manager_assign', { p_email: p.e, p_name: p.n, p_whatsapp: p.w || null, p_source: src.value, p_ref: p.ref });
      if (error) return note(root, msg(error), true);
      managerCard(root, sb, ppl);
    });
    const end = $(root, '[data-end]');
    if (end) end.addEventListener('click', async () => {
      if (!confirm('End the Series Manager role for ' + cur.full_name + '? Their access stops immediately.')) return;
      const { error } = await sb.rpc('series_manager_terminate', { p_reason: null });
      if (error) return note(root, msg(error), true);
      managerCard(root, sb, ppl);
    });
  }


  // ---------------------------------------------------------------- emails: confirmation wording + emailing sign-ups
  const FN_ERR = {
    not_signed_in: 'Please sign in again.', not_allowed: 'You do not have access to send these emails.',
    subject_too_short: 'Write a subject first.', message_too_short: 'Write a message first.',
    nobody_matches: 'No one matches that audience.', too_many: 'That is more than 500 people. Narrow it with the filters and send in parts.',
    email_not_configured: 'The email sender is not set up on the server.', server_error: 'Something went wrong on the server. Please try again.'
  };
  async function callMail(sb, body) {
    const { data, error } = await sb.functions.invoke('series-email', { body });
    if (!error) return data;
    let code = ''; try { code = (await error.context.json()).error; } catch (e) {}
    throw new Error(FN_ERR[code] || code || error.message || 'Something went wrong.');
  }
  const HELP = 'You can use {first_name}, {full_name}, {email} and {country} in the subject and message. Each person gets their own details filled in.';
  async function emailCard(root, sb) {
    const [t, lg] = await Promise.all([
      sb.from('series_email_template').select('*').eq('id', 1).maybeSingle(),
      sb.from('series_email_log').select('*').order('at', { ascending: false }).limit(8)]);
    if (t.error || !t.data) { root.innerHTML = '<div class="card"><p class="note">Could not load the email settings.</p></div>'; return; }
    const T = t.data, L = lg.data || [];
    if (!document.getElementById('sem-css')) {
      const st = document.createElement('style'); st.id = 'sem-css';
      st.textContent = `
.sem{display:grid;gap:22px}
.sem-card{background:#fff;border:1px solid #DDD8C9;border-radius:18px;box-shadow:0 1px 2px rgba(15,36,56,.04),0 14px 30px -24px rgba(15,36,56,.35);overflow:hidden}
.sem-head{display:flex;gap:14px;align-items:center;padding:18px 24px;border-bottom:1px solid #DDD8C9;background:linear-gradient(#fff,#FBFAF6)}
.sem-ico{flex:none;width:42px;height:42px;border-radius:12px;background:#0F2438;color:#E39A3B;display:grid;place-items:center}
.sem-ico svg{width:20px;height:20px}
.sem-head h3{margin:0;font-size:17px;color:#0A1826}
.sem-head p{margin:3px 0 0;font-size:13.5px;color:#6B7280;line-height:1.45}
.sem-body{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr)}
.sem-form{padding:22px 24px;display:grid;gap:16px;align-content:start}
.sem-prev{padding:22px 24px;background:#F4F1E8;border-left:1px solid #DDD8C9}
@media(max-width:900px){.sem-body{grid-template-columns:1fr}.sem-prev{border-left:0;border-top:1px solid #DDD8C9}}
.sem-sec{font-size:11.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#C97F22;margin:0 0 8px;display:flex;align-items:center;gap:8px}
.sem-sec b{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#0F2438;color:#fff;font-size:11px;letter-spacing:0}
.sem-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
@media(max-width:560px){.sem-grid{grid-template-columns:1fr}}
.sem-form label{margin:0}
.sem-form label>span{display:block;margin-bottom:6px}
.sem-form input[type=text],.sem-form input:not([type]),.sem-form select,.sem-form textarea{width:100%}
.sem-form textarea{min-height:170px;line-height:1.55;resize:vertical}
.sem-switch{display:flex;gap:12px;align-items:center;padding:12px 14px;border:1px solid #DDD8C9;border-radius:12px;background:#FBFAF6;text-transform:none!important;letter-spacing:0!important;font-size:14px!important;color:#1B2430!important;font-weight:600!important}
.sem-switch input{width:18px;height:18px;accent-color:#E39A3B;flex:none}
.sem-hint{font-size:12.5px;color:#6B7280;line-height:1.5;margin:0}
.sem-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.sem-tags code{font-size:12px;background:#F4F1E8;border:1px solid #DDD8C9;border-radius:6px;padding:2px 7px;color:#0F2438}
.sem-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding-top:4px}
.sem-note{font-size:13px;color:#6B7280;margin:0;min-height:18px}
.sem-count{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:#0F2438;background:#FFF4E0;border:1px solid #F0D3A0;border-radius:999px;padding:6px 14px}
.sem-who{border:1px solid #DDD8C9;border-radius:12px;background:#FBFAF6;padding:10px 12px;display:none}
.sem-who summary{cursor:pointer;font-size:13px;font-weight:600;color:#0F2438}
.sem-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;max-height:170px;overflow:auto}
.sem-chip{display:inline-flex;align-items:center;gap:8px;padding:3px 11px 3px 3px;border-radius:999px;background:#fff;border:1px solid #DDD8C9;font-size:13px;color:#1B2430}
.sem-av{width:24px;height:24px;border-radius:50%;background:#0F2438;color:#fff;font-size:10.5px;font-weight:700;display:grid;place-items:center}
.sem-ptitle{display:flex;justify-content:space-between;align-items:center;margin:0 0 12px;font-size:11.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#6B7280}
.sem-ptitle em{font-style:normal;font-weight:600;letter-spacing:0;text-transform:none;font-size:12px}
.sem-mail{background:#fff;border:1px solid #DDD8C9;border-radius:14px;overflow:hidden;box-shadow:0 18px 30px -24px rgba(15,36,56,.5)}
.sem-mmeta{padding:12px 18px;border-bottom:1px solid #EEE9DA;font-size:12.5px;color:#6B7280;display:grid;gap:3px}
.sem-mmeta b{color:#1B2430;font-weight:600}
.sem-mtop{background:#0F2438;padding:20px 22px 18px}
.sem-mtop small{display:block;color:#E39A3B;font-size:10.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;margin-bottom:6px}
.sem-mtop div{color:#fff;font-size:17px;font-weight:700;line-height:1.3}
.sem-mbody{padding:20px 22px;font-size:14px;line-height:1.65;color:#1B2430;white-space:pre-wrap;word-break:break-word;min-height:120px}
.sem-mfoot{padding:14px 22px;background:#FBFAF6;border-top:1px solid #EEE9DA;font-size:11.5px;color:#6B7280;line-height:1.5}
.sem-flag{display:flex;height:5px}.sem-flag i{flex:1}.sem-flag i:nth-child(1){background:#CE1126}.sem-flag i:nth-child(2){background:#FCD116}.sem-flag i:nth-child(3){background:#006B3F}
.sem-log{margin:0;padding:0;list-style:none;display:grid;gap:8px;font-size:13.5px}
.sem-log li{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;padding:10px 12px;border:1px solid #EEE9DA;border-radius:10px;background:#FBFAF6}
.sem-log .t{font-size:12px;color:#6B7280}
.sem-tag{font-size:11px;font-weight:700;border-radius:999px;padding:2px 9px;background:#E7F4EC;color:#0B6B3A}
.sem-tag.p{background:#EEF1F6;color:#41506B}.sem-tag.f{background:#FDECEA;color:#B42318}
`;
      document.head.appendChild(st);
    }
    const ICON_MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';
    const ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>';
    const TAGS = '<div class="sem-tags"><code>{first_name}</code><code>{full_name}</code><code>{email}</code><code>{country}</code></div>';
    const mockup = id => `<div class="sem-ptitle">Live preview <em>Example with a sample name</em></div>
      <div class="sem-mail"><div class="sem-mmeta"><span><b>To:</b> <span data-${id}-to></span></span><span><b>Subject:</b> <span data-${id}-psub></span></span></div>
        <div class="sem-mtop"><small>Chemistry Series</small><div data-${id}-psub2></div></div>
        <div class="sem-mbody" data-${id}-pbody></div>
        <div class="sem-mfoot">You are receiving this because you signed up for the Chemistry Series.</div><div class="sem-flag"><i></i><i></i><i></i></div></div>
      <p class="sem-hint" style="margin-top:10px;">An approximate preview. Use “Email me a preview” to see the real email in your inbox.</p>`;
    const logHtml = L.length ? `<div class="sem-card"><div class="sem-head"><div><h3>Recently sent</h3><p>The last ${L.length} emails sent from this page.</p></div></div><div class="sem-form"><ul class="sem-log">` + L.map(x => {
      const prev = x.kind === 'test';
      return `<li><span class="sem-tag ${prev ? 'p' : ''}">${prev ? 'Preview' : x.recipients + ' sent'}</span>${!prev && x.failed ? `<span class="sem-tag f">${x.failed} failed</span>` : ''}<b>${esc(x.subject)}</b><span class="t">${esc(when(x.at))} · by ${esc(x.by_email)}</span></li>`;
    }).join('') + '</ul></div></div>' : '';

    root.innerHTML = `<div class="sem">
      <div class="sem-card"><div class="sem-head"><div class="sem-ico">${ICON_MAIL}</div><div><h3>Confirmation email</h3><p>Sent automatically to everyone who completes the sign-up form.</p></div></div>
        <div class="sem-body"><div class="sem-form">
          <label class="sem-switch"><input type="checkbox" data-t-on ${T.enabled ? 'checked' : ''}> Send the confirmation email automatically</label>
          <label><span>Subject</span><input data-t-sub value="${esc(T.subject)}" maxlength="150"></label>
          <label><span>Message</span><textarea data-t-body maxlength="4000">${esc(T.body)}</textarea></label>
          <p class="sem-hint"><b>{details}</b> fills in what they chose (session, topic or talk). You can also use:</p>${TAGS}
          <div class="sem-actions"><button class="btn amber small" type="button" data-t-save>Save confirmation email</button><button class="btn ghost small" type="button" data-t-test>Email me a preview</button></div>
          <p class="sem-note" data-t-note></p></div>
          <div class="sem-prev">${mockup('t')}</div></div></div>

      <div class="sem-card"><div class="sem-head"><div class="sem-ico">${ICON_SEND}</div><div><h3>Email the people who signed up</h3><p>Send an announcement, session details or a reminder. Each person gets their own name filled in.</p></div></div>
        <div class="sem-body"><div class="sem-form">
          <div><p class="sem-sec"><b>1</b> Choose who receives it</p>
            <div class="sem-grid">
              <label><span>Joining as</span><select data-m-intent><option value="">Everyone</option><option value="attend">Attending</option><option value="suggest">Suggested a topic</option><option value="speak">Speakers</option></select></label>
              <label><span>Status</span><select data-m-status><option value="">Any status</option>${STATUS.map(s => `<option value="${s}">${cap(s)}</option>`).join('')}</select></label>
              <label><span>Country</span><input data-m-country placeholder="Optional"></label></div>
            <p style="margin:12px 0 8px;"><span class="sem-count" data-m-count>Counting…</span></p>
            <details class="sem-who" data-m-namesbox><summary>See who will receive it</summary><div class="sem-chips" data-m-names></div></details></div>
          <div><p class="sem-sec"><b>2</b> Write your message</p>
            <label style="display:block;margin-bottom:12px;"><span>Subject</span><input data-m-sub maxlength="150" placeholder="e.g. Your Chemistry Series session details"></label>
            <label><span>Message</span><textarea data-m-body maxlength="5000" placeholder="Hi {first_name},"></textarea></label>
            <p class="sem-hint" style="margin-top:8px;">Personalise with:</p>${TAGS}</div>
          <div><p class="sem-sec"><b>3</b> Send</p>
            <div class="sem-actions"><button class="btn ghost small" type="button" data-m-test>Email me a preview</button><button class="btn amber small" type="button" data-m-send>Send to everyone selected</button></div>
            <p class="sem-note" data-m-note style="margin-top:10px;"></p></div></div>
          <div class="sem-prev">${mockup('m')}</div></div></div>
      ${logHtml}</div>`;

    // Live previews: fill the placeholders with a sample person so the layout can be judged as you type.
    const fillTpl = (t, v) => esc(t).replace(/\{(first_name|full_name|email|country|details)\}/g, (m, k) => esc(v[k] || m));
    const sample = () => { const n = (names[0] || 'Ama Mensah'); return { first_name: n.split(' ')[0], full_name: n, email: 'name@example.com', country: 'Ghana', details: 'Session: January 2027' }; };
    const paint = (id, subSel, bodySel, fallbackSub) => {
      const v = sample(), sub = $(root, subSel).value.trim() || fallbackSub, body = $(root, bodySel).value;
      $(root, `[data-${id}-to]`).textContent = v.full_name + ' <' + v.email + '>';
      $(root, `[data-${id}-psub]`).innerHTML = fillTpl(sub, v); $(root, `[data-${id}-psub2]`).innerHTML = fillTpl(sub, v);
      $(root, `[data-${id}-pbody]`).innerHTML = body.trim() ? fillTpl(body, v) : '<span style="color:#9AA1AC;">Your message appears here as you type.</span>';
    };
    const repaint = () => { paint('t', '[data-t-sub]', '[data-t-body]', 'Your subject'); paint('m', '[data-m-sub]', '[data-m-body]', 'Your subject'); };

    let names = [];
    const say = (sel, text, bad) => { const n = $(root, sel); n.textContent = text; n.style.color = bad ? '#B42318' : ''; };
    const busy = (btn, on, label) => { btn.disabled = on; if (label) btn.textContent = on ? 'Working…' : label; };
    const aud = () => ({ intent: $(root, '[data-m-intent]').value, status: $(root, '[data-m-status]').value, country: $(root, '[data-m-country]').value.trim() });

    $(root, '[data-t-save]').addEventListener('click', async e => {
      const b = e.currentTarget, subject = $(root, '[data-t-sub]').value.trim(), body = $(root, '[data-t-body]').value.trim();
      if (subject.length < 3 || body.length < 3) return say('[data-t-note]', 'Write a subject and a message.', true);
      busy(b, true, 'Save confirmation email');
      const { error } = await sb.from('series_email_template').update({ enabled: $(root, '[data-t-on]').checked, subject, body }).eq('id', 1);
      busy(b, false, 'Save confirmation email');
      say('[data-t-note]', error ? error.message : 'Saved. New sign-ups get this wording.', !!error);
    });
    $(root, '[data-t-test]').addEventListener('click', async e => {
      const b = e.currentTarget; busy(b, true, 'Email me a preview'); say('[data-t-note]', 'Sending a preview of the saved version…');
      try { const r = await callMail(sb, { action: 'test_template' }); say('[data-t-note]', r.ok ? 'Preview sent to ' + r.sentTo + '. It shows the last saved version.' : 'The preview could not be sent.', !r.ok); }
      catch (x) { say('[data-t-note]', x.message, true); }
      busy(b, false, 'Email me a preview');
    });

    const recount = async () => {
      const a = aud();
      let q = sb.from('series_signups').select('id,full_name', { count: 'exact' }).eq('consent', true).order('full_name', { ascending: true }).limit(500);
      if (a.intent) q = q.eq('intent', a.intent); if (a.status) q = q.eq('status', a.status); if (a.country) q = q.eq('country', a.country);
      const { data, count, error } = await q;
      names = error ? [] : (data || []).map(r => (r.full_name || '').trim()).filter(Boolean);
      say('[data-m-count]', error ? '' : (count || 0) + (count === 1 ? ' person will receive this' : ' people will receive this'));
      const box = $(root, '[data-m-namesbox]'), ol = $(root, '[data-m-names]');
      const ini = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
      ol.innerHTML = names.map(n => '<span class="sem-chip"><span class="sem-av">' + esc(ini(n)) + '</span>' + esc(n) + '</span>').join('');
      box.style.display = names.length ? 'block' : 'none';
      repaint();
      return count || 0;
    };
    ['[data-m-intent]', '[data-m-status]'].forEach(s => $(root, s).addEventListener('change', recount));
    $(root, '[data-m-country]').addEventListener('change', recount);
    ['[data-t-sub]', '[data-t-body]', '[data-m-sub]', '[data-m-body]'].forEach(q => $(root, q).addEventListener('input', repaint));
    repaint();
    recount();

    $(root, '[data-m-test]').addEventListener('click', async e => {
      const b = e.currentTarget, subject = $(root, '[data-m-sub]').value.trim(), message = $(root, '[data-m-body]').value.trim();
      busy(b, true, 'Email me a preview');
      try { const r = await callMail(sb, { action: 'test_message', subject, message }); say('[data-m-note]', r.ok ? 'Preview sent to ' + r.sentTo + '.' : 'The preview could not be sent.', !r.ok); }
      catch (x) { say('[data-m-note]', x.message, true); }
      busy(b, false, 'Email me a preview');
    });
    $(root, '[data-m-send]').addEventListener('click', async e => {
      const b = e.currentTarget, subject = $(root, '[data-m-sub]').value.trim(), message = $(root, '[data-m-body]').value.trim();
      if (subject.length < 3 || message.length < 3) return say('[data-m-note]', 'Write a subject and a message first.', true);
      const n = await recount();
      if (!n) return say('[data-m-note]', 'No one matches that audience.', true);
      const preview = names.slice(0, 15).join(', ') + (names.length > 15 ? ' and ' + (names.length - 15) + ' more' : '');
      if (!confirm('Send this email to ' + n + (n === 1 ? ' person' : ' people') + (preview ? ':\n\n' + preview : '') + '\n\nThis cannot be undone.')) return;
      busy(b, true, 'Send to everyone selected'); say('[data-m-note]', 'Sending… keep this page open.');
      try {
        const r = await callMail(sb, { action: 'send', subject, message, audience: aud() });
        say('[data-m-note]', 'Done: ' + r.sent + ' sent' + (r.failed ? ', ' + r.failed + ' could not be delivered.' : '.') + (names.length ? ' Sent to: ' + names.join(', ') + '.' : ''), !!r.failed);
        setTimeout(() => emailCard(root, sb), 2500);
      } catch (x) { say('[data-m-note]', x.message, true); }
      busy(b, false, 'Send to everyone selected');
    });
  }

  window.SeriesAdmin = { windowCard, contentCard, responses, managerCard, emailCard };
})();
