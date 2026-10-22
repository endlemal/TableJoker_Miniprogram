// 大屏此刻显示的内容：设备管理（条形卡片的封面和副标题）和遥控切屏（屏幕预览、背景、投放）共用。
// 五种投放分类，对应电视上「桌趣大屏计时器」的五个页面；showing 是设备记录里的字段值
import { svgUri } from './svg.js'
import { coverArt, COVER_SIZES, SCENE_TINT } from './cover-art.js'
import { hostMatches } from '../mock/plaza.js'

export const CAST_CATS = [
  { key: 'sleep', name: '休眠', label: '休眠', color: '#8B95FF', showing: 'sleep', scene: 'storm', hold: true },
  { key: 'poster', name: '轮播海报', label: '轮播海报', color: '#FF5C7A', showing: 'poster', scene: 'blood', pick: 'poster' },
  { key: 'theme', name: '当前房间TV主题', label: 'TV 主题', color: '#FFB547', showing: 'timer', scene: 'fog', pick: 'theme' },
  { key: 'checkin', name: '当前房间签到墙', label: '签到墙', color: '#3DDC97', showing: 'checkin', scene: 'jungle' },
  { key: 'list', name: '赛事列表主界面', label: '赛事列表', color: '#4DA3FF', showing: 'home', scene: 'abyss' }
]
export const catOf = (key) => CAST_CATS.find((c) => c.key === key) || null
export const catByShowing = (showing) => CAST_CATS.find((c) => c.showing === showing) || null

// 当前房间：正在进行的那场比赛（TV 主题、签到墙显示它）
export const currentRoom = () => hostMatches.find((m) => m.startAt <= Date.now()) || hostMatches[0]

const liveGroupOf = (deviceId, groups) => groups.find((g) => g.status === 'live' && (g.liveOn || []).includes(deviceId)) || null

// 一台大屏此刻显示的内容 → { cat, groupId }；不认识的返回 cat: ''
export function liveOf(d, groups = []) {
  const c = catByShowing(d && d.showing)
  if (!c) return { cat: '', groupId: '' }
  if (c.key === 'poster') {
    const g = liveGroupOf(d.id, groups)
    return { cat: 'poster', groupId: g ? g.id : '' }
  }
  return { cat: c.key, groupId: '' }
}
export const sameContent = (a, b) => a.cat === b.cat && (a.cat !== 'poster' || a.groupId === b.groupId)

// 内容的文字说明（设备卡片的副标题、遥控切屏的状态行）
export function contentText(content, groups = []) {
  const room = currentRoom()
  if (content.cat === 'sleep') return '休眠中'
  if (content.cat === 'poster') {
    const g = groups.find((x) => x.id === content.groupId)
    return g ? '海报轮播 · ' + g.name : '海报轮播'
  }
  if (content.cat === 'theme') return room.name
  if (content.cat === 'checkin') return '签到墙 · ' + room.name
  if (content.cat === 'list') return '赛事列表 · 等待开赛'
  return ''
}

// 海报轮播时用哪一张：按 id 固定下来，不跟列表顺序走
const idHash = (id) => String(id).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
const srcCache = {}
function sceneSrc(scene, size) {
  const k = scene + '/' + size
  if (!srcCache[k]) srcCache[k] = svgUri(coverArt(scene, size))
  return srcCache[k]
}

// 内容的封面 → { src, w, h, tint, scene }：海报轮播是正在播放的海报；TV 主题用房间的封面；其余用分类对应的场景；
// 不认识的内容（离线）用 lastScene（最后显示的画面）
export function contentCover(content, groups = [], deviceId = '', lastScene = '') {
  let img = null
  if (content.cat === 'poster') {
    const g = groups.find((x) => x.id === content.groupId) || liveGroupOf(deviceId, groups)
    if (g && g.images.length) img = g.images[idHash(deviceId || g.id) % g.images.length]
  }
  if (!img) {
    let scene = lastScene || 'storm'
    if (content.cat === 'theme') scene = currentRoom().cover || 'fog'
    else if (content.cat) scene = (catOf(content.cat) || {}).scene || scene
    img = { scene, size: 'wide' }
  }
  if (img.src) return { src: img.src, w: img.w, h: img.h, tint: '#1F222A', scene: '' }
  const size = COVER_SIZES[img.size || 'wide'] || { w: 640, h: 360 }
  return { src: sceneSrc(img.scene, img.size || 'wide'), w: size.w * 3, h: size.h * 3, tint: SCENE_TINT[img.scene] || '#1F222A', scene: img.scene }
}

// 投放：要写到设备记录上的字段
export function castFields(content, groups = []) {
  const c = catOf(content.cat)
  const cover = contentCover(content, groups)
  return { showing: c.showing, showingText: contentText(content, groups), coverScene: cover.scene || c.scene }
}
