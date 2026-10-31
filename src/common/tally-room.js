// 记分工具在房间里的运行：牌桌、入座 / 离桌、自动开局、演示玩家（机器人）出分、轮到自己时的倒计时、收分（选赢家）、
// 主持人开桌 / 删桌、调整资产。资产就是「记分」：牌桌上的记分和记分面板是同一份（assets）。
// start 是每人的起点：排行里的累计盈亏 = 现在的资产 − 起点；主持人调整资产时起点跟着移动，所以加减的那部分不算盈亏。
// 演示：其他玩家由机器人代打，没人选赢家时随机选；正式环境由服务端判定和广播，每位玩家在自己的手机上出分，收分由桌上的人确认
import { reactive } from 'vue'
import * as T from './tally.js'

export const ACT_SECONDS = 20
export const PICK_SECONDS = 20
export const tally = reactive({
  tables: [], assets: {}, start: {}, members: [], me: '', blinds: { sb: 100, bb: 200, ante: 0 },
  turnLeft: 0, on: false,
  // 自己这桌在收分时的选择：pending 是要选赢家的池（下标），k 是现在选到第几个，sel 是这个池选中的座位，picks 是已经确认的
  pick: null
})
let seq = 0
const memberOf = (name) => tally.members.find((m) => m.name === name)
const asPlayer = (m) => ({ pid: m.name, name: m.name, c: m.c, bg: m.bg, fg: m.fg, stack: tally.assets[m.name] || 0, bot: m.name !== tally.me })

// 第一次进房间时：每人的资产（起始记分上下浮动），开一张 9 人桌，先坐 6 个人（不包括自己）
export function initTally(members, me, startScore) {
  if (tally.members.length) return
  tally.me = me
  tally.members = members.map((m) => ({ name: m.name, c: m.c, bg: m.bg, fg: m.fg }))
  members.forEach((m, i) => {
    tally.assets[m.name] = startScore + ((i * 7919) % 9 - 4) * 1500
    tally.start[m.name] = tally.assets[m.name]
  })
  const t = createTable(9)
  members.filter((m) => m.name !== me).slice(0, 6).forEach((m, i) => T.sit(t, i, asPlayer(m)))
}
export function createTable(size) {
  const used = tally.tables.map((t) => t.no)
  let no = 1
  while (used.includes(no)) no++
  const t = T.createTable({ id: 't' + ++seq, name: no + ' 号桌', size })
  t.no = no
  tally.tables.push(t)
  tally.tables.sort((a, b) => a.no - b.no)
  return tally.tables.find((x) => x.id === t.id)
}
// 删桌：正在进行的这一手退回投入，所有人离座
export function removeTable(id) {
  const t = tally.tables.find((x) => x.id === id)
  if (!t) return
  T.abortHand(t)
  syncAssets(t)
  tally.tables = tally.tables.filter((x) => x.id !== id)
  if (tally.pick && tally.pick.tableId === id) tally.pick = null
}
const syncAssets = (t) => t.seats.forEach((s) => { if (s) tally.assets[s.pid] = s.stack })
export const mySpot = () => {
  for (const t of tally.tables) {
    const i = t.seats.findIndex((s) => s && s.pid === tally.me)
    if (i >= 0) return { t, i }
  }
  return null
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
  return ''
}
export function leaveTable() {
  const cur = mySpot()
  if (!cur) return
  T.forfeit(cur.t, cur.i)
  syncAssets(cur.t)
  cur.t.seats[cur.i] = null
  tally.pick = null
}
// 主持人调整资产：立刻生效（在座的人改的是还没投入的记分）；起点跟着移动，排行里的累计盈亏不受影响
export function setAssets(name, value) {
  const v = Math.max(0, Math.round(Number(value) || 0))
  tally.start[name] = (tally.start[name] || 0) + (v - (tally.assets[name] || 0))
  tally.assets[name] = v
  tally.tables.forEach((t) => t.seats.forEach((s) => { if (s && s.pid === name) s.stack = v }))
}
export function myAct(action, to) {
  const cur = mySpot()
  if (!cur) return '你还没入座'
  const r = T.act(cur.t, cur.i, action, to)
  if (r.ok) { cur.t._deadline = 0; arm(cur.t, Date.now()) }
  return r.ok ? '' : r.error
}
// 轮到自己（出分或收分）的那一刻就开始倒计时，倒计时从满格开始显示（不等下一次推进）
function arm(t, now) {
  const h = t.hand
  if (!h || t._deadline) return
  const mine = mySpot()
  if (!mine || mine.t.id !== t.id) return
  if (h.street === 'collect') { t._deadline = now + PICK_SECONDS * 1000; tally.turnLeft = PICK_SECONDS; return }
  if (h.street !== 'done' && h.toAct === mine.i) { t._deadline = now + ACT_SECONDS * 1000; tally.turnLeft = ACT_SECONDS }
}

