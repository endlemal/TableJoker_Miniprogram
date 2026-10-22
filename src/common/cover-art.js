// 比赛封面插画：同一个场景按不同比例重新构图（不是裁切），每种比例都保留画面重心。
// 用法：coverArt('blood', 'wide') 返回 SVG 字符串；尺寸见 COVER_SIZES。
// 随机元素（星星、树、云）用固定种子生成，同一场景同一尺寸每次输出完全一样。

export const COVER_SIZES = {
  banner: { w: 600, h: 200, label: '3:1 横幅' },
  wide: { w: 640, h: 360, label: '16:9 宽屏' },
  share: { w: 500, h: 400, label: '5:4 分享卡片' },
  square: { w: 480, h: 480, label: '1:1 方形' },
  portrait: { w: 450, h: 600, label: '3:4 竖版' },
  story: { w: 450, h: 800, label: '9:16 海报' }
}

// 给一个宽高比，返回最接近的尺寸
export const nearestSize = (ratio) => Object.keys(COVER_SIZES).reduce((best, k) => {
  const d = (key) => Math.abs(Math.log(COVER_SIZES[key].w / COVER_SIZES[key].h / ratio))
  return d(k) < d(best) ? k : best
}, 'banner')

/* ---------- 基础图元 ---------- */
const n = (v) => Math.round(v * 10) / 10
const pts = (arr) => arr.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')
const C = (cx, cy, r, fill, more = '') => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"${more}/>`
const E = (cx, cy, rx, ry, fill, more = '') => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"${more}/>`
const R = (x, y, w, h, fill, more = '') => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}"${more}/>`
const P = (arr, fill, more = '') => `<polygon points="${pts(arr)}" fill="${fill}"${more}/>`
const D = (d, fill, more = '') => `<path d="${d}" fill="${fill}"${more}/>`
const LINE = (x1, y1, x2, y2, stroke, w, more = '') =>
  `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${stroke}" stroke-width="${n(w)}" stroke-linecap="round"${more}/>`

