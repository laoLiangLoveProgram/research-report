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

  // 预生成的云健音频（有就播它，没有就退回浏览器 TTS）。
  var audio = document.getElementById('report-audio');
  var audioBtn = document.getElementById('audio-btn');

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
  var blocks = article.querySelectorAll('h2,h3,p,li,blockquote');
  for (var i = 0; i < blocks.length; i++) {
    var el = blocks[i];
    // 表格与代码块不朗读：表格内容太长，读出来比看还慢。
    if (el.closest('table') || el.closest('pre')) continue;
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
    if (audio) { audio.pause(); if (audioBtn) audioBtn.textContent = '▶ 云健音频'; }
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
  if (audio && audioBtn) {
    audioBtn.addEventListener('click', function () {
      if (audio.paused) {
        synth.cancel();
        reset();
        audio.play();
        audioBtn.textContent = '⏸ 暂停音频';
      } else {
        audio.pause();
        audioBtn.textContent = '▶ 云健音频';
      }
    });
    audio.addEventListener('ended', function () { audioBtn.textContent = '▶ 云健音频'; });
  }
  window.addEventListener('beforeunload', function () { synth.cancel(); });
})();
