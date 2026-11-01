// 记分工具的牌局引擎：不发牌、不比牌，只管出分和收分（牌在桌上用实体牌）。
// 前注和盲注、按顺序出分（弃牌 / 过牌 / 跟注 / 加注 / 全下）、最小加注规则、四轮出分（翻牌前 / 翻牌 / 转牌 / 河牌）；
// 出分结束后进入收分，分两步：主持人指定每个池的赢家（designate，平手可以多选平分；只有一人有资格的池自动指定），
// 然后每位赢家收取自己那份（collect）。所有池都收完，这一手结束。
// 纯逻辑，不依赖页面：房间页负责显示，演示里其他玩家的行动由 botAction / botPicks 给出。正式环境由服务端跑同样的规则

export const ROUND_NAME = { preflop: '翻前', flop: '翻牌', turn: '转牌', river: '河牌', collect: '定胜', payout: '收分', done: '结束' }

// 可以传种子的随机数（mulberry32），测试时结果可复现
export function makeRng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------- 牌桌 ---------- */
export function createTable({ id, name, size }) {
  const n = Math.max(2, Math.min(10, size | 0))
  return { id, name, size: n, seats: Array(n).fill(null), button: -1, hand: null, handNo: 0 }
}
export function sit(t, idx, player) {
  if (idx < 0 || idx >= t.size || t.seats[idx]) return false
  t.seats[idx] = { ...player }
  return true
}
const activeSeats = (t) => t.seats.map((s, i) => (s && s.stack > 0 ? i : -1)).filter((i) => i >= 0)
// 从 from 之后（不含）顺时针找下一个满足条件的座位
function nextSeat(t, from, ok) {
  for (let k = 1; k <= t.size; k++) {
    const i = (from + k + t.size) % t.size
    if (ok(i)) return i
  }
  return -1
}
// 位置：从小盲开始依次是 SB、BB、UTG、EP…、MP…、CO、BTN；两人桌时庄位就是小盲
export function positions(t) {
  const h = t.hand
  if (!h) return {}
  const order = []
  let i = h.sb
  for (let k = 0; k < h.order.length; k++) { order.push(i); i = nextSeat(t, i, (x) => h.order.includes(x)) }
  const out = {}
  if (order.length === 2) { out[h.sb] = 'SB'; out[h.bb] = 'BB'; return out }
  const rest = order.slice(2) // UTG ... BTN
  const k = rest.length
  rest.forEach((seat, j) => {
    let lab
    if (j === k - 1) lab = 'BTN'
    else if (j === k - 2) lab = 'CO'
    else if (j === 0) lab = 'UTG'
    else lab = j <= (k - 3) / 2 ? 'EP' : 'MP'
    out[seat] = lab
  })
  out[order[0]] = 'SB'
  out[order[1]] = 'BB'
  return out
}
function pay(h, i, amount) {
  const p = h.players[i]
  const seat = h.seatRef[i]
  const a = Math.max(0, Math.min(amount, seat.stack))
  seat.stack -= a
  p.bet += a
  p.committed += a
  if (seat.stack === 0) p.allIn = true
  return a
}
// 开一手：至少两人有记分。blinds：{ sb, bb, ante }（跟着房间当前的盲注级别）
export function startHand(t, blinds) {
  const act = activeSeats(t)
  if (act.length < 2 || (t.hand && t.hand.street !== 'done')) return false
  const button = nextSeat(t, t.button, (i) => act.includes(i))
  t.button = button
  t.handNo += 1
  const heads = act.length === 2
  const sb = heads ? button : nextSeat(t, button, (i) => act.includes(i))
  const bb = nextSeat(t, sb, (i) => act.includes(i))
  const players = {}
  const seatRef = {}
  act.forEach((i) => { players[i] = { bet: 0, committed: 0, folded: false, allIn: false, acted: false, last: '' }; seatRef[i] = t.seats[i] })
  const h = { street: 'preflop', players, seatRef, order: act, button, sb, bb, toAct: -1, currentBet: 0, minRaise: blinds.bb, blinds: { ...blinds }, pots: null, result: null, log: [] }
  t.hand = h
  // 前注是死注：算进桌面分，不算本轮的出分
  if (blinds.ante > 0) act.forEach((i) => { const a = pay(h, i, blinds.ante); players[i].bet -= a })
  pay(h, sb, blinds.sb); players[sb].last = '小盲'
  pay(h, bb, blinds.bb); players[bb].last = '大盲'
  h.log.push({ seat: sb, kind: 'blind', text: '小盲', amount: players[sb].bet }, { seat: bb, kind: 'blind', text: '大盲', amount: players[bb].bet })
  h.currentBet = Math.max(players[sb].bet, players[bb].bet)
  // 翻牌前：大盲之后的人先出分（两人桌是小盲 = 庄位先说）
  h.toAct = nextSeat(t, bb, (i) => canAct(h, i))
  if (h.toAct < 0 || onlyOneCanAct(h)) toCollect(t)
  return true
}
const live = (h) => h.order.filter((i) => !h.players[i].folded)
const canAct = (h, i) => h.players[i] && !h.players[i].folded && !h.players[i].allIn
const onlyOneCanAct = (h) => live(h).filter((i) => !h.players[i].allIn).length <= 1 && live(h).every((i) => h.players[i].allIn || h.players[i].bet >= h.currentBet)

