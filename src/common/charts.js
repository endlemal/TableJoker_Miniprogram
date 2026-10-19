// 轻量图表：直接生成 SVG（ECharts 风格），当背景图用，不引入图表库（ECharts 小程序版会让主包增加几百 KB）

// 圆角环形图：每段两端是圆角，段与段之间留缝；animate 为 true 时各段依次扫出来
// items: [{ key, value, color }]；focus: 高亮某一段，其余变淡
export function donutSvg(items, { focus = '', size = 120, width = 15, gap = 4, track = '#181A20', animate = true } = {}) {
  const r = (size - width) / 2
  const c = 2 * Math.PI * r
  const cx = size / 2
  const total = items.reduce((s, x) => s + x.value, 0) || 1
  let acc = 0
  const arcs = items.map((x, i) => {
    const frac = x.value / total
    const len = Math.max(0.1, c * frac - gap - width) // 圆角端点会各多出 width / 2
    const off = -(c * acc + gap / 2 + width / 2)
    acc += frac
    const dim = focus && focus !== x.key
    const anim = animate ? ` style="animation:s .9s cubic-bezier(.2,.8,.2,1) ${(i * 0.12).toFixed(2)}s backwards"` : ''
    return `<circle cx="${cx}" cy="${cx}" r="${r.toFixed(2)}" fill="none" stroke="${x.color}" stroke-width="${width}" stroke-linecap="round" ` +
      `stroke-dasharray="${len.toFixed(2)} ${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" opacity="${dim ? 0.25 : 1}"${anim}/>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    (animate ? `<style>@keyframes s{from{stroke-dasharray:0 ${c.toFixed(2)}}}</style>` : '') +
    `<g transform="rotate(-90 ${cx} ${cx})"><circle cx="${cx}" cy="${cx}" r="${r.toFixed(2)}" fill="none" stroke="${track}" stroke-width="${width}"/>${arcs}</g></svg>`
}

// 同比：(本期 - 上期) / 上期，保留一位小数
export const yoy = (now, prev) => (prev ? Math.round(((now - prev) / prev) * 1000) / 10 : 0)
export const yoyText = (v) => (v >= 0 ? '+' : '') + v.toFixed(1) + '%' + (v >= 0 ? '↑' : '↓')
