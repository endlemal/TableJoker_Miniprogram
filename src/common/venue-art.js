// 场馆环境图（插画占位）：hall 大厅、bar 吧台、lounge 休息区、vip 包间，用俱乐部的主色点缀。
// 正式环境换成俱乐部上传的实拍照片（走 CDN），这里只负责没有照片时的样子
const W = 640, H = 400
function lamps(xs, tone) {
  return xs.map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="70" stroke="#3A3A44" stroke-width="2"/><path d="M${x - 26} 92 L${x - 12} 70 L${x + 12} 70 L${x + 26} 92 Z" fill="${tone}"/><path d="M${x - 26} 92 L${x - 110} 330 L${x + 110} 330 L${x + 26} 92 Z" fill="#FFE2A8" opacity=".10"/><ellipse cx="${x}" cy="94" rx="24" ry="5" fill="#FFF3D1" opacity=".9"/>`).join('')
}
function table(cx, cy, rx, ry) {
  return `<ellipse cx="${cx}" cy="${cy + 10}" rx="${rx + 12}" ry="${ry + 10}" fill="#000" opacity=".35"/><ellipse cx="${cx}" cy="${cy}" rx="${rx + 10}" ry="${ry + 8}" fill="#3B2416"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#1F5C3F"/><ellipse cx="${cx}" cy="${cy}" rx="${rx - 18}" ry="${ry - 10}" fill="none" stroke="#2E7A55" stroke-width="2"/>` +
    [-0.5, 0, 0.5].map((k, i) => `<rect x="${cx + k * rx * 0.5 - 7}" y="${cy - 6}" width="14" height="20" rx="2" fill="${i === 1 ? '#F5F0E6' : '#C9302C'}" transform="rotate(${k * 18} ${cx} ${cy})"/>`).join('')
}
function chairs(cx, cy, rx, ry) {
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (i / 6) * Math.PI * 2 + 0.3
    const x = cx + Math.cos(a) * (rx + 26), y = cy + Math.sin(a) * (ry + 20)
    return `<rect x="${x - 12}" y="${y - 10}" width="24" height="20" rx="6" fill="#2A2530"/>`
  }).join('')
}
const ART = {
  hall: (tone) => `<rect width="${W}" height="${H}" fill="#17141A"/><rect y="250" width="${W}" height="150" fill="#221B18"/>` + lamps([170, 470], tone) +
    chairs(170, 285, 95, 34) + table(170, 285, 95, 34) + chairs(470, 300, 105, 38) + table(470, 300, 105, 38),
  bar: (tone) => `<rect width="${W}" height="${H}" fill="#151318"/>` +
    [0, 1, 2].map((r) => `<rect x="60" y="${60 + r * 52}" width="520" height="6" fill="#3B2C22"/>` + Array.from({ length: 12 }, (_, i) => `<rect x="${78 + i * 42}" y="${28 + r * 52}" width="${14 + (i % 3) * 3}" height="${32 - (i % 2) * 8}" rx="3" fill="${['#7A3B2E', '#2E5A6E', '#C9A24A', '#4B6B3A'][(i + r) % 4]}" opacity=".85"/>`).join('')).join('') +
    `<rect x="40" y="250" width="560" height="26" rx="6" fill="#5A3A26"/><rect x="40" y="276" width="560" height="124" fill="#2B1E16"/>` +
    [110, 230, 350, 470].map((x) => `<rect x="${x - 4}" y="300" width="8" height="70" fill="#3A3A44"/><ellipse cx="${x}" cy="296" rx="22" ry="7" fill="#45404C"/>`).join('') +
    `<rect x="230" y="200" width="180" height="34" rx="17" fill="none" stroke="${tone}" stroke-width="4" opacity=".9"/><text x="320" y="224" font-size="20" font-family="sans-serif" font-weight="700" fill="${tone}" text-anchor="middle">TABLE · BAR</text>`,
  lounge: (tone) => `<rect width="${W}" height="${H}" fill="#14161C"/><rect x="380" y="40" width="220" height="170" rx="6" fill="#0E1626"/>` +
    Array.from({ length: 18 }, (_, i) => `<rect x="${392 + (i % 6) * 34}" y="${120 + Math.floor(i / 6) * 26 - (i % 4) * 10}" width="12" height="${40 + (i % 3) * 18}" fill="#2A3550"/><rect x="${395 + (i % 6) * 34}" y="${128 + Math.floor(i / 6) * 26}" width="4" height="4" fill="#FFD27A"/>`).join('') +
    `<rect y="270" width="${W}" height="130" fill="#1E1A1A"/><rect x="60" y="210" width="280" height="90" rx="26" fill="#3A2E48"/><rect x="60" y="250" width="280" height="60" rx="18" fill="${tone}" opacity=".55"/>` +
    `<rect x="380" y="300" width="160" height="16" rx="8" fill="#5A3A26"/><line x1="600" y1="120" x2="600" y2="330" stroke="#3A3A44" stroke-width="4"/><circle cx="600" cy="110" r="22" fill="#FFE2A8" opacity=".85"/>`,
  vip: (tone) => `<rect width="${W}" height="${H}" fill="#120F14"/><rect x="40" y="30" width="560" height="210" rx="8" fill="#0C1424"/>` +
    Array.from({ length: 22 }, (_, i) => `<rect x="${52 + i * 25}" y="${150 - (i % 5) * 22}" width="18" height="${90 + (i % 5) * 22}" fill="#1B2640"/><rect x="${56 + i * 25}" y="${160 - (i % 5) * 22}" width="4" height="4" fill="#FFD27A" opacity=".8"/>`).join('') +
    `<rect x="40" y="30" width="60" height="210" fill="${tone}" opacity=".5"/><rect x="540" y="30" width="60" height="210" fill="${tone}" opacity=".5"/><rect y="250" width="${W}" height="150" fill="#1E1714"/>` +
    lamps([320], tone) + chairs(320, 310, 140, 40) + table(320, 310, 140, 40)
}
export const VENUE_ART_KINDS = Object.keys(ART)
export function venueArt(kind, tone = '#DC0000') {
  const body = (ART[kind] || ART.hall)(tone)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${body}</svg>`
}
