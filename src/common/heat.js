// 比赛热度：报名人数 + 浏览量，换算成热度胶囊（比赛邀请页顶部）。
// 浏览量在本机累计（演示）；正式环境由服务端统计，这里只负责换算
const KEY = 'zz_match_views'
const hash = (s) => String(s).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
const load = () => { const v = uni.getStorageSync(KEY); return v && typeof v === 'object' ? v : {} }

// 演示数据里的比赛有一个按 id 固定的基础浏览量；自己发布的比赛从 0 开始
export function viewsOf(m) {
  const base = /^m\d/.test(String(m.id)) ? 0 : 60 + (hash(m.id) % 420)
  return base + (load()[m.id] || 0)
}
export function addView(m) {
  const all = load()
  all[m.id] = (all[m.id] || 0) + 1
  uni.setStorageSync(KEY, all)
  return viewsOf(m)
}
// 报名占比为主，浏览量为辅
export function heatOf({ signed, cap, views }) {
  const fill = signed / Math.max(1, cap)
  const score = Math.round(fill * 100 + Math.min(views, 2000) / 10)
  if (fill >= 0.85) return { level: 4, label: '即将满员', icon: 'flame', tone: '#FF4D4D', score }
  if (score >= 70) return { level: 3, label: '火爆报名中', icon: 'flame', tone: '#FF7A45', score }
  if (score >= 35) return { level: 2, label: '热度上升', icon: 'trending-up', tone: '#FFC53A', score }
  return { level: 1, label: '新开放', icon: 'sparkles', tone: '#4CB582', score }
}
export const fmtCount = (n) => (n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + '万' : String(n))
