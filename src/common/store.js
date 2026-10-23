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
// 6 位房间码：发布比赛时生成，不和已保存的比赛重复（正式环境由后端分配）。主办方在比赛邀请页能看到
export function newRoomCode() {
  const used = new Set(loadList(KEY_MATCHES, []).map((m) => m.roomCode).filter(Boolean))
  let code = ''
  do { code = String(100000 + Math.floor(Math.random() * 900000)) } while (used.has(code))
  return code
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
