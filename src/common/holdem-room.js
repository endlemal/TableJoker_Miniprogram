// 经典德扑在房间里的运行：牌桌、入座 / 离桌、自动开局、演示玩家（机器人）行动、轮到自己时的倒计时、主持人开桌 / 删桌、调整资产。
// 资产就是「记分」：牌桌上的记分和记分面板是同一份（assets）。盲注跟着房间当前的级别（下一手开始生效）。
// 演示：其他玩家由机器人代打；正式环境由服务端发牌、判定和广播，每位玩家在自己的手机上行动
import { reactive } from 'vue'
import * as H from './holdem.js'

export const ACT_SECONDS = 20
export const holdem = reactive({ tables: [], assets: {}, members: [], me: '', blinds: { sb: 100, bb: 200, ante: 0 }, turnLeft: 0, on: false })
let seq = 0
const memberOf = (name) => holdem.members.find((m) => m.name === name)
const asPlayer = (m) => ({ pid: m.name, name: m.name, c: m.c, bg: m.bg, fg: m.fg, stack: holdem.assets[m.name] || 0, bot: m.name !== holdem.me })

// 第一次进房间时：每人的资产（起始记分上下浮动），开一张 9 人桌，先坐 6 个人（不包括自己）
export function initHoldem(members, me, startScore) {
  if (holdem.members.length) return
  holdem.me = me
  holdem.members = members.map((m) => ({ name: m.name, c: m.c, bg: m.bg, fg: m.fg }))
  members.forEach((m, i) => { holdem.assets[m.name] = startScore + ((i * 7919) % 9 - 4) * 1500 })
  const t = createTable(9)
  members.filter((m) => m.name !== me).slice(0, 6).forEach((m, i) => H.sit(t, i, asPlayer(m)))
}
export function createTable(size) {
  const used = holdem.tables.map((t) => t.no)
  let no = 1
  while (used.includes(no)) no++
  const t = H.createTable({ id: 't' + ++seq, name: no + ' 号桌', size })
  t.no = no
  holdem.tables.push(t)
  holdem.tables.sort((a, b) => a.no - b.no)
  return holdem.tables.find((x) => x.id === t.id)
}
// 删桌：正在进行的这一手退回投入，所有人离座
export function removeTable(id) {
  const t = holdem.tables.find((x) => x.id === id)
  if (!t) return
  H.abortHand(t)
  syncAssets(t)
  holdem.tables = holdem.tables.filter((x) => x.id !== id)
}
const syncAssets = (t) => t.seats.forEach((s) => { if (s) holdem.assets[s.pid] = s.stack })
export const mySpot = () => {
  for (const t of holdem.tables) {
    const i = t.seats.findIndex((s) => s && s.pid === holdem.me)
    if (i >= 0) return { t, i }
  }
  return null
}
export function join(id) {
  const t = holdem.tables.find((x) => x.id === id)
  if (!t) return '这张桌已经关了'
  const cur = mySpot()
  if (cur && cur.t.id === id) return ''
  if ((holdem.assets[holdem.me] || 0) <= 0) return '你的记分是 0，请主持人调整后再入座'
  const idx = t.seats.findIndex((s) => !s)
  if (idx < 0) return '这张桌坐满了'
  if (cur) leaveTable()
  H.sit(t, idx, asPlayer(memberOf(holdem.me)))
  return ''
}
export function leaveTable() {
  const cur = mySpot()
  if (!cur) return
  H.forfeit(cur.t, cur.i)
  syncAssets(cur.t)
  cur.t.seats[cur.i] = null
}
// 主持人调整资产：立刻生效；在座的人改的是还没投入的记分
export function setAssets(name, value) {
  const v = Math.max(0, Math.round(Number(value) || 0))
  holdem.assets[name] = v
  holdem.tables.forEach((t) => t.seats.forEach((s) => { if (s && s.pid === name) s.stack = v }))
}
export function myAct(action, to) {
  const cur = mySpot()
  if (!cur) return '你还没入座'
  const r = H.act(cur.t, cur.i, action, to)
  if (r.ok) cur.t._deadline = 0
  return r.ok ? '' : r.error
}

/* ---------- 每 300ms 推进一次：开局、机器人行动、自己的倒计时 ---------- */
function step() {
  const now = Date.now()
  holdem.tables.forEach((t) => {
    const h = t.hand
    if (!h || h.street === 'done') {
      if (h && !t._synced) { syncAssets(t); t._synced = true }
      if (!t._nextAt) t._nextAt = now + (h ? 3600 : 1500) // 上一手结束后留 3 秒多看结果
      if (now >= t._nextAt) {
        t._nextAt = 0
        if (H.startHand(t, holdem.blinds)) { t._synced = false; t._botAt = 0; t._deadline = 0 }
      }
      return
    }
    const seat = t.seats[h.toAct]
    if (!seat) { H.forfeit(t, h.toAct); return }
    if (seat.bot) {
      if (!t._botAt) t._botAt = now + 650 + Math.random() * 900
      if (now >= t._botAt) {
        t._botAt = 0
        const a = H.botAction(t, h.toAct)
        if (!a || !H.act(t, h.toAct, a.action, a.to).ok) { const o = H.options(t, h.toAct); if (o) H.act(t, h.toAct, o.canCheck ? 'check' : 'fold') }
      }
    } else {
      // 轮到自己：倒计时，超时自动过牌（不能过牌就弃牌）
      if (!t._deadline) t._deadline = now + ACT_SECONDS * 1000
      holdem.turnLeft = Math.max(0, Math.ceil((t._deadline - now) / 1000))
      if (now >= t._deadline) {
        t._deadline = 0
        const o = H.options(t, h.toAct)
        if (o) H.act(t, h.toAct, o.canCheck ? 'check' : 'fold')
      }
    }
  })
}
let loop = null
export function runHoldem(on) {
  holdem.on = on
  if (on && !loop) loop = setInterval(step, 300)
  if (!on && loop) { clearInterval(loop); loop = null }
}
