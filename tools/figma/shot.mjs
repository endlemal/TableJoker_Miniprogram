// 用 375 宽手机视口给 H5 页面截图，作为在 Figma 里搭原型的参考图
// 用法：node tools/figma/shot.mjs [输出目录，默认 /tmp/proto-ref] [页面名...]
//   不写页面名时截 pages.json 里的全部页面；每页输出 <名>.png（首屏）和 <名>-full.png（整页），都是 2 倍图
// 前提：H5 开发服务器已在 http://localhost:5173 运行（npm run dev:h5）
// 说明：headless Chrome 的 --window-size 小于约 500 宽时不生效，所以这里用 CDP 设置设备尺寸
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const [outDir = '/tmp/proto-ref', ...names] = process.argv.slice(2)
const BASE = process.env.H5_BASE || 'http://localhost:5173'
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9300 + Math.floor(Math.random() * 90)

const pages = JSON.parse(fs.readFileSync(path.join(root, 'src/pages.json'), 'utf8')).pages
  .map(p => ({ name: p.path.split('/')[1], path: p.path }))
  .filter(p => !names.length || names.includes(p.name))
fs.mkdirSync(outDir, { recursive: true })

const sleep = ms => new Promise(r => setTimeout(r, ms))
const profile = fs.mkdtempSync('/tmp/shot-chrome-')
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

try {
  let list
  for (let i = 0; i < 50 && !list; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json() } catch (e) { await sleep(200) }
  }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise(r => { ws.onopen = r })
  let id = 0
  const pending = new Map()
  ws.onmessage = e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } }
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })

  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true })
  for (const p of pages) {
    await send('Page.navigate', { url: `${BASE}/#/${p.path}` })
    await sleep(4000) // 等页面按需编译、字体和动画落定
    const first = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(outDir, `${p.name}.png`), Buffer.from(first.result.data, 'base64'))
    // uni-app 的页面可能在内部滚动容器里滚动，取最大的 scrollHeight
    const h = await send('Runtime.evaluate', { returnByValue: true, expression:
      'Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, ...[...document.querySelectorAll("uni-page-body, uni-scroll-view, .uni-scroll-view")].map(e => e.scrollHeight))' })
    const height = h.result.result.value
    const full = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 375, height, scale: 1 } })
    fs.writeFileSync(path.join(outDir, `${p.name}-full.png`), Buffer.from(full.result.data, 'base64'))
    console.log(`${p.name}: 整页高 ${height}px -> ${outDir}`)
  }
  ws.close()
} finally {
  // 等 Chrome 退出后再删配置目录，否则它还在写文件会删不干净
  await new Promise(r => { chrome.once('exit', r); chrome.kill() })
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
