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

  /* ---------- 内容（叙事池 8 段轮询，命令行事件随机；英文站走 EN 表） ---------- */

  var EN = document.documentElement.lang === 'en';

  var NAMES = EN
    ? ['Ironclaw', 'Redeye', 'Crackshell', 'Softshell', 'Sprout', 'Moss']
    : ['铁螯', '红眼', '裂甲', '软壳', '小草', '青苔'];

  var NARR_TAG = EN ? '[NARRATIVE]' : '【叙事】';

  var EVENTS = EN ? [
    '> Redeye grabbed Ironclaw, dealing 10 damage',
    '> Ironclaw grabbed Redeye, dealing 10 damage',
    '> Crackshell grabbed Ironclaw, dealing 10 damage',
    '> Softshell shared resources with Sprout (common pool)',
    '> Sprout shared resources with Softshell (common pool)'
  ] : [
    '> 红眼抢夺了铁螯，造成10伤害',
    '> 铁螯抢夺了红眼，造成10伤害',
    '> 裂甲抢夺了铁螯，造成10伤害',
    '> 软壳分享了资源给小草(公共池)',
    '> 小草分享了资源给软壳(公共池)'
  ];

  var NARRATIVES = EN ? [
    [NARR_TAG,
     'Sprout gave half of the food it found to Softshell.',
     'Not generosity — arithmetic. In the tank\u2019s math, two living allies beat one well-fed loner.',
     'But calculation, too, can be a kind of tenderness.'],
    [NARR_TAG,
     'Ironclaw\u2019s claws are redder than yesterday.',
     'It doesn\u2019t remember how many times it has grabbed — only that afterwards, the others look at it with something new in their eyes.',
     'Not fear. Something more complex — like recognition, like confirmation.'],
    [NARR_TAG,
     'Crackshell and Redeye stay close; they read each other without words.',
     'When Ironclaw strikes, they only watch, waiting for their own moment.',
     'Softshell huddles in the corner, poorer but alive.',
     'In this tank, staying alive is itself a kind of victory.'],
    [NARR_TAG,
     'The tank has no end, but its resources do.',
     'Every lobster believes it is choosing; in truth it is running an older program —',
     'one written into their shells, into the current of the water, into the first beat of every cycle.'],
    [NARR_TAG,
     'A new larval lobster drifts in the tank, nameless.',
     'It knows no rules and swims straight for the densest food — usually Ironclaw\u2019s territory.',
     'Unexpectedly, Ironclaw does not move. Maybe it is too small to be a threat;',
     'or maybe every cycle reminds them all: new life is something beyond resources.'],
    [NARR_TAG,
     'The one patch where the weed no longer sways is where Moss last stayed.',
     'No ritual, no farewell. Its resources flow back into the common pool, as if it never existed.',
     'But Softshell swims past that corner half a beat slower.',
     'The tank remembers more than the lobsters think.'],
    [NARR_TAG,
     'This cycle, the water level fell by forty percent. All calculus failed at once: sharing became luxury, grabbing became pointless.',
     'The line between hawks and doves blurred in the face of hunger —',
     'the survivors were not the strongest, nor the most generous, but the first to stop wasting themselves on each other.'],
    [NARR_TAG,
     'At cycle five hundred, the tank reached a kind of balance.',
     'Nobody won. The doves hold the majority; the hawks never vanished — shadows at the edge of the flame.',
     'The observer closes the notebook and writes the conclusion:',
     'a steady state is not the end of conflict, but conflict finding its own rhythm.']
  ] : [
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

  var TEXT = EN ? {
    boot1: [
      '[Tank Observation Log · Day 1]',
      '',
      'You are the observer of a glass tank.',
      'Six lobsters live inside: Ironclaw, Redeye, Crackshell, Softshell, Sprout, Moss.',
      'Resources are limited. They grab, and they share. Each cycle they choose for themselves —',
      'but you hold what they lack: the power to add resources, and the power to decide who leaves the tank.',
      'You play no single lobster. You stand outside the glass.',
      'Every decision you make becomes the history of this tiny society.',
      ''
    ],
    boot2: [
      '> Lobster Simulator v0.1',
      '> Initializing population... done',
      '> Current cycle: 1',
      '> Action points left: 2',
      '> Press [1-4] to choose an action',
      ''
    ],
    menu: [
      '[1] Cull — remove one lobster from the tank',
      '[2] Feed — common pool +15 resources',
      '[3] Isolate — one lobster cannot act this cycle',
      '[4] Skip — just watch this cycle',
      ''
    ],
    chosen: '> Chosen action: ',
    act1: function (n) { return '> Culled ' + n + '. Population -1'; },
    act2: '> Feeding done. Common pool +15 resources',
    act3: function (n) { return '> Isolated ' + n + '. It circles its own corner'; },
    act4: '> Cycle skipped. The tank runs on',
    generating: '> Generating narrative...',
    cycleEnd: function (c) { return '— Cycle ' + c + ' complete · press Enter or click a button —'; }
  } : {
    boot1: [
      '【水箱观察记录 · 第 1 天】',
      '',
      '你是一只玻璃水箱的观察者。',
      '箱里住着六只龙虾：铁螯、红眼、裂甲、软壳、小草、青苔。',
      '资源有限，它们争夺，也分享。每个周期，它们自己做选择——',
      '但你握着它们没有的东西：补充资源的权力，和决定谁离开水箱的权力。',
      '你不扮演任何一只龙虾。你站在水箱外面。',
      '你的每个决定，都会成为这个小社会的历史。',
      ''
    ],
    boot2: [
      '> Lobster Simulator v0.1',
      '> 初始化种群... 完成',
      '> 当前周期: 1',
      '> 剩余行动点: 2',
      '> 输入 [1-4] 选择行动',
      ''
    ],
    menu: [
      '[1] 处决 —— 将一只龙虾移出水箱',
      '[2] 投喂 —— 公共池资源 +15',
      '[3] 隔离 —— 一只龙虾本回合无法行动',
      '[4] 跳过 —— 旁观这个周期',
      ''
    ],
    chosen: '> 选择行动: ',
    act1: function (n) { return '> 处决了 ' + n + '。种群规模 -1'; },
    act2: '> 投喂完成。公共池资源 +15',
    act3: function (n) { return '> 隔离了 ' + n + '。它在自己的角落里转圈'; },
    act4: '> 跳过本回合。水箱继续运转',
    generating: '> 正在生成叙事...',
    cycleEnd: function (c) { return '— 周期 ' + c + ' 结束 · 按 Enter 或点击按钮继续 —'; }
  };

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
      if ('，。——；：、！？…,.;:!?—'.indexOf(text[i]) >= 0) d = speed * 3.2;
      await wait(d);
    }
  }

  // 逐段输出：段内被跳过时，剩余行立即补全
  async function typeSeg(lines, cls, speed) {
    skip = false;
    for (var i = 0; i < lines.length; i++) {
      var lineCls = lines[i] === NARR_TAG ? 'ld-green' : cls;
      if (skip) {
        for (var j = i; j < lines.length; j++) {
          printLine(lines[j], lines[j] === NARR_TAG ? 'ld-green' : cls);
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
    await typeSeg(TEXT.boot1, 'ld-narr', 48);

    await typeSeg(TEXT.boot2, '', 30);

    await typeSeg(TEXT.menu, 'ld-dim', 18);

    busy = false;
    setBtns(true);
  }

  async function doAction(n) {
    if (busy) return;
    busy = true;
    setBtns(false);

    var lines = [TEXT.chosen + n];
    if (n === 1) lines.push(TEXT.act1(pick(NAMES)));
    if (n === 2) lines.push(TEXT.act2);
    if (n === 3) lines.push(TEXT.act3(pick(NAMES)));
    if (n === 4) lines.push(TEXT.act4);
    await typeSeg(lines, '', 26);

    // 随机 1-2 条群体事件
    var ev = [pick(EVENTS)];
    if (Math.random() < 0.6) {
      var e2 = pick(EVENTS);
      if (e2 !== ev[0]) ev.push(e2);
    }
    await typeSeg(ev, 'ld-ev', 26);

    await typeSeg([TEXT.generating, ''], 'ld-dim', 26);
    if (!REDUCED) await wait(600);

    var narr = NARRATIVES[narrIdx % NARRATIVES.length];
    narrIdx++;
    await typeSeg(narr, 'ld-narr', 80);

    await typeSeg(['', TEXT.cycleEnd(cycle++)], 'ld-dim', 26);

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
