/* BC Teen Pathways · interactive demos for study pages (vanilla JS; Chart.js and 3Dmol.js are local vendor files).
   <div class="sim" data-sim="sav|cell3d|steps|dogma|punnett|drift|growth|enzyme" data-cfg="json-id"></div>
   Every label is bilingual through the kit (window.BTP.T / L) and redraws when the reader switches language or light/dark. */
(function () {
  'use strict';
  var B = window.BTP; if (!B) { console.error('KIT-ERROR sims.js needs kit.js first'); return; }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var T = B.T, L = B.L, esc = B.esc;
  function fmtN(x, d) { return Number(x).toLocaleString(undefined, { maximumFractionDigits: d == null ? 2 : d }); }
  function slider(name, min, max, step, val) { return '<input type="range" data-k="' + name + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '">'; }
  function pal() { return [B.cssv('--a'), B.cssv('--a-2'), B.cssv('--warn'), B.cssv('--ok'), B.cssv('--bad'), B.cssv('--ink-3')]; }
  function lineChart(cv, labels, sets, yTitle, xTitle, yMax) {
    var c = pal(), line = B.cssv('--line');
    Chart.defaults.color = B.cssv('--ink-2'); Chart.defaults.font.family = B.cssv('--font');
    return new Chart(cv, { type: 'line', data: { labels: labels, datasets: sets.map(function (s, i) { return { label: s.label, data: s.data, borderColor: s.color || c[i % c.length], backgroundColor: 'transparent', borderWidth: s.w || 2.5, pointRadius: 0, tension: .25, borderDash: s.dash || [] }; }) },
      options: { responsive: true, maintainAspectRatio: false, animation: { duration: 300 }, plugins: { legend: { display: sets.length > 1 && sets.length < 6, position: 'bottom' } },
        scales: { x: { grid: { display: false }, title: { display: !!xTitle, text: xTitle }, ticks: { maxTicksLimit: 8 } }, y: { beginAtZero: true, max: yMax, grid: { color: line }, title: { display: !!yTitle, text: yTitle } } } } });
  }

  /* ---------- 1. surface area to volume ---------- */
  function sav(box) {
    var s = 2, split = false;
    function cube(e, cx, cy) {
      var R = [0.866 * e, -0.5 * e], Lv = [-0.866 * e, -0.5 * e], U = [0, -e];
      function P(v) { return v.map(function (p) { return (cx + p[0]).toFixed(1) + ',' + (cy + p[1]).toFixed(1); }).join(' '); }
      var O = [0, 0], OR = R, ORU = [R[0], R[1] + U[1]], OU = U, OL = Lv, OLU = [Lv[0], Lv[1] + U[1]], TOP = [R[0] + Lv[0], R[1] + Lv[1] + U[1]];
      return '<polygon points="' + P([O, OR, ORU, OU]) + '" fill="var(--a)" opacity=".85"/><polygon points="' + P([O, OL, OLU, OU]) + '" fill="var(--a-2)" opacity=".85"/><polygon points="' + P([OU, ORU, TOP, OLU]) + '" fill="var(--a-soft)" stroke="var(--a)" stroke-width="1"/>';
    }
    function draw() {
      var e = 14 + s * 10.5, SA = 6 * s * s, V = s * s * s, r = 6 / s, svg;
      if (!split) svg = '<svg viewBox="0 0 240 250" role="img" aria-label="cube">' + cube(e, 120, 244) + '</svg>';
      else { var h = e / 2, one = '<svg viewBox="0 0 ' + Math.ceil(1.8 * h + 4) + ' ' + Math.ceil(2.05 * h + 4) + '" style="width:' + Math.max(28, (1.8 * h + 4) * 0.6) + 'px">' + cube(h, 0.9 * h + 2, 2 * h + 2) + '</svg>'; svg = '<div class="sav-split">' + new Array(9).join(one) + '</div>'; }
      var sa2 = split ? 2 * SA : SA, r2 = sa2 / V;
      box.innerHTML = '<div class="sim-grid"><div class="sim-vis">' + svg + '</div><div class="sim-ctl">' +
        '<label class="sim-l">' + esc(T('Side length', '边长')) + ': <b>' + s + ' µm</b>' + slider('s', 1, 10, 1, s) + '</label>' +
        '<label class="sim-l"><input type="checkbox" data-k="split"' + (split ? ' checked' : '') + '> ' + esc(T('Cut it into 8 cubes of half the side', '把它切成 8 个边长减半的小立方体')) + '</label>' +
        '<table class="sim-t"><tr><td>' + esc(T('Surface area', '表面积')) + '</td><td>' + (split ? '8 × 6 × (' + s / 2 + ')² = ' : '6 × ' + s + '² = ') + fmtN(sa2) + ' µm²</td></tr><tr><td>' + esc(T('Volume', '体积')) + '</td><td>' + (split ? '8 × (' + s / 2 + ')³ = ' : s + '³ = ') + fmtN(V) + ' µm³</td></tr>' +
        '<tr><td><b>SA : V</b></td><td><b>' + fmtN(r2) + ' : 1</b></td></tr></table>' +
        '<div class="sim-meter"><span style="width:' + Math.min(100, 100 * r2 / 12) + '%"></span></div>' +
        '<p class="small">' + esc(split ? T('Same total volume, twice the surface: each small cube has SA:V = 6 ÷ ' + s / 2 + ' = ' + fmtN(r2) + '. That is why large organisms are made of many small cells.', '总体积不变，表面积翻倍：每个小立方体 SA:V = 6 ÷ ' + s / 2 + ' = ' + fmtN(r2) + '。这就是大生物由许多小细胞组成的原因。')
          : T('SA:V = 6 ÷ side. Doubling the side halves the ratio: each µm³ of cytoplasm has only ' + fmtN(r) + ' µm² of membrane to exchange through, so diffusion struggles to keep up as a cell grows.', 'SA:V = 6 ÷ 边长。边长翻倍，比值减半：每 µm³ 细胞质只有 ' + fmtN(r) + ' µm² 的膜用来交换，所以细胞长大后扩散越来越跟不上。')) + '</p></div></div>';
      $('[data-k=s]', box).addEventListener('input', function (ev) { s = +ev.target.value; draw(); $('[data-k=s]', box).focus(); });
      $('[data-k=split]', box).addEventListener('change', function (ev) { split = ev.target.checked; if (split && s % 2) s = Math.max(2, s - 1); draw(); });
    }
    draw(); B.onLang(draw);
  }

  /* ---------- 2. a 3D cell (3Dmol shapes) ---------- */
  var ORG = {
    membrane: [{ en: 'Plasma membrane', zh: '细胞膜' }, { en: 'Phospholipid bilayer with proteins; selectively permeable, so the cell controls what enters and leaves.', zh: '镶嵌蛋白的磷脂双分子层；选择透过性，细胞由此控制物质进出。' }],
    nucleus: [{ en: 'Nucleus', zh: '细胞核' }, { en: 'Holds the DNA; a double membrane with pores keeps transcription separate from translation in the cytoplasm.', zh: '存放 DNA；带核孔的双层膜把转录和细胞质里的翻译分隔开。' }],
    nucleolus: [{ en: 'Nucleolus', zh: '核仁' }, { en: 'Where ribosomal RNA is made and ribosome parts are assembled.', zh: '合成核糖体 RNA、组装核糖体亚基的地方。' }],
    ribo: [{ en: 'Ribosomes', zh: '核糖体' }, { en: 'Made of rRNA and protein; translate mRNA into polypeptides. Found in every cell, prokaryotes included.', zh: '由 rRNA 和蛋白质组成；把 mRNA 翻译成多肽。所有细胞都有，包括原核细胞。' }],
    er: [{ en: 'Rough ER', zh: '粗面内质网' }, { en: 'Membrane folds studded with ribosomes; makes proteins that will be secreted or placed in membranes.', zh: '附着核糖体的膜折叠；合成分泌蛋白和膜蛋白。' }],
    golgi: [{ en: 'Golgi complex', zh: '高尔基体' }, { en: 'Stacked membrane sacs that modify, sort and package proteins into vesicles.', zh: '层叠的膜囊，对蛋白质进行修饰、分拣并装进囊泡。' }],
    mito: [{ en: 'Mitochondria', zh: '线粒体' }, { en: 'Double membrane; the folded inner membrane (cristae) gives a large surface for the electron transport chain and ATP synthase.', zh: '双层膜；折叠的内膜（嵴）为电子传递链和 ATP 合酶提供大面积。' }],
    lyso: [{ en: 'Lysosomes', zh: '溶酶体' }, { en: 'Vesicles of hydrolytic enzymes that break down macromolecules and worn-out organelles (mainly in animal cells).', zh: '装有水解酶的囊泡，分解大分子和衰老细胞器（主要见于动物细胞）。' }],
    wall: [{ en: 'Cell wall', zh: '细胞壁' }, { en: 'Rigid cellulose layer outside the membrane in plants; resists bursting when water rushes in.', zh: '植物细胞膜外坚硬的纤维素层；水大量进入时防止细胞胀破。' }],
    vac: [{ en: 'Central vacuole', zh: '中央液泡' }, { en: 'Stores water and solutes; pushing on the wall gives turgor pressure that keeps a plant firm.', zh: '储存水和溶质；向细胞壁施压形成膨压，让植物挺立。' }],
    chloro: [{ en: 'Chloroplasts', zh: '叶绿体' }, { en: 'Double membrane with stacked thylakoids; light reactions on the thylakoids, Calvin cycle in the stroma.', zh: '双层膜，内有成叠的类囊体；光反应在类囊体上，卡尔文循环在基质中。' }]
  };
  function cell3d(box) {
    if (!window.$3Dmol) { console.error('KIT-ERROR 3Dmol missing'); return; }
    var plant = false, sel = null, v;   // solid background: shapes do not draw on a transparent canvas in some WebGL stacks
    box.innerHTML = '<div class="row no-print sim-bar"></div><div class="mol cellv" aria-label="3D cell model"></div><div class="sim-note small"></div>';
    var view = $('.cellv', box);
    try { v = $3Dmol.createViewer(view, { backgroundColor: B.cssv('--surface') || 'white' }); } catch (e) { console.error('KIT-ERROR webgl ' + e.message); return; }
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function scene() {
      v.removeAllShapes(); v.removeAllLabels(); seed = 7;
      function op(k, base) { return sel && sel !== k ? Math.min(base, 0.18) : base; }
      var nuc = plant ? { x: 3.5, y: 3, z: 0 } : { x: 0, y: 0, z: 0 };
      if (plant) v.addBox({ center: { x: 0, y: 0, z: 0 }, dimensions: { w: 23, h: 23, d: 23 }, color: '#5fa35a', opacity: op('wall', sel === 'wall' ? 0.35 : 0.12) });
      v.addSphere({ center: { x: 0, y: 0, z: 0 }, radius: plant ? 10.8 : 10, color: '#f2a03d', opacity: op('membrane', sel === 'membrane' ? 0.32 : 0.1) });
      if (plant) v.addSphere({ center: { x: -3, y: -2.5, z: 0 }, radius: 5.2, color: '#74b9ff', opacity: op('vac', sel === 'vac' ? 0.6 : 0.28) });
      v.addSphere({ center: nuc, radius: 3, color: '#6c5ce7', opacity: op('nucleus', 0.85) });
      v.addSphere({ center: { x: nuc.x + 0.8, y: nuc.y + 0.7, z: nuc.z + 1.8 }, radius: 1, color: '#2d1f8f', opacity: op('nucleolus', 1) });
      for (var arc = 0; arc < 3; arc++) {   // rough ER: tubes curving around the nucleus, dotted with ribosomes
        var rad = 4.2 + arc * 0.8, z = -1 + arc, pts = [];
        for (var i = 0; i <= 9; i++) { var th = -0.4 + i * 0.28; pts.push({ x: nuc.x + rad * Math.cos(th + arc), y: nuc.y + rad * Math.sin(th + arc), z: z }); }
        for (var j = 0; j < pts.length - 1; j++) { v.addCylinder({ start: pts[j], end: pts[j + 1], radius: 0.28, color: '#4aa3df', opacity: op('er', 0.9), fromCap: 2, toCap: 2 }); if (j % 2 === 0) v.addSphere({ center: { x: pts[j].x, y: pts[j].y, z: pts[j].z + 0.35 }, radius: 0.2, color: '#222', opacity: op('ribo', 1) }); }
      }
      for (var k = 0; k < 26; k++) { var a = rnd() * 6.283, b = rnd() * 3.14, r = 5.5 + rnd() * 3.2; v.addSphere({ center: { x: r * Math.sin(b) * Math.cos(a), y: r * Math.sin(b) * Math.sin(a), z: r * Math.cos(b) }, radius: 0.2, color: '#222', opacity: op('ribo', 1) }); }
      for (var g = 0; g < 4; g++) { var gy = -5.5 + g * 0.55; v.addCylinder({ start: { x: 4.5, y: gy, z: -2 }, end: { x: 4.5, y: gy + 0.22, z: -2 }, radius: 1.9 - g * 0.25, color: '#00b894', opacity: op('golgi', 0.9), fromCap: 1, toCap: 1 }); }
      [[{ x: -5.5, y: 3, z: 1 }, { x: -3.6, y: 4.6, z: 2 }], [{ x: -4, y: -5, z: -2 }, { x: -2, y: -6.5, z: -1 }], [{ x: 2, y: 6, z: -3 }, { x: 4, y: 6.6, z: -1.8 }]].forEach(function (m) { v.addCylinder({ start: m[0], end: m[1], radius: 0.75, color: '#e17055', opacity: op('mito', 1), fromCap: 2, toCap: 2 }); });
      if (!plant) [[6, -1, 3], [-1, 6.5, 3], [-6.5, -1, -3]].forEach(function (p) { v.addSphere({ center: { x: p[0], y: p[1], z: p[2] }, radius: 0.7, color: '#fdcb6e', opacity: op('lyso', 1) }); });
      if (plant) [[-6.5, 3.5, 3], [6, -5.5, 2], [-1, 7.5, -2.5], [1, -7.8, 2.5]].forEach(function (p) { v.addCylinder({ start: { x: p[0], y: p[1], z: p[2] }, end: { x: p[0] + 1.8, y: p[1] + 0.6, z: p[2] - 0.6 }, radius: 0.9, color: '#27ae60', opacity: op('chloro', 1), fromCap: 2, toCap: 2 }); });
      if (sel) v.addLabel(L(ORG[sel][0]), { position: { x: 0, y: 11.5, z: 0 }, backgroundColor: '#222', backgroundOpacity: 0.7, fontColor: 'white', fontSize: 13 });
      if (!v.getModel()) { var m = v.addModel('2\nframe\nH -12 -12 -12\nH 12 12 12\n', 'xyz'); m.setStyle({}, {}); }   // invisible anchors so zoomTo frames the shapes
      v.zoomTo(); v.zoom(1.35); v.render();
    }
    function bar() {
      var ks = plant ? ['membrane', 'wall', 'nucleus', 'nucleolus', 'ribo', 'er', 'golgi', 'mito', 'chloro', 'vac'] : ['membrane', 'nucleus', 'nucleolus', 'ribo', 'er', 'golgi', 'mito', 'lyso'];
      if (sel && ks.indexOf(sel) < 0) sel = null;
      $('.sim-bar', box).innerHTML = '<button type="button" class="chip" data-plant aria-pressed="' + plant + '">' + esc(plant ? T('🌱 Plant cell', '🌱 植物细胞') : T('🐾 Animal cell', '🐾 动物细胞')) + ' ⇄</button>' + ks.map(function (k) { return '<button type="button" class="chip" data-o="' + k + '" aria-pressed="' + (sel === k) + '">' + esc(L(ORG[k][0])) + '</button>'; }).join('');
      $('.sim-note', box).innerHTML = sel ? '<b>' + esc(L(ORG[sel][0])) + '</b> — ' + esc(L(ORG[sel][1])) : esc(T('Tap a part to highlight it. Drag to turn the cell, pinch or scroll to zoom. Shapes are simplified; sizes are not to scale.', '点一个结构让它高亮。拖动旋转，双指或滚轮缩放。形状已简化，大小不按比例。'));
      $('[data-plant]', box).addEventListener('click', function () { plant = !plant; bar(); scene(); });
      $$('[data-o]', box).forEach(function (b) { b.addEventListener('click', function () { sel = sel === b.dataset.o ? null : b.dataset.o; bar(); scene(); }); });
    }
    bar(); scene(); v.spin('y', 0.4);
    view.addEventListener('pointerdown', function () { v.spin(false); });
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches) { var tap = document.createElement('button'); tap.type = 'button'; tap.className = 'tap'; tap.innerHTML = '<span>' + esc(T('Tap to turn the model', '点一下再旋转模型')) + '</span>'; view.appendChild(tap); tap.addEventListener('click', function () { tap.remove(); }); }
    B.onLang(function () { bar(); scene(); });
    B.onStyle(function () { v.setBackgroundColor(B.cssv('--surface') || 'white'); v.render(); });
  }

  /* ---------- 3. step-through process animation ---------- */
  function steps(box) {
    var d = B.json(box.dataset.cfg); if (!d) return;
    var i = 0, timer = null;
    function draw() {
      var st = d.stages;
      box.innerHTML = '<div class="st-flow">' + st.map(function (s, k) {
        return (k ? '<span class="st-arrow' + (k <= i ? ' on' : '') + '" aria-hidden="true"><i></i></span>' : '') + '<button type="button" class="st-box' + (k === i ? ' on' : (k < i ? ' past' : '')) + '" data-i="' + k + '"><b>' + (k + 1) + '. ' + esc(L(s.label)) + '</b>' + (s.where ? '<small>' + esc(L(s.where)) + '</small>' : '') + '</button>';
      }).join('') + (d.loop ? '<span class="st-loop small muted">↺ ' + esc(T('repeats', '循环')) + '</span>' : '') + '</div>' +
        '<div class="st-panel card soft"><div class="st-io">' + (st[i].ins || []).map(function (x) { return '<span class="chip in">→ ' + esc(L(x)) + '</span>'; }).join('') + (st[i].outs || []).map(function (x) { return '<span class="chip out">' + esc(L(x)) + ' →</span>'; }).join('') + '</div><p>' + esc(L(st[i].detail)) + '</p></div>' +
        '<div class="row no-print"><button type="button" class="btn sm" data-prev' + (i ? '' : ' disabled') + '>← ' + esc(T('Back', '上一步')) + '</button><button type="button" class="btn sm solid" data-play>' + (timer ? '❚❚ ' + esc(T('Pause', '暂停')) : '▶ ' + esc(T('Play', '播放'))) + '</button><button type="button" class="btn sm" data-next' + (i < st.length - 1 ? '' : ' disabled') + '>' + esc(T('Next', '下一步')) + ' →</button><span class="small muted">' + (i + 1) + ' / ' + st.length + '</span></div>';
      $$('.st-box', box).forEach(function (b) { b.addEventListener('click', function () { stop(); i = +b.dataset.i; draw(); }); });
      $('[data-prev]', box).addEventListener('click', function () { stop(); i = Math.max(0, i - 1); draw(); });
      $('[data-next]', box).addEventListener('click', function () { stop(); i = Math.min(st.length - 1, i + 1); draw(); });
      $('[data-play]', box).addEventListener('click', function () { if (timer) { stop(); draw(); return; } if (i >= st.length - 1) i = 0; timer = setInterval(function () { if (i >= st.length - 1) { stop(); draw(); return; } i++; draw(); }, 3200); draw(); });
    }
    function stop() { clearInterval(timer); timer = null; }
    draw(); B.onLang(draw);
  }

  /* ---------- 4. transcription and translation, with mutations ---------- */
  var CODE = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG', NT = 'UCAG';
  var AA3 = { F: 'Phe', L: 'Leu', S: 'Ser', Y: 'Tyr', C: 'Cys', W: 'Trp', P: 'Pro', H: 'His', Q: 'Gln', R: 'Arg', I: 'Ile', M: 'Met', T: 'Thr', N: 'Asn', K: 'Lys', V: 'Val', A: 'Ala', D: 'Asp', E: 'Glu', G: 'Gly', '*': 'Stop' };
  function aa(c) { return CODE[16 * NT.indexOf(c[0]) + 4 * NT.indexOf(c[1]) + NT.indexOf(c[2])]; }
  function protein(m) { var s = m.indexOf('AUG'); if (s < 0) return null; var out = []; for (var i = s; i + 3 <= m.length; i += 3) { var x = aa(m.substr(i, 3)); out.push(x); if (x === '*') break; } return { start: s, aa: out }; }
  var COMP = { A: 'T', T: 'A', G: 'C', C: 'G' };
  function dogma(box) {
    var ORIG = (box.dataset.seq || 'TACCGAACCTTTGCAATT');   // template strand, written 3' -> 5'
    var tpl = ORIG, stage = 0, cur = -1, evt = '';
    function mrna(t) { return t.split('').map(function (b) { return { A: 'U', T: 'A', G: 'C', C: 'G' }[b]; }).join(''); }
    function classify() {
      var p0 = protein(mrna(ORIG)), p1 = protein(mrna(tpl));
      if (tpl === ORIG) return '';
      if (!p1) return T('The start codon is gone: translation cannot begin here.', '起始密码子没了：翻译无法从这里开始。');
      var a0 = p0.aa.join(''), a1 = p1.aa.join('');
      if ((tpl.length - ORIG.length) % 3 !== 0) return T('Frameshift: every codon after the change is read in a new frame, so the amino acids change from there on (and a stop codon may appear early or late).', '移码突变：改动之后的每个密码子都换了读框，从那里起氨基酸全变了（终止密码子可能提前或推后出现）。');
      if (a1 === a0) return T('Silent mutation: the codon changed but still codes for the same amino acid (the code is redundant).', '同义（沉默）突变：密码子变了，但仍编码同一个氨基酸（密码子有简并性）。');
      if (a1.indexOf('*') >= 0 && a1.indexOf('*') < a0.indexOf('*')) return T('Nonsense mutation: a stop codon appears early, so the polypeptide is cut short.', '无义突变：提前出现终止密码子，多肽链被截短。');
      return T('Missense mutation: one amino acid is swapped. Whether it matters depends on where it sits in the folded protein.', '错义突变：换了一个氨基酸。影响大不大，要看它在折叠后的蛋白质里处于什么位置。');
    }
    function draw() {
      var m = mrna(tpl), cod = tpl.split('').map(function (b) { return COMP[b]; }).join(''), p = protein(m);
      var shown = stage >= 1 ? m : '';
      function row(lbl, seq, cls, click) { return '<div class="dg-row"><span class="dg-lbl small">' + lbl + '</span><span class="dg-seq ' + cls + '">' + seq.split('').map(function (c, k) { return '<' + (click ? 'button type="button" data-k="' + k + '"' : 'span') + ' class="nt n' + c + (k === cur ? ' sel' : '') + '">' + c + '</' + (click ? 'button' : 'span') + '>'; }).join('') + '</span></div>'; }
      var prot = '';
      if (stage >= 2 && p) {
        prot = '<div class="dg-row"><span class="dg-lbl small">' + esc(T('Polypeptide', '多肽')) + '</span><span class="dg-aa">' + p.aa.map(function (x, k) { return '<span class="aa' + (x === '*' ? ' stop' : '') + '" style="animation-delay:' + (k * 0.25) + 's"><small>' + m.substr(p.start + 3 * k, 3) + '</small>' + AA3[x] + '</span>'; }).join('') + '</span></div>';
      } else if (stage >= 2) prot = '<p class="small">' + esc(T('No AUG start codon in this mRNA.', '这段 mRNA 里没有 AUG 起始密码子。')) + '</p>';
      box.innerHTML = '<div class="dg">' + row(esc(T("DNA coding strand 5'→3'", "DNA 编码链 5'→3'")), cod, 'dna', false) + row(esc(T("DNA template strand 3'→5' (tap a base)", "DNA 模板链 3'→5'（点一个碱基）")), tpl, 'dna tpl', true) +
        (stage >= 1 ? row(esc(T("mRNA 5'→3'", "mRNA 5'→3'")), shown, 'rna', false) : '') + prot + '</div>' +
        '<div class="row no-print"><button type="button" class="btn sm solid" data-go>' + esc(stage === 0 ? T('1 · Transcribe (RNA polymerase reads the template)', '1 · 转录（RNA 聚合酶读模板链）') : stage === 1 ? T('2 · Translate (ribosome reads codons from AUG)', '2 · 翻译（核糖体从 AUG 开始读密码子）') : T('Start again', '重来')) + '</button>' +
        (cur >= 0 ? '<button type="button" class="btn sm" data-swap>' + esc(T('Change this base', '换这个碱基')) + '</button><button type="button" class="btn sm" data-ins>' + esc(T('Insert a base here', '在这里插入一个碱基')) + '</button><button type="button" class="btn sm" data-del>' + esc(T('Delete this base', '删掉这个碱基')) + '</button>' : '') +
        (tpl !== ORIG ? '<button type="button" class="btn sm" data-reset>' + esc(T('Undo all changes', '撤销全部改动')) + '</button>' : '') + '</div>' +
        '<p class="small sim-note">' + esc(evt || T('Tap a template base to select it, then change, insert or delete it — and translate again to see what kind of mutation you made.', '点模板链上的一个碱基选中它，再替换、插入或删除——然后重新翻译，看看你造成了哪种突变。')) + (tpl !== ORIG && stage >= 2 ? '<br><b>' + esc(classify()) + '</b>' : '') + '</p>';
      $('[data-go]', box).addEventListener('click', function () { stage = stage >= 2 ? 0 : stage + 1; evt = ''; draw(); });
      $$('.tpl [data-k]', box).forEach(function (b) { b.addEventListener('click', function () { cur = cur === +b.dataset.k ? -1 : +b.dataset.k; draw(); }); });
      var sw = $('[data-swap]', box); if (sw) sw.addEventListener('click', function () { var nb = { A: 'G', G: 'C', C: 'T', T: 'A' }[tpl[cur]]; tpl = tpl.slice(0, cur) + nb + tpl.slice(cur + 1); evt = T('Base ' + (cur + 1) + ' changed. ', '第 ' + (cur + 1) + ' 个碱基已替换。') + T('Translate to compare.', '翻译一下来比较。'); stage = Math.min(stage, 1); draw(); });
      var ins = $('[data-ins]', box); if (ins) ins.addEventListener('click', function () { if (tpl.length > 30) return; tpl = tpl.slice(0, cur) + 'G' + tpl.slice(cur); evt = T('A base was inserted.', '插入了一个碱基。'); stage = Math.min(stage, 1); draw(); });
      var del = $('[data-del]', box); if (del) del.addEventListener('click', function () { if (tpl.length < 7) return; tpl = tpl.slice(0, cur) + tpl.slice(cur + 1); cur = Math.min(cur, tpl.length - 1); evt = T('A base was deleted.', '删掉了一个碱基。'); stage = Math.min(stage, 1); draw(); });
      var rs = $('[data-reset]', box); if (rs) rs.addEventListener('click', function () { tpl = ORIG; cur = -1; evt = ''; draw(); });
    }
    draw(); B.onLang(draw);
  }

  /* ---------- 5. Punnett squares ---------- */
  function punnett(box) {
    var mode = 'mono', p1 = 'Aa', p2 = 'Aa';
    var OPTS = { mono: ['AA', 'Aa', 'aa'], di: ['AABB', 'AaBb', 'Aabb', 'aaBb', 'aabb'], x: ['XᴿXᴿ', 'XᴿXʳ', 'XʳXʳ', 'XᴿY', 'XʳY'] };
    function gametes(g) {
      if (mode === 'mono') return [g[0], g[1]];
      if (mode === 'di') { var a = [g[0], g[1]], b = [g[2], g[3]], o = []; a.forEach(function (x) { b.forEach(function (y) { o.push(x + y); }); }); return o; }
      return g.indexOf('Y') >= 0 ? [g.slice(0, 2), 'Y'] : [g.slice(0, 2), g.slice(2)];
    }
    function norm(g) {
      if (mode === 'x') { if (g.indexOf('Y') >= 0) return g.replace('Y', '') + 'Y'; var xs = [g.slice(0, 2), g.slice(2)].sort(function (a, b) { return a[1] === 'ᴿ' ? -1 : 1; }); return xs.join(''); }
      var out = ''; for (var i = 0; i < g.length; i += 1) { } var genes = mode === 'mono' ? [[g[0], g[1]]] : [[g[0], g[2]], [g[1], g[3]]];
      return genes.map(function (pr) { return pr.sort(function (a, b) { return a === a.toUpperCase() ? -1 : 1; }).join(''); }).join('');
    }
    function pheno(g) {
      if (mode === 'mono') return /A/.test(g) ? T('dark fur', '深色毛') : T('light fur', '浅色毛');
      if (mode === 'di') return (/A/.test(g) ? T('dark', '深色') : T('light', '浅色')) + ' · ' + (/B/.test(g) ? T('long tail', '长尾') : T('short tail', '短尾'));
      var male = g.indexOf('Y') >= 0; return (male ? T('male', '雄') : T('female', '雌')) + ' · ' + (/ᴿ/.test(g) ? T('red eyes', '红眼') : T('white eyes', '白眼'));
    }
    function draw() {
      if (OPTS[mode].indexOf(p1) < 0) p1 = OPTS[mode][mode === 'x' ? 1 : 1];
      if (OPTS[mode].indexOf(p2) < 0) p2 = OPTS[mode][mode === 'x' ? 3 : 1];
      var g1 = gametes(p1), g2 = gametes(p2), tally = {}, ptally = {};
      var grid = '<table class="pq"><tr><th></th>' + g2.map(function (g) { return '<th>' + g + '</th>'; }).join('') + '</tr>' + g1.map(function (a) {
        return '<tr><th>' + a + '</th>' + g2.map(function (b) { var kid = norm(mode === 'di' ? a[0] + b[0] + a[1] + b[1] : a + b); if (mode === 'di') { kid = norm(a[0] + a[1] + b[0] + b[1]); } var ph = pheno(kid); tally[kid] = (tally[kid] || 0) + 1; ptally[ph] = (ptally[ph] || 0) + 1; return '<td title="' + esc(ph) + '">' + kid + '</td>'; }).join('') + '</tr>';
      }).join('') + '</table>';
      var tot = g1.length * g2.length;
      function list(o) { return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).map(function (k) { return '<li><b>' + esc(k) + '</b> — ' + o[k] + ' / ' + tot + ' (' + fmtN(100 * o[k] / tot, 1) + '%)</li>'; }).join(''); }
      var sel = function (k, v) { return '<select data-p="' + k + '">' + OPTS[mode].map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>'; };
      box.innerHTML = '<div class="row no-print">' + [['mono', T('One gene', '一对基因')], ['di', T('Two genes', '两对基因')], ['x', T('X-linked', '伴 X 遗传')]].map(function (m) { return '<button type="button" class="chip" data-m="' + m[0] + '" aria-pressed="' + (mode === m[0]) + '">' + esc(m[1]) + '</button>'; }).join('') + '</div>' +
        '<p class="small muted">' + esc(mode === 'mono' ? T('A made-up animal: A = dark fur (dominant), a = light fur.', '一种虚构的动物：A＝深色毛（显性），a＝浅色毛。') : mode === 'di' ? T('Two unlinked genes: A/a fur colour, B/b tail length (B long, dominant).', '两对不连锁的基因：A/a 毛色，B/b 尾长（B 长尾，显性）。') : T('Fruit-fly style eye colour on the X chromosome: Xᴿ red (dominant), Xʳ white. Males have one X.', '果蝇式的 X 染色体眼色：Xᴿ 红眼（显性），Xʳ 白眼。雄性只有一条 X。')) + '</p>' +
        '<div class="row">' + esc(T('Parent 1', '亲本 1')) + ' ' + sel(1, p1) + ' × ' + esc(T('Parent 2', '亲本 2')) + ' ' + sel(2, p2) + '</div>' +
        '<div class="sim-grid"><div class="sim-vis pq-wrap">' + grid + '</div><div class="sim-ctl"><h4>' + esc(T('Genotypes', '基因型')) + '</h4><ul class="small">' + list(tally) + '</ul><h4>' + esc(T('Phenotypes', '表型')) + '</h4><ul class="small">' + list(ptally) + '</ul>' +
        '<p class="small">' + esc(T('Each box is one equally likely combination of gametes — a probability, not a promise for a small family.', '每个格子是一种等可能的配子组合——是概率，不是小家庭里一定出现的结果。')) + '</p></div></div>';
      $$('[data-m]', box).forEach(function (b) { b.addEventListener('click', function () { mode = b.dataset.m; draw(); }); });
      $$('[data-p]', box).forEach(function (s) { s.addEventListener('change', function () { if (s.dataset.p === '1') p1 = s.value; else p2 = s.value; draw(); }); });
    }
    draw(); B.onLang(draw);
  }

  /* ---------- 6. genetic drift and selection (Hardy-Weinberg baseline) ---------- */
  function drift(box) {
    var P = { N: 50, p: 0.5, w: 1 }, chart = null, runs = null;
    function sim() {
      runs = [];
      for (var r = 0; r < 5; r++) {
        var p = P.p, out = [p];
        for (var g = 1; g <= 60; g++) {
          var q = 1 - p, wbar = 1 - q * q * (1 - P.w), ps = wbar > 0 ? p / wbar : 1, k = 0;
          for (var i = 0; i < 2 * P.N; i++) if (Math.random() < ps) k++;
          p = k / (2 * P.N); out.push(+p.toFixed(3));
        }
        runs.push(out);
      }
    }
    function draw() {
      if (chart) { chart.destroy(); chart = null; }
      var p = P.p, q = 1 - p;
      box.innerHTML = '<div class="sim-grid"><div class="sim-vis"><div class="chart-box"><canvas></canvas></div></div><div class="sim-ctl">' +
        '<label class="sim-l">' + esc(T('Population size N', '种群大小 N')) + ': <b>' + P.N + '</b>' + '<select data-k="N">' + [10, 50, 200, 1000].map(function (n) { return '<option' + (n === P.N ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
        '<label class="sim-l">' + esc(T('Starting frequency of allele A (p)', '等位基因 A 的起始频率 p')) + ': <b>' + p.toFixed(2) + '</b>' + slider('p', 0.05, 0.95, 0.05, p) + '</label>' +
        '<label class="sim-l">' + esc(T('Fitness of aa (1 = no selection)', 'aa 的适合度（1＝无选择）')) + ': <b>' + P.w.toFixed(2) + '</b>' + slider('w', 0, 1, 0.05, P.w) + '</label>' +
        '<button type="button" class="btn sm solid" data-run>↻ ' + esc(T('Run 5 new populations', '再跑 5 个种群')) + '</button>' +
        '<table class="sim-t"><tr><td colspan="2"><b>' + esc(T('Hardy–Weinberg expectation at the start', '起始时的哈迪–温伯格期望')) + '</b></td></tr><tr><td>AA = p²</td><td>' + (p * p).toFixed(3) + '</td></tr><tr><td>Aa = 2pq</td><td>' + (2 * p * q).toFixed(3) + '</td></tr><tr><td>aa = q²</td><td>' + (q * q).toFixed(3) + '</td></tr></table>' +
        '<p class="small">' + esc(P.w < 1 ? T('Selection against aa pushes p up in every run; drift adds the wobble. Small N wobbles most.', '对 aa 的选择让每次运行的 p 都上升；漂变带来抖动。N 越小抖得越厉害。') : T('No selection: with a small N the lines wander and alleles can be lost or fixed by chance alone (genetic drift). With N = 1000 they stay close to the start — near Hardy–Weinberg.', '没有选择：N 小时曲线四处游走，等位基因可能仅凭偶然就丢失或固定（遗传漂变）。N = 1000 时曲线贴近起点——接近哈迪–温伯格平衡。')) + '</p></div></div>';
      var labels = runs[0].map(function (_, g) { return g; });
      chart = lineChart($('canvas', box), labels, runs.map(function (r, i) { return { label: T('Population ', '种群 ') + (i + 1), data: r }; }), T('Frequency of A (p)', 'A 的频率 p'), T('Generation', '世代'), 1);
      $('[data-k=N]', box).addEventListener('change', function (e) { P.N = +e.target.value; sim(); draw(); });
      $('[data-k=p]', box).addEventListener('change', function (e) { P.p = +e.target.value; sim(); draw(); });
      $('[data-k=w]', box).addEventListener('change', function (e) { P.w = +e.target.value; sim(); draw(); });
      $('[data-run]', box).addEventListener('click', function () { sim(); draw(); });
    }
    sim(); draw(); B.onLang(draw); B.onStyle(draw);
  }

  /* ---------- 7. exponential vs logistic growth ---------- */
  function growth(box) {
    var P = { r: 0.4, K: 500 }, chart = null, N0 = 10;
    function draw() {
      if (chart) { chart.destroy(); chart = null; }
      var ts = [], ex = [], lo = [];
      for (var t = 0; t <= 30; t++) { ts.push(t); var e = N0 * Math.exp(P.r * t); ex.push(e > 1.6 * P.K ? null : Math.round(e)); lo.push(Math.round(P.K / (1 + ((P.K - N0) / N0) * Math.exp(-P.r * t)))); }
      box.innerHTML = '<div class="sim-grid"><div class="sim-vis"><div class="chart-box"><canvas></canvas></div></div><div class="sim-ctl">' +
        '<label class="sim-l">' + esc(T('Maximum per-capita growth rate r_max', '最大人均增长率 r_max')) + ': <b>' + P.r.toFixed(2) + '</b>' + slider('r', 0.1, 1, 0.05, P.r) + '</label>' +
        '<label class="sim-l">' + esc(T('Carrying capacity K', '环境容纳量 K')) + ': <b>' + P.K + '</b>' + slider('K', 100, 1000, 50, P.K) + '</label>' +
        '<p class="small">\\(\\frac{dN}{dt} = r_{max}N\\) · \\(\\frac{dN}{dt} = r_{max}N\\frac{K-N}{K}\\)</p>' +
        '<table class="sim-t"><tr><td>' + esc(T('Fastest logistic growth at N = K/2', '逻辑斯蒂增长最快处 N = K/2')) + '</td><td>' + P.K / 2 + '</td></tr><tr><td>' + esc(T('dN/dt there = r_max·K/4', '此处 dN/dt = r_max·K/4')) + '</td><td>' + fmtN(P.r * P.K / 4, 1) + ' ' + esc(T('per unit time', '每单位时间')) + '</td></tr></table>' +
        '<p class="small">' + esc(T('Exponential growth keeps speeding up (the line leaves the chart). Logistic growth slows as N nears K because density-dependent limits — food, space, disease — rise.', '指数增长越来越快（曲线冲出图外）。逻辑斯蒂增长在 N 接近 K 时变慢，因为食物、空间、疾病等密度制约因素增强。')) + '</p></div></div>';
      chart = lineChart($('canvas', box), ts, [{ label: T('Exponential', '指数增长'), data: ex }, { label: T('Logistic', '逻辑斯蒂增长'), data: lo }, { label: 'K', data: ts.map(function () { return P.K; }), dash: [6, 4], w: 1.5, color: B.cssv('--ink-3') }], T('Population size N', '种群大小 N'), T('Time', '时间'), Math.round(1.6 * P.K));
      $('[data-k=r]', box).addEventListener('change', function (e) { P.r = +e.target.value; draw(); });
      $('[data-k=K]', box).addEventListener('change', function (e) { P.K = +e.target.value; draw(); });
      if (window.renderMathInElement) try { renderMathInElement(box, { delimiters: [{ left: '\\(', right: '\\)', display: false }], throwOnError: false }); } catch (e) {}
    }
    draw(); B.onLang(draw); B.onStyle(draw);
  }

  /* ---------- 8. enzyme rate: substrate, inhibitors, temperature ---------- */
  function enzyme(box) {
    var P = { comp: false, non: false, T: 37 }, chart = null;
    function tf(t) { return t <= 37 ? Math.exp(-Math.pow((t - 37) / 14, 2)) : Math.max(0, Math.exp(-Math.pow((t - 37) / 6, 2))); }
    function draw() {
      if (chart) { chart.destroy(); chart = null; }
      var xs = [], base = [], now = [], Vm = 10, Km = 2, f = tf(P.T);
      for (var s = 0; s <= 20; s++) { xs.push(s); base.push(+(Vm * s / (Km + s)).toFixed(2)); var km = P.comp ? Km * 3 : Km, vm = (P.non ? Vm / 2 : Vm) * f; now.push(+(vm * s / (km + s)).toFixed(2)); }
      var msg = [];
      if (P.comp) msg.push(T('Competitive inhibitor: it sits in the active site, so it needs more substrate to reach the same rate — but at very high [S] the rate still approaches the same maximum.', '竞争性抑制剂：占据活性位点，所以要更多底物才能达到同样速率——但底物浓度很高时，速率仍接近同样的最大值。'));
      if (P.non) msg.push(T('Noncompetitive inhibitor: it binds elsewhere and changes the enzyme’s shape, so the maximum rate drops no matter how much substrate you add.', '非竞争性抑制剂：结合在别处并改变酶的形状，所以无论加多少底物，最大速率都下降。'));
      msg.push(P.T > 45 ? T('At ' + P.T + ' °C the enzyme is denaturing: bonds holding its 3D shape break, the active site no longer fits.', P.T + ' °C 时酶正在变性：维持三维结构的键断裂，活性位点不再契合。') : P.T < 30 ? T('At ' + P.T + ' °C molecules move slowly, so fewer collisions per second — slower, but not damaged.', P.T + ' °C 时分子运动慢，每秒碰撞更少——变慢，但没有被破坏。') : T('Near this enzyme’s optimum (illustrated at 37 °C).', '接近这种酶的最适温度（示意为 37 °C）。'));
      box.innerHTML = '<div class="sim-grid"><div class="sim-vis"><div class="chart-box"><canvas></canvas></div></div><div class="sim-ctl">' +
        '<label class="sim-l"><input type="checkbox" data-k="comp"' + (P.comp ? ' checked' : '') + '> ' + esc(T('Add a competitive inhibitor', '加竞争性抑制剂')) + '</label>' +
        '<label class="sim-l"><input type="checkbox" data-k="non"' + (P.non ? ' checked' : '') + '> ' + esc(T('Add a noncompetitive inhibitor', '加非竞争性抑制剂')) + '</label>' +
        '<label class="sim-l">' + esc(T('Temperature', '温度')) + ': <b>' + P.T + ' °C</b>' + slider('T', 10, 60, 1, P.T) + '</label>' +
        '<p class="small">' + msg.map(esc).join('<br>') + '</p><p class="small muted">' + esc(T('An illustration with made-up numbers, to show the shapes of the curves.', '示意图，数字是虚构的，只为展示曲线形状。')) + '</p></div></div>';
      chart = lineChart($('canvas', box), xs, [{ label: T('No inhibitor, 37 °C', '无抑制剂，37 °C'), data: base, dash: [6, 4], w: 1.5, color: B.cssv('--ink-3') }, { label: T('Your settings', '你的设置'), data: now }], T('Reaction rate', '反应速率'), T('Substrate concentration [S]', '底物浓度 [S]'), 11);
      $$('input[type=checkbox]', box).forEach(function (c) { c.addEventListener('change', function () { P[c.dataset.k] = c.checked; draw(); }); });
      $('[data-k=T]', box).addEventListener('change', function (e) { P.T = +e.target.value; draw(); });
    }
    draw(); B.onLang(draw); B.onStyle(draw);
  }

  var REG = { sav: sav, cell3d: cell3d, steps: steps, dogma: dogma, punnett: punnett, drift: drift, growth: growth, enzyme: enzyme };
  $$('.sim[data-sim]').forEach(function (box) { var f = REG[box.dataset.sim]; if (!f) { console.error('KIT-ERROR unknown sim ' + box.dataset.sim); return; } try { f(box); } catch (e) { console.error('KIT-ERROR sim ' + box.dataset.sim + ' ' + e.message); } });
})();
