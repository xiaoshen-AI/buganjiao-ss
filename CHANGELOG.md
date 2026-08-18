# 不干胶拼版计算器 — 版本日志

> 版本规则：新功能 → +1.0（如 1.0→2.0）；修 bug → +0.1（如 1.0→1.1）
> 每个版本记录改了什么、影响哪段代码，出问题时快速定位是哪个版本引入的。

---

## v1.6 (2026-08-18)

**类型**：bug 修复

**改动内容**：
1. 超幅（超出纸张最大幅面）警告的判断依据由「拼合尺寸」改为「切料尺寸」：拼合尺寸 + 工艺余量（总宽+10mm、总高+跳距 gy）超出 300×352mm 才提示，更贴合实际下料
2. 警告文案同步「拼合尺寸超出」→「切料尺寸超出」（横/纵两方向）
3. 切料公式（`cutW=totalW+10`、`cutH=totalH+gy`）、`overW/overH` 阈值、纸张方向语义均未改动

**为什么修**：原按拼合尺寸判断，会出现「拼合未超、但加工艺余量后实际超幅」却漏提示的情况；按切料判断才准。本次一并上线 v1.5 未推送的汇总清单/整版模数改动。

**影响代码段**：HTML `recalc()`（第 255 行判断依据 `totalW/totalH`→`cutW/cutH`；第 250/253 行文案）、`regress.js`（M 段「切料边界超幅」4 条用例锁定新语义）

**回归**：全过（以 regress.js 实际断言数为准，本次 PASS=127 FAIL=0）

**commit**：`b8bc6363bba164ce429a4c6d872ddae4ef085a32`

---

## v1.5 (2026-08-13)

**类型**：功能

**改动内容**：最终结果页（汇总区）扩展：汇总清单每行加「数量」、汇总行拆「模数（单款）」+「整版模数」两行
1. **汇总清单 `sumList` 扩展**：每行由 `拼版{i}  共 {n} 个（成品尺寸：{w} x {h} mm）` 改为 `拼版{i}  共 {n} 个  数量{demand}个（尺寸：{w} x {h} mm）`（加需求数量，「成品尺寸」简化「尺寸」；`fitMultiLine` 自动伸缩已有）
2. **汇总区拆两行**：
   - `sumPrint` = `模数：{maxPrintN}个 印数：{maxPrint}（数量{maxPrintN×maxPrint}个）`（单款，印数最大那款，即 v1.3 之前的显示）
   - 新增 `sumPrintAll` = `整版模数：{totalModulus}个 印数：{maxPrint}（数量{totalModulus×maxPrint}个）`（整版）
3. **印数计算逻辑不变**：仍取 `max(ceil(每款需求 / 每款模数))`
4. **拼板卡片 `.pCount` 不动**（保持 `共 N 个`）

**为什么加**：操作员既要看「印数最大那款」的单款模数/数量，也要看「整版」总模数/总产出；清单每行加需求数量便于对照

**影响代码段**：HTML（sumPrint 后新增 sumPrintAll 行）、`recalc()`（sumList 文案、sumPrint/sumPrintAll 文案、fitBlockLine 调用）、`regress.js`（ref() L54、sumList 断言 L198、sumPrint 断言 L120 拆两 + 新增初始整版模数断言）

**回归**：60/60 全过

**commit**：`b8bc6363bba164ce429a4c6d872ddae4ef085a32`

---

## v1.4 (2026-08-13)

**类型**：bug 修复

**改动内容**：汇总行「模数 / 印数 / 数量」展示逻辑修正
1. **新增 `totalModulus`（整版模数）**：`recalc()` 累加每块有效拼板的模数 `n`，即整版模数 = Σ 各拼板单版模数
2. **「模数」改为展示整版总模数**：由原来 `maxPrintN`（印数最大那款的单版模数）改为 `totalModulus`
3. **「数量」改为整版产出**：由 `maxPrintN × maxPrint` 改为 `totalModulus × maxPrint`（= 各款实际产出之和，如 32×4167=133344 = 83340+50004）
4. **印数计算逻辑不变**：仍取 `max(ceil(每款需求 / 每款模数))`，保证多款尺寸不同数量时各款都满足需求

**为什么修**：红框「模数」误显示为印数最大款（拼版2）的模数 `1`，而非整版总模数 `21`；「数量」原按 `maxPrintN × maxPrint` 只算印数最大款的单款产出，改为整版 `totalModulus × maxPrint`（各款实际产出合计）