// 现在轮到的人可以做什么：toCall 要跟多少；minTo / maxTo 是加注到多少的范围（本轮的总出分）
export function options(t, i) {
  const h = t.hand
  if (!h || h.toAct !== i || !ROUNDS.includes(h.street)) return null
  const p = h.players[i]
  const stack = h.seatRef[i].stack
  const toCall = Math.min(h.currentBet - p.bet, stack)
  const maxTo = p.bet + stack
  const minTo = Math.min(h.currentBet + h.minRaise, maxTo)
  // 已经行动过、后来只遇到不够最小加注的全下：行动没有被重新打开，只能跟注或弃牌
  return { toCall, canCheck: toCall === 0, canRaise: maxTo > h.currentBet && !p.acted, minTo, maxTo, pot: potTotal(h), stack }
}
const ROUNDS = ['preflop', 'flop', 'turn', 'river']
export const potTotal = (h) => (h ? h.order.reduce((a, i) => a + h.players[i].committed, 0) : 0)

// 下注中的实时分池：仅在有人全下后按其「本手累计投入」封顶；普通加注不制造边池。
// 尚无人跟上的超额单列为 pending，不混进已形成的边池，也不改动结算用的 h.pots。
export function livePots(h) {
  if (!h || !ROUNDS.includes(h.street)) return []
  const contrib = h.order.map((i) => ({ ...h.players[i], c: h.players[i].committed }))
  const allIns = contrib.filter((p) => p.allIn && !p.folded)
  if (!allIns.length) return []
  const sorted = contrib.slice().sort((a, b) => b.c - a.c)
  const firstCap = Math.min(...allIns.map((p) => p.c))
  const pending = sorted[0].folded ? 0 : Math.max(0, sorted[0].c - Math.max(firstCap, sorted[1]?.c || 0))
  sorted[0].c -= pending
  const cap = Math.max(0, ...contrib.filter((p) => !p.folded).map((p) => p.c))
  const levels = [...new Set([...allIns.map((p) => p.c).filter((c) => c > 0 && c < cap), cap])].sort((a, b) => a - b)
  const pots = []
  let prev = 0
  levels.forEach((lv, k) => {
    let amount = contrib.reduce((sum, p) => sum + Math.max(0, Math.min(p.c, lv) - prev), 0)
    // 弃牌者的投入仍归牌池；超出最高存活玩家的部分归最上层池。
    if (k === levels.length - 1) amount += contrib.reduce((sum, p) => sum + Math.max(0, p.c - lv), 0)
    if (amount) pots.push({ kind: pots.length ? 'side' : 'main', amount, cap: lv })
    prev = lv
  })
  if (pending) pots.push({ kind: 'pending', amount: pending })
  return pots
}

