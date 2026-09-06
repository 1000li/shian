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

  /* ---------- viz 装配 ---------- */

  var builders = {
    nl2sql: buildNl2sql,
    schedule: buildSchedule,
    'lobster-mini': buildLobsterMini
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
