# 不干胶拼版计算器 — 版本日志

> 版本规则：新功能 → +1.0（如 1.0→2.0）；修 bug → +0.1（如 1.0→1.1）
> 每个版本记录改了什么、影响哪段代码，出问题时快速定位是哪个版本引入的。

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