// 出分：fold 弃牌 / check 过牌 / call 跟注 / raise 加注到 to（本轮总出分）/ allin 全下
export function act(t, i, action, to) {
  const h = t.hand
  if (!h || !ROUNDS.includes(h.street)) return { ok: false, error: '现在不能出分' }
  if (h.toAct !== i) return { ok: false, error: '还没轮到你' }
  const p = h.players[i]
  const o = options(t, i)
  const before = p.committed
  if (action === 'fold') { p.folded = true; p.last = '弃牌' }
  else if (action === 'check') {
    if (!o.canCheck) return { ok: false, error: '需要跟注或弃牌' }
    p.last = '过牌'
  } else if (action === 'call') {
    if (o.toCall === 0) p.last = '过牌'
    else { pay(h, i, o.toCall); p.last = p.allIn ? '全下' : '跟注' }
  } else if (action === 'raise' || action === 'allin') {
    const target = action === 'allin' ? o.maxTo : Math.round(to)
    if (!o.canRaise && target > h.currentBet) return { ok: false, error: '不能再加注，只能跟注或弃牌' }
    if (action === 'raise' && (target < o.minTo || target > o.maxTo)) return { ok: false, error: `加注到 ${o.minTo} 到 ${o.maxTo} 之间` }
    const raiseBy = target - h.currentBet
    pay(h, i, target - p.bet)
    if (target > h.currentBet) {
      // 完整加注才重新打开行动；全下但不够最小加注，只抬高跟注额
      if (raiseBy >= h.minRaise) {
        h.minRaise = raiseBy
        h.order.forEach((x) => { if (x !== i && canAct(h, x)) h.players[x].acted = false })
      }
      h.currentBet = target
      p.last = p.allIn ? '全下' : '加注'
    } else p.last = p.allIn ? '全下' : '跟注'
  } else return { ok: false, error: '不认识的动作' }
  p.acted = true
  // 出分了（跟注、加注、全下）就记一笔，页面会把它插进气泡弹幕
  const paid = p.committed - before
  if (paid > 0) h.log.push({ seat: i, kind: 'bet', text: p.last, amount: paid, to: p.bet })
  advance(t, i)
  return { ok: true }
}
const roundDone = (h) => h.order.every((x) => !canAct(h, x) || (h.players[x].acted && h.players[x].bet === h.currentBet))
function advance(t, from) {
  const h = t.hand
  if (live(h).length === 1) return toCollect(t)
  if (!roundDone(h)) {
    h.toAct = nextSeat(t, from, (x) => canAct(h, x) && (!h.players[x].acted || h.players[x].bet < h.currentBet))
    if (h.toAct >= 0) return
  }
  nextRound(t)
}
function nextRound(t) {
  const h = t.hand
  h.order.forEach((x) => { h.players[x].bet = 0; h.players[x].acted = false })
  h.currentBet = 0
  h.minRaise = h.blinds.bb
  if (h.street === 'river') return toCollect(t)
  h.street = ROUNDS[ROUNDS.indexOf(h.street) + 1]
  // 只剩一个人（或没人）还能出分：后面几轮不用出分了，直接收分
  if (live(h).filter((x) => !h.players[x].allIn).length <= 1) return toCollect(t)
  h.toAct = nextSeat(t, h.button, (x) => canAct(h, x))
}

