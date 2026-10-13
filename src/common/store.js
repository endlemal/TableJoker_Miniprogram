// 方案的本地存储。上线后换成接口即可，结构不变。
export const MAX_SCHEMES = 5
const copy = (v) => JSON.parse(JSON.stringify(v))

export function loadList(key, seeds) {
  try {
    const v = uni.getStorageSync(key)
    if (Array.isArray(v)) return v
  } catch (e) {}
  return copy(seeds)
}

export function saveList(key, list) {
  try { uni.setStorageSync(key, list) } catch (e) {}
}

// 已发布的比赛（演示用，本机可见；正式版由后端按 id 返回）
const KEY_MATCHES = 'zz_matches'
export function saveMatch(match) {
  const list = loadList(KEY_MATCHES, []).filter((x) => x.id !== match.id)
  saveList(KEY_MATCHES, [match].concat(list).slice(0, 20))
}
export function getMatch(id) {
  return loadList(KEY_MATCHES, []).find((x) => x.id === id) || null
}

// 报名申请状态：{ [matchId]: { status: 'pending', message, at } }
const KEY_JOINS = 'zz_join_requests'
export function getJoin(id) {
  try {
    const v = uni.getStorageSync(KEY_JOINS)
    return (v && v[id]) || null
  } catch (e) { return null }
}
export function setJoin(id, value) {
  try {
    const v = uni.getStorageSync(KEY_JOINS) || {}
    if (value) v[id] = value
    else delete v[id]
    uni.setStorageSync(KEY_JOINS, v)
  } catch (e) {}
}
