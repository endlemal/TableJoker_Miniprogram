// SVG 转 data URI，以及页面里用到的几张矢量插图。
// 小程序的 WXSS 不能引用本地图片，但支持 data URI，所以插图都以背景图形式输出。

// 不带 ;charset 参数，并把括号也编码：内联 style 字符串里出现分号或括号，会被样式解析拆断，导致图片不显示
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
export function bloodMoonBanner() {
  const trees = [[2, 12, 22, 58], [14, 26, 38, 50], [32, 41, 50, 66], [226, 236, 246, 60], [238, 250, 262, 48], [256, 266, 276, 62], [268, 280, 292, 54]]
    .map(([a, b, c, top]) => `<polygon points="${a},86 ${b},${top} ${c},86"/>`).join('')
  return '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="96" viewBox="0 0 280 96" preserveAspectRatio="xMidYMid slice">' +
    '<rect width="280" height="96" fill="#1C1117"/>' +
    '<circle cx="196" cy="40" r="42" fill="#22131A"/><circle cx="196" cy="40" r="32" fill="#2B151C"/>' +
    '<circle cx="196" cy="40" r="22" fill="#D8382E"/>' +
    '<circle cx="189" cy="34" r="5" fill="#C02E25"/><circle cx="204" cy="47" r="3.5" fill="#C02E25"/><circle cx="205" cy="31" r="2.5" fill="#C02E25"/>' +
    dots([[28, 16], [64, 30], [112, 12], [142, 36], [92, 50]], '#7A5A60', 1.2) +
    dots([[48, 40], [130, 22]], '#E8CFCB', 1.5) +
    '<path d="M0 70 C40 56 70 60 104 66 C140 72 170 54 210 58 C240 61 262 66 280 62 L280 96 L0 96 Z" fill="#2A151B"/>' +
    `<g fill="#120C10"><rect y="84" width="280" height="12"/>${trees}</g></svg>`
}