const seeded = (seed) => {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

// 画面几何：比例、短边、地平线高度（横图低一些，竖图留更多天空）
const geo = (W, H) => {
  const a = W / H
  return { W, H, a, m: Math.min(W, H), wide: a >= 1.15, tall: a < 0.9, hz: H * (a >= 2.4 ? 0.7 : a >= 1.15 ? 0.66 : a >= 0.9 ? 0.64 : 0.6) }
}

// 平滑起伏的地形线，闭合到 bottom
function ridge(W, base, amp, segs, rnd, bottom) {
  const step = W / segs
  let y0 = base + (rnd() - 0.5) * 2 * amp
  let d = `M0 ${n(y0)}`
  for (let i = 1; i <= segs; i++) {
    const x = i * step
    const y = base + (rnd() - 0.5) * 2 * amp
    d += ` C${n(x - step * 0.55)} ${n(y0)} ${n(x - step * 0.45)} ${n(y)} ${n(x)} ${n(y)}`
    y0 = y
  }
  return d + ` L${n(W)} ${n(bottom)} L0 ${n(bottom)} Z`
}

function stars(W, top, bottom, count, rnd, avoid, dim, bright) {
  let out = ''
  for (let i = 0; i < count; i++) {
    const x = rnd() * W
    const y = top + rnd() * (bottom - top)
    const big = rnd() > 0.8
    if (avoid.some(([ax, ay, ar]) => (x - ax) ** 2 + (y - ay) ** 2 < ar * ar)) continue
    out += C(x, y, big ? 1.6 : 1.1, big ? bright : dim)
  }
  return out
}

const pine = (x, base, h, fill) => {
  const w = h * 0.5
  return P([[x - w / 2, base], [x - w * 0.2, base - h * 0.45], [x - w * 0.38, base - h * 0.45], [x, base - h],
    [x + w * 0.38, base - h * 0.45], [x + w * 0.2, base - h * 0.45], [x + w / 2, base]], fill)
}
function forest(x0, x1, base, hMin, hMax, rnd, fill) {
  let out = ''
  let x = x0
  while (x < x1) {
    const h = hMin + rnd() * (hMax - hMin)
    out += pine(x, base, h, fill)
    x += h * (0.32 + rnd() * 0.22)
  }
  return out
}

const redMoon = (cx, cy, r, halo1, halo2, crater) =>
  C(cx, cy, r * 1.9, halo1) + C(cx, cy, r * 1.45, halo2) + C(cx, cy, r, '#D8382E') +
  C(cx - r * 0.32, cy - r * 0.27, r * 0.23, crater) + C(cx + r * 0.36, cy + r * 0.32, r * 0.16, crater) + C(cx + r * 0.41, cy - r * 0.41, r * 0.11, crater)

/* ---------- 场景 ---------- */

// 血夜：只有一扇窗还亮着
function blood(W, H) {
  const g = geo(W, H)
  const rnd = seeded(101)
  const mx = W * (g.wide ? 0.73 : 0.66)
  const my = g.hz * (g.wide ? 0.4 : 0.36)
  const mr = g.m * 0.2
  const gy = g.hz + (H - g.hz) * (g.tall ? 0.38 : 0.55)
  const u = (g.m / 100) * (g.tall ? 0.7 : 1)
  const x0 = W * (g.wide ? 0.33 : 0.42) - 46 * u
  const house = (x, w, h1, h2) => P([[x, gy], [x, gy - h1 * u], [x + (w * u) / 2, gy - h2 * u], [x + w * u, gy - h1 * u], [x + w * u, gy]], '#120A0E')
  let s = R(0, 0, W, H, '#1A0F14') + stars(W, 0, g.hz * 0.85, Math.round((W * H) / 9000), rnd, [[mx, my, mr * 2]], '#7A5A60', '#E8CFCB')
  s += redMoon(mx, my, mr, '#22131A', '#2C141B', '#BF2E26')
  s += D(ridge(W, g.hz, H * 0.035, Math.max(3, Math.round(g.a * 2)), rnd, H), '#2A141B')
  s += house(x0, 20, 14, 23) + house(x0 + 24 * u, 28, 18, 30)
  s += P([[x0 + 56 * u, gy], [x0 + 56 * u, gy - 26 * u], [x0 + 62 * u, gy - 37 * u], [x0 + 68 * u, gy - 26 * u], [x0 + 68 * u, gy]], '#120A0E')
  s += R(x0 + 61.4 * u, gy - 43 * u, 1.2 * u, 6 * u, '#120A0E') + R(x0 + 59.6 * u, gy - 41.4 * u, 4.8 * u, 1.2 * u, '#120A0E')
  s += house(x0 + 72 * u, 20, 13, 21)
  s += R(x0 + 34 * u, gy - 15 * u, 5 * u, 6 * u, '#FFB22E') + R(x0 + 77 * u, gy - 10 * u, 4 * u, 5 * u, '#5A2F1C')
  s += R(0, gy - 1, W, H - gy + 1, '#120A0E')
  s += forest(-6 * u, x0 - 8 * u, gy + 1, 16 * u, 34 * u, rnd, '#0C0709') + forest(x0 + 100 * u, W + 10 * u, gy + 1, 16 * u, 36 * u, rnd, '#0C0709')
  if (g.tall) s += forest(-W * 0.04, W * 0.16, H + 2, H * 0.24, H * 0.38, rnd, '#080406') + forest(W * 0.86, W * 1.06, H + 2, H * 0.24, H * 0.38, rnd, '#080406')
  return s
}

// 荒野：走到最后的人，才看得见日落
function wild(W, H) {
  const g = geo(W, H)
  const hz = g.hz
  const sx = W * (g.wide ? 0.66 : 0.5)
  const sr = g.m * (g.wide ? 0.22 : 0.27)
  let s = R(0, 0, W, hz * 0.57, '#2B1712') + R(0, hz * 0.57, W, hz * 0.23, '#4A2216') + R(0, hz * 0.8, W, hz * 0.2 + 1, '#7A3317')
  s += C(sx, hz, sr, '#F08A3C')
  for (const [dy, hh] of [[0.52, 0.07], [0.33, 0.1], [0.14, 0.13]]) s += R(sx - sr - 2, hz - sr * dy, sr * 2 + 4, sr * hh, '#7A3317')
  const mesa = (x, w, h) => `M${n(x)} ${n(hz)} L${n(x + w * 0.12)} ${n(hz - h)} L${n(x + w * 0.88)} ${n(hz - h)} L${n(x + w)} ${n(hz)} Z`
  const mesas = g.wide
    ? [[0.03, 0.12, 0.085], [0.19, 0.06, 0.05], [0.4, 0.09, 0.07], [0.86, 0.09, 0.045]]
    : [[0.0, 0.2, 0.06], [0.76, 0.14, 0.05], [0.9, 0.12, 0.035]]
  s += D(mesas.map(([x, w, h]) => mesa(x * W, w * W, h * H)).join(' '), '#1E120E')
  s += R(0, hz, W, H - hz, '#3A2016')
  const vx = g.wide ? W * 0.53 : sx
  const bw = W * (g.wide ? 0.2 : 0.56)
  s += P([[vx - bw / 2, H], [vx + bw / 2, H], [vx + 2, hz], [vx - 2, hz]], '#22140F')
  for (const t of [0.16, 0.4, 0.72]) {
    const y = hz + (H - hz) * t
    const dw = 1 + bw * 0.025 * t
    s += R(vx - dw / 2, y, dw, (H - hz) * 0.07 * (0.5 + t), '#C8935A')
  }
  s += E(W * 0.27, hz + (H - hz) * 0.45, W * 0.018, H * 0.014, '#2A1712') + E(W * 0.8, hz + (H - hz) * 0.66, W * 0.024, H * 0.018, '#2A1712')
  const tx = W * (g.wide ? 0.08 : 0.12)
  const th = (H - hz) * 0.75
  const k = th / 20
  s += `<g stroke="#140C09" stroke-width="${n(Math.max(2, k * 2))}" stroke-linecap="round" fill="none">` +
    `<path d="M${n(tx)} ${n(H)} L${n(tx)} ${n(H - th)}"/><path d="M${n(tx)} ${n(H - 14 * k)} L${n(tx - 7 * k)} ${n(H - 21 * k)}"/>` +
    `<path d="M${n(tx)} ${n(H - 17 * k)} L${n(tx + 7 * k)} ${n(H - 25 * k)} L${n(tx + 11 * k)} ${n(H - 26 * k)}"/></g>`
  const bird = (x, y, a) => `<path d="M${n(x)} ${n(y)} q${n(a)} ${n(-a)} ${n(2 * a)} 0 q${n(a)} ${n(-a)} ${n(2 * a)} 0" fill="none" stroke="#140C09" stroke-width="${n(g.m * 0.007)}" stroke-linecap="round"/>`
  s += bird(sx - sr * 0.15, hz - sr * 1.55, g.m * 0.02) + bird(sx - sr * 0.8, hz - sr * 1.22, g.m * 0.015)
  return s
}

// 丛林：最安静的那一个，往往最危险
function jungle(W, H) {
  const g = geo(W, H)
  const rnd = seeded(303)
  let s = R(0, 0, W, H, '#0B1A13') + P([[W * 0.53, 0], [W * 0.63, 0], [W * 0.78, H], [W * 0.62, H]], '#10251B')
  const band = H * (g.tall ? 0.56 : 0.6)
  const br = Math.min(H * 0.27, W * 0.16)
  if (g.tall || !g.wide) {
    let far = ''
    for (let x = -br * 0.5; x < W + br; x += br * 1.3) far += C(x, band - br * 1.45 + (rnd() - 0.5) * br * 0.5, br * (0.9 + rnd() * 0.3), '#0D1F17')
    s += far
  }
  let mid = ''
  for (let x = -br * 0.4; x < W + br; x += br * 1.45) mid += C(x, band + (rnd() - 0.5) * br * 0.5, br * (0.85 + rnd() * 0.3), '#10261B')
  s += mid + R(0, band + br * 0.3, W, H, '#10261B')
  const eyes = (x, y, sc, col) => E(x - sc * 1.7, y, sc * 1.6, sc, col) + E(x + sc * 1.7, y, sc * 1.6, sc, col) +
    R(x - sc * 1.95, y - sc * 0.85, sc * 0.5, sc * 1.7, '#0B1A13') + R(x + sc * 1.45, y - sc * 0.85, sc * 0.5, sc * 1.7, '#0B1A13')
  const es = g.m * 0.016
  s += eyes(W * (g.wide ? 0.36 : 0.3), band + br * 0.05, es * 1.25, '#D7F25C') + eyes(W * (g.wide ? 0.74 : 0.72), band - br * 0.3, es * 0.85, '#F2C14E')
  const nr = Math.min(H * 0.19, W * 0.12)
  let near = ''
  for (let x = -nr * 0.3; x < W + nr; x += nr * 1.7) near += C(x, H - nr * 0.45 + (rnd() - 0.5) * nr * 0.4, nr * (0.85 + rnd() * 0.3), '#163324')
  s += near
  const vine = (x, len) => `<path d="M${n(x)} 0 C${n(x - len * 0.06)} ${n(len * 0.4)} ${n(x + len * 0.1)} ${n(len * 0.6)} ${n(x - len * 0.02)} ${n(len)}" fill="none" stroke="#163324" stroke-width="${n(g.m * 0.008)}"/>` +
    E(x + len * 0.02, len * 0.55, g.m * 0.016, g.m * 0.008, '#163324') + E(x - len * 0.03, len * 0.82, g.m * 0.016, g.m * 0.008, '#163324')
  s += vine(W * 0.21, band * 0.6) + vine(W * 0.81, band * 0.45)
  const k = g.m / 96
  s += `<g fill="#07120C"><path transform="translate(0 ${n(H - 96 * k)}) scale(${n(k)})" d="M0 96 C4 76 20 62 46 60 C34 70 26 82 24 96 Z M0 70 C14 66 28 70 36 80 C22 78 10 80 0 84 Z"/>` +
    `<path transform="translate(${n(W - 62 * k)} ${n(H - 62 * k)}) scale(${n(k)})" d="M62 0 C34 4 14 18 0 42 C22 30 42 26 62 26 Z M62 28 C40 32 26 44 20 62 L62 62 Z"/></g>`
  return s
}

// 雪原：雪地上的脚印，会出卖每一步
function snow(W, H) {
  const g = geo(W, H)
  const rnd = seeded(404)
  const mx = W * (g.wide ? 0.77 : 0.7)
  const my = H * (g.wide ? 0.26 : 0.17)
  const mr = g.m * 0.11
  let s = R(0, 0, W, H, '#0E1424') + stars(W, 0, g.hz * 0.8, Math.round((W * H) / 8000), rnd, [[mx, my, mr * 1.6]], '#8E9BB8', '#E9EEF6')
  s += C(mx, my, mr, '#E9EEF6') + C(mx + mr * 0.45, my - mr * 0.33, mr * 0.92, '#0E1424')
  const peaks = [[-W * 0.05, g.hz]]
  const caps = []
  let x = -W * 0.05
  while (x < W * 1.05) {
    const w = W * (0.08 + rnd() * 0.1) * (g.tall ? 1.6 : 1)
    const ph = H * (0.1 + rnd() * 0.16) * (g.tall ? 0.7 : 1)
    peaks.push([x + w / 2, g.hz - ph])
    caps.push([x + w / 2, g.hz - ph, w])
    x += w
    peaks.push([x, g.hz - H * (0.02 + rnd() * 0.05)])
  }
  peaks.push([W * 1.05, H], [-W * 0.05, H])
  s += P(peaks, '#1C2740')
  for (const [px, py, w] of caps) s += P([[px - w * 0.12, py + w * 0.1], [px, py], [px + w * 0.12, py + w * 0.1], [px + w * 0.04, py + w * 0.07], [px - w * 0.03, py + w * 0.11]], '#C9D3E3')
  const back = g.hz + (H - g.hz) * 0.12
  s += D(ridge(W, back, H * 0.025, 3, rnd, H), '#B9C5D8')
  s += forest(W * 0.74, W * 0.86, back + H * 0.012, g.m * 0.07, g.m * 0.12, rnd, '#0B1020')
  const front = g.hz + (H - g.hz) * 0.45
  s += D(ridge(W, front, H * 0.025, 3, rnd, H), '#E3E9F2')
  const steps = 14
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const px = W * (0.06 + t * 0.5)
    const py = H * 0.97 - (H * 0.97 - (front + H * 0.035)) * Math.pow(t, 0.8)
    const sz = g.m * 0.012 * (1.4 - t * 0.8)
    s += E(px, py + (i % 2 ? -sz * 1.4 : 0), sz * 1.6, sz, '#9FB0C8')
  }
  return s
}

