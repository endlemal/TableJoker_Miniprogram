// 主持人邀请：A（比赛发起人）邀请 B 成为共同主持。A 在创建比赛页点「邀请」转发给 B，B 打开 pages/host-invite/index?id=… 看到邀请卡片，
// 接受或婉拒；结果会反馈给 A（A 的共同主持列表里「待接受」变成「已加入」）。
// 邀请里存一份比赛信息的快照（名称、封面、时间、地点、现有主持人），B 打开时不依赖他看不到的数据。
// 演示：邀请存在本机（zz_host_invites）；正式环境对应接口：
//   POST /host-invites { matchId }            → 创建邀请，返回 { id, expiresAt }（A 转发的卡片带上 id）
//   GET  /host-invites/:id                    → 邀请详情（服务端判断是否过期、撤回、名额已满）
//   POST /host-invites/:id/accept | /decline  → B 的答复；服务端把 B 加进比赛的主持人，并用订阅消息通知 A
//   DELETE /host-invites/:id                  → A 撤回邀请
import { fmt } from './format.js'

const KEY = 'zz_host_invites'
export const INVITE_HOURS = 24 // 邀请有效期
export const MAX_COHOSTS = 3 // 一场比赛最多几位共同主持（不含发起人）

// 共同主持能做什么（和房间里主持人面板、记分工具的权限一致），以及只有发起人能做的事
export const COHOST_PERMS = [
  { icon: 'clock', title: '控制计时', text: '暂停 / 继续、切换级别、加减时间' },
  { icon: 'speakerphone', title: '管理现场', text: '开关玩法、发布公告、抽座位' },
  { icon: 'abacus', title: '记分工具', text: '开桌删桌、指定每个池的赢家、调整玩家资产' }
]
export const OWNER_ONLY = '比赛名称、时间、地点、盲注结构和报名设置只有发起人能改'

const read = () => { try { const v = uni.getStorageSync(KEY); return v && typeof v === 'object' ? v : {} } catch (e) { return {} } }
const write = (all) => { try { uni.setStorageSync(KEY, all) } catch (e) {} }

// 演示用的邀请：雾港桌游会所邀请你一起主持「雾港深筹赛」（第一次打开时生成，有效期从那时开始算）
function demoInvite(now) {
  return {
    id: 'demo',
    role: 'cohost',
    from: { name: '雾港桌游会所', c: '雾', bg: '#2A3550', fg: '#B5C7F2', certified: true },
    match: {
      id: 'pm-fog', name: '雾港深筹赛', cover: 'fog', startAt: (() => { const d = new Date(now + 2 * 86400000); d.setHours(19, 30, 0, 0); return d.getTime() })(),
      venue: { name: '雾港会所', address: '北京市西城区西直门南小街 11 号' },
      hosts: [{ name: '雾港桌游会所', c: '雾', bg: '#2A3550', fg: '#B5C7F2', role: 'owner' }, { name: '老周', c: '周', bg: '#3D3550', fg: '#D6CCFF', role: 'cohost' }]
    },
    createdAt: now - 18 * 60000,
    expiresAt: now - 18 * 60000 + INVITE_HOURS * 3600000,
    status: 'pending', to: null, respondedAt: 0
  }
}

// A 发出邀请：存下比赛快照，返回邀请（转发卡片的路径带上 id）
export function createInvite({ match, from }) {
  const now = Date.now()
  const inv = {
    id: 'hi' + now.toString(36) + Math.random().toString(36).slice(2, 5),
    role: 'cohost', from, match, createdAt: now, expiresAt: now + INVITE_HOURS * 3600000,
    status: 'pending', to: null, respondedAt: 0
  }
  const all = read()
  all[inv.id] = inv
  write(all)
  return inv
}
// 读取邀请：过期的待接受邀请显示为 expired（不改存储）；没有这份邀请时返回 null
export function getInvite(id) {
  const all = read()
  let inv = all[id]
  if (!inv && id === 'demo') { inv = demoInvite(Date.now()); all.demo = inv; write(all) }
  if (!inv) return null
  const expired = inv.status === 'pending' && Date.now() > inv.expiresAt
  return { ...inv, status: expired ? 'expired' : inv.status }
}
// B 的答复：accept 为 true 接受、false 婉拒；who 是 B（{ name, c, bg, fg }）
export function respondInvite(id, accept, who) {
  const all = read()
  const inv = all[id]
  if (!inv) return { ok: false, error: '找不到这份邀请' }
  if (inv.status === 'revoked') return { ok: false, error: '邀请已经撤回了' }
  if (Date.now() > inv.expiresAt) return { ok: false, error: '邀请已经过期了' }
  if (accept && inv.match.hosts.filter((h) => h.role === 'cohost').length >= MAX_COHOSTS) return { ok: false, error: '这场比赛的主持人名额已满' }
  inv.status = accept ? 'accepted' : 'declined'
  inv.to = who
  inv.respondedAt = Date.now()
  if (accept) inv.match.hosts = inv.match.hosts.filter((h) => h.name !== who.name).concat([{ ...who, role: 'cohost' }])
  write(all)
  return { ok: true, invite: getInvite(id) }
}
// 婉拒后改主意：有效期内回到待接受
export function reopenInvite(id) {
  const all = read()
  const inv = all[id]
  if (!inv || inv.status !== 'declined' || Date.now() > inv.expiresAt) return null
  inv.status = 'pending'
  inv.to = null
  inv.respondedAt = 0
  write(all)
  return getInvite(id)
}
// A 撤回邀请
export function revokeInvite(id) {
  const all = read()
  if (all[id] && all[id].status === 'pending') { all[id].status = 'revoked'; write(all) }
}
// 某场比赛（或创建中的草稿）发出的邀请，A 的共同主持列表用
export const invitesOf = (matchId) => Object.values(read()).filter((x) => x.match && x.match.id === matchId).map((x) => getInvite(x.id))

// 还剩多久失效：「23 小时 41 分」「38 分钟」
export function leftText(inv) {
  const ms = Math.max(0, inv.expiresAt - Date.now())
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h ? `${h} 小时 ${m} 分` : `${Math.max(1, m)} 分钟`
}
export const inviteCode = (inv) => 'HI-' + String(inv.id).slice(-6).toUpperCase()
export const hostCountText = (inv) => `已有 ${fmt(inv.match.hosts.length)} 位主持人`
