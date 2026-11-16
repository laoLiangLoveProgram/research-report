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

  // 按块级元素取正文，跳过表格与代码（表格念出来只会是噪音）。
  var chunks = [];
  var blocks = article.querySelectorAll('h2,h3,p,li,blockquote');
  for (var i = 0; i < blocks.length; i++) {
    var el = blocks[i];
    if (el.closest('table') || el.closest('pre')) continue;
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    // 单条 utterance 太长时部分浏览器会中断，切成约 140 字的块。
    for (var p = 0; p < text.length; p += 140) chunks.push(text.slice(p, p + 140));
  }
  if (!chunks.length) {
    btn.disabled = true;
    btn.textContent = '没有可朗读的正文';
    return;
  }

  var state = 'idle';
  var idx = 0;

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
    btn.textContent = '🔊 朗读';
    if (stop) stop.hidden = true;
  }

  function next() {
    if (state !== 'speaking') return;
    if (idx >= chunks.length) { reset(); return; }
    var u = new SpeechSynthesisUtterance(chunks[idx++]);
    u.lang = 'zh-CN';
    u.rate = 1;
    var v = zhVoice();
    if (v) u.voice = v;
    u.onend = next;
    u.onerror = function (e) {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      reset();
    };
    synth.speak(u);
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
