// 广场「赛事」的多维筛选：日期（今天 / 本周末 / 指定日期）、赛制（标准赛 / 快速赛 / 深筹赛）、报名状态、距离，可以组合
import { distanceKm } from './geo.js'

export const DATE_OPTS = [{ key: 'all', label: '全部日期' }, { key: 'today', label: '今天' }, { key: 'weekend', label: '本周末' }, { key: 'pick', label: '指定日期' }]
export const FORMAT_OPTS = [{ key: 'all', label: '全部赛制' }, { key: 'standard', label: '标准赛' }, { key: 'fast', label: '快速赛' }, { key: 'deep', label: '深筹赛' }]
export const STATUS_OPTS = [{ key: 'all', label: '全部状态' }, { key: 'open', label: '报名中' }, { key: 'almost', label: '即将满员' }, { key: 'full', label: '已满员' }]
export const DIST_OPTS = [{ key: 'all', label: '距离不限' }, { key: 'near', label: '由近到远' }, { key: '3', label: '3 km 内' }, { key: '10', label: '10 km 内' }]
export const emptyFilter = () => ({ date: 'all', day: '', format: 'all', status: 'all', dist: 'all' })
export const isFiltered = (f) => f.date !== 'all' || f.format !== 'all' || f.status !== 'all' || f.dist !== 'all'
const FORMAT_LABEL = { standard: '标准赛', fast: '快速赛', deep: '深筹赛' }

// 赛制：主办方选了「快速赛」「深筹赛」标签就按标签；否则看每级时长（少于 15 分钟是快速赛，25 分钟及以上是深筹赛）
export function formatOf(m) {
  const tags = (m.tags || []).map((t) => (typeof t === 'string' ? t : t.text))
  if (tags.includes('快速赛')) return 'fast'
  if (tags.includes('深筹赛')) return 'deep'
  const lv = (m.blindRows || []).filter((r) => r.t === 'L')
  const avg = lv.length ? lv.reduce((a, r) => a + (r.min || 0), 0) / lv.length : 20
  return avg < 15 ? 'fast' : avg >= 25 ? 'deep' : 'standard'
}
export const formatLabel = (m) => FORMAT_LABEL[formatOf(m)]
// 报名状态：已开赛、已满员、即将满员（八成五以上）、报名中
export function statusOf(m, now = Date.now()) {
  const n = (m.participants || []).length
  if (m.startAt <= now) return 'started'
  if (n >= m.cap) return 'full'
  if (n / m.cap >= 0.85) return 'almost'
  return 'open'
}
const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }
const DAY = 86400000
// 本周末：本周六 0 点到周日 24 点；今天是周日就只剩今天
function weekendRange(now) {
  const d = new Date(dayStart(now))
  const wd = d.getDay()
  if (wd === 0) return [d.getTime(), d.getTime() + DAY]
  const sat = d.getTime() + (6 - wd) * DAY
  return [sat, sat + 2 * DAY]
}
const ymd = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export function inDate(m, f, now = Date.now()) {
  if (f.date === 'today') return dayStart(m.startAt) === dayStart(now)
  if (f.date === 'weekend') { const [a, b] = weekendRange(now); return m.startAt >= a && m.startAt < b }
  if (f.date === 'pick') return !f.day || ymd(m.startAt) === f.day
  return true
}
// 组合筛选；返回筛选后的比赛（带上距离 km），距离选「由近到远」或限定范围时按距离排序，否则按开赛时间
export function filterMatches(list, f, { now = Date.now(), origin = null } = {}) {
  const out = list
    .map((m) => ({ m, km: origin && m.location && m.location.latitude ? distanceKm(origin, m.location) : null }))
    .filter(({ m, km }) => {
      if (!inDate(m, f, now)) return false
      if (f.format !== 'all' && formatOf(m) !== f.format) return false
      if (f.status !== 'all' && statusOf(m, now) !== f.status) return false
      if ((f.dist === '3' || f.dist === '10') && (km == null || km > Number(f.dist))) return false
      return true
    })
  const byDist = f.dist !== 'all'
  out.sort((a, b) => (byDist ? (a.km ?? 1e9) - (b.km ?? 1e9) : a.m.startAt - b.m.startAt))
  return out
}
// 筛选栏上每一项显示的文字
export function filterLabels(f) {
  const pick = (opts, k, dflt) => (k === 'all' ? dflt : (opts.find((o) => o.key === k) || {}).label)
  return {
    date: f.date === 'pick' && f.day ? f.day.slice(5).replace('-', '/') : pick(DATE_OPTS, f.date, '日期'),
    format: pick(FORMAT_OPTS, f.format, '赛制'),
    status: pick(STATUS_OPTS, f.status, '报名状态'),
    dist: pick(DIST_OPTS, f.dist, '距离')
  }
}
