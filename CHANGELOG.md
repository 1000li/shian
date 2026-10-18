# Changelog

本项目的所有重要变更都记录在此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [2026-10-18] — RAG 详情页 hero 换成真实演示视频 + 书签轮播降级提示修正

### 修复
- **古建研学详情页书签轮播的"假故障"**：排查确认移动端布局与动画本身正常（无头 Chrome 移动视口实测 `is-animating` 生效、虚拟时间 2s/8s 截图像素对比确认轨道在位移）。真实诱因是手机系统开启「减弱动态效果 / 移除动画」时，`prefers-reduced-motion` 命中，轮播按无障碍设计自动关闭、退化为手动横滑——但提示语仍写「自动轮播」，看起来像坏了。现提示语随 REDUCED 切换：降级时显示「左右滑动查看」（英文 `swipe to browse`）。

### 变更
- **中/英 `projects/rag.html` 的 hero 由 JS 模拟动画（`data-viz="rag"`）替换为真实演示视频**（96 秒，720p H.264+AAC，2.7MB）：5 段叙事——讲义故事开场、答得出带出处、超纲拒答、v1.0/v1.2 版本对比、技术流程图，配晓晓 TTS 旁白。`<video controls preload="none" poster>`，封面图 `images/rag-demo-poster.webp`（78KB，取版本对比帧）；`preload="none"` 保证不点不加载。
- 列表页卡片（首页 / projects / 对应英文页）仍保留原 `rag` 模拟动画不动。
- 新增 `.detail-hero video` 样式：`object-fit: contain` + 黑底，16:9 视频恰好填满 hero 的 16:9 容器，无黑边。

## [2026-10-16] — 古建研学详情页书签改为自动轮播 + 精简手册名称

### 变更
- **详情页 hero 书签由「拖动横滚」改为「自动轮播」**。原方案是 `overflow-x:auto` + `scroll-snap` + pointer 事件手动改`scrollLeft`，实测两个问题：
  - `pointerleave` 会在指针**仍按住**移出容器时触发 `release`，把 `scroll-snap-type` 重新打开，与仍在进行的 `pointermove` 争抢 `scrollLeft`，手感就是"拖动完停不下来"
  - `scroll-snap-align:center` 让每张都停一下，与"看完整系列"的意图冲突，反而像卡顿
  现改为与首页卡片同一套无缝机制：两份 `.bm-seq` 并排 + `translateX(-50%)` 匀速平移，55px/秒。无交互态，也就不存在"停不下来"。提示语由「← 拖动查看 5 张 →」改为「中轴线书签 5 张 · 自动轮播」。

- **CSS 选择器作用域修正（关键）**：`.bm-track` / `.bm-seq` / `.bm-track img` 的基础样式原本带 `.feature-card .card-visual` 前缀，详情页 hero 不匹配，会导致 flex 布局、`width:max-content`、图片高度反推**全部失效**。已提为公共选择器，首页卡片与详情页 hero 共用；hero 档另用 `.detail-hero--gallery` 覆写（图高 82%、间距 22px、悬停暂停）。

### 文案
- 「低龄段古建筑研学手册 v3.0 加强版 · 内页预览」→「**古建筑研学手册 · 内页预览**」，英文页同步精简为 `Heritage Architecture Study Handbook · spread preview`；两处图片 `alt` 一并精简。

## [2026-10-15 性能] — 修复页面打开慢、跳转慢

### 诊断
实测定位，**主因不是本地服务器，而是外部字体请求挂起**：

| 资源 | 实测耗时 |
|---|---|
| 本地 `index.html` | 7 ms |
| 本地 `css/style.css` | 5 ms |
| `fonts.googleapis.com` | **挂起 10 s 后超时** |
| `fonts.gstatic.com` | 752 ms |

站点自身仅 4.1 MB / 94 个文件，本地读取本就是毫秒级。慢的成因是每个页面 `<head>` 里那条 Google Fonts `<link rel="stylesheet">` 属于**渲染阻塞资源**：浏览器要等它返回才画首屏，而该域名在当前网络下不通、也不快速失败，而是挂起到 TCP 超时。页面上每个内页都各挂一次，跳转自然也慢。

