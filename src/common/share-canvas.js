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

// 票据（参照 Royal Flush 票据模板）：上面 65% 是正票，下面 35% 是存根，中间是打孔线和两侧的半圆缺口。
// 画布 840×1360，票面 760×1240 居中（模板的 2 倍）。这部分以后放到服务端统一生成，这里的画法和数据结构保持简单
const SERIF = '"Songti SC", "Noto Serif SC", "Noto Serif CJK SC", Georgia, serif'
const MONO = 'Menlo, "SF Mono", "Courier New", monospace'
// 逐字画出带字距的文字（小程序 canvas 不一定支持 letterSpacing）
function spaced(ctx, text, x, y, gap, align = 'left') {
  const chars = String(text).split('')
  const widths = chars.map((c) => ctx.measureText(c).width)
  const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, chars.length - 1)
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x
  ctx.textAlign = 'left'
  chars.forEach((c, i) => { ctx.fillText(c, cx, y); cx += widths[i] + gap })
  return total
}
// 固定种子的随机数：同一张票每次画出来的纸纹一样
function seeded(seed) {
  let x = seed || 1
  return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648 }
}
export function drawTicket(ctx, d, W = 840, H = 1360) {
  const tx = 40, ty = 60, tw = 760, th = 1240, r = 20
  const py = ty + th * 0.65
  const accent = d.accent || '#E01B3C'
  const gold = d.gold || '#D4B478'
  // 页面底色
  ctx.fillStyle = '#0A0908'
  ctx.fillRect(0, 0, W, H)
  const top = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.7)
  top.addColorStop(0, '#17140F')
  top.addColorStop(1, 'rgba(10, 9, 8, 0)')
  ctx.fillStyle = top
  ctx.fillRect(0, 0, W, H)
  // 票面
  ctx.save()
  roundRect(ctx, tx, ty, tw, th, r)
  ctx.clip()
  const body = ctx.createLinearGradient(0, ty, 0, ty + th)
  ;[[0, '#2A1A12'], [0.3, '#1F1610'], [0.58, '#1C140D'], [0.65, '#1C140D'], [0.82, '#160F09'], [1, '#0E0A07']].forEach(([o, c]) => body.addColorStop(o, c))
  ctx.fillStyle = body
  ctx.fillRect(tx, ty, tw, th)
  // 「照片」：封面场景的主色 + 月亮和星星，压暗、偏旧，往下渐隐到票面底色
  const ph = th * 0.58
  const photo = ctx.createLinearGradient(0, ty, 0, ty + ph)
  photo.addColorStop(0, d.tint || '#3A2418')
  photo.addColorStop(1, '#1C140D')
  ctx.fillStyle = photo
  ctx.fillRect(tx, ty, tw, ph)
  ctx.globalAlpha = 0.22
  ctx.fillStyle = '#F5F0E6'
  ctx.beginPath()
  ctx.arc(tx + tw * 0.74, ty + ph * 0.3, tw * 0.17, 0, Math.PI * 2)
  ctx.fill()
  const rnd = seeded(d.seed || 7)
  ctx.globalAlpha = 0.55
  for (let i = 0; i < 26; i++) {
    ctx.beginPath()
    ctx.arc(tx + rnd() * tw, ty + rnd() * ph * 0.7, 1 + rnd() * 1.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = 'rgba(30, 20, 12, .42)'
  ctx.fillRect(tx, ty, tw, ph)
  const fade = ctx.createLinearGradient(0, ty + ph * 0.66, 0, ty + ph)
  fade.addColorStop(0, 'rgba(28, 20, 13, 0)')
  fade.addColorStop(1, 'rgba(28, 20, 13, 1)')
  ctx.fillStyle = fade
  ctx.fillRect(tx, ty + ph * 0.66, tw, ph * 0.34 + 2)
  // 纸纹
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(0, 0, 0, .16)' : 'rgba(255, 240, 220, .05)'
    ctx.fillRect(tx + rnd() * tw, ty + rnd() * th, 1.6, 1.6)
  }
  // 打孔线附近的红光
  ctx.save()
  ctx.translate(tx + tw / 2, py)
  ctx.scale(1, 0.32)
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, tw * 0.48)
  halo.addColorStop(0, 'rgba(180, 22, 48, .24)')
  halo.addColorStop(0.4, 'rgba(160, 20, 45, .09)')
  halo.addColorStop(1, 'rgba(120, 18, 40, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(-tw / 2, -tw * 0.5, tw, tw)
  ctx.restore()
  // 正票：系列 · 年份、标题和高亮行、副标题、分隔线、信息
  const left = tx + 64
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = gold
  ctx.font = `bold 20px ${MONO}`
  spaced(ctx, `${d.series || 'TABLEJOKER'} · ${d.year}`.toUpperCase(), left, ty + 84, 4.4)
  ctx.fillStyle = '#F5F0E6'
  ctx.font = `bold 62px ${SERIF}`
  ctx.shadowColor = 'rgba(0, 0, 0, .85)'
  ctx.shadowBlur = 16
  const lines = wrap(ctx, d.title, tw - 128, 2)
  let y = ty + 176
  lines.forEach((line) => { ctx.fillText(line, left, y); y += 72 })
  ctx.fillStyle = accent
  ctx.shadowColor = 'rgba(224, 27, 60, .6)'
  ctx.shadowBlur = 24
  ctx.fillText(d.highlight, left, y)
  ctx.shadowBlur = 0
  y += 56
  ctx.fillStyle = 'rgba(245, 240, 230, .9)'
  ctx.font = `600 27px ${SERIF}`
  spaced(ctx, d.subtitle, left, y, 4)
  // 分隔线和信息贴着正票的下沿（打孔线上方），标题在上、信息在下，和实体票一样
  y = Math.max(y + 52, py - 92 - d.info.length * 50 - 64)
  const div = ctx.createLinearGradient(left, 0, tx + tw - 64, 0)
  div.addColorStop(0, 'rgba(212, 180, 120, .55)')
  div.addColorStop(0.55, 'rgba(212, 180, 120, .18)')
  div.addColorStop(1, 'rgba(212, 180, 120, 0)')
  ctx.fillStyle = div
  ctx.fillRect(left, y, tw - 128, 2)
  y += 64
  d.info.forEach((row) => {
    ctx.fillStyle = accent
    ctx.shadowColor = 'rgba(224, 27, 60, .9)'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.arc(left + 5, y - 8, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = row.strong ? '#F5F0E6' : 'rgba(245, 240, 230, .72)'
    ctx.font = `${row.strong ? 'bold ' : ''}22px ${MONO}`
    spaced(ctx, wrap(ctx, row.text, tw - 170, 1)[0] || '', left + 24, y, 1.6)
    y += 50
  })
  // 打孔线
  ctx.fillStyle = 'rgba(245, 240, 230, .2)'
  for (let x = tx + 44; x < tx + tw - 44; x += 36) ctx.fillRect(x, py - 1.5, 16, 3)
  // 存根：二维码（扫码报名）+ 花色、票号、条码
  const sy = py + 46
  const qs = 240
  ctx.fillStyle = '#F5F0E6'
  roundRect(ctx, left, sy, qs, qs, 18)
  ctx.fill()
  drawQR(ctx, d.qr, left + 10, sy + 10, qs - 20)
  const cx = left + qs + (tx + tw - 64 - (left + qs)) / 2
  ctx.textBaseline = 'alphabetic'
  ctx.font = `bold 96px ${SERIF}`
  ctx.fillStyle = '#F5F0E6'
  const rank = d.suitRank || 'A'
  const rw = ctx.measureText(rank).width
  const sw = ctx.measureText(d.suitSymbol || '♠').width
  const sx = cx - (rw + sw) / 2
  ctx.textAlign = 'left'
  ctx.fillText(rank, sx, sy + 96)
  if (d.suitTone === 'red') {
    ctx.fillStyle = accent
    ctx.shadowColor = 'rgba(200, 16, 46, .5)'
    ctx.shadowBlur = 24
  } else {
    ctx.fillStyle = '#0F0C08'
    ctx.strokeStyle = 'rgba(245, 240, 230, .45)'
    ctx.lineWidth = 2.6
    ctx.strokeText(d.suitSymbol || '♠', sx + rw, sy + 96)
  }
  ctx.fillText(d.suitSymbol || '♠', sx + rw, sy + 96)
  ctx.shadowBlur = 0
  ctx.fillStyle = gold
  ctx.font = `bold 24px ${MONO}`
  spaced(ctx, d.ticketNo, cx, sy + 150, 4.3, 'center')
  // 条码
  const bw = 280, bx = cx - bw / 2, by = sy + 176
  ctx.fillStyle = 'rgba(245, 240, 230, .68)'
  const bars = [3, 2, 2, 3, 5, 3, 2, 4, 3, 2, 2, 6]
  for (let x = 0, i = 0; x < bw; i++) {
    const w = bars[i % bars.length] * (i % 2 ? 0 : 1) || 0
    if (w) ctx.fillRect(bx + x, by, w, 64)
    x += bars[i % bars.length] + 1
  }
  ctx.fillStyle = 'rgba(245, 240, 230, .2)'
  ctx.fillRect(bx - 16, by + 76, bw + 32, 2)
  ctx.fillStyle = 'rgba(245, 240, 230, .5)'
  ctx.font = `18px ${SANS}`
  ctx.textAlign = 'left'
  ctx.fillText('扫码报名 · 到场凭票签到', left, sy + qs + 44)
  // 印章：ADMIT ONE
  ctx.save()
  ctx.translate(tx + tw - 48 + 0, ty + th - 48)
  ctx.rotate(-12 * Math.PI / 180)
  ctx.globalAlpha = 0.24
  ctx.strokeStyle = accent
  ctx.lineWidth = 34
  for (let a = 0; a < 360; a += 30) {
    ctx.beginPath()
    ctx.arc(0, 0, 101, (a * Math.PI) / 180, ((a + 22) * Math.PI) / 180)
    ctx.stroke()
  }
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, 84, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.textAlign = 'center'
  ctx.font = `italic bold 22px Georgia, serif`
  ctx.fillText('ADMIT ONE', 0, -6)
  ctx.fillRect(-22, 6, 44, 2)
  ctx.font = `bold 14px ${MONO}`
  ctx.fillText((d.series || 'TABLEJOKER').toUpperCase(), 0, 30)
  ctx.restore()
  ctx.restore()
  // 两侧的半圆缺口：用页面底色盖上
  ctx.fillStyle = '#0A0908'
  ;[tx, tx + tw].forEach((x) => { ctx.beginPath(); ctx.arc(x, py, 24, 0, Math.PI * 2); ctx.fill() })
  ctx.textAlign = 'left'
}
