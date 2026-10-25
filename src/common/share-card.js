// 比赛的转发卡片（5:4）：比赛邀请页和广场列表共用。卡片上不写标题（微信消息里已经有了），
// 画赛事封面、主办方头像、标签、开赛时间（时:分）、荷官 / 选手头像气泡。另外放页面里画图要用的 canvas 工具
import { drawCard } from './share-canvas.js'
import { publicTags } from './tags.js'
import { SCENE_TINT } from './cover-art.js'

const WEEK = '日一二三四五六'
const p2 = (n) => String(n).padStart(2, '0')
// players：可选，比赛邀请页传入名单（不含待审核的）；不传就用比赛的报名玩家（去掉主办方本人）
export function shareCardData(m, players) {
  const d = new Date(m.startAt)
  const inviter = m.inviter || {}
  const creator = m.creator || {}
  const owner = (m.hosts || []).find((h) => h.role === 'owner')
  const dealers = (m.dealers || []).map((dl) => ({ char: dl.char, bg: dl.tone || dl.bg || '#2A2D36', fg: '#FFFFFF', photo: dl.photo || '', dealer: true }))
  const ps = (players || (m.participants || []).filter((p) => !owner || p.name !== owner.name)).map((p) => ({ char: p.c, bg: p.bg, fg: p.fg }))
  return {
    coverSrc: m.coverImage || `/static/covers/${m.cover || 'wild'}.jpg`,
    tint: SCENE_TINT[m.cover] || '#1F222A',
    host: creator.name || inviter.name || '',
    hostChar: creator.char || inviter.c || '',
    hostBg: creator.bg || inviter.bg || '#35383F',
    hostFg: creator.fg || inviter.fg || '#FFFFFF',
    byHost: m.creatorRole === 'host',
    tags: publicTags(m.tags),
    date: `${d.getMonth() + 1}/${d.getDate()} 周${WEEK[d.getDay()]}`,
    time: `${p2(d.getHours())}:${p2(d.getMinutes())}`,
    people: dealers.concat(ps),
    dealerCount: dealers.length,
    playerCount: (m.participants || []).length
  }
}
// 转发标题：「比赛名｜日期 时间 开赛，还剩 N 个位置」
export function shareTitleOf(m) {
  const d = new Date(m.startAt)
  const n = (m.participants || []).length
  return `${m.name}｜${d.getMonth() + 1}/${d.getDate()} 周${WEEK[d.getDay()]} ${p2(d.getHours())}:${p2(d.getMinutes())} 开赛，${n >= m.cap ? '名额已满' : '还剩 ' + (m.cap - n) + ' 个位置'}`
}

// 画图用的 canvas：小程序用页面里的 canvas（type="2d"，selector 是它的 id），H5 新建一个
export async function getCanvas(instance, selector, W, H) {
  // #ifdef MP-WEIXIN
  const node = await new Promise((resolve) => uni.createSelectorQuery().in(instance.proxy).select(selector).fields({ node: true, size: true }).exec((r) => resolve(r && r[0] && r[0].node)))
  if (!node) throw new Error('no canvas')
  node.width = W
  node.height = H
  return node
  // #endif
  // #ifndef MP-WEIXIN
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  return c
  // #endif
}
export function loadImg(canvas, src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    let img = null
    // #ifdef MP-WEIXIN
    img = canvas.createImage()
    // #endif
    // #ifndef MP-WEIXIN
    img = new Image()
    // #endif
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}
// 导出：小程序是临时文件路径，H5 是 data URL
export function exportCanvas(canvas, type) {
  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => uni.canvasToTempFilePath({ canvas, fileType: type, quality: 0.92, success: (r) => resolve(r.tempFilePath), fail: reject }))
  // #endif
  // #ifndef MP-WEIXIN
  return Promise.resolve(type === 'png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.92))
  // #endif
}
// 画一张转发卡片（1000×800 的 JPG）
export async function renderShareCard(instance, selector, data) {
  const c = await getCanvas(instance, selector, 1000, 800)
  const imgs = await Promise.all([loadImg(c, data.coverSrc)].concat(data.people.slice(0, 5).map((p) => loadImg(c, p.photo))))
  drawCard(c.getContext('2d'), data, { cover: imgs[0], dealers: imgs.slice(1) }, 2)
  return exportCanvas(c, 'jpg')
}