### 修复
- **Google Fonts 改为非阻塞加载**（全部 24 个 HTML）。加 `media="print"` 使其不阻塞渲染，字体到达后由 `onload` 切回 `all` 生效；同时补 `<noscript>` 兜底。
- 版式不会受影响：`css/style.css` 第 14–16 行 `--font-sans` / `--font-mono` 本就配了系统字体栈（PingFang SC / Microsoft YaHei / Consolas 等），外部字体只是首选，失败时自动回退。
- **新增 `_serve.py` 本地预览服务器**：`ThreadingHTTPServer` 多线程（原先 `python -m http.server` 的 `HTTPServer` 是单线程，浏览器并发请求会串行排队），并对所有响应加 `Cache-Control: no-store`，改完刷新即可见。

### 说明
首屏卡片需向下滚动才出现内容，是站点原有的 `.reveal` 滚动渐入设计（IntersectionObserver 触发），并非加载故障。

## [2026-10-15 后续] — 修复书签轮播渲染 + 首页精选调整 + 占位卡

### 修复
- **古建研学卡片书签轮播只显示一张放大图**：根因是 CSS 循环依赖——`.bm-track` 用 `width: max-content`，图片却用 `width: 44%`，轨道宽度与内容宽度互相依赖。浏览器实测把每张书签解析为 220.6×496.4px，塞进 203.3px 高的卡片后被 `overflow:hidden` 裁切，视觉上只剩一张放大的局部图。
  - 图片尺寸改为由**高度**反推（`height:86%; width:auto`），高度有确定参照系（卡片 `aspect-ratio`），不构成循环。实测单张 108×243px，一屏可见约 2.6 张，纵向溢出 0
  - 间距从轨道的 `gap`/`padding` 移入 `.bm-seq` 内部（`gap` + `padding-right`）。原因：间距放在轨道上时，`translateX(-50%)` 的位移距离与真实内容周期相差半个 gap（实测 7px），每轮循环会跳一下；改为两份 `.bm-seq` 后接缝误差 -0.5px（子像素舍入），实测无缝
  - `setDuration()` 改为等全部图片 `load`/`error` 触发后再计算，避免轨道宽度随图片逐张加载而变化
  - 删除移动端断点中遗留的 `.bm-track img { width: 46% }`，该规则会重新引入同一 bug
  - 详情页画廊书签由 `loading="lazy"` 改为 `eager`（位于首屏，lazy 在部分环境下首屏空白）
- **CSS 写法约定**：`max-content` / `fit-content` 容器内不得对子元素使用百分比宽度

### 变更
- **首页精选改为全 AI 产品**：`index.html` 与 `en/index.html` 的第三张卡由「绡山寻踪 / Xiaoshan Xunzong」换成「RAG 知识库问答 / RAG Knowledge Base Q&A」，与项目页 01 组（AI 产品）保持一致
- **项目页 03 组补「未完待续」占位卡**：`projects.html` 与 `en/projects.html` 新增第三张 `.card-teaser`，填掉 Games 组两卡留下的空白。虚线边框、禁用 hover 位移、三个呼吸的蓝紫渐变点；非链接元素并加 `aria-disabled="true"`

### 待定
- ~~排课卡片的俄罗斯方块七色与站点白底极简蓝紫体系不协调~~ → **已改版两轮**，见下方条目

## [2026-10-15 第四轮] — 排课卡片配色改用「拾光纸境」海报色板