**影响代码段**：`recalc()` 函数（L192 变量声明、L204 起循环累加、L233 起 sumPrint 文案）；`regress.js` L120 断言同步改为「模数：32个 印数：7（数量224个）」

**回归**：58/58 全过

**commit**：`d9514a24f9c44ed8000d58bdb87a39351a4d3bb4`

---

## v1.3 (2026-08-12)

**类型**：bug 修复

**改动内容**：整版示意图 pattern 网格底部对齐修复
1. **tile 尺寸回退为精确值**：`tileW/tileH` 从 `pw/cols`、`ph/rows`（浮点除法，高格数累积偏差导致拼版底部比拼版1短一截）改回 `cellw+gapw`、`cellh+gaph`
2. 每个 pattern tile 含 1 cell + 1 gap，末 tile 多余 gap 被 `pw/ph` 裁掉，cells 完美填满，各拼版底部对齐

**为什么修**：拼版2（col×rows>30 走 `<pattern>` 批量渲染）cells 底部比拼版1短，整版示意图两块底部不齐

**影响代码段**：`drawDiagram()` 函数，`drawList` 预计算段 `tileW/tileH` 赋值

**回归**：58/58 全过

**commit**：`bb519a780b89dbc97ba5630d54864e14980bcf49`

---

## v1.2 (2026-08-10)

**类型**：bug 修复

**改动内容**：整版示意图布局修复
1. **底部对齐**：`by` 从 `padTop` 改为 `padTop + drawH - bh`，整版贴绘图区底边
2. **水平居中**：`bx` 从固定 `padX` 改为 `padX + (drawW - bw) / 2`
3. **底部文字外移**：标注 `"整版 TW × TH mm"` 从 SVG 内部 `<text>` 移出为外部 HTML `<div>`，不受 viewBox 裁切
4. **padBottom 28→10**

**为什么修**：整版底部留白不均 + 文字被 viewBox 裁切

**影响代码段**：`drawDiagram()` 函数，bx/by 计算逻辑 + 底部标注从 SVG 内移到 SVG 外

**回归**：58/58 全过

**commit**：`bd29641`

---

## v1.1 (2026-08-10)

**类型**：bug 修复

**改动内容**：整版示意图 pattern 原点对齐修复
- `<pattern>` 原点从默认 (0,0) 改为填充矩形左上角 (`x=px, y=py`)
- tile 尺寸从 `cellw+gapw` 改为 `pw/cols`、`ph/rows`，确保格子正好铺满
- 预计算 `drawList` 结构，避免 defs 和主循环各自算一遍，数值不一致

**为什么修**：高格数拼版（>30格）用 pattern 批量渲染网格时，tile 原点错位 + 尺寸不精确，导致边缘格子被裁切

**影响代码段**：`drawDiagram()` 函数，约 40 行重构（预计算 → defs 对齐 → 主循环统一引用）

**回归**：58/58 全过

**commit**：`db71368`

---

## v1.0 (2026-08-10)

**类型**：正式定版

**改动内容**：
1. **旋转90°勾选框**：每拼版卡片加 checkbox，勾选后 w↔h 互换，所有计算自动传导
2. **移动端适配**：`DOCTYPE` + `viewport` + `@media(max-width:768px)`，双栏叠单列，触控友好
3. **字号自适应**：4 个结果行 + 检查行，超出容器宽度自动缩小（fitBlockLine/fitSpanLine/fitMultiLine）
4. **示意图优化**：padX 44→18、padTop 14→12、cols×rows>30 用 `<pattern>` 批量渲染
5. **纵向跳距统一取 gy**

**影响代码段**：plateHTML 模板、recalc 旋转逻辑、drawDiagram 示意图、fitLine 自适应函数、移动端 @media 样式

**回归**：58/58 全过

**commit**：`3e6bee9`

---

## ~~动态 viewBox 尝试~~（已回退，不发布）

**原因**：让 SVG viewBox 根据整版宽高比动态调整 → 裁切严重、边角格子丢失
**结论**：viewBox 固定 320×408，保留等比例缩小展示，不搞动态尺寸
**教训**：会影响刀模导出的改动，改前必须截图验证

---

## 待定
- `sumCheck` 字号 24px→fitBlockLine (24,10)（随 v1.0 发布）
- 根 URL 直接写入 index.html 不跳转（随 v1.0 发布）
