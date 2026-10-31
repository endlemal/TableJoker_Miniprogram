// 经典德扑牌局引擎的测试：牌型、行动顺序、加注规则、主池和边池、离桌和删桌、2 到 10 人桌的压力测试（记分守恒）。
// 运行：node tools/holdem-test.mjs（全部通过时退出码为 0）
const H = await import(new URL('../src/common/holdem.js', import.meta.url).href);
const c = (s) => ({ r: H.RANK_TEXT.indexOf(s.slice(0, -1)), s: s.slice(-1) });
const cs = (str) => str.split(' ').map(c);
let fails = 0; const check = (name, ok, extra = '') => { if (!ok) fails++; console.log((ok ? '✓ ' : '✗ ') + name + (extra ? '  ' + extra : '')); };
// 1) 牌型
const ev = (s) => H.evaluate(cs(s));
const order = [
  ['A♠ 皇家同花顺', 'As Ks Qs Js 10s 2d 3c', 8], ['四条', '9h 9d 9s 9c Kd 2s 3s', 7], ['葫芦', 'Kh Kd Ks 4c 4d 2s 7h', 6],
  ['同花', '2h 7h 9h Jh Kh As Ad', 5], ['顺子（A2345）', 'Ah 2d 3c 4s 5h 9d Kc', 4], ['三条', '7h 7d 7s Kc 2d 9s 4h', 3],
  ['两对', 'Jh Jd 4s 4c Ad 9s 2h', 2], ['一对', 'Qh Qd 8s 6c 3d 2s 9h', 1], ['高牌', 'Ah Jd 8s 6c 3d 2s 9h', 0]];
