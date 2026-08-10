// 不干胶拼版计算器 —— 固定回归测试脚本
// 用法：node regress.js [被测HTML路径，默认 D:/WorkBuddy/不干胶拼版计算器/不干胶拼版计算器.html]
// 依赖 jsdom（位于受管 node 工作区 node_modules）。脚本只读被测文件，不改写。

const fs = require('fs');

// 兼容两种方式找到 jsdom：已设置 NODE_PATH 时直接 require；否则回退到受管工作区
const managedModules = 'C:/Users/admin/.workbuddy/binaries/node/workspace/node_modules';
let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch (e) { ({ JSDOM } = require(managedModules + '/jsdom')); }

const FILE = process.argv[2] || 'D:/WorkBuddy/不干胶拼版计算器/不干胶拼版计算器.html';
if (!fs.existsSync(FILE)) { console.error('找不到被测文件: ' + FILE); process.exit(2); }
const html = fs.readFileSync(FILE, 'utf8');

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const win = dom.window;
const doc = win.document;

let pass = 0, fail = 0;
function eq(name, got, exp) {
  const g = String(got), e = String(exp);
  if (g === e) { pass++; }
  else { fail++; console.log('  ✗ FAIL: ' + name + '\n       got=' + JSON.stringify(g) + '\n       exp=' + JSON.stringify(e)); }
}
function ok(name, cond) { if (cond) pass++; else { fail++; console.log('  ✗ FAIL: ' + name); } }
function setVal(sel, v) { const el = doc.querySelector(sel); el.value = v; el.dispatchEvent(new win.Event('input')); }

// ===== 独立参考实现（不依赖被测代码，用来反推期望）=====
function ref(gx, gy, dir, plates) {
  const GX = BigInt(Math.round(gx * 1000)), GY = BigInt(Math.round(gy * 1000));
  let totalW = 0n, totalH = 0n, first = true, maxPrint = 0n, maxPrintIdx = 0, maxPrintN = 0;
  const list = [], pout = [];
  const fmt = v => { const s = v < 0n ? '-' : ''; v = v < 0n ? -v : v; const ip = v / 1000n; const fp = v % 1000n; if (fp === 0n) return s + ip; return s + ip + '.' + ('000' + fp).slice(-3).replace(/0+$/, ''); };
  for (let i = 0; i < plates.length; i++) {
    const { w, h, cols, rows, demand } = plates[i];
    const W = BigInt(Math.round(w * 1000)), H = BigInt(Math.round(h * 1000));
    const valid = W > 0n && H > 0n && cols > 0 && rows > 0;
    let tw = 0n, th = 0n, n = 0, print = 0n;
    if (valid) {
      tw = BigInt(cols) * W + BigInt(cols - 1) * GX;
      th = BigInt(rows) * H + BigInt(rows - 1) * GY;
      n = cols * rows;
      if (demand > 0) {
        print = (BigInt(demand) + BigInt(n) - 1n) / BigInt(n);
        if (print > maxPrint) { maxPrint = print; maxPrintIdx = i + 1; maxPrintN = n; }
      }
      if (dir === 'h') { totalW = totalW + tw + (first ? 0n : GX); if (th > totalH) totalH = th; }
      else { totalH = totalH + th + (first ? 0n : GY); if (tw > totalW) totalW = tw; }
      first = false;
    }
    pout.push({ tw, th, n, print, valid });
    list.push('拼版' + (i + 1) + '  共 ' + n + ' 个（成品尺寸：' + fmt(W) + ' x ' + fmt(H) + ' mm）');
  }
  return { totalW, totalH, maxPrint, maxPrintIdx, maxPrintN, list, pout, fmt };
}

console.log('被测文件: ' + FILE);
console.log('=== A. 纯函数 ===');
eq('toThousand("3")', win.toThousand('3'), 3000n);
eq('toThousand("1,000")', win.toThousand('1,000'), 1000000n);
eq('toThousand("abc")', win.toThousand('abc'), 0n);
eq('toThousand("30.456")', win.toThousand('30.456'), 30456n);
eq('toCount("50")', win.toCount('50'), 50n);
eq('toCount("1,000")', win.toCount('1,000'), 1000n);
eq('toCount("12a")', win.toCount('12a'), 0n);
eq('toCount("-5")', win.toCount('-5'), 0n);
eq('toCount("12.5")', win.toCount('12.5'), 12n);
eq('fmtThousand(129000)', win.fmtThousand(129000n), '129');
eq('fmtThousand(212000)', win.fmtThousand(212000n), '212');
eq('fmtThousand(1004)', win.fmtThousand(1004n), '1.004');
eq('expandScientific("1e3")', win.expandScientific('1e3'), '1000');

