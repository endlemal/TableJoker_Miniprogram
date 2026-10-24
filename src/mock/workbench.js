// 主办方工作台 · 演示数据。接后端时按同样字段替换
import { privileges } from './host.js'
import { servers } from './data.js'

// 身份卡：俱乐部（当前服务器）+ 主办方编号
export const hostProfile = {
  club: servers[0].name, clubIcon: servers[0].icon, clubBg: servers[0].bg, clubFg: servers[0].fg,
  kind: '个人主办方', expires: '10/27', cardNo: ['HOST', '0042', '1018', '7Q2D']
}

// 本周概览
export const deskMetrics = [
  { key: 'live', value: 2, unit: '场', label: '进行中' },
  { key: 'review', value: 5, unit: '条', label: '待审核' },
  { key: 'signup', value: 48, unit: '人次', label: '本周报名' },
  { key: 'show', value: 86, unit: '%', label: '到场率' }
]

// 房间：「房间列表」按钮里的数量
export const rooms = [
  { id: 'hm-deep', name: '周五深筹码大师赛', cover: 'fog', status: 'live', statusText: '进行中 · 第 3 级', players: '18/27' },
  { id: 'hm-hunter', name: '周末猎人锦标赛', cover: 'jungle', status: 'soon', statusText: '周六 20:00 开始', players: '12/18' }
]

// 待办：按紧急程度排好，默认只显示前 3 条，其余折叠
export const todos = [
  { key: 'review', tone: 'red', icon: 'clipboard-check', title: '5 条报名待审核', meta: '2 小时前', action: 'review' },
  { key: 'dealer', tone: 'amber', icon: 'user-check', title: '2 位荷官待确认排班', meta: '周六', action: 'dealers' },
  { key: 'live', tone: 'green', icon: 'player-play', title: '周五深筹码大师赛 第 3 级进行中', meta: '进行中', action: 'room' },
  { key: 'device', tone: 'gray', icon: 'wifi-off', title: '1 台大屏离线', meta: '2 号桌', action: 'devices' },
  { key: 'blinds', tone: 'blue', icon: 'stopwatch', title: '周末猎人锦标赛还没设盲注结构', meta: '周六', action: 'blinds' },
  { key: 'msg', tone: 'gray', icon: 'message-circle', title: '3 条玩家留言未回复', meta: '昨天', action: 'msg' }
]

// 办赛热力：本月每天来参加你办的比赛的人数。演示数据按星期生成（周五、周六最多），今天之后为空
export function hostHeat(now = new Date()) {
  const y = now.getFullYear()
  const m = now.getMonth()
  const today = now.getDate()
  const count = new Date(y, m + 1, 0).getDate()
  const BASE = [14, 0, 6, 0, 9, 26, 31] // 周日 → 周六
  const days = []
  for (let d = 1; d <= count; d++) {
    const wd = new Date(y, m, d).getDay()
    let n = null
    if (d <= today) n = BASE[wd] ? Math.max(0, BASE[wd] + ((d * 7) % 9) - 4) : (d % 5 === 0 ? 6 : 0)
    days.push({ d, wd, n, today: d === today })
  }
  return { month: m + 1, today, days }
}

// 运营分析 · 客群与线上率：占比是本月活跃玩家的构成；同比按本周和上周的人数算
export const audience = {
  onlineRate: 84,
  groups: [
    { key: 'regular', name: '活跃常客', pct: 52, color: '#DC0000', now: 77, prev: 65 },
    { key: 'fresh', name: '首刷新客', pct: 34, color: '#4CB582', now: 31, prev: 25 },
    { key: 'back', name: '回流玩家', pct: 14, color: '#FFC53A', now: 23, prev: 24 }
  ]
}

