// 分享图：微信群聊转发卡片（5:4）和 9:16 分享海报，用 Canvas 2D 画（小程序 canvas type="2d" 和 H5 的 canvas 接口一致）。
// 背景用比赛封面场景的主色做渐变，不画 SVG 封面（小程序的 canvas 不能可靠地绘制 SVG）。
// 海报上的二维码现在是 tj://match/<id>（应用里的扫码能认）；正式上线后换成服务端生成的小程序码（wxacode.getUnlimited）
import { qrMatrix } from './qr.js'

const SANS = '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif'
const font = (size, weight = 'normal') => `${weight} ${size}px ${SANS}`
const hexA = (hex, a) => {
  const n = parseInt(String(hex).slice(1), 16)
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

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
// 按宽度折行，最多 maxLines 行，超出的最后一行加省略号。
// 中文按字断行；连续的字母、数字（比如门牌号、Mall、300）不拆开
function wrap(ctx, text, maxW, maxLines) {
  const tokens = String(text).match(/[A-Za-z0-9][A-Za-z0-9.\-/:]*\s*|\s+|[\s\S]/g) || []
  const lines = []
  let line = ''
  let used = 0
  for (const tk of tokens) {
    if (ctx.measureText(line + tk).width > maxW && line) {
      lines.push(line.replace(/\s+$/, ''))
      line = tk.replace(/^\s+/, '')
      if (lines.length === maxLines) { line = ''; break }
    } else line += tk
    used++
  }
  if (lines.length < maxLines && line) lines.push(line)
  // 放不下的：把最后一行截短，加省略号
  if (used < tokens.length && lines.length) {
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
  // 半透明一律用 rgba（小程序 canvas 的 globalAlpha 不可靠）
  ctx.fillStyle = 'rgba(255, 255, 255, .18)'
  ctx.beginPath()
  ctx.arc(W * 0.82, H * 0.16, W * 0.17, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, .5)'
  ;[[0.12, 0.08], [0.3, 0.2], [0.55, 0.06], [0.66, 0.3], [0.2, 0.34]].forEach(([x, y], i) => {
    ctx.beginPath()
    ctx.arc(W * x, H * y, 1.6 + (i % 2), 0, Math.PI * 2)
    ctx.fill()
  })
}
function capsule(ctx, x, y, text, tone, size) {
  ctx.font = font(size, 'bold')
  const w = ctx.measureText(text).width + size * 1.6
  const h = size * 1.9
  ctx.fillStyle = hexA(tone, 0.2)
  roundRect(ctx, x, y, w, h, h / 2)
  ctx.fill()
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

// 图片按 cover 方式铺满一个矩形
function coverImage(ctx, img, x, y, w, h) {
  const iw = img.width || w, ih = img.height || h
  const k = Math.max(w / iw, h / ih)
  const dw = iw * k, dh = ih * k
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}
// 圆形头像：有图片画图片，没有就画首字
function avatar(ctx, cx, cy, r, a, ring) {
  ctx.fillStyle = ring
  ctx.beginPath()
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  if (a.img) coverImage(ctx, a.img, cx - r, cy - r, r * 2, r * 2)
  else {
    ctx.fillStyle = a.bg || '#35383F'
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    ctx.fillStyle = a.fg || '#FFFFFF'
    ctx.font = `bold ${Math.round(r * 0.9)}px ${SANS}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(a.char || '', cx, cy + 1)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }
  ctx.restore()
}
// 微信群聊转发卡片（5:4）：消息里已经有标题，卡片上不写标题，只放赛事封面、主办方头像、标签、开赛时间、已报名选手的头像。
// 设计尺寸 500×400，按 S 倍画（默认 2 倍，1000×800）。assets：{ cover, host }（已经加载好的图片）
export function drawCard(ctx, d, assets = {}, S = 2) {
  const W = 500, H = 400
  ctx.save()
  ctx.scale(S, S)
  // 封面铺满；没有封面时用场景主色
  if (assets.cover) coverImage(ctx, assets.cover, 0, 0, W, H)
  else {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, d.tint || '#3A2418')
    g.addColorStop(1, '#0B0C10')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  // 上下压暗，保证文字清楚
  const top = ctx.createLinearGradient(0, 0, 0, 150)
  top.addColorStop(0, 'rgba(0, 0, 0, .62)')
  top.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = top
  ctx.fillRect(0, 0, W, 150)
  const bottom = ctx.createLinearGradient(0, 190, 0, H)
  bottom.addColorStop(0, 'rgba(0, 0, 0, 0)')
  bottom.addColorStop(1, 'rgba(0, 0, 0, .82)')
  ctx.fillStyle = bottom
  ctx.fillRect(0, 190, W, H - 190)
  // 左上：主办方头像 + 名字（主办方创建的带 V）
  avatar(ctx, 52, 52, 26, { img: assets.host, char: d.hostChar, bg: d.hostBg, fg: d.hostFg }, '#FFFFFF')
  if (d.byHost) {
    ctx.fillStyle = '#DC0000'
    ctx.beginPath()
    ctx.arc(72, 72, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `bold 12px ${SANS}`
    ctx.textAlign = 'center'
    ctx.fillText('V', 72, 76.5)
    ctx.textAlign = 'left'
  }
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold 17px ${SANS}`
  ctx.fillText(wrap(ctx, d.host, 170, 1)[0] || '', 92, 49)
  ctx.fillStyle = 'rgba(255, 255, 255, .82)'
  ctx.font = `13px ${SANS}`
  ctx.fillText(d.byHost ? '主办方' : '发起人', 92, 68)
  // 右上：标签（最多 2 个）
  let rx = W - 24
  ;(d.tags || []).slice(0, 2).reverse().forEach((t) => {
    ctx.font = `bold 14px ${SANS}`
    const w = ctx.measureText(t).width + 20
    rx -= w
    ctx.fillStyle = 'rgba(220, 0, 0, .88)'
    roundRect(ctx, rx, 36, w, 28, 8)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(t, rx + 10, 55)
    rx -= 8
  })
  // 左下：开赛时间（小时:分钟）
  ctx.fillStyle = 'rgba(255, 255, 255, .88)'
  ctx.font = `bold 16px ${SANS}`
  ctx.fillText(`${d.date} 开赛`, 26, 300)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold 78px ${SANS}`
  ctx.fillText(d.time, 22, 372)
  // 右下：已报名选手的头像气泡
  const people = (d.people || []).slice(0, 5)
  const more = Math.max(0, (d.people || []).length - people.length)
  const r = 20, step = 30
  const n = people.length + (more ? 1 : 0)
  let cx = W - 26 - r - (n - 1) * step
  people.forEach((pp, i) => {
    avatar(ctx, cx, 334, r, { char: pp.char, bg: pp.bg, fg: pp.fg }, '#FFFFFF')
    cx += step
  })
  if (more) avatar(ctx, cx, 334, r, { char: '+' + more, bg: '#35383F', fg: '#FFFFFF' }, '#FFFFFF')
  if (n) {
    ctx.fillStyle = 'rgba(255, 255, 255, .88)'
    ctx.font = `13px ${SANS}`
    const cap = d.playerCount ? `已报名 ${d.playerCount}` : ''
    ctx.textAlign = 'right'
    ctx.fillText(cap, W - 24, 380)
    ctx.textAlign = 'left'
  }
  ctx.restore()
}

// 票据：上面是正票（品牌行、赛事标题、主办方、2×2 信息格），下面是存根（二维码、花色、票号），
// 中间是打孔线和两侧的半圆缺口。画布 840×1360，票面 760×1240 居中。
// 票面以外和两个缺口是透明的（导出 PNG），发到微信里显示成聊天背景的颜色。
// 小程序 canvas 的阴影、globalAlpha 和花色字符（♠ 会变成彩色表情）表现和浏览器不一致，这里都不用：
// 发光用渐变，半透明用 rgba，花色用路径画。票据以后放到服务端统一生成，画法只依赖票据数据
const SERIF = '"Songti SC", "Noto Serif SC", "Noto Serif CJK SC", Georgia, serif'
const MONO = 'Menlo, "SF Mono", "Courier New", monospace'
const IVORY = '#F5F0E6'
const GOLD = '#D4B478'
const RED = '#E01B3C'
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
function hline(ctx, x, y, w, color, h = 2) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}
function fit(ctx, text, maxW) {
  return wrap(ctx, text, maxW, 1)[0] || ''
}
// 票据的版面：先量好每一块的高度，票面高度跟着内容走（地址完整显示，不加省略号）
const T = { W: 840, tx: 40, ty: 48, tw: 760 }
T.left = T.tx + 64
T.right = T.tx + T.tw - 64
T.cw = T.right - T.left
function linesOf(ctx, text, maxW, maxLines) {
  if (!text) return []
  return wrap(ctx, text, maxW, maxLines)
}
export const TICKET_W = T.W
export function ticketLayout(ctx, d) {
  const L = {}
  ctx.font = `bold 60px ${SERIF}`
  L.title = linesOf(ctx, d.title, T.cw, 2)
  ctx.font = `bold 38px ${SANS}`
  L.venue = linesOf(ctx, d.venue, T.cw, 2)
  ctx.font = `27px ${SANS}`
  L.address = linesOf(ctx, d.address, T.cw, 4)
  const y = {}
  y.brand = T.ty + 80
  y.title = T.ty + 182
  y.host = y.title + (L.title.length - 1) * 74 + 66
  y.row = y.host + 42
  y.rowEnd = y.row + 132
  y.venueLabel = y.rowEnd + 58
  y.venue = y.venueLabel + 56
  y.address = y.venue + (L.venue.length - 1) * 48 + 48
  y.note = y.address + Math.max(0, L.address.length - 1) * 40 + (L.address.length ? 54 : 6)
  y.perf = y.note + 62
  y.stub = y.perf + 54
  y.footer = y.stub + 248 + 66
  L.th = y.footer + 40 - T.ty
  L.H = T.ty + L.th + 48
  L.y = y
  return L
}
// 票据：比赛邀请。上面是正票（品牌行、赛事标题、主办方、日期 / 开赛 / 起始盲注、地点和完整地址、到场提醒），
// 下面是存根（扫码报名的二维码和说明），中间是打孔线和两侧的半圆缺口。票面以外和缺口透明（导出 PNG）。
// 小程序 canvas 的阴影、globalAlpha、花色字符都和浏览器不一致，这里都不用：半透明用 rgba，发光用渐变
export function drawTicket(ctx, d, L) {
  const { tx, ty, tw, left, right, cw } = T
  const W = T.W, H = L.H, th = L.th, y = L.y
  const IV = (a) => `rgba(245, 240, 230, ${a})`
  ctx.clearRect(0, 0, W, H)
  ctx.save()
  roundRect(ctx, tx, ty, tw, th, 26)
  ctx.clip()
  const body = ctx.createLinearGradient(0, ty, 0, ty + th)
  ;[[0, '#2C1C13'], [0.45, '#21170F'], [0.7, '#1C140D'], [1, '#110B08']].forEach(([o, c]) => body.addColorStop(o, c))
  ctx.fillStyle = body
  ctx.fillRect(tx, ty, tw, th)
  const glow = ctx.createRadialGradient(tx + tw * 0.82, ty, 0, tx + tw * 0.82, ty, tw * 0.9)
  glow.addColorStop(0, 'rgba(212, 180, 120, .16)')
  glow.addColorStop(1, 'rgba(212, 180, 120, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(tx, ty, tw, y.perf - ty)
  ctx.strokeStyle = 'rgba(212, 180, 120, .08)'
  ctx.lineWidth = 2
  for (let k = 0; k < 7; k++) {
    ctx.beginPath()
    ctx.arc(tx + tw - 40, ty + 40, 120 + k * 26, Math.PI * 0.5, Math.PI)
    ctx.stroke()
  }
  const rnd = seeded(d.seed || 7)
  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(0, 0, 0, .16)' : 'rgba(255, 240, 220, .04)'
    ctx.fillRect(tx + rnd() * tw, ty + rnd() * th, 1.6, 1.6)
  }
  const halo = ctx.createLinearGradient(0, y.perf - 80, 0, y.perf + 80)
  halo.addColorStop(0, 'rgba(180, 22, 48, 0)')
  halo.addColorStop(0.5, 'rgba(180, 22, 48, .14)')
  halo.addColorStop(1, 'rgba(180, 22, 48, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(tx, y.perf - 80, tw, 160)
  ctx.textBaseline = 'alphabetic'

  // ① 品牌行：这是一张「比赛邀请」
  ctx.font = `bold 20px ${MONO}`
  ctx.fillStyle = GOLD
  spaced(ctx, 'TABLEJOKER', left, y.brand, 5)
  ctx.font = `bold 22px ${SANS}`
  ctx.fillStyle = '#FF5A6E'
  spaced(ctx, '比赛邀请 · INVITATION', right, y.brand, 2, 'right')
  hline(ctx, left, y.brand + 26, cw, 'rgba(212, 180, 120, .3)')

  // ② 赛事标题 + 主办方
  ctx.fillStyle = IVORY
  ctx.font = `bold 60px ${SERIF}`
  L.title.forEach((line, i) => ctx.fillText(line, left, y.title + i * 74))
  ctx.font = `bold 20px ${SANS}`
  const tagW = ctx.measureText('主办').width + 24
  ctx.strokeStyle = '#FF5A6E'
  ctx.lineWidth = 2
  roundRect(ctx, left, y.host - 26, tagW, 36, 8)
  ctx.stroke()
  ctx.fillStyle = '#FF5A6E'
  ctx.fillText('主办', left + 12, y.host - 1)
  ctx.fillStyle = IV(0.92)
  ctx.font = `30px ${SANS}`
  const host = fit(ctx, d.host, cw - tagW - 60)
  ctx.fillText(host, left + tagW + 16, y.host)
  if (d.byHost) {
    const vx = left + tagW + 16 + ctx.measureText(host).width + 22
    ctx.fillStyle = RED
    ctx.beginPath()
    ctx.arc(vx, y.host - 10, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `bold 18px ${SANS}`
    ctx.textAlign = 'center'
    ctx.fillText('V', vx, y.host - 3)
    ctx.textAlign = 'left'
  }

  // ③ 日期 / 开赛 / 起始盲注：一行三格
  const lineC = 'rgba(245, 240, 230, .16)'
  hline(ctx, left, y.row, cw, lineC)
  hline(ctx, left, y.rowEnd, cw, lineC)
  const colW = cw / 3
  ;[colW, colW * 2].forEach((x) => { ctx.fillStyle = lineC; ctx.fillRect(left + x, y.row, 2, y.rowEnd - y.row) })
  const cells = [
    { label: '日期', value: d.dateMain, sub: d.weekday },
    { label: '开赛', value: d.time },
    { label: `起始盲注 · ${d.levels} 级`, value: d.blinds }
  ]
  cells.forEach((c, i) => {
    const cx = left + i * colW + (i ? 26 : 0)
    ctx.fillStyle = 'rgba(212, 180, 120, .95)'
    ctx.font = `bold 20px ${SANS}`
    ctx.fillText(fit(ctx, c.label, colW - 30), cx, y.row + 44)
    ctx.fillStyle = IVORY
    ctx.font = `bold 44px ${SERIF}`
    const v = fit(ctx, c.value, colW - 30)
    const vw = ctx.measureText(v).width
    ctx.fillText(v, cx, y.row + 104)
    if (c.sub) {
      ctx.fillStyle = IV(0.86)
      ctx.font = `24px ${SANS}`
      ctx.fillText(c.sub, cx + vw + 10, y.row + 104)
    }
  })

  // ④ 地点：名称 + 完整地址 + 到场提醒（整行，地址自动换行）
  ctx.fillStyle = 'rgba(212, 180, 120, .95)'
  ctx.font = `bold 20px ${SANS}`
  ctx.fillText('地点', left, y.venueLabel)
  ctx.fillStyle = IVORY
  ctx.font = `bold 38px ${SANS}`
  L.venue.forEach((line, i) => ctx.fillText(line, left, y.venue + i * 48))
  ctx.fillStyle = IV(0.86)
  ctx.font = `27px ${SANS}`
  L.address.forEach((line, i) => ctx.fillText(line, left, y.address + i * 40))
  ctx.fillStyle = '#E8CB8C'
  ctx.font = `bold 24px ${SANS}`
  ctx.fillText('请提前 15 分钟到场签到', left, y.note)

  // ⑤ 打孔线
  ctx.fillStyle = IV(0.26)
  for (let x = tx + 44; x < tx + tw - 44; x += 34) ctx.fillRect(x, y.perf - 1.5, 16, 3)

  // ⑥ 存根：扫码报名
  const qs = 248
  ctx.fillStyle = IVORY
  roundRect(ctx, left, y.stub, qs, qs, 22)
  ctx.fill()
  drawQR(ctx, d.qr, left + 12, y.stub + 12, qs - 24)
  const rx = left + qs + 40
  const rw = right - rx
  ctx.fillStyle = IVORY
  ctx.font = `bold 46px ${SANS}`
  ctx.fillText('扫码报名', rx, y.stub + 62)
  ctx.fillStyle = '#FF5A6E'
  ctx.fillRect(rx, y.stub + 84, 56, 5)
  ctx.fillStyle = IV(0.92)
  ctx.font = `bold 27px ${SANS}`
  ctx.fillText('微信扫一扫', rx, y.stub + 136)
  ctx.fillStyle = IV(0.82)
  ctx.font = `24px ${SANS}`
  // 分两行写，避免最后一个字单独折到下一行
  ;['打开比赛邀请页', '查看详情并报名'].forEach((line, i) => ctx.fillText(fit(ctx, line, rw), rx, y.stub + 176 + i * 34))
  ctx.fillStyle = IV(0.62)
  ctx.font = `20px ${SANS}`
  spaced(ctx, '牌局计时 · 数据大屏', left, y.footer, 2)
  ctx.fillStyle = 'rgba(212, 180, 120, .8)'
  ctx.font = `bold 18px ${MONO}`
  spaced(ctx, d.ticketNo, right, y.footer, 3, 'right')
  ctx.restore()

  // ⑦ 两侧的半圆缺口：挖成透明
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000000'
  ;[tx, tx + tw].forEach((x) => { ctx.beginPath(); ctx.arc(x, y.perf, 26, 0, Math.PI * 2); ctx.fill() })
  ctx.restore()
  ctx.globalCompositeOperation = 'source-over'
  ctx.textAlign = 'left'
}