### 变更
- **第二轮配色**：改用「拾光纸境 · 手作小集」海报色板，**由深底转为浅底**，且**红让位给蓝做基础色**（按作者要求）
  - 底色`#222E3C`（深蓝灰）→ `#F4E7D4`（暖象牙白），网格线由米白改为淡墨
  - 七色：I `#013FB6` 钴蓝 / O `#F5AD20` 黄 / T `#EF370A` 朱红 / S `#838F67` 孔雀绿 / Z `#EF98A4` 粉 / J `#4A4038` 暖墨 / L `#F7E6EA` 极浅粉
  - 除 J 外六色均为海报原色（底色、黄、朱红、钴蓝、孔雀绿、粉）。J 取海报标题字与那只猫的墨色，并从纯黑 `#2A2A2A` 调暖为 `#4A4038` —— 纯黑在米白底上会读成"空洞"，暖墨同样达到 ΔE 21.7 但块面更透气
  - 冲突态：米白底红 ✗ → **墨底 + 朱红 ✗**（浅底上浅色块无法承载警示）
  - 质感应底色反转：内描边由米白改为淡墨；`.sv-l`（极浅粉）改用墨色字；底栏文字、图例、状态色同步转为墨系（`#C42D08` / `#5E6B45` / `#A8760A`）
- **两处闪烁动画再次下调**：浅底高饱和色（`#F5AD20` 黄、`#EF98A4` 粉）经`brightness()` 提亮极易发白，`svDone` 由 1.45 降至 1.12、`svLock` 由 1.4 降至 1.14

### 说明
- 七色可辨识度经 CIEDE2000 校验：两两最小 ΔE = 21.7，次小 27.5（朱红 / 粉）
- 备选：`J` 用深孔雀绿或深钴蓝会使 I/J 或 S/J 降到 ΔE 7~14，已弃用；粉系双阶（深玫红 + 浅粉）ΔE 可到 22.9，但会失去海报原本的单粉，故未采用

## [2026-10-15 第三轮] — 排课卡片配色改版（TOM park 海报色板）

### 变更
- **排课卡片俄罗斯方块改用海报色板**：tetromino 七块概念、8×6 铺满布局、以及「逐块落位 → 3 块冲突 → 逐块锁定消解 → 全满足闪烁」的分镜逻辑**全部保留**，仅替换色板与质感
  - 底色 `#0A0A1E` → `#222E3C`（深蓝灰），去掉原先的径向高光，改用米白细网格线
  - 七色：I `#207BFF` / O `#FFB506` / T `#EE2805` / S `#02988C` / Z `#4E7A3A` / J `#12408F` / L `#F3EBDE`。前六色与底色、米白均取自参考海报；L 用海报米白，在深底上作为"已满足"块最跳，并单独改深色字（白字在米白上看不清）
  - 冲突态由「整块霓虹红」改为「米白底 + 红色 ✗」（呼应海报里红即"注意"），仍保留抖动
  - 质感由「斜向高光渐变 + 立体内阴影」改为「平面色块 + 1px 米白描边」，更贴近海报的平面色块语言
  - 底栏图例与状态文字同步换色（冲突红 `#EE2805` / 满足青 `#02988C` / 状态黄 `#FFB506`）
- **两处闪烁动画的亮度倍率下调**：原`brightness(1.9)` / `brightness(2.2)` 在`#FFB506` 这类高亮黄上会烧成纯白、丢失色相，现改为 `brightness(1.45)` / `brightness(1.4)`

### 说明
- 七色可辨识度经 CIEDE2000 校验：两两最小 ΔE = 21.8（同一网格内相邻块最小 ΔE 23.5），满足 16:10 卡片尺寸下的区分需求
- 备选方案（紫罗兰补色 `#8C4A9E`，ΔE 22.6）未采用，因紫色不在参考海报色系内

## [2026-10-15] — 项目页分组 + 新增 RAG 问答 / 古建研学

### 新增
- **项目页分组展示**：`projects.html` 与 `en/projects.html` 由单一 3 列网格改为三个 `<section class="group">`（01 AI 产品 / 02 内容与教育 / 03 游戏与实验）。组头含 JetBrains Mono 编号、组名 `<h2>`、一行说明 `.group-sub`；组间留白 88px（移动端 64px）；组内沿用原 `.card-grid` 与响应式断点（900px→2 列 / 600px→1 列）
- **RAG 知识库问答**（第 7 个项目）
  - 卡片动画 `data-viz="rag"`（`js/main.js` 新增 `buildRag`）：视觉语言取自项目本体前端（`course-kb-rag/web/index.html`）——白底点阵、克莱因蓝 `#002FA7`、柠檬黄 `#FFDD00`、安全橙 `#FF4D00`（仅拒答）；无圆角/无阴影/无渐变、3px 硬边框、编号标签
  - 分镜循环：问题打字 → 双信号（向量 / BM25）条爬升 → 命中出答案 + 出处标签（`第 7 课 · 幻觉 · P23`）→ 下一轮切换为橙色「超出讲义范围」拒答态
  - `projects/rag.html` + `en/projects/rag.html`：详情页，hero 复用放大版动画；双链接（GitHub + 在线 Demo，注明需密码）
