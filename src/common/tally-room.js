// 记分工具在房间里的运行：牌桌、入座 / 离桌、自动开局、演示玩家（机器人）出分、轮到谁的倒计时、收分（主持人指定赢家 → 赢家收分）、
// 主持人开桌 / 删桌、调整资产，以及把出分、收分变成房间里的事件消息。
// 资产就是「记分」：牌桌上的记分和记分面板是同一份（assets）。start 是每人的起点：排行里的累计盈亏 = 现在的资产 − 起点；
// 主持人调整资产时起点跟着移动，所以加减的那部分不算盈亏。
// 演示：其他玩家由机器人代打；自己是主持人时由自己指定赢家，否则模拟主持人自动指定。正式环境由服务端判定和广播
import { reactive } from 'vue'
import * as T from './tally.js'
import { addEvent } from './room-chat.js'

export const ACT_SECONDS = 20 // 每人出分的决策时间（头像上的环形倒计时）
export const DESIGNATE_SECONDS = 30 // 主持人指定赢家
export const COLLECT_SECONDS = 20 // 赢家收分
export const tally = reactive({
  tables: [], assets: {}, start: {}, members: [], me: '', iAmHost: false, blinds: { sb: 100, bb: 200, ante: 0 },
  turnLeft: 0, on: false, observing: '',
  ranking: { mode: 'score', index: {}, order: [] },
  picks: {} // 主持人正在指定的赢家：{ [池的下标]: [座位号] }（自己这桌）
})
let seq = 0
const memberOf = (name) => tally.members.find((m) => m.name === name)
const asPlayer = (m) => ({ pid: m.name, name: m.name, c: m.c, bg: m.bg, fg: m.fg, stack: tally.assets[m.name] || 0, bot: m.name !== tally.me })
const fmt = (n) => String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

// 演示预设：1 号桌 10 人满员，2 号桌已有 9 人；空位随离桌和淘汰动态开放。
export function initTally(members, me, startScore) {
  if (tally.members.length) return
  tally.me = me
  tally.members = members.map((m) => ({ name: m.name, c: m.c, bg: m.bg, fg: m.fg }))
  members.forEach((m, i) => {
    tally.assets[m.name] = startScore + ((i * 7919) % 9 - 4) * 1500
    tally.start[m.name] = tally.assets[m.name]
  })
  const others = tally.members.filter((m) => m.name !== me)
  const full = createTable(10)
  others.slice(0, 10).forEach((m, i) => T.sit(full, i, asPlayer(m)))
  const open = createTable(10)
  others.slice(10, 19).forEach((m, i) => T.sit(open, i, asPlayer(m)))
}
export function createTable(size) {
  const used = tally.tables.map((t) => t.no)
  let no = 1
  while (used.includes(no)) no++
  const t = T.createTable({ id: 't' + ++seq, name: no + ' 号桌', size })
  Object.assign(t, { no, turnStart: 0, turnEnd: 0, observers: [] })
  tally.tables.push(t)
  tally.tables.sort((a, b) => a.no - b.no)
  return tally.tables.find((x) => x.id === t.id)
}
// 删桌：没指定赢家的退回投入，已经指定的照样发给赢家；所有人离座
export function removeTable(id) {
  const t = tally.tables.find((x) => x.id === id)
  if (!t) return
  T.abortHand(t)
  flushLog(t)
  syncAssets(t)
  tally.tables = tally.tables.filter((x) => x.id !== id)
  if (tally.observing === id) { tally.observing = ''; tally.picks = {} }
}
const syncAssets = (t) => t.seats.forEach((s) => { if (s) tally.assets[s.pid] = s.stack })
// 只在本手结算完毕后清走无分席位；All-in / 等待收分的玩家仍属于本手。
// seatRef 保留原玩家对象，结算排行、收分记录不会因腾空座位而丢失。
export function moveBustedToOb(t) {
  t.seats.forEach((s, i) => {
    if (!s || s.stack > 0) return
    const h = t.hand
    if (h && h.street !== 'done' && h.seatRef[i] === s) return
    tally.assets[s.pid] = s.stack
    if (!t.observers.some((o) => o.pid === s.pid)) t.observers.push(s)
    t.seats[i] = null
    if (s.pid === tally.me) { tally.observing = t.id; tally.turnLeft = 0; tally.picks = {} }
  })
}
export const mySpot = () => {
  for (const t of tally.tables) {
    const i = t.seats.findIndex((s) => s && s.pid === tally.me)
    if (i >= 0) return { t, i }
  }
  return null
}
export const viewSpot = () => {
  const t = tally.tables.find((t) => t.id === tally.observing)
  return t ? { t, i: -1, observing: true } : mySpot()
}
export function observe(id) {
  const t = tally.tables.find((t) => t.id === id)
  if (!t) return '这张桌已经关了'
  if (mySpot()) return '请先离开当前牌桌再观战'
  leaveObservation()
  t.observers.push(asPlayer(memberOf(tally.me)))
  tally.observing = id; tally.picks = {}; tally.turnLeft = 0
  return ''
}
export function leaveObservation() {
  tally.tables.forEach((t) => { t.observers = t.observers.filter((s) => s.pid !== tally.me) })
  tally.observing = ''; tally.picks = {}; tally.turnLeft = 0
}
export function join(id) {
  const t = tally.tables.find((x) => x.id === id)
  if (!t) return '这张桌已经关了'
  const cur = mySpot()
  if (cur && cur.t.id === id) return ''
  if ((tally.assets[tally.me] || 0) <= 0) return '你的记分是 0，请主持人调整后再入座'
  const idx = t.seats.findIndex((s) => !s)
  if (idx < 0) return '这张桌坐满了'
  if (cur) leaveTable()
  T.sit(t, idx, asPlayer(memberOf(tally.me)))
  leaveObservation()
  return ''
}
export function leaveTable() {
  const cur = mySpot()
  if (!cur) return
  T.forfeit(cur.t, cur.i)
  flushLog(cur.t)
  syncAssets(cur.t)
  cur.t.seats[cur.i] = null
  tally.picks = {}
}
// 主持人调整资产：立刻生效（在座的人改的是还没投入的记分）；起点跟着移动，排行里的累计盈亏不受影响
export function setAssets(name, value) {
  const v = Math.max(0, Math.round(Number(value) || 0))
  tally.start[name] = (tally.start[name] || 0) + (v - (tally.assets[name] || 0))
  tally.assets[name] = v
  tally.tables.forEach((t) => {
    t.seats.concat(t.observers).forEach((s) => { if (s && s.pid === name) s.stack = v })
    moveBustedToOb(t)
  })
}
export function myAct(action, to) {
  const cur = mySpot()
  if (!cur) return '你还没入座'
  const r = T.act(cur.t, cur.i, action, to)
  if (r.ok) { flushLog(cur.t); trackTurn(cur.t, Date.now()) }
  return r.ok ? '' : r.error
}

