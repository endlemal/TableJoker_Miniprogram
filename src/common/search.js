// 全局搜索：赛事名称、主办方名称、帖子、6 位房间码，实时检索（不分城市）
const HIST_KEY = 'zz_search_history'
const norm = (s) => String(s || '').trim().toLowerCase()
const has = (text, q) => norm(text).includes(q)
// 输入的内容在一段文字里出现的位置，用来高亮：[{ t, hit }]
export function splitHit(text, q) {
  const s = String(text || '')
  const k = norm(q)
  if (!k) return [{ t: s, hit: false }]
  const out = []
  let i = 0
  const low = s.toLowerCase()
  while (i < s.length) {
    const j = low.indexOf(k, i)
    if (j < 0) { out.push({ t: s.slice(i), hit: false }); break }
    if (j > i) out.push({ t: s.slice(i, j), hit: false })
    out.push({ t: s.slice(j, j + k.length), hit: true })
    i = j + k.length
  }
  return out
}
// 搜索范围（搜索栏右边的筛选按钮）
export const SCOPES = [{ key: 'all', label: '全部' }, { key: 'match', label: '赛事' }, { key: 'club', label: '主办方' }, { key: 'post', label: '帖子' }]
// q：输入；matches：所有能看到的比赛（所有城市）；clubs：认证主办方；posts：广场帖子；scope：只搜某一类
export function searchAll(q, { matches = [], clubs = [], posts = [], scope = 'all' }) {
  const k = norm(q)
  const none = { q: k, code: null, matches: [], clubs: [], posts: [], empty: false }
  if (!k) return none
  const want = (t) => scope === 'all' || scope === t
  // 6 位房间码：精确命中；输入 3 位以上数字时，房间码开头相同的也列出来
  const digits = /^\d+$/.test(k)
  const code = want('match') && digits && k.length === 6 ? matches.find((m) => m.roomCode === k) || null : null
  const found = want('match') ? matches.filter((m) => m !== code && (
    has(m.name, k) ||
    has(m.creator && m.creator.name, k) ||
    has(m.location && m.location.name, k) ||
    (digits && k.length >= 3 && String(m.roomCode || '').startsWith(k))
  )) : []
  const cl = want('club') ? clubs.filter((c) => has(c.name, k) || has(c.venue && c.venue.name, k) || has(c.venue && c.venue.address, k) || has(c.city, k) || has(c.area, k)) : []
  const ps = want('post') ? posts.filter((p) => has(p.title, k) || has(p.author && p.author.name, k) || (p.body || []).some((t) => has(t, k))) : []
  return { q: k, code, matches: found.slice(0, 20), clubs: cl.slice(0, 10), posts: ps.slice(0, 10), empty: !code && !found.length && !cl.length && !ps.length }
}
export function loadHistory() {
  const v = uni.getStorageSync(HIST_KEY)
  return Array.isArray(v) ? v : []
}
export function pushHistory(q) {
  const k = String(q || '').trim()
  if (!k) return loadHistory()
  const list = [k].concat(loadHistory().filter((x) => x !== k)).slice(0, 8)
  uni.setStorageSync(HIST_KEY, list)
  return list
}
export function clearHistory() {
  uni.removeStorageSync(HIST_KEY)
  return []
}
