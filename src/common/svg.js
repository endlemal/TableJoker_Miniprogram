// SVG 转 data URI，以及页面里用到的几张矢量插图。
// 小程序的 WXSS 不能引用本地图片，但支持 data URI，所以插图都以背景图形式输出。

// 不带 ;charset 参数，并把括号也编码：内联 style 字符串里出现分号或括号，会被样式解析拆断，导致图片不显示
import { coverArt, COVER_SIZES, COVER_SCENES, nearestSize } from './cover-art.js'

export const svgUri = (svg) => 'data:image/svg+xml,' + encodeURIComponent(svg).replace(/\(/g, '%28').replace(/\)/g, '%29')

const dots = (pts, fill, r = 1.5) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`).join('')

// 个人主页封面：交错排列的五点、四点骰面（四点带一点红）
export function diceFacesPattern() {
  const five = [[12, 12], [28, 12], [20, 20], [12, 28], [28, 28]]
  const four = [[52, 12], [68, 12], [52, 28], [68, 28]]
  const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy])
  return '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">' +
    dots(five, '#2E2229') + dots(shift(five, 40, 40), '#2E2229') +
    dots(four, '#41202A') + dots(shift(four, -40, 40), '#41202A') + '</svg>'
}

// 首页赛事封面：血月森林
// 比赛封面：10 个场景 × 6 种尺寸，按比例重新构图（见 cover-art.js）
export { coverArt, COVER_SIZES, COVER_SCENES, nearestSize }
// 兼容旧接口：横幅尺寸
export function bloodMoonBanner() { return coverArt('moonwood', 'banner') }
export function coverScene(key) { return coverArt(key, 'banner') }
// 封面背景样式（带缓存）：同一场景同一尺寸只编码一次
const ART_STYLE = {}
export function coverStyle(key, size = 'banner') {
  const id = key + '|' + size
  return ART_STYLE[id] || (ART_STYLE[id] = `background-image:url("${svgUri(coverArt(key, size))}");background-size:cover;background-position:center`)
}

// 广场 · 帖子封面（竖版 300×400，平涂插画）
const MEEPLE = 'M12 2a3 3 0 0 1 3 3c0 .9-.4 1.7-1 2.2L19 9c1.3.4 2 1.3 2 2.3 0 .9-.8 1.5-1.8 1.5H16.5l2.3 6.2c.3.9-.3 1.5-1.2 1.5H14l-2-3.5-2 3.5H6.4c-.9 0-1.5-.6-1.2-1.5L7.5 12.8H5c-1 0-1.8-.6-1.8-1.5 0-1 .7-1.9 2-2.3L10 7.2C9.4 6.7 9 5.9 9 5a3 3 0 0 1 3-3z'

function chessCover() {
  const far = { y: 176, l: 78, r: 222 }, near = { y: 430, l: -110, r: 410 }, N = 8
  const t = (y) => (y - far.y) / (near.y - far.y)
  const xl = (y) => far.l + (near.l - far.l) * t(y)
  const xr = (y) => far.r + (near.r - far.r) * t(y)
  const rowY = (k) => far.y + (near.y - far.y) * Math.pow(k / N, 1.6)
  let cells = ''
  for (let r = 0; r < N; r++) {
    const y0 = rowY(r), y1 = rowY(r + 1)
    for (let c = 0; c < N; c++) {
      const x = (y, k) => xl(y) + (xr(y) - xl(y)) * k / N
      cells += `<polygon points="${x(y0, c).toFixed(1)},${y0.toFixed(1)} ${x(y0, c + 1).toFixed(1)},${y0.toFixed(1)} ${x(y1, c + 1).toFixed(1)},${y1.toFixed(1)} ${x(y1, c).toFixed(1)},${y1.toFixed(1)}" fill="${(r + c) % 2 ? '#2A2D36' : '#E9E3D8'}"/>`
    }
  }
  return '<rect width="300" height="400" fill="#14161B"/><circle cx="150" cy="104" r="92" fill="#1A1D24"/>' + cells +
    '<ellipse cx="156" cy="300" rx="38" ry="10" fill="#0E0F12" fill-opacity=".55"/>' +
    '<rect x="122" y="284" width="56" height="15" rx="7.5" fill="#A30000"/><polygon points="131,286 169,286 161,240 139,240" fill="#DC0000"/>' +
    '<rect x="132" y="232" width="36" height="10" rx="5" fill="#A30000"/><circle cx="150" cy="215" r="20" fill="#DC0000"/>'
}

function cardsCover() {
  const angles = [-30, -15, 0, 15, 30]
  const diamond = (cx, cy, s, f) => `<rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" fill="${f}" transform="rotate(45 ${cx} ${cy})"/>`
  const heart = (cx, cy, s, f) => `<circle cx="${cx - s * .26}" cy="${cy - s * .1}" r="${s * .3}" fill="${f}"/><circle cx="${cx + s * .26}" cy="${cy - s * .1}" r="${s * .3}" fill="${f}"/><polygon points="${cx - s * .55},${cy} ${cx + s * .55},${cy} ${cx},${cy + s * .62}" fill="${f}"/>`
  const club = (cx, cy, s, f) => `<circle cx="${cx}" cy="${cy - s * .3}" r="${s * .26}" fill="${f}"/><circle cx="${cx - s * .3}" cy="${cy + s * .08}" r="${s * .26}" fill="${f}"/><circle cx="${cx + s * .3}" cy="${cy + s * .08}" r="${s * .26}" fill="${f}"/><rect x="${cx - s * .07}" y="${cy}" width="${s * .14}" height="${s * .5}" fill="${f}"/>`
  const marks = [club, diamond, heart, diamond, null]
  const colors = ['#141414', '#DC0000', '#DC0000', '#DC0000']
  let g = ''
  angles.forEach((a, i) => {
    const x = 102, y = 214, w = 96, h = 136, cx = x + w / 2, cy = y + h / 2
    let inner
    if (!marks[i]) {
      inner = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="#B80000"/><rect x="${x + 7}" y="${y + 7}" width="${w - 14}" height="${h - 14}" rx="5" fill="none" stroke="#F3B3B3" stroke-width="2"/>` +
        [[-9, -9], [9, -9], [-9, 9], [9, 9]].map(([dx, dy]) => `<circle cx="${cx + dx}" cy="${cy + dy}" r="5" fill="#F3EEE6"/>`).join('')
    } else {
      inner = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="#F3EEE6"/>` + marks[i](cx, cy, 34, colors[i]) + marks[i](x + 16, y + 20, 11, colors[i])
    }
    g += `<g transform="rotate(${a} 150 470)">${inner}</g>`
  })
  return '<rect width="300" height="400" fill="#17302A"/><rect x="14" y="14" width="272" height="372" rx="40" fill="none" stroke="#2B5246" stroke-width="2"/>' + g
}

