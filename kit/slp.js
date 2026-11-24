/* BC Teen Pathways — speech & language self-practice add-on (/slp/).
   Everything stays on this device: logs in the kit store (localStorage "btp.v1", key S.slp; included in the kit backup),
   recordings in IndexedDB "btp-slp" (never uploaded; not part of the backup file — each recording can be downloaded).
   No scores, no streaks, no "normal" values. Widgets are driven by data-slp-* attributes and JSON blobs written by bin/content_slp.py. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var B = window.BTP, root = document.documentElement, S, saveFn, hooks = [];
  if (B) { S = B.state(); saveFn = B.save; } else {
    try { S = JSON.parse(localStorage.getItem('btp.v1') || '{}'); } catch (e) { S = {}; }
    saveFn = function () { try { localStorage.setItem('btp.v1', JSON.stringify(S)); } catch (e) { /* storage full or blocked */ } };
  }
  S.slp = S.slp || {};
  ['log', 'ladder', 'tally', 'scale', 'check', 'listen', 'metro', 'daily', 'cycle'].forEach(function (k) { S.slp[k] = S.slp[k] || {}; });
  var P = S.slp;
  function save() { saveFn(); }
  function mode() { return root.dataset.lang === 'zh' ? 'zh' : (root.dataset.lang === 'both' ? 'both' : 'en'); }
  function T(en, zh) { return B ? B.T(en, zh) : (mode() === 'zh' ? zh : (mode() === 'both' ? en + ' · ' + zh : en)); }
  function L(o) { if (o == null) return ''; if (typeof o === 'string') return o; return T(o.en || '', o.zh || o.en || ''); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function json(id) { var el = document.getElementById(id); try { return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; } }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dkey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmt(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + pad(s % 60); }
  function onLang(f) { hooks.push(f); if (B) B.onLang(f); }
  function cssv(n) { return getComputedStyle(document.body).getPropertyValue(n).trim(); }
  function logEv(domain, kind, detail) {   // one row per thing done; feeds /slp/log.html and the CSV export
    var k = dkey(); (P.log[k] = P.log[k] || []).push({ d: domain || '', k: kind, x: detail || '', t: Date.now() }); save();
  }
  function lastDays(n) { var out = [], d = new Date(); for (var i = n - 1; i >= 0; i--) out.push(dkey(new Date(+d - i * 864e5))); return out; }
  function download(name, blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
  function msg(box, html) { var m = $('.slp-msg', box); if (!m) { m = document.createElement('p'); m.className = 'slp-msg small'; box.appendChild(m); } m.innerHTML = html; }

  /* ---------- IndexedDB for recordings (lazy; never throws to the console) ---------- */
  var dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      if (!window.indexedDB) { rej(new Error('no-idb')); return; }
      var r; try { r = indexedDB.open('btp-slp', 1); } catch (e) { rej(e); return; }
      r.onupgradeneeded = function () { var s = r.result.createObjectStore('rec', { keyPath: 'id' }); s.createIndex('key', 'key'); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
    dbp.catch(function () {});
    return dbp;
  }
  function tx(mode_, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('rec', mode_), s = t.objectStore('rec'), out = fn(s); t.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); }; t.onerror = function () { rej(t.error); }; }); }); }
  function recList(key) { return db().then(function (d) { return new Promise(function (res) { var out = [], s = d.transaction('rec').objectStore('rec'); var c = key ? s.index('key').openCursor(IDBKeyRange.only(key)) : s.openCursor(); c.onsuccess = function () { var cur = c.result; if (cur) { out.push(cur.value); cur.continue(); } else res(out.sort(function (a, b) { return a.at - b.at; })); }; c.onerror = function () { res([]); }; }); }); }
  function recPut(r) { return tx('readwrite', function (s) { return s.put(r); }); }
  function recDel(id) { return tx('readwrite', function (s) { return s.delete(id); }); }
  function recClear() { return tx('readwrite', function (s) { return s.clear(); }); }

  /* ---------- record & compare ---------- */
  function wireRec() {
    $$('[data-slp-rec]').forEach(function (box) {
      var key = box.dataset.slpRec, dom = box.dataset.domain || '', cfg = json(box.dataset.cfg) || {}, rates = cfg.rate || [];
      var rec = null, chunks = [], t0 = 0, tick = null, stream = null, list = [], sel = [];
      box.innerHTML = (cfg.text ? '<div class="slp-passage" data-txt></div>' : '') +
        '<div class="row no-print"><button type="button" class="btn solid" data-r></button><span class="slp-clock" aria-live="polite"></span></div>' +
        '<div class="slp-rates"></div><div class="slp-recs"></div><div class="slp-cmp"></div>' +
        '<p class="small muted" data-note></p>';
      var btn = $('[data-r]', box), clock = $('.slp-clock', box);
      function paintStatic() {
        if (cfg.text) $('[data-txt]', box).textContent = L(cfg.text);
        btn.textContent = rec ? '■ ' + T('Stop', '停止') : '● ' + T('Record', '录音');
        $('[data-note]', box).textContent = T('30 seconds is a fine first recording, and you don’t have to listen back today. Recordings stay on this device (in this browser); nothing is uploaded, and you can delete any or all of them. Some phone browsers (e.g. Safari on iPhone) may clear saved recordings if you don’t visit for a while — use “Save file” for the ones you want to keep.', '第一次录 30 秒就很好，今天也可以不回放。录音只存在这台设备的浏览器里，不上传，任何一条或全部都可以删除。有些手机浏览器（如 iPhone 上的 Safari）在一段时间不访问后可能清掉保存的录音——想留的请用「存为文件」。');
        draw();
      }
      function draw() {
        var R = $('.slp-recs', box);
        if (!list.length) { R.innerHTML = '<p class="small muted">' + esc(T('No recordings yet. Record today, and the same text again in a week or two — then play them side by side.', '还没有录音。今天录一次，一两周后再录同一段，然后并排回放。')) + '</p>'; $('.slp-cmp', box).innerHTML = ''; return; }
        R.innerHTML = '<div class="tbl"><table><thead><tr><th>' + esc(T('Compare', '对比')) + '</th><th>' + esc(T('Date', '日期')) + '</th><th>' + esc(T('Length', '时长')) + '</th><th>' + esc(T('Your notes', '你的记录')) + '</th><th></th></tr></thead><tbody>' +
          list.map(function (r) {
            var rt = Object.keys(r.rate || {}).map(function (k) { var d = rates.filter(function (x) { return x.k === k; })[0]; return (d ? L(d.label) : k) + ' ' + r.rate[k]; }).join(' · ');
            return '<tr><td><input type="checkbox" data-sel="' + r.id + '"' + (sel.indexOf(r.id) >= 0 ? ' checked' : '') + ' aria-label="compare"></td><td>' + esc(new Date(r.at).toLocaleDateString()) + '</td><td>' + fmt(r.dur) + '</td><td class="small">' + esc(rt) + (r.marks && r.marks.length ? '<br>' + esc(T('Marks: ', '标记：')) + r.marks.map(fmt).join(', ') : '') + '</td>' +
              '<td class="row"><button type="button" class="btn sm" data-dl="' + r.id + '">' + esc(T('Save file', '存为文件')) + '</button><button type="button" class="btn sm" data-del="' + r.id + '">' + esc(T('Delete', '删除')) + '</button></td></tr>';
          }).join('') + '</tbody></table></div><p class="small muted">' + esc(T('Tick two recordings to play them side by side. While one plays, tap “Flag” wherever something happened (a block, a tense moment, a sound you liked).', '勾选两条录音即可并排播放。播放时，在发生了什么的地方点「标记」（卡住、紧张、或者你满意的一个音）。')) + '</p>';
        $$('[data-sel]', R).forEach(function (c) { c.addEventListener('change', function () { var id = c.dataset.sel; sel = sel.filter(function (x) { return x !== id; }); if (c.checked) sel.push(id); if (sel.length > 2) sel = sel.slice(-2); draw(); }); });
        $$('[data-del]', R).forEach(function (b) { b.addEventListener('click', function () { if (!confirm(T('Delete this recording from this device?', '从这台设备删除这条录音？'))) return; recDel(b.dataset.del).then(load); }); });
        $$('[data-dl]', R).forEach(function (b) { b.addEventListener('click', function () { var r = list.filter(function (x) { return x.id === b.dataset.dl; })[0]; if (r) download(key + '-' + dkey(new Date(r.at)) + '.' + ((r.type || '').indexOf('mp4') >= 0 ? 'm4a' : 'webm'), r.blob); }); });
        var C = $('.slp-cmp', box), pick = list.filter(function (r) { return sel.indexOf(r.id) >= 0; });
        if (!pick.length) pick = list.length > 1 ? [list[0], list[list.length - 1]] : [list[0]];
        C.innerHTML = '<div class="grid g2">' + pick.map(function (r) { return '<div class="card slp-pl" data-id="' + r.id + '"><b>' + esc(new Date(r.at).toLocaleDateString()) + '</b><audio controls preload="metadata"></audio><div class="row"><button type="button" class="btn sm" data-mark>' + esc(T('Flag this moment', '标记此刻')) + '</button></div></div>'; }).join('') + '</div>';
        $$('.slp-pl', C).forEach(function (card) {
          var r = list.filter(function (x) { return x.id === card.dataset.id; })[0], au = $('audio', card);
          au.src = URL.createObjectURL(r.blob);
          $('[data-mark]', card).addEventListener('click', function () { r.marks = (r.marks || []).concat([au.currentTime]); recPut(r).then(function () { draw(); }); });
        });
      }
      function load() { return recList(key).then(function (l) { list = l; draw(); }).catch(function () { list = []; msg(box, esc(T('This browser does not allow saving recordings here (private window or storage turned off). You can still practise out loud.', '这个浏览器不允许在这里保存录音（可能是无痕窗口或关闭了存储）。你仍然可以出声练习。'))); }); }
      function askRates(r) {
        if (!rates.length) { recPut(r).then(load); return; }
        var Rt = $('.slp-rates', box);
        Rt.innerHTML = '<div class="card soft"><b>' + esc(T('Quick notes for this recording (optional)', '给这条录音记两笔（可选）')) + '</b>' + rates.map(function (d) {
          return '<label class="slp-range"><span>' + esc(L(d.label)) + ' <small class="muted">(' + d.min + '–' + d.max + ')</small></span><input type="range" min="' + d.min + '" max="' + d.max + '" value="' + Math.round((d.min + d.max) / 2) + '" data-k="' + d.k + '"><output></output></label>';
        }).join('') + '<div class="row"><button type="button" class="btn sm solid" data-keep>' + esc(T('Keep', '保存')) + '</button><button type="button" class="btn sm" data-skip>' + esc(T('Skip', '跳过')) + '</button></div></div>';
        $$('input[type=range]', Rt).forEach(function (i) { var o = i.nextElementSibling; o.textContent = i.value; i.addEventListener('input', function () { o.textContent = i.value; }); });
        $('[data-keep]', Rt).addEventListener('click', function () { r.rate = {}; $$('input[type=range]', Rt).forEach(function (i) { r.rate[i.dataset.k] = +i.value; }); Rt.innerHTML = ''; recPut(r).then(load); });
        $('[data-skip]', Rt).addEventListener('click', function () { Rt.innerHTML = ''; recPut(r).then(load); });
      }
      btn.addEventListener('click', function () {
        if (rec) { rec.stop(); return; }
        if (!navigator.mediaDevices || !window.MediaRecorder) { msg(box, esc(T('This browser cannot record audio. Try a recent Chrome, Edge, Firefox or Safari.', '这个浏览器不能录音。请换用较新的 Chrome、Edge、Firefox 或 Safari。'))); return; }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
          stream = s; chunks = []; rec = new MediaRecorder(s);
          rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
          rec.onstop = function () {
            clearInterval(tick); stream.getTracks().forEach(function (t) { t.stop(); });
            var dur = (Date.now() - t0) / 1000, blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
            var r = { id: key + '-' + Date.now(), key: key, domain: dom, at: Date.now(), dur: dur, blob: blob, type: blob.type, marks: [] };
            rec = null; clock.textContent = ''; paintStatic(); logEv(dom, 'recording', key + ' ' + fmt(dur)); askRates(r);
          };
          t0 = Date.now(); rec.start(); paintStatic();
          tick = setInterval(function () { clock.textContent = '● ' + fmt((Date.now() - t0) / 1000); if (Date.now() - t0 > 600000) rec.stop(); }, 250);
        }).catch(function () { msg(box, esc(T('The microphone was not allowed. That is fine — you can allow it later in the browser’s site settings, or practise without recording.', '没有获得麦克风权限。没关系——以后可以在浏览器的网站设置里允许，也可以不录音照样练。'))); });
      });
      paintStatic(); onLang(paintStatic);
      // only touch storage once the box is near the screen (keeps page load light)
      if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); load(); } }); io.observe(box); } else load();
    });
  }

  /* ---------- metronome with paced text ---------- */
  function wireMetro() {
    $$('[data-slp-metro]').forEach(function (box) {
      var cfg = json(box.dataset.cfg) || {}, key = box.dataset.slpMetro, dom = box.dataset.domain || '';
      var bpm = (P.metro[key] && P.metro[key].bpm) || 60, ac = null, timer = null, beat = 0, started = 0;
      box.innerHTML = '<div class="slp-beats" aria-live="off"></div><div class="row no-print"><button type="button" class="btn solid" data-go></button>' +
        '<label class="slp-range"><span>BPM</span><input type="range" min="40" max="160" step="2" value="' + bpm + '"><output>' + bpm + '</output></label></div>' +
        '<div class="row no-print slp-presets"></div><p class="small muted" data-note></p>';
      var go = $('[data-go]', box), rng = $('input', box), out = $('output', box);
      function units() { var tx = mode() === 'zh' ? (cfg.text || {}).zh || '' : (cfg.text || {}).en || ''; return mode() === 'zh' ? Array.from(tx.replace(/[\s，。、！？；：“”‘’（）,.!?;:]/g, '')) : tx.split(/\s+/).reduce(function (a, w) { return a.concat(w.split('-').map(function (p, i, arr) { return p + (i < arr.length - 1 ? '-' : ''); })); }, []); }
      function paint() {
        var u = units(); $('.slp-beats', box).innerHTML = u.map(function (x, i) { return '<span data-i="' + i + '">' + esc(x) + '</span>'; }).join(' ');
        go.textContent = timer ? '■ ' + T('Stop', '停止') : '▶ ' + T('Start', '开始');
        $('.slp-presets', box).innerHTML = [[50, T('Very slow', '超慢')], [70, T('Slow', '慢')], [110, T('Closer to natural', '接近自然')]].map(function (p) { return '<button type="button" class="btn sm" data-bpm="' + p[0] + '">' + esc(p[1]) + ' · ' + p[0] + '</button>'; }).join('');
        $$('[data-bpm]', box).forEach(function (b) { b.addEventListener('click', function () { setBpm(+b.dataset.bpm); }); });
        $('[data-note]', box).textContent = T('One syllable on each beat. Start very slow; speed up only when the slow speed feels easy. The sound is made in your browser.', '每拍一个音节。从超慢开始；慢速觉得轻松了再加快。声音由你的浏览器本地生成。');
      }
      function setBpm(v) { bpm = v; rng.value = v; out.textContent = v; P.metro[key] = { bpm: v }; save(); if (timer) { stop(true); start(); } }
      function click(hi) { try { var o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = hi ? 1100 : 800; g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.08); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.1); } catch (e) { /* audio blocked */ } }
      function start() {
        if (!ac) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) ac = new AC(); }
        if (ac && ac.resume) ac.resume();
        beat = 0; started = started || Date.now();
        var spans = $$('.slp-beats span', box);
        timer = setInterval(function () { spans.forEach(function (s) { s.classList.remove('on'); }); var s = spans[beat % spans.length]; if (s) s.classList.add('on'); if (ac) click(beat % spans.length === 0); beat++; }, 60000 / bpm);
        paint(); spans = $$('.slp-beats span', box);
      }
      function stop(keep) { clearInterval(timer); timer = null; if (!keep && started) { logEv(dom, 'metronome', bpm + ' BPM ' + fmt((Date.now() - started) / 1000)); started = 0; } paint(); }
      go.addEventListener('click', function () { if (timer) stop(); else start(); });
      rng.addEventListener('input', function () { setBpm(+rng.value); });
      paint(); onLang(function () { if (!timer) paint(); });
    });
  }

  /* ---------- pitch line (autocorrelation, computed on this device; no target, no score) ---------- */
  function wirePitch() {
    $$('[data-slp-pitch]').forEach(function (box) {
      var dom = box.dataset.domain || '', on = false, ac, an, src, stream, raf, pts = [], t0 = 0;
      box.innerHTML = '<canvas class="slp-pitch" width="800" height="200" aria-label="pitch line"></canvas><div class="row no-print"><button type="button" class="btn solid" data-go></button><span class="small muted" data-hz></span></div><p class="small muted" data-note></p>';
      var cv = $('canvas', box), cx = cv.getContext('2d'), go = $('[data-go]', box);
      function paint() { go.textContent = on ? '■ ' + T('Stop', '停止') : '🎤 ' + T('Show my pitch line', '显示我的音高曲线'); $('[data-note]', box).textContent = T('A line of how high or low your voice is moving, over the last 10 seconds. There is no “right” height — use it to see a glide, a hum or a habit, not to judge.', '最近 10 秒你的声音在高低之间怎么移动。没有「正确」的高度——用来看滑音、哼鸣或习惯，不是用来评判。'); drawLine(); }
      function acorr(buf, sr) {
        var n = buf.length, rms = 0, i; for (i = 0; i < n; i++) rms += buf[i] * buf[i]; rms = Math.sqrt(rms / n); if (rms < 0.012) return 0;
        var best = 0, bestLag = 0, minLag = Math.floor(sr / 600), maxLag = Math.floor(sr / 70);
        for (var lag = minLag; lag <= maxLag; lag++) { var s = 0; for (i = 0; i < n - lag; i++) s += buf[i] * buf[i + lag]; if (s > best) { best = s; bestLag = lag; } }
        return bestLag ? sr / bestLag : 0;
      }
      function drawLine() {
        var w = cv.width, h = cv.height, now = Date.now(); cx.clearRect(0, 0, w, h);
        cx.strokeStyle = cssv('--line') || '#ddd'; cx.lineWidth = 1; for (var g = 1; g < 4; g++) { cx.beginPath(); cx.moveTo(0, h * g / 4); cx.lineTo(w, h * g / 4); cx.stroke(); }
        cx.strokeStyle = cssv('--a') || '#c8407a'; cx.lineWidth = 3; cx.beginPath(); var started_ = false;
        pts.forEach(function (p) { var x = w - (now - p.t) / 10000 * w, y = h - (Math.log(p.f / 70) / Math.log(600 / 70)) * h; if (!p.f) { started_ = false; return; } if (!started_) { cx.moveTo(x, y); started_ = true; } else cx.lineTo(x, y); });
        cx.stroke();
      }
      function loop() { var buf = new Float32Array(an.fftSize); an.getFloatTimeDomainData(buf); var f = acorr(buf, ac.sampleRate); pts.push({ t: Date.now(), f: f }); pts = pts.filter(function (p) { return Date.now() - p.t < 10000; }); $('[data-hz]', box).textContent = f ? Math.round(f) + ' Hz' : ''; drawLine(); raf = requestAnimationFrame(loop); }
      go.addEventListener('click', function () {
        if (on) { on = false; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); logEv(dom, 'pitch', fmt((Date.now() - t0) / 1000)); paint(); return; }
        if (!navigator.mediaDevices) { msg(box, esc(T('This browser cannot use the microphone here.', '这个浏览器在这里不能使用麦克风。'))); return; }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
          stream = s; var AC = window.AudioContext || window.webkitAudioContext; ac = ac || new AC(); src = ac.createMediaStreamSource(s); an = ac.createAnalyser(); an.fftSize = 2048; src.connect(an); on = true; t0 = Date.now(); paint(); loop();
        }).catch(function () { msg(box, esc(T('The microphone was not allowed. That is fine — you can practise by ear.', '没有获得麦克风权限。没关系——用耳朵听着练也可以。'))); });
      });
      paint(); onLang(paint); if (B) B.onStyle(drawLine);
    });
  }

  /* ---------- phase timer (voice on/off, 30-second summary, 4-6 breathing) ---------- */
  function wireCycle() {
    $$('[data-slp-cycle]').forEach(function (box) {
      var cfg = json(box.dataset.cfg) || { phases: [], rounds: 1 }, dom = box.dataset.domain || '', run = null, i = 0, left = 0, round = 1;
      box.innerHTML = (cfg.breath ? '<div class="slp-breath"><div class="slp-dot"></div></div>' : '') + '<div class="slp-phase"><b data-ph></b><span class="slp-big" data-left></span><small class="muted" data-rd></small></div><div class="row no-print"><button type="button" class="btn solid" data-go></button><button type="button" class="btn" data-reset></button></div>';
      var dot = $('.slp-dot', box);
      function ph() { return cfg.phases[i] || { label: { en: '', zh: '' }, sec: 0 }; }
      function paint() {
        $('[data-ph]', box).textContent = L(ph().label); $('[data-left]', box).textContent = fmt(left || ph().sec);
        $('[data-rd]', box).textContent = cfg.rounds > 1 ? T('Round ' + round + ' of ' + cfg.rounds, '第 ' + round + ' 轮，共 ' + cfg.rounds + ' 轮') : '';
        $('[data-go]', box).textContent = run ? '❚❚ ' + T('Pause', '暂停') : '▶ ' + T('Start', '开始'); $('[data-reset]', box).textContent = T('Reset', '重置');
      }
      function setDot() { if (!dot) return; var p = ph(); dot.style.transition = 'transform ' + p.sec + 's ease-in-out'; dot.style.transform = p.grow === 1 ? 'scale(1)' : (p.grow === 0 ? 'scale(.45)' : dot.style.transform); }
      function next() {
        i++; if (i >= cfg.phases.length) { i = 0; round++; if (round > cfg.rounds) { clearInterval(run); run = null; round = 1; logEv(dom, 'timer', L(cfg.name || '')); left = 0; paint(); var d = $('[data-ph]', box); d.textContent = T('Done — nice work.', '完成了，做得好。'); return; } }
        left = ph().sec; setDot();
      }
      $('[data-go]', box).addEventListener('click', function () {
        if (run) { clearInterval(run); run = null; paint(); return; }
        if (!left) { left = ph().sec; setDot(); }
        run = setInterval(function () { left--; if (left <= 0) next(); paint(); }, 1000); paint();
      });
      $('[data-reset]', box).addEventListener('click', function () { clearInterval(run); run = null; i = 0; round = 1; left = 0; if (dot) { dot.style.transition = 'none'; dot.style.transform = 'scale(.45)'; } paint(); });
      paint(); onLang(paint);
    });
  }

  /* ---------- fear / speaking ladder: predict vs actual ---------- */
  function wireLadder() {
    $$('[data-slp-ladder]').forEach(function (box) {
      var key = box.dataset.slpLadder, dom = box.dataset.domain || '', ex = json(box.dataset.cfg) || {}, ch = null;
      if (!P.ladder[key]) P.ladder[key] = { rows: [] };
      var st = P.ladder[key];
      box.innerHTML = '<div class="slp-ladder"></div><div class="row no-print"><input type="text" class="slp-in" data-new><button type="button" class="btn sm solid" data-add></button><button type="button" class="btn sm" data-ex></button></div>' +
        '<figure class="fig"><div class="chart-box"><canvas data-lc role="img" aria-label="predicted vs actual"></canvas></div><figcaption class="figcap" data-cap></figcaption></figure>';
      function paint() {
        $('[data-new]', box).placeholder = T('A speaking situation, e.g. “ask a question in class”', '一个说话场景，例如「在课上提一个问题」');
        $('[data-add]', box).textContent = T('Add a step', '加一级'); $('[data-ex]', box).textContent = T('Fill in an example ladder', '填入示例阶梯');
        $('[data-cap]', box).textContent = T('Before each step, guess how tense you will feel (0–10). Afterwards, write how it really was. Most people find the “after” line sits lower than the “before” line — that gap is what you are learning.', '每一级之前，猜猜会有多紧张（0–10）；做完写下实际感受。多数人会发现「做完」那条线比「之前」那条低——这个差距就是你在学的东西。');
        var H = $('.slp-ladder', box);
        H.innerHTML = st.rows.length ? '<ol class="slp-steps">' + st.rows.map(function (r, j) {
          return '<li class="card"><div class="row" style="justify-content:space-between"><b>' + esc(r.s) + '</b><span class="row no-print"><button type="button" class="btn sm" data-up="' + j + '" aria-label="up">↑</button><button type="button" class="btn sm" data-dn="' + j + '" aria-label="down">↓</button><button type="button" class="btn sm" data-rm="' + j + '" aria-label="remove">✕</button></span></div>' +
            '<div class="slp-lrow"><label>' + esc(T('Guess before', '之前猜')) + ' <input type="number" min="0" max="10" data-f="p" data-j="' + j + '" value="' + (r.p == null ? '' : r.p) + '"></label>' +
            '<label>' + esc(T('How it really was', '实际')) + ' <input type="number" min="0" max="10" data-f="a" data-j="' + j + '" value="' + (r.a == null ? '' : r.a) + '"></label>' +
            '<label><input type="checkbox" data-f="v" data-j="' + j + '"' + (r.v ? ' checked' : '') + '> ' + esc(T('I skipped it this time', '这次跳过了')) + '</label>' +
            '<label class="wide">' + esc(T('Safety habit I dropped (optional)', '放下的安全行为（可选）')) + ' <input type="text" data-f="d" data-j="' + j + '" value="' + esc(r.d || '') + '"></label></div></li>';
        }).join('') + '</ol>' : '<p class="small muted">' + esc(T('Write 8–10 situations, from “barely uncomfortable” to “hard”. Start at the bottom. One step a week is a good pace; you can change the ladder whenever you like.', '写 8–10 个场景，从「有一点不自在」到「很难」。从最下面开始。每周一级是不错的节奏；阶梯随时可以改。')) + '</p>';
        $$('[data-f]', H).forEach(function (inp) { inp.addEventListener('change', function () { var r = st.rows[+inp.dataset.j], f = inp.dataset.f; if (f === 'v') r.v = inp.checked; else if (f === 'd') r.d = inp.value; else { r[f] = inp.value === '' ? null : Math.max(0, Math.min(10, +inp.value)); if (f === 'a' && r.a != null && r.a !== r._la) { r._la = r.a; logEv(dom, 'ladder', r.s + ' ' + (r.p == null ? '?' : r.p) + '→' + r.a); } } save(); chart(); }); });
        $$('[data-up],[data-dn],[data-rm]', H).forEach(function (b) { b.addEventListener('click', function () { var j = +(b.dataset.up || b.dataset.dn || b.dataset.rm); if (b.dataset.rm != null) { if (!confirm(T('Remove this step?', '删除这一级？'))) return; st.rows.splice(j, 1); } else { var k = b.dataset.up != null ? j - 1 : j + 1; if (k < 0 || k >= st.rows.length) return; var x = st.rows[j]; st.rows[j] = st.rows[k]; st.rows[k] = x; } save(); paint(); }); });
        chart();
      }
      function chart() {
        var cv = $('[data-lc]', box); if (!window.Chart) return;
        if (ch) { ch.destroy(); ch = null; }
        var rows = st.rows, a = cssv('--a') || '#c8407a', ink = cssv('--ink-3') || '#888', line = cssv('--line') || '#ddd';
        ch = new Chart(cv, { type: 'line', data: { labels: rows.map(function (r, j) { return (j + 1) + ''; }), datasets: [
          { label: T('Guess before', '之前猜'), data: rows.map(function (r) { return r.p; }), borderColor: ink, backgroundColor: ink, borderDash: [6, 4], spanGaps: true, tension: .3 },
          { label: T('How it really was', '实际'), data: rows.map(function (r) { return r.a; }), borderColor: a, backgroundColor: a, borderWidth: 3, spanGaps: true, tension: .3 }] },
          options: { responsive: true, maintainAspectRatio: false, animation: false, scales: { y: { min: 0, max: 10, grid: { color: line }, title: { display: true, text: T('Tension 0–10', '紧张 0–10') } }, x: { grid: { display: false }, title: { display: true, text: T('Step on your ladder', '阶梯的第几级') } } } } });
      }
      $('[data-add]', box).addEventListener('click', function () { var v = $('[data-new]', box).value.trim(); if (!v) return; st.rows.push({ s: v, p: null, a: null }); $('[data-new]', box).value = ''; save(); paint(); });
      $('[data-ex]', box).addEventListener('click', function () { if (st.rows.length && !confirm(T('Add the example steps below your own?', '把示例加在你的阶梯下面？'))) return; (ex.example || []).forEach(function (s) { st.rows.push({ s: L(s), p: null, a: null }); }); save(); paint(); });
      paint(); onLang(paint); if (B) B.onStyle(chart);
    });
  }

  /* ---------- tally (+1) with a 7-day view ---------- */
  function wireTally() {
    $$('[data-slp-tally]').forEach(function (box) {
      var key = box.dataset.slpTally, dom = box.dataset.domain || '', cfg = json(box.dataset.cfg) || {};
      P.tally[key] = P.tally[key] || {};
      box.innerHTML = '<p class="small muted" data-note></p><div class="row"><button type="button" class="btn solid slp-plus" data-p>+1</button><button type="button" class="btn sm" data-m>−1</button><span class="slp-today"></span></div><div class="slp-week"></div>';
      function paint() {
        var t = P.tally[key], days = lastDays(7), mx = Math.max.apply(null, days.map(function (d) { return t[d] || 0; }).concat([1]));
        $('.slp-today', box).textContent = T('Today: ', '今天：') + (t[dkey()] ? t[dkey()] : '—') + ' · ' + L(cfg.what || '');
        $('.slp-week', box).innerHTML = days.map(function (d) { var v = t[d] || 0; return '<div class="slp-bar"><i style="height:' + Math.round(100 * v / mx) + '%"></i><small>' + d.slice(5) + '</small><span>' + v + '</span></div>'; }).join('');
        $('[data-note]', box).textContent = L(cfg.note || { en: 'Counting is just noticing. The aim is to see the pattern, not to judge a day.', zh: '计数只是留意。目的是看出规律，不是评判哪一天。' });
      }
      $('[data-p]', box).addEventListener('click', function () { var k = dkey(); P.tally[key][k] = (P.tally[key][k] || 0) + 1; save(); paint(); });
      $('[data-m]', box).addEventListener('click', function () { var k = dkey(); P.tally[key][k] = Math.max(0, (P.tally[key][k] || 0) - 1); save(); paint(); });
      paint(); onLang(paint);
    });
  }

  /* ---------- weekly self-rating / daily log rows (fields from JSON) ---------- */
  function wireScale() {
    $$('[data-slp-scale]').forEach(function (box) {
      var key = box.dataset.slpScale, dom = box.dataset.domain || '', cfg = json(box.dataset.cfg) || { fields: [] };
      P.scale[key] = P.scale[key] || [];
      box.innerHTML = '<div class="slp-form"></div><div class="row"><button type="button" class="btn sm solid" data-add></button></div><div class="slp-hist"></div>';
      function paint() {
        $('.slp-form', box).innerHTML = cfg.fields.map(function (f) {
          if (f.type === 'range') return '<label class="slp-range"><span>' + esc(L(f.label)) + ' <small class="muted">(' + f.min + '–' + f.max + ')</small></span><input type="range" min="' + f.min + '" max="' + f.max + '" value="' + Math.round((f.min + f.max) / 2) + '" data-k="' + f.k + '"><output>' + Math.round((f.min + f.max) / 2) + '</output></label>';
          return '<label class="field"><span>' + esc(L(f.label)) + '</span><input type="' + (f.type === 'number' ? 'number' : 'text') + '" data-k="' + f.k + '"' + (f.type === 'number' ? ' min="0"' : '') + '></label>';
        }).join('');
        $$('input[type=range]', box).forEach(function (i) { i.nextElementSibling.textContent = '–'; i.addEventListener('input', function () { i.dataset.touched = '1'; i.nextElementSibling.textContent = i.value; }); });
        $('[data-add]', box).textContent = L(cfg.button || { en: 'Add to my log', zh: '记一笔' });
        var rows = P.scale[key].slice(-12).reverse();
        $('.slp-hist', box).innerHTML = rows.length ? '<div class="tbl"><table><thead><tr><th>' + esc(T('Date', '日期')) + '</th>' + cfg.fields.map(function (f) { return '<th>' + esc(L(f.short || f.label)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          rows.map(function (r) { return '<tr><td>' + esc(r.d) + '</td>' + cfg.fields.map(function (f) { return '<td>' + esc(r[f.k] == null ? '' : r[f.k]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div><p class="small muted">' + esc(T('Look for your own direction over weeks — there is no target number.', '看几周里你自己的走向——没有目标数字。')) + '</p>' : '';
      }
      $('[data-add]', box).addEventListener('click', function () {
        var r = { d: dkey() }, any = false;
        $$('[data-k]', box).forEach(function (i) { if (i.type === 'range' && !i.dataset.touched) return; if (i.value !== '') { r[i.dataset.k] = i.type === 'text' ? i.value : +i.value; any = true; } });
        if (!any) { msg(box, esc(T('Move a slider or type something first — nothing was saved.', '先拖动滑块或写点什么——这次没有保存。'))); return; } P.scale[key].push(r); save(); logEv(dom, 'log', key); paint();
      });
      paint(); onLang(paint);
    });
  }

  /* ---------- daily checklist with a 7-day dot row ---------- */
  function wireCheck() {
    $$('[data-slp-check]').forEach(function (box) {
      var key = box.dataset.slpCheck, dom = box.dataset.domain || '', cfg = json(box.dataset.cfg) || { items: [] };
      P.check[key] = P.check[key] || {};
      box.innerHTML = '<ul class="slp-checks"></ul><div class="slp-dots"></div>';
      function paint() {
        var t = P.check[key][dkey()] || {};
        $('.slp-checks', box).innerHTML = cfg.items.map(function (it, j) { return '<li><label><input type="checkbox" data-j="' + j + '"' + (t[j] ? ' checked' : '') + '> ' + esc(L(it)) + '</label></li>'; }).join('');
        $$('input', box).forEach(function (c) { c.addEventListener('change', function () { var k = dkey(); P.check[key][k] = P.check[key][k] || {}; P.check[key][k][c.dataset.j] = c.checked; save(); if (c.checked) logEv(dom, 'checklist', key); dots(); }); });
        dots();
      }
      function dots() { $('.slp-dots', box).innerHTML = '<small class="muted">' + esc(T('Last 7 days (ticks per day): ', '最近 7 天（每天勾了几项）：')) + '</small>' + lastDays(7).map(function (d) { var n = Object.values(P.check[key][d] || {}).filter(Boolean).length; return '<span class="slp-dot2" title="' + d + '">' + n + '</span>'; }).join(''); }
      paint(); onLang(paint);
    });
  }

  /* ---------- listen & pick (minimal pairs, browser voice) ---------- */
  function wireListen() {
    $$('[data-slp-listen]').forEach(function (box) {
      var key = box.dataset.slpListen, dom = box.dataset.domain || '', cfg = json(box.dataset.cfg) || {}, cur = null, langSel = 'en';
      P.listen[key] = P.listen[key] || { heard: [] };
      box.innerHTML = '<div class="row no-print slp-lsw"></div><div class="slp-lq"></div><p class="small muted" data-note></p><details><summary class="small" data-sum></summary><div class="slp-pairs small"></div></details>';
      function pairs() { return (cfg.pairs || {})[langSel] || []; }
      function voice() { if (!window.speechSynthesis) return null; var want = langSel === 'zh' ? /^zh/i : /^en/i; return speechSynthesis.getVoices().filter(function (v) { return want.test(v.lang); })[0] || null; }
      function say(w) { var v = voice(); if (!v) { msg(box, esc(T('This browser has no built-in voice for this language. Read the pair list with a friend instead: one says a word, the other picks.', '这个浏览器没有这种语言的内置语音。可以和朋友一起用下面的词对：一人说，一人选。'))); return; } speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(w.replace(/[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü\s]+(?=[一-鿿])/gi, '')); u.voice = v; u.lang = v.lang; u.rate = 0.85; speechSynthesis.speak(u); }
      function paint() {
        var langs = Object.keys(cfg.pairs || {});
        $('.slp-lsw', box).innerHTML = langs.length > 1 ? langs.map(function (l) { return '<button type="button" class="btn sm" data-l="' + l + '" aria-pressed="' + (l === langSel) + '">' + (l === 'zh' ? '中文' : 'English') + '</button>'; }).join('') : '';
        $$('[data-l]', box).forEach(function (b) { b.addEventListener('click', function () { langSel = b.dataset.l; cur = null; paint(); }); });
        var h = P.listen[key].heard.slice(-10), ok = h.filter(Boolean).length;
        $('.slp-lq', box).innerHTML = cur ? '<p><b>' + esc(T('Which word did you hear?', '你听到的是哪个词？')) + '</b></p><div class="row"><button type="button" class="btn" data-pick="a">' + esc(cur.p.a) + '</button><button type="button" class="btn" data-pick="b">' + esc(cur.p.b) + '</button><button type="button" class="btn sm" data-again>🔁 ' + esc(T('Hear it again', '再听一次')) + '</button></div><p class="slp-fb" aria-live="polite"></p>'
          : '<button type="button" class="btn solid" data-new>🔊 ' + esc(T('Play a word', '播放一个词')) + '</button>' + (h.length ? ' <span class="small muted">' + esc(T('Last ' + h.length + ' tries: ' + ok + ' heard as said', '最近 ' + h.length + ' 次：听对 ' + ok + ' 次')) + '</span>' : '');
        $('[data-note]', box).textContent = T('The words are spoken by your browser’s built-in voice, on this device. Missed pairs go to your review queue. Ears improve with short, regular practice.', '词由你浏览器的内置语音在本机读出。听错的词对会进复习队列。耳朵靠短而规律的练习进步。');
        $('[data-sum]', box).textContent = T('See all pairs', '看全部词对');
        $('.slp-pairs', box).innerHTML = pairs().map(function (p) { return '<span class="tag">' + esc(p.a) + ' / ' + esc(p.b) + ' <small>' + esc(p.contrast || '') + '</small></span>'; }).join(' ');
        var nb = $('[data-new]', box); if (nb) nb.addEventListener('click', function () { var ps = pairs(); if (!ps.length) return; var p = ps[Math.floor(Math.random() * ps.length)]; cur = { p: p, w: Math.random() < .5 ? 'a' : 'b' }; paint(); say(p[cur.w]); });
        var ag = $('[data-again]', box); if (ag) ag.addEventListener('click', function () { say(cur.p[cur.w]); });
        $$('[data-pick]', box).forEach(function (b) { b.addEventListener('click', function () {
          var right = b.dataset.pick === cur.w, p = cur.p, fb = $('.slp-fb', box);
          P.listen[key].heard.push(right); if (P.listen[key].heard.length > 50) P.listen[key].heard.shift();
          var wid = 'slp-listen#' + key + '#' + p.a + '/' + p.b;
          if (!right && B) { S.wrong[wid] = B.schedule({ q: { en: 'Listening pair: ' + p.a + ' / ' + p.b + ' (' + (p.contrast || '') + ')', zh: '听辨词对：' + p.a + ' / ' + p.b + '（' + (p.contrast || '') + '）' }, right: p[cur.w], picked: p[b.dataset.pick], why: { en: 'Listen for the contrast ' + (p.contrast || '') + '. Say both words slowly yourself and feel the difference in your mouth.', zh: '注意听 ' + (p.contrast || '') + ' 的区别。自己慢慢说这两个词，感受嘴里的不同。' }, page: root.dataset.page, title: document.title.split(' | ')[0], at: Date.now() }, false); }
          else if (right && B && S.wrong[wid]) B.schedule(S.wrong[wid], true);
          save(); logEv(dom, 'listening', p.a + '/' + p.b + (right ? ' ✓' : ''));
          fb.innerHTML = right ? '✅ ' + esc(T('Yes — it was “' + p[cur.w] + '”.', '对——是「' + p[cur.w] + '」。')) : '💡 ' + esc(T('It was “' + p[cur.w] + '”. That one is tricky; it will come back in your review queue.', '是「' + p[cur.w] + '」。这一对不容易，它会回到你的复习队列。'));
          setTimeout(function () { cur = null; paint(); }, 1600);
        }); });
      }
      if (window.speechSynthesis && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', function () {});
      paint(); onLang(paint);
    });
  }

  /* ---------- level ladder (sound -> syllable -> word -> phrase -> sentence -> talk) ---------- */
  function wireSteps() {
    $$('[data-slp-steps]').forEach(function (box) {
      var key = box.dataset.slpSteps, dom = box.dataset.domain || '', cfg = json(box.dataset.cfg) || { levels: [] };
      P.check['steps-' + key] = P.check['steps-' + key] || { lv: 0 };
      var st = P.check['steps-' + key];
      function paint() {
        box.innerHTML = '<ol class="slp-lv">' + cfg.levels.map(function (l, j) { return '<li class="' + (j < st.lv ? 'done' : (j === st.lv ? 'now' : '')) + '"><span>' + esc(L(l)) + '</span></li>'; }).join('') + '</ol>' +
          '<div class="row"><button type="button" class="btn sm solid" data-up>' + esc(T('I can do this level most of the time → next', '这一级大多数时候能做到 → 下一级')) + '</button><button type="button" class="btn sm" data-back>' + esc(T('Step back one level', '退回一级')) + '</button></div>' +
          '<p class="small muted">' + esc(T('A common rule of thumb is about 9 out of 10 tries feeling right before moving on. Stepping back is part of the plan, not a failure.', '常见的经验是十次里大约九次觉得对了再往上走。退一级也是计划的一部分，不是失败。')) + '</p>';
        $('[data-up]', box).addEventListener('click', function () { if (st.lv < cfg.levels.length) { st.lv++; save(); logEv(dom, 'level', L(cfg.levels[st.lv - 1])); paint(); } });
        $('[data-back]', box).addEventListener('click', function () { if (st.lv > 0) { st.lv--; save(); paint(); } });
      }
      paint(); onLang(paint);
    });
  }

  /* ---------- "where to start" (not a diagnosis) ---------- */
  function wireWizard() {
    $$('[data-slp-wizard]').forEach(function (box) {
      var d = json(box.dataset.cfg); if (!d) return;
      P.wizard = P.wizard || { picks: [] };
      function paint(showRes) {
        var picks = P.wizard.picks;
        box.innerHTML = '<p class="small muted">' + esc(T('Tick any sentences that sound like you, or none. These are common experiences, not symptoms — ticking one doesn’t mean anything is wrong. It only suggests where to start reading; it is not a test and not a diagnosis. Your answers stay on this device.', '勾上像你的句子，一个不勾也可以。这些都是常见的经历，不是症状——勾了不代表有什么问题。它只建议从哪里开始读，不是测验，也不是诊断。答案只存在这台设备上。')) + '</p><ul class="slp-wz">' +
          d.items.map(function (it) { return '<li><label><input type="checkbox" value="' + it.id + '"' + (picks.indexOf(it.id) >= 0 ? ' checked' : '') + '> <span>' + esc(L(it.text)) + '</span></label></li>'; }).join('') + '</ul>' +
          '<div class="row"><button type="button" class="btn solid" data-show>' + esc(T('Suggest where to start', '建议从哪开始')) + '</button><button type="button" class="btn sm" data-clear>' + esc(T('Clear', '清空')) + '</button></div><div class="slp-wres" aria-live="polite"></div>';
        $$('input', box).forEach(function (c) { c.addEventListener('change', function () { P.wizard.picks = $$('input:checked', box).map(function (x) { return x.value; }); save(); }); });
        $('[data-show]', box).addEventListener('click', function () { result(true); });
        $('[data-clear]', box).addEventListener('click', function () { P.wizard.picks = []; P.wizard.result = []; save(); paint(); });
        if (showRes || (P.wizard.result && P.wizard.result.length)) result(false);
      }
      function result(fresh) {
        var sc = {}, picks = P.wizard.picks;
        d.items.forEach(function (it) { if (picks.indexOf(it.id) >= 0) it.domains.forEach(function (x, j) { sc[x] = (sc[x] || 0) + (j === 0 ? 2 : 1); }); });
        var top = Object.keys(sc).sort(function (a, b) { return sc[b] - sc[a] || d.order.indexOf(a) - d.order.indexOf(b); }).slice(0, 3);
        if (fresh) { P.wizard.result = top; if (!P.daily.doms || !P.daily.doms.length) P.daily.doms = top.slice(0, 2); save(); window.dispatchEvent(new Event('slp-daily')); }
        var R = $('.slp-wres', box);
        R.innerHTML = top.length ? '<p><b>' + esc(T('Suggested places to start reading (not a diagnosis; any order is fine):', '建议先读这些（不是诊断，顺序随你）：')) + '</b></p><div class="grid g3">' + top.map(function (x) { var m = d.domains[x]; return '<a class="card accent" href="' + esc(m.href) + '"><h3 style="margin:0">' + esc(m.ico) + ' ' + esc(L(m.name)) + '</h3><p class="small" style="margin:.3em 0 0">' + esc(L(m.one)) + '</p></a>'; }).join('') + '</div>' +
          '<div class="calm"><span style="font-size:1.4rem">🌱</span><p class="small">' + esc(L(d.gentle)) + ' <a href="' + esc(d.helpHref) + '">' + esc(T('When is it worth asking a professional?', '什么时候值得找专业人士？')) + '</a></p></div>'
          : '<p class="small">' + esc(T('Nothing ticked — that is fine. Start with the map below and open whatever looks interesting.', '一个也没勾——没关系。从下面的地图开始，看哪个有意思就点开。')) + '</p>';
      }
      paint(false); onLang(function () { paint(false); });
    });
  }

  /* ---------- today's 10 minutes ---------- */
  function wireDaily() {
    $$('[data-slp-daily]').forEach(function (box) {
      var d = json(box.dataset.cfg); if (!d) return;
      function count(dom) { return Object.keys(P.daily).filter(function (k) { return /^\d{4}-/.test(k) && (P.daily[k] || []).indexOf(dom) >= 0; }); }
      function paint() {
        var doms = (P.daily.doms && P.daily.doms.length) ? P.daily.doms : [d.order[0]], dayN = Object.keys(P.daily).filter(function (k) { return /^\d{4}-/.test(k); }).length;
        var main = doms.map(function (x) { var ms = d.domains[x].main; return { x: x, m: ms[dayN % ms.length] }; });
        var doneToday = (P.daily[dkey()] || []).length > 0, isSun = new Date().getDay() === 0;
        var slow = doms.filter(function (x) { var days = count(x); if (days.length < 20) return false; var first = days.sort()[0]; return (Date.now() - new Date(first)) / 864e5 >= 28; });
        box.innerHTML = (P.daily.doms && P.daily.doms.length ? '' : '<p class="small muted">' + esc(T('A starter mix is shown. Tick the areas you want — or use “Where to start” above — and the plan changes.', '先显示一个起步组合。勾选你想练的领域——或用上面的「从哪开始」——计划就会跟着变。')) + '</p>') + '<div class="slp-pick row">' + d.order.map(function (x) { return '<label class="chip"><input type="checkbox" value="' + x + '"' + (doms.indexOf(x) >= 0 ? ' checked' : '') + '> ' + esc(d.domains[x].ico) + ' ' + esc(L(d.domains[x].short)) + '</label>'; }).join('') + '</div>' +
          '<ol class="slp-10">' +
          '<li><span class="tag">2 min</span> <b>' + esc(T('Warm up', '热身')) + '</b> — ' + main.map(function (o) { return esc(L(d.domains[o.x].warm)); }).join(' / ') + '</li>' +
          '<li><span class="tag">5 min</span> <b>' + esc(T('Today’s main practice', '今天的主练习')) + '</b> ' + esc(T('(if the method is longer, just do its next step)', '（方法较长的话，只做它的下一步）')) + ' — ' + main.map(function (o) { return '<a href="' + esc(o.m.href) + '">' + esc(L(o.m.name)) + '</a>'; }).join(' / ') + '</li>' +
          '<li><span class="tag">2 min</span> <b>' + esc(T('Record or jot it down', '录音或记一笔')) + '</b> — ' + esc(T('use the recorder or log on that page', '用那一页的录音或记录')) + '</li>' +
          '<li><span class="tag">1 min</span> <b>' + esc(T('How did it feel?', '感觉怎么样？')) + '</b> — <a href="' + esc(d.journal) + '">' + esc(T('a mood colour + one line about what you managed', '一个心情颜色＋一句「今天做到了什么」')) + '</a></li></ol>' +
          '<div class="row"><button type="button" class="btn solid" data-done>' + esc(doneToday ? T('Done today ✓ (tap again to undo)', '今天完成了 ✓（再点可撤销）') : T('I did my 10 minutes today', '今天的 10 分钟做完了')) + '</button><span class="small muted">' + esc(dayN ? T('Days practised so far: ', '到目前练过的天数：') + dayN : T('Today can be day 1.', '今天可以是第 1 天。')) + '</span></div>' +
          (isSun ? '<div class="calm"><span style="font-size:1.4rem">🗓️</span><p class="small">' + esc(L(d.sunday)) + ' <a href="' + esc(d.logHref) + '">' + esc(T('Open my log', '打开我的记录')) + '</a></p></div>' : '') +
          (slow.length ? '<div class="calm"><span style="font-size:1.4rem">🌱</span><p class="small">' + esc(L(d.weeks)) + ' ' + slow.map(function (x) { return '<a href="' + esc(d.domains[x].help) + '">' + esc(L(d.domains[x].short)) + '</a>'; }).join(' · ') + '</p></div>' : '') +
          '<p class="small muted">' + esc(T('Change the areas any time. Short and regular beats long and rare; a missed day is just a day.', '领域随时可以换。短而规律胜过长而偶尔；错过一天也只是一天。')) + '</p>';
        $$('.slp-pick input', box).forEach(function (c) { c.addEventListener('change', function () { P.daily.doms = $$('.slp-pick input:checked', box).map(function (x) { return x.value; }); save(); paint(); }); });
        $('[data-done]', box).addEventListener('click', function () { var k = dkey(); if ((P.daily[k] || []).length) delete P.daily[k]; else { P.daily[k] = doms.slice(); logEv(doms.join('+'), 'daily-10', ''); } save(); paint(); });
      }
      paint(); onLang(paint); window.addEventListener('slp-daily', paint);
    });
  }

  /* ---------- library filter ---------- */
  function wireFilter() {
    $$('[data-slp-filter]').forEach(function (f) {
      var grid = document.getElementById(f.dataset.slpFilter), sel = {};
      function apply() {
        var n = 0, cards = $$('[data-f-domain]', grid);
        cards.forEach(function (c) { var ok = Object.keys(sel).every(function (k) { return !sel[k] || (' ' + (c.getAttribute('data-f-' + k) || '') + ' ').indexOf(' ' + sel[k] + ' ') >= 0; }); c.classList.toggle('hide', !ok); if (ok) n++; });
        $$('button[data-k]', f).forEach(function (b) { b.setAttribute('aria-pressed', String(sel[b.dataset.k] === b.dataset.v)); });
        $('.fcount', f).textContent = T(n + ' of ' + cards.length + ' shown. Tap a chip again to clear it.', '显示 ' + n + ' / ' + cards.length + ' 条。再点一次可取消。');
      }
      $$('button[data-k]', f).forEach(function (b) { b.addEventListener('click', function () { sel[b.dataset.k] = sel[b.dataset.k] === b.dataset.v ? null : b.dataset.v; apply(); }); });
      apply(); onLang(apply);
    });
  }

  /* ---------- my log: everything in one place, CSV export ---------- */
  function wireLog() {
    $$('[data-slp-log]').forEach(function (box) {
      var d = json(box.dataset.cfg) || { domains: {} };
      function paint(recs) {
        var days = Object.keys(P.log).sort(), rows = [];
        days.forEach(function (k) { P.log[k].forEach(function (r) { rows.push({ day: k, d: r.d, k: r.k, x: r.x }); }); });
        var per = {}; rows.forEach(function (r) { r.d.split('+').forEach(function (x) { if (!x) return; per[x] = per[x] || { n: 0, days: {} }; per[x].n++; per[x].days[r.day] = 1; }); });
        var recBy = {}; (recs || []).forEach(function (r) { (recBy[r.domain] = recBy[r.domain] || []).push(r); });
        var cards = Object.keys(d.domains).filter(function (x) { return per[x] || recBy[x] || (P.ladder[x] && P.ladder[x].rows.length); }).map(function (x) {
          var m = d.domains[x], p = per[x], rs = recBy[x] || [], lad = (P.ladder[x] || { rows: [] }).rows, done = lad.filter(function (r) { return r.a != null; }).length;
          return '<a class="card sbar c-dom-' + esc(x) + '" href="' + esc(m.href) + '"><h3 style="margin:0 0 .3em">' + esc(m.ico) + ' ' + esc(L(m.short)) + '</h3><p class="small" style="margin:0">' +
            esc(p ? T(Object.keys(p.days).length + ' days practised · ' + p.n + ' things logged', '练过 ' + Object.keys(p.days).length + ' 天 · 记了 ' + p.n + ' 条') : T('Nothing logged yet', '还没有记录')) +
            (rs.length ? '<br>' + esc(T('Recordings: ' + rs.length + ' · latest ' + new Date(rs[rs.length - 1].at).toLocaleDateString(), '录音 ' + rs.length + ' 条 · 最近 ' + new Date(rs[rs.length - 1].at).toLocaleDateString())) : '') +
            (lad.length ? '<br>' + esc(T('Ladder: ' + done + ' of ' + lad.length + ' steps tried', '阶梯：试过 ' + done + ' / ' + lad.length + ' 级')) : '') + '</p></a>';
        }).join('');
        var recent = rows.slice(-25).reverse();
        box.innerHTML = (cards ? '<div class="grid g3">' + cards + '</div>' : '<div class="card soft"><p>' + esc(T('Nothing logged yet. Start with ten minutes on any area page — the recorder, timers, ladder and logs there all collect here.', '还没有记录。去任意一个领域页练十分钟——那里的录音、计时、阶梯和记录都会汇总到这里。')) + '</p><p>' + Object.keys(d.domains).map(function (x) { var m = d.domains[x]; return '<a class="tag" href="' + esc(m.href) + '">' + esc(m.ico) + ' ' + esc(L(m.short)) + '</a>'; }).join(' ') + '</p></div>') +
          '<h3>' + esc(T('Recent entries', '最近的记录')) + '</h3>' + (recent.length ? '<div class="tbl"><table><thead><tr><th>' + esc(T('Date', '日期')) + '</th><th>' + esc(T('Area', '领域')) + '</th><th>' + esc(T('What', '做了什么')) + '</th><th>' + esc(T('Detail', '细节')) + '</th></tr></thead><tbody>' +
          recent.map(function (r) { return '<tr><td>' + esc(r.day) + '</td><td>' + esc(r.d.split('+').map(function (x) { return d.domains[x] ? L(d.domains[x].short) : x; }).join(' + ')) + '</td><td>' + esc(r.k) + '</td><td class="small">' + esc(r.x) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="small muted">' + esc(T('Your practice will show up here as you use the recorder, timers, ladders and logs on the area pages.', '你在各领域页用录音、计时、阶梯和记录时，这里会自动汇总。')) + '</p>') +
          '<div class="row no-print" style="margin-top:12px"><button type="button" class="btn sm solid" data-csv>' + esc(T('Export everything as CSV', '全部导出为 CSV')) + '</button><button type="button" class="btn sm" data-print>' + esc(T('Print / save as PDF', '打印 / 存为 PDF')) + '</button><button type="button" class="btn sm" data-wipe>' + esc(T('Delete all recordings on this device', '删除本机全部录音')) + '</button></div>' +
          '<p class="small muted">' + esc(T('Logs are included in the site backup', '记录包含在本站备份里')) + ' (<a href="../review.html">' + esc(T('Review page → Export everything', '复习页 → 导出全部')) + '</a>). ' + esc(T('Recordings are not — save the ones you want to keep with “Save file”.', '录音不在备份里——想留的请用「存为文件」保存。')) + '</p>';
        $('[data-csv]', box).addEventListener('click', function () {
          var q = function (s) { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
          var lines = [['date', 'area', 'kind', 'detail'].join(',')].concat(rows.map(function (r) { return [r.day, r.d, r.k, r.x].map(q).join(','); }));
          Object.keys(P.ladder).forEach(function (k) { P.ladder[k].rows.forEach(function (r, j) { lines.push(['', k, 'ladder-step-' + (j + 1), r.s + ' | before ' + (r.p == null ? '' : r.p) + ' | after ' + (r.a == null ? '' : r.a) + (r.v ? ' | skipped' : '') + (r.d ? ' | dropped: ' + r.d : '')].map(q).join(',')); }); });
          Object.keys(P.scale).forEach(function (k) { P.scale[k].forEach(function (r) { lines.push([r.d, k, 'self-rating', Object.keys(r).filter(function (f) { return f !== 'd'; }).map(function (f) { return f + '=' + r[f]; }).join(' ')].map(q).join(',')); }); });
          Object.keys(P.tally).forEach(function (k) { Object.keys(P.tally[k]).forEach(function (day) { lines.push([day, k, 'count', P.tally[k][day]].map(q).join(',')); }); });
          download('speech-language-log-' + dkey() + '.csv', new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' }));
        });
        $('[data-print]', box).addEventListener('click', function () { window.print(); });
        $('[data-wipe]', box).addEventListener('click', function () { if (!confirm(T('Delete every recording saved on this device? This cannot be undone.', '删除这台设备上保存的全部录音？删除后无法恢复。'))) return; recClear().then(function () { load(); }).catch(function () {}); });
      }
      function load() { recList(null).then(paint).catch(function () { paint([]); }); }
      load(); onLang(load);
    });
  }


  /* ---------- signal-to-noise demo: browser voice + generated noise (shows the idea only) ---------- */
  function wireNoise() {
    $$('[data-slp-noise]').forEach(function (box) {
      var cfg = json(box.dataset.cfg) || {}, ac = null, src = null, gain = null, lvl = 0.15;
      box.innerHTML = '<div class="row no-print"><label class="slp-range"><span data-l></span><input type="range" min="0" max="60" value="15"><output>15</output></label><button type="button" class="btn solid" data-go></button><button type="button" class="btn sm" data-stop></button></div><p class="small muted" data-note></p>';
      function paint() { $('[data-l]', box).textContent = T('Background noise', '背景噪音'); $('[data-go]', box).textContent = '🔊 ' + T('Say a sentence over the noise', '在噪音里说一句话'); $('[data-stop]', box).textContent = T('Stop', '停止'); $('[data-note]', box).textContent = T('Your browser speaks a sentence while it plays made-up noise. Turn the noise up and notice how quickly words disappear — this is why a seat near the speaker and away from the fan helps everyone. It says nothing about your hearing. Keep your volume low.', '浏览器一边放人造噪音一边说一句话。把噪音调大，留意词语消失得多快——这就是为什么坐得离说话人近、离风扇远，对每个人都有帮助。它不代表你的听力如何。请把音量放低。'); }
      function noiseOn() {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        if (!ac) ac = new AC(); if (ac.resume) ac.resume(); if (src) return;
        var len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0), b0 = 0, b1 = 0, b2 = 0;
        for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12; }
        src = ac.createBufferSource(); src.buffer = buf; src.loop = true; gain = ac.createGain(); gain.gain.value = lvl; src.connect(gain); gain.connect(ac.destination); src.start();
      }
      function noiseOff() { if (src) { try { src.stop(); } catch (e) { /* already stopped */ } src = null; } if (window.speechSynthesis) speechSynthesis.cancel(); }
      $('input', box).addEventListener('input', function (e) { lvl = e.target.value / 100; e.target.nextElementSibling.textContent = e.target.value; if (gain) gain.gain.value = lvl; });
      $('[data-go]', box).addEventListener('click', function () {
        noiseOn(); if (!window.speechSynthesis) { msg(box, esc(T('This browser has no built-in voice.', '这个浏览器没有内置语音。'))); return; }
        var lang = mode() === 'zh' ? 'zh' : 'en', ss = (cfg.sentences || {})[lang] || [], v = speechSynthesis.getVoices().filter(function (x) { return x.lang.toLowerCase().indexOf(lang) === 0; })[0];
        if (!v || !ss.length) { msg(box, esc(T('This browser has no built-in voice for this language.', '这个浏览器没有这种语言的内置语音。'))); return; }
        var u = new SpeechSynthesisUtterance(ss[Math.floor(Math.random() * ss.length)]); u.voice = v; u.lang = v.lang; speechSynthesis.cancel(); speechSynthesis.speak(u);
      });
      $('[data-stop]', box).addEventListener('click', noiseOff);
      paint(); onLang(paint);
    });
  }

  wireNoise(); wireRec(); wireMetro(); wirePitch(); wireCycle(); wireLadder(); wireTally(); wireScale(); wireCheck(); wireListen(); wireSteps(); wireWizard(); wireDaily(); wireFilter(); wireLog();
  if (!B) { var obs = new MutationObserver(function () { hooks.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); }); obs.observe(root, { attributes: true, attributeFilter: ['data-lang'] }); }
})();
