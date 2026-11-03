// 登录：必须登录才能进入首页。分两步：
// 1. 微信登录（wxLogin）：调用 wx.login 拿 code，交给后端用 code2Session 换 openid，查这个微信有没有账号。
//    老用户（比如微信登录态过期、退出后重新登录）：后端直接返回 token 和资料，直接进入，不用重新注册；
//    新用户：后端返回注册凭证（ticket），登录页再显示入场券。
// 2. 注册（register）：新用户在入场券上填好头像（chooseAvatar）、昵称（type=nickname）和所在城市，
//    同意协议后带着注册凭证创建账号。
// 演示版在本地模拟后端：账号存在本机（zz_demo_accounts），按本机生成的 openid 区分；正式环境由后端保存。
// - 头像、昵称是隐私接口，要在公众平台「用户隐私保护指引」里声明「收集你的昵称、头像」，否则会直接调用失败。
// - 能从外部直接打开的页面（首页、分享落地页、广场、平台认证页、房间）在 onLoad 开头调用 requireLogin()，
//   未登录时转到登录页，登录后回到原来的页面。
import { reactive, onUnmounted } from 'vue'

const AUTH = 'zz_auth'
const PROFILE = 'zz_profile'
const PASS = 'zz_pass'
const EVT = 'profile-change'
const DEMO_ACCOUNTS = 'zz_demo_accounts' // 演示：本机模拟的服务端账号表（openid → 资料）
const DEMO_OPENID = 'zz_demo_openid' // 演示：本机模拟的 openid（正式环境由后端用 code 换取）

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

/* ---------- 第一步：微信登录，识别新老用户（重复点击只请求一次） ---------- */
let task = null
const saveSession = (auth, profile) => {
  write(PROFILE, { avatarUrl: profile.avatarUrl, nickname: profile.nickname, city: profile.city })
  write(AUTH, auth)
  uni.$emit(EVT)
}
// 返回 { isNew: false, auth, profile }（老用户，已经登录好）或 { isNew: true, ticket }（新用户，去填入场券注册）
export function wxLogin() {
  if (task) return task
  task = new Promise((resolve, reject) => {
    const done = (fn, v) => { task = null; fn(v) }
    const finish = (code) => demoServer.login(code).then((r) => {
      if (!r.isNew) saveSession(r.auth, r.profile)
      done(resolve, r)
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
/* ---------- 第二步：新用户注册（入场券上的头像、昵称、城市） ---------- */
export function register(profile, ticket) {
  return demoServer.register(ticket, profile).then((auth) => {
    saveSession(auth, profile)
    return auth
  })
}
// 兼容旧的调用：注册（没有注册凭证时先走一次微信登录）
export function login(profile) {
  return wxLogin().then((r) => (r.isNew ? register(profile, r.ticket) : r.auth))
}

// 演示：本机模拟的后端。正式环境对应两个接口：
//   POST /auth/wx-login { code }            → code2Session 换 openid；有账号返回 { isNew: false, token, profile }，没有返回 { isNew: true, ticket }
//   POST /auth/register { ticket, profile } → 用注册凭证里的 openid 建账号，返回 token
const demoServer = {
  openid() {
    let id = read(DEMO_OPENID, '')
    if (!id) { id = 'o_demo_' + Math.random().toString(36).slice(2, 10); write(DEMO_OPENID, id) }
    return id
  },
  login(code) {
    return new Promise((resolve) => setTimeout(() => {
      const openid = this.openid()
      const accounts = read(DEMO_ACCOUNTS, {})
      let acc = accounts[openid]
      // 这个功能上线前就填过资料的测试账号：当作老用户，不用重新注册
      const cached = read(PROFILE, null)
      if (!acc && cached && isProfileComplete(cached)) {
        const pass = getPass()
        acc = { userId: 'u' + pass.seat + String(Date.now()).slice(-4), seat: pass.seat, joinedAt: Date.now(), profile: cached }
        accounts[openid] = acc
        write(DEMO_ACCOUNTS, accounts)
      }
      if (acc) resolve({ isNew: false, profile: acc.profile, auth: { userId: acc.userId, token: `demo-${code}-${Date.now()}`, seat: acc.seat, city: acc.profile.city, joinedAt: acc.joinedAt } })
      else resolve({ isNew: true, ticket: `reg-${openid}-${Date.now()}` })
    }, 600))
  },
  register(ticket, profile) {
    return new Promise((resolve, reject) => setTimeout(() => {
      const openid = this.openid()
      if (!ticket || !ticket.includes(openid)) return reject(new Error('注册凭证无效，请重新微信登录'))
      const pass = getPass()
      const acc = { userId: 'u' + pass.seat + String(Date.now()).slice(-4), seat: pass.seat, joinedAt: Date.now(), profile: { avatarUrl: profile.avatarUrl, nickname: profile.nickname, city: profile.city } }
      const accounts = read(DEMO_ACCOUNTS, {})
      accounts[openid] = acc
      write(DEMO_ACCOUNTS, accounts)
      resolve({ userId: acc.userId, token: `demo-reg-${Date.now()}`, seat: acc.seat, city: profile.city, joinedAt: acc.joinedAt })
    }, 600))
  }
}

// 退出登录（或者登录态过期）：只清掉本机的登录态和资料缓存，账号还在服务端；下次微信登录会认出是老用户，直接进入
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
