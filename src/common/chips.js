// 记分牌面额图例：本场使用的记分牌颜色和面额。比赛没有单独设置时，按盲注结构推算一套
export const CHIP_COLORS = {
  25: { color: '#2E9E6A', name: '绿' },
  100: { color: '#F3EEE6', name: '白' },
  500: { color: '#DC2626', name: '红' },
  1000: { color: '#F4B740', name: '黄' },
  5000: { color: '#3D7BFF', name: '蓝' },
  25000: { color: '#8B5CF6', name: '紫' }
}
export function chipsOf(m) {
  if (m && Array.isArray(m.chips) && m.chips.length) return m.chips
  const levels = ((m && m.blindRows) || []).filter((r) => r.t === 'L')
  const set = [100, 500, 1000, 5000]
  if (levels.length) {
    if (Math.min(...levels.map((l) => l.sb)) % 100) set.unshift(25)
    if (Math.max(...levels.map((l) => l.bb)) >= 20000) set.push(25000)
  }
  return set.map((v) => ({ v, ...CHIP_COLORS[v] }))
}
