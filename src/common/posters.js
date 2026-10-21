// 海报组：在大屏上轮播的一组图片。
// 推荐的正式流程（先审后播、预览即时）：
// - 小程序里选图、排序、比例、铺盖方式、停留时长都在本地实时预览，不用等审核
// - 提交后上传到服务器做审核：先机审（微信 mediaCheckAsync 查图片、msgSecCheck 查名称，再加涉赌关键词和图片指纹黑名单），
//   机审有疑问的、新主办方的前几组、以及按比例抽查的进入人审；审核通过才能投放到大屏
// - 通过后由服务器按每台大屏的分辨率和铺盖方式预渲染、压缩，放到 CDN；电视下载后本地缓存播放
// - 平台可以随时下架某一组，所有电视同步停止播放
// 演示版把数据存在本地，审核用定时器模拟：名称里有涉赌字样的不通过，其余几秒后通过
import { seedGroups } from '../mock/posters.js'

const KEY = 'zz_posters'
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
export const MAX_IMAGES = 9
export const REVIEW_DEMO_MS = 6000
// 涉赌字样：机审的关键词规则之一（正式环境放在服务端，并且也检查图片里的文字）
export const BANNED = /现金|返水|带入|兑换|上分|下分|赌/

export const FITS = [
  { key: 'center', name: '居中裁剪不缩放', desc: '按原图大小居中，超出屏幕的部分裁掉' },
  { key: 'aspectFill', name: '缩放铺满并裁剪', desc: '等比放大到铺满屏幕，多出的部分裁掉' },
  { key: 'aspectFit', name: '缩放以适应', desc: '等比缩放到完整显示，可能留黑边' },
  { key: 'scaleToFill', name: '拉伸到四个角', desc: '不保持比例，拉伸铺满整个屏幕' }
]
export const RATIOS = [
  { key: '16:9', w: 3840, h: 2160, note: '主流电视' },
  { key: '21:9', w: 2560, h: 1080, note: '带鱼屏' },
  { key: '16:10', w: 1920, h: 1200, note: '投影仪' },
  { key: '4:3', w: 1600, h: 1200, note: '老电视' },
  { key: '9:16', w: 1080, h: 1920, note: '竖屏广告机' }
]
export const DWELLS = [5, 8, 15]
export const STATUS_TEXT = { draft: '草稿', reviewing: '审核中', approved: '已通过', live: '播放中', rejected: '未通过' }

// 分辨率换成常见的比例名（差 2% 以内算同一种）
export function ratioName(w, h) {
  const r = w / h
  const hit = RATIOS.find((x) => Math.abs(x.w / x.h - r) / r < 0.02)
  if (hit) return hit.key
  const g = (a, b) => (b ? g(b, a % b) : a)
  const k = g(w, h)
  return `${w / k}:${h / k}`
}

function load() {
  try {
    const v = uni.getStorageSync(KEY)
    if (Array.isArray(v)) return v
  } catch (e) {}
  const seeded = seedGroups()
  save(seeded)
  return seeded
}
function save(list) {
  try { uni.setStorageSync(KEY, list) } catch (e) {}
}

// 模拟审核结果：到时间的审核中海报组给出结论
function settle(list) {
  const now = Date.now()
  const changed = []
  list.forEach((g) => {
    if (g.status !== 'reviewing' || now < (g.reviewEndsAt || 0)) return
    const hit = g.name.match(BANNED)
    if (hit) {
      g.status = 'rejected'
      g.reason = `名称里出现了涉赌字样「${hit[0]}」，修改后重新提交`
    } else {
      g.status = 'approved'
      g.reason = ''
      g.renderedFor = g.target || '3840×2160'
    }
    changed.push(g)
  })
  return changed
}

export async function listGroups() {
  await wait(120)
  const list = load()
  const changed = settle(list)
  if (changed.length) save(list)
  return { list, changed }
}

export async function createGroup(images) {
  await wait(200)
  const list = load()
  const d = new Date()
  const g = {
    id: 'g' + Date.now(), name: `新海报组 ${d.getMonth() + 1}/${d.getDate()}`, status: 'draft',
    fit: 'aspectFill', dwell: 8, updatedAt: Date.now(), images: images.slice(0, MAX_IMAGES)
  }
  list.unshift(g)
  save(list)
  return g
}

// 改名、铺盖方式、停留时长：都不改变图片内容，不需要重新审核（正式环境改名会过一次 msgSecCheck）
export async function updateGroup(id, patch) {
  await wait(120)
  const list = load()
  const g = list.find((x) => x.id === id)
  if (!g) throw new Error('missing')
  if (patch.name !== undefined && BANNED.test(patch.name)) throw new Error('banned')
  Object.assign(g, patch, { updatedAt: Date.now() })
  if (patch.name !== undefined && g.status === 'rejected') g.reason = '已修改，可以重新提交'
  save(list)
  return g
}

// 提交审核：target 是要预渲染的分辨率
export async function submitGroup(id, target) {
  await wait(300)
  const list = load()
  const g = list.find((x) => x.id === id)
  if (!g) throw new Error('missing')
  Object.assign(g, { status: 'reviewing', target, reason: '', submittedAt: Date.now(), reviewEndsAt: Date.now() + REVIEW_DEMO_MS, updatedAt: Date.now() })
  save(list)
  return g
}

// 投放到大屏：deviceIds 为空表示停止投放
export async function deployGroup(id, deviceIds) {
  await wait(300)
  const list = load()
  const g = list.find((x) => x.id === id)
  if (!g || (g.status !== 'approved' && g.status !== 'live')) throw new Error('not-approved')
  g.liveOn = deviceIds.slice()
  g.status = deviceIds.length ? 'live' : 'approved'
  g.updatedAt = Date.now()
  save(list)
  return g
}

export async function deleteGroup(id) {
  await wait(200)
  save(load().filter((x) => x.id !== id))
}
