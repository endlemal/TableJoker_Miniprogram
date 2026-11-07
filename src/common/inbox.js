// 首页消息箱：要我处理的事——我主持的比赛里待审核的加入申请，以及别人发给我的主持人邀请。
// 首页「消息」徽章上的数字 = 这些卡片的数量；在消息箱、房间「主持人」标签、比赛邀请页处理的是同一份申请
import { pendingOf } from './roster.js'
import { getInvite } from './host-invite.js'
import { listMatches, getMatch } from './store.js'
import { DEMO_MODE } from './config.js'
import { hostMatches, findPublicMatch } from '../mock/plaza.js'
import { room, me } from '../mock/data.js'

const meRoster = { nickname: me.nickname, char: me.char }
const isMyHost = (m) => (m.hosts || []).some((h) => h.name === me.nickname)
// 我是主持人的比赛：房间对应的比赛、我的主办比赛、我发布的比赛（去重）
export function hostedMatches() {
  const out = []
  const add = (m) => { if (m && isMyHost(m) && !out.some((x) => x.id === m.id)) out.push(m) }
  if (room.hosts.some((h) => h.name === me.nickname)) add(getMatch(room.matchId || 'demo') || findPublicMatch(room.matchId || 'demo'))
  hostMatches.filter((m) => m.mine).forEach(add)
  listMatches().forEach(add)
  return out
}
export function inboxItems() {
  const requests = []
  hostedMatches().forEach((m) => pendingOf(m, meRoster).forEach((r) => requests.push({ match: m, r })))
  requests.sort((a, b) => (b.r.at || 0) - (a.r.at || 0))
  // 别人发给我的、还没答复的主持人邀请（演示：雾港桌游会所的那份）
  const invites = []
  const demo = DEMO_MODE ? getInvite('demo') : null
  if (demo && demo.status === 'pending' && demo.from.name !== me.nickname) invites.push(demo)
  return { requests, invites }
}
export const inboxCount = () => { const x = inboxItems(); return x.requests.length + x.invites.length }
