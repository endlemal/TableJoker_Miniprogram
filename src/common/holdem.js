// 经典德扑（无限注德州扑克）牌局引擎：发牌、前注和盲注、按顺序出分（下注）、翻牌 / 转牌 / 河牌、摊牌比大小、主池和边池。
// 纯逻辑，不依赖页面：房间页负责显示，演示里其他玩家的行动由 botAction 给出。正式环境由服务端跑同样的规则，前端只提交动作。
// 牌用 { r, s } 表示：r 是点数 0（2）到 12（A），s 是花色 s ♠ / h ♥ / d ♦ / c ♣

export const RANK_TEXT = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
export const SUITS = ['s', 'h', 'd', 'c']
export const CAT_NAME = ['高牌', '一对', '两对', '三条', '顺子', '同花', '葫芦', '四条', '同花顺']

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
export function newDeck(rng = Math.random) {
  const d = []
  for (const s of SUITS) for (let r = 0; r < 13; r++) d.push({ r, s })
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = d[i]; d[i] = d[j]; d[j] = t }
  return d
}

/* ---------- 牌型：5 张牌的分值（数组，按字典序比大小），7 张里选最好的 5 张 ---------- */
function straightHigh(ranks) {
  // ranks：去重后从大到小；A 也可以当 1 用（A-2-3-4-5，最大是 5）
  const u = [...new Set(ranks)]
  if (u.includes(12)) u.push(-1)
  for (let i = 0; i + 4 < u.length; i++) if (u[i] - u[i + 4] === 4) return u[i]
  return -2
}
export function score5(cards) {
  const ranks = cards.map((c) => c.r).sort((a, b) => b - a)
  const flush = cards.every((c) => c.s === cards[0].s)
  const sh = straightHigh(ranks)
  const cnt = {}
  ranks.forEach((r) => { cnt[r] = (cnt[r] || 0) + 1 })
  // 按（张数，点数）排序：比如葫芦 = [三条的点数, 对子的点数]
  const groups = Object.keys(cnt).map(Number).sort((a, b) => cnt[b] - cnt[a] || b - a)
  const shape = groups.map((r) => cnt[r])
  if (flush && sh >= 3) return [8, sh]
  if (shape[0] === 4) return [7, groups[0], groups[1]]
  if (shape[0] === 3 && shape[1] === 2) return [6, groups[0], groups[1]]
  if (flush) return [5, ...ranks]
  if (sh >= 3) return [4, sh]
  if (shape[0] === 3) return [3, groups[0], ...groups.slice(1)]
  if (shape[0] === 2 && shape[1] === 2) return [2, groups[0], groups[1], groups[2]]
  if (shape[0] === 2) return [1, groups[0], ...groups.slice(1)]
  return [0, ...ranks]
}
export function compareScore(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? -1) - (b[i] ?? -1)
    if (d) return d > 0 ? 1 : -1
  }
  return 0
}
export function evaluate(cards) {
  let best = null
  const n = cards.length
  const pick = (start, chosen) => {
    if (chosen.length === 5) {
      const sc = score5(chosen)
      if (!best || compareScore(sc, best.score) > 0) best = { score: sc, cards: chosen.slice() }
      return
    }
    for (let i = start; i < n; i++) { chosen.push(cards[i]); pick(i + 1, chosen); chosen.pop() }
  }
  if (n < 5) return { score: [-1], cat: -1, name: '' }
  pick(0, [])
  return { ...best, cat: best.score[0], name: CAT_NAME[best.score[0]] }
}