// 迷雾：雾散之前，没人知道底牌
function fog(W, H) {
  const g = geo(W, H)
  const rnd = seeded(505)
  const sea = H * (g.wide ? 0.7 : 0.66)
  const lx = W * (g.wide ? 0.82 : 0.7)
  const th = H * (g.wide ? 0.34 : 0.3)
  const tw = g.m * 0.05
  const lampY = sea - th
  let s = R(0, 0, W, H, '#151A24') + stars(W, 0, lampY, Math.round((W * H) / 20000), rnd, [], '#3A4252', '#5A6478')
  s += P([[lx, lampY], [0, lampY - H * 0.2], [0, lampY + H * 0.17]], '#FFE3A3', ' fill-opacity=".12"') +
    P([[lx, lampY], [0, lampY - H * 0.08], [0, lampY + H * 0.07]], '#FFE3A3', ' fill-opacity=".1"')
  s += D(ridge(W, sea - H * 0.14, H * 0.025, 5, rnd, sea), '#232A36')
  s += R(0, sea, W, H - sea, '#10141C')
  const rw = tw * 6
  s += P([[lx - rw / 2, sea + H * 0.06], [lx - rw * 0.3, sea], [lx + rw * 0.3, sea], [lx + rw / 2, sea + H * 0.06]], '#0A0D13')
  s += P([[lx - tw * 0.9, sea + 1], [lx - tw * 0.5, lampY + tw * 0.4], [lx + tw * 0.5, lampY + tw * 0.4], [lx + tw * 0.9, sea + 1]], '#0A0D13')
  s += R(lx - tw * 0.55, lampY - tw * 0.7, tw * 1.1, tw * 1.1, '#0A0D13') + P([[lx - tw * 0.7, lampY - tw * 0.7], [lx, lampY - tw * 1.45], [lx + tw * 0.7, lampY - tw * 0.7]], '#0A0D13') +
    R(lx - tw * 0.85, lampY + tw * 0.38, tw * 1.7, tw * 0.18, '#0A0D13') + R(lx - tw * 0.33, lampY - tw * 0.48, tw * 0.66, tw * 0.62, '#FFE3A3')
  const bs = g.m / 96
  const bx = W * (g.wide ? 0.3 : 0.24)
  const by = sea + bs
  s += P([[bx, by], [bx + 30 * bs, by], [bx + 26 * bs, by + 5 * bs], [bx + 4 * bs, by + 5 * bs]], '#0A0D13') +
    R(bx + 14 * bs, by - 14 * bs, 1.2 * bs, 14 * bs, '#0A0D13') + P([[bx + 15.2 * bs, by - 13 * bs], [bx + 15.2 * bs, by - 2 * bs], [bx + 24 * bs, by - 2 * bs]], '#0A0D13')
  s += D(ridge(W, sea + (H - sea) * 0.22, H * 0.02, 4, rnd, H), '#2E3644', ' fill-opacity=".9"')
  s += D(ridge(W, sea + (H - sea) * 0.58, H * 0.02, 4, rnd, H), '#3A4352')
  return s
}

