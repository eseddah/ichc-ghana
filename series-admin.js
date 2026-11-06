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
  const detail = r => r.intent === 'attend' ? [r.attend_session, r.attend_reminder && 'reminder by ' + r.attend_reminder, r.attend_question && 'Q: ' + r.attend_question]
    : r.intent === 'suggest' ? [r.topic, r.topic_reason]
    : [r.speak_title, r.speak_field, r.speak_track, r.speak_month, r.speak_bio, r.speak_link];
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
        (!q || [r.full_name, r.email, r.institution, r.topic, r.speak_title, r.speak_field].some(x => (x || '').toLowerCase().includes(q))));
      root.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === st.tab));
      $(root, '[data-count]').textContent = L.length + ' shown';
      $(root, '[data-list]').innerHTML = L.length ? `<table style="width:100%;border-collapse:collapse;font-size:13.5px;"><thead><tr style="text-align:left;"><th>Person</th><th>Joining as</th><th>Details</th><th>Best times</th><th>Status</th></tr></thead><tbody>` +
        L.map(r => `<tr style="vertical-align:top;border-top:1px solid #DDD8C9;"><td style="padding:8px 8px 8px 0;"><b>${esc(r.full_name)}</b><br>${esc(r.email)}${r.whatsapp ? '<br>' + esc(r.whatsapp) : ''}<br><span class="note">${esc(r.institution)} · ${esc(r.role)}</span></td>
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
      const cols = ['created_at', 'intent', 'status', 'full_name', 'email', 'whatsapp', 'institution', 'role', 'best_times', 'attend_session', 'attend_question', 'attend_reminder', 'topic', 'topic_reason', 'speak_field', 'speak_title', 'speak_track', 'speak_bio', 'speak_link', 'speak_month'];
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

  window.SeriesAdmin = { windowCard, contentCard, responses, managerCard };
})();
