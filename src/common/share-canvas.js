// 分享图：微信群聊转发卡片（5:4）和 9:16 分享海报，用 Canvas 2D 画（小程序 canvas type="2d" 和 H5 的 canvas 接口一致）。
// 背景用比赛封面场景的主色做渐变，不画 SVG 封面（小程序的 canvas 不能可靠地绘制 SVG）。
// 海报上的二维码现在是 tj://match/<id>（应用里的扫码能认）；正式上线后换成服务端生成的小程序码（wxacode.getUnlimited）
import { qrMatrix } from './qr.js'

const SANS = '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif'
const font = (size, weight = 'normal') => `${weight} ${size}px ${SANS}`

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
// 按宽度折行，最多 maxLines 行，超出的最后一行加省略号
function wrap(ctx, text, maxW, maxLines) {
  const lines = []
  let line = ''
  for (const ch of String(text)) {
    if (ctx.measureText(line + ch).width > maxW && line) {
      lines.push(line)
      line = ch
      if (lines.length === maxLines) break
    } else line += ch
  }
  if (lines.length < maxLines && line) lines.push(line)
  const used = lines.join('').length
  if (used < String(text).length && lines.length) {
    let last = lines[lines.length - 1]
    while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1)
    lines[lines.length - 1] = last + '…'
  }
  return lines
}
function background(ctx, W, H, tint) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, tint || '#1F222A')
  g.addColorStop(0.62, '#101116')
  g.addColorStop(1, '#0B0C10')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // 一轮淡淡的月亮和几颗星，呼应封面的夜景
  ctx.globalAlpha = 0.18
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(W * 0.82, H * 0.16, W * 0.17, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.5
  ;[[0.12, 0.08], [0.3, 0.2], [0.55, 0.06], [0.66, 0.3], [0.2, 0.34]].forEach(([x, y], i) => {
    ctx.beginPath()
    ctx.arc(W * x, H * y, 1.6 + (i % 2), 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}
function capsule(ctx, x, y, text, tone, size) {
  ctx.font = font(size, 'bold')
  const w = ctx.measureText(text).width + size * 1.6
  const h = size * 1.9
  ctx.globalAlpha = 0.2
  ctx.fillStyle = tone
  roundRect(ctx, x, y, w, h, h / 2)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = tone
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + size * 0.8, y + h / 2 + 1)
  return w
}
function tagRow(ctx, x, y, tags, size, maxW) {
  let cx = x
  tags.forEach((t) => {
    ctx.font = font(size, 'bold')
    const w = ctx.measureText(t).width + size * 1.4
    if (cx + w > x + maxW) return
    ctx.fillStyle = 'rgba(220, 0, 0, .85)'
    roundRect(ctx, cx, y, w, size * 1.8, 6)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.textBaseline = 'middle'
    ctx.fillText(t, cx + size * 0.7, y + size * 0.9 + 1)
    cx += w + 10
  })
}
// 创建者：头像（主办方带红色 V）+「某某 主办 / 发起」
function creatorLine(ctx, x, y, d, size, color) {
  const r = size * 0.9
  ctx.fillStyle = '#F1E4D3'
  ctx.beginPath()
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#8A1C1C'
  ctx.font = font(size, 'bold')
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText(d.creatorChar || '桌', x + r, y + r + 1)
  if (d.byHost) {
    ctx.fillStyle = '#DC0000'
    ctx.beginPath()
    ctx.arc(x + r * 1.75, y + r * 1.75, r * 0.45, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = font(size * 0.55, 'bold')
    ctx.fillText('V', x + r * 1.75, y + r * 1.75 + 1)
  }
  ctx.textAlign = 'left'
  ctx.fillStyle = color
  ctx.font = font(size)
  ctx.fillText(`${d.creator} ${d.byHost ? '主办' : '发起'}`, x + r * 2 + 12, y + r + 1)
}
function progress(ctx, x, y, w, h, pct) {
  ctx.fillStyle = 'rgba(255, 255, 255, .14)'
  roundRect(ctx, x, y, w, h, h / 2)
  ctx.fill()
  ctx.fillStyle = '#DC0000'
  roundRect(ctx, x, y, Math.max(h, w * Math.min(1, pct)), h, h / 2)
  ctx.fill()
}
function drawQR(ctx, text, x, y, size) {
  const { n, dark } = qrMatrix(text)
  const cell = Math.floor(size / (n + 4))
  const real = cell * (n + 4)
  const ox = x + (size - real) / 2
  const oy = y + (size - real) / 2
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(ox, oy, real, real)
  ctx.fillStyle = '#0B0C10'
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (dark(r, c)) ctx.fillRect(ox + (c + 2) * cell, oy + (r + 2) * cell, cell, cell)
}

// 转发卡片 500×400：比赛名称、时间地点、报名进度、热度、主办方标签
export function drawCard(ctx, d, W = 500, H = 400) {
  background(ctx, W, H, d.tint)
  capsule(ctx, 32, 30, d.heat.label, d.heat.tone, 20)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = font(44, 'bold')
  ctx.textBaseline = 'alphabetic'
  wrap(ctx, d.name, W - 64, 2).forEach((line, i) => ctx.fillText(line, 32, 130 + i * 54))
  ctx.fillStyle = 'rgba(255, 255, 255, .78)'
  ctx.font = font(22)
  ctx.fillText(wrap(ctx, `${d.date} ${d.time} 开赛${d.place ? ' · ' + d.place : ''}`, W - 64, 1)[0] || '', 32, 236)
  // 底部：报名进度 + 主办方标签
  ctx.fillStyle = 'rgba(0, 0, 0, .35)'
  roundRect(ctx, 20, 262, W - 40, 120, 20)
  ctx.fill()
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#FFFFFF'
  ctx.font = font(30, 'bold')
  const count = `${d.signed}/${d.cap}`
  ctx.fillText(count, 40, 296)
  const cw = ctx.measureText(count).width
  ctx.fillStyle = 'rgba(255, 255, 255, .7)'
  ctx.font = font(18)
  ctx.fillText(d.cap > d.signed ? `已报名 · 还剩 ${d.cap - d.signed} 个位置` : '已报名 · 名额已满', 40 + cw + 12, 298)
  progress(ctx, 40, 322, W - 80, 10, d.signed / Math.max(1, d.cap))
  if (d.tags.length) tagRow(ctx, 40, 342, d.tags.slice(0, 3), 15, W - 80)
}

// 9:16 分享海报 720×1280：大标题（最多两行）、开赛时间、比赛信息、主办方标签、二维码。
// 最长的情况（两行标题 + 标签）下，信息区也停在底部白卡上方
export function drawPoster(ctx, d, W = 720, H = 1280) {
  background(ctx, W, H, d.tint)
  ctx.fillStyle = 'rgba(255, 255, 255, .55)'
  ctx.font = font(22, 'bold')
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('TABLEJOKER · 桌趣', 56, 92)
  capsule(ctx, 56, 128, d.heat.label, d.heat.tone, 24)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = font(76, 'bold')
  const lines = wrap(ctx, d.name, W - 112, 2)
  lines.forEach((line, i) => ctx.fillText(line, 56, 290 + i * 92))
  let y = 290 + (lines.length - 1) * 92 + 70
  if (d.tags.length) {
    tagRow(ctx, 56, y, d.tags, 24, W - 112)
    y += 72
  }
  // 开赛时间
  ctx.fillStyle = 'rgba(255, 255, 255, .6)'
  ctx.font = font(26)
  ctx.fillText(`${d.date} 开赛`, 56, y + 36)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = font(140, 'bold')
  ctx.fillText(d.time, 50, y + 170)
  y += 236
  // 信息
  const rows = [['地点', d.place || '待定'], ['起始盲注', d.blinds], ['报名', `${d.signed}/${d.cap}${d.cap > d.signed ? ` · 还剩 ${d.cap - d.signed} 个位置` : ' · 名额已满'}`]]
  rows.forEach(([k, v], i) => {
    const ry = y + i * 60
    ctx.fillStyle = 'rgba(255, 255, 255, .5)'
    ctx.font = font(24)
    ctx.fillText(k, 56, ry + 30)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = font(28, 'bold')
    ctx.fillText(wrap(ctx, v, W - 112 - 150, 1)[0] || '', 206, ry + 30)
  })
  progress(ctx, 206, y + 3 * 60 - 12, W - 262, 12, d.signed / Math.max(1, d.cap))
  // 底部白卡：二维码 + 说明
  const by = H - 300
  ctx.fillStyle = '#F3EEE6'
  roundRect(ctx, 40, by, W - 80, 240, 32)
  ctx.fill()
  drawQR(ctx, d.qr, 64, by + 24, 192)
  ctx.fillStyle = '#0B0C10'
  ctx.font = font(34, 'bold')
  ctx.fillText('扫码报名参赛', 290, by + 96)
  ctx.fillStyle = '#4B5060'
  ctx.font = font(22)
  ctx.fillText('用桌趣小程序扫一扫，直接进入比赛', 290, by + 140)
  creatorLine(ctx, 290, by + 166, d, 22, '#0B0C10')
  ctx.fillStyle = 'rgba(255, 255, 255, .35)'
  ctx.font = font(20)
  ctx.fillText('牌局计时 · 数据大屏', 56, H - 28)
}