// 运营分析 · 热门道具（近 30 天使用次数）。图标用工作台的功能图标
const img = (k) => `/static/workbench/${k}.png`
export const hotProps = [
  { key: 'legend', name: '定制记分牌', count: 48, img: img('legend') },
  { key: 'award', name: '颁奖动画', count: 36, img: img('award') },
  { key: 'medal', name: '周边勋章', count: 29, img: img('medal') },
  { key: 'theme', name: '大屏主题', count: 21, img: img('theme') },
  { key: 'poster', name: '海报广告', count: 12, img: img('poster') }
]

// 运营分析 · 活跃玩家榜（近 30 天荣誉积分）
export const topPlayers = [
  { name: '老周', char: '周', bg: '#3D3550', fg: '#D6CCFF', matches: 14, points: 1280 },
  { name: '小鹿', char: '鹿', bg: '#2E4A3B', fg: '#A8E0C2', matches: 12, points: 1160 },
  { name: '阿杰', char: '杰', bg: '#2A3550', fg: '#B5C7F2', matches: 11, points: 1045 },
  { name: 'Momo', char: 'M', bg: '#24404A', fg: '#A6DDEB', matches: 10, points: 980 },
  { name: '七七', char: '七', bg: '#4A2433', fg: '#F5B5C8', matches: 9, points: 905 },
  { name: '大熊', char: '熊', bg: '#3F3A2A', fg: '#E6D3A3', matches: 9, points: 870 },
  { name: '阿林', char: '林', bg: '#3B4A6B', fg: '#C9D6FF', matches: 8, points: 815 },
  { name: 'Q仔', char: 'Q', bg: '#4A2E1F', fg: '#F2C9A0', matches: 7, points: 760 },
  { name: '阿哲', char: '哲', bg: '#2F3A2A', fg: '#C8E0A8', matches: 7, points: 705 },
  { name: '小雨', char: '雨', bg: '#2A2F4A', fg: '#B8C4F2', matches: 6, points: 640 }
]

// 功能入口：和平台认证页「功能特权」是同一份清单（src/mock/host.js 的 privileges），以平台认证页为准。
// 图标按 key 取，由 tools/build_workbench_icons.py 从 design/icons/workbench 的原图生成
export const featureGroups = privileges.map((g) => ({
  key: g.key,
  title: g.title,
  color: g.color,
  items: g.items.map((it) => ({ key: it.key, name: it.name, desc: it.desc, img: `/static/workbench/${it.key}.png` }))
}))

// 荷官名册（工作台的荷官列表）：创建比赛时选「驻场荷官」用。只作信息展示，不关联账号，也没有控场权限。
// photo 是演示用的占位图（上线前换成荷官本人授权的照片）；tone 是照片的背景色，名牌卡片用它做底色
export const dealerRoster = [
  { id: 'dl2', name: '小鹿', char: '鹿', bg: '#DCE7F3', fg: '#1F4E79', title: '主牌官', years: 5, tags: ['锦标赛', '决赛桌'], photo: '/static/dealers/dealer-01.jpg', tone: '#92192C' },
  { id: 'dl4', name: 'Mia', char: 'M', bg: '#F1DCE4', fg: '#7A1F45', title: '资深荷官', years: 4, tags: ['深筹赛', '英语'], photo: '/static/dealers/dealer-02.jpg', tone: '#1B3266' },
  { id: 'dl1', name: '阿杰', char: '杰', bg: '#E9D9C3', fg: '#7A3B1A', title: '荷官', years: 6, tags: ['锦标赛', '英语'], tone: '#5A3A22' },
  { id: 'dl3', name: '老周', char: '周', bg: '#E4E9D8', fg: '#3E5A1E', title: '资深荷官', years: 8, tags: ['决赛桌'], tone: '#2E4A1E' },
  { id: 'dl5', name: '七七', char: '七', bg: '#E8E0F5', fg: '#4B2A86', title: '荷官', years: 1, tags: ['快速赛'], tone: '#3B2A66' },
  { id: 'dl6', name: '大熊', char: '熊', bg: '#F3E6CF', fg: '#6B4A12', title: '场务 · 荷官', years: 4, tags: ['周末局'], tone: '#5A4012' }
]