// 月林：林中每一双眼睛，都在等天亮（首页赛事卡片原来的血月森林）
function moonwood(W, H) {
  const g = geo(W, H)
  const rnd = seeded(606)
  const mx = W * (g.wide ? 0.7 : 0.5)
  const my = g.hz * 0.42
  const mr = g.m * (g.wide ? 0.22 : 0.24)
  let s = R(0, 0, W, H, '#1C1117') + stars(W, 0, g.hz * 0.85, Math.round((W * H) / 9000), rnd, [[mx, my, mr * 2]], '#7A5A60', '#E8CFCB')
  s += redMoon(mx, my, mr, '#22131A', '#2B151C', '#C02E25')
  // 回到首页原版的构图：山体一条线，两侧各一丛高树，中间留给月亮
  s += D(ridge(W, g.hz, H * 0.05, 4, rnd, H), '#2A151B')
  const gy = g.hz + (H - g.hz) * 0.6
  s += R(0, gy, W, H - gy, '#120C10')
  const th = (H - g.hz) + H * 0.12
  s += forest(-W * 0.02, W * (g.wide ? 0.2 : 0.24), gy + 1, th * 0.55, th, rnd, '#120C10')
  s += forest(W * (g.wide ? 0.8 : 0.76), W * 1.06, gy + 1, th * 0.55, th, rnd, '#120C10')
  return s
}

