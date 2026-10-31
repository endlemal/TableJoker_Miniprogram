// 记分工具牌局引擎的测试：出分顺序、加注规则、弃牌后直接收分、主池和边池、收分（选赢家、平分）、离桌和删桌，
// 以及 2 到 10 人桌的压力测试（每手都结束、记分守恒、机器人不做不合规则的动作）。
// 运行：node tools/tally-test.mjs（全部通过时退出码为 0）
const T = await import(new URL('../src/common/tally.js', import.meta.url).href);
let fails = 0;
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log((ok ? '✓ ' : '✗ ') + name + (extra ? '  ' + extra : '')); };
const P = (name, stack) => ({ pid: name, name, stack });
const total = (t) => t.seats.reduce((a, s) => a + (s ? s.stack : 0), 0) + (t.hand && t.hand.street !== 'done' ? T.potTotal(t.hand) : 0);
// 1) 两人桌：庄位是小盲，翻牌前先说；翻牌后大盲先说
let t = T.createTable({ id: 'a', name: '1 号桌', size: 6 });
T.sit(t, 0, P('A', 10000)); T.sit(t, 3, P('B', 10000));
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
check('两人桌：庄位 = 小盲，翻牌前小盲先说', t.hand.sb === t.hand.button && t.hand.toAct === t.hand.sb);
check('盲注已下', t.seats[t.hand.sb].stack === 9900 && t.seats[t.hand.bb].stack === 9800);
T.act(t, t.hand.sb, 'call');
check('小盲补齐后大盲可以过牌', t.hand.toAct === t.hand.bb && T.options(t, t.hand.bb).canCheck);
T.act(t, t.hand.bb, 'check');
check('第二轮（翻牌）：大盲先说', t.hand.street === 'flop' && t.hand.toAct === t.hand.bb);
check('加注不足最小额被拒绝，够了可以', !T.act(t, t.hand.bb, 'raise', 100).ok && T.act(t, t.hand.bb, 'raise', 200).ok);
T.act(t, t.hand.sb, 'fold');
check('弃牌：剩下的人直接收分', t.hand.street === 'done' && t.seats[t.hand.bb].stack === 10200 && t.seats[t.hand.sb].stack === 9800);
// 2) 四轮都过牌后进入收分，选赢家
t = T.createTable({ id: 'b', name: '2 号桌', size: 3 });
['X', 'Y', 'Z'].forEach((n, i) => T.sit(t, i, P(n, 5000)));
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
let guard = 0;
while (t.hand.street !== 'collect' && guard++ < 40) { const i = t.hand.toAct; const o = T.options(t, i); T.act(t, i, o.canCheck ? 'check' : 'call'); }
check('四轮出分后进入收分：一个池，3 人有资格', t.hand.street === 'collect' && t.hand.pots.length === 1 && t.hand.pots[0].amount === 600 && t.hand.pots[0].elig.length === 3);
check('没选赢家不能收分', !T.award(t, []).ok);
const wrong = T.award(t, [[9]]);
check('选了不在池里的人会被拒绝', !wrong.ok, wrong.error);
const two = t.hand.pots[0].elig.slice(0, 2);
check('两人平分', T.award(t, [two]).ok && t.hand.result.won[two[0]] === 300 && t.hand.result.won[two[1]] === 300 && total(t) === 15000);
// 3) 三人全下：主池 3000、边池 4000、多出的 2000 自动退回；平分时的余数
t = T.createTable({ id: 'c', name: '3 号桌', size: 9 });
T.sit(t, 1, P('短', 1000)); T.sit(t, 4, P('中', 3000)); T.sit(t, 7, P('长', 5000));
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
guard = 0;
while (t.hand.street !== 'collect' && t.hand.street !== 'done' && guard++ < 20) T.act(t, t.hand.toAct, 'allin');
const pots = t.hand.pots;
check('三人全下：主池 3000、边池 4000、多出的 2000', JSON.stringify(pots.map((p) => p.amount)) === '[3000,4000,2000]', JSON.stringify(pots.map((p) => p.amount)));
check('多出的部分只有「长」有资格，自动给他；要选赢家的是前两个池', pots[2].winners && t.seats[pots[2].winners[0]].name === '长' && JSON.stringify(T.pendingPots(t)) === '[0,1]');
const seatOf = (n) => t.seats.findIndex((s) => s && s.name === n);
check('收分：主池给「短」，边池「中」「长」平分', T.award(t, [[seatOf('短')], [seatOf('中'), seatOf('长')]]).ok);
check('结果：短 3000、中 2000、长 4000（含退回的 2000），合计不变', t.seats[seatOf('短')].stack === 3000 && t.seats[seatOf('中')].stack === 2000 && t.seats[seatOf('长')].stack === 4000 && total(t) === 9000,
  [t.seats[seatOf('短')].stack, t.seats[seatOf('中')].stack, t.seats[seatOf('长')].stack].join(' / '));
