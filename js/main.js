/* 刘雨琦 / Shian — 作品集交互
   1. 概念可视化组件：NL2SQL 对话流动画 / 排课求解动画 / 龙虾迷你终端
      （全出血渲染，相对单位自适应容器；尊重 prefers-reduced-motion）
   2. 页面加载 stagger 浮现 + 滚动渐入（IntersectionObserver）
   无外部依赖。 */

(function () {
  'use strict';

  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 英文站（en/ 目录，<html lang="en">）切换字符串表 */
  var EN = document.documentElement.lang === 'en';

  function wait(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  /* ---------- 像素龙虾工具（box-shadow 像素画，供 main/demo 共用） ----------
     12×10 正面抽象版：对称双螯在上方两侧、身体居中、尾扇在下 */

  var LOBSTER_MAP = [
    '..XX....XX..',
    '..XXX..XXX..',
    '...X....X...',
    '....X..X....',
    '...XXXXXX...',
    '..XXXXXXXX..',
    '...XXXXXX...',
    '....XXXX....',
    '....XXXX....',
    '...X....X...'
  ];

  window.PixelLobster = function (cell, color) {
    var shadows = [];
    LOBSTER_MAP.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        if (row[x] === 'X') {
          shadows.push((x * cell) + 'px ' + (y * cell) + 'px 0 0 ' + color);
        }
      }
    });
    var w = LOBSTER_MAP[0].length * cell;
    var h = LOBSTER_MAP.length * cell;
    return '<span class="px-lob" style="width:' + w + 'px;height:' + h + 'px">' +
      '<i style="width:' + cell + 'px;height:' + cell + 'px;box-shadow:' +
      shadows.join(',') + '"></i></span>';
  };

  /* ---------- NL2SQL：对话 → SQL → 图表 流动画（浅色科技风，3 样例轮播） ---------- */

  var NL_SAMPLES = [
    {
      q: '上学期数学平均分是多少？',
      sql: [
        [{ t: '-- 意图: 成绩查询 ✓', cls: 'cm' }],
        [{ t: 'SELECT', cls: 'kw' }, { t: ' AVG(score)' }],
        [{ t: 'FROM', cls: 'kw' }, { t: ' exam_results' }],
        [{ t: 'WHERE', cls: 'kw' }, { t: " term = '上学期'" }]
      ],
      chart: 'bars',
      data: [45, 70, 55, 90, 65],
      cap: '柱状图 · 各年级数学平均分',
      time: '0.8s'
    },
    {
      q: '近三次月考，各班成绩趋势？',
      sql: [
        [{ t: '-- 意图: 趋势对比 ✓', cls: 'cm' }],
        [{ t: 'SELECT', cls: 'kw' }, { t: ' exam, class, AVG(score)' }],
        [{ t: 'FROM', cls: 'kw' }, { t: ' exam_results' }],
        [{ t: 'GROUP BY', cls: 'kw' }, { t: ' class, exam' }],
        [{ t: 'ORDER BY', cls: 'kw' }, { t: ' exam' }]
      ],
      chart: 'line',
      data: [
        { color: '#6C63FF', pts: '6,42 50,30 94,16' },
        { color: '#3AA7FF', pts: '6,48 50,40 94,30' },
        { color: '#F2A93B', pts: '6,36 50,44 94,36' }
      ],
      cap: '折线图 · 各班三次月考走势',
      time: '1.2s'
    },
    {
      q: '三年级各学科的及格率对比',
      sql: [
        [{ t: '-- 意图: 及格率对比 ✓', cls: 'cm' }],
        [{ t: 'SELECT', cls: 'kw' }, { t: ' subject,' }],
        [{ t: '  AVG(', cls: '' }, { t: 'CASE', cls: 'kw' }, { t: ' WHEN score >= 60' }],
        [{ t: '  ', cls: '' }, { t: 'THEN', cls: 'kw' }, { t: ' 1 ', cls: '' }, { t: 'ELSE', cls: 'kw' }, { t: ' 0 ', cls: '' }, { t: 'END', cls: 'kw' }, { t: ') AS pass_rate' }],
        [{ t: 'FROM', cls: 'kw' }, { t: ' exam_results' }],
        [{ t: 'WHERE', cls: 'kw' }, { t: " grade = '三年级' " }, { t: 'GROUP BY', cls: 'kw' }, { t: ' subject' }]
      ],
      chart: 'h',
      data: [92, 85, 78, 71, 64],
      cap: '条形图 · 各学科及格率',
      time: '1.5s'
    }
  ];

  var NL_SAMPLES_EN = [
    {
      q: 'What was the average math score last term?',
      sql: [
        [{ t: '-- intent: score lookup ✓', cls: 'cm' }],
        [{ t: 'SELECT', cls: 'kw' }, { t: ' AVG(score)' }],
        [{ t: 'FROM', cls: 'kw' }, { t: ' exam_results' }],
        [{ t: 'WHERE', cls: 'kw' }, { t: " term = 'last_term'" }]
      ],
      chart: 'bars',
      data: [45, 70, 55, 90, 65],
      cap: 'Bar chart · avg math score by grade',
      time: '0.8s'
    },
    {
      q: 'Score trend by class over the last 3 exams?',
      sql: [
        [{ t: '-- intent: trend compare ✓', cls: 'cm' }],
        [{ t: 'SELECT', cls: 'kw' }, { t: ' exam, class, AVG(score)' }],
        [{ t: 'FROM', cls: 'kw' }, { t: ' exam_results' }],
        [{ t: 'GROUP BY', cls: 'kw' }, { t: ' class, exam' }],
        [{ t: 'ORDER BY', cls: 'kw' }, { t: ' exam' }]
      ],
      chart: 'line',
      data: [
        { color: '#6C63FF', pts: '6,42 50,30 94,16' },
        { color: '#3AA7FF', pts: '6,48 50,40 94,30' },
        { color: '#F2A93B', pts: '6,36 50,44 94,36' }
      ],
      cap: 'Line chart · 3-exam trend by class',
      time: '1.2s'
    },
    {
      q: 'Pass rate by subject, Grade 3',
      sql: [
        [{ t: '-- intent: pass-rate compare ✓', cls: 'cm' }],
        [{ t: 'SELECT', cls: 'kw' }, { t: ' subject,' }],
        [{ t: '  AVG(', cls: '' }, { t: 'CASE', cls: 'kw' }, { t: ' WHEN score >= 60' }],
        [{ t: '  ', cls: '' }, { t: 'THEN', cls: 'kw' }, { t: ' 1 ', cls: '' }, { t: 'ELSE', cls: 'kw' }, { t: ' 0 ', cls: '' }, { t: 'END', cls: 'kw' }, { t: ') AS pass_rate' }],
        [{ t: 'FROM', cls: 'kw' }, { t: ' exam_results' }],
        [{ t: 'WHERE', cls: 'kw' }, { t: " grade = 'grade_3' " }, { t: 'GROUP BY', cls: 'kw' }, { t: ' subject' }]
      ],
      chart: 'h',
      data: [92, 85, 78, 71, 64],
      cap: 'Bar chart · pass rate by subject',
      time: '1.5s'
    }
  ];

  var NL_TEXT = {
    zh: {
      input: '用户输入', system: '系统处理', output: '输出结果',
      idle: '等待输入…', parse: '理解意图 → 生成 SQL', render: '渲染图表',
      done: '✓ 完成 · '
    },
    en: {
      input: 'User input', system: 'System', output: 'Output',
      idle: 'Waiting for input…', parse: 'Parsing intent → generating SQL',
      render: 'Rendering chart', done: '✓ Done · '
    }
  };

  function buildNl2sql(el) {
    var SAMPLES = EN ? NL_SAMPLES_EN : NL_SAMPLES;
    var T = EN ? NL_TEXT.en : NL_TEXT.zh;
    el.innerHTML =
      '<div class="nlf">' +
        '<div class="nlf-main">' +
          '<div class="nlf-pane">' +
            '<div class="nlf-label">' + T.input + '</div>' +
            '<div class="nlf-bubble"><span class="nlf-tt"></span><i class="nlf-caret"></i></div>' +
          '</div>' +
          '<div class="nlf-arrow"><span>→</span></div>' +
          '<div class="nlf-pane nlf-pane--wide">' +
            '<div class="nlf-label">' + T.system + '</div>' +
            '<pre class="nlf-code"></pre>' +
          '</div>' +
          '<div class="nlf-arrow"><span>→</span></div>' +
          '<div class="nlf-pane">' +
            '<div class="nlf-label">' + T.output + '</div>' +
            '<div class="nlf-chart nlf-chart--bars"></div>' +
            '<div class="nlf-cap"></div>' +
          '</div>' +
        '</div>' +
        '<div class="nlf-status"><i class="nlf-dot"></i><span class="nlf-st">' + T.idle + '</span></div>' +
      '</div>';

    var root = el.firstChild;
    var main = root.querySelector('.nlf-main');
    var tt = root.querySelector('.nlf-tt');
    var code = root.querySelector('.nlf-code');
    var chart = root.querySelector('.nlf-chart');
    var cap = root.querySelector('.nlf-cap');
    var arrows = root.querySelectorAll('.nlf-arrow');
    var st = root.querySelector('.nlf-st');
    var dot = root.querySelector('.nlf-dot');

    function sqlHtml(sql) {
      return sql.map(function (line) {
        return '<div>' + line.map(function (s) {
          return '<span class="' + (s.cls || '') + '">' + s.t + '</span>';
        }).join('') + '</div>';
      }).join('');
    }

    /* 渲染归零状态的图表（柱/折线/横条三种形态） */
    function renderChart(smp) {
      chart.className = 'nlf-chart nlf-chart--' + smp.chart;
      if (smp.chart === 'line') {
        chart.innerHTML = '<svg viewBox="0 0 100 60" preserveAspectRatio="none">' +
          smp.data.map(function (s) {
            return '<polyline points="' + s.pts + '" style="stroke:' + s.color + ';opacity:0"></polyline>';
          }).join('') + '</svg>';
      } else {
        chart.innerHTML = smp.data.map(function () { return '<i></i>'; }).join('');
      }
      cap.textContent = smp.cap;
    }

    /* 图表生长（逐元素 stagger） */
    async function growChart(smp, g) {
      if (smp.chart === 'line') {
        var lines = chart.querySelectorAll('polyline');
        for (var i = 0; i < lines.length; i++) {
          lines[i].style.opacity = '1';
          await wait(320); if (g !== gen) return false;
        }
      } else {
        var els = chart.querySelectorAll('i');
        for (var k = 0; k < els.length; k++) {
          if (smp.chart === 'h') els[k].style.width = smp.data[k] + '%';
          else els[k].style.height = smp.data[k] + '%';
          await wait(140); if (g !== gen) return false;
        }
      }
      return true;
    }

    function finalFrame() {
      var smp = SAMPLES[0];
      tt.textContent = smp.q;
      code.innerHTML = sqlHtml(smp.sql);
      renderChart(smp);
      if (smp.chart === 'line') {
        chart.querySelectorAll('polyline').forEach(function (p) {
          p.style.opacity = '1';
        });
      } else {
        chart.querySelectorAll('i').forEach(function (b, i) {
          b.style.height = smp.data[i] + '%';
        });
      }
      arrows.forEach(function (a) { a.classList.add('on'); });
      dot.className = 'nlf-dot done';
      st.textContent = T.done + smp.time;
    }

    if (REDUCED) { finalFrame(); return; }

    var gen = 0;

    async function type(elm, text, speed, g) {
      for (var i = 0; i < text.length; i++) {
        if (g !== gen) return false;
        elm.textContent += text[i];
        await wait(speed);
      }
      return true;
    }

    async function typeSqlLine(line, g) {
      var div = document.createElement('div');
      code.appendChild(div);
      for (var s = 0; s < line.length; s++) {
        var span = document.createElement('span');
        if (line[s].cls) span.className = line[s].cls;
        div.appendChild(span);
        if (!await type(span, line[s].t, 34, g)) return false;
      }
      return true;
    }

    (async function loop() {
      var g = ++gen;
      var si = 0;
      while (g === gen) {
        var smp = SAMPLES[si];
        si = (si + 1) % SAMPLES.length;

        // 淡出清空 → 切入下一个样例
        main.style.opacity = '0';
        await wait(260); if (g !== gen) return;
        tt.textContent = '';
        code.innerHTML = '';
        renderChart(smp);
        arrows.forEach(function (a) { a.classList.remove('on'); });
        dot.className = 'nlf-dot';
        st.textContent = T.idle;
        main.style.opacity = '1';
        await wait(700); if (g !== gen) return;

        if (!await type(tt, smp.q, 95, g)) return;
        await wait(400); if (g !== gen) return;

        arrows[0].classList.add('on');
        dot.className = 'nlf-dot working';
        st.textContent = T.parse;
        await wait(300); if (g !== gen) return;

        for (var li = 0; li < smp.sql.length; li++) {
          if (!await typeSqlLine(smp.sql[li], g)) return;
          await wait(160); if (g !== gen) return;
        }

        arrows[1].classList.add('on');
        st.textContent = T.render;
        await wait(350); if (g !== gen) return;

        if (!await growChart(smp, g)) return;

        dot.className = 'nlf-dot done';
        st.textContent = T.done + smp.time;
        await wait(2800); if (g !== gen) return;
      }
    })();
  }

  /* ---------- 排课引擎：经典俄罗斯方块 求解动画 ----------
     8×6 网格 = 12 块四格骨牌（I/O/T/S/Z/L/J 经典七色，布局经脚本验证）
     循环：逐块落下 → 3 块冲突闪红 → 逐块锁定消解 → 全满足闪烁 */

  var SV_PIECES = [
    { c: 'l', cells: [0, 8, 16, 17] },
    { c: 'j', cells: [1, 2, 3, 11] },
    { c: 'i', cells: [4, 12, 20, 28] },
    { c: 'o', cells: [5, 6, 13, 14] },
    { c: 'i', cells: [7, 15, 23, 31] },
    { c: 'z', cells: [9, 10, 18, 19] },
    { c: 'j', cells: [21, 22, 29, 37] },
    { c: 't', cells: [24, 32, 33, 40] },
    { c: 't', cells: [25, 26, 27, 34] },
    { c: 's', cells: [30, 38, 39, 47] },
    { c: 'l', cells: [35, 41, 42, 43] },
    { c: 'j', cells: [36, 44, 45, 46] }
  ];
  var SV_CONFLICTS = [3, 8, 11];   // O 黄（右上）/ T 紫（左中）/ J 蓝（底部）

  var SV_TEXT = {
    zh: {
      conf: '✗ 冲突', ok: '✓ 满足',
      placing: '课程块落位中…',
      found: function (n) { return '检测到 ' + n + ' 处冲突 · 求解中…'; },
      left: function (n) { return '求解中… 剩余 ' + n + ' 处冲突'; },
      done: '✓ 全部约束满足 · 3.2s'
    },
    en: {
      conf: '✗ conflict', ok: '✓ satisfied',
      placing: 'Placing course blocks…',
      found: function (n) { return n + ' conflicts detected · solving…'; },
      left: function (n) { return 'Solving… ' + n + ' to go'; },
      done: '✓ All constraints satisfied · 3.2s'
    }
  };

  function buildSchedule(el) {
    var T = EN ? SV_TEXT.en : SV_TEXT.zh;
    var owner = new Array(48);   // 格 → 骨牌序号
    SV_PIECES.forEach(function (p, pi) {
      p.cells.forEach(function (idx) { owner[idx] = pi; });
    });

    var html = '<div class="solv"><div class="solv-grid">';
    for (var i = 0; i < 48; i++) {
      html += '<i class="sv-cell sv-' + SV_PIECES[owner[i]].c + '"></i>';
    }
    html += '</div>' +
      '<div class="solv-foot">' +
        '<div class="solv-legend">' +
          '<span class="lg-conf">' + T.conf + '</span>' +
          '<span class="lg-ok">' + T.ok + '</span>' +
        '</div>' +
        '<div class="solv-st"></div>' +
      '</div></div>';
    el.innerHTML = html;

    var root = el.firstChild;
    var grid = root.querySelector('.solv-grid');
    var st = root.querySelector('.solv-st');
    var cells = grid.children;
    var confPieces = SV_CONFLICTS.map(function (pi) {
      return SV_PIECES[pi].cells.map(function (idx) { return cells[idx]; });
    });
    var N = confPieces.length;

    function setConf(list, on) {
      list.forEach(function (c) {
        c.classList.toggle('is-conf', on);
        c.textContent = on ? '✗' : '';
      });
    }

    function finalFrame() {
      for (var i = 0; i < cells.length; i++) cells[i].classList.add('on');
      grid.classList.add('is-done');
      st.textContent = T.done;
    }

    if (REDUCED) { finalFrame(); return; }

    var gen = 0;

    (async function loop() {
      var g = ++gen;
      while (g === gen) {
        // 复位：全部收起，逐块落下
        grid.classList.remove('is-done');
        confPieces.forEach(function (list) {
          setConf(list, false);
          list.forEach(function (c) { c.classList.remove('resolved'); });
        });
        for (var i = 0; i < cells.length; i++) cells[i].classList.remove('on');
        st.textContent = T.placing;
        await wait(500); if (g !== gen) return;

        for (var pi = 0; pi < SV_PIECES.length; pi++) {
          SV_PIECES[pi].cells.forEach(function (idx) { cells[idx].classList.add('on'); });
          await wait(95); if (g !== gen) return;
        }
        await wait(300); if (g !== gen) return;

        // 冲突浮现 → 逐块锁定消解
        confPieces.forEach(function (list) { setConf(list, true); });
        st.textContent = T.found(N);
        await wait(1200); if (g !== gen) return;

        for (var k = 0; k < N; k++) {
          setConf(confPieces[k], false);
          confPieces[k].forEach(function (c) { c.classList.add('resolved'); });
          var left = N - k - 1;
          st.textContent = left > 0 ? T.left(left) : T.done;
          await wait(640); if (g !== gen) return;
        }

        grid.classList.add('is-done');
        await wait(2600); if (g !== gen) return;
      }
    })();
  }

  /* ---------- 龙虾迷你终端（列表卡片装饰，不可交互） ---------- */

  function buildLobsterMini(el) {
    var lines = [
      '<span class="lm-d">[gen 0012]</span> hawk 118 <span class="lm-d">│</span> dove  82',
      '<span class="lm-d">[gen 0104]</span> hawk  96 <span class="lm-d">│</span> dove 104',
      '<span class="lm-g">[gen 0261]</span> resource shock <span class="lm-g">↓ 40%</span>',
      '<span class="lm-d">[gen 0388]</span> dove majority rising',
      '<span class="lm-g">[gen 0500]</span> steady-state lock ✓'
    ];
    var log = lines.concat(lines).map(function (l) {
      return '<div>' + l + '</div>';
    }).join('');
    el.innerHTML =
      '<div class="lmini">' +
        '<div class="lmini-bar"><i></i><i></i><i></i><em>lobster-sim — zsh</em></div>' +
        '<div class="lmini-body">' +
          '<div class="lmini-log">' + log + '</div>' +
          '<div class="lmini-lob">' + window.PixelLobster(4, '#E03131') + '</div>' +
          '<div class="lmini-prompt">$ <i></i></div>' +
        '</div>' +
      '</div>';
  }

  /* ---------- RAG 智能问答卡片动画 ----------
     视觉语言取自 RAG 项目自身前端（course-kb-rag/web/index.html）：
     白底点阵 · 克莱因蓝 #002FA7 · 柠檬黄 #FFDD00 · 安全橙 #FF4D00（仅拒答）
     无圆角 / 无阴影 / 无渐变；3px 硬边框。
     分镜：问题打字 → 双信号（向量 / BM25）爬升 → 命中出答案+出处
            → 下一轮切换为拒答态（两路信号都低于阈值）→ 回来
     每轮约 8s，循环播放；尊重 prefers-reduced-motion。 */

  var RAG_HIT = {
    q: ['什么是大模型的', '幻觉？'],
    vec: 0.19,
    bm25: 12.4,
    ans: [
      '模型会生成读起来流畅、但事实上错误或没有依据的内容，',
      '并且它自己无法分辨——这叫', { hl: '幻觉（hallucination）' }, '。'
    ],
    cites: ['第 7 课 · 幻觉 · P23', '第 7 课 · 可靠性 · P25'],
    state: '双信号与门通过 · 已调用 LLM'
  };

  var RAG_MISS = {
    q: ['这门课对高中生', '有用吗？'],
    vec: 0.041,
    bm25: 2.8,
    cites: [],
    state: '双信号均低于阈值'
  };

  var RAG_TEXT = {
    zh: {
      no: '03 / 知识库问答',
      live: 'LIVE',
      sigVec: '向量 · bge-small-zh',
      sigBm25: 'BM25',
      abstainTitle: '超出讲义范围',
      abstainSub: '双信号拒答判定低于阈值，未调用 LLM —— 本结论仅由检索信号强度决定。',
      searching: '检索中…'
    },
    en: {
      no: '03 / knowledge base QA',
      live: 'LIVE',
      sigVec: 'vector · bge-small-zh',
      sigBm25: 'BM25',
      abstainTitle: 'OUTSIDE THE COURSE MATERIAL',
      abstainSub: 'Both retrieval signals fell below threshold, so the LLM was never called — the verdict comes from signal strength alone.',
      searching: 'Retrieving…'
    }
  };

  function buildRag(el) {
    var T = EN ? RAG_TEXT.en : RAG_TEXT.zh;

    function ansHtml(parts) {
      return parts.map(function (p) {
        return typeof p === 'string' ? p : '<span class="hl">' + p.hl + '</span>';
      }).join('');
    }

    el.innerHTML =
      '<div class="rag">' +
        '<div class="rag-head">' +
          '<span class="rag-no"><span class="rag-dot">●</span> ' + T.no + '</span>' +
          '<span class="rag-live">' + T.live + '</span>' +
        '</div>' +
        '<div class="rag-q"><span class="rag-qt"></span><i class="rag-caret"></i></div>' +
        '<div class="rag-signals">' +
          '<div class="rag-sig">' +
            '<span class="rag-sig-label">' + T.sigVec + '</span>' +
            '<span class="rag-bar"><i></i></span>' +
            '<span class="rag-sig-val">—</span>' +
          '</div>' +
          '<div class="rag-sig">' +
            '<span class="rag-sig-label">' + T.sigBm25 + '</span>' +
            '<span class="rag-bar"><i></i></span>' +
            '<span class="rag-sig-val">—</span>' +
          '</div>' +
        '</div>' +
        '<div class="rag-state">' + T.searching + '</div>' +
        '<div class="rag-ans">' +
          '<div class="rag-ans-text"></div>' +
          '<div class="rag-cites"><span class="cites-label">03 / ' + (EN ? 'sources' : '出处') + '</span></div>' +
        '</div>' +
        '<div class="rag-abstain">' +
          '<div class="rag-abstain-title">' + T.abstainTitle + '</div>' +
          '<div class="rag-abstain-sub">' + T.abstainSub + '</div>' +
        '</div>' +
      '</div>';

    var root = el.firstChild;
    var qt = root.querySelector('.rag-qt');
    var caret = root.querySelector('.rag-caret');
    var bars = root.querySelectorAll('.rag-bar i');
    var vals = root.querySelectorAll('.rag-sig-val');
    var state = root.querySelector('.rag-state');
    var ansBox = root.querySelector('.rag-ans');
    var ansText = root.querySelector('.rag-ans-text');
    var citesBox = root.querySelector('.rag-cites');

    function paint(smp, stText) {
      qt.textContent = smp.q.join('');
      vals[0].textContent = smp.vec.toFixed(3);
      vals[1].textContent = smp.bm25.toFixed(1);
      bars[0].style.width = '0';
      bars[1].style.width = '0';
      ansBox.classList.remove('on');
      /* 仅拒答态使用安全橙橙幅 */
      root.classList.toggle('is-abstain', !smp.ans);
      state.textContent = stText || T.searching;
      /* 出处标签（命中态两条） */
      Array.prototype.forEach.call(citesBox.querySelectorAll('.rag-cite'), function (c) {
        c.remove();
      });
      if (smp.cites && smp.cites.length) {
        smp.cites.forEach(function (c) {
          var s = document.createElement('span');
          s.className = 'rag-cite';
          s.textContent = c;
          citesBox.appendChild(s);
        });
      }
      ansText.innerHTML = smp.ans ? ansHtml(smp.ans) : '';
    }

    function finalFrame() {
      paint(RAG_HIT, RAG_HIT.state);
      bars[0].style.width = '62%';
      bars[1].style.width = '78%';
      ansBox.classList.add('on');
    }

    /* 静止态：命中答案（reduced-motion 兜底） */
    if (REDUCED) { finalFrame(); return; }

    var gen = 0;

    async function type(elm, text, speed, g) {
      for (var i = 0; i < text.length; i++) {
        if (g !== gen) return false;
        elm.textContent += text[i];
        await wait(speed);
      }
      return true;
    }

    function grow(smp, on) {
      bars[0].style.width = on ? '62%' : '13%';
      bars[1].style.width = on ? '78%' : '19%';
      vals[0].textContent = (on ? smp.vec : 0.041).toFixed(3);
      vals[1].textContent = (on ? smp.bm25 : 2.8).toFixed(1);
    }

    (async function loop() {
      var g = ++gen;
      var turn = 0;                       // 每两轮插入一次拒答态
      while (g === gen) {
        var isMiss = (turn % 2 === 1);
        var smp = isMiss ? RAG_MISS : RAG_HIT;
        turn++;

        paint(smp, T.searching);
        await wait(420); if (g !== gen) return;

        /* ① 问题打字进入（逐段） */
        for (var seg = 0; seg < smp.q.length; seg++) {
          if (!await type(qt, smp.q[seg], 62, g)) return;
          await wait(120); if (g !== gen) return;
        }
        caret.style.visibility = 'hidden';
        await wait(360); if (g !== gen) return;

        /* ② 双信号爬升 */
        grow(smp, !isMiss);
        await wait(900); if (g !== gen) return;

        /* ③ 判定：命中出答案+出处；低于阈值则橙色拒答横幅 */
        state.textContent = smp.state;
        if (isMiss) {
          root.classList.add('is-abstain');
          ansBox.classList.remove('on');
        } else {
          ansBox.classList.add('on');
        }

        /* ④ 停留，进入下一轮 */
        await wait(isMiss ? 3000 : 3400); if (g !== gen) return;
        caret.style.visibility = '';
      }
    })();
  }

  /* ---------- 中轴线书签：横向滚动（项目卡片自动轮播） ----------
     竖版书签完整展示，不裁切；序列渲染两份实现无缝循环。 */

  var BOOKMARKS = [
    ['bookmark-zhonggulou.webp', '钟鼓楼', 'Zhonggulou (Bell and Drum Towers)'],
    ['bookmark-tiantan.webp', '天坛', 'Temple of Heaven'],
    ['bookmark-gugong.webp', '故宫', 'The Forbidden City'],
    ['bookmark-jingshan.webp', '景山', 'Jingshan'],
    ['bookmark-yongdingmen.webp', '永定门', 'Yongdingmen']
  ];

  /* 页面层级：根目录页用 "images/"，projects/ 下用 "../images/"
     以本脚本的 src 推断，避免每页硬编码。 */
  var IMG_BASE = (function () {
    var s = document.querySelector('script[src*="main.js"]');
    var src = s ? s.getAttribute('src') : 'js/main.js';
    return src.replace(/js\/main\.js.*$/, '') + 'images/';
  })();

  /* 一份书签序列（5 张）。detail 页画廊用 lazy；轮播里必须全部立即解码，
     否则轨道宽度会随加载跳动，位移距离算错、循环出现接缝。 */
  function bookmarkImgs(lazy) {
    return BOOKMARKS.map(function (b) {
      var alt = EN ? 'Beijing Central Axis bookmark: ' + b[2]
                   : '中轴线书签：' + b[1];
      return '<img src="' + IMG_BASE + b[0] + '" alt="' + alt + '"' +
        (lazy ? ' loading="lazy"' : ' loading="eager"') +
        ' decoding="async" draggable="false">';
    }).join('');
  }

  function buildBookmarkMarquee(el) {
    /* 两份完全相同的 .bm-seq 并排。
       关键：间距全部由 seq 内部承担（gap + padding-right），
       轨道本身不 gap、不 padding —— 这样 translateX(-50%) 走过的距离
       恰好等于一个 seq 的宽度，也就是内容周期，无缝。
       若把 gap/padding 放在轨道上，轨道宽 = 2*内容 + 奇数个 gap，
       -50% 与真实周期差半个 gap，每轮循环会跳一下。 */
    el.innerHTML = '<div class="bm-marquee"><div class="bm-track">' +
      '<div class="bm-seq">' + bookmarkImgs(false) + '</div>' +
      '<div class="bm-seq" aria-hidden="true">' + bookmarkImgs(false) + '</div>' +
      '</div></div>';

    var box = el.querySelector('.bm-marquee');
    var track = el.querySelector('.bm-track');
    if (!box || !track || REDUCED) return;

    /* 位移距离 = 单个 seq 的宽度。用 offsetWidth 而非 scrollWidth，
       后者在 transform 生效时会把位移算进去，产生反馈抖动。 */
    function setDuration() {
      var seq = track.querySelector('.bm-seq');
      var w = seq ? seq.offsetWidth : 0;
      if (w > 0) {
        track.style.setProperty('--bm-dur', (w / 55).toFixed(2) + 's');
        box.classList.add('is-animating');
      }
    }

    /* 等全部图片解码完成再开跑：否则轨道宽度会随图片逐张加载而变化，
       位移距离与真实周期对不上，循环末尾出现接缝。 */
    var imgs = track.querySelectorAll('img');
    var pending = imgs.length, started = false;
    function ready() {
      if (started) return;
      started = true;
      setDuration();
      window.addEventListener('resize', setDuration);
    }
    if (!pending) { ready(); return; }
    Array.prototype.forEach.call(imgs, function (im) {
      if (im.complete && im.naturalWidth) { if (--pending === 0) ready(); return; }
      var done = function () { if (--pending === 0) ready(); };
      im.addEventListener('load', done);
      im.addEventListener('error', done);
    });
  }

  /* 详情页 hero：书签轮播。
     原为「拖动 + scroll-snap」横滚画廊，实测两个问题：
       1) pointerleave 会在指针仍按住移出时触发 release，把 snap 重新打开，
          与仍在进行的 pointermove 抢scrollLeft，手感是"停不下来"；
       2) snap-align:center 与"看完整系列"的意图冲突，每张停一下反而像卡顿。
     故改为与首页卡片同一套无缝自动轮播：两份 .bm-seq + translateX(-50%)，
     匀速、无停顿、无交互态，自然不存在"停不下来"。 */
  function buildBookmarkGallery(el) {
    el.innerHTML = '<span class="bm-gallery-hint">' +
      (EN ? '5 bookmarks · auto-scrolling' : '中轴线书签 5 张 · 自动轮播') + '</span>' +
      '<div class="bm-marquee bm-marquee--gallery"><div class="bm-track">' +
        '<div class="bm-seq">' + bookmarkImgs(false) + '</div>' +
        '<div class="bm-seq" aria-hidden="true">' + bookmarkImgs(false) + '</div>' +
      '</div></div>';

    var box = el.querySelector('.bm-marquee');
    var track = el.querySelector('.bm-track');
    if (!box || !track) return;

    /* 位移距离 = 单个 seq 宽度；用 offsetWidth 而非 scrollWidth，
       后者在 transform 生效时会把位移算进去，产生反馈抖动。 */
    function setDuration() {
      var seq = track.querySelector('.bm-seq');
      var w = seq ? seq.offsetWidth : 0;
      if (w > 0) {
        track.style.setProperty('--bm-dur', (w / 55).toFixed(2) + 's');
        box.classList.add('is-animating');
      }
    }

    /* 等图片解码完成再开跑，否则轨道宽度随加载变化，循环末尾出现接缝 */
    var imgs = track.querySelectorAll('img');
    var pending = imgs.length, started = false;
    function ready() {
      if (started) return;
      started = true;
      setDuration();
      window.addEventListener('resize', setDuration);
    }
    if (REDUCED || !pending) { setDuration(); return; }
    Array.prototype.forEach.call(imgs, function (im) {
      if (im.complete && im.naturalWidth) { if (--pending === 0) ready(); return; }
      var done = function () { if (--pending === 0) ready(); };
      im.addEventListener('load', done);
      im.addEventListener('error', done);
    });
  }

  /* ---------- viz 装配 ---------- */

  var builders = {
    nl2sql: buildNl2sql,
    schedule: buildSchedule,
    'lobster-mini': buildLobsterMini,
    rag: buildRag,
    'bookmark-marquee': buildBookmarkMarquee,
    'bookmark-gallery': buildBookmarkGallery
  };

  document.querySelectorAll('[data-viz]').forEach(function (el) {
    var fn = builders[el.getAttribute('data-viz')];
    if (fn) fn(el);
  });

  /* ---------- 页面动效（克制型） ---------- */

  // hero 文字依次浮现
  document.querySelectorAll('.hero, .detail-head').forEach(function (parent) {
    Array.prototype.forEach.call(parent.children, function (child, i) {
      child.classList.add('fade-up');
      child.style.animationDelay = (i * 0.09) + 's';
    });
  });

  // 滚动渐入
  var revealTargets = document.querySelectorAll(
    '.feature-card, .detail-cols, .detail-links, .showcase, .course-demo,' +
    ' .about-quote p, .tag-cloud, .now-line, .detail-hero, .demo, .contact-line'
  );
  revealTargets.forEach(function (el, i) {
    el.classList.add('reveal');
    el.style.transitionDelay = ((i % 3) * 0.08) + 's';
  });

  if (REDUCED || !('IntersectionObserver' in window)) {
    revealTargets.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach(function (el) { io.observe(el); });
  }
})();