- **古建研学**（第 8 个项目）
  - 卡片头图用**横向滚动轮播**展示 5 张中轴线书签（`buildBookmarkMarquee`）：书签原图为竖版 889×2000（比例 0.445），静止单图裁进 16:10 会损失约 80% 画面，故改以横向滚动完整呈现系列。序列渲染两份实现无缝循环，卡片悬停暂停，两侧渐隐
  - `projects/yanxue.html` + `en/projects/yanxue.html`：详情页 hero 为可拖动横滚画廊（`buildBookmarkGallery`，scroll-snap + pointer 拖动 + 松手吸附），复用站内 `.manual-strip` 展示低龄段 v3.0 手册内页 P8/P9
  - 新增素材 `images/bookmark-*.webp` ×5（500×1125，共 240KB）与 `images/yanxue-manual-v30-p8/9.webp`（1100px 宽，共 260KB）
- **跨层素材路径自动推断**：`js/main.js` 由 `script[src*=main.js]` 推断 `images/` 前缀，避免在根目录页与 `projects/` 详情页分别硬编码 `images/` 与 `../images/`

### 变更
- 项目页说明文案「六个」→「八个」，`<meta name="description">` 同步加入两个新项目
- `css/style.css` 新增 `.group` / `.group-head` / `.group-no` / `.bm-marquee` / `.bm-gallery` / `.rag*` 共约 380 行；`prefers-reduced-motion` 下轮播停止且画廊可手动横滚、RAG 动画直接进终帧

### 说明
- 站点保持纯静态、无构建、无新依赖；现有 6 个项目的页面内容与视觉未改动
- `.gitignore` 追加 `PRD-*.md`，避免内部需求文档被推送到公开仓库并触发 Cloudflare Pages 部署

## [2026-09-06] — 中英双语 + 可视化升级

### 新增
- **全站英文版**：`en/` 目录镜像全部 10 个页面（首页/关于/项目/联系 + 6 个项目详情页），导航栏右侧新增「EN / 中文」切换键，指向同一页面的另一语言版本
- **JS 文案双语化**：NL2SQL 流程动画、排课求解动画（`js/main.js`）、龙虾终端叙事 demo（`js/lobster.js`）、名可名课程 demo 界面（`js/mingkeming.js`）按 `<html lang>` 自动切换中英文
- **排课概念图重做**：8×6 网格由 12 块真正的四格骨牌（I/O/T/S/Z/L/J 经典七色，布局经脚本验证）铺满；动画循环为「逐块落下 → 3 块冲突闪红 → 逐块锁定消解 → 全满足闪烁」
- **名可名 demo 舞台素材换代**：左侧配图从卡通风格改为本地 ComfyUI 生成的仿 TikTok 写实风照片（FLUX.2 klein），剧情高潮（第 7~11 句）替换为 3 秒短视频（MiniMax H3 生成的"可食用岩浆"片段，`images/mkm-lava.mp4`），翻页 crossfade 机制保留；`prefers-reduced-motion` 下视频自动暂停

### 修复
- 名可名第 14 句英文残留的元文本 `Caption:` 改为自然叙事 `Her caption: ...`
- 名可名最后一张配图（红光鬼片感）替换为明亮温暖的双人场景

## [2026-08-30]

### 变更
- 移除小红书联系方式；修复移动端侧边距（shorthand 覆盖问题）；更新关于页签名句 (da58f68)

### 新增
- 初始版本：4 个主页面 + 6 个项目详情页，纯静态 HTML/CSS/JS (ce12e00)
