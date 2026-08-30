/* 名可名：互动课程样例（projects/mingkeming.html）
   数据源：assets/Mingkeming-mock/【厨艺文本+题目】.txt（只做厨艺故事）
   固定高度翻页舞台：每一步只显示当前内容（一句/一题），点「继续」上滑换页，
   「← 上一句」反向回翻；题目答对才能继续，回翻保留答题状态；
   侧边 sticky 插图栏随剧情节点 crossfade；16 个进度圆点；完成态保留。
   无外部依赖。 */

(function () {
  'use strict';

  var root = document.getElementById('mkm-demo');
  if (!root) return;

  var flow = document.getElementById('mkm-flow');
  var prevBtn = document.getElementById('mkm-prev');
  var nextBtn = document.getElementById('mkm-next');
  var done = document.getElementById('mkm-done');
  var progress = document.getElementById('mkm-progress');
  var dotsBox = document.getElementById('mkm-dots');
  var stageImgs = document.querySelectorAll('.mkm-stage img');

  /* ---------- 内容（逐字取自 mock 文本） ---------- */

  var STORY = [
    { en: 'Aya saw an AI-generated “edible lava” video on Bilibili.',
      zh: '阿雅在B站刷到一个AI生成的“可食用岩浆”视频。' },
    { en: 'She giggled: “Humans copying AI copying humans? Same.”',
      zh: '她笑出声：“人类模仿AI模仿人类？我也是。”' },
    { en: 'So she grabbed her biggest jar of local wild honey.',
      zh: '于是她翻出家里最大的一罐土蜂蜜。' },
    { en: 'Added red food coloring. Stirred it. “No way—this looks legit!”',
      zh: '加了红色食用色素，搅一搅：“不会吧，这也太像了！”' },
    { en: 'No electric lights inside—just safe, edible ingredients.',
      zh: '里面不放电路灯——只用能吃的东西。' },
    { en: 'She put a tiny LED under the glass bowl.',
      zh: '她在玻璃碗底下放了个迷你LED灯。' },
    { en: 'Turn off the lights… BOOM! It’s glowing like real lava!',
      zh: '关灯——哇！真的在发光，像岩浆本浆！' },
    { en: 'For “volcanic rocks,” she crushed chocolate cookies by hand.',
      zh: '“火山石”？她亲手把巧克力饼干捏碎。' },
    { en: 'Then came the dark chocolate—so hard, like a textbook!',
      zh: '接着是黑巧克力——硬得像大学高数课本！' },
    { en: 'She tried to break it… failed. So she dropped it on the counter.',
      zh: '她用力掰……失败。干脆往料理台一摔。' },
    { en: 'Melted it slowly. Poured it over the honey “lava.”',
      zh: '小心融化，慢慢倒在蜂蜜“岩浆”上。' },
    { en: 'Into the fridge it goes—to set for 2 hours.',
      zh: '放进冰箱，冷藏两小时定型。' },
    { en: 'She filmed the whole process for her next Xiaohongshu post.',
      zh: '她录下全过程，准备发小红书。' },
    { en: 'Caption: “AI said ‘edible volcano.’ I said ‘I got this.’”',
      zh: '配文：“AI说‘可食用火山’，我说‘这题我会’。”' },
    { en: 'Her little sister peeked in: “Can I help eat it?”',
      zh: '妹妹探头：“我能帮忙吃掉它吗？”' },
    { en: 'Aya winked: “Only if you promise not to tell Mom I used her good honey.”',
      zh: '阿雅眨眨眼：“只要你答应别告诉妈妈，我用了她珍藏的那罐蜂蜜。”' }
  ];

  // key = 在该句之后插入的题目
  var QUIZZES = {
    4: {
      tag: '练习 1 · 中文选英文',
      q: '“这也太像（岩浆）了！”最自然的英文是？',
      opts: ['This is too expensive',
             'This looks so fake',
             'No way—this looks legit!',
             'I don’t like the color'],
      answer: 2
    },
    7: {
      tag: '练习 2 · 英文选中文',
      q: 'What does “legit” mean in this story?',
      opts: ['合法的',
             '很贵的',
             '超真实 / 超像真的',
             '很辣的'],
      answer: 2
    },
    16: {
      tag: '练习 3 · 阅读理解',
      q: 'Why does Aya say “don’t tell Mom”?',
      opts: ['Because the honey was expired',
             'Because she used expensive or special honey without asking',
             'Because her mom hates chocolate',
             'Because the dish is too messy'],
      answer: 1
    }
  };

  // 剧情节点 → 插图切换（句子序号 1-based → 插图 index）
  var STAGE_KEYS = [1, 3, 7, 15];
  var STAGE_AT = { 1: 0, 3: 1, 7: 2, 15: 3 };

  var LETTERS = ['A', 'B', 'C', 'D'];
  var TOTAL_Q = Object.keys(QUIZZES).length;

  // 步骤流：16 句 + 3 题（插在第 4、7、16 句后）
  var STEPS = [];
  STORY.forEach(function (s, i) {
    STEPS.push({ type: 'sent', n: i + 1 });
    if (QUIZZES[i + 1]) {
      STEPS.push({ type: 'quiz', after: i + 1, qid: i + 1, quiz: QUIZZES[i + 1] });
    }
  });

  var pos = 0;          // 当前步骤
  var maxSent = 1;      // 最远读到第几句（驱动圆点）
  var solved = 0;
  var finished = false;
  var quizState = {};   // qid -> { answered, wrong: {idx:1} }

  /* ---------- 进度圆点 ---------- */

  var dots = [];
  for (var d = 0; d < STORY.length; d++) {
    var dot = document.createElement('i');
    dotsBox.appendChild(dot);
    dots.push(dot);
  }

  function sentNo() {
    var st = STEPS[pos];
    return st.type === 'sent' ? st.n : st.after;
  }

  function stageFor(n) {
    var s = 0;
    STAGE_KEYS.forEach(function (k) { if (n >= k) s = STAGE_AT[k]; });
    return s;
  }

  function setStage(n) {
    stageImgs.forEach(function (img, i) {
      img.classList.toggle('on', i === n);
    });
  }

  function updateChrome() {
    var n = sentNo();
    if (n > maxSent) maxSent = n;
    setStage(stageFor(n));
    dots.forEach(function (d, i) { d.classList.toggle('on', i < maxSent); });
    progress.textContent = '第 ' + n + '/16 句 · 练习 ' + solved + '/' + TOTAL_Q;
    prevBtn.disabled = animating || pos === 0;
    var st = STEPS[pos];
    var quizBlocked = st.type === 'quiz' &&
      !(quizState[st.qid] && quizState[st.qid].answered);
    nextBtn.disabled = animating || quizBlocked;
    nextBtn.style.display = (finished && pos === STEPS.length - 1) ? 'none' : '';
  }

  /* ---------- 步骤渲染 ---------- */

  function buildSent(n) {
    var s = STORY[n - 1];
    var p = document.createElement('p');
    p.className = 'mkm-sent';
    p.innerHTML = '<span class="mkm-en">' + s.en + '</span>' +
      '<span class="mkm-zh">' + s.zh + '</span>';
    p.addEventListener('click', function () {
      p.classList.toggle('show-zh');
    });
    return p;
  }

  function buildQuiz(st) {
    var quiz = st.quiz;
    var state = quizState[st.qid] ||
      (quizState[st.qid] = { answered: false, wrong: {} });

    var box = document.createElement('div');
    box.className = 'mkm-quiz';
    box.innerHTML = '<span class="mkm-quiz-tag">' + quiz.tag + '</span>' +
      '<p class="mkm-q">' + quiz.q + '</p>' +
      '<div class="mkm-opts"></div>';

    var optsBox = box.querySelector('.mkm-opts');

    quiz.opts.forEach(function (text, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mkm-opt';
      btn.textContent = LETTERS[i] + '. ' + text;

      // 回翻时恢复答题状态
      if (state.wrong[i]) { btn.classList.add('wrong'); btn.disabled = true; }
      if (state.answered) {
        btn.disabled = true;
        if (i === quiz.answer) {
          btn.classList.add('correct');
          btn.textContent = '✓ ' + btn.textContent;
        }
      }

      btn.addEventListener('click', function () {
        if (state.answered || btn.disabled) return;
        if (i === quiz.answer) {
          state.answered = true;
          btn.classList.add('correct');
          btn.textContent = '✓ ' + btn.textContent;
          optsBox.querySelectorAll('.mkm-opt').forEach(function (b) {
            b.disabled = true;
          });
          solved++;
          if (solved === TOTAL_Q && pos === STEPS.length - 1) finish();
          updateChrome();
        } else {
          state.wrong[i] = 1;
          btn.classList.add('wrong');
          btn.disabled = true;
        }
      });

      optsBox.appendChild(btn);
    });

    return box;
  }

  /* ---------- 翻页（上滑换页 / 回翻反向） ---------- */

  var curItem = null;   // 当前驻留的 item（显式引用，不用 querySelector 猜）
  var animating = false;

  function show(dir) {
    var st = STEPS[pos];
    var item = document.createElement('div');
    item.className = 'mkm-item';
    item.appendChild(st.type === 'sent' ? buildSent(st.n) : buildQuiz(st));

    if (dir === 0) {
      if (curItem) curItem.remove();
      flow.appendChild(item);
      curItem = item;
      updateChrome();
      return;
    }

    var old = curItem;
    animating = true;
    item.classList.add(dir > 0 ? 'mkm-enter-below' : 'mkm-enter-above');
    flow.appendChild(item);
    curItem = item;
    if (old) old.classList.add(dir > 0 ? 'mkm-exit-up' : 'mkm-exit-down');
    void item.offsetWidth; // 强制 reflow 触发过渡
    item.classList.remove('mkm-enter-below');
    item.classList.remove('mkm-enter-above');
    updateChrome();

    // 旧 item 在 transitionend 后移除（兜底 timeout），并清掉一切残留节点
    var cleaned = false;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      Array.prototype.forEach.call(flow.querySelectorAll('.mkm-item'), function (el) {
        if (el !== curItem) el.remove();
      });
      animating = false;
      updateChrome();
    }
    var slide = old || item;
    slide.addEventListener('transitionend', function h(e) {
      if (e.target !== slide) return;
      slide.removeEventListener('transitionend', h);
      cleanup();
    });
    setTimeout(cleanup, 450);
  }

  function finish() {
    finished = true;
    done.classList.add('show');
  }

  nextBtn.addEventListener('click', function () {
    if (animating) return;
    if (pos < STEPS.length - 1 && !nextBtn.disabled) {
      pos++;
      show(1);
    }
  });

  prevBtn.addEventListener('click', function () {
    if (animating) return;
    if (pos > 0) {
      pos--;
      show(-1);
    }
  });

  /* ---------- 初始：第 1 句 ---------- */

  show(0);
})();