// 冰山：你看到的，只是露出水面的一角
function iceberg(W, H) {
  const g = geo(W, H)
  const rnd = seeded(707)
  const wl = H * (g.wide ? 0.46 : 0.36)
  let s = R(0, 0, W, wl, '#0E1A2B') + stars(W, 0, wl * 0.8, Math.round((W * wl) / 7000), rnd, [], '#4A5B78', '#DCE6F2')
  s += D(`M0 ${n(wl * 0.3)} C${n(W * 0.25)} ${n(wl * 0.1)} ${n(W * 0.55)} ${n(wl * 0.45)} ${n(W)} ${n(wl * 0.2)} L${n(W)} ${n(wl * 0.32)} C${n(W * 0.55)} ${n(wl * 0.58)} ${n(W * 0.25)} ${n(wl * 0.22)} 0 ${n(wl * 0.42)} Z`, '#2FBF9B', ' fill-opacity=".13"')
  s += D(`M0 ${n(wl * 0.16)} C${n(W * 0.3)} ${n(wl * 0.02)} ${n(W * 0.6)} ${n(wl * 0.3)} ${n(W)} ${n(wl * 0.08)} L${n(W)} ${n(wl * 0.14)} C${n(W * 0.6)} ${n(wl * 0.38)} ${n(W * 0.3)} ${n(wl * 0.1)} 0 ${n(wl * 0.24)} Z`, '#7FE0C4', ' fill-opacity=".08"')
  const dh = H - wl
  s += R(0, wl, W, dh, '#0B2A3A') + R(0, wl + dh * 0.45, W, dh * 0.55, '#082231') + R(0, wl + dh * 0.78, W, dh * 0.22, '#061A26')
  const cx = W * (g.wide ? 0.4 : 0.5)
  const tw = Math.min(W * 0.36, wl * 1.9)
  const tH = wl * (g.wide ? 0.62 : 0.58)
  const D2 = H * 0.95 - wl
  const at = (arr, base, hh) => arr.map(([a, b]) => [cx + a * tw, base + b * hh])
  s += P(at([[-0.5, 0], [-0.95, 0.22], [-1.08, 0.52], [-0.72, 0.88], [0.05, 1], [0.86, 0.8], [1.12, 0.44], [0.82, 0.14], [0.5, 0]], wl, D2), '#1D4E5F')
  s += P(at([[-0.5, 0], [-0.95, 0.22], [-1.08, 0.52], [-0.3, 0.4]], wl, D2), '#23606F') + P(at([[0.5, 0], [0.82, 0.14], [1.12, 0.44], [0.3, 0.36]], wl, D2), '#163F4E')
  s += P(at([[-0.5, 0], [-0.34, -0.38], [-0.18, -0.55], [-0.06, -0.5], [0.06, -1], [0.2, -0.62], [0.33, -0.46], [0.5, 0]], wl, tH), '#E6F0F5')
  s += P(at([[0.06, -1], [0.2, -0.62], [0.33, -0.46], [0.5, 0], [0.1, 0]], wl, tH), '#B8CCD8')
  s += R(0, wl - 0.8, W, 1.6, '#7FB5C9', ' fill-opacity=".55"')
  for (let i = 0; i < 9; i++) s += C(cx + (rnd() - 0.5) * tw * 2.6, wl + dh * (0.15 + rnd() * 0.7), g.m * (0.004 + rnd() * 0.006), '#2A6A7A', ' fill-opacity=".7"')
  return s
}

