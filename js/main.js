/* 刘雨琦 / Shian — 作品集交互
   1. 概念可视化组件：NL2SQL 对话流动画 / 排课求解动画 / 龙虾迷你终端
      （全出血渲染，相对单位自适应容器；尊重 prefers-reduced-motion）
   2. 页面加载 stagger 浮现 + 滚动渐入（IntersectionObserver）
   无外部依赖。 */

(function () {
  'use strict';

  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  function buildNl2sql(el) {
    el.innerHTML =
      '<div class="nlf">' +
        '<div class="nlf-main">' +
          '<div class="nlf-pane">' +
            '<div class="nlf-label">用户输入</div>' +
            '<div class="nlf-bubble"><span class="nlf-tt"></span><i class="nlf-caret"></i></div>' +
          '</div>' +
          '<div class="nlf-arrow"><span>→</span></div>' +
          '<div class="nlf-pane nlf-pane--wide">' +
            '<div class="nlf-label">系统处理</div>' +
            '<pre class="nlf-code"></pre>' +
          '</div>' +
          '<div class="nlf-arrow"><span>→</span></div>' +
          '<div class="nlf-pane">' +
            '<div class="nlf-label">输出结果</div>' +
            '<div class="nlf-chart nlf-chart--bars"></div>' +
            '<div class="nlf-cap"></div>' +
          '</div>' +
        '</div>' +
        '<div class="nlf-status"><i class="nlf-dot"></i><span class="nlf-st">等待输入…</span></div>' +
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
      var smp = NL_SAMPLES[0];
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
      st.textContent = '✓ 完成 · ' + smp.time;
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
        var smp = NL_SAMPLES[si];
        si = (si + 1) % NL_SAMPLES.length;

        // 淡出清空 → 切入下一个样例
        main.style.opacity = '0';
        await wait(260); if (g !== gen) return;
        tt.textContent = '';
        code.innerHTML = '';
        renderChart(smp);
        arrows.forEach(function (a) { a.classList.remove('on'); });
        dot.className = 'nlf-dot';
        st.textContent = '等待输入…';
        main.style.opacity = '1';
        await wait(700); if (g !== gen) return;

        if (!await type(tt, smp.q, 95, g)) return;
        await wait(400); if (g !== gen) return;

        arrows[0].classList.add('on');
        dot.className = 'nlf-dot working';
        st.textContent = '理解意图 → 生成 SQL';
        await wait(300); if (g !== gen) return;

        for (var li = 0; li < smp.sql.length; li++) {
          if (!await typeSqlLine(smp.sql[li], g)) return;
          await wait(160); if (g !== gen) return;
        }

        arrows[1].classList.add('on');
        st.textContent = '渲染图表';
        await wait(350); if (g !== gen) return;

        if (!await growChart(smp, g)) return;

        dot.className = 'nlf-dot done';
        st.textContent = '✓ 完成 · ' + smp.time;
        await wait(2800); if (g !== gen) return;
      }
    })();
  }

  /* ---------- 排课引擎：深色数据艺术 求解动画 ---------- */

  var SV_CONFLICTS = [3, 10, 19, 26, 33, 41, 46];
  var SV_PALETTE = ['req', 'elec', 'act'];

  function buildSchedule(el) {
    var html = '<div class="solv"><div class="solv-grid">';
    for (var i = 0; i < 48; i++) {
      var cls = SV_PALETTE[(i * 5 + Math.floor(i / 8)) % 3];
      var conf = SV_CONFLICTS.indexOf(i) >= 0;
      html += '<i class="sv-cell sv-' + cls + (conf ? ' is-conf' : '') +
        '" data-conf="' + (conf ? '1' : '') + '">' + (conf ? '✗' : '') + '</i>';
    }
    html += '</div>' +
      '<div class="solv-foot">' +
        '<div class="solv-legend">' +
          '<span><i class="dot sv-req"></i>必修</span>' +
          '<span><i class="dot sv-elec"></i>选修</span>' +
          '<span><i class="dot sv-act"></i>活动</span>' +
          '<span class="lg-conf">✗ 冲突</span>' +
          '<span class="lg-ok">✓ 满足</span>' +
        '</div>' +
        '<div class="solv-st">求解中…</div>' +
      '</div></div>';
    el.innerHTML = html;

    var root = el.firstChild;
    var grid = root.querySelector('.solv-grid');
    var st = root.querySelector('.solv-st');
    var cells = SV_CONFLICTS.map(function (idx) {
      return grid.children[idx];
    });
    var N = SV_CONFLICTS.length;

    function finalFrame() {
      cells.forEach(function (c) {
        c.classList.remove('is-conf');
        c.classList.add('resolved');
        c.textContent = '';
      });
      grid.classList.add('is-done');
      st.textContent = '✓ 全部约束满足 · 3.2s';
    }

    if (REDUCED) { finalFrame(); return; }

    var gen = 0;

    (async function loop() {
      var g = ++gen;
      while (g === gen) {
        grid.classList.remove('is-done');
        cells.forEach(function (c) {
          c.classList.remove('resolved');
          c.classList.add('is-conf');
          c.textContent = '✗';
        });
        st.textContent = '检测到 ' + N + ' 处冲突 · 求解中…';
        await wait(1100); if (g !== gen) return;

        for (var k = 0; k < N; k++) {
          cells[k].classList.remove('is-conf');
          cells[k].classList.add('resolved');
          cells[k].textContent = '';
          var left = N - k - 1;
          st.textContent = left > 0
            ? '求解中… 剩余 ' + left + ' 处冲突'
            : '✓ 全部约束满足 · 3.2s';
          await wait(560); if (g !== gen) return;
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
