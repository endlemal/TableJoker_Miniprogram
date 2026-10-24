// 荷官名册（主办方工作台的荷官列表）。只作信息展示：不关联账号，也没有控场权限。
// 以后的荷官管理页增删改都存在这里；现在没有存过就用演示名册
import { dealerRoster } from '../mock/workbench.js'

const KEY = 'zz_dealers'
export function listDealers() {
  const saved = uni.getStorageSync(KEY)
  return Array.isArray(saved) && saved.length ? saved : dealerRoster.map((d) => ({ ...d, tags: d.tags.slice() }))
}
// 存进比赛记录里的快照：荷官以后改名或离开名册，已经发布的比赛仍然显示当时的信息
export const dealerSnapshot = (d) => ({ id: d.id, name: d.name, char: d.char, bg: d.bg, fg: d.fg, title: d.title, years: d.years, tags: (d.tags || []).slice(), photo: d.photo || '', tone: d.tone || '' })