// 深海：最亮的诱饵后面，藏着最深的牙
function abyss(W, H) {
  const g = geo(W, H)
  const rnd = seeded(808)
  let s = R(0, 0, W, H, '#071621') + R(0, H * 0.45, W, H * 0.55, '#06121C') + R(0, H * 0.8, W, H * 0.2, '#040C14')
  for (let i = 0; i < Math.round((W * H) / 2500); i++) s += C(rnd() * W, rnd() * H, 0.6 + rnd() * 1.1, '#2A4A5A', ` fill-opacity="${n(0.3 + rnd() * 0.5)}"`)
  const lx = W * (g.wide ? 0.6 : 0.56)
  const ly = H * (g.wide ? 0.34 : 0.32)
  const lr = g.m * 0.03
  s += C(lx, ly, lr * 9, '#0B2230') + C(lx, ly, lr * 5, '#1E2A26', ' fill-opacity=".9"') + C(lx, ly, lr * 3, '#4A3A1A', ' fill-opacity=".85"') + C(lx, ly, lr * 1.6, '#C9962E') + C(lx, ly, lr, '#FFD27A')
  const k = (g.m / 100) * (g.wide ? 0.85 : 1)
  const hx = lx - 30 * k
  const hy = ly + 34 * k
  const p = (dx, dy) => `${n(hx + dx * k)} ${n(hy + dy * k)}`
  s += `<path d="M${p(26, -6)} C${p(18, -26)} ${p(-22, -28)} ${p(-40, -8)} L${p(-62, -22)} L${p(-58, 4)} L${p(-64, 26)} L${p(-40, 12)} C${p(-22, 30)} ${p(16, 28)} ${p(28, 14)} Z" fill="#020A10" stroke="#0E2533" stroke-width="${n(k * 0.8)}"/>`
  s += `<polygon points="${p(27, -5).replace(' ', ',')} ${p(8, 3).replace(' ', ',')} ${p(29, 13).replace(' ', ',')}" fill="#010507"/>`
  for (let i = 0; i < 4; i++) {
    const t = (i + 0.5) / 4
    const ux = 27 + (8 - 27) * t
    const uy = -5 + (3 + 5) * t
    s += `<polygon points="${p(ux - 1.2, uy).replace(' ', ',')} ${p(ux + 1.2, uy).replace(' ', ',')} ${p(ux, uy + 3).replace(' ', ',')}" fill="#B7C7D1"/>`
    const lxx = 29 + (8 - 29) * t
    const lyy = 13 + (3 - 13) * t
    s += `<polygon points="${p(lxx - 1.2, lyy).replace(' ', ',')} ${p(lxx + 1.2, lyy).replace(' ', ',')} ${p(lxx, lyy - 3).replace(' ', ',')}" fill="#B7C7D1"/>`
  }
  s += C(hx + 10 * k, hy - 9 * k, 2.6 * k, '#1B3442') + C(hx + 10.6 * k, hy - 9.6 * k, 0.9 * k, '#6B8796')
  s += `<path d="M${p(6, -22)} Q${n(hx + 14 * k)} ${n(ly - 6 * k)} ${n(lx - lr * 0.6)} ${n(ly + lr * 0.3)}" fill="none" stroke="#0E2533" stroke-width="${n(k * 0.9)}"/>`
  s += E(lx + 26 * k, ly + 4 * k, 6 * k, 2.6 * k, '#123447') + P([[lx + 31 * k, ly + 4 * k], [lx + 36 * k, ly + 0.5 * k], [lx + 36 * k, ly + 7.5 * k]], '#123447')
  return s
}