console.log('=== B. 初始状态（旧：尺寸/间隙/方向/切料/清单）===');
const R0 = ref(3, 3, 'h', [{ w: 30, h: 40, cols: 4, rows: 5, demand: 0 }, { w: 40, h: 30, cols: 3, rows: 4, demand: 0 }]);
eq('板1 拼版尺寸', doc.querySelector('.plate:nth-child(1) .pResult').textContent, '拼版：' + R0.fmt(R0.pout[0].tw) + ' × ' + R0.fmt(R0.pout[0].th) + ' mm');
eq('板1 个数', doc.querySelector('.plate:nth-child(1) .pCount').textContent, '共 20 个');
eq('板1 印数(无需求)', doc.querySelector('.plate:nth-child(1) .pPrint').textContent, '印数：—');
eq('板2 拼版尺寸', doc.querySelector('.plate:nth-child(2) .pResult').textContent, '拼版：' + R0.fmt(R0.pout[1].tw) + ' × ' + R0.fmt(R0.pout[1].th) + ' mm');
eq('板2 个数', doc.querySelector('.plate:nth-child(2) .pCount').textContent, '共 12 个');
eq('汇总 总尺寸', doc.getElementById("sumSizeText").textContent, '拼版：' + R0.fmt(R0.totalW) + ' × ' + R0.fmt(R0.totalH) + ' mm   跳距：3mm');
eq('汇总 切料', doc.getElementById('sumCut').textContent, '切料：' + R0.fmt(R0.totalW + 10000n) + ' × ' + R0.fmt(R0.totalH + 3000n) + ' mm'); // 横向：宽+10 高+gy(3mm)
eq('汇总 清单', doc.getElementById('sumList').textContent, R0.list.join('\n'));
eq('汇总 模数/印数(初始)', doc.getElementById('sumPrint').textContent, '模数：0个   印数：0');

console.log('=== C. 改横间隙 gx=5（旧几何）===');
setVal('#gx', '5');
const R1 = ref(5, 3, 'h', [{ w: 30, h: 40, cols: 4, rows: 5, demand: 0 }, { w: 40, h: 30, cols: 3, rows: 4, demand: 0 }]);
eq('gx=5 总尺寸', doc.getElementById("sumSizeText").textContent, '拼版：' + R1.fmt(R1.totalW) + ' × ' + R1.fmt(R1.totalH) + ' mm   跳距：3mm');
eq('gx=5 切料', doc.getElementById('sumCut').textContent, '切料：' + R1.fmt(R1.totalW + 10000n) + ' × ' + R1.fmt(R1.totalH + 3000n) + ' mm'); // 横向：宽+10 高+gy(3mm)

console.log('=== D. 纵向拼版（旧方向）===');
setVal('#gx', '3'); setVal('#gy', '3');
doc.getElementById('dirV').click();
const R2 = ref(3, 3, 'v', [{ w: 30, h: 40, cols: 4, rows: 5, demand: 0 }, { w: 40, h: 30, cols: 3, rows: 4, demand: 0 }]);
eq('纵向 总尺寸', doc.getElementById("sumSizeText").textContent, '拼版：' + R2.fmt(R2.totalW) + ' × ' + R2.fmt(R2.totalH) + ' mm   跳距：3mm');
eq('纵向 切料', doc.getElementById('sumCut').textContent, '切料：' + R2.fmt(R2.totalW + 10000n) + ' × ' + R2.fmt(R2.totalH + 3000n) + ' mm'); // 纵向：与横向同公式 宽(总宽+10) × 高(总高+gy)
ok('纵向 默认不超幅', doc.getElementById('sumWarn').style.display === 'none');
// 示意图：纵向为「拼版排列方向旋转」，整版竖版、板1在上板2在下、单板不旋转
const svgV = doc.getElementById('diagramSvg').innerHTML;
const frameV = svgV.match(/<rect x="18" y="10" width="([\d.]+)" height="([\d.]+)" fill="#f8fafc"/);
const plateRectsV = [...svgV.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="#[0-9a-f]{6}14"/g)].map(m => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4] }));
ok('纵向 整版框 高>宽(竖版，纸不旋转)', frameV && (+frameV[1]) < (+frameV[2]));
ok('纵向 板1 在 板2 上方(堆叠顺序正确)', plateRectsV.length >= 2 && plateRectsV[0].y < plateRectsV[1].y);
ok('纵向 图例板尺寸未旋转(tw×th，含 129×212)', svgV.indexOf('129×212') >= 0);
doc.getElementById('dirH').click();
// 示意图：横向恢复为左右并排、整版横版、板1在板2左侧
const svgH = doc.getElementById('diagramSvg').innerHTML;
const frameH = svgH.match(/<rect x="18" y="10" width="([\d.]+)" height="([\d.]+)" fill="#f8fafc"/);
const plateRectsH = [...svgH.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="#[0-9a-f]{6}14"/g)].map(m => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4] }));
ok('横向 整版框 宽>高(横版)', frameH && (+frameH[1]) > (+frameH[2]));
ok('横向 板1 在 板2 左侧(并排顺序正确)', plateRectsH.length >= 2 && plateRectsH[0].x < plateRectsH[1].x);

