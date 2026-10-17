// 主办方工作台 · 演示数据。接后端时按同样字段替换
import { privileges } from './host.js'

export const hostProfile = { server: '周五桌游夜', expires: '2027/10/14', kind: '个人主办方' }

// 本周概览
export const deskMetrics = [
  { key: 'live', value: 2, unit: '场', label: '进行中' },
  { key: 'review', value: 5, unit: '条', label: '待审核' },
  { key: 'signup', value: 48, unit: '人次', label: '本周报名' },
  { key: 'show', value: 86, unit: '%', label: '到场率' }
]

// 待办：tone 决定图标颜色；action 决定点开去哪
export const todos = [
  { key: 'review', tone: 'red', icon: 'clipboard-check', title: '5 条报名待审核', sub: '周五狼人杀锦标赛，最早一条是 2 小时前提交的', action: 'review' },
  { key: 'start', tone: 'amber', icon: 'clock', title: '今晚 19:00 开赛', sub: '周五狼人杀锦标赛，已报名 9/27，记得提前布置台桌', action: 'room' },
  { key: 'dealer', tone: 'blue', icon: 'user-check', title: '2 位荷官待确认排班', sub: '周六 22:00 血月深夜赛', action: 'dealers' },
  { key: 'device', tone: 'gray', icon: 'wifi-off', title: '1 台大屏离线', sub: '城北桌游吧 2 号桌，开赛前请检查网络', action: 'devices' }
]

// 功能入口：和平台认证页「功能特权」是同一份清单（src/mock/host.js 的 privileges），以平台认证页为准。
// 图标按 key 取，由 tools/build_workbench_icons.py 从 design/icons/workbench 的原图生成
export const featureGroups = privileges.map((g) => ({
  key: g.key,
  title: g.title,
  items: g.items.map((it) => ({ key: it.key, name: it.name, desc: it.desc, img: `/static/workbench/${it.key}.png` }))
}))

export const services = [
  { key: 'data', icon: 'chart-dots', name: '数据中心', desc: '报名转化、到场率、回头玩家等 12 项数据' },
  { key: 'support', icon: 'headset', name: '专属客服', desc: '工作日 2 小时内响应' },
  { key: 'cert', icon: 'rosette-discount-check', name: '认证管理', desc: '个人主办方，有效期至 2027/10/14' }
]