/* ---------- 收分：自己这桌由自己选赢家（一个池一个池地选，可以多选平分） ---------- */
export const currentPot = () => {
  const p = tally.pick
  if (!p) return null
  const t = tally.tables.find((x) => x.id === p.tableId)
  if (!t || !t.hand || t.hand.street !== 'collect') return null
  const k = p.pending[p.k]
  return { t, k, pot: t.hand.pots[k], no: p.k, total: p.pending.length }
}
export function togglePick(seat) {
  const c = currentPot()
  if (!c || !c.pot.elig.includes(seat)) return
  const sel = tally.pick.sel
  tally.pick.sel = sel.includes(seat) ? sel.filter((x) => x !== seat) : sel.concat([seat])
}
export function confirmPick() {
  const c = currentPot()
  if (!c) return '现在不能收分'
  if (!tally.pick.sel.length) return '先点选收分的人'
  tally.pick.picks[c.k] = tally.pick.sel.slice()
  tally.pick.sel = []
  tally.pick.k += 1
  if (tally.pick.k < tally.pick.pending.length) return ''
  const r = T.award(c.t, tally.pick.picks)
  c.t._deadline = 0
  tally.pick = null
  return r.ok ? '' : r.error
}

/* ---------- 每 300ms 推进一次：开局、机器人出分、自己的倒计时、收分 ---------- */
function step() {
  const now = Date.now()
  const mine = mySpot()
  tally.tables.forEach((t) => {
    const h = t.hand
    if (!h || h.street === 'done') {
      if (h && !t._synced) { syncAssets(t); t._synced = true }
      if (!t._nextAt) t._nextAt = now + (h ? 3600 : 1500) // 上一手结束后留 3 秒多看结果
      if (now >= t._nextAt) {
        t._nextAt = 0
        if (T.startHand(t, tally.blinds)) { t._synced = false; t._botAt = 0; t._deadline = 0; arm(t, now) }
      }
      return
    }
    if (h.street === 'collect') {
      const atMine = mine && mine.t.id === t.id
      if (atMine) {
        if (!tally.pick || tally.pick.tableId !== t.id) tally.pick = { tableId: t.id, pending: T.pendingPots(t), k: 0, sel: [], picks: [] }
        if (!t._deadline) t._deadline = now + PICK_SECONDS * 1000
        tally.turnLeft = Math.max(0, Math.ceil((t._deadline - now) / 1000))
      } else if (!t._deadline) t._deadline = now + 2500
      // 超时没选：演示里随机选（正式环境由桌上的人确认）
      if (now >= t._deadline) {
        t._deadline = 0
        const picks = T.botPicks(t)
        if (atMine && tally.pick) tally.pick.picks.forEach((w, k) => { if (w) picks[k] = w })
        T.award(t, picks)
        if (atMine) tally.pick = null
      }
      return
    }
    const seat = t.seats[h.toAct]
    if (!seat) { T.forfeit(t, h.toAct); return }
    if (seat.bot) {
      if (!t._botAt) t._botAt = now + 650 + Math.random() * 900
      if (now >= t._botAt) {
        t._botAt = 0
        const a = T.botAction(t, h.toAct)
        if (!a || !T.act(t, h.toAct, a.action, a.to).ok) { const o = T.options(t, h.toAct); if (o) T.act(t, h.toAct, o.canCheck ? 'check' : 'fold') }
        arm(t, now)
      }
    } else {
      // 轮到自己：倒计时，超时自动过牌（不能过牌就弃牌）
      if (!t._deadline) t._deadline = now + ACT_SECONDS * 1000
      tally.turnLeft = Math.max(0, Math.ceil((t._deadline - now) / 1000))
      if (now >= t._deadline) {
        t._deadline = 0
        const o = T.options(t, h.toAct)
        if (o) T.act(t, h.toAct, o.canCheck ? 'check' : 'fold')
        arm(t, now)
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