console.log('=== E. 印数/模数（新：取最大值）===');
setVal('.plate:nth-child(1) .pdemand', '50');
setVal('.plate:nth-child(2) .pdemand', '80');
eq('板1 印数', doc.querySelector('.plate:nth-child(1) .pPrint').textContent, '印数：3');
eq('板2 印数', doc.querySelector('.plate:nth-child(2) .pPrint').textContent, '印数：7');
eq('汇总 模数/印数', doc.getElementById('sumPrint').textContent, '模数：12个   印数：7（数量84个）');

console.log('=== F. 非法尺寸不崩溃（旧健壮性）===');
let threw = false;
try { setVal('.plate:nth-child(1) .pw', 'abc'); } catch (e) { threw = true; }
ok('非法尺寸不抛异常', !threw);
eq('非法尺寸→0×0', doc.querySelector('.plate:nth-child(1) .pResult').textContent, '拼版：0 × 0 mm');
setVal('.plate:nth-child(1) .pw', '30');

console.log('=== G. 超幅警告（旧告警）===');
setVal('.plate:nth-child(1) .prows', '9');
ok('超幅警告显示', doc.getElementById('sumWarn').style.display !== 'none');
ok('超幅警告文案', doc.getElementById('sumWarn').textContent.indexOf('超出') >= 0);
setVal('.plate:nth-child(1) .prows', '5');

console.log('=== H. 增删拼板（旧交互防护）===');
const before = doc.querySelectorAll('.plate').length;
doc.getElementById('addBtn').click();
eq('添加后+1', doc.querySelectorAll('.plate').length, before + 1);
doc.querySelector('.plate .delBtn').click();
eq('删除后-1', doc.querySelectorAll('.plate').length, before);
let guard = 0;
while (doc.querySelectorAll('.plate').length > 1 && guard < 50) { doc.querySelector('.plate .delBtn').click(); guard++; }
doc.querySelector('.plate .delBtn').click();
eq('保留至少1块', doc.querySelectorAll('.plate').length, 1);

console.log('=== I. 结果行自动缩小字号（算法守护）===');
(function () {
  const cut = doc.getElementById('sumCut');
  let threw = false;
  try {
    Object.defineProperty(cut, 'clientWidth', { value: 300, configurable: true });
    Object.defineProperty(cut, 'scrollWidth', { get() { return parseInt(cut.style.fontSize || '24', 10) * 15; }, configurable: true });
    win.fitBlockLine(cut, 24, 12);
    const s = parseInt(cut.style.fontSize, 10);
    ok('fitBlockLine 溢出→缩字号(>=12 且 <24)', s >= 12 && s < 24);
    ok('fitBlockLine 缩到能放下(15*s<=300)', 15 * s <= 300);
  } catch (e) { threw = true; }
  ok('fitBlockLine 模拟不抛错', !threw);
  const pr = doc.getElementById('sumPrint');
  let threw2 = false;
  try {
    Object.defineProperty(pr, 'clientWidth', { value: 1000, configurable: true });
    Object.defineProperty(pr, 'scrollWidth', { value: 200, configurable: true });
    win.fitBlockLine(pr, 24, 12);
    ok('fitBlockLine 不溢出保持24', parseInt(pr.style.fontSize, 10) === 24);
  } catch (e) { threw2 = true; }
  ok('fitBlockLine 不溢出测试不抛错', !threw2);
  let threw3 = false;
  try { win.fitSpanLine(doc.getElementById('sumSizeText'), 24, 12); win.fitMultiLine(doc.getElementById('sumList'), 24, 12); } catch (e) { threw3 = true; }
  ok('fitSpanLine/fitMultiLine 默认不抛错且保持24', !threw3 && parseInt(doc.getElementById('sumSizeText').style.fontSize, 10) === 24 && parseInt(doc.getElementById('sumList').style.fontSize, 10) === 24);
})();

