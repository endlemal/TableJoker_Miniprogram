// 二维码：生成模块矩阵（画到 canvas 上用），或生成 SVG 的 data URI（页面里 <image> 直接显示）
import qrcode from './vendor/qrcode.js'
import { svgUri } from './svg.js'

export function qrMatrix(text) {
  const q = qrcode(0, 'M')
  q.addData(String(text))
  q.make()
  const n = q.getModuleCount()
  return { n, dark: (r, c) => q.isDark(r, c) }
}
export function qrSvgUri(text, { fg = '#0B0C10', bg = '#FFFFFF', quiet = 2 } = {}) {
  const { n, dark } = qrMatrix(text)
  const size = n + quiet * 2
  let path = ''
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (dark(r, c)) path += `M${c + quiet} ${r + quiet}h1v1h-1z`
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${bg}"/><path d="${path}" fill="${fg}"/></svg>`)
}