function diceCover() {
  const pips = (pts, r) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#DC0000"/>`).join('')
  return '<rect width="300" height="400" fill="#2A1216"/><circle cx="150" cy="186" r="128" fill="#33161B"/><ellipse cx="160" cy="334" rx="124" ry="16" fill="#1C0C10"/>' +
    '<g transform="translate(116 204) rotate(-12)"><rect x="-70" y="-60" width="140" height="140" rx="30" fill="#BDB4A6"/><rect x="-70" y="-70" width="140" height="140" rx="30" fill="#F3EEE6"/>' + pips([[0, 0]], 26) + '</g>' +
    '<g transform="translate(214 268) rotate(16)"><rect x="-46" y="-39" width="92" height="92" rx="20" fill="#BDB4A6"/><rect x="-46" y="-46" width="92" height="92" rx="20" fill="#F3EEE6"/>' + pips([[-20, -20], [20, -20], [-20, 20], [20, 20]], 10) + '</g>'
}

function chipsCover() {
  const TONE = { red: ['#B80000', '#DC0000', '#F3EEE6'], ivory: ['#CFC8BC', '#F3EEE6', '#DC0000'], gold: ['#C8902A', '#F4B740', '#F3EEE6'] }
  const stack = (cx, base, n, tone) => {
    const [side, top, mark] = TONE[tone]
    let s = ''
    for (let k = 0; k < n; k++) {
      const y = base - k * 14
      s += `<ellipse cx="${cx}" cy="${y}" rx="44" ry="13" fill="${side}"/><rect x="${cx - 44}" y="${y - 12}" width="88" height="12" fill="${side}"/>` +
        [-30, -6, 18].map((dx) => `<rect x="${cx + dx}" y="${y - 11}" width="8" height="11" fill="${mark}" fill-opacity=".85"/>`).join('') +
        `<ellipse cx="${cx}" cy="${y - 12}" rx="44" ry="13" fill="${top}"/>`
    }
    return s
  }
  return '<rect width="300" height="400" fill="#141B2B"/><circle cx="150" cy="150" r="110" fill="#18213A"/><ellipse cx="150" cy="336" rx="140" ry="20" fill="#0F1420"/>' +
    stack(86, 300, 8, 'red') + stack(214, 300, 11, 'ivory') + stack(150, 344, 4, 'gold')
}

function meepleCover() {
  const m = (x, y, s, f) => `<path transform="translate(${x} ${y}) scale(${s})" d="${MEEPLE}" fill="${f}"/>`
  return '<rect width="300" height="400" fill="#2A2112"/><circle cx="150" cy="120" r="100" fill="#32281A"/>' +
    m(-6, 130, 4.2, '#4A3B22') + m(62, 122, 4.2, '#5A4628') + m(130, 128, 4.2, '#4A3B22') + m(198, 120, 4.2, '#5A4628') +
    m(18, 196, 5.6, '#8A6A34') + m(104, 188, 5.6, '#3B5E8C') + m(188, 196, 5.6, '#2E6B52') +
    m(-30, 262, 7.4, '#F3EEE6') + m(78, 248, 8.2, '#DC0000') + m(190, 262, 7.4, '#F4B740')
}

const POST_COVERS = { chess: chessCover, cards: cardsCover, dice: diceCover, chips: chipsCover, meeple: meepleCover }
const POST_CACHE = {}
export function postCover(key) {
  if (!POST_CACHE[key]) {
    const body = POST_COVERS[key] ? POST_COVERS[key]() : ''
    POST_CACHE[key] = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">' + body + '</svg>'
  }
  return POST_CACHE[key]
}
export const isPostCover = (key) => !!POST_COVERS[key]