console.log('=== J. 旋转90°（新功能）===');
// 重置：2板、横向、默认值
doc.getElementById('addBtn').click();
setVal('#gx', '3'); setVal('#gy', '3'); doc.getElementById('dirH').click();
setVal('.plate:nth-child(1) .pw', '30'); setVal('.plate:nth-child(1) .ph', '40');
setVal('.plate:nth-child(1) .pcols', '4'); setVal('.plate:nth-child(1) .prows', '5');
setVal('.plate:nth-child(1) .pdemand', '0');
setVal('.plate:nth-child(2) .pw', '40'); setVal('.plate:nth-child(2) .ph', '30');
setVal('.plate:nth-child(2) .pcols', '3'); setVal('.plate:nth-child(2) .prows', '4');
setVal('.plate:nth-child(2) .pdemand', '0');

// 不勾选时与原来一致
const RJ0 = ref(3, 3, 'h', [{ w: 30, h: 40, cols: 4, rows: 5, demand: 0 }, { w: 40, h: 30, cols: 3, rows: 4, demand: 0 }]);
eq('旋转off 板1', doc.querySelector('.plate:nth-child(1) .pResult').textContent, '拼版：' + RJ0.fmt(RJ0.pout[0].tw) + ' × ' + RJ0.fmt(RJ0.pout[0].th) + ' mm');
eq('旋转off 汇总尺寸', doc.getElementById("sumSizeText").textContent, '拼版：' + RJ0.fmt(RJ0.totalW) + ' × ' + RJ0.fmt(RJ0.totalH) + ' mm   跳距：3mm');

// 板1勾选旋转：30×40→40×30，tw=40*4+3*3=169, th=30*5+3*4=162
{ const cb = doc.querySelector('.plate:nth-child(1) .protate');
  cb.checked = true; cb.dispatchEvent(new win.Event('input')); }
const RJ1 = ref(3, 3, 'h', [{ w: 40, h: 30, cols: 4, rows: 5, demand: 0 }, { w: 40, h: 30, cols: 3, rows: 4, demand: 0 }]);
eq('旋转on 板1拼接', doc.querySelector('.plate:nth-child(1) .pResult').textContent, '拼版：' + RJ1.fmt(RJ1.pout[0].tw) + ' × ' + RJ1.fmt(RJ1.pout[0].th) + ' mm');
eq('旋转on 板1个数不变', doc.querySelector('.plate:nth-child(1) .pCount').textContent, '共 20 个');
eq('旋转on 板2不变', doc.querySelector('.plate:nth-child(2) .pResult').textContent, '拼版：' + RJ1.fmt(RJ1.pout[1].tw) + ' × ' + RJ1.fmt(RJ1.pout[1].th) + ' mm');
eq('旋转on 汇总尺寸', doc.getElementById("sumSizeText").textContent, '拼版：' + RJ1.fmt(RJ1.totalW) + ' × ' + RJ1.fmt(RJ1.totalH) + ' mm   跳距：3mm');
eq('旋转on 切料', doc.getElementById('sumCut').textContent, '切料：' + RJ1.fmt(RJ1.totalW + 10000n) + ' × ' + RJ1.fmt(RJ1.totalH + 3000n) + ' mm');
eq('旋转on sumList板1成品', doc.getElementById('sumList').textContent.split('\n')[0], '拼版1  共 20 个（成品尺寸：40 x 30 mm）');
ok('旋转on 示意图含旋转后尺寸', doc.getElementById('diagramSvg').innerHTML.indexOf('169×162') >= 0);

// 取消旋转恢复
{ const cb = doc.querySelector('.plate:nth-child(1) .protate');
  cb.checked = false; cb.dispatchEvent(new win.Event('input')); }
eq('旋转off恢复 板1', doc.querySelector('.plate:nth-child(1) .pResult').textContent, '拼版：' + RJ0.fmt(RJ0.pout[0].tw) + ' × ' + RJ0.fmt(RJ0.pout[0].th) + ' mm');

console.log('\n=== 结果 ===');
console.log('PASS=' + pass + '  FAIL=' + fail);
process.exit(fail > 0 ? 1 : 0);