// 4) 平分有余数：从庄位左边开始多给 1
t = T.createTable({ id: 'd', name: '4 号桌', size: 3 });
['P', 'Q', 'R'].forEach((n, i) => T.sit(t, i, P(n, 1000)));
T.startHand(t, { sb: 50, bb: 101, ante: 0 });
guard = 0;
while (t.hand.street !== 'collect' && guard++ < 40) { const i = t.hand.toAct; const o = T.options(t, i); T.act(t, i, o.canCheck ? 'check' : 'call'); }
const pair = t.hand.pots[0].elig.slice(0, 2);
T.award(t, [pair]);
const w = t.hand.result.won;
// 两人里离庄位左边最近的那位多拿 1 分
const dist = (x) => (x - t.hand.button + t.size) % t.size;
const near = pair.slice().sort((a, b) => dist(a) - dist(b))[0], far = pair.find((x) => x !== near);
check('303 分两人平分：庄位左边先到的那位 152，另一位 151', t.hand.pots[0].amount === 303 && w[near] === 152 && w[far] === 151, JSON.stringify(w));
// 5) 全下不够最小加注时，不重新打开行动
t = T.createTable({ id: 'e', name: '5 号桌', size: 3 });
T.sit(t, 0, P('X', 10000)); T.sit(t, 1, P('Y', 10000)); T.sit(t, 2, P('Z', 1250));
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
const name = (i) => t.seats[i].name;
const first = t.hand.toAct; T.act(t, first, 'raise', 1000);
let nx = t.hand.toAct; if (name(nx) !== 'Z') { T.act(t, nx, 'call'); nx = t.hand.toAct; }
if (name(nx) === 'Z') T.act(t, nx, 'allin');
const after = t.hand.toAct; const ob = T.options(t, after);
check('短码全下不够最小加注：已行动的人只能跟注或弃牌', ob && ob.toCall === 250 && ob.canRaise === false && !T.act(t, after, 'raise', 3000).ok && T.act(t, after, 'call').ok);
// 6) 位置
t = T.createTable({ id: 'f', name: '9 人', size: 9 });
for (let i = 0; i < 9; i++) T.sit(t, i, P('p' + i, 5000));
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
const pos = T.positions(t); const seq = []; let i = t.hand.sb; for (let k = 0; k < 9; k++) { seq.push(pos[i]); i = (i + 1) % 9; }
check('9 人桌位置：' + seq.join(' '), seq.join(' ') === 'SB BB UTG EP EP MP MP CO BTN');
// 7) 离桌和删桌
t = T.createTable({ id: 'g', name: 'g', size: 4 });
['A', 'B', 'C'].forEach((n, k) => T.sit(t, k, P(n, 5000)));
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
const notTurn = t.hand.order.find((x) => x !== t.hand.toAct);
T.forfeit(t, notTurn);
check('不在轮次时离桌：算弃牌，牌局继续，记分守恒', t.hand.players[notTurn].folded && t.hand.street === 'preflop' && total(t) === 15000);
t = T.createTable({ id: 'h', name: 'h', size: 4 });
['A', 'B'].forEach((n, k) => T.sit(t, k, P(n, 5000)));
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
T.forfeit(t, t.hand.order.find((x) => x !== t.hand.toAct));
check('两人时一人离桌：另一人直接收分', t.hand.street === 'done' && total(t) === 10000);
t = T.createTable({ id: 'i', name: 'i', size: 3 });
['A', 'B', 'C'].forEach((n, k) => T.sit(t, k, P(n, 5000)));
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
guard = 0;
while (t.hand.street !== 'collect' && guard++ < 40) { const x = t.hand.toAct; const o = T.options(t, x); T.act(t, x, o.canCheck ? 'check' : 'call'); }
const leaver = t.hand.pots[0].elig[0];
T.forfeit(t, leaver);
check('收分时有人离桌：从池里去掉他，剩下的人继续选', t.hand.street === 'collect' && !t.hand.pots[0].elig.includes(leaver) && t.hand.pots[0].amount === 600);
t = T.createTable({ id: 'j', name: 'j', size: 3 });
['A', 'B', 'C'].forEach((n, k) => T.sit(t, k, P(n, 5000)));
T.startHand(t, { sb: 100, bb: 200, ante: 50 });
T.act(t, t.hand.toAct, 'raise', 1000);
T.abortHand(t);
check('删桌中止：投入全部退回', t.seats.filter(Boolean).every((s) => s.stack === 5000));
// 8) 压力测试：2 到 10 人桌，机器人出分、随机选赢家
const rng = T.makeRng(42); let hands = 0, maxSteps = 0, ok = true, illegal = 0, collects = 0, splits = 0; const sizes = new Set();
for (let g = 0; g < 200; g++) {
  const size = 2 + (g % 9); sizes.add(size);
  const tb = T.createTable({ id: 'g' + g, name: 'x', size });
  for (let k = 0; k < size; k++) T.sit(tb, k, P('p' + k, 2000 + Math.floor(rng() * 8000)));
  const start = total(tb);
  for (let n = 0; n < 10; n++) {
    if (!T.startHand(tb, { sb: 100, bb: 200, ante: 25 })) break;
    let steps = 0;
    while (tb.hand.street !== 'done') {
      if (tb.hand.street === 'collect') {
        collects++;
        const picks = T.botPicks(tb, rng);
        if (picks.some((p) => p.length > 1)) splits++;
        if (!T.award(tb, picks).ok) { ok = false; break; }
        continue;
      }
      const a = T.botAction(tb, tb.hand.toAct, rng);
      if (!T.act(tb, tb.hand.toAct, a.action, a.to).ok) { illegal++; const o = T.options(tb, tb.hand.toAct); T.act(tb, tb.hand.toAct, o.canCheck ? 'check' : 'fold'); }
      if (++steps > 400) throw new Error('牌局停不下来');
    }
    maxSteps = Math.max(maxSteps, steps); hands++;
    if (total(tb) !== start) { ok = false; console.log('不守恒', g, n); break; }
  }
}
check('机器人不会做出不合规则的动作', illegal === 0, `不合规则 ${illegal} 次`);
check(`压力测试：${hands} 手（${[...sizes].sort((a, b) => a - b).join('、')} 人桌），每手都结束，记分守恒`, ok && hands > 1500, `其中 ${collects} 手要选赢家，${splits} 手平分；单手最多 ${maxSteps} 步`);
console.log(fails ? `\n${fails} 项失败` : '\n全部通过');
process.exit(fails ? 1 : 0);
