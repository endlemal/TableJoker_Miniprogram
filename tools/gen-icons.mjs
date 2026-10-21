// 从 @tabler/icons（MIT）生成 src/common/icons.js
// 用法：npm i -D @tabler/icons && node tools/gen-icons.mjs [node_modules 路径]
import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2] || 'node_modules'
const base = path.join(root, '@tabler/icons/icons')
const OUTLINE = ['dice', 'chess-knight', 'moon-stars', 'cards', 'plus', 'scan', 'link', 'dots', 'trophy', 'check',
  'calendar-event', 'diamond', 'settings', 'chevron-down', 'chevron-right', 'arrow-left', 'eye', 'flask', 'users-group',
  'crown', 'target', 'shield', 'flame', 'user', 'compass', 'chart-bar', 'flag', 'list', 'corner-down-left',
  'speakerphone', 'arrows-shuffle', 'calculator', 'x', 'lock', 'hourglass',
  'arrow-right', 'photo-plus', 'user-plus', 'stack-2', 'share', 'coffee', 'scissors',
  'home', 'world', 'bolt', 'user-check', 'door-enter', 'chevron-up', 'send',
  'search', 'heart', 'message-circle', 'arrow-up-right', 'external-link', 'users',
  'map-pin', 'navigation',
  'rosette-discount-check', 'headset', 'chart-dots', 'sparkles', 'help-circle', 'alert-circle', 'refresh',
  'book', 'arrow-down', 'layout-grid', 'id-badge-2', 'receipt', 'device-remote', 'devices', 'photo', 'medal', 'palette', 'confetti', 'poker-chip', 'device-desktop', 'letter-v',
  'layout-dashboard', 'player-play', 'clipboard-check', 'clock', 'wifi-off', 'hand-click',
  'camera', 'loader-2', 'stopwatch', 'files',
  'device-tv', 'device-tv-off', 'qrcode', 'link-off', 'focus-2', 'pencil', 'wifi', 'info-circle', 'keyboard',
  'bulb', 'bulb-off', 'camera-off', 'photo-scan']
const FILLED = { 'suit-spade': 'spade', 'suit-heart': 'heart', 'suit-diamond': 'diamonds', 'suit-club': 'clubs' }

const inner = (file) => fs.readFileSync(file, 'utf8')
  .replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  .replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/, '')
  .replace(/\s*\n\s*/g, '').trim()

const lines = ['// 由 tools/gen-icons.mjs 生成，图标来自 Tabler Icons（MIT License）', '']
lines.push('export const ICONS = {')
for (const n of OUTLINE) lines.push(`  '${n}': ${JSON.stringify(inner(path.join(base, 'outline', n + '.svg')))},`)
lines.push('}', '', 'export const FILLED = {')
for (const [k, n] of Object.entries(FILLED)) lines.push(`  '${k}': ${JSON.stringify(inner(path.join(base, 'filled', n + '.svg')))},`)
lines.push('}', '')
fs.writeFileSync('src/common/icons.js', lines.join('\n'))
console.log('icons:', OUTLINE.length + Object.keys(FILLED).length)
