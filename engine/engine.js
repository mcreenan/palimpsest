(function () {
  'use strict';
  /* Per-project config injected at build time (see src/core/inject.ts). */
  var PAL = window.__PAL__ || {};
  var REPO = PAL.projectName || 'engineering-guide';
  var REPO_BASE = String(PAL.repoLinkBase || 'https://github.com').replace(/\/+$/, '');
  var REPO_BRANCH = PAL.repoBranch || 'HEAD';

  /* ---------- Mermaid diagrams (themed from the project's tokens) ---------- */
  if (window.mermaid) {
    window.mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: PAL.mermaid || {}
    });
  }

  /* ---------- GitHub repo references ---------- */
  var ghIcon =
    '<svg class="gh-ico" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
    '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 ' +
    '0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 ' +
    '1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 ' +
    '0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 ' +
    '2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 ' +
    '1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 ' +
    '2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
  document.querySelectorAll('a.gh-repo[data-repo]').forEach(function (a) {
    var repo = a.getAttribute('data-repo');
    a.href = REPO_BASE + '/' + repo;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.innerHTML = ghIcon + '<span>' + repo + '</span>';
  });

  /* ---------- Annotation triggers ---------- */
  var pencil =
    '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z" stroke="currentColor" stroke-width="1.3" ' +
    'stroke-linejoin="round"/></svg>';

  /* Same pencil everywhere: fill inline references with the trigger icon */
  document.querySelectorAll('.pencil-inline').forEach(function (s) { s.innerHTML = pencil; });

  /* ---------- Inline code identifiers: type badge + GitHub link ---------- */
  var IDENT_BADGE = { class: 'C', method: 'ƒ', function: 'ƒ', module: 'M', constant: 'K' };
  document.querySelectorAll('a.ident').forEach(function (a) {
    var type = a.getAttribute('data-type') || 'class';
    var repo = a.getAttribute('data-repo');
    var path = a.getAttribute('data-path');
    var branch = a.getAttribute('data-branch') || REPO_BRANCH;
    if (repo) {
      a.href = REPO_BASE + '/' + repo + (path ? ('/blob/' + branch + '/' + path) : '');
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    var name = a.textContent;
    a.textContent = '';
    var badge = document.createElement('span');
    badge.className = 'ident-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = IDENT_BADGE[type] || 'C';
    var nameEl = document.createElement('span');
    nameEl.className = 'ident-name';
    nameEl.textContent = name;
    a.appendChild(badge);
    a.appendChild(nameEl);
    if (!a.getAttribute('title')) a.setAttribute('title', name + ' — ' + type + (repo ? ' in ' + repo : ''));
  });

  /* ---------- Embedded canvas: pan / zoom / full-screen ---------- */
  var canvases = Array.prototype.slice.call(document.querySelectorAll('.canvas'));

  function clampScale(s) { return Math.max(0.2, Math.min(8, s)); }
  function applyTransform(c) {
    c._pan.style.transform = 'translate(' + c._tx + 'px,' + c._ty + 'px) scale(' + c._scale + ')';
  }
  function fitCanvas(c) {
    if (!c._pan) return;
    c._pan.style.transform = 'none';
    var sw = c._stage.clientWidth, sh = c._stage.clientHeight;
    var cw = c._pan.offsetWidth || 1, ch = c._pan.offsetHeight || 1;
    var scale = Math.min(sw / cw, sh / ch, 1);
    c._scale = scale;
    c._tx = (sw - cw * scale) / 2;
    c._ty = (sh - ch * scale) / 2;
    applyTransform(c);
  }
  function zoomAt(c, factor, cx, cy) {
    var ns = clampScale(c._scale * factor);
    var k = ns / c._scale;
    c._tx = cx - (cx - c._tx) * k;
    c._ty = cy - (cy - c._ty) * k;
    c._scale = ns;
    applyTransform(c);
  }
  function exitCanvasMax(canvas) {
    canvas.classList.remove('canvas--max');
    var b = canvas.querySelector('.canvas-fs');
    if (b) {
      b.setAttribute('aria-pressed', 'false');
      var lbl = b.querySelector('.fs-label');
      if (lbl) lbl.textContent = 'Fullscreen';
    }
    document.body.style.overflow = '';
    requestAnimationFrame(function () { fitCanvas(canvas); });
  }
  function mkCanvasBtn(cls, html, attrs) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    for (var k in attrs) b.setAttribute(k, attrs[k]);
    b.innerHTML = html;
    return b;
  }
  function setupCanvas(c) {
    var stage = c.querySelector('.canvas-stage');
    if (!stage) return;

    /* Capture the diagram title and Mermaid source BEFORE Mermaid replaces
       the <pre class="mermaid"> source with rendered SVG. */
    var titleEl = c.querySelector('.canvas-title');
    c._diagramTitle = titleEl ? titleEl.textContent.trim() : '';
    var mermaidEl = stage.querySelector('pre.mermaid') || stage.querySelector('.mermaid');
    if (mermaidEl) {
      // Reconstruct the authored source faithfully: <br/> in node labels is a
      // real element in the DOM, so textContent would drop it — preserve it as
      // the literal "<br/>" the source was written with.
      var srcClone = mermaidEl.cloneNode(true);
      Array.prototype.forEach.call(srcClone.querySelectorAll('br'), function (br) {
        br.parentNode.replaceChild(document.createTextNode('<br/>'), br);
      });
      c._diagramSrc = srcClone.textContent.trim();
    } else {
      c._diagramSrc = '';
    }

    var pan = document.createElement('div');
    pan.className = 'canvas-pan';
    while (stage.firstChild) pan.appendChild(stage.firstChild);
    stage.appendChild(pan);
    c._stage = stage; c._pan = pan; c._scale = 1; c._tx = 0; c._ty = 0;

    /* Toolbar — zoom out / reset / zoom in / fullscreen / Suggest are all added
       programmatically so every diagram gets them (including ones authored
       later) without the buttons living in the regenerated section markup.
       Guarded so an authored toolbar (e.g. imported content) isn't duplicated. */
    var tools = c.querySelector('.canvas-tools');
    if (tools) {
      if (!c.querySelector('[data-act]')) {
        tools.appendChild(mkCanvasBtn('canvas-btn', '&minus;', { 'data-act': 'zoom-out', 'aria-label': 'Zoom out', title: 'Zoom out' }));
        tools.appendChild(mkCanvasBtn('canvas-btn', 'Reset', { 'data-act': 'reset', 'aria-label': 'Reset view', title: 'Reset view' }));
        tools.appendChild(mkCanvasBtn('canvas-btn', '+', { 'data-act': 'zoom-in', 'aria-label': 'Zoom in', title: 'Zoom in' }));
      }
      if (!c.querySelector('.canvas-fs')) {
        var fsIco = '<svg class="fs-ico" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
          '<path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        tools.appendChild(mkCanvasBtn('canvas-fs', fsIco + '<span class="fs-label">Fullscreen</span>', { 'aria-pressed': 'false', title: 'Fullscreen' }));
      }
      if (!c.querySelector('.canvas-btn-suggest')) {
        var suggest = mkCanvasBtn('canvas-btn canvas-btn-suggest',
          '<span class="canvas-btn-ico">' + pencil + '</span><span class="canvas-btn-label">Suggest</span>',
          { 'aria-label': 'Suggest a change to this diagram', title: 'Suggest a change' });
        suggest.addEventListener('click', function (e) { e.stopPropagation(); openDiagramModal(c); });
        tools.appendChild(suggest);
      }
    }

    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = stage.getBoundingClientRect();
      zoomAt(c, e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    var dragging = false, sx = 0, sy = 0;
    stage.addEventListener('pointerdown', function (e) {
      dragging = true; sx = e.clientX - c._tx; sy = e.clientY - c._ty;
      stage.classList.add('grabbing');
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      c._tx = e.clientX - sx; c._ty = e.clientY - sy; applyTransform(c);
    });
    function endDrag() { dragging = false; stage.classList.remove('grabbing'); }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointerleave', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    c.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-act');
        if (act === 'reset') { fitCanvas(c); return; }
        var r = stage.getBoundingClientRect();
        zoomAt(c, act === 'zoom-in' ? 1.25 : 1 / 1.25, r.width / 2, r.height / 2);
      });
    });

    var fs = c.querySelector('.canvas-fs');
    if (fs) {
      fs.addEventListener('click', function () {
        if (c.classList.contains('canvas--max')) { exitCanvasMax(c); return; }
        c.classList.add('canvas--max');
        fs.setAttribute('aria-pressed', 'true');
        var lbl = fs.querySelector('.fs-label');
        if (lbl) lbl.textContent = 'Exit fullscreen';
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(function () { fitCanvas(c); });
      });
    }
  }
  canvases.forEach(setupCanvas);

  function fitAll() { canvases.forEach(fitCanvas); }

  if (window.mermaid) {
    window.mermaid.run({ querySelector: '.mermaid' }).then(fitAll).catch(function (e) {
      if (window.console) console.error('Mermaid render error:', e);
      fitAll();
    });
  } else {
    fitAll();
  }

  var resizeT;
  window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(fitAll, 150); });

  var state = { el: null, kind: 'paragraph', where: '', original: '' };

  function stripChrome(clone) {
    clone.querySelectorAll('.anno-trigger, .ident-badge').forEach(function (n) { n.remove(); });
    return clone;
  }
  function originalTextOf(el) {
    return stripChrome(el.cloneNode(true)).innerText.replace(/\s+/g, ' ').trim();
  }

  document.querySelectorAll('.annotatable').forEach(function (el) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'anno-trigger';
    btn.setAttribute('aria-label', 'Suggest a change to this paragraph');
    btn.innerHTML = pencil;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      openModal(el);
    });
    el.appendChild(btn);
  });

  /* Make other content blocks suggestible too: tables, code blocks, and
     standalone lists. Each is wrapped in an .anno-block so its own overflow
     does not clip the trigger. Skips blocks inside panels/canvas (those are
     already covered) and nested lists. */
  function blockKindOf(el) {
    if (el.classList.contains('table-wrapper')) return 'table';
    if (el.classList.contains('codeblock')) return 'code';
    if (el.tagName === 'DL') return 'definition list';
    return 'list';
  }
  function wireBlock(el) {
    var kind = blockKindOf(el);
    var wrap = document.createElement('div');
    wrap.className = 'anno-block';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'anno-trigger';
    btn.setAttribute('aria-label', 'Suggest a change to this ' + kind);
    btn.innerHTML = pencil;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      openBlockModal(el, kind);
    });
    wrap.appendChild(btn);
  }
  document.querySelectorAll('main section .table-wrapper, main section .codeblock, main section ul, main section ol, main section dl').forEach(function (el) {
    if (el.closest('.panel') || el.closest('.canvas') || el.closest('.anno-block')) return;
    if ((el.tagName === 'UL' || el.tagName === 'OL' || el.tagName === 'DL') && el.parentElement && el.parentElement.closest('ul, ol, dl')) return;
    wireBlock(el);
  });

  /* ---------- Modal ---------- */
  var modal = document.getElementById('annoModal');
  var whereEl = document.getElementById('annoWhere');
  var origEl = document.getElementById('annoOriginal');
  var typeEl = document.getElementById('annoType');
  var textEl = document.getElementById('annoText');
  var outWrap = document.getElementById('annoOutput');
  var outPre = document.getElementById('annoPrompt');

  function sectionInfoOf(el) {
    var sec = el.closest('section');
    if (!sec) return { num: '?', title: 'Unknown section', slug: '' };
    return { num: sec.getAttribute('data-num') || '?', title: sec.getAttribute('data-title') || sec.id, slug: sec.id || '' };
  }
  function fragmentPath(num, slug) {
    return (num && slug) ? ('sections/' + num + '-' + slug + '.html') : 'the matching sections/<n>-<slug>.html fragment';
  }

  /* The "Original text" label is the first .field-label inside the modal body;
     its text switches to "Current Mermaid source" for diagram suggestions. */
  var origLabelEl = modal.querySelectorAll('.modal-body .field-label')[0] || null;

  function showModal() {
    outWrap.classList.remove('show');
    outPre.textContent = '';
    modal.classList.add('open');
    setTimeout(function () { textEl.focus(); }, 50);
  }

  function openModal(el) {
    var info = sectionInfoOf(el);
    state.el = el;
    state.kind = 'paragraph';
    state.where = 'Section ' + info.num + ' — ' + info.title;
    state.sectionFile = fragmentPath(info.num, info.slug);
    state.original = originalTextOf(el);
    whereEl.textContent = state.where;
    origEl.textContent = state.original;
    origEl.classList.remove('code');
    if (origLabelEl) origLabelEl.textContent = 'Original text';
    typeEl.value = 'Reword / clarify';
    textEl.value = '';
    showModal();
  }

  function openDiagramModal(canvas) {
    var sec = canvas.closest('section');
    var num = sec ? (sec.getAttribute('data-num') || '?') : '?';
    var title = sec ? (sec.getAttribute('data-title') || sec.id) : 'Unknown section';
    var diagramTitle = canvas._diagramTitle || 'diagram';
    state.el = canvas;
    state.kind = 'diagram';
    state.diagramTitle = diagramTitle;
    state.sectionFile = fragmentPath(num, sec ? sec.id : '');
    state.where = 'Section ' + num + ' — ' + title + ' (diagram: ' + diagramTitle + ')';
    state.original = canvas._diagramSrc || diagramTitle;
    whereEl.textContent = state.where;
    origEl.textContent = state.original;
    origEl.classList.add('code');
    if (origLabelEl) origLabelEl.textContent = 'Current Mermaid source';
    typeEl.value = 'Reword / clarify';
    textEl.value = '';
    showModal();
  }

  function blockTextOf(el, kind) {
    var clone = stripChrome(el.cloneNode(true)); // drop badges so text reads clean
    if (kind === 'table') {
      var t = clone.querySelector('table');
      if (!t) return clone.innerText.trim();
      var rows = [];
      Array.prototype.forEach.call(t.rows, function (r) {
        var cells = Array.prototype.map.call(r.cells, function (c) { return c.innerText.replace(/\s+/g, ' ').trim(); });
        rows.push(cells.join('  |  '));
      });
      return rows.join('\n');
    }
    if (kind === 'code') {
      var c = clone.querySelector('code') || clone;
      return c.innerText.replace(/\s+$/, '');
    }
    return clone.innerText.trim(); // list / definition list
  }

  function openBlockModal(el, kind) {
    var info = sectionInfoOf(el);
    state.el = el;
    state.kind = 'block';
    state.blockKind = kind;
    state.sectionFile = fragmentPath(info.num, info.slug);
    state.where = 'Section ' + info.num + ' — ' + info.title + ' (' + kind + ')';
    state.original = blockTextOf(el, kind);
    whereEl.textContent = state.where;
    origEl.textContent = state.original;
    origEl.classList.add('code');
    if (origLabelEl) origLabelEl.textContent = 'Current ' + kind;
    typeEl.value = 'Reword / clarify';
    textEl.value = '';
    showModal();
  }

  function closeModal() { modal.classList.remove('open'); }

  function buildPrompt() {
    var suggestion = textEl.value.trim();
    var type = typeEl.value;
    var stamp = new Date().toISOString();

    var frag = state.sectionFile || 'the matching sections/<n>-<slug>.html fragment';
    var kind = state.kind;
    var subject, origLabel, editStep;
    if (kind === 'diagram') {
      subject = 'a DIAGRAM in the guide.';
      origLabel = 'CURRENT MERMAID SOURCE:';
      editStep = 'Find the <pre class="mermaid"> inside the matching .canvas (by its .canvas-title) and edit its Mermaid source to reflect the suggestion. Keep valid Mermaid 11 syntax and the house conventions: short node labels, <br/> for line breaks, and do NOT theme it (the page themes Mermaid globally).';
    } else if (kind === 'block') {
      var bk = state.blockKind || 'content block';
      subject = 'a ' + bk.toUpperCase() + ' in the guide.';
      origLabel = 'CURRENT ' + bk.toUpperCase() + ' (text rendering):';
      editStep = 'Find the ' + bk + ' that matches the CURRENT content shown above and edit it to reflect the suggestion. Preserve the component markup (a table uses <div class="table-wrapper"><table>…; a code block uses <div class="codeblock"><pre><code>…; lists use <ul>/<ol>/<dl>) and any annotatable intro paragraph. Add no inline styles or new colors, and keep repo references as <a class="gh-repo" data-repo="…"></a> (repo-root links only).';
    } else {
      subject = 'the guide.';
      origLabel = 'ORIGINAL TEXT:';
      editStep = 'Find the element whose text matches the ORIGINAL TEXT and edit it minimally to reflect the suggestion. Preserve the component classes (annotatable, panel, gh-repo, etc.), use repo-root gh-repo links (never deep file/line links), and add no inline styles, new colors, or font sizes.';
    }

    var TITLE = PAL.title || 'the engineering guide';
    var ARTIFACT = PAL.artifact || (REPO + '.html');
    var CONV = PAL.conventionsDoc || 'AGENTS.md';
    var BUILD = PAL.buildCommand || 'pal build';
    var SOURCES = PAL.sourcesOfTruth; /* optional org-specific description */

    var sourceCheck = SOURCES
      ? 'This guide only SUMMARISES authoritative sources: ' + SOURCES + ' It'
      : 'This guide only SUMMARISES the project\'s authoritative sources of truth (see ' +
        CONV + ' for what they are and how to verify against them). It';

    return [
      'You are working in the ' + TITLE + ' repository (project: ' + REPO + ').',
      'Run from the guide\'s project root. House conventions live in ' + CONV + '.',
      '',
      'This guide is BUILT FROM SOURCE. Do NOT hand-edit the generated artifact',
      ARTIFACT + ' — it is overwritten by the build. Each section\'s content lives',
      'in its own fragment under sections/, the page shell and styling come from the',
      'palimpsest engine (or a local ./engine if ejected), and `' + BUILD + '`',
      'reassembles them.',
      '',
      'A reader submitted a suggested change to ' + subject,
      '',
      'LOCATION:    ' + state.where,
      'SOURCE FILE: ' + frag,
      'CHANGE TYPE: ' + type,
      'TIMESTAMP:   ' + stamp,
      '',
      origLabel,
      '"""',
      state.original,
      '"""',
      '',
      'SUGGESTED CHANGE:',
      '"""',
      suggestion,
      '"""',
      '',
      'Do the following IN ORDER. Step 1 is a gate — if it fails, STOP.',
      '',
      '1. CHECK THE SUGGESTION AGAINST THE SOURCE OF TRUTH. ' + sourceCheck,
      '   must never contradict them. Determine whether the suggested change conflicts',
      '   with what those sources actually say. (Pure wording, structure, or clarity',
      '   changes that do not alter a factual claim are fine.)',
      '   • IF IT CONFLICTS WITH A SOURCE — STOP. Do NOT edit the guide or rebuild.',
      '     Append a changelog entry with status "blocked — conflicts with source" (the',
      '     timestamp, location, source file, the suggestion, and the conflicting',
      '     source). Then WARN the user: explain the conflict in plain terms, and tell',
      '     them the guide reflects the source of truth — so if the change is correct,',
      '     they must FIRST update the underlying source, and link the exact source to',
      '     update. The guide can be updated only after the source is. End here.',
      '   • IF THERE IS NO CONFLICT — continue to step 2.',
      '',
      '2. RECORD the suggestion as a change-log artifact. Append a new entry to',
      '   changelog/CHANGELOG.md (create it if missing) with: the timestamp, the',
      '   location, the source file, the change type, a short quote of the original',
      '   content, the suggestion, and status "applied". Also write a standalone',
      '   record at changelog/<UTC-date>-<short-slug>.md with the same details.',
      '',
      '3. EDIT THE SOURCE FRAGMENT (' + frag + ') — not the built HTML. ' + editStep,
      '   Keep the edit minimal and faithful; if the suggestion is ambiguous, make the',
      '   most reasonable interpretation and note it in the log entry.',
      '',
      '4. REBUILD the artifact so the change propagates: run `' + BUILD + '`.',
      '   This regenerates ' + ARTIFACT + ' from the engine + sections/*.html.',
      '   Verify the section rendered as intended.'
    ].join('\n');
  }

  document.getElementById('annoGenerate').addEventListener('click', function () {
    if (!textEl.value.trim()) { textEl.focus(); return; }
    outPre.textContent = buildPrompt();
    outWrap.classList.add('show');
    outWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  var copyBtn = document.getElementById('annoCopy');
  copyBtn.addEventListener('click', function () {
    var txt = outPre.textContent;
    var done = function () {
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(function () { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt); done(); });
    } else { fallbackCopy(txt); done(); }
  });
  function fallbackCopy(txt) {
    var ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  document.getElementById('annoClose').addEventListener('click', closeModal);
  document.getElementById('annoCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var maxed = document.querySelector('.canvas.canvas--max');
    if (maxed) { exitCanvasMax(maxed); return; }
    if (srcModal.classList.contains('open')) { closeSrc(); return; }
    closeModal();
  });

  /* ---------- Sources: button on leaf headings + modal ---------- */
  var srcModal = document.getElementById('srcModal');
  var srcList = document.getElementById('srcList');
  var srcWhere = document.getElementById('srcWhere');
  function closeSrc() { srcModal.classList.remove('open'); }
  document.getElementById('srcClose').addEventListener('click', closeSrc);
  srcModal.addEventListener('click', function (e) { if (e.target === srcModal) closeSrc(); });

  function openSources(where, dataEl) {
    srcWhere.textContent = where;
    srcList.innerHTML = '';
    dataEl.querySelectorAll('a').forEach(function (a) {
      var li = document.createElement('li');
      var kind = a.getAttribute('data-kind');
      if (kind) {
        var k = document.createElement('span');
        k.className = 'src-kind';
        k.textContent = kind;
        li.appendChild(k);
      }
      var link = a.cloneNode(true);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      li.appendChild(link);
      srcList.appendChild(li);
    });
    srcModal.classList.add('open');
  }
  function makeSrcBtn(where, dataEl) {
    var n = dataEl.querySelectorAll('a').length;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'src-btn';
    b.setAttribute('aria-label', 'Sources for ' + where);
    b.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M3 2.5h7l3 3V13.5H3z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<path d="M9.5 2.5V6h3.5M5.5 8.5h5M5.5 11h5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>' +
      'Sources <span class="src-count">' + n + '</span>';
    b.addEventListener('click', function (e) { e.stopPropagation(); openSources(where, dataEl); });
    return b;
  }
  function nextSourcesData(h) {
    var n = h.nextElementSibling;
    while (n) {
      if (n.tagName === 'H3') return null;
      if (n.classList && n.classList.contains('sources-data')) return n;
      n = n.nextElementSibling;
    }
    return null;
  }
  /* The attach loop runs at the END (after the ToC sub-nav is built from
     clean h3 text); see attachSources() below. */
  function attachSources() {
    document.querySelectorAll('main section[id]').forEach(function (sec) {
      var title = sec.getAttribute('data-title') || sec.id;
      var h3s = [];
      sec.querySelectorAll('h3').forEach(function (h) { if (!h.closest('.panel') && !h.closest('.canvas')) h3s.push(h); });
      if (h3s.length) {
        h3s.forEach(function (h3) {
          if (h3.querySelector('.src-btn')) return;
          var data = nextSourcesData(h3);
          if (data && data.querySelector('a')) {
            var where = title + ' › ' + h3.textContent.trim();
            h3.classList.add('has-sources');
            h3.appendChild(makeSrcBtn(where, data));
          }
        });
      } else {
        var data = sec.querySelector('.sources-data');
        if (data && data.querySelector('a')) {
          var head = sec.querySelector('.section-head');
          if (head && !head.querySelector('.src-btn')) head.appendChild(makeSrcBtn(title, data));
        }
      }
    });
  }

  /* ---------- ToC: mobile toggle ---------- */
  var toc = document.getElementById('toc');
  var overlay = document.getElementById('tocOverlay');
  var toggle = document.getElementById('tocToggle');

  /* ---------- ToC: build subsection (h3) sub-nav ---------- */
  function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }
  document.querySelectorAll('main section[id]').forEach(function (sec) {
    var link = toc.querySelector('a[href="#' + sec.id + '"]');
    if (!link) return;
    var subWrap = document.createElement('div');
    subWrap.className = 'toc-sub';
    var i = 0;
    sec.querySelectorAll('h3').forEach(function (h3) {
      if (h3.closest('.panel') || h3.closest('.canvas')) return;
      if (!h3.id) {
        var hid = sec.id + '--' + (slugify(h3.textContent) || ('s' + i));
        if (document.getElementById(hid)) hid = hid + '-' + i;
        h3.id = hid;
      }
      var a = document.createElement('a');
      a.className = 'toc-sub-link';
      a.href = '#' + h3.id;
      a.textContent = h3.textContent.trim();
      subWrap.appendChild(a);
      i++;
    });
    if (subWrap.children.length) link.parentNode.insertBefore(subWrap, link.nextSibling);
  });

  function setToc(open) {
    toc.classList.toggle('open', open);
    overlay.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  toggle.addEventListener('click', function () { setToc(!toc.classList.contains('open')); });
  overlay.addEventListener('click', function () { setToc(false); });
  toc.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { if (window.innerWidth <= 1024) setToc(false); });
  });

  /* ---------- ToC: scrollspy (sections + subsections) ---------- */
  var sectionLinks = {};
  toc.querySelectorAll('a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href && href.charAt(0) === '#' && !a.classList.contains('toc-sub-link')) sectionLinks[href.slice(1)] = a;
  });
  var secSpy = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        Object.keys(sectionLinks).forEach(function (k) { sectionLinks[k].classList.remove('active'); });
        if (sectionLinks[entry.target.id]) sectionLinks[entry.target.id].classList.add('active');
      }
    });
  }, { rootMargin: '-80px 0px -65% 0px', threshold: 0 });
  document.querySelectorAll('main section[id]').forEach(function (s) { secSpy.observe(s); });
  // default the first section active so the top of the page isn't orphaned
  var firstSec = document.querySelector('main section[id]');
  if (firstSec && sectionLinks[firstSec.id]) sectionLinks[firstSec.id].classList.add('active');

  var subLinks = {};
  toc.querySelectorAll('a.toc-sub-link').forEach(function (a) { subLinks[a.getAttribute('href').slice(1)] = a; });
  var subSpy = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        Object.keys(subLinks).forEach(function (k) { subLinks[k].classList.remove('active'); });
        if (subLinks[entry.target.id]) subLinks[entry.target.id].classList.add('active');
      }
    });
  }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });
  Object.keys(subLinks).forEach(function (id) { var el = document.getElementById(id); if (el) subSpy.observe(el); });

  /* ---------- ToC: filter ---------- */
  var filter = document.getElementById('tocFilter');
  var emptyMsg = document.getElementById('tocEmpty');
  filter.addEventListener('input', function () {
    var q = filter.value.trim().toLowerCase();
    toc.classList.toggle('filtering', q.length > 0);
    var anyVisible = false;
    toc.querySelectorAll('.toc-group').forEach(function (group) {
      var groupHasMatch = false;
      group.querySelectorAll('a:not(.toc-sub-link)').forEach(function (a) {
        var match = a.textContent.toLowerCase().indexOf(q) !== -1;
        a.style.display = match ? '' : 'none';
        if (match) { groupHasMatch = true; anyVisible = true; }
      });
      group.style.display = groupHasMatch ? '' : 'none';
    });
    emptyMsg.style.display = anyVisible ? 'none' : 'block';
  });

  /* Attach Sources buttons now that the ToC sub-nav has captured clean h3 text. */
  attachSources();
})();