// 钟楼：钟声每响一次，盲注就涨一级
function clocktower(W, H) {
  const g = geo(W, H)
  const rnd = seeded(909)
  const hz = g.hz
  let s = R(0, 0, W, hz * 0.45, '#1E1630') + R(0, hz * 0.45, W, hz * 0.25, '#2A1E3A') + R(0, hz * 0.7, W, hz * 0.18, '#3E2748') + R(0, hz * 0.88, W, H - hz * 0.88, '#5A3350')
  s += stars(W, 0, hz * 0.4, Math.round((W * H) / 14000), rnd, [], '#5B4A72', '#E8D9C8')
  let city = ''
  let x = -10
  while (x < W + 10) {
    const w = g.m * (0.05 + rnd() * 0.07)
    const h = H * (0.04 + rnd() * 0.08)
    city += rnd() > 0.5 ? P([[x, hz + 2], [x, hz - h], [x + w / 2, hz - h - w * 0.35], [x + w, hz - h], [x + w, hz + 2]], '#2A1B33') : R(x, hz - h, w, h + 2, '#2A1B33')
    x += w * (0.9 + rnd() * 0.3)
  }
  s += city + R(0, hz, W, H - hz, '#2A1B33')
  const ny = hz + (H - hz) * 0.5
  let near = ''
  x = -10
  while (x < W + 10) {
    const w = g.m * (0.07 + rnd() * 0.13)
    const h = (H - hz) * (0.08 + rnd() * 0.26)
    const peaked = rnd() > 0.45
    near += peaked ? P([[x, H], [x, ny - h], [x + w / 2, ny - h - w * 0.45], [x + w, ny - h], [x + w, H]], '#120E18') : R(x, ny - h, w, H - ny + h, '#120E18')
    if (rnd() > 0.5) near += R(x + w * 0.38, ny - h + (H - hz) * 0.07, w * 0.16, w * 0.2, '#F4B740', ' fill-opacity=".8"')
    x += w * (0.85 + rnd() * 0.3)
  }
  s += near
  const tx = W * (g.wide ? 0.76 : 0.64)
  const tw = g.m * (g.wide ? 0.13 : 0.16)
  const top = H * (g.wide ? 0.08 : 0.08)
  const bodyTop = top + tw * 1.3
  s += R(tx - tw / 2, bodyTop, tw, H - bodyTop, '#120E18') + P([[tx - tw * 0.62, bodyTop + 1], [tx, top], [tx + tw * 0.62, bodyTop + 1]], '#120E18') + C(tx, top - tw * 0.08, tw * 0.07, '#120E18')
  const cy = bodyTop + tw * 0.75
  const cr = tw * 0.34
  s += C(tx, cy, cr * 1.6, '#F4B740', ' fill-opacity=".14"') + C(tx, cy, cr, '#F3EEE6')
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6
    s += C(tx + Math.sin(a) * cr * 0.8, cy - Math.cos(a) * cr * 0.8, cr * 0.06, '#5A3350')
  }
  s += LINE(tx, cy, tx + Math.sin(-0.04) * cr * 0.5, cy - Math.cos(-0.04) * cr * 0.5, '#120E18', cr * 0.12) +
    LINE(tx, cy, tx + Math.sin(-Math.PI / 6) * cr * 0.72, cy - Math.cos(-Math.PI / 6) * cr * 0.72, '#120E18', cr * 0.08)
  s += R(tx - tw * 0.18, cy + cr * 1.5, tw * 0.36, tw * 0.5, '#2A1E3A')
  const arc = (rad) => `<path d="M${n(tx - tw * 0.62 - rad * 0.2)} ${n(cy - rad)} A${n(rad)} ${n(rad)} 0 0 0 ${n(tx - tw * 0.62 - rad * 0.2)} ${n(cy + rad)}" fill="none" stroke="#F4B740" stroke-opacity=".3" stroke-width="${n(g.m * 0.006)}"/>`
  s += arc(tw * 0.5) + arc(tw * 0.8) + arc(tw * 1.1)
  const crow = (cx0, cy0, a) => `<path d="M${n(cx0)} ${n(cy0)} q${n(a)} ${n(-a)} ${n(2 * a)} 0 q${n(a)} ${n(-a)} ${n(2 * a)} 0" fill="none" stroke="#120E18" stroke-width="${n(g.m * 0.006)}" stroke-linecap="round"/>`
  const ck = g.m * 0.018
  s += crow(tx - tw * 1.7, top + tw * 0.5, ck) + crow(tx - tw * 2.4, top + tw * 0.15, ck * 0.8) + crow(tx - tw * 2, top - tw * 0.2, ck * 0.7)
  return s
}

