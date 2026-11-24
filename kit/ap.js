/* BC Teen Pathways · AP study add-ons (reasoning-first questions, FRQ scaffold, class mistake log, countdown, class position).
   Uses the kit API (window.BTP): same local store "btp.v1", same review queue. Nothing is uploaded. Reusable for any AP course. */
(function () {
  'use strict';
  var B = window.BTP; if (!B) { console.error('KIT-ERROR ap.js needs kit.js first'); return; }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var S = B.state(), T = B.T, L = B.L, esc = B.esc;
  S.rq = S.rq || {}; S.frq = S.frq || {}; S.classlog = S.classlog || []; S.ap = S.ap || {}; S.ap.u = S.ap.u || {};
  var DATA = B.json('rq-data') || {};
  var LETTER = 'ABCD';

  /* ---------- mastery per official topic (from every answer in this browser: unit questions, variants, mock) ---------- */
  S.rqv = S.rqv || {}; S.apx = S.apx || {};
  var TOPICS = B.json('ap-topics') || {};
  function mastery() {
    var m = {};
    function add(t, ok) { if (!t) return; var o = m[t] = m[t] || { n: 0, ok: 0 }; o.n++; if (ok) o.ok++; }
    Object.keys(S.rq).forEach(function (k) { add(S.rq[k].topic, S.rq[k].ok); });
    Object.keys(S.rqv).forEach(function (k) { add(S.rqv[k].topic, S.rqv[k].ok); });
    Object.keys(S.apx).forEach(function (k) { add(S.apx[k].topic, S.apx[k].ok); });
    return m;
  }
  function level(o) { if (!o || !o.n) return 0; var r = o.ok / o.n; return r < 0.5 ? 1 : (r >= 0.8 && o.n >= 2 ? 3 : 2); }
  var LV = [{ en: 'not tested', zh: '未测' }, { en: 'needs practice', zh: '要多练' }, { en: 'getting there', zh: '一般' }, { en: 'mastered', zh: '掌握' }];
  function paintMastery() {
    var m = mastery();
    $$('.kn[data-id^="t-"]').forEach(function (b) { var t = b.dataset.id.slice(2), lv = level(m[t]); b.classList.remove('m0', 'm1', 'm2', 'm3'); b.classList.add('m' + lv); b.title = L(LV[lv]) + (m[t] ? ' · ' + m[t].ok + '/' + m[t].n : ''); });
    $$('[data-mk]').forEach(function (e) { var lv = level(m[e.dataset.mk]); e.className = 'mk m' + lv; e.title = L(LV[lv]); });
    $$('[data-next-topics]').forEach(function (box) {
      var ts = box.dataset.nextTopics.split(' ').filter(Boolean), tested = ts.filter(function (t) { return m[t]; });
      if (!tested.length) { box.innerHTML = '<p class="small" style="margin:0">' + esc(T('Nothing tested yet — the map fills in as you answer. Start with the quick check.', '还没有测过——你答题时图谱会逐步上色。从快速诊断开始。')) + '</p>'; return; }
      var weak = ts.filter(function (t) { return level(m[t]) === 1; }), mid = ts.filter(function (t) { return level(m[t]) === 2; }), un = ts.filter(function (t) { return !m[t]; });
      var pick = weak.concat(mid).concat(un).slice(0, 3);
      var done = ts.filter(function (t) { return level(m[t]) === 3; }).length;
      box.innerHTML = '<p class="small" style="margin:0 0 .4em"><b>' + esc(T('Next, practise these nodes', '接下来练这几个节点')) + '</b> · ' + esc(T(tested.length + ' of ' + ts.length + ' topics tested, ' + done + ' mastered', '已测 ' + tested.length + ' / ' + ts.length + ' 个主题，掌握 ' + done + ' 个')) + '</p>' +
        (pick.length ? pick.map(function (t) { var tp = TOPICS[t] || {}; return '<a class="chip m' + level(m[t]) + '" href="' + esc(tp.href || '#') + '">' + esc(t) + ' ' + esc(L(tp.name || '')) + ' · ' + esc(L(LV[level(m[t])])) + '</a>'; }).join(' ') : '<span class="small">' + esc(T('Everything tested here is mastered. A mixed mock in the exam centre is a good next step.', '这里测过的全部掌握了。下一步可以去考试中心做一次混合模拟。')) + '</span>');
    });
    $$('.lit[data-lit]').forEach(function (el) {
      var r = el.closest('.rq-round'), qs = $$('.rq[data-rq]', r), done = qs.filter(function (q) { return S.rq[q.dataset.rq]; }).length;
      if (!qs.length || done < qs.length) { el.innerHTML = ''; return; }
      el.innerHTML = '<p class="small" style="margin:.4em 0"><b>' + esc(T('Nodes this round lit up', '这一轮点亮的节点')) + '</b></p>' + el.dataset.lit.split(' ').map(function (t) { var tp = TOPICS[t] || {}; return '<span class="chip m' + level(m[t]) + '">' + esc(t) + ' ' + esc(L(tp.name || '')) + '</span>'; }).join(' → ') +
        (r.querySelector('.thread') ? '<p class="small muted" style="margin:.4em 0 0">' + esc(T('Together they tell the storyline above — say it in one sentence in your own words.', '它们串起来就是上面那条主线——用自己的话一句话说出来。')) + '</p>' : '');
    });
    $$('[data-skill-bars]').forEach(function (box) {
      var R = B.json('ap-recs') || { skillNames: {} }, by = {};
      Object.keys(S.rq).forEach(function (k) { var r = S.rq[k]; if (!r.skill) return; var o = by[r.skill] = by[r.skill] || { n: 0, ok: 0 }; o.n++; if (r.ok) o.ok++; });
      var ks = Object.keys(R.skillNames).sort();
      box.innerHTML = Object.keys(by).length ? '<div class="tbl"><table><tbody>' + ks.map(function (k) { var o = by[k]; return '<tr><td>' + esc(L(R.skillNames[k])) + '</td><td>' + (o ? o.ok + ' / ' + o.n : '—') + '</td><td style="width:40%">' + (o ? '<span class="cl-bar" style="width:' + Math.round(100 * o.ok / o.n) + '%;background:' + (o.ok / o.n < 0.6 ? 'var(--m1)' : 'var(--m3)') + '"></span>' : '') + '</td><td>' + (o && (R.skills || {})[k] ? '<a class="small" href="' + esc(R.skills[k][0].href) + '">' + esc(T('practise →', '去练 →')) + '</a>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : '<p class="small muted">' + esc(T('Your answers will show here by skill — which kind of thinking needs practice, across all units.', '你的作答会按技能显示在这里——跨所有单元，看哪种思维需要多练。')) + '</p>';
    });
    var dn = $$('[data-due-n]'); if (dn.length) { var n = Object.keys(S.wrong).filter(function (k) { return B.due(S.wrong[k]); }).length + Object.keys(S.cards).filter(function (k) { return B.due(S.cards[k]); }).length; dn.forEach(function (e) { e.textContent = n; }); }
    $$('[data-continue]').forEach(function (a) { if (S.ap.last && S.ap.last.href) { a.hidden = false; a.href = B.root + S.ap.last.href; } });
  }
  window.APB = { paint: paintMastery, level: level, mastery: mastery };

  /* ---------- reasoning-first questions: concept on demand, CER after, variant after a miss ---------- */
  function wireRQ() {
    $$('.rq[data-rq]').forEach(function (box) {
      var id = box.dataset.rq, a = +box.dataset.a, d = DATA[id] || {};
      var ta = $('textarea', box), chk = $('[data-check]', box), skip = $('[data-skipwhy]', box), fb = $('.rq-fb', box), opts = $$('.rq-opts button', box), var_ = $('.rq-var', box), concept = $('.rq-concept', box);
      var sel = null;
      function pickUI() { opts.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.j === sel)); }); chk.disabled = sel == null || ta.value.trim().length < 3; skip.disabled = sel == null; }
      function verdict(st) {
        $('.rq-verdict', fb).textContent = st.j === a ? T('✅ Right. Read why the other options are wrong, then compare your reason with the model.', '✅ 对了。看看其他选项为什么错，再把你的理由和示范对照。')
          : T('💡 Not this time — the answer is ' + LETTER[a] + '. The concept is open above, and there is one more question on the same idea below.', '💡 这次没选中——答案是 ' + LETTER[a] + '。上面的概念讲解已展开，下面还有一道同概念的题。');
      }
      function reveal(st) {
        opts.forEach(function (b) { var j = +b.dataset.j; b.disabled = true; b.classList.toggle('right', j === a); b.classList.toggle('wrong', j === st.j && j !== a); });
        ta.disabled = true; chk.hidden = true; skip.hidden = true;
        fb.hidden = false; box.classList.add('done'); box.classList.toggle('missed', st.j !== a);
        verdict(st);
        $$('.trap', fb).forEach(function (t) { t.classList.toggle('mine', +t.dataset.j === st.j); });
        var y = $('.rq-yours', fb);
        y.innerHTML = st.why ? '<b>' + esc(T('Your reason', '你的理由')) + ':</b> ' + esc(st.why) + '<br><span class="muted">' + esc(T('Does it name the same evidence and the same principle as the model? If not, rewrite it in one line — that is the real practice.', '它点出的证据和原理，和示范一样吗？不一样的话，用一句话重写——这才是真正的练习。')) + '</span>'
          : '<span class="muted">' + esc(T('Next time, try writing one line first — AP marks the reasoning, not just the letter.', '下次先写一句理由试试——AP 看的是推理，不只是选项。')) + '</span>';
        if (st.j !== a) { if (concept) concept.open = true; if (var_) var_.hidden = false; }
        var vs = S.rqv[id]; if (vs != null && var_) vrev(vs.j);
      }
      function vrev(j) {
        var va = +$('.rq-vopts', var_).dataset.va;
        $$('.rq-vopts button', var_).forEach(function (b) { var k = +b.dataset.v; b.disabled = true; b.classList.toggle('right', k === va); b.classList.toggle('wrong', k === j && k !== va); });
        $('.rq-vwhy', var_).hidden = false;
      }
      if (var_) $$('.rq-vopts button', var_).forEach(function (b) { b.addEventListener('click', function () { if (S.rqv[id]) return; var j = +b.dataset.v, va = +$('.rq-vopts', var_).dataset.va; S.rqv[id] = { j: j, ok: j === va, topic: d.topic, at: Date.now() }; B.save(); vrev(j); paintMastery(); }); });
      opts.forEach(function (b) { b.addEventListener('click', function () { if (S.rq[id]) return; sel = +b.dataset.j; pickUI(); }); });
      ta.addEventListener('input', pickUI);
      function check(withWhy) {
        if (sel == null) return;
        var ok = sel === a, st = { j: sel, ok: ok, topic: d.topic, unit: d.unit, skill: d.skill, why: withWhy ? ta.value.trim().slice(0, 400) : '', at: Date.now() };
        S.rq[id] = st;
        var key = d.orig || id, title = document.title.split(' | ')[0];
        if (!ok && d.q) S.wrong[key] = B.schedule({ q: d.q, right: d.opts[a], picked: d.opts[st.j], why: d.why, topic: d.topic, unit: d.unit, skill: d.skill, variant: d.variant, page: B.page, href: B.page + '#' + box.id, title: title, at: Date.now() }, false);
        else if (S.wrong[key]) B.schedule(S.wrong[key], true);
        S.ap.last = { href: B.page + '#' + box.id, at: Date.now() };
        B.save(); reveal(st); roundScore(box.closest('.rq-round')); paintMastery();
        $$('.rq[data-rq="' + id + '"]').forEach(function (o) { if (o !== box) o.dispatchEvent(new Event('rq-sync')); });
      }
      box.addEventListener('rq-sync', function () { if (S.rq[id]) { sel = S.rq[id].j; ta.value = S.rq[id].why || ''; reveal(S.rq[id]); roundScore(box.closest('.rq-round')); } });
      chk.addEventListener('click', function () { check(true); });
      skip.addEventListener('click', function () { check(false); });
      if (S.rq[id]) { sel = S.rq[id].j; ta.value = S.rq[id].why || ''; reveal(S.rq[id]); } else pickUI();
    });
    $$('.rq-round').forEach(function (r) {
      var b = $('[data-reset-round]', r);
      if (b) b.addEventListener('click', function () { $$('.rq[data-rq]', r).forEach(function (q) { delete S.rq[q.dataset.rq]; delete S.rqv[q.dataset.rq]; }); B.save(); location.reload(); });
      roundScore(r);
    });
    B.onLang(function () { $$('.rq.done').forEach(function (box) { var st = S.rq[box.dataset.rq], a = +box.dataset.a; if (st) $('.rq-verdict', box).textContent = st.j === a ? T('✅ Right. Read why the other options are wrong, then compare your reason with the model.', '✅ 对了。看看其他选项为什么错，再把你的理由和示范对照。') : T('💡 Not this time — the answer is ' + LETTER[a] + '.', '💡 这次没选中——答案是 ' + LETTER[a] + '。'); }); $$('.rq-round').forEach(roundScore); paintMastery(); });
    var g = $('[data-goto-go]'); if (g) g.addEventListener('click', function () { location.href = $('[data-goto]').value; });
  }
  function roundScore(r) {
    if (!r) return; var el = $('.rq-count', r); if (!el) return;
    var qs = $$('.rq[data-rq]', r), done = qs.filter(function (q) { return S.rq[q.dataset.rq]; }).length;
    el.textContent = done === qs.length ? T('Finished 🎉 — missed ones wait in your review queue as new variants.', '做完了 🎉——没选中的会以变式题形式在复习队列里等你。') : T(done + ' of ' + qs.length + ' tried', '已做 ' + done + ' / ' + qs.length);
  }

  /* ---------- missed questions grouped by knowledge node ---------- */
  function wireByNode() {
    var box = $('#wrong-by-node'); if (!box) return;
    function draw() {
      var g = {};
      Object.keys(S.wrong).forEach(function (k) { var w = S.wrong[k]; if (!w.topic) return; (g[w.topic] = g[w.topic] || []).push(w); });
      var ks = Object.keys(g).sort(function (x, y) { return parseFloat(x) - parseFloat(y) || x.localeCompare(y); });
      box.innerHTML = ks.length ? ks.map(function (t) { var tp = TOPICS[t] || {}; return '<div class="card" style="margin-bottom:10px"><h4 style="margin:0 0 .3em"><a href="' + esc(tp.href || '#') + '">' + esc(t) + ' ' + esc(L(tp.name || '')) + '</a> <span class="tag">' + g[t].length + '</span></h4><ul class="small">' + g[t].map(function (w) { return '<li><a href="' + esc(B.root + (w.href || w.page)) + '">' + esc(L(w.q)).slice(0, 110) + '…</a> <span class="muted">· ' + esc(B.whenText(w)) + '</span></li>'; }).join('') + '</ul></div>'; }).join('')
        : '<p class="muted">' + esc(T('Nothing here yet. Missed questions from the unit pages and mocks appear here, grouped by topic.', '这里还没有内容。单元页和模拟考里答错的题会按主题出现在这里。')) + '</p>';
    }
    draw(); B.onLang(draw);
  }

  /* ---------- FRQ scaffold: find variables -> predict -> reason, then parts, then self-check against scoring points ---------- */
  function wireFRQ() {
    $$('.frq[data-frq]').forEach(function (box) {
      var id = box.dataset.frq, st = S.frq[id] = S.frq[id] || { txt: {}, ticks: {}, shown: false };
      $$('textarea[data-k]', box).forEach(function (ta) {
        ta.value = st.txt[ta.dataset.k] || '';
        var t = 0; ta.addEventListener('input', function () { st.txt[ta.dataset.k] = ta.value; clearTimeout(t); t = setTimeout(B.save, 400); });
      });
      $$('input[data-r]', box).forEach(function (cb) { cb.checked = !!st.ticks[cb.dataset.r]; cb.addEventListener('change', function () { st.ticks[cb.dataset.r] = cb.checked; B.save(); count(); }); });
      function show() { $$('.frq-key', box).forEach(function (k) { k.hidden = false; }); $('[data-show]', box).hidden = true; count(); }
      function count() { var all = $$('input[data-r]', box), n = all.filter(function (c) { return c.checked; }).length, el = $('.frq-count', box); if (el) el.textContent = T('You found ' + n + ' of ' + all.length + ' scoring points. Rewrite one part to pick up a missed point — that rewrite is where the learning happens.', '你写到了 ' + all.length + ' 个得分点中的 ' + n + ' 个。挑一个漏掉的点，把那一小问重写一遍——学习就发生在重写里。'); }
      $('[data-show]', box).addEventListener('click', function () { st.shown = true; B.save(); show(); });
      if (st.shown) show();
      var ex = $('[data-frq-md]', box);
      if (ex) ex.addEventListener('click', function () {
        var md = '# ' + ($('h3', box) ? $('h3', box).innerText.split('\n')[0] : 'FRQ') + '\n\n';
        $$('textarea[data-k]', box).forEach(function (ta) { var lab = ta.closest('label'); md += '## ' + (lab ? lab.querySelector('span').innerText.split('\n')[0] : ta.dataset.k) + '\n\n' + (ta.value || '-') + '\n\n'; });
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); a.download = 'frq-' + id + '-' + B.today() + '.md'; document.body.appendChild(a); a.click(); a.remove();
      });
      B.onLang(function () { if (st.shown) count(); });
    });
  }

  /* ---------- class mistake log: question number, unit, skill, reason only (never the question text) ---------- */
  var REASONS = { read: { en: 'Misread the question or the graph', zh: '读错题目或图' }, concept: { en: "Didn't know the idea yet", zh: '还不懂这个概念' },
    mix: { en: 'Mixed up two ideas', zh: '把两个概念弄混了' }, data: { en: 'Data / graph reasoning', zh: '数据或图的推理' }, calc: { en: 'Calculation slip', zh: '计算失误' },
    claim: { en: 'Right idea, weak justification', zh: '思路对，但理由不充分' }, time: { en: 'Ran out of time / rushed', zh: '时间不够或太赶' }, change: { en: 'Changed a right answer', zh: '把对的答案改错了' } };
  function recs() { return B.json('ap-recs') || { units: {}, skills: {}, unitNames: {}, skillNames: {} }; }
  function wireClassLog() {
    var R = recs();
    $$('form.classlog').forEach(function (f) {
      var u = $('[name=unit]', f), sk = $('[name=skill]', f), rs = $('[name=reason]', f), num = $('[name=num]', f), src = $('[name=src]', f), note = $('[name=note]', f);
      function opt(sel, obj, keep) { var v = keep || sel.value; sel.innerHTML = Object.keys(obj).map(function (k) { return '<option value="' + esc(k) + '">' + esc(L(obj[k])) + '</option>'; }).join(''); if (v) sel.value = v; }
      function fill() { opt(u, R.unitNames, u.value || f.dataset.unit); opt(sk, R.skillNames); opt(rs, REASONS); list(); }
      if (S.ap.lastSrc) src.value = S.ap.lastSrc;
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!num.value.trim()) { num.focus(); return; }
        var it = { at: Date.now(), src: src.value.trim().slice(0, 40), num: num.value.trim().slice(0, 12), unit: u.value, skill: sk.value, reason: rs.value, note: note.value.trim().slice(0, 80) };
        S.classlog.push(it); S.ap.lastSrc = it.src;
        var ur = R.units[it.unit] || {};
        S.wrong['cl-' + it.at] = B.schedule({ q: { en: 'Redo class question ' + it.num + (it.src ? ' (' + it.src + ')' : '') + ' — ' + L(R.unitNames[it.unit] || {}).split(' · ')[0], zh: '重做课上第 ' + it.num + ' 题' + (it.src ? '（' + it.src + '）' : '') + '——' + ((R.unitNames[it.unit] || {}).zh || '') },
          right: { en: 'Cover the answer, redo it, then check with your class key.', zh: '盖住答案重做一遍，再对照课上的答案。' }, picked: REASONS[it.reason],
          why: { en: 'Reason: ' + REASONS[it.reason].en + (it.note ? ' (' + it.note + ')' : '') + '. Before redoing it: ' + ((ur.tip || {}).en || 'flip the unit cards once.'), zh: '原因：' + REASONS[it.reason].zh + (it.note ? '（' + it.note + '）' : '') + '。重做前：' + ((ur.tip || {}).zh || '先把本单元的概念卡翻一遍。') },
          page: 'ap/biology/log.html', title: T('My class log', '我的课堂错题本'), at: Date.now() }, false);
        B.save(); num.value = ''; note.value = ''; list(); summary();
      });
      function list() {
        var box = $('.cl-list', f.parentNode); if (!box) return;
        var mine = S.classlog.filter(function (x) { return !f.dataset.unit || x.unit === f.dataset.unit; }).slice(-5).reverse();
        box.innerHTML = mine.length ? '<ul class="small">' + mine.map(function (x) { return '<li>#' + esc(x.num) + (x.src ? ' · ' + esc(x.src) : '') + ' · ' + esc(L(R.skillNames[x.skill] || '')) + ' · ' + esc(L(REASONS[x.reason])) + (x.note ? ' — <i>' + esc(x.note) + '</i>' : '') + '</li>'; }).join('') + '</ul>'
          : '<p class="small muted">' + esc(T('Nothing logged for this unit yet.', '这个单元还没有记录。')) + '</p>';
      }
      fill(); B.onLang(fill);
    });
    summary(); B.onLang(summary);
  }
  function summary() {
    var box = $('#classlog-sum'); if (!box) return;
    var R = recs(), log = S.classlog;
    if (!log.length) { box.innerHTML = '<p class="muted">' + esc(T('No class mistakes logged yet. When you go through a class practice pack, log only the question number, unit, skill and reason — the patterns show up after a few entries.', '还没有记录。做完课上的练习包后，只记题号、单元、技能和原因——记几条之后规律就会显出来。')) + '</p>'; return; }
    function tally(key) { var o = {}; log.forEach(function (x) { o[x[key]] = (o[x[key]] || 0) + 1; }); return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).map(function (k) { return [k, o[k]]; }); }
    function bars(rows, names) { var mx = rows.length ? rows[0][1] : 1; return '<div class="tbl"><table><tbody>' + rows.map(function (r) { return '<tr><td>' + esc(L(names[r[0]] || r[0])) + '</td><td style="width:40%"><span class="cl-bar" style="width:' + Math.round(100 * r[1] / mx) + '%"></span></td><td>' + r[1] + '</td></tr>'; }).join('') + '</tbody></table></div>'; }
    var tu = tally('unit'), ts = tally('skill'), tr = tally('reason');
    var topU = tu[0][0], topS = ts[0][0], topR = tr[0][0], ur = R.units[topU] || {}, sr = (R.skills[topS] || []).slice(0, 4);
    var adv = { read: { en: 'Before answering, underline what the question asks for and the units on each axis.', zh: '作答前，先划出题目问的是什么、每条坐标轴的单位。' }, concept: { en: 'Do the unit preview (map + 5 cards) before the next class.', zh: '下次课前先做本单元预习（导图＋5 张卡）。' },
      mix: { en: 'Make a two-column "this vs that" card for the pair you mix up.', zh: '给你常混的那一对做一张「A 对比 B」的两栏卡。' }, data: { en: 'Practise the data-set rounds: say the trend in words before choosing.', zh: '多练材料题组：选之前先用一句话说出趋势。' },
      calc: { en: 'Write the equation-sheet formula first, then plug in with units.', zh: '先写出公式表上的公式，再带单位代入。' }, claim: { en: 'Use Claim–Evidence–Reasoning: one line each.', zh: '用「论点—证据—推理」，每样一句。' },
      time: { en: 'Try one timed 15-question mock in the exam centre to feel the pace — only when you feel ready.', zh: '感觉准备好时，在考试中心试一次 15 题计时模拟，感受节奏。' }, change: { en: 'Change an answer only when you can name the new evidence.', zh: '只有说得出新证据时才改答案。' } };
    box.innerHTML = '<div class="grid g3"><div class="card"><h3 style="margin-top:0">' + esc(T('By unit', '按单元')) + '</h3>' + bars(tu, R.unitNames) + '</div><div class="card"><h3 style="margin-top:0">' + esc(T('By skill', '按技能')) + '</h3>' + bars(ts, R.skillNames) + '</div><div class="card"><h3 style="margin-top:0">' + esc(T('By reason', '按原因')) + '</h3>' + bars(tr, REASONS) + '</div></div>' +
      '<div class="card accent" style="margin-top:14px"><h3 style="margin-top:0">🧭 ' + esc(T('Suggested next step (you can change it)', '建议的下一步（可以改）')) + '</h3><ol>' +
      '<li>' + esc(L(adv[topR])) + '</li>' +
      (ur.href ? '<li><a href="' + esc(ur.href) + '#cards">' + esc(T('Flip the concept cards for ', '翻一遍概念卡：')) + esc(L(R.unitNames[topU])) + '</a></li>' : '') +
      (sr.length ? '<li>' + esc(T('Original questions that train ', '训练这一技能的原创题：')) + esc(L(R.skillNames[topS])) + ': ' + sr.map(function (q) { return '<a href="' + esc(q.href) + '">' + esc(q.label) + '</a>'; }).join(' · ') + '</li>' : '') +
      '</ol><p class="small muted">' + esc(T('Each logged question is also in your review queue: redo it in 1, 3 and 7 days.', '每条记录也进了复习队列：在 1、3、7 天后重做。')) + '</p></div>' +
      '<p><button class="btn sm" type="button" id="cl-export">' + esc(T('Export my log (Markdown)', '导出我的记录（Markdown）')) + '</button> <button class="btn sm" type="button" id="cl-clear">' + esc(T('Clear the log', '清空记录')) + '</button></p>';
    $('#cl-export').addEventListener('click', function () {
      var md = '# ' + T('Class mistake log', '课堂错题本') + ' (' + B.today() + ')\n\n| # | ' + T('Source', '来源') + ' | ' + T('Unit', '单元') + ' | ' + T('Skill', '技能') + ' | ' + T('Reason', '原因') + ' | ' + T('Note', '备注') + ' |\n|---|---|---|---|---|---|\n' +
        log.map(function (x) { return '| ' + x.num + ' | ' + x.src + ' | ' + L(R.unitNames[x.unit] || '') + ' | ' + L(R.skillNames[x.skill] || '') + ' | ' + L(REASONS[x.reason]) + ' | ' + (x.note || '') + ' |'; }).join('\n') + '\n';
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); a.download = 'class-log-' + B.today() + '.md'; document.body.appendChild(a); a.click(); a.remove();
    });
    $('#cl-clear').addEventListener('click', function () { if (!confirm(T('Clear every entry in this log? (Your review queue keeps its items.)', '清空全部记录？（复习队列里的项目会保留。）'))) return; S.classlog = []; B.save(); summary(); $$('form.classlog').forEach(function (f) { f.dispatchEvent(new Event('reset')); }); location.reload(); });
  }

  /* ---------- countdown + class position + unit status ---------- */
  function wireCountdown() {
    $$('[data-countdown]').forEach(function (el) {
      function draw() {
        var d = Math.ceil((new Date(el.dataset.countdown + 'T12:00') - new Date()) / 864e5), w = Math.floor(d / 7);
        el.innerHTML = d > 0 ? '<b class="cd-n">' + d + '</b> ' + esc(T('days', '天')) + ' <span class="small muted">(' + esc(T('about ' + w + ' weeks — one unit at a time is plenty', '约 ' + w + ' 周——一次一个单元就够')) + ')</span>' : esc(T('Exam day has passed — well done for getting there.', '考试日已经过去——走到这里，辛苦了。'));
      }
      draw(); B.onLang(draw);
    });
  }
  var STAT = [['prev', { en: 'Previewed', zh: '已预习' }], ['class', { en: 'Covered in class', zh: '课上讲过' }], ['prac', { en: 'Practised', zh: '已练习' }], ['rev', { en: 'Reviewed', zh: '已复习' }]];
  function wireUnitStatus() {
    $$('.ustat[data-unit]').forEach(function (box) {
      var u = box.dataset.unit;
      function draw() {
        var st = S.ap.u[u] || {};
        box.innerHTML = '<span class="small muted">' + esc(T('Where am I with this unit?', '这个单元我到哪了？')) + '</span> ' + STAT.map(function (s) { return '<button type="button" class="chip" data-s="' + s[0] + '" aria-pressed="' + (!!st[s[0]]) + '">' + (st[s[0]] ? '✓ ' : '') + esc(L(s[1])) + '</button>'; }).join('');
        $$('[data-s]', box).forEach(function (b) { b.addEventListener('click', function () { var o = S.ap.u[u] = S.ap.u[u] || {}; if (o[b.dataset.s]) delete o[b.dataset.s]; else o[b.dataset.s] = Date.now(); B.save(); draw(); }); });
      }
      draw(); B.onLang(draw);
    });
    $$('.unitcard[data-unit]').forEach(function (c) {
      function draw() {
        var u = c.dataset.unit, st = S.ap.u[u] || {}, at = S.ap.classAt, el = $('.ucs', c);
        var n = STAT.filter(function (s) { return st[s[0]]; }).length;
        c.classList.toggle('now', String(at) === u); c.classList.toggle('next', at && +at + 1 === +u);
        if (el) el.innerHTML = STAT.map(function (s) { return '<i class="dot' + (st[s[0]] ? ' on' : '') + '" title="' + esc(L(s[1])) + '"></i>'; }).join('') + ' <span class="small muted">' + (String(at) === u ? esc(T('Your class is here', '课上到这里')) : (at && +at + 1 === +u ? esc(T('Preview this next', '下一个预习它')) : (n ? n + ' / 4' : ''))) + '</span>';
      }
      draw(); B.onLang(draw); document.addEventListener('ap-classat', draw);
    });
    $$('select[data-classat]').forEach(function (sel) {
      function fill() { var v = S.ap.classAt || ''; sel.innerHTML = '<option value="">' + esc(T('— not set —', '——未设置——')) + '</option>' + [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return '<option value="' + n + '">' + esc(T('Unit ' + n, '第 ' + n + ' 单元')) + '</option>'; }).join(''); sel.value = v; }
      fill(); B.onLang(fill);
      sel.addEventListener('change', function () { S.ap.classAt = sel.value ? +sel.value : null; B.save(); document.dispatchEvent(new Event('ap-classat')); });
    });
  }

  wireRQ(); wireFRQ(); wireClassLog(); wireCountdown(); wireUnitStatus(); wireByNode(); paintMastery(); B.onLang(paintMastery);
  document.addEventListener('ap-mock-done', paintMastery);
})();
