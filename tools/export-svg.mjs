// 把代码里生成的插图和图标导出成独立的 .svg 文件，方便拖进 Figma 编辑
// 用法：node tools/export-svg.mjs [输出目录，默认 design/svg]
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const out = path.resolve(process.argv[2] || path.join(root, 'design/svg'))
const load = (f) => import(pathToFileURL(path.join(root, f)).href)

const svg = await load('src/common/svg.js')
const { ICONS, FILLED } = await load('src/common/icons.js')

const write = (dir, name, content) => {
  fs.mkdirSync(path.join(out, dir), { recursive: true })
  fs.writeFileSync(path.join(out, dir, name + '.svg'), content)
}

// 插图：环境场景（赛事封面）、帖子封面、首页横幅、个人主页底纹
const SCENES = ['blood', 'wild', 'jungle', 'snow', 'fog']
const POSTS = ['chess', 'cards', 'dice', 'chips', 'meeple']
SCENES.forEach((k) => write('covers', 'scene-' + k, svg.coverScene(k)))
POSTS.forEach((k) => write('covers', 'post-' + k, svg.postCover(k)))
write('covers', 'home-blood-moon-banner', svg.bloodMoonBanner())
write('covers', 'profile-dice-pattern', svg.diceFacesPattern())

// 图标：和 z-icon 的画法一致，24×24，线宽 2；颜色用黑色，进 Figma 后再改
const wrap = (paint, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" ${paint}>${body.replace(/currentColor/g, '#000000')}</svg>`
const STROKE = 'fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
Object.entries(ICONS).forEach(([k, body]) => write('icons', k, wrap(STROKE, body)))
Object.entries(FILLED).forEach(([k, body]) => write('icons', k, wrap('fill="#000000"', body)))

console.log(`covers: ${SCENES.length + POSTS.length + 2}, icons: ${Object.keys(ICONS).length + Object.keys(FILLED).length} -> ${path.relative(root, out) || out}`)