/* ---------- 牌桌 ---------- */
export function createTable({ id, name, size }) {
  const n = Math.max(2, Math.min(10, size | 0))
  return { id, name, size: n, seats: Array(n).fill(null), button: -1, hand: null, handNo: 0, last: null }
}
export function sit(t, idx, player) {
  if (idx < 0 || idx >= t.size || t.seats[idx]) return false
  t.seats[idx] = { ...player }
  return true
}
export function leave(t, idx) {
  const h = t.hand
  if (h && h.players[idx] && !h.players[idx].folded && h.street !== 'done') return false // 牌局里要先弃牌
  t.seats[idx] = null
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
  const n = order.length
  const out = {}
  if (n === 2) { out[h.sb] = 'SB'; out[h.bb] = 'BB'; return out }
  const rest = order.slice(2) // UTG ... BTN
  const k = rest.length
  rest.forEach((seat, j) => {
    let lab
    if (j === k - 1) lab = 'BTN'
    else if (j === k - 2 && k >= 2) lab = 'CO'
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
// 开一手牌：至少两人有记分。blinds：{ sb, bb, ante }（跟着房间当前的盲注级别）
export function startHand(t, blinds, rng = Math.random) {
  const act = activeSeats(t)
  if (act.length < 2 || (t.hand && t.hand.street !== 'done')) return false
  const button = nextSeat(t, t.button, (i) => act.includes(i))
  t.button = button
  t.handNo += 1
  const heads = act.length === 2
  const sb = heads ? button : nextSeat(t, button, (i) => act.includes(i))
  const bb = nextSeat(t, sb, (i) => act.includes(i))
  const deck = newDeck(rng)
  const players = {}
  const seatRef = {}
  act.forEach((i) => { players[i] = { cards: [], bet: 0, committed: 0, folded: false, allIn: false, acted: false, last: '' }; seatRef[i] = t.seats[i] })
  const h = { street: 'preflop', board: [], deck, players, seatRef, order: act, button, sb, bb, toAct: -1, currentBet: 0, minRaise: blinds.bb, blinds: { ...blinds }, result: null }
  t.hand = h
  // 发两张：从小盲开始，每人一张，两轮
  for (let round = 0; round < 2; round++) {
    let i = sb
    for (let k = 0; k < act.length; k++) { players[i].cards.push(deck.pop()); i = nextSeat(t, i, (x) => act.includes(x)) }
  }
  // 前注是死注：算进底池，不算本轮的出分
  if (blinds.ante > 0) act.forEach((i) => { const a = pay(h, i, blinds.ante); players[i].bet -= a })
  pay(h, sb, blinds.sb); players[sb].last = '小盲'
  pay(h, bb, blinds.bb); players[bb].last = '大盲'
  h.currentBet = Math.max(players[sb].bet, players[bb].bet)
  // 翻牌前：大盲之后的人先说话（两人桌是小盲 = 庄位先说）
  h.toAct = nextSeat(t, bb, (i) => canAct(h, i))
  if (h.toAct < 0 || onlyOneCanAct(h)) runOut(t)
  return true
}
const live = (h) => h.order.filter((i) => !h.players[i].folded)
const canAct = (h, i) => h.players[i] && !h.players[i].folded && !h.players[i].allIn
const onlyOneCanAct = (h) => live(h).filter((i) => !h.players[i].allIn).length <= 1 && live(h).every((i) => h.players[i].allIn || h.players[i].bet >= h.currentBet)

// 现在轮到的人可以做什么：toCall 要跟多少；minTo / maxTo 是加注到多少的范围（本轮的总出分）
export function options(t, i) {
  const h = t.hand
  if (!h || h.street === 'done' || h.toAct !== i) return null
  const p = h.players[i]
  const stack = h.seatRef[i].stack
  const toCall = Math.min(h.currentBet - p.bet, stack)
  const maxTo = p.bet + stack
  const minTo = Math.min(h.currentBet + h.minRaise, maxTo)
  // 已经行动过、后来只遇到不够最小加注的全下：行动没有被重新打开，只能跟注或弃牌
  return { toCall, canCheck: toCall === 0, canRaise: maxTo > h.currentBet && !p.acted, minTo, maxTo, pot: potTotal(h), stack }
}
export const potTotal = (h) => (h ? h.order.reduce((a, i) => a + h.players[i].committed, 0) : 0)

// 行动：fold 弃牌 / check 过牌 / call 跟注 / raise 加注到 to（本轮总出分）/ allin 全下
export function act(t, i, action, to) {
  const h = t.hand
  if (!h || h.street === 'done') return { ok: false, error: '现在没有牌局' }
  if (h.toAct !== i) return { ok: false, error: '还没轮到你' }
  const p = h.players[i]
  const o = options(t, i)
  if (action === 'fold') { p.folded = true; p.last = '弃牌' }
  else if (action === 'check') {
    if (!o.canCheck) return { ok: false, error: '需要跟注或弃牌' }
    p.last = '过牌'
  } else if (action === 'call') {
    if (o.toCall === 0) { p.last = '过牌' } else { pay(h, i, o.toCall); p.last = p.allIn ? '全下' : '跟注' }
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
    } else {
      p.last = p.allIn ? '全下' : '跟注'
    }
  } else return { ok: false, error: '不认识的动作' }
  p.acted = true
  advance(t, i)
  return { ok: true }
}
function roundDone(h) {
  return h.order.every((x) => !canAct(h, x) || (h.players[x].acted && h.players[x].bet === h.currentBet))
}
function advance(t, from) {
  const h = t.hand
  if (live(h).length === 1) return settle(t)
  if (!roundDone(h)) {
    h.toAct = nextSeat(t, from, (x) => canAct(h, x) && (!h.players[x].acted || h.players[x].bet < h.currentBet))
    if (h.toAct >= 0) return
  }
  nextStreet(t)
}
function nextStreet(t) {
  const h = t.hand
  h.order.forEach((x) => { h.players[x].bet = 0; h.players[x].acted = false })
  h.currentBet = 0
  h.minRaise = h.blinds.bb
  if (h.street === 'river') return settle(t)
  const n = h.street === 'preflop' ? 3 : 1
  h.deck.pop() // 烧一张
  for (let k = 0; k < n; k++) h.board.push(h.deck.pop())
  h.street = h.street === 'preflop' ? 'flop' : h.street === 'flop' ? 'turn' : 'river'
  // 只剩一个人（或没人）还能行动：直接发完公共牌
  if (live(h).filter((x) => !h.players[x].allIn).length <= 1) return runOut(t)
  h.toAct = nextSeat(t, h.button, (x) => canAct(h, x))
}
function runOut(t) {
  const h = t.hand
  while (h.board.length < 5) { h.deck.pop(); h.board.push(h.deck.pop()) }
  h.street = 'river'
  settle(t)
}
// 结算：按每人投入分出主池和边池；每个池给有资格的人里牌最大的（平分时余数给庄位左边第一位）
export function settle(t) {
  const h = t.hand
  const contrib = h.order.map((i) => ({ i, c: h.players[i].committed, live: !h.players[i].folded }))
  const levels = [...new Set(contrib.filter((x) => x.live).map((x) => x.c))].sort((a, b) => a - b)
  const showdown = live(h).length > 1
  const hands = {}
  if (showdown) live(h).forEach((i) => { hands[i] = evaluate(h.players[i].cards.concat(h.board)) })
  const won = {}
  const pots = []
  let prev = 0
  levels.forEach((lv, k) => {
    let amount = contrib.reduce((a, x) => a + Math.max(0, Math.min(x.c, lv) - prev), 0)
    // 最后一个池：比最高的活人投入还多的部分（弃牌的人多出的）也算进来
    if (k === levels.length - 1) amount += contrib.reduce((a, x) => a + Math.max(0, x.c - lv), 0)
    const elig = contrib.filter((x) => x.live && x.c >= lv).map((x) => x.i)
    prev = lv
    if (!amount) return
    let winners = elig
    if (showdown && elig.length > 1) {
      let best = null
      elig.forEach((i) => { const c = best === null ? 1 : compareScore(hands[i].score, hands[best].score); if (c > 0) best = i })
      winners = elig.filter((i) => compareScore(hands[i].score, hands[best].score) === 0)
    }
    const share = Math.floor(amount / winners.length)
    let rest = amount - share * winners.length
    // 余数从庄位左边开始依次给
    const byPos = winners.slice().sort((a, b) => ((a - h.button + t.size) % t.size) - ((b - h.button + t.size) % t.size))
    byPos.forEach((i) => { won[i] = (won[i] || 0) + share + (rest > 0 ? 1 : 0); if (rest > 0) rest-- })
    pots.push({ amount, winners: byPos, elig })
  })
  Object.keys(won).forEach((i) => { h.seatRef[i].stack += won[i] })
  const delta = {}
  h.order.forEach((i) => { delta[i] = (won[i] || 0) - h.players[i].committed })
  h.result = { pots, won, delta, showdown, hands: Object.fromEntries(Object.entries(hands).map(([i, v]) => [i, { name: v.name, score: v.score }])) }
  h.street = 'done'
  h.toAct = -1
  t.last = { handNo: t.handNo, delta }
}

/* ---------- 演示用的机器人：按手牌强弱做简单决定 ---------- */
function preflopStrength(cards) {
  const [a, b] = cards.map((c) => c.r).sort((x, y) => y - x)
  let s = (a + b) / 24 // 0 到 1
  if (a === b) s = 0.6 + a / 30
  if (cards[0].s === cards[1].s) s += 0.06
  if (a - b === 1) s += 0.04
  return Math.min(1, s)
}
export function botAction(t, i, rng = Math.random) {
  const h = t.hand
  const o = options(t, i)
  if (!o) return null
  const p = h.players[i]
  const strength = h.board.length ? Math.min(1, evaluate(p.cards.concat(h.board)).cat / 4 + 0.25) : preflopStrength(p.cards)
  const pot = o.pot || 1
  const pressure = o.toCall / (pot + o.toCall)
  const roll = rng()
  if (o.canCheck) {
    if (strength > 0.7 && o.canRaise && roll < 0.5) return { action: 'raise', to: Math.min(o.maxTo, Math.max(o.minTo, Math.round((h.currentBet + pot * 0.6) / 50) * 50)) }
    return { action: 'check' }
  }
  if (strength > 0.82 && o.canRaise && roll < 0.35) return { action: 'raise', to: Math.min(o.maxTo, Math.max(o.minTo, h.currentBet * 2)) }
  if (strength >= pressure + 0.18 || (o.toCall <= h.blinds.bb && roll < 0.7)) return { action: 'call' }
  return { action: 'fold' }
}

// 离桌（或被移出）：本手还没弃牌的，算弃牌；只剩一人时直接结算，轮到他时交给下一位
export function forfeit(t, i) {
  const h = t.hand
  if (!h || h.street === 'done' || !h.players[i] || h.players[i].folded) return
  h.players[i].folded = true
  h.players[i].last = '离桌'
  if (h.toAct === i) return advance(t, i)
  if (live(h).length === 1) settle(t)
}
// 中止这一手（比如主持人删桌）：每人投入的记分原样退回
export function abortHand(t) {
  const h = t.hand
  if (!h || h.street === 'done') return
  h.order.forEach((i) => { h.seatRef[i].stack += h.players[i].committed; h.players[i].committed = 0; h.players[i].bet = 0 })
  h.street = 'done'
  h.toAct = -1
  h.result = null
}
