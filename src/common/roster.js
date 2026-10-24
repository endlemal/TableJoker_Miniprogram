// 报名名单与现场签到：每位玩家的状态、签到码和座位。
//   pending 待审核 · signed 已报名待签到 · checked 已签到入座
// 主办方的审批和核销存在本机（演示）；正式环境由服务端维护，并用订阅消息通知玩家
import { getJoin } from './store.js'

const KEY = 'zz_roster'
const SEATS_PER_TABLE = 9
const hash = (s) => String(s).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
export const ROSTER_STATUS = {
  pending: { label: '待审核', color: '#FFC53A' },
  signed: { label: '待签到', color: '#9CA3AF' },
  checked: { label: '已签到', color: '#4CB582' }
}
const loadAll = () => { const v = uni.getStorageSync(KEY); return v && typeof v === 'object' ? v : {} }
function patch(matchId, key, change) {
  const all = loadAll()
  all[matchId] = { ...(all[matchId] || {}), [key]: { ...((all[matchId] || {})[key] || {}), ...change } }
  uni.setStorageSync(KEY, all)
}
export const codeOf = (matchId, key) => String(1000 + (hash(matchId + '|' + key) % 9000))
// 签到码（二维码内容）：TJCK:比赛:玩家:四位码
export const checkinPayload = (matchId, key) => `TJCK:${matchId}:${key}:${codeOf(matchId, key)}`
// 扫到的内容是不是这场比赛的签到码：是的话返回玩家的 key，否则返回不对的原因
export function parseCheckin(text, matchId) {
  const m = /^TJCK:([^:]+):([^:]+):(\d{4})$/.exec(String(text || '').trim())
  if (!m) return { error: '这不是签到码' }
  if (m[1] !== matchId) return { error: '这是别的比赛的签到码' }
  if (codeOf(m[1], m[2]) !== m[3]) return { error: '签到码不对' }
  return { key: m[2] }
}

// 名单：已报名的玩家 + 待审核的报名（演示：需要审核的比赛有两条），再叠加本机记下的审批和签到
export function rosterOf(m, me) {
  const over = loadAll()[m.id] || {}
  const owner = (m.hosts || []).find((h) => h.role === 'owner')
  const started = m.startAt <= Date.now()
  const list = (m.participants || [])
    .filter((p) => !owner || p.name !== owner.name)
    .map((p, i) => ({ key: 'p' + i, name: p.name, c: p.c, bg: p.bg, fg: p.fg, status: started ? (i % 5 === 4 ? 'signed' : 'checked') : (i % 4 === 3 ? 'checked' : 'signed') }))
  if (!m.autoApprove) {
    list.push({ key: 'r1', name: '小林', c: '林', bg: '#DCE7F3', fg: '#1F4E79', status: 'pending', message: '第一次参加，想和朋友坐一桌' })
    list.push({ key: 'r2', name: 'Kiki', c: 'K', bg: '#F1DCE4', fg: '#7A1F45', status: 'pending', message: '' })
  }
  const j = getJoin(m.id)
  if (j && me) list.push({ key: 'me', name: me.nickname, c: me.char, bg: '#F1E4D3', fg: '#8A1C1C', status: j.status === 'pending' ? 'pending' : 'signed', message: j.message || '', mine: true })
  // 演示数据里一开始就签到了的玩家：座位按他们之间的顺序固定下来；之后核销的玩家各自存了座位
  let n = 0
  const fixed = {}
  list.forEach((p) => { if (p.status === 'checked') fixed[p.key] = seatOf(n++) })
  return list.map((p) => {
    const o = over[p.key] || {}
    const status = o.status || p.status
    const seat = o.seat || (status === 'checked' ? fixed[p.key] || '' : '')
    return { ...p, status, seat }
  })
}
const seatOf = (n) => `${String.fromCharCode(65 + Math.floor(n / SEATS_PER_TABLE))} 桌 ${(n % SEATS_PER_TABLE) + 1} 号`
export function approve(matchId, keys) {
  keys.forEach((k) => patch(matchId, k, { status: 'signed' }))
}
// 核销签到：分配还空着的、编号最小的座位
export function checkIn(matchId, key, roster) {
  const used = new Set(roster.filter((p) => p.status === 'checked').map((p) => p.seat))
  let n = 0
  while (used.has(seatOf(n))) n++
  const seat = seatOf(n)
  patch(matchId, key, { status: 'checked', seat })
  return seat
}
