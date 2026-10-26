// 频道：首页左侧的频道栏 = 默认频道 + 从广场「主办」里进入过的主办方频道（本机记住，正式环境由服务端记录加入的频道）
import { servers } from '../mock/data.js'
import { CLUBS, clubOfChannel } from '../mock/venues.js'

const KEY = 'zz_joined_channels'
const joinedIds = () => { const v = uni.getStorageSync(KEY); return Array.isArray(v) ? v : [] }
export function listChannels() {
  return servers.concat(joinedIds().map((id) => clubOfChannel(id)).filter(Boolean).map((c) => c.channel))
}
// 进入主办方的频道：没加入过的先加入，返回频道 id
export function joinChannel(channelId) {
  if (!clubOfChannel(channelId)) return ''
  const ids = joinedIds()
  if (!ids.includes(channelId)) uni.setStorageSync(KEY, ids.concat([channelId]))
  return channelId
}
export const isChannel = (id) => servers.some((s) => s.id === id) || CLUBS.some((c) => c.channel.id === id)