/* ---------- 收分 ---------- */
// 按每人投入分池：每一层投入额是一个池，有资格的是没弃牌、投入到这一层的人
function computePots(h) {
  const contrib = h.order.map((i) => ({ i, c: h.players[i].committed, live: !h.players[i].folded }))
  const levels = [...new Set(contrib.filter((x) => x.live).map((x) => x.c))].sort((a, b) => a - b)
  const pots = []
  let prev = 0
  levels.forEach((lv, k) => {
    let amount = contrib.reduce((a, x) => a + Math.max(0, Math.min(x.c, lv) - prev), 0)
    // 最后一个池：比最高的活人投入还多的部分（弃牌的人多出的）也算进来
    if (k === levels.length - 1) amount += contrib.reduce((a, x) => a + Math.max(0, x.c - lv), 0)
    const elig = contrib.filter((x) => x.live && x.c >= lv).map((x) => x.i)
    prev = lv
    if (amount) pots.push({ amount, elig, winners: elig.length === 1 ? elig.slice() : null })
  })
  return pots
}
// 出分结束：分好池；只有一人有资格的池（比如只剩一人没弃牌、或者没人跟的那部分）自动指定给他。都自动指定了就直接进入收分
function toCollect(t) {
  const h = t.hand
  h.street = 'collect'
  h.toAct = -1
  h.pots = computePots(h)
  if (h.pots.every((p) => p.winners)) designate(t, h.pots.map((p) => p.winners))
}
// 还要指定赢家的池（下标）
export const pendingPots = (t) => (t.hand && t.hand.street === 'collect' ? t.hand.pots.map((p, k) => (p.winners ? -1 : k)).filter((k) => k >= 0) : [])
// 第一步：指定赢家。picks[k] 是第 k 个池的赢家（座位号数组，平手可以多选平分）；只有一人有资格的池可以不填
export function designate(t, picks) {
  const h = t.hand
  if (!h || h.street !== 'collect') return { ok: false, error: '现在不能指定赢家' }
  for (let k = 0; k < h.pots.length; k++) {
    const p = h.pots[k]
    const w = (picks && picks[k] && picks[k].length ? picks[k] : p.winners) || []
    if (!w.length) return { ok: false, error: `还没指定${k === 0 ? '主池' : '边池 ' + k}的赢家` }
    if (w.some((i) => !p.elig.includes(i))) return { ok: false, error: '赢家要在这个池里' }
  }
  h.pots = h.pots.map((p, k) => {
    const w = [...new Set(picks && picks[k] && picks[k].length ? picks[k] : p.winners)]
    // 平分；除不尽的从庄位左边开始依次多给 1
    const byPos = w.slice().sort((a, b) => ((a - h.button + t.size) % t.size) - ((b - h.button + t.size) % t.size))
    const each = Math.floor(p.amount / byPos.length)
    let rest = p.amount - each * byPos.length
    const shares = {}
    byPos.forEach((i) => { shares[i] = each + (rest > 0 ? 1 : 0); if (rest > 0) rest-- })
    return { ...p, winners: byPos, shares, taken: {}, left: p.amount }
  })
  h.street = 'payout'
  return { ok: true }
}
// 第二步：赢家收取自己在第 k 个池的那份；所有池都收完，这一手结束
export function collect(t, k, seat) {
  const h = t.hand
  if (!h || h.street !== 'payout') return { ok: false, error: '现在不能收分' }
  const p = h.pots[k]
  if (!p || !p.shares[seat]) return { ok: false, error: '这个池不是你赢的' }
  if (p.taken[seat]) return { ok: false, error: '已经收过了' }
  h.seatRef[seat].stack += p.shares[seat]
  p.taken = { ...p.taken, [seat]: true }
  p.left -= p.shares[seat]
  h.log.push({ seat, kind: 'collect', text: '收分', amount: p.shares[seat], pot: k, potCount: h.pots.length })
  if (h.pots.every((x) => x.left === 0)) finish(t)
  return { ok: true }
}
// 还没收的份额：[{ k, seat, amount }]
export const unpaid = (t) => (t.hand && t.hand.street === 'payout' ? t.hand.pots.flatMap((p, k) => Object.keys(p.shares).map(Number).filter((i) => !p.taken[i]).map((i) => ({ k, seat: i, amount: p.shares[i] }))) : [])
function finish(t) {
  const h = t.hand
  const won = {}
  h.pots.forEach((p) => Object.keys(p.shares).forEach((i) => { won[i] = (won[i] || 0) + p.shares[i] }))
  const delta = {}
  h.order.forEach((i) => { delta[i] = (won[i] || 0) - h.players[i].committed })
  h.result = { pots: h.pots.map((p) => ({ amount: p.amount, elig: p.elig, winners: p.winners })), won, delta }
  h.street = 'done'
}
// 一步到位：指定赢家并让所有赢家收分（测试、演示里没人操作时用）
export function award(t, picks) {
  const r = designate(t, picks)
  if (!r.ok) return r
  unpaid(t).forEach((u) => collect(t, u.k, u.seat))
  return { ok: true }
}
// 离桌（或被移出）：本手还没弃牌的算弃牌；出分时轮到他就交给下一位；收分时从各个池里去掉他的资格
export function forfeit(t, i) {
  const h = t.hand
  if (!h || h.street === 'done' || !h.players[i] || h.players[i].folded) return
  if (h.street === 'payout') { unpaid(t).filter((u) => u.seat === i).forEach((u) => collect(t, u.k, u.seat)); return }
  h.players[i].folded = true
  h.players[i].last = '离桌'
  if (h.street === 'collect') {
    if (live(h).length === 0) return abortHand(t)
    h.pots = computePots(h)
    if (h.pots.every((p) => p.winners)) designate(t, h.pots.map((p) => p.winners))
    return
  }
  if (h.toAct === i) return advance(t, i)
  if (live(h).length === 1) toCollect(t)
}
// 中止这一手（比如主持人删桌）：每人投入的记分原样退回
export function abortHand(t) {
  const h = t.hand
  if (!h || h.street === 'done') return
  if (h.street === 'payout') { unpaid(t).forEach((u) => collect(t, u.k, u.seat)); return }
  h.order.forEach((i) => { h.seatRef[i].stack += h.players[i].committed; h.players[i].committed = 0; h.players[i].bet = 0 })
  h.street = 'done'
  h.toAct = -1
  h.result = null
}

/* ---------- 演示用：其他玩家随机出分；没人选赢家时随机选（偶尔两人平分） ---------- */
export function botAction(t, i, rng = Math.random) {
  const h = t.hand
  const o = options(t, i)
  if (!o) return null
  const roll = rng()
  const bump = (v) => Math.min(o.maxTo, Math.max(o.minTo, Math.round(v / 50) * 50))
  if (o.canCheck) {
    if (o.canRaise && roll < 0.2) return { action: 'raise', to: bump(h.currentBet + o.pot * 0.5) }
    return { action: 'check' }
  }
  const pressure = o.toCall / (o.pot + o.toCall)
  if (o.canRaise && roll < 0.08) return { action: 'raise', to: bump(h.currentBet * 2) }
  if (roll < 0.78 - pressure * 0.6) return { action: 'call' }
  return { action: 'fold' }
}
export function botPicks(t, rng = Math.random) {
  const h = t.hand
  return h.pots.map((p) => {
    if (p.winners) return p.winners
    const a = p.elig[Math.floor(rng() * p.elig.length)]
    if (p.elig.length > 1 && rng() < 0.15) {
      const others = p.elig.filter((x) => x !== a)
      return [a, others[Math.floor(rng() * others.length)]]
    }
    return [a]
  })
}