// 创建比赛页 · 五幅带暗喻的环境封面（与首页赛事卡片封面同比例 280×96）
const SCENES = {
  blood: '<rect width="280" height="96" fill="#1A0F14"/><circle cx="206" cy="34" r="44" fill="#22131A"/><circle cx="206" cy="34" r="33" fill="#2C141B"/><circle cx="206" cy="34" r="22" fill="#D8382E"/>' +
    '<circle cx="199" cy="28" r="5" fill="#BF2E26"/><circle cx="214" cy="41" r="3.5" fill="#BF2E26"/><circle cx="215" cy="25" r="2.5" fill="#BF2E26"/>' +
    '<g fill="#7A5A60"><circle cx="24" cy="14" r="1.1"/><circle cx="58" cy="28" r="1.1"/><circle cx="96" cy="10" r="1.1"/><circle cx="134" cy="24" r="1.1"/><circle cx="160" cy="8" r="1.1"/></g>' +
    '<g fill="#E8CFCB"><circle cx="44" cy="40" r="1.4"/><circle cx="120" cy="18" r="1.3"/></g>' +
    '<path d="M0 66 C50 54 90 58 130 64 C170 70 214 56 280 60 L280 96 L0 96 Z" fill="#2A141B"/>' +
    '<g fill="#120A0E"><polygon points="56,86 56,72 66,63 76,72 76,86"/><polygon points="80,86 80,68 94,56 108,68 108,86"/><polygon points="112,86 112,60 118,49 124,60 124,86"/><rect x="117.4" y="43" width="1.2" height="6"/><rect x="115.6" y="44.6" width="4.8" height="1.2"/><polygon points="128,86 128,73 138,65 148,73 148,86"/><rect y="84" width="280" height="12"/>' +
    '<polygon points="0,86 8,60 16,86"/><polygon points="10,86 20,52 30,86"/><polygon points="24,86 32,66 40,86"/><polygon points="236,86 245,62 254,86"/><polygon points="248,86 258,50 268,86"/><polygon points="262,86 271,64 280,86"/></g>' +
    '<rect x="90" y="71" width="5" height="6" fill="#FFB22E"/><rect x="133" y="76" width="4" height="5" fill="#5A2F1C"/>',
  wild: '<rect width="280" height="40" fill="#2B1712"/><rect y="40" width="280" height="16" fill="#4A2216"/><rect y="56" width="280" height="14" fill="#7A3317"/>' +
    '<circle cx="196" cy="70" r="22" fill="#F08A3C"/><rect x="170" y="58.5" width="52" height="1.6" fill="#7A3317"/><rect x="170" y="62.6" width="52" height="2.2" fill="#7A3317"/><rect x="170" y="66.8" width="52" height="2.8" fill="#7A3317"/>' +
    '<path d="M0 70 L18 70 L22 58 L54 58 L58 70 L112 70 L116 63 L140 63 L144 70 L236 70 L240 64 L262 64 L266 70 L280 70 Z" fill="#1E120E"/>' +
    '<rect y="70" width="280" height="26" fill="#3A2016"/><polygon points="120,96 176,96 151,70 147,70" fill="#22140F"/>' +
    '<g fill="#C8935A"><rect x="147.4" y="88" width="2.6" height="5"/><rect x="148.1" y="80" width="1.8" height="3.6"/><rect x="148.6" y="74.6" width="1.1" height="2.4"/></g>' +
    '<g fill="#2A1712"><ellipse cx="80" cy="84" rx="5" ry="1.6"/><ellipse cx="226" cy="88" rx="6" ry="1.8"/></g>' +
    '<g stroke="#140C09" stroke-width="2" stroke-linecap="round" fill="none"><path d="M44 96 L44 76"/><path d="M44 82 L37 75"/><path d="M44 79 L51 71"/><path d="M51 71 L55 70"/></g>' +
    '<g stroke="#140C09" stroke-width="1.4" stroke-linecap="round" fill="none"><path d="M226 22 q4 -4 8 0 q4 -4 8 0"/><path d="M208 31 q3 -3 6 0 q3 -3 6 0"/></g>',
  jungle: '<rect width="280" height="96" fill="#0B1A13"/><polygon points="150,0 176,0 214,96 172,96" fill="#10251B"/>' +
    '<g fill="#10261B"><circle cx="10" cy="66" r="26"/><circle cx="46" cy="58" r="24"/><circle cx="82" cy="64" r="22"/><circle cx="120" cy="56" r="26"/><circle cx="160" cy="62" r="22"/><circle cx="196" cy="54" r="24"/><circle cx="232" cy="62" r="24"/><circle cx="270" cy="56" r="24"/><rect y="70" width="280" height="26"/></g>' +
    '<g fill="#163324"><circle cx="30" cy="86" r="18"/><circle cx="70" cy="90" r="16"/><circle cx="150" cy="88" r="18"/><circle cx="210" cy="90" r="16"/><circle cx="255" cy="86" r="18"/></g>' +
    '<g stroke="#163324" stroke-width="1.6" fill="none"><path d="M60 0 C58 14 64 22 60 36"/><path d="M228 0 C232 10 226 20 230 30"/></g>' +
    '<g fill="#163324"><ellipse cx="61" cy="20" rx="3" ry="1.6"/><ellipse cx="59" cy="30" rx="3" ry="1.6"/><ellipse cx="230" cy="14" rx="3" ry="1.6"/></g>' +
    '<g fill="#D7F25C"><ellipse cx="96" cy="60" rx="3.2" ry="1.9"/><ellipse cx="107" cy="60" rx="3.2" ry="1.9"/></g>' +
    '<g fill="#0B1A13"><rect x="95.5" y="58.4" width="1" height="3.2"/><rect x="106.5" y="58.4" width="1" height="3.2"/></g>' +
    '<g fill="#F2C14E"><ellipse cx="203" cy="47" rx="2.2" ry="1.3"/><ellipse cx="210" cy="47" rx="2.2" ry="1.3"/></g>' +
    '<g fill="#07120C"><path d="M0 96 C4 76 20 62 46 60 C34 70 26 82 24 96 Z"/><path d="M0 70 C14 66 28 70 36 80 C22 78 10 80 0 84 Z"/><path d="M280 34 C252 38 232 52 218 76 C240 64 260 60 280 60 Z"/><path d="M280 62 C258 66 244 78 238 96 L280 96 Z"/><path d="M120 96 C126 84 138 78 152 78 C144 84 140 90 140 96 Z"/></g>',
  snow: '<rect width="280" height="96" fill="#0E1424"/><circle cx="214" cy="26" r="12" fill="#E9EEF6"/><circle cx="219.5" cy="22" r="11" fill="#0E1424"/>' +
    '<g fill="#8E9BB8"><circle cx="30" cy="16" r="1.1"/><circle cx="70" cy="30" r="1.1"/><circle cx="110" cy="12" r="1.1"/><circle cx="150" cy="26" r="1.1"/><circle cx="250" cy="44" r="1.1"/></g>' +
    '<g fill="#E9EEF6"><circle cx="48" cy="34" r="1.3"/><circle cx="176" cy="14" r="1.3"/></g>' +
    '<polygon points="0,62 30,44 52,56 84,36 120,58 150,46 186,60 224,42 258,54 280,46 280,96 0,96" fill="#1C2740"/>' +
    '<path d="M0 70 C60 58 120 64 170 70 C210 74 250 66 280 64 L280 96 L0 96 Z" fill="#B9C5D8"/>' +
    '<g fill="#0B1020"><polygon points="226,68 231,56 236,68"/><polygon points="234,67 238,58 242,67"/></g>' +
    '<path d="M0 82 C70 72 140 76 200 84 C230 88 258 84 280 80 L280 96 L0 96 Z" fill="#E3E9F2"/>' +
    '<g fill="#9FB0C8"><ellipse cx="34" cy="92" rx="1.8" ry="1.1"/><ellipse cx="42" cy="89.6" rx="1.8" ry="1.1"/><ellipse cx="51" cy="91" rx="1.7" ry="1"/><ellipse cx="60" cy="88.4" rx="1.7" ry="1"/><ellipse cx="70" cy="89.6" rx="1.6" ry="1"/><ellipse cx="80" cy="87" rx="1.6" ry="1"/><ellipse cx="91" cy="88" rx="1.5" ry=".9"/><ellipse cx="102" cy="85.6" rx="1.5" ry=".9"/><ellipse cx="114" cy="86.4" rx="1.4" ry=".9"/><ellipse cx="126" cy="84.2" rx="1.4" ry=".9"/><ellipse cx="139" cy="84.8" rx="1.3" ry=".8"/><ellipse cx="152" cy="83" rx="1.3" ry=".8"/></g>',
  fog: '<rect width="280" height="96" fill="#151A24"/><polygon points="229,37 0,18 0,54" fill="#FFE3A3" fill-opacity=".12"/><polygon points="229,37 0,28 0,44" fill="#FFE3A3" fill-opacity=".1"/>' +
    '<path d="M0 50 C40 46 80 52 120 48 C160 44 200 50 240 46 C258 44 270 46 280 45 L280 64 L0 64 Z" fill="#232A36"/><rect y="68" width="280" height="28" fill="#10141C"/>' +
    '<g fill="#0A0D13"><polygon points="206,82 216,70 244,70 254,82"/><polygon points="223,71 226.5,40 231.5,40 235,71"/><rect x="224" y="33" width="10" height="7"/><polygon points="222.5,33 229,26.5 235.5,33"/><rect x="221" y="40" width="16" height="1.6"/></g>' +
    '<rect x="226" y="35" width="6" height="4" fill="#FFE3A3"/>' +
    '<g fill="#0A0D13"><path d="M64 72 L94 72 L90 77 L68 77 Z"/><rect x="78" y="58" width="1.2" height="14"/><polygon points="79.2,59 79.2,70 88,70"/></g>' +
    '<path d="M0 74 C50 68 100 76 150 72 C200 68 240 76 280 72 L280 86 L0 86 Z" fill="#2E3644" fill-opacity=".9"/><path d="M0 86 C60 80 120 88 180 84 C220 82 250 88 280 86 L280 96 L0 96 Z" fill="#3A4352"/>'
}

export function coverScene(key) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="96" viewBox="0 0 280 96">' + (SCENES[key] || SCENES.wild) + '</svg>'
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
