// 房间消息：房间主界面的气泡弹幕和「房间弹幕列表」页共用同一份数据（小程序里同一个模块是单例，两个页面拿到的是同一个对象）。
// 演示：消息存在内存里，其他人的消息定时模拟进来；正式环境走 WebSocket，由服务端广播、保存完整记录
import { reactive } from 'vue'
import { room, me } from '../mock/data.js'

const person = (p) => ({ name: p.name, c: p.c, bg: p.bg, fg: p.fg })
const mySeat = room.seats.find((s) => s.me) || room.seats[0]
export const ME = { name: me.nickname, c: me.char, bg: mySeat.bg, fg: mySeat.fg }
let seq = 1000
export const chat = reactive({
  list: room.chat.map((m) => ({ id: m.id, kind: 'text', from: person(room.seats.find((s) => s.no === m.seat)), text: m.text, at: Date.now() - m.minutesAgo * 60000 })),
  online: true
})
// 网络状态：断网时发送失败，房间状态显示「连接中断」
uni.onNetworkStatusChange && uni.onNetworkStatusChange((r) => { chat.online = !!r.isConnected })
uni.getNetworkType && uni.getNetworkType({ success: (r) => { chat.online = r.networkType !== 'none' } })

// 发文字：先显示为发送中；失败时从列表里拿掉，返回 false，输入框里的内容由页面保留，方便重试。
// 演示：断网，或者消息里带「失败」两个字时模拟发送失败
export function sendText(text) {
  const msg = { id: ++seq, kind: 'text', from: ME, text, at: Date.now(), mine: true, sending: true }
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
  chat.list.push({ id: ++seq, kind: 'image', from: ME, text: '[图片]', src, at: Date.now(), mine: true })
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
    chat.list.push({ id: ++seq, kind: 'text', from: person(p), text: LINES[Math.floor(Math.random() * LINES.length)], at: Date.now() })
  }, 11000)
}
export function stopDemoFeed(owner = 'room') {
  owners.delete(owner)
  if (owners.size) return
  clearInterval(feed)
  feed = null
}
