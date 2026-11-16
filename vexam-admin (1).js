/* Visitor exams: the Ambassador's tools in the portal.
   Build and schedule the exams shown on the public Exams page (exam.html), mark written and picture answers, release results (emails go out),
   answer messages, grant retakes and read the activity log. Everything goes through the visitor-exam-admin function (Ambassador only).
   Usage: VexamAdmin.mount(element, sb) */
(function(){
'use strict';
if(window.VexamAdmin) return;
const esc = s=> String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const CSS = `
.vxa{--i:#1D1B3A;--m:#5E6478;--l:#E3DFF5;--b:#5B3FD8;--b2:#4527B8;--s:#fff;--s2:#F8F6FF;--a:#FFB52E;--ae:#C98300;--ok:#16784F;--okb:#E2F5EC;--bad:#B8323F;--badb:#FCE8EA;--wb:#FFF3D6;--wi:#7A4D00;color:var(--i);font-size:14.5px}
.vxa *{box-sizing:border-box}.vxa h3{margin:0 0 4px;font-size:17px}.vxa .sub{color:var(--m);font-size:13px}
.vxa .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}.vxa .tab{padding:9px 18px;border-radius:999px;border:1px solid var(--l);background:var(--s);font-weight:600;font-size:13.5px;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 2px 0 var(--l)}.vxa .tab.on{background:var(--b);color:#fff;border-color:var(--b2);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 2px 0 var(--b2)}.vxa .tab i{font-style:normal;margin-left:6px;padding:1px 8px;border-radius:99px;background:var(--a);color:#1D1B3A;font-size:12px}
.vxa .btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:999px;border:1px solid var(--l);background:var(--s);color:var(--i);font:600 13px/1 inherit;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 2px 0 var(--l);transition:transform .08s}.vxa .btn:active{transform:translateY(2px);box-shadow:none}.vxa .btn:disabled{opacity:.5;cursor:default}
.vxa .btn.p{background:var(--b);color:#fff;border-color:var(--b2);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 var(--b2)}.vxa .btn.a{background:var(--a);border-color:var(--ae);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 3px 0 var(--ae)}.vxa .btn.d{color:var(--bad);border-color:var(--bad)}.vxa .btn.g{background:transparent;border-color:transparent;box-shadow:none;color:var(--m)}.vxa .btn.sm{padding:6px 12px;font-size:12.5px}
.vxa .card{background:var(--s);border:1px solid var(--l);border-radius:14px;padding:16px;margin-bottom:12px}.vxa .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.vxa .sp{justify-content:space-between}
.vxa .chip{display:inline-block;padding:3px 11px;border-radius:99px;font-size:12px;font-weight:600;background:#F1EDFF}.vxa .chip.ok{background:var(--okb);color:var(--ok)}.vxa .chip.w{background:var(--wb);color:var(--wi)}.vxa .chip.bad{background:var(--badb);color:var(--bad)}.vxa .chip.n{background:#EEE;color:#555}
.vxa input,.vxa select,.vxa textarea{width:100%;padding:9px 12px;border-radius:10px;border:1px solid var(--l);background:var(--s2);color:var(--i);font:inherit}.vxa textarea{min-height:70px;resize:vertical}.vxa label{display:block;font-weight:600;font-size:12.5px;margin:10px 0 4px}.vxa .g2{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}.vxa .chk{display:flex;gap:8px;align-items:center;font-weight:500}.vxa .chk input{width:auto}
.vxa table{width:100%;border-collapse:collapse}.vxa th{text-align:left;font-size:12px;color:var(--m);padding:8px 10px;border-bottom:1px solid var(--l);white-space:nowrap}.vxa td{padding:10px;border-bottom:1px solid var(--l);vertical-align:top}.vxa .tw{overflow-x:auto;border:1px solid var(--l);border-radius:14px;background:var(--s)}.vxa .tw table td:first-child,.vxa .tw table th:first-child{padding-left:14px}
.vxa .q{border:1px solid var(--l);border-radius:12px;padding:14px;margin-bottom:12px;background:var(--s2)}.vxa .q .hd{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:6px}.vxa .opt{display:flex;gap:8px;align-items:center;margin:6px 0}.vxa .opt input[type=radio]{width:auto}
.vxa .msg{max-width:84%;padding:9px 13px;border-radius:14px;border:1px solid var(--l);background:var(--s);white-space:pre-wrap;margin:8px 0}.vxa .msg.me{margin-left:auto;background:var(--b);color:#fff;border-color:var(--b2)}.vxa .msg small{display:block;opacity:.7;font-size:11px;margin-top:3px}
.vxa .ans{padding:10px 12px;border-radius:10px;border:1px solid var(--l);background:var(--s);white-space:pre-wrap}.vxa .imgs{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.vxa .imgs img{width:130px;height:130px;object-fit:cover;border-radius:10px;border:1px solid var(--l)}
.vxa .keyb{margin-top:8px;padding:10px 12px;border-radius:10px;background:var(--wb);color:var(--wi);font-size:13px;white-space:pre-wrap}.vxa .err{padding:10px 14px;border-radius:10px;background:var(--badb);color:var(--bad);margin:10px 0}.vxa .okm{padding:10px 14px;border-radius:10px;background:var(--okb);color:var(--ok);margin:10px 0}.vxa .empty{padding:26px;text-align:center;color:var(--m);border:1px dashed var(--l);border-radius:14px}
.vxa .bg{position:fixed;inset:0;background:rgba(18,17,42,.55);z-index:5000;display:grid;place-items:center;padding:16px}.vxa .bx{background:#fff;border-radius:16px;padding:20px;width:min(520px,100%);max-height:90vh;overflow:auto}
`;
function inject(){ if(document.getElementById('vxa-css')) return; const s = document.createElement('style'); s.id = 'vxa-css'; s.textContent = CSS; document.head.appendChild(s); }
const toLocal = iso=> { const d = new Date(iso); if(!isFinite(+d)) return ''; const p = n=> String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const when = iso=> iso ? new Date(iso).toLocaleString(undefined, { day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' }) : '–';
const uid = ()=> 'q' + Math.random().toString(36).slice(2, 8);
const TLAB = { mcq:'Multiple choice', short:'Short answer', structured:'Structured', calc:'Calculation', theory:'Theory', photo:'Picture answer' };
const DEFQ = t=> ({ id:uid(), type:t, text:'', marks:t === 'mcq' ? 1 : t === 'short' ? 2 : 5, timeSec:t === 'mcq' ? 60 : t === 'short' ? 90 : 240, options:['', '', '', ''], correct:0, scheme:'', answer:'' });

function mount(el, sb){
  inject(); const R = document.createElement('div'); R.className = 'vxa'; el.innerHTML = ''; el.appendChild(R);
  const st = { tab:'exams', exams:[], ed:null, att:{ list:[], exam:'', status:'', q:'', sel:new Set() }, open:null, unread:0 };
  const call = async (action, body)=>{
    const { data, error } = await sb.functions.invoke('visitor-exam-admin', { body:Object.assign({ action }, body || {}) });
    if(error){ let j = {}; try{ j = await error.context.json(); }catch(e){} throw { message:j.message || 'The request failed. Check your connection and try again.', code:j.error || 'failed' }; }
    return data;
  };
  const say = (m, bad)=>{ const x = R.querySelector('#vxMsg'); if(x){ x.innerHTML = m ? `<div class="${bad ? 'err' : 'okm'}">${esc(m)}</div>` : ''; if(m) setTimeout(()=>{ if(x.firstChild) x.innerHTML = ''; }, 6000); } };
  const dlg = (html)=>{ const b = document.createElement('div'); b.className = 'bg'; b.innerHTML = `<div class="bx">${html}</div>`; R.appendChild(b); b.addEventListener('mousedown', e=>{ if(e.target === b) b.remove(); }); return b; };
  try{ call('set_site', { url:location.href.replace(/[?#].*$/, '').replace(/\/[^/]*$/, '') }); }catch(e){}

  function shell(body){
    const tabs = [['exams', 'Exams'], ['subs', 'Submissions'], ['inbox', 'Messages'], ['vis', 'Visitors'], ['log', 'Activity log']];
    R.innerHTML = `<div class="row sp" style="margin-bottom:6px"><div><h3 style="font-size:20px">Visitor exams</h3><div class="sub">Exams for visitors on the public website. These are separate from the portal exams. Visitors only need a name and email.</div></div><a class="btn sm" href="exam.html" target="_blank" rel="noopener">Open the public Exams page</a></div><div class="tabs">${tabs.map(t=> `<button class="tab ${st.tab === t[0] ? 'on' : ''}" data-t="${t[0]}">${t[1]}${t[0] === 'inbox' && st.unread ? `<i>${st.unread}</i>` : ''}</button>`).join('')}</div><div id="vxMsg"></div><div id="vxBody">${body || ''}</div>`;
    R.querySelectorAll('.tab').forEach(b=> b.addEventListener('click', ()=>{ st.tab = b.dataset.t; st.ed = null; st.open = null; go(); }));
  }
  async function go(){
    shell('<div class="empty">Loading…</div>');
    try{
      if(st.tab === 'exams') return st.ed ? paintEditor() : await paintExams();
      if(st.tab === 'subs') return st.open ? await paintMark() : await paintSubs();
      if(st.tab === 'inbox') return await paintInbox();
      if(st.tab === 'vis') return await paintVisitors();
      return await paintLog();
    }catch(e){ R.querySelector('#vxBody').innerHTML = `<div class="err">${esc(e.message)}</div>`; }
  }
  const body = h=> { R.querySelector('#vxBody').innerHTML = h; return R.querySelector('#vxBody'); };
  const ref = ()=> call('inbox').then(j=>{ st.unread = j.threads.reduce((n, t)=> n + t.unread, 0); }).catch(()=>{});

  // ------------------------------------------------------------ exams list
  async function paintExams(){
    const j = await call('list_exams'); st.exams = j.exams; await ref(); shell();
    const chip = e=> e.status === 'published' ? '<span class="chip ok">Published</span>' : e.status === 'draft' ? '<span class="chip w">Draft</span>' : '<span class="chip n">Archived</span>';
    const b = body(`<div class="row" style="margin-bottom:12px"><button class="btn p" id="vxNew">New exam</button></div>${j.exams.length ? j.exams.map(e=> `<div class="card"><div class="row sp"><div><h3>${esc(e.title)} ${chip(e)}</h3><div class="sub">${esc(e.subject || '')}${e.subject ? ' · ' : ''}Opens ${esc(when(e.startAt))} · Closes ${esc(when(e.endAt))}</div></div><div class="sub">${e.questionCount} questions · ${e.totalMarks} marks · ${e.attempts} attempt${e.attempts > 1 ? 's' : ''}</div></div>
    <div class="row" style="margin:10px 0"><span class="chip">${e.stats.total} attempt${e.stats.total === 1 ? '' : 's'}</span>${e.stats.running ? `<span class="chip w">${e.stats.running} in progress</span>` : ''}${e.stats.pending ? `<span class="chip w">${e.stats.pending} awaiting review</span>` : ''}${e.stats.released ? `<span class="chip ok">${e.stats.released} released</span>` : ''}</div>
    <div class="row"><button class="btn sm" data-a="edit" data-id="${e.id}">Edit</button>${e.status === 'published' ? `<button class="btn sm" data-a="unpub" data-id="${e.id}">Unpublish</button>` : e.status === 'draft' ? `<button class="btn sm a" data-a="pub" data-id="${e.id}">Publish</button>` : `<button class="btn sm" data-a="unpub" data-id="${e.id}">Restore as draft</button>`}<button class="btn sm" data-a="subs" data-id="${e.id}">Submissions</button><button class="btn sm" data-a="dup" data-id="${e.id}">Duplicate</button><button class="btn sm d" data-a="del" data-id="${e.id}">${e.stats.total ? 'Archive' : 'Delete'}</button></div></div>`).join('') : '<div class="empty">No visitor exams yet. Create the first one.</div>'}`);
    b.querySelector('#vxNew').addEventListener('click', ()=>{ st.ed = { title:'', subject:'', instructions:'', dataLine:'', startAt:new Date(Date.now() + 86400000).toISOString(), endAt:new Date(Date.now() + 3 * 86400000).toISOString(), attempts:1, settings:{ fullscreen:true, leaveLimit:0, mcqReview:true }, questions:[DEFQ('mcq')], status:'draft' }; go(); });
    b.querySelectorAll('[data-a]').forEach(x=> x.addEventListener('click', async ()=>{
      const id = x.dataset.id, a = x.dataset.a;
      try{
        if(a === 'edit'){ const r = await call('get_exam', { id }); st.ed = r.exam; return go(); }
        if(a === 'pub' || a === 'unpub'){ await call('set_status', { id, status:a === 'pub' ? 'published' : 'draft' }); return go(); }
        if(a === 'subs'){ st.tab = 'subs'; st.att.exam = id; return go(); }
        if(a === 'dup'){ await call('duplicate_exam', { id }); return go(); }
        if(a === 'del'){ const e = st.exams.find(z=> z.id === id); if(!confirm(e.stats.total ? 'This exam already has attempts, so it will be archived (hidden from visitors) rather than deleted. Continue?' : 'Delete this exam permanently?')) return; await call('delete_exam', { id }); return go(); }
      }catch(e){ say(e.message, true); }
    }));
  }

  // ------------------------------------------------------------ editor
  function paintEditor(){
    shell(); const e = st.ed, qs = e.questions;
    const totalM = qs.reduce((n, q)=> n + (+q.marks || 0), 0), totalT = qs.reduce((n, q)=> n + (+q.timeSec || 0), 0);
    const qHtml = qs.map((q, i)=> `<div class="q" data-i="${i}"><div class="hd"><b>Question ${i + 1} · ${TLAB[q.type]}</b><span class="row"><button class="btn sm g" data-q="up">Up</button><button class="btn sm g" data-q="down">Down</button><button class="btn sm g" data-q="dup">Duplicate</button><button class="btn sm d" data-q="del">Remove</button></span></div>
      <label>Question</label><textarea data-f="text" placeholder="Write the question. Chemical formulas like H2O and arrows like -> are formatted for visitors automatically.">${esc(q.text)}</textarea>
      <div class="g2"><div><label>Marks</label><input type="number" min="0.5" max="50" step="0.5" data-f="marks" value="${esc(q.marks)}"></div><div><label>Time for this question (seconds)</label><input type="number" min="10" max="3600" step="10" data-f="timeSec" value="${esc(q.timeSec)}"></div></div>
      ${q.type === 'mcq' ? `<label>Options (tick the correct one)</label>${[0, 1, 2, 3].map(k=> `<div class="opt"><input type="radio" name="c${i}" data-f="correct" value="${k}" ${+q.correct === k ? 'checked' : ''}><input data-f="opt${k}" value="${esc((q.options || [])[k] || '')}" placeholder="Option ${'ABCD'[k]}"></div>`).join('')}<label>Explanation shown after submitting (optional)</label><textarea data-f="scheme">${esc(q.scheme || '')}</textarea>` : `<label>Model answer (shown to the visitor after you release results)</label><textarea data-f="answer">${esc(q.answer || '')}</textarea><label>Marking scheme (optional)</label><textarea data-f="scheme">${esc(q.scheme || '')}</textarea>`}</div>`).join('');
    body(`<div class="card"><div class="row sp"><h3>${e.id ? 'Edit exam' : 'New exam'}</h3><button class="btn sm g" id="edBack">Back to list</button></div>
    <div class="g2"><div><label>Title</label><input id="edTitle" value="${esc(e.title)}" maxlength="140"></div><div><label>Subject or topic</label><input id="edSub" value="${esc(e.subject)}" maxlength="100"></div></div>
    <label>Instructions shown before the exam starts</label><textarea id="edIns">${esc(e.instructions)}</textarea>
    <label>Data line (optional: constants shown with every written question, such as Ar values)</label><textarea id="edData" style="min-height:50px">${esc(e.dataLine)}</textarea>
    <div class="g2"><div><label>Opens (your local time)</label><input type="datetime-local" id="edStart" value="${toLocal(e.startAt)}"></div><div><label>Closes (your local time)</label><input type="datetime-local" id="edEnd" value="${toLocal(e.endAt)}"></div><div><label>Attempts per visitor</label><input type="number" id="edAtt" min="1" max="10" value="${e.attempts}"></div><div><label>Leaving the exam: auto-submit after more than (0 = never)</label><input type="number" id="edLim" min="0" max="50" value="${e.settings.leaveLimit || 0}"></div></div>
    <div class="row" style="margin-top:10px"><label class="chk"><input type="checkbox" id="edFs" ${e.settings.fullscreen !== false ? 'checked' : ''}> Require full screen</label><label class="chk"><input type="checkbox" id="edRev" ${e.settings.mcqReview !== false ? 'checked' : ''}> Show right answers after multiple choice submit</label></div></div>
    <div class="row sp" style="margin:8px 0"><h3>Questions (${qs.length}) · ${totalM} marks · about ${Math.round(totalT / 60)} min</h3></div>${qHtml}
    <div class="row" style="margin-bottom:14px"><span class="sub">Add:</span>${Object.keys(TLAB).map(t=> `<button class="btn sm" data-add="${t}">${TLAB[t]}</button>`).join('')}</div>
    <div class="row"><button class="btn p" id="edSave">Save</button>${e.status !== 'published' ? '<button class="btn a" id="edPub">Save and publish</button>' : ''}<button class="btn g" id="edCancel">Cancel</button></div>`);
    const B = R.querySelector('#vxBody'), pull = ()=>{
      e.title = B.querySelector('#edTitle').value; e.subject = B.querySelector('#edSub').value; e.instructions = B.querySelector('#edIns').value; e.dataLine = B.querySelector('#edData').value;
      e.startAt = new Date(B.querySelector('#edStart').value).toISOString(); e.endAt = new Date(B.querySelector('#edEnd').value).toISOString(); e.attempts = +B.querySelector('#edAtt').value || 1;
      e.settings = { fullscreen:B.querySelector('#edFs').checked, leaveLimit:+B.querySelector('#edLim').value || 0, mcqReview:B.querySelector('#edRev').checked };
      B.querySelectorAll('.q').forEach(n=>{ const q = qs[+n.dataset.i]; n.querySelectorAll('[data-f]').forEach(f=>{ const k = f.dataset.f; if(k === 'correct'){ if(f.checked) q.correct = +f.value; } else if(/^opt\d$/.test(k)){ q.options = q.options || ['', '', '', '']; q.options[+k.slice(3)] = f.value; } else q[k] = f.value; }); q.marks = +q.marks; q.timeSec = +q.timeSec; });
    };
    const safe = ()=>{ try{ pull(); return true; }catch(x){ say('Choose valid opening and closing times first.', true); return false; } };
    B.querySelector('#edBack').addEventListener('click', ()=>{ st.ed = null; go(); }); B.querySelector('#edCancel').addEventListener('click', ()=>{ st.ed = null; go(); });
    B.querySelectorAll('[data-add]').forEach(x=> x.addEventListener('click', ()=>{ if(safe()){ qs.push(DEFQ(x.dataset.add)); paintEditor(); } }));
    B.querySelectorAll('[data-q]').forEach(x=> x.addEventListener('click', ()=>{ if(!safe()) return; const i = +x.closest('.q').dataset.i, a = x.dataset.q; if(a === 'del'){ if(qs.length > 1 || confirm('An exam needs at least one question.')) qs.splice(i, 1); } else if(a === 'dup') qs.splice(i + 1, 0, Object.assign(JSON.parse(JSON.stringify(qs[i])), { id:uid() })); else if(a === 'up' && i > 0) qs.splice(i - 1, 0, qs.splice(i, 1)[0]); else if(a === 'down' && i < qs.length - 1) qs.splice(i + 1, 0, qs.splice(i, 1)[0]); paintEditor(); }));
    const save = async (publish, force)=>{
      if(!safe()) return; try{
        const r = await call('save_exam', { exam:e, force:!!force }); e.id = r.id; if(publish){ await call('set_status', { id:r.id, status:'published' }); }
        st.ed = null; await go(); say(publish ? 'Saved and published. Visitors can see it on the Exams page.' : 'Saved.');
      }catch(x){ if(x.code === 'locked' && confirm(x.message + '\n\nSave the change anyway?')) return save(publish, true); say(x.message, true); }
    };
    B.querySelector('#edSave').addEventListener('click', ()=> save(false)); const p = B.querySelector('#edPub'); if(p) p.addEventListener('click', ()=> save(true));
  }

  // ------------------------------------------------------------ submissions
  const sChip = a=> a.status === 'void' ? '<span class="chip bad">Voided</span>' : !a.submitted_at ? '<span class="chip w">In progress</span>' : a.status === 'released' ? '<span class="chip ok">Released</span>' : '<span class="chip w">To review</span>';
  async function paintSubs(){
    const A = st.att, j = await call('list_attempts', { examId:A.exam || undefined, status:A.status || undefined }), ex = (await call('list_exams')).exams; A.list = j.attempts; await ref(); shell();
    const q = A.q.toLowerCase(), list = A.list.filter(a=> !q || (a.full_name + ' ' + a.email + ' ' + a.ref).toLowerCase().includes(q));
    const b = body(`<div class="card"><div class="g2"><div><label>Exam</label><select id="sbEx"><option value="">All exams</option>${ex.map(e=> `<option value="${e.id}" ${A.exam === e.id ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}</select></div><div><label>Status</label><select id="sbSt">${[['', 'All'], ['pending', 'To review'], ['released', 'Released'], ['in_progress', 'In progress'], ['void', 'Voided']].map(s=> `<option value="${s[0]}" ${A.status === s[0] ? 'selected' : ''}>${s[1]}</option>`).join('')}</select></div><div><label>Search name, email or reference</label><input id="sbQ" value="${esc(A.q)}"></div></div>
    <div class="row" style="margin-top:12px"><button class="btn a" id="sbRel">Release selected (${A.sel.size})</button>${A.exam ? '<button class="btn" id="sbRelAll">Release all that are fully marked</button>' : ''}<button class="btn" id="sbCsv">Download CSV</button></div></div>
    ${list.length ? `<div class="tw"><table><thead><tr><th></th><th>Visitor</th><th>Exam</th><th>Submitted</th><th>MCQ</th><th>Total</th><th>Status</th><th>Integrity</th><th></th></tr></thead><tbody>${list.map(a=> `<tr><td><input type="checkbox" data-sel="${a.id}" ${A.sel.has(a.id) ? 'checked' : ''} ${a.status === 'pending' ? '' : 'disabled'}></td><td><b>${esc(a.full_name)}</b><div class="sub">${esc(a.email)}<br>${esc(a.ref)} · attempt ${a.attempt_no}</div></td><td>${esc(a.title)}</td><td>${esc(when(a.submitted_at))}${a.auto_reason ? `<div class="sub">auto: ${esc(a.auto_reason)}</div>` : ''}</td><td>${a.mcq_total != null ? a.mcq_score + '/' + a.mcq_total : '–'}</td><td>${a.status === 'released' ? `<b>${a.total_score}/${a.total_marks}</b>` : '–'}</td><td>${sChip(a)}${a.unread ? ` <span class="chip bad">${a.unread} new msg</span>` : ''}</td><td>${a.tab_switches + a.fs_exits ? `<span class="chip ${a.tab_switches + a.fs_exits > 2 ? 'bad' : 'w'}">${a.tab_switches + a.fs_exits} exits</span>` : '<span class="chip ok">clean</span>'}</td><td><button class="btn sm" data-open="${a.id}">Open</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No submissions match.</div>'}`);
    b.querySelector('#sbEx').addEventListener('change', e=>{ A.exam = e.target.value; go(); }); b.querySelector('#sbSt').addEventListener('change', e=>{ A.status = e.target.value; go(); });
    b.querySelector('#sbQ').addEventListener('change', e=>{ A.q = e.target.value; go(); });
    b.querySelectorAll('[data-sel]').forEach(x=> x.addEventListener('change', ()=>{ x.checked ? A.sel.add(x.dataset.sel) : A.sel.delete(x.dataset.sel); b.querySelector('#sbRel').textContent = `Release selected (${A.sel.size})`; }));
    b.querySelectorAll('[data-open]').forEach(x=> x.addEventListener('click', ()=>{ st.open = x.dataset.open; go(); }));
    const rel = async (payload)=>{ try{ const r = await call('release', payload); A.sel.clear(); await go(); say(`Released ${r.released} result${r.released === 1 ? '' : 's'} and emailed the visitors.${r.skipped.length ? ` Skipped (not fully marked): ${r.skipped.join(', ')}.` : ''}`); }catch(e){ say(e.message, true); } };
    b.querySelector('#sbRel').addEventListener('click', ()=>{ if(!A.sel.size) return say('Tick the attempts to release first.', true); if(confirm(`Release ${A.sel.size} result(s) and email the visitors?`)) rel({ ids:[...A.sel] }); });
    const ra = b.querySelector('#sbRelAll'); if(ra) ra.addEventListener('click', ()=>{ if(confirm('Release every fully marked attempt for this exam and email the visitors?')) rel({ examId:A.exam }); });
    b.querySelector('#sbCsv').addEventListener('click', ()=>{ const rows = [['Name', 'Email', 'Exam', 'Attempt', 'Reference', 'Submitted', 'MCQ score', 'MCQ total', 'Total', 'Out of', 'Status', 'Tab switches', 'Full screen exits', 'Auto reason']].concat(list.map(a=> [a.full_name, a.email, a.title, a.attempt_no, a.ref, a.submitted_at || '', a.mcq_score ?? '', a.mcq_total ?? '', a.status === 'released' ? a.total_score : '', a.total_marks ?? '', a.status, a.tab_switches, a.fs_exits, a.auto_reason || ''])); const csv = rows.map(r=> r.map(c=> '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n'); const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type:'text/csv' })); l.download = 'visitor-exam-results.csv'; document.body.appendChild(l); l.click(); l.remove(); });
  }
  async function paintMark(){
    const j = await call('get_attempt', { id:st.open }), a = j.attempt, qs = j.exam.questions, key = j.exam.key || {}; shell();
    const kinds = {}; (a.events || []).forEach(e=> kinds[e.k] = (kinds[e.k] || 0) + 1); const lab = { tab:'switched tab', blur:'left the window', fs_exit:'left full screen', copy:'tried to copy', cut:'tried to cut', paste:'tried to paste', late_advance:'answered late', late_save:'late save' };
    const written = qs.map((q, i)=> ({ q, i })).filter(x=> x.q.type !== 'mcq');
    const cards = written.map(({ q, i })=> { const k = key[q.id] || {}, imgs = (j.urls[q.id] || []); return `<div class="card"><div class="row sp"><b>Question ${i + 1} · ${TLAB[q.type]}</b><span class="sub">${q.marks} marks</span></div><div style="margin:6px 0;white-space:pre-wrap">${esc(q.text)}</div><div class="ans">${esc((a.answers || {})[q.id] || '') || '<i class="sub">No typed answer</i>'}</div>${imgs.length ? `<div class="imgs">${imgs.map(u=> `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Visitor photo"></a>`).join('')}</div>` : ''}${k.answer || k.scheme ? `<div class="keyb">${k.answer ? '<b>Model answer</b>\n' + esc(k.answer) : ''}${k.scheme ? '\n\n<b>Marking scheme</b>\n' + esc(k.scheme) : ''}</div>` : ''}
      <div class="g2" style="margin-top:8px"><div><label>Marks (0 to ${q.marks})</label><input type="number" min="0" max="${q.marks}" step="0.5" data-m="${q.id}" value="${(a.marks || {})[q.id] ?? ''}"></div><div><label>Comment for the visitor</label><input data-c="${q.id}" value="${esc((a.comments || {})[q.id] || '')}"></div></div></div>`; }).join('');
    const body_ = `<div class="row sp" style="margin-bottom:10px"><button class="btn sm g" id="mkBack">Back to submissions</button><span>${sChip(a)}</span></div>
    <div class="card"><div class="row sp"><div><h3>${esc(a.full_name)}</h3><div class="sub">${esc(a.email)} · ${esc(a.ref)} · attempt ${a.attempt_no} of this visitor (${j.siblings.length} total) · ${esc(j.exam.title)}</div></div><div class="sub">Started ${esc(when(a.started_at))}<br>Submitted ${esc(when(a.submitted_at))}${a.auto_reason ? ' (auto: ' + esc(a.auto_reason) + ')' : ''}</div></div>
    <div class="row" style="margin-top:10px"><span class="chip">Multiple choice ${j.mcq.score}/${j.mcq.total}</span><span class="chip ${a.tab_switches + a.fs_exits ? 'w' : 'ok'}">${a.tab_switches} tab switches, ${a.fs_exits} full-screen exits</span>${Object.keys(kinds).map(k=> `<span class="chip n">${kinds[k]} × ${esc(lab[k] || k)}</span>`).join('')}</div></div>
    ${cards || '<div class="empty">This exam has only multiple choice questions, so there is nothing to mark.</div>'}
    <div class="row"><button class="btn p" id="mkSave">Save marks</button>${a.status === 'pending' ? '<button class="btn a" id="mkRel">Save and release to visitor</button>' : ''}${a.status === 'released' ? '<button class="btn" id="mkUn">Withdraw release</button>' : ''}${a.status !== 'void' ? '<button class="btn d" id="mkVoid">Void this attempt</button>' : ''}</div>
    <div class="card" style="margin-top:16px"><h3>Messages with this visitor</h3><div id="mkThread">${j.messages.map(m=> `<div class="msg ${m.from_role === 'ambassador' ? 'me' : ''}">${esc(m.body)}<small>${m.from_role === 'ambassador' ? 'You' : esc(a.full_name)} · ${esc(when(m.created_at))}</small></div>`).join('') || '<div class="sub">No messages.</div>'}</div><label>Reply (also emailed to the visitor)</label><textarea id="mkReply"></textarea><div class="row" style="margin-top:8px"><button class="btn p" id="mkSend">Send reply</button></div></div>`;
    const B = body(body_), collect = ()=>{ const marks = {}, comments = {}; B.querySelectorAll('[data-m]').forEach(x=>{ if(x.value !== '') marks[x.dataset.m] = x.value; }); B.querySelectorAll('[data-c]').forEach(x=>{ if(x.value.trim()) comments[x.dataset.c] = x.value; }); return { marks, comments }; };
    B.querySelector('#mkBack').addEventListener('click', ()=>{ st.open = null; go(); });
    const saveM = async ()=>{ try{ await call('save_marks', Object.assign({ id:a.id }, collect())); return true; }catch(e){ say(e.message, true); return false; } };
    B.querySelector('#mkSave').addEventListener('click', async ()=>{ if(await saveM()) say('Marks saved.'); });
    const rl = B.querySelector('#mkRel'); if(rl) rl.addEventListener('click', async ()=>{ if(!(await saveM())) return; if(!confirm('Release these results to the visitor and send the email?')) return; try{ const r = await call('release', { ids:[a.id] }); if(!r.released) return say('Mark every written question first (a mark of 0 counts).', true); say('Released and emailed.'); go(); }catch(e){ say(e.message, true); } });
    const un = B.querySelector('#mkUn'); if(un) un.addEventListener('click', async ()=>{ const r = prompt('Why are you withdrawing this result? (recorded in the log)'); if(r === null) return; await call('unrelease', { id:a.id, reason:r }); go(); });
    const vd = B.querySelector('#mkVoid'); if(vd) vd.addEventListener('click', async ()=>{ const r = prompt('Reason for voiding this attempt (recorded in the log). The visitor will no longer see a result.'); if(!r) return; try{ await call('void_attempt', { id:a.id, reason:r }); st.open = null; go(); }catch(e){ say(e.message, true); } });
    B.querySelector('#mkSend').addEventListener('click', async ()=>{ const t = B.querySelector('#mkReply').value; try{ const r = await call('reply', { attemptId:a.id, body:t }); await go(); say(r.emailed ? 'Reply sent and emailed.' : 'Reply saved in the visitor portal. The email could not be sent.', !r.emailed); }catch(e){ say(e.message, true); } });
    call('thread', { attemptId:a.id }).catch(()=>{});
  }

  // ------------------------------------------------------------ messages, visitors, log
  async function paintInbox(){
    const j = await call('inbox'); st.unread = j.threads.reduce((n, t)=> n + t.unread, 0); shell();
    body(j.threads.length ? `<div class="tw"><table><thead><tr><th>Visitor</th><th>Exam</th><th>Last message</th><th></th></tr></thead><tbody>${j.threads.map(t=> `<tr><td><b>${esc(t.name || 'Visitor')}</b><div class="sub">${esc(t.email)}<br>${esc(t.ref)}</div></td><td>${esc(t.exam)}</td><td>${t.unread ? `<span class="chip bad">${t.unread} new</span> ` : ''}<span class="sub">${t.lastFrom === 'visitor' ? 'Visitor' : 'You'} · ${esc(when(t.lastAt))}</span><div>${esc(t.lastBody)}</div></td><td>${t.attemptId ? `<button class="btn sm" data-open="${t.attemptId}">Open and reply</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No messages from visitors yet. When a visitor disputes a result you will see it here, and by email.</div>');
    R.querySelectorAll('[data-open]').forEach(x=> x.addEventListener('click', ()=>{ st.tab = 'subs'; st.open = x.dataset.open; go(); }));
  }
  async function paintVisitors(){
    const j = await call('visitors'), ex = (await call('list_exams')).exams; await ref(); shell();
    const b = body(`<div class="card"><h3>Give a visitor another attempt</h3><div class="sub">Use this when someone lost connection or had a genuine problem. The exam must still be open for them to start it. This is recorded in the log and the visitor is emailed.</div><div class="g2"><div><label>Visitor email</label><input id="gEm" type="email"></div><div><label>Exam</label><select id="gEx">${ex.map(e=> `<option value="${e.id}">${esc(e.title)}</option>`).join('')}</select></div><div><label>Extra attempts</label><input id="gN" type="number" min="1" max="5" value="1"></div><div><label>Reason</label><input id="gR" maxlength="200"></div></div><div class="row" style="margin-top:10px"><button class="btn p" id="gGo">Grant</button></div></div>
    ${j.visitors.length ? `<div class="tw"><table><thead><tr><th>Name</th><th>Email</th><th>Attempts</th><th>Joined</th><th>Last login</th><th></th></tr></thead><tbody>${j.visitors.map(v=> `<tr><td>${esc(v.name)} ${v.blocked ? '<span class="chip bad">Blocked</span>' : ''}</td><td>${esc(v.email)}</td><td>${v.attempts}</td><td>${esc(when(v.createdAt))}</td><td>${esc(when(v.lastLoginAt))}</td><td><button class="btn sm ${v.blocked ? '' : 'd'}" data-b="${v.id}" data-on="${v.blocked ? 0 : 1}">${v.blocked ? 'Unblock' : 'Block'}</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No visitors yet.</div>'}`);
    b.querySelector('#gGo').addEventListener('click', async ()=>{ try{ await call('grant', { email:b.querySelector('#gEm').value, examId:b.querySelector('#gEx').value, extra:+b.querySelector('#gN').value, reason:b.querySelector('#gR').value }); say('Extra attempt granted and the visitor was emailed.'); }catch(e){ say(e.message, true); } });
    b.querySelectorAll('[data-b]').forEach(x=> x.addEventListener('click', async ()=>{ const on = x.dataset.on === '1'; let reason = ''; if(on){ reason = prompt('Why are you blocking this visitor? (recorded in the log)'); if(reason === null) return; } await call('block_visitor', { id:x.dataset.b, blocked:on, reason }); go(); }));
  }
  async function paintLog(){
    const j = await call('audit_list'); await ref(); shell();
    const nice = { exam_created:'Created an exam', exam_edited:'Edited an exam', exam_questions_changed:'Changed questions or answer key', exam_published:'Published an exam', exam_draft:'Unpublished an exam', exam_archived:'Archived an exam', exam_deleted:'Deleted an exam', exam_duplicated:'Duplicated an exam', marked:'Marked an attempt', marks_changed_after_release:'Changed marks after release', results_released:'Released results', results_withdrawn:'Withdrew a result', attempt_voided:'Voided an attempt', retake_granted:'Granted a retake', message_reply:'Replied to a visitor', visitor_blocked:'Blocked a visitor', visitor_unblocked:'Unblocked a visitor' };
    body(`<div class="sub" style="margin-bottom:8px">Every change to exams, marks, results and visitors is recorded here, so there is always a trail.</div>${j.entries.length ? `<div class="tw"><table><thead><tr><th>When</th><th>Action</th><th>Details</th></tr></thead><tbody>${j.entries.map(e=> `<tr><td>${esc(when(e.ts))}</td><td>${esc(nice[e.action] || e.action)}</td><td class="sub">${esc(Object.keys(e.detail || {}).map(k=> k + ': ' + (typeof e.detail[k] === 'object' ? JSON.stringify(e.detail[k]) : e.detail[k])).join(' · '))}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nothing recorded yet.</div>'}`);
  }
  go();
}
window.VexamAdmin = { mount };
})();
