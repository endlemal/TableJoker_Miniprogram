// 记分工具牌局引擎的测试：出分顺序、加注规则、弃牌后剩下的人收分、主池和边池、指定赢家（平手多选平分）和赢家收分、离桌和删桌，
// 以及 2 到 10 人桌的压力测试（每手都结束、记分守恒、机器人不做不合规则的动作）。
// 运行：node tools/tally-test.mjs（全部通过时退出码为 0）
const T = await import(new URL('../src/common/tally.js', import.meta.url).href);
const { playerStatus } = await import(new URL('../src/common/tally-labels.js', import.meta.url).href);
let fails = 0;
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log((ok ? '✓ ' : '✗ ') + name + (extra ? '  ' + extra : '')); };
const P = (name, stack) => ({ pid: name, name, stack });
// 桌上的记分 + 还没收走的桌面分
const unpaidSum = (t) => T.unpaid(t).reduce((a, u) => a + u.amount, 0);
const total = (t) => t.seats.reduce((a, s) => a + (s ? s.stack : 0), 0) + (!t.hand || t.hand.street === 'done' ? 0 : t.hand.street === 'payout' ? unpaidSum(t) : T.potTotal(t.hand));
const payAll = (t) => T.unpaid(t).forEach((u) => T.collect(t, u.k, u.seat));
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
check('弃牌：自动指定剩下的人为赢家，等他收分', t.hand.street === 'payout' && T.unpaid(t).length === 1 && T.unpaid(t)[0].seat === t.hand.bb && T.unpaid(t)[0].amount === 600, '桌面分 ' + T.unpaid(t)[0].amount);
check('别人不能收这个池', !T.collect(t, 0, t.hand.sb).ok);
check('赢家收分后这一手结束', T.collect(t, 0, t.hand.bb).ok && t.hand.street === 'done' && t.seats[t.hand.bb].stack === 10200 && t.seats[t.hand.sb].stack === 9800);
check('不能重复收分', !T.collect(t, 0, t.hand.bb).ok);
// 2) 四轮都过牌后进入收分，选赢家
t = T.createTable({ id: 'b', name: '2 号桌', size: 3 });
['X', 'Y', 'Z'].forEach((n, i) => T.sit(t, i, P(n, 5000)));
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
let guard = 0;
while (t.hand.street !== 'collect' && guard++ < 40) { const i = t.hand.toAct; const o = T.options(t, i); T.act(t, i, o.canCheck ? 'check' : 'call'); }
check('四轮出分后等主持人指定赢家：一个池，3 人有资格', t.hand.street === 'collect' && t.hand.pots.length === 1 && t.hand.pots[0].amount === 600 && t.hand.pots[0].elig.length === 3);
check('没选赢家不能收分', !T.award(t, []).ok);
const wrong = T.award(t, [[9]]);
check('选了不在池里的人会被拒绝', !wrong.ok, wrong.error);
const two = t.hand.pots[0].elig.slice(0, 2);
check('指定两人平手（多选）：各 300 分', T.designate(t, [two]).ok && t.hand.street === 'payout' && t.hand.pots[0].shares[two[0]] === 300 && t.hand.pots[0].shares[two[1]] === 300);
T.collect(t, 0, two[0]);
check('一人收分后桌面分倒数：600 → 300，这一手还没结束', t.hand.pots[0].left === 300 && t.hand.street === 'payout' && total(t) === 15000);
T.collect(t, 0, two[1]);
check('两人都收完：桌面分归零，这一手结束，记分不变', t.hand.pots[0].left === 0 && t.hand.street === 'done' && t.hand.result.won[two[0]] === 300 && total(t) === 15000);
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
check('主持人分别指定：主池给「短」，边池「中」「长」平手', T.designate(t, [[seatOf('短')], [seatOf('中'), seatOf('长')]]).ok);
check('「短」只能收主池，不能收边池', !T.collect(t, 1, seatOf('短')).ok && T.collect(t, 0, seatOf('短')).ok);
payAll(t);
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
check('一步到位（演示里没人操作时）：指定并收完', t.hand.street === 'done');
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
check('两人时一人离桌：另一人成为赢家，收分后结束', t.hand.street === 'payout' && (payAll(t), t.hand.street === 'done') && total(t) === 10000);
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
// 收分阶段离桌 / 删桌：赢了的照样收走
t = T.createTable({ id: 'k', name: 'k', size: 3 });
['A', 'B', 'C'].forEach((n, k) => T.sit(t, k, P(n, 5000)));
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
guard = 0;
while (t.hand.street !== 'collect' && guard++ < 40) { const x = t.hand.toAct; const o = T.options(t, x); T.act(t, x, o.canCheck ? 'check' : 'call'); }
const ws = t.hand.pots[0].elig.slice(0, 2);
T.designate(t, [ws]);
const s0 = t.seats[ws[0]].stack;
T.forfeit(t, ws[0]);
check('收分阶段赢家离桌：他那份自动收走', t.seats[ws[0]].stack === s0 + 300 && t.hand.street === 'payout');
T.abortHand(t);
check('收分阶段删桌：已指定的赢家照样拿到', t.hand.street === 'done' && total(t) === 15000);
// 动作记录（页面插入气泡弹幕用）
t = T.createTable({ id: 'm', name: 'm', size: 3 });
['A', 'B', 'C'].forEach((n, k) => T.sit(t, k, P(n, 5000)));
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
T.act(t, t.hand.toAct, 'raise', 600); T.act(t, t.hand.toAct, 'call'); T.act(t, t.hand.toAct, 'fold');
const kinds = t.hand.log.map((x) => x.kind + ':' + x.text + ':' + x.amount);
check('动作记录：盲注、加注、跟注都有，弃牌不算出分', JSON.stringify(kinds) === JSON.stringify(['blind:小盲:100', 'blind:大盲:200', 'bet:加注:600', 'bet:跟注:500']), JSON.stringify(kinds));
// 状态回归：余额为 0 的候场玩家不能和本手全下、尚未收分的赢家混为一谈。
t = T.createTable({ id: 'labels', name: '状态', size: 5 });
T.sit(t, 0, P('阿林', 0)); T.sit(t, 1, P('A', 1000)); T.sit(t, 2, P('B', 1000));
check('未开局的零分玩家显示无分', playerStatus(t.hand, t.seats[0], 0).label === '无分');
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
T.sit(t, 3, P('中途入座', 1000));
check('本手未参与：零分显示无分，有分的中途入座者显示候场', playerStatus(t.hand, t.seats[0], 0).label === '无分' && playerStatus(t.hand, t.seats[3], 3).label === '候场');
const allInSeat = t.hand.toAct;
check('当前行动者有独立状态', playerStatus(t.hand, t.seats[allInSeat], allInSeat).label === '行动');
T.act(t, allInSeat, 'allin');
check('本手全下后余额虽为零，仍显示全下', t.seats[allInSeat].stack === 0 && playerStatus(t.hand, t.seats[allInSeat], allInSeat).label === '全下');
const winningSeat = t.hand.toAct;
T.act(t, winningSeat, 'call');
T.designate(t, [[winningSeat]]);
check('零余额但尚未收分的赢家显示赢', t.seats[winningSeat].stack === 0 && playerStatus(t.hand, t.seats[winningSeat], winningSeat).label === '赢');
payAll(t);
check('全下输光并结算后才显示无分', t.hand.street === 'done' && playerStatus(t.hand, t.seats[allInSeat], allInSeat).label === '无分');
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
check('候场玩家进入下一手后不再显示候场，零分玩家仍不入局', !!t.hand.players[3] && playerStatus(t.hand, t.seats[3], 3).label !== '候场' && !t.hand.players[allInSeat] && playerStatus(t.hand, t.seats[allInSeat], allInSeat).label === '无分');
// 实时分池：全下上限立即划开主池 / 边池，待跟金额包含在对应边池内，跨轮保持。
t = T.createTable({ id: 'live', name: '实时边池', size: 3 });
[1000, 5000, 5000].forEach((stack, k) => T.sit(t, k, P('p' + k, stack)));
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
check('没有全下时，普通盲注不生成边池标签', T.livePots(t.hand).length === 0);
T.act(t, 0, 'allin');
check('刚全下但未跟齐，主池只统计已投入', JSON.stringify(T.livePots(t.hand).map((p) => [p.kind, p.amount])) === '[["main",1300]]');
T.act(t, 1, 'call'); T.act(t, 2, 'call');
const shape = () => JSON.stringify(T.livePots(t.hand).map((p) => [p.kind, p.amount]));
check('短码全下跟齐后主池 3000，进入翻牌仍保留', t.hand.street === 'flop' && shape() === '[["main",3000]]');
T.act(t, 1, 'raise', 500);
const beforePreview = JSON.stringify(t.hand);
check('下一轮先下注即分池：主池 3000，边池 500（含待跟 500）', shape() === '[["main",3000],["side",500]]' && T.livePots(t.hand)[1].pending === 500);
check('实时分池不改动牌局或正式结算池', JSON.stringify(t.hand) === beforePreview && t.hand.pots === null);
T.act(t, 2, 'call');
check('另一人跟注后边池增至 1000，待跟清零，跨到转牌不清空', t.hand.street === 'turn' && shape() === '[["main",3000],["side",1000]]' && T.livePots(t.hand)[1].pending === 0);
T.act(t, 1, 'check'); T.act(t, 2, 'raise', 1000);
check('再次加注立即更新边池 2000，其中待跟 1000', shape() === '[["main",3000],["side",2000]]' && T.livePots(t.hand)[1].pending === 1000);
T.act(t, 1, 'call');
const lastPreview = T.livePots(t.hand).map((p) => p.amount);
T.act(t, 1, 'check'); T.act(t, 2, 'check');
check('最后一轮跟齐后，实时池与结算池金额一致', t.hand.street === 'collect' && JSON.stringify(lastPreview) === JSON.stringify(t.hand.pots.map((p) => p.amount)));
const snapshot = (spec) => ({ street: 'flop', order: spec.map((_, i) => i), players: Object.fromEntries(spec.map(([committed, allIn = false, folded = false], i) => [i, { committed, allIn, folded, bet: 0 }])) });
const multi = snapshot([[100, true], [200, true], [400], [400], [150, false, true]]);
check('多人短码全下与弃牌死钱：主池 500，边池 350 / 400', JSON.stringify(T.livePots(multi).map((p) => p.amount)) === '[500,350,400]');
const anteOnly = snapshot([[25, true], [225], [225]]);
check('只够前注的全下也以累计投入封顶：75 / 400', JSON.stringify(T.livePots(anteOnly).map((p) => p.amount)) === '[75,400]');
const foldedExcess = snapshot([[100, true], [200], [200], [900, false, true]]);
check('弃牌者超额不当作待跟或丢失：400 / 1000', JSON.stringify(T.livePots(foldedExcess).map((p) => [p.kind, p.amount])) === '[["main",400],["side",1000]]');
const growing = snapshot([[100, true], [200, true], [500], [350]]);
check('多个全下上限立刻形成多级边池，最上层含未跟齐金额', JSON.stringify(T.livePots(growing).map(p => [p.amount, p.pending])) === '[[400,0],[300,0],[450,150]]');
t = T.createTable({ id: 'flop-cap', name: '翻牌全下', size: 3 });
[5000, 900, 5000].forEach((stack, k) => T.sit(t, k, P('p' + k, stack)));
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
T.act(t, 0, 'call'); T.act(t, 1, 'call'); T.act(t, 2, 'check');
T.act(t, 1, 'allin'); T.act(t, 2, 'raise', 1400);
check('翻牌全下后再次加注，未定胜即划出主池与边池', t.hand.street === 'flop' && t.hand.pots === null && JSON.stringify(T.livePots(t.hand).map(p => [p.amount, p.pending])) === '[[2000,0],[700,700]]');
T.act(t, 0, 'call');
check('后续跟注同时补足主池和边池，跨街仍保持全下上限', t.hand.street === 'turn' && JSON.stringify(T.livePots(t.hand).map(p => [p.amount, p.pending])) === '[[2700,0],[1400,0]]');
// 动作动画必须包含零出分动作，且最后一个 CHECK 换街后仍能知道原下注值。
t = T.createTable({ id: 'fx', name: '动作', size: 3 });
[1000, 3000, 3000].forEach((stack, k) => T.sit(t, k, P('p' + k, stack)));
T.startHand(t, { sb: 100, bb: 200, ante: 0 });
T.act(t, 0, 'call'); T.act(t, 1, 'call'); T.act(t, 2, 'check');
check('换街动作保留前一轮下注快照', t.hand.street === 'flop' && t.hand.actions[2].kind === 'check' && t.hand.actions[2].bet === 200 && t.hand.players[2].bet === 0);
T.act(t, 1, 'check'); T.act(t, 2, 'check'); T.act(t, 0, 'check');
check('连续 CHECK 逐次记录，支持每次重播', t.hand.actions.filter(a => a.kind === 'check').length === 4);
const countBeforeInvalid = t.hand.actions.length;
T.act(t, 0, 'raise', 1);
check('被拒绝的动作不播放动画', t.hand.actions.length === countBeforeInvalid);
T.act(t, 1, 'raise', 1000); T.act(t, 2, 'fold'); T.act(t, 0, 'call');
check('弃牌和被动跟注全下正确标识', t.hand.actions.at(-2).kind === 'fold' && t.hand.actions.at(-1).kind === 'allin');
// 8) 压力测试：2 到 10 人桌，机器人出分、随机选赢家
const rng = T.makeRng(42); let hands = 0, maxSteps = 0, ok = true, illegal = 0, collects = 0, splits = 0, liveValid = true, previews = 0; const sizes = new Set();
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
        if (!T.designate(tb, picks).ok) { ok = false; break; }
        continue;
      }
      if (tb.hand.street === 'payout') {
        const u = T.unpaid(tb);
        const pick = u[Math.floor(rng() * u.length)];
        if (!T.collect(tb, pick.k, pick.seat).ok) { ok = false; break; }
        if (total(tb) !== start) { ok = false; console.log('收分途中不守恒', g, n); break; }
        continue;
      }
      const preview = T.livePots(tb.hand);
      if (preview.length) {
        previews++;
        if (preview.some((p) => p.amount <= 0) || preview.reduce((s, p) => s + p.amount, 0) !== T.potTotal(tb.hand)) liveValid = false;
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
check('下注中主池与边池之和始终等于桌面分（待跟不重复计入）', liveValid && previews > 0, `${previews} 次实时分池`);
check(`压力测试：${hands} 手（${[...sizes].sort((a, b) => a - b).join('、')} 人桌），每手都结束，记分守恒`, ok && hands > 1500, `其中 ${collects} 手要选赢家，${splits} 手平分；单手最多 ${maxSteps} 步`);
// 调座（主持人调整座位顺序）：只能在两手之间；按新顺序坐好，空位在后；庄位跟着原来坐庄的人
{
  const tb = T.createTable({ id: 'arr', name: 'x', size: 6 });
  ['A', 'B', 'C', 'D'].forEach((n, i) => T.sit(tb, i, P(n, 5000)));
  T.startHand(tb, { sb: 100, bb: 200, ante: 0 });
  const btnName = tb.seats[tb.button].name;
  check('调座：这一手进行中不能调', T.reorderSeats(tb, ['D', 'C', 'B', 'A']) === false);
  T.abortHand(tb);
  check('调座：两手之间可以调，按新顺序坐好、空位在后', T.reorderSeats(tb, ['D', 'C', 'B', 'A']) && tb.seats.map((x) => x && x.name).join(',') === 'D,C,B,A,,');
  check('调座：庄位跟着原来坐庄的人', tb.seats[tb.button].name === btnName);
  check('调座：漏写的人排在后面', T.reorderSeats(tb, ['B']) && tb.seats.map((x) => x && x.name).join(',') === 'B,D,C,A,,');
  check('调座：之后能正常开下一手', T.startHand(tb, { sb: 100, bb: 200, ante: 0 }) && tb.hand.street === 'preflop');
}
console.log(fails ? `\n${fails} 项失败` : '\n全部通过');
process.exit(fails ? 1 : 0);
