(function () {
  var btn = document.getElementById('speak-btn');
  var stop = document.getElementById('stop-btn');
  var article = document.querySelector('article');
  if (!btn || !article) return;
  var synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
    btn.disabled = true;
    btn.textContent = '浏览器不支持朗读';
    return;
  }

  // 每个朗读单元绑定一个 DOM 元素，用于朗读时蓝色高亮。
  var units = [];
  function textOf(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function push(el, text) {
    text = (text || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    // 单条 utterance 太长时部分浏览器会中断，切成约 140 字的块。
    for (var p = 0; p < text.length; p += 140) units.push({ el: el, text: text.slice(p, p + 140) });
  }
  var blocks = article.querySelectorAll('h2,h3,p,li,blockquote,tr');
  for (var i = 0; i < blocks.length; i++) {
    var el = blocks[i];
    // 表格按行朗读：把一行里的单元格依次连起来，时间线类表格也能读全。
    if (el.tagName === 'TR') {
      var cells = el.querySelectorAll('td');
      if (!cells.length) continue;
      var parts = [];
      for (var c = 0; c < cells.length; c++) {
        var t = textOf(cells[c]);
        if (t) parts.push(t);
      }
      push(el, parts.join('，'));
      continue;
    }
    if (el.closest('pre')) continue;
    if (el.closest('td') || el.closest('th')) continue;   // 表格内容已按行读
    if (el.tagName === 'P' && el.closest('li')) continue; // li 已整体读
    push(el, textOf(el));
  }
  if (!units.length) {
    btn.disabled = true;
    btn.textContent = '没有可朗读的正文';
    return;
  }

  var state = 'idle';
  var idx = 0;
  var highlighted = null;

  function highlight(el) {
    if (highlighted) highlighted.classList.remove('speaking');
    highlighted = el || null;
    if (highlighted) {
      highlighted.classList.add('speaking');
      try { highlighted.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
    }
  }

  function zhVoice() {
    var list = synth.getVoices() || [];
    for (var i = 0; i < list.length; i++) {
      if (/^zh/i.test(list[i].lang)) return list[i];
    }
    return null;
  }

  function reset() {
    state = 'idle';
    idx = 0;
    highlight(null);
    btn.textContent = '🔊 朗读';
    if (stop) stop.hidden = true;
  }

  function next() {
    if (state !== 'speaking') return;
    if (idx >= units.length) { reset(); return; }
    var unit = units[idx++];
    highlight(unit.el);
    var utter = new SpeechSynthesisUtterance(unit.text);
    utter.lang = 'zh-CN';
    utter.rate = 1;
    var v = zhVoice();
    if (v) utter.voice = v;
    utter.onend = next;
    utter.onerror = function (e) {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      reset();
    };
    synth.speak(utter);
  }

  function start() {
    synth.cancel();
    state = 'speaking';
    idx = 0;
    btn.textContent = '⏸ 暂停';
    if (stop) stop.hidden = false;
    next();
  }

  btn.addEventListener('click', function () {
    if (state === 'idle') { start(); return; }
    if (state === 'speaking') { synth.pause(); state = 'paused'; btn.textContent = '▶ 继续'; return; }
    if (state === 'paused') { synth.resume(); state = 'speaking'; btn.textContent = '⏸ 暂停'; }
  });
  if (stop) stop.addEventListener('click', function () { synth.cancel(); reset(); });
  window.addEventListener('beforeunload', function () { synth.cancel(); });
})();
