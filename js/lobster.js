/* 龙虾模拟器：终端叙事 Demo（projects/lobster.html）
   按 lobster-demo-design.md 实现：
   启动画面打字机 → 4 个行动按钮 → 命令行响应 → 慢速叙事 → 下一回合
   打字中点击终端立即补全当前段。尊重 prefers-reduced-motion。 */

(function () {
  'use strict';

  var root = document.getElementById('lobster-demo');
  if (!root) return;

  var out = document.getElementById('ld-out');
  var term = document.getElementById('ld-term');
  var actions = document.getElementById('ld-actions');
  var btns = actions.querySelectorAll('button');

  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 内容（叙事池 8 段轮询，命令行事件随机） ---------- */

  var NAMES = ['铁螯', '红眼', '裂甲', '软壳', '小草', '青苔'];

  var EVENTS = [
    '> 红眼抢夺了铁螯，造成10伤害',
    '> 铁螯抢夺了红眼，造成10伤害',
    '> 裂甲抢夺了铁螯，造成10伤害',
    '> 软壳分享了资源给小草(公共池)',
    '> 小草分享了资源给软壳(公共池)'
  ];

  var NARRATIVES = [
    // 段1（合作）
    ['【叙事】',
     '小草把找到的食物分了一半给软壳。',
     '这不是慷慨，是计算——在水箱的算术里，两个活着的盟友比一个饱死的独狼更有价值。',
     '但计算本身，也是一种温柔。'],
    // 段2（掠夺）
    ['【叙事】',
     '铁螯的钳子比昨天更红了。',
     '它不记得自己抢了多少次，只记得每次抢夺后，其他龙虾看它的眼神里多了一些东西。',
     '不是恐惧，是某种更复杂的东西——像是识别，像是确认。'],
    // 段3（中立/观察）
    ['【叙事】',
     '裂甲和红眼靠得很近，它们不需要语言就能理解彼此的意图。',
     '当铁螯发起掠夺时，它们只是旁观，等待自己的时机。',
     '软壳缩在角落，它的资源少了，但还活着。',
     '在这个水箱里，活着本身就是某种胜利。'],
    // 段4（系统反思）
    ['【叙事】',
     '水箱没有尽头，但资源有。',
     '每只龙虾都以为自己在做选择，其实它们只是在执行一个更古老的程序——',
     '那个程序写在它们的壳上，写在水的流动里，写在这个循环的每个周期开头。'],
    // 段5（新生）
    ['【叙事】',
     '水箱里多了一只小龙虾，还没有名字。',
     '它不懂规则，径直游向食物最密集的地方——那里通常是铁螯的领地。',
     '出乎意料，铁螯没有动。也许是因为它太小了，小到不构成威胁；',
     '也许是因为每个周期都在提醒所有龙虾：新的生命，本身就是资源之外的东西。'],
    // 段6（死亡）
    ['【叙事】',
     '水草不再摆动的那一格，是青苔最后待过的地方。',
     '没有仪式，没有告别。资源重新流入公共池，像它从未存在过。',
     '但软壳游过那个角落时，速度慢了半拍。',
     '水箱记得的事情，比龙虾们以为的要多。'],
    // 段7（资源冲击）
    ['【叙事】',
     '这个周期，水面下降了四成。所有的算计突然失效：分享变得奢侈，掠夺变得徒劳。',
     '鹰派和鸽派的界限在饥饿面前模糊起来——',
     '最后活下来的，不是最强壮的，也不是最慷慨的，而是最早停止内耗的那几只。'],
    // 段8（稳态）
    ['【叙事】',
     '第五百个周期，水箱达成了某种平衡。',
     '没有谁赢了。鸽派占多数，鹰派从未消失，像火焰边缘的阴影。',
     '观察者合上记录本，写下结论：',
     '所谓稳态，不是冲突的终结，而是冲突找到了自己的节奏。']
  ];

  /* ---------- 状态 ---------- */

  var skip = false;    // 点击终端 → 补全当前段
  var busy = false;    // 动画播放中禁用按钮
  var cycle = 1;
  var narrIdx = 0;

  var cursor = document.createElement('span');
  cursor.className = 'ld-cursor';

  term.addEventListener('click', function () { skip = true; });

  function scroll() { out.scrollTop = out.scrollHeight; }

  function wait(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function setBtns(enabled) {
    btns.forEach(function (b) { b.disabled = !enabled; });
  }

  function printLine(text, cls) {
    var div = document.createElement('div');
    if (cls) div.className = cls;
    div.textContent = text;
    out.appendChild(div);
    div.appendChild(cursor);
    scroll();
  }

  async function typeLine(text, cls, speed) {
    var div = document.createElement('div');
    if (cls) div.className = cls;
    out.appendChild(div);
    div.appendChild(cursor);
    scroll();
    if (REDUCED || skip) {
      div.textContent = text;
      div.appendChild(cursor);
      scroll();
      return;
    }
    for (var i = 0; i < text.length; i++) {
      if (skip) {
        div.textContent = text;
        div.appendChild(cursor);
        scroll();
        return;
      }
      div.insertBefore(document.createTextNode(text[i]), cursor);
      scroll();
      var d = speed;
      if ('，。——；：、！？…'.indexOf(text[i]) >= 0) d = speed * 3.2;
      await wait(d);
    }
  }

  // 逐段输出：段内被跳过时，剩余行立即补全
  async function typeSeg(lines, cls, speed) {
    skip = false;
    for (var i = 0; i < lines.length; i++) {
      var lineCls = lines[i] === '【叙事】' ? 'ld-green' : cls;
      if (skip) {
        for (var j = i; j < lines.length; j++) {
          printLine(lines[j], lines[j] === '【叙事】' ? 'ld-green' : cls);
        }
        break;
      }
      await typeLine(lines[i], lineCls, speed);
    }
    skip = false;
  }

  /* ---------- 交互流程 ---------- */

  async function boot() {
    busy = true;
    setBtns(false);

    // 背景引入（打字机，点击终端或按 Enter 可跳过）
    await typeSeg([
      '【水箱观察记录 · 第 1 天】',
      '',
      '你是一只玻璃水箱的观察者。',
      '箱里住着六只龙虾：铁螯、红眼、裂甲、软壳、小草、青苔。',
      '资源有限，它们争夺，也分享。每个周期，它们自己做选择——',
      '但你握着它们没有的东西：补充资源的权力，和决定谁离开水箱的权力。',
      '你不扮演任何一只龙虾。你站在水箱外面。',
      '你的每个决定，都会成为这个小社会的历史。',
      ''
    ], 'ld-narr', 48);

    await typeSeg([
      '> Lobster Simulator v0.1',
      '> 初始化种群... 完成',
      '> 当前周期: 1',
      '> 剩余行动点: 2',
      '> 输入 [1-4] 选择行动',
      ''
    ], '', 30);

    await typeSeg([
      '[1] 处决 —— 将一只龙虾移出水箱',
      '[2] 投喂 —— 公共池资源 +15',
      '[3] 隔离 —— 一只龙虾本回合无法行动',
      '[4] 跳过 —— 旁观这个周期',
      ''
    ], 'ld-dim', 18);

    busy = false;
    setBtns(true);
  }

  async function doAction(n) {
    if (busy) return;
    busy = true;
    setBtns(false);

    var lines = ['> 选择行动: ' + n];
    if (n === 1) lines.push('> 处决了 ' + pick(NAMES) + '。种群规模 -1');
    if (n === 2) lines.push('> 投喂完成。公共池资源 +15');
    if (n === 3) lines.push('> 隔离了 ' + pick(NAMES) + '。它在自己的角落里转圈');
    if (n === 4) lines.push('> 跳过本回合。水箱继续运转');
    await typeSeg(lines, '', 26);

    // 随机 1-2 条群体事件
    var ev = [pick(EVENTS)];
    if (Math.random() < 0.6) {
      var e2 = pick(EVENTS);
      if (e2 !== ev[0]) ev.push(e2);
    }
    await typeSeg(ev, 'ld-ev', 26);

    await typeSeg(['> 正在生成叙事...', ''], 'ld-dim', 26);
    if (!REDUCED) await wait(600);

    var narr = NARRATIVES[narrIdx % NARRATIVES.length];
    narrIdx++;
    await typeSeg(narr, 'ld-narr', 80);

    await typeSeg(['', '— 周期 ' + (cycle++) + ' 结束 · 按 Enter 或点击按钮继续 —'], 'ld-dim', 26);

    busy = false;
    setBtns(true);
  }

  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      doAction(parseInt(btn.getAttribute('data-act'), 10));
    });
  });

  // 键盘：数字键 1-4 等价于按钮；Enter 播放中跳过当前段，空闲时提示行动按钮
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key >= '1' && e.key <= '4') {
      var btn = actions.querySelector('button[data-act="' + e.key + '"]');
      if (btn && !busy) btn.click();
      return;
    }
    if (e.key !== 'Enter') return;
    if (busy) {
      skip = true;
      return;
    }
    e.preventDefault();
    actions.classList.remove('pulse');
    void actions.offsetWidth;
    actions.classList.add('pulse');
  });

  // 装饰：像素龙虾（缓慢游动，CSS 动画驱动）
  var lob = document.getElementById('ld-lob');
  if (lob && window.PixelLobster) {
    lob.innerHTML = window.PixelLobster(8, '#E03131');
  }

  boot();
})();