/* ---------- 收分：主持人指定每个池的赢家（平手多选），赢家再各自收分 ---------- */
export function togglePick(k, seat) {
  const cur = viewSpot()
  if (!tally.iAmHost || !cur || !cur.t.hand || cur.t.hand.street !== 'collect') return
  const pot = cur.t.hand.pots[k]
  if (!pot || pot.winners || !pot.elig.includes(seat)) return
  const sel = tally.picks[k] || []
  tally.picks = { ...tally.picks, [k]: sel.includes(seat) ? sel.filter((x) => x !== seat) : sel.concat([seat]) }
}
export function confirmDesignation() {
  if (!tally.iAmHost) return '只有主持人可以确认赢家'
  const cur = viewSpot()
  if (!cur || !cur.t.hand || cur.t.hand.street !== 'collect') return '现在不能指定赢家'
  const picks = cur.t.hand.pots.map((p, k) => p.winners || tally.picks[k] || [])
  const r = T.designate(cur.t, picks)
  if (r.ok) { tally.picks = {}; cur.t._deadline = 0 }
  return r.ok ? '' : r.error
}
export function myCollect(k) {
  const cur = mySpot()
  if (!cur) return '你还没入座'
  const r = T.collect(cur.t, k, cur.i)
  if (r.ok) { flushLog(cur.t); cur.t._deadline = 0; moveBustedToOb(cur.t) }
  return r.ok ? '' : r.error
}

/* ---------- 事件：出分（盲注、跟注、加注、全下）和收分，插进房间消息 ---------- */
function flushLog(t) {
  const h = t.hand
  if (!h || !h.log) return
  if (t._logHand !== t.handNo) { t._logHand = t.handNo; t._logN = 0 }
  while (t._logN < h.log.length) {
    const e = h.log[t._logN++]
    const s = h.seatRef[e.seat]
    if (!s) continue
    let text
    if (e.kind === 'collect') text = `收分 ${fmt(e.amount)}${e.potCount > 1 ? (e.pot === 0 ? '（主池）' : `（边池 ${e.pot}）`) : ''}`
    else if (e.kind === 'blind') text = `${e.text} ${fmt(e.amount)}`
    else if (e.text === '加注') text = `加注到 ${fmt(e.to)}`
    else text = `${e.text} ${fmt(e.amount)}`
    // 只有一张桌时不用写桌名
    addEvent(s, tally.tables.length > 1 ? `${t.name} · ${text}` : text, e.kind === 'collect' ? 'collect' : 'bet', t.id)
  }
}
// 轮到谁：换人的那一刻记下开始和结束时间（头像上的环形倒计时用）；自己的倒计时立刻从满格开始
function trackTurn(t, now) {
  const h = t.hand
  const actor = h && T.ROUND_NAME[h.street] && h.toAct >= 0 && ['preflop', 'flop', 'turn', 'river'].includes(h.street) ? h.toAct : -1
  const key = t.handNo + ':' + h.street + ':' + actor + ':' + (h ? h.log.length : 0)
  if (actor < 0) { t.turnStart = 0; t.turnEnd = 0; t._turnKey = ''; return }
  if (t._turnKey === key) return
  t._turnKey = key
  t.turnStart = now
  t.turnEnd = now + ACT_SECONDS * 1000
  const mine = mySpot()
  if (mine && mine.t.id === t.id && mine.i === actor) tally.turnLeft = ACT_SECONDS
}

