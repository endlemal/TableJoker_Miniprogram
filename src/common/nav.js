// 自定义导航栏的尺寸：状态栏高度、胶囊所在行的高度、右侧需要给胶囊让出的宽度（单位 px）
let cachedMetrics = null

export function getNavMetrics() {
  if (cachedMetrics) return cachedMetrics
  let statusBar = 20
  let navH = 44
  let capsuleW = 0
  let winW = 375
  let winH = 667
  try {
    const win = uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync()
    statusBar = win.statusBarHeight || 0
    winW = win.windowWidth || winW
    winH = win.windowHeight || winH
  } catch (e) {}
  // #ifdef MP
  try {
    const m = uni.getMenuButtonBoundingClientRect()
    if (m && m.height) {
      navH = (m.top - statusBar) * 2 + m.height
      capsuleW = winW - m.left
    }
  } catch (e) {}
  // #endif
  cachedMetrics = { statusBar, navH, capsuleW, winW, winH }
  return cachedMetrics
}

export function goBackOrHome() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/home/index' })
}