order.forEach(([n, s, cat]) => check('牌型：' + n, ev(s).cat === cat, ev(s).name));
check('顺子 A2345 最大是 5', H.compareScore(ev('Ah 2d 3c 4s 5h 9d Kc').score, ev('2h 3d 4c 5s 6h 9d Kc').score) < 0);
check('同花顺 > 四条', H.compareScore(ev('5h 6h 7h 8h 9h 2c 2d').score, ev('9h 9d 9s 9c Kd 2s 3s').score) > 0);
check('两对比踢脚', H.compareScore(ev('Jh Jd 4s 4c Ad 9s 2h').score, ev('Jc Js 4h 4d Kd 9c 2s').score) > 0);
check('完全一样时平局', H.compareScore(ev('Ah Kd Qs Jc 9d 3s 2h').score, ev('Ad Kh Qc Js 9h 3c 2d').score) === 0);
check('葫芦：三条大的赢', H.compareScore(ev('Qh Qd Qs 2c 2d 7s 8h').score, ev('Jh Jd Js Ac Ad 7c 8d').score) > 0);
// 2) 两人桌：庄位是小盲，翻牌前先说话；翻牌后大盲先说
const P = (name, stack) => ({ pid: name, name, stack });
let t = H.createTable({ id: 't', name: '1 号桌', size: 6 });
H.sit(t, 0, P('A', 10000)); H.sit(t, 3, P('B', 10000));
H.startHand(t, { sb: 100, bb: 200, ante: 0 }, H.makeRng(1));
check('两人桌：庄位 = 小盲', t.hand.sb === t.hand.button, `button ${t.hand.button} sb ${t.hand.sb} bb ${t.hand.bb}`);
check('两人桌：翻牌前小盲先说话', t.hand.toAct === t.hand.sb);
check('盲注已下', t.seats[t.hand.sb].stack === 9900 && t.seats[t.hand.bb].stack === 9800);
H.act(t, t.hand.sb, 'call');
check('小盲补齐后轮到大盲（可以过牌）', t.hand.toAct === t.hand.bb && H.options(t, t.hand.bb).canCheck);
H.act(t, t.hand.bb, 'check');
check('翻牌：3 张公共牌，大盲先说', t.hand.street === 'flop' && t.hand.board.length === 3 && t.hand.toAct === t.hand.bb);
// 3) 加注规则
const o = H.options(t, t.hand.bb);
check('加注不足最小额会被拒绝', !H.act(t, t.hand.bb, 'raise', 100).ok && H.act(t, t.hand.bb, 'raise', 200).ok, `最小加注到 ${o.minTo}`);
H.act(t, t.hand.sb, 'fold');
check('弃牌：对手直接赢', t.hand.street === 'done' && t.seats[t.hand.bb].stack === 10200 && t.seats[t.hand.sb].stack === 9800);
// 4) 三人全下：主池和边池
t = H.createTable({ id: 't2', name: '2 号桌', size: 9 });
H.sit(t, 1, P('短', 1000)); H.sit(t, 4, P('中', 3000)); H.sit(t, 7, P('长', 5000));
H.startHand(t, { sb: 100, bb: 200, ante: 0 }, H.makeRng(7));
let guard = 0;
while (t.hand.street !== 'done' && guard++ < 20) H.act(t, t.hand.toAct, 'allin');
const r = t.hand.result;
const total = t.seats.filter(Boolean).reduce((a, s) => a + s.stack, 0);
check('三人全下：主池 3000、边池 4000、多出的 2000 退回', JSON.stringify(r.pots.map((p) => p.amount)) === '[3000,4000,2000]', JSON.stringify(r.pots.map((p) => p.amount)));
check('记分总数不变', total === 9000, `合计 ${total}`);
check('多出的部分只有「长」有资格', r.pots[2].elig.length === 1 && t.seats[r.pots[2].elig[0]].name === '长');
// 5) 全下不够最小加注时，不重新打开行动
t = H.createTable({ id: 't3', name: '3 号桌', size: 3 });
H.sit(t, 0, P('X', 10000)); H.sit(t, 1, P('Y', 10000)); H.sit(t, 2, P('Z', 1250));
H.startHand(t, { sb: 100, bb: 200, ante: 0 }, H.makeRng(3));
const seq = [];
const name = (i) => t.seats[i].name;
// 依次：第一个人加注到 1000，第二个人跟注，短码全下 1250（只多 250，不够最小加注 800）
const first = t.hand.toAct; H.act(t, first, 'raise', 1000); seq.push(name(first) + ' 加注到 1000');
let next = t.hand.toAct;
if (t.seats[next].name !== 'Z') { H.act(t, next, 'call'); seq.push(name(next) + ' 跟注'); next = t.hand.toAct; }
if (t.seats[next].name === 'Z') { H.act(t, next, 'allin'); seq.push('Z 全下 1250'); }
const after = t.hand.toAct;
const ob = after >= 0 ? H.options(t, after) : null;
check('短码全下不够最小加注：已行动的人只能跟注或弃牌', ob && ob.toCall === 250 && ob.canRaise === false, seq.join(' → ') + ` → 轮到 ${after >= 0 ? name(after) : '-'}，跟 ${ob && ob.toCall}，能加注：${ob && ob.canRaise}`);
check('试图再加注会被拒绝', !H.act(t, after, 'raise', 3000).ok && !H.act(t, after, 'allin').ok);
check('跟注可以', H.act(t, after, 'call').ok);
// 6) 压力测试：2000 手机器人对局，2 到 10 人桌，带前注
const rng = H.makeRng(42); let hands = 0, maxSteps = 0, conserveOk = true, sizes = new Set(), illegal = 0;
for (let g = 0; g < 200; g++) {
  const size = 2 + (g % 9); sizes.add(size);
  const tb = H.createTable({ id: 'g' + g, name: 'x', size });
  for (let i = 0; i < size; i++) H.sit(tb, i, P('p' + i, 2000 + Math.floor(rng() * 8000)));
  const start = tb.seats.reduce((a, s) => a + (s ? s.stack : 0), 0);
  for (let k = 0; k < 10; k++) {
    if (!H.startHand(tb, { sb: 100, bb: 200, ante: 25 }, rng)) break;
    let steps = 0;
    while (tb.hand.street !== 'done') {
      const a = H.botAction(tb, tb.hand.toAct, rng);
      const res = H.act(tb, tb.hand.toAct, a.action, a.to);
      if (!res.ok) { illegal++; H.act(tb, tb.hand.toAct, H.options(tb, tb.hand.toAct).canCheck ? 'check' : 'fold'); }
      if (++steps > 400) throw new Error('牌局停不下来');
    }
    maxSteps = Math.max(maxSteps, steps); hands++;
    const now = tb.seats.reduce((a, s) => a + (s ? s.stack : 0), 0);
    if (now !== start) { conserveOk = false; console.log('不守恒', g, k, start, now); break; }
    if (tb.hand.board.length !== 5 && tb.hand.result.showdown) { conserveOk = false; console.log('摊牌时公共牌不是 5 张'); }
  }
}
check('机器人不会做出不合规则的动作', illegal === 0, `不合规则 ${illegal} 次`);
check(`压力测试：${hands} 手牌（${[...sizes].sort((a,b)=>a-b).join('、')} 人桌），每手都结束，记分守恒`, conserveOk && hands > 1500, `单手最多 ${maxSteps} 步`);
// 7) 位置标签
t = H.createTable({ id: 't9', name: '9 人', size: 9 });
for (let i = 0; i < 9; i++) H.sit(t, i, P('p' + i, 5000));
H.startHand(t, { sb: 100, bb: 200, ante: 0 }, H.makeRng(9));
const pos = H.positions(t);
const seqPos = []; let i = t.hand.sb; for (let k = 0; k < 9; k++) { seqPos.push(pos[i]); i = (i + 1) % 9; }
check('9 人桌位置：' + seqPos.join(' '), seqPos.join(' ') === 'SB BB UTG EP EP MP MP CO BTN');
// 8) 离桌和删桌
{
  const t = H.createTable({ id: 'f', name: 'f', size: 4 });
  ['A', 'B', 'C'].forEach((n, i) => H.sit(t, i, { pid: n, name: n, stack: 5000 }));
  H.startHand(t, { sb: 100, bb: 200, ante: 0 }, H.makeRng(11));
  const notTurn = t.hand.order.find((i) => i !== t.hand.toAct);
  H.forfeit(t, notTurn);
  const total1 = t.seats.reduce((a, s) => a + (s ? s.stack : 0), 0) + H.potTotal(t.hand);
  check('不在轮次时离桌：算弃牌，牌局继续，记分守恒', t.hand.players[notTurn].folded && t.hand.street !== 'done' && total1 === 15000);
  const t2 = H.createTable({ id: 'g', name: 'g', size: 4 });
  ['A', 'B'].forEach((n, i) => H.sit(t2, i, { pid: n, name: n, stack: 5000 }));
  H.startHand(t2, { sb: 100, bb: 200, ante: 0 }, H.makeRng(12));
  H.forfeit(t2, t2.hand.order.find((i) => i !== t2.hand.toAct));
  check('两人时一人离桌：另一人直接赢', t2.hand.street === 'done');
  const t3 = H.createTable({ id: 'h', name: 'h', size: 4 });
  ['A', 'B', 'C'].forEach((n, i) => H.sit(t3, i, { pid: n, name: n, stack: 5000 }));
  H.startHand(t3, { sb: 100, bb: 200, ante: 50 }, H.makeRng(13));
  H.act(t3, t3.hand.toAct, 'raise', 1000);
  H.abortHand(t3);
  check('删桌中止：投入全部退回', t3.seats.filter(Boolean).every((s) => s.stack === 5000));
}
console.log(fails ? `\n${fails} 项失败` : '\n全部通过');
process.exit(fails ? 1 : 0)
