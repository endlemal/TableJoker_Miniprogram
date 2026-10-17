// 底部悬浮导航的四个入口。第四个入口随认证状态变化：已认证是「主办方工作台」，其余状态是「成为主办方」
import { getCertState } from './cert.js'

const BASE = [
  { key: 'me', label: '我的', icon: 'user', url: '/pages/profile/index' },
  { key: 'plaza', label: '广场', icon: 'compass', url: '/pages/plaza/index' },
  { key: 'rank', label: '排行', icon: 'chart-bar', tip: '排行页面待接入' }
]
const BECOME_HOST = { key: 'host', label: '成为主办方', icon: 'flag', url: '/pages/host/index' }
const WORKBENCH = { key: 'desk', label: '主办方工作台', icon: 'layout-dashboard', url: '/pages/workbench/index' }

export function tabItems(state = getCertState()) {
  return BASE.concat(state === 'verified' ? WORKBENCH : BECOME_HOST)
}

// 点导航：去别的页面用 redirectTo（新页面上的导航球会从当前位置滑过去）；
// 点的是当前页面或还没接入的入口，就留在本页，由 stay 更新选中项
export function tapTab(items, i, pageKey, stay) {
  const it = items[i]
  if (!it) return
  if (it.url && it.key !== pageKey) {
    uni.redirectTo({ url: it.url })
    return
  }
  stay(i)
  if (it.tip) setTimeout(() => uni.showToast({ title: it.tip, icon: 'none' }), 420)
}
