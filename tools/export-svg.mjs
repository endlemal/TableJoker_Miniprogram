// 把代码里生成的插图和图标导出成独立的 .svg 文件，方便拖进 Figma 编辑
// 用法：node tools/export-svg.mjs [输出目录，默认 design/svg]
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const out = path.resolve(process.argv[2] || path.join(root, 'design/svg'))
const load = (f) => import(pathToFileURL(path.join(root, f)).href)

const svg = await load('src/common/svg.js')
const art = await load('src/common/cover-art.js')
const { coverScenes } = await load('src/mock/data.js')
const { ICONS, FILLED } = await load('src/common/icons.js')

const write = (dir, name, content) => {
  fs.mkdirSync(path.join(out, dir), { recursive: true })
  fs.writeFileSync(path.join(out, dir, name + '.svg'), content)
}
// 每次重建目录，避免留下改名或删掉的旧文件
for (const dir of ['covers', 'icons']) fs.rmSync(path.join(out, dir), { recursive: true, force: true })

// 比赛封面：每个场景 × 每种尺寸（按比例重新构图，不是裁切）
const sizes = Object.keys(art.COVER_SIZES)
const manifest = { generatedBy: 'tools/export-svg.mjs', sizes: art.COVER_SIZES, scenes: [], posts: [], patterns: [] }
for (const sc of coverScenes) {
  const files = {}
  for (const size of sizes) {
    const name = `scene-${sc.key}-${size}`
    write('covers', name, art.coverArt(sc.key, size))
    files[size] = `covers/${name}.svg`
  }
  manifest.scenes.push({ key: sc.key, name: sc.name, line: sc.line, files })
}

// 帖子封面（竖版 300×400）和个人主页底纹
for (const k of ['chess', 'cards', 'dice', 'chips', 'meeple']) {
  write('covers', 'post-' + k, svg.postCover(k))
  manifest.posts.push({ key: k, file: `covers/post-${k}.svg`, size: { w: 300, h: 400 } })
}
write('covers', 'profile-dice-pattern', svg.diceFacesPattern())
manifest.patterns.push({ key: 'dice-faces', file: 'covers/profile-dice-pattern.svg', note: '平铺使用' })
fs.writeFileSync(path.join(out, 'covers', 'index.json'), JSON.stringify(manifest, null, 2) + '\n')

// 图标：和 z-icon 的画法一致，24×24，线宽 2；颜色用黑色，进 Figma 后再改
const wrap = (paint, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" ${paint}>${body.replace(/currentColor/g, '#000000')}</svg>`
const STROKE = 'fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
Object.entries(ICONS).forEach(([k, body]) => write('icons', k, wrap(STROKE, body)))
Object.entries(FILLED).forEach(([k, body]) => write('icons', k, wrap('fill="#000000"', body)))

const nCovers = coverScenes.length * sizes.length
console.log(`scene covers: ${coverScenes.length} x ${sizes.length} = ${nCovers}, post covers: 5, patterns: 1, icons: ${Object.keys(ICONS).length + Object.keys(FILLED).length} -> ${path.relative(root, out) || out}`)