// 雷暴：风暴来临之前，牌桌最安静
function storm(W, H) {
  const g = geo(W, H)
  const rnd = seeded(1010)
  const hz = H * (g.wide ? 0.74 : 0.7)
  const tx = W * (g.wide ? 0.68 : 0.62)
  const hillTop = hz - H * 0.06
  const cb = H * (g.wide ? 0.28 : 0.24)
  let s = R(0, 0, W, H, '#141A24')
  s += R(0, 0, W, cb - g.m * 0.18, '#1F2633')
  let c1 = ''
  for (let x = -g.m * 0.1; x < W + g.m * 0.2; x += g.m * 0.16) c1 += C(x, cb - g.m * 0.16 + (rnd() - 0.5) * g.m * 0.06, g.m * (0.16 + rnd() * 0.07), '#1F2633')
  let c2 = ''
  for (let x = -g.m * 0.05; x < W + g.m * 0.2; x += g.m * 0.13) c2 += C(x, cb - g.m * 0.05 + (rnd() - 0.5) * g.m * 0.04, g.m * (0.11 + rnd() * 0.05), '#283043')
  s += c1 + c2
  let rain = ''
  for (let i = 0; i < Math.round(W / 12); i++) {
    const x = rnd() * W * 0.5
    const y = cb + rnd() * (hz - cb) * 0.6
    rain += LINE(x, y, x - g.m * 0.03, y + g.m * 0.09, '#2E3647', g.m * 0.004)
  }
  s += rain
  s += D(ridge(W, hz, H * 0.015, 4, rnd, H), '#10141C')
  s += D(`M${n(tx - W * 0.22)} ${n(hz + 2)} C${n(tx - W * 0.1)} ${n(hillTop - H * 0.01)} ${n(tx + W * 0.08)} ${n(hillTop - H * 0.01)} ${n(tx + W * 0.24)} ${n(hz + 2)} Z`, '#0D1118')
  const tk = (g.m / 100) * 0.7
  s += R(tx - 0.9 * tk, hillTop - 16 * tk, 1.8 * tk, 16 * tk, '#0A0D13') + C(tx, hillTop - 20 * tk, 8 * tk, '#0A0D13') + C(tx - 6 * tk, hillTop - 16 * tk, 5.5 * tk, '#0A0D13') + C(tx + 6 * tk, hillTop - 17 * tk, 6 * tk, '#0A0D13')
  const top = cb - g.m * 0.1
  const bot = hillTop - 26 * tk
  const bw = g.m * 0.1

  const B = (xf, yf) => [tx - g.m * 0.06 * (1 - yf) + xf * bw, top + yf * (bot - top)]
  const bolt = [B(0.25, 0), B(-0.3, 0.52), B(0.02, 0.5), B(-0.12, 1), B(0.42, 0.4), B(0.1, 0.42), B(0.55, 0)]
  s += `<polygon points="${pts(bolt)}" fill="none" stroke="#FFE38A" stroke-opacity=".22" stroke-width="${n(g.m * 0.03)}" stroke-linejoin="round"/>` + P(bolt, '#FFE38A')
  return s
}

export const COVER_SCENES = { blood, wild, jungle, snow, fog, moonwood, iceberg, abyss, clocktower, storm }

const CACHE = {}
export function coverArt(key, size = 'banner') {
  const sz = COVER_SIZES[size] || COVER_SIZES.banner
  const fn = COVER_SCENES[key] || COVER_SCENES.wild
  const id = `${key}|${size}`
  if (!CACHE[id]) CACHE[id] = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz.w}" height="${sz.h}" viewBox="0 0 ${sz.w} ${sz.h}">${fn(sz.w, sz.h)}</svg>`
  return CACHE[id]
}

// 每个场景的主色：拿封面当底图时，用它做从左往右渐隐的遮罩，让上面的文字更清楚（比如设备管理的条形卡片）
export const SCENE_TINT = {
  blood: '#7A1416', wild: '#6A2C12', jungle: '#173F2A', snow: '#2C4058', fog: '#1E3550',
  moonwood: '#4A1219', iceberg: '#164260', abyss: '#122150', clocktower: '#3D2C66', storm: '#262E44'
}
