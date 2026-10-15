// 平台认证页：Lottie 动画位的静态占位（深色圆角卡片里三张扇形牌背，右下角是加 V 的认证标识）
// 接入 Lottie 后整块替换；海报改用 static/host/poster.jpg
export function lottiePlaceholder() {
  const back = (rot) => `<g transform="rotate(${rot} 112 214)"><rect x="76" y="70" width="72" height="100" rx="8" fill="#B80000"/>` +
    '<rect x="81" y="75" width="62" height="90" rx="5" fill="none" stroke="#F3B3B3" stroke-width="2"/>' +
    [[105, 112], [119, 112], [105, 126], [119, 126]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#F3EEE6"/>`).join('') + '</g>'
  const star = (x, y, s) => `<polygon points="${x},${y - s} ${x + s * 0.28},${y - s * 0.28} ${x + s},${y} ${x + s * 0.28},${y + s * 0.28} ${x},${y + s} ${x - s * 0.28},${y + s * 0.28} ${x - s},${y} ${x - s * 0.28},${y - s * 0.28}" fill="#F4B740"/>`
  return '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">' +
    '<rect x="2" y="2" width="252" height="252" rx="40" fill="#20232B" stroke="#FFFFFF" stroke-opacity=".08" stroke-width="2"/>' +
    back(-16) + back(0) + back(16) +
    '<circle cx="182" cy="184" r="40" fill="#20232B"/><circle cx="182" cy="184" r="32" fill="#DC0000" stroke="#F4B740" stroke-width="4"/>' +
    '<path d="M168 172 L182 200 L196 172" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
    star(214, 66, 10) + star(46, 58, 7) + '</svg>'
}
