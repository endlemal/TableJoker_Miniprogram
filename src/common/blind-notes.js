// 盲注结构里特殊级别的说明（比赛邀请页点击这一级弹出气泡）。
// 主办方在盲注结构里给这一级写的说明优先；没写就用平台预设
export const NOTE_PRESETS = {
  C: { title: '截止买入', text: '从这一级开始停止报名和复活（重进），之前已经报名的玩家照常比赛。' },
  B: { title: '休息', text: '比赛暂停，计时器显示休息倒计时，可以离座休息；回来前看一眼大屏上的下一级盲注。' },
  ante: { title: '前注开启', text: '从这一级开始每手牌都要下前注，底池更大，短码玩家要注意节奏。' }
}
const noteOf = (r) => String((r && r.note) || '').trim()
// 第 i 行是不是特殊级别：休息、截止买入、前注开启的那一级，或者主办方写了说明的级别
export function specialOf(rows, i) {
  const r = rows[i]
  if (!r) return null
  if (r.t === 'B' || r.t === 'C') return { kind: r.t, title: NOTE_PRESETS[r.t].title, text: noteOf(r) || NOTE_PRESETS[r.t].text, custom: !!noteOf(r) }
  const firstAnte = rows.findIndex((x) => x.t === 'L' && x.ante > 0)
  if (i === firstAnte) return { kind: 'ante', title: NOTE_PRESETS.ante.title, text: noteOf(r) || NOTE_PRESETS.ante.text, custom: !!noteOf(r) }
  if (noteOf(r)) return { kind: 'note', title: '级别说明', text: noteOf(r), custom: true }
  return null
}
