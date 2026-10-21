// 大屏设备：电视上安装的「桌趣大屏计时器」。
// 正式流程（需要后端和电视端配合）：
// - 配对：电视首页显示 6 位配对码和二维码（二维码内容是配对码，或带 code 参数的小程序链接）。
//   小程序把配对码交给后端，后端找到正在等待配对的电视，绑定到当前账号，再由用户给它起名
// - 解绑：后端通知电视清除绑定，电视回到计时器的初始页（重新显示配对码）
// - 识别：后端给电视下发指令，电视在屏幕上浮现设备名称几秒，方便认出是哪一台
// - 在线状态：电视定时发心跳，超过 ONLINE_WINDOW 没有心跳算离线
// 演示版把设备列表存在本地；配对码 123456（mock/devices.js 的 PAIR_CODE）能配对成功，其余 6 位数字都会模拟「找不到这台大屏」
import { seedDevices, TV_MODELS, PAIR_CODE } from '../mock/devices.js'

const KEY = 'zz_devices'
export const ONLINE_WINDOW = 60 * 1000
export const IDENTIFY_SECONDS = 5
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function load() {
  try {
    const v = uni.getStorageSync(KEY)
    if (Array.isArray(v)) return v
  } catch (e) {}
  const seeded = seedDevices()
  save(seeded)
  return seeded
}
function save(list) {
  try { uni.setStorageSync(KEY, list) } catch (e) {}
}

export const isOnline = (d) => !!d && Date.now() - d.lastSeen < ONLINE_WINDOW

// 设备列表（演示：在线的电视每次读取时刷新一次心跳）
export async function listDevices() {
  await wait(160)
  const list = load()
  const now = Date.now()
  list.forEach((d) => { if (d.alive) d.lastSeen = now })
  save(list)
  return list
}

// 从扫码结果里取出 6 位配对码：纯数字、tjtv://pair?code=123456、带 code / scene 参数的链接都可以
export function parsePairPayload(text) {
  const s = decodeURIComponent(String(text || '').trim())
  const m = s.match(/(?:code|scene)=(\d{6})(?!\d)/) || s.match(/^(\d{6})$/)
  return m ? m[1] : ''
}

// 用配对码找到等待配对的电视（还没加入列表）；演示环境只有 PAIR_CODE 有效
export async function findByCode(code) {
  await wait(800)
  if (!/^\d{6}$/.test(code) || code !== PAIR_CODE) throw new Error('not-found')
  const tvId = 'TV-' + parseInt(code, 10).toString(16).toUpperCase().slice(-4).padStart(4, '0')
  if (load().some((d) => d.tvId === tvId)) throw new Error('exists')
  return { tvId, model: TV_MODELS[Number(code[5]) % TV_MODELS.length], resolution: { w: 3840, h: 2160 }, app: '大屏计时器 v1.2.0' }
}

// 起名后加入设备列表（加在最前面）
// 名字不能和别的大屏重复，否则识别时分不清是哪一台
export const nameTaken = (list, name, exceptId = '') => list.some((d) => d.id !== exceptId && d.name === String(name).trim())

export async function addDevice(found, name) {
  await wait(300)
  const list = load()
  if (nameTaken(list, name)) throw new Error('duplicate')
  const now = Date.now()
  const d = { id: 'd' + now, tvId: found.tvId, name, model: found.model, resolution: found.resolution, app: found.app, pairedAt: now, lastSeen: now, alive: true, showing: 'home', showingText: '计时器首页' }
  list.unshift(d)
  save(list)
  return d
}

export async function renameDevice(id, name) {
  await wait(250)
  const list = load()
  const d = list.find((x) => x.id === id)
  if (!d) throw new Error('missing')
  if (nameTaken(list, name, id)) throw new Error('duplicate')
  d.name = name
  save(list)
  return d
}

// 解绑：电视回到计时器初始页
export async function unbindDevice(id) {
  await wait(350)
  save(load().filter((x) => x.id !== id))
}

// 识别：电视浮现设备名称 IDENTIFY_SECONDS 秒；离线时不能识别
export async function identifyDevice(id) {
  await wait(250)
  const d = load().find((x) => x.id === id)
  if (!isOnline(d)) throw new Error('offline')
  return { seconds: IDENTIFY_SECONDS }
}

// 给新设备推荐一个还没用过的名字：1 号桌大屏、2 号桌大屏……
export function suggestName(list) {
  const used = new Set(list.map((d) => d.name))
  for (let k = 1; k < 100; k++) if (!used.has(`${k} 号桌大屏`)) return `${k} 号桌大屏`
  return '新大屏'
}
