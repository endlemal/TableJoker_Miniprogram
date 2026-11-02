// 房间排行独立于牌桌结算；index 可空，重复值按稳定的手动顺序排列。
export function rankPlayers(members, assets, state) {
  const order = new Map(state.order.map((name, i) => [name, i]))
  const rows = members.map((m, i) => ({ ...m, score: assets[m.name] || 0, index: state.index[m.name] ?? '', stable: order.get(m.name) ?? state.order.length + i }))
  return rows.sort((a, b) => {
    if (state.mode === 'score') return b.score - a.score || a.stable - b.stable
    if (state.mode === 'index') {
      const ai = a.index === '' ? Infinity : Number(a.index), bi = b.index === '' ? Infinity : Number(b.index)
      if (ai !== bi) return ai < bi ? -1 : 1
    }
    return a.stable - b.stable
  })
}
export function parseRankIndex(value) {
  const s = String(value ?? '').trim()
  if (!s) return ''
  return /^\d{1,6}$/.test(s) && Number(s) > 0 ? Number(s) : null
}
export function moveRank(order, name, target) {
  const next = order.filter(n => n !== name)
  next.splice(Math.max(0, Math.min(next.length, target)), 0, name)
  return next
}
