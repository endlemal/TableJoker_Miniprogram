// 房间消息：房间主界面的气泡弹幕和「房间弹幕列表」页共用同一份数据（小程序里同一个模块是单例，两个页面拿到的是同一个对象）。
// 演示：消息存在内存里，其他人的消息定时模拟进来；正式环境走 WebSocket，由服务端广播、保存完整记录
import { reactive } from 'vue'
import { room, me } from '../mock/data.js'

const person = (p) => ({ name: p.name, c: p.c, bg: p.bg, fg: p.fg })
const mySeat = room.seats.find((s) => s.me) || room.seats[0]
export const ME = { name: me.nickname, c: me.char, bg: mySeat.bg, fg: mySeat.fg }
let seq = 1000
const seat = (no) => person(room.seats.find((s) => s.no === no))
const seed = room.chat.map((m) => ({ id: m.id, kind: 'text', from: seat(m.seat), text: m.text, at: Date.now() - m.minutesAgo * 60000, reactions: {} }))
// 演示：七七连着说了两句（会合并显示），第一句有人点了喜欢；老周回复了七七
const qq = seed.find((m) => m.from.name === '七七')
if (qq) {
  qq.reactions = { '❤️': ['阿林', '老周'], '🧋': ['Momo'] }
  seed.splice(seed.indexOf(qq) + 1, 0, { id: 901, kind: 'text', from: qq.from, text: '珍珠奶茶还是水果茶？', at: qq.at + 20000, reactions: {} })
  seed.push({ id: 902, kind: 'text', from: seat(9), text: '我要珍珠的，少冰', at: Date.now() - 30000, reactions: {}, reply: { id: qq.id, name: qq.from.name, text: qq.text } })
}
export const chat = reactive({ list: seed, online: true })
// 网络状态：断网时发送失败，房间状态显示「连接中断」
uni.onNetworkStatusChange && uni.onNetworkStatusChange((r) => { chat.online = !!r.isConnected })
uni.getNetworkType && uni.getNetworkType({ success: (r) => { chat.online = r.networkType !== 'none' } })

// 发文字：先显示为发送中；失败时从列表里拿掉，返回 false，输入框里的内容由页面保留，方便重试。
// 演示：断网，或者消息里带「失败」两个字时模拟发送失败
// reply：回复的那条 { id, name, text }
export function sendText(text, reply) {
  const msg = { id: ++seq, kind: 'text', from: ME, text, at: Date.now(), mine: true, sending: true, reactions: {}, reply: reply || null }
  chat.list.push(msg)
  return new Promise((resolve) => {
    setTimeout(() => {
      const i = chat.list.findIndex((x) => x.id === msg.id)
      const ok = chat.online && !/失败/.test(text)
      if (i >= 0) {
        if (ok) chat.list[i] = { ...chat.list[i], sending: false }
        else chat.list.splice(i, 1)
      }
      resolve(ok)
    }, 320)
  })
}
export function sendImage(src) {
  chat.list.push({ id: ++seq, kind: 'image', from: ME, text: '[图片]', src, at: Date.now(), mine: true, reactions: {} })
}
// 反应：同一个表情再点一次是取消
export function toggleReaction(id, emoji) {
  const m = chat.list.find((x) => x.id === id)
  if (!m || m.kind === 'system') return
  const r = { ...(m.reactions || {}) }
  const who = r[emoji] || []
  r[emoji] = who.includes(ME.name) ? who.filter((n) => n !== ME.name) : who.concat([ME.name])
  if (!r[emoji].length) delete r[emoji]
  m.reactions = r
}
// 系统消息：主持人的操作（暂停、换级、公告、抽座位、开关玩法）
export function addSystem(text) {
  chat.list.push({ id: ++seq, kind: 'system', text, at: Date.now() })
}

// 演示：房间打开时，其他人每隔十来秒说一句
const LINES = ['这级盲注涨得有点快', '有人要奶茶吗', '刚才那手太精彩了', '我先去趟洗手间', '下一级是多少来着？', '加油加油', '这桌好安静哈哈', '休息时一起拍张照']
// 按页面记：房间页和列表页各自开关；页面切换时新页面的 onShow 可能比旧页面的 onHide 先触发，只要还有页面在用就继续
let feed = null
const owners = new Set()
export function startDemoFeed(owner = 'room') {
  owners.add(owner)
  if (feed) return
  feed = setInterval(() => {
    const others = room.seats.filter((s) => !s.me)
    const p = others[Math.floor(Math.random() * others.length)]
    chat.list.push({ id: ++seq, kind: 'text', from: person(p), text: LINES[Math.floor(Math.random() * LINES.length)], at: Date.now(), reactions: {} })
  }, 11000)
}
export function stopDemoFeed(owner = 'room') {
  owners.delete(owner)
  if (owners.size) return
  clearInterval(feed)
  feed = null
}