/* ---------- 每 300ms 推进一次 ---------- */
function step() {
  const now = Date.now()
  tally.tables.forEach(moveBustedToOb)
  const mine = mySpot()
  const viewing = viewSpot()
  tally.tables.forEach((t) => {
    const h = t.hand
    flushLog(t)
    if (!h || h.street === 'done') {
      if (h && !t._synced) { syncAssets(t); t._synced = true }
      if (!t._nextAt) t._nextAt = now + (h ? 3200 : 1500) // 上一手结束后留 3 秒看结果
      if (now >= t._nextAt) {
        t._nextAt = 0
        if (T.startHand(t, tally.blinds)) { t._synced = false; t._botAt = 0; t._deadline = 0; flushLog(t); trackTurn(t, now) }
      }
      return
    }
    const atMine = !!(mine && mine.t.id === t.id)
    // 主持人在入座或 OB 的当前桌指定赢家；其他桌由演示主持人推进。
    if (h.street === 'collect') {
      const byMe = viewing?.t.id === t.id && tally.iAmHost
      // 从其他桌切入 OB 时重新给主持人完整的选择时间。
      if (t._hostChoosing !== byMe) { t._deadline = 0; t._hostChoosing = byMe }
      if (!t._deadline) t._deadline = now + (byMe ? DESIGNATE_SECONDS * 1000 : 2500)
      if (byMe) tally.turnLeft = Math.max(0, Math.ceil((t._deadline - now) / 1000))
      if (now >= t._deadline) {
        t._deadline = 0
        const picks = T.botPicks(t)
        if (byMe) h.pots.forEach((p, k) => { if (!p.winners && (tally.picks[k] || []).length) picks[k] = tally.picks[k] })
        T.designate(t, picks)
        if (byMe) tally.picks = {}
      }
      return
    }
    // 收分：机器人赢家依次收分（桌面分逐个倒数）；自己赢了的那份要自己点「收分」，20 秒没点自动收
    if (h.street === 'payout') {
      const u = T.unpaid(t)
      const bot = u.find((x) => !atMine || x.seat !== mine.i)
      if (bot) {
        if (!t._botAt) t._botAt = now + 900 + Math.random() * 700
        if (now >= t._botAt) { t._botAt = 0; T.collect(t, bot.k, bot.seat); flushLog(t); moveBustedToOb(t) }
      } else if (u.length) {
        if (!t._deadline) t._deadline = now + COLLECT_SECONDS * 1000
        tally.turnLeft = Math.max(0, Math.ceil((t._deadline - now) / 1000))
        if (now >= t._deadline) { t._deadline = 0; u.forEach((x) => T.collect(t, x.k, x.seat)); flushLog(t); moveBustedToOb(t) }
      }
      return
    }
    // 出分
    trackTurn(t, now)
    const seat = t.seats[h.toAct]
    if (!seat) { T.forfeit(t, h.toAct); return }
    if (seat.bot) {
      if (!t._botAt) t._botAt = now + 700 + Math.random() * 1100
      if (now >= t._botAt) {
        t._botAt = 0
        const a = T.botAction(t, h.toAct)
        if (!a || !T.act(t, h.toAct, a.action, a.to).ok) { const o = T.options(t, h.toAct); if (o) T.act(t, h.toAct, o.canCheck ? 'check' : 'fold') }
        flushLog(t)
        trackTurn(t, now)
      }
    } else {
      // 轮到自己：倒计时用这一轮的结束时间，超时自动过牌（不能过牌就弃牌）
      tally.turnLeft = Math.max(0, Math.ceil((t.turnEnd - now) / 1000))
      if (now >= t.turnEnd) {
        const o = T.options(t, h.toAct)
        if (o) T.act(t, h.toAct, o.canCheck ? 'check' : 'fold')
        flushLog(t)
        trackTurn(t, now)
      }
    }
  })
}
let loop = null
export function runTally(on) {
  tally.on = on
  if (on && !loop) loop = setInterval(step, 300)
  if (!on && loop) { clearInterval(loop); loop = null }
}
