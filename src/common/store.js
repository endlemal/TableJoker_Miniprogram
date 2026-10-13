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
