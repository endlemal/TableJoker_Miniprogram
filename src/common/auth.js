// 登录：必须登录才能进入首页。我们的注册登录就是微信绑定登录：
// - 用户在登录页的入场券上填好头像（chooseAvatar）、昵称（type=nickname）和所在城市（地区选择器），
//   点「登录」并在弹窗里同意协议后，调用 wx.login 拿 code，交给后端用 code2Session 换 openid，没有账号就新建。
//   演示版在本地模拟后端。
// - 头像、昵称是隐私接口，要在公众平台「用户隐私保护指引」里声明「收集你的昵称、头像」，否则会直接调用失败。
// - 能从外部直接打开的页面（首页、分享落地页、广场、平台认证页、房间）在 onLoad 开头调用 requireLogin()，
//   未登录时转到登录页，登录后回到原来的页面。
import { reactive, onUnmounted } from 'vue'

const AUTH = 'zz_auth'
const PROFILE = 'zz_profile'
const PASS = 'zz_pass'
const EVT = 'profile-change'

const read = (key, fallback) => {
  try {
    const v = uni.getStorageSync(key)
    return v === '' || v === undefined || v === null ? fallback : v
  } catch (e) {
    return fallback
  }
}
const write = (key, value) => {
  try { uni.setStorageSync(key, value) } catch (e) {}
}

export const getAuth = () => read(AUTH, null)
export const getProfile = () => read(PROFILE, { avatarUrl: '', nickname: '', city: '' })
export const isProfileComplete = (p = getProfile()) => !!(p.avatarUrl && p.nickname && p.city)
export const isLoggedIn = () => !!getAuth() && isProfileComplete()

// 入场券上的占位信息：座位号（以后改为「这座城市的第几位玩家」，由后端给出）和券号。第一次打开时生成并保存
export function getPass() {
  let p = read(PASS, null)
  if (!p) {
    const seat = 10 + Math.floor(Math.random() * 90)
    const d = new Date()
    const mmdd = String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0')
    const tail = Math.random().toString(36).slice(2, 4).toUpperCase()
    p = { seat: String(seat), code: `TJ-${seat}-${mmdd}-${tail}` }
    write(PASS, p)
  }
  return p
}

// chooseAvatar 返回的是临时文件，微信会清理。演示版用 saveFile 存成本地文件，重启后头像还在；
// 接后端时改为 uni.uploadFile 上传，保存服务器返回的图片地址
export function persistAvatar(tempPath) {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    if (/^(wxfile|http:\/\/tmp)/.test(tempPath)) {
      return uni.saveFile({ tempFilePath: tempPath, success: (r) => resolve(r.savedFilePath), fail: () => resolve(tempPath) })
    }
    // #endif
    resolve(tempPath)
  })
}

/* ---------- 登录（微信绑定）：重复点击只登录一次 ---------- */
let task = null
export function login(profile) {
  if (task) return task
  task = new Promise((resolve, reject) => {
    const done = (fn, v) => { task = null; fn(v) }
    const finish = (code) => exchangeCode(code, profile).then((auth) => {
      write(PROFILE, { avatarUrl: profile.avatarUrl, nickname: profile.nickname, city: profile.city })
      write(AUTH, auth)
      uni.$emit(EVT)
      done(resolve, auth)
    }, (e) => done(reject, e))
    // #ifdef MP-WEIXIN
    uni.login({ provider: 'weixin', success: (r) => finish(r.code), fail: (e) => done(reject, e) })
    // #endif
    // #ifndef MP-WEIXIN
    finish('h5-demo')
    // #endif
  })
  return task
}
// 演示：后端用 code 调 code2Session 换 openid，没有账号就新建，保存头像（上传后的地址）、昵称和城市，返回 token
function exchangeCode(code, profile) {
  return new Promise((resolve) => setTimeout(() => {
    const pass = getPass()
    resolve({ userId: 'u' + pass.seat + String(Date.now()).slice(-4), token: `demo-${code}-${Date.now()}`, seat: pass.seat, city: profile.city, joinedAt: Date.now() })
  }, 700))
}

// 开发用：退出登录，回到第一次打开的状态
export function logout() {
  try {
    uni.removeStorageSync(AUTH)
    uni.removeStorageSync(PROFILE)
  } catch (e) {}
  uni.$emit(EVT)
}

/* ---------- 页面里显示的「我」 ---------- */
export function identity(p = getProfile(), a = getAuth()) {
  const nickname = p.nickname || '玩家'
  return { avatarUrl: p.avatarUrl || '', nickname, char: nickname.slice(0, 1), city: p.city || '', seat: a ? a.seat : '', loggedIn: !!a && isProfileComplete(p) }
}
// 组件里用：返回会自动更新的身份信息（登录、修改资料后已经打开的页面也会跟着变）
export function useProfile() {
  const state = reactive(identity())
  const sync = () => Object.assign(state, identity())
  uni.$on(EVT, sync)
  onUnmounted(() => uni.$off(EVT, sync))
  return state
}

/* ---------- 门禁 ---------- */
// 页面 onLoad 开头调用：已登录返回 true；未登录转到登录页（带上当前页面，登录后回来），返回 false
export function requireLogin() {
  if (isLoggedIn()) return true
  const ps = getCurrentPages()
  const cur = ps[ps.length - 1]
  const route = cur && (cur.route || (cur.$page && cur.$page.route))
  let back = ''
  if (route && route !== 'pages/home/index' && route !== 'pages/login/index') {
    const q = (cur.options || (cur.$page && cur.$page.options)) || {}
    const qs = Object.keys(q).map((k) => `${k}=${encodeURIComponent(q[k])}`).join('&')
    back = '/' + route + (qs ? '?' + qs : '')
  }
  uni.reLaunch({ url: '/pages/login/index' + (back ? '?redirect=' + encodeURIComponent(back) : '') })
  return false
}
